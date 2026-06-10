import { watchThrottled } from '@vueuse/core'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type { Middleware } from 'openapi-fetch'
import createClient from 'openapi-fetch'
import { defineStore } from 'pinia'
import { watch } from 'vue'

import { ref, toRaw } from '#imports'
import type { modelData } from '@/composables/useModel'
import { useModel } from '@/composables/useModel'
import { counter } from '@/message'
import { useUser } from '@/stores/user'
import type { components, paths } from '@/types/openapi'
import { logger } from '@/utils/logger'

type SignedKeyInfo = components['schemas']['KeyInfo']



// logger.debug("import.meta.env",import.meta.env)

function sdbmCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = char + (hash << 6) + (hash << 16) - hash
  }
  return hash.toString()
}

export function signedKeyReqHandler(data: any, message = true): string | undefined {
  // logger.debug('请求响应', data)
  const { error } = data
  if (error != null) {
    let errMsg = '未知错误'
    if (error instanceof Error) {
      errMsg = error.message
    } else if (error instanceof Response) {
      errMsg = error.statusText
    } else if (typeof error === 'string') {
      errMsg = error
    } else if (error != null && typeof error === 'object') {
      if ('detail' in error) {
        errMsg = JSON.stringify(error.detail)
      } else if ('message' in error) {
        errMsg = JSON.stringify(error.message)
      }
    }
    if (message) {
      ElMessage.error(errMsg)
    }
    return errMsg
  }
}

export type Client = ReturnType<typeof createClient<paths>>
const baseUrl = 'https://boss-helper.ocyss.icu'
// const baseUrl =
//   import.meta.env.PROD || import.meta.env.TEST || import.meta.env.WXT_TEST
//     ? 'https://boss-helper.ocyss.icu'
//     : 'http://localhost:8002'

export const useSignedKey = defineStore('signedKey', () => {
  const signedKey = ref<string | null>(null)
  const signedKeyBak = ref<string | null>(null)
  const signedKeyInfo = ref<SignedKeyInfo>()
  const signedKeyStorageKey = 'sync:signedKey'
  const signedKeyInfoStorageKey = 'sync:signedKeyInfo'
  const user = useUser()

  const client = createClient<paths>({ baseUrl })

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      if (request.headers.get('Authorization') == null) {
        request.headers.set('Authorization', `Bearer ${signedKey.value}`)
      }
      if (request.headers.get('BossHelperUserID') == null) {
        const uid = user.getUserId()
        if (uid != null) {
          request.headers.set('BossHelperUserID', uid.toString())
        }
      }
      return request
    },
  }

  client.use(authMiddleware)

  watch(signedKey, (v) => {
    if (v == null || v === '') {
      return
    }
    void counter.storageSet(signedKeyStorageKey, v).catch((e) => {
      logger.error('保存密钥失败', e)
      ElMessage.error('保存密钥失败')
    })
  })

  watchThrottled(
    signedKeyInfo,
    (v) => {
      if (v == null) {
        return
      }
      void counter.storageSet(signedKeyInfoStorageKey, toRaw(v)).catch((e) => {
        logger.error('保存密钥信息失败', e)
        ElMessage.error('保存密钥信息失败')
      })
    },
    { throttle: 2000 },
  )



  async function getSignedKeyInfo(token?: string) {
    const headers: Record<string, string | undefined> = {
      Authorization: `Bearer ${token ?? signedKey.value}`,
    }
    if (token == null && signedKey.value == null) {
      delete headers.Authorization
    }

    const data = await client.GET('/v1/key/info', {
      headers,
    })
    signedKeyReqHandler(data)
    return data.data
  }

  async function refreshSignedKeyInfo(token?: string) {
    if (token == null && (signedKey.value == null || signedKey.value === '')) {
      return false
    }
    const model = useModel()
    void client.GET('/v1/llm/model_list').then(async ({ data }) => {
      model.modelData = [
        ...model.modelData,
        ...((data as modelData[]) ?? []).filter(
          (item) => !model.modelData.some((m) => m.key === item.key),
        ),
      ]
    })

    const data = await getSignedKeyInfo(token)
    signedKeyInfo.value = data
    return true
  }

  async function initSignedKey() {
    const key = await counter.storageGet<string>(signedKeyStorageKey)
    if (key == null) {
      return
    }
    const info = await counter.storageGet<SignedKeyInfo>(signedKeyInfoStorageKey)
    if (info != null) {
      signedKeyInfo.value = info
    }

    if (await refreshSignedKeyInfo(key)) {
      const userId = user.getUserId()?.toString()
      const matchedUser = signedKeyInfo.value?.users.find((item) => item.user_id === userId)
      if (matchedUser == null) {
        signedKeyBak.value = key
      } else {
        signedKey.value = key
        void client.GET('/v1/llm/model_list').then(async ({ data }) => {
          const model = useModel()
          model.modelData = [
            ...model.modelData,
            ...((data as modelData[]) ?? []).filter(
              (item) => !model.modelData.some((m) => m.key === item.key),
            ),
          ]
        })
      }
    }
  }

  async function updateResume() {
    const resume = await user.getUserResumeData(true)
    const code = sdbmCode(JSON.stringify(resume))
    let resp = await client.POST('/v1/key/resume', {
      body: {
        code,
      },
    })
    let errMsg = signedKeyReqHandler(resp)
    if (errMsg != null) {
      return
    }
    resp = await client.POST('/v1/key/resume', {
      body: {
        code,
        data: resume as any,
      },
    })
    errMsg = signedKeyReqHandler(resp)
    if (errMsg == null) {
      ElMessage.success('更新简历成功')
    }
  }

  return {
    signedKey,
    signedKeyBak,
    client,
    signedKeyInfo,
    signedKeyReqHandler,
    initSignedKey,
    sdbmCode,
    updateResume,
    getSignedKeyInfo,
    refreshSignedKeyInfo,
  }
})

window.__q_useSignedKey = useSignedKey
