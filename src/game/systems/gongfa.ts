import { calcExpToNextLevel } from '@/game/formulas/gongfa-exp'
import type { Gongfa } from '@/game/models/gongfa'

export interface GongfaLevelUpResult {
  leveledUp: boolean
  newLevel: number
  message: string
}

/**
 * 为功法增加经验并处理升级
 */
export function addGongfaExp(gongfa: Gongfa, expGain: number): GongfaLevelUpResult {
  if (gongfa.level >= gongfa.maxLevel) {
    return {
      leveledUp: false,
      newLevel: gongfa.level,
      message: `${gongfa.name} 已圆满，不再获得经验。`,
    }
  }

  let level = gongfa.level
  let exp = gongfa.exp + expGain
  let expToNext = gongfa.expToNext
  let leveledUp = false

  while (exp >= expToNext && level < gongfa.maxLevel) {
    exp -= expToNext
    level += 1
    leveledUp = true
    expToNext = calcExpToNextLevel(level)
  }

  if (level >= gongfa.maxLevel) {
    exp = 0
    expToNext = 0
  }

  Object.assign(gongfa, { level, exp, expToNext })

  return {
    leveledUp,
    newLevel: level,
    message: leveledUp
      ? `${gongfa.name} 提升至 ${level} 级！`
      : `${gongfa.name} 获得 ${expGain} 点功法经验。`,
  }
}
