import {
  GONGFA_QUALITY_LEVEL_GROWTH,
  type GongfaQualityPerLevelGrowth,
} from '@/game/constants/gongfa'
import { getWuxingSummaryBaseStats } from '@/game/constants/wuxing-summary'
import { WUXING_SUMMARY_GONGFA_ID } from '@/game/constants/wuxing-summary'
import type { SkillProficiencyMap } from '@/game/models/skill'
import type { ElementType, GongfaQuality } from '@/game/types'

/** 功法展示用五行（含多系/特殊） */
export type GongfaElement = ElementType | '全' | '无' | '五行'

/** 功法实体（玩家持有实例） */
export interface Gongfa {
  /** 功法唯一标识，与配置模板 id 对应 */
  id: string
  /** 功法名称 */
  name: string
  /** 品质等级（凡品 / 黄品 / 玄品 / 地品 / 天品 / 仙品 / 神品） */
  quality: GongfaQuality
  /** 展示用五行属性（含全、无、五行等特殊值） */
  element: GongfaElement
  /** 实际五行属性（多系功法用，经验/适配计算取首项） */
  elements: ElementType[]
  /** 当前修炼等级 */
  level: number
  /** 最高可修炼等级 */
  maxLevel: number
  /** 当前等级已累计的功法经验 */
  exp: number
  /** 升级至下一级所需经验 */
  expToNext: number
  /** 功法经验获取倍率，影响修炼该功法的速度 */
  expMultiplier: number
  /** 攻击力加成（装备生效时叠加至战斗属性） */
  attackBonus: number
  /** 防御力加成 */
  defenseBonus: number
  /** 气血上限加成 */
  hpBonus: number
  /** 灵力上限加成 */
  mpBonus: number
  /** 速度加成 */
  speedBonus: number
  /** 暴击率加成（小数，如 0.02 表示 +2%） */
  critRateBonus: number
  /** 暴击伤害倍率加成（小数，如 0.3 表示 +30%） */
  critDamageBonus: number
  /** 穿透加成，无视目标部分防御 */
  penetrationBonus: number
  /** 韧性加成，降低被暴击概率 */
  tenacityBonus: number
  /** 功法等级带来的额外灵气转化率（累加小数，如 0.05 = +5%） */
  conversionRateBonus: number
  /** 功法描述文案 */
  description: string
  /** 圆满后永久被动描述 */
  permanentPassive: string
  /** 关联技能 id 列表（按解锁等级排序） */
  skillIds: string[]
  /** 各技能熟练度（仅装备修炼时通过战斗使用增长） */
  skillProficiency: SkillProficiencyMap
}

/** 功法配置模板（静态数据，用于创建功法实例） */
export interface GongfaTemplate {
  /** 功法唯一标识 */
  id: string
  /** 功法名称 */
  name: string
  /** 品质等级（凡品 / 黄品 / 玄品 / 地品 / 天品 / 仙品 / 神品） */
  quality: GongfaQuality
  /** 展示用五行属性（含全、无、五行等特殊值） */
  element: GongfaElement
  /** 实际五行属性列表（多系功法包含多个元素） */
  elements: ElementType[]
  /** 最高可修炼等级 */
  maxLevel: number
  /** 功法经验获取倍率，影响修炼该功法的速度 */
  expMultiplier: number
  /** 攻击力基础加成 */
  attackBonus: number
  /** 防御力基础加成 */
  defenseBonus: number
  /** 气血上限基础加成 */
  hpBonus: number
  /** 灵力上限基础加成 */
  mpBonus: number
  /** 速度基础加成 */
  speedBonus: number
  /** 暴击率基础加成（小数，如 0.02 表示 +2%） */
  critRateBonus: number
  /** 暴击伤害倍率基础加成（小数，如 0.3 表示 +30%） */
  critDamageBonus: number
  /** 穿透基础加成 */
  penetrationBonus: number
  /** 韧性基础加成 */
  tenacityBonus: number
  /** 功法描述文案 */
  description: string
  /** 圆满后永久被动描述 */
  permanentPassive: string
  /** 关联技能 id 列表（按解锁等级排序） */
  skillIds: string[]
  /** 是否为五行汇总功法（受击免疫属性被克） */
  isWuxingSummary?: boolean
  /** 是否支持升品阶（实例 quality 可变） */
  canUpgradeQuality?: boolean
}

