import type { ElementType } from '@/game/types'

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

/** 隐藏五行系数（文档 7.3） */
export const ELEMENT_HIDDEN_MULTIPLIER = {
  same: 1.5,
  generate: 1.2,
  overcome: 0.5,
  neutral: 1,
} as const
