<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

import narutoEmote from '@/assets/emotes/naruto.png'
import kibaEmote from '@/assets/emotes/kiba.png'
import rockLeeEmote from '@/assets/emotes/rock-lee.png'
import shikamaruEmote from '@/assets/emotes/shikamaru.png'
import sakuraEmote from '@/assets/emotes/sakura.png'
import kakashiEmote from '@/assets/emotes/kakashi.png'

type EmoteId =
  | 'naruto'
  | 'kiba'
  | 'rock-lee'
  | 'shikamaru'
  | 'sakura'
  | 'kakashi'

interface Emote {
  id: EmoteId
  name: string
  image: string
}

withDefaults(
  defineProps<{
    displayOnly?: boolean
  }>(),
  {
    displayOnly: false,
  }
)

const emit = defineEmits<{
  (e: 'send-emote', emoteId: EmoteId): void
}>()

const emotes: Emote[] = [
  {
    id: 'naruto',
    name: 'Naruto',
    image: narutoEmote,
  },
  {
    id: 'kiba',
    name: 'Kiba',
    image: kibaEmote,
  },
  {
    id: 'rock-lee',
    name: 'Rock Lee',
    image: rockLeeEmote,
  },
  {
    id: 'shikamaru',
    name: 'Shikamaru',
    image: shikamaruEmote,
  },
  {
    id: 'sakura',
    name: 'Sakura',
    image: sakuraEmote,
  },
  {
    id: 'kakashi',
    name: 'Kakashi',
    image: kakashiEmote,
  },
]

const menuOpen = ref(false)
const displayedEmote = ref<Emote | null>(null)

let emoteTimer: ReturnType<typeof setTimeout> | null = null

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function selectEmote(emote: Emote) {
  menuOpen.value = false

  showEmote(emote.id)

  emit('send-emote', emote.id)
}

function showEmote(emoteId: EmoteId) {
  const emote = emotes.find((item) => item.id === emoteId)

  if (!emote) return

  if (emoteTimer) {
    clearTimeout(emoteTimer)
  }

  displayedEmote.value = emote

  emoteTimer = setTimeout(() => {
    displayedEmote.value = null
    emoteTimer = null
  }, 3000)
}

/*
  Cette fonction servira ensuite pour Socket.IO.

  Exemple :
  socket.on('emote', (data) => {
    emoteSystem.value?.showEmote(data.emoteId)
  })
*/
defineExpose({
  showEmote,
})

onBeforeUnmount(() => {
  if (emoteTimer) {
    clearTimeout(emoteTimer)
  }
})
</script>

<template>
  <div class="emote-system">

    <!-- EMOTE AFFICHÉE PENDANT 3 SECONDES -->
    <Transition name="emote-pop">
      <div
        v-if="displayedEmote"
        class="emote-display"
      >
        <img
          :src="displayedEmote.image"
          :alt="displayedEmote.name"
          class="emote-display-image"
        />
      </div>
    </Transition>

    <!-- MENU DES EMOTES -->
    <Transition name="emote-menu">
      <div
        v-if="menuOpen && !displayOnly"
        class="emote-panel"
      >
        <button
          v-for="emote in emotes"
          :key="emote.id"
          type="button"
          class="emote-choice"
          :aria-label="`Envoyer l'emote ${emote.name}`"
          @click="selectEmote(emote)"
        >
          <img
            :src="emote.image"
            :alt="emote.name"
          />
        </button>
      </div>
    </Transition>

    <!-- BOUTON PRINCIPAL -->
    <button
  v-if="!displayOnly"
  type="button"
  class="emote-button"
  :class="{ 'emote-button--active': menuOpen }"
  aria-label="Ouvrir les emotes"
  @click="toggleMenu"
>
  <span class="emote-button-face">😄</span>
</button>

  </div>
</template>
<style scoped src="./EmoteSystem.css"></style>
