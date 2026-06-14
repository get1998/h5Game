import {
  getRealmBaseStats,
  getRealmCultivationBase,
} from '@/game/constants/realm'
import type { CombatStatContribution } from '@/game/systems/stat-contributors/contribution'
import type { Player } from '@/game/models/player'
import type { RealmStage } from '@/game/types'

/** 各世继承比例：上一世境界基础属性的 10% */
export const REINCARNATION_INHERIT_RATIO = 0.1

/** 轮回累积战斗属性加成 */
export interface ReincarnationCombatBonus {
  maxHp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  critRate: number
  critDamage: number
  hitRate: number
  dodgeRate: number
  penetration: number
  shenshi: number
  bodyStrength: number
}

/** 轮回累积修炼属性加成 */
export interface ReincarnationCultivationBonus {
  absorptionRate: number
  conversionRate: number
}

/** 上一世摘要 */
export interface LastLifeSummary {
  name: string
  realm: RealmStage
  age: number
  lifespan: number
}

/** 轮回存档结构 */
export interface ReincarnationState {
  /** 当前为第几世（初始为 1） */
  generation: number
  combat: ReincarnationCombatBonus
  cultivation: ReincarnationCultivationBonus
  /** 寿元已尽，等待再入轮回 */
  isAwaitingReincarnation: boolean
  lastLife: LastLifeSummary | null
  /** 五行汇总解锁进度（0~5，五世相生凡品圆满） */
  wuxingSummaryProgress: number
  /** 本世是否已完成当前步骤的凡品圆满 */
  wuxingSummaryLifeStepDone: boolean
  /** 是否已解锁《五行归元诀》 */
  wuxingSummaryUnlocked: boolean
}

export function createEmptyReincarnationCombatBonus(): ReincarnationCombatBonus {
  return {
    maxHp: 0,
    maxMp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    critRate: 0,
    critDamage: 0,
    hitRate: 0,
    dodgeRate: 0,
    penetration: 0,
    shenshi: 0,
    bodyStrength: 0,
  }
}

export function createEmptyReincarnationCultivationBonus(): ReincarnationCultivationBonus {
  return {
    absorptionRate: 0,
    conversionRate: 0,
  }
}

export function createDefaultReincarnationState(): ReincarnationState {
  return {
    generation: 1,
    combat: createEmptyReincarnationCombatBonus(),
    cultivation: createEmptyReincarnationCultivationBonus(),
    isAwaitingReincarnation: false,
    lastLife: null,
    wuxingSummaryProgress: 0,
    wuxingSummaryLifeStepDone: false,
    wuxingSummaryUnlocked: false,
  }
}

function scaleInt(value: number, ratio: number): number {
  return Math.floor(value * ratio)
}

function scaleRate(value: number, ratio: number, digits = 3): number {
  return Number((value * ratio).toFixed(digits))
}

/**
 * 从境界基础属性提取指定比例的战斗加成
 */
export function extractCombatBonusFromRealm(
  realm: RealmStage,
  ratio = REINCARNATION_INHERIT_RATIO,
): ReincarnationCombatBonus {
  const base = getRealmBaseStats(realm)
  return {
    maxHp: scaleInt(base.maxHp, ratio),
    maxMp: scaleInt(base.maxMp, ratio),
    attack: scaleInt(base.attack, ratio),
    defense: scaleInt(base.defense, ratio),
    speed: scaleInt(base.speed, ratio),
    critRate: scaleRate(base.critRate, ratio),
    critDamage: scaleRate(base.critDamage, ratio, 2),
    hitRate: scaleRate(base.hitRate, ratio),
    dodgeRate: scaleRate(base.dodgeRate, ratio),
    penetration: scaleInt(base.penetration, ratio),
    shenshi: scaleInt(base.shenshi, ratio),
    bodyStrength: scaleInt(base.bodyStrength, ratio),
  }
}

/**
 * 从境界基础属性提取指定比例的修炼加成
 */
export function extractCultivationBonusFromRealm(
  realm: RealmStage,
  ratio = REINCARNATION_INHERIT_RATIO,
): ReincarnationCultivationBonus {
  const base = getRealmCultivationBase(realm)
  return {
    absorptionRate: scaleRate(base.absorptionRate, ratio, 2),
    conversionRate: scaleRate(base.conversionRate, ratio, 4),
  }
}

export function mergeReincarnationCombatBonus(
  target: ReincarnationCombatBonus,
  delta: ReincarnationCombatBonus,
): void {
  target.maxHp += delta.maxHp
  target.maxMp += delta.maxMp
  target.attack += delta.attack
  target.defense += delta.defense
  target.speed += delta.speed
  target.critRate = scaleRate(target.critRate + delta.critRate, 1)
  target.critDamage = scaleRate(target.critDamage + delta.critDamage, 1, 2)
  target.hitRate = scaleRate(target.hitRate + delta.hitRate, 1)
  target.dodgeRate = scaleRate(target.dodgeRate + delta.dodgeRate, 1)
  target.penetration += delta.penetration
  target.shenshi += delta.shenshi
  target.bodyStrength += delta.bodyStrength
}

