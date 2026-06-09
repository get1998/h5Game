import { defineStore } from 'pinia'
import type { BattleLogEntry, IdleState } from '@/game/types'
import { calcCultivationRate, calcIdleXiuwei, tryBreakthrough } from '@/game/systems/cultivation'
import { calcLingqiRecoveryPerSec } from '@/game/systems/lingqi'
import {
  buildRestingMessage,
  buildSevereInjuryMessage,
  calcRestDurationMs,
  calcSevereInjuryDurationMs,
  MAX_CONSECUTIVE_REST_COUNT,
  resetBattleLogCounter,
  resetBattleSkillState,
  runBattleRound,
  type BattleSkillState,
  type RecoveryPhase,
} from '@/game/systems/battle'
import {
  getTrainingMapById,
  TRAINING_MAPS,
  type TrainingMap,
} from '@/game/constants/maps'
import { isRealmAtLeast, isRealmXiuweiFull } from '@/game/constants/realm'
import { pickRandomMonster, type Monster } from '@/game/models/monster'
import {
  getTierLootMultiplier,
  rollMapLoot,
} from '@/game/systems/map-loot'
import { usePlayerStore } from '@/stores/player'
import { useDongfuStore } from '@/stores/dongfu'

const IDLE_TICK_MS = 1000

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
      ).totalPerSec
    },
    currentMap(state): TrainingMap | undefined {
      return getTrainingMapById(state.selectedMapId)
    },
    exploreStatusText(state): string {
      if (state.recoveryPhase === 'resting') {
        return `调息中 · 第 ${state.consecutiveDefeatCount} 次`
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
    /** 从玩家存档同步修炼状态（进入游戏时调用） */
    resumeCultivation() {
      if (this.cultivationResumed) return
      this.cultivationResumed = true

      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      this.applyCultivationElapsed()
      if (!dongfuStore.idle.isRunning) return
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
    finishIdle(message: string) {
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

      this.clearIdleTimer()
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        isRunning: false,
      })
      this.lastMessage = message
    },

    /** 开始修炼 */
    startIdle() {
      if (this.isRecoveryLocked) return

      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      if (dongfuStore.idle.isRunning) return

      if (isRealmXiuweiFull(playerStore.player)) {
        this.lastMessage = '当前境界修为已满，请先突破后再修炼。'
        return
      }

      if (this.isAutoExploring) {
        this.stopAutoExplore()
      }

      if (dongfuStore.dongfu.lingqi <= 0) {
        const recovery = calcLingqiRecoveryPerSec(dongfuStore.dongfu, true)
        if (recovery <= 0) {
          this.lastMessage = '灵气枯竭，需等待恢复或布置聚灵阵后方可修炼。'
          return
        }
      }

      const now = Date.now()
      dongfuStore.syncIdleState({
        ...dongfuStore.idle,
        isRunning: true,
        lastTickAt: now,
      })
      this.tickTimer = setInterval(() => this.tickIdle(), IDLE_TICK_MS)
      this.lastMessage = '开始修炼，吸纳天地灵气。'
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
      this.lastMessage = message ?? '结束修炼。'
    },

    /** 结算自上次 tick 以来的修炼修为（在线/离线统一逻辑） */
    applyCultivationElapsed() {
      const playerStore = usePlayerStore()
      const dongfuStore = useDongfuStore()
      if (!dongfuStore.idle.isRunning) return

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
      } else if (dongfuStore.dongfu.lingqi <= 0 && !isRealmXiuweiFull(playerStore.player)) {
        this.lastMessage = '灵气枯竭，修炼暂无收益。恢复灵气或升级阵法后可继续。'
      }

      if (isRealmXiuweiFull(playerStore.player)) {
        this.finishIdle('当前境界修为已满，修炼已自动停止，请前往突破。')
      }
    },

    /** 修炼 tick */
    tickIdle() {
      this.applyCultivationElapsed()
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
      const result = tryBreakthrough(playerStore.player)
      this.lastMessage = result.message
      if (result.success && result.newRealm) {
        playerStore.breakthrough(result.newRealm)
      }
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
     * 战败后自动调息
     * 时长 = 5 秒 × 连续战败次数；连续 5 次后陷入重伤 3 分钟
     */
    startRecoveryAfterDefeat() {
      this.isAutoExploring = false
      this.isBattling = false
      this.clearBattleTimers()
      this.clearRecoveryTimers()

      this.consecutiveDefeatCount += 1
      const restCount = this.consecutiveDefeatCount
      const durationMs = calcRestDurationMs(restCount)

      this.recoveryPhase = 'resting'
      this.recoveryTotalMs = durationMs
      this.recoveryRemainingMs = durationMs
      this.recoveryEndsAt = Date.now() + durationMs
      this.lastMessage = buildRestingMessage(restCount)
      this.pushSystemLog(
        `开始第 ${restCount} 次调息，需 ${durationMs / 1000} 秒恢复气血。`,
      )

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
      playerStore.setHp(playerStore.player.combat.maxHp)
      playerStore.setMp(playerStore.player.combat.maxMp)
      this.battleSkillState = null
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
      playerStore.setHp(playerStore.player.combat.maxHp)
      playerStore.setMp(playerStore.player.combat.maxMp)
      this.battleSkillState = null
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

    /** 结束自动历练 */
    stopAutoExplore() {
      if (this.isRecoveryLocked) return

      this.isAutoExploring = false
      this.isBattling = false
      this.clearBattleTimers()
      this.lastMessage = '结束历练，返回休整。'
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
      this.currentMonster = encounter.monster
      playerStore.monsterTierPity = encounter.pityState
      playerStore.save()
      playerStore.setHp(playerStore.player.combat.maxHp)
      playerStore.setMp(playerStore.player.combat.maxMp)
      this.battleSkillState = resetBattleSkillState(playerStore.player)
      this.isBattling = true
      this.pushSystemLog(`在 ${map.name} 遭遇 ${this.currentMonster.name}！`)
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

    /** 执行一轮战斗 */
    runBattleRoundAction() {
      if (this.isRecoveryLocked || this.isCultivationLocked) return

      const playerStore = usePlayerStore()
      const gongfa = playerStore.activeGongfa
      if (!this.currentMonster || !gongfa || !this.isBattling || !this.battleSkillState) return

      const result = runBattleRound(
        playerStore.player,
        this.currentMonster,
        gongfa,
        this.battleSkillState,
      )

      this.battleLogs.push(...result.logs)
      playerStore.setHp(result.playerHp)
      playerStore.setMp(result.playerMp)
      this.currentMonster.combat.hp = result.monsterHp

      if (result.skillProficiencyGains.length > 0) {
        const levelUps = playerStore.gainSkillProficiency(
          gongfa.id,
          result.skillProficiencyGains,
        )
        for (const levelUp of levelUps) {
          this.pushSkillLog(levelUp.message)
        }
      }

      if (result.isFinished) {
        this.isBattling = false
        this.clearBattleTimers()

        if (result.playerWin) {
          this.consecutiveDefeatCount = 0
          const messages: string[] = []

          if (result.gongfaExpGain > 0) {
            const levelResult = playerStore.gainGongfaExp(gongfa.id, result.gongfaExpGain)
            if (levelResult) {
              const expText = `${levelResult.message}（+${result.gongfaExpGain} 功法经验）`
              messages.push(expText)
              this.pushSystemLog(expText)
            }
          }

          const map = this.currentMap
          if (map) {
            const lootMultiplier = getTierLootMultiplier(this.currentMonster.tier)
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
          }

          if (messages.length > 0) {
            this.lastMessage = messages.join(' ')
          }
        }

        if (result.playerWin && this.isAutoExploring) {
          this.scheduleNextEncounter()
        } else if (!result.playerWin) {
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
      this.battleSkillState = null
    },
  },
})
