import { calcGongfaExpGain } from '@/game/formulas/gongfa-exp'
import { calcBattleXiuweiGain } from '@/game/formulas/battle-xiuwei'
import type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
import { calcSkillProficiencyGain, calcSkillKillProficiencyBonus } from '@/game/formulas/skill-proficiency'
import { getGongfaPrimaryElement, type Gongfa } from '@/game/models/gongfa'
import { getFabaoTemplate } from '@/game/constants/fabao'
import type { FabaoState } from '@/game/models/fabao'
import type { AchievementState } from '@/game/models/achievement'
import type { ReincarnationCombatBonus } from '@/game/models/reincarnation'
import { getSkillById } from '@/game/models/skill'
import type { Monster } from '@/game/models/monster'
import type { Player } from '@/game/models/player'
import {
  executeAttackFabaoSkill,
  executeDefenseFabaoSkill,
  formatDefenseFabaoSkillLog,
  formatFabaoSkillAttackLog,
} from '@/game/systems/fabao-combat'
import { createBattleContext } from '@/game/systems/combat-context'
import {
  applyPoisonRoundStart,
  createPlayerBattleDebuffs,
  getEffectiveDefenderSpeed,
  tickDebuffDurations,
  type PlayerBattleDebuffs,
} from '@/game/systems/battle-debuffs'
import {
  executeMonsterAttack,
  resetBattleMonsterSkillState,
  type BattleMonsterSkillState,
} from '@/game/systems/monster-skill-combat'
import type { PlayerBattleSkillLoadout } from '@/game/systems/player-skill-library'
import {
  executePlayerAttack,
  tryAutoFlee,
  type AutoFleeAttemptResult,
  type AutoFleeInput,
  type BattleSkillState,
} from '@/game/systems/skill-combat'
import type { BattleLogEntry } from '@/game/types'

/** 单次调息基础时长（秒） */
export const REST_BASE_SECONDS = 5

/** 连续调息上限，达到后陷入重伤 */
export const MAX_CONSECUTIVE_REST_COUNT = 5

/** 重伤昏迷时长（秒） */
export const SEVERE_INJURY_SECONDS = 180

/** 连续进入调息达此次数时，寿元减少 1 年（3、6、9…） */
export const REST_LIFESPAN_PENALTY_THRESHOLD = 3

/** 连续调息触发的寿元削减（年） */
export const REST_LIFESPAN_PENALTY_YEARS = 1

/** 陷入重伤时寿元削减（年） */
export const SEVERE_INJURY_LIFESPAN_PENALTY_YEARS = 5

/** 调息 / 重伤阶段 */
export type RecoveryPhase = 'none' | 'resting' | 'severe_injury'

/**
 * 本次进入调息是否应扣减寿元（连续第 3、6、9… 次调息）
 */
export function shouldApplyRestLifespanPenalty(restCount: number): boolean {
  return restCount > 0 && restCount % REST_LIFESPAN_PENALTY_THRESHOLD === 0
}

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
  return `连续第 ${restCount} 次战败调息，还需 ${seconds} 秒恢复气血。`
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
  /** 因气血濒危且无回血手段而撤离（非战败） */
  playerFled?: boolean
  /** 本回合逃跑尝试失败次数（用于成就统计） */
  fleeFailedCount?: number
  gongfaExpGain: number
  /** 击杀获得的修为（精英及以上同级为主；高境界差时普通亦可获得） */
  xiuweiGain: number
  /** 本回合技能熟练度增量（施展主动 / 绝技后结算，至少 +1） */
  skillProficiencyGains: BattleSkillProficiencyGain[]
  /** 战斗后法器状态（灵力消耗） */
  fabaoState?: FabaoState
}

