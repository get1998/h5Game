import {
  getDongfuLevelConfig,
  getDongfuMaxLingqi,
  getDongfuUpgradeTarget,
} from '@/game/constants/dongfu'
import { formatDongfuTreasureDropHint } from '@/game/systems/dongfu-treasure-loot'
import { getItemDefinition } from '@/game/constants/items'
import type { Dongfu } from '@/game/models/dongfu'
import type { InventoryState } from '@/game/models/item'
import { getItemCount, removeItemFromInventory, spendLingshi } from '@/game/systems/inventory'

export interface DongfuUpgradeCheck {
  canUpgrade: boolean
  reason?: string
  target?: ReturnType<typeof getDongfuUpgradeTarget>
}

export interface DongfuUpgradeResult {
  success: boolean
  message: string
  dongfu?: Dongfu
}

/**
 * 检测洞府是否可升级（灵石 + 升级宝物）
 */
export function checkDongfuUpgrade(
  dongfu: Dongfu,
  inventory: InventoryState,
): DongfuUpgradeCheck {
  const target = getDongfuUpgradeTarget(dongfu.level)
  if (!target) {
    return { canUpgrade: false, reason: '洞府已达最高等级' }
  }

  const cost = target.upgradeCostLingshi ?? 0
  if (inventory.lingshi < cost) {
    return {
      canUpgrade: false,
      reason: `灵石不足（需 ${cost}）`,
      target,
    }
  }

  const treasureId = target.upgradeTreasureId
  if (treasureId) {
    const treasureName = getItemDefinition(treasureId)?.name ?? '升级宝物'
    if (getItemCount(inventory, treasureId) < 1) {
      return {
        canUpgrade: false,
        reason: `缺少「${treasureName}」`,
        target,
      }
    }
  }

  return { canUpgrade: true, target }
}

/**
 * 升级洞府：扣灵石、消耗宝物、提升等级、灵气回满至新上限
 */
export function upgradeDongfu(
  dongfu: Dongfu,
  inventory: InventoryState,
): DongfuUpgradeResult {
  const check = checkDongfuUpgrade(dongfu, inventory)
  if (!check.canUpgrade || !check.target) {
    return { success: false, message: check.reason ?? '无法升级' }
  }

  const target = check.target
  const cost = target.upgradeCostLingshi ?? 0
  if (!spendLingshi(inventory, cost)) {
    return { success: false, message: '灵石不足' }
  }

  if (target.upgradeTreasureId) {
    if (!removeItemFromInventory(inventory, target.upgradeTreasureId, 1)) {
      return { success: false, message: '升级宝物不足' }
    }
  }

  const nextLevel = target.level
  const maxLingqi = getDongfuMaxLingqi(nextLevel)
  const config = getDongfuLevelConfig(nextLevel)

  return {
    success: true,
    message: `洞府升级至 Lv.${nextLevel}「${config.name}」，灵气上限 ${maxLingqi}`,
    dongfu: {
      ...dongfu,
      level: nextLevel,
      lingqi: maxLingqi,
    },
  }
}

/**
 * 洞府升级宝物获取提示
 */
export function getDongfuUpgradeTreasureHint(dongfuLevel: number): string {
  return formatDongfuTreasureDropHint(dongfuLevel)
}
