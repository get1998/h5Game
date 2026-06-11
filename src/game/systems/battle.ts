import { calcGongfaExpGain } from '@/game/formulas/gongfa-exp'
import { calcBattleXiuweiGain } from '@/game/formulas/battle-xiuwei'
import { calcSkillProficiencyGain } from '@/game/formulas/skill-proficiency'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import { getSkillById } from '@/game/models/skill'
import type { Monster } from '@/game/models/monster'
import type { Player } from '@/game/models/player'
import { createBattleContext } from '@/game/systems/combat-context'
import {
  applyPoisonRoundStart,
  createPlayerBattleDebuffs,
  tickDebuffDurations,
  type PlayerBattleDebuffs,
} from '@/game/systems/battle-debuffs'
import {
  executeMonsterAttack,
  resetBattleMonsterSkillState,
  type BattleMonsterSkillState,
} from '@/game/systems/monster-skill-combat'
import {
  executePlayerAttack,
  type BattleSkillState,
} from '@/game/systems/skill-combat'
import type { BattleLogEntry } from '@/game/types'

/** 单次调息基础时长（秒） */
export const REST_BASE_SECONDS = 5

/** 连续调息上限，达到后陷入重伤 */
export const MAX_CONSECUTIVE_REST_COUNT = 5

/** 重伤昏迷时长（秒） */
export const SEVERE_INJURY_SECONDS = 180

/** 连续进入调息达此次数时，寿元减少 1 年（3、6、9…） */
export const REST_LIFESPAN_PENALTY_THRESHOLD = 3

/** 连续调息触发的寿元削减（年） */
export const REST_LIFESPAN_PENALTY_YEARS = 1

/** 陷入重伤时寿元削减（年） */
export const SEVERE_INJURY_LIFESPAN_PENALTY_YEARS = 5

/** 调息 / 重伤阶段 */
export type RecoveryPhase = 'none' | 'resting' | 'severe_injury'

/**
 * 本次进入调息是否应扣减寿元（连续第 3、6、9… 次调息）
 */
export function shouldApplyRestLifespanPenalty(restCount: number): boolean {
  return restCount > 0 && restCount % REST_LIFESPAN_PENALTY_THRESHOLD === 0
}

/**
 * 计算第 n 次连续战败后的调息时长（毫秒）
 * 规则：5 秒 × 当前连续战败次数
 */
export function calcRestDurationMs(restCount: number): number {
  const count = Math.max(1, restCount)
  return REST_BASE_SECONDS * count * 1000
}

/**
 * 重伤昏迷时长（毫秒）
 */
export function calcSevereInjuryDurationMs(): number {
  return SEVERE_INJURY_SECONDS * 1000
}

/**
 * 格式化剩余时间为可读文案
 */
export function formatRecoveryCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0) {
    return `${min} 分 ${sec} 秒`
  }
  return `${sec} 秒`
}

/**
 * 生成调息阶段提示文案
 */
export function buildRestingMessage(restCount: number): string {
  const seconds = REST_BASE_SECONDS * restCount
  return `战败调息中（第 ${restCount} 次），还需 ${seconds} 秒恢复气血。`
}

/**
 * 生成重伤阶段提示文案
 */
export function buildSevereInjuryMessage(): string {
  return '连续战败五次，陷入重伤昏迷，三分钟后方可苏醒。'
}

/** 本场战斗单技能熟练度增量 */
export interface BattleSkillProficiencyGain {
  skillId: string
  amount: number
}

export interface BattleRoundResult {
  logs: BattleLogEntry[]
  playerHp: number
  playerMp: number
  monsterHp: number
  isFinished: boolean
  playerWin: boolean
  gongfaExpGain: number
  /** 击杀获得的修为（精英及以上同级为主；高境界差时普通亦可获得） */
  xiuweiGain: number
  /** 本回合技能熟练度增量（施展主动 / 绝技后结算，至少 +1） */
  skillProficiencyGains: BattleSkillProficiencyGain[]
}

export type { BattleSkillState } from '@/game/systems/skill-combat'
export type { BattleMonsterSkillState } from '@/game/systems/monster-skill-combat'
export type { PlayerBattleDebuffs } from '@/game/systems/battle-debuffs'
export type { BattleContext } from '@/game/systems/combat-context'
export type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
export {
  buildCombatSnapshot,
  buildEffectiveCombatStats,
  DEFAULT_STAT_CONTRIBUTORS,
  aggregateContributions,
  gongfaStatContributor,
  passiveStatContributor,
  getGongfaCombatContribution,
  aggregatePermanentPassiveContributions,
  getUnlockedPassiveSkills,
  isPermanentPassiveSkill,
} from '@/game/systems/stat-contributors'
export type {
  BattleLoadout,
  EffectiveCombatStats,
  StatContributor,
  StatContributorContext,
  CombatStatBreakdown,
  CombatStatContribution,
} from '@/game/systems/stat-contributors'
export { createBattleContext } from '@/game/systems/combat-context'
export {
  createBattleSkillState,
  resetBattleSkillState,
} from '@/game/systems/skill-combat'
export {
  createBattleMonsterSkillState,
  resetBattleMonsterSkillState,
} from '@/game/systems/monster-skill-combat'
export { createPlayerBattleDebuffs } from '@/game/systems/battle-debuffs'

