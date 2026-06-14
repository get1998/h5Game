import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import type { FabaoState } from '@/game/models/fabao'
import type { Gongfa } from '@/game/models/gongfa'
import type { ReincarnationCombatBonus } from '@/game/models/reincarnation'
import type { CombatStats, Player } from '@/game/models/player'
import type { AchievementState } from '@/game/models/achievement'
import type { CombatStatBreakdown, CombatStatContribution } from '@/game/systems/stat-contributors/contribution'

/** 战斗装配（主修功法、功法列表、法器） */
export interface BattleLoadout {
  activeGongfa?: Gongfa
  gongfaList: Gongfa[]
  /** 当前佩戴的称号 id */
  equippedTitleId?: string | null
  /** 法器状态 */
  fabaoState?: FabaoState
}

/** 属性贡献者上下文 */
export interface StatContributorContext {
  player: Player
  loadout: BattleLoadout
  /** 多世轮回累积战斗加成 */
  reincarnationCombat?: ReincarnationCombatBonus | null
  /** 成就状态（升级类成就永久属性加成） */
  achievements?: AchievementState
}

/**
 * 战斗属性贡献者（方案 A 统一管道）
 * 新增法器、宠物、Buff 时实现此接口并注册到 DEFAULT_STAT_CONTRIBUTORS
 */
export interface StatContributor {
  /** 贡献者唯一标识 */
  readonly id: string
  /** 当前是否参与聚合 */
  isActive(context: StatContributorContext): boolean
  /** 返回本贡献者的战斗属性加成 */
  getCombatContribution(context: StatContributorContext): CombatStatContribution
}

/** 有效战斗属性聚合结果 */
export interface EffectiveCombatStats {
  /** 含当前 hp/mp 的有效战斗面板 */
  combat: CombatStats
  /** 战前战斗快照（结算用） */
  snapshot: CombatSnapshot
  /** 属性拆分 */
  breakdown: CombatStatBreakdown
  /** 有效韧性（来自合并贡献） */
  tenacity: number
  /** 有效受击减伤（小数，上限 0.9） */
  damageReduction: number
}
