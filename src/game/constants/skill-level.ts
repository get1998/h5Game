import type { GongfaQuality } from "../types"

/** 技能等级（由熟练度达标后晋升） */
export type SkillLevel = '入门' | '小成' | '大成' | '圆满'

/** 技能等级顺序（由低到高） */
export const SKILL_LEVEL_ORDER: SkillLevel[] = ['入门', '小成', '大成', '圆满']

/** 技能等级对应的伤害/效果系数 */
export const SKILL_LEVEL_COEFFICIENT: Record<SkillLevel, number> = {
  入门: 0.95,
  小成: 1.2,
  大成: 1.5,
  圆满: 2.2,
}

/**
 * 各 SkillLevel 所需的最低熟练度
 * 解锁技能时熟练度为 0，即「入门」；达门槛后依次晋升小成 / 大成 / 圆满
 */
export const SKILL_PROFICIENCY_THRESHOLDS: Record<SkillLevel, number> = {
  入门: 0,
  小成: 800,
  大成: 1600,
  圆满: 4800,
}
/**
 * 技能品阶对应的熟练度倍率
 */
export const SKILL_PROFICIENCY_RANK_MULTIPLIER: Record<GongfaQuality, number> = {
  凡品: 1.0,
  黄品: 1.2,
  玄品: 1.4,
  地品: 1.6,
  天品: 1.8,
  仙品: 2.0,
  神品: 2.2,
}

/** 单次施展技能的基础熟练度增量（再乘境界差倍率） */
export const SKILL_PROFICIENCY_BASE_GAIN = 4

/** 单次施展技能至少获得的熟练度（含越级碾压低境界怪） */
export const SKILL_PROFICIENCY_MIN_GAIN = 2

/** 以技能击杀怪物时，额外熟练度 = 单次施展增量 × 该比例 */
export const SKILL_KILL_PROFICIENCY_BONUS_RATIO = 1.5

/**
 * 境界差熟练度倍率（怪物境界 − 玩家境界，单位：小境界）
 * 低于玩家时倍率降低但仍可获得熟练度（最终由 MIN_GAIN 保底）
 */
export const SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF: Readonly<Record<number, number>> = {
  [-3]: 0.08,
  [-2]: 0.15,
  [-1]: 0.4,
  [0]: 1,
  [1]: 1.35,
  [2]: 1.7,
  [3]: 2.1,
  [4]: 2.5,
}

/**
 * 根据境界差读取熟练度倍率（数据表驱动，区间外向边界 clamp）
 */
export function getSkillProficiencyRealmMultiplierByDiff(realmDiff: number): number {
  const diffs = Object.keys(SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF)
    .map(Number)
    .sort((a, b) => a - b)

  const minDiff = diffs[0]
  const maxDiff = diffs[diffs.length - 1]

  if (realmDiff <= minDiff) {
    return SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF[minDiff]
  }
  if (realmDiff >= maxDiff) {
    return SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF[maxDiff]
  }

  const exact = SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF[realmDiff]
  return exact ?? SKILL_PROFICIENCY_REALM_MULTIPLIER_BY_DIFF[maxDiff]
}

/**
 * 读取指定等级在功法品质下的熟练度门槛
 */
export function getSkillProficiencyThreshold(
  level: SkillLevel,
  quality: GongfaQuality,
): number {
  return SKILL_PROFICIENCY_THRESHOLDS[level] * SKILL_PROFICIENCY_RANK_MULTIPLIER[quality]
}

/**
 * 根据熟练度与功法品质判定当前技能等级（从高到低匹配）
 */
export function getSkillLevelFromProficiency(
  proficiency: number,
  quality: GongfaQuality = '凡品',
): SkillLevel {
  if (proficiency >= getSkillProficiencyThreshold('圆满', quality)) return '圆满'
  if (proficiency >= getSkillProficiencyThreshold('大成', quality)) return '大成'
  if (proficiency >= getSkillProficiencyThreshold('小成', quality)) return '小成'
  return '入门'
}

/**
 * 获取技能等级对应的效果系数
 */
export function getSkillLevelCoefficient(level: SkillLevel): number {
  return SKILL_LEVEL_COEFFICIENT[level]
}

/**
 * 根据熟练度与功法品质获取效果系数
 */
export function getSkillProficiencyCoefficient(
  proficiency: number,
  quality: GongfaQuality = '凡品',
): number {
  return getSkillLevelCoefficient(getSkillLevelFromProficiency(proficiency, quality))
}

/**
 * 获取升至下一 SkillLevel 所需熟练度；已满级时返回 null
 * @param currentLevel - 当前技能等级
 * @param currentQuality - 当前技能品阶
 * @returns 升至下一 SkillLevel 所需熟练度；已满级时返回 null
 */
export function getNextSkillLevelThreshold(currentLevel: SkillLevel, currentQuality: GongfaQuality): number | null {
  const index = SKILL_LEVEL_ORDER.indexOf(currentLevel)
  const nextLevel = SKILL_LEVEL_ORDER[index + 1]
  if (!nextLevel) return null
  return getSkillProficiencyThreshold(nextLevel, currentQuality)
}
