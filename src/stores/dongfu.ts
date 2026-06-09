import { defineStore } from 'pinia'
import {
  buildDongfuDisplay,
  createDefaultDongfu,
  type Dongfu,
} from '@/game/models/dongfu'
import { applyLingqiRecovery } from '@/game/systems/lingqi'
import type { IdleState } from '@/game/types'
import { createDefaultIdleState, loadSave } from '@/stores/save'
import { usePlayerStore } from '@/stores/player'

interface DongfuState {
  dongfu: Dongfu
  idle: IdleState
}

function createInitialDongfuState(): DongfuState {
  const saved = loadSave()
  if (saved) {
    return {
      dongfu: saved.dongfu,
      idle: saved.idle,
    }
  }
  return {
    dongfu: createDefaultDongfu(),
    idle: createDefaultIdleState(),
  }
}

/**
 * 洞府与闭关状态
 */
export const useDongfuStore = defineStore('dongfu', {
  state: (): DongfuState => createInitialDongfuState(),
  getters: {
    /** 洞府展示信息 */
    dongfuDisplay(state) {
      return buildDongfuDisplay(state.dongfu)
    },
    /** 是否闭关中 */
    isCultivating(state): boolean {
      return state.idle.isRunning
    },
    /** 闭关状态文案 */
    idleStatusText(): string {
      return this.isCultivating ? '闭关中' : '未闭关'
    },
  },
  actions: {
    /** 同步洞府灵气状态到存档 */
    syncDongfu(dongfu: Dongfu) {
      this.dongfu = { ...dongfu }
      usePlayerStore().save()
    },
    /** 同步闭关状态到存档 */
    syncIdleState(idle: IdleState) {
      this.idle = { ...idle }
      usePlayerStore().save()
    },
    /**
     * 结算非闭关期间的灵气恢复（洞府等级 + 阵法）
     */
    tickLingqiRecovery(now = Date.now()) {
      if (this.idle.isRunning) return

      const elapsed = Math.floor((now - this.dongfu.lastLingqiTickAt) / 1000)
      if (elapsed <= 0) return

      const result = applyLingqiRecovery(this.dongfu, elapsed, false, now)
      this.dongfu = result.dongfu
      usePlayerStore().save()
    },
    /** 重置洞府与闭关状态 */
    resetState() {
      this.dongfu = createDefaultDongfu()
      this.idle = createDefaultIdleState()
    },
  },
})
