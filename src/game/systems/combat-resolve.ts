import {
  formatCombatElementHint,
  getCombatElementMultiplier,
} from '@/game/constants/elements'
import {
  calcFinalDamage,
  calcHitRate,
  rollCrit,
  rollHit,
} from '@/game/formulas/damage'
import type { ElementType } from '@/game/types'

/** 攻击来源（后续可扩展法宝、DOT 等） */
export type AttackSource = 'gongfa_skill' | 'normal' | 'monster' | 'fabao_active' | 'fabao_passive'

/** 攻击方战斗属性（结算所需子集） */
export interface AttackActorStats {
  attack: number
  critRate: number
  critDamage: number
  penetration: number
  hitRate: number
  speed: number
}

/** 防御方战斗属性（结算所需子集） */
export interface DefenseActorStats {
  defense: number
  speed: number
  element: ElementType
}

/** 统一攻击结算入参 */
export interface ResolveAttackInput {
  source: AttackSource
  attacker: AttackActorStats
  defender: DefenseActorStats
  /** 攻击五行，缺省视为无属性加成 */
  attackElement?: ElementType
  skillMultiplier?: number
}

/** 统一攻击结算结果 */
export interface ResolveAttackResult {
  hit: boolean
  damage: number
  isCrit: boolean
  elementMultiplier: number
  elementHint: string | null
}

/**
 * 统一攻击结算：命中 → 暴击 → 五行克制 → 伤害
 */
export function resolveAttack(input: ResolveAttackInput): ResolveAttackResult {
  const hitRate = calcHitRate(
    input.attacker.hitRate,
    input.attacker.speed,
    input.defender.speed,
  )

  if (!rollHit(hitRate)) {
    return {
      hit: false,
      damage: 0,
      isCrit: false,
      elementMultiplier: 1,
      elementHint: null,
    }
  }

  const isCrit = rollCrit(input.attacker.critRate)
  const elementMultiplier = getCombatElementMultiplier(
    input.attackElement,
    input.defender.element,
  )
  const elementHint = input.attackElement
    ? formatCombatElementHint(input.attackElement, input.defender.element)
    : null

  const damage = calcFinalDamage({
    attack: input.attacker.attack,
    skillMultiplier: input.skillMultiplier,
    isCrit,
    critDamage: input.attacker.critDamage,
    targetDefense: input.defender.defense,
    penetration: input.attacker.penetration,
    elementMultiplier,
  })

  return {
    hit: true,
    damage,
    isCrit,
    elementMultiplier,
    elementHint,
  }
}

/**
 * 为伤害日志附加五行克制提示
 */
export function appendElementHint(text: string, elementHint: string | null): string {
  return elementHint ? `${text}（${elementHint}）` : text
}
