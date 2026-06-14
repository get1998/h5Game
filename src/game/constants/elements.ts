import type { ElementType } from '@/game/types'

/** 全部五行属性 */
export const ALL_ELEMENTS: readonly ElementType[] = ['金', '木', '水', '火', '土']

/** 五行相生：key 生 value */
export const ELEMENT_GENERATES: Record<ElementType, ElementType> = {
  金: '水',
  水: '木',
  木: '火',
  火: '土',
  土: '金',
}

/** 五行相克：key 克 value */
export const ELEMENT_OVERCOMES: Record<ElementType, ElementType> = {
  金: '木',
  木: '土',
  土: '水',
  水: '火',
  火: '金',
}

/**
 * 判断两属性关系
 * @returns same | generate | overcome | neutral
 */
export function getElementRelation(
  rootElement: ElementType,
  gongfaElement: ElementType,
): 'same' | 'generate' | 'overcome' | 'neutral' {
  if (rootElement === gongfaElement) return 'same'
  if (ELEMENT_GENERATES[rootElement] === gongfaElement) return 'generate'
  if (ELEMENT_GENERATES[gongfaElement] === rootElement) return 'generate'
  if (ELEMENT_OVERCOMES[rootElement] === gongfaElement) return 'overcome'
  if (ELEMENT_OVERCOMES[gongfaElement] === rootElement) return 'overcome'
  return 'neutral'
}

/** 隐藏五行系数（文档 7.3，用于功法经验 / 闭关） */
export const ELEMENT_HIDDEN_MULTIPLIER = {
  same: 1.5,
  generate: 1.2,
  overcome: 0.5,
  neutral: 1,
} as const

/** 战斗五行克制倍率（文档 5.2） */
export const COMBAT_ELEMENT_COUNTER_MULTIPLIER = 1.5
export const COMBAT_ELEMENT_COUNTERED_MULTIPLIER = 0.8

/** 战斗五行关系 */
export type CombatElementRelation = 'counter' | 'countered' | 'neutral'

/**
 * 判断是否为标准五行属性
 */
export function isElementType(value: unknown): value is ElementType {
  return typeof value === 'string' && (ALL_ELEMENTS as readonly string[]).includes(value)
}

/**
 * 获取战斗五行关系（攻击方 vs 防御方）
 */
export function getCombatElementRelation(
  attackElement: ElementType,
  defenseElement: ElementType,
): CombatElementRelation {
  if (ELEMENT_OVERCOMES[attackElement] === defenseElement) return 'counter'
  if (ELEMENT_OVERCOMES[defenseElement] === attackElement) return 'countered'
  return 'neutral'
}

/**
 * 计算战斗五行伤害倍率
 * @param attackElement 攻击属性，缺省视为无属性加成
 * @param defenseElement 目标属性，缺省视为无属性加成
 * @param options.defenderImmuneToCounter 受击方免疫被克（五行汇总功法）
 */
export function getCombatElementMultiplier(
  attackElement: ElementType | undefined,
  defenseElement: ElementType | undefined,
  options?: { defenderImmuneToCounter?: boolean },
): number {
  if (!attackElement || !defenseElement) return 1
  const relation = getCombatElementRelation(attackElement, defenseElement)
  if (relation === 'counter') return COMBAT_ELEMENT_COUNTER_MULTIPLIER
  if (relation === 'countered') {
    return options?.defenderImmuneToCounter ? 1 : COMBAT_ELEMENT_COUNTERED_MULTIPLIER
  }
  return 1
}

/**
 * 生成战斗日志中的五行克制提示（如「金克木」）
 */
export function formatCombatElementHint(
  attackElement: ElementType,
  defenseElement: ElementType,
  options?: { defenderImmuneToCounter?: boolean },
): string | null {
  const relation = getCombatElementRelation(attackElement, defenseElement)
  if (relation === 'counter') return `${attackElement}克${defenseElement}`
  if (relation === 'countered') {
    return options?.defenderImmuneToCounter
      ? `${attackElement}被${defenseElement}克·归元免疫`
      : `${attackElement}被${defenseElement}克`
  }
  return null
}

/**
 * 从候选属性中选取克制目标属性的那一系
 */
export function pickCounterElementAgainst(
  targetElement: ElementType,
  candidates: ElementType[],
): ElementType | undefined {
  return candidates.find((element) => ELEMENT_OVERCOMES[element] === targetElement)
}

/**
 * 随机选取克制目标属性的五行
 */
export function pickRandomCounterElement(targetElement: ElementType): ElementType {
  const counters = ALL_ELEMENTS.filter((element) => ELEMENT_OVERCOMES[element] === targetElement)
  if (counters.length === 0) return targetElement
  return counters[Math.floor(Math.random() * counters.length)]
}
