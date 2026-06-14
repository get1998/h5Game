import { ALL_ELEMENTS } from '@/game/constants/elements'
import type { ElementType } from '@/game/types'

/** 五行灵石存量 */
export type LingshiByElement = Record<ElementType, number>

/** 创建空的五行灵石 */
export function createEmptyLingshi(): LingshiByElement {
  return { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }
}

/** 计算灵石总量 */
export function getTotalLingshi(lingshi: LingshiByElement): number {
  return ALL_ELEMENTS.reduce((sum, element) => sum + (lingshi[element] ?? 0), 0)
}

/**
 * 将旧版单一数量迁移为五行灵石
 * @param amount 旧存档灵石总数
 * @param preferredElement 优先归入的属性（通常为灵根主属性）
 */
export function migrateLegacyLingshiAmount(
  amount: number,
  preferredElement: ElementType = '火',
): LingshiByElement {
  const lingshi = createEmptyLingshi()
  if (amount > 0) {
    lingshi[preferredElement] = amount
  }
  return lingshi
}

/** 规范化五行灵石（兼容旧存档与缺字段） */
export function normalizeLingshi(
  raw: unknown,
  preferredElement: ElementType = '火',
): LingshiByElement {
  if (typeof raw === 'number') {
    return migrateLegacyLingshiAmount(raw, preferredElement)
  }

  if (raw != null && typeof raw === 'object') {
    const record = raw as Partial<Record<ElementType, unknown>>
    const lingshi = createEmptyLingshi()
    for (const element of ALL_ELEMENTS) {
      const value = record[element]
      lingshi[element] = typeof value === 'number' && value > 0 ? Math.floor(value) : 0
    }
    return lingshi
  }

  return createEmptyLingshi()
}

/** 创建新手默认灵石（各属性均分） */
export function createStarterLingshi(total = 100): LingshiByElement {
  const lingshi = createEmptyLingshi()
  const perElement = Math.floor(total / ALL_ELEMENTS.length)
  const remainder = total - perElement * ALL_ELEMENTS.length
  ALL_ELEMENTS.forEach((element, index) => {
    lingshi[element] = perElement + (index < remainder ? 1 : 0)
  })
  return lingshi
}

/** 随机选取一种五行属性（坊市出售等场景） */
export function pickRandomLingshiElement(): ElementType {
  return ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)]
}

/** 列出有余额的五行灵石 */
export function listNonemptyLingshi(
  lingshi: LingshiByElement,
): Array<{ element: ElementType; amount: number }> {
  return ALL_ELEMENTS
    .map((element) => ({ element, amount: lingshi[element] ?? 0 }))
    .filter((entry) => entry.amount > 0)
}
