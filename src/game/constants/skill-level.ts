/** 技能等级（由熟练度达标后晋升） */
export type SkillLevel = '小成' | '大成' | '圆满'

/** 技能等级顺序（由低到高） */
export const SKILL_LEVEL_ORDER: SkillLevel[] = ['小成', '大成', '圆满']

/** 技能等级对应的伤害/效果系数 */
export const SKILL_LEVEL_COEFFICIENT: Record<SkillLevel, number> = {
  小成: 1.2,
  大成: 1.5,
  圆满: 1.8,
}

/**
 * 各 SkillLevel 所需的最低熟练度
 * 解锁技能时熟练度为 0，即已达「小成」门槛
 */
export const SKILL_PROFICIENCY_THRESHOLDS: Record<SkillLevel, number> = {
  小成: 0,
  大成: 400,
  圆满: 1200,
}

/** 单次施展技能的基础熟练度增量（再乘境界差倍率） */
export const SKILL_PROFICIENCY_BASE_GAIN = 8

/**
 * 根据熟练度判定当前技能等级
 */
export function getSkillLevelFromProficiency(proficiency: number): SkillLevel {
  if (proficiency >= SKILL_PROFICIENCY_THRESHOLDS.圆满) return '圆满'
  if (proficiency >= SKILL_PROFICIENCY_THRESHOLDS.大成) return '大成'
  return '小成'
}

/**
 * 获取技能等级对应的效果系数
 */
export function getSkillLevelCoefficient(level: SkillLevel): number {
  return SKILL_LEVEL_COEFFICIENT[level]
}

/**
 * 根据熟练度获取效果系数
 */
export function getSkillProficiencyCoefficient(proficiency: number): number {
  return getSkillLevelCoefficient(getSkillLevelFromProficiency(proficiency))
}

/**
 * 获取升至下一 SkillLevel 所需熟练度；已满级时返回 null
 */
export function getNextSkillLevelThreshold(currentLevel: SkillLevel): number | null {
  const index = SKILL_LEVEL_ORDER.indexOf(currentLevel)
  const nextLevel = SKILL_LEVEL_ORDER[index + 1]
  if (!nextLevel) return null
  return SKILL_PROFICIENCY_THRESHOLDS[nextLevel]
}
