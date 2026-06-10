import { defineStore } from 'pinia'
import router from '@/router'
import {
  getRealmXiuweiRoom,
  isRealmXiuweiFull,
} from '@/game/constants/realm'
import { applyRealmBaseToPlayer, createDefaultPlayer, type Player } from '@/game/models/player'
import {
  createDefaultReincarnationState,
  isPlayerLifespanEnded,
  Reincarnation,
  type ReincarnationState,
} from '@/game/models/reincarnation'
import {
  createGongfaFromTemplate,
  getGongfaTemplate,
  type Gongfa,
} from '@/game/models/gongfa'
import { buildEffectiveCombatStats } from '@/game/systems/stat-contributors'
import type { SkillProficiencyLevelUpResult } from '@/game/formulas/skill-proficiency'
import {
  addGongfaExp as applyGongfaExpGain,
  type GongfaLevelUpResult,
} from '@/game/systems/gongfa'
import { addSkillProficiencyBatch } from '@/game/systems/skill-proficiency'
import { REAL_MS_PER_GAME_DAY } from '@/game/constants/time'
import {
  advanceWorldTime,
  calcGameDaysFromRealMs,
  createInitialWorldTime,
  formatGameDate,
  syncWorldTimeAnchor,
  type WorldTime,
} from '@/game/systems/time'
import {
  createDefaultAchievementState,
  type AchievementState,
} from '@/game/models/achievement'
import {
  createDefaultMonsterTierPityState,
  type MonsterTierPityState,
} from '@/game/models/monster'
import {
  createDefaultTitleState,
  type TitleState,
} from '@/game/models/title'
import {
  createDefaultInventory,
  type InventoryState,
} from '@/game/models/item'
import {
  addItemToInventory,
  addLingshi,
  useConsumableItem,
} from '@/game/systems/inventory'
import { buyFromMarket, buySpecialFromMarket, sellToMarket } from '@/game/systems/market'
import { createDefaultMarketState, type MarketState } from '@/game/models/market'
import { tickMarketTreasureRefresh } from '@/game/systems/market-refresh'
import { calcTotalGameDays } from '@/game/systems/time'
import {
  checkAndUnlockAchievements,
  unlockAchievementManually,
  type AchievementUnlockResult,
} from '@/game/systems/achievement'
import { equipTitle, getEquippedTitleName, unlockTitles } from '@/game/systems/title'
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
  monsterTierPity: MonsterTierPityState
  reincarnation: ReincarnationState
  achievements: AchievementState
  titles: TitleState
  inventory: InventoryState
  market: MarketState
}

