<script lang="ts" setup>
import {
  ElButton,
  ElCard,
  ElInput,
  ElTag,
  ElMessage,
  ElDialog,
  ElForm,
  ElFormItem,
  ElSelect,
  ElOption,
  ElInputNumber
} from 'element-plus'
import { ref, computed, h } from 'vue'
import { useAutoPilot } from '@/composables/useAutoPilot'
import { useModel, llmIcon } from '@/composables/useModel'
import { openai } from '@/composables/useModel/openai'
import { useUser } from '@/stores/user'

const autoPilot = useAutoPilot()
const modelState = useModel()
const user = useUser()

const inputKeyword = ref('')
const generateDialog = ref(false)
const generating = ref(false)
const selectedModelKey = ref('')

// Only non-VIP models can be used for arbitrary prompt generation
const availableModels = computed(() => {
  return modelState.modelData.filter(m => m.vip == null)
})

function addKeyword() {
  const k = inputKeyword.value.trim()
  if (k && !autoPilot.state.keywords.includes(k)) {
    autoPilot.state.keywords.push(k)
    autoPilot.saveState()
  }
  inputKeyword.value = ''
}

function removeKeyword(index: number) {
  autoPilot.state.keywords.splice(index, 1)
  autoPilot.saveState()
}

function start() {
  try {
    autoPilot.start()
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

function stop() {
  autoPilot.stop()
  ElMessage.warning('已停止自动巡航')
}

async function openGenerateDialog() {
  if (availableModels.value.length === 0) {
    ElMessage.warning('您没有配置自定义模型（API Key），无法使用 AI 策略生成。请手动添加关键词。')
    return
  }
  generateDialog.value = true
}

async function generateKeywords() {
  if (!selectedModelKey.value) {
    ElMessage.error('请选择一个模型')
    return
  }
  generating.value = true
  try {
    const md = modelState.modelData.find(m => m.key === selectedModelKey.value)
    if (!md || !md.data) throw new Error('模型无效')

    const resumeStr = await user.getUserResumeString({})
    const prompt = [
      { role: 'system' as const, content: '你是一个资深的猎头和职业规划师。请根据用户的简历，发散出 3 到 5 个最适合在招聘软件上搜索岗位的关键词（如 "前端架构", "Vue高级开发"）。返回格式为逗号分隔的纯文本，不要有其他解释说明。' },
      { role: 'user' as const, content: '我的简历如下：\n{{ resumeStr }}' }
    ]

    const gpt = new openai.Gpt(md.data, prompt)
    const msg = await gpt.message({ data: { resumeStr } })
    const res = msg.content
    
    if (res) {
      const kws = res.split(/[,，、\n]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
      const uniqueKws = Array.from(new Set(kws)).slice(0, 5)
      autoPilot.state.keywords = [...new Set([...autoPilot.state.keywords, ...uniqueKws])]
      await autoPilot.saveState()
      ElMessage.success('已生成搜索策略！')
      generateDialog.value = false
    }
  } catch (e: any) {
    ElMessage.error('生成失败: ' + e.message)
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <ElCard shadow="hover" style="margin-top: 15px;" class="bh-glass-panel">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; font-size: 16px;">🤖 AI 自动巡航 (Auto-Pilot)</span>
        <ElButton v-if="autoPilot.state.isActive" type="danger" @click="stop">停止巡航</ElButton>
        <ElButton v-else type="primary" :disabled="autoPilot.state.keywords.length === 0" @click="start">开始巡航</ElButton>
      </div>
    </template>
    
    <div style="margin-bottom: 15px;">
      <div style="margin-bottom: 5px; font-size: 14px; color: #666;">搜索策略词队列：</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
        <ElTag 
          v-for="(kw, index) in autoPilot.state.keywords" 
          :key="kw"
          closable
          :type="index === autoPilot.state.currentIndex && autoPilot.state.isActive ? 'success' : 'info'"
          @close="removeKeyword(index)"
        >
          {{ kw }}
        </ElTag>
        <span v-if="autoPilot.state.keywords.length === 0" style="font-size: 13px; color: #999;">暂无关键词，请手动添加或让AI生成。</span>
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center;">
        <ElInput v-model="inputKeyword" placeholder="手动输入关键词" size="small" style="width: 200px;" @keyup.enter="addKeyword" />
        <ElButton size="small" @click="addKeyword">添加</ElButton>
        <ElButton size="small" type="success" plain @click="openGenerateDialog">✨ AI 帮我生成</ElButton>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
        <span style="font-size: 13px; color: #666;">每个策略词投递上限：</span>
        <ElInputNumber v-model="autoPilot.state.keywordLimit" :min="1" :max="120" size="small" @change="autoPilot.saveState()" />
        <span style="font-size: 12px; color: #999;">(到达上限将自动切到下一个策略)</span>
      </div>
    </div>
    
    <div v-if="autoPilot.state.isActive" style="padding: 10px; background: var(--el-color-success-light-9); border-radius: 4px; color: var(--el-color-success); font-size: 13px;">
      <b>正在巡航中：</b> 当前搜索关键词 [{{ autoPilot.getCurrentKeyword() }}]。<br/>
      系统投递完毕本关键词所有页后，将自动跳转到下一个关键词。
    </div>
  </ElCard>

  <ElDialog v-model="generateDialog" title="AI 生成搜索策略" width="500px">
    <ElForm label-width="80px">
      <ElFormItem label="使用模型">
        <ElSelect
          v-model="selectedModelKey"
          placeholder="选择模型"
          style="width: 100%"
        >
          <ElOption
            v-for="item in availableModels"
            :key="item.key"
            :label="item.name || item.data?.mode || '未命名模型'"
            :value="item.key"
          >
            <div style="display: flex; align-items: center">
              <span v-if="item.vip != null" style="display: inline-flex; margin-right: 6px" v-html="llmIcon.vip" />
              <span>{{ item.name || item.data?.mode || '未命名模型' }}</span>
            </div>
          </ElOption>
        </ElSelect>
      </ElFormItem>
      <div style="font-size: 12px; color: #666; margin-left: 80px;">将提取您的在线简历发送给大模型，生成最匹配的求职关键词。</div>
    </ElForm>
    <template #footer>
      <ElButton @click="generateDialog = false">取消</ElButton>
      <ElButton type="primary" :loading="generating" @click="generateKeywords">开始分析生成</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
</style>
