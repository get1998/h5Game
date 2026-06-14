import {
  BATTLE_XIUWEI_BASE_RATE,
  BATTLE_XIUWEI_MIN_GAIN,
  BATTLE_XIUWEI_MIN_GAIN_RAW_THRESHOLD,
  getBattleXiuweiKindMultiplier,
  getBattleXiuweiRealmMultiplier,
  getBattleXiuweiTierMultiplier,
} from '@/game/constants/battle-reward'
import {
  getRealmBreakthroughXiuwei,
  getRealmDiff,
  getRealmXiuweiRoom,
  isRealmXiuweiFull,
} from '@/game/constants/realm'
import type { MonsterKind, MonsterTier } from '@/game/models/monster'
import type { Player } from '@/game/models/player'
import type { RealmStage } from '@/game/types'

export interface BattleXiuweiGainInput {
  player: Pick<Player, 'realm' | 'xiuwei'>
  monsterRealm: RealmStage
  monsterTier: MonsterTier
  monsterKind: MonsterKind
}

export interface BattleXiuweiGainResult {
  /** 实际获得的修为（已截断至当前境界余量） */
  gain: number
  /** 取整前的原始值 */
  raw: number
  /** 境界差（怪物 − 玩家） */
  realmDiff: number
  /** 使用的境界差倍率 */
  realmMultiplier: number
  /** 使用的品阶倍率 */
  tierMultiplier: number
  /** 使用的种类倍率 */
  kindMultiplier: number
  /** 锚点：当前境界突破所需修为 */
  breakthroughXiuwei: number
}

/**
 * 将 raw 修为转为整数收益
 */
function finalizeBattleXiuweiGain(raw: number): number {
  if (raw < BATTLE_XIUWEI_MIN_GAIN_RAW_THRESHOLD) {
    return 0
  }
  const floored = Math.floor(raw)
  return floored > 0 ? floored : BATTLE_XIUWEI_MIN_GAIN
}

/**
 * 计算击杀怪物可获得的修为
 *
 * 公式：突破所需 × BASE_RATE × 境界差倍率 × 品阶倍率 × 种类倍率
 * 同级普通靠低品阶倍率自然为 0；高境界差时境界倍率放大，普通品阶仍可获修为。
 */
export function calcBattleXiuweiGain(input: BattleXiuweiGainInput): BattleXiuweiGainResult {
  const breakthroughXiuwei = getRealmBreakthroughXiuwei(input.player.realm)
  const realmDiff = getRealmDiff(input.player.realm, input.monsterRealm)
  const realmMultiplier = getBattleXiuweiRealmMultiplier(realmDiff)
  const tierMultiplier = getBattleXiuweiTierMultiplier(input.monsterTier)
  const kindMultiplier = getBattleXiuweiKindMultiplier(input.monsterKind)

  const emptyResult: BattleXiuweiGainResult = {
    gain: 0,
    raw: 0,
    realmDiff,
    realmMultiplier,
    tierMultiplier,
    kindMultiplier,
    breakthroughXiuwei,
  }

  if (isRealmXiuweiFull(input.player)) {
    return emptyResult
  }

  const room = getRealmXiuweiRoom(input.player)
  if (room <= 0) {
    return emptyResult
  }

  const raw = breakthroughXiuwei
    * BATTLE_XIUWEI_BASE_RATE
    * realmMultiplier
    * tierMultiplier
    * kindMultiplier

  const gain = Math.min(finalizeBattleXiuweiGain(raw), room)

  return {
    gain,
    raw,
    realmDiff,
    realmMultiplier,
    tierMultiplier,
    kindMultiplier,
    breakthroughXiuwei,
  }
}