/** 功法配置表（对齐 docs/gongfa_complete_v1.2.md） */
export const GONGFA_TEMPLATES: GongfaTemplate[] = [
  {
    id: 'gongfa_qingmu',
    name: '青木长生功',
    quality: '凡品',
    element: '木',
    elements: ['木'],
    maxLevel: 10,
    expMultiplier: 1,
    attackBonus: 0,
    defenseBonus: 3,
    hpBonus: 30,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '凡品木系功法，以生生不息之力温养肉身，每回合恢复少量气血。',
    permanentPassive: '气血+10',
    skillIds: ['qingmu_1', 'qingmu_2', 'qingmu_3', 'qingmu_4', 'qingmu_5'],
  },
  {
    id: 'gongfa_ruijin',
    name: '锐金诀',
    quality: '凡品',
    element: '金',
    elements: ['金'],
    maxLevel: 10,
    expMultiplier: 1,
    attackBonus: 8,
    defenseBonus: 3,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '凡品金系攻伐功法，锋芒初露，以锐金之气淬炼经脉。',
    permanentPassive: '攻击+3',
    skillIds: ['ruijin_1', 'ruijin_2', 'ruijin_3', 'ruijin_4', 'ruijin_5'],
  },
  {
    id: 'gongfa_chiyan',
    name: '赤炎诀',
    quality: '凡品',
    element: '火',
    elements: ['火'],
    maxLevel: 10,
    expMultiplier: 1,
    attackBonus: 7,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0.01,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '凡品火系功法，以温热火息淬炼肉身，小幅提升爆发能力。',
    permanentPassive: '暴击率+0.5%',
    skillIds: ['chiyan_1', 'chiyan_2', 'chiyan_3', 'chiyan_4', 'chiyan_5'],
  },
  {
    id: 'gongfa_runquan',
    name: '润泉诀',
    quality: '凡品',
    element: '水',
    elements: ['水'],
    maxLevel: 10,
    expMultiplier: 1,
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 30,
    speedBonus: 3,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '凡品水系功法，灵泉润泽，提升灵力上限与出手速度。',
    permanentPassive: '灵力上限+5',
    skillIds: ['runquan_1', 'runquan_2', 'runquan_3', 'runquan_4', 'runquan_5'],
  },
  {
    id: 'gongfa_jiantu',
    name: '坚土诀',
    quality: '凡品',
    element: '土',
    elements: ['土'],
    maxLevel: 10,
    expMultiplier: 1,
    attackBonus: 0,
    defenseBonus: 5,
    hpBonus: 25,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '凡品土系守御功法，厚土载物，稳固气血与防御根基。',
    permanentPassive: '防御+3',
    skillIds: ['jiantu_1', 'jiantu_2', 'jiantu_3', 'jiantu_4', 'jiantu_5'],
  },
  {
    id: 'gongfa_liehuo',
    name: '烈火焚天诀',
    quality: '黄品',
    element: '火',
    elements: ['火'],
    maxLevel: 10,
    expMultiplier: 1.3,
    attackBonus: 25,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0.02,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '黄品火系攻伐功法，烈焰刚猛，擅长爆发单体伤害。',
    permanentPassive: '暴击率+1%',
    skillIds: ['liehuo_1', 'liehuo_2', 'liehuo_3', 'liehuo_4', 'liehuo_5'],
  },
  {
    id: 'gongfa_houdu',
    name: '厚土载物经',
    quality: '黄品',
    element: '土',
    elements: ['土'],
    maxLevel: 10,
    expMultiplier: 1.4,
    attackBonus: 0,
    defenseBonus: 20,
    hpBonus: 80,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '黄品土系守御功法，厚德载物，大幅提升防御与气血上限。',
    permanentPassive: '防御+8',
    skillIds: ['houdu_1', 'houdu_2', 'houdu_3', 'houdu_4', 'houdu_5'],
  },
  {
    id: 'gongfa_jinfeng',
    name: '金锋破虚剑典',
    quality: '玄品',
    element: '金',
    elements: ['金'],
    maxLevel: 10,
    expMultiplier: 1.8,
    attackBonus: 60,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 15,
    tenacityBonus: 0,
    description: '玄品金系剑道功法，锋芒破虚，攻击附带穿透效果。',
    permanentPassive: '穿透+5',
    skillIds: ['jinfeng_1', 'jinfeng_2', 'jinfeng_3', 'jinfeng_4', 'jinfeng_5'],
  },
  {
    id: 'gongfa_canglang',
    name: '沧浪覆海诀',
    quality: '玄品',
    element: '水',
    elements: ['水'],
    maxLevel: 10,
    expMultiplier: 2,
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 120,
    speedBonus: 8,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '玄品水系功法，灵力浩瀚如潮，擅长控场与持续压制。',
    permanentPassive: '灵力上限+50',
    skillIds: ['canglang_1', 'canglang_2', 'canglang_3', 'canglang_4', 'canglang_5'],
  },
  {
    id: 'gongfa_wuxinghuang',
    name: '五行初融诀',
    quality: '黄品',
    element: '全',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 1.35,
    attackBonus: 15,
    defenseBonus: 12,
    hpBonus: 50,
    mpBonus: 30,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '黄品五行功法，融五系初意，为归元升阶之基。',
    permanentPassive: '全抗+1%',
    skillIds: [],
  },
  {
    id: 'gongfa_wuxingxuan',
    name: '五行玄通诀',
    quality: '玄品',
    element: '全',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 1.9,
    attackBonus: 35,
    defenseBonus: 25,
    hpBonus: 120,
    mpBonus: 80,
    speedBonus: 5,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '玄品五行功法，五气玄通，可助归元诀破境升品。',
    permanentPassive: '全抗+2%',
    skillIds: [],
  },
  {
    id: 'gongfa_hunyuan',
    name: '混元五行功',
    quality: '地品',
    element: '全',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 2.5,
    attackBonus: 40,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '地品混元功法，五行兼修，可自如运转各系神通。',
    permanentPassive: '全抗+3%',
    skillIds: ['hunyuan_1', 'hunyuan_2', 'hunyuan_3', 'hunyuan_4', 'hunyuan_5'],
  },
  {
    id: 'gongfa_jiutian',
    name: '九天雷动真经',
    quality: '地品',
    element: '金',
    elements: ['金', '火'],
    maxLevel: 10,
    expMultiplier: 2.2,
    attackBonus: 120,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0.3,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '地品雷法功法，金火交融，雷系伤害毁天灭地。',
    permanentPassive: '暴击伤害+10%',
    skillIds: ['jiutian_1', 'jiutian_2', 'jiutian_3', 'jiutian_4', 'jiutian_5'],
  },
  {
    id: 'gongfa_wuxingtian',
    name: '五行天衍诀',
    quality: '天品',
    element: '五行',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 3,
    attackBonus: 80,
    defenseBonus: 60,
    hpBonus: 300,
    mpBonus: 200,
    speedBonus: 15,
    critRateBonus: 0.02,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '天品五行功法，天衍五运，归元升仙品前必修。',
    permanentPassive: '全抗+4%',
    skillIds: [],
  },
  {
    id: 'gongfa_taixu',
    name: '太虚养神秘录',
    quality: '天品',
    element: '水',
    elements: ['水', '木'],
    maxLevel: 10,
    expMultiplier: 3.2,
    attackBonus: 0,
    defenseBonus: 0,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '天品养神功法，太虚冥冥，显著加快功法修炼速度。',
    permanentPassive: '悟性+10%',
    skillIds: ['taixu_1', 'taixu_2', 'taixu_3', 'taixu_4', 'taixu_5'],
  },
  {
    id: 'gongfa_bumie',
    name: '不灭霸体玄功',
    quality: '天品',
    element: '土',
    elements: ['土', '金'],
    maxLevel: 10,
    expMultiplier: 2.8,
    attackBonus: 0,
    defenseBonus: 200,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 0,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 40,
    description: '天品霸体功法，肉身成圣，低血量时防御力大幅攀升。',
    permanentPassive: '韧性+12',
    skillIds: ['bumie_1', 'bumie_2', 'bumie_3', 'bumie_4', 'bumie_5'],
  },
  {
    id: 'gongfa_xingchen',
    name: '星辰炼神诀',
    quality: '仙品',
    element: '无',
    elements: [],
    maxLevel: 10,
    expMultiplier: 4.5,
    attackBonus: 100,
    defenseBonus: 100,
    hpBonus: 100,
    mpBonus: 100,
    speedBonus: 0,
    critRateBonus: 0.15,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '仙品炼神秘法，引星辉淬炼神魂，每级功法额外获得自由属性。',
    permanentPassive: '自由属性点+10（一次性）',
    skillIds: ['xingchen_1', 'xingchen_2', 'xingchen_3', 'xingchen_4', 'xingchen_5'],
  },
  {
    id: 'gongfa_wuxingxian',
    name: '五行仙寰诀',
    quality: '仙品',
    element: '五行',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 4.2,
    attackBonus: 150,
    defenseBonus: 110,
    hpBonus: 600,
    mpBonus: 400,
    speedBonus: 25,
    critRateBonus: 0.05,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '仙品五行功法，仙寰五气归一，归元破神品之关。',
    permanentPassive: '全抗+6%',
    skillIds: [],
  },
  {
    id: 'gongfa_taigu',
    name: '太古造化诀',
    quality: '神品',
    element: '五行',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 7,
    attackBonus: 500,
    defenseBonus: 300,
    hpBonus: 0,
    mpBonus: 0,
    speedBonus: 80,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '神品造化功法，掌天地轮回，可额外装备更多主动技能。',
    permanentPassive: '技能栏+1（永久）',
    skillIds: ['taigu_1', 'taigu_2', 'taigu_3', 'taigu_4', 'taigu_5'],
  },
  {
    id: 'gongfa_wuxingguiyuan',
    name: '五行归元诀',
    quality: '凡品',
    element: '五行',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 1.3,
    attackBonus: 12,
    defenseBonus: 10,
    hpBonus: 60,
    mpBonus: 40,
    speedBonus: 4,
    critRateBonus: 0.01,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '五行汇总至法，五世相生修炼凡品入门功法圆满后可领悟；受击不受属性克制，圆满且同品阶五行功法圆满后可升品阶。',
    permanentPassive: '五行归元·免疫被克；升品需本功法与同品阶五行功法均圆满',
    isWuxingSummary: true,
    canUpgradeQuality: true,
    skillIds: [
      'wuxingguiyuan_1',
      'wuxingguiyuan_2',
      'wuxingguiyuan_3',
      'wuxingguiyuan_4',
      'wuxingguiyuan_5',
    ],
  },
]

