<script setup lang="ts">
import { computed, ref } from 'vue'
import GameLayout from '@/components/layout/GameLayout.vue'
import { useDongfuStore } from '@/stores/dongfu'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'
import { calcCultivationRate, getLingqiCostPerXiuwei } from '@/game/systems/cultivation'
import { isRealmXiuweiFull } from '@/game/constants/realm'

const dongfuStore = useDongfuStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

const dongfuInfo = computed(() => dongfuStore.dongfuDisplay)

const lingqiBarStyle = computed(() => `width: ${dongfuInfo.value.lingqiPercent}%`)

const cultivationDetail = computed(() =>
  calcCultivationRate(
    playerStore.player,
    dongfuStore.dongfu,
    playerStore.activeGongfa,
    playerStore.reincarnation.cultivation,
  ),
)

const isXiuweiFull = computed(() => isRealmXiuweiFull(playerStore.player))

const cultivationRateText = computed(() => {
  if (isXiuweiFull.value) return '修为已满，请先突破'
  const rate = cultivationDetail.value.totalPerSec
  return rate > 0 ? `${rate.toFixed(2)} 修为 / 秒` : '灵气不足或未装备功法'
})

const absorptionRateText = computed(() => {
  const rate = cultivationDetail.value.absorptionPerSec
  return rate > 0 ? `${rate.toFixed(2)} 灵气 / 秒` : '—'
})

const conversionRateText = computed(() => {
  const rate = cultivationDetail.value.conversionPerLingqi
  return rate > 0 ? `${rate.toFixed(3)} 修为 / 灵气` : '—'
})

const lingqiCostPerXiuweiText = computed(() => {
  const cost = getLingqiCostPerXiuwei(
    playerStore.player,
    dongfuStore.dongfu,
    playerStore.activeGongfa,
    playerStore.reincarnation.cultivation,
  )
  return cost > 0 ? `${cost} 灵气` : '—'
})

const idleButtonText = computed(() =>
  gameStore.idle.isRunning ? '结束修炼' : '开始修炼',
)

const idleButtonClass = computed(() =>
  gameStore.idle.isRunning ? 'game-btn game-btn--danger' : 'game-btn game-btn--primary',
)

function toggleIdle() {
  if (gameStore.isRecoveryLocked) return
  if (gameStore.idle.isRunning) {
    gameStore.stopIdle()
  } else {
    gameStore.startIdle()
  }
}

const isIdleButtonDisabled = computed(() =>
  gameStore.isRecoveryLocked
  || (!gameStore.idle.isRunning && isXiuweiFull.value),
)

const dongfuUpgradeCheck = computed(() => dongfuStore.checkUpgrade())

const upgradeInfo = computed(() => {
  const info = dongfuInfo.value
  if (!info.nextLevel) {
    return {
      hasNext: false,
      summary: '已达最高等级',
      actionText: '已满级',
      actionDisabled: true,
    }
  }

  const check = dongfuUpgradeCheck.value
  const parts: string[] = [
    `下一级：Lv.${info.nextLevel}「${info.nextName}」`,
    `灵气上限 ${info.nextMaxLingqi}`,
  ]
  if (info.upgradeCostLingshi) {
    parts.push(`花费 ${info.upgradeCostLingshi} 灵石`)
  }
  if (info.upgradeTreasureName) {
    parts.push(`需「${info.upgradeTreasureName}」×1（持有 ${info.upgradeTreasureCount}）`)
  }

  const treasureHint = info.upgradeTreasureMinDropRealm && info.upgradeTreasureName
    ? `宝物历练掉落：击杀 ${info.upgradeTreasureMinDropRealm} 及以上境界怪物，品阶越高掉率越高；坊市偶现稀世寄售。`
    : ''

  return {
    hasNext: true,
    summary: parts.join(' · '),
    actionText: check.canUpgrade ? '升级洞府' : (check.reason ?? '不可升级'),
    actionDisabled: !check.canUpgrade || gameStore.isRecoveryLocked || gameStore.idle.isRunning,
    treasureHint,
  }
})

const upgradeMessage = ref('')

function handleUpgradeDongfu() {
  if (upgradeInfo.value.actionDisabled) return
  const result = dongfuStore.upgradeDongfuLevel()
  upgradeMessage.value = result.message
}
</script>

