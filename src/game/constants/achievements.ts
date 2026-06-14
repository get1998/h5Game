import type { CombatStatContribution } from '@/game/systems/stat-contributors/contribution'
import type { RealmStage } from '@/game/types'

/** 成就分类 */
export type AchievementCategory = 'cultivation' | 'battle' | 'gongfa' | 'misc'

/** 成就类型：里程碑（一次性） / 升级（可叠等级） */
export type AchievementKind = 'milestone' | 'upgrade'

/** 成就条件类型 */
export type AchievementConditionType =
  | 'realm_min'
  | 'battle_wins'
  | 'gongfa_count'
  | 'gongfa_max_level'
  | 'breakthroughs'
  | 'flee_failures'
  | 'manual'

/** 成就定义 */
export interface AchievementDefinition {
  id: string
  name: string
  description: string
  category: AchievementCategory
  /** 默认 milestone */
  kind?: AchievementKind
  conditionType: AchievementConditionType
  /** realm_min 时为最低境界；里程碑类为数量阈值 */
  conditionValue: number | RealmStage
  /** 解锁后自动获得的称号 id */
  rewardTitleId?: string
  /** 未解锁时隐藏名称与描述 */
  hidden?: boolean
  /** upgrade 类型：每级所需累计进度 */
  progressPerLevel?: number
  /** upgrade 类型：等级上限 */
  maxLevel?: number
  /** upgrade 类型：每级战斗属性加成（永久生效，无需佩戴） */
  combatBonusPerLevel?: Partial<CombatStatContribution>
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
  {
    id: 'ach_flee_failure_master',
    name: '逃跑失败达人',
    description: '历练中尝试撤离却被缠住。每失败 1 次升 1 级，每级永久速度 +5%（最高 20 级）。',
    category: 'battle',
    kind: 'upgrade',
    conditionType: 'flee_failures',
    conditionValue: 1,
    progressPerLevel: 1,
    maxLevel: 20,
    combatBonusPerLevel: { speedPercent: 0.05 },
  },
]

/** 是否为升级类成就 */
export function isUpgradeAchievement(definition: AchievementDefinition): boolean {
  return definition.kind === 'upgrade'
}

/**
 * 根据累计进度计算升级类成就当前等级
 */
export function calcUpgradeAchievementLevel(
  definition: AchievementDefinition,
  progress: number,
): number {
  if (!isUpgradeAchievement(definition)) return 0
  const perLevel = definition.progressPerLevel ?? 1
  const maxLevel = definition.maxLevel ?? 99
  return Math.min(maxLevel, Math.floor(progress / perLevel))
}

const achievementMap = new Map(
  ACHIEVEMENT_DEFINITIONS.map((item) => [item.id, item]),
)

/** 按 id 获取成就定义 */
export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return achievementMap.get(id)
}
