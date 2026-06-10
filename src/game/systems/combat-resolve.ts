import { applyGongfaSkillDamageFloor } from '@/game/constants/combat-balance'
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
export type AttackSource =
  | 'gongfa_skill'
  | 'monster_skill'
  | 'normal'
  | 'monster'
  | 'fabao_active'
  | 'fabao_passive'

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
  /** 韧性，降低攻击方暴击率（每点约 0.1%） */
  tenacity?: number
  /** 受击减伤（小数） */
  damageReduction?: number
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

/** 是否参与战斗五行克制结算（普攻不参与） */
function shouldApplyElementCombat(source: AttackSource): boolean {
  return source === 'gongfa_skill'
    || source === 'monster_skill'
    || source === 'fabao_active'
    || source === 'fabao_passive'
}

/**
 * 统一攻击结算：命中 → 暴击 → 五行克制（仅技能/法宝） → 伤害
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

  const tenacity = input.defender.tenacity ?? 0
  const effectiveCritRate = Math.max(0, input.attacker.critRate - tenacity * 0.001)
  const isCrit = rollCrit(effectiveCritRate)
  const applyElement = shouldApplyElementCombat(input.source)
  const elementMultiplier = applyElement
    ? getCombatElementMultiplier(input.attackElement, input.defender.element)
    : 1
  const elementHint = applyElement && input.attackElement
    ? formatCombatElementHint(input.attackElement, input.defender.element)
    : null

  let skillMultiplier = input.skillMultiplier ?? 1
  if (input.source === 'gongfa_skill') {
    skillMultiplier = applyGongfaSkillDamageFloor(skillMultiplier, elementMultiplier)
  }

  const damage = calcFinalDamage({
    attack: input.attacker.attack,
    skillMultiplier,
    isCrit,
    critDamage: input.attacker.critDamage,
    targetDefense: input.defender.defense,
    penetration: input.attacker.penetration,
    elementMultiplier,
    damageReduction: input.defender.damageReduction,
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
