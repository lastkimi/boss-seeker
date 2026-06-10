import { ElMessage } from 'element-plus'
import { miTem } from 'mitem'

import { useChat } from '@/composables/useChat'
import { useModel } from '@/composables/useModel'
import { useStatistics } from '@/composables/useStatistics'
import { Message } from '@/composables/useWebSocket'
import { counter } from '@/message'
import { useConf } from '@/stores/conf'
import type { logData } from '@/stores/log'
import { useUser } from '@/stores/user'
import {
  ActivityError,
  AIFilteringError,
  FriendStatusError,
  GoldHunterError,
  GreetError,
  RepeatError,
} from '@/types/deliverError'
import { getCurDay, getCurTime } from '@/utils'

import { SignedKeyLLM } from '../useModel/signedKey'
import type { StepFactory } from './type'
import {
  errorHandle,
  parseFiltering,
  requestBossData,
  sameCompanyKey,
  sameHrKey,
} from './utils'

export function handles() {
  const { chatMessages } = useChat()
  const model = useModel()
  const conf = useConf()
  const statistics = useStatistics()
  const now = Date.now()
  const communicated: StepFactory = () => {
    return async ({ data }) => {
      if (data.contact) {
        throw new RepeatError(`已经沟通过`)
      }
    }
  }

  const SameCompanyFilter: StepFactory = () => {
    if (!conf.formData.sameCompanyFilter.value) {
      return
    }
    let someSet: Set<string> | null = null
    let count = 0
    const uid = useUser().getUserId()
    if (uid == null) {
      throw new RepeatError('没有获取到uid')
    }
    return {
      fn: async ({ data }) => {
        if (someSet == null) {
          someSet = new Set<string>()
          const data = await counter.storageGet<Record<string, string[]>>(sameCompanyKey, {})
          for (const id of data[uid] ?? []) {
            someSet.add(id)
          }
        }
        const id = data.encryptBrandId
        if (id != null && someSet.has(id)) {
          throw new RepeatError('相同公司已投递')
        }
      },
      after: async ({ data }) => {
        someSet?.add(data.encryptBrandId)
        count++
        if (count > 3) {
          const oldData = await counter.storageGet<Record<string, string[]>>(sameCompanyKey, {})
          await counter.storageSet(sameCompanyKey, {
            ...oldData,
            [uid]: Array.from(someSet ?? []),
          })
          count = 0
        }
      },
    }
  }

  const SameHrFilter: StepFactory = () => {
    if (!conf.formData.sameHrFilter.value) {
      return
    }
    let someSet: Set<string> | null = null
    let count = 0
    const uid = useUser().getUserId()
    if (uid == null) {
      throw new RepeatError('没有获取到uid')
    }
    return {
      fn: async ({ data }) => {
        if (someSet == null) {
          someSet = new Set<string>()
          const data = await counter.storageGet<Record<string, string[]>>(sameHrKey, {})
          for (const id of data[uid] ?? []) {
            someSet.add(id)
          }
        }
        const id = data.encryptBossId
        if (id != null && someSet.has(id)) {
          throw new RepeatError('相同hr已投递')
        }
      },
      after: async ({ data }) => {
        someSet?.add(data.encryptBossId)
        count++
        if (count > 3) {
          const oldData = await counter.storageGet<Record<string, string[]>>(sameHrKey, {})
          await counter.storageSet(sameHrKey, {
            ...oldData,
            [uid]: Array.from(someSet ?? []),
          })
          count = 0
        }
      },
    }
  }



  const jobFriendStatus: StepFactory = () => {
    if (!conf.formData.friendStatus.value) {
      return
    }
    return async (_, ctx) => {
      const content = ctx.listData.card?.friendStatus

      if (content != null && content !== 0) {
        throw new FriendStatusError('已经是好友了')
      }
    }
  }

  const goldHunterFilter: StepFactory = () => {
    if (!conf.formData.goldHunterFilter.value) {
      return
    }
    return async ({ data }, _ctx) => {
      if (data?.goldHunter === 1) {
        statistics.todayData.goldHunterFilter++
        throw new GoldHunterError('猎头过滤')
      }
    }
  }

  const aiFiltering: StepFactory = () => {
    if (!conf.formData.aiFiltering.enable) {
      return
    }
    const curModel = model.modelData.find((v) => conf.formData.aiFiltering.model === v.key)
    if (!curModel && !conf.formData.aiFiltering.vip) {
      throw new AIFilteringError('没有找到AI筛选的模型')
    }
    const gpt = model.getModel(
      curModel,
      conf.formData.aiFiltering.prompt,
      conf.formData.aiFiltering.vip,
    )
    if (gpt instanceof SignedKeyLLM) {
      void gpt.checkResume()
    }
    return async (_, ctx) => {
      // const chatInput = chatInputInit(model)
      try {
        const { content, prompt, reasoning_content } = await gpt.message(
          {
            data: {
              data: ctx.listData,
              boss: ctx.bossData,
              card: ctx.listData.card!,
              amap: {
                straightDistance: 0,
                drivingDistance: 0,
                drivingDuration: 0,
                walkingDistance: 0,
                walkingDuration: 0,
              },
            },
            amap: '',
            json: true,
            // onStream: chatInput.handle,
            onPrompt: (s) => chatBossMessage(ctx, s),
          },
          'aiFiltering',
        )

        ctx.aiFilteringQ = prompt
        if (content == null) {
          return
        }
        const { res, message, rating } = parseFiltering(content)

        ctx.aiFilteringAjson = res || {}
        ctx.aiFilteringAtext = message
        ctx.aiFilteringR = reasoning_content

        // chatInput.end(message)
        if (rating < (conf.formData.aiFiltering.score ?? 10)) {
          throw new AIFilteringError(message)
        }
      } catch (e) {
        // chatInput.end('Err~')
        throw new AIFilteringError(errorHandle(e))
      }
    }
  }

  const activityFilter: StepFactory = () => {
    if (!conf.formData.activityFilter.value) {
      return
    }
    return async (_, ctx) => {
      try {
        const activeText = ctx.listData.card?.activeTimeDesc
        const activeTime = ctx.listData.card?.brandComInfo?.activeTime
        // 暂时先用文本匹配吧, activeTime备用(没确认是否准确)
        if (!activeText && !activeTime) {
          throw new ActivityError(`无活跃内容,如果全失败请反馈`)
        } else if (!activeText && activeTime) {
          if (now - activeTime >= 7 * 24 * 60 * 60 * 1000) {
            throw new ActivityError(`不活跃 [${new Date(activeTime).toLocaleString()}]`)
          }
        } else if (!activeText) {
          throw new ActivityError(`无活跃信息,如果全失败请反馈`)
        } else if (activeText.includes('月') || activeText.includes('年'))
          throw new ActivityError(`不活跃, [${activeText}]`)
      } catch (e) {
        statistics.todayData.activityFilter++
        throw new ActivityError(errorHandle(e))
      }
    }
  }

  const customGreeting: StepFactory = () => {
    const template = miTem.compile(conf.formData.customGreeting.value)
    const uid = useUser().getUserId()
    if (uid == null) {
      ElMessage.error('没有获取到uid,请刷新重试')
      throw new GreetError('没有获取到uid')
    }
    return {
      after: async (args, ctx) => {
        try {
          if (ctx.bossData == null) {
            const bossData = await requestBossData(ctx.listData.card!)
            ctx.bossData = bossData
          }
          let msg = conf.formData.customGreeting.value
          if (conf.formData.greetingVariable.value && ctx.listData.card) {
            msg = template({
              data: ctx.listData,
              boss: ctx.bossData,
              card: ctx.listData.card,
              amap: {
                straightDistance: 0,
                drivingDistance: 0,
                drivingDuration: 0,
                walkingDistance: 0,
                walkingDuration: 0,
              },
            })
          }

          ctx.message = msg

          const buf = new Message({
            form_uid: uid.toString(),
            to_uid: ctx.bossData.data.bossId.toString(),
            to_name: ctx.bossData.data.encryptBossId, // encryptUserId
            content: msg,
          })

          buf.send()
        } catch (e) {
          throw new GreetError(errorHandle(e))
        }
      },
    }
  }

  function chatBossMessage(ctx: logData, msg: string) {
    const d = new Date()
    chatMessages.value.push({
      id: d.getTime(),
      role: 'boss',
      content: msg,
      date: [getCurDay(d), getCurTime(d)],
      name: ctx.listData.brandName,
      avatar: ctx.listData.brandLogo,
    })
  }

  const aiGreeting: StepFactory = () => {
    let curModel = model.modelData.find((v) => conf.formData.aiGreeting.model === v.key)
    if (!curModel && !conf.formData.aiGreeting.vip && model.modelData.length > 0) {
      curModel = model.modelData[0]
      conf.formData.aiGreeting.model = curModel.key
      void conf.confSaving()
    }
    if (!curModel && !conf.formData.aiGreeting.vip) {
      ElMessage.warning('没有找到招呼语的模型')
      return
    }
    const gpt = model.getModel(
      curModel,
      conf.formData.aiGreeting.prompt,
      conf.formData.aiGreeting.vip,
    )
    if (gpt instanceof SignedKeyLLM) {
      void gpt.checkResume()
    }
    const uid = useUser().getUserId()
    if (uid == null) {
      ElMessage.error('没有获取到uid,请刷新重试')
      throw new GreetError('没有获取到uid')
    }
    return {
      after: async (args, ctx) => {
        // const chatInput = chatInputInit(model)
        try {
          if (ctx.bossData == null) {
            const bossData = await requestBossData(ctx.listData.card!)
            ctx.bossData = bossData
          }
          const { content, prompt, reasoning_content } = await gpt.message(
            {
              data: {
                data: ctx.listData,
                boss: ctx.bossData,
                card: ctx.listData.card!,
                resumeStr: await useUser().getUserResumeString({}),
                amap: {},
              },
              // onStream: chatInput.handle,
              onPrompt: (s) => chatBossMessage(ctx, s),
            },
            'aiGreeting',
          )
          ctx.aiGreetingQ = prompt
          if (content == null) {
            return
          }
          ctx.message = content
          ctx.aiGreetingA = content
          ctx.aiGreetingR = reasoning_content
          // chatInput.end(content)
          const buf = new Message({
            form_uid: uid.toString(),
            to_uid: ctx.bossData.data.bossId.toString(),
            to_name: ctx.bossData.data.encryptBossId, // encryptUserId
            content,
          })
          buf.send()
        } catch (e) {
          logger.error('打招呼出错:', e)
          // chatInput.end('Err~')
          throw new GreetError(errorHandle(e))
        }
      },
    }
  }

  const greeting: StepFactory = () => {
    if (conf.formData.aiGreeting.enable) {
      // AI招呼语
      return aiGreeting()
    } else if (conf.formData.customGreeting.enable) {
      // 自定义招呼语
      return customGreeting()
    }
  }



  return {
    communicated,
    SameCompanyFilter,
    SameHrFilter,
    goldHunterFilter,
    jobFriendStatus,
    aiFiltering,
    activityFilter,
    greeting,
  }
}
