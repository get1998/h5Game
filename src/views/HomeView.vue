<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import GameLayout from '@/components/layout/GameLayout.vue'
import { useDongfuStore } from '@/stores/dongfu'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'
import { calcCultivationRate, getLingqiCostPerXiuwei } from '@/game/systems/cultivation'
import {
  calcGongfaCultivationRate,
  getLingqiCostPerGongfaExp,
} from '@/game/systems/gongfa-cultivation'
import { calcBreakthroughSuccessRate } from '@/game/formulas/breakthrough-success'
import { getZhenfaLevelConfig } from '@/game/constants/zhenfa'
import { getAllFabaoTemplates, FABAO_TIER_COLOR } from '@/game/constants/fabao'
import { getItemDefinition } from '@/game/constants/items'
import { getItemCount } from '@/game/systems/inventory'
import { buildFabaoCraftSummary } from '@/game/systems/fabao-craft'
import { buildFabaoRechargeHint } from '@/game/systems/fabao-recharge'
import { isRealmXiuweiFull } from '@/game/constants/realm'
import type { IdleMode } from '@/game/types'

const dongfuStore = useDongfuStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()
const { xiuweiSummary } = storeToRefs(playerStore)

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

const selectedIdleMode = ref<IdleMode>(gameStore.idle.mode)
gameStore.setDongfuPreferredIdleMode(gameStore.idle.mode)

watch(
  () => gameStore.idle.mode,
  (mode) => {
    if (gameStore.idle.isRunning) {
      selectedIdleMode.value = mode
      gameStore.setDongfuPreferredIdleMode(mode)
    }
  },
  { immediate: true },
)

const activeGongfa = computed(() => playerStore.activeGongfa)

const gongfaCultivationDetail = computed(() =>
  calcGongfaCultivationRate(playerStore.player, activeGongfa.value),
)

const isGongfaMaxLevel = computed(() => {
  const gongfa = activeGongfa.value
  return !gongfa || gongfa.level >= gongfa.maxLevel
})

const cultivationRateText = computed(() => {
  if (selectedIdleMode.value === 'gongfa') {
    if (!activeGongfa.value) return '请先装备主修功法'
    if (isGongfaMaxLevel.value) return '功法已圆满'
    const rate = gongfaCultivationDetail.value.totalExpPerSec
    return rate > 0 ? `${rate.toFixed(2)} 功法经验 / 秒` : '灵气不足或未装备功法'
  }
  if (isXiuweiFull.value) return '修为已满，请先突破'
  const rate = cultivationDetail.value.totalPerSec
  return rate > 0 ? `${rate.toFixed(2)} 修为 / 秒` : '灵气不足或未装备功法'
})

const absorptionRateText = computed(() => {
  const rate = selectedIdleMode.value === 'gongfa'
    ? gongfaCultivationDetail.value.absorptionPerSec
    : cultivationDetail.value.absorptionPerSec
  return rate > 0 ? `${rate.toFixed(2)} 灵气 / 秒` : '—'
})

const conversionRateText = computed(() => {
  if (selectedIdleMode.value === 'gongfa') {
    const rate = gongfaCultivationDetail.value.expPerLingqi
    return rate > 0 ? `${rate.toFixed(3)} 功法经验 / 灵气` : '—'
  }
  const rate = cultivationDetail.value.conversionPerLingqi
  return rate > 0 ? `${rate.toFixed(3)} 修为 / 灵气` : '—'
})

const lingqiCostPerXiuweiText = computed(() => {
  if (selectedIdleMode.value === 'gongfa') {
    const cost = getLingqiCostPerGongfaExp(playerStore.player, activeGongfa.value)
    return cost > 0 ? `${cost} 灵气` : '—'
  }
  const cost = getLingqiCostPerXiuwei(
    playerStore.player,
    dongfuStore.dongfu,
    playerStore.activeGongfa,
    playerStore.reincarnation.cultivation,
  )
  return cost > 0 ? `${cost} 灵气` : '—'
})

const lingqiCostLabel = computed(() =>
  selectedIdleMode.value === 'gongfa' ? '每 1 点功法经验约需' : '每 1 点修为约需',
)

