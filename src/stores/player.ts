import { defineStore } from 'pinia'
import { applyRealmBaseToPlayer, createDefaultPlayer, type Player } from '@/game/models/player'
import {
  createGongfaFromTemplate,
  getGongfaTemplate,
  type Gongfa,
} from '@/game/models/gongfa'
import {
  addGongfaExp as applyGongfaExpGain,
  type GongfaLevelUpResult,
} from '@/game/systems/gongfa'
import { REAL_MS_PER_GAME_DAY } from '@/game/constants/time'
import {
  advanceWorldTime,
  calcGameDaysFromRealMs,
  createInitialWorldTime,
  formatGameDate,
  type WorldTime,
} from '@/game/systems/time'
import type { ElementType, SpiritRootType } from '@/game/types'
import {
  createDefaultGameSave,
  loadSave,
  persistSave,
  SAVE_KEY,
  type GameSaveData,
} from '@/stores/save'
import { useDongfuStore } from '@/stores/dongfu'

interface PlayerState {
  player: Player
  activeGongfaId: string
  gongfaList: Gongfa[]
  worldTime: WorldTime
}

function createInitialPlayerState(): PlayerState {
  const saved = loadSave()
  if (saved) {
    return {
      player: saved.player,
      activeGongfaId: saved.activeGongfaId,
      gongfaList: saved.gongfaList,
      worldTime: saved.worldTime,
    }
  }
  const defaults = createDefaultGameSave()
  return {
    player: defaults.player,
    activeGongfaId: defaults.activeGongfaId,
    gongfaList: defaults.gongfaList,
    worldTime: defaults.worldTime,
  }
}

/**
 * 玩家与功法状态
 */
