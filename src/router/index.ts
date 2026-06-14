import { createRouter, createWebHistory } from 'vue-router'
import { useDongfuStore } from '@/stores/dongfu'
import { usePlayerStore } from '@/stores/player'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'start',
      component: () => import('@/views/StartView.vue'),
      meta: { title: '修仙挂机' },
    },
    {
      path: '/create',
      name: 'create',
      component: () => import('@/views/CharacterCreateView.vue'),
      meta: { title: '灵根测定' },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '洞府' },
    },
    {
      path: '/cultivation',
      redirect: '/home',
    },
    {
      path: '/gongfa',
      name: 'gongfa',
      component: () => import('@/views/GongfaView.vue'),
      meta: { title: '功法' },
    },
    {
      path: '/skills',
      redirect: { path: '/character', query: { tab: 'skill' } },
    },
    {
      path: '/battle',
      name: 'battle',
      component: () => import('@/views/BattleView.vue'),
      meta: { title: '历练' },
    },
    {
      path: '/character',
      name: 'character',
      component: () => import('@/views/CharacterView.vue'),
      meta: { title: '角色' },
    },
    {
      path: '/achievement',
      redirect: { path: '/character', query: { tab: 'achievement' } },
    },
    {
      path: '/market',
      name: 'market',
      component: () => import('@/views/MarketView.vue'),
      meta: { title: '坊市' },
    },
  ],
})

const GAME_ROUTES = ['/home', '/gongfa', '/battle', '/character', '/market']

router.beforeEach((to) => {
  if (!GAME_ROUTES.includes(to.path)) return true
  const playerStore = usePlayerStore()
  if (!playerStore.hasSave) {
    return { path: '/create' }
  }
  if (playerStore.isAwaitingReincarnation) {
    return { path: '/' }
  }
  if (to.path !== '/home' && useDongfuStore().isCultivating) {
    return { path: '/home' }
  }
  return true
})

router.afterEach(() => {
  // document.title = `${(to.meta.title as string) || '修仙挂机'} · 修仙挂机`
})

export default router
