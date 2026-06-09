/** 阵法等级配置 */
export interface ZhenfaLevelConfig {
  level: number
  name: string
  /** 每秒聚灵恢复（闭关时生效，非闭关时与洞府恢复叠加） */
  recoveryPerSec: number
}

/** 阵法等级表（0 为未布置） */
export const ZHENFA_LEVEL_CONFIG: ZhenfaLevelConfig[] = [
  { level: 0, name: '无阵法', recoveryPerSec: 0 },
  { level: 1, name: '一品聚灵阵', recoveryPerSec: 1 },
  { level: 2, name: '二品聚灵阵', recoveryPerSec: 2 },
  { level: 3, name: '三品聚灵阵', recoveryPerSec: 4 },
  { level: 4, name: '四品聚灵阵', recoveryPerSec: 7 },
  { level: 5, name: '五品聚灵阵', recoveryPerSec: 12 },
]

export const ZHENFA_MAX_LEVEL = ZHENFA_LEVEL_CONFIG.length - 1

/**
 * 根据阵法等级获取配置
 */
export function getZhenfaLevelConfig(level: number): ZhenfaLevelConfig {
  const clamped = Math.max(0, Math.min(level, ZHENFA_MAX_LEVEL))
  return ZHENFA_LEVEL_CONFIG[clamped]
}
