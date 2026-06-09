import { getDongfuLevelConfig, getDongfuMaxLingqi } from '@/game/constants/dongfu'
import { calcLingqiRecoveryPerSec } from '@/game/systems/lingqi'
import { getZhenfaLevelConfig } from '@/game/constants/zhenfa'

/** 洞府实体 */
export interface Dongfu {
  /** 洞府等级 */
  level: number
  /** 当前灵气 */
  lingqi: number
  /** 阵法等级（0 为未布置） */
  zhenfaLevel: number
  /** 上次灵气结算时间戳 */
  lastLingqiTickAt: number
}

/** 创建默认洞府 */
export function createDefaultDongfu(): Dongfu {
  const level = 1
  return {
    level,
    lingqi: getDongfuMaxLingqi(level),
    zhenfaLevel: 0,
    lastLingqiTickAt: Date.now(),
  }
}

/**
 * 兼容旧存档，补全灵气与阵法字段
 */
export function normalizeDongfu(raw?: Partial<Dongfu>): Dongfu {
  const level = raw?.level ?? 1
  const maxLingqi = getDongfuMaxLingqi(level)

  return {
    level,
    lingqi:
      typeof raw?.lingqi === 'number'
        ? Math.max(0, Math.min(raw.lingqi, maxLingqi))
        : maxLingqi,
    zhenfaLevel: raw?.zhenfaLevel ?? 0,
    lastLingqiTickAt: raw?.lastLingqiTickAt ?? Date.now(),
  }
}

/**
 * 洞府展示信息
 */
export function buildDongfuDisplay(dongfu: Dongfu) {
  const config = getDongfuLevelConfig(dongfu.level)
  const zhenfa = getZhenfaLevelConfig(dongfu.zhenfaLevel)
  const maxLingqi = config.maxLingqi
  const lingqiPercent = maxLingqi > 0 ? Math.floor((dongfu.lingqi / maxLingqi) * 100) : 0
  return {
    level: dongfu.level,
    name: config.name,
    lingqi: Math.floor(dongfu.lingqi),
    maxLingqi,
    lingqiPercent,
    zhenfaLevel: dongfu.zhenfaLevel,
    zhenfaName: zhenfa.name,
    recoveryPerSec: calcLingqiRecoveryPerSec(dongfu, false),
    recoveryPerSecCultivating: calcLingqiRecoveryPerSec(dongfu, true),
  }
}
