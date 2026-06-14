import { calcExpToNextLevel } from '@/game/formulas/gongfa-exp'
import { createStarterGongfa, syncGongfaLevelBonuses, type Gongfa } from '@/game/models/gongfa'
import { createDefaultDongfu, normalizeDongfu, type Dongfu } from '@/game/models/dongfu'
import {
  createDefaultMonsterTierPityState,
  type MonsterTierPityState,
} from '@/game/models/monster'
import {
  applyRealmBaseToPlayer,
  createDefaultPlayer,
  resyncPlayerCultivationStats,
  resyncPlayerRealmStats,
  type Player,
} from '@/game/models/player'
import { Reincarnation } from '@/game/models/reincarnation'
import { normalizeRealm } from '@/game/constants/realm'
import {
  createDefaultReincarnationState,
  type ReincarnationState,
} from '@/game/models/reincarnation'
import {
  createDefaultAchievementState,
  type AchievementState,
} from '@/game/models/achievement'
import { createDefaultTitleState, type TitleState } from '@/game/models/title'
import {
  createDefaultInventory,
  normalizeInventory,
  type InventoryState,
} from '@/game/models/item'
import { createDefaultMarketState, normalizeMarketState, type MarketState } from '@/game/models/market'
import {
  type PlayerSkillState,
} from '@/game/models/player-skill'
import {
  createDefaultFabaoState,
  normalizeFabaoState,
  type FabaoState,
} from '@/game/models/fabao'
import {
  migratePlayerSkillStateFromGongfaList,
  normalizePlayerSkillState,
  syncLearnedSkillsFromGongfaList,
} from '@/game/systems/player-skill-library'
import { createInitialWorldTime, type WorldTime } from '@/game/systems/time'
import type { IdleState } from '@/game/types'

export const SAVE_KEY = 'xiuxian_player_save'

/** 完整游戏存档 */
export interface GameSaveData {
  player: Player
  activeGongfaId: string
  gongfaList: Gongfa[]
  worldTime: WorldTime
  dongfu: Dongfu
  idle: IdleState
  /** 怪物品阶保底计数 */
  monsterTierPity: MonsterTierPityState
  /** 多世轮回状态 */
  reincarnation: ReincarnationState
  /** 成就进度 */
  achievements: AchievementState
  /** 称号状态 */
  titles: TitleState
  /** 背包与灵石 */
  inventory: InventoryState
  /** 坊市稀世寄售 */
  market: MarketState
  /** 玩家技能库（领悟与战斗装配，不随切换功法丢失） */
  playerSkills: PlayerSkillState
  /** 法器系统 */
  fabao: FabaoState
}

/** 创建默认闭关状态 */
export function createDefaultIdleState(): IdleState {
  return {
    isRunning: false,
    mode: 'xiuwei',
    lastTickAt: Date.now(),
    accumulatedSeconds: 0,
    xiuweiRemainder: 0,
    gongfaExpRemainder: 0,
  }
}

/** 读档后按主修功法重算境界战斗基础（保留气血/灵力比例） */
function resyncPlayerCombatOnLoad(
  player: Player,
  gongfa: Gongfa | undefined,
  reincarnation: ReincarnationState,
): void {
  resyncPlayerRealmStats(player, {
    gongfa,
    resetCombat: true,
    preserveResourceRatio: true,
  })
  Reincarnation.fromState(reincarnation).applyToPlayer(player)
}

/** 创建默认存档 */
export function createDefaultGameSave(): GameSaveData {
  const starter = createStarterGongfa()
  const player = createDefaultPlayer()
  applyRealmBaseToPlayer(player, player.realm, starter)
  const gongfaList = [starter]
  return {
    player,
    activeGongfaId: starter.id,
    gongfaList,
    worldTime: createInitialWorldTime(),
    dongfu: createDefaultDongfu(),
    idle: createDefaultIdleState(),
    monsterTierPity: createDefaultMonsterTierPityState(),
    reincarnation: createDefaultReincarnationState(),
    achievements: createDefaultAchievementState(),
    titles: createDefaultTitleState(),
    inventory: createDefaultInventory(),
    market: createDefaultMarketState(),
    playerSkills: migratePlayerSkillStateFromGongfaList(gongfaList),
    fabao: createDefaultFabaoState(),
  }
}

