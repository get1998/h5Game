import type { RealmStage } from '@/game/types'

/** 坊市商品条目 */
export interface MarketListing {
  /** 商品对应物品 id */
  itemId: string
  /** 购入单价（灵石） */
  buyPrice: number
  /** 最低境界要求，未达则不可购买 */
  requiredRealm?: RealmStage
}

/** 坊市商品列表 */
export const MARKET_LISTINGS: MarketListing[] = [
  { itemId: 'item_huiqi_dan', buyPrice: 50 },
  { itemId: 'item_yuxue_dan', buyPrice: 50 },
  { itemId: 'item_peiyuan_dan', buyPrice: 200, requiredRealm: '炼气三层' },
  { itemId: 'item_qingling_dan', buyPrice: 160, requiredRealm: '炼气五层' },
  { itemId: 'item_julingcao', buyPrice: 30 },
]

const listingMap = new Map(MARKET_LISTINGS.map((listing) => [listing.itemId, listing]))

/**
 * 获取坊市商品配置
 */
export function getMarketListing(itemId: string): MarketListing | undefined {
  return listingMap.get(itemId)
}
