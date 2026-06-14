import { buildZhenfaSetupLingshiCost } from '@/game/constants/zhenfa'
import type { FabaoTier, FabaoType } from '@/game/models/fabao'
import type { ElementType } from '@/game/types'

/** 法器技能攻击（释放时消耗灵力） */
export interface FabaoSkillAttack {
  /** 技能名称 */
  name: string
  /** 伤害倍率（相对攻击力） */
  damageMultiplier: number
  /** 每次释放消耗灵力 */
  lingqiCost: number
  /** 技能五行（可选） */
  element?: ElementType
}

/** 法器品阶显示色 */
export const FABAO_TIER_COLOR: Record<FabaoTier, string> = {
  下品: '#9a9590',
  中品: '#c9a227',
  上品: '#4a9ec9',
}

/** 法器模板定义 */
export interface FabaoTemplate {
  /** 模板 id */
  id: string
  /** 显示名称 */
  name: string
  /** 品阶 */
  tier: FabaoTier
  /** 类型 */
  type: FabaoType
  /** 描述 */
  description: string
  /** 灵力上限 */
  maxLingqi: number
  /** 被动攻击加成（装备即生效，不消耗灵力） */
  attack?: number
  /** 被动防御加成（装备即生效，不消耗灵力） */
  defense?: number
  /** 技能攻击（释放时消耗灵力） */
  skillAttack?: FabaoSkillAttack
  /** 参悟图纸物品 id */
  blueprintItemId: string
  /** 炼制五行灵石（每属性） */
  craftLingshiPerElement: number
  /** 炼制材料 */
  craftMaterials: { itemId: string; count: number }[]
  /** 最低洞府等级 */
  minDongfuLevel: number
}

