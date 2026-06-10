import type { RealmStage } from '@/game/types'

/** 成就分类 */
export type AchievementCategory = 'cultivation' | 'battle' | 'gongfa' | 'misc'

/** 成就条件类型 */
export type AchievementConditionType =
  | 'realm_min'
  | 'battle_wins'
  | 'gongfa_count'
  | 'gongfa_max_level'
  | 'breakthroughs'
  | 'manual'

/** 成就定义 */
export interface AchievementDefinition {
  id: string
  name: string
  description: string
  category: AchievementCategory
  conditionType: AchievementConditionType
  /** realm_min 时为最低境界；其余为数量阈值 */
  conditionValue: number | RealmStage
  /** 解锁后自动获得的称号 id */
  rewardTitleId?: string
  /** 未解锁时隐藏名称与描述 */
  hidden?: boolean
}

export const ACHIEVEMENT_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  cultivation: '修炼',
  battle: '历练',
  gongfa: '功法',
  misc: '杂项',
}

/** 成就配置表 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'ach_first_step',
    name: '踏入仙途',
    description: '完成灵根测定，踏上修仙之路。',
    category: 'misc',
    conditionType: 'manual',
    conditionValue: 1,
    rewardTitleId: 'title_novice',
  },
  {
    id: 'ach_qi_5',
    name: '炼气五层',
    description: '突破至炼气五层。',
    category: 'cultivation',
    conditionType: 'realm_min',
    conditionValue: '炼气五层',
    rewardTitleId: 'title_qi_cultivator',
  },
  {
    id: 'ach_qi_10',
    name: '炼气大成',
    description: '突破至炼气十层。',
    category: 'cultivation',
    conditionType: 'realm_min',
    conditionValue: '炼气十层',
    rewardTitleId: 'title_qi_master',
  },
  {
    id: 'ach_zhuji',
    name: '筑基有成',
    description: '突破至筑基前期，正式踏入筑基境。',
    category: 'cultivation',
    conditionType: 'realm_min',
    conditionValue: '筑基前期',
    rewardTitleId: 'title_zhuji',
  },
  {
    id: 'ach_jindan',
    name: '金丹初成',
    description: '突破至金丹前期。',
    category: 'cultivation',
    conditionType: 'realm_min',
    conditionValue: '金丹前期',
    rewardTitleId: 'title_jindan',
    hidden: true,
  },
  {
    id: 'ach_first_battle',
    name: '初涉杀伐',
    description: '历练中首次战胜妖兽。',
    category: 'battle',
    conditionType: 'battle_wins',
    conditionValue: 1,
    rewardTitleId: 'title_warrior',
  },
  {
    id: 'ach_battle_10',
    name: '十战十捷',
    description: '累计战胜 10 只妖兽。',
    category: 'battle',
    conditionType: 'battle_wins',
    conditionValue: 10,
  },
  {
    id: 'ach_battle_50',
    name: '百战不殆',
    description: '累计战胜 50 只妖兽。',
    category: 'battle',
    conditionType: 'battle_wins',
    conditionValue: 50,
    rewardTitleId: 'title_veteran',
  },
  {
    id: 'ach_gongfa_2',
    name: '博采众长',
    description: '领悟 2 门功法。',
    category: 'gongfa',
    conditionType: 'gongfa_count',
    conditionValue: 2,
  },
  {
    id: 'ach_gongfa_5',
    name: '万法归一',
    description: '领悟 5 门功法。',
    category: 'gongfa',
    conditionType: 'gongfa_count',
    conditionValue: 5,
    rewardTitleId: 'title_collector',
  },
  {
    id: 'ach_gongfa_max',
    name: '功法圆满',
    description: '任意一门功法修炼至满级。',
    category: 'gongfa',
    conditionType: 'gongfa_max_level',
    conditionValue: 1,
    rewardTitleId: 'title_perfectionist',
  },
  {
    id: 'ach_breakthrough_5',
    name: '步步精进',
    description: '累计突破 5 次境界。',
    category: 'cultivation',
    conditionType: 'breakthroughs',
    conditionValue: 5,
  },
]

const achievementMap = new Map(
  ACHIEVEMENT_DEFINITIONS.map((item) => [item.id, item]),
)

/** 按 id 获取成就定义 */
export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return achievementMap.get(id)
}
