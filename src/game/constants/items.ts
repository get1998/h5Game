import type { ItemDefinition } from '@/game/models/item'

/** 物品品质显示色（供 UI 使用） */
export const ITEM_QUALITY_COLOR: Record<ItemDefinition['quality'], string> = {
  凡品: '#9a9590',
  黄品: '#c9a227',
  玄品: '#4a9ec9',
  地品: '#9b59b6',
  天品: '#e67e22',
  仙品: '#4ac97a',
  神品: '#ff6b6b',
}

/** 物品模板表 */
export const ITEM_DEFINITIONS: ItemDefinition[] = [
  {
    id: 'item_huiqi_dan',
    name: '回气丹',
    description: '恢复少量灵力，历练调息时常用。',
    category: 'consumable',
    quality: '凡品',
    maxStack: 99,
    sellPrice: 25,
    effect: { type: 'restore_mp', percent: 0.3 },
  },
  {
    id: 'item_yuxue_dan',
    name: '愈血丹',
    description: '恢复少量气血，疗伤必备。',
    category: 'consumable',
    quality: '凡品',
    maxStack: 99,
    sellPrice: 25,
    effect: { type: 'restore_hp', percent: 0.3 },
  },
  {
    id: 'item_peiyuan_dan',
    name: '培元丹',
    description: '蕴含精纯灵气，可增进修为。',
    category: 'consumable',
    quality: '黄品',
    maxStack: 50,
    sellPrice: 100,
    effect: { type: 'add_xiuwei', amount: 50 },
  },
  {
    id: 'item_qingling_dan',
    name: '清灵丹',
    description: '化解丹毒，减轻服药后遗症。',
    category: 'consumable',
    quality: '黄品',
    maxStack: 50,
    sellPrice: 80,
    effect: { type: 'reduce_pill_poison', amount: 10 },
  },
  {
    id: 'item_julingcao',
    name: '聚灵草',
    description: '常见灵草，坊市收购用于炼丹。',
    category: 'material',
    quality: '凡品',
    maxStack: 999,
    sellPrice: 15,
  },
  {
    id: 'item_lingshi_suipian',
    name: '灵石碎片',
    description: '破碎的灵石，可熔炼或出售。',
    category: 'material',
    quality: '凡品',
    maxStack: 999,
    sellPrice: 5,
  },
  {
    id: 'item_yaodan_canque',
    name: '妖丹残片',
    description: '妖兽体内凝结的丹核碎片，炼器材料。',
    category: 'material',
    quality: '黄品',
    maxStack: 99,
    sellPrice: 60,
  },
  {
    id: 'item_dongfu_treasure_02',
    name: '清幽灵砂',
    description: '蕴含地脉清气，可助洞府升格为清幽洞府。历练极低概率掉落，坊市偶现寄售。',
    category: 'treasure',
    quality: '黄品',
    maxStack: 10,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_03',
    name: '凝气灵珠',
    description: '凝聚天地灵气而成，可助洞府升格为灵气洞府。',
    category: 'treasure',
    quality: '黄品',
    maxStack: 10,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_04',
    name: '地脉碎晶',
    description: '地脉深处采出的碎晶，可助洞府升格为聚灵洞府。',
    category: 'treasure',
    quality: '玄品',
    maxStack: 10,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_05',
    name: '仙霞石髓',
    description: '仙霞凝成的石髓，可助洞府升格为仙家洞府。',
    category: 'treasure',
    quality: '玄品',
    maxStack: 10,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_06',
    name: '福地符胚',
    description: '上古福地残留的符胚，可开辟福地洞天。',
    category: 'treasure',
    quality: '地品',
    maxStack: 5,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_07',
    name: '灵脉芯核',
    description: '截取自灵脉的芯核，可筑灵脉洞府。',
    category: 'treasure',
    quality: '地品',
    maxStack: 5,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_08',
    name: '九天云泥',
    description: '九天之上坠落的云泥，可铸仙府根基。',
    category: 'treasure',
    quality: '天品',
    maxStack: 5,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_09',
    name: '洞天本源',
    description: '洞天福地的一缕本源，可升格洞天福地。',
    category: 'treasure',
    quality: '天品',
    maxStack: 3,
    sellPrice: 0,
  },
  {
    id: 'item_dongfu_treasure_10',
    name: '混沌仙核',
    description: '混沌中孕育的仙核，可成就无上仙府。',
    category: 'treasure',
    quality: '仙品',
    maxStack: 3,
    sellPrice: 0,
  },
]

const itemMap = new Map(ITEM_DEFINITIONS.map((item) => [item.id, item]))

/**
 * 按 id 获取物品模板
 */
export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return itemMap.get(itemId)
}

/**
 * 获取全部物品模板
 */
export function getAllItemDefinitions(): ItemDefinition[] {
  return ITEM_DEFINITIONS
}
