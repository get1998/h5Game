import { getItemDefinition } from '@/game/constants/items'
import { ALL_ELEMENTS } from '@/game/constants/elements'
import type { ItemDefinition } from '@/game/models/item'
import type { InventoryState } from '@/game/models/item'
import {
  createEmptyLingshi,
  getTotalLingshi,
  pickRandomLingshiElement,
  type LingshiByElement,
} from '@/game/models/lingshi'
import type { ElementType } from '@/game/types'

/** 添加物品结果 */
export interface AddItemResult {
  success: boolean
  added: number
  message: string
}

/**
 * 获取背包中某物品数量
 */
export function getItemCount(inventory: InventoryState, itemId: string): number {
  return inventory.items[itemId] ?? 0
}

/**
 * 向背包添加物品（受堆叠上限约束）
 */
export function addItemToInventory(
  inventory: InventoryState,
  itemId: string,
  count: number,
): AddItemResult {
  if (count <= 0) {
    return { success: false, added: 0, message: '数量无效' }
  }

  const definition = getItemDefinition(itemId)
  if (!definition) {
    return { success: false, added: 0, message: '未知物品' }
  }

  const current = getItemCount(inventory, itemId)
  const room = definition.maxStack - current
  if (room <= 0) {
    return { success: false, added: 0, message: `${definition.name} 已达堆叠上限` }
  }

  const added = Math.min(count, room)
  inventory.items[itemId] = current + added

  if (added < count) {
    return {
      success: true,
      added,
      message: `${definition.name} +${added}（背包已满部分）`,
    }
  }

  return {
    success: true,
    added,
    message: `${definition.name} +${added}`,
  }
}

/**
 * 从背包移除物品
 */
export function removeItemFromInventory(
  inventory: InventoryState,
  itemId: string,
  count: number,
): boolean {
  if (count <= 0) return false

  const current = getItemCount(inventory, itemId)
  if (current < count) return false

  const next = current - count
  if (next <= 0) {
    delete inventory.items[itemId]
  } else {
    inventory.items[itemId] = next
  }
  return true
}

/** 扣除灵石结果 */
export interface SpendLingshiResult {
  success: boolean
  spent: LingshiByElement
}

export { getTotalLingshi, listNonemptyLingshi } from '@/game/models/lingshi'

/**
 * 增加指定属性的灵石
 */
export function addLingshi(
  inventory: InventoryState,
  amount: number,
  element: ElementType,
): number {
  if (amount <= 0) return 0
  inventory.lingshi[element] = (inventory.lingshi[element] ?? 0) + amount
  return amount
}

/**
 * 批量增加五行灵石
 */
export function addLingshiBreakdown(
  inventory: InventoryState,
  breakdown: LingshiByElement,
): number {
  let added = 0
  for (const element of ALL_ELEMENTS) {
    const amount = breakdown[element] ?? 0
    if (amount > 0) {
      added += addLingshi(inventory, amount, element)
    }
  }
  return added
}

/**
 * 增加无属性偏向的灵石（随机归入某一系）
 */
export function addRandomElementLingshi(inventory: InventoryState, amount: number): number {
  if (amount <= 0) return 0
  return addLingshi(inventory, amount, pickRandomLingshiElement())
}

/**
 * 扣除灵石（按金→木→水→火→土顺序消耗，任意属性均可支付）
 */
export function spendLingshi(inventory: InventoryState, amount: number): SpendLingshiResult {
  const spent = createEmptyLingshi()
  if (amount <= 0) {
    return { success: true, spent }
  }
  if (getTotalLingshi(inventory.lingshi) < amount) {
    return { success: false, spent }
  }

  let remaining = amount
  for (const element of ALL_ELEMENTS) {
    if (remaining <= 0) break
    const available = inventory.lingshi[element] ?? 0
    const take = Math.min(available, remaining)
    if (take > 0) {
      inventory.lingshi[element] = available - take
      spent[element] = take
      remaining -= take
    }
  }

  return { success: remaining === 0, spent }
}

/**
 * 检测五行灵石是否满足指定各系消耗
 */
export function hasLingshiBreakdown(
  inventory: InventoryState,
  required: LingshiByElement,
): boolean {
  for (const element of ALL_ELEMENTS) {
    const need = required[element] ?? 0
    if (need <= 0) continue
    if ((inventory.lingshi[element] ?? 0) < need) return false
  }
  return true
}

/**
 * 按指定五行比例扣除灵石（布阵等场景）
 */
export function spendLingshiBreakdown(
  inventory: InventoryState,
  required: LingshiByElement,
): SpendLingshiResult {
  const spent = createEmptyLingshi()
  if (!hasLingshiBreakdown(inventory, required)) {
    return { success: false, spent }
  }

  for (const element of ALL_ELEMENTS) {
    const amount = required[element] ?? 0
    if (amount <= 0) continue
    inventory.lingshi[element] = (inventory.lingshi[element] ?? 0) - amount
    spent[element] = amount
  }

  return { success: true, spent }
}

/**
 * 将背包条目转为展示列表（数量 > 0）
 */
export function listInventoryEntries(
  inventory: InventoryState,
): Array<{ itemId: string; count: number; definition: ItemDefinition }> {
  return Object.entries(inventory.items)
    .filter(([, count]) => count > 0)
    .map(([itemId, count]) => ({
      itemId,
      count,
      definition: getItemDefinition(itemId)!,
    }))
    .filter((entry) => entry.definition != null)
    .sort((a, b) => a.definition.name.localeCompare(b.definition.name, 'zh-CN'))
}