const cultivationRateLabel = computed(() =>
  selectedIdleMode.value === 'gongfa' ? '功法修炼速率' : '修为修炼速率',
)

const conversionRateLabel = computed(() =>
  selectedIdleMode.value === 'gongfa' ? '灵气转化率' : '灵气转化率',
)

const idleButtonText = computed(() => {
  if (gameStore.idle.isRunning) return '结束修炼'
  return selectedIdleMode.value === 'gongfa' ? '开始功法修炼' : '开始修为修炼'
})

const idleButtonClass = computed(() =>
  gameStore.idle.isRunning ? 'game-btn game-btn--danger' : 'game-btn game-btn--primary',
)


function toggleIdle() {
  if (gameStore.isRecoveryLocked) return
  if (gameStore.idle.isRunning) {
    gameStore.stopIdle()
  } else {
    gameStore.startIdle(selectedIdleMode.value)
  }
}

watch(
  selectedIdleMode,
  (mode) => {
    gameStore.setDongfuPreferredIdleMode(mode)
    if (!gameStore.idle.isRunning) {
      gameStore.tryAutoStartDongfuCultivation(mode)
    }
  },
  { immediate: true },
)

onMounted(() => {
  gameStore.setDongfuPageActive(true)
  gameStore.tryAutoStartDongfuCultivation(selectedIdleMode.value)
})

onUnmounted(() => {
  gameStore.setDongfuPageActive(false)
})

const isIdleButtonDisabled = computed(() => {
  if (gameStore.isRecoveryLocked) return true
  if (gameStore.idle.isRunning) return false
  if (selectedIdleMode.value === 'gongfa') {
    return !activeGongfa.value || isGongfaMaxLevel.value
  }
  return isXiuweiFull.value
})

const isModeSwitchDisabled = computed(() => gameStore.idle.isRunning || gameStore.isRecoveryLocked)

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

const zhenfaUnlockCheck = computed(() => dongfuStore.checkZhenfaUnlock())
const zhenfaDeployCheck = computed(() => dongfuStore.checkZhenfaDeploy())

const zhenfaUnlockInfo = computed(() => {
  const info = dongfuInfo.value
  if (!info.nextZhenfaUnlockLevel) {
    return {
      hasNext: false,
      summary: '全部阵法图纸已参悟',
      actionText: '已满',
      actionDisabled: true,
      dropHint: '',
    }
  }

  const check = zhenfaUnlockCheck.value
  const parts = [
    `参悟：${info.nextZhenfaUnlockName}`,
    `需「${info.nextZhenfaBlueprintName}」×1（持有 ${info.nextZhenfaBlueprintCount}）`,
  ]

  return {
    hasNext: true,
    summary: parts.join(' · '),
    actionText: check.canUnlock ? '参悟图纸' : (check.reason ?? '无法参悟'),
    actionDisabled: !check.canUnlock || gameStore.isRecoveryLocked || gameStore.idle.isRunning,
    dropHint: info.zhenfaBlueprintDropHint,
  }
})

const zhenfaDeployInfo = computed(() => {
  const info = dongfuInfo.value
  if (!info.nextZhenfaSetupLevel) {
    return {
      hasNext: false,
      summary: '阵法已达五品聚灵阵',
      actionText: '已满级',
      actionDisabled: true,
      dropHint: '',
    }
  }

  const check = zhenfaDeployCheck.value
  const parts = [
    `布阵：${info.nextZhenfaSetupName}`,
    `聚灵 ${getZhenfaLevelConfig(info.nextZhenfaSetupLevel).recoveryPerSec} / 秒`,
  ]
  if (info.nextZhenfaSetupLingshiText) {
    parts.push(`五行灵石 ${info.nextZhenfaSetupLingshiText}`)
  }
  if (info.nextZhenfaSetupTreasureName) {
    parts.push(`需「${info.nextZhenfaSetupTreasureName}」×1（持有 ${info.nextZhenfaSetupTreasureCount}）`)
  }
  if (info.nextZhenfaSetupMaintainText) {
    parts.push(`运转 ${info.nextZhenfaSetupMaintainText}`)
  }

  return {
    hasNext: true,
    summary: parts.join(' · '),
    actionText: check.canSetup ? (info.zhenfaLevel > 0 ? '升级阵法' : '布置阵法') : (check.reason ?? '无法布阵'),
    actionDisabled: !check.canSetup || gameStore.isRecoveryLocked || gameStore.idle.isRunning,
    dropHint: info.zhenfaTreasureDropHint,
  }
})

