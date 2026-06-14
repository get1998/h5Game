import {
  ZHENFA_BLUEPRINT_TIER_DROP_RATE,
  ZHENFA_TREASURE_TIER_DROP_RATE,
  getNextZhenfaBlueprintItemId,
  getNextZhenfaSetupTreasureId,
  isMonsterRealmEligibleForZhenfaBlueprint,
  isMonsterRealmEligibleForZhenfaTreasure,
} from '@/game/constants/zhenfa-treasure'
import { getItemDefinition } from '@/game/constants/items'
import type { Monster } from '@/game/models/monster'

export interface ZhenfaLootDropResult {
  itemId: string
  itemName: string
}

/**
 * 击杀怪物后尝试掉落下一级阵法图纸
 */
export function rollZhenfaBlueprintDrop(
  monster: Monster,
  dongfuLevel: number,
  unlockedMaxLevel: number,
): ZhenfaLootDropResult | null {
  const itemId = getNextZhenfaBlueprintItemId(unlockedMaxLevel)
  if (!itemId) return null

  const definition = getItemDefinition(itemId)
  if (!definition) return null

  const targetLevel = unlockedMaxLevel + 1
  if (!isMonsterRealmEligibleForZhenfaBlueprint(monster.realm, dongfuLevel, targetLevel)) {
    return null
  }

  const rate = ZHENFA_BLUEPRINT_TIER_DROP_RATE[monster.tier]
  if (Math.random() >= rate) {
    return null
  }

  return { itemId, itemName: definition.name }
}

/**
 * 击杀怪物后尝试掉落下一级阵法布阵宝物
 */
export function rollZhenfaTreasureDrop(
  monster: Monster,
  dongfuLevel: number,
  currentZhenfaLevel: number,
): ZhenfaLootDropResult | null {
  const itemId = getNextZhenfaSetupTreasureId(currentZhenfaLevel)
  if (!itemId) return null

  const definition = getItemDefinition(itemId)
  if (!definition) return null

  const targetLevel = currentZhenfaLevel + 1
  if (!isMonsterRealmEligibleForZhenfaTreasure(monster.realm, dongfuLevel, targetLevel)) {
    return null
  }

  const rate = ZHENFA_TREASURE_TIER_DROP_RATE[monster.tier]
  if (Math.random() >= rate) {
    return null
  }

  return { itemId, itemName: definition.name }
}
