<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import GameLayout from '@/components/layout/GameLayout.vue'
import { ITEM_QUALITY_COLOR } from '@/game/constants/items'
import { getItemDefinition } from '@/game/constants/items'
import { MARKET_LISTINGS } from '@/game/constants/market'
import {
  canBuyFromMarket,
  canBuySpecialFromMarket,
  canSellToMarket,
  summarizeSellableInventory,
} from '@/game/systems/market'
import { listInventoryEntries } from '@/game/systems/inventory'
import { useDongfuStore } from '@/stores/dongfu'
import { useGameStore } from '@/stores/game'
import { usePlayerStore } from '@/stores/player'

type PageTab = 'market' | 'inventory'

const playerStore = usePlayerStore()
const gameStore = useGameStore()
const dongfuStore = useDongfuStore()
const activeTab = ref<PageTab>('market')
const toastMessage = ref('')

const isLocked = computed(() =>
  gameStore.isRecoveryLocked || gameStore.isCultivationLocked,
)

const tabItems = computed(() => [
  {
    id: 'market' as const,
    label: '坊市',
    tabClass: activeTab.value === 'market'
      ? 'market-tab market-tab--active'
      : 'market-tab',
  },
  {
    id: 'inventory' as const,
    label: '背包',
    tabClass: activeTab.value === 'inventory'
      ? 'market-tab market-tab--active'
      : 'market-tab',
  },
])

const lingshiText = computed(() => String(playerStore.totalLingshi))
const lingshiItems = computed(() => playerStore.lingshiDisplayItems)

onMounted(() => {
  playerStore.refreshMarketTreasures()
  playerStore.save()
})

const specialMarketItems = computed(() =>
  playerStore.market.specialItemIds.map((itemId) => {
    const definition = getItemDefinition(itemId)
    if (!definition) return null

    const buyCheck = canBuySpecialFromMarket(
      playerStore.market,
      playerStore.inventory,
      itemId,
      dongfuStore.dongfu.level,
    )
    const qualityColor = ITEM_QUALITY_COLOR[definition.quality]

    return {
      itemId,
      name: definition.name,
      description: definition.description,
      quality: definition.quality,
      qualityStyle: `color: ${qualityColor}`,
      buyPrice: buyCheck.buyPrice ?? 0,
      canBuy: buyCheck.ok && !isLocked.value,
      buyDisabledReason: buyCheck.reason,
      itemClass: 'market-item market-item--special game-card',
    }
  }).filter((item) => item != null),
)

const marketItems = computed(() =>
  MARKET_LISTINGS.map((listing) => {
    const definition = getItemDefinition(listing.itemId)
    if (!definition) return null

    const buyCheck = canBuyFromMarket(
      playerStore.inventory,
      listing.itemId,
      playerStore.player.realm,
    )
    const qualityColor = ITEM_QUALITY_COLOR[definition.quality]

    return {
      itemId: listing.itemId,
      name: definition.name,
      description: definition.description,
      quality: definition.quality,
      qualityStyle: `color: ${qualityColor}`,
      buyPrice: listing.buyPrice,
      requiredRealm: listing.requiredRealm,
      lockText: listing.requiredRealm ? `需 ${listing.requiredRealm}` : '',
      canBuy: buyCheck.ok && !isLocked.value,
      buyDisabledReason: buyCheck.reason,
      itemClass: 'market-item game-card',
    }
  }).filter((item) => item != null),
)

const inventoryItems = computed(() =>
  listInventoryEntries(playerStore.inventory).map((entry) => {
    const sellCheck = canSellToMarket(playerStore.inventory, entry.itemId)
    const sellAllCheck = canSellToMarket(
      playerStore.inventory,
      entry.itemId,
      entry.count,
    )
    const qualityColor = ITEM_QUALITY_COLOR[entry.definition.quality]

    return {
      itemId: entry.itemId,
      name: entry.definition.name,
      description: entry.definition.description,
      quality: entry.definition.quality,
      qualityStyle: `color: ${qualityColor}`,
      count: entry.count,
      sellPrice: entry.definition.sellPrice,
      totalSellPrice: entry.definition.sellPrice * entry.count,
      canSell: sellCheck.ok && !isLocked.value,
      canSellAll: sellAllCheck.ok && entry.count > 1 && !isLocked.value,
      sellDisabledReason: sellCheck.reason,
      sellAllDisabledReason: sellAllCheck.reason,
      itemClass: 'inventory-item game-card',
    }
  }),
)

