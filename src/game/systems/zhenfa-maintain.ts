import {
  buildZhenfaSetupLingshiCost,
  getZhenfaLevelConfig,
} from '@/game/constants/zhenfa'
import type { InventoryState } from '@/game/models/item'
import type { LingshiByElement } from '@/game/models/lingshi'
import { createEmptyLingshi } from '@/game/models/lingshi'
import {
  hasLingshiBreakdown,
  spendLingshiBreakdown,
} from '@/game/systems/inventory'

export interface ZhenfaMaintainCost {
  perElement: number
  intervalSec: number
}

export interface ZhenfaMaintainSettleResult {
  /** 阵法实际生效秒数（已扣费） */
  zhenfaActiveSeconds: number
  /** 本次扣除的五行灵石 */
  consumed: LingshiByElement
  /** 灵石不足，阵法未能运转 */
  suspended: boolean
}

/**
 * 获取阵法运转消耗配置
 */
export function getZhenfaMaintainCost(zhenfaLevel: number): ZhenfaMaintainCost | null {
  if (zhenfaLevel <= 0) return null
  const config = getZhenfaLevelConfig(zhenfaLevel)
  const perElement = config.maintainLingshiPerElement ?? 0
  const intervalSec = config.maintainIntervalSec ?? 0
  if (perElement <= 0 || intervalSec <= 0) return null
  return { perElement, intervalSec }
}

/**
 * 按运转秒数折算每系灵石消耗（向上取整，支持秒级 tick）
 */
export function calcProRatedMaintainPerElement(
  perElement: number,
  intervalSec: number,
  activeSeconds: number,
): number {
  if (activeSeconds <= 0 || perElement <= 0 || intervalSec <= 0) return 0
  return Math.ceil((perElement * activeSeconds) / intervalSec)
}

/**
 * 构建按比例折算后的五行灵石消耗
 */
export function buildProRatedZhenfaMaintainCost(
  perElement: number,
  intervalSec: number,
  activeSeconds: number,
): LingshiByElement {
  const totalPerElement = calcProRatedMaintainPerElement(perElement, intervalSec, activeSeconds)
  if (totalPerElement <= 0) return createEmptyLingshi()
  return buildZhenfaSetupLingshiCost(totalPerElement)
}

/**
 * 检测是否能支付至少 1 秒阵法运转
 */
export function canAffordZhenfaMaintainInterval(
  inventory: InventoryState,
  zhenfaLevel: number,
): boolean {
  const costConfig = getZhenfaMaintainCost(zhenfaLevel)
  if (!costConfig) return true
  const cost = buildProRatedZhenfaMaintainCost(
    costConfig.perElement,
    costConfig.intervalSec,
    1,
  )
  return hasLingshiBreakdown(inventory, cost)
}

/**
 * 计算当前库存最多可支撑的阵法运转秒数
 */
export function calcMaxAffordableZhenfaMaintainSeconds(
  inventory: InventoryState,
  zhenfaLevel: number,
  requestedSeconds: number,
): number {
  const costConfig = getZhenfaMaintainCost(zhenfaLevel)
  if (!costConfig || requestedSeconds <= 0) return 0

  for (let seconds = requestedSeconds; seconds >= 1; seconds -= 1) {
    const cost = buildProRatedZhenfaMaintainCost(
      costConfig.perElement,
      costConfig.intervalSec,
      seconds,
    )
    if (hasLingshiBreakdown(inventory, cost)) {
      return seconds
    }
  }
  return 0
}

/**
 * 结算阵法运转消耗：按实际秒数比例扣费
 */
export function settleZhenfaMaintenance(
  inventory: InventoryState,
  zhenfaLevel: number,
  billableSeconds: number,
): ZhenfaMaintainSettleResult {
  const empty = createEmptyLingshi()
  if (zhenfaLevel <= 0 || billableSeconds <= 0) {
    return { zhenfaActiveSeconds: 0, consumed: empty, suspended: false }
  }

  const costConfig = getZhenfaMaintainCost(zhenfaLevel)
  if (!costConfig) {
    return { zhenfaActiveSeconds: billableSeconds, consumed: empty, suspended: false }
  }

  const affordableSeconds = calcMaxAffordableZhenfaMaintainSeconds(
    inventory,
    zhenfaLevel,
    billableSeconds,
  )

  if (affordableSeconds <= 0) {
    return {
      zhenfaActiveSeconds: 0,
      consumed: empty,
      suspended: true,
    }
  }

  const cost = buildProRatedZhenfaMaintainCost(
    costConfig.perElement,
    costConfig.intervalSec,
    affordableSeconds,
  )

  if (!spendLingshiBreakdown(inventory, cost).success) {
    return {
      zhenfaActiveSeconds: 0,
      consumed: empty,
      suspended: true,
    }
  }

  return {
    zhenfaActiveSeconds: affordableSeconds,
    consumed: cost,
    /** 仅当完全无法运转时为 true；部分秒数仍可运转时不视为停摆 */
    suspended: false,
  }
}

/**
 * 格式化阵法运转消耗文案
 */
export function formatZhenfaMaintainCost(perElement: number, intervalSec: number): string {
  if (perElement <= 0 || intervalSec <= 0) return '无'
  return `每 ${intervalSec} 秒 · 金木水火土各 ${perElement}（灵气未满自动运转，已满自动停）`
}
