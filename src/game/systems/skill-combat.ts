import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import {
  calcMonsterCombatPower,
  calcPlayerCombatPower,
  shouldForceFleeByCombatPower,
} from '@/game/formulas/combat-power'
import { calcFleeRate, rollFlee } from '@/game/formulas/damage'
import { appendElementHint, resolveAttack } from '@/game/systems/combat-resolve'
import type { PlayerBattleDebuffs } from '@/game/systems/battle-debuffs'
import type { BattleMonsterSkillState } from '@/game/systems/monster-skill-combat'
import { estimateMonsterMaxRoundDamage } from '@/game/systems/monster-skill-combat'
import type { PlayerBattleSkillLoadout } from '@/game/systems/player-skill-library'
import type { Gongfa } from '@/game/models/gongfa'
import { getMonsterCombatElement, type Monster, type MonsterStatus } from '@/game/models/monster'
import {
  canCastSkill,
  getCastableAttackSkills,
  getScaledSkillParams,
  getSkillDamageMultiplier,
  getSkillHitCount,
  getSkillProficiency,
  resolveSkillAttackElement,
  type Skill,
  type SkillCastContext,
  type SkillProficiencyMap,
} from '@/game/models/skill'
import type { BattleLogEntry, ElementType } from '@/game/types'

/** 敌方状态为「普通」视为健康（弱化状态可捡漏，不触发逃跑） */
export function isMonsterAtHealthyHp(
  _monsterHp: number,
  _monsterMaxHp: number,
  status: MonsterStatus,
): boolean {
  return status === '普通'
}

function buildFleeSkillCastContext(
  input: Pick<AutoFleeInput, 'skillState' | 'proficiencyMap'>,
): SkillCastContext {
  const skillCooldowns = { ...input.skillState.skillCooldowns }
  tickSkillCooldowns(skillCooldowns)
  return {
    playerMp: input.skillState.playerMp,
    skillCooldowns,
    skillProficiency: input.proficiencyMap,
  }
}

/**
 * 是否仅剩普攻（无可用攻击 / 回复技能；与回合内 AI 选技一致，会先 tick 冷却）
 */
export function hasOnlyNormalAttackRemaining(input: AutoFleeInput): boolean {
  const context = buildFleeSkillCastContext(input)
  return !input.skills.some((skill) => canCastSkill(skill, context))
}

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

/**
 * 判断技能是否能在当前回合提供气血恢复
 */
function skillProvidesHpRegen(skill: Skill, context: SkillCastContext): boolean {
  if (skill.category === 'heal') return true
  if (skill.category !== 'buff' && skill.category !== 'defense') return false

  const proficiency = getSkillProficiency(context.skillProficiency, skill.id)
  const params = getScaledSkillParams(skill.params, proficiency)
  const regenPercent = params.hp_regen_percent
  return typeof regenPercent === 'number' && regenPercent > 0
}

/**
 * 判断当前是否还有可用的回血手段（可释放且含气血恢复效果）
 */
export function hasAvailableHealingResources(
  skills: Skill[],
  context: SkillCastContext,
): boolean {
  return skills.some(
    (skill) => canCastSkill(skill, context) && skillProvidesHpRegen(skill, context),
  )
}

/**
 * 判断当前是否还有可用的攻击技能（不含普攻）
 */
export function hasAvailableAttackSkillsBeyondNormal(
  skills: Skill[],
  context: SkillCastContext,
): boolean {
  return getCastableAttackSkills(skills, context).length > 0
}

/** 自动逃跑判定入参 */
export interface AutoFleeInput {
  playerHp: number
  playerMaxHp: number
  playerMaxMp: number
  playerSpeed: number
  monsterHp: number
  monsterMaxHp: number
  monsterStatus: MonsterStatus
  monsterSpeed: number
  skills: Skill[]
  skillState: BattleSkillState
  proficiencyMap: SkillProficiencyMap
  snapshot: CombatSnapshot
  playerDebuffs: PlayerBattleDebuffs
  monsterSkillState: BattleMonsterSkillState
  monster: Monster
}

/**
 * 估算下一回合开始时的中毒伤害（若仍有中毒层数）
 */
export function estimateNextRoundPoisonDamage(
  debuffs: PlayerBattleDebuffs,
  playerMaxHp: number,
): number {
  if (debuffs.poisonRoundsLeft <= 0 || debuffs.poisonDamagePercent <= 0) {
    return 0
  }
  return Math.max(1, Math.floor(playerMaxHp * debuffs.poisonDamagePercent))
}

/**
 * 预判下一战斗回合后是否必死（悲观：下次怪物行动最大伤害 + 下回合初中毒）
 */
