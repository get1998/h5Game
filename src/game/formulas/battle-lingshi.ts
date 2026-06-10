import { getRealmDiff } from '@/game/constants/realm'
import type { MonsterTier } from '@/game/models/monster'
import type { RealmStage } from '@/game/types'

/** 品阶基础灵石奖励 */
const TIER_BASE_LINGSHI: Record<MonsterTier, number> = {
  普通: 2,
  精英: 6,
  首领: 15,
  传奇: 30,
}

/**
 * 计算击杀怪物获得的灵石
 * @param monsterRealm 怪物境界
 * @param playerRealm 玩家境界
 * @param tier 怪物品阶
 */
export function calcBattleLingshiReward(
  monsterRealm: RealmStage,
  playerRealm: RealmStage,
  tier: MonsterTier,
): number {
  const base = TIER_BASE_LINGSHI[tier]
  const diff = getRealmDiff(playerRealm, monsterRealm)

  let multiplier = 1
  if (diff >= 2) multiplier = 1.5
  else if (diff === 1) multiplier = 1.2
  else if (diff === 0) multiplier = 1
  else if (diff === -1) multiplier = 0.6
  else if (diff === -2) multiplier = 0.3
  else multiplier = 0

  if (multiplier <= 0) return 0

  const raw = base * multiplier
  const jitter = 0.85 + Math.random() * 0.3
  return Math.max(1, Math.floor(raw * jitter))
}
