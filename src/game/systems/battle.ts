import {
  calcFinalDamage,
  calcHitRate,
  rollCrit,
  rollHit,
} from '@/game/formulas/damage'
import { calcGongfaExpGain } from '@/game/formulas/gongfa-exp'
import { calcSkillProficiencyGain } from '@/game/formulas/skill-proficiency'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import { getSkillById } from '@/game/models/skill'
import type { Monster } from '@/game/models/monster'
import type { Player } from '@/game/models/player'
import {
  executePlayerAttack,
  type BattleSkillState,
} from '@/game/systems/skill-combat'
import type { BattleLogEntry } from '@/game/types'

/** 单次调息基础时长（秒） */
export const REST_BASE_SECONDS = 5

/** 连续调息上限，达到后陷入重伤 */
export const MAX_CONSECUTIVE_REST_COUNT = 5

/** 重伤昏迷时长（秒） */
export const SEVERE_INJURY_SECONDS = 180

/** 调息 / 重伤阶段 */
export type RecoveryPhase = 'none' | 'resting' | 'severe_injury'

/**
 * 计算第 n 次连续战败后的调息时长（毫秒）
 * 规则：5 秒 × 当前连续战败次数
 */
export function calcRestDurationMs(restCount: number): number {
  const count = Math.max(1, restCount)
  return REST_BASE_SECONDS * count * 1000
}

/**
 * 重伤昏迷时长（毫秒）
 */
export function calcSevereInjuryDurationMs(): number {
  return SEVERE_INJURY_SECONDS * 1000
}

/**
 * 格式化剩余时间为可读文案
 */
export function formatRecoveryCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0) {
    return `${min} 分 ${sec} 秒`
  }
  return `${sec} 秒`
}

/**
 * 生成调息阶段提示文案
 */
export function buildRestingMessage(restCount: number): string {
  const seconds = REST_BASE_SECONDS * restCount
  return `战败调息中（第 ${restCount} 次），还需 ${seconds} 秒恢复气血。`
}

/**
 * 生成重伤阶段提示文案
 */
export function buildSevereInjuryMessage(): string {
  return '连续战败五次，陷入重伤昏迷，三分钟后方可苏醒。'
}

/** 本场战斗单技能熟练度增量 */
export interface BattleSkillProficiencyGain {
  skillId: string
  amount: number
}

export interface BattleRoundResult {
  logs: BattleLogEntry[]
  playerHp: number
  playerMp: number
  monsterHp: number
  isFinished: boolean
  playerWin: boolean
  gongfaExpGain: number
  /** 本回合技能熟练度增量（施展技能且怪物境界不低于玩家时才有） */
  skillProficiencyGains: BattleSkillProficiencyGain[]
}

export type { BattleSkillState } from '@/game/systems/skill-combat'
export {
  createBattleSkillState,
  resetBattleSkillState,
} from '@/game/systems/skill-combat'

let logIdCounter = 0

function createLog(text: string, type: BattleLogEntry['type']): BattleLogEntry {
  logIdCounter += 1
  return {
    id: `log_${logIdCounter}`,
    text,
    type,
    timestamp: Date.now(),
  }
}

/**
 * 执行一轮简化文字战斗（玩家先手一次 + 怪物反击一次）
 */
export function runBattleRound(
  player: Player,
  monster: Monster,
  gongfa: Gongfa,
  skillState: BattleSkillState,
): BattleRoundResult {
  const logs: BattleLogEntry[] = []
  let playerHp = player.combat.hp
  let monsterHp = monster.combat.hp

  const playerAttack = executePlayerAttack(
    player,
    monster,
    gongfa,
    skillState,
    createLog,
  )
  logs.push(...playerAttack.logs)
  monsterHp = playerAttack.monsterHp

  const skillProficiencyGains: BattleSkillProficiencyGain[] = []
  if (playerAttack.castSkillId) {
    const proficiencyGain = calcSkillProficiencyGain({
      playerRealm: player.realm,
      monsterRealm: monster.realm,
    })
    if (proficiencyGain > 0) {
      const castSkill = getSkillById(playerAttack.castSkillId)
      skillProficiencyGains.push({
        skillId: playerAttack.castSkillId,
        amount: proficiencyGain,
      })
      logs.push(
        createLog(
          `「${castSkill?.name ?? playerAttack.castSkillId}」熟练度 +${proficiencyGain}。`,
          'system',
        ),
      )
    }
  }

  if (monsterHp <= 0) {
    const gongfaExpGain = calcGongfaExpGain({
      monsterRealm: monster.realm,
      spiritRootType: player.spiritRootType,
      spiritRootElements: player.spiritRootElements,
      gongfaElement: getGongfaPrimaryElement(gongfa),
    })
    logs.push(createLog(`击败 ${monster.name}！`, 'system'))
    if (gongfaExpGain > 0) {
      logs.push(createLog(`获得功法经验 ${gongfaExpGain} 点。`, 'system'))
    }
    return {
      logs,
      playerHp,
      playerMp: skillState.playerMp,
      monsterHp: 0,
      isFinished: true,
      playerWin: true,
      gongfaExpGain,
      skillProficiencyGains,
    }
  }

  // 怪物反击
  const monsterHitRate = calcHitRate(
    monster.combat.hitRate,
    monster.combat.speed,
    player.combat.speed,
  )
  if (rollHit(monsterHitRate)) {
    const isCrit = rollCrit(monster.combat.critRate)
    const damage = calcFinalDamage({
      attack: monster.combat.attack,
      isCrit,
      critDamage: monster.combat.critDamage,
      targetDefense: player.combat.defense + gongfa.defenseBonus,
    })
    playerHp = Math.max(0, playerHp - damage)
    logs.push(
      createLog(
        isCrit
          ? `${monster.name} 对你造成暴击 ${damage} 点伤害！`
          : `${monster.name} 对你造成 ${damage} 点伤害。`,
        isCrit ? 'crit' : 'damage',
      ),
    )
  } else {
    logs.push(createLog(`你闪避了 ${monster.name} 的攻击。`, 'miss'))
  }

  const isFinished = playerHp <= 0
  if (isFinished) {
    logs.push(createLog('你战败了，将自动调息恢复。', 'system'))
  }

  return {
    logs,
    playerHp,
    playerMp: skillState.playerMp,
    monsterHp,
    isFinished,
    playerWin: false,
    gongfaExpGain: 0,
    skillProficiencyGains,
  }
}

/** 重置战斗日志 ID 计数（新战斗前调用） */
export function resetBattleLogCounter(): void {
  logIdCounter = 0
}
