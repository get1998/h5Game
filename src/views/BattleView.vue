<script setup lang="ts">
import { computed } from 'vue'
import GameLayout from '@/components/layout/GameLayout.vue'
import LogPanel from '@/components/LogPanel.vue'
import MapCanvas from '@/components/MapCanvas/index.vue'
import { TRAINING_MAPS } from '@/game/constants/maps'
import { getMonsterCombatElement } from '@/game/models/monster'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'

const gameStore = useGameStore()
const playerStore = usePlayerStore()

const mapList = computed(() =>
  TRAINING_MAPS.map((map) => {
    const unlocked = gameStore.canEnterMap(map.id)
    const selected = gameStore.selectedMapId === map.id
    return {
      id: map.id,
      name: map.name,
      description: map.description,
      requiredRealm: map.requiredRealm,
      unlocked,
      selected,
    }
  }),
)

/** 当前选中地图详情（Canvas 下方展示） */
const selectedMapDetail = computed(() => {
  const id = gameStore.selectedMapId
  if (!id) return null
  return mapList.value.find((item) => item.id === id) ?? null
})

const battleInfo = computed(() => {
  const monster = gameStore.currentMonster
  if (!monster) {
    return {
      hasMonster: false,
      monsterName: '',
      realm: '',
      monsterKind: '',
      monsterElement: '',
      tier: '',
      status: '',
      statusHint: '',
      monsterHp: 0,
      monsterMaxHp: 0,
      hpBarStyle: 'width: 0%',
    }
  }
  const percent = Math.floor((monster.combat.hp / monster.combat.maxHp) * 100)
  return {
    realm: monster.realm,
    hasMonster: true,
    monsterName: monster.name,
    monsterKind: monster.kind,
    monsterElement: getMonsterCombatElement(monster),
    tier: monster.tier,
    status: monster.status,
    statusHint: monster.status !== '普通'
      ? `气血约 ${Math.round(monster.statusHpRatio * 100)}%`
      : '',
    hpBarStyle: `width: ${percent}%`,
    monsterHp: monster.combat.hp,
    monsterMaxHp: monster.combat.maxHp,
  }
})

const currentMapName = computed(() => gameStore.currentMap?.name ?? '未选择')

/** 玩家气血进度条宽度 */
const playerEffectiveCombat = computed(() => playerStore.effectiveCombatStats.combat)

const playerHpBarStyle = computed(() => {
  const { hp, maxHp } = playerEffectiveCombat.value
  const percent = maxHp > 0 ? Math.floor((hp / maxHp) * 100) : 0
  return `width: ${percent}%`
})

/** 玩家灵力进度条宽度 */
const playerMpBarStyle = computed(() => {
  const { mp, maxMp } = playerEffectiveCombat.value
  const percent = maxMp > 0 ? Math.floor((mp / maxMp) * 100) : 0
  return `width: ${percent}%`
})

const exploreButtonText = computed(() =>
  gameStore.isAutoExploring ? '结束历练' : '进入地图',
)

const exploreButtonClass = computed(() =>
  gameStore.isAutoExploring
    ? 'game-btn game-btn--danger'
    : 'game-btn game-btn--primary',
)

/** 战斗过程日志（伤害、闪避、系统等） */
const combatLogs = computed(() =>
  gameStore.battleLogs.filter((log) => log.type !== 'skill'),
)

/** 技能熟练度与等级晋升日志 */
const skillLogs = computed(() =>
  gameStore.battleLogs.filter((log) => log.type === 'skill'),
)

/** 战斗 / 技能日志 Tab 配置 */
const logTabs = computed(() => [
  { id: 'combat', label: '战斗日志', logs: combatLogs.value },
  { id: 'skill', label: '技能等级', logs: skillLogs.value },
])

/** 调息、重伤或修炼期间禁止历练操作 */
const isExploreLocked = computed(() =>
  gameStore.isRecoveryLocked || gameStore.isCultivationLocked,
)

/**
 * 选择历练地图
 */
function handleSelectMap(mapId: string) {
  if (isExploreLocked.value) return
  if (!gameStore.canEnterMap(mapId)) return
  gameStore.selectMap(mapId)
}

/**
 * 开始或结束自动历练
 */
function handleToggleExplore() {
  if (isExploreLocked.value) return
  if (gameStore.isAutoExploring) {
    gameStore.stopAutoExplore()
  } else {
    gameStore.startAutoExplore()
  }
}
</script>

