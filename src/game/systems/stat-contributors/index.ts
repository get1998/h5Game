export {
  createEmptyCombatContribution,
  mergeCombatContributions,
  applyCombatContributions,
  type CombatStatContribution,
  type CombatStatBreakdown,
} from '@/game/systems/stat-contributors/contribution'

export {
  aggregateContributions,
  buildCombatStatBreakdown,
  DEFAULT_STAT_CONTRIBUTORS,
  type AggregateContributionsResult,
} from '@/game/systems/stat-contributors/aggregate'

export {
  GONGFA_STAT_CONTRIBUTOR_ID,
  gongfaStatContributor,
  getGongfaCombatContribution,
} from '@/game/systems/stat-contributors/gongfa-contributor'

export {
  PASSIVE_STAT_CONTRIBUTOR_ID,
  passiveStatContributor,
  aggregatePermanentPassiveContributions,
  aggregateSkillMasteryPassiveContributions,
  extractPassiveSkillContribution,
  getUnlockedPassiveSkills,
} from '@/game/systems/stat-contributors/passive-contributor'

export {
  TITLE_STAT_CONTRIBUTOR_ID,
  titleStatContributor,
  getTitleCombatContribution,
} from '@/game/systems/stat-contributors/title-contributor'

export {
  ACHIEVEMENT_STAT_CONTRIBUTOR_ID,
  achievementStatContributor,
  getAchievementCombatContribution,
} from '@/game/systems/stat-contributors/achievement-contributor'

export {
  REINCARNATION_STAT_CONTRIBUTOR_ID,
  reincarnationStatContributor,
} from '@/game/systems/stat-contributors/reincarnation-contributor'

export {
  FABAO_STAT_CONTRIBUTOR_ID,
  fabaoStatContributor,
} from '@/game/systems/stat-contributors/fabao-contributor'

export {
  buildEffectiveCombatStats,
  buildCombatSnapshot,
} from '@/game/systems/stat-contributors/build-effective-stats'

export type {
  BattleLoadout,
  EffectiveCombatStats,
  StatContributor,
  StatContributorContext,
} from '@/game/systems/stat-contributors/types'

export { isPermanentPassiveSkill } from '@/game/models/skill'
