import { getMonsterBattleMpRegenPercent } from '@/game/constants/combat-balance'
import { getCombatElementMultiplier, isElementType } from '@/game/constants/elements'
import { getScaledSkillParams } from '@/game/constants/skill-params'
import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import { calcFinalDamage } from '@/game/formulas/damage'
import type { Gongfa } from '@/game/models/gongfa'
import { getMonsterCombatElement, type Monster } from '@/game/models/monster'
import {
  calcSkillCastMpCost,
  getSkillDamageMultiplier,
  getSkillHitCount,
  getSkillsByGongfaId,
  getUnlockedSkills,
  resolveSkillAttackElement,
  selectBestMonsterAttackSkill,
  type Skill,
} from '@/game/models/skill'
import {
  getEffectiveDefenderSpeed,
  tryApplySkillDebuffs,
  type PlayerBattleDebuffs,
} from '@/game/systems/battle-debuffs'
import { appendElementHint, resolveAttack } from '@/game/systems/combat-resolve'
import { createHumanMonsterGongfa } from '@/game/systems/human-monster-combat'
import { tickSkillCooldowns } from '@/game/systems/skill-combat'
import type { BattleLogEntry, ElementType } from '@/game/types'

/** 怪物本场战斗技能运行时状态 */
export interface BattleMonsterSkillState {
  monsterMp: number
  monsterMaxMp: number
  skillCooldowns: Record<string, number>
}

type LogFactory = (text: string, type: BattleLogEntry['type']) => BattleLogEntry

/**
 * 创建怪物战斗初始技能状态
 */
export function createBattleMonsterSkillState(
  maxMp: number,
  currentMp = maxMp,
): BattleMonsterSkillState {
  return {
    monsterMp: currentMp,
    monsterMaxMp: maxMp,
    skillCooldowns: {},
  }
}

/**
 * 重置单场战斗怪物技能状态（遇怪时调用，灵力回满）
 */
export function resetBattleMonsterSkillState(maxMp: number): BattleMonsterSkillState {
  return createBattleMonsterSkillState(maxMp, maxMp)
}

/**
 * 怪物行动前恢复灵力（不超过上限）
 * @returns 本次实际恢复量
 */
export function regenMonsterBattleMp(
  state: BattleMonsterSkillState,
  regenPercent: number,
): number {
  if (regenPercent <= 0 || state.monsterMaxMp <= 0) {
    return 0
  }
  const gain = Math.floor(state.monsterMaxMp * regenPercent)
  if (gain <= 0 || state.monsterMp >= state.monsterMaxMp) {
    return 0
  }
  const before = state.monsterMp
  state.monsterMp = Math.min(state.monsterMaxMp, state.monsterMp + gain)
  return state.monsterMp - before
}

/**
 * 怪物技能释放后扣除灵力并进入冷却
 */
export function applyMonsterSkillCast(
  state: BattleMonsterSkillState,
  skill: Skill,
): void {
  const cost = calcSkillCastMpCost(skill, state.monsterMaxMp)
  state.monsterMp = Math.max(0, state.monsterMp - cost)
  if (skill.cooldown > 0) {
    state.skillCooldowns[skill.id] = skill.cooldown
  }
}

interface MonsterBattleSkillContext {
  skills: Skill[]
  gongfa?: Gongfa
}

/**
 * 获取怪物本场可释放的攻击技能列表
 * - 妖兽 / 灵兽：按模板 id 读取 skills.json
 * - 人形修士：按所修功法与模拟等级读取
 */
export function getMonsterBattleSkills(monster: Monster): MonsterBattleSkillContext {
  const templateSkills = getSkillsByGongfaId(monster.id).filter(
    (skill) => skill.category === 'attack',
  )
  if (templateSkills.length > 0) {
    return { skills: templateSkills }
  }

  if (monster.kind === '人' && monster.gongfaId) {
    const gongfa = createHumanMonsterGongfa(monster.gongfaId, monster.realm, monster.tier)
    const skills = getUnlockedSkills(gongfa.id, gongfa.level).filter(
      (skill) => skill.category === 'attack',
    )
    return { skills, gongfa }
  }

  return { skills: [] }
}

