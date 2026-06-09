import { getRealmBaseStats } from '@/game/constants/realm'
import type { MonsterTemplate } from '@/game/constants/maps'
import { createGongfaFromTemplate, type Gongfa } from '@/game/models/gongfa'
import type { Monster, MonsterKind } from '@/game/models/monster'
import type { CombatStats } from '@/game/models/player'

/**
 * 怪物类型对境界基础属性的系数
 * 人型：与同境修士 1:1；妖兽 / 灵兽依种族天赋显著更强
 */
export const MONSTER_REALM_COEFFICIENT_BY_KIND: Record<MonsterKind, number> = {
  人: 1,
  妖兽: 1.5,
  灵兽: 2,
}


/** 品阶对整数战斗属性的倍率 */
export const TIER_STAT_MULTIPLIERS: Record<Monster['tier'], number> = {
  普通: 1,
  精英: 1.3,
  首领: 1.6,
  传奇: 2,
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
 * 根据怪物模板合成战斗属性：境界基础 + 功法加成（仅人） → 种类/品阶综合系数 → 个体修正
 * 全部战斗属性（含气血、暴击、命中等）统一乘系数，妖兽/灵兽显著强于同境修士
 * 在遇怪创建实例时调用一次，结果写入 monster.combat
 */
export function buildMonsterCombat(
  template: MonsterTemplate,
  gongfaId?: string,
): CombatStats {
  const realm = getRealmBaseStats(template.realm)
  const gongfa = getMonsterGongfaBonuses(template, gongfaId)
  const kindCoeff = MONSTER_REALM_COEFFICIENT_BY_KIND[template.kind]
  const coefficient = kindCoeff * TIER_STAT_MULTIPLIERS[template.tier]
  const mod = template.statModifiers ?? {}

  const maxHp = scaleStat(realm.maxHp + gongfa.hpBonus, coefficient) + (mod.maxHp ?? 0)
  const maxMp = scaleStat(realm.maxMp + gongfa.mpBonus, coefficient) + (mod.maxMp ?? 0)
  const attack = scaleStat(realm.attack + gongfa.attackBonus, coefficient) + (mod.attack ?? 0)
  const defense = scaleStat(realm.defense + gongfa.defenseBonus, coefficient) + (mod.defense ?? 0)
  const speed = scaleStat(realm.speed + gongfa.speedBonus, coefficient) + (mod.speed ?? 0)
  const penetration = scaleStat(realm.penetration + gongfa.penetrationBonus, coefficient)
    + (mod.penetration ?? 0)

  const critRate = clampRate(
    scaleRate(realm.critRate + gongfa.critRateBonus, coefficient) + (mod.critRate ?? 0),
  )
  const critDamage = Number(
    (scaleRate(realm.critDamage + gongfa.critDamageBonus, coefficient) + (mod.critDamage ?? 0))
      .toFixed(2),
  )
  const hitRate = clampRate(scaleRate(realm.hitRate, coefficient) + (mod.hitRate ?? 0))
  const dodgeRate = clampRate(scaleRate(realm.dodgeRate, coefficient) + (mod.dodgeRate ?? 0))

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