const zhenfaMaintainStatusText = computed(() => {
  switch (dongfuInfo.value.zhenfaMaintainStatus) {
    case 'running':
      return dongfuInfo.value.lingqi <= 0 ? '灵气耗尽，自动聚灵中' : '自动聚灵中'
    case 'paused_full':
      return '灵气已满，已暂停'
    case 'suspended':
      return '灵石不足，已停摆'
    default:
      return ''
  }
})

const isZhenfaMaintainWarn = computed(() =>
  dongfuInfo.value.zhenfaMaintainStatus === 'suspended',
)

const zhenfaUnlockMessage = ref('')
const zhenfaDeployMessage = ref('')

function handleUnlockZhenfa() {
  if (zhenfaUnlockInfo.value.actionDisabled) return
  const result = dongfuStore.unlockZhenfaBlueprint()
  zhenfaUnlockMessage.value = result.message
}

function handleDeployZhenfa() {
  if (zhenfaDeployInfo.value.actionDisabled) return
  const result = dongfuStore.deployZhenfa()
  zhenfaDeployMessage.value = result.message
}

const breakthroughRate = computed(() =>
  calcBreakthroughSuccessRate(
    playerStore.player,
    playerStore.activeGongfa,
    playerStore.player.breakthroughFailures,
  ),
)

const breakthroughInfo = computed(() => {
  const { realm, current, required, percent, progressBarStyle } = xiuweiSummary.value
  const rate = breakthroughRate.value

  const bonusParts: string[] = []
  if (rate.comprehensionBonus > 0) {
    bonusParts.push(`悟性 +${Math.floor(rate.comprehensionBonus * 100)}%`)
  }
  if (rate.gongfaBonus > 0) {
    bonusParts.push(`品质 +${Math.floor(rate.gongfaBonus * 100)}%`)
  }
  if (rate.gongfaStatBonus > 0) {
    bonusParts.push(`功法属性 +${Math.floor(rate.gongfaStatBonus * 100)}%`)
  }
  if (rate.gongfaLevelPenalty > 0) {
    bonusParts.push(`气脉占用 -${Math.floor(rate.gongfaLevelPenalty * 100)}%`)
  }
  if (rate.failurePityBonus > 0) {
    bonusParts.push(`保底 +${Math.floor(rate.failurePityBonus * 100)}%`)
  }

  return {
    realm,
    current,
    required,
    percent,
    progressBarStyle,
    canBreakthrough: current >= required && rate.nextRealm != null,
    successRateText: rate.nextRealm ? `${rate.percent}%` : '—',
    breakthroughTypeText: rate.nextRealm
      ? (rate.isMajorBreakthrough ? '大境界突破' : '小境界突破')
      : '已达顶境',
    failureCount: playerStore.player.breakthroughFailures,
    bonusText: bonusParts.length > 0 ? bonusParts.join(' · ') : '无额外加成',
    baseRateText: rate.nextRealm ? `${Math.floor(rate.baseRate * 100)}%` : '—',
    isMajorBreakthrough: rate.isMajorBreakthrough,
  }
})

const isBreakthroughDisabled = computed(() =>
  !breakthroughInfo.value.canBreakthrough
  || gameStore.isRecoveryLocked
  || gameStore.isCultivationLocked,
)

function handleBreakthrough() {
  if (isBreakthroughDisabled.value) return
  gameStore.attemptBreakthrough()
}