export type { BattleSkillState } from '@/game/systems/skill-combat'
export {
  canAttemptAutoFlee,
  estimateNextRoundPoisonDamage,
  hasAvailableAttackSkillsBeyondNormal,
  hasAvailableHealingResources,
  hasOnlyNormalAttackRemaining,
  isMonsterAtHealthyHp,
  shouldForceFleeByCombatPowerGap,
  tryAutoFlee,
  willPlayerDieNextCombatRound,
} from '@/game/systems/skill-combat'
export {
  calcCombatPower,
  calcMonsterCombatPower,
  calcPlayerCombatPower,
  shouldForceFleeByCombatPower,
} from '@/game/formulas/combat-power'
export { estimateMonsterMaxRoundDamage } from '@/game/systems/monster-skill-combat'
export { calcFleeRate, rollFlee } from '@/game/formulas/damage'
export type { BattleMonsterSkillState } from '@/game/systems/monster-skill-combat'
export type { PlayerBattleDebuffs } from '@/game/systems/battle-debuffs'
export type { BattleContext } from '@/game/systems/combat-context'
export type { CombatSnapshot } from '@/game/formulas/combat-snapshot'
export {
  buildCombatSnapshot,
  buildEffectiveCombatStats,
  DEFAULT_STAT_CONTRIBUTORS,
  aggregateContributions,
  gongfaStatContributor,
  passiveStatContributor,
  getGongfaCombatContribution,
  aggregatePermanentPassiveContributions,
  getUnlockedPassiveSkills,
  isPermanentPassiveSkill,
} from '@/game/systems/stat-contributors'
export type {
  BattleLoadout,
  EffectiveCombatStats,
  StatContributor,
  StatContributorContext,
  CombatStatBreakdown,
  CombatStatContribution,
} from '@/game/systems/stat-contributors'
export { createBattleContext } from '@/game/systems/combat-context'
export {
  createBattleSkillState,
  resetBattleSkillState,
} from '@/game/systems/skill-combat'
export {
  createBattleMonsterSkillState,
  resetBattleMonsterSkillState,
} from '@/game/systems/monster-skill-combat'

/** 单场战斗扩展状态（怪物技能 + 玩家减益 + 属性上下文） */
export interface BattleRoundExtras {
  monsterSkillState: BattleMonsterSkillState
  playerDebuffs: PlayerBattleDebuffs
  equippedTitleId?: string | null
  achievements?: AchievementState
  reincarnationCombat?: ReincarnationCombatBonus | null
}

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
 * 构建自动逃跑回合结果（保留当前气血，不计战败）
 */
function buildAutoFleeResult(
  logs: BattleLogEntry[],
  playerHp: number,
  skillState: BattleSkillState,
  monsterHp: number,
  fleeRate: number,
  fabaoState?: FabaoState,
  forcedByCombatPower = false,
): BattleRoundResult {
  if (forcedByCombatPower) {
    logs.push(createLog('察觉对方战斗力远超自身，你不战而退。', 'system'))
  } else {
    const percent = Math.round(fleeRate * 100)
    logs.push(createLog(`预判下回合必死，你选择抽身撤离（成功率 ${percent}%）。`, 'system'))
  }
  return {
    logs,
    playerHp,
    playerMp: skillState.playerMp,
    monsterHp,
    isFinished: true,
    playerWin: false,
    playerFled: true,
    gongfaExpGain: 0,
    xiuweiGain: 0,
    skillProficiencyGains: [],
    fabaoState,
  }
}

function formatFleeRatePercent(fleeRate: number): number {
  return Math.round(fleeRate * 100)
}

/**
 * 处理自动逃跑判定；成功则返回战斗结果，失败则写入日志并返回 null
 */
function resolveAutoFleeAttempt(
  logs: BattleLogEntry[],
  fleeAttempt: AutoFleeAttemptResult,
  monsterName: string,
  playerHp: number,
  skillState: BattleSkillState,
  monsterHp: number,
  fabaoState: FabaoState | undefined,
): { roundResult: BattleRoundResult | null; fleeFailed: boolean } {
  if (!fleeAttempt.attempted) {
    return { roundResult: null, fleeFailed: false }
  }

  if (fleeAttempt.fled) {
    return {
      roundResult: buildAutoFleeResult(
        logs,
        playerHp,
        skillState,
        monsterHp,
        fleeAttempt.fleeRate,
        fabaoState,
        fleeAttempt.forcedByCombatPower,
      ),
      fleeFailed: false,
    }
  }

  logs.push(
    createLog(
      `你试图抽身撤离（成功率 ${formatFleeRatePercent(fleeAttempt.fleeRate)}%），但被 ${monsterName} 缠住未能脱身。`,
      'system',
    ),
  )
  return { roundResult: null, fleeFailed: true }
}

function getPlayerFleeSpeed(snapshotSpeed: number, debuffs: PlayerBattleDebuffs): number {
  return getEffectiveDefenderSpeed(snapshotSpeed, debuffs)
}

