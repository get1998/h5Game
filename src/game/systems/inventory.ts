import { getItemDefinition } from '@/game/constants/items'
import type { ItemDefinition } from '@/game/models/item'
import type { InventoryState } from '@/game/models/item'
import type { Player } from '@/game/models/player'
import { getRealmXiuweiRoom, isRealmXiuweiFull } from '@/game/constants/realm'

/** 添加物品结果 */
export interface AddItemResult {
  success: boolean
  added: number
  message: string
}

/** 使用物品结果 */
export interface UseItemResult {
  success: boolean
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

/**
 * 增加灵石
 */
export function addLingshi(inventory: InventoryState, amount: number): number {
  if (amount <= 0) return 0
  inventory.lingshi += amount
  return amount
}

/**
 * 扣除灵石（不足则失败）
 */
export function spendLingshi(inventory: InventoryState, amount: number): boolean {
  if (amount <= 0) return true
  if (inventory.lingshi < amount) return false
  inventory.lingshi -= amount
  return true
}

/**
 * 应用消耗品效果到玩家
 */
function applyItemEffect(
  player: Player,
  definition: ItemDefinition,
  effectiveMaxHp: number,
  effectiveMaxMp: number,
): string {
  const effect = definition.effect
  if (!effect) return '该物品无法使用'

  switch (effect.type) {
    case 'restore_hp': {
      const gain = Math.floor(effectiveMaxHp * effect.percent)
      const before = player.combat.hp
      player.combat.hp = Math.min(effectiveMaxHp, before + gain)
      return `恢复气血 ${player.combat.hp - before} 点`
    }
    case 'restore_mp': {
      const gain = Math.floor(effectiveMaxMp * effect.percent)
      const before = player.combat.mp
      player.combat.mp = Math.min(effectiveMaxMp, before + gain)
      return `恢复灵力 ${player.combat.mp - before} 点`
    }
    case 'add_xiuwei': {
      if (isRealmXiuweiFull(player)) {
        return '修为已满，请先突破'
      }
      const room = getRealmXiuweiRoom(player)
      if (room <= 0) {
        return '修为已满，请先突破'
      }
      const before = player.xiuwei
      player.xiuwei += Math.min(effect.amount, room)
      return `增进修为 ${player.xiuwei - before} 点`
    }
    case 'reduce_pill_poison': {
      const before = player.special.pillPoison
      player.special.pillPoison = Math.max(0, before - effect.amount)
      return `丹毒降低 ${before - player.special.pillPoison} 点`
    }
    default:
      return '未知效果'
  }
}

/**
 * 使用消耗品
 */
export function useConsumableItem(
  inventory: InventoryState,
  player: Player,
  itemId: string,
  effectiveMaxHp: number,
  effectiveMaxMp: number,
): UseItemResult {
  const definition = getItemDefinition(itemId)
  if (!definition) {
    return { success: false, message: '物品不存在' }
  }
  if (definition.category !== 'consumable') {
    return { success: false, message: '该物品不可直接使用' }
  }
  if (getItemCount(inventory, itemId) <= 0) {
    return { success: false, message: '物品数量不足' }
  }

  const effectText = applyItemEffect(player, definition, effectiveMaxHp, effectiveMaxMp)
  if (effectText === '修为已满，请先突破') {
    return { success: false, message: effectText }
  }

  removeItemFromInventory(inventory, itemId, 1)

  if (
    definition.effect?.type === 'restore_hp'
    || definition.effect?.type === 'restore_mp'
    || definition.effect?.type === 'add_xiuwei'
  ) {
    player.special.pillPoison += 1
  }

  return {
    success: true,
    message: `使用「${definition.name}」，${effectText}`,
  }
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
