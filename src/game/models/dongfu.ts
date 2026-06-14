import {
  getDongfuLevelConfig,
  getDongfuMaxLingqi,
  getDongfuUpgradeTarget,
} from '@/game/constants/dongfu'
import { getDongfuTreasureMinDropRealm } from '@/game/constants/dongfu-treasure'
import { getItemDefinition } from '@/game/constants/items'
import { getItemCount } from '@/game/systems/inventory'
import type { InventoryState } from '@/game/models/item'
import { calcLingqiRecoveryPerSec, getZhenfaMaintainStatus } from '@/game/systems/lingqi'
import {
  formatZhenfaLingshiCost,
  getZhenfaLevelConfig,
  getZhenfaSetupTarget,
  getZhenfaUnlockTarget,
} from '@/game/constants/zhenfa'
import {
  formatZhenfaMaintainCost,
  getZhenfaMaintainCost,
} from '@/game/systems/zhenfa-maintain'
import {
  getZhenfaBlueprintDropHint,
  getZhenfaTreasureDropHint,
} from '@/game/systems/zhenfa-setup'

/** 洞府实体 */
export interface Dongfu {
  /** 洞府等级 */
  level: number
  /** 当前灵气 */
  lingqi: number
  /** 阵法等级（0 为未布置） */
  zhenfaLevel: number
  /** 已通过图纸参悟的最高阵法等级（0 为未解锁任何阵法） */
  zhenfaUnlockedMaxLevel: number
  /** 上次灵气结算时间戳 */
  lastLingqiTickAt: number
}

/** 创建默认洞府 */
export function createDefaultDongfu(): Dongfu {
  const level = 1
  return {
    level,
    lingqi: getDongfuMaxLingqi(level),
    zhenfaLevel: 0,
    zhenfaUnlockedMaxLevel: 0,
    lastLingqiTickAt: Date.now(),
  }
}

/**
 * 兼容旧存档，补全灵气与阵法字段
 */
export function normalizeDongfu(raw?: Partial<Dongfu>): Dongfu {
  const level = raw?.level ?? 1
  const maxLingqi = getDongfuMaxLingqi(level)

  return {
    level,
    lingqi:
      typeof raw?.lingqi === 'number'
        ? Math.max(0, Math.min(raw.lingqi, maxLingqi))
        : maxLingqi,
    zhenfaLevel: raw?.zhenfaLevel ?? 0,
    zhenfaUnlockedMaxLevel: Math.max(raw?.zhenfaUnlockedMaxLevel ?? 0, raw?.zhenfaLevel ?? 0),
    lastLingqiTickAt: raw?.lastLingqiTickAt ?? Date.now(),
  }
}

/**
 * 洞府展示信息
 */