function createInitialPlayerState(): PlayerState {
  const saved = loadSave()
  if (saved) {
    return {
      player: saved.player,
      activeGongfaId: saved.activeGongfaId,
      gongfaList: saved.gongfaList,
      worldTime: saved.worldTime,
      monsterTierPity: saved.monsterTierPity ?? createDefaultMonsterTierPityState(),
      reincarnation: saved.reincarnation ?? createDefaultReincarnationState(),
      achievements: saved.achievements ?? createDefaultAchievementState(),
      titles: saved.titles ?? createDefaultTitleState(),
      inventory: saved.inventory ?? createDefaultInventory(),
      market: saved.market ?? createDefaultMarketState(),
    }
  }
  const defaults = createDefaultGameSave()
  return {
    player: defaults.player,
    activeGongfaId: defaults.activeGongfaId,
    gongfaList: defaults.gongfaList,
    worldTime: defaults.worldTime,
    monsterTierPity: defaults.monsterTierPity,
    reincarnation: defaults.reincarnation,
    achievements: defaults.achievements,
    titles: defaults.titles,
    inventory: defaults.inventory,
    market: defaults.market,
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
    /** 寿元已尽，等待再入轮回 */
    isAwaitingReincarnation(state): boolean {
      return state.reincarnation.isAwaitingReincarnation
    },
    /** 下一世序号（寿元尽后为当前世 + 1） */
    nextReincarnationGeneration(state): number {
      return state.reincarnation.generation + (state.reincarnation.isAwaitingReincarnation ? 1 : 0)
    },
    /** 当前佩戴称号名称 */
    equippedTitleText(state): string | null {
      return getEquippedTitleName(state.titles)
    },
    /** 有效战斗属性（境界 + 功法 + 被动 + 称号 + 轮回） */
    effectiveCombatStats(state) {
      return buildEffectiveCombatStats(
        state.player,
        {
          activeGongfa: state.gongfaList.find((g) => g.id === state.activeGongfaId),
          gongfaList: state.gongfaList,
          equippedTitleId: state.titles.equippedTitleId,
        },
        undefined,
        state.reincarnation.combat,
      )
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
        monsterTierPity: this.monsterTierPity,
        reincarnation: this.reincarnation,
        achievements: this.achievements,
        titles: this.titles,
        inventory: this.inventory,
        market: this.market,
      }
      persistSave(data)
    },
    /** 构建有效战斗属性（供内部切换功法等场景） */
    buildEffectiveCombatStats() {
      return buildEffectiveCombatStats(
        this.player,
        {
          activeGongfa: this.activeGongfa,
          gongfaList: this.gongfaList,
          equippedTitleId: this.titles.equippedTitleId,
        },
        undefined,
        this.reincarnation.combat,
      )
    },
    /** 成就检测上下文 */
    buildAchievementContext() {
      return {
        player: this.player,
        gongfaList: this.gongfaList,
        worldTime: this.worldTime,
      }
    },
    /**
     * 检测并解锁成就，同步奖励称号
     * @param manualId 手动解锁的成就 id（如角色创建完成）
     */
    processAchievementMilestones(manualId?: string): AchievementUnlockResult[] {
      const context = this.buildAchievementContext()
      const unlocked: AchievementUnlockResult[] = []

      if (manualId) {
        const manual = unlockAchievementManually(this.achievements, manualId, context)
        if (manual) unlocked.push(manual)
      }

      unlocked.push(...checkAndUnlockAchievements(this.achievements, context))

      if (unlocked.length === 0) return []

      const titleIds = unlocked
        .map((item) => item.rewardTitleId)
        .filter((id): id is string => Boolean(id))
      unlockTitles(this.titles, titleIds)

      if (!this.titles.equippedTitleId && titleIds.length > 0) {
        equipTitle(this.titles, titleIds[0])
      }

      if (unlocked.length > 0 || manualId) {
        this.save()
      }
      return unlocked
    },
    /** 历练战胜妖兽后累计计数并检测成就 */
    recordBattleWin(): AchievementUnlockResult[] {
      this.achievements.counters.battleWins += 1
      const results = this.processAchievementMilestones()
      this.save()
      return results
    },
    /** 佩戴或卸下称号 */
    setEquippedTitle(titleId: string | null) {
      const oldEffective = this.effectiveCombatStats
      const result = equipTitle(this.titles, titleId)
      if (!result.success) return result

      const newEffective = this.buildEffectiveCombatStats()
      const hpRatio = oldEffective.combat.maxHp > 0
        ? this.player.combat.hp / oldEffective.combat.maxHp
        : 1
      const mpRatio = oldEffective.combat.maxMp > 0
        ? this.player.combat.mp / oldEffective.combat.maxMp
        : 1

      this.player.combat.hp = Math.max(
        1,
        Math.min(newEffective.combat.maxHp, Math.floor(newEffective.combat.maxHp * hpRatio)),
      )
      this.player.combat.mp = Math.max(
        0,
        Math.min(newEffective.combat.maxMp, Math.floor(newEffective.combat.maxMp * mpRatio)),
      )
      this.save()
      return result
    },
    /**
     * 检测寿元是否用尽；若用尽则结算轮回并返回开始页
     */
    checkAndSettleLifespanEnd() {
      if (!isPlayerLifespanEnded(this.player)) return false
      this.triggerLifespanEnd()
      return true
    },
    /** 寿元用尽：累加轮回加成并标记待入轮回 */
    triggerLifespanEnd() {
      if (this.reincarnation.isAwaitingReincarnation) return

      const cycle = Reincarnation.fromState(this.reincarnation)
      cycle.settlePreviousLife(this.player)
      this.reincarnation = cycle.toState()

      useDongfuStore().resetState()
      void import('@/stores/game').then(({ useGameStore }) => {
        useGameStore().resetGame()
      })
      this.save()

      if (router.currentRoute.value.path !== '/') {
        router.push('/')
      }
    },
    /**
     * 削减寿元上限；若年龄已达或超过寿元则触发寿元用尽
     * @returns applied 是否实际扣减；lifespanEnded 是否因此寿尽
     */
    reduceLifespan(years: number): { applied: boolean; lifespanEnded: boolean } {
      if (years <= 0) {
        return { applied: false, lifespanEnded: false }
      }

      this.player.lifespan = Math.max(0, this.player.lifespan - years)
      this.save()

      if (isPlayerLifespanEnded(this.player)) {
        this.triggerLifespanEnd()
        return { applied: true, lifespanEnded: true }
      }
      return { applied: true, lifespanEnded: false }
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
        if (isPlayerLifespanEnded(this.player)) {
          this.triggerLifespanEnd()
          return days
        }
      }
      this.refreshMarketTreasures()
      this.save()
      return days
    },
    /** 按当前游戏日刷新坊市稀世寄售 */
    refreshMarketTreasures() {
      const dongfuStore = useDongfuStore()
      tickMarketTreasureRefresh(
        this.market,
        dongfuStore.dongfu.level,
        calcTotalGameDays(this.worldTime),
      )
    },
    /** 坊市稀世寄售购入 */
    buySpecialMarketItem(itemId: string) {
      const dongfuStore = useDongfuStore()
      const result = buySpecialFromMarket(
        this.market,
        this.inventory,
        itemId,
        dongfuStore.dongfu.level,
      )
      if (result.success) {
        this.save()
      }
      return result
    },
    /**
     * 根据现实经过时间推进游戏日（仅在线时段结算，关闭标签/浏览器后重开不计）
     */
    tickWorldTimeFromRealElapsed(
      elapsedMs: number,
      msPerDay = REAL_MS_PER_GAME_DAY,
    ) {
      const days = calcGameDaysFromRealMs(elapsedMs, msPerDay)
      if (days <= 0) return 0
      return this.advanceWorldTimeByDays(days)
    },
    /**
     * 恢复世界时间流逝（进入游戏时调用）
     * 不把关闭标签/浏览器期间的现实时间折算为游戏日。
     */
    resumeWorldTimeClock(now = Date.now()) {
      this.worldTime = syncWorldTimeAnchor(this.worldTime, now)
      this.save()
    },
    /**
     * 暂停世界时间（离开游戏或关闭标签/浏览器时调用）
     * 先结算暂停前尚未入账的在线时长，再冻结锚点。
     */
    pauseWorldTimeClock(now = Date.now()) {
      const elapsed = now - this.worldTime.lastRealTickAt
      if (elapsed > 0) {
        this.tickWorldTimeFromRealElapsed(elapsed)
      }
      this.worldTime = syncWorldTimeAnchor(this.worldTime, now)
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
    /** 增加修为（不超过当前境界突破余量） */
    addXiuwei(amount: number) {
      if (amount <= 0 || isRealmXiuweiFull(this.player)) return

      const room = getRealmXiuweiRoom(this.player)
      if (room <= 0) return

      this.player.xiuwei += Math.min(amount, room)
      this.save()
    },
    /** 突破境界 */
    breakthrough(newRealm: Player['realm']): AchievementUnlockResult[] {
      applyRealmBaseToPlayer(this.player, newRealm, this.activeGongfa)
      Reincarnation.fromState(this.reincarnation).applyToPlayer(this.player)
      this.player.xiuwei = 0
      this.player.breakthroughFailures = 0
      this.achievements.counters.breakthroughs += 1
      this.restoreFullResources()
      return this.processAchievementMilestones()
    },
    /** 记录突破失败：累加失败次数并扣减修为 */
    recordBreakthroughFailure(xiuweiLoss: number) {
      this.player.breakthroughFailures += 1
      if (xiuweiLoss > 0) {
        this.player.xiuwei = Math.max(0, this.player.xiuwei - xiuweiLoss)
      }
      this.save()
    },
    /** 更新气血（按有效气血上限截断） */
    setHp(hp: number) {
      const maxHp = this.effectiveCombatStats.combat.maxHp
      this.player.combat.hp = Math.min(maxHp, Math.max(0, hp))
      this.save()
    },
    /** 更新灵力（按有效灵力上限截断） */
    setMp(mp: number) {
      const maxMp = this.effectiveCombatStats.combat.maxMp
      this.player.combat.mp = Math.min(maxMp, Math.max(0, mp))
      this.save()
    },
    /** 按有效上限回满气血与灵力 */
    restoreFullResources() {
      const { maxHp, maxMp } = this.effectiveCombatStats.combat
      this.player.combat.hp = maxHp
      this.player.combat.mp = maxMp
      this.save()
    },
    /** 切换功法 */
    switchGongfa(gongfaId: string) {
      if (useDongfuStore().idle.isRunning) return
      if (!this.gongfaList.some((g) => g.id === gongfaId)) return
      if (gongfaId === this.activeGongfaId) return

      const oldEffective = this.effectiveCombatStats
      this.activeGongfaId = gongfaId
      const newEffective = this.buildEffectiveCombatStats()

      const hpRatio = oldEffective.combat.maxHp > 0
        ? this.player.combat.hp / oldEffective.combat.maxHp
        : 1
      const mpRatio = oldEffective.combat.maxMp > 0
        ? this.player.combat.mp / oldEffective.combat.maxMp
        : 1

      this.player.combat.hp = Math.max(
        1,
        Math.min(
          newEffective.combat.maxHp,
          Math.floor(newEffective.combat.maxHp * hpRatio),
        ),
      )
      this.player.combat.mp = Math.max(
        0,
        Math.min(
          newEffective.combat.maxMp,
          Math.floor(newEffective.combat.maxMp * mpRatio),
        ),
      )
      this.save()
    },
    /**
     * 为指定功法增加经验并触发界面更新
     * @param gongfaId 功法 id
     * @param expGain 经验增量
     */
    /**
     * 批量增加技能熟练度（战斗回合结算）
     */
    gainSkillProficiency(
      gongfaId: string,
      gains: Array<{ skillId: string; amount: number }>,
    ): SkillProficiencyLevelUpResult[] {
      const index = this.gongfaList.findIndex((g) => g.id === gongfaId)
      if (index < 0 || gains.length === 0) return []

      const gongfa = this.gongfaList[index]
      const results = addSkillProficiencyBatch(gongfa, gains)
      if (results.length > 0 || gains.some((item) => item.amount > 0)) {
        this.gongfaList[index] = { ...gongfa }
        this.save()
      }
      return results
    },
    gainGongfaExp(gongfaId: string, expGain: number): GongfaLevelUpResult | null {
      const index = this.gongfaList.findIndex((g) => g.id === gongfaId)
      if (index < 0 || expGain <= 0) return null

      const gongfa = this.gongfaList[index]
      const result = applyGongfaExpGain(gongfa, expGain)
      this.gongfaList[index] = { ...gongfa }
      this.processAchievementMilestones()
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
      this.processAchievementMilestones()
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
      applyRealmBaseToPlayer(player, player.realm, starter)
      this.player = player
      this.activeGongfaId = starter.id
      this.gongfaList = [starter]
      this.worldTime = createInitialWorldTime()
      this.monsterTierPity = createDefaultMonsterTierPityState()
      this.achievements = createDefaultAchievementState()
      this.titles = createDefaultTitleState()
      this.inventory = createDefaultInventory()
      this.market = createDefaultMarketState()
      useDongfuStore().resetState()
      this.processAchievementMilestones('ach_first_step')
    },
    /**
     * 再入轮回：保留多世加成，重新创建角色
     */
    reincarnateCharacter(input: {
      name: string
      spiritRootType: SpiritRootType
      spiritRootElements: ElementType[]
      originTitle: string
      originSummary: string
      starterGongfaTemplateId: string
    }) {
      const cycle = Reincarnation.fromState(this.reincarnation)
      cycle.beginNewLife()

      const starter = createGongfaFromTemplate(input.starterGongfaTemplateId)
      const player = createDefaultPlayer(input.name)
      player.spiritRootType = input.spiritRootType
      player.spiritRootElements = input.spiritRootElements
      player.originTitle = input.originTitle
      player.originSummary = input.originSummary
      applyRealmBaseToPlayer(player, player.realm, starter)
      cycle.applyToPlayer(player)

      this.player = player
      this.activeGongfaId = starter.id
      this.gongfaList = [starter]
      this.worldTime = createInitialWorldTime()
      this.monsterTierPity = createDefaultMonsterTierPityState()
      this.reincarnation = cycle.toState()
      this.inventory = createDefaultInventory()
      this.market = createDefaultMarketState()
      useDongfuStore().resetState()
      this.restoreFullResources()
      this.save()
    },
    /** 向背包添加物品 */
    gainItem(itemId: string, count: number) {
      const result = addItemToInventory(this.inventory, itemId, count)
      if (result.added > 0) {
        this.save()
      }
      return result
    },
    /** 获得灵石 */
    gainLingshi(amount: number) {
      const gained = addLingshi(this.inventory, amount)
      if (gained > 0) {
        this.save()
      }
      return gained
    },
    /** 使用消耗品 */
    useItem(itemId: string) {
      const { combat } = this.effectiveCombatStats
      const result = useConsumableItem(
        this.inventory,
        this.player,
        itemId,
        combat.maxHp,
        combat.maxMp,
      )
      if (result.success) {
        this.save()
      }
      return result
    },
    /** 坊市购入 */
    buyMarketItem(itemId: string, count = 1) {
      const result = buyFromMarket(
        this.inventory,
        itemId,
        this.player.realm,
        count,
      )
      if (result.success) {
        this.save()
      }
      return result
    },
    /** 坊市出售 */
    sellInventoryItem(itemId: string, count = 1) {
      const result = sellToMarket(this.inventory, itemId, count)
      if (result.success) {
        this.save()
      }
      return result
    },
    /** 重置存档 */
    resetSave() {
      localStorage.removeItem(SAVE_KEY)
      const starter = createGongfaFromTemplate('gongfa_qingmu')
      this.player = createDefaultPlayer()
      this.activeGongfaId = starter.id
      this.gongfaList = [starter]
      this.worldTime = createInitialWorldTime()
      this.monsterTierPity = createDefaultMonsterTierPityState()
      this.reincarnation = createDefaultReincarnationState()
      this.achievements = createDefaultAchievementState()
      this.titles = createDefaultTitleState()
      this.inventory = createDefaultInventory()
      this.market = createDefaultMarketState()
      useDongfuStore().resetState()
    },
  },
})
