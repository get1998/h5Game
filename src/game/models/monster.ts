import type { MapDropItem, MonsterTemplate } from '@/game/constants/maps'
import { pickRandomRealmInRangeWeighted } from '@/game/constants/realm'
import type { ElementType, RealmStage } from '@/game/types'
import type { CombatStats } from '@/game/models/player'
import { getGongfaTemplate, getGongfaTemplatePrimaryElement } from '@/game/models/gongfa'
import { matchGongfaForHumanMonster } from '@/game/systems/map-loot'
import { buildMonsterCombat } from '@/game/systems/monster-combat'

/** 怪物种类：妖兽 / 灵兽 / 人（仅人可修炼功法） */
export type MonsterKind = '妖兽' | '灵兽' | '人'

/** 怪物品阶 */
export type MonsterTier = '普通' | '精英' | '首领' | '传奇'

/** 怪物品阶生成权重默认值（地图未配置时使用） */
export const DEFAULT_MONSTER_TIER_RATES: Record<MonsterTier, number> = {
  普通: 0.7,
  精英: 0.2,
  首领: 0.08,
  传奇: 0.02,
}

/** 怪物品阶对功法经验 / 技能熟练度的获取倍率 */
export const MONSTER_TIER_REWARD_MULTIPLIERS: Record<MonsterTier, number> = {
  普通: 1,
  精英: 1.25,
  首领: 1.5,
  传奇: 2,
}

/**
 * 获取怪物品阶对应的功法经验 / 熟练度奖励倍率
 */
export function getMonsterTierRewardMultiplier(tier: MonsterTier): number {
  return MONSTER_TIER_REWARD_MULTIPLIERS[tier]
}

/** @deprecated 使用 DEFAULT_MONSTER_TIER_RATES 或地图 monsterTierRates */
export const MONSTER_TIER_PROBABILITY = DEFAULT_MONSTER_TIER_RATES

/** 首领、传奇保底阈值（连续未出则触发） */
export const MONSTER_TIER_PITY_THRESHOLDS = {
  /** 连续未出首领及以上品阶时，下次保底为首领 */
  首领: 20,
  /** 连续未出传奇品阶时，下次保底为传奇 */
  传奇: 50,
} as const

/** 品阶保底计数状态 */
export interface MonsterTierPityState {
  /** 连续未出首领及以上品阶的遇怪次数 */
  encountersSinceBoss: number
  /** 连续未出传奇品阶的遇怪次数 */
  encountersSinceLegendary: number
}

/** 创建默认品阶保底状态 */
export function createDefaultMonsterTierPityState(): MonsterTierPityState {
  return {
    encountersSinceBoss: 0,
    encountersSinceLegendary: 0,
  }
}

/** 怪物种类遇怪权重默认值（地图未配置时使用） */
export const DEFAULT_MONSTER_KIND_RATES: Record<MonsterKind, number> = {
  人: 1,
  妖兽: 0.25,
  灵兽: 0.2,
}

/** @deprecated 使用 DEFAULT_MONSTER_KIND_RATES 或地图 monsterKindRates */
export const MONSTER_KIND_SPAWN_WEIGHTS = DEFAULT_MONSTER_KIND_RATES

/** 地图遇怪配置（种类/品阶权重 + 怪物池） */
export interface MapMonsterSpawnConfig {
  monsters: MonsterTemplate[]
  drops: MapDropItem[]
  minMonsterRealm: RealmStage
  maxMonsterRealm: RealmStage
  /** 怪物种类生成权重 */
  monsterKindRates: Record<MonsterKind, number>
  /** 怪物品阶生成权重 */
  monsterTierRates: Record<MonsterTier, number>
}

/** 品阶名称前缀（普通不显示前缀） */
const TIER_DISPLAY_PREFIX: Partial<Record<MonsterTier, string>> = {
  精英: '精英·',
  首领: '首领·',
  传奇: '传奇·',
}

/** 怪物实体 */
export interface Monster {
  /** 怪物唯一标识 */
  id: string
  /** 怪物名称（含品阶前缀） */
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
 * 按权重随机选取一项
 */
function pickRandomWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0 || entries.length === 0) {
    return entries[0][0]
  }

  let roll = Math.random() * total
  for (const [key, weight] of entries) {
    roll -= weight
    if (roll <= 0) {
      return key
    }
  }

  return entries[entries.length - 1][0]
}

/**
 * 结合保底规则解析遇怪品阶
 * @param pityState 品阶保底计数
 * @param tierRates 地图品阶生成权重
 */
