import {
  getRealmMajor,
  REALM_ORDER,
  type RealmStage,
} from '@/game/constants/realm'

/** 小境界突破基础成功率 */
export const BREAKTHROUGH_MINOR_BASE_RATE = 0.9

/** 大境界突破基础成功率（目标大境界 → 成功率） */
export const BREAKTHROUGH_MAJOR_BASE_RATE: Record<string, number> = {
  筑基: 0.68,
  金丹: 0.58,
  元婴: 0.5,
  化神: 0.42,
}

/** 每次失败累加的成功率（上限见 BREAKTHROUGH_FAILURE_PITY_CAP） */
export const BREAKTHROUGH_FAILURE_PITY_PER_ATTEMPT = 0.05

/** 失败保底加成上限 */
export const BREAKTHROUGH_FAILURE_PITY_CAP = 0.3

/** 悟性每点提供的成功率加成 */
export const BREAKTHROUGH_COMPREHENSION_RATE_PER_POINT = 0.001

/** 悟性加成上限 */
export const BREAKTHROUGH_COMPREHENSION_RATE_CAP = 0.1

/** 突破失败时损失的修为比例（相对当前境界突破所需） */
export const BREAKTHROUGH_FAILURE_XIUWEI_LOSS_RATE = 0.15

/** 成功率下限 / 上限 */
export const BREAKTHROUGH_RATE_MIN = 0.05
export const BREAKTHROUGH_RATE_MAX = 0.99

/**
 * 突破战斗属性 — 灵根适配倍率（仅缩放境界基础战斗面板）
 * 与闭关 / 功法经验的 SPIRIT_ROOT_ADAPT_MULTIPLIER 独立，便于单独调战斗强度
 */
export const BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER = {
  单灵根: 1.15,
  双灵根: 1.08,
  杂灵根: 0.92,
} as const

/**
 * 突破战斗属性 — 五行隐藏系数（灵根主属性 vs 功法属性）
 * 与闭关 / 功法经验的 ELEMENT_HIDDEN_MULTIPLIER 独立
 */
export const BREAKTHROUGH_STAT_ELEMENT_HIDDEN_MULTIPLIER = {
  same: 1.15,
  generate: 1.08,
  overcome: 0.85,
  neutral: 1,
} as const

/** 功法品质突破加成 */
export const BREAKTHROUGH_GONGFA_QUALITY_BONUS: Record<string, number> = {
  凡品: 0,
  黄品: 0.02,
  玄品: 0.04,
  地品: 0.06,
  天品: 0.08,
  仙品: 0.1,
  神品: 0.12,
}

/** 功法等级占用气脉，满级时达到该惩罚上限（降低突破成功率） */
export const BREAKTHROUGH_GONGFA_LEVEL_PENALTY_MAX = 0.06

/** 功法属性折算突破成功率加成上限 */
export const BREAKTHROUGH_GONGFA_STAT_BONUS_CAP = 0.12

/** 功法属性折算突破成功率权重（与等级修正相乘） */
export const BREAKTHROUGH_GONGFA_STAT_WEIGHTS = {
  attack: 0.0008,
  defense: 0.0005,
  hp: 0.00004,
  mp: 0.00006,
  speed: 0.0004,
  critRate: 0.15,
  critDamage: 0.02,
  penetration: 0.0004,
  tenacity: 0.0004,
} as const

/**
 * 判断是否为大境界突破（如炼气 → 筑基）
 */
export function isMajorRealmBreakthrough(
  currentRealm: RealmStage,
  nextRealm: RealmStage,
): boolean {
  return getRealmMajor(currentRealm) !== getRealmMajor(nextRealm)
}

/**
 * 获取下一境界
 */
export function getNextRealm(currentRealm: RealmStage): RealmStage | null {
  const index = REALM_ORDER.indexOf(currentRealm)
  if (index < 0 || index >= REALM_ORDER.length - 1) return null
  return REALM_ORDER[index + 1]
}

/**
 * 读取突破基础成功率
 */
export function getBreakthroughBaseRate(
  currentRealm: RealmStage,
  nextRealm: RealmStage,
): number {
  if (isMajorRealmBreakthrough(currentRealm, nextRealm)) {
    const targetMajor = getRealmMajor(nextRealm)
    return BREAKTHROUGH_MAJOR_BASE_RATE[targetMajor] ?? 0.5
  }
  return BREAKTHROUGH_MINOR_BASE_RATE
}
