import { calcExpToNextLevel } from '@/game/formulas/gongfa-exp'
import { createStarterGongfa, syncGongfaLevelBonuses, type Gongfa } from '@/game/models/gongfa'
import { createDefaultDongfu, normalizeDongfu, type Dongfu } from '@/game/models/dongfu'
import {
  createDefaultMonsterTierPityState,
  type MonsterTierPityState,
} from '@/game/models/monster'
import { createDefaultPlayer, resyncPlayerRealmStats, type Player } from '@/game/models/player'
import { normalizeRealm } from '@/game/constants/realm'
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
}

/** 创建默认闭关状态 */
export function createDefaultIdleState(): IdleState {
  return {
    isRunning: false,
    lastTickAt: Date.now(),
    accumulatedSeconds: 0,
    xiuweiRemainder: 0,
  }
}

/** 创建默认存档 */
export function createDefaultGameSave(): GameSaveData {
  const starter = createStarterGongfa()
  return {
    player: createDefaultPlayer(),
    activeGongfaId: starter.id,
    gongfaList: [starter],
    worldTime: createInitialWorldTime(),
    dongfu: createDefaultDongfu(),
    idle: createDefaultIdleState(),
    monsterTierPity: createDefaultMonsterTierPityState(),
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

/** 规范化玩家数据（兼容旧版本字段，并按最新境界表重算基础属性） */
function normalizePlayer(player: Player): Player {
  const normalized: Player = {
    ...player,
    realm: normalizeRealm(player.realm),
    originTitle: player.originTitle ?? '',
    originSummary: player.originSummary ?? '',
  }
  // 怪物遇敌时实时读取境界表，玩家属性存于存档，需在读档时同步
  resyncPlayerRealmStats(normalized, { preserveResourceRatio: true })
  return normalized
}

/** 规范化存档数据（兼容旧版本字段） */
export function normalizeSaveData(data: GameSaveData): GameSaveData {
  return {
    ...data,
    player: normalizePlayer(data.player),
    gongfaList: (data.gongfaList ?? []).map(normalizeGongfa),
    worldTime: data.worldTime ?? createInitialWorldTime(),
    dongfu: normalizeDongfu(data.dongfu),
    idle: {
      ...createDefaultIdleState(),
      ...data.idle,
      xiuweiRemainder: data.idle?.xiuweiRemainder ?? 0,
    },
    monsterTierPity: {
      ...createDefaultMonsterTierPityState(),
      ...data.monsterTierPity,
    },
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
