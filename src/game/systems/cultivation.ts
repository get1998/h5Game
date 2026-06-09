import {
  REALM_BREAKTHROUGH_XIUWEI,
  REALM_ORDER,
  getRealmCultivationBase,
} from '@/game/constants/realm'
import {
  getElementHiddenMultiplier,
  getSpiritRootAdaptMultiplier,
} from '@/game/formulas/gongfa-exp'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import type { Dongfu } from '@/game/models/dongfu'
import type { Player } from '@/game/models/player'
import type { RealmStage } from '@/game/types'
import {
  applyLingqiRecovery,
  absorbLingqiForCultivation,
} from '@/game/systems/lingqi'

export interface CultivationTickResult {
  gainedXiuwei: number
  lingqiConsumed: number
  lingqiRecovered: number
  seconds: number
  dongfu: Dongfu
  xiuweiRemainder: number
}

export interface CultivationRateInfo {
  /** 境界基础吸收率（灵气/秒，固定属性） */
  baseAbsorptionRate: number
  /** 境界基础灵气转化率（修为/灵气） */
  baseConversionRate: number
  /** 转化率加成（功法 × 灵根适配 × 五行隐藏） */
  conversionMultiplier: number
  /** 每秒吸收灵气（固定属性，不受灵气池余量影响） */
  absorptionPerSec: number
  /** 每点灵气转化修为 */
  conversionPerLingqi: number
  /** 理论每秒修为（吸收率 × 转化率；灵气不足时实际收益由池子余量截断） */
  totalPerSec: number
}

/**
 * 计算闭关每秒修为速率
 * 吸收率：境界固定属性（灵气不足时仅限制实际吸入量，不改变吸收率数值）
 * 转化率：境界转化率 × 功法倍率 × 灵根适配（明） × 五行隐藏系数（隐）
 * 修为/秒 = 吸收率 × 转化率
 */
export function calcCultivationRate(
  player: Player,
  _dongfu: Dongfu,
  gongfa: Gongfa | undefined,
): CultivationRateInfo {
  const { absorptionRate, conversionRate } = getRealmCultivationBase(player.realm)

  if (!gongfa) {
    return {
      baseAbsorptionRate: absorptionRate,
      baseConversionRate: conversionRate,
      conversionMultiplier: 0,
      absorptionPerSec: absorptionRate,
      conversionPerLingqi: 0,
      totalPerSec: 0,
    }
  }

  const gongfaElement = getGongfaPrimaryElement(gongfa)
  const conversionMultiplier =
    gongfa.expMultiplier
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
  const conversionPerLingqi = conversionRate * conversionMultiplier
  const totalPerSec = absorptionPerSec * conversionPerLingqi

  return {
    baseAbsorptionRate: absorptionRate,
    baseConversionRate: conversionRate,
    conversionMultiplier,
    absorptionPerSec,
    conversionPerLingqi,
    totalPerSec,
  }
}

/**
 * 结算闭关周期：先阵法聚灵恢复，再按吸收率吸入灵气、转化率结算修为
 */
export function calcIdleXiuwei(
  player: Player,
  dongfu: Dongfu,
  gongfa: Gongfa | undefined,
  elapsedSeconds: number,
  xiuweiRemainder = 0,
  now = Date.now(),
): CultivationTickResult {
  if (elapsedSeconds <= 0) {
    return {
      gainedXiuwei: 0,
      lingqiConsumed: 0,
      lingqiRecovered: 0,
      seconds: 0,
      dongfu,
      xiuweiRemainder,
    }
  }

  const recovery = applyLingqiRecovery(dongfu, elapsedSeconds, true, now)
  let workingDongfu = recovery.dongfu

  const rate = calcCultivationRate(player, workingDongfu, gongfa)
  const maxAbsorb = rate.absorptionPerSec * elapsedSeconds
  const absorption = absorbLingqiForCultivation(
    workingDongfu,
    maxAbsorb,
    rate.conversionPerLingqi,
    xiuweiRemainder,
  )

  workingDongfu = absorption.dongfu

  return {
    gainedXiuwei: absorption.gainedXiuwei,
    lingqiConsumed: absorption.lingqiConsumed,
    lingqiRecovered: recovery.recovered,
    seconds: elapsedSeconds,
    dongfu: workingDongfu,
    xiuweiRemainder: absorption.xiuweiRemainder,
  }
}

/**
 * 尝试突破境界
 */
export function tryBreakthrough(player: Player): {
  success: boolean
  newRealm?: RealmStage
  message: string
} {
  const currentIndex = REALM_ORDER.indexOf(player.realm)
  if (currentIndex >= REALM_ORDER.length - 1) {
    return { success: false, message: '已达当前版本最高境界。' }
  }

  const required = REALM_BREAKTHROUGH_XIUWEI[player.realm]
  if (player.xiuwei < required) {
    return {
      success: false,
      message: `修为不足，突破 ${player.realm} 需要 ${required} 点修为。`,
    }
  }

  const newRealm = REALM_ORDER[currentIndex + 1]
  return {
    success: true,
    newRealm,
    message: `突破成功！晋升 ${newRealm}！`,
  }
}

/**
 * 当前有效每点修为所需灵气（展示用）
 */
export function getLingqiCostPerXiuwei(
  player: Player,
  dongfu: Dongfu,
  gongfa: Gongfa | undefined,
): number {
  const rate = calcCultivationRate(player, dongfu, gongfa)
  if (rate.conversionPerLingqi <= 0) return 0
  return Number((1 / rate.conversionPerLingqi).toFixed(2))
}
