/** 成就累计计数器 */
export interface AchievementCounters {
  /** 历练战胜妖兽次数 */
  battleWins: number
  /** 境界突破次数 */
  breakthroughs: number
  /** 历练中逃跑失败次数 */
  fleeFailures: number
}

/** 单条成就进度 */
export interface AchievementRecord {
  /** 解锁时的游戏总日数（年×360+月×30+日），未解锁为 null */
  unlockedAtDay: number | null
  /** 当前进度值（用于可累计类成就展示） */
  progress: number
  /** 升级类成就当前等级（0 表示尚未激活） */
  level?: number
}

/** 玩家成就存档 */
export interface AchievementState {
  records: Record<string, AchievementRecord>
  counters: AchievementCounters
}

/** 创建默认成就状态 */
export function createDefaultAchievementState(): AchievementState {
  return {
    records: {},
    counters: {
      battleWins: 0,
      breakthroughs: 0,
      fleeFailures: 0,
    },
  }
}

/** 将世界日期换算为总日数（用于成就解锁时间戳） */
export function calcWorldTotalDays(year: number, month: number, day: number): number {
  return year * 360 + (month - 1) * 30 + day
}
