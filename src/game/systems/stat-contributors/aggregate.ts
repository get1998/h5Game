import {
  createEmptyCombatContribution,
  mergeCombatContributions,
  type CombatStatBreakdown,
  type CombatStatContribution,
} from '@/game/systems/stat-contributors/contribution'
import {
  GONGFA_STAT_CONTRIBUTOR_ID,
  gongfaStatContributor,
} from '@/game/systems/stat-contributors/gongfa-contributor'
import {
  PASSIVE_STAT_CONTRIBUTOR_ID,
  passiveStatContributor,
} from '@/game/systems/stat-contributors/passive-contributor'
import { fabaoStatContributor } from '@/game/systems/stat-contributors/fabao-contributor'
import { titleStatContributor } from '@/game/systems/stat-contributors/title-contributor'
import { achievementStatContributor } from '@/game/systems/stat-contributors/achievement-contributor'
import { reincarnationStatContributor } from '@/game/systems/stat-contributors/reincarnation-contributor'
import type { CombatStats, Player } from '@/game/models/player'
import type {
  StatContributor,
  StatContributorContext,
} from '@/game/systems/stat-contributors/types'

/** 默认战斗属性贡献者链（按注册顺序合并） */
export const DEFAULT_STAT_CONTRIBUTORS: StatContributor[] = [
  gongfaStatContributor,
  passiveStatContributor,
  fabaoStatContributor,
  titleStatContributor,
  achievementStatContributor,
  reincarnationStatContributor,
]

export interface AggregateContributionsResult {
  merged: CombatStatContribution
  byContributor: Record<string, CombatStatContribution>
}

/**
 * 遍历贡献者链，收集并合并战斗属性加成
 */
export function aggregateContributions(
  context: StatContributorContext,
  contributors: StatContributor[] = DEFAULT_STAT_CONTRIBUTORS,
): AggregateContributionsResult {
  const byContributor: Record<string, CombatStatContribution> = {}
  const activeItems: CombatStatContribution[] = []

  for (const contributor of contributors) {
    if (!contributor.isActive(context)) {
      byContributor[contributor.id] = createEmptyCombatContribution()
      continue
    }
    const item = contributor.getCombatContribution(context)
    byContributor[contributor.id] = item
    activeItems.push(item)
  }

  return {
    merged: mergeCombatContributions(...activeItems),
    byContributor,
  }
}

/**
 * 构建属性拆分（境界底 + 各贡献者）
 */
export function buildCombatStatBreakdown(
  player: Player,
  byContributor: Record<string, CombatStatContribution>,
): CombatStatBreakdown {
  const realmBase: CombatStats = { ...player.combat }

  return {
    realm: {
      ...realmBase,
      hp: player.combat.hp,
      mp: player.combat.mp,
    },
    gongfa: byContributor[GONGFA_STAT_CONTRIBUTOR_ID] ?? createEmptyCombatContribution(),
    passive: byContributor[PASSIVE_STAT_CONTRIBUTOR_ID] ?? createEmptyCombatContribution(),
    byContributor,
  }
}