<template>
  <GameLayout>
    <header class="page-header">
      <h1 class="game-title">历练</h1>
    </header>

    <section class="map-card game-card">
      <div class="page-section-title">历练地图</div>
      <p class="map-hint">点击节点选择地图，进入后将自动遇怪并自动战斗。</p>
      <MapCanvas
        :nodes="mapList"
        :selected-id="gameStore.selectedMapId"
        :interaction-disabled="gameStore.isAutoExploring || isExploreLocked"
        @select="handleSelectMap"
      />
      <div v-if="selectedMapDetail" class="map-detail">
        <div class="map-detail__head">
          <span class="map-detail__name">{{ selectedMapDetail.name }}</span>
          <span v-if="!selectedMapDetail.unlocked" class="map-detail__lock">
            需 {{ selectedMapDetail.requiredRealm }}
          </span>
        </div>
        <p class="map-detail__desc">{{ selectedMapDetail.description }}</p>
      </div>
      <p v-else class="map-detail-empty">请点击地图节点选择历练地点</p>
    </section>

    <!-- <BattleCanvas /> -->

    <section class="battle-card game-card">
      <div class="page-section-title">当前历练</div>
      <div class="stat-row">
        <span class="stat-label">地图</span>
        <span class="stat-value">{{ currentMapName }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">状态</span>
        <span class="stat-value">{{ gameStore.exploreStatusText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">气血</span>
        <span class="stat-value">
          {{ playerEffectiveCombat.hp }} / {{ playerEffectiveCombat.maxHp }}
        </span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill progress-bar__fill--hp" :style="playerHpBarStyle" />
      </div>
      <div class="stat-row">
        <span class="stat-label">灵力</span>
        <span class="stat-value">
          {{ playerEffectiveCombat.mp }} / {{ playerEffectiveCombat.maxMp }}
        </span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill progress-bar__fill--mp" :style="playerMpBarStyle" />
      </div>

      <div class="page-section-title battle-enemy-title">当前敌人</div>
      <template v-if="battleInfo.hasMonster">
        <div class="stat-row">
          <span class="stat-label">名称</span>
          <span class="stat-value">【{{ battleInfo.monsterKind }}】{{ battleInfo.monsterName }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">境界</span>
          <span class="stat-value">【{{ battleInfo.tier }}】{{ battleInfo.realm }}</span>
        </div>
        <div v-if="battleInfo.statusHint" class="stat-row">
          <span class="stat-label">状态</span>
          <span class="stat-value stat-value--bargain">{{ battleInfo.status }}（{{ battleInfo.statusHint }}）</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">五行</span>
          <span class="stat-value">{{ battleInfo.monsterElement }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">气血</span>
          <span class="stat-value">{{ battleInfo.monsterHp }} / {{ battleInfo.monsterMaxHp }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill progress-bar__fill--danger" :style="battleInfo.hpBarStyle" />
        </div>
      </template>
      <p v-else class="battle-empty">进入地图后将自动遇怪</p>

      <p v-if="gameStore.lastMessage" class="battle-message">{{ gameStore.lastMessage }}</p>

      <button
        :class="exploreButtonClass"
        class="battle-action-btn"
        :disabled="isExploreLocked"
        @click="handleToggleExplore"
      >
        {{ exploreButtonText }}
      </button>
    </section>

    <section class="battle-log-section">
      <LogPanel :tabs="logTabs" default-tab="combat" />
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.page-header {
  margin-bottom: 16px;
}

.map-card {
  margin-bottom: 16px;
}

.map-hint {
  color: $color-text-muted;
  font-size: 13px;
  margin-bottom: 12px;
}

.map-detail {
  margin-top: 12px;
  padding: 12px;
  border-radius: $radius-sm;
  border: 1px solid $color-border;
  background: $color-bg-elevated;
}

.map-detail__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-detail__name {
  font-weight: 600;
  color: $color-text;
}

.map-detail__lock {
  font-size: 12px;
  color: $color-danger;
}

.map-detail__desc {
  margin-top: 6px;
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.4;
}

.map-detail-empty {
  margin-top: 12px;
  font-size: 13px;
  color: $color-text-muted;
  text-align: center;
}

.battle-card {
  margin-top: 16px;
}

.battle-enemy-title {
  margin-top: 14px;
  margin-bottom: 8px;
}

.stat-value--bargain {
  color: $color-success;
  font-weight: 600;
}

.battle-empty {
  color: $color-text-muted;
  font-size: 13px;
}

.battle-message {
  margin-top: 10px;
  font-size: 13px;
  color: $color-primary;
}

.progress-bar {
  height: 6px;
  background: $color-bg-elevated;
  border-radius: 3px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: $color-success;
  border-radius: 3px;
  transition: width 0.2s;
}

.progress-bar__fill--hp {
  background: $color-success;
}

.progress-bar__fill--danger {
  background: $color-danger;
}

.progress-bar__fill--mp {
  background: $color-info;
}

.battle-action-btn {
  width: 100%;
  margin-top: 16px;
}

.battle-log-section {
  margin-top: 16px;
}
</style>
