import {
  DONGFU_TREASURE_TIER_DROP_RATE,
  getDongfuTreasureMinDropRealm,
  getNextDongfuUpgradeTreasureId,
  isMonsterRealmEligibleForDongfuTreasure,
} from '@/game/constants/dongfu-treasure'
import { getItemDefinition } from '@/game/constants/items'
import type { Monster } from '@/game/models/monster'

export interface DongfuTreasureDropResult {
  itemId: string
  itemName: string
}

/**
 * 击杀怪物后尝试掉落下一级洞府升级宝物
 * @param monster 被击杀怪物
 * @param dongfuLevel 玩家当前洞府等级
 */
export function rollDongfuTreasureDrop(
  monster: Monster,
  dongfuLevel: number,
): DongfuTreasureDropResult | null {
  const itemId = getNextDongfuUpgradeTreasureId(dongfuLevel)
  if (!itemId) return null

  const definition = getItemDefinition(itemId)
  if (!definition) return null

  if (!isMonsterRealmEligibleForDongfuTreasure(monster.realm, dongfuLevel)) {
    return null
  }

  const rate = DONGFU_TREASURE_TIER_DROP_RATE[monster.tier]
  if (Math.random() >= rate) {
    return null
  }

  return { itemId, itemName: definition.name }
}

/**
 * 获取下一级洞府宝物掉落说明（UI 用）
 */
export function formatDongfuTreasureDropHint(dongfuLevel: number): string {
  const itemId = getNextDongfuUpgradeTreasureId(dongfuLevel)
  const minRealm = getDongfuTreasureMinDropRealm(dongfuLevel)
  const definition = itemId ? getItemDefinition(itemId) : undefined
  if (!definition || !minRealm) return ''

  return `「${definition.name}」需击杀 ${minRealm} 及以上境界怪物，品阶越高掉率越高`
}
