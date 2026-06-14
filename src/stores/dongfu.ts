import { defineStore } from 'pinia'
import {
  buildDongfuDisplay,
  createDefaultDongfu,
  type Dongfu,
} from '@/game/models/dongfu'
import { applyLingqiRecovery } from '@/game/systems/lingqi'
import { checkDongfuUpgrade, upgradeDongfu } from '@/game/systems/dongfu-upgrade'
import {
  checkZhenfaBlueprintUnlock,
  checkZhenfaSetup,
  setupZhenfa,
  unlockZhenfaFromBlueprint,
} from '@/game/systems/zhenfa-setup'
import {
  checkFabaoBlueprintUnlock,
  checkFabaoCraft,
  craftFabao,
  unlockFabaoFromBlueprint,
} from '@/game/systems/fabao-craft'
import {
  rechargeAllFabaosFromDongfu,
  rechargeFabaoFromDongfu,
} from '@/game/systems/fabao-recharge'
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
 * 洞府与修炼状态
 */
export const useDongfuStore = defineStore('dongfu', {
  state: (): DongfuState => createInitialDongfuState(),
  getters: {
    /** 洞府展示信息 */
    dongfuDisplay(state) {
      return buildDongfuDisplay(state.dongfu, usePlayerStore().inventory)
    },
    /** 是否修炼中 */
    isCultivating(state): boolean {
      return state.idle.isRunning
    },
    /** 修炼状态文案 */
    idleStatusText(state): string {
      if (!state.idle.isRunning) return '未修炼'
      return state.idle.mode === 'gongfa' ? '功法修炼中' : '修为修炼中'
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

      const playerStore = usePlayerStore()
      const result = applyLingqiRecovery(this.dongfu, elapsed, false, now, playerStore.inventory)
      this.dongfu = result.dongfu
      playerStore.save()
    },
    /**
     * 暂停灵气恢复计时：先结算在线时段，再冻结锚点
     */
    pauseLingqiRecoveryClock(now = Date.now()) {
      this.tickLingqiRecovery(now)
    },
    /**
     * 恢复灵气恢复计时（不把关闭标签/浏览器间隔折算为恢复量）
     */
    resumeLingqiRecoveryClock(now = Date.now()) {
      this.dongfu = {
        ...this.dongfu,
        lastLingqiTickAt: now,
      }
      usePlayerStore().save()
    },
    /** 检测洞府是否可升级 */
    checkUpgrade() {
      const playerStore = usePlayerStore()
      return checkDongfuUpgrade(this.dongfu, playerStore.inventory)
    },
    /** 升级洞府 */
    upgradeDongfuLevel() {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法升级洞府' }
      }

      const playerStore = usePlayerStore()
      const result = upgradeDongfu(this.dongfu, playerStore.inventory)

      if (result.success && result.dongfu) {
        this.dongfu = result.dongfu
        playerStore.save()
      }

      return result
    },
    /** 检测是否可参悟阵法图纸 */
    checkZhenfaUnlock() {
      const playerStore = usePlayerStore()
      return checkZhenfaBlueprintUnlock(this.dongfu, playerStore.inventory)
    },
    /** 检测是否可布阵/升阵 */
    checkZhenfaDeploy() {
      const playerStore = usePlayerStore()
      return checkZhenfaSetup(this.dongfu, playerStore.inventory)
    },
    /** 参悟阵法图纸 */
    unlockZhenfaBlueprint(blueprintItemId?: string) {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法参悟图纸' }
      }

      const playerStore = usePlayerStore()
      const result = unlockZhenfaFromBlueprint(this.dongfu, playerStore.inventory, blueprintItemId)

      if (result.success && result.dongfu) {
        this.dongfu = result.dongfu
        playerStore.save()
      }

      return result
    },
    /** 布阵/升阵 */
    deployZhenfa() {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法布阵' }
      }

      const playerStore = usePlayerStore()
      const result = setupZhenfa(this.dongfu, playerStore.inventory)

      if (result.success && result.dongfu) {
        this.dongfu = result.dongfu
        playerStore.save()
      }

      return result
    },
    /** 检测是否可参悟法器图纸 */
    checkFabaoBlueprintUnlock(blueprintItemId: string) {
      const playerStore = usePlayerStore()
      return checkFabaoBlueprintUnlock(playerStore.fabao, playerStore.inventory, blueprintItemId)
    },
    /** 参悟法器图纸 */
    unlockFabaoBlueprint(blueprintItemId: string) {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法参悟图纸' }
      }

      const playerStore = usePlayerStore()
      const result = unlockFabaoFromBlueprint(
        playerStore.fabao,
        playerStore.inventory,
        blueprintItemId,
      )

      if (result.success && result.fabaoState) {
        playerStore.fabao = result.fabaoState
        playerStore.save()
      }

      return result
    },
    /** 检测是否可炼制法器 */
    checkFabaoCraft(templateId: string) {
      const playerStore = usePlayerStore()
      return checkFabaoCraft(this.dongfu, playerStore.fabao, playerStore.inventory, templateId)
    },
    /** 炼制法器 */
    craftFabaoItem(templateId: string) {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法炼器' }
      }

      const playerStore = usePlayerStore()
      const result = craftFabao(
        this.dongfu,
        playerStore.fabao,
        playerStore.inventory,
        templateId,
      )

      if (result.success && result.fabaoState) {
        playerStore.fabao = result.fabaoState
        playerStore.save()
      }

      return result
    },
    /** 为单个法器充能 */
    rechargeFabaoItem(fabaoId: string) {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法充能' }
      }

      const playerStore = usePlayerStore()
      const result = rechargeFabaoFromDongfu(this.dongfu, playerStore.fabao, fabaoId)

      if (result.success && result.dongfu && result.fabaoState) {
        this.dongfu = result.dongfu
        playerStore.fabao = result.fabaoState
        playerStore.save()
      }

      return result
    },
    /** 为全部法器充能 */
    rechargeAllFabaos() {
      if (this.idle.isRunning) {
        return { success: false, message: '修炼期间无法充能' }
      }

      const playerStore = usePlayerStore()
      const result = rechargeAllFabaosFromDongfu(this.dongfu, playerStore.fabao)

      if (result.success && result.dongfu && result.fabaoState) {
        this.dongfu = result.dongfu
        playerStore.fabao = result.fabaoState
        playerStore.save()
      }

      return result
    },
    /** 重置洞府与闭关状态 */
    resetState() {
      this.dongfu = createDefaultDongfu()
      this.idle = createDefaultIdleState()
    },
  },
})
