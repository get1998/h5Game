<script setup lang="ts">
import { computed } from 'vue'
import { REALM_BREAKTHROUGH_XIUWEI } from '@/game/constants/realm'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()

const summary = computed(() => {
  const realm = playerStore.player.realm
  const required = REALM_BREAKTHROUGH_XIUWEI[realm]
  const current = playerStore.player.xiuwei
  const percent = required > 0 ? Math.min(100, Math.floor((current / required) * 100)) : 0

  return {
    name: playerStore.player.name,
    realm,
    current,
    required,
    percent,
    progressBarStyle: `width: ${percent}%`,
  }
})

const ageText = computed(() => `${playerStore.player.age} 岁`)
const dateText = computed(() => playerStore.gameDateText)
const lingshiText = computed(() => String(playerStore.inventory.lingshi))
</script>

<template>
  <header class="game-status-bar">
    <div class="game-status-bar__player">
      <div class="game-status-bar__identity">
        <span class="game-status-bar__name">{{ summary.name }}</span>
        <span
          v-if="playerStore.equippedTitleText"
          class="game-status-bar__title"
        >{{ playerStore.equippedTitleText }}</span>
        <span class="game-status-bar__realm">{{ summary.realm }}</span>
      </div>
      <div class="game-status-bar__xiuwei-row">
        <span class="game-status-bar__xiuwei-label">修为</span>
        <span class="game-status-bar__xiuwei-value">
          {{ summary.current }} / {{ summary.required }}
        </span>
      </div>
      <div class="game-status-bar__progress">
        <div
          class="game-status-bar__progress-fill"
          :style="summary.progressBarStyle"
        />
      </div>
    </div>

    <div class="game-status-bar__meta">
      <div class="game-status-bar__meta-item">
        <span class="game-status-bar__meta-label">年龄</span>
        <span class="game-status-bar__meta-value">{{ ageText }}</span>
      </div>
      <div class="game-status-bar__meta-item">
        <span class="game-status-bar__meta-label">时日</span>
        <span class="game-status-bar__meta-value game-status-bar__meta-value--date">{{ dateText }}</span>
      </div>
      <div class="game-status-bar__meta-item">
        <span class="game-status-bar__meta-label">灵石</span>
        <span class="game-status-bar__meta-value">{{ lingshiText }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.game-status-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 480px;
  margin: 0 auto;
  padding: 10px 16px;
  background: rgba($color-bg-elevated, 0.96);
  border-bottom: 1px solid $color-border;
  backdrop-filter: blur(8px);
}

.game-status-bar__player {
  flex: 1;
  min-width: 0;
}

.game-status-bar__identity {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
}

.game-status-bar__name {
  font-size: 15px;
  font-weight: 600;
  color: $color-text;
  white-space: nowrap;
}

.game-status-bar__realm {
  font-size: 12px;
  color: $color-primary;
  white-space: nowrap;
}

.game-status-bar__title {
  font-size: 11px;
  color: $color-info;
  white-space: nowrap;
}

.game-status-bar__name + .game-status-bar__title,
.game-status-bar__title + .game-status-bar__realm,
.game-status-bar__name + .game-status-bar__realm {
  margin-left: 8px;
}

.game-status-bar__xiuwei-row {
  display: flex;
  align-items: baseline;
  margin-top: 4px;
}

.game-status-bar__xiuwei-label {
  font-size: 11px;
  color: $color-text-muted;
}

.game-status-bar__xiuwei-value {
  font-size: 12px;
  color: $color-text;
}

.game-status-bar__xiuwei-label + .game-status-bar__xiuwei-value {
  margin-left: 6px;
}

.game-status-bar__progress {
  height: 3px;
  margin-top: 5px;
  max-width: 160px;
  background: rgba($color-border, 0.6);
  border-radius: 2px;
  overflow: hidden;
}

.game-status-bar__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $color-primary-dim, $color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.game-status-bar__meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 12px;
}

.game-status-bar__meta-item {
  display: flex;
  align-items: baseline;
}

.game-status-bar__meta-item + .game-status-bar__meta-item {
  margin-top: 4px;
}

.game-status-bar__meta-label {
  font-size: 11px;
  color: $color-text-muted;
}

.game-status-bar__meta-value {
  font-size: 12px;
  color: $color-primary;
  white-space: nowrap;
}

.game-status-bar__meta-label + .game-status-bar__meta-value {
  margin-left: 6px;
}

.game-status-bar__meta-value--date {
  font-size: 11px;
}
</style>