const gongfaTemplateById = new Map(GONGFA_TEMPLATES.map((item) => [item.id, item]))

type GongfaCombatBonusKey =
  | 'attackBonus'
  | 'defenseBonus'
  | 'hpBonus'
  | 'mpBonus'
  | 'speedBonus'
  | 'critRateBonus'
  | 'critDamageBonus'
  | 'penetrationBonus'
  | 'tenacityBonus'

const GONGFA_GROWTH_FIELD_MAP: Record<GongfaCombatBonusKey, keyof GongfaQualityPerLevelGrowth> = {
  attackBonus: 'attack',
  defenseBonus: 'defense',
  hpBonus: 'hp',
  mpBonus: 'mp',
  speedBonus: 'speed',
  critRateBonus: 'critRate',
  critDamageBonus: 'critDamage',
  penetrationBonus: 'penetration',
  tenacityBonus: 'tenacity',
}

/**
 * 取品质增幅区间中值（同品质功法使用稳定成长，避免随机波动）
 */
function pickGrowthMidpoint(range: [number, number]): number {
  return (range[0] + range[1]) / 2
}

/**
 * 按品质与等级计算功法战斗属性与灵气转化率加成
 * 模板数值为 1 级基础；2 级起按品质区间累加，仅对模板中非零基础属性生效
 */
