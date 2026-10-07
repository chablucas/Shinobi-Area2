<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORY_DEFINITIONS } from '../game/gameEngine'
import { deleteBuild, fetchBuilds, type SavedBuild } from '../services/buildApi'
import { useAuthStore } from '../stores/auth'
import { listFriends, type Friend } from '../services/socialApi'
import { API_BASE_URL } from '../services/cardApi'
const friendsOpen = ref(true)

const auth = useAuthStore()
const router = useRouter()
const builds = ref<SavedBuild[]>([])
const selectedBuild = ref<SavedBuild | null>(null)
const editing = ref(false)
const displayName = ref('')
const error = ref('')

const notificationStatus = ref(
  typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'unsupported'
)


function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(rawData.length))

  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }

  return output
}

async function enableNotifications() {
  error.value = ''

  if (
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    notificationStatus.value = 'unsupported'
    return
  }

  if (!auth.token) {
    error.value = 'Tu dois être connecté pour activer les notifications.'
    return
  }

  try {
    // Sur iPhone, demander la permission directement après le clic.
    const permission = await Notification.requestPermission()
    notificationStatus.value = permission

    if (permission !== 'granted') return

    const registration = await navigator.serviceWorker.ready

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    }

    const keyResponse = await fetch(`${API_BASE_URL}/push/public-key`, {
      headers,
    })

    if (!keyResponse.ok) {
      throw new Error('Impossible de récupérer la clé des notifications.')
    }

    const { publicKey } = await keyResponse.json()

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers,
      body: JSON.stringify(subscription.toJSON()),
    })

    if (!response.ok) {
      throw new Error("Impossible d'enregistrer les notifications.")
    }

    notificationStatus.value = 'subscribed'
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : "Impossible d'activer les notifications."
  }
}

