import type { MapDropItem, MapGongfaDrop } from '@/game/constants/maps'
import { getGongfaTemplate } from '@/game/models/gongfa'
import type { ElementType } from '@/game/types'

/** 地图掉落结算结果 */
export interface MapLootRollResult {
  /** 本次掉落的功法模板 id 列表 */
  gongfaIds: string[]
}

/**
 * 筛选地图配置中的功法掉落项
 */
export function getMapGongfaDrops(drops: MapDropItem[]): MapGongfaDrop[] {
  return drops.filter((item): item is MapGongfaDrop => item.type === 'gongfa')
}

/**
 * 判断功法模板是否与怪物五行属性相适
 */
export function gongfaTemplateMatchesElement(
  gongfaId: string,
  element: ElementType,
): boolean {
  const template = getGongfaTemplate(gongfaId)
  if (!template) return false
  if (template.elements.includes(element)) return true
  if (template.element === element) return true
  if (template.element === '全' || template.element === '五行') return true
  return false
}

/**
 * 为人型怪物从地图功法掉落池中匹配功法（优先五行相适，否则从池中随机）
 */
export function matchGongfaForHumanMonster(
  element: ElementType,
  drops: MapDropItem[],
): string | undefined {
  const pool = getMapGongfaDrops(drops)
  if (pool.length === 0) return undefined

  const matched = pool.filter((item) => gongfaTemplateMatchesElement(item.gongfaId, element))
  const candidates = matched.length > 0 ? matched : pool
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index].gongfaId
}

/**
 * 击败怪物后按地图掉落表独立掷骰
 * @param drops 地图掉落配置
 * @param rateMultiplier 掉落倍率（首领等可提高）
 */
export function rollMapLoot(
  drops: MapDropItem[],
  rateMultiplier = 1,
): MapLootRollResult {
  const gongfaIds: string[] = []

  for (const item of drops) {
    if (item.type !== 'gongfa') continue
    const chance = Math.min(1, item.rate * rateMultiplier)
    if (Math.random() < chance) {
      gongfaIds.push(item.gongfaId)
    }
  }

  return { gongfaIds }
}

/**
 * 根据怪物品阶获取掉落倍率
 */
export function getTierLootMultiplier(tier: '普通' | '精英' | '首领' | '传奇'): number {
  switch (tier) {
    case '精英':
      return 1.25
    case '首领':
      return 1.5
    case '传奇':
      return 2
    default:
      return 1
  }
}
