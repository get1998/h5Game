import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import { appendElementHint, resolveAttack } from '@/game/systems/combat-resolve'
import type { Gongfa } from '@/game/models/gongfa'
import type { Monster } from '@/game/models/monster'
import {
  canCastSkill,
  getScaledSkillParams,
  getSkillDamageMultiplier,
  getSkillHitCount,
  getSkillProficiency,
  getUnlockedSkills,
  resolveSkillAttackElement,
  selectBestAttackSkill,
  type Skill,
  type SkillCastContext,
  type SkillCategory,
} from '@/game/models/skill'
import type { BattleLogEntry, ElementType } from '@/game/types'

/** 单场战斗技能运行时状态 */
export interface BattleSkillState {
  /** 当前灵力 */
  playerMp: number
  /** 技能剩余冷却回合，key 为技能 id */
  skillCooldowns: Record<string, number>
}

type LogFactory = (text: string, type: BattleLogEntry['type']) => BattleLogEntry

/**
 * 创建战斗初始技能状态
 */
export function createBattleSkillState(player: { combat: { mp: number } }): BattleSkillState {
  return {
    playerMp: player.combat.mp,
    skillCooldowns: {},
  }
}

/**
 * 重置单场战斗技能状态（遇怪时调用，灵力回满）
 * @param maxMp 有效灵力上限
 */
export function resetBattleSkillState(maxMp: number): BattleSkillState {
  return {
    playerMp: maxMp,
    skillCooldowns: {},
  }
}

/**
 * 递减技能冷却表
 */
export function tickSkillCooldowns(cooldowns: Record<string, number>): void {
  for (const skillId of Object.keys(cooldowns)) {
    const remaining = cooldowns[skillId] ?? 0
    if (remaining > 0) {
      cooldowns[skillId] = remaining - 1
    }
  }
}

/**
 * 回合开始时递减全部技能冷却
 */
export function tickBattleSkillCooldowns(state: BattleSkillState): void {
  tickSkillCooldowns(state.skillCooldowns)
}

/**
 * 技能释放后扣除灵力并进入冷却
 */
export function applySkillCast(state: BattleSkillState, skill: Skill): void {
  state.playerMp = Math.max(0, state.playerMp - skill.costMp)
  if (skill.cooldown > 0) {
    state.skillCooldowns[skill.id] = skill.cooldown
  }
}

function getSkillExtraPenetration(
  skill: Skill,
  basePenetration: number,
  proficiency: number,
): number {
  const params = getScaledSkillParams(skill.params, proficiency)
  const ignore = params.defense_ignore
  if (typeof ignore === 'number' && ignore > 0) {
    return basePenetration + ignore * 100
  }
  const ignorePercent = params.defense_ignore_percent
  if (typeof ignorePercent === 'number' && ignorePercent > 0) {
    return basePenetration + ignorePercent * 100
  }
  return basePenetration
}

function resolvePlayerAttackElement(
  skill: Skill | null,
  gongfa: Gongfa,
  snapshot: CombatSnapshot,
  targetElement: ElementType,
): ElementType | undefined {
  const fallback = snapshot.primaryAttackElement
  if (skill) {
    return resolveSkillAttackElement(skill, gongfa.elements, fallback, targetElement)
  }
  return fallback
}

function buildPlayerAttacker(snapshot: CombatSnapshot, penetration = snapshot.penetration) {
  return {
    attack: snapshot.attack,
    critRate: snapshot.critRate,
    critDamage: snapshot.critDamage,
    penetration,
    hitRate: snapshot.hitRate,
    speed: snapshot.speed,
  }
}

/** 玩家当前气血（回合内可变） */
export interface PlayerCombatHp {
  hp: number
  maxHp: number
}

function getCastableSkillsByCategory(
  skills: Skill[],
  category: SkillCategory,
  context: SkillCastContext,
): Skill[] {
  return skills.filter((skill) => skill.category === category && canCastSkill(skill, context))
}

/**
 * 自动选择本回合释放的主动 / 绝技
 * 优先：低血量回复 → 攻击 → 增益 / 防御
 */
export function selectPlayerCastSkill(
  skills: Skill[],
  context: SkillCastContext,
  playerHpRatio: number,
): Skill | undefined {
  if (playerHpRatio < 0.55) {
    const healSkills = getCastableSkillsByCategory(skills, 'heal', context)
      .sort((a, b) => {
        const profA = getSkillProficiency(context.skillProficiency, a.id)
        const profB = getSkillProficiency(context.skillProficiency, b.id)
        const healA = Number(getScaledSkillParams(a.params, profA).hp_regen_percent) || 0
        const healB = Number(getScaledSkillParams(b.params, profB).hp_regen_percent) || 0
        return healB - healA
      })
    if (healSkills[0]) return healSkills[0]
  }

  const attackSkill = selectBestAttackSkill(skills, context)
  if (attackSkill) return attackSkill

  const supportSkills = [
    ...getCastableSkillsByCategory(skills, 'buff', context),
    ...getCastableSkillsByCategory(skills, 'defense', context),
  ]
  if (supportSkills.length > 0) {
    return supportSkills[0]
  }

  return undefined
}

