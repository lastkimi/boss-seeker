import { defineStore } from 'pinia'
import { ref } from 'vue'
import { counter } from '@/message'

export interface JobRecord {
  id: string
  date: string
  jobName: string
  companyName: string
  hrName: string
  status: string
  message: string
}

const recordsKey = 'local:boss-seeker-records'

export const useRecords = defineStore('records', () => {
  const records = ref<JobRecord[]>([])

  async function initRecords() {
    const data = await counter.storageGet<JobRecord[]>(recordsKey, [])
    records.value = data
  }

  function addRecord(record: JobRecord) {
    records.value.unshift(record)
    if (records.value.length > 500) {
      records.value.pop()
    }
    saveRecords()
  }

  async function saveRecords() {
    await counter.storageSet(recordsKey, records.value)
  }

  function clearRecords() {
    records.value = []
    saveRecords()
  }

  return {
    records,
    initRecords,
    addRecord,
    clearRecords,
  }
})