export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => createInitialPlayerState(),
  getters: {
    /** 是否存在本地存档 */
    hasSave(): boolean {
      return localStorage.getItem(SAVE_KEY) !== null
    },
    activeGongfa(state): Gongfa | undefined {
      return state.gongfaList.find((g) => g.id === state.activeGongfaId)
    },
    realmText(): string {
      return this.player.realm
    },
    spiritRootText(): string {
      return `${this.player.spiritRootType}「${this.player.spiritRootElements.join('、')}」`
    },
    /** 格式化游戏日期 */
    gameDateText(): string {
      return formatGameDate(this.worldTime)
    },
  },
  actions: {
    /** 组装并持久化完整存档 */
    save() {
      const dongfuStore = useDongfuStore()
      const data: GameSaveData = {
        player: this.player,
        activeGongfaId: this.activeGongfaId,
        gongfaList: this.gongfaList,
        worldTime: this.worldTime,
        dongfu: dongfuStore.dongfu,
        idle: dongfuStore.idle,
      }
      persistSave(data)
    },
    /**
     * 推进世界时间指定天数，并同步增长年龄
     */
    advanceWorldTimeByDays(days: number) {
      if (days <= 0) return 0

      const result = advanceWorldTime(this.worldTime, days)
      this.worldTime = result.time
      if (result.yearsAdded > 0) {
        this.player.age += result.yearsAdded
      }
      this.save()
      return days
    },
    /**
     * 根据现实经过时间推进游戏日（挂机/离线结算）
     */
    tickWorldTimeFromRealElapsed(
      elapsedMs: number,
      msPerDay = REAL_MS_PER_GAME_DAY,
    ) {
      const days = calcGameDaysFromRealMs(elapsedMs, msPerDay)
      if (days <= 0) return 0
      return this.advanceWorldTimeByDays(days)
    },
    /** 启动或恢复世界时间流逝（进入游戏主界面时调用） */
    resumeWorldTimeClock(now = Date.now()) {
      const elapsed = now - this.worldTime.lastRealTickAt
      if (elapsed > 0) {
        this.tickWorldTimeFromRealElapsed(elapsed)
      }
      this.worldTime.lastRealTickAt = now
      useDongfuStore().tickLingqiRecovery(now)
      this.save()
    },
    /** 暂停世界时间锚点（离开游戏主界面时调用） */
    pauseWorldTimeClock(now = Date.now()) {
      const elapsed = now - this.worldTime.lastRealTickAt
      if (elapsed > 0) {
        this.tickWorldTimeFromRealElapsed(elapsed)
      }
      this.worldTime.lastRealTickAt = now
      this.save()
    },
    /** 周期性推进世界时间（由布局层定时器调用） */
    tickWorldTime(now = Date.now()) {
      const elapsed = now - this.worldTime.lastRealTickAt
      const days = calcGameDaysFromRealMs(elapsed, REAL_MS_PER_GAME_DAY)
      if (days <= 0) return

      this.worldTime.lastRealTickAt += days * REAL_MS_PER_GAME_DAY
      this.advanceWorldTimeByDays(days)
    },
    /** 增加修为 */
    addXiuwei(amount: number) {
      this.player.xiuwei += amount
      this.save()
    },
    /** 突破境界 */
    breakthrough(newRealm: Player['realm']) {
      applyRealmBaseToPlayer(this.player, newRealm)
      this.player.xiuwei = 0
      this.save()
    },
    /** 更新气血 */
    setHp(hp: number) {
      this.player.combat.hp = Math.min(this.player.combat.maxHp, Math.max(0, hp))
      this.save()
    },
    /** 更新灵力 */
    setMp(mp: number) {
      this.player.combat.mp = Math.min(this.player.combat.maxMp, Math.max(0, mp))
      this.save()
    },
    /** 切换功法 */
    switchGongfa(gongfaId: string) {
      if (useDongfuStore().idle.isRunning) return
      if (this.gongfaList.some((g) => g.id === gongfaId)) {
        this.activeGongfaId = gongfaId
        this.save()
      }
    },
    /**
     * 为指定功法增加经验并触发界面更新
     * @param gongfaId 功法 id
     * @param expGain 经验增量
     */
    gainGongfaExp(gongfaId: string, expGain: number): GongfaLevelUpResult | null {
      const index = this.gongfaList.findIndex((g) => g.id === gongfaId)
      if (index < 0 || expGain <= 0) return null

      const gongfa = this.gongfaList[index]
      const result = applyGongfaExpGain(gongfa, expGain)
      this.gongfaList[index] = { ...gongfa }
      this.save()
      return result
    },
    /**
     * 历练掉落：尝试领悟新功法（已拥有则视为重复）
     */
    tryObtainGongfa(templateId: string): {
      obtained: boolean
      gongfaName: string
      duplicate: boolean
    } {
      const template = getGongfaTemplate(templateId)
      const gongfaName = template?.name ?? '未知功法'

      if (this.gongfaList.some((g) => g.id === templateId)) {
        return { obtained: false, gongfaName, duplicate: true }
      }

      const gongfa = createGongfaFromTemplate(templateId)
      this.gongfaList.push(gongfa)
      this.save()
      return { obtained: true, gongfaName, duplicate: false }
    },
    /**
     * 创建新角色并保存
     */
    createCharacter(input: {
      name: string
      spiritRootType: SpiritRootType
      spiritRootElements: ElementType[]
      originTitle: string
      originSummary: string
      starterGongfaTemplateId: string
    }) {
      const starter = createGongfaFromTemplate(input.starterGongfaTemplateId)
      const player = createDefaultPlayer(input.name)
      player.spiritRootType = input.spiritRootType
      player.spiritRootElements = input.spiritRootElements
      player.originTitle = input.originTitle
      player.originSummary = input.originSummary
      this.player = player
      this.activeGongfaId = starter.id
      this.gongfaList = [starter]
      this.worldTime = createInitialWorldTime()
      useDongfuStore().resetState()
      this.save()
    },
    /** 重置存档 */
    resetSave() {
      localStorage.removeItem(SAVE_KEY)
      const starter = createGongfaFromTemplate('gongfa_qingmu')
      this.player = createDefaultPlayer()
      this.activeGongfaId = starter.id
      this.gongfaList = [starter]
      this.worldTime = createInitialWorldTime()
      useDongfuStore().resetState()
    },
  },
})
