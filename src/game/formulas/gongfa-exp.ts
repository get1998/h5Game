import {
  getMonsterGongfaExpBase,
  SPIRIT_ROOT_ADAPT_MULTIPLIER,
} from '@/game/constants/gongfa'
import {
  ELEMENT_HIDDEN_MULTIPLIER,
  getElementRelation,
} from '@/game/constants/elements'
import {
  getMonsterBattleRewardMultiplier,
  type MonsterKind,
  type MonsterTier,
} from '@/game/models/monster'
import type { ElementType, RealmStage, SpiritRootType } from '@/game/types'

export interface GongfaExpInput {
  monsterRealm: RealmStage
  /** 怪物种类 */
  monsterKind: MonsterKind
  monsterTier: MonsterTier
  spiritRootType: SpiritRootType
  spiritRootElements: ElementType[]
  gongfaElement: ElementType
}

/**
 * 计算战斗击杀功法经验增量
 *
 * 基础经验 = 怪物小境基础经验 × 灵根适配 × 五行隐藏 × 种类品阶
 * 功法经验 = 基础经验 × 玩家功法经验获取倍率（与玩家/怪物境界差无关）
 */
export function calcGongfaExpGain(input: GongfaExpInput, gongfaExpMultiplier: number): number {
  const baseExp = getMonsterGongfaExpBase(input.monsterRealm)

  const adaptMultiplier = getSpiritRootAdaptMultiplier(
    input.spiritRootType,
    input.spiritRootElements,
    input.gongfaElement,
  )
  const hiddenMultiplier = getElementHiddenMultiplier(
    input.spiritRootElements,
    input.gongfaElement,
  )
  const rewardMultiplier = getMonsterBattleRewardMultiplier(
    input.monsterKind,
    input.monsterTier,
  )

  const raw = baseExp * adaptMultiplier * hiddenMultiplier * rewardMultiplier
  const floored = Math.floor(raw * gongfaExpMultiplier)
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
