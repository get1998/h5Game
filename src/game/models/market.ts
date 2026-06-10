/** 坊市稀世寄售状态 */
export interface MarketState {
  /** 当前稀世寄售中的物品 id */
  specialItemIds: string[]
  /** 上次执行每日刷新判定的游戏日 */
  lastRefreshGameDay: number
}

/** 创建默认坊市状态 */
export function createDefaultMarketState(): MarketState {
  return {
    specialItemIds: [],
    lastRefreshGameDay: 0,
  }
}

/** 规范化坊市存档 */
export function normalizeMarketState(state?: Partial<MarketState> | null): MarketState {
  if (state == null) {
    return createDefaultMarketState()
  }
  return {
    specialItemIds: state.specialItemIds ?? [],
    lastRefreshGameDay: state.lastRefreshGameDay ?? 0,
  }
}
