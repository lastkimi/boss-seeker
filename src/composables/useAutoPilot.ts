import { watchThrottled } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { counter } from '@/message'
import { logger } from '@/utils/logger'

export interface AutoPilotState {
  isActive: boolean
  keywords: string[]
  currentIndex: number
  cityCode: string // Default or user-selected city code, e.g. '100010000' for nationwide
  keywordLimit: number
  currentKeywordCount: number
}

const defaultState: AutoPilotState = {
  isActive: false,
  keywords: [],
  currentIndex: 0,
  cityCode: '100010000', // Default: Nationwide
  keywordLimit: 30,
  currentKeywordCount: 0,
}

const autoPilotKey = 'local:boss-seeker-auto-pilot'

export const useAutoPilot = defineStore('autoPilot', () => {
  const state = ref<AutoPilotState>({ ...defaultState })

  async function initState() {
    const data = await counter.storageGet<AutoPilotState>(autoPilotKey, defaultState)
    state.value = { ...defaultState, ...data }
    logger.info('Auto-Pilot State initialized:', state.value)
  }

  watchThrottled(
    state,
    (v) => {
      void counter.storageSet(autoPilotKey, v)
    },
    { deep: true, throttle: 200 }
  )

  async function saveState() {
    await counter.storageSet(autoPilotKey, JSON.parse(JSON.stringify(state.value)))
  }

  function setKeywords(keywords: string[]) {
    state.value.keywords = keywords
    state.value.currentIndex = 0
    state.value.currentKeywordCount = 0
    saveState()
  }

  async function start() {
    if (state.value.keywords.length === 0) {
      throw new Error('没有可用的搜索关键词，请先生成策略')
    }
    state.value.isActive = true
    state.value.currentIndex = 0
    state.value.currentKeywordCount = 0
    await saveState() // Save immediately to prevent loss on reload
    navigate()
  }

  function stop() {
    state.value.isActive = false
    saveState()
  }

  async function nextKeyword() {
    if (!state.value.isActive) return

    state.value.currentIndex++
    state.value.currentKeywordCount = 0
    if (state.value.currentIndex >= state.value.keywords.length) {
      logger.info('自动巡航：所有关键词已搜完，巡航结束。')
      state.value.isActive = false
      await saveState()
      return
    }
    logger.info(`自动巡航：即将切换到下一个关键词 [${state.value.keywords[state.value.currentIndex]}]`)
    await saveState()
    navigate()
  }

  function navigate() {
    if (!state.value.isActive || state.value.keywords.length === 0) return
    const keyword = state.value.keywords[state.value.currentIndex]
    const url = new URL('https://www.zhipin.com/web/geek/job')
    url.searchParams.set('query', keyword)
    url.searchParams.set('city', state.value.cityCode)
    
    // Check if we are already on this URL to prevent infinite reload
    const currentUrl = new URL(window.location.href)
    if (currentUrl.searchParams.get('query') === keyword && currentUrl.pathname === url.pathname) {
      logger.info('自动巡航：已经在目标页面，重新加载以触发投递...', keyword)
      window.location.reload()
      return
    }

    logger.info('自动巡航：正在跳转...', url.toString())
    window.location.href = url.toString()
  }

  function getCurrentKeyword() {
    return state.value.keywords[state.value.currentIndex]
  }

  return {
    state,
    initState,
    setKeywords,
    start,
    stop,
    nextKeyword,
    navigate,
    getCurrentKeyword,
    saveState,
  }
})
