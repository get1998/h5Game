<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDongfuStore } from '@/stores/dongfu'

interface TabItem {
  path: string
  label: string
  icon: string
}

const route = useRoute()
const dongfuStore = useDongfuStore()

const tabs: TabItem[] = [
  { path: '/home', label: '洞府', icon: '🏠' },
  { path: '/gongfa', label: '功法', icon: '📜' },
  { path: '/battle', label: '历练', icon: '⚔️' },
  { path: '/market', label: '坊市', icon: '🏪' },
  { path: '/character', label: '角色', icon: '👤' },
]

const tabItems = computed(() =>
  tabs.map((tab) => {
    const isDisabled = dongfuStore.isCultivating && tab.path !== '/home'
    const isActive = route.path === tab.path
    let tabClass = 'tab-bar__item'
    if (isActive) tabClass += ' tab-bar__item--active'
    if (isDisabled) tabClass += ' tab-bar__item--disabled'
    return {
      ...tab,
      isActive,
      isDisabled,
      tabClass,
    }
  }),
)
</script>

<template>
  <nav class="tab-bar">
    <template v-for="tab in tabItems" :key="tab.path">
      <router-link
        v-if="!tab.isDisabled"
        :to="tab.path"
        :class="tab.tabClass"
      >
        <span class="tab-bar__icon">{{ tab.icon }}</span>
        <span class="tab-bar__label">{{ tab.label }}</span>
      </router-link>
      <span
        v-else
        :class="tab.tabClass"
        aria-disabled="true"
      >
        <span class="tab-bar__icon">{{ tab.icon }}</span>
        <span class="tab-bar__label">{{ tab.label }}</span>
      </span>
    </template>
  </nav>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  height: calc(#{$tabbar-height} + #{$safe-bottom});
  padding-bottom: $safe-bottom;
  background: $color-bg-card;
  border-top: 1px solid $color-border;
}

.tab-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $color-text-muted;
  cursor: pointer;
  transition: color 0.15s;
}

.tab-bar__item--active {
  color: $color-primary;
}

.tab-bar__item--disabled {
  cursor: not-allowed;
  opacity: 0.4;
  pointer-events: none;
}

.tab-bar__icon {
  font-size: 20px;
  line-height: 1;
}

.tab-bar__label {
  margin-top: 2px;
  font-size: 11px;
}
</style>
