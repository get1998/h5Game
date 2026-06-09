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
