import { defineStore } from 'pinia'
import type { BattleLogEntry, IdleMode, IdleState } from '@/game/types'
import {
  calcCultivationRate,
  calcIdleXiuwei,
  canAutoMinorBreakthrough,
  tryBreakthrough,
  type BreakthroughAttemptResult,
} from '@/game/systems/cultivation'
import { calcIdleGongfaExp } from '@/game/systems/gongfa-cultivation'
import {
  calcLingqiRecoveryPerSec,
  canZhenfaSustainCultivation,
  getCultivationLingqiStopMessage,
  isDongfuLingqiFull,
} from '@/game/systems/lingqi'
import { canAffordZhenfaMaintainInterval } from '@/game/systems/zhenfa-maintain'
import {
  buildEffectiveCombatStats,
  buildRestingMessage,
  buildSevereInjuryMessage,
  calcMonsterCombatPower,
  calcPlayerCombatPower,
  calcRestDurationMs,
  calcSevereInjuryDurationMs,
  MAX_CONSECUTIVE_REST_COUNT,
  REST_LIFESPAN_PENALTY_YEARS,
  createPlayerBattleDebuffs,
  resetBattleLogCounter,
  resetBattleMonsterSkillState,
  resetBattleSkillState,
  runBattleRound,
  SEVERE_INJURY_LIFESPAN_PENALTY_YEARS,
  shouldApplyRestLifespanPenalty,
  shouldForceFleeByCombatPower,
  type BattleMonsterSkillState,
  type BattleRoundResult,
  type BattleSkillState,
  type PlayerBattleDebuffs,
  type RecoveryPhase,
} from '@/game/systems/battle'
import {
  getTrainingMapById,
  TRAINING_MAPS,
  type TrainingMap,
} from '@/game/constants/maps'
import { isRealmAtLeast, isRealmXiuweiFull } from '@/game/constants/realm'
import {
  getMonsterStatusEncounterHint,
  pickRandomMonster,
  type Monster,
} from '@/game/models/monster'
import {
  getTierLootMultiplier,
  rollMapLoot,
} from '@/game/systems/map-loot'
import { calcBattleLingshiReward } from '@/game/formulas/battle-lingshi'
import { getItemDefinition } from '@/game/constants/items'
import { rollDongfuTreasureDrop } from '@/game/systems/dongfu-treasure-loot'
import { rollZhenfaBlueprintDrop, rollZhenfaTreasureDrop } from '@/game/systems/zhenfa-loot'
import type { Gongfa } from '@/game/models/gongfa'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'

const IDLE_TICK_MS = 1000

/** 洞府自动修炼：手动停止后需等灵气消耗再蓄满 */
type DongfuAutoIdleGate = 'normal' | 'manual_stop_wait_deplete' | 'manual_stop_refilling'

/**
 * 挂机、战斗与日志状态
 */
