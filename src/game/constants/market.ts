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
  { itemId: 'item_julingcao', buyPrice: 30 },
  { itemId: 'item_fabao_material_lingwen', buyPrice: 35 },
  { itemId: 'item_fabao_blueprint_attack_lower', buyPrice: 300, requiredRealm: '炼气一层' },
  { itemId: 'item_fabao_blueprint_defense_lower', buyPrice: 300, requiredRealm: '炼气一层' },
]

const listingMap = new Map(MARKET_LISTINGS.map((listing) => [listing.itemId, listing]))

/**
 * 获取坊市商品配置
 */
export function getMarketListing(itemId: string): MarketListing | undefined {
  return listingMap.get(itemId)
}
