import {
  getDongfuLevelConfig,
  getDongfuMaxLingqi,
} from '@/game/constants/dongfu'
import { getZhenfaLevelConfig } from '@/game/constants/zhenfa'
import type { Dongfu } from '@/game/models/dongfu'

export interface LingqiRecoveryResult {
  dongfu: Dongfu
  recovered: number
  seconds: number
}

/**
 * 计算灵气每秒恢复速率
 * - 非闭关：洞府等级基础恢复 + 阵法聚灵
 * - 闭关：仅阵法在闭关中聚灵
 */
export function calcLingqiRecoveryPerSec(dongfu: Dongfu, isCultivating: boolean): number {
  const zhenfaRecovery = getZhenfaLevelConfig(dongfu.zhenfaLevel).recoveryPerSec

  if (isCultivating) {
    return zhenfaRecovery
  }

  const dongfuRecovery = getDongfuLevelConfig(dongfu.level).recoveryPerSec
  return dongfuRecovery + zhenfaRecovery
}

/**
 * 结算灵气恢复
 */
export function applyLingqiRecovery(
  dongfu: Dongfu,
  elapsedSeconds: number,
  isCultivating: boolean,
  now = Date.now(),
): LingqiRecoveryResult {
  if (elapsedSeconds <= 0) {
    return { dongfu, recovered: 0, seconds: 0 }
  }

  const maxLingqi = getDongfuMaxLingqi(dongfu.level)
  const rate = calcLingqiRecoveryPerSec(dongfu, isCultivating)
  const recovered = rate * elapsedSeconds
  const nextLingqi = Math.min(maxLingqi, dongfu.lingqi + recovered)

  return {
    dongfu: {
      ...dongfu,
      lingqi: nextLingqi,
      lastLingqiTickAt: now,
    },
    recovered: nextLingqi - dongfu.lingqi,
    seconds: elapsedSeconds,
  }
}

/**
 * 闭关吸收灵气并转化为修为（含小数修为累积）
 * @param maxAbsorb 本周期最多可吸收的灵气
 * @param conversionPerLingqi 有效转化率（修为/灵气）
 * @param xiuweiRemainder 上次未结算的小数修为
 */
export function absorbLingqiForCultivation(
  dongfu: Dongfu,
  maxAbsorb: number,
  conversionPerLingqi: number,
  xiuweiRemainder = 0,
): {
  dongfu: Dongfu
  gainedXiuwei: number
  lingqiConsumed: number
  xiuweiRemainder: number
} {
  if (maxAbsorb <= 0 || conversionPerLingqi <= 0 || dongfu.lingqi <= 0) {
    return { dongfu, gainedXiuwei: 0, lingqiConsumed: 0, xiuweiRemainder }
  }

  const lingqiConsumed = Math.min(maxAbsorb, dongfu.lingqi)
  const rawXiuwei = lingqiConsumed * conversionPerLingqi + xiuweiRemainder
  const gainedXiuwei = Math.floor(rawXiuwei)
  const nextRemainder = rawXiuwei - gainedXiuwei

  return {
    dongfu: {
      ...dongfu,
      lingqi: dongfu.lingqi - lingqiConsumed,
    },
    gainedXiuwei,
    lingqiConsumed,
    xiuweiRemainder: nextRemainder,
  }
}

/**
 * 当前灵气充裕度（0~1），仅用于展示
 */
export function calcLingqiFullness(dongfu: Dongfu): number {
  const maxLingqi = getDongfuMaxLingqi(dongfu.level)
  if (maxLingqi <= 0) return 0
  return Math.max(0, Math.min(1, dongfu.lingqi / maxLingqi))
}