export function willPlayerDieNextCombatRound(input: AutoFleeInput): boolean {
  if (input.playerMaxHp <= 0 || input.playerHp <= 0) return false

  const monsterDamage = estimateMonsterMaxRoundDamage(
    input.monster,
    input.snapshot,
    input.monsterSkillState,
    input.playerDebuffs,
  )
  const poisonDamage = estimateNextRoundPoisonDamage(input.playerDebuffs, input.playerMaxHp)
  const projectedHp = input.playerHp - monsterDamage - poisonDamage

  return projectedHp <= 0
}

/**
 * 是否因战斗力差距过大而必须撤离
 */
export function shouldForceFleeByCombatPowerGap(input: AutoFleeInput): boolean {
  const playerPower = calcPlayerCombatPower(
    input.snapshot,
    input.playerMaxHp,
    input.playerMaxMp,
  )
  const monsterPower = calcMonsterCombatPower(input.monster)
  return shouldForceFleeByCombatPower(playerPower, monsterPower)
}

/**
 * 是否满足自动逃跑触发条件
 */
export function canAttemptAutoFlee(input: AutoFleeInput): boolean {
  if (input.playerMaxHp <= 0 || input.playerHp <= 0) return false
  if (!willPlayerDieNextCombatRound(input)) return false
  if (!hasOnlyNormalAttackRemaining(input)) return false
  if (!isMonsterAtHealthyHp(input.monsterHp, input.monsterMaxHp, input.monsterStatus)) {
    return false
  }

  return true
}

/** 自动逃跑判定结果 */
export interface AutoFleeAttemptResult {
  /** 是否满足逃跑触发条件 */
  attempted: boolean
  /** 是否成功脱身 */
  fled: boolean
  /** 本次逃跑成功率（0~1） */
  fleeRate: number
  /** 是否因战斗力差距过大而直接撤离 */
  forcedByCombatPower?: boolean
}

/**
 * 尝试自动逃跑：战斗力碾压则必逃；否则按濒死预判 + 速度掷骰
 */
export function tryAutoFlee(input: AutoFleeInput): AutoFleeAttemptResult {
  const noAttempt: AutoFleeAttemptResult = { attempted: false, fled: false, fleeRate: 0 }

  if (shouldForceFleeByCombatPowerGap(input)) {
    return {
      attempted: true,
      fled: true,
      fleeRate: 1,
      forcedByCombatPower: true,
    }
  }

  if (!canAttemptAutoFlee(input)) return noAttempt

  const fleeRate = calcFleeRate(input.playerSpeed, input.monsterSpeed)
  return {
    attempted: true,
    fled: rollFlee(fleeRate),
    fleeRate,
  }
}

/**
 * 按技能栏顺序选择本回合释放的技能
 * 优先使用栏位靠前的技能；灵力不足或冷却中时依次尝试下一栏
 */
export function selectPlayerCastSkill(
  skills: Skill[],
  context: SkillCastContext,
): Skill | undefined {
  for (const skill of skills) {
    if (canCastSkill(skill, context)) {
      return skill
    }
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
 * 玩家回合：按技能栏优先级释放，资源不足时顺延；均不可用则普通攻击
 */
export function executePlayerAttack(
  snapshot: CombatSnapshot,
  monster: Monster,
  activeGongfa: Gongfa,
  skillLoadout: PlayerBattleSkillLoadout,
  skillState: BattleSkillState,
  createLog: LogFactory,
  playerHpState: PlayerCombatHp,
): { logs: BattleLogEntry[]; monsterHp: number; playerHp: number; castSkillId: string | null } {
  const logs: BattleLogEntry[] = []
  let monsterHp = monster.combat.hp

  tickBattleSkillCooldowns(skillState)

  const battleSkills = skillLoadout.skills
  const castContext: SkillCastContext = {
    playerMp: skillState.playerMp,
    skillCooldowns: skillState.skillCooldowns,
    skillProficiency: skillLoadout.proficiencyMap,
  }
  const selectedSkill = selectPlayerCastSkill(battleSkills, castContext)

  const monsterCombatElement = getMonsterCombatElement(monster)
  const defender = {
    defense: monster.combat.defense,
    speed: monster.combat.speed,
    element: monsterCombatElement,
  }

  if (selectedSkill) {
    const proficiency = getSkillProficiency(skillLoadout.proficiencyMap, selectedSkill.id)
    const sourceGongfa = skillLoadout.gongfaById.get(selectedSkill.sourceGongfaId) ?? activeGongfa
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
      sourceGongfa,
      snapshot,
      monsterCombatElement,
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
