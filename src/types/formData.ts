import type { prompt } from '@/composables/useModel/type'

export interface Statistics {
  date: string
  success: number
  total: number
  activityFilter: number
  goldHunterFilter: number
  repeat: number
}

export interface FormData {
  customGreeting: FormDataInput
  deliveryLimit: FormDataInputNumber
  greetingVariable: FormDataCheckbox
  activityFilter: FormDataCheckbox
  friendStatus: FormDataCheckbox
  sameCompanyFilter: FormDataCheckbox
  sameHrFilter: FormDataCheckbox
  goldHunterFilter: FormDataCheckbox
  notification: FormDataCheckbox
  useCache: FormDataCheckbox
  aiGreeting: FormDataAi
  aiFiltering: FormDataAi & { score: number }
  aiReply: FormDataAi
  record: { model?: string[]; enable: boolean }
  // animation?: "frame" | "card" | "together";
  delay: ConfDelay
  version: string
  userId?: number | string
}

export type FormInfoData = {
  [key in keyof Omit<
    FormData,
    'aiGreeting' | 'aiFiltering' | 'delay' | 'userId' | 'version'
  >]: {
    label: string
    'data-help'?: string
  }
} & {
  aiGreeting: FormInfoAi
  aiFiltering: FormInfoAi
  delay: ConfInfoDelay
}

export interface FormInfoAi {
  label: string
  'data-help'?: string
  example: [string, prompt]
}

export interface FormDataInput {
  value: string
  enable: boolean
}

export interface FormDataInputNumber {
  value: number
}

export interface FormDataCheckbox {
  value: boolean
}

export interface FormDataAi {
  model?: string
  vip?: boolean
  prompt: string | prompt
  enable: boolean
}

interface ConfDelay {
  deliveryStarts: number
  deliveryInterval: number
  deliveryPageNext: number
  messageSending: number
}

type ConfInfoDelay = {
  [Key in keyof ConfDelay]: {
    label: string
    'data-help'?: string
    disable?: boolean
  }
}
