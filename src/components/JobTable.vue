<script setup lang="ts">
import { ElTable, ElTableColumn, ElTag, ElLink, ElSpace, ElButton } from 'element-plus'
import { computed } from 'vue'

import type { MyJobListData } from '@/stores/jobs'
import { jobList } from '@/stores/jobs'

const props = defineProps<{
  jobs: MyJobListData[]
}>()

function stateColor(state?: string): 'success' | 'warning' | 'info' | 'danger' | '' {
  switch (state) {
    case 'pending':
    case 'wait':
      return 'info'
    case 'error':
      return 'danger'
    case 'warn':
      return 'warning'
    case 'success':
      return 'success'
    case 'running':
      return '' // default primary-like
  }
  return 'info'
}

function getActiveTimeType(activeTime?: number): 'success' | 'warning' | 'danger' | 'info' {
  if (!activeTime) return 'info'

  const now = Date.now()
  const diffDays = (now - activeTime) / (1000 * 60 * 60 * 24)

  if (diffDays <= 2) return 'success'
  if (diffDays <= 7) return 'warning'
  return 'danger'
}

function getActiveTimeText(activeTime?: number): string {
  if (!activeTime) return '未知'
  const now = Date.now()
  const diffDays = (now - activeTime) / (1000 * 60 * 60 * 24)
  if (diffDays <= 0.5) return '刚刚活跃'
  if (diffDays <= 2) return '近日活跃'
  if (diffDays <= 7) return '近周活跃'
  if (diffDays <= 14) return '两周内活跃'
  return '半月以上'
}

const tableData = computed(() => props.jobs)

// Optional: handlers for table actions
function openJobDetail(row: MyJobListData) {
  window.open(`https://www.zhipin.com/job_detail/${row.encryptJobId}.html`, '_blank')
}
</script>

<template>
  <div class="job-table-container">
    <ElTable :data="tableData" style="width: 100%" height="80vh" border stripe>
      <ElTableColumn type="selection" width="55" />
      
      <ElTableColumn label="职位名称" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          <ElLink type="primary" @click="openJobDetail(scope.row)">
            {{ scope.row.jobName }}
          </ElLink>
          <div class="job-salary">{{ scope.row.salaryDesc }}</div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="公司信息" min-width="180">
        <template #default="scope">
          <div class="company-info">
            <img :src="scope.row.brandLogo" class="company-logo" alt="logo" />
            <div class="company-details">
              <span class="company-name">{{ scope.row.brandName }}</span>
              <span class="company-meta">{{ scope.row.brandIndustry }} · {{ scope.row.brandScaleName }}</span>
            </div>
          </div>
        </template>
      </ElTableColumn>

      <ElTableColumn label="活跃度" width="100" align="center">
        <template #default="scope">
          <ElTag :type="getActiveTimeType(scope.row.card?.brandComInfo?.activeTime)" size="small">
            {{ getActiveTimeText(scope.row.card?.brandComInfo?.activeTime) }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="标签" min-width="200">
        <template #default="scope">
          <ElSpace wrap :size="2">
            <ElTag v-for="tag in scope.row.skills" :key="tag" size="small" type="warning" effect="plain">{{ tag }}</ElTag>
          </ElSpace>
        </template>
      </ElTableColumn>
      
      <ElTableColumn label="地区" min-width="120" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.cityName }} {{ scope.row.areaDistrict ? `/ ${scope.row.areaDistrict}` : '' }}
        </template>
      </ElTableColumn>

      <ElTableColumn label="状态" width="100" align="center" fixed="right">
        <template #default="scope">
          <ElTag :type="stateColor(scope.row.status.status)">
            {{ scope.row.status.msg || '待处理' }}
          </ElTag>
        </template>
      </ElTableColumn>

      <ElTableColumn label="操作" width="100" align="center" fixed="right">
        <template #default="scope">
          <ElButton size="small" type="primary" plain @click="openJobDetail(scope.row)">查看</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>

<style scoped>
.job-table-container {
  padding: 1rem;
  background: var(--el-bg-color);
}
.job-salary {
  color: #ff442e;
  font-weight: bold;
  font-size: 0.9em;
  margin-top: 4px;
}
.company-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.company-logo {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
}
.company-details {
  display: flex;
  flex-direction: column;
}
.company-name {
  font-weight: bold;
  color: var(--el-text-color-primary);
}
.company-meta {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
}
</style>