export function buildDongfuDisplay(dongfu: Dongfu, inventory?: InventoryState) {
  const config = getDongfuLevelConfig(dongfu.level)
  const zhenfa = getZhenfaLevelConfig(dongfu.zhenfaLevel)
  const maxLingqi = config.maxLingqi
  const lingqiPercent = maxLingqi > 0 ? Math.floor((dongfu.lingqi / maxLingqi) * 100) : 0
  const upgradeTarget = getDongfuUpgradeTarget(dongfu.level)
  const zhenfaUnlockTarget = getZhenfaUnlockTarget(dongfu.zhenfaUnlockedMaxLevel)
  const zhenfaSetupTarget = getZhenfaSetupTarget(dongfu.zhenfaLevel)
  const zhenfaMaintainConfig = getZhenfaMaintainCost(dongfu.zhenfaLevel)
  const zhenfaMaintainStatus = getZhenfaMaintainStatus(dongfu, inventory, false)
  const zhenfaMaintainRunning = zhenfaMaintainStatus === 'running'

  return {
    level: dongfu.level,
    name: config.name,
    anchorRealm: config.anchorRealm,
    lingqi: Math.floor(dongfu.lingqi),
    maxLingqi,
    lingqiPercent,
    zhenfaLevel: dongfu.zhenfaLevel,
    zhenfaUnlockedMaxLevel: dongfu.zhenfaUnlockedMaxLevel,
    zhenfaName: zhenfa.name,
    zhenfaMaintainText: zhenfaMaintainConfig
      ? formatZhenfaMaintainCost(
        zhenfaMaintainConfig.perElement,
        zhenfaMaintainConfig.intervalSec,
      )
      : null,
    zhenfaMaintainRunning,
    zhenfaMaintainStatus,
    recoveryPerSec: calcLingqiRecoveryPerSec(dongfu, false, inventory),
    recoveryPerSecCultivating: calcLingqiRecoveryPerSec(dongfu, true, inventory),
    nextZhenfaUnlockLevel: zhenfaUnlockTarget?.level ?? null,
    nextZhenfaUnlockName: zhenfaUnlockTarget?.name ?? null,
    nextZhenfaBlueprintId: zhenfaUnlockTarget?.blueprintItemId ?? null,
    nextZhenfaBlueprintName: zhenfaUnlockTarget?.blueprintItemId
      ? (getItemDefinition(zhenfaUnlockTarget.blueprintItemId)?.name ?? null)
      : null,
    nextZhenfaBlueprintCount: zhenfaUnlockTarget?.blueprintItemId && inventory
      ? getItemCount(inventory, zhenfaUnlockTarget.blueprintItemId)
      : 0,
    nextZhenfaSetupLevel: zhenfaSetupTarget?.level ?? null,
    nextZhenfaSetupName: zhenfaSetupTarget?.name ?? null,
    nextZhenfaSetupLingshiText: zhenfaSetupTarget?.setupLingshiPerElement
      ? formatZhenfaLingshiCost(zhenfaSetupTarget.setupLingshiPerElement)
      : null,
    nextZhenfaSetupMaintainText: zhenfaSetupTarget?.maintainLingshiPerElement
      && zhenfaSetupTarget.maintainIntervalSec
      ? formatZhenfaMaintainCost(
        zhenfaSetupTarget.maintainLingshiPerElement,
        zhenfaSetupTarget.maintainIntervalSec,
      )
      : null,
    nextZhenfaSetupTreasureId: zhenfaSetupTarget?.setupTreasureId ?? null,
    nextZhenfaSetupTreasureName: zhenfaSetupTarget?.setupTreasureId
      ? (getItemDefinition(zhenfaSetupTarget.setupTreasureId)?.name ?? null)
      : null,
    nextZhenfaSetupTreasureCount: zhenfaSetupTarget?.setupTreasureId && inventory
      ? getItemCount(inventory, zhenfaSetupTarget.setupTreasureId)
      : 0,
    zhenfaBlueprintDropHint: getZhenfaBlueprintDropHint(dongfu.level, dongfu.zhenfaUnlockedMaxLevel),
    zhenfaTreasureDropHint: getZhenfaTreasureDropHint(dongfu.level, dongfu.zhenfaLevel),
    nextLevel: upgradeTarget?.level ?? null,
    nextName: upgradeTarget?.name ?? null,
    nextMaxLingqi: upgradeTarget?.maxLingqi ?? null,
    upgradeCostLingshi: upgradeTarget?.upgradeCostLingshi ?? null,
    upgradeTreasureId: upgradeTarget?.upgradeTreasureId ?? null,
    upgradeTreasureName: upgradeTarget?.upgradeTreasureId
      ? (getItemDefinition(upgradeTarget.upgradeTreasureId)?.name ?? null)
      : null,
    upgradeTreasureCount: upgradeTarget?.upgradeTreasureId && inventory
      ? getItemCount(inventory, upgradeTarget.upgradeTreasureId)
      : 0,
    upgradeTreasureMinDropRealm: getDongfuTreasureMinDropRealm(dongfu.level),
  }
}