const sellableBatchSummary = computed(() => {
  const summary = summarizeSellableInventory(playerStore.inventory)
  return {
    ...summary,
    canBatch: summary.itemKinds > 0 && !isLocked.value,
  }
})

const inventoryEmpty = computed(() => inventoryItems.value.length === 0)

function showToast(message: string) {
  toastMessage.value = message
  window.setTimeout(() => {
    if (toastMessage.value === message) {
      toastMessage.value = ''
    }
  }, 2400)
}

function switchTab(tab: PageTab) {
  activeTab.value = tab
}

function handleBuy(itemId: string) {
  if (isLocked.value) return
  const result = playerStore.buyMarketItem(itemId)
  showToast(result.message)
}

function handleBuySpecial(itemId: string) {
  if (isLocked.value) return
  const result = playerStore.buySpecialMarketItem(itemId)
  showToast(result.message)
}

function handleSell(itemId: string) {
  if (isLocked.value) return
  const result = playerStore.sellInventoryItem(itemId)
  showToast(result.message)
}

function handleSellAll(itemId: string) {
  if (isLocked.value) return
  const result = playerStore.sellAllInventoryItem(itemId)
  showToast(result.message)
}

function handleSellAllSellable() {
  if (isLocked.value) return
  const result = playerStore.sellAllSellableInventoryItems()
  showToast(result.message)
}
</script>

<template>
  <GameLayout>
    <header class="page-header">
      <h1 class="game-title">坊市</h1>
      <p class="page-subtitle">灵石 {{ lingshiText }}</p>
      <div v-if="lingshiItems.length > 0" class="lingshi-breakdown">
        <span
          v-for="item in lingshiItems"
          :key="item.element"
          class="lingshi-breakdown__tag"
          :style="item.tagStyle"
        >{{ item.element }} {{ item.amount }}</span>
      </div>
    </header>

    <nav class="market-tabs">
      <button
        v-for="tab in tabItems"
        :key="tab.id"
        type="button"
        :class="tab.tabClass"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="toastMessage" class="market-toast">{{ toastMessage }}</p>

    <section v-if="activeTab === 'market'" class="market-section">
      <template v-if="specialMarketItems.length > 0">
        <div class="market-section__title">稀世寄售</div>
        <p class="market-section__hint">洞府宝物极低概率出现，购入后下架。</p>
        <div
          v-for="item in specialMarketItems"
          :key="`special-${item.itemId}`"
          :class="item.itemClass"
        >
          <div class="market-item__head">
            <span class="market-item__name" :style="item.qualityStyle">{{ item.name }}</span>
            <span class="market-item__tag">稀世</span>
          </div>
          <p class="market-item__desc">{{ item.description }}</p>
          <div class="market-item__footer">
            <span class="market-item__price">{{ item.buyPrice }} 灵石</span>
            <button
              type="button"
              class="market-item__action game-btn game-btn--primary"
              :disabled="!item.canBuy"
              :title="item.buyDisabledReason"
              @click="handleBuySpecial(item.itemId)"
            >
              购入
            </button>
          </div>
        </div>
      </template>

      <div class="market-section__title market-section__title--regular">常规定价</div>
      <div
        v-for="item in marketItems"
        :key="item.itemId"
        :class="item.itemClass"
      >
        <div class="market-item__head">
          <span class="market-item__name" :style="item.qualityStyle">{{ item.name }}</span>
          <span class="market-item__quality">{{ item.quality }}</span>
        </div>
        <p class="market-item__desc">{{ item.description }}</p>
        <div class="market-item__footer">
          <span class="market-item__price">{{ item.buyPrice }} 灵石</span>
          <span v-if="item.lockText" class="market-item__lock">{{ item.lockText }}</span>
          <button
            type="button"
            class="market-item__action game-btn game-btn--primary"
            :disabled="!item.canBuy"
            :title="item.buyDisabledReason"
            @click="handleBuy(item.itemId)"
          >
            购入
          </button>
        </div>
      </div>
    </section>

    <section v-else class="inventory-section">
      <div v-if="sellableBatchSummary.itemKinds > 0" class="inventory-batch">
        <p class="inventory-batch__hint">
          可售 {{ sellableBatchSummary.itemKinds }} 种共 {{ sellableBatchSummary.soldCount }} 件，预计获得 {{ sellableBatchSummary.totalGain }} 灵石
        </p>
        <button
          type="button"
          class="inventory-batch__action game-btn game-btn--primary"
          :disabled="!sellableBatchSummary.canBatch"
          @click="handleSellAllSellable"
        >
          一键出售
        </button>
      </div>
      <p v-if="inventoryEmpty" class="inventory-empty">背包空空如也，历练可获材料。</p>
      <div
        v-for="item in inventoryItems"
        :key="item.itemId"
        :class="item.itemClass"
      >
        <div class="inventory-item__head">
          <span class="inventory-item__name" :style="item.qualityStyle">{{ item.name }}</span>
          <span class="inventory-item__count">×{{ item.count }}</span>
        </div>
        <p class="inventory-item__desc">{{ item.description }}</p>
        <div class="inventory-item__footer">
          <span v-if="item.sellPrice > 0" class="inventory-item__price">
            出售价 {{ item.sellPrice }}
            <template v-if="item.count > 1">（全部 {{ item.totalSellPrice }}）</template>
          </span>
          <div class="inventory-item__actions">
            <button
              v-if="item.sellPrice > 0"
              type="button"
              class="inventory-item__action game-btn"
              :disabled="!item.canSell"
              :title="item.sellDisabledReason"
              @click="handleSell(item.itemId)"
            >
              出售
            </button>
            <button
              v-if="item.sellPrice > 0 && item.count > 1"
              type="button"
              class="inventory-item__action inventory-item__action--all game-btn game-btn--primary"
              :disabled="!item.canSellAll"
              :title="item.sellAllDisabledReason"
              @click="handleSellAll(item.itemId)"
            >
              全部出售
            </button>
          </div>
        </div>
      </div>
    </section>
  </GameLayout>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.page-header {
  margin-bottom: 12px;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: $color-text-muted;
}

