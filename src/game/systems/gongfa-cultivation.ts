import { GONGFA_CULTIVATION_LINGQI_EXP_RATIO } from '@/game/constants/gongfa-cultivation'
import { getRealmCultivationBase } from '@/game/constants/realm'
import {
  getElementHiddenMultiplier,
  getSpiritRootAdaptMultiplier,
} from '@/game/formulas/gongfa-exp'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import type { Dongfu } from '@/game/models/dongfu'
import type { InventoryState } from '@/game/models/item'
import type { Player } from '@/game/models/player'
import { applyLingqiRecovery } from '@/game/systems/lingqi'

export interface GongfaCultivationRateInfo {
  /** 境界基础吸收率（灵气/秒） */
  baseAbsorptionRate: number
  /** 境界基础每点灵气功法经验 */
  baseExpPerLingqi: number
  /** 综合经验倍率（灵根适配 × 五行隐藏 × 功法倍率 × 玩家倍率） */
  expMultiplier: number
  /** 每秒吸收灵气 */
  absorptionPerSec: number
  /** 每点灵气转化功法经验 */
  expPerLingqi: number
  /** 理论每秒功法经验 */
  totalExpPerSec: number
}

export interface GongfaCultivationTickResult {
  gainedExp: number
  lingqiConsumed: number
  lingqiRecovered: number
  seconds: number
  dongfu: Dongfu
  gongfaExpRemainder: number
  /** 阵法因灵石不足停摆 */
  zhenfaSuspended: boolean
}

/**
 * 吸收灵气并转化为功法经验（含小数累积）
 */
export function absorbLingqiForGongfaExp(
  dongfu: Dongfu,
  maxAbsorb: number,
  expPerLingqi: number,
  gongfaExpRemainder = 0,
): {
  dongfu: Dongfu
  gainedExp: number
  lingqiConsumed: number
  gongfaExpRemainder: number
} {
  if (maxAbsorb <= 0 || expPerLingqi <= 0 || dongfu.lingqi <= 0) {
    return { dongfu, gainedExp: 0, lingqiConsumed: 0, gongfaExpRemainder }
  }

  const lingqiConsumed = Math.min(maxAbsorb, dongfu.lingqi)
  const rawExp = lingqiConsumed * expPerLingqi + gongfaExpRemainder
  const gainedExp = Math.floor(rawExp)
  const nextRemainder = rawExp - gainedExp

  return {
    dongfu: {
      ...dongfu,
      lingqi: dongfu.lingqi - lingqiConsumed,
    },
    gainedExp,
    lingqiConsumed,
    gongfaExpRemainder: nextRemainder,
  }
}

/**
 * 计算洞府功法修炼速率
 * 经验/秒 = 吸收率 × 每点灵气经验
 */
export function calcGongfaCultivationRate(
  player: Player,
  gongfa: Gongfa | undefined,
): GongfaCultivationRateInfo {
  const absorptionRate = player.cultivation.absorptionRate

  if (!gongfa) {
    return {
      baseAbsorptionRate: absorptionRate,
      baseExpPerLingqi: 0,
      expMultiplier: 0,
      absorptionPerSec: absorptionRate,
      expPerLingqi: 0,
      totalExpPerSec: 0,
    }
  }

  const cultivationBase = getRealmCultivationBase(player.realm)
  const baseExpPerLingqi = cultivationBase.conversionRate * GONGFA_CULTIVATION_LINGQI_EXP_RATIO
  const gongfaElement = getGongfaPrimaryElement(gongfa)
  const expMultiplier =
    player.cultivation.gongfaConversionRate
    * player.cultivation.gongfaExpMultiplier
    * gongfa.expMultiplier
    * getSpiritRootAdaptMultiplier(
      player.spiritRootType,
      player.spiritRootElements,
      gongfaElement,
    )
    * getElementHiddenMultiplier(
      player.spiritRootElements,
      gongfaElement,
    )

  const absorptionPerSec = absorptionRate
  const expPerLingqi = baseExpPerLingqi * expMultiplier
  const totalExpPerSec = absorptionPerSec * expPerLingqi

  return {
    baseAbsorptionRate: absorptionRate,
    baseExpPerLingqi,
    expMultiplier,
    absorptionPerSec,
    expPerLingqi,
    totalExpPerSec,
  }
}

/**
 * 结算洞府功法修炼周期：先阵法聚灵恢复，再按吸收率吸入灵气、转化率结算功法经验
 */
export function calcIdleGongfaExp(
  player: Player,
  dongfu: Dongfu,
  gongfa: Gongfa | undefined,
  elapsedSeconds: number,
  gongfaExpRemainder = 0,
  now = Date.now(),
  inventory?: InventoryState,
): GongfaCultivationTickResult {
  if (elapsedSeconds <= 0) {
    return {
      gainedExp: 0,
      lingqiConsumed: 0,
      lingqiRecovered: 0,
      seconds: 0,
      dongfu,
      gongfaExpRemainder,
      zhenfaSuspended: false,
    }
  }

  const recovery = applyLingqiRecovery(dongfu, elapsedSeconds, true, now, inventory)
  let workingDongfu = recovery.dongfu

  if (!gongfa || gongfa.level >= gongfa.maxLevel) {
    return {
      gainedExp: 0,
      lingqiConsumed: 0,
      lingqiRecovered: recovery.recovered,
      seconds: elapsedSeconds,
      dongfu: workingDongfu,
      gongfaExpRemainder: 0,
      zhenfaSuspended: recovery.zhenfaSuspended,
    }
  }

  const rate = calcGongfaCultivationRate(player, gongfa)
  const maxAbsorb = rate.absorptionPerSec * elapsedSeconds
  const absorption = absorbLingqiForGongfaExp(
    workingDongfu,
    maxAbsorb,
    rate.expPerLingqi,
    gongfaExpRemainder,
  )

  return {
    gainedExp: absorption.gainedExp,
    lingqiConsumed: absorption.lingqiConsumed,
    lingqiRecovered: recovery.recovered,
    seconds: elapsedSeconds,
    dongfu: absorption.dongfu,
    gongfaExpRemainder: absorption.gongfaExpRemainder,
    zhenfaSuspended: recovery.zhenfaSuspended,
  }
}

/**
 * 当前有效每点功法经验所需灵气（展示用）
 */
export function getLingqiCostPerGongfaExp(
  player: Player,
  gongfa: Gongfa | undefined,
): number {
  const rate = calcGongfaCultivationRate(player, gongfa)
  if (rate.expPerLingqi <= 0) return 0
  return Number((1 / rate.expPerLingqi).toFixed(2))
}
