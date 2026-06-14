import {
  ACHIEVEMENT_DEFINITIONS,
  calcUpgradeAchievementLevel,
  isUpgradeAchievement,
} from '@/game/constants/achievements'
import {
  createEmptyCombatContribution,
  mergeCombatContributions,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'
import type { AchievementState } from '@/game/models/achievement'
import type { StatContributor } from '@/game/systems/stat-contributors/types'

export const ACHIEVEMENT_STAT_CONTRIBUTOR_ID = 'achievement'

/**
 * 汇总升级类成就提供的永久战斗属性加成
 */
export function getAchievementCombatContribution(
  achievements: AchievementState | undefined,
): CombatStatContribution {
  if (!achievements) return createEmptyCombatContribution()

  const items: CombatStatContribution[] = []

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (!isUpgradeAchievement(definition) || !definition.combatBonusPerLevel) continue

    const record = achievements.records[definition.id]
    const progress = record?.progress
      ?? (definition.conditionType === 'flee_failures'
        ? achievements.counters.fleeFailures
        : 0)
    const level = record?.level ?? calcUpgradeAchievementLevel(definition, progress)
    if (level <= 0) continue

    const perLevel = definition.combatBonusPerLevel
    const scaled = createEmptyCombatContribution()

    scaled.attack = (perLevel.attack ?? 0) * level
    scaled.defense = (perLevel.defense ?? 0) * level
    scaled.maxHp = (perLevel.maxHp ?? 0) * level
    scaled.maxMp = (perLevel.maxMp ?? 0) * level
    scaled.speed = (perLevel.speed ?? 0) * level
    scaled.critRate = (perLevel.critRate ?? 0) * level
    scaled.critDamage = (perLevel.critDamage ?? 0) * level
    scaled.penetration = (perLevel.penetration ?? 0) * level
    scaled.tenacity = (perLevel.tenacity ?? 0) * level
    scaled.attackPercent = (perLevel.attackPercent ?? 0) * level
    scaled.defensePercent = (perLevel.defensePercent ?? 0) * level
    scaled.maxHpPercent = (perLevel.maxHpPercent ?? 0) * level
    scaled.maxMpPercent = (perLevel.maxMpPercent ?? 0) * level
    scaled.speedPercent = (perLevel.speedPercent ?? 0) * level
    scaled.damageReduction = (perLevel.damageReduction ?? 0) * level

    items.push(scaled)
  }

  return items.length > 0
    ? mergeCombatContributions(...items)
    : createEmptyCombatContribution()
}

/** 成就属性贡献者（升级类成就永久生效） */
export const achievementStatContributor: StatContributor = {
  id: ACHIEVEMENT_STAT_CONTRIBUTOR_ID,
  isActive(context) {
    return Boolean(context.achievements)
  },
  getCombatContribution(context) {
    return getAchievementCombatContribution(context.achievements)
  },
}
