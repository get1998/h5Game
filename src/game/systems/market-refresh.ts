import {
  getDongfuTreasureMarketPrice,
  getMarketTreasureRefreshCandidates,
  MARKET_TREASURE_MAX_SPECIAL,
  MARKET_TREASURE_REFRESH_RATE_PER_DAY,
} from '@/game/constants/dongfu-treasure'
import { getItemDefinition } from '@/game/constants/items'
import type { MarketState } from '@/game/models/market'

export interface MarketRefreshResult {
  /** 本次新上架的物品 id */
  addedItemIds: string[]
}

/**
 * 按游戏日推进坊市稀世寄售刷新（每日独立掷骰）
 */
export function tickMarketTreasureRefresh(
  market: MarketState,
  dongfuLevel: number,
  gameDay: number,
): MarketRefreshResult {
  const addedItemIds: string[] = []

  if (gameDay <= market.lastRefreshGameDay) {
    return { addedItemIds }
  }

  for (let day = market.lastRefreshGameDay + 1; day <= gameDay; day += 1) {
    if (market.specialItemIds.length >= MARKET_TREASURE_MAX_SPECIAL) {
      break
    }

    const candidates = getMarketTreasureRefreshCandidates(dongfuLevel)
    for (const candidate of candidates) {
      if (market.specialItemIds.length >= MARKET_TREASURE_MAX_SPECIAL) {
        break
      }
      if (market.specialItemIds.includes(candidate.itemId)) {
        continue
      }
      if (Math.random() < MARKET_TREASURE_REFRESH_RATE_PER_DAY) {
        market.specialItemIds.push(candidate.itemId)
        addedItemIds.push(candidate.itemId)
      }
    }
  }

  market.lastRefreshGameDay = gameDay
  return { addedItemIds }
}

/**
 * 获取稀世寄售商品的购入价
 */
export function getSpecialMarketBuyPrice(itemId: string, dongfuLevel: number): number | null {
  const candidates = getMarketTreasureRefreshCandidates(dongfuLevel)
  const matched = candidates.find((item) => item.itemId === itemId)
  if (matched) return matched.buyPrice

  const definition = getItemDefinition(itemId)
  if (!definition || definition.category !== 'treasure') return null

  return getDongfuTreasureMarketPrice(dongfuLevel + 1)
}

/**
 * 从稀世寄售栏移除商品（购入后）
 */
export function removeSpecialMarketListing(market: MarketState, itemId: string): void {
  market.specialItemIds = market.specialItemIds.filter((id) => id !== itemId)
}
