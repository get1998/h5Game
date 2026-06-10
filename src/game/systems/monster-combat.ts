import { MONSTER_REALM_COEFFICIENT_BY_KIND } from '@/game/constants/combat-balance'
import { getRealmBaseStats } from '@/game/constants/realm'
import type { MonsterTemplate } from '@/game/constants/maps'
import { buildHumanMonsterCombat } from '@/game/systems/human-monster-combat'
import type { Monster, MonsterKind } from '@/game/models/monster'
import type { CombatStats } from '@/game/models/player'
import type { RealmStage } from '@/game/types'

export { MONSTER_REALM_COEFFICIENT_BY_KIND } from '@/game/constants/combat-balance'

/** 品阶对整数战斗属性（气血、攻击、防御、速度、穿透）的倍率 — 妖兽 / 灵兽 */
export const TIER_STAT_MULTIPLIERS: Record<Monster['tier'], number> = {
  普通: 1,
  精英: 1.3,
  首领: 1.6,
  传奇: 2,
}

/** 品阶对比率战斗属性（暴击率、暴击伤害、命中、闪避）的倍率 — 妖兽 / 灵兽 */
export const TIER_RATE_MULTIPLIERS: Record<Monster['tier'], number> = {
  普通: 1,
  精英: 1.15,
  首领: 1.3,
  传奇: 1.5,
}

/** 品阶综合战斗系数（种类 × 品阶） */
export interface TierCombatCoefficients {
  /** 整数属性综合系数 */
  stat: number
  /** 比率属性综合系数 */
  rate: number
}

/**
 * 获取妖兽 / 灵兽种类与品阶的综合战斗系数（人形走 human-monster-combat）
 */
export function getTierCombatCoefficients(
  kind: MonsterKind,
  tier: Monster['tier'],
): TierCombatCoefficients {
  const kindCoeff = MONSTER_REALM_COEFFICIENT_BY_KIND[kind]
  return {
    stat: kindCoeff * TIER_STAT_MULTIPLIERS[tier],
    rate: kindCoeff * TIER_RATE_MULTIPLIERS[tier],
  }
}

function scaleStat(base: number, coefficient: number): number {
  return Math.floor(base * coefficient)
}

function scaleRate(base: number, coefficient: number): number {
  return base * coefficient
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

/**
 * 妖兽 / 灵兽战斗属性：境界裸表 × 种类 × 品阶 + 个体修正
 */
function buildBeastMonsterCombat(
  template: MonsterTemplate,
  realm: RealmStage,
  tier: Monster['tier'],
): CombatStats {
  const realmStats = getRealmBaseStats(realm)
  const { stat: statCoeff, rate: rateCoeff } = getTierCombatCoefficients(template.kind, tier)
  const mod = template.statModifiers ?? {}

  const maxHp = scaleStat(realmStats.maxHp, statCoeff) + (mod.maxHp ?? 0)
  const maxMp = scaleStat(realmStats.maxMp, statCoeff) + (mod.maxMp ?? 0)
  const attack = scaleStat(realmStats.attack, statCoeff) + (mod.attack ?? 0)
  const defense = scaleStat(realmStats.defense, statCoeff) + (mod.defense ?? 0)
  const speed = scaleStat(realmStats.speed, statCoeff) + (mod.speed ?? 0)
  const penetration = scaleStat(realmStats.penetration, statCoeff) + (mod.penetration ?? 0)

  const critRate = clampRate(scaleRate(realmStats.critRate, rateCoeff) + (mod.critRate ?? 0))
  const critDamage = Number(
    (scaleRate(realmStats.critDamage, rateCoeff) + (mod.critDamage ?? 0)).toFixed(2),
  )
  const hitRate = clampRate(scaleRate(realmStats.hitRate, rateCoeff) + (mod.hitRate ?? 0))
  const dodgeRate = clampRate(scaleRate(realmStats.dodgeRate, rateCoeff) + (mod.dodgeRate ?? 0))

  const safeMaxHp = Math.max(1, maxHp)
  const safeMaxMp = Math.max(0, maxMp)

  return {
    hp: safeMaxHp,
    maxHp: safeMaxHp,
    mp: safeMaxMp,
    maxMp: safeMaxMp,
    attack: Math.max(1, attack),
    defense: Math.max(0, defense),
    speed: Math.max(1, speed),
    critRate,
    critDamage: Math.max(1, critDamage),
    hitRate,
    dodgeRate,
    penetration: Math.max(0, penetration),
  }
}

/**
 * 根据怪物模板合成战斗属性（遇怪时调用一次，结果写入 monster.combat）
 * - 人形：模拟修士突破 + 功法等级 + 轻量品阶倍率
 * - 妖兽 / 灵兽：境界裸表 × 种类 × 品阶
 */
export function buildMonsterCombat(
  template: MonsterTemplate,
  realm: RealmStage,
  tier: Monster['tier'],
  gongfaId?: string,
): CombatStats {
  if (template.kind === '人') {
    return buildHumanMonsterCombat(
      realm,
      tier,
      template.element,
      gongfaId,
      template.statModifiers,
    )
  }

  return buildBeastMonsterCombat(template, realm, tier)
}