const FABAO_TEMPLATE_LIST: FabaoTemplate[] = [
  {
    id: 'fabao_attack_lower',
    name: '玄铁短刃',
    tier: '下品',
    type: '攻击',
    description: '以玄铁锻造的短刃，被动增幅攻击，可施放玄铁斩。',
    maxLingqi: 80,
    attack: 12,
    skillAttack: { name: '玄铁斩', damageMultiplier: 1.3, lingqiCost: 2 },
    blueprintItemId: 'item_fabao_blueprint_attack_lower',
    craftLingshiPerElement: 15,
    craftMaterials: [
      { itemId: 'item_yaodan_canque', count: 2 },
      { itemId: 'item_fabao_material_lingwen', count: 5 },
    ],
    minDongfuLevel: 1,
  },
  {
    id: 'fabao_attack_mid',
    name: '赤焰飞剑',
    tier: '中品',
    type: '攻击',
    description: '蕴含赤焰之力的飞剑，被动提升攻击，可施放赤焰剑气。',
    maxLingqi: 150,
    attack: 28,
    skillAttack: { name: '赤焰剑气', damageMultiplier: 1.6, lingqiCost: 4, element: '火' },
    blueprintItemId: 'item_fabao_blueprint_attack_mid',
    craftLingshiPerElement: 40,
    craftMaterials: [
      { itemId: 'item_yaodan_canque', count: 5 },
      { itemId: 'item_fabao_material_lingwen', count: 12 },
      { itemId: 'item_fabao_material_chiyan', count: 2 },
    ],
    minDongfuLevel: 3,
  },
  {
    id: 'fabao_attack_high',
    name: '紫霄神雷珠',
    tier: '上品',
    type: '攻击',
    description: '凝紫霄神雷而成的宝珠，被动大幅提升攻击，可施放神雷轰击。',
    maxLingqi: 250,
    attack: 50,
    skillAttack: { name: '神雷轰击', damageMultiplier: 2.2, lingqiCost: 6, element: '雷' },
    blueprintItemId: 'item_fabao_blueprint_attack_high',
    craftLingshiPerElement: 100,
    craftMaterials: [
      { itemId: 'item_yaodan_canque', count: 10 },
      { itemId: 'item_fabao_material_lingwen', count: 25 },
      { itemId: 'item_fabao_material_zixiao', count: 3 },
    ],
    minDongfuLevel: 6,
  },
  {
    id: 'fabao_defense_lower',
    name: '青玉护符',
    tier: '下品',
    type: '防御',
    description: '青玉雕琢的护符，被动提升防御，受击时可发动青玉盾反。',
    maxLingqi: 80,
    defense: 10,
    skillAttack: { name: '青玉盾反', damageMultiplier: 0.9, lingqiCost: 2 },
    blueprintItemId: 'item_fabao_blueprint_defense_lower',
    craftLingshiPerElement: 15,
    craftMaterials: [
      { itemId: 'item_yaodan_canque', count: 2 },
      { itemId: 'item_fabao_material_lingwen', count: 5 },
    ],
    minDongfuLevel: 1,
  },
  {
    id: 'fabao_defense_mid',
    name: '玄武甲片',
    tier: '中品',
    type: '防御',
    description: '仿玄武鳞甲炼制的甲片，被动提升防御，受击时可发动玄武反击。',
    maxLingqi: 150,
    defense: 22,
    skillAttack: { name: '玄武反击', damageMultiplier: 1.2, lingqiCost: 4 },
    blueprintItemId: 'item_fabao_blueprint_defense_mid',
    craftLingshiPerElement: 40,
    craftMaterials: [
      { itemId: 'item_yaodan_canque', count: 5 },
      { itemId: 'item_fabao_material_lingwen', count: 12 },
      { itemId: 'item_fabao_material_xuanwu', count: 2 },
    ],
    minDongfuLevel: 3,
  },
  {
    id: 'fabao_defense_high',
    name: '太虚灵盾',
    tier: '上品',
    type: '防御',
    description: '以太虚之气凝成的灵盾，被动大幅提升防御，受击时可发动太虚反弹。',
    maxLingqi: 250,
    defense: 40,
    skillAttack: { name: '太虚反弹', damageMultiplier: 1.5, lingqiCost: 6 },
    blueprintItemId: 'item_fabao_blueprint_defense_high',
    craftLingshiPerElement: 100,
    craftMaterials: [
      { itemId: 'item_yaodan_canque', count: 10 },
      { itemId: 'item_fabao_material_lingwen', count: 25 },
      { itemId: 'item_fabao_material_taixu', count: 3 },
    ],
    minDongfuLevel: 6,
  },
]

const fabaoTemplateMap = new Map(FABAO_TEMPLATE_LIST.map((t) => [t.id, t]))
const blueprintToTemplateMap = new Map(
  FABAO_TEMPLATE_LIST.map((t) => [t.blueprintItemId, t]),
)

/**
 * 获取全部法器模板
 */
export function getAllFabaoTemplates(): FabaoTemplate[] {
  return FABAO_TEMPLATE_LIST
}

/**
 * 按模板 id 获取法器模板
 */
export function getFabaoTemplate(templateId: string): FabaoTemplate | undefined {
  return fabaoTemplateMap.get(templateId)
}

/**
 * 按图纸物品 id 获取法器模板
 */
export function getFabaoTemplateByBlueprint(blueprintItemId: string): FabaoTemplate | undefined {
  return blueprintToTemplateMap.get(blueprintItemId)
}

/**
 * 格式化炼制灵石消耗文案
 */
export function formatFabaoCraftLingshiCost(perElement: number): string {
  const cost = buildZhenfaSetupLingshiCost(perElement)
  const total = Object.values(cost).reduce((sum, n) => sum + n, 0)
  return `五行灵石各 ${perElement}（共 ${total}）`
}

/**
 * 格式化炼制材料文案
 */
export function formatFabaoCraftMaterials(template: FabaoTemplate): string {
  return template.craftMaterials
    .map((m) => `${m.itemId.replace('item_', '')}×${m.count}`)
    .join('、')
}
