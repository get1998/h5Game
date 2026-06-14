import {
  DONGFU_MAX_LEVEL,
  getDongfuLevelConfig,
  getDongfuUpgradeTarget,
} from '@/game/constants/dongfu'
import { getItemDefinition } from '@/game/constants/items'
import type { MonsterTier } from '@/game/models/monster'
import { getRealmAtOffset, getRealmIndex, type RealmStage } from '@/game/constants/realm'

/** 宝物掉落：怪物境界须高于洞府当前锚点境界的小境数 */
export const DONGFU_TREASURE_DROP_REALM_OFFSET = 3

/** 怪物品阶对洞府宝物掉落率（独立掷骰） */
export const DONGFU_TREASURE_TIER_DROP_RATE: Record<MonsterTier, number> = {
  普通: 0.015,
  精英: 0.08,
  首领: 0.18,
  传奇: 0.38,
}

/** 坊市每日刷新洞府宝物的概率（每种候选独立掷骰） */
export const MARKET_TREASURE_REFRESH_RATE_PER_DAY = 0.025

/** 坊市稀世寄售栏位上限 */
export const MARKET_TREASURE_MAX_SPECIAL = 2

/** 坊市前瞻：当前洞府等级起，纳入刷新候选的升级级数 */
export const MARKET_TREASURE_LOOKAHEAD_LEVELS = 3

/** 洞府升级宝物 id 与目标洞府等级对应 */
export const DONGFU_UPGRADE_TREASURE_IDS: Record<number, string> = {
  2: 'item_dongfu_treasure_02',
  3: 'item_dongfu_treasure_03',
  4: 'item_dongfu_treasure_04',
  5: 'item_dongfu_treasure_05',
  6: 'item_dongfu_treasure_06',
  7: 'item_dongfu_treasure_07',
  8: 'item_dongfu_treasure_08',
  9: 'item_dongfu_treasure_09',
  10: 'item_dongfu_treasure_10',
}

/**
 * 获取升级至指定洞府等级所需的宝物 id
 */
export function getDongfuUpgradeTreasureId(targetLevel: number): string | undefined {
  return DONGFU_UPGRADE_TREASURE_IDS[targetLevel]
}

/**
 * 获取当前洞府下一级升级所需宝物 id
 */
export function getNextDongfuUpgradeTreasureId(currentDongfuLevel: number): string | undefined {
  const target = getDongfuUpgradeTarget(currentDongfuLevel)
  return target?.upgradeTreasureId
}

/**
 * 计算该级宝物掉落的最低怪物境界（基于升级前洞府锚点 + 偏移）
 */
export function getDongfuTreasureMinDropRealm(fromDongfuLevel: number): RealmStage | null {
  const config = getDongfuLevelConfig(fromDongfuLevel)
  return getRealmAtOffset(config.anchorRealm, DONGFU_TREASURE_DROP_REALM_OFFSET)
}

/**
 * 怪物境界是否满足洞府宝物掉落要求
 */
export function isMonsterRealmEligibleForDongfuTreasure(
  monsterRealm: RealmStage,
  fromDongfuLevel: number,
): boolean {
  const minRealm = getDongfuTreasureMinDropRealm(fromDongfuLevel)
  if (!minRealm) return false
  return getRealmIndex(monsterRealm) >= getRealmIndex(minRealm)
}

/**
 * 坊市寄售洞府宝物的购入价（约为升级灵石的 3 倍）
 */
export function getDongfuTreasureMarketPrice(targetLevel: number): number {
  const config = getDongfuLevelConfig(targetLevel)
  const base = config.upgradeCostLingshi ?? 500
  return Math.round(base * 3)
}

/**
 * 获取坊市刷新候选宝物（当前洞府起若干级内的升级宝物）
 */
export function getMarketTreasureRefreshCandidates(dongfuLevel: number): Array<{
  targetLevel: number
  itemId: string
  buyPrice: number
}> {
  const results: Array<{ targetLevel: number; itemId: string; buyPrice: number }> = []

  for (
    let lv = dongfuLevel + 1;
    lv <= Math.min(dongfuLevel + MARKET_TREASURE_LOOKAHEAD_LEVELS, DONGFU_MAX_LEVEL);
    lv += 1
  ) {
    const itemId = getDongfuUpgradeTreasureId(lv)
    if (!itemId || !getItemDefinition(itemId)) continue
    results.push({
      targetLevel: lv,
      itemId,
      buyPrice: getDongfuTreasureMarketPrice(lv),
    })
  }

  return results
}