<template>
  <GameLayout>
    <header class="home-header">
      <h1 class="game-title">洞府</h1>
      <p class="home-header__subtitle">修炼悟道 · 吸纳灵气</p>
    </header>

    <section class="home-card game-card">
      <div class="page-section-title">洞府</div>
      <div class="stat-row">
        <span class="stat-label">洞府等级</span>
        <span class="stat-value">Lv.{{ dongfuInfo.level }} · {{ dongfuInfo.name }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">阵法</span>
        <span class="stat-value">
          {{ dongfuInfo.zhenfaLevel > 0 ? `Lv.${dongfuInfo.zhenfaLevel} · ` : '' }}{{ dongfuInfo.zhenfaName }}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">灵气</span>
        <span class="stat-value">{{ dongfuInfo.lingqi }} / {{ dongfuInfo.maxLingqi }}</span>
      </div>
      <div class="lingqi-bar">
        <div class="lingqi-bar__fill" :style="lingqiBarStyle" />
      </div>
      <div class="stat-row">
        <span class="stat-label">灵气恢复</span>
        <span class="stat-value">{{ dongfuInfo.recoveryPerSec.toFixed(1) }} / 秒</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">修炼聚灵</span>
        <span class="stat-value">
          {{ dongfuInfo.recoveryPerSecCultivating > 0
            ? `${dongfuInfo.recoveryPerSecCultivating.toFixed(1)} / 秒（阵法）`
            : '无（需布置阵法）' }}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">吸收率</span>
        <span class="stat-value">{{ absorptionRateText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">灵气转化率</span>
        <span class="stat-value">{{ conversionRateText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">灵气消耗</span>
        <span class="stat-value">每 1 点修为约需 {{ lingqiCostPerXiuweiText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">修炼速率</span>
        <span class="stat-value">{{ cultivationRateText }}</span>
      </div>
      <div v-if="upgradeInfo.hasNext" class="dongfu-upgrade">
        <p class="dongfu-upgrade__summary">{{ upgradeInfo.summary }}</p>
        <button
          type="button"
          class="dongfu-upgrade__btn game-btn game-btn--primary"
          :disabled="upgradeInfo.actionDisabled"
          @click="handleUpgradeDongfu"
        >
          {{ upgradeInfo.actionText }}
        </button>
        <p v-if="upgradeInfo.treasureHint" class="dongfu-upgrade__hint">{{ upgradeInfo.treasureHint }}</p>
        <p v-if="upgradeMessage" class="dongfu-upgrade__message">{{ upgradeMessage }}</p>
      </div>
      <p v-else class="dongfu-upgrade__max">洞府已达无上仙府，灵气充沛。</p>
    </section>

    <section class="home-card game-card">
      <div class="page-section-title">修炼</div>
      <div class="stat-row">
        <span class="stat-label">状态</span>
        <span class="stat-value">{{ gameStore.idleStatusText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">累计修炼</span>
        <span class="stat-value">{{ gameStore.idle.accumulatedSeconds }} 秒</span>
      </div>
      <p v-if="gameStore.idle.isRunning" class="home-cultivation-hint">
        修炼中，仅可查看洞府状态；结束修炼后方可前往其他界面。
      </p>
      <p v-if="gameStore.lastMessage" class="home-message">{{ gameStore.lastMessage }}</p>
      <button
        :class="idleButtonClass"
        class="home-action-btn"
        :disabled="isIdleButtonDisabled"
        @click="toggleIdle"
      >
        {{ idleButtonText }}
      </button>
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.home-header {
  text-align: center;
  margin-bottom: 20px;
}

.home-header__subtitle {
  color: $color-text-muted;
  font-size: 13px;
  margin-top: 4px;
}

.home-card + .home-card {
  margin-top: 16px;
}

.lingqi-bar {
  height: 6px;
  background: $color-bg-elevated;
  border-radius: 3px;
  margin-top: 8px;
  margin-bottom: 4px;
  overflow: hidden;
}

.lingqi-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #3a7bd5, #6ec6ff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.home-cultivation-hint {
  margin-top: 10px;
  font-size: 12px;
  color: $color-primary-dim;
  line-height: 1.5;
}

.home-message {
  margin-top: 10px;
  font-size: 13px;
  color: $color-primary;
}

.home-action-btn {
  width: 100%;
  margin-top: 14px;
  cursor: pointer;
}

.dongfu-upgrade {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid $color-border;
}

.dongfu-upgrade__summary {
  font-size: 12px;
  line-height: 1.6;
  color: $color-text-muted;
}

.dongfu-upgrade__btn {
  width: 100%;
  margin-top: 10px;
  cursor: pointer;
}

.dongfu-upgrade__btn:disabled {
  cursor: not-allowed;
}

.dongfu-upgrade__hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: $color-text-muted;
}

.dongfu-upgrade__message {
  margin-top: 8px;
  font-size: 13px;
  color: $color-primary;
}

.dongfu-upgrade__max {
  margin-top: 12px;
  font-size: 12px;
  color: $color-text-muted;
}
</style>
