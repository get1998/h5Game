import type { SkillCategory, SkillType } from '@/game/models/skill'
import { isSkillProficiencyMaxed } from '@/game/models/skill'
import type { GongfaQuality } from '@/game/types'
import { SKILL_PROFICIENCY_RANK_MULTIPLIER } from '@/game/constants/skill-level'
import {
  createEmptyCombatContribution,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'

/** 绝技圆满被动倍率（相对同分类主动技能） */
export const SKILL_MASTERY_ULTIMATE_MULTIPLIER = 1.5

/**
 * 凡品基准：技能圆满后按效果分类给予的永久被动
 * 数值随功法品质倍率缩放；绝技再乘 SKILL_MASTERY_ULTIMATE_MULTIPLIER
 */
export const SKILL_MASTERY_PASSIVE_BY_CATEGORY: Record<SkillCategory, CombatStatContribution> = {
  attack: {
    ...createEmptyCombatContribution(),
    attack: 1,
    penetration: 1,
  },
  defense: {
    ...createEmptyCombatContribution(),
    defense: 2,
    damageReduction: 0.005,
  },
  heal: {
    ...createEmptyCombatContribution(),
    maxHp: 8,
    maxHpPercent: 0.005,
  },
  buff: {
    ...createEmptyCombatContribution(),
    speed: 1,
    critRate: 0.003,
  },
  passive: {
    ...createEmptyCombatContribution(),
    tenacity: 2,
    damageReduction: 0.005,
  },
}

function scaleCombatContribution(
  base: CombatStatContribution,
  multiplier: number,
): CombatStatContribution {
  const result = createEmptyCombatContribution()
  for (const key of Object.keys(result) as (keyof CombatStatContribution)[]) {
    const value = base[key]
    if (typeof value === 'number' && value !== 0) {
      const scaled = value * multiplier
      result[key] = Number.isInteger(value)
        ? Math.round(scaled)
        : Number(scaled.toFixed(4))
    }
  }
  return result
}

/**
 * 技能是否已达圆满（可激活圆满永久被动）
 */
export function isSkillMasteryPassiveUnlocked(
  proficiency: number,
  quality: GongfaQuality,
): boolean {
  return isSkillProficiencyMaxed(proficiency, quality)
}

/**
 * 计算单条技能圆满永久被动贡献
 */
export function getSkillMasteryPassiveContribution(
  category: SkillCategory,
  skillType: SkillType,
  quality: GongfaQuality,
): CombatStatContribution {
  const base = SKILL_MASTERY_PASSIVE_BY_CATEGORY[category] ?? createEmptyCombatContribution()
  const qualityMultiplier = SKILL_PROFICIENCY_RANK_MULTIPLIER[quality] ?? 1
  const typeMultiplier = skillType === 'ultimate' ? SKILL_MASTERY_ULTIMATE_MULTIPLIER : 1
  return scaleCombatContribution(base, qualityMultiplier * typeMultiplier)
}

function formatPercentStat(value: number): string {
  const percent = value * 100
  const rounded = Math.round(percent * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * 将圆满永久被动贡献格式化为展示文案
 */
export function formatSkillMasteryPassiveDescription(
  category: SkillCategory,
  skillType: SkillType,
  quality: GongfaQuality,
): string {
  const contribution = getSkillMasteryPassiveContribution(category, skillType, quality)
  const parts: string[] = []

  if (contribution.attack) parts.push(`攻击+${contribution.attack}`)
  if (contribution.defense) parts.push(`防御+${contribution.defense}`)
  if (contribution.maxHp) parts.push(`气血+${contribution.maxHp}`)
  if (contribution.maxMp) parts.push(`灵力上限+${contribution.maxMp}`)
  if (contribution.speed) parts.push(`速度+${contribution.speed}`)
  if (contribution.penetration) parts.push(`穿透+${contribution.penetration}`)
  if (contribution.tenacity) parts.push(`韧性+${contribution.tenacity}`)
  if (contribution.critRate) parts.push(`暴击率+${formatPercentStat(contribution.critRate)}%`)
  if (contribution.critDamage) parts.push(`暴击伤害+${formatPercentStat(contribution.critDamage)}%`)
  if (contribution.maxHpPercent) parts.push(`气血+${formatPercentStat(contribution.maxHpPercent)}%`)
  if (contribution.defensePercent) parts.push(`防御+${formatPercentStat(contribution.defensePercent)}%`)
  if (contribution.damageReduction) {
    parts.push(`减伤+${formatPercentStat(contribution.damageReduction)}%`)
  }

  return parts.length > 0 ? parts.join('，') : '无'
}
