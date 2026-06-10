import {
  BREAKTHROUGH_STAT_ELEMENT_HIDDEN_MULTIPLIER,
  BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER,
} from '@/game/constants/breakthrough'
import { getElementRelation } from '@/game/constants/elements'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import type { RealmBaseStats } from '@/game/constants/realm'
import type { Player } from '@/game/models/player'
import type { ElementType, SpiritRootType } from '@/game/types'

/**
 * 突破战斗属性 — 五行隐藏系数（独立于闭关 / 功法经验）
 */
export function getBreakthroughElementHiddenMultiplier(
  spiritRootElements: ElementType[],
  gongfaElement: ElementType,
): number {
  const primaryElement = spiritRootElements[0]
  const relation = primaryElement
    ? getElementRelation(primaryElement, gongfaElement)
    : 'neutral'
  return BREAKTHROUGH_STAT_ELEMENT_HIDDEN_MULTIPLIER[relation]
}

/**
 * 突破战斗属性 — 灵根适配倍率（独立于闭关 / 功法经验）
 */
export function getBreakthroughSpiritRootAdaptMultiplier(
  spiritRootType: SpiritRootType,
  spiritRootElements: ElementType[],
  gongfaElement: ElementType,
): number {
  const isAdapted = spiritRootElements.includes(gongfaElement)

  if (spiritRootType === '单灵根') {
    return isAdapted
      ? BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER.单灵根
      : BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER.杂灵根
  }
  if (spiritRootType === '双灵根') {
    return isAdapted
      ? BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER.双灵根
      : BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER.杂灵根
  }
  return BREAKTHROUGH_STAT_SPIRIT_ROOT_ADAPT_MULTIPLIER.杂灵根
}

/**
 * 境界突破属性增幅倍率 = 功法品阶倍率 × 突破灵根适配 × 突破五行隐藏系数
 */
export function calcRealmBreakthroughStatMultiplier(
  player: Pick<Player, 'spiritRootType' | 'spiritRootElements'>,
  gongfa: Gongfa | undefined,
): number {
  if (!gongfa) return 1

  const gongfaElement = getGongfaPrimaryElement(gongfa)
  return (
    gongfa.expMultiplier
    * getBreakthroughSpiritRootAdaptMultiplier(
      player.spiritRootType,
      player.spiritRootElements,
      gongfaElement,
    )
    * getBreakthroughElementHiddenMultiplier(player.spiritRootElements, gongfaElement)
  )
}

/**
 * 按突破倍率缩放境界基础属性（整数属性取整，概率属性保持境界表原值）
 */
export function scaleRealmBaseStatsByMultiplier(
  base: RealmBaseStats,
  multiplier: number,
): RealmBaseStats {
  if (multiplier === 1) return { ...base }

  const scaleInt = (value: number) => Math.max(1, Math.floor(value * multiplier))

  return {
    ...base,
    maxHp: scaleInt(base.maxHp),
    maxMp: scaleInt(base.maxMp),
    attack: scaleInt(base.attack),
    defense: scaleInt(base.defense),
    speed: scaleInt(base.speed),
    shenshi: scaleInt(base.shenshi),
    bodyStrength: scaleInt(base.bodyStrength),
    penetration: scaleInt(base.penetration),
  }
}
