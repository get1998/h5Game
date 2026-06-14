import {
  getDongfuLevelConfig,
  getDongfuMaxLingqi,
} from '@/game/constants/dongfu'
import { getZhenfaLevelConfig } from '@/game/constants/zhenfa'
import type { Dongfu } from '@/game/models/dongfu'
import type { InventoryState } from '@/game/models/item'
import type { LingshiByElement } from '@/game/models/lingshi'
import { createEmptyLingshi } from '@/game/models/lingshi'
import {
  canAffordZhenfaMaintainInterval,
  settleZhenfaMaintenance,
} from '@/game/systems/zhenfa-maintain'

export interface LingqiRecoveryResult {
  dongfu: Dongfu
  recovered: number
  seconds: number
  /** 阵法聚灵有效秒数 */
  zhenfaActiveSeconds: number
  /** 阵法运转消耗的五行灵石 */
  zhenfaMaintainConsumed: LingshiByElement
  /** 灵石不足导致阵法停摆 */
  zhenfaSuspended: boolean
  /** 灵气已满，阵法自动暂停 */
  zhenfaPausedByFullLingqi: boolean
}

export type ZhenfaMaintainStatus = 'idle' | 'running' | 'paused_full' | 'suspended'

/**
 * 洞府灵气是否已耗尽
 */
export function isDongfuLingqiDepleted(dongfu: Dongfu): boolean {
  return dongfu.lingqi <= 0
}

/**
 * 洞府灵气是否已满
 */
export function isDongfuLingqiFull(dongfu: Dongfu): boolean {
  const maxLingqi = getDongfuMaxLingqi(dongfu.level)
  if (maxLingqi <= 0) return false
  // 避免浮点误差导致蓄满后仍判定未满
  return dongfu.lingqi >= maxLingqi - 1e-6
}

/**
 * 聚灵阵是否能在闭关中维持修炼（灵气枯竭时仍可开练）
 */
export function canZhenfaSustainCultivation(
  dongfu: Dongfu,
  inventory?: InventoryState,
): boolean {
  if (dongfu.zhenfaLevel <= 0) return false
  return calcLingqiRecoveryPerSec(dongfu, true, inventory) > 0
}

/**
 * 修炼 tick 结束后是否应因灵气耗尽而停止
 * 聚灵阵可维持时，单 tick 内灵气可暂时为 0（先聚灵再吸收），不应打断修炼
 */
export function shouldStopCultivationForLingqiDepletion(
  dongfu: Dongfu,
  inventory?: InventoryState,
): boolean {
  if (dongfu.lingqi > 0) return false
  return !canZhenfaSustainCultivation(dongfu, inventory)
}

/**
 * 修炼 tick 结束后停止文案（灵气池未空时不停止，即使本 tick 阵法扣费失败）
 */
export function getCultivationLingqiStopMessage(
  dongfu: Dongfu,
  inventory: InventoryState | undefined,
  zhenfaSuspended: boolean,
  mode: 'xiuwei' | 'gongfa',
): string | null {
  if (!shouldStopCultivationForLingqiDepletion(dongfu, inventory)) return null

  if (dongfu.zhenfaLevel > 0 && zhenfaSuspended) {
    return mode === 'gongfa'
      ? '阵法灵石不足，聚灵停摆，功法修炼已自动停止。'
      : '阵法灵石不足，聚灵停摆，修炼已自动停止。'
  }

  return mode === 'gongfa'
    ? '灵气枯竭，功法修炼已自动停止。恢复灵气或补充阵法灵石后可继续。'
    : '灵气枯竭，修炼已自动停止。恢复灵气或补充阵法灵石后可继续。'
}

/**
 * 计算非闭关下阵法最多需运转秒数（灵气将满时自动停止）
 */
export function calcMaxZhenfaBillableSeconds(
  dongfu: Dongfu,
  elapsedSeconds: number,
  isCultivating: boolean,
): number {
  if (dongfu.zhenfaLevel <= 0 || elapsedSeconds <= 0) return 0
  if (isCultivating) return elapsedSeconds
  if (isDongfuLingqiFull(dongfu)) return 0

  const maxLingqi = getDongfuMaxLingqi(dongfu.level)
  const zhenfaRate = getZhenfaLevelConfig(dongfu.zhenfaLevel).recoveryPerSec
  const dongfuRate = getDongfuLevelConfig(dongfu.level).recoveryPerSec
  const afterDongfu = Math.min(maxLingqi, dongfu.lingqi + dongfuRate * elapsedSeconds)
  const gap = maxLingqi - afterDongfu

  if (gap <= 0 || zhenfaRate <= 0) return 0
  return Math.min(elapsedSeconds, Math.ceil(gap / zhenfaRate))
}