/** 规范化功法实例（兼容旧存档缺失字段） */
function normalizeGongfa(gongfa: Gongfa): Gongfa {
  const level = gongfa.level ?? 1
  const maxLevel = gongfa.maxLevel ?? 10
  const normalized: Gongfa = {
    ...gongfa,
    level,
    maxLevel,
    exp: gongfa.exp ?? 0,
    expToNext: gongfa.expToNext ?? (level >= maxLevel ? 0 : calcExpToNextLevel(level)),
    conversionRateBonus: gongfa.conversionRateBonus ?? 0,
    skillProficiency: gongfa.skillProficiency ?? {},
  }
  syncGongfaLevelBonuses(normalized)
  return normalized
}

/** 规范化玩家数据（兼容旧版本字段，修炼属性随境界表同步） */
function normalizePlayer(player: Player): Player {
  const normalized: Player = {
    ...player,
    realm: normalizeRealm(player.realm),
    originTitle: player.originTitle ?? '',
    originSummary: player.originSummary ?? '',
    cultivation: player.cultivation ?? { absorptionRate: 4, conversionRate: 0.46 },
    breakthroughFailures: player.breakthroughFailures ?? 0,
  }
  // 修炼属性随境界表同步；战斗属性仅在突破时按功法增幅重算，读档不覆盖
  resyncPlayerCultivationStats(normalized)
  return normalized
}

/** 规范化玩家技能库（旧存档从功法列表迁移） */
function normalizePlayerSkills(
  playerSkills: PlayerSkillState | undefined,
  gongfaList: Gongfa[],
): PlayerSkillState {
  if (!playerSkills || Object.keys(playerSkills.learned ?? {}).length === 0) {
    return migratePlayerSkillStateFromGongfaList(gongfaList)
  }

  const normalized = normalizePlayerSkillState(playerSkills)
  syncLearnedSkillsFromGongfaList(normalized, gongfaList)
  return normalized
}

/** 规范化存档数据（兼容旧版本字段） */
export function normalizeSaveData(data: GameSaveData): GameSaveData {
  const gongfaList = (data.gongfaList ?? []).map(normalizeGongfa)
  const reincarnation = {
    ...createDefaultReincarnationState(),
    ...data.reincarnation,
    combat: {
      ...createDefaultReincarnationState().combat,
      ...data.reincarnation?.combat,
    },
    cultivation: {
      ...createDefaultReincarnationState().cultivation,
      ...data.reincarnation?.cultivation,
    },
  }
  const player = normalizePlayer(data.player)
  const activeGongfa = gongfaList.find((g) => g.id === data.activeGongfaId)
  const playerSkills = normalizePlayerSkills(data.playerSkills, gongfaList)
  resyncPlayerCombatOnLoad(player, activeGongfa, reincarnation)

  return {
    ...data,
    player,
    gongfaList,
    playerSkills,
    worldTime: data.worldTime ?? createInitialWorldTime(),
    dongfu: normalizeDongfu(data.dongfu),
    idle: {
      ...createDefaultIdleState(),
      ...data.idle,
      mode: data.idle?.mode === 'gongfa' ? 'gongfa' : 'xiuwei',
      xiuweiRemainder: data.idle?.xiuweiRemainder ?? 0,
      gongfaExpRemainder: data.idle?.gongfaExpRemainder ?? 0,
    },
    monsterTierPity: {
      ...createDefaultMonsterTierPityState(),
      ...data.monsterTierPity,
    },
    reincarnation,
    achievements: {
      ...createDefaultAchievementState(),
      ...data.achievements,
      counters: {
        ...createDefaultAchievementState().counters,
        ...data.achievements?.counters,
      },
      records: data.achievements?.records ?? {},
    },
    titles: {
      ...createDefaultTitleState(),
      ...data.titles,
      unlockedTitleIds: data.titles?.unlockedTitleIds ?? [],
    },
    inventory: normalizeInventory(
      data.inventory,
      player.spiritRootElements[0] ?? '火',
    ),
    market: normalizeMarketState(data.market),
    fabao: normalizeFabaoState(data.fabao),
  }
}

/** 读取本地存档 */
export function loadSave(): GameSaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const normalized = normalizeSaveData(JSON.parse(raw) as GameSaveData)
    // 规范化后写回，确保境界表调整后玩家属性与怪物使用同一套数值
    persistSave(normalized)
    return normalized
  } catch {
    return null
  }
}

/** 写入本地存档 */
export function persistSave(data: GameSaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}
