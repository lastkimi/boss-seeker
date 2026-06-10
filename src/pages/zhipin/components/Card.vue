<script lang="ts" setup>
import { ElSwitch, ElRadioGroup, ElRadioButton } from 'element-plus'
import type { ComponentPublicInstance } from 'vue'
import { ref, watch } from 'vue'

import JobCard from '@/components/JobCard.vue'
import JobTable from '@/components/JobTable.vue'
import type { EncryptJobId } from '@/stores/jobs'
import { jobList } from '@/stores/jobs'

import { useDeliver } from '../hooks/useDeliver'

const deliver = useDeliver()
const jobSetRef = ref<Record<EncryptJobId, Element | ComponentPublicInstance | null>>({})
const autoScroll = ref(true)
const cards = ref<HTMLDivElement>()
const viewMode = ref<'grid' | 'table'>('table')

// Vertical scrolling is native now, no need to intercept wheel events

function scrollHandler() {
  if (viewMode.value !== 'grid') return
  if (!deliver.currentData?.encryptJobId) {
    return
  }
  const d = jobSetRef.value[deliver.currentData?.encryptJobId ?? '']
  if (!d) {
    return
  }
  if ('scrollIntoView' in d) {
    d.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  } else if ('$el' in d) {
    d?.$el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }
}

watch(
  () => deliver.currentData,
  () => {
    if (autoScroll.value) {
      scrollHandler()
    }
  },
)
</script>

<template>
  <div style="order: -1" class="boss-helper-card">
    <div class="view-controls">
      <ElRadioGroup v-model="viewMode" size="small">
        <ElRadioButton label="table" value="table">列表视图</ElRadioButton>
        <ElRadioButton label="grid" value="grid">卡片视图</ElRadioButton>
      </ElRadioGroup>
      <ElSwitch
        v-model="autoScroll"
        inline-prompt
        active-text="自动滚动"
        inactive-text="自动滚动"
        style="margin-left: 15px;"
        @change="
          (v) => {
            if (v) {
              scrollHandler()
            }
          }
        "
      />
    </div>

    <JobTable v-if="viewMode === 'table'" :jobs="jobList.list" />
    <div v-else ref="cards" class="card-grid">
      <JobCard
        v-for="job in jobList.list"
        :ref="
          (ref) => {
            jobSetRef[job.encryptJobId] = ref
          }
        "
        :key="job.encryptJobId"
        :job="job"
        hover
      />
    </div>
    <div class="card-grid-overlay" />
  </div>
</template>

<style lang="scss" scoped>
// https://css-tricks.com/
// https://uiverse.io/Subaashbala/polite-newt-9

.view-controls {
  padding: 10px 15px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
}
// https://uiverse.io/Subaashbala/polite-newt-9

.boss-helper-card {
  position: relative;
  --x: 0px;
  --y: 0px;
  --r: 0px;
}

.card-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  margin: 0 0 1.5rem;
  position: relative;
  overflow-y: auto;
  max-height: 80vh;
  scrollbar-color: #c6c6c6 #e9e9e9;
  scrollbar-gutter: always;
  padding: 1rem;
  color: #000;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  &::-webkit-scrollbar-thumb {
    background: #434343;
    border-radius: 10px;
    box-shadow:
      inset 2px 2px 2px hsla(0, 0%, 100%, 0.25),
      inset -2px -2px 2px rgba(0, 0, 0, 0.25);
  }
  &::-webkit-scrollbar-track {
    background: linear-gradient(90deg, #434343, #434343 1px, #262626 0, #262626);
  }
}

.card-grid-overlay {
  display: none;
  position: absolute;
  inset: 0;
  will-change:
    mask-image,
    -webkit-mask-image,
    backdrop-filter;
  transform: translateZ(0);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: #ffffff20;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(
    circle var(--r) at var(--x) var(--y),
    transparent 100%,
    black 100%
  );
  mask-image: radial-gradient(circle var(--r) at var(--x) var(--y), transparent 100%, black 100%);
  transition: -webkit-mask-image 0.2s ease;
}

html.dark {
  .card-grid {
    scrollbar-color: #666 #201c29;
    color: #fff;
    &::-webkit-scrollbar-thumb {
      background: #434343;
      box-shadow:
        inset 2px 2px 2px hsla(0, 0%, 100%, 0.25),
        inset -2px -2px 2px rgba(0, 0, 0, 0.25);
    }
    &::-webkit-scrollbar-track {
      background: linear-gradient(90deg, #434343, #434343 1px, #262626 0, #262626);
    }
  }
}
</style>