export const useGameStore = defineStore('game', {
  state: () => ({
    battleLogs: [] as BattleLogEntry[],
    currentMonster: null as Monster | null,
    isBattling: false,
    isAutoExploring: false,
    selectedMapId: TRAINING_MAPS[0]?.id ?? '',
    tickTimer: null as ReturnType<typeof setInterval> | null,
    battleRoundTimer: null as ReturnType<typeof setInterval> | null,
    encounterTimer: null as ReturnType<typeof setTimeout> | null,
    lastMessage: '',
    cultivationResumed: false,
    recoveryPhase: 'none' as RecoveryPhase,
    consecutiveDefeatCount: 0,
    recoveryEndsAt: 0,
    recoveryTotalMs: 0,
    recoveryRemainingMs: 0,
    recoveryTimer: null as ReturnType<typeof setTimeout> | null,
    battleSkillState: null as BattleSkillState | null,
    battleMonsterSkillState: null as BattleMonsterSkillState | null,
    battlePlayerDebuffs: null as PlayerBattleDebuffs | null,
    /** 是否在洞府页（仅洞府页触发自动修炼） */
    dongfuPageActive: false,
    /** 洞府页当前选择的修炼模式 */
    dongfuPreferredIdleMode: 'xiuwei' as IdleMode,
    /** 手动停止修炼后的自动开练门禁 */
    dongfuAutoIdleGate: 'normal' as DongfuAutoIdleGate,
    /** 手动停止时对应的修炼模式（仅阻止该模式自动开练） */
    dongfuAutoIdleBlockedMode: null as IdleMode | null,
  }),
  getters: {
    /** 调息或重伤期间锁定全页操作 */
    isRecoveryLocked(state): boolean {
      return state.recoveryPhase !== 'none'
    },
    /** 洞府修炼期间锁定除洞府页外的操作 */
    isCultivationLocked(): boolean {
      return useDongfuStore().isCultivating
    },
    idle(): IdleState {
      return useDongfuStore().idle
    },
    idleStatusText(): string {
      return useDongfuStore().idleStatusText
    },
    cultivationRatePerSec(): number {
      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      return calcCultivationRate(
        playerStore.player,
        dongfuStore.dongfu,
        playerStore.activeGongfa,
        playerStore.reincarnation.cultivation,
      ).totalPerSec
    },
    currentMap(state): TrainingMap | undefined {
      return getTrainingMapById(state.selectedMapId)
    },
    exploreStatusText(state): string {
      if (state.recoveryPhase === 'resting') {
        return `战败调息中 · 连续第 ${state.consecutiveDefeatCount} 次`
      }
      if (state.recoveryPhase === 'severe_injury') {
        return '重伤昏迷'
      }
      if (state.isAutoExploring) {
        return state.isBattling ? '历练中 · 战斗中' : '历练中 · 寻敌'
      }
      return '未开始'
    },
  },
  actions: {
    /** 从玩家存档同步修炼状态（进入游戏时调用，不把离线间隔结算为修炼收益） */
    resumeCultivation() {
      if (this.cultivationResumed) return
      this.cultivationResumed = true
      this.restartIdleTimerIfNeeded()
    },

    /** 暂停修炼 tick（关闭标签/浏览器或离开游戏前调用，先结算在线时段） */
    pauseIdleTimer() {
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      this.applyCultivationElapsed()
      this.clearIdleTimer()
    },

    /** 恢复修炼 tick（重新进入游戏时重置锚点，不结算关页间隔） */
    restartIdleTimerIfNeeded() {
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      this.dongfuPreferredIdleMode = dongfuStore.idle.mode
      this.clearIdleTimer()
      const now = Date.now()
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        lastTickAt: now,
      })
      this.tickTimer = setInterval(() => this.tickIdle(), IDLE_TICK_MS)
    },

    /** 清理修炼 tick 定时器 */
    clearIdleTimer() {
      if (this.tickTimer) {
        clearInterval(this.tickTimer)
        this.tickTimer = null
      }
    },

    /** 结束修炼（不含结算，供结算流程内主动结束） */
    finishIdle(message?: string) {
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      this.clearIdleTimer()
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        isRunning: false,
      })
      if (message !== undefined) {
        this.lastMessage = message
      }
    },

    /** 标记是否在洞府页（控制自动修炼触发范围） */
    setDongfuPageActive(active: boolean) {
      this.dongfuPageActive = active
    },

    /** 同步洞府页选择的修炼模式 */
    setDongfuPreferredIdleMode(mode: IdleMode) {
      this.dongfuPreferredIdleMode = mode
    },

    /** 手动停止的门禁是否阻止指定模式自动开练 */
    isDongfuAutoIdleGateBlocking(mode: IdleMode): boolean {
      if (this.dongfuAutoIdleGate === 'normal') return false
      return mode === this.dongfuAutoIdleBlockedMode
    },

    /** 推进手动停止后的门禁状态（仅对曾被手动停止的模式生效） */
    advanceDongfuAutoIdleGate(mode: IdleMode, lingqiFull: boolean): boolean {
      if (!this.isDongfuAutoIdleGateBlocking(mode)) return false

      if (this.dongfuAutoIdleGate === 'manual_stop_wait_deplete') {
        if (lingqiFull) return true
        this.dongfuAutoIdleGate = 'manual_stop_refilling'
        return true
      }

      if (this.dongfuAutoIdleGate === 'manual_stop_refilling') {
        if (!lingqiFull) return true
        this.dongfuAutoIdleGate = 'normal'
        this.dongfuAutoIdleBlockedMode = null
      }

      return false
    },

    /** 检测指定模式是否满足自动开练前置条件 */
    canAutoStartDongfuIdleMode(mode: IdleMode): boolean {
      const playerStore = usePlayerStore()
      if (mode === 'xiuwei') {
        return !isRealmXiuweiFull(playerStore.player)
      }

      const activeGongfa = playerStore.activeGongfa
      return !!activeGongfa && activeGongfa.level < activeGongfa.maxLevel
    },

    /**
     * 洞府页自动开始修炼：
     * - 灵气已满时开练
     * - 聚灵阵可维持时，灵气枯竭后也会自动续练（无需等蓄满）
     * - 手动停止后需等灵气消耗并再次蓄满
     */
    tryAutoStartDongfuCultivation(mode?: IdleMode): boolean {
      if (!this.dongfuPageActive || this.isRecoveryLocked || this.idle.isRunning) {
        return false
      }

      const idleMode = mode ?? this.dongfuPreferredIdleMode

      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      const dongfu = dongfuStore.dongfu
      const full = isDongfuLingqiFull(dongfu)
      const zhenfaSustain = canZhenfaSustainCultivation(dongfu, playerStore.inventory)

      if (this.advanceDongfuAutoIdleGate(idleMode, full)) {
        return false
      }

      if (!this.canAutoStartDongfuIdleMode(idleMode)) return false

      const canStartByLingqi = full || (dongfu.lingqi <= 0 && zhenfaSustain)
      if (!canStartByLingqi) return false

      this.startIdle(idleMode)
      if (!this.idle.isRunning) return false

      if (full) {
        this.lastMessage = idleMode === 'gongfa'
          ? '灵气已满，自动开始功法修炼。'
          : '灵气已满，自动开始修炼。'
      } else {
        this.lastMessage = idleMode === 'gongfa'
          ? '聚灵阵运转中，自动继续功法修炼。'
          : '聚灵阵运转中，自动继续修炼。'
      }
      return true
    },

    /** 开始修炼 */
    startIdle(mode: IdleMode = 'xiuwei') {
      if (this.isRecoveryLocked) return

      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      if (dongfuStore.idle.isRunning) return

      const activeGongfa = playerStore.activeGongfa

      if (mode === 'xiuwei') {
        if (isRealmXiuweiFull(playerStore.player)) {
          this.lastMessage = '当前境界修为已满，请先突破后再修炼。'
          return
        }
      } else {
        if (!activeGongfa) {
          this.lastMessage = '请先装备主修功法后再进行功法修炼。'
          return
        }
        if (activeGongfa.level >= activeGongfa.maxLevel) {
          this.lastMessage = `${activeGongfa.name} 已圆满，无法继续功法修炼。`
          return
        }
      }

      if (this.isAutoExploring) {
        this.stopAutoExplore()
      }

      if (dongfuStore.dongfu.lingqi <= 0) {
        const recovery = calcLingqiRecoveryPerSec(
          dongfuStore.dongfu,
          true,
          playerStore.inventory,
        )
        if (recovery <= 0) {
          if (
            dongfuStore.dongfu.zhenfaLevel > 0
            && !canAffordZhenfaMaintainInterval(playerStore.inventory, dongfuStore.dongfu.zhenfaLevel)
          ) {
            this.lastMessage = '阵法灵石不足，无法维持聚灵，请补充五行灵石后再修炼。'
          } else {
            this.lastMessage = '灵气枯竭，需等待恢复或布置聚灵阵后方可修炼。'
          }
          return
        }
      }

      const now = Date.now()
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        isRunning: true,
        mode,
        lastTickAt: now,
        xiuweiRemainder: mode === 'xiuwei' ? dongfuStore.idle.xiuweiRemainder : 0,
        gongfaExpRemainder: mode === 'gongfa' ? dongfuStore.idle.gongfaExpRemainder : 0,
      })
      this.tickTimer = setInterval(() => this.tickIdle(), IDLE_TICK_MS)
      this.lastMessage = mode === 'gongfa'
        ? `开始功法修炼，参悟「${activeGongfa!.name}」。`
        : '开始修炼，吸纳天地灵气。'
    },

    /** 停止修炼 */
    stopIdle(message?: string) {
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      this.applyCultivationElapsed()
      this.clearIdleTimer()
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        isRunning: false,
      })
      this.dongfuAutoIdleGate = isDongfuLingqiFull(dongfuStore.dongfu)
        ? 'manual_stop_wait_deplete'
        : 'manual_stop_refilling'
      this.dongfuAutoIdleBlockedMode = dongfuStore.idle.mode
      this.lastMessage = message ?? '结束修炼。'
    },

    /** 结算自上次 tick 以来的闭关收益（在线/离线统一逻辑） */
    applyCultivationElapsed() {
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      if (dongfuStore.idle.mode === 'gongfa') {
        this.applyGongfaCultivationElapsed()
      } else {
        this.applyXiuweiCultivationElapsed()
      }
    },

    /** 结算修为修炼 */
    applyXiuweiCultivationElapsed() {
      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning || dongfuStore.idle.mode !== 'xiuwei') return

      const now = Date.now()
      const elapsed = Math.floor((now - dongfuStore.idle.lastTickAt) / 1000)
      if (elapsed <= 0) return

      const result = calcIdleXiuwei(
        playerStore.player,
        dongfuStore.dongfu,
        playerStore.activeGongfa,
        elapsed,
        dongfuStore.idle.xiuweiRemainder,
        now,
        playerStore.reincarnation.cultivation,
        playerStore.inventory,
      )

      dongfuStore.syncDongfu(result.dongfu)
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        lastTickAt: now,
        accumulatedSeconds: dongfuStore.idle.accumulatedSeconds + result.seconds,
        xiuweiRemainder: result.xiuweiRemainder,
      })

      if (result.gainedXiuwei > 0) {
        playerStore.addXiuwei(result.gainedXiuwei)
      }

      if (isRealmXiuweiFull(playerStore.player)) {
        const wasCultivating = dongfuStore.idle.isRunning
        if (wasCultivating) {
          this.finishIdle()
        }
        const autoResult = this.tryAutoMinorBreakthrough()
        if (!autoResult.attempted && wasCultivating) {
          this.lastMessage = '当前境界修为已满，修炼已自动停止，请前往突破。'
        } else if (autoResult.attempted && wasCultivating) {
          this.lastMessage = `${autoResult.message} 修炼已自动停止。`
        }
        return
      }

      const stopMessage = getCultivationLingqiStopMessage(
        dongfuStore.dongfu,
        playerStore.inventory,
        result.zhenfaSuspended,
        'xiuwei',
      )
      if (stopMessage) {
        this.finishIdle(stopMessage)
      }
    },

    /** 结算功法修炼 */
    applyGongfaCultivationElapsed() {
      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning || dongfuStore.idle.mode !== 'gongfa') return

      const activeGongfa = playerStore.activeGongfa
      if (!activeGongfa) {
        this.finishIdle('请先装备主修功法后再进行功法修炼。')
        return
      }
      if (activeGongfa.level >= activeGongfa.maxLevel) {
        this.finishIdle('功法已圆满，修炼自动停止。')
        return
      }

      const now = Date.now()
      const elapsed = Math.floor((now - dongfuStore.idle.lastTickAt) / 1000)
      if (elapsed <= 0) return

      const result = calcIdleGongfaExp(
        playerStore.player,
        dongfuStore.dongfu,
        activeGongfa,
        elapsed,
        dongfuStore.idle.gongfaExpRemainder,
        now,
        playerStore.inventory,
      )

      dongfuStore.syncDongfu(result.dongfu)
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        lastTickAt: now,
        accumulatedSeconds: dongfuStore.idle.accumulatedSeconds + result.seconds,
        gongfaExpRemainder: result.gongfaExpRemainder,
      })

      if (result.gainedExp > 0) {
        const levelResult = playerStore.gainGongfaExp(activeGongfa.id, result.gainedExp)
        if (levelResult?.leveledUp) {
          this.lastMessage = levelResult.message
        }
      }

      const currentGongfa = playerStore.activeGongfa
      if (!currentGongfa || currentGongfa.level >= currentGongfa.maxLevel) {
        this.finishIdle('功法已圆满，修炼自动停止。')
        return
      }

      const stopMessage = getCultivationLingqiStopMessage(
        dongfuStore.dongfu,
        playerStore.inventory,
        result.zhenfaSuspended,
        'gongfa',
      )
      if (stopMessage) {
        this.finishIdle(stopMessage)
      }
    },

    /** 修炼 tick */
    tickIdle() {
      this.applyCultivationElapsed()
    },

    /** 结算突破掷骰结果并写入玩家状态 */
    applyBreakthroughAttemptResult(result: BreakthroughAttemptResult) {
      const playerStore = usePlayerStore()
      this.lastMessage = result.message
      if (result.success && result.newRealm) {
        const unlocks = playerStore.breakthrough(result.newRealm)
        for (const unlock of unlocks) {
          const titleHint = unlock.rewardTitleId ? '，获得新称号' : ''
          this.pushSystemLog(`成就解锁：「${unlock.name}」${titleHint}`)
        }
      } else if (result.rolled && result.xiuweiLoss) {
        playerStore.recordBreakthroughFailure(result.xiuweiLoss)
      }
    },

    /**
     * 小境界修为满时自动突破（大境界仍需手动前往修炼页突破）
     */
    tryAutoMinorBreakthrough(): { attempted: boolean; success: boolean; message: string } {
      if (this.isRecoveryLocked) {
        return { attempted: false, success: false, message: '' }
      }

      const playerStore = usePlayerStore()
      if (!canAutoMinorBreakthrough(playerStore.player, playerStore.activeGongfa)) {
        return { attempted: false, success: false, message: '' }
      }

      const result = tryBreakthrough(playerStore.player, playerStore.activeGongfa)
      this.applyBreakthroughAttemptResult(result)
      this.pushSystemLog(`小境界自动突破：${result.message}`)
      return {
        attempted: true,
        success: result.success,
        message: result.message,
      }
    },

    /** 尝试突破 */
    attemptBreakthrough() {
      if (this.isRecoveryLocked) {
        return { success: false, message: '调息或重伤期间无法突破。' }
      }
      if (this.isCultivationLocked) {
        return { success: false, message: '修炼期间无法突破，请先结束修炼。' }
      }

      const playerStore = usePlayerStore()
      const result = tryBreakthrough(playerStore.player, playerStore.activeGongfa)
      this.applyBreakthroughAttemptResult(result)
      return result
    },

    /** 更新调息/重伤倒计时 */
    tickRecoveryCountdown() {
      if (!this.isRecoveryLocked) return
      this.recoveryRemainingMs = Math.max(0, this.recoveryEndsAt - Date.now())
    },

    /** 清理调息/重伤定时器 */
    clearRecoveryTimers() {
      if (this.recoveryTimer) {
        clearTimeout(this.recoveryTimer)
        this.recoveryTimer = null
      }
    },

    /**
     * 战败后自动调息（仅气血归零的连续战败计入次数；逃跑、离开地图不计）
     * 时长 = 5 秒 × 连续战败次数；连续 5 次后陷入重伤 3 分钟
     */
    startRecoveryAfterDefeat() {
      this.isAutoExploring = false
      this.isBattling = false
      this.clearBattleTimers()
      this.clearRecoveryTimers()
      this.currentMonster = null
      this.battleSkillState = null
      this.battleMonsterSkillState = null
      this.battlePlayerDebuffs = null

      this.consecutiveDefeatCount += 1
      const restCount = this.consecutiveDefeatCount
      const durationMs = calcRestDurationMs(restCount)

      this.recoveryPhase = 'resting'
      this.recoveryTotalMs = durationMs
      this.recoveryRemainingMs = durationMs
      this.recoveryEndsAt = Date.now() + durationMs
      this.lastMessage = buildRestingMessage(restCount)
      this.pushSystemLog(
        `连续第 ${restCount} 次战败调息，需 ${durationMs / 1000} 秒恢复气血。`,
      )

      if (shouldApplyRestLifespanPenalty(restCount)) {
        const playerStore = usePlayerStore()
        const penalty = playerStore.reduceLifespan(REST_LIFESPAN_PENALTY_YEARS)
        this.pushSystemLog(
          `连续战败调息 ${restCount} 次，寿元削减 ${REST_LIFESPAN_PENALTY_YEARS} 年。`,
        )
        if (penalty.lifespanEnded) {
          this.clearRecoveryTimers()
          return
        }
      }

      this.recoveryTimer = setTimeout(() => {
        this.finishResting()
      }, durationMs)
    },

    /** 调息结束：未满 5 次则恢复气血并继续历练，满 5 次则陷入重伤 */
    finishResting() {
      this.clearRecoveryTimers()

      if (this.consecutiveDefeatCount >= MAX_CONSECUTIVE_REST_COUNT) {
        this.enterSevereInjury()
        return
      }

      const playerStore = usePlayerStore()
      playerStore.restoreFullResources()
      this.battleSkillState = null
      this.battleMonsterSkillState = null
      this.battlePlayerDebuffs = null
      this.recoveryPhase = 'none'
      this.recoveryTotalMs = 0
      this.recoveryRemainingMs = 0
      this.recoveryEndsAt = 0
      this.lastMessage = '调息完毕，气血已恢复，继续历练。'
      this.pushSystemLog('调息完毕，自动继续历练。')

      const map = this.currentMap
      if (map && this.canEnterMap(map.id) && playerStore.activeGongfa) {
        this.isAutoExploring = true
        this.scheduleNextEncounter()
      }
    },

    /** 连续战败五次后陷入重伤昏迷 */
    enterSevereInjury() {
      this.clearRecoveryTimers()

      const playerStore = usePlayerStore()
      const penalty = playerStore.reduceLifespan(SEVERE_INJURY_LIFESPAN_PENALTY_YEARS)
      this.pushSystemLog(`陷入重伤，寿元削减 ${SEVERE_INJURY_LIFESPAN_PENALTY_YEARS} 年。`)
      if (penalty.lifespanEnded) {
        return
      }

      const durationMs = calcSevereInjuryDurationMs()
      this.recoveryPhase = 'severe_injury'
      this.recoveryTotalMs = durationMs
      this.recoveryRemainingMs = durationMs
      this.recoveryEndsAt = Date.now() + durationMs
      this.lastMessage = buildSevereInjuryMessage()
      this.pushSystemLog('重伤昏迷，三分钟后方可苏醒。')

      this.recoveryTimer = setTimeout(() => {
        this.finishSevereInjury()
      }, durationMs)
    },

    /** 重伤苏醒，重置连续战败计数 */
    finishSevereInjury() {
      this.clearRecoveryTimers()

      const playerStore = usePlayerStore()
      playerStore.restoreFullResources()
      this.battleSkillState = null
      this.battleMonsterSkillState = null
      this.battlePlayerDebuffs = null
      this.consecutiveDefeatCount = 0
      this.recoveryPhase = 'none'
      this.recoveryTotalMs = 0
      this.recoveryRemainingMs = 0
      this.recoveryEndsAt = 0
      this.lastMessage = '重伤苏醒，气血已恢复，可继续修行历练。'
      this.pushSystemLog('重伤苏醒，可继续行动。')
    },

    /** 选择历练地图 */
    selectMap(mapId: string) {
      if (this.isRecoveryLocked || this.isCultivationLocked || this.isAutoExploring) return
      const map = getTrainingMapById(mapId)
      if (!map) return
      const playerStore = usePlayerStore()
      if (!isRealmAtLeast(playerStore.player.realm, map.requiredRealm)) return
      this.selectedMapId = mapId
    },

    /** 判断地图是否可进入 */
    canEnterMap(mapId: string): boolean {
      const map = getTrainingMapById(mapId)
      if (!map) return false
      const playerStore = usePlayerStore()
      return isRealmAtLeast(playerStore.player.realm, map.requiredRealm)
    },

    /** 进入地图并开始自动历练 */
    startAutoExplore() {
      if (this.isRecoveryLocked) return
      if (this.isCultivationLocked) {
        this.lastMessage = '修炼期间无法历练，请先结束修炼。'
        return
      }

      const map = this.currentMap
      if (!map || this.isAutoExploring) return
      if (!this.canEnterMap(map.id)) {
        this.lastMessage = `境界不足，需达到 ${map.requiredRealm}。`
        return
      }

      const playerStore = usePlayerStore()
      if (!playerStore.activeGongfa) {
        this.lastMessage = '请先修炼功法后再历练。'
        return
      }

      this.isAutoExploring = true
      this.lastMessage = `进入 ${map.name}，开始自动历练。`
      this.encounterMonster()
    },

    /** 结束自动历练（主动离开地图：不计连续战败，并重置连续战败计数） */
    stopAutoExplore(message = '结束历练，返回休整。') {
      if (this.isRecoveryLocked) return

      const wasActive = this.isAutoExploring || this.isBattling

      this.isAutoExploring = false
      this.isBattling = false
      this.clearBattleTimers()
      this.currentMonster = null
      this.battleSkillState = null
      this.battleMonsterSkillState = null
      this.battlePlayerDebuffs = null

      if (wasActive) {
        this.consecutiveDefeatCount = 0
      }

      this.lastMessage = message
    },

    /** 清理战斗相关定时器 */
    clearBattleTimers() {
      if (this.battleRoundTimer) {
        clearInterval(this.battleRoundTimer)
        this.battleRoundTimer = null
      }
      if (this.encounterTimer) {
        clearTimeout(this.encounterTimer)
        this.encounterTimer = null
      }
    },

    /** 遇怪并开始自动战斗 */
    encounterMonster() {
      const map = this.currentMap
      if (!map || !this.isAutoExploring) return

      const playerStore = usePlayerStore()
      resetBattleLogCounter()
      const encounter = pickRandomMonster(map, playerStore.monsterTierPity)
      const monster = encounter.monster
      playerStore.monsterTierPity = encounter.pityState
      playerStore.save()

      const gongfa = playerStore.activeGongfa
      if (gongfa) {
        const effective = playerStore.effectiveCombatStats
        const { snapshot } = buildEffectiveCombatStats(playerStore.player, {
          activeGongfa: gongfa,
          gongfaList: playerStore.gongfaList,
          fabaoState: playerStore.fabao,
        })
        const playerPower = calcPlayerCombatPower(
          snapshot,
          effective.combat.maxHp,
          effective.combat.maxMp,
        )
        if (shouldForceFleeByCombatPower(playerPower, calcMonsterCombatPower(monster))) {
          this.pushSystemLog(`在 ${map.name} 察觉 ${monster.name} 气势远胜自身，未战先撤。`)
          this.lastMessage = '强敌当前，暂避锋芒，继续历练。'
          this.scheduleNextEncounter()
          return
        }
      }

      this.currentMonster = monster
      playerStore.restoreFullResources()
      this.battleSkillState = resetBattleSkillState(playerStore.effectiveCombatStats.combat.maxMp)
      this.battleMonsterSkillState = resetBattleMonsterSkillState(this.currentMonster.combat.maxMp)
      this.battlePlayerDebuffs = createPlayerBattleDebuffs()
      this.isBattling = true
      this.pushSystemLog(`在 ${map.name} 遭遇 ${this.currentMonster.name}！`)
      const statusHint = getMonsterStatusEncounterHint(this.currentMonster.status)
      if (statusHint) {
        this.pushSystemLog(statusHint)
      }
      this.startAutoBattleLoop(map.roundIntervalMs)
    },

    /** 启动自动战斗回合循环 */
    startAutoBattleLoop(intervalMs: number) {
      this.clearBattleTimers()
      this.battleRoundTimer = setInterval(() => {
        this.runBattleRoundAction()
      }, intervalMs)
    },

    /** 安排下一次遇怪 */
    scheduleNextEncounter() {
      const map = this.currentMap
      if (!map || !this.isAutoExploring) return

      this.encounterTimer = setTimeout(() => {
        this.encounterMonster()
      }, map.encounterDelayMs)
    },

    /**
     * 战斗胜利后结算奖励（先于战斗日志写入，保证角色修为与日志同步刷新）
     */
    applyBattleVictoryRewards(result: BattleRoundResult, gongfa: Gongfa): string[] {
      const playerStore = usePlayerStore()
      const messages: string[] = []

      const achievementUnlocks = playerStore.recordBattleWin()
      for (const unlock of achievementUnlocks) {
        const titleHint = unlock.rewardTitleId ? '，获得新称号' : ''
        this.pushSystemLog(`成就解锁：「${unlock.name}」${titleHint}`)
      }

      if (result.xiuweiGain > 0) {
        const applied = playerStore.addXiuwei(result.xiuweiGain)
        if (applied > 0) {
          const text = `获得修为 ${applied} 点（${playerStore.xiuweiSummary.text}）`
          messages.push(text)
        }
        const autoResult = this.tryAutoMinorBreakthrough()
        if (autoResult.attempted) {
          messages.push(autoResult.message)
        }
      }

      if (result.gongfaExpGain > 0) {
        const levelResult = playerStore.gainGongfaExp(gongfa.id, result.gongfaExpGain)
        if (levelResult) {
          const expText = `${levelResult.message}（+${result.gongfaExpGain} 功法经验）`
          messages.push(expText)
          this.pushSystemLog(expText)
        }
      }

      if (this.currentMonster) {
        const lingshiGain = calcBattleLingshiReward(
          this.currentMonster.realm,
          playerStore.player.realm,
          this.currentMonster.tier,
        )
        if (lingshiGain > 0) {
          playerStore.gainLingshi(lingshiGain, this.currentMonster.element)
          const text = `获得${this.currentMonster.element}系灵石 ${lingshiGain} 枚`
          messages.push(text)
          this.pushSystemLog(text)
        }
      }

      const map = this.currentMap
      if (map) {
        const lootMultiplier = getTierLootMultiplier(this.currentMonster!.tier)
        const loot = rollMapLoot(map.drops, lootMultiplier)
        for (const gongfaId of loot.gongfaIds) {
          const obtain = playerStore.tryObtainGongfa(gongfaId)
          if (obtain.obtained) {
            const text = `获得功法「${obtain.gongfaName}」！`
            messages.push(text)
            this.pushSystemLog(text)
          } else if (obtain.duplicate) {
            const text = `已领悟「${obtain.gongfaName}」，并无新收获。`
            this.pushSystemLog(text)
          }
        }
        for (const drop of loot.items) {
          const gain = playerStore.gainItem(drop.itemId, drop.count)
          if (gain.added > 0) {
            const name = getItemDefinition(drop.itemId)?.name ?? '未知物品'
            const text = `获得「${name}」×${gain.added}`
            messages.push(text)
            this.pushSystemLog(text)
          }
        }
      }

      const dongfuLevel = useDongfuStore().dongfu.level
      const dongfuState = useDongfuStore().dongfu
      const treasureDrop = rollDongfuTreasureDrop(this.currentMonster!, dongfuLevel)
      if (treasureDrop) {
        const gain = playerStore.gainItem(treasureDrop.itemId, 1)
        if (gain.added > 0) {
          const text = `获得洞府宝物「${treasureDrop.itemName}」！`
          messages.push(text)
          this.pushSystemLog(text)
        }
      }

      const blueprintDrop = rollZhenfaBlueprintDrop(
        this.currentMonster!,
        dongfuLevel,
        dongfuState.zhenfaUnlockedMaxLevel,
      )
      if (blueprintDrop) {
        const gain = playerStore.gainItem(blueprintDrop.itemId, 1)
        if (gain.added > 0) {
          const text = `获得阵法图纸「${blueprintDrop.itemName}」！`
          messages.push(text)
          this.pushSystemLog(text)
        }
      }

      const zhenfaTreasureDrop = rollZhenfaTreasureDrop(
        this.currentMonster!,
        dongfuLevel,
        dongfuState.zhenfaLevel,
      )
      if (zhenfaTreasureDrop) {
        const gain = playerStore.gainItem(zhenfaTreasureDrop.itemId, 1)
        if (gain.added > 0) {
          const text = `获得阵法宝物「${zhenfaTreasureDrop.itemName}」！`
          messages.push(text)
          this.pushSystemLog(text)
        }
      }

      return messages
    },

    /** 执行一轮战斗 */
    runBattleRoundAction() {
      if (this.isRecoveryLocked || this.isCultivationLocked) return

      const playerStore = usePlayerStore()
      const gongfa = playerStore.activeGongfa
      if (
        !this.currentMonster
        || !gongfa
        || !this.isBattling
        || !this.battleSkillState
        || !this.battleMonsterSkillState
        || !this.battlePlayerDebuffs
      ) return

      const result = runBattleRound(
        playerStore.player,
        this.currentMonster,
        gongfa,
        this.battleSkillState,
        playerStore.gongfaList,
        playerStore.battleSkillLoadout,
        {
          monsterSkillState: this.battleMonsterSkillState,
          playerDebuffs: this.battlePlayerDebuffs,
          equippedTitleId: playerStore.titles.equippedTitleId,
          achievements: playerStore.achievements,
          reincarnationCombat: playerStore.reincarnation.combat,
        },
        playerStore.fabao,
      )

      playerStore.setHp(result.playerHp)
      playerStore.setMp(result.playerMp)
      if (result.fabaoState) {
        playerStore.syncFabaoState(result.fabaoState)
      }
      this.currentMonster.combat.hp = result.monsterHp

      if (result.fleeFailedCount && result.fleeFailedCount > 0) {
        const levelUps = playerStore.recordFleeFailures(result.fleeFailedCount)
        for (const levelUp of levelUps) {
          const speedBonus = levelUp.newLevel * 5
          this.pushSystemLog(
            `成就升级：「${levelUp.name}」Lv.${levelUp.newLevel}（速度 +${speedBonus}%）`,
          )
        }
      }

      if (result.skillProficiencyGains.length > 0) {
        const levelUps = playerStore.gainSkillProficiency(
          result.skillProficiencyGains,
        )
        for (const levelUp of levelUps) {
          this.pushSkillLog(levelUp.message)
        }
      }

      let victoryMessages: string[] = []

      if (result.isFinished) {
        this.isBattling = false
        this.clearBattleTimers()

        if (result.playerWin) {
          this.consecutiveDefeatCount = 0
          victoryMessages = this.applyBattleVictoryRewards(result, gongfa)
        } else if (result.playerFled) {
          // 逃跑不计入连续战败，也不重置计数
          this.currentMonster = null
          this.battleSkillState = null
          this.battleMonsterSkillState = null
          this.battlePlayerDebuffs = null
          this.lastMessage = '见势不妙，抽身撤离，继续历练。'
        }
      }

      // 奖励入账后再写入战斗日志，避免日志已显示修为但角色信息尚未刷新
      if (victoryMessages.length > 0) {
        this.lastMessage = victoryMessages.join(' ')
      }
      this.battleLogs.push(...result.logs)

      if (result.isFinished) {
        if (result.playerWin && this.isAutoExploring) {
          this.scheduleNextEncounter()
        } else if (result.playerFled && this.isAutoExploring) {
          this.scheduleNextEncounter()
        } else if (!result.playerWin && !result.playerFled) {
          this.startRecoveryAfterDefeat()
        }
      }
    },

    /** 追加系统日志 */
    pushSystemLog(text: string) {
      this.battleLogs.push({
        id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text,
        type: 'system',
        timestamp: Date.now(),
      })
    },

    /** 追加技能熟练度 / 等级日志 */
    pushSkillLog(text: string) {
      this.battleLogs.push({
        id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text,
        type: 'skill',
        timestamp: Date.now(),
      })
    },

    /** 重置游戏运行时状态（重新开始时调用） */
    resetGame() {
      this.clearRecoveryTimers()
      this.recoveryPhase = 'none'
      this.consecutiveDefeatCount = 0
      this.recoveryTotalMs = 0
      this.recoveryRemainingMs = 0
      this.recoveryEndsAt = 0
      this.stopIdle()
      this.stopAutoExplore()
      this.battleLogs = []
      this.currentMonster = null
      this.isBattling = false
      this.isAutoExploring = false
      this.lastMessage = ''
      this.cultivationResumed = false
      this.dongfuPageActive = false
      this.dongfuPreferredIdleMode = 'xiuwei'
      this.dongfuAutoIdleGate = 'normal'
      this.dongfuAutoIdleBlockedMode = null
      this.battleSkillState = null
      this.battleMonsterSkillState = null
      this.battlePlayerDebuffs = null
    },
  },
})
