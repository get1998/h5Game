import {
  getRealmMajor,
  REALM_MAJORS,
  REALM_ORDER,
  type RealmMajor,
} from '@/game/constants/realm'
import type { GongfaQuality, RealmStage } from '@/game/types'

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
  /** 每级额外灵气吸收率加成（累加小数，如 0.01 = +1%） */
  absorptionRate: [number, number]
}

/**
 * 功法品质对于提升的属性值范围
 * 凡品每级增幅对齐炼气期小境界成长（攻/防/血约 2.5~3.5 / 2 / 8 每级中值）；
 * 高品质在凡品基础上按品质指数拉大
 */
export const GONGFA_QUALITY_LEVEL_GROWTH: Record<GongfaQuality, GongfaQualityPerLevelGrowth> = {
  凡品: {
    attack: [2.5, 4],
    defense: [1.5, 2.5],
    hp: [6, 10],
    mp: [2, 4],
    speed: [1, 2],
    critRate: [0.002, 0.005],
    critDamage: [0.025, 0.05],
    penetration: [1, 2],
    tenacity: [1, 2],
    conversionRate: [0.008, 0.015],
    absorptionRate: [0.005, 0.01],
  },
  黄品: {
    attack: [6, 10],
    defense: [4, 7],
    hp: [12, 22],
    mp: [6, 11],
    speed: [2, 4],
    critRate: [0.004, 0.008],
    critDamage: [0.04, 0.08],
    penetration: [3, 6],
    tenacity: [3, 6],
    conversionRate: [0.015, 0.028],
    absorptionRate: [0.01, 0.02],
  },
  玄品: {
    attack: [14, 24],
    defense: [9, 16],
    hp: [28, 48],
    mp: [14, 26],
    speed: [4, 7],
    critRate: [0.007, 0.012],
    critDamage: [0.07, 0.12],
    penetration: [7, 14],
    tenacity: [7, 14],
    conversionRate: [0.025, 0.042],
    absorptionRate: [0.02, 0.04],
  },
  地品: {
    attack: [34, 54],
    defense: [20, 34],
    hp: [60, 100],
    mp: [30, 52],
    speed: [8, 14],
    critRate: [0.012, 0.02],
    critDamage: [0.12, 0.2],
    penetration: [16, 28],
    tenacity: [16, 28],
    conversionRate: [0.035, 0.055],
    absorptionRate: [0.04, 0.08],
  },
  天品: {
    attack: [68, 110],
    defense: [42, 68],
    hp: [125, 200],
    mp: [62, 100],
    speed: [16, 26],
    critRate: [0.02, 0.032],
    critDamage: [0.2, 0.32],
    penetration: [34, 54],
    tenacity: [34, 54],
    conversionRate: [0.048, 0.075],
    absorptionRate: [0.08, 0.16],
  },
  仙品: {
    attack: [135, 210],
    defense: [88, 135],
    hp: [250, 380],
    mp: [130, 195],
    speed: [28, 42],
    critRate: [0.032, 0.048],
    critDamage: [0.32, 0.48],
    penetration: [68, 105],
    tenacity: [68, 105],
    conversionRate: [0.068, 0.1],
    absorptionRate: [0.16, 0.32],
  },
  神品: {
    attack: [270, 400],
    defense: [175, 260],
    hp: [520, 780],
    mp: [280, 420],
    speed: [55, 80],
    critRate: [0.048, 0.07],
    critDamage: [0.55, 0.8],
    penetration: [135, 200],
    tenacity: [135, 200],
    conversionRate: [0.095, 0.14],
    absorptionRate: [0.32, 0.64],
  },
}

/** 怪物大境界功法经验锚点（各境入门小境基准，文档 7.3） */
export const MONSTER_REALM_GONGFA_EXP: Record<RealmMajor, number> = {
  炼气: 4,
  筑基: 10,
  金丹: 30,
  元婴: 80,
  化神: 250,
}

/** 小境终点相对下一大境锚点的比例（末小境插值目标 = 下境锚点 × 该值） */
const GONGFA_EXP_STAGE_END_RATIO = 0.85

/** 顶境（化神）末小境相对本境锚点的上限比例 */
const GONGFA_EXP_TOP_MAJOR_CAP_RATIO = 1.35

/**
 * 由大境界锚点向末小境线性插值，生成各小境怪物基础功法经验
 */
function buildMonsterGongfaExpByStage(): Record<RealmStage, number> {
  const result = {} as Record<RealmStage, number>

  for (let majorIndex = 0; majorIndex < REALM_MAJORS.length; majorIndex += 1) {
    const major = REALM_MAJORS[majorIndex]
    const stages = REALM_ORDER.filter((realm) => getRealmMajor(realm) === major)
    const majorBase = MONSTER_REALM_GONGFA_EXP[major]
    const nextMajor = REALM_MAJORS[majorIndex + 1]
    const endBase = nextMajor
      ? MONSTER_REALM_GONGFA_EXP[nextMajor] * GONGFA_EXP_STAGE_END_RATIO
      : majorBase * GONGFA_EXP_TOP_MAJOR_CAP_RATIO

    const span = stages.length
    stages.forEach((stage, index) => {
      const t = span <= 1 ? 0 : index / (span - 1)
      result[stage] = Math.round(majorBase + (endBase - majorBase) * t)
    })
  }

  return result
}

/** 各小境怪物基础功法经验（由锚点插值生成） */
export const MONSTER_GONGFA_EXP_BY_STAGE: Record<RealmStage, number> = buildMonsterGongfaExpByStage()

/**
 * 读取怪物小境基础功法经验
 */
export function getMonsterGongfaExpBase(monsterRealm: RealmStage): number {
  return MONSTER_GONGFA_EXP_BY_STAGE[monsterRealm]
    ?? MONSTER_REALM_GONGFA_EXP[getRealmMajor(monsterRealm)]
}

/** 灵根适配倍率（明面，文档 7.3） */
export const SPIRIT_ROOT_ADAPT_MULTIPLIER = {
  单灵根: 1.5,
  双灵根: 1.2,
  杂灵根: 0.8,
} as const
