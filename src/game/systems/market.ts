import { getItemDefinition } from '@/game/constants/items'
import { getMarketListing } from '@/game/constants/market'
import type { MarketState } from '@/game/models/market'
import type { InventoryState } from '@/game/models/item'
import {
  getSpecialMarketBuyPrice,
  removeSpecialMarketListing,
} from '@/game/systems/market-refresh'
import { isRealmAtLeast } from '@/game/constants/realm'
import type { RealmStage } from '@/game/types'
import {
  addItemToInventory,
  removeItemFromInventory,
  spendLingshi,
  addLingshi,
  getItemCount,
} from '@/game/systems/inventory'

/** 交易结果 */
export interface MarketTradeResult {
  success: boolean
  message: string
}

/**
 * 判断玩家是否可购买该商品
 */
export function canBuyFromMarket(
  inventory: InventoryState,
  itemId: string,
  playerRealm: RealmStage,
  count = 1,
): { ok: boolean; reason?: string } {
  const listing = getMarketListing(itemId)
  if (!listing) {
    return { ok: false, reason: '坊市暂无此物' }
  }

  const definition = getItemDefinition(itemId)
  if (!definition) {
    return { ok: false, reason: '物品不存在' }
  }

  if (listing.requiredRealm && !isRealmAtLeast(playerRealm, listing.requiredRealm)) {
    return { ok: false, reason: `需达到 ${listing.requiredRealm}` }
  }

  const totalCost = listing.buyPrice * count
  if (inventory.lingshi < totalCost) {
    return { ok: false, reason: '灵石不足' }
  }

  const current = getItemCount(inventory, itemId)
  if (current + count > definition.maxStack) {
    return { ok: false, reason: '背包堆叠已满' }
  }

  return { ok: true }
}

/**
 * 从坊市购入物品
 */
export function buyFromMarket(
  inventory: InventoryState,
  itemId: string,
  playerRealm: RealmStage,
  count = 1,
): MarketTradeResult {
  const check = canBuyFromMarket(inventory, itemId, playerRealm, count)
  if (!check.ok) {
    return { success: false, message: check.reason ?? '无法购买' }
  }

  const listing = getMarketListing(itemId)!
  const definition = getItemDefinition(itemId)!
  const totalCost = listing.buyPrice * count

  if (!spendLingshi(inventory, totalCost)) {
    return { success: false, message: '灵石不足' }
  }

  const addResult = addItemToInventory(inventory, itemId, count)
  if (!addResult.success || addResult.added < count) {
    addLingshi(inventory, totalCost)
    return { success: false, message: addResult.message }
  }

  return {
    success: true,
    message: `购入「${definition.name}」×${count}，花费 ${totalCost} 灵石`,
  }
}

/**
 * 判断玩家是否可出售物品
 */
export function canSellToMarket(
  inventory: InventoryState,
  itemId: string,
  count = 1,
): { ok: boolean; reason?: string; unitPrice?: number } {
  const definition = getItemDefinition(itemId)
  if (!definition) {
    return { ok: false, reason: '物品不存在' }
  }
  if (definition.sellPrice <= 0) {
    return { ok: false, reason: '坊市不收此物' }
  }
  if (getItemCount(inventory, itemId) < count) {
    return { ok: false, reason: '数量不足' }
  }
  return { ok: true, unitPrice: definition.sellPrice }
}

/**
 * 向坊市出售物品
 */
export function sellToMarket(
  inventory: InventoryState,
  itemId: string,
  count = 1,
): MarketTradeResult {
  const check = canSellToMarket(inventory, itemId, count)
  if (!check.ok || check.unitPrice == null) {
    return { success: false, message: check.reason ?? '无法出售' }
  }

  const definition = getItemDefinition(itemId)!
  const totalGain = check.unitPrice * count

  if (!removeItemFromInventory(inventory, itemId, count)) {
    return { success: false, message: '数量不足' }
  }

  addLingshi(inventory, totalGain)

  return {
    success: true,
    message: `出售「${definition.name}」×${count}，获得 ${totalGain} 灵石`,
  }
}

/**
 * 判断稀世寄售是否可购入
 */
export function canBuySpecialFromMarket(
  market: MarketState,
  inventory: InventoryState,
  itemId: string,
  dongfuLevel: number,
): { ok: boolean; reason?: string; buyPrice?: number } {
  if (!market.specialItemIds.includes(itemId)) {
    return { ok: false, reason: '坊市暂无此稀世寄售' }
  }

  const definition = getItemDefinition(itemId)
  if (!definition) {
    return { ok: false, reason: '物品不存在' }
  }

  const buyPrice = getSpecialMarketBuyPrice(itemId, dongfuLevel)
  if (buyPrice == null) {
    return { ok: false, reason: '无法定价' }
  }

  if (inventory.lingshi < buyPrice) {
    return { ok: false, reason: '灵石不足' }
  }

  if (getItemCount(inventory, itemId) >= definition.maxStack) {
    return { ok: false, reason: '背包堆叠已满' }
  }

  return { ok: true, buyPrice }
}

/**
 * 购入坊市稀世寄售（购入后下架）
 */
export function buySpecialFromMarket(
  market: MarketState,
  inventory: InventoryState,
  itemId: string,
  dongfuLevel: number,
): MarketTradeResult {
  const check = canBuySpecialFromMarket(market, inventory, itemId, dongfuLevel)
  if (!check.ok || check.buyPrice == null) {
    return { success: false, message: check.reason ?? '无法购买' }
  }

  const definition = getItemDefinition(itemId)!
  if (!spendLingshi(inventory, check.buyPrice)) {
    return { success: false, message: '灵石不足' }
  }

  const addResult = addItemToInventory(inventory, itemId, 1)
  if (!addResult.success || addResult.added < 1) {
    addLingshi(inventory, check.buyPrice)
    return { success: false, message: addResult.message }
  }

  removeSpecialMarketListing(market, itemId)

  return {
    success: true,
    message: `稀世寄售购入「${definition.name}」，花费 ${check.buyPrice} 灵石`,
  }
}
