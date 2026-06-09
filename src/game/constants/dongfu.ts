/** 洞府等级配置 */
export interface DongfuLevelConfig {
  level: number
  name: string
  /** 灵气上限 */
  maxLingqi: number
  /** 非闭关时每秒基础聚灵恢复 */
  recoveryPerSec: number
}

/** 洞府等级表（1 级起） */
export const DONGFU_LEVEL_CONFIG: DongfuLevelConfig[] = [
  { level: 1, name: '简陋洞府', maxLingqi: 100, recoveryPerSec: 0.5 },
  { level: 2, name: '清幽洞府', maxLingqi: 120, recoveryPerSec: 1 },
  { level: 3, name: '灵气洞府', maxLingqi: 150, recoveryPerSec: 2 },
  { level: 4, name: '聚灵洞府', maxLingqi: 180, recoveryPerSec: 3 },
  { level: 5, name: '仙家洞府', maxLingqi: 220, recoveryPerSec: 4 },
  { level: 6, name: '福地洞天', maxLingqi: 280, recoveryPerSec: 5 },
  { level: 7, name: '灵脉洞府', maxLingqi: 350, recoveryPerSec: 6 },
  { level: 8, name: '仙府', maxLingqi: 450, recoveryPerSec: 7 },
  { level: 9, name: '洞天福地', maxLingqi: 580, recoveryPerSec: 8 },
  { level: 10, name: '无上仙府', maxLingqi: 750, recoveryPerSec: 9 },
]

export const DONGFU_MAX_LEVEL = DONGFU_LEVEL_CONFIG.length

/**
 * 根据洞府等级获取配置
 */
export function getDongfuLevelConfig(level: number): DongfuLevelConfig {
  const clamped = Math.max(1, Math.min(level, DONGFU_MAX_LEVEL))
  return DONGFU_LEVEL_CONFIG[clamped - 1]
}

/**
 * 获取洞府灵气上限
 */
export function getDongfuMaxLingqi(level: number): number {
  return getDongfuLevelConfig(level).maxLingqi
}
