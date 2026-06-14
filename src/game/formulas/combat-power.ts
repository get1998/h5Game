import { COMBAT_POWER_FORCE_FLEE_RATIO } from '@/game/constants/combat-balance'
import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import type { Monster } from '@/game/models/monster'

export { COMBAT_POWER_FORCE_FLEE_RATIO }

/** 战斗力加权系数（隐藏属性，不对玩家展示） */
const COMBAT_POWER_WEIGHTS = {
  attack: 1.15,
  defense: 0.95,
  speed: 0.75,
  maxHp: 0.055,
  maxMp: 0.035,
  hitRate: 45,
  critRate: 180,
  penetration: 0.7,
  damageReduction: 120,
  tenacity: 15,
} as const

/** 战斗力计算入参 */
export interface CombatPowerParams {
  attack: number
  defense: number
  speed: number
  maxHp: number
  maxMp?: number
  hitRate?: number
  critRate?: number
  critDamage?: number
  penetration?: number
  damageReduction?: number
  tenacity?: number
}

/**
 * 计算隐藏战斗力（综合攻、防、速、气血、灵力与部分战斗率）
 */
export function calcCombatPower(params: CombatPowerParams): number {
  const {
    attack,
    defense,
    speed,
    maxHp,
    maxMp = 0,
    hitRate = 0.85,
    critRate = 0,
    critDamage = 1.5,
    penetration = 0,
    damageReduction = 0,
    tenacity = 0,
  } = params
  const weights = COMBAT_POWER_WEIGHTS
  const critMultiplier = 1 + critRate * Math.max(0, critDamage - 1)
  const score =
    attack * weights.attack * critMultiplier
    + defense * weights.defense
    + speed * weights.speed
    + maxHp * weights.maxHp * (1 + damageReduction * 0.35)
    + maxMp * weights.maxMp
    + hitRate * weights.hitRate
    + penetration * weights.penetration
    + damageReduction * weights.damageReduction
    + tenacity * weights.tenacity

  return Math.max(1, Math.floor(score))
}

/**
 * 计算玩家当前战斗力（战前快照 + 气血 / 灵力上限）
 */
export function calcPlayerCombatPower(
  snapshot: CombatSnapshot,
  maxHp: number,
  maxMp: number,
): number {
  return calcCombatPower({
    attack: snapshot.attack,
    defense: snapshot.defense,
    speed: snapshot.speed,
    maxHp,
    maxMp,
    hitRate: snapshot.hitRate,
    critRate: snapshot.critRate,
    critDamage: snapshot.critDamage,
    penetration: snapshot.penetration,
    damageReduction: snapshot.damageReduction,
    tenacity: snapshot.tenacity,
  })
}

/**
 * 计算怪物战斗力
 */
export function calcMonsterCombatPower(monster: Monster): number {
  const combat = monster.combat
  return calcCombatPower({
    attack: combat.attack,
    defense: combat.defense,
    speed: combat.speed,
    maxHp: combat.maxHp,
    maxMp: combat.maxMp,
    hitRate: combat.hitRate,
    critRate: combat.critRate,
    critDamage: combat.critDamage,
    penetration: combat.penetration,
  })
}

/**
 * 双方战斗力差距过大时，玩家应直接撤离（敌方 ≥ 己方 × 阈值）
 */
export function shouldForceFleeByCombatPower(
  playerPower: number,
  monsterPower: number,
): boolean {
  if (monsterPower <= 0) return false
  if (playerPower <= 0) return true
  return monsterPower / playerPower >= COMBAT_POWER_FORCE_FLEE_RATIO
}
