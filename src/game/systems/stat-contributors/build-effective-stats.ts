import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import { getGongfaPrimaryElement, isWuxingSummaryGongfa, type Gongfa } from '@/game/models/gongfa'
import type { AchievementState } from '@/game/models/achievement'
import type { ReincarnationCombatBonus } from '@/game/models/reincarnation'
import type { CombatStats, Player } from '@/game/models/player'
import type { ElementType } from '@/game/types'
import {
  aggregateContributions,
  buildCombatStatBreakdown,
} from '@/game/systems/stat-contributors/aggregate'
import { applyCombatContributions } from '@/game/systems/stat-contributors/contribution'
import type {
  BattleLoadout,
  EffectiveCombatStats,
  StatContributor,
  StatContributorContext,
} from '@/game/systems/stat-contributors/types'

function buildSnapshotFromCombat(
  combat: CombatStats,
  primaryAttackElement: ElementType,
  tenacity: number,
  damageReduction: number,
  immuneToElementCounter: boolean,
): CombatSnapshot {
  return {
    attack: combat.attack,
    defense: combat.defense,
    speed: combat.speed,
    critRate: combat.critRate,
    critDamage: combat.critDamage,
    hitRate: combat.hitRate,
    penetration: combat.penetration,
    tenacity,
    damageReduction,
    defenseElement: primaryAttackElement,
    primaryAttackElement,
    immuneToElementCounter,
  }
}

function resolvePrimaryAttackElement(
  player: Player,
  loadout: BattleLoadout,
): ElementType {
  if (loadout.activeGongfa) {
    return getGongfaPrimaryElement(loadout.activeGongfa)
  }
  return player.spiritRootElements[0] ?? '土'
}

/**
 * 聚合境界基础 + 全部注册贡献者 → 有效战斗属性
 */
export function buildEffectiveCombatStats(
  player: Player,
  loadout: BattleLoadout,
  contributors?: StatContributor[],
  reincarnationCombat?: ReincarnationCombatBonus | null,
  achievements?: AchievementState,
): EffectiveCombatStats {
  const context: StatContributorContext = {
    player,
    loadout,
    reincarnationCombat,
    achievements,
  }
  const realmBase: CombatStats = { ...player.combat }
  const { merged, byContributor } = aggregateContributions(context, contributors)
  const combat = applyCombatContributions(realmBase, merged)

  const primaryAttackElement = resolvePrimaryAttackElement(player, loadout)
  const immuneToElementCounter = loadout.activeGongfa
    ? isWuxingSummaryGongfa(loadout.activeGongfa)
    : false
  const tenacity = Math.max(0, merged.tenacity)
  const damageReduction = Math.min(0.9, Math.max(0, merged.damageReduction))

  return {
    combat,
    snapshot: buildSnapshotFromCombat(
      combat,
      primaryAttackElement,
      tenacity,
      damageReduction,
      immuneToElementCounter,
    ),
    breakdown: buildCombatStatBreakdown(player, byContributor),
    tenacity,
    damageReduction,
  }
}

/**
 * 根据玩家装配构建战斗快照（兼容旧调用）
 */
export function buildCombatSnapshot(
  player: Player,
  gongfa: Gongfa,
  gongfaList: Gongfa[] = [gongfa],
  contributors?: StatContributor[],
): CombatSnapshot {
  return buildEffectiveCombatStats(
    player,
    { activeGongfa: gongfa, gongfaList },
    contributors,
  ).snapshot
}
