import { defineStore } from 'pinia'
import router from '@/router'
import {
  getRealmXiuweiRoom,
  isRealmXiuweiFull,
  REALM_BREAKTHROUGH_XIUWEI,
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
import { WUXING_SUMMARY_GONGFA_ID } from '@/game/constants/wuxing-summary'
import {
  buildWuxingSummaryProgressInfo,
  buildWuxingSummaryUpgradeStatus,
  isWuxingSummaryGongfaLocked,
  settleWuxingSummaryOnLifeEnd,
  tryMarkWuxingSummaryLifeStep,
  upgradeWuxingSummaryQuality,
} from '@/game/systems/wuxing-summary'
import { buildEffectiveCombatStats } from '@/game/systems/stat-contributors'
import type { SkillProficiencyLevelUpResult } from '@/game/formulas/skill-proficiency'
import {
  addGongfaExp as applyGongfaExpGain,
  type GongfaLevelUpResult,
} from '@/game/systems/gongfa'
import {
  addPlayerSkillProficiency,
  buildBattleLoadoutDisplayItems,
  buildPlayerBattleSkillLoadout,
  buildPlayerSkillDisplayItems,
  clonePlayerSkillState,
  configureSkillLoadoutSlot,
  migratePlayerSkillStateFromGongfaList,
  syncLearnedSkillsFromGongfaList,
  toggleEquippedSkill,
  unequipSkillSlot,
} from '@/game/systems/player-skill-library'
import {
  countEquippedSkills,
  createDefaultPlayerSkillState,
  toSkillSlotArrayIndex,
  type PlayerSkillState,
} from '@/game/models/player-skill'
import {
  createDefaultFabaoState,
  type FabaoState,
} from '@/game/models/fabao'
import { buildFabaoDisplayItem } from '@/game/systems/fabao-combat'
import { equipFabao, unequipFabao } from '@/game/systems/fabao-equip'
import {
  getSkillById,
  getSkillLevelFromProficiency,
} from '@/game/models/skill'
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
  getTotalLingshi,
  listNonemptyLingshi,
} from '@/game/systems/inventory'
import { ELEMENT_COLORS } from '@/game/systems/spirit-root'
import {
  buyFromMarket,
  buySpecialFromMarket,
  sellAllSellableToMarket,
  sellAllToMarket,
  sellToMarket,
} from '@/game/systems/market'
import { createDefaultMarketState, type MarketState } from '@/game/models/market'
import { tickMarketTreasureRefresh } from '@/game/systems/market-refresh'
import { calcTotalGameDays } from '@/game/systems/time'
import {
  checkAndUnlockAchievements,
  syncUpgradeAchievements,
  unlockAchievementManually,
  type AchievementLevelUpResult,
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
  playerSkills: PlayerSkillState
  worldTime: WorldTime
  monsterTierPity: MonsterTierPityState
  reincarnation: ReincarnationState
  achievements: AchievementState
  titles: TitleState
  inventory: InventoryState
  market: MarketState
  fabao: FabaoState
}