export function calcGongfaBonusesAtLevel(
  template: GongfaTemplate,
  level: number,
  instanceQuality?: Gongfa['quality'],
): Pick<
  Gongfa,
  | 'attackBonus'
  | 'defenseBonus'
  | 'hpBonus'
  | 'mpBonus'
  | 'speedBonus'
  | 'critRateBonus'
  | 'critDamageBonus'
  | 'penetrationBonus'
  | 'tenacityBonus'
  | 'conversionRateBonus'
> {
  const quality = template.isWuxingSummary && instanceQuality
    ? instanceQuality
    : template.quality

  let effectiveTemplate = template
  if (template.isWuxingSummary && instanceQuality) {
    const wuxingBase = getWuxingSummaryBaseStats(instanceQuality)
    effectiveTemplate = {
      ...template,
      quality: instanceQuality,
      attackBonus: wuxingBase.attackBonus,
      defenseBonus: wuxingBase.defenseBonus,
      hpBonus: wuxingBase.hpBonus,
      mpBonus: wuxingBase.mpBonus,
      speedBonus: wuxingBase.speedBonus,
      critRateBonus: wuxingBase.critRateBonus,
      critDamageBonus: 0,
      penetrationBonus: wuxingBase.penetrationBonus,
      tenacityBonus: wuxingBase.tenacityBonus,
      expMultiplier: wuxingBase.expMultiplier,
    }
  }

  const growth = GONGFA_QUALITY_LEVEL_GROWTH[quality]
  const levelUps = Math.max(0, Math.min(level - 1, template.maxLevel - 1))
  const roundStat = (value: number) => Math.round(value * 100) / 100

  const bonuses = {
    attackBonus: effectiveTemplate.attackBonus,
    defenseBonus: effectiveTemplate.defenseBonus,
    hpBonus: effectiveTemplate.hpBonus,
    mpBonus: effectiveTemplate.mpBonus,
    speedBonus: effectiveTemplate.speedBonus,
    critRateBonus: effectiveTemplate.critRateBonus,
    critDamageBonus: effectiveTemplate.critDamageBonus,
    penetrationBonus: effectiveTemplate.penetrationBonus,
    tenacityBonus: effectiveTemplate.tenacityBonus,
    conversionRateBonus: 0,
  }

  for (const [bonusKey, growthKey] of Object.entries(GONGFA_GROWTH_FIELD_MAP) as Array<
    [GongfaCombatBonusKey, keyof GongfaQualityPerLevelGrowth]
  >) {
    const templateStatValue = effectiveTemplate[bonusKey]
    if (templateStatValue > 0) {
      bonuses[bonusKey] = roundStat(
        templateStatValue + levelUps * pickGrowthMidpoint(growth[growthKey] as [number, number]),
      )
    }
  }

  bonuses.conversionRateBonus = Number(
    (levelUps * pickGrowthMidpoint(growth.conversionRate)).toFixed(4),
  )

  return bonuses
}

