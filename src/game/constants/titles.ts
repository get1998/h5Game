import type { CombatStatContribution } from '@/game/systems/stat-contributors/contribution'

/** 称号稀有度 */
export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary'

/** 称号定义 */
export interface TitleDefinition {
  id: string
  name: string
  description: string
  rarity: TitleRarity
  /** 战斗属性加成（佩戴时生效） */
  combatBonus?: Partial<CombatStatContribution>
}

export const TITLE_RARITY_LABEL: Record<TitleRarity, string> = {
  common: '凡品',
  rare: '灵品',
  epic: '宝品',
  legendary: '仙品',
}

/** 称号配置表 */
export const TITLE_DEFINITIONS: TitleDefinition[] = [
  {
    id: 'title_novice',
    name: '初入仙门',
    description: '刚刚踏入修仙之路的新人。',
    rarity: 'common',
  },
  {
    id: 'title_qi_cultivator',
    name: '炼气修士',
    description: '炼气有成，初窥门径。',
    rarity: 'common',
    combatBonus: { attackPercent: 0.02 },
  },
  {
    id: 'title_qi_master',
    name: '炼气圆满',
    description: '炼气境大成，根基稳固。',
    rarity: 'rare',
    combatBonus: { attackPercent: 0.05 },
  },
  {
    id: 'title_zhuji',
    name: '筑基真人',
    description: '筑基成功，已非凡俗可比。',
    rarity: 'rare',
    combatBonus: { defensePercent: 0.03, maxHpPercent: 0.02 },
  },
  {
    id: 'title_jindan',
    name: '金丹真人',
    description: '凝丹成功，寿元大增。',
    rarity: 'epic',
    combatBonus: { attackPercent: 0.05, maxHpPercent: 0.05 },
  },
  {
    id: 'title_warrior',
    name: '杀伐之士',
    description: '初历杀伐，锋芒渐露。',
    rarity: 'common',
    combatBonus: { critRate: 0.02 },
  },
  {
    id: 'title_veteran',
    name: '百战修士',
    description: '历经百战，杀意凛然。',
    rarity: 'epic',
    combatBonus: { attackPercent: 0.05, critRate: 0.03 },
  },
  {
    id: 'title_collector',
    name: '博古通今',
    description: '博览功法，学识渊博。',
    rarity: 'rare',
    combatBonus: { speedPercent: 0.03 },
  },
  {
    id: 'title_perfectionist',
    name: '炉火纯青',
    description: '功法修炼至圆满境界。',
    rarity: 'legendary',
    combatBonus: { critDamage: 0.1, attackPercent: 0.03 },
  },
]

const titleMap = new Map(TITLE_DEFINITIONS.map((item) => [item.id, item]))

/** 按 id 获取称号定义 */
export function getTitleDefinition(id: string): TitleDefinition | undefined {
  return titleMap.get(id)
}