async function testNotification() {
  if (!auth.token) return

  try {
    const response = await fetch(`${API_BASE_URL}/push/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Échec du test.')
    }

    if (result.total === 0) {
      error.value = "Aucun appareil abonné aux notifications."
      return
    }

    error.value = ''
    alert('Notification de test envoyée ! 🔔')
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de tester les notifications.'
  }
}


const total = computed(() => (auth.user?.wins ?? 0) + (auth.user?.losses ?? 0))
const winRate = computed(() => total.value ? Math.round(((auth.user?.wins ?? 0) / total.value) * 100) : 0)
const friends = ref<Friend[]>([])
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)

function openAvatarPicker() {
  avatarInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  error.value = ''

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    error.value = 'Choisis une image JPG, PNG ou WEBP.'
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = "L'image ne doit pas dépasser 5 Mo."
    input.value = ''
    return
  }

  try {
    avatarUploading.value = true

    await auth.updateAvatar(file)
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : "Impossible de modifier la photo de profil."
  } finally {
    avatarUploading.value = false

    // Permet de sélectionner à nouveau le même fichier.
    input.value = ''
  }
}

onMounted(async () => {
  await auth.loadCurrentUser()
  if (!auth.isAuthenticated || !auth.token) {
    await router.replace('/connexion')
    return
  }
  displayName.value = auth.user?.displayName ?? ''
  try {
    builds.value = await fetchBuilds(auth.token)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Impossible de charger les compositions.'
  }
  friends.value = await listFriends(auth.token).catch(() => [])
})

async function saveName() {
  try {
    await auth.updateProfile(displayName.value)
    editing.value = false
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Impossible de modifier le profil.'
  }
}

function handleLogout() {
  auth.logout()
  void router.push('/connexion')
}

async function removeBuild(build: SavedBuild) {
  if (!auth.token || !window.confirm('Supprimer cette composition ?')) return
  try {
    await deleteBuild(auth.token, build.id)
    builds.value = builds.value.filter((item) => item.id !== build.id)
    if (selectedBuild.value?.id === build.id) selectedBuild.value = null
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Suppression impossible.'
  }
}

function categoryLabel(slug: string) {
  return CATEGORY_DEFINITIONS.find(([, itemSlug]) => itemSlug === slug)?.[0] ?? slug
}
</script>

<template>
  <main class="profile-page">
    <SocialHeader />

    <section class="profile-content" aria-labelledby="profile-title">
      <header class="profile-heading">
        <p class="eyebrow">Dossier shinobi</p>
        <h1 id="profile-title">Profil</h1>
        <p>Ton parcours et tes statistiques de combat ninja.</p>
      </header>

      <div v-if="auth.user" class="profile-layout">
        <!-- 1. En haut : Avatar & Identité -->
        <article class="profile-card profile-identity">
          <div class="identity-wrapper">
            <div class="avatar-container">
  <button
    class="profile-avatar profile-avatar-button"
    type="button"
    :disabled="avatarUploading"
    :aria-label="auth.user.avatarUrl ? 'Modifier la photo de profil' : 'Ajouter une photo de profil'"
    @click="openAvatarPicker"
  >
    <img
      v-if="auth.user.avatarUrl"
      class="profile-avatar-image"
      :src="auth.user.avatarUrl"
      :alt="`Photo de profil de ${auth.user.displayName}`"
    />

    <span v-else class="avatar-letter">
      {{ auth.user.displayName.slice(0, 1).toUpperCase() }}
    </span>

    <span class="avatar-overlay">
      {{ avatarUploading ? 'Envoi...' : 'Modifier' }}
    </span>
  </button>

  <input
    ref="avatarInput"
    class="avatar-file-input"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    @change="handleAvatarChange"
  />
</div>
            <div class="identity-info">
              <p class="eyebrow">Guerrier Shinobi</p>
              <h2>{{ auth.user.displayName }}</h2>
              <p class="profile-email">{{ auth.user.email }}</p>

              <div class="identity-actions">
                <button
                  v-if="!editing"
                  class="profile-action"
                  type="button"
                  @click="editing = true"
                >
                  Modifier le profil
                </button>
                <button
                  class="profile-logout-btn"
                  type="button"
                  @click="handleLogout"
                >
                 Deconnexion
                </button>
              </div>

              <div v-if="editing" class="edit-profile">
                <input
                  v-model.trim="displayName"
                  aria-label="Nom du profil"
                  placeholder="Nouveau pseudonyme"
                />
                <div class="edit-buttons">
                  <button class="profile-action" type="button" @click="saveName">Enregistrer</button>
                  <button class="profile-cancel" type="button" @click="editing = false">Annuler</button>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- 2. Statistiques du joueur -->
        
<article class="profile-card profile-notifications">
  <div class="card-header-row">
    <div>
      <p class="eyebrow">Préférences</p>
      <h2>Notifications</h2>
    </div>
  </div>

  <p>Reçois les invitations et demandes d'amis sur ton téléphone.</p>

  <button
    v-if="notificationStatus === 'default' || notificationStatus === 'granted'"
    class="profile-action"
    type="button"
    @click="enableNotifications"
  >
    Activer les notifications
  </button>

  <p v-else-if="notificationStatus === 'subscribed'">
    🔔 Notifications activées sur cet appareil !
  </p>

  <p v-else-if="notificationStatus === 'denied'">
    Notifications refusées. Modifie l'autorisation dans les réglages de ton appareil.
  </p>

  <p v-else>
    Notifications non disponibles sur cet appareil ou navigateur.
  </p>
</article>

        
        <article class="profile-card profile-statistics">
          <div class="card-header-row">
            <div>
              <p class="eyebrow">Performances</p>
              <h2>Statistiques</h2>
            </div>
            <span class="stat-summary-badge">{{ total }} COMBATS</span>
          </div>
          <div class="stat-grid">
            <div class="stat-box wins">
              <strong>{{ auth.user.wins }}</strong>
              <span>Victoires</span>
            </div>
            <div class="stat-box losses">
              <strong>{{ auth.user.losses }}</strong>
              <span>Défaites</span>
            </div>
            <div class="stat-box total">
              <strong>{{ total }}</strong>
              <span>Parties jouées</span>
            </div>
            <div class="stat-box rate">
              <strong>{{ winRate }}%</strong>
              <span>Taux de victoire</span>
            </div>
          </div>
        </article>

        <!-- 3. Section Amis -->
        <article class="profile-card social-card">
          <div class="social-card-heading">
            <div>
              <p class="eyebrow">Réseau social</p>
              <h2>Amis ({{ friends.length }})</h2>
            </div>
            <button
              class="profile-toggle-btn"
              type="button"
              @click="friendsOpen = !friendsOpen"
            >
              {{ friendsOpen ? 'Masquer' : 'Afficher' }}
            </button>
          </div>

          <div v-if="friendsOpen" class="friends-list">
            <div v-for="friend in friends" :key="friend.id" class="friend-row">
              <span class="profile-friend-avatar">{{ friend.displayName.slice(0, 1).toUpperCase() }}</span>
              <div class="friend-info">
                <strong>{{ friend.displayName }}</strong>
              </div>
              <a class="profile-action-link" :href="`/profil-public/${friend.id}`">Voir profil</a>
            </div>
            <p v-if="!friends.length" class="profile-empty">Aucun ami pour le moment. Recherche un joueur dans la barre du haut pour l'ajouter.</p>
          </div>
        </article>

        <!-- 4. Persos & Compositions sauvegardées -->
        <article class="profile-card saved-builds">
          <div class="card-header-row">
            <div>
              <p class="eyebrow">Arsenal</p>
              <h2>Compositions ({{ builds.length }})</h2>
            </div>
          </div>
          <p v-if="!builds.length" class="profile-empty">
            Aucune composition sauvegardée. Termine un combat avec tes 15 cartes pour enregistrer ton build.
          </p>
          <div v-for="build in builds" :key="build.id" class="saved-build">
            <div class="build-summary">
              <strong>{{ build.name }}</strong>
              <small>{{ new Date(build.createdAt).toLocaleDateString('fr-FR') }} · {{ build.slots.length }} cartes</small>
              <div class="build-preview">
                <img
                  v-for="slot in build.slots.slice(0, 5)"
                  :key="slot.id"
                  :src="slot.card.imageUrl ?? '/logo.png'"
                  :alt="slot.card.name"
                  loading="lazy"
                />
              </div>
            </div>
            <div class="saved-actions">
              <button class="profile-action" type="button" @click="selectedBuild = build">Voir</button>
              <button class="profile-cancel delete" type="button" @click="removeBuild(build)">Supprimer</button>
            </div>
          </div>
        </article>
      </div>

      <p v-if="error" class="profile-error">{{ error }}</p>

      <!-- Détail de la composition sélectionnée -->
      <article v-if="selectedBuild" class="profile-card build-detail">
        <div class="detail-heading">
          <div>
            <p class="eyebrow">Détail du build</p>
            <h2>{{ selectedBuild.name }}</h2>
          </div>
          <button class="profile-cancel" type="button" @click="selectedBuild = null">Fermer</button>
        </div>
        <div class="detail-grid">
          <div
            v-for="[label, slug] in CATEGORY_DEFINITIONS"
            :key="slug"
            class="detail-slot"
          >
            <span class="detail-category-label">{{ label }}</span>
            <img
              v-if="selectedBuild.slots.find((slot) => slot.categorySlug === slug)?.card.imageUrl"
              :src="selectedBuild.slots.find((slot) => slot.categorySlug === slug)?.card.imageUrl ?? undefined"
              :alt="selectedBuild.slots.find((slot) => slot.categorySlug === slug)?.card.name"
            />
            <div v-else class="detail-fallback-art">?</div>
            <strong>
              {{ selectedBuild.slots.find((slot) => slot.categorySlug === slug)?.card.name ?? 'Libre' }}
            </strong>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped src="./Profil.css"></style>