/**
 * 根据当前等级刷新功法实例的战斗属性与灵气转化率
 */
export function syncGongfaLevelBonuses(gongfa: Gongfa): void {
  const template = getGongfaTemplate(gongfa.id)
  if (!template) return

  Object.assign(gongfa, calcGongfaBonusesAtLevel(template, gongfa.level, gongfa.quality))
  if (template.isWuxingSummary) {
    gongfa.expMultiplier = getWuxingSummaryBaseStats(gongfa.quality).expMultiplier
  }
}

/**
 * 是否为五行汇总功法实例
 */
export function isWuxingSummaryGongfa(gongfa: Pick<Gongfa, 'id'>): boolean {
  const template = getGongfaTemplate(gongfa.id)
  return Boolean(template?.isWuxingSummary)
}

/**
 * 是否为完整五行功法模板（全/五行或五系齐全，不含五行归元诀本身）
 */
export function isFullWuxingGongfaTemplate(
  template: Pick<GongfaTemplate, 'id' | 'element' | 'elements' | 'isWuxingSummary'>,
): boolean {
  if (template.isWuxingSummary || template.id === WUXING_SUMMARY_GONGFA_ID) return false
  if (template.element === '全' || template.element === '五行') return true
  const required: ElementType[] = ['金', '木', '水', '火', '土']
  return required.every((element) => template.elements.includes(element))
}

