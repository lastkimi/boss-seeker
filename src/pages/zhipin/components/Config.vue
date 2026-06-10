<script lang="ts" setup>
import {
  ElButton,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElSpace,
  ElDivider,
} from 'element-plus'

import Alert from '@/components/Alert'
import { getCacheManager } from '@/composables/useApplying'
import { useCommon } from '@/composables/useCommon'
import { formInfoData, useConf } from '@/stores/conf'
import Ai from './Ai.vue'

const conf = useConf()
const { deliverLock } = useCommon()
</script>

<template>
  <Alert
    id="config-alert-1"
    style="margin-bottom: 10px"
    show-icon
    title="进行配置前都请先阅读完整的帮助文档，再进行配置，如有bug请反馈"
    type="success"
    description="滚动到底部，差不多150个岗位左右，也会自动停止, 刷新或者变更期望重新获取新的岗位即可。"
  />
  <Alert id="config-alert-2" style="margin-bottom: 10px" type="success" show-icon>
    <template #title>
      使用自定义招呼语前 推荐禁用boss直聘自带招呼语
      <ElLink
        href="https://www.zhipin.com/web/geek/notify-set?type=greetSet"
        target="_blank"
        type="warning"
      >
        点我前往设置
      </ElLink>
    </template>
  </Alert>
  <Alert
    id="config-alert-3"
    style="margin-bottom: 10px"
    type="success"
    description="所有配置选项皆有帮助提示，不懂用法请进入帮助模式进行查看，若是对帮助说明有疑问请反馈最好能给出改进意见。"
  />
  <ElForm
    label-position="left"
    label-width="120px"
    :model="conf.formData"
    :disabled="deliverLock"
  >
    <div style="font-weight: 700; margin-bottom: 12px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 22px;">🟢</span> 基础过滤防骚扰
    </div>
    <div class="bh-glass-panel" style="margin-bottom: 24px;">
      <ElSpace wrap :size="20">
        <ElCheckbox
          v-bind="formInfoData.activityFilter"
          v-model="conf.formData.activityFilter.value"
          border
        />
        <ElCheckbox
          v-bind="formInfoData.goldHunterFilter"
          v-model="conf.formData.goldHunterFilter.value"
          border
        />
        <ElCheckbox
          v-bind="formInfoData.friendStatus"
          v-model="conf.formData.friendStatus.value"
          border
        />
        <ElCheckbox
          v-bind="formInfoData.sameCompanyFilter"
          v-model="conf.formData.sameCompanyFilter.value"
          border
        />
        <ElCheckbox
          v-bind="formInfoData.sameHrFilter"
          v-model="conf.formData.sameHrFilter.value"
          border
        />
      </ElSpace>
    </div>

    <div style="font-weight: 700; margin-bottom: 12px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 22px;">🤖</span> AI 智能大脑
    </div>
    <div class="bh-glass-panel" style="margin-bottom: 24px; border: 1px solid rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05);">
      <Ai />
    </div>

    <div style="font-weight: 700; margin-bottom: 12px; font-size: 18px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 22px;">⚡️</span> 高级防风控与系统设置
    </div>
    <div class="bh-glass-panel" style="margin-bottom: 24px;">
      <ElSpace wrap :size="20">
        <ElFormItem :label="formInfoData.deliveryLimit.label">
          <ElInputNumber
            v-bind="formInfoData.deliveryLimit"
            v-model="conf.formData.deliveryLimit.value"
            :min="1"
            :max="150"
            :step="10"
          />
        </ElFormItem>
        <ElFormItem
          v-for="(item, key) in formInfoData.delay"
          :key
          :label="item.label"
          :data-help="item['data-help']"
        >
          <ElInputNumber
            v-model="conf.formData.delay[key]"
            :min="1"
            :max="99999"
            :disabled="item.disable"
          />
        </ElFormItem>
        
        <ElFormItem label="自定义招呼语">
          <ElInput v-model="conf.formData.customGreeting.value" placeholder="发送Boss默认招呼语后再发送此段话" />
        </ElFormItem>

        <ElCheckbox
          v-bind="formInfoData.notification"
          v-model="conf.formData.notification.value"
          border
        />
        
        <div>
          <ElCheckbox
            v-bind="formInfoData.useCache"
            v-model="conf.formData.useCache.value"
            border
            style="margin-right: 10px;"
          />
          <ElButton
            v-if="conf.formData.useCache.value"
            type="warning"
            @click="() => getCacheManager().clearCache()"
          >
            清空缓存
          </ElButton>
        </div>
      </ElSpace>
    </div>
  </ElForm>
  <div style="margin-top: 15px">
    <ElButton type="success" data-help="保存配置，会自动刷新页面。" @click="conf.confSaving">
      保存配置
    </ElButton>
    <ElButton type="warning" data-help="重新加载本地配置" @click="conf.confReload">
      重载配置
    </ElButton>

    <ElButton
      type="danger"
      data-help="清空配置,不会帮你保存,可以重载恢复"
      @click="conf.confDelete"
    >
      清空配置
    </ElButton>
  </div>
</template>

<style lang="scss" scoped>
</style>
