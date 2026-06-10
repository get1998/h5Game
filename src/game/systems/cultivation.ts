import { BREAKTHROUGH_FAILURE_XIUWEI_LOSS_RATE } from '@/game/constants/breakthrough'
import {
  REALM_BREAKTHROUGH_XIUWEI,
  getRealmXiuweiRoom,
} from '@/game/constants/realm'
import {
  calcBreakthroughSuccessRate,
  rollBreakthroughSuccess,
  type BreakthroughSuccessRateDetail,
} from '@/game/formulas/breakthrough-success'
import { isRealmXiuweiFull } from '@/game/constants/realm'
import {
  getElementHiddenMultiplier,
  getSpiritRootAdaptMultiplier,
} from '@/game/formulas/gongfa-exp'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import type { Dongfu } from '@/game/models/dongfu'
import type { ReincarnationCultivationBonus } from '@/game/models/reincarnation'
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
  reincarnationCultivation?: ReincarnationCultivationBonus | null,
): CultivationRateInfo {
  const bonus = reincarnationCultivation ?? { absorptionRate: 0, conversionRate: 0 }
  const absorptionRate = player.cultivation.absorptionRate + bonus.absorptionRate
  const conversionRate = player.cultivation.conversionRate + bonus.conversionRate

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
  const levelConversionBonus = 1 + (gongfa.conversionRateBonus ?? 0)
  const conversionMultiplier =
    gongfa.expMultiplier
    * levelConversionBonus
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
  reincarnationCultivation?: ReincarnationCultivationBonus | null,
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

  const room = getRealmXiuweiRoom(player)
  if (room <= 0) {
    return {
      gainedXiuwei: 0,
      lingqiConsumed: 0,
      lingqiRecovered: recovery.recovered,
      seconds: elapsedSeconds,
      dongfu: workingDongfu,
      xiuweiRemainder: 0,
    }
  }

  const rate = calcCultivationRate(player, workingDongfu, gongfa, reincarnationCultivation)
  const maxAbsorb = rate.absorptionPerSec * elapsedSeconds
  const absorption = absorbLingqiForCultivation(
    workingDongfu,
    maxAbsorb,
    rate.conversionPerLingqi,
    xiuweiRemainder,
  )

  let gainedXiuwei = absorption.gainedXiuwei
  let lingqiConsumed = absorption.lingqiConsumed
  let nextRemainder = absorption.xiuweiRemainder
  workingDongfu = absorption.dongfu

  if (gainedXiuwei > room) {
    const excessGain = gainedXiuwei - room
    if (rate.conversionPerLingqi > 0) {
      const refundLingqi = excessGain / rate.conversionPerLingqi
      workingDongfu = {
        ...workingDongfu,
        lingqi: workingDongfu.lingqi + refundLingqi,
      }
      lingqiConsumed -= refundLingqi
    }
    gainedXiuwei = room
    nextRemainder = 0
  } else if (gainedXiuwei >= room) {
    nextRemainder = 0
  }

  return {
    gainedXiuwei,
    lingqiConsumed,
    lingqiRecovered: recovery.recovered,
    seconds: elapsedSeconds,
    dongfu: workingDongfu,
    xiuweiRemainder: nextRemainder,
  }
}

/**
 * 是否满足小境界自动突破条件（修为已满且下一境仍属同一大境界）
 */
export function canAutoMinorBreakthrough(
  player: Player,
  gongfa: Gongfa | undefined,
): boolean {
  if (!isRealmXiuweiFull(player)) return false

  const rateDetail = calcBreakthroughSuccessRate(
    player,
    gongfa,
    player.breakthroughFailures,
  )
  return rateDetail.nextRealm != null && !rateDetail.isMajorBreakthrough
}

/**
 * 读取小境界自动突破的成功率明细（未满足条件时返回 null）
 */
export function getAutoMinorBreakthroughDetail(
  player: Player,
  gongfa: Gongfa | undefined,
): BreakthroughSuccessRateDetail | null {
  if (!canAutoMinorBreakthrough(player, gongfa)) return null

  return calcBreakthroughSuccessRate(
    player,
    gongfa,
    player.breakthroughFailures,
  )
}

/** 突破尝试结果 */
export interface BreakthroughAttemptResult {
  success: boolean
  newRealm?: RealmStage
  message: string
  /** 是否进行了成功率掷骰（修为满且非顶境） */
  rolled?: boolean
  /** 本次成功率 */
  successRate?: number
  /** 失败时损失的修为 */
  xiuweiLoss?: number
}

/**
 * 尝试突破境界（含成功率掷骰）
 */
export function tryBreakthrough(
  player: Player,
  gongfa: Gongfa | undefined,
): BreakthroughAttemptResult {
  const rateDetail = calcBreakthroughSuccessRate(
    player,
    gongfa,
    player.breakthroughFailures,
  )

  if (!rateDetail.nextRealm) {
    return { success: false, message: '已达当前版本最高境界。' }
  }

  const required = REALM_BREAKTHROUGH_XIUWEI[player.realm]
  if (player.xiuwei < required) {
    return {
      success: false,
      message: `修为不足，突破 ${player.realm} 需要 ${required} 点修为。`,
    }
  }

  const rolled = rollBreakthroughSuccess(rateDetail.rate)
  if (rolled) {
    return {
      success: true,
      newRealm: rateDetail.nextRealm,
      message: `突破成功！晋升 ${rateDetail.nextRealm}！（成功率 ${rateDetail.percent}%）`,
      rolled: true,
      successRate: rateDetail.rate,
    }
  }

  const xiuweiLoss = Math.max(
    1,
    Math.floor(required * BREAKTHROUGH_FAILURE_XIUWEI_LOSS_RATE),
  )

  return {
    success: false,
    message: `突破失败，天地灵气反噬，损失修为 ${xiuweiLoss} 点。（成功率 ${rateDetail.percent}%）`,
    rolled: true,
    successRate: rateDetail.rate,
    xiuweiLoss,
  }
}

/**
 * 当前有效每点修为所需灵气（展示用）
 */
export function getLingqiCostPerXiuwei(
  player: Player,
  dongfu: Dongfu,
  gongfa: Gongfa | undefined,
  reincarnationCultivation?: ReincarnationCultivationBonus | null,
): number {
  const rate = calcCultivationRate(player, dongfu, gongfa, reincarnationCultivation)
  if (rate.conversionPerLingqi <= 0) return 0
  return Number((1 / rate.conversionPerLingqi).toFixed(2))
}