export function resolveMonsterTierWithPity(
  pityState: MonsterTierPityState,
  tierRates: Record<MonsterTier, number> = DEFAULT_MONSTER_TIER_RATES,
): MonsterTier {
  if (pityState.encountersSinceLegendary >= MONSTER_TIER_PITY_THRESHOLDS.传奇) {
    return '传奇'
  }

  const rolled = pickRandomWeighted(tierRates)

  if (pityState.encountersSinceBoss >= MONSTER_TIER_PITY_THRESHOLDS.首领) {
    if (rolled === '普通' || rolled === '精英') {
      return '首领'
    }
  }

  return rolled
}

/**
 * 遇怪后更新品阶保底计数
 */
export function updateMonsterTierPityState(
  pityState: MonsterTierPityState,
  tier: MonsterTier,
): MonsterTierPityState {
  return {
    encountersSinceBoss: tier === '首领' || tier === '传奇' ? 0 : pityState.encountersSinceBoss + 1,
    encountersSinceLegendary: tier === '传奇' ? 0 : pityState.encountersSinceLegendary + 1,
  }
}

/**
 * 随机生成怪物品阶（不含保底，仅供测试或特殊场景）
 */
export function pickRandomMonsterTier(
  tierRates: Record<MonsterTier, number> = DEFAULT_MONSTER_TIER_RATES,
): MonsterTier {
  return pickRandomWeighted(tierRates)
}

/**
 * 从怪物池中按种类权重与模板生成率随机选取
 * @param templates 怪物模板列表
 * @param kindRates 地图种类生成权重
 */
export function pickRandomMonsterTemplate(
  templates: MonsterTemplate[],
  kindRates: Record<MonsterKind, number> = DEFAULT_MONSTER_KIND_RATES,
): MonsterTemplate {
  if (templates.length === 1) {
    return templates[0]
  }

  let totalWeight = 0
  for (const template of templates) {
    totalWeight += (template.spawnRate ?? 1) * kindRates[template.kind]
  }

  let roll = Math.random() * totalWeight
  for (const template of templates) {
    roll -= (template.spawnRate ?? 1) * kindRates[template.kind]
    if (roll <= 0) {
      return template
    }
  }

  return templates[templates.length - 1]
}

/**
 * 根据品阶拼接展示名称
 */
export function formatMonsterDisplayName(baseName: string, tier: MonsterTier): string {
  const prefix = TIER_DISPLAY_PREFIX[tier]
  return prefix ? `${prefix}${baseName}` : baseName
}

/**
 * 获取怪物攻击时使用的五行属性（人型优先取所修功法属性）
 */
export function getMonsterAttackElement(monster: Monster): ElementType {
  if (monster.gongfaId) {
    const template = getGongfaTemplate(monster.gongfaId)
    if (template) return getGongfaTemplatePrimaryElement(template)
  }
  return monster.element
}

/**
 * 从怪物模板创建实例（遇怪时合成战斗属性并固化）
 * @param template 怪物模板
 * @param mapDrops 地图掉落池（人型怪物匹配功法）
 * @param minMonsterRealm 地图最低怪物修仙等级
 * @param maxMonsterRealm 地图最高怪物修仙等级
 * @param tier 遇怪时随机生成的品阶
 */
export function createMonsterFromTemplate(
  template: MonsterTemplate,
  mapDrops: MapDropItem[],
  minMonsterRealm: RealmStage,
  maxMonsterRealm: RealmStage,
  tier: MonsterTier,
): Monster {
  const realm = pickRandomRealmInRangeWeighted(minMonsterRealm, maxMonsterRealm)
  const gongfaId = template.kind === '人'
    ? matchGongfaForHumanMonster(template.element, mapDrops)
    : undefined
  return {
    id: template.id,
    name: formatMonsterDisplayName(template.name, tier),
    kind: template.kind,
    realm,
    element: template.element,
    tier,
    gongfaId,
    combat: buildMonsterCombat(template, realm, tier, gongfaId),
  }
}

/**
 * 遇怪：随机模板 + 品阶（含保底） + 加权随机境界
 * @param config 地图遇怪配置（含种类/品阶权重与怪物池）
 * @param pityState 品阶保底计数
 */
export function pickRandomMonster(
  config: MapMonsterSpawnConfig,
  pityState: MonsterTierPityState,
): { monster: Monster; pityState: MonsterTierPityState } {
  const { monsters, drops, minMonsterRealm, maxMonsterRealm, monsterKindRates, monsterTierRates } = config

  if (monsters.length === 0) {
    throw new Error('怪物池为空，无法生成怪物')
  }

  const template = pickRandomMonsterTemplate(monsters, monsterKindRates)
  const tier = resolveMonsterTierWithPity(pityState, monsterTierRates)
  const nextPityState = updateMonsterTierPityState(pityState, tier)
  return {
    monster: createMonsterFromTemplate(
      template,
      drops,
      minMonsterRealm,
      maxMonsterRealm,
      tier,
    ),
    pityState: nextPityState,
  }
}
