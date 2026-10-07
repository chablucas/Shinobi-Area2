import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchClassicRules,
  fetchTeamRules,
  type ClassicRule,
  type TeamRulesPayload,
} from '../services/ruleAdminApi'

export const useRulesDataStore = defineStore('rulesData', () => {
  const classicRules = ref<ClassicRule[]>([])
  const teamRules = ref<TeamRulesPayload | null>(null)

  const loaded = ref(false)
  const loading = ref(false)

  let loadPromise: Promise<void> | null = null

async function loadRules(token?: string, force = false): Promise<void> {
  if (loaded.value && !force) {
    return
  }

  if (loadPromise && !force) {
    return loadPromise
  }

  loading.value = true

  loadPromise = Promise.all([
    fetchClassicRules(token),
    fetchTeamRules(token),
  ])
    .then(([classic, team]) => {
      classicRules.value = classic
      teamRules.value = team
      loaded.value = true
    })
    .finally(() => {
      loading.value = false
      loadPromise = null
    })

  return loadPromise
}

  function clearRulesCache() {
    classicRules.value = []
    teamRules.value = null
    loaded.value = false
    loadPromise = null
  }

  return {
    classicRules,
    teamRules,
    loaded,
    loading,
    loadRules,
    clearRulesCache,
  }
})