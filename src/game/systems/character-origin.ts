import { ELEMENT_GENERATES } from '@/game/constants/elements'
import { ELEMENT_COLORS } from '@/game/systems/spirit-root'
import {
  getGongfaTemplate,
  GONGFA_TEMPLATES,
  type GongfaTemplate,
} from '@/game/models/gongfa'
import type { ElementType, GongfaQuality, SpiritRootType } from '@/game/types'

/** 五行对应凡品入门功法 */
export const ELEMENT_STARTER_GONGFA: Record<ElementType, string> = {
  金: 'gongfa_ruijin',
  木: 'gongfa_qingmu',
  水: 'gongfa_runquan',
  火: 'gongfa_chiyan',
  土: 'gongfa_jiantu',
}

/** 角色经历生成入参 */
export interface CharacterOriginInput {
  name: string
  spiritRootType: SpiritRootType
  spiritRootElements: ElementType[]
}

/** 可选入门功法展示项（模板预计算） */
export interface GongfaChoiceDisplay {
  templateId: string
  name: string
  quality: GongfaQuality
  element: string
  description: string
  permanentPassive: string
  qualityClass: string
  elementTagStyle: string
  adaptHint: string
  recommended: boolean
}

/** 角色经历生成结果 */
export interface CharacterOriginResult {
  originTitle: string
  originSummary: string
  gongfaOptions: GongfaChoiceDisplay[]
}

interface OriginBackground {
  id: string
  title: string
  buildSummary: (
    name: string,
    spiritRootType: SpiritRootType,
    elements: ElementType[],
  ) => string
}

const ALL_ELEMENTS: ElementType[] = ['金', '木', '水', '火', '土']

/** 经历背景模板 */
const ORIGIN_BACKGROUNDS: OriginBackground[] = [
  {
    id: 'hunter',
    title: '山村猎户',
    buildSummary: (name, type, elements) =>
      `${name} 出身偏远山村，自幼随父上山猎兽，筋骨强健。十六岁那日，${describeSpiritRootEvent(type, elements)}，被过路散修指点，遂决意踏入仙途。`,
  },
  {
    id: 'scholar',
    title: '书香门第',
    buildSummary: (name, type, elements) =>
      `${name} 生于小镇书斋之家，少时通读杂记孤本，心向长生。某夜观星悟气，${describeSpiritRootEvent(type, elements)}，方知自身并非凡俗之辈。`,
  },
  {
    id: 'herbalist',
    title: '药铺学徒',
    buildSummary: (name, type, elements) =>
      `${name} 少年时在药铺帮工，识得百草性味。一次误服灵草后大病七日，${describeSpiritRootEvent(type, elements)}，自此感气于经脉之间。`,
  },
  {
    id: 'wanderer',
    title: '江湖散人',
    buildSummary: (name, type, elements) =>
      `${name} 少年离家，行走州郡，见过修士斗法、见过妖兽伤人。于荒庙夜雨中${describeSpiritRootEvent(type, elements)}，方觉仙缘已至。`,
  },
  {
    id: 'disciple',
    title: '外门弟子',
    buildSummary: (name, type, elements) =>
      `${name} 曾被仙门收为外门弟子，却因资质不显而久居杂役。宗门灵根测定之日，${describeSpiritRootEvent(type, elements)}，终于迎来转机。`,
  },
  {
    id: 'fisher',
    title: '江畔渔家',
    buildSummary: (name, type, elements) =>
      `${name} 生长于江畔渔家，每日与风浪为伴。某次网得一块灵石，触之即${describeSpiritRootEvent(type, elements)}，从此不再满足于凡尘生计。`,
  },
  {
    id: 'blacksmith',
    title: '铁匠之子',
    buildSummary: (name, type, elements) =>
      `${name} 承继家传锻打手艺，臂力过人。锤击千年铁胚时，${describeSpiritRootEvent(type, elements)}，铁火与灵息交织，遂起修仙之志。`,
  },
  {
    id: 'temple',
    title: '庙观杂役',
    buildSummary: (name, type, elements) =>
      `${name} 自幼在庙观做杂役，扫叶焚香。一日随道长诵经，${describeSpiritRootEvent(type, elements)}，始觉天地灵气并非虚无缥缈。`,
  },
]

/**
 * 获取功法品质展示样式类
 */
function getQualityClass(quality: GongfaQuality): string {
  switch (quality) {
    case '凡品':
      return 'origin-gongfa__quality--common'
    case '黄品':
      return 'origin-gongfa__quality--rare'
    case '玄品':
      return 'origin-gongfa__quality--epic'
    default:
      return 'origin-gongfa__quality--legendary'
  }
}

