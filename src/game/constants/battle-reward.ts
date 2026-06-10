import type { MonsterTier } from '@/game/models/monster'

/**
 * 击杀修为奖励 — 数值配置（策划调表入口）
 *
 * 统一公式：
 *   raw = 当前境界突破所需修为 × BASE_RATE × 境界差倍率 × 品阶倍率
 *
 * 设计目标（仅调本文件常量即可，无需改计算逻辑）：
 * - 同级精英 ≈ 0.6% 突破条；同级首领 ≈ 1% 突破条
 * - 同级普通 ≈ 0（品阶倍率足够低 + 取整）
 * - 怪物境界高于玩家 2 小境时，即使普通品阶也可获得少量修为
 * - 低于玩家 3 小境及以上 → 0
 */

/** 同级精英基准：占当前境界突破所需修为的比例（0.006 = 0.6%） */
export const BATTLE_XIUWEI_BASE_RATE = 0.006

/**
 * 怪物品阶倍率（相对精英 = 1.0）
 * - 普通故意设低：同级几乎无收益，但高境界差时仍能被境界倍率放大
 * - 首领 1.667 × 0.006 ≈ 1.0% 突破条（同级锚点）
 */
export const BATTLE_XIUWEI_TIER_MULTIPLIERS: Record<MonsterTier, number> = {
  普通: 0.34,
  精英: 1,
  首领: 1.667,
  传奇: 2.5,
}

/**
 * 境界差倍率（怪物境界 − 玩家境界，单位：小境界）
 * key 为 diff；超出区间时向最近边界 clamp（不写死具体境界名）
 */
export const BATTLE_XIUWEI_REALM_MULTIPLIER_BY_DIFF: Readonly<Record<number, number>> = {
  [-3]: 0,
  [-2]: 0.15,
  [-1]: 0.4,
  [0]: 1,
  [1]: 1.35,
  [2]: 1.7,
  [3]: 2.1,
  [4]: 2.5,
}

/**
 * raw 低于此阈值视为 0 修为（过滤同级普通的微量浮动）
 * raw 达到阈值但未满 1 时，给予 MIN_GAIN（避免高境界差普通怪被 floor 成 0）
 */
export const BATTLE_XIUWEI_MIN_GAIN_RAW_THRESHOLD = 0.55
export const BATTLE_XIUWEI_MIN_GAIN = 1

/**
 * 根据境界差读取倍率（数据表驱动，仅做区间 clamp）
 */
export function getBattleXiuweiRealmMultiplier(realmDiff: number): number {
  const diffs = Object.keys(BATTLE_XIUWEI_REALM_MULTIPLIER_BY_DIFF)
    .map(Number)
    .sort((a, b) => a - b)

  const minDiff = diffs[0]
  const maxDiff = diffs[diffs.length - 1]

  if (realmDiff <= minDiff) {
    return BATTLE_XIUWEI_REALM_MULTIPLIER_BY_DIFF[minDiff]
  }
  if (realmDiff >= maxDiff) {
    return BATTLE_XIUWEI_REALM_MULTIPLIER_BY_DIFF[maxDiff]
  }

  const exact = BATTLE_XIUWEI_REALM_MULTIPLIER_BY_DIFF[realmDiff]
  return exact ?? BATTLE_XIUWEI_REALM_MULTIPLIER_BY_DIFF[maxDiff]
}

/**
 * 读取品阶倍率
 */
export function getBattleXiuweiTierMultiplier(tier: MonsterTier): number {
  return BATTLE_XIUWEI_TIER_MULTIPLIERS[tier]
}
