import {
  buildZhenfaSetupLingshiCost,
  formatZhenfaLingshiCost,
  getZhenfaLevelConfig,
  getZhenfaSetupTarget,
  getZhenfaUnlockTarget,
} from '@/game/constants/zhenfa'
import {
  formatZhenfaBlueprintDropHint,
  formatZhenfaTreasureDropHint,
  getZhenfaLevelByBlueprintItemId,
} from '@/game/constants/zhenfa-treasure'
import { getItemDefinition } from '@/game/constants/items'
import type { Dongfu } from '@/game/models/dongfu'
import type { InventoryState } from '@/game/models/item'
import {
  getItemCount,
  hasLingshiBreakdown,
  removeItemFromInventory,
  spendLingshiBreakdown,
} from '@/game/systems/inventory'
import {
  canAffordZhenfaMaintainInterval,
  formatZhenfaMaintainCost,
} from '@/game/systems/zhenfa-maintain'

export interface ZhenfaUnlockCheck {
  canUnlock: boolean
  reason?: string
  target?: ReturnType<typeof getZhenfaUnlockTarget>
}

export interface ZhenfaUnlockResult {
  success: boolean
  message: string
  dongfu?: Dongfu
}

export interface ZhenfaSetupCheck {
  canSetup: boolean
  reason?: string
  target?: ReturnType<typeof getZhenfaSetupTarget>
}

export interface ZhenfaSetupResult {
  success: boolean
  message: string
  dongfu?: Dongfu
}

/**
 * 检测是否可参悟阵法图纸
 */
export function checkZhenfaBlueprintUnlock(
  dongfu: Dongfu,
  inventory: InventoryState,
): ZhenfaUnlockCheck {
  const target = getZhenfaUnlockTarget(dongfu.zhenfaUnlockedMaxLevel)
  if (!target?.blueprintItemId) {
    return { canUnlock: false, reason: '阵法图纸已全部参悟' }
  }

  const blueprintName = getItemDefinition(target.blueprintItemId)?.name ?? '阵法图纸'
  if (getItemCount(inventory, target.blueprintItemId) < 1) {
    return {
      canUnlock: false,
      reason: `缺少「${blueprintName}」`,
      target,
    }
  }

  return { canUnlock: true, target }
}

/**
 * 参悟阵法图纸：消耗图纸，解锁对应等级布阵资格
 */
export function unlockZhenfaFromBlueprint(
  dongfu: Dongfu,
  inventory: InventoryState,
  blueprintItemId?: string,
): ZhenfaUnlockResult {
  const explicitLevel = blueprintItemId ? getZhenfaLevelByBlueprintItemId(blueprintItemId) : null
  const target = explicitLevel != null
    ? getZhenfaLevelConfig(explicitLevel)
    : getZhenfaUnlockTarget(dongfu.zhenfaUnlockedMaxLevel)

  if (!target || target.level <= 0 || !target.blueprintItemId) {
    return { success: false, message: '无可参悟的阵法图纸' }
  }

  if (target.level !== dongfu.zhenfaUnlockedMaxLevel + 1) {
    return {
      success: false,
      message: `请先参悟 ${getZhenfaLevelConfig(target.level - 1).name} 图纸`,
    }
  }

  if (getItemCount(inventory, target.blueprintItemId) < 1) {
    const blueprintName = getItemDefinition(target.blueprintItemId)?.name ?? '阵法图纸'
    return { success: false, message: `缺少「${blueprintName}」` }
  }

  if (!removeItemFromInventory(inventory, target.blueprintItemId, 1)) {
    return { success: false, message: '图纸数量不足' }
  }

  return {
    success: true,
    message: `参悟「${target.name}」图纸，可进行布阵`,
    dongfu: {
      ...dongfu,
      zhenfaUnlockedMaxLevel: target.level,
    },
  }
}

/**
 * 检测是否可布阵/升阵（已解锁 + 五行灵石 + 宝物）
 */
export function checkZhenfaSetup(
  dongfu: Dongfu,
  inventory: InventoryState,
): ZhenfaSetupCheck {
  const target = getZhenfaSetupTarget(dongfu.zhenfaLevel)
  if (!target) {
    return { canSetup: false, reason: '阵法已达最高品阶' }
  }

  if (dongfu.zhenfaUnlockedMaxLevel < target.level) {
    return {
      canSetup: false,
      reason: `尚未参悟「${target.name}」图纸`,
      target,
    }
  }

  const perElement = target.setupLingshiPerElement ?? 0
  const lingshiCost = buildZhenfaSetupLingshiCost(perElement)
  if (!hasLingshiBreakdown(inventory, lingshiCost)) {
    return {
      canSetup: false,
      reason: `五行灵石不足（需 ${formatZhenfaLingshiCost(perElement)}）`,
      target,
    }
  }

  const treasureId = target.setupTreasureId
  if (treasureId) {
    const treasureName = getItemDefinition(treasureId)?.name ?? '阵法宝物'
    if (getItemCount(inventory, treasureId) < 1) {
      return {
        canSetup: false,
        reason: `缺少「${treasureName}」`,
        target,
      }
    }
  }

  if (!canAffordZhenfaMaintainInterval(inventory, target.level)) {
    const maintainPerElement = target.maintainLingshiPerElement ?? 0
    const maintainIntervalSec = target.maintainIntervalSec ?? 0
    return {
      canSetup: false,
      reason: `布阵后需维持运转（${formatZhenfaMaintainCost(maintainPerElement, maintainIntervalSec)}）`,
      target,
    }
  }

  return { canSetup: true, target }
}

/**
 * 布阵/升阵：扣除五行灵石与宝物，提升阵法等级
 */
export function setupZhenfa(
  dongfu: Dongfu,
  inventory: InventoryState,
): ZhenfaSetupResult {
  const check = checkZhenfaSetup(dongfu, inventory)
  if (!check.canSetup || !check.target) {
    return { success: false, message: check.reason ?? '无法布阵' }
  }

  const target = check.target
  const perElement = target.setupLingshiPerElement ?? 0
  const lingshiCost = buildZhenfaSetupLingshiCost(perElement)
  if (!spendLingshiBreakdown(inventory, lingshiCost).success) {
    return { success: false, message: '五行灵石不足' }
  }

  if (target.setupTreasureId) {
    if (!removeItemFromInventory(inventory, target.setupTreasureId, 1)) {
      return { success: false, message: '阵法宝物不足' }
    }
  }

  return {
    success: true,
    message: `布阵成功：${target.name}，修炼聚灵 ${target.recoveryPerSec} / 秒`,
    dongfu: {
      ...dongfu,
      zhenfaLevel: target.level,
    },
  }
}

/**
 * 阵法图纸获取提示
 */
export function getZhenfaBlueprintDropHint(dongfuLevel: number, unlockedMaxLevel: number): string {
  return formatZhenfaBlueprintDropHint(dongfuLevel, unlockedMaxLevel)
}

/**
 * 阵法宝物获取提示
 */
export function getZhenfaTreasureDropHint(dongfuLevel: number, currentZhenfaLevel: number): string {
  return formatZhenfaTreasureDropHint(dongfuLevel, currentZhenfaLevel)
}
