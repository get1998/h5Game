<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { BattleLogEntry } from '@/game/types'

/** 日志面板 Tab 配置 */
export interface LogPanelTab {
  id: string
  label: string
  logs: BattleLogEntry[]
}

const props = defineProps<{
  logs?: BattleLogEntry[]
  title?: string
  tabs?: LogPanelTab[]
  defaultTab?: string
}>()

const listRef = ref<HTMLElement | null>(null)
const activeTabId = ref(props.defaultTab ?? props.tabs?.[0]?.id ?? '')

/** 当前 Tab 下的日志列表（无 Tab 时使用 props.logs） */
const activeLogs = computed(() => {
  if (props.tabs?.length) {
    const tab = props.tabs.find((item) => item.id === activeTabId.value)
    return tab?.logs ?? []
  }
  return props.logs ?? []
})

const tabItems = computed(() =>
  (props.tabs ?? []).map((tab) => ({
    ...tab,
    tabClass: activeTabId.value === tab.id
      ? 'log-panel__tab log-panel__tab--active'
      : 'log-panel__tab',
  })),
)

const displayLogs = computed(() =>
  activeLogs.value.map((log) => ({
    ...log,
    logClass: `log-panel__item log-panel__item--${log.type}`,
  })),
)

/** 切换日志 Tab */
function switchTab(tabId: string) {
  activeTabId.value = tabId
}

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
  () => activeLogs.value.length,
  () => scrollToBottom(),
)

watch(activeTabId, () => scrollToBottom())

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="log-panel game-card">
    <nav v-if="tabs?.length" class="log-panel__tabs">
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
    <div v-else-if="title" class="log-panel__title">{{ title }}</div>
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

.log-panel__tabs {
  display: flex;
  margin-bottom: 10px;
}

.log-panel__tab {
  flex: 1;
  padding: 6px 0;
  font-family: $font-title;
  font-size: 14px;
  color: $color-text-muted;
  background: transparent;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.log-panel__tab + .log-panel__tab {
  margin-left: 8px;
}

.log-panel__tab--active {
  color: $color-primary;
  border-color: $color-primary;
  background: rgba($color-primary, 0.08);
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

.log-panel__item--skill {
  color: #c9b8e8;
}

.log-panel__empty {
  color: $color-text-muted;
  text-align: center;
  padding: 20px 0;
}
</style>
