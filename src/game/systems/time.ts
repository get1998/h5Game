import {
  DAYS_PER_MONTH,
  ERA_NAME,
  LUNAR_MONTH_NAMES,
  MONTHS_PER_YEAR,
} from '@/game/constants/time'

/** 游戏世界日期 */
export interface WorldTime {
  year: number
  month: number
  day: number
  /** 上次现实时间推进锚点（毫秒时间戳，页面打开期间推进） */
  lastRealTickAt: number
}

/**
 * 创建初始世界时间
 */
export function createInitialWorldTime(now = Date.now()): WorldTime {
  return {
    year: 1000,
    month: 1,
    day: 1,
    lastRealTickAt: now,
  }
}

/**
 * 将游戏日推进指定天数，返回新日期与跨过的整年数
 */
export function advanceWorldTime(
  time: WorldTime,
  days: number,
): { time: WorldTime; yearsAdded: number } {
  if (days <= 0) {
    return { time: { ...time }, yearsAdded: 0 }
  }

  let { year, month, day } = time
  let yearsAdded = 0

  for (let i = 0; i < days; i += 1) {
    day += 1
    if (day > DAYS_PER_MONTH) {
      day = 1
      month += 1
      if (month > MONTHS_PER_YEAR) {
        month = 1
        year += 1
        yearsAdded += 1
      }
    }
  }

  return {
    time: {
      ...time,
      year,
      month,
      day,
    },
    yearsAdded,
  }
}

/**
 * 根据现实经过毫秒计算应推进的游戏日数
 */
export function calcGameDaysFromRealMs(elapsedMs: number, msPerDay: number): number {
  if (elapsedMs <= 0 || msPerDay <= 0) return 0
  return Math.floor(elapsedMs / msPerDay)
}

/**
 * 将世界时间锚点同步到指定现实时刻（冻结或恢复计时，不推进游戏日）
 */
export function syncWorldTimeAnchor(time: WorldTime, now: number): WorldTime {
  return {
    ...time,
    lastRealTickAt: now,
  }
}

/**
 * 注册 H5 页面卸载监听：关闭标签页或关闭浏览器时触发（切后台不触发）。
 *
 * @returns 卸载监听函数
 */
export function bindH5PageUnload(onUnload: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener('pagehide', onUnload)

  return () => {
    window.removeEventListener('pagehide', onUnload)
  }
}

/**
 * 将世界时间换算为从纪元起的累计游戏日（用于每日刷新等）
 */
export function calcTotalGameDays(time: Pick<WorldTime, 'year' | 'month' | 'day'>): number {
  const baseYear = 1000
  return (
    (time.year - baseYear) * MONTHS_PER_YEAR * DAYS_PER_MONTH
    + (time.month - 1) * DAYS_PER_MONTH
    + (time.day - 1)
  )
}

/**
 * 格式化为农历日（初一、初二…）
 */
export function formatLunarDay(day: number): string {
  const nums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (day <= 10) return `初${nums[day]}`
  if (day < 20) return `十${nums[day - 10]}`
  if (day === 20) return '二十'
  if (day < 30) return `廿${nums[day - 20]}`
  return '三十'
}

/**
 * 格式化游戏日期为「天元历 1000年 三月 十五」
 */
export function formatGameDate(time: Pick<WorldTime, 'year' | 'month' | 'day'>): string {
  const monthName = LUNAR_MONTH_NAMES[time.month - 1] ?? `${time.month}月`
  return `${ERA_NAME} ${time.year}年 ${monthName} ${formatLunarDay(time.day)}`
}
