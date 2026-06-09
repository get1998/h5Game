<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { BattleLogEntry } from '@/game/types'

const props = defineProps<{
  logs: BattleLogEntry[]
  title?: string
}>()

const listRef = ref<HTMLElement | null>(null)

const displayLogs = computed(() =>
  props.logs.map((log) => ({
    ...log,
    logClass: `log-panel__item log-panel__item--${log.type}`,
  })),
)

/** 滚动日志列表到底部 */
function scrollToBottom() {
  nextTick(() => {
    const el = listRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

watch(
  () => props.logs.length,
  () => scrollToBottom(),
)

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="log-panel game-card">
    <div v-if="title" class="log-panel__title">{{ title }}</div>
    <div ref="listRef" class="log-panel__list">
      <div
        v-for="log in displayLogs"
        :key="log.id"
        :class="log.logClass"
      >
        {{ log.text }}
      </div>
      <div v-if="displayLogs.length === 0" class="log-panel__empty">
        暂无日志
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.log-panel__title {
  font-family: $font-title;
  color: $color-primary;
  margin-bottom: 10px;
}

.log-panel__list {
  max-height: 240px;
  overflow-y: auto;
  font-size: 13px;
}

.log-panel__item {
  padding: 4px 0;
  border-bottom: 1px solid rgba($color-border, 0.3);
  line-height: 1.6;

  &:last-child {
    border-bottom: none;
  }
}

.log-panel__item--damage {
  color: #e8c4a0;
}

.log-panel__item--crit {
  color: $color-danger;
  font-weight: 600;
}

.log-panel__item--heal {
  color: $color-success;
}

.log-panel__item--miss {
  color: $color-text-muted;
  font-style: italic;
}

.log-panel__item--system {
  color: $color-primary;
}

.log-panel__empty {
  color: $color-text-muted;
  text-align: center;
  padding: 20px 0;
}
</style>
