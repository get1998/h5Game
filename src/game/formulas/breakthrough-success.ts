import {
  BREAKTHROUGH_COMPREHENSION_RATE_CAP,
  BREAKTHROUGH_COMPREHENSION_RATE_PER_POINT,
  BREAKTHROUGH_FAILURE_PITY_CAP,
  BREAKTHROUGH_FAILURE_PITY_PER_ATTEMPT,
  BREAKTHROUGH_GONGFA_LEVEL_PENALTY_MAX,
  BREAKTHROUGH_GONGFA_QUALITY_BONUS,
  BREAKTHROUGH_GONGFA_STAT_BONUS_CAP,
  BREAKTHROUGH_GONGFA_STAT_WEIGHTS,
  BREAKTHROUGH_RATE_MAX,
  BREAKTHROUGH_RATE_MIN,
  getBreakthroughBaseRate,
  getNextRealm,
  isMajorRealmBreakthrough,
} from '@/game/constants/breakthrough'
import type { Gongfa } from '@/game/models/gongfa'
import type { Player } from '@/game/models/player'
import type { RealmStage } from '@/game/types'

export interface BreakthroughSuccessRateDetail {
  /** 最终成功率（0~1） */
  rate: number
  /** 展示用百分比（整数） */
  percent: number
  /** 基础成功率 */
  baseRate: number
  /** 悟性加成 */
  comprehensionBonus: number
  /** 功法品质加成 */
  gongfaBonus: number
  /** 功法属性加成（随等级修正） */
  gongfaStatBonus: number
  /** 功法等级占用气脉惩罚 */
  gongfaLevelPenalty: number
  /** 失败保底加成 */
  failurePityBonus: number
  /** 目标境界 */
  nextRealm: RealmStage | null
  /** 是否为大境界突破 */
  isMajorBreakthrough: boolean
}

/**
 * 功法等级占用气脉，降低突破成功率
 */
export function calcGongfaLevelPenalty(gongfa: Gongfa | undefined): number {
  if (!gongfa || gongfa.maxLevel <= 0) return 0
  return (gongfa.level / gongfa.maxLevel) * BREAKTHROUGH_GONGFA_LEVEL_PENALTY_MAX
}

/**
 * 功法属性折算突破成功率加成，随等级修正（1 级 50%，满级 100%）
 */
export function calcGongfaStatBreakthroughBonus(gongfa: Gongfa | undefined): number {
  if (!gongfa || gongfa.maxLevel <= 0) return 0

  const levelFactor = 0.5 + 0.5 * (gongfa.level / gongfa.maxLevel)
  const weights = BREAKTHROUGH_GONGFA_STAT_WEIGHTS
  const raw =
    gongfa.attackBonus * weights.attack
    + gongfa.defenseBonus * weights.defense
    + gongfa.hpBonus * weights.hp
    + gongfa.mpBonus * weights.mp
    + gongfa.speedBonus * weights.speed
    + gongfa.critRateBonus * weights.critRate
    + gongfa.critDamageBonus * weights.critDamage
    + gongfa.penetrationBonus * weights.penetration
    + gongfa.tenacityBonus * weights.tenacity

  return Math.min(BREAKTHROUGH_GONGFA_STAT_BONUS_CAP, raw * levelFactor)
}

/**
 * 计算当前境界突破成功率
 */
export function calcBreakthroughSuccessRate(
  player: Player,
  gongfa: Gongfa | undefined,
  failureCount: number,
): BreakthroughSuccessRateDetail {
  const nextRealm = getNextRealm(player.realm)
  if (!nextRealm) {
    return {
      rate: 0,
      percent: 0,
      baseRate: 0,
      comprehensionBonus: 0,
      gongfaBonus: 0,
      gongfaStatBonus: 0,
      gongfaLevelPenalty: 0,
      failurePityBonus: 0,
      nextRealm: null,
      isMajorBreakthrough: false,
    }
  }

  const baseRate = getBreakthroughBaseRate(player.realm, nextRealm)
  const comprehensionBonus = Math.min(
    BREAKTHROUGH_COMPREHENSION_RATE_CAP,
    player.special.comprehension * BREAKTHROUGH_COMPREHENSION_RATE_PER_POINT,
  )
  const gongfaBonus = gongfa
    ? (BREAKTHROUGH_GONGFA_QUALITY_BONUS[gongfa.quality] ?? 0)
    : 0
  const gongfaStatBonus = calcGongfaStatBreakthroughBonus(gongfa)
  const gongfaLevelPenalty = calcGongfaLevelPenalty(gongfa)
  const failurePityBonus = Math.min(
    BREAKTHROUGH_FAILURE_PITY_CAP,
    failureCount * BREAKTHROUGH_FAILURE_PITY_PER_ATTEMPT,
  )

  const rate = Math.min(
    BREAKTHROUGH_RATE_MAX,
    Math.max(
      BREAKTHROUGH_RATE_MIN,
      baseRate
        + comprehensionBonus
        + gongfaBonus
        + gongfaStatBonus
        + failurePityBonus
        - gongfaLevelPenalty,
    ),
  )

  return {
    rate,
    percent: Math.floor(rate * 100),
    baseRate,
    comprehensionBonus,
    gongfaBonus,
    gongfaStatBonus,
    gongfaLevelPenalty,
    failurePityBonus,
    nextRealm,
    isMajorBreakthrough: isMajorRealmBreakthrough(player.realm, nextRealm),
  }
}

/**
 * 掷骰判定突破是否成功
 */
export function rollBreakthroughSuccess(rate: number): boolean {
  return Math.random() < rate
}
