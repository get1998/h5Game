/** 修仙历法：每月天数 */
export const DAYS_PER_MONTH = 30

/** 修仙历法：每年月数 */
export const MONTHS_PER_YEAR = 12

/** 修仙历法：每年天数 */
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR

/** 现实毫秒对应 1 游戏日（默认 3 秒 = 1 日） */
export const REAL_MS_PER_GAME_DAY = 3000

/** 纪元名称 */
export const ERA_NAME = '天元历'

/** 农历月份名称 */
export const LUNAR_MONTH_NAMES = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '冬月',
  '腊月',
] as const