const fabaoBlueprintItems = computed(() => {
  const unlocked = playerStore.fabao.unlockedTemplateIds
  return getAllFabaoTemplates()
    .filter((t) => !unlocked.includes(t.id))
    .map((template) => {
      const blueprintName = getItemDefinition(template.blueprintItemId)?.name ?? '图纸'
      const count = getItemCount(playerStore.inventory, template.blueprintItemId)
      const check = dongfuStore.checkFabaoBlueprintUnlock(template.blueprintItemId)
      return {
        templateId: template.id,
        blueprintItemId: template.blueprintItemId,
        name: template.name,
        tier: template.tier,
        type: template.type,
        blueprintName,
        count,
        canUnlock: check.canUnlock,
        reason: check.reason,
        tierColor: FABAO_TIER_COLOR[template.tier],
        actionDisabled: !check.canUnlock || count < 1 || gameStore.isRecoveryLocked || gameStore.idle.isRunning,
      }
    })
    .filter((item) => item.count > 0)
})

const fabaoCraftItems = computed(() => {
  const unlocked = playerStore.fabao.unlockedTemplateIds
  return getAllFabaoTemplates()
    .filter((t) => unlocked.includes(t.id))
    .map((template) => {
      const check = dongfuStore.checkFabaoCraft(template.id)
      return {
        templateId: template.id,
        name: template.name,
        tier: template.tier,
        type: template.type,
        summary: buildFabaoCraftSummary(template),
        tierColor: FABAO_TIER_COLOR[template.tier],
        canCraft: check.canCraft,
        reason: check.reason,
        actionDisabled: !check.canCraft || gameStore.isRecoveryLocked || gameStore.idle.isRunning,
      }
    })
})

const fabaoRechargeHint = computed(() => buildFabaoRechargeHint(dongfuStore.dongfu))
const isFabaoRechargeDisabled = computed(() =>
  gameStore.isRecoveryLocked || gameStore.idle.isRunning || playerStore.fabao.owned.length === 0,
)

const fabaoMessage = ref('')

function handleUnlockFabaoBlueprint(blueprintItemId: string) {
  const result = dongfuStore.unlockFabaoBlueprint(blueprintItemId)
  fabaoMessage.value = result.message
}

function handleCraftFabao(templateId: string) {
  const result = dongfuStore.craftFabaoItem(templateId)
  fabaoMessage.value = result.message
}