.lingshi-breakdown {
  display: flex;
  flex-wrap: wrap;
  margin-top: 6px;
}

.lingshi-breakdown__tag {
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
}

.lingshi-breakdown__tag + .lingshi-breakdown__tag {
  margin-left: 6px;
}

.market-tabs {
  display: flex;
  margin-bottom: 12px;
}

.market-tab {
  flex: 1;
  padding: 8px 0;
  font-size: 14px;
  color: $color-text-muted;
  background: transparent;
  border: 1px solid $color-border;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.market-tab + .market-tab {
  margin-left: 8px;
}

.market-tab--active {
  color: $color-primary;
  border-color: $color-primary;
  background: rgba($color-primary, 0.08);
}

.market-toast {
  margin-bottom: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: $color-success;
  background: rgba($color-success, 0.1);
  border-radius: $radius-sm;
}

.market-section__title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text;
}

.market-section__title--regular {
  margin-top: 16px;
}

.market-section__hint {
  margin-top: 4px;
  margin-bottom: 8px;
  font-size: 12px;
  color: $color-text-muted;
}

.market-item--special {
  border-color: rgba($color-primary, 0.35);
}

.market-item__tag {
  font-size: 11px;
  color: $color-primary;
}

.market-item,
.inventory-item {
  padding: 12px;
}

.market-item + .market-item,
.inventory-item + .inventory-item {
  margin-top: 10px;
}

.market-item__head,
.inventory-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.market-item__name,
.inventory-item__name {
  font-size: 15px;
  font-weight: 600;
}

.market-item__quality {
  font-size: 11px;
  color: $color-text-muted;
}

.inventory-item__count {
  font-size: 13px;
  color: $color-primary;
}

.market-item__desc,
.inventory-item__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: $color-text-muted;
}

.market-item__footer,
.inventory-item__footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 10px;
}

.market-item__price,
.inventory-item__price {
  font-size: 13px;
  color: $color-primary;
}

.market-item__lock {
  font-size: 11px;
  color: $color-danger;
}

.market-item__price + .market-item__lock,
.market-item__lock + .market-item__action,
.market-item__price + .market-item__action {
  margin-left: auto;
}

.inventory-item__price + .inventory-item__actions {
  margin-left: auto;
}

.inventory-item__actions {
  display: flex;
}

.inventory-item__action + .inventory-item__action {
  margin-left: 8px;
}

.market-item__action,
.inventory-item__action {
  min-width: 64px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.market-item__action:disabled,
.inventory-item__action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.inventory-empty {
  padding: 24px 12px;
  font-size: 13px;
  text-align: center;
  color: $color-text-muted;
}

.inventory-batch {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: rgba($color-primary, 0.06);
  border: 1px solid rgba($color-primary, 0.2);
  border-radius: $radius-sm;
}

.inventory-batch__hint {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: $color-text-muted;
}

.inventory-batch__action {
  margin-top: 8px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
}

.inventory-batch__hint + .inventory-batch__action {
  margin-top: 0;
  margin-left: auto;
}

.inventory-batch__action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
