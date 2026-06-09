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
  /** 功法描述文案 */
  description: string
  /** 圆满后永久被动描述 */
  permanentPassive: string
  /** 关联技能 id 列表（按解锁等级排序） */
  skillIds: string[]
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
    quality: '仙品',
    element: '五行',
    elements: ['金', '木', '水', '火', '土'],
    maxLevel: 10,
    expMultiplier: 4,
    attackBonus: 200,
    defenseBonus: 150,
    hpBonus: 1000,
    mpBonus: 600,
    speedBonus: 50,
    critRateBonus: 0,
    critDamageBonus: 0,
    penetrationBonus: 0,
    tenacityBonus: 0,
    description: '仙品五行至法，需五行灵根，相生循环，攻防一体。',
    permanentPassive: '五行相生循环+0.3，全属性抗性+5%',
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

/**
 * 按 id 获取功法模板
 */
export function getGongfaTemplate(gongfaId: string): GongfaTemplate | undefined {
  return gongfaTemplateById.get(gongfaId)
}

/**
 * 获取功法经验计算用的主五行（取 elements 首项，无则默认土）
 */
export function getGongfaPrimaryElement(gongfa: Gongfa): ElementType {
  if (gongfa.elements.length > 0) return gongfa.elements[0]
  if (gongfa.element === '金' || gongfa.element === '木' || gongfa.element === '水'
    || gongfa.element === '火' || gongfa.element === '土') {
    return gongfa.element
  }
  return '土'
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

  return {
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
    description: template.description,
    permanentPassive: template.permanentPassive,
    skillIds: [...template.skillIds],
    ...overrides,
  }
}

/** 初始赠送功法 */
export function createStarterGongfa(): Gongfa {
  return createGongfaFromTemplate('gongfa_qingmu')
}