export function mergeReincarnationCultivationBonus(
  target: ReincarnationCultivationBonus,
  delta: ReincarnationCultivationBonus,
): void {
  target.absorptionRate = scaleRate(target.absorptionRate + delta.absorptionRate, 1, 2)
  target.conversionRate = scaleRate(target.conversionRate + delta.conversionRate, 1, 4)
}

export function hasReincarnationBonus(state: ReincarnationState): boolean {
  const combat = state.combat
  const cultivation = state.cultivation
  return (
    combat.maxHp > 0
    || combat.attack > 0
    || cultivation.absorptionRate > 0
    || cultivation.conversionRate > 0
  )
}

/**
 * 将轮回战斗加成转为属性贡献者格式
 */
export function toReincarnationCombatContribution(
  bonus: ReincarnationCombatBonus,
): CombatStatContribution {
  return {
    attack: bonus.attack,
    defense: bonus.defense,
    maxHp: bonus.maxHp,
    maxMp: bonus.maxMp,
    speed: bonus.speed,
    critRate: bonus.critRate,
    critDamage: bonus.critDamage,
    penetration: bonus.penetration,
    tenacity: 0,
    attackPercent: 0,
    defensePercent: 0,
    maxHpPercent: 0,
    maxMpPercent: 0,
    speedPercent: 0,
    damageReduction: 0,
  }
}

/**
 * 在已缩放境界基础面板上叠加轮回命中/闪避/神识/肉身加成（突破后调用，避免重复累加）
 */
export function applyReincarnationPlayerBaseExtras(
  player: Player,
  bonus: ReincarnationCombatBonus,
): void {
  player.combat.hitRate = Math.min(1, Number((player.combat.hitRate + bonus.hitRate).toFixed(3)))
  player.combat.dodgeRate = Math.min(1, Number((player.combat.dodgeRate + bonus.dodgeRate).toFixed(3)))
  player.shenshi += bonus.shenshi
  player.bodyStrength += bonus.bodyStrength
}

export function isPlayerLifespanEnded(player: Pick<Player, 'age' | 'lifespan'>): boolean {
  return player.age >= player.lifespan
}

/**
 * 多世轮回：累积各世 10% 基础属性，供新一世继承
 */
export class Reincarnation {
  generation: number
  combat: ReincarnationCombatBonus
  cultivation: ReincarnationCultivationBonus
  isAwaitingReincarnation: boolean
  lastLife: LastLifeSummary | null
  wuxingSummaryProgress: number
  wuxingSummaryLifeStepDone: boolean
  wuxingSummaryUnlocked: boolean

  constructor(state?: Partial<ReincarnationState>) {
    const defaults = createDefaultReincarnationState()
    this.generation = state?.generation ?? defaults.generation
    this.combat = { ...(state?.combat ?? defaults.combat) }
    this.cultivation = { ...(state?.cultivation ?? defaults.cultivation) }
    this.isAwaitingReincarnation = state?.isAwaitingReincarnation ?? false
    this.lastLife = state?.lastLife ?? null
    this.wuxingSummaryProgress = state?.wuxingSummaryProgress ?? defaults.wuxingSummaryProgress
    this.wuxingSummaryLifeStepDone = state?.wuxingSummaryLifeStepDone ?? defaults.wuxingSummaryLifeStepDone
    this.wuxingSummaryUnlocked = state?.wuxingSummaryUnlocked ?? defaults.wuxingSummaryUnlocked
  }

  static fromState(state?: ReincarnationState | null): Reincarnation {
    if (!state) return new Reincarnation()
    return new Reincarnation(state)
  }

  toState(): ReincarnationState {
    return {
      generation: this.generation,
      combat: { ...this.combat },
      cultivation: { ...this.cultivation },
      isAwaitingReincarnation: this.isAwaitingReincarnation,
      lastLife: this.lastLife ? { ...this.lastLife } : null,
      wuxingSummaryProgress: this.wuxingSummaryProgress,
      wuxingSummaryLifeStepDone: this.wuxingSummaryLifeStepDone,
      wuxingSummaryUnlocked: this.wuxingSummaryUnlocked,
    }
  }

  /**
   * 寿元尽时：记录上一世摘要，并将该世 10% 基础属性累加入轮回加成
   */
  settlePreviousLife(player: Player, ratio = REINCARNATION_INHERIT_RATIO): void {
    mergeReincarnationCombatBonus(
      this.combat,
      extractCombatBonusFromRealm(player.realm, ratio),
    )
    mergeReincarnationCultivationBonus(
      this.cultivation,
      extractCultivationBonusFromRealm(player.realm, ratio),
    )
    this.lastLife = {
      name: player.name,
      realm: player.realm,
      age: player.age,
      lifespan: player.lifespan,
    }
    this.isAwaitingReincarnation = true
  }

  /** 开启新一世（角色创建确认时调用） */
  beginNewLife(): void {
    this.generation += 1
    this.isAwaitingReincarnation = false
  }

  /** 将轮回战斗加成中的命中/闪避/神识/肉身写入玩家基础面板 */
  applyToPlayer(player: Player): void {
    applyReincarnationPlayerBaseExtras(player, this.combat)
  }
}