function buildAutoFleeInput(
  playerHp: number,
  playerMaxHp: number,
  playerMaxMp: number,
  playerFleeSpeed: number,
  monster: Monster,
  monsterHp: number,
  skillLoadout: PlayerBattleSkillLoadout,
  skillState: BattleSkillState,
  snapshot: CombatSnapshot,
  playerDebuffs: PlayerBattleDebuffs,
  monsterSkillState: BattleMonsterSkillState,
): AutoFleeInput {
  return {
    playerHp,
    playerMaxHp,
    playerMaxMp,
    playerSpeed: playerFleeSpeed,
    monsterHp,
    monsterMaxHp: monster.combat.maxHp,
    monsterStatus: monster.status,
    monsterSpeed: monster.combat.speed,
    skills: skillLoadout.skills,
    skillState,
    proficiencyMap: skillLoadout.proficiencyMap,
    snapshot,
    playerDebuffs,
    monsterSkillState,
    monster,
  }
}

/**
 * 尝试逃跑（满足条件则掷骰，失败也会写入日志）
 */
function attemptBattleAutoFlee(
  logs: BattleLogEntry[],
  playerHp: number,
  playerMaxHp: number,
  playerMaxMp: number,
  playerFleeSpeed: number,
  monster: Monster,
  monsterHp: number,
  skillLoadout: PlayerBattleSkillLoadout,
  skillState: BattleSkillState,
  snapshot: CombatSnapshot,
  playerDebuffs: PlayerBattleDebuffs,
  monsterSkillState: BattleMonsterSkillState,
  fabaoState: FabaoState | undefined,
): { roundResult: BattleRoundResult | null; fleeFailed: boolean } {
  const fleeAttempt = tryAutoFlee(buildAutoFleeInput(
    playerHp,
    playerMaxHp,
    playerMaxMp,
    playerFleeSpeed,
    monster,
    monsterHp,
    skillLoadout,
    skillState,
    snapshot,
    playerDebuffs,
    monsterSkillState,
  ))
  if (!fleeAttempt.attempted) {
    return { roundResult: null, fleeFailed: false }
  }

  return resolveAutoFleeAttempt(
    logs,
    fleeAttempt,
    monster.name,
    playerHp,
    skillState,
    monsterHp,
    fabaoState,
  )
}

/**
 * 执行一轮简化文字战斗（玩家先手一次 + 怪物反击一次）
 */
