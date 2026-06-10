<script lang="ts" setup>
import {
  ElButton,
  ElButtonGroup,
  ElCol,
  ElProgress,
  ElRow,
  ElStatistic,
  ElCard,
  ElMessage,
  ElTable,
  ElTag,
  ElCollapse,
  ElCollapseItem,
} from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import Alert from '@/components/Alert'
import { useCommon } from '@/composables/useCommon'
import { useStatistics } from '@/composables/useStatistics'
import { useConf } from '@/stores/conf'
import { jobList } from '@/stores/jobs'
import { useLog } from '@/stores/log'
import { delay, notification } from '@/utils'
import { logger } from '@/utils/logger'

import { useDeliver } from '../hooks/useDeliver'
import { usePager } from '../hooks/usePager'

import AutoPilot from './AutoPilot.vue'
import Config from './Config.vue'
import { useAutoPilot } from '@/composables/useAutoPilot'
import { useRecords } from '@/composables/useRecords'

// Echarts setup
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { FunnelChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  FunnelChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const log = useLog()
const statistics = useStatistics()
const common = useCommon()
const deliver = useDeliver()
const { next, page } = usePager()
const conf = useConf()
const recordsStore = useRecords()

const deliveryLimit = computed(() => {
  return conf.formData.deliveryLimit.value
})

function stopDeliver() {
  common.deliverStop = true
}

async function startBatch() {
  common.deliverLock = true
  common.deliverStop = false
  let stepMsg = '投递结束'
  try {
    logger.debug('start batch', page)
    let oldLen = 0
    let oldFirstJobId = ''
    while (!common.deliverStop) {
      await delay(conf.formData.delay.deliveryStarts)
      if (jobList._list.value.length === 0) {
        stepMsg = '投递结束, job列表为空'
        break
      }
      const currentFirstJobId = jobList._list.value[0]?.encryptJobId ?? ''
      if (
        (location.href.includes('/web/geek/job-recommend') ||
          location.href.includes('/web/geek/jobs')) &&
        oldLen === jobList._list.value.length &&
        oldFirstJobId === currentFirstJobId
      ) {
        stepMsg = '投递结束, 未能获取更多岗位(job列表无变化)'
        break
      }
      oldLen = jobList._list.value.length
      oldFirstJobId = currentFirstJobId
      await deliver.jobListHandle()
      if (common.deliverStop) {
        break
      }
      await delay(conf.formData.delay.deliveryPageNext)
      if (!next()) {
        stepMsg = '投递结束, 无法继续下一页'
        break
      }
    }
  } catch (e) {
    logger.error('获取失败', e)
    stepMsg = `获取失败! - ${e}`
  } finally {
    logger.debug('日志信息', log.data)
    conf.formData.notification.value && (await notification(stepMsg))
    ElMessage.info(stepMsg)
    common.deliverLock = false

    const autoPilot = useAutoPilot()
    if (autoPilot.state.isActive && !common.deliverStop && stepMsg.includes('投递结束')) {
      logger.info('自动巡航：当前关键词处理完毕，准备进入下一个。')
      setTimeout(() => {
        autoPilot.nextKeyword()
      }, 3000)
    }
  }
}

function resetFilter() {
  jobList._list.value.forEach((v) => {
    switch (v.status.status) {
      case 'success':
        break
      case 'pending':
      case 'wait':
      case 'running':
      case 'error':
      case 'warn':
      default:
        v.status.setStatus('wait', '等待中')
    }
  })
}

onMounted(async () => {
  statistics.updateStatistics()

  const autoPilot = useAutoPilot()
  await autoPilot.initState()
  await recordsStore.initRecords()

  if (autoPilot.state.isActive) {
    const currentUrl = new URL(window.location.href)
    const expectedKeyword = autoPilot.getCurrentKeyword()
    
    if (currentUrl.searchParams.get('query') === expectedKeyword) {
      logger.info('自动巡航：已到达目标页面，等待职位列表加载...')
      let retries = 0
      const checkInterval = setInterval(() => {
        if (jobList._list.value.length > 0 || retries > 30) {
          clearInterval(checkInterval)
          if (!common.deliverLock) {
            logger.info('自动巡航：开始投递！')
            startBatch()
          }
        }
        if (jobList._list.value.length === 0 && retries % 5 === 0) {
          logger.info(`自动巡航：仍在等待职位列表加载...已等待 ${retries} 秒`)
        }
        retries++
      }, 1000)
    } else {
      logger.info('自动巡航：当前 URL 的搜索词与预期不符，执行自动跳转...')
      autoPilot.navigate()
    }
  }
})

// === Echarts Options ===

// Funnel Chart (Today's Conversion)
const funnelOption = computed(() => {
  const t = statistics.todayData
  // Sum up all filters
  const filteredOut =
    t.activityFilter +
    t.goldHunterFilter

  const totalScraped = t.total
  const filteredPassed = Math.max(0, totalScraped - filteredOut)
  const delivered = t.success
  const communicated = t.repeat // Already communicated can act as a proxy or we can use separate stats if available

  return {
    title: { text: '今日转化漏斗', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b} : {c}' },
    series: [
      {
        name: '转化漏斗',
        type: 'funnel',
        left: '10%',
        width: '80%',
        label: { formatter: '{b} ({c})' },
        labelLine: { show: true },
        itemStyle: { opacity: 0.8 },
        data: [
          { value: totalScraped, name: '获取岗位' },
          { value: filteredPassed, name: '满足条件' },
          { value: delivered, name: '成功投递' },
        ].sort((a, b) => b.value - a.value),
      },
    ],
  }
})

// Line Chart (Historical Deliveries)
const lineOption = computed(() => {
  // Sort data chronologically for line chart
  const history = [...statistics.statisticsData].reverse()
  // Include today if there's data, else only history
  if (statistics.todayData.total > 0 && !history.find((h) => h.date === statistics.todayData.date)) {
    history.push(statistics.todayData)
  }
  // Take last 7 days
  const last7 = history.slice(-7)

  const dates = last7.map((item) => item.date || '未知')
  const totalData = last7.map((item) => item.total || 0)
  const successData = last7.map((item) => item.success || 0)

  return {
    title: { text: '近7天投递趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['扫描总数', '投递成功'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '扫描总数', type: 'line', data: totalData, smooth: true },
      { name: '投递成功', type: 'line', data: successData, smooth: true },
    ],
  }
})
</script>

<template>
  <div class="statistics-dashboard">
    <Alert
      id="config-statistics"
      style="margin-bottom: 15px"
      title="数据看板：展示当前的漏斗转化与投递趋势。投递上限建议 120-140, boss限制最高150"
      type="warning"
    />

    <!-- Top Key Metrics -->
    <ElRow :gutter="20" class="metric-row">
      <ElCol :span="6">
        <ElCard shadow="hover" class="bh-glass-panel">
          <ElStatistic :value="statistics.todayData.total" title="今日扫描岗位" suffix="份" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="hover" class="bh-glass-panel">
          <ElStatistic :value="statistics.todayData.success" title="今日成功投递" suffix="份" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="hover" class="bh-glass-panel">
          <ElStatistic
            :value="
              statistics.todayData.total
                ? Number(((statistics.todayData.activityFilter / statistics.todayData.total) * 100).toFixed(1))
                : 0
            "
            title="今日不活跃过滤比例"
            suffix="%"
          />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard shadow="hover" class="bh-glass-panel">
          <ElStatistic
            :value="
              statistics.todayData.total
                ? Number(((statistics.todayData.repeat / statistics.todayData.total) * 100).toFixed(1))
                : 0
            "
            title="今日已沟通比例"
            suffix="%"
          />
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- Charts -->
    <ElRow :gutter="20" class="chart-row">
      <ElCol :span="10">
        <ElCard shadow="hover" class="chart-card bh-glass-panel">
          <v-chart class="chart" :option="funnelOption" autoresize />
        </ElCard>
      </ElCol>
      <ElCol :span="14">
        <ElCard shadow="hover" class="chart-card bh-glass-panel">
          <v-chart class="chart" :option="lineOption" autoresize />
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- Controls -->
    <AutoPilot />

    <!-- Configuration & Filters -->
    <ElCard shadow="never" class="controls-card bh-glass-panel" style="margin-top: 10px;">
      <ElCollapse>
        <ElCollapseItem title="⚙️ 投递筛选与高级配置" name="config">
          <div id="ehp-native-filter" style="margin-bottom: 15px;"></div>
          <Config />
        </ElCollapseItem>
      </ElCollapse>
    </ElCard>

    <ElCard shadow="never" class="controls-card">
      <div style="display: flex; align-items: center;">
        <ElButtonGroup style="margin-right: 30px">
          <ElButton
            type="primary"
            data-help="点击开始就会开始投递"
            :loading="common.deliverLock"
            @click="startBatch"
          >
            开始
          </ElButton>
          <ElButton
            v-if="!common.deliverLock && common.deliverStop"
            type="warning"
            data-help="重置已被筛选的岗位，开始将重新处理"
            @click="resetFilter"
          >
            重置筛选
          </ElButton>
          <ElButton
            v-if="common.deliverLock && !common.deliverStop"
            type="warning"
            data-help="暂停后应该能继续"
            @click="stopDeliver()"
          >
            暂停
          </ElButton>
        </ElButtonGroup>
        <div style="flex: 1">
          <div style="margin-bottom: 5px; font-size: 14px; color: #666;">今日投递进度 ({{ statistics.todayData.success }} / {{ deliveryLimit }})</div>
          <ElProgress
            data-help="当日投递进度条"
            :percentage="Number(((statistics.todayData.success / deliveryLimit) * 100).toFixed(1))"
            :status="statistics.todayData.success >= deliveryLimit ? 'success' : ''"
          />
        </div>
      </div>
    </ElCard>

    <!-- Delivery Records Table -->
    <ElCard shadow="never" class="records-card">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: bold;">投递与聊天记录 (最近500条)</span>
          <ElButton size="small" type="danger" @click="recordsStore.clearRecords()">清空记录</ElButton>
        </div>
      </template>
      <ElTable :data="recordsStore.records" style="width: 100%" max-height="400" stripe size="small">
        <ElTableColumn prop="date" label="时间" width="160" />
        <ElTableColumn prop="jobName" label="岗位" min-width="120" show-overflow-tooltip />
        <ElTableColumn prop="companyName" label="公司" min-width="150" show-overflow-tooltip />
        <ElTableColumn prop="hrName" label="HR" width="100" show-overflow-tooltip />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'success' ? 'success' : row.status === 'warn' ? 'warning' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : row.status === 'warn' ? '警告' : '过滤/失败' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="message" label="原因/消息" min-width="180" show-overflow-tooltip />
      </ElTable>
    </ElCard>
  </div>
</template>

<style scoped>
.statistics-dashboard {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.metric-row {
  margin-bottom: 15px;
}

.chart-row {
  margin-bottom: 15px;
}

.chart-card {
  height: 350px;
}

.chart {
  width: 100%;
  height: 310px;
}

.controls-card {
  margin-top: 10px;
}

.records-card {
  margin-top: 10px;
}
</style>
