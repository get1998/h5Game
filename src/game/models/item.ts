import {
  createStarterLingshi,
  normalizeLingshi,
  type LingshiByElement,
} from '@/game/models/lingshi'
import type { ElementType, GongfaQuality } from '@/game/types'

export type { LingshiByElement } from '@/game/models/lingshi'

/** 物品大类 */
export type ItemCategory = 'material' | 'treasure'

/** 物品模板定义 */
export interface ItemDefinition {
  /** 物品唯一 id */
  id: string
  /** 显示名称 */
  name: string
  /** 描述 */
  description: string
  /** 物品大类 */
  category: ItemCategory
  /** 品质 */
  quality: GongfaQuality
  /** 单格堆叠上限 */
  maxStack: number
  /** 坊市基础出售价（玩家卖给坊市） */
  sellPrice: number
}

/** 玩家背包存档 */
export interface InventoryState {
  /** 五行灵石存量 */
  lingshi: LingshiByElement
  /** 物品 id → 数量 */
  items: Record<string, number>
}

/** 创建默认背包 */
export function createDefaultInventory(): InventoryState {
  return {
    lingshi: createStarterLingshi(100),
    items: {},
  }
}

/** 规范化背包（兼容旧存档；缺失字段时给予新手礼包） */
export function normalizeInventory(
  state?: Partial<InventoryState> | { lingshi?: number | LingshiByElement; items?: Record<string, number> } | null,
  preferredElement: ElementType = '火',
): InventoryState {
  if (state == null) {
    return createDefaultInventory()
  }
  const isLegacySave = state.lingshi == null && state.items == null
  if (isLegacySave) {
    return createDefaultInventory()
  }
  return {
    lingshi: normalizeLingshi(state.lingshi, preferredElement),
    items: state.items ?? {},
  }
}
