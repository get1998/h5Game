import type { MapDropItem, MonsterTemplate } from '@/game/constants/maps'
import type { ElementType, RealmStage } from '@/game/types'
import type { CombatStats } from '@/game/models/player'
import { matchGongfaForHumanMonster } from '@/game/systems/map-loot'
import { buildMonsterCombat } from '@/game/systems/monster-combat'

/** 怪物种类：妖兽 / 灵兽 / 人（仅人可修炼功法） */
export type MonsterKind = '妖兽' | '灵兽' | '人'


/** 怪物品阶 */
export type MonsterTier = '普通' | '精英' | '首领' | '传奇'

/** 怪物实体 */
export interface Monster {
  /** 怪物唯一标识 */
  id: string
  /** 怪物名称 */
  name: string
  /** 怪物种类 */
  kind: MonsterKind
  /** 怪物境界 */
  realm: RealmStage
  /** 怪物五行属性 */
  element: ElementType
  /** 怪物品阶 */
  tier: MonsterTier
  /**
   * 所修炼功法模板 id（仅人型怪物，从当前地图掉落池按五行匹配）
   */
  gongfaId?: string
  /** 战斗属性 */
  combat: CombatStats
}

/**
 * 从怪物模板创建实例（遇怪时合成战斗属性并固化）
 */
export function createMonsterFromTemplate(
  template: MonsterTemplate,
  mapDrops: MapDropItem[],
): Monster {
  const gongfaId = template.kind === '人'
    ? matchGongfaForHumanMonster(template.element, mapDrops)
    : undefined

  return {
    id: template.id,
    name: template.name,
    kind: template.kind,
    realm: template.realm,
    element: template.element,
    tier: template.tier,
    gongfaId,
    combat: buildMonsterCombat(template, gongfaId),
  }
}

/** 从怪物池中随机选取一只 */
export function pickRandomMonster(
  templates: MonsterTemplate[],
  mapDrops: MapDropItem[],
): Monster {
  const index = Math.floor(Math.random() * templates.length)
  return createMonsterFromTemplate(templates[index], mapDrops)
}