/**
 * 描述灵根觉醒事件文案
 */
function describeSpiritRootEvent(
  type: SpiritRootType,
  elements: ElementType[],
): string {
  const elementText = elements.join('、')
  switch (type) {
    case '单灵根':
      return `体内纯${elementText}灵气喷涌而出，灵根显化`
    case '双灵根':
      return `${elementText}二气交缠，双灵根初成`
    default:
      return `${elementText}诸气混杂而聚，杂灵根终被测定`
  }
}

/**
 * 构建功法与灵根适配提示
 */
function buildAdaptHint(
  spiritRootElements: ElementType[],
  template: GongfaTemplate,
): { hint: string; recommended: boolean } {
  const primaryElement = template.elements[0]
  if (!primaryElement) {
    return { hint: '可修炼', recommended: false }
  }

  if (spiritRootElements.includes(primaryElement)) {
    return { hint: `${primaryElement}灵根契合，修炼顺畅`, recommended: true }
  }

  const generatesMatch = spiritRootElements.some(
    (el) => ELEMENT_GENERATES[el] === primaryElement
      || ELEMENT_GENERATES[primaryElement] === el,
  )
  if (generatesMatch) {
    return { hint: '五行相生，尚可入门', recommended: false }
  }

  return { hint: '与灵根略有隔阂，需勤修弥补', recommended: false }
}

/**
 * 从模板构建功法选项展示项
 */
function buildGongfaChoiceDisplay(
  templateId: string,
  spiritRootElements: ElementType[],
): GongfaChoiceDisplay | null {
  const template = getGongfaTemplate(templateId)
  if (!template) return null

  const primaryElement = template.elements[0]
  const elementColor = primaryElement ? ELEMENT_COLORS[primaryElement] : '#9a9590'
  const { hint, recommended } = buildAdaptHint(spiritRootElements, template)

  return {
    templateId: template.id,
    name: template.name,
    quality: template.quality,
    element: template.element,
    description: template.description,
    permanentPassive: template.permanentPassive,
    qualityClass: getQualityClass(template.quality),
    elementTagStyle: `color: ${elementColor}; border-color: ${elementColor};`,
    adaptHint: hint,
    recommended,
  }
}

/**
 * 按灵根属性生成可选入门功法（最多 3 个，优先同属性）
 */
export function generateStarterGongfaOptions(
  spiritRootElements: ElementType[],
): GongfaChoiceDisplay[] {
  const templateIds: string[] = []
  const seen = new Set<string>()

  function pushTemplateId(id: string) {
    if (seen.has(id)) return
    seen.add(id)
    templateIds.push(id)
  }

  for (const element of spiritRootElements) {
    pushTemplateId(ELEMENT_STARTER_GONGFA[element])
  }

  if (spiritRootElements.length > 0) {
    const generated = ELEMENT_GENERATES[spiritRootElements[0]]
    pushTemplateId(ELEMENT_STARTER_GONGFA[generated])
  }

  for (const element of ALL_ELEMENTS) {
    if (templateIds.length >= 3) break
    pushTemplateId(ELEMENT_STARTER_GONGFA[element])
  }

  return templateIds
    .slice(0, 3)
    .map((id) => buildGongfaChoiceDisplay(id, spiritRootElements))
    .filter((item): item is GongfaChoiceDisplay => item !== null)
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))
}

/**
 * 随机生成角色经历与对应功法选项
 */
export function generateCharacterOrigin(input: CharacterOriginInput): CharacterOriginResult {
  const background = ORIGIN_BACKGROUNDS[
    Math.floor(Math.random() * ORIGIN_BACKGROUNDS.length)
  ]

  return {
    originTitle: background.title,
    originSummary: background.buildSummary(
      input.name,
      input.spiritRootType,
      input.spiritRootElements,
    ),
    gongfaOptions: generateStarterGongfaOptions(input.spiritRootElements),
  }
}

/**
 * 为功法选项附加选中态样式类
 */
export function withGongfaChoiceSelection(
  options: GongfaChoiceDisplay[],
  selectedTemplateId: string,
): Array<GongfaChoiceDisplay & { cardClass: string }> {
  return options.map((option) => ({
    ...option,
    cardClass: option.templateId === selectedTemplateId
      ? 'origin-gongfa game-card origin-gongfa--selected'
      : 'origin-gongfa game-card',
  }))
}

/** 凡品入门功法模板列表（供测试或外部引用） */
export const STARTER_GONGFA_TEMPLATES = GONGFA_TEMPLATES.filter(
  (item) => item.quality === '凡品' && item.elements.length === 1,
)