function handleRechargeAllFabaos() {
  const result = dongfuStore.rechargeAllFabaos()
  fabaoMessage.value = result.message
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
      <div v-if="dongfuInfo.zhenfaLevel > 0 && dongfuInfo.zhenfaMaintainText" class="stat-row">
        <span class="stat-label">阵法运转</span>
        <span
          class="stat-value"
          :class="{ 'stat-value--warn': isZhenfaMaintainWarn }"
        >
          {{ dongfuInfo.zhenfaMaintainText }}
          · {{ zhenfaMaintainStatusText }}
        </span>
      </div>
      <div v-if="zhenfaUnlockInfo.hasNext" class="dongfu-upgrade zhenfa-panel">
        <p class="dongfu-upgrade__label">阵法参悟</p>
        <p class="dongfu-upgrade__summary">{{ zhenfaUnlockInfo.summary }}</p>
        <button
          type="button"
          class="dongfu-upgrade__btn game-btn game-btn--primary"
          :disabled="zhenfaUnlockInfo.actionDisabled"
          @click="handleUnlockZhenfa"
        >
          {{ zhenfaUnlockInfo.actionText }}
        </button>
        <p v-if="zhenfaUnlockInfo.dropHint" class="dongfu-upgrade__hint">{{ zhenfaUnlockInfo.dropHint }}</p>
        <p v-if="zhenfaUnlockMessage" class="dongfu-upgrade__message">{{ zhenfaUnlockMessage }}</p>
      </div>
      <div v-if="zhenfaDeployInfo.hasNext" class="dongfu-upgrade zhenfa-panel">
        <p class="dongfu-upgrade__label">阵法布阵</p>
        <p class="dongfu-upgrade__summary">{{ zhenfaDeployInfo.summary }}</p>
        <button
          type="button"
          class="dongfu-upgrade__btn game-btn game-btn--primary"
          :disabled="zhenfaDeployInfo.actionDisabled"
          @click="handleDeployZhenfa"
        >
          {{ zhenfaDeployInfo.actionText }}
        </button>
        <p v-if="zhenfaDeployInfo.dropHint" class="dongfu-upgrade__hint">{{ zhenfaDeployInfo.dropHint }}</p>
        <p v-if="zhenfaDeployMessage" class="dongfu-upgrade__message">{{ zhenfaDeployMessage }}</p>
      </div>
      <p v-else-if="!zhenfaUnlockInfo.hasNext" class="dongfu-upgrade__max">阵法已臻五品，聚灵充沛。</p>
      <div v-if="fabaoBlueprintItems.length > 0" class="dongfu-upgrade zhenfa-panel">
        <p class="dongfu-upgrade__label">法器参悟</p>
        <div
          v-for="item in fabaoBlueprintItems"
          :key="item.blueprintItemId"
          class="fabao-craft-item"
        >
          <p class="fabao-craft-item__name">
            <span class="fabao-tier" :style="{ color: item.tierColor }">{{ item.tier }}</span>
            {{ item.type }}法器 · {{ item.name }}
          </p>
          <p class="fabao-craft-item__summary">图纸「{{ item.blueprintName }}」×{{ item.count }}</p>
          <button
            type="button"
            class="dongfu-upgrade__btn game-btn game-btn--primary"
            :disabled="item.actionDisabled"
            @click="handleUnlockFabaoBlueprint(item.blueprintItemId)"
          >
            {{ item.canUnlock ? '参悟图纸' : (item.reason ?? '无法参悟') }}
          </button>
        </div>
      </div>
      <div v-if="fabaoCraftItems.length > 0" class="dongfu-upgrade zhenfa-panel">
        <p class="dongfu-upgrade__label">炼器台</p>
        <div
          v-for="item in fabaoCraftItems"
          :key="item.templateId"
          class="fabao-craft-item"
        >
          <p class="fabao-craft-item__name">
            <span class="fabao-tier" :style="{ color: item.tierColor }">{{ item.tier }}</span>
            {{ item.type }}法器 · {{ item.name }}
          </p>
          <p class="fabao-craft-item__summary">{{ item.summary }}</p>
          <button
            type="button"
            class="dongfu-upgrade__btn game-btn game-btn--primary"
            :disabled="item.actionDisabled"
            @click="handleCraftFabao(item.templateId)"
          >
            {{ item.canCraft ? '炼制' : (item.reason ?? '无法炼制') }}
          </button>
        </div>
        <p class="dongfu-upgrade__hint">{{ fabaoRechargeHint }}</p>
        <button
          type="button"
          class="dongfu-upgrade__btn game-btn"
          :disabled="isFabaoRechargeDisabled"
          @click="handleRechargeAllFabaos"
        >
          为全部法器充能
        </button>
        <p v-if="fabaoMessage" class="dongfu-upgrade__message">{{ fabaoMessage }}</p>
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
        <span class="stat-label">{{ conversionRateLabel }}</span>
        <span class="stat-value">{{ conversionRateText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">灵气消耗</span>
        <span class="stat-value">{{ lingqiCostLabel }} {{ lingqiCostPerXiuweiText }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">{{ cultivationRateLabel }}</span>
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
      <div class="idle-mode-switch">
        <button
          type="button"
          class="idle-mode-switch__btn"
          :class="{ 'idle-mode-switch__btn--active': selectedIdleMode === 'xiuwei' }"
          :disabled="isModeSwitchDisabled"
          @click="selectedIdleMode = 'xiuwei'"
        >
          修为修炼
        </button>
        <button
          type="button"
          class="idle-mode-switch__btn"
          :class="{ 'idle-mode-switch__btn--active': selectedIdleMode === 'gongfa' }"
          :disabled="isModeSwitchDisabled"
          @click="selectedIdleMode = 'gongfa'"
        >
          功法修炼
        </button>
      </div>
      <div v-if="selectedIdleMode === 'gongfa'" class="stat-row">
        <span class="stat-label">主修功法</span>
        <span class="stat-value">
          {{ activeGongfa ? `${activeGongfa.name} Lv.${activeGongfa.level}` : '未装备' }}
        </span>
      </div>
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
      <p v-else-if="selectedIdleMode === 'gongfa'" class="home-cultivation-hint">
        处于洞府时，灵气蓄满后将自动开始功法修炼；若已布聚灵阵，灵气耗尽后阵法仍可维持并自动续练。
      </p>
      <p v-else class="home-cultivation-hint">
        处于洞府时，灵气蓄满后将自动开始修炼；若已布聚灵阵，灵气耗尽后阵法仍可维持并自动续练。
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

    <section class="home-card game-card">
      <div class="page-section-title">境界突破</div>
      <div class="stat-row">
        <span class="stat-label">当前境界</span>
        <span class="stat-value">{{ breakthroughInfo.realm }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">修为</span>
        <span class="stat-value">{{ breakthroughInfo.current }} / {{ breakthroughInfo.required }}</span>
      </div>
      <div class="xiuwei-bar">
        <div class="xiuwei-bar__fill" :style="breakthroughInfo.progressBarStyle" />
      </div>
      <p class="xiuwei-bar__text">突破进度 {{ breakthroughInfo.percent }}%</p>
      <div class="breakthrough-detail">
        <div class="stat-row">
          <span class="stat-label">突破类型</span>
          <span class="stat-value">{{ breakthroughInfo.breakthroughTypeText }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">基础成功率</span>
          <span class="stat-value">{{ breakthroughInfo.baseRateText }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">当前成功率</span>
          <span class="stat-value stat-value--highlight">{{ breakthroughInfo.successRateText }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">加成明细</span>
          <span class="stat-value">{{ breakthroughInfo.bonusText }}</span>
        </div>
        <div v-if="breakthroughInfo.failureCount > 0" class="stat-row">
          <span class="stat-label">连续失败</span>
          <span class="stat-value">{{ breakthroughInfo.failureCount }} 次</span>
        </div>
      </div>
      <p
        v-if="breakthroughInfo.canBreakthrough && !breakthroughInfo.isMajorBreakthrough"
        class="home-cultivation-hint"
      >
        小境界修为已满时将自动突破，无需手动操作。
      </p>
      <button
        class="game-btn game-btn--primary home-action-btn"
        :disabled="isBreakthroughDisabled"
        @click="handleBreakthrough"
      >
        {{ breakthroughInfo.isMajorBreakthrough ? '尝试大境界突破' : '手动突破' }}
      </button>
      <p class="home-tip">
        修为以洞府修炼为主；功法可在洞府参悟或历练战斗获取经验。小境界满足条件时自动突破；大境界需手动突破，失败会损失部分修为。功法等级影响突破成功率。
      </p>
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

.idle-mode-switch {
  display: flex;
  margin-bottom: 12px;
}

.idle-mode-switch__btn {
  flex: 1;
  padding: 8px 0;
  font-size: 13px;
  color: $color-text-muted;
  background: $color-bg-elevated;
  border: 1px solid $color-border;
  cursor: pointer;
}

.idle-mode-switch__btn + .idle-mode-switch__btn {
  margin-left: 8px;
}

.idle-mode-switch__btn--active {
  color: $color-primary;
  border-color: $color-primary-dim;
  background: rgba($color-primary, 0.08);
}

.idle-mode-switch__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.dongfu-upgrade {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid $color-border;
}

.zhenfa-panel + .zhenfa-panel,
.zhenfa-panel + .dongfu-upgrade {
  margin-top: 10px;
}

.dongfu-upgrade__label {
  font-size: 13px;
  color: $color-primary;
  margin-bottom: 6px;
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
}

.fabao-craft-item + .fabao-craft-item {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid $color-border;
}

.fabao-craft-item__name {
  font-size: 13px;
  color: $color-text;
}

.fabao-tier {
  font-weight: 600;
}

.fabao-craft-item__summary {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: $color-text-muted;
}

.xiuwei-bar {
  height: 8px;
  background: $color-bg-elevated;
  border-radius: 4px;
  margin-top: 12px;
  overflow: hidden;
}

.xiuwei-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, $color-primary-dim, $color-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.xiuwei-bar__text {
  margin-top: 6px;
  font-size: 12px;
  color: $color-text-muted;
  text-align: right;
}

.breakthrough-detail {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid $color-border;
}

.stat-value--highlight {
  color: $color-primary;
  font-weight: 600;
}

.stat-value--warn {
  color: #e67e22;
}

.home-tip {
  margin-top: 12px;
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.6;
}
</style>
