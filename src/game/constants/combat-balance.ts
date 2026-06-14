import { COMBAT_ELEMENT_COUNTERED_MULTIPLIER } from '@/game/constants/elements'
import type { MonsterKind, MonsterTier } from '@/game/models/monster'
import { getRealmIndex, type RealmStage } from '@/game/constants/realm'
import { ALL_ELEMENTS } from '@/game/constants/elements'
import type { ElementType, SpiritRootType } from '@/game/types'

/**
 * 莽荒大陆战斗数值锚点（策划调表入口）
 * 设计说明见 docs/balance-combat.md
 */

/** 世界观：无功法器时的同级境界差目标（小境界/炼气层数） */
export const COMBAT_BALANCE_REALM_GAP = {
  /** 同级普通妖兽：默认构筑下玩家需高出约 3 级方可稳赢 */
  beast: 3,
  /** 同级普通灵兽：稀少，需高出约 5 级 */
  spiritBeast: 5,
  /** 同级普通人形：默认构筑可打或略优 */
  human: 0,
} as const

/**
 * 校验用默认玩家构筑（文档 3.2）
 * - 单灵根与凡品入门功法属性匹配
 * - 突破战斗倍率取 BREAKTHROUGH_STAT_*（约 1.32）
 * - 尚未获得法器
 */
export const COMBAT_BALANCE_BASELINE = {
  spiritRootType: '单灵根' as const,
  gongfaQuality: '凡品' as const,
  hasFabao: false,
} as const

/**
 * 怪物种类对境界裸表的战斗系数（妖兽 / 灵兽）
 * 人形修士走 human-monster-combat 独立链路，不使用本表
 */
export const MONSTER_REALM_COEFFICIENT_BY_KIND: Record<MonsterKind, number> = {
  人: 1,
  妖兽: 1.75,
  灵兽: 2.2,
}

/**
 * 人形修士品阶对整面板的轻量整数倍率（主要强度来自模拟突破 + 功法等级）
 */
export const HUMAN_MONSTER_TIER_STAT_MULTIPLIER: Record<MonsterTier, number> = {
  普通: 1,
  精英: 1.05,
  首领: 1.1,
  传奇: 1.15,
}

/** 人形修士品阶对比率属性的轻量倍率 */
export const HUMAN_MONSTER_TIER_RATE_MULTIPLIER: Record<MonsterTier, number> = {
  普通: 1,
  精英: 1.05,
  首领: 1.08,
  传奇: 1.1,
}

/** 人形修士按品阶模拟的灵根资质 */
export const HUMAN_MONSTER_SPIRIT_ROOT_BY_TIER: Record<MonsterTier, SpiritRootType> = {
  普通: '杂灵根',
  精英: '双灵根',
  首领: '单灵根',
  传奇: '单灵根',
}

/**
 * 人形修士功法等级（随遇怪境界与品阶）
 */
export function getHumanMonsterGongfaLevel(
  realm: RealmStage,
  tier: MonsterTier,
  maxLevel = 10,
): number {
  const realmIndex = Math.max(0, getRealmIndex(realm))

  switch (tier) {
    case '普通':
      return 1
    case '精英':
      return Math.min(3, 1 + Math.floor(realmIndex / 5))
    case '首领':
      return Math.min(5, 2 + Math.floor(realmIndex / 4))
    case '传奇':
      return Math.min(8, 4 + Math.floor(realmIndex / 3))
    default:
      return Math.max(1, Math.min(maxLevel, 1))
  }
}

/**
 * 构建人形修士模拟灵根属性列表（精英确保双灵根含功法属性）
 */
export function buildHumanMonsterSpiritRootElements(
  tier: MonsterTier,
  monsterElement: ElementType,
  gongfaElement: ElementType,
): ElementType[] {
  if (tier !== '精英') {
    return [monsterElement]
  }

  if (monsterElement !== gongfaElement) {
    return [monsterElement, gongfaElement]
  }

  const secondary = ALL_ELEMENTS.find((e) => e !== monsterElement) ?? monsterElement
  return [monsterElement, secondary]
}

/**
 * 莽荒大陆默认遇怪种类权重（妖兽为主，灵兽稀少）
 * 实际概率 = 该种类权重 / 三项权重之和
 */
export const MANGHUANG_MONSTER_KIND_WEIGHTS = {
  妖兽: 1,
  人: 0.22,
  灵兽: 0.04,
} as const

/** @deprecated 使用 MANGHUANG_MONSTER_KIND_WEIGHTS */
export const DEFAULT_MONSTER_KIND_SPAWN_WEIGHTS = MANGHUANG_MONSTER_KIND_WEIGHTS

/**
 * 怪物战斗回合灵力恢复（占灵力上限比例，在怪物行动前结算）
 * 妖兽技能多为 cost_mp_percent=1.0 + cooldown=2：50% 恢复 → 大招后 2 回合普攻，第 3 回合可再放技能
 */
export const MONSTER_BATTLE_MP_REGEN_PERCENT: Record<MonsterKind, number> = {
  妖兽: 0.5,
  灵兽: 0.55,
  人: 0.35,
}

/**
 * 获取怪物战斗灵力每回合恢复比例
 */
export function getMonsterBattleMpRegenPercent(kind: MonsterKind): number {
  return MONSTER_BATTLE_MP_REGEN_PERCENT[kind]
}

/**
 * 功法技能在「中性 / 克制」时的最低有效倍率（技能倍率 × 五行后）
 * 被克（×0.8）时不保底，允许低于普攻
 */
export const GONGFA_SKILL_MIN_EFFECTIVE_MULTIPLIER = 1.05

/**
 * 按最低有效倍率抬升功法技能伤害倍率（被克时不抬升）
 */
export function applyGongfaSkillDamageFloor(
  skillMultiplier: number,
  elementMultiplier: number,
): number {
  if (elementMultiplier <= COMBAT_ELEMENT_COUNTERED_MULTIPLIER) {
    return skillMultiplier
  }
  const effective = skillMultiplier * elementMultiplier
  if (effective >= GONGFA_SKILL_MIN_EFFECTIVE_MULTIPLIER) {
    return skillMultiplier
  }
  return GONGFA_SKILL_MIN_EFFECTIVE_MULTIPLIER / elementMultiplier
}

/** 自动逃跑基础成功率（双方速度相同时） */
export const FLEE_BASE_SUCCESS_RATE = 0.5

/** 速度差每点折算的逃跑率变化（与命中率一致：0.1%/点） */
export const FLEE_SPEED_FACTOR = 0.001

/** 逃跑成功率下限 */
export const FLEE_MIN_SUCCESS_RATE = 0.1

/** 逃跑成功率上限 */
export const FLEE_MAX_SUCCESS_RATE = 0.95

/** 敌方战斗力 ≥ 己方 × 该倍数时，直接撤离（不掷骰） */
export const COMBAT_POWER_FORCE_FLEE_RATIO = 2.2
