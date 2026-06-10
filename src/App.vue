<script lang="ts" setup>
import type { Action } from 'element-plus'
import {
  ElAvatar,
  ElButton,
  ElConfigProvider,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElMessage,
  ElMessageBox,
  ElSpace,
  ElText,
} from 'element-plus'
import { onMounted, ref } from 'vue'

import userVue from '@/components/conf/User.vue'
import { counter } from '@/message'
import { logger } from '@/utils/logger'

const confBox = ref(false)

const confs = {
  user: { name: '账号配置', component: userVue, disabled: false },
}

const confKey = ref<keyof typeof confs>('user')
const dark = ref(false)

counter.storageGet('theme-dark', false).then((res) => {
  dark.value = res
})

async function themeChange() {
  dark.value = !dark.value
  if (dark.value) {
    ElMessage({
      message: '已切换到暗黑模式，如有样式没适配且严重影响使用，请反馈',
      duration: 5000,
      showClose: true,
    })
  }
  document.documentElement.classList.toggle('dark', dark.value)
  await counter.storageSet('theme-dark', dark.value)
}

// logger.log(monkeyWindow, window, unsafeWindow);

onMounted(async () => {
  logger.info('BossHelper挂载成功')
  ElMessage('BossHelper挂载成功!')
})
</script>

<template>
  <ElConfigProvider namespace="ehp">
    <ElDropdown trigger="click">
      <ElAvatar :size="30" src="https://avatars.githubusercontent.com/u/68412205?v=4"> H </ElAvatar>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem
            v-for="(v, k) in confs"
            :key="k"
            :disabled="v.disabled"
            @click="
              () => {
                confKey = k
                confBox = true
              }
            "
          >
            {{ v.name }}
          </ElDropdownItem>
          <ElDropdownItem @click="themeChange">
            暗黑模式（{{ dark ? '开' : '关' }}）
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
    <Teleport to="body">
      <component :is="confs[confKey].component" id="help-conf-box" v-model="confBox" />
    </Teleport>

  </ElConfigProvider>
</template>

<style lang="scss">
.store-item-a {
  .store-item {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-direction: column;
    width: 140px;
    height: 180px;
    background: aliceblue;
    padding: 10px;
    border: 1px solid #f6f6f7;
    border-radius: 12px;
    background-color: #f6f6f7;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.04),
      0 1px 2px rgba(0, 0, 0, 0.06);
    transition:
      border-color 0.25s,
      background-color 0.25s;
  }
  &:hover {
    .store-item {
      background-color: #bbf8fa;
      border-color: #2fffd9;
    }
  }
}
</style>
