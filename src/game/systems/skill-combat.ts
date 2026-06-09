import {
  calcFinalDamage,
  calcHitRate,
  rollCrit,
  rollHit,
} from '@/game/formulas/damage'
import type { Gongfa } from '@/game/models/gongfa'
import type { Monster } from '@/game/models/monster'
import type { Player } from '@/game/models/player'
import {
  getSkillProficiency,
  getSkillProficiencyCoefficient,
  getUnlockedSkills,
  selectBestAttackSkill,
  type Skill,
} from '@/game/models/skill'
import type { BattleLogEntry } from '@/game/types'

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
export function createBattleSkillState(player: Player): BattleSkillState {
  return {
    playerMp: player.combat.mp,
    skillCooldowns: {},
  }
}

/**
 * 重置单场战斗技能状态（遇怪时调用，灵力回满）
 */
export function resetBattleSkillState(player: Player): BattleSkillState {
  return {
    playerMp: player.combat.maxMp,
    skillCooldowns: {},
  }
}

/**
 * 回合开始时递减全部技能冷却
 */
export function tickBattleSkillCooldowns(state: BattleSkillState): void {
  for (const skillId of Object.keys(state.skillCooldowns)) {
    const remaining = state.skillCooldowns[skillId] ?? 0
    if (remaining > 0) {
      state.skillCooldowns[skillId] = remaining - 1
    }
  }
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

function getSkillHitCount(skill: Skill): number {
  const params = skill.params
  if (typeof params.hit_count === 'number' && params.hit_count > 0) {
    return Math.floor(params.hit_count)
  }
  if (typeof params.skill_count === 'number' && params.skill_count > 0) {
    return Math.floor(params.skill_count)
  }
  return 1
}

function getSkillDamageMultiplier(skill: Skill): number {
  const percent = skill.params.damage_percent
  return typeof percent === 'number' ? percent : 1
}

function getSkillExtraPenetration(skill: Skill, basePenetration: number): number {
  const ignore = skill.params.defense_ignore
  if (typeof ignore === 'number' && ignore > 0) {
    return basePenetration + ignore * 100
  }
  const ignorePercent = skill.params.defense_ignore_percent
  if (typeof ignorePercent === 'number' && ignorePercent > 0) {
    return basePenetration + ignorePercent * 100
  }
  return basePenetration
}

/**
 * 玩家回合：自动选择伤害最高的可释放攻击技能，否则普通攻击
 */
export function executePlayerAttack(
  player: Player,
  monster: Monster,
  gongfa: Gongfa,
  skillState: BattleSkillState,
  createLog: LogFactory,
): { logs: BattleLogEntry[]; monsterHp: number; castSkillId: string | null } {
  const logs: BattleLogEntry[] = []
  let monsterHp = monster.combat.hp

  tickBattleSkillCooldowns(skillState)

  const unlockedSkills = getUnlockedSkills(gongfa.id, gongfa.level)
  const selectedSkill = selectBestAttackSkill(unlockedSkills, {
    playerMp: skillState.playerMp,
    skillCooldowns: skillState.skillCooldowns,
  })

  const attack = player.combat.attack + gongfa.attackBonus
  const playerHitRate = calcHitRate(
    player.combat.hitRate,
    player.combat.speed,
    monster.combat.speed,
  )

  if (selectedSkill) {
    applySkillCast(skillState, selectedSkill)
    const hitCount = getSkillHitCount(selectedSkill)
    const proficiency = getSkillProficiency(gongfa.skillProficiency, selectedSkill.id)
    const levelCoeff = getSkillProficiencyCoefficient(proficiency)
    const skillMultiplier = getSkillDamageMultiplier(selectedSkill) * levelCoeff
    const penetration = getSkillExtraPenetration(selectedSkill, player.combat.penetration)

    logs.push(
      createLog(`你施展「${selectedSkill.name}」！`, 'info'),
    )

    for (let i = 0; i < hitCount; i += 1) {
      if (monsterHp <= 0) break

      if (rollHit(playerHitRate)) {
        const isCrit = rollCrit(player.combat.critRate)
        const damage = calcFinalDamage({
          attack,
          skillMultiplier,
          isCrit,
          critDamage: player.combat.critDamage,
          targetDefense: monster.combat.defense,
          penetration,
        })
        monsterHp = Math.max(0, monsterHp - damage)
        const hitLabel = hitCount > 1 ? `（第 ${i + 1} 击）` : ''
        logs.push(
          createLog(
            isCrit
              ? `「${selectedSkill.name}」暴击 ${damage} 点伤害！${hitLabel}`
              : `「${selectedSkill.name}」造成 ${damage} 点伤害。${hitLabel}`,
            isCrit ? 'crit' : 'damage',
          ),
        )
      } else {
        const hitLabel = hitCount > 1 ? `（第 ${i + 1} 击）` : ''
        logs.push(
          createLog(`${monster.name} 闪避了「${selectedSkill.name}」。${hitLabel}`, 'miss'),
        )
      }
    }
    return { logs, monsterHp, castSkillId: selectedSkill.id }
  }

  // 无可用攻击技能时普通攻击
  if (rollHit(playerHitRate)) {
    const isCrit = rollCrit(player.combat.critRate)
    const damage = calcFinalDamage({
      attack,
      isCrit,
      critDamage: player.combat.critDamage,
      targetDefense: monster.combat.defense,
      penetration: player.combat.penetration,
    })
    monsterHp = Math.max(0, monsterHp - damage)
    logs.push(
      createLog(
        isCrit
          ? `你普通攻击暴击 ${damage} 点伤害！`
          : `你普通攻击造成 ${damage} 点伤害。`,
        isCrit ? 'crit' : 'damage',
      ),
    )
  } else {
    logs.push(createLog(`${monster.name} 闪避了你的攻击。`, 'miss'))
  }

  return { logs, monsterHp, castSkillId: null }
}
