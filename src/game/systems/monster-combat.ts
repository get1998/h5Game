import { getRealmBaseStats } from '@/game/constants/realm'
import type { MonsterTemplate } from '@/game/constants/maps'
import { createGongfaFromTemplate, type Gongfa } from '@/game/models/gongfa'
import type { Monster, MonsterKind } from '@/game/models/monster'
import type { CombatStats } from '@/game/models/player'
import type { RealmStage } from '@/game/types'

/**
 * 怪物类型对境界基础属性的系数
 * 人型：与同境修士 1:1；妖兽 / 灵兽依种族天赋显著更强
 */
export const MONSTER_REALM_COEFFICIENT_BY_KIND: Record<MonsterKind, number> = {
  人: 1,
  妖兽: 1.5,
  灵兽: 2,
}


/** 品阶对整数战斗属性（气血、攻击、防御、速度、穿透）的倍率 */
export const TIER_STAT_MULTIPLIERS: Record<Monster['tier'], number> = {
  普通: 1,
  精英: 1.3,
  首领: 1.6,
  传奇: 2,
}

/** 品阶对比率战斗属性（暴击率、暴击伤害、命中、闪避）的倍率 */
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
 * 获取怪物种类与品阶的综合战斗系数
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
/** 无功法加成时的空功法属性（妖兽 / 灵兽） */
const EMPTY_GONGFA_BONUSES: Pick<
  Gongfa,
  | 'attackBonus'
  | 'defenseBonus'
  | 'hpBonus'
  | 'mpBonus'
  | 'speedBonus'
  | 'critRateBonus'
  | 'critDamageBonus'
  | 'penetrationBonus'
> = {
  attackBonus: 0,
  defenseBonus: 0,
  hpBonus: 0,
  mpBonus: 0,
  speedBonus: 0,
  critRateBonus: 0,
  critDamageBonus: 0,
  penetrationBonus: 0,
}

function scaleStat(base: number, coefficient: number): number {
  return Math.floor(base * coefficient)
}

/** 比率类属性（暴击率、命中率等）按同一系数缩放 */
function scaleRate(base: number, coefficient: number): number {
  return base * coefficient
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

/**
 * 获取怪物功法加成（仅人型怪物，功法从地图掉落池匹配）
 */
function getMonsterGongfaBonuses(template: MonsterTemplate, gongfaId?: string) {
  if (template.kind !== '人' || !gongfaId) {
    return EMPTY_GONGFA_BONUSES
  }

  const gongfa = createGongfaFromTemplate(gongfaId, {
    level: 1,
    maxLevel: 1,
  })

  return {
    attackBonus: gongfa.attackBonus,
    defenseBonus: gongfa.defenseBonus,
    hpBonus: gongfa.hpBonus,
    mpBonus: gongfa.mpBonus,
    speedBonus: gongfa.speedBonus,
    critRateBonus: gongfa.critRateBonus,
    critDamageBonus: gongfa.critDamageBonus,
    penetrationBonus: gongfa.penetrationBonus,
  }
}

/**
 * 根据怪物模板合成战斗属性：境界基础 + 功法加成（仅人） → 种类×品阶综合系数 → 个体修正
 * 整数属性与比率属性分别应用 stat / rate 系数，高品阶怪物除面板更高外暴击/命中也更强
 * 在遇怪创建实例时调用一次，结果写入 monster.combat
 * @param template 怪物模板
 * @param realm 遇怪时从地图境界区间随机得到的修仙等级
 * @param tier 遇怪时随机生成的品阶
 * @param gongfaId 人型怪物匹配的功法 id
 */
export function buildMonsterCombat(
  template: MonsterTemplate,
  realm: RealmStage,
  tier: Monster['tier'],
  gongfaId?: string,
): CombatStats {
  const realmStats = getRealmBaseStats(realm)
  const gongfa = getMonsterGongfaBonuses(template, gongfaId)
  const { stat: statCoeff, rate: rateCoeff } = getTierCombatCoefficients(
    template.kind,
    tier,
  )
  const mod = template.statModifiers ?? {}

  const maxHp = scaleStat(realmStats.maxHp + gongfa.hpBonus, statCoeff) + (mod.maxHp ?? 0)
  const maxMp = scaleStat(realmStats.maxMp + gongfa.mpBonus, statCoeff) + (mod.maxMp ?? 0)
  const attack = scaleStat(realmStats.attack + gongfa.attackBonus, statCoeff) + (mod.attack ?? 0)
  const defense = scaleStat(realmStats.defense + gongfa.defenseBonus, statCoeff) + (mod.defense ?? 0)
  const speed = scaleStat(realmStats.speed + gongfa.speedBonus, statCoeff) + (mod.speed ?? 0)
  const penetration = scaleStat(realmStats.penetration + gongfa.penetrationBonus, statCoeff)
    + (mod.penetration ?? 0)

  const critRate = clampRate(
    scaleRate(realmStats.critRate + gongfa.critRateBonus, rateCoeff) + (mod.critRate ?? 0),
  )
  const critDamage = Number(
    (scaleRate(realmStats.critDamage + gongfa.critDamageBonus, rateCoeff) + (mod.critDamage ?? 0))
      .toFixed(2),
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
