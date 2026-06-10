import {
  ACHIEVEMENT_DEFINITIONS,
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
