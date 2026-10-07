import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAllCards } from '../services/cardApi'
import type { Card } from '../types/card'

export const useGameDataStore = defineStore('gameData', () => {
  const cards = ref<Card[]>([])

  const cardsLoaded = ref(false)
  const cardsLoading = ref(false)

  let cardsPromise: Promise<Card[]> | null = null

  async function loadCards(force = false): Promise<Card[]> {
    // Déjà chargées → on les réutilise immédiatement
    if (cardsLoaded.value && !force) {
      return cards.value
    }

    // Une requête est déjà en cours → on attend la même
    // au lieu d'en lancer une deuxième
    if (cardsPromise && !force) {
      return cardsPromise
    }

    cardsLoading.value = true

    cardsPromise = fetchAllCards()
      .then((data) => {
        cards.value = data
        cardsLoaded.value = true

        return data
      })
      .finally(() => {
        cardsLoading.value = false
        cardsPromise = null
      })

    return cardsPromise
  }

  function clearCardsCache() {
    cards.value = []
    cardsLoaded.value = false
    cardsPromise = null
  }

  return {
    cards,
    cardsLoaded,
    cardsLoading,

    loadCards,
    clearCardsCache,
  }
})