function createInitialPlayerState(): PlayerState {
  const saved = loadSave()
  if (saved) {
    return {
      player: saved.player,
      activeGongfaId: saved.activeGongfaId,
      gongfaList: saved.gongfaList,
      playerSkills: saved.playerSkills ?? createDefaultPlayerSkillState(),
      worldTime: saved.worldTime,
      monsterTierPity: saved.monsterTierPity ?? createDefaultMonsterTierPityState(),
      reincarnation: saved.reincarnation ?? createDefaultReincarnationState(),
      achievements: saved.achievements ?? createDefaultAchievementState(),
      titles: saved.titles ?? createDefaultTitleState(),
      inventory: saved.inventory ?? createDefaultInventory(),
      market: saved.market ?? createDefaultMarketState(),
      fabao: saved.fabao ?? createDefaultFabaoState(),
    }
  }
  const defaults = createDefaultGameSave()
  return {
    player: defaults.player,
    activeGongfaId: defaults.activeGongfaId,
    gongfaList: defaults.gongfaList,
    playerSkills: defaults.playerSkills,
    worldTime: defaults.worldTime,
    monsterTierPity: defaults.monsterTierPity,
    reincarnation: defaults.reincarnation,
    achievements: defaults.achievements,
    titles: defaults.titles,
    inventory: defaults.inventory,
    market: defaults.market,
    fabao: defaults.fabao,
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
    /** 五行汇总功法解锁与升品进度 */
    wuxingSummaryProgress(state) {
      const activeGongfa = state.gongfaList.find((g) => g.id === state.activeGongfaId)
      return buildWuxingSummaryProgressInfo(state.reincarnation, activeGongfa, state.gongfaList)
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
    /** 灵石总量 */
    totalLingshi(state): number {
      return getTotalLingshi(state.inventory.lingshi)
    },
    /** 五行灵石展示列表（仅含余额 > 0 的属性） */
    lingshiDisplayItems(state) {
      return listNonemptyLingshi(state.inventory.lingshi).map((entry) => ({
        ...entry,
        color: ELEMENT_COLORS[entry.element],
        tagStyle: `color: ${ELEMENT_COLORS[entry.element]}; border-color: ${ELEMENT_COLORS[entry.element]};`,
      }))
    },
    /** 当前境界修为进度（角色信息 / 状态栏共用） */
    xiuweiSummary(state) {
      const realm = state.player.realm
      const required = REALM_BREAKTHROUGH_XIUWEI[realm]
      const current = state.player.xiuwei
      const percent = required > 0 ? Math.min(100, Math.floor((current / required) * 100)) : 0

      return {
        realm,
        current,
        required,
        percent,
        text: `${current} / ${required}`,
        progressBarStyle: `width: ${percent}%`,
      }
    },
    /** 有效战斗属性（境界 + 功法 + 被动 + 称号 + 轮回） */
    effectiveCombatStats(state) {
      return buildEffectiveCombatStats(
        state.player,
        {
          activeGongfa: state.gongfaList.find((g) => g.id === state.activeGongfaId),
          gongfaList: state.gongfaList,
          equippedTitleId: state.titles.equippedTitleId,
          fabaoState: state.fabao,
        },
        undefined,
        state.reincarnation.combat,
        state.achievements,
      )
    },
    /** 技能库展示项 */
    skillLibraryItems(state) {
      return buildPlayerSkillDisplayItems(state.playerSkills, state.gongfaList)
    },
    /** 已装配战斗技能数量 */
    equippedSkillCount(state): number {
      return countEquippedSkills(state.playerSkills.equippedSkillSlots)
    },
    /** 6 栏战斗配置展示（含法器预留位） */
    battleLoadoutSlots(state) {
      return buildBattleLoadoutDisplayItems(state.playerSkills, state.fabao)
    },
    /** 当前战斗技能装载（仅技能栏已配置项，无 fallback） */
    battleSkillLoadout(state) {
      return buildPlayerBattleSkillLoadout(state.playerSkills, state.gongfaList)
    },
    /** 法器展示列表 */
    fabaoDisplayItems(state) {
      return state.fabao.owned.map(buildFabaoDisplayItem)
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
        playerSkills: this.playerSkills,
        fabao: this.fabao,
      }
      persistSave(data)
    },
    /** 构建战斗技能装载 */
    buildBattleSkillLoadout() {
      return buildPlayerBattleSkillLoadout(this.playerSkills, this.gongfaList)
    },
    /** 同步功法解锁到技能库 */
    syncPlayerSkillsFromGongfa() {
      syncLearnedSkillsFromGongfaList(this.playerSkills, this.gongfaList)
    },
    /** 切换技能战斗装配 */
    toggleSkillEquip(skillId: string): { success: boolean; message: string } {
      const nextState = clonePlayerSkillState(this.playerSkills)
      const result = toggleEquippedSkill(nextState, skillId)
      if (result.success) {
        this.playerSkills = nextState
        this.save()
      }
      return result
    },
    /** 清空指定技能栏 */
    clearSkillLoadoutSlot(globalSlotIndex: number): { success: boolean; message: string } {
      const skillSlotIndex = toSkillSlotArrayIndex(globalSlotIndex)
      if (skillSlotIndex == null) {
        return { success: false, message: '该栏位为法器位。' }
      }
      const nextState = clonePlayerSkillState(this.playerSkills)
      const result = unequipSkillSlot(nextState, skillSlotIndex)
      if (result.success) {
        this.playerSkills = nextState
        this.save()
      }
      return result
    },
    /** 将技能配置到指定栏位 */
    assignSkillToLoadoutSlot(
      globalSlotIndex: number,
      skillId: string,
    ): { success: boolean; message: string } {
      const nextState = clonePlayerSkillState(this.playerSkills)
      const result = configureSkillLoadoutSlot(nextState, globalSlotIndex, skillId)
      if (result.success) {
        this.playerSkills = nextState
        this.save()
      }
      return result
    },
    /** 构建有效战斗属性（供内部切换功法等场景） */
    buildEffectiveCombatStats() {
      return buildEffectiveCombatStats(
        this.player,
        {
          activeGongfa: this.activeGongfa,
          gongfaList: this.gongfaList,
          equippedTitleId: this.titles.equippedTitleId,
          fabaoState: this.fabao,
        },
        undefined,
        this.reincarnation.combat,
        this.achievements,
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
    /**
     * 历练中逃跑失败后累计计数并同步升级类成就
     * @param count 本回合失败次数
     */
    recordFleeFailures(count: number): AchievementLevelUpResult[] {
      if (count <= 0) return []

      this.achievements.counters.fleeFailures += count
      const levelUps = syncUpgradeAchievements(
        this.achievements,
        this.buildAchievementContext(),
      )

      if (levelUps.length > 0) {
        const oldEffective = this.effectiveCombatStats
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
      } else {
        this.save()
      }

      return levelUps
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
      settleWuxingSummaryOnLifeEnd(cycle)
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
    /**
     * 增加修为（不超过当前境界突破余量）
     * @returns 实际增加的修为点数
     */
    addXiuwei(amount: number): number {
      if (amount <= 0 || isRealmXiuweiFull(this.player)) return 0

      const room = getRealmXiuweiRoom(this.player)
      if (room <= 0) return 0

      const applied = Math.min(amount, room)
      this.player = {
        ...this.player,
        xiuwei: this.player.xiuwei + applied,
      }
      this.save()
      return applied
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
     * 批量增加技能熟练度（战斗回合结算，写入技能库并同步来源功法）
     */
    gainSkillProficiency(
      gains: Array<{ skillId: string; amount: number }>,
    ): SkillProficiencyLevelUpResult[] {
      if (gains.length === 0) return []

      const results: SkillProficiencyLevelUpResult[] = []
      const levelUps = new Map<string, ReturnType<typeof getSkillLevelFromProficiency>>()
      let gongfaListChanged = false

      for (const { skillId, amount } of gains) {
        if (amount <= 0) continue

        const record = this.playerSkills.learned[skillId]
        const skill = getSkillById(skillId)
        if (!record || !skill) continue

        const sourceGongfa = this.gongfaList.find((g) => g.id === record.sourceGongfaId)
        const quality = sourceGongfa?.quality ?? '凡品'
        const previousProficiency = record.proficiency
        const previousLevel = levelUps.get(skillId)
          ?? getSkillLevelFromProficiency(previousProficiency, quality)

        const updated = addPlayerSkillProficiency(
          this.playerSkills,
          this.gongfaList,
          skillId,
          amount,
        )
        if (!updated) continue

        gongfaListChanged = true
        const newLevel = getSkillLevelFromProficiency(updated.record.proficiency, quality)
        if (newLevel !== previousLevel) {
          levelUps.set(skillId, newLevel)
          results.push({
            skillId,
            skillName: skill.name,
            previousLevel,
            newLevel,
            proficiency: updated.record.proficiency,
            message: `「${skill.name}」熟练度提升，达到${newLevel}！`,
          })
        }
      }

      if (gongfaListChanged || results.length > 0) {
        this.playerSkills = clonePlayerSkillState(this.playerSkills)
        this.gongfaList = [...this.gongfaList]
        this.save()
      }
      return results
    },
    gainGongfaExp(gongfaId: string, expGain: number): GongfaLevelUpResult | null {
      const index = this.gongfaList.findIndex((g) => g.id === gongfaId)
      if (index < 0 || expGain <= 0) return null

      const gongfa = this.gongfaList[index]
      const result = applyGongfaExpGain(gongfa, expGain)
      this.syncPlayerSkillsFromGongfa()
      if (gongfa.level >= gongfa.maxLevel) {
        const cycle = Reincarnation.fromState(this.reincarnation)
        if (tryMarkWuxingSummaryLifeStep(gongfa, cycle)) {
          this.reincarnation = cycle.toState()
        }
      }
      this.gongfaList[index] = { ...gongfa }
      this.playerSkills = clonePlayerSkillState(this.playerSkills)
      this.processAchievementMilestones()
      this.save()
      return result
    },
    /**
     * 尝试领悟《五行归元诀》（解锁条件满足且未拥有时）
     */
    tryGrantWuxingSummaryGongfa(): { granted: boolean; message: string } {
      if (!this.reincarnation.wuxingSummaryUnlocked) {
        return { granted: false, message: '尚未完成五世相生修炼。' }
      }
      if (this.gongfaList.some((g) => g.id === WUXING_SUMMARY_GONGFA_ID)) {
        return { granted: false, message: '已领悟《五行归元诀》。' }
      }

      const gongfa = createGongfaFromTemplate(WUXING_SUMMARY_GONGFA_ID)
      this.gongfaList.push(gongfa)
      this.processAchievementMilestones()
      this.save()
      return { granted: true, message: '领悟功法「五行归元诀」！' }
    },
    /**
     * 五行汇总功法升品阶
     */
    upgradeWuxingSummaryGongfa(gongfaId: string): { success: boolean; message: string } {
      const index = this.gongfaList.findIndex((g) => g.id === gongfaId)
      if (index < 0) {
        return { success: false, message: '未找到该功法。' }
      }

      const gongfa = this.gongfaList[index]
      const result = upgradeWuxingSummaryQuality(gongfa, this.gongfaList)
      if (result.success) {
        this.gongfaList[index] = { ...gongfa }
        if (this.activeGongfaId === gongfaId) {
          const oldEffective = this.effectiveCombatStats
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
        }
        this.save()
      }
      return result
    },
    /**
     * 获取五行归元诀升品阶状态
     */
    getWuxingSummaryUpgradeStatus(gongfaId: string) {
      const gongfa = this.gongfaList.find((item) => item.id === gongfaId)
      if (!gongfa) return null
      return buildWuxingSummaryUpgradeStatus(gongfa, this.gongfaList)
    },
    tryObtainGongfa(templateId: string): {
      obtained: boolean
      gongfaName: string
      duplicate: boolean
      locked?: boolean
    } {
      const template = getGongfaTemplate(templateId)
      const gongfaName = template?.name ?? '未知功法'

      if (isWuxingSummaryGongfaLocked(templateId, this.reincarnation)) {
        return { obtained: false, gongfaName, duplicate: false, locked: true }
      }

      if (this.gongfaList.some((g) => g.id === templateId)) {
        return { obtained: false, gongfaName, duplicate: true }
      }

      const gongfa = createGongfaFromTemplate(templateId)
      this.gongfaList.push(gongfa)
      this.syncPlayerSkillsFromGongfa()
      this.playerSkills = clonePlayerSkillState(this.playerSkills)
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
      this.tryGrantWuxingSummaryGongfa()
      this.playerSkills = migratePlayerSkillStateFromGongfaList(this.gongfaList)
      this.save()
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
      const grantResult = this.tryGrantWuxingSummaryGongfa()
      if (grantResult.granted) {
        void import('@/stores/game').then(({ useGameStore }) => {
          useGameStore().lastMessage = grantResult.message
        })
      }
      this.playerSkills = migratePlayerSkillStateFromGongfaList(this.gongfaList)
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
    /** 获得指定属性的灵石 */
    gainLingshi(amount: number, element: ElementType) {
      const gained = addLingshi(this.inventory, amount, element)
      if (gained > 0) {
        this.save()
      }
      return gained
    },
    /** 同步法器状态（战斗后灵力消耗等） */
    syncFabaoState(fabaoState: FabaoState) {
      this.fabao = { ...fabaoState, owned: [...fabaoState.owned] }
      this.save()
    },
    /** 装备法器 */
    equipFabaoItem(fabaoId: string) {
      const result = equipFabao(this.fabao, fabaoId)
      if (result.success && result.fabaoState) {
        this.fabao = result.fabaoState
        this.save()
      }
      return result
    },
    /** 卸下法器 */
    unequipFabaoItem(type: '攻击' | '防御') {
      const result = unequipFabao(this.fabao, type)
      if (result.success && result.fabaoState) {
        this.fabao = result.fabaoState
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
    /** 坊市出售该物品全部数量 */
    sellAllInventoryItem(itemId: string) {
      const result = sellAllToMarket(this.inventory, itemId)
      if (result.success) {
        this.save()
      }
      return result
    },
    /** 坊市批量出售全部可售物品 */
    sellAllSellableInventoryItems() {
      const result = sellAllSellableToMarket(this.inventory)
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
      this.playerSkills = migratePlayerSkillStateFromGongfaList([starter])
      this.fabao = createDefaultFabaoState()
      useDongfuStore().resetState()
    },
  },
})