/**
 * 按 id 获取功法模板
 */
export function getGongfaTemplate(gongfaId: string): GongfaTemplate | undefined {
  return gongfaTemplateById.get(gongfaId)
}

/**
 * 获取指定品阶的完整五行功法模板（升归元诀品阶之前修）
 */
export function getFullWuxingGongfaTemplateByQuality(quality: GongfaQuality): GongfaTemplate | undefined {
  return GONGFA_TEMPLATES.find(
    (template) => template.quality === quality && isFullWuxingGongfaTemplate(template),
  )
}

/**
 * 获取功法模板主五行（取 elements 首项，无则默认土）
 */
export function getGongfaTemplatePrimaryElement(
  template: Pick<GongfaTemplate, 'element' | 'elements'>,
): ElementType {
  if (template.elements.length > 0) return template.elements[0]
  if (template.element === '金' || template.element === '木' || template.element === '水'
    || template.element === '火' || template.element === '土') {
    return template.element
  }
  return '土'
}

/**
 * 获取功法经验计算用的主五行（取 elements 首项，无则默认土）
 */
export function getGongfaPrimaryElement(gongfa: Gongfa): ElementType {
  return getGongfaTemplatePrimaryElement(gongfa)
}

/**
 * 从模板创建功法实例
 */
export function createGongfaFromTemplate(
  templateId: string,
  overrides: Partial<Gongfa> = {},
): Gongfa {
  const template = getGongfaTemplate(templateId)
  if (!template) {
    throw new Error(`未知功法模板：${templateId}`)
  }

  const gongfa: Gongfa = {
    id: template.id,
    name: template.name,
    quality: template.quality,
    element: template.element,
    elements: [...template.elements],
    level: 1,
    maxLevel: template.maxLevel,
    exp: 0,
    expToNext: 100,
    expMultiplier: template.expMultiplier,
    attackBonus: template.attackBonus,
    defenseBonus: template.defenseBonus,
    hpBonus: template.hpBonus,
    mpBonus: template.mpBonus,
    speedBonus: template.speedBonus,
    critRateBonus: template.critRateBonus,
    critDamageBonus: template.critDamageBonus,
    penetrationBonus: template.penetrationBonus,
    tenacityBonus: template.tenacityBonus,
    conversionRateBonus: 0,
    description: template.description,
    permanentPassive: template.permanentPassive,
    skillIds: [...template.skillIds],
    skillProficiency: {},
    ...overrides,
  }

  syncGongfaLevelBonuses(gongfa)
  return gongfa
}

/** 初始赠送功法 */
export function createStarterGongfa(): Gongfa {
  return createGongfaFromTemplate('gongfa_qingmu')
}
