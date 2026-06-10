import {
  buildHumanMonsterSpiritRootElements,
  getHumanMonsterGongfaLevel,
  HUMAN_MONSTER_SPIRIT_ROOT_BY_TIER,
  HUMAN_MONSTER_TIER_RATE_MULTIPLIER,
  HUMAN_MONSTER_TIER_STAT_MULTIPLIER,
} from '@/game/constants/combat-balance'
import type { MonsterStatModifiers } from '@/game/constants/maps'
import { getRealmBaseStats } from '@/game/constants/realm'
import {
  calcRealmBreakthroughStatMultiplier,
  scaleRealmBaseStatsByMultiplier,
} from '@/game/formulas/realm-breakthrough'
import {
  createGongfaFromTemplate,
  getGongfaPrimaryElement,
  getGongfaTemplate,
} from '@/game/models/gongfa'
import type { Monster } from '@/game/models/monster'
import type { CombatStats } from '@/game/models/player'
import { getGongfaCombatContribution } from '@/game/systems/stat-contributors/gongfa-contributor'
import { applyCombatContributions } from '@/game/systems/stat-contributors/contribution'
import type { ElementType, RealmStage } from '@/game/types'

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function scaleInt(value: number, coefficient: number): number {
  return Math.max(1, Math.floor(value * coefficient))
}

function applyTierStatMultiplier(value: number, tier: Monster['tier']): number {
  return scaleInt(value, HUMAN_MONSTER_TIER_STAT_MULTIPLIER[tier])
}

function applyTierRateMultiplier(value: number, tier: Monster['tier']): number {
  return value * HUMAN_MONSTER_TIER_RATE_MULTIPLIER[tier]
}

/**
 * 创建人形修士用于战斗计算的功法实例（等级随境界与品阶）
 */
export function createHumanMonsterGongfa(gongfaId: string, realm: RealmStage, tier: Monster['tier']) {
  const template = getGongfaTemplate(gongfaId)
  const maxLevel = template?.maxLevel ?? 10
  const level = getHumanMonsterGongfaLevel(realm, tier, maxLevel)

  return createGongfaFromTemplate(gongfaId, {
    level,
    maxLevel,
  })
}

/**
 * 合成人形修士战斗属性：模拟突破缩放境界底 + 功法 flat + 轻量品阶倍率 + 个体修正
 * 对齐玩家「境界基础 × 突破倍率 + 功法加成」链路，不再对整面板使用妖兽式品阶乘法
 */
export function buildHumanMonsterCombat(
  realm: RealmStage,
  tier: Monster['tier'],
  monsterElement: ElementType,
  gongfaId: string | undefined,
  statModifiers: MonsterStatModifiers = {},
): CombatStats {
  const realmStats = getRealmBaseStats(realm)
  const mod = statModifiers

  if (!gongfaId) {
    const scaled = scaleRealmBaseStatsByMultiplier(realmStats, 0.92)
    return finalizeHumanCombat({
      maxHp: applyTierStatMultiplier(scaled.maxHp, tier) + (mod.maxHp ?? 0),
      maxMp: applyTierStatMultiplier(scaled.maxMp, tier) + (mod.maxMp ?? 0),
      attack: applyTierStatMultiplier(scaled.attack, tier) + (mod.attack ?? 0),
      defense: applyTierStatMultiplier(scaled.defense, tier) + (mod.defense ?? 0),
      speed: applyTierStatMultiplier(scaled.speed, tier) + (mod.speed ?? 0),
      penetration: applyTierStatMultiplier(scaled.penetration, tier) + (mod.penetration ?? 0),
      critRate: clampRate(applyTierRateMultiplier(scaled.critRate, tier) + (mod.critRate ?? 0)),
      critDamage: Number(
        (applyTierRateMultiplier(scaled.critDamage, tier) + (mod.critDamage ?? 0)).toFixed(2),
      ),
      hitRate: clampRate(applyTierRateMultiplier(scaled.hitRate, tier) + (mod.hitRate ?? 0)),
      dodgeRate: clampRate(applyTierRateMultiplier(scaled.dodgeRate, tier) + (mod.dodgeRate ?? 0)),
    })
  }

  const gongfa = createHumanMonsterGongfa(gongfaId, realm, tier)
  const gongfaElement = getGongfaPrimaryElement(gongfa)
  const spiritRootElements = buildHumanMonsterSpiritRootElements(tier, monsterElement, gongfaElement)

  const breakthroughMultiplier = calcRealmBreakthroughStatMultiplier(
    {
      spiritRootType: HUMAN_MONSTER_SPIRIT_ROOT_BY_TIER[tier],
      spiritRootElements,
    },
    gongfa,
  )

  const scaledRealm = scaleRealmBaseStatsByMultiplier(realmStats, breakthroughMultiplier)
  const gongfaContribution = getGongfaCombatContribution(gongfa)

  const withGongfa = applyCombatContributions(
    {
      ...scaledRealm,
      hp: scaledRealm.maxHp,
      mp: scaledRealm.maxMp,
    },
    gongfaContribution,
  )

  return finalizeHumanCombat({
    maxHp: applyTierStatMultiplier(withGongfa.maxHp, tier) + (mod.maxHp ?? 0),
    maxMp: applyTierStatMultiplier(withGongfa.maxMp, tier) + (mod.maxMp ?? 0),
    attack: applyTierStatMultiplier(withGongfa.attack, tier) + (mod.attack ?? 0),
    defense: applyTierStatMultiplier(withGongfa.defense, tier) + (mod.defense ?? 0),
    speed: applyTierStatMultiplier(withGongfa.speed, tier) + (mod.speed ?? 0),
    penetration: applyTierStatMultiplier(withGongfa.penetration, tier) + (mod.penetration ?? 0),
    critRate: clampRate(
      applyTierRateMultiplier(withGongfa.critRate, tier) + (mod.critRate ?? 0),
    ),
    critDamage: Number(
      (applyTierRateMultiplier(withGongfa.critDamage, tier) + (mod.critDamage ?? 0)).toFixed(2),
    ),
    hitRate: clampRate(applyTierRateMultiplier(withGongfa.hitRate, tier) + (mod.hitRate ?? 0)),
    dodgeRate: clampRate(applyTierRateMultiplier(withGongfa.dodgeRate, tier) + (mod.dodgeRate ?? 0)),
  })
}

function finalizeHumanCombat(stats: Omit<CombatStats, 'hp' | 'mp'> & { maxHp: number; maxMp: number }): CombatStats {
  const maxHp = Math.max(1, stats.maxHp)
  const maxMp = Math.max(0, stats.maxMp)

  return {
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    attack: Math.max(1, stats.attack),
    defense: Math.max(0, stats.defense),
    speed: Math.max(1, stats.speed),
    critRate: stats.critRate,
    critDamage: Math.max(1, stats.critDamage),
    hitRate: stats.hitRate,
    dodgeRate: stats.dodgeRate,
    penetration: Math.max(0, stats.penetration),
  }
}
