import type { ElementType, SpiritRootType } from '@/game/types'

const ALL_ELEMENTS: ElementType[] = ['金', '木', '水', '火', '土']

/** 灵根类型权重（总和 100） */
const SPIRIT_ROOT_WEIGHTS: { type: SpiritRootType; weight: number; count: number }[] = [
  { type: '单灵根', weight: 10, count: 1 },
  { type: '双灵根', weight: 30, count: 2 },
  { type: '杂灵根', weight: 60, count: 0 },
]

/** 杂灵根属性数量权重 */
const MIXED_ROOT_COUNTS = [
  { count: 3, weight: 50 },
  { count: 4, weight: 35 },
  { count: 5, weight: 15 },
]

const SURNAMES = ['林', '苏', '叶', '萧', '沈', '陆', '顾', '秦', '白', '云', '韩', '楚', '宁', '谢', '温']
const GIVEN_NAMES = ['青', '云', '寒', '霜', '尘', '渊', '澜', '澈', '玄', '墨', '瑶', '璃', '羽', '辰', '逸']

/** 灵根生成结果 */
export interface SpiritRootResult {
  spiritRootType: SpiritRootType
  spiritRootElements: ElementType[]
  rarityText: string
  rarityClass: string
  description: string
}

/** 五行属性展示色 */
export const ELEMENT_COLORS: Record<ElementType, string> = {
  金: '#e8c547',
  木: '#4ac97a',
  水: '#4a9ec9',
  火: '#e8684a',
  土: '#c9a227',
}

/**
 * 按权重随机抽取一项
 */
function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

/**
 * 从五行中随机抽取不重复的属性
 */
function pickRandomElements(count: number): ElementType[] {
  const pool = [...ALL_ELEMENTS]
  const result: ElementType[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool[idx])
    pool.splice(idx, 1)
  }
  return result
}

/**
 * 获取灵根品阶描述
 */
function getSpiritRootMeta(type: SpiritRootType): Pick<SpiritRootResult, 'rarityText' | 'rarityClass' | 'description'> {
  switch (type) {
    case '单灵根':
      return {
        rarityText: '天品',
        rarityClass: 'spirit-root-rarity--legendary',
        description: '万中无一的纯灵根，修炼速度极快，功法适配倍率最高。',
      }
    case '双灵根':
      return {
        rarityText: '地品',
        rarityClass: 'spirit-root-rarity--rare',
        description: '双属性并存，资质上佳，兼顾两种五行功法。',
      }
    default:
      return {
        rarityText: '凡品',
        rarityClass: 'spirit-root-rarity--common',
        description: '杂灵根资质平平，需以勤补拙，方能在仙途立足。',
      }
  }
}

/**
 * 随机生成灵根属性
 */
export function generateSpiritRoot(): SpiritRootResult {
  const picked = pickWeighted(SPIRIT_ROOT_WEIGHTS)
  let elementCount = picked.count
  if (picked.type === '杂灵根') {
    elementCount = pickWeighted(MIXED_ROOT_COUNTS).count
  }
  const spiritRootElements = pickRandomElements(elementCount)
  const meta = getSpiritRootMeta(picked.type)
  return {
    spiritRootType: picked.type,
    spiritRootElements,
    ...meta,
  }
}

/**
 * 随机生成道号
 */
export function generateRandomName(): string {
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)]
  const given = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)]
  return `${surname}${given}`
}

/**
 * 构建灵根展示项（含样式预计算）
 */
export function buildSpiritRootDisplay(result: SpiritRootResult) {
  return {
    type: result.spiritRootType,
    rarityText: result.rarityText,
    rarityClass: result.rarityClass,
    description: result.description,
    elementText: result.spiritRootElements.join(' · '),
    elements: result.spiritRootElements.map((el) => ({
      name: el,
      color: ELEMENT_COLORS[el],
      tagStyle: `color: ${ELEMENT_COLORS[el]}; border-color: ${ELEMENT_COLORS[el]};`,
    })),
  }
}