export function runBattleRound(
  player: Player,
  monster: Monster,
  gongfa: Gongfa,
  skillState: BattleSkillState,
  gongfaList: Gongfa[] = [],
  skillLoadout: PlayerBattleSkillLoadout,
  battleExtras?: BattleRoundExtras,
  fabaoState?: FabaoState,
): BattleRoundResult {
  const ctx = createBattleContext(
    player,
    monster,
    gongfa,
    skillState,
    gongfaList,
    fabaoState,
    {
      equippedTitleId: battleExtras?.equippedTitleId,
      achievements: battleExtras?.achievements,
      reincarnationCombat: battleExtras?.reincarnationCombat,
    },
  )
  const logs: BattleLogEntry[] = []
  let playerHp = player.combat.hp
  let monsterHp = monster.combat.hp
  let currentFabaoState = fabaoState
  let fleeFailedCount = 0

  const monsterSkillState = battleExtras?.monsterSkillState
    ?? resetBattleMonsterSkillState(monster.combat.maxMp)
  const playerDebuffs = battleExtras?.playerDebuffs ?? createPlayerBattleDebuffs()

  const poisonDamage = applyPoisonRoundStart(playerDebuffs, player.combat.maxHp)
  if (poisonDamage > 0) {
    playerHp = Math.max(0, playerHp - poisonDamage)
    logs.push(createLog(`中毒发作，你损失 ${poisonDamage} 点气血。`, 'damage'))
    if (playerHp <= 0) {
      logs.push(createLog('你中毒身亡，将自动调息恢复。', 'system'))
      tickDebuffDurations(playerDebuffs)
      return {
        logs,
        playerHp: 0,
        playerMp: skillState.playerMp,
        monsterHp,
        isFinished: true,
        playerWin: false,
        gongfaExpGain: 0,
        xiuweiGain: 0,
        skillProficiencyGains: [],
        fabaoState: currentFabaoState,
      }
    }
  }

  const playerFleeSpeed = getPlayerFleeSpeed(ctx.snapshot.speed, playerDebuffs)
  const fleeAtRoundStartResult = attemptBattleAutoFlee(
    logs,
    playerHp,
    player.combat.maxHp,
    player.combat.maxMp,
    playerFleeSpeed,
    monster,
    monsterHp,
    skillLoadout,
    skillState,
    ctx.snapshot,
    playerDebuffs,
    monsterSkillState,
    currentFabaoState,
  )
  if (fleeAtRoundStartResult.fleeFailed) fleeFailedCount += 1
  if (fleeAtRoundStartResult.roundResult) {
    tickDebuffDurations(playerDebuffs)
    return {
      ...fleeAtRoundStartResult.roundResult,
      fleeFailedCount,
    }
  }

  const playerAttack = executePlayerAttack(
    ctx.snapshot,
    monster,
    gongfa,
    skillLoadout,
    skillState,
    createLog,
    { hp: playerHp, maxHp: player.combat.maxHp },
  )
  logs.push(...playerAttack.logs)
  monsterHp = playerAttack.monsterHp
  playerHp = playerAttack.playerHp

  if (currentFabaoState && monsterHp > 0) {
    const fabaoSkill = executeAttackFabaoSkill(currentFabaoState, ctx.snapshot, {
      ...monster,
      combat: { ...monster.combat, hp: monsterHp },
    })
    currentFabaoState = fabaoSkill.state
    if (fabaoSkill.consumed > 0) {
      const fabao = currentFabaoState.equippedAttackFabaoId
        ? currentFabaoState.owned.find((f) => f.id === currentFabaoState!.equippedAttackFabaoId)
        : undefined
      const template = fabao ? getFabaoTemplate(fabao.templateId) : undefined
      if (fabaoSkill.executed) {
        monsterHp = Math.max(0, monsterHp - fabaoSkill.damage)
      }
      logs.push(
        createLog(
          formatFabaoSkillAttackLog(
            template?.name ?? '法器',
            fabaoSkill,
            fabaoSkill.elementHint,
          ),
          'skill',
        ),
      )
      logs.push(
        createLog(
          `攻击法器「${template?.name ?? '法器'}」消耗 ${fabaoSkill.consumed} 点灵力。`,
          'skill',
        ),
      )
      if (fabaoSkill.depleted) {
        logs.push(createLog('攻击法器灵力耗尽，技能攻击无法释放。', 'system'))
      }
    }
  }

  const skillProficiencyGains: BattleSkillProficiencyGain[] = []
  if (playerAttack.castSkillId) {
    const proficiencyGain = calcSkillProficiencyGain({
      playerRealm: player.realm,
      monsterRealm: monster.realm,
      monsterKind: monster.kind,
      monsterTier: monster.tier,
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
          'skill',
        ),
      )
    }
  }

  if (monsterHp <= 0) {
    const gongfaExpGain = calcGongfaExpGain({
      monsterRealm: monster.realm,
      monsterKind: monster.kind,
      monsterTier: monster.tier,
      spiritRootType: player.spiritRootType,
      spiritRootElements: player.spiritRootElements,
      gongfaElement: getGongfaPrimaryElement(gongfa),
    }, player.cultivation.gongfaExpMultiplier)
    const xiuweiResult = calcBattleXiuweiGain({
      player,
      monsterRealm: monster.realm,
      monsterTier: monster.tier,
      monsterKind: monster.kind,
    })
    logs.push(createLog(`击败 ${monster.name}！`, 'system'))
    if (gongfaExpGain > 0) {
      logs.push(createLog(`获得功法经验 ${gongfaExpGain} 点。`, 'system'))
    }
    if (xiuweiResult.gain > 0) {
      logs.push(createLog(`获得修为 ${xiuweiResult.gain} 点。`, 'system'))
    }

    if (playerAttack.castSkillId) {
      const killBonus = calcSkillKillProficiencyBonus({
        playerRealm: player.realm,
        monsterRealm: monster.realm,
        monsterKind: monster.kind,
        monsterTier: monster.tier,
      })
      if (killBonus > 0) {
        const existingGain = skillProficiencyGains.find(
          (gain) => gain.skillId === playerAttack.castSkillId,
        )
        if (existingGain) {
          existingGain.amount += killBonus
        } else {
          skillProficiencyGains.push({
            skillId: playerAttack.castSkillId,
            amount: killBonus,
          })
        }
        const killSkill = getSkillById(playerAttack.castSkillId)
        logs.push(
          createLog(
            `技能击杀，「${killSkill?.name ?? playerAttack.castSkillId}」额外熟练度 +${killBonus}。`,
            'skill',
          ),
        )
      }
    }

    return {
      logs,
      playerHp,
      playerMp: skillState.playerMp,
      monsterHp: 0,
      isFinished: true,
      playerWin: true,
      fleeFailedCount,
      gongfaExpGain,
      xiuweiGain: xiuweiResult.gain,
      skillProficiencyGains,
      fabaoState: currentFabaoState,
    }
  }

  const fleeBeforeMonsterResult = attemptBattleAutoFlee(
    logs,
    playerHp,
    player.combat.maxHp,
    player.combat.maxMp,
    getPlayerFleeSpeed(ctx.snapshot.speed, playerDebuffs),
    monster,
    monsterHp,
    skillLoadout,
    skillState,
    ctx.snapshot,
    playerDebuffs,
    monsterSkillState,
    currentFabaoState,
  )
  if (fleeBeforeMonsterResult.fleeFailed) fleeFailedCount += 1
  if (fleeBeforeMonsterResult.roundResult) {
    tickDebuffDurations(playerDebuffs)
    return {
      ...fleeBeforeMonsterResult.roundResult,
      fleeFailedCount,
    }
  }

  const monsterAttack = executeMonsterAttack(
    monster,
    ctx.snapshot,
    monsterSkillState,
    playerDebuffs,
    createLog,
  )
  logs.push(...monsterAttack.logs)
  playerHp = Math.max(0, playerHp - monsterAttack.playerHpDelta)

  if (currentFabaoState && monsterAttack.playerHpDelta > 0 && monsterHp > 0) {
    const fabaoSkill = executeDefenseFabaoSkill(currentFabaoState, ctx.snapshot, {
      ...monster,
      combat: { ...monster.combat, hp: monsterHp },
    })
    currentFabaoState = fabaoSkill.state
    if (fabaoSkill.consumed > 0) {
      const fabao = currentFabaoState.equippedDefenseFabaoId
        ? currentFabaoState.owned.find((f) => f.id === currentFabaoState!.equippedDefenseFabaoId)
        : undefined
      const template = fabao ? getFabaoTemplate(fabao.templateId) : undefined
      if (fabaoSkill.executed) {
        monsterHp = Math.max(0, monsterHp - fabaoSkill.damage)
      }
      logs.push(
        createLog(
          formatDefenseFabaoSkillLog(template?.name ?? '法器', fabaoSkill),
          'skill',
        ),
      )
      logs.push(
        createLog(
          `防御法器「${template?.name ?? '法器'}」消耗 ${fabaoSkill.consumed} 点灵力。`,
          'skill',
        ),
      )
      if (fabaoSkill.depleted) {
        logs.push(createLog('防御法器灵力耗尽，技能攻击无法释放。', 'system'))
      }
    }
  }

  const fleeAfterMonsterAttackResult = attemptBattleAutoFlee(
    logs,
    playerHp,
    player.combat.maxHp,
    player.combat.maxMp,
    getPlayerFleeSpeed(ctx.snapshot.speed, playerDebuffs),
    monster,
    monsterHp,
    skillLoadout,
    skillState,
    ctx.snapshot,
    playerDebuffs,
    monsterSkillState,
    currentFabaoState,
  )
  if (fleeAfterMonsterAttackResult.fleeFailed) fleeFailedCount += 1
  if (fleeAfterMonsterAttackResult.roundResult) {
    tickDebuffDurations(playerDebuffs)
    return {
      ...fleeAfterMonsterAttackResult.roundResult,
      fleeFailedCount,
    }
  }

  tickDebuffDurations(playerDebuffs)

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
    fleeFailedCount,
    gongfaExpGain: 0,
    xiuweiGain: 0,
    skillProficiencyGains,
    fabaoState: currentFabaoState,
  }
}

/** 重置战斗日志 ID 计数（新战斗前调用） */
export function resetBattleLogCounter(): void {
  logIdCounter = 0
}

export { createPlayerBattleDebuffs } from '@/game/systems/battle-debuffs'
