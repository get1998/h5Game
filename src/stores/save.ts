import { calcExpToNextLevel } from '@/game/formulas/gongfa-exp'
import { createStarterGongfa, type Gongfa } from '@/game/models/gongfa'
import { createDefaultDongfu, normalizeDongfu, type Dongfu } from '@/game/models/dongfu'
import { createDefaultPlayer, type Player } from '@/game/models/player'
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
  }
}

/** 规范化功法实例（兼容旧存档缺失字段） */
function normalizeGongfa(gongfa: Gongfa): Gongfa {
  const level = gongfa.level ?? 1
  const maxLevel = gongfa.maxLevel ?? 10
  return {
    ...gongfa,
    level,
    maxLevel,
    exp: gongfa.exp ?? 0,
    expToNext: gongfa.expToNext ?? (level >= maxLevel ? 0 : calcExpToNextLevel(level)),
  }
}

/** 规范化存档数据（兼容旧版本字段） */
export function normalizeSaveData(data: GameSaveData): GameSaveData {
  return {
    ...data,
    player: {
      ...data.player,
      realm: normalizeRealm(data.player.realm),
      originTitle: data.player.originTitle ?? '',
      originSummary: data.player.originSummary ?? '',
    },
    gongfaList: (data.gongfaList ?? []).map(normalizeGongfa),
    worldTime: data.worldTime ?? createInitialWorldTime(),
    dongfu: normalizeDongfu(data.dongfu),
    idle: {
      ...createDefaultIdleState(),
      ...data.idle,
      xiuweiRemainder: data.idle?.xiuweiRemainder ?? 0,
    },
  }
}

/** 读取本地存档 */
export function loadSave(): GameSaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    return normalizeSaveData(JSON.parse(raw) as GameSaveData)
  } catch {
    return null
  }
}

/** 写入本地存档 */
export function persistSave(data: GameSaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data))
}
