import type { GongfaQuality } from '@/game/types'
import type { RealmMajor } from '@/game/constants/realm'

/** 功法品质排序 */
export const GONGFA_QUALITY_ORDER: GongfaQuality[] = [
  '凡品',
  '黄品',
  '玄品',
  '地品',
  '天品',
  '仙品',
  '神品',
]

/** 功法品质每级属性增幅区间（[下限, 上限]，仅对模板中非零基础属性生效） */
export interface GongfaQualityPerLevelGrowth {
  attack: [number, number]
  defense: [number, number]
  hp: [number, number]
  mp: [number, number]
  speed: [number, number]
  critRate: [number, number]
  critDamage: [number, number]
  penetration: [number, number]
  tenacity: [number, number]
  /** 每级额外灵气转化率加成（累加小数，如 0.01 = +1%） */
  conversionRate: [number, number]
}

/**
 * 功法品质对于提升的属性值范围
 * 凡品按境界等比成长校准；高品质每级增幅指数拉大，越高差距越大
 */
export const GONGFA_QUALITY_LEVEL_GROWTH: Record<GongfaQuality, GongfaQualityPerLevelGrowth> = {
  凡品: {
    attack: [1, 2],
    defense: [0.5, 1],
    hp: [2, 4],
    mp: [1, 2],
    speed: [0.5, 1],
    critRate: [0.001, 0.002],
    critDamage: [0.01, 0.02],
    penetration: [0.5, 1],
    tenacity: [0.5, 1],
    conversionRate: [0.004, 0.008],
  },
  黄品: {
    attack: [3, 5],
    defense: [2, 4],
    hp: [6, 12],
    mp: [3, 6],
    speed: [1, 2],
    critRate: [0.002, 0.004],
    critDamage: [0.02, 0.04],
    penetration: [1.5, 3],
    tenacity: [1.5, 3],
    conversionRate: [0.008, 0.015],
  },
  玄品: {
    attack: [8, 14],
    defense: [5, 9],
    hp: [15, 28],
    mp: [8, 15],
    speed: [2, 4],
    critRate: [0.004, 0.007],
    critDamage: [0.04, 0.07],
    penetration: [4, 8],
    tenacity: [4, 8],
    conversionRate: [0.014, 0.024],
  },
  地品: {
    attack: [20, 32],
    defense: [12, 20],
    hp: [35, 60],
    mp: [18, 32],
    speed: [5, 9],
    critRate: [0.007, 0.012],
    critDamage: [0.07, 0.12],
    penetration: [10, 18],
    tenacity: [10, 18],
    conversionRate: [0.022, 0.036],
  },
  天品: {
    attack: [42, 68],
    defense: [26, 42],
    hp: [75, 120],
    mp: [38, 62],
    speed: [10, 16],
    critRate: [0.012, 0.02],
    critDamage: [0.12, 0.2],
    penetration: [22, 36],
    tenacity: [22, 36],
    conversionRate: [0.032, 0.05],
  },
  仙品: {
    attack: [85, 130],
    defense: [55, 85],
    hp: [150, 230],
    mp: [80, 120],
    speed: [18, 28],
    critRate: [0.02, 0.03],
    critDamage: [0.2, 0.3],
    penetration: [45, 70],
    tenacity: [45, 70],
    conversionRate: [0.045, 0.068],
  },
  神品: {
    attack: [170, 250],
    defense: [110, 160],
    hp: [300, 450],
    mp: [160, 240],
    speed: [35, 50],
    critRate: [0.03, 0.045],
    critDamage: [0.35, 0.5],
    penetration: [90, 130],
    tenacity: [90, 130],
    conversionRate: [0.065, 0.095],
  },
}

/** 怪物大境界对应功法经验（文档 7.3） */
export const MONSTER_REALM_GONGFA_EXP: Record<RealmMajor, number> = {
  炼气: 1,
  筑基: 3,
  金丹: 10,
  元婴: 30,
  化神: 100,
}

/** 灵根适配倍率（明面，文档 7.3） */
export const SPIRIT_ROOT_ADAPT_MULTIPLIER = {
  单灵根: 1.5,
  双灵根: 1.2,
  杂灵根: 0.8,
} as const