/**
 * 阵法运转状态（自动运行：未满聚灵，已满暂停）
 */
export function getZhenfaMaintainStatus(
  dongfu: Dongfu,
  inventory?: InventoryState,
  isCultivating = false,
): ZhenfaMaintainStatus {
  if (dongfu.zhenfaLevel <= 0) return 'idle'
  if (!isCultivating && isDongfuLingqiFull(dongfu)) return 'paused_full'
  if (inventory && !canAffordZhenfaMaintainInterval(inventory, dongfu.zhenfaLevel)) {
    return 'suspended'
  }
  return 'running'
}

/**
 * 阵法聚灵是否处于运转状态
 */
export function isZhenfaMaintenanceRunning(
  dongfu: Dongfu,
  inventory?: InventoryState,
  isCultivating = false,
): boolean {
  return getZhenfaMaintainStatus(dongfu, inventory, isCultivating) === 'running'
}

/**
 * 计算灵气每秒恢复速率
 * - 非闭关：洞府等级基础恢复 + 阵法聚灵
 * - 闭关：仅阵法在闭关中聚灵
 */
export function calcLingqiRecoveryPerSec(
  dongfu: Dongfu,
  isCultivating: boolean,
  inventory?: InventoryState,
): number {
  const zhenfaRunning = isZhenfaMaintenanceRunning(dongfu, inventory, isCultivating)
  const zhenfaRecovery = zhenfaRunning
    ? getZhenfaLevelConfig(dongfu.zhenfaLevel).recoveryPerSec
    : 0

  if (isCultivating) {
    return zhenfaRecovery
  }

  const dongfuRecovery = getDongfuLevelConfig(dongfu.level).recoveryPerSec
  return dongfuRecovery + zhenfaRecovery
}

/**
 * 结算灵气恢复（可选扣除阵法运转灵石）
 */
export function applyLingqiRecovery(
  dongfu: Dongfu,
  elapsedSeconds: number,
  isCultivating: boolean,
  now = Date.now(),
  inventory?: InventoryState,
): LingqiRecoveryResult {
  const emptyConsumed = createEmptyLingshi()
  if (elapsedSeconds <= 0) {
    return {
      dongfu,
      recovered: 0,
      seconds: 0,
      zhenfaActiveSeconds: 0,
      zhenfaMaintainConsumed: emptyConsumed,
      zhenfaSuspended: false,
      zhenfaPausedByFullLingqi: false,
    }
  }

  let zhenfaActiveSeconds = 0
  let zhenfaMaintainConsumed = emptyConsumed
  let zhenfaSuspended = false
  const zhenfaPausedByFullLingqi = !isCultivating && isDongfuLingqiFull(dongfu)

  if (inventory && dongfu.zhenfaLevel > 0) {
    const billableSeconds = calcMaxZhenfaBillableSeconds(dongfu, elapsedSeconds, isCultivating)
    if (billableSeconds > 0) {
      const maintenance = settleZhenfaMaintenance(inventory, dongfu.zhenfaLevel, billableSeconds)
      zhenfaActiveSeconds = maintenance.zhenfaActiveSeconds
      zhenfaMaintainConsumed = maintenance.consumed
      zhenfaSuspended = maintenance.suspended
    } else if (
      !isCultivating
      && dongfu.zhenfaLevel > 0
      && isDongfuLingqiFull(dongfu)
    ) {
      zhenfaActiveSeconds = 0
    } else if (
      dongfu.zhenfaLevel > 0
      && inventory
      && !isCultivating
      && !isDongfuLingqiFull(dongfu)
      && billableSeconds <= 0
    ) {
      zhenfaSuspended = !canAffordZhenfaMaintainInterval(inventory, dongfu.zhenfaLevel)
    }
  }

  const maxLingqi = getDongfuMaxLingqi(dongfu.level)
  const zhenfaRate = getZhenfaLevelConfig(dongfu.zhenfaLevel).recoveryPerSec
  const dongfuRate = isCultivating ? 0 : getDongfuLevelConfig(dongfu.level).recoveryPerSec
  const recovered = dongfuRate * elapsedSeconds + zhenfaRate * zhenfaActiveSeconds
  const nextLingqi = Math.min(maxLingqi, dongfu.lingqi + recovered)

  return {
    dongfu: {
      ...dongfu,
      lingqi: nextLingqi,
      lastLingqiTickAt: now,
    },
    recovered: nextLingqi - dongfu.lingqi,
    seconds: elapsedSeconds,
    zhenfaActiveSeconds,
    zhenfaMaintainConsumed,
    zhenfaSuspended,
    zhenfaPausedByFullLingqi,
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