/** 单场战斗扩展状态（怪物技能 + 玩家减益） */
export interface BattleRoundExtras {
  monsterSkillState: BattleMonsterSkillState
  playerDebuffs: PlayerBattleDebuffs
}

let logIdCounter = 0

function createLog(text: string, type: BattleLogEntry['type']): BattleLogEntry {
  logIdCounter += 1
  return {
    id: `log_${logIdCounter}`,
    text,
    type,
    timestamp: Date.now(),
  }
}

/**
 * 执行一轮简化文字战斗（玩家先手一次 + 怪物反击一次）
 */
export function runBattleRound(
  player: Player,
  monster: Monster,
  gongfa: Gongfa,
  skillState: BattleSkillState,
  gongfaList: Gongfa[] = [],
  battleExtras?: BattleRoundExtras,
): BattleRoundResult {
  const ctx = createBattleContext(player, monster, gongfa, skillState, gongfaList)
  const logs: BattleLogEntry[] = []
  let playerHp = player.combat.hp
  let monsterHp = monster.combat.hp

  const monsterSkillState = battleExtras?.monsterSkillState
    ?? resetBattleMonsterSkillState(monster.combat.maxMp)
  const playerDebuffs = battleExtras?.playerDebuffs ?? createPlayerBattleDebuffs()

  const poisonDamage = applyPoisonRoundStart(playerDebuffs, player.combat.maxHp)
  if (poisonDamage > 0) {
    playerHp = Math.max(0, playerHp - poisonDamage)
    logs.push(createLog(`中毒发作，你损失 ${poisonDamage} 点气血。`, 'damage'))
    if (playerHp <= 0) {
      logs.push(createLog('你中毒身亡，将自动调息恢复。', 'system'))
      tickDebuffDurations(playerDebuffs)
      return {
        logs,
        playerHp: 0,
        playerMp: skillState.playerMp,
        monsterHp,
        isFinished: true,
        playerWin: false,
        gongfaExpGain: 0,
        xiuweiGain: 0,
        skillProficiencyGains: [],
      }
    }
  }

  const playerAttack = executePlayerAttack(
    ctx.snapshot,
    monster,
    gongfa,
    skillState,
    createLog,
    { hp: playerHp, maxHp: player.combat.maxHp },
  )
  logs.push(...playerAttack.logs)
  monsterHp = playerAttack.monsterHp
  playerHp = playerAttack.playerHp

  const skillProficiencyGains: BattleSkillProficiencyGain[] = []
  if (playerAttack.castSkillId) {
    const proficiencyGain = calcSkillProficiencyGain({
      playerRealm: player.realm,
      monsterRealm: monster.realm,
      monsterTier: monster.tier,
    })
    if (proficiencyGain > 0) {
      const castSkill = getSkillById(playerAttack.castSkillId)
      skillProficiencyGains.push({
        skillId: playerAttack.castSkillId,
        amount: proficiencyGain,
      })
      logs.push(
        createLog(
          `「${castSkill?.name ?? playerAttack.castSkillId}」熟练度 +${proficiencyGain}。`,
          'skill',
        ),
      )
    }
  }

  if (monsterHp <= 0) {
    const gongfaExpGain = calcGongfaExpGain({
      monsterRealm: monster.realm,
      monsterTier: monster.tier,
      spiritRootType: player.spiritRootType,
      spiritRootElements: player.spiritRootElements,
      gongfaElement: getGongfaPrimaryElement(gongfa),
    }, player.cultivation.gongfaExpMultiplier)
    const xiuweiResult = calcBattleXiuweiGain({
      player,
      monsterRealm: monster.realm,
      monsterTier: monster.tier,
    })
    logs.push(createLog(`击败 ${monster.name}！`, 'system'))
    if (gongfaExpGain > 0) {
      logs.push(createLog(`获得功法经验 ${gongfaExpGain} 点。`, 'system'))
    }
    if (xiuweiResult.gain > 0) {
      logs.push(createLog(`获得修为 ${xiuweiResult.gain} 点。`, 'system'))
    }
    return {
      logs,
      playerHp,
      playerMp: skillState.playerMp,
      monsterHp: 0,
      isFinished: true,
      playerWin: true,
      gongfaExpGain,
      xiuweiGain: xiuweiResult.gain,
      skillProficiencyGains,
    }
  }

  const monsterAttack = executeMonsterAttack(
    monster,
    ctx.snapshot,
    monsterSkillState,
    playerDebuffs,
    createLog,
  )
  logs.push(...monsterAttack.logs)
  playerHp = Math.max(0, playerHp - monsterAttack.playerHpDelta)

  tickDebuffDurations(playerDebuffs)

  const isFinished = playerHp <= 0
  if (isFinished) {
    logs.push(createLog('你战败了，将自动调息恢复。', 'system'))
  }

  return {
    logs,
    playerHp,
    playerMp: skillState.playerMp,
    monsterHp,
    isFinished,
    playerWin: false,
    gongfaExpGain: 0,
    xiuweiGain: 0,
    skillProficiencyGains,
  }
}

/** 重置战斗日志 ID 计数（新战斗前调用） */
export function resetBattleLogCounter(): void {
  logIdCounter = 0
}