function getMonsterSkillExtraPenetration(
  skill: Skill,
  basePenetration: number,
): number {
  const params = getScaledSkillParams(skill.params, 0)
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

function resolveMonsterSkillAttackElement(
  skill: Skill,
  monster: Monster,
  gongfa: Gongfa | undefined,
  targetElement: ElementType,
): ElementType | undefined {
  const combatElement = getMonsterCombatElement(monster)
  if (gongfa) {
    return resolveSkillAttackElement(skill, gongfa.elements, combatElement, targetElement)
  }
  const raw = skill.params.element
  if (isElementType(raw)) return raw
  return combatElement
}

function buildMonsterAttacker(monster: Monster, penetration = monster.combat.penetration) {
  return {
    attack: monster.combat.attack,
    critRate: monster.combat.critRate,
    critDamage: monster.combat.critDamage,
    penetration,
    hitRate: monster.combat.hitRate,
    speed: monster.combat.speed,
  }
}

/**
 * 怪物回合：自动选择可释放攻击技能，否则普通攻击
 */
export function executeMonsterAttack(
  monster: Monster,
  snapshot: CombatSnapshot,
  skillState: BattleMonsterSkillState,
  playerDebuffs: PlayerBattleDebuffs,
  createLog: LogFactory,
): { logs: BattleLogEntry[]; playerHpDelta: number } {
  const logs: BattleLogEntry[] = []
  let playerHpDelta = 0

  const { skills, gongfa } = getMonsterBattleSkills(monster)

  if (skills.length > 0) {
    regenMonsterBattleMp(skillState, getMonsterBattleMpRegenPercent(monster.kind))
  }

  tickSkillCooldowns(skillState.skillCooldowns)

  const selectedSkill = selectBestMonsterAttackSkill(skills, {
    monsterMp: skillState.monsterMp,
    monsterMaxMp: skillState.monsterMaxMp,
    skillCooldowns: skillState.skillCooldowns,
  })

  const defenderSpeed = getEffectiveDefenderSpeed(snapshot.speed, playerDebuffs)
  const defender = {
    defense: snapshot.defense,
    speed: defenderSpeed,
    element: snapshot.defenseElement,
    tenacity: snapshot.tenacity,
    damageReduction: snapshot.damageReduction,
  }
  const defenderImmuneToCounter = snapshot.immuneToElementCounter

  if (selectedSkill) {
    const attackElement = resolveMonsterSkillAttackElement(
      selectedSkill,
      monster,
      gongfa,
      snapshot.defenseElement,
    )
    applyMonsterSkillCast(skillState, selectedSkill)
    const hitCount = getSkillHitCount(selectedSkill)
    const skillMultiplier = getSkillDamageMultiplier(selectedSkill, 0)
    const penetration = getMonsterSkillExtraPenetration(selectedSkill, monster.combat.penetration)

    logs.push(createLog(`${monster.name} 施展「${selectedSkill.name}」！`, 'info'))

    for (let i = 0; i < hitCount; i += 1) {
      const result = resolveAttack({
        source: 'monster_skill',
        attacker: buildMonsterAttacker(monster, penetration),
        defender,
        attackElement,
        skillMultiplier,
        defenderImmuneToCounter,
      })

      const hitLabel = hitCount > 1 ? `（第 ${i + 1} 击）` : ''
      if (result.hit) {
        playerHpDelta += result.damage
        const debuffResult = tryApplySkillDebuffs(selectedSkill.params, playerDebuffs)
        const debuffHints: string[] = []
        if (debuffResult.poisonApplied) debuffHints.push('中毒')
        if (debuffResult.slowApplied) debuffHints.push('减速')
        const debuffText = debuffHints.length > 0 ? `，你陷入${debuffHints.join('、')}！` : ''

        logs.push(
          createLog(
            appendElementHint(
              result.isCrit
                ? `「${selectedSkill.name}」对你造成暴击 ${result.damage} 点伤害！${hitLabel}${debuffText}`
                : `「${selectedSkill.name}」对你造成 ${result.damage} 点伤害。${hitLabel}${debuffText}`,
              result.elementHint,
            ),
            result.isCrit ? 'crit' : 'damage',
          ),
        )
      } else {
        logs.push(createLog(`你闪避了「${selectedSkill.name}」。${hitLabel}`, 'miss'))
      }
    }

    return { logs, playerHpDelta }
  }

  const result = resolveAttack({
    source: 'monster',
    attacker: buildMonsterAttacker(monster),
    defender,
    defenderImmuneToCounter,
  })

  if (result.hit) {
    playerHpDelta += result.damage
    logs.push(
      createLog(
        result.isCrit
          ? `${monster.name} 对你造成暴击 ${result.damage} 点伤害！`
          : `${monster.name} 对你造成 ${result.damage} 点伤害。`,
        result.isCrit ? 'crit' : 'damage',
      ),
    )
  } else {
    logs.push(createLog(`你闪避了 ${monster.name} 的攻击。`, 'miss'))
  }

  return { logs, playerHpDelta }
}

/** 悲观的伤害估算：命中 + 暴击 + 最高波动 */
const PESSIMISTIC_DAMAGE_RANDOM_FACTOR = 1.1

/**
 * 估算怪物 upcoming 一次行动对玩家的最大伤害（用于逃跑必死预判）
 */
export function estimateMonsterMaxRoundDamage(
  monster: Monster,
  snapshot: CombatSnapshot,
  skillState: BattleMonsterSkillState,
  playerDebuffs: PlayerBattleDebuffs,
): number {
  const simulatedState: BattleMonsterSkillState = {
    monsterMp: skillState.monsterMp,
    monsterMaxMp: skillState.monsterMaxMp,
    skillCooldowns: { ...skillState.skillCooldowns },
  }

  const { skills, gongfa } = getMonsterBattleSkills(monster)
  if (skills.length > 0) {
    regenMonsterBattleMp(simulatedState, getMonsterBattleMpRegenPercent(monster.kind))
  }
  tickSkillCooldowns(simulatedState.skillCooldowns)

  const selectedSkill = selectBestMonsterAttackSkill(skills, {
    monsterMp: simulatedState.monsterMp,
    monsterMaxMp: simulatedState.monsterMaxMp,
    skillCooldowns: simulatedState.skillCooldowns,
  })

  const defender = {
    defense: snapshot.defense,
    speed: getEffectiveDefenderSpeed(snapshot.speed, playerDebuffs),
    element: snapshot.defenseElement,
    tenacity: snapshot.tenacity,
    damageReduction: snapshot.damageReduction,
  }
  const elementOptions = { defenderImmuneToCounter: snapshot.immuneToElementCounter }

  const calcHitDamage = (
    skillMultiplier = 1,
    penetration = monster.combat.penetration,
    attackElement?: ElementType,
  ): number => {
    const elementMultiplier = attackElement
      ? getCombatElementMultiplier(attackElement, defender.element, elementOptions)
      : 1
    return calcFinalDamage({
      attack: monster.combat.attack,
      skillMultiplier,
      isCrit: true,
      critDamage: monster.combat.critDamage,
      targetDefense: defender.defense,
      penetration,
      elementMultiplier,
      randomFactor: PESSIMISTIC_DAMAGE_RANDOM_FACTOR,
      damageReduction: defender.damageReduction,
    })
  }

  if (selectedSkill) {
    const attackElement = resolveMonsterSkillAttackElement(
      selectedSkill,
      monster,
      gongfa,
      snapshot.defenseElement,
    )
    const hitCount = getSkillHitCount(selectedSkill)
    const skillMultiplier = getSkillDamageMultiplier(selectedSkill, 0)
    const penetration = getMonsterSkillExtraPenetration(selectedSkill, monster.combat.penetration)
    let total = 0
    for (let i = 0; i < hitCount; i += 1) {
      total += calcHitDamage(skillMultiplier, penetration, attackElement)
    }
    return total
  }

  return calcHitDamage()
}
