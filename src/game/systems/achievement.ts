import {
  ACHIEVEMENT_DEFINITIONS,
  calcUpgradeAchievementLevel,
  isUpgradeAchievement,
  type AchievementDefinition,
} from '@/game/constants/achievements'
import { isRealmAtLeast } from '@/game/constants/realm'
import type { Gongfa } from '@/game/models/gongfa'
import {
  calcWorldTotalDays,
  type AchievementRecord,
  type AchievementState,
} from '@/game/models/achievement'
import type { Player } from '@/game/models/player'
import type { WorldTime } from '@/game/systems/time'
import type { RealmStage } from '@/game/types'

/** 成就检测上下文 */
export interface AchievementCheckContext {
  player: Player
  gongfaList: Gongfa[]
  worldTime: WorldTime
}

/** 单条成就解锁结果 */
export interface AchievementUnlockResult {
  achievementId: string
  name: string
  description: string
  rewardTitleId?: string
}

/** 升级类成就升阶结果 */
export interface AchievementLevelUpResult {
  achievementId: string
  name: string
  description: string
  oldLevel: number
  newLevel: number
}

function isAchievementUnlocked(
  state: AchievementState,
  achievementId: string,
): boolean {
  return state.records[achievementId]?.unlockedAtDay != null
}

function getOrCreateRecord(
  state: AchievementState,
  achievementId: string,
): AchievementRecord {
  if (!state.records[achievementId]) {
    state.records[achievementId] = { unlockedAtDay: null, progress: 0 }
  }
  return state.records[achievementId]
}

/**
 * 计算成就当前进度与是否满足解锁条件
 */
export function calcAchievementProgress(
  definition: AchievementDefinition,
  state: AchievementState,
  context: AchievementCheckContext,
): { progress: number; target: number; satisfied: boolean } {
  const target = typeof definition.conditionValue === 'number'
    ? definition.conditionValue
    : 1

  switch (definition.conditionType) {
    case 'manual':
      return { progress: 0, target: 1, satisfied: false }
    case 'realm_min': {
      const realm = definition.conditionValue as RealmStage
      const satisfied = isRealmAtLeast(context.player.realm, realm)
      return { progress: satisfied ? 1 : 0, target: 1, satisfied }
    }
    case 'battle_wins': {
      const progress = state.counters.battleWins
      return { progress, target, satisfied: progress >= target }
    }
    case 'breakthroughs': {
      const progress = state.counters.breakthroughs
      return { progress, target, satisfied: progress >= target }
    }
    case 'gongfa_count': {
      const progress = context.gongfaList.length
      return { progress, target, satisfied: progress >= target }
    }
    case 'gongfa_max_level': {
      const maxLevelCount = context.gongfaList.filter(
        (g) => g.level >= g.maxLevel,
      ).length
      return {
        progress: maxLevelCount,
        target,
        satisfied: maxLevelCount >= target,
      }
    }
    case 'flee_failures': {
      const progress = state.counters.fleeFailures
      const perLevel = definition.progressPerLevel ?? 1
      const maxLevel = definition.maxLevel ?? 99
      const level = calcUpgradeAchievementLevel(definition, progress)
      return {
        progress,
        target: maxLevel * perLevel,
        satisfied: level >= 1,
      }
    }
    default:
      return { progress: 0, target: 1, satisfied: false }
  }
}

/**
 * 检测并解锁满足条件的成就，返回本次新解锁列表
 */
export function checkAndUnlockAchievements(
  state: AchievementState,
  context: AchievementCheckContext,
): AchievementUnlockResult[] {
  const unlocked: AchievementUnlockResult[] = []
  const unlockedAtDay = calcWorldTotalDays(
    context.worldTime.year,
    context.worldTime.month,
    context.worldTime.day,
  )

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (isUpgradeAchievement(definition)) continue
    if (isAchievementUnlocked(state, definition.id)) continue

    const { progress, satisfied } = calcAchievementProgress(
      definition,
      state,
      context,
    )
    const record = getOrCreateRecord(state, definition.id)
    record.progress = progress

    if (!satisfied) continue

    record.unlockedAtDay = unlockedAtDay
    record.progress = Math.max(record.progress, typeof definition.conditionValue === 'number'
      ? definition.conditionValue
      : 1)

    unlocked.push({
      achievementId: definition.id,
      name: definition.name,
      description: definition.description,
      rewardTitleId: definition.rewardTitleId,
    })
  }

  return unlocked
}

/**
 * 手动解锁成就（如角色创建完成）
 */
export function unlockAchievementManually(
  state: AchievementState,
  achievementId: string,
  context: AchievementCheckContext,
): AchievementUnlockResult | null {
  const definition = ACHIEVEMENT_DEFINITIONS.find((item) => item.id === achievementId)
  if (!definition || isAchievementUnlocked(state, achievementId)) return null

  const unlockedAtDay = calcWorldTotalDays(
    context.worldTime.year,
    context.worldTime.month,
    context.worldTime.day,
  )
  const record = getOrCreateRecord(state, achievementId)
  record.unlockedAtDay = unlockedAtDay
  record.progress = 1

  return {
    achievementId: definition.id,
    name: definition.name,
    description: definition.description,
    rewardTitleId: definition.rewardTitleId,
  }
}

/**
 * 同步升级类成就等级，返回本次升阶列表
 */
export function syncUpgradeAchievements(
  state: AchievementState,
  context: AchievementCheckContext,
): AchievementLevelUpResult[] {
  const levelUps: AchievementLevelUpResult[] = []
  const unlockedAtDay = calcWorldTotalDays(
    context.worldTime.year,
    context.worldTime.month,
    context.worldTime.day,
  )

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (!isUpgradeAchievement(definition)) continue

    const { progress } = calcAchievementProgress(definition, state, context)
    const newLevel = calcUpgradeAchievementLevel(definition, progress)
    const record = getOrCreateRecord(state, definition.id)
    const oldLevel = record.level ?? 0

    record.progress = progress
    record.level = newLevel

    if (newLevel > 0 && record.unlockedAtDay == null) {
      record.unlockedAtDay = unlockedAtDay
    }

    if (newLevel > oldLevel) {
      levelUps.push({
        achievementId: definition.id,
        name: definition.name,
        description: definition.description,
        oldLevel,
        newLevel,
      })
    }
  }

  return levelUps
}
