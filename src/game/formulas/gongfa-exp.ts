import {
  MONSTER_REALM_GONGFA_EXP,
  SPIRIT_ROOT_ADAPT_MULTIPLIER,
} from '@/game/constants/gongfa'
import {
  ELEMENT_HIDDEN_MULTIPLIER,
  getElementRelation,
} from '@/game/constants/elements'
import { getRealmMajor } from '@/game/constants/realm'
import {
  getMonsterTierRewardMultiplier,
  type MonsterTier,
} from '@/game/models/monster'
import type { ElementType, RealmStage, SpiritRootType } from '@/game/types'

export interface GongfaExpInput {
  monsterRealm: RealmStage
  monsterTier: MonsterTier
  spiritRootType: SpiritRootType
  spiritRootElements: ElementType[]
  gongfaElement: ElementType
}

/**
 * 计算功法经验增量（文档 7.3）
 * 功法经验 = 怪物境界固定经验 × 灵根适配倍率 × 五行隐藏系数 × 怪物品阶系数
 */
export function calcGongfaExpGain(input: GongfaExpInput): number {
  const baseExp = MONSTER_REALM_GONGFA_EXP[getRealmMajor(input.monsterRealm)]
  const adaptMultiplier = getSpiritRootAdaptMultiplier(
    input.spiritRootType,
    input.spiritRootElements,
    input.gongfaElement,
  )
  const hiddenMultiplier = getElementHiddenMultiplier(
    input.spiritRootElements,
    input.gongfaElement,
  )
  const tierMultiplier = getMonsterTierRewardMultiplier(input.monsterTier)

  const raw = baseExp * adaptMultiplier * hiddenMultiplier * tierMultiplier
  const floored = Math.floor(raw)
  // 炼气期基础经验为 1，倍率相乘后常 < 1，直接取整会变成 0 导致无法升级
  if (floored > 0) return floored
  return raw > 0 ? 1 : 0
}

/**
 * 五行隐藏系数（文档 7.3）：灵根主属性与功法属性的相生相克关系
 */
export function getElementHiddenMultiplier(
  spiritRootElements: ElementType[],
  gongfaElement: ElementType,
): number {
  const primaryElement = spiritRootElements[0]
  const relation = primaryElement
    ? getElementRelation(primaryElement, gongfaElement)
    : 'neutral'
  return ELEMENT_HIDDEN_MULTIPLIER[relation]
}

/**
 * 灵根适配倍率：单灵根适配 1.5，双灵根有一属性适配 1.2，否则 0.8
 */
export function getSpiritRootAdaptMultiplier(
  spiritRootType: SpiritRootType,
  spiritRootElements: ElementType[],
  gongfaElement: ElementType,
): number {
  const isAdapted = spiritRootElements.includes(gongfaElement)

  if (spiritRootType === '单灵根') {
    return isAdapted ? SPIRIT_ROOT_ADAPT_MULTIPLIER.单灵根 : SPIRIT_ROOT_ADAPT_MULTIPLIER.杂灵根
  }
  if (spiritRootType === '双灵根') {
    return isAdapted ? SPIRIT_ROOT_ADAPT_MULTIPLIER.双灵根 : SPIRIT_ROOT_ADAPT_MULTIPLIER.杂灵根
  }
  return SPIRIT_ROOT_ADAPT_MULTIPLIER.杂灵根
}

/** 升级所需经验（每级递增） */
export function calcExpToNextLevel(level: number): number {
  return level * 100
}