function applySelfHealFromSkill(
  skill: Skill,
  proficiency: number,
  playerHp: PlayerCombatHp,
): number {
  const params = getScaledSkillParams(skill.params, proficiency)
  const regenPercent = params.hp_regen_percent
  if (typeof regenPercent !== 'number' || regenPercent <= 0) return 0

  const heal = Math.max(1, Math.floor(playerHp.maxHp * regenPercent))
  playerHp.hp = Math.min(playerHp.maxHp, playerHp.hp + heal)
  return heal
}

/**
 * 玩家回合：自动选择可释放主动技能（攻击 / 回复 / 增益），否则普通攻击
 */
export function executePlayerAttack(
  snapshot: CombatSnapshot,
  monster: Monster,
  gongfa: Gongfa,
  skillState: BattleSkillState,
  createLog: LogFactory,
  playerHpState: PlayerCombatHp,
): { logs: BattleLogEntry[]; monsterHp: number; playerHp: number; castSkillId: string | null } {
  const logs: BattleLogEntry[] = []
  let monsterHp = monster.combat.hp

  tickBattleSkillCooldowns(skillState)

  const unlockedSkills = getUnlockedSkills(gongfa.id, gongfa.level)
  const castContext: SkillCastContext = {
    playerMp: skillState.playerMp,
    skillCooldowns: skillState.skillCooldowns,
    skillProficiency: gongfa.skillProficiency,
  }
  const hpRatio = playerHpState.maxHp > 0
    ? playerHpState.hp / playerHpState.maxHp
    : 1
  const selectedSkill = selectPlayerCastSkill(unlockedSkills, castContext, hpRatio)

  const defender = {
    defense: monster.combat.defense,
    speed: monster.combat.speed,
    element: monster.element,
  }

  if (selectedSkill) {
    const proficiency = getSkillProficiency(gongfa.skillProficiency, selectedSkill.id)
    applySkillCast(skillState, selectedSkill)
    logs.push(createLog(`你施展「${selectedSkill.name}」！`, 'info'))

    if (selectedSkill.category === 'heal' || selectedSkill.category === 'buff') {
      const heal = applySelfHealFromSkill(selectedSkill, proficiency, playerHpState)
      if (heal > 0) {
        logs.push(createLog(`「${selectedSkill.name}」恢复 ${heal} 点气血。`, 'heal'))
      }
      return {
        logs,
        monsterHp,
        playerHp: playerHpState.hp,
        castSkillId: selectedSkill.id,
      }
    }

    if (selectedSkill.category === 'defense') {
      const heal = applySelfHealFromSkill(selectedSkill, proficiency, playerHpState)
      if (heal > 0) {
        logs.push(createLog(`「${selectedSkill.name}」恢复 ${heal} 点气血。`, 'heal'))
      } else {
        logs.push(createLog(`「${selectedSkill.name}」生效。`, 'info'))
      }
      return {
        logs,
        monsterHp,
        playerHp: playerHpState.hp,
        castSkillId: selectedSkill.id,
      }
    }

    const attackElement = resolvePlayerAttackElement(
      selectedSkill,
      gongfa,
      snapshot,
      monster.element,
    )
    const hitCount = getSkillHitCount(selectedSkill)
    const skillMultiplier = getSkillDamageMultiplier(selectedSkill, proficiency)
    const penetration = getSkillExtraPenetration(selectedSkill, snapshot.penetration, proficiency)

    for (let i = 0; i < hitCount; i += 1) {
      if (monsterHp <= 0) break

      const result = resolveAttack({
        source: 'gongfa_skill',
        attacker: buildPlayerAttacker(snapshot, penetration),
        defender,
        attackElement,
        skillMultiplier,
      })

      const hitLabel = hitCount > 1 ? `（第 ${i + 1} 击）` : ''
      if (result.hit) {
        monsterHp = Math.max(0, monsterHp - result.damage)
        logs.push(
          createLog(
            appendElementHint(
              result.isCrit
                ? `「${selectedSkill.name}」暴击 ${result.damage} 点伤害！${hitLabel}`
                : `「${selectedSkill.name}」造成 ${result.damage} 点伤害。${hitLabel}`,
              result.elementHint,
            ),
            result.isCrit ? 'crit' : 'damage',
          ),
        )
      } else {
        logs.push(
          createLog(`${monster.name} 闪避了「${selectedSkill.name}」。${hitLabel}`, 'miss'),
        )
      }
    }
    return {
      logs,
      monsterHp,
      playerHp: playerHpState.hp,
      castSkillId: selectedSkill.id,
    }
  }

  const result = resolveAttack({
    source: 'normal',
    attacker: buildPlayerAttacker(snapshot),
    defender,
  })

  if (result.hit) {
    monsterHp = Math.max(0, monsterHp - result.damage)
    logs.push(
      createLog(
        result.isCrit
          ? `你普通攻击暴击 ${result.damage} 点伤害！`
          : `你普通攻击造成 ${result.damage} 点伤害。`,
        result.isCrit ? 'crit' : 'damage',
      ),
    )
  } else {
    logs.push(createLog(`${monster.name} 闪避了你的攻击。`, 'miss'))
  }

  return {
    logs,
    monsterHp,
    playerHp: playerHpState.hp,
    castSkillId: null,
  }
}
