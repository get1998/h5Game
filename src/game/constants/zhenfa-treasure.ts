import { getDongfuLevelConfig } from '@/game/constants/dongfu'
import { getItemDefinition } from '@/game/constants/items'
import { ZHENFA_MAX_LEVEL, getZhenfaSetupTarget } from '@/game/constants/zhenfa'
import type { MonsterTier } from '@/game/models/monster'
import { getRealmAtOffset, getRealmIndex, type RealmStage } from '@/game/constants/realm'

/** 阵法图纸掉落：怪物境界须高于洞府锚点的小境偏移 */
export const ZHENFA_BLUEPRINT_DROP_REALM_OFFSET = 2

/** 阵法宝物掉落：怪物境界偏移（略高于图纸） */
export const ZHENFA_TREASURE_DROP_REALM_OFFSET = 3

/** 怪物品阶对阵法图纸掉落率 */
export const ZHENFA_BLUEPRINT_TIER_DROP_RATE: Record<MonsterTier, number> = {
  普通: 0.012,
  精英: 0.065,
  首领: 0.15,
  传奇: 0.32,
}

/** 怪物品阶对阵法宝物掉落率 */
export const ZHENFA_TREASURE_TIER_DROP_RATE: Record<MonsterTier, number> = {
  普通: 0.018,
  精英: 0.085,
  首领: 0.19,
  传奇: 0.4,
}

/** 阵法图纸 id 与目标阵法等级 */
export const ZHENFA_BLUEPRINT_ITEM_IDS: Record<number, string> = {
  1: 'item_zhenfa_blueprint_01',
  2: 'item_zhenfa_blueprint_02',
  3: 'item_zhenfa_blueprint_03',
  4: 'item_zhenfa_blueprint_04',
  5: 'item_zhenfa_blueprint_05',
}

/** 阵法布阵宝物 id 与目标阵法等级 */
export const ZHENFA_SETUP_TREASURE_IDS: Record<number, string> = {
  1: 'item_zhenfa_treasure_01',
  2: 'item_zhenfa_treasure_02',
  3: 'item_zhenfa_treasure_03',
  4: 'item_zhenfa_treasure_04',
  5: 'item_zhenfa_treasure_05',
}

/**
 * 获取指定阵法等级的图纸 id
 */
export function getZhenfaBlueprintItemId(level: number): string | undefined {
  return ZHENFA_BLUEPRINT_ITEM_IDS[level]
}

/**
 * 获取指定阵法等级的布阵宝物 id
 */
export function getZhenfaSetupTreasureId(level: number): string | undefined {
  return ZHENFA_SETUP_TREASURE_IDS[level]
}

/**
 * 根据图纸物品 id 反查阵法等级
 */
export function getZhenfaLevelByBlueprintItemId(itemId: string): number | null {
  for (const [level, id] of Object.entries(ZHENFA_BLUEPRINT_ITEM_IDS)) {
    if (id === itemId) return Number(level)
  }
  return null
}

/**
 * 获取下一级待解锁阵法的图纸 id
 */
export function getNextZhenfaBlueprintItemId(unlockedMaxLevel: number): string | undefined {
  if (unlockedMaxLevel >= ZHENFA_MAX_LEVEL) return undefined
  return getZhenfaBlueprintItemId(unlockedMaxLevel + 1)
}

/**
 * 获取下一级布阵所需宝物 id
 */
export function getNextZhenfaSetupTreasureId(currentZhenfaLevel: number): string | undefined {
  const target = getZhenfaSetupTarget(currentZhenfaLevel)
  return target?.setupTreasureId
}

/**
 * 计算阵法图纸掉落的最低怪物境界
 */
export function getZhenfaBlueprintMinDropRealm(
  dongfuLevel: number,
  targetZhenfaLevel: number,
): RealmStage | null {
  const config = getDongfuLevelConfig(dongfuLevel)
  const offset = ZHENFA_BLUEPRINT_DROP_REALM_OFFSET + Math.max(0, targetZhenfaLevel - 1)
  return getRealmAtOffset(config.anchorRealm, offset)
}

/**
 * 计算阵法宝物掉落的最低怪物境界
 */
export function getZhenfaTreasureMinDropRealm(
  dongfuLevel: number,
  targetZhenfaLevel: number,
): RealmStage | null {
  const config = getDongfuLevelConfig(dongfuLevel)
  const offset = ZHENFA_TREASURE_DROP_REALM_OFFSET + Math.max(0, targetZhenfaLevel - 1)
  return getRealmAtOffset(config.anchorRealm, offset)
}

/**
 * 怪物境界是否满足阵法图纸掉落
 */
export function isMonsterRealmEligibleForZhenfaBlueprint(
  monsterRealm: RealmStage,
  dongfuLevel: number,
  targetZhenfaLevel: number,
): boolean {
  const minRealm = getZhenfaBlueprintMinDropRealm(dongfuLevel, targetZhenfaLevel)
  if (!minRealm) return false
  return getRealmIndex(monsterRealm) >= getRealmIndex(minRealm)
}

/**
 * 怪物境界是否满足阵法宝物掉落
 */
export function isMonsterRealmEligibleForZhenfaTreasure(
  monsterRealm: RealmStage,
  dongfuLevel: number,
  targetZhenfaLevel: number,
): boolean {
  const minRealm = getZhenfaTreasureMinDropRealm(dongfuLevel, targetZhenfaLevel)
  if (!minRealm) return false
  return getRealmIndex(monsterRealm) >= getRealmIndex(minRealm)
}

/**
 * 阵法图纸掉落说明（UI 用）
 */
export function formatZhenfaBlueprintDropHint(
  dongfuLevel: number,
  unlockedMaxLevel: number,
): string {
  const itemId = getNextZhenfaBlueprintItemId(unlockedMaxLevel)
  const targetLevel = unlockedMaxLevel + 1
  const minRealm = getZhenfaBlueprintMinDropRealm(dongfuLevel, targetLevel)
  const definition = itemId ? getItemDefinition(itemId) : undefined
  if (!definition || !minRealm) return ''

  return `「${definition.name}」需击杀 ${minRealm} 及以上境界怪物，品阶越高掉率越高`
}

/**
 * 阵法宝物掉落说明（UI 用）
 */
export function formatZhenfaTreasureDropHint(
  dongfuLevel: number,
  currentZhenfaLevel: number,
): string {
  const itemId = getNextZhenfaSetupTreasureId(currentZhenfaLevel)
  const targetLevel = currentZhenfaLevel + 1
  const minRealm = getZhenfaTreasureMinDropRealm(dongfuLevel, targetLevel)
  const definition = itemId ? getItemDefinition(itemId) : undefined
  if (!definition || !minRealm) return ''

  return `「${definition.name}」需击杀 ${minRealm} 及以上境界怪物，品阶越高掉率越高`
}
