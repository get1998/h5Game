import type { SkillParams } from '@/game/constants/skill-params'

/** 玩家本场战斗减益状态 */
export interface PlayerBattleDebuffs {
  /** 中毒剩余回合 */
  poisonRoundsLeft: number
  /** 每回合中毒伤害（占气血上限比例） */
  poisonDamagePercent: number
  /** 减速剩余回合 */
  slowRoundsLeft: number
  /** 减速幅度（小数） */
  slowAmount: number
}

/** 技能减益施加结果 */
export interface SkillDebuffApplyResult {
  poisonApplied: boolean
  slowApplied: boolean
}

/**
 * 创建空的玩家战斗减益状态
 */
export function createPlayerBattleDebuffs(): PlayerBattleDebuffs {
  return {
    poisonRoundsLeft: 0,
    poisonDamagePercent: 0,
    slowRoundsLeft: 0,
    slowAmount: 0,
  }
}

/**
 * 回合开始时结算中毒伤害，并递减中毒剩余回合
 */
export function applyPoisonRoundStart(debuffs: PlayerBattleDebuffs, maxHp: number): number {
  if (debuffs.poisonRoundsLeft <= 0 || debuffs.poisonDamagePercent <= 0) {
    return 0
  }
  const damage = Math.max(1, Math.floor(maxHp * debuffs.poisonDamagePercent))
  debuffs.poisonRoundsLeft -= 1
  if (debuffs.poisonRoundsLeft <= 0) {
    debuffs.poisonDamagePercent = 0
  }
  return damage
}

/**
 * 读取受减速影响后的玩家受击速度
 */
export function getEffectiveDefenderSpeed(
  baseSpeed: number,
  debuffs: PlayerBattleDebuffs,
): number {
  if (debuffs.slowRoundsLeft > 0 && debuffs.slowAmount > 0) {
    return Math.max(1, Math.floor(baseSpeed * (1 - debuffs.slowAmount)))
  }
  return baseSpeed
}

/**
 * 技能命中后尝试施加中毒 / 减速
 */
export function tryApplySkillDebuffs(
  params: SkillParams,
  debuffs: PlayerBattleDebuffs,
): SkillDebuffApplyResult {
  const result: SkillDebuffApplyResult = { poisonApplied: false, slowApplied: false }
  const duration = typeof params.duration === 'number' ? Math.floor(params.duration) : 0

  const poisonChance = params.poison_chance
  const poisonPercent = params.poison_damage_percent
  if (typeof poisonChance === 'number' && typeof poisonPercent === 'number' && duration > 0) {
    if (Math.random() < poisonChance) {
      debuffs.poisonDamagePercent = poisonPercent
      debuffs.poisonRoundsLeft = duration
      result.poisonApplied = true
    }
  }

  const slowChance = params.slow_chance
  const slowAmount = params.slow_amount
  if (typeof slowChance === 'number' && typeof slowAmount === 'number' && duration > 0) {
    if (Math.random() < slowChance) {
      debuffs.slowAmount = slowAmount
      debuffs.slowRoundsLeft = duration
      result.slowApplied = true
    }
  }

  return result
}

/**
 * 回合结束时递减减速剩余回合（中毒在回合开始时结算）
 */
export function tickDebuffDurations(debuffs: PlayerBattleDebuffs): void {
  if (debuffs.slowRoundsLeft > 0) {
    debuffs.slowRoundsLeft -= 1
    if (debuffs.slowRoundsLeft <= 0) {
      debuffs.slowAmount = 0
    }
  }
}
