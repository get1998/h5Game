import type { GongfaQuality } from '@/game/types'

/** 物品大类 */
export type ItemCategory = 'consumable' | 'material' | 'treasure'

/** 消耗品效果 */
export type ItemEffect =
  | { type: 'restore_hp'; percent: number }
  | { type: 'restore_mp'; percent: number }
  | { type: 'add_xiuwei'; amount: number }
  | { type: 'reduce_pill_poison'; amount: number }

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
  /** 消耗品效果（材料类无） */
  effect?: ItemEffect
}

/** 玩家背包存档 */
export interface InventoryState {
  /** 灵石数量 */
  lingshi: number
  /** 物品 id → 数量 */
  items: Record<string, number>
}

/** 创建默认背包 */
export function createDefaultInventory(): InventoryState {
  return {
    lingshi: 100,
    items: {
      item_huiqi_dan: 2,
    },
  }
}

/** 规范化背包（兼容旧存档；缺失字段时给予新手礼包） */
export function normalizeInventory(state?: Partial<InventoryState> | null): InventoryState {
  if (state == null) {
    return createDefaultInventory()
  }
  const isLegacySave = state.lingshi == null && state.items == null
  if (isLegacySave) {
    return createDefaultInventory()
  }
  return {
    lingshi: typeof state.lingshi === 'number' ? state.lingshi : 0,
    items: state.items ?? {},
  }
}
