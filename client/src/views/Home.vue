<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import { useRouter } from 'vue-router'

import {
  acceptFriendRequest,
  acceptGameInvite,
  createGameLobby,
  listFriendRequests,
  listFriends,
  listGameInvites,
  rejectFriendRequest,
  rejectGameInvite,
  searchGlobal,
  sendFriendRequest,
  type ChallengeMode,
  type Friend,
  type FriendRequest,
  type GameInvite,
  type SearchResult,
} from '../services/socialApi'

import {
  teamAuctionGameRoute,
} from '../services/teamAuctionMode'

import type {
  TeamAuctionMode,
} from '../services/realtimeApi'

import {
  useAuthStore,
} from '../stores/auth'


const auth = useAuthStore()
const router = useRouter()


/* =====================================================
   UTILISATEUR
   ===================================================== */

const displayName = computed(() => {
  return auth.user?.displayName || 'Shinobi'
})

const userInitial = computed(() => {
  return displayName.value
    .slice(0, 1)
    .toUpperCase()
})


/* =====================================================
   RECHERCHE
   ===================================================== */

const searchQuery = ref('')

const searchResults = ref<SearchResult>({
  players: [],
  shinobis: [],
})

const searchLoading = ref(false)
const searchOpen = ref(false)
const searchError = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null


async function performSearch() {
  const query = searchQuery.value.trim()

  if (query.length < 2) {
    searchResults.value = {
      players: [],
      shinobis: [],
    }

    searchOpen.value = false
    searchError.value = ''

    return
  }

  await auth.loadCurrentUser()

  if (!auth.token) {
    searchError.value =
      'Connecte-toi pour utiliser la recherche.'

    searchOpen.value = true

    return
  }

  searchLoading.value = true
  searchError.value = ''

  try {
    searchResults.value =
      await searchGlobal(
        auth.token,
        query,
      )

    searchOpen.value = true
  } catch (exception) {
    searchError.value =
      exception instanceof Error
        ? exception.message
        : 'Recherche impossible.'

    searchResults.value = {
      players: [],
      shinobis: [],
    }

    searchOpen.value = true
  } finally {
    searchLoading.value = false
  }
}


watch(searchQuery, () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  const query =
    searchQuery.value.trim()

  if (query.length < 2) {
    searchResults.value = {
      players: [],
      shinobis: [],
    }

    searchOpen.value = false
    searchError.value = ''

    return
  }

  searchTimer = setTimeout(() => {
    void performSearch()
  }, 300)
})


async function openPlayerProfile(
  userId: number,
) {
  searchOpen.value = false
  searchQuery.value = ''

  await router.push(
    `/profil-public/${userId}`,
  )
}


async function openCard(
  slug: string,
) {
  searchOpen.value = false
  searchQuery.value = ''

  await router.push(
    `/cartes/${slug}`,
  )
}


async function addFriend(
  userId: number,
) {
  if (!auth.token) {
    await router.push('/connexion')
    return
  }

  try {
    await sendFriendRequest(
      auth.token,
      userId,
    )

    await performSearch()
  } catch (exception) {
    searchError.value =
      exception instanceof Error
        ? exception.message
        : 'Demande impossible.'
  }
}


async function acceptSearchFriend(
  requestId: number,
) {
  if (!auth.token) return

  try {
    await acceptFriendRequest(
      auth.token,
      requestId,
    )

    await performSearch()
    await loadNotifications()
  } catch (exception) {
    searchError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible d’accepter la demande.'
  }
}


/* =====================================================
   NOTIFICATIONS
   ===================================================== */

const notificationsOpen = ref(false)

const friendRequests =
  ref<FriendRequest[]>([])

const gameInvites =
  ref<GameInvite[]>([])

const notificationsLoading =
  ref(false)

const notificationError =
  ref('')


const notificationCount =
  computed(() => {
    return (
      friendRequests.value.length +
      gameInvites.value.length
    )
  })


async function loadNotifications() {
  if (!auth.token) {
    friendRequests.value = []
    gameInvites.value = []
    return
  }

  // Afficher "chargement" uniquement s'il n'y a encore
  // aucune notification affichée
  const firstLoad =
    friendRequests.value.length === 0 &&
    gameInvites.value.length === 0

  if (firstLoad) {
    notificationsLoading.value = true
  }

  notificationError.value = ''

  try {
    const [requests, invites] = await Promise.all([
      listFriendRequests(
        auth.token,
        'received',
      ),

      listGameInvites(
        auth.token,
      ),
    ])

    // Les anciennes restent affichées jusqu'à ce que
    // les nouvelles données soient réellement arrivées
    friendRequests.value = requests
    gameInvites.value = invites
  } catch (exception) {
    notificationError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de charger les notifications.'
  } finally {
    if (firstLoad) {
      notificationsLoading.value = false
    }
  }
}


async function toggleNotifications() {
  await auth.loadCurrentUser()

  if (!auth.token) {
    await router.push('/connexion')
    return
  }

  notificationsOpen.value = !notificationsOpen.value
  searchOpen.value = false
}

async function openNotificationHome() {
  notificationsOpen.value = false
  await router.push('/')
}

async function acceptRequest(
  requestId: number,
) {
  if (!auth.token) return

  try {
    await acceptFriendRequest(
      auth.token,
      requestId,
    )

    await loadNotifications()
  } catch (exception) {
    notificationError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible d’accepter la demande.'
  }
}


async function rejectRequest(
  requestId: number,
) {
  if (!auth.token) return

  try {
    await rejectFriendRequest(
      auth.token,
      requestId,
    )

    await loadNotifications()
  } catch (exception) {
    notificationError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de refuser la demande.'
  }
}


async function acceptInvite(
  invite: GameInvite,
) {
  if (!auth.token) return

  notificationError.value = ''

  try {
    const lobby =
      await acceptGameInvite(
        auth.token,
        invite.id,
      )

    notificationsOpen.value = false

    if (
      lobby.mode === 'team-1v1' ||
      lobby.mode === 'team-1v1v1'
    ) {
      await router.push(
        teamAuctionGameRoute(
          lobby.mode,
          lobby.id,
        ),
      )

      return
    }

    await router.push(
      `/lobby/${lobby.id}`,
    )
  } catch (exception) {
    notificationError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de rejoindre la partie.'
  }
}


async function rejectInvite(
  inviteId: string,
) {
  if (!auth.token) return

  try {
    await rejectGameInvite(
      auth.token,
      inviteId,
    )

    await loadNotifications()
  } catch (exception) {
    notificationError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de refuser l’invitation.'
  }
}


/* =====================================================
   INVITATIONS DE PARTIE
   ===================================================== */

const friends =
  ref<Friend[]>([])

const inviteMode =
  ref<ChallengeMode | null>(null)

const selectedFriendIds =
  ref<number[]>([])

const completeWithAi =
  ref(false)

const inviteError =
  ref('')

const friendsLoading =
  ref(false)

const sendingInvite =
  ref(false)


async function openInviteDialog(
  mode: ChallengeMode,
) {
  await auth.loadCurrentUser()

  if (!auth.token) {
    await router.push('/connexion')
    return
  }

  inviteMode.value = mode

  selectedFriendIds.value = []

  completeWithAi.value = false

  inviteError.value = ''

  friendsLoading.value = true

  try {
    friends.value =
      await listFriends(
        auth.token,
      )
  } catch (exception) {
    inviteError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de charger vos amis.'
  } finally {
    friendsLoading.value = false
  }
}


function closeInviteDialog() {
  inviteMode.value = null

  selectedFriendIds.value = []

  completeWithAi.value = false

  inviteError.value = ''
}


function requiredFriendCount() {
  if (
    inviteMode.value === '1v1' ||
    inviteMode.value === 'team-1v1'
  ) {
    return 1
  }

  if (
    inviteMode.value === '1v1v1v1'
  ) {
    return 3
  }

  return completeWithAi.value
    ? 1
    : 2
}


const inviteTitle =
  computed(() => {
    if (
      inviteMode.value === 'team-1v1'
    ) {
      return 'Invite un ami'
    }

    if (
      inviteMode.value ===
      'team-1v1v1'
    ) {
      return 'Invite 2 amis'
    }

    if (
      inviteMode.value ===
      '1v1v1v1'
    ) {
      return 'Invite 3 amis'
    }

    if (
      inviteMode.value === '1v1'
    ) {
      return 'Invite un ami'
    }

    return 'Invite tes amis'
  })


const inviteDescription =
  computed(() => {
    if (
      inviteMode.value === '1v1' ||
      inviteMode.value === 'team-1v1'
    ) {
      return 'Sélectionne un ami pour lancer la partie.'
    }

    if (
      inviteMode.value ===
      '1v1v1v1'
    ) {
      return 'Sélectionne trois amis pour lancer la partie.'
    }

    if (completeWithAi.value) {
      return 'Sélectionne un ami. L’IA complètera la partie.'
    }

    return 'Sélectionne deux amis pour lancer la partie.'
  })


function toggleFriend(
  id: number,
) {
  const maximum =
    requiredFriendCount()

  if (
    selectedFriendIds.value.includes(id)
  ) {
    selectedFriendIds.value =
      selectedFriendIds.value.filter(
        (friendId) =>
          friendId !== id,
      )

    return
  }

  if (
    selectedFriendIds.value.length <
    maximum
  ) {
    selectedFriendIds.value = [
      ...selectedFriendIds.value,
      id,
    ]
  }
}


function toggleCompleteWithAi() {
  completeWithAi.value =
    !completeWithAi.value

  if (
    completeWithAi.value &&
    selectedFriendIds.value.length > 1
  ) {
    selectedFriendIds.value =
      selectedFriendIds.value.slice(
        0,
        1,
      )
  }
}


async function createInvite() {
  if (
    !auth.token ||
    !inviteMode.value
  ) {
    return
  }

  const required =
    requiredFriendCount()

  if (
    selectedFriendIds.value.length !==
    required
  ) {
    return
  }

  sendingInvite.value = true
  inviteError.value = ''

  try {
    const currentMode =
      inviteMode.value

    const isTeam =
      currentMode.startsWith(
        'team-',
      )

    const lobby =
      await createGameLobby(
        auth.token,
        currentMode,
        selectedFriendIds.value,
        currentMode === '1v1v1' &&
          completeWithAi.value,
      )

    closeInviteDialog()

    if (isTeam) {
      await router.push(
        teamAuctionGameRoute(
          lobby.mode,
          lobby.id,
        ),
      )

      return
    }

    await router.push(
      `/lobby/${lobby.id}`,
    )
  } catch (exception) {
    inviteError.value =
      exception instanceof Error
        ? exception.message
        : 'Invitation impossible.'
  } finally {
    sendingInvite.value = false
  }
}


/* =====================================================
   LANCEMENT DES MODES
   ===================================================== */

async function go(
  path: string,
  requiresAuth = false,
) {
  if (requiresAuth) {
    await auth.loadCurrentUser()

    if (!auth.token) {
      await router.push('/connexion')
      return
    }
  }

  await router.push(path)
}


async function goTeamAuction(
  mode: TeamAuctionMode,
) {
  await auth.loadCurrentUser()

  if (!auth.token) {
    await router.push('/connexion')
    return
  }

  await router.push({
    path: '/team-game',
    query: {
      mode,
    },
  })
}


/* =====================================================
   PROFIL
   ===================================================== */

async function goProfile() {
  await auth.loadCurrentUser()

  if (auth.token) {
    await router.push('/profil')
    return
  }

  await router.push('/connexion')
}


/* =====================================================
   INITIALISATION
   ===================================================== */

let notificationTimer:
  ReturnType<typeof setInterval> |
  null = null


onMounted(async () => {
  await auth.loadCurrentUser()

  if (!auth.token) return

  await loadNotifications()

  notificationTimer = window.setInterval(() => {
    void loadNotifications()
  }, 1000)
})


onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  if (notificationTimer) {
    clearInterval(notificationTimer)
  }
})
</script>


<template>
  <main class="home-page">

    <!-- =================================================
         PROFIL + NOTIFICATIONS
         ================================================= -->

    <header class="home-header">

      <button
        type="button"
        class="home-user"
        @click="goProfile"
      >
        <span class="home-avatar">
  <img
    v-if="auth.user?.avatarUrl"
    class="home-avatar-image"
    :src="auth.user.avatarUrl"
    :alt="`Photo de profil de ${displayName}`"
  />

  <span v-else>
    {{ userInitial }}
  </span>
</span>

        <span class="home-user-info">
          <strong>
            {{ displayName }}
          </strong>

          <span>
            {{
              auth.token
                ? 'Voir mon profil'
                : 'Se connecter'
            }}
          </span>
        </span>
      </button>


      <div class="home-notifications">

        <button
          type="button"
          class="notification-button"
          aria-label="Notifications"
          @click="toggleNotifications"
        >
          🔔

          <span
            v-if="notificationCount > 0"
            class="notification-badge"
          >
            {{
              notificationCount > 9
                ? '9+'
                : notificationCount
            }}
          </span>
        </button>


        <section
          v-if="notificationsOpen"
          class="notification-panel"
        >
          <div class="notification-panel-header">
            <div>
              <span>SHINOBI AREA</span>

              <h2>
                Notifications
              </h2>
            </div>

            <button
              type="button"
              class="notification-close"
              aria-label="Fermer"
              @click="
                notificationsOpen = false
              "
            >
              ×
            </button>
          </div>


          <p
            v-if="notificationsLoading"
            class="notification-empty"
          >
            Chargement...
          </p>


          <p
            v-else-if="notificationError"
            class="notification-error"
          >
            {{ notificationError }}
          </p>


          <template v-else>

            <div
              v-if="friendRequests.length"
              class="notification-section"
            >
              <h3>
                Demandes d’amis
              </h3>

              <article
                v-for="request in friendRequests"
                :key="request.id"
                class="notification-item"
                  @click="openNotificationHome"

              >
                <div class="notification-user">
                  <span class="notification-avatar">
                    {{
                      request.sender.displayName
                        .slice(0, 1)
                        .toUpperCase()
                    }}
                  </span>

                  <div>
                    <strong>
                      {{
                        request.sender.displayName
                      }}
                    </strong>

                    <span>
                      veut devenir ton ami
                    </span>
                  </div>
                </div>

                <div class="notification-actions">
                  <button
                    type="button"
                    class="notification-accept"
                    @click="
                      acceptRequest(
                        request.id,
                      )
                    "
                  >
                    Accepter
                  </button>

                  <button
                    type="button"
                    class="notification-reject"
                    @click="
                      rejectRequest(
                        request.id,
                      )
                    "
                  >
                    Refuser
                  </button>
                </div>
              </article>
            </div>


            <div
              v-if="gameInvites.length"
              class="notification-section"
            >
              <h3>
                Invitations
              </h3>

              <article
                v-for="invite in gameInvites"
                :key="invite.id"
                class="notification-item"
                  @click="openNotificationHome"

              >
                <div class="notification-user">
                  <span class="notification-avatar">
                    {{
                      invite.creator.displayName
                        .slice(0, 1)
                        .toUpperCase()
                    }}
                  </span>

                  <div>
                    <strong>
                      {{
                        invite.creator.displayName
                      }}
                    </strong>

                    <span>
                      Partie {{ invite.mode }}
                    </span>
                  </div>
                </div>

                <div class="notification-actions">
                  <button
                    type="button"
                    class="notification-accept"
                    @click="
                      acceptInvite(invite)
                    "
                  >
                    Rejoindre
                  </button>

                  <button
                    type="button"
                    class="notification-reject"
                    @click="
                      rejectInvite(
                        invite.id,
                      )
                    "
                  >
                    Refuser
                  </button>
                </div>
              </article>
            </div>


            <p
              v-if="
                !friendRequests.length &&
                !gameInvites.length
              "
              class="notification-empty"
            >
              Aucune notification.
            </p>

          </template>
        </section>

      </div>

    </header>


    <!-- =================================================
         RECHERCHE
         ================================================= -->

    <div class="home-search-wrapper">

      <label class="home-search">

        <span class="search-icon">
          ⌕
        </span>

        <input
          v-model="searchQuery"
          type="search"
          autocomplete="off"
          placeholder="Rechercher un shinobi ou un joueur..."
          @focus="
            searchOpen =
              searchQuery.trim().length >= 2
          "
        />

      </label>


      <section
        v-if="searchOpen"
        class="home-search-results"
      >

        <p
          v-if="searchLoading"
          class="search-state"
        >
          Recherche...
        </p>


        <p
          v-else-if="searchError"
          class="search-error"
        >
          {{ searchError }}
        </p>


        <template v-else>

          <!-- JOUEURS -->

          <div
            v-if="searchResults.players.length"
            class="search-result-section"
          >
            <span class="search-result-title">
              Joueurs
            </span>

            <article
              v-for="player in searchResults.players"
              :key="player.id"
              class="search-result-item"
            >
              <button
                type="button"
                class="search-result-main"
                @click="
                  openPlayerProfile(
                    player.id,
                  )
                "
              >
                <span class="search-result-avatar">
                  {{
                    player.displayName
                      .slice(0, 1)
                      .toUpperCase()
                  }}
                </span>

                <span>
                  <strong>
                    {{ player.displayName }}
                  </strong>

                  <small>
                    Joueur
                  </small>
                </span>
              </button>


              <button
                v-if="
                  !player.friendshipStatus
                "
                type="button"
                class="search-result-action"
                @click.stop="
                  addFriend(player.id)
                "
              >
                Ajouter
              </button>


              <button
                v-else-if="
                  player.friendshipStatus ===
                    'PENDING' &&
                  player.friendshipDirection ===
                    'received' &&
                  player.friendshipRequestId
                "
                type="button"
                class="search-result-action"
                @click.stop="
                  acceptSearchFriend(
                    player.friendshipRequestId,
                  )
                "
              >
                Accepter
              </button>


              <span
                v-else-if="
                  player.friendshipStatus ===
                  'ACCEPTED'
                "
                class="search-result-status"
              >
                Ami
              </span>


              <span
                v-else
                class="search-result-status"
              >
                En attente
              </span>
            </article>
          </div>


          <!-- SHINOBIS -->

          <div
            v-if="searchResults.shinobis.length"
            class="search-result-section"
          >
            <span class="search-result-title">
              Shinobis
            </span>

            <button
              v-for="shinobi in searchResults.shinobis"
              :key="shinobi.id"
              type="button"
              class="search-result-item search-shinobi"
              @click="
                openCard(
                  shinobi.slug,
                )
              "
            >
              <span class="search-card-image">

                <img
                  v-if="shinobi.imageUrl"
                  :src="shinobi.imageUrl"
                  :alt="shinobi.name"
                />

                <span v-else>
                  {{
                    shinobi.name
                      .slice(0, 1)
                  }}
                </span>

              </span>

              <span>
                <strong>
                  {{ shinobi.name }}
                </strong>

                <small>
                  Voir la carte
                </small>
              </span>
            </button>
          </div>


          <p
            v-if="
              !searchResults.players.length &&
              !searchResults.shinobis.length
            "
            class="search-state"
          >
            Aucun résultat.
          </p>

        </template>

      </section>

    </div>


    <!-- =================================================
         MODES
         ================================================= -->

    <section class="game-modes">

      <!-- CRÉER TON PERSONNAGE -->

<article
  class="game-mode-card character-mode"
>
  <div class="game-mode-overlay"></div>

  <div class="game-mode-content">

    <div class="game-mode-title">
      

      <h2>
        Créer ton personnage
      </h2>
    </div>

    <div class="game-mode-buttons four-buttons">

      <!-- CONTRE L'IA -->
      <button
        type="button"
        class="mode-button"
        @click="router.push('/solo')"
      >
        VS IA
      </button>

      <!-- 1V1 -->
      <button
        type="button"
        class="mode-button"
        @click="openInviteDialog('1v1')"
      >
        1V1
      </button>

      <!-- 1V1V1 -->
      <button
        type="button"
        class="mode-button"
        @click="openInviteDialog('1v1v1')"
      >
        1V1V1
      </button>

      <!-- 1V1V1V1 -->
      <button
        type="button"
        class="mode-button"
        @click="openInviteDialog('1v1v1v1')"
      >
        1V1V1V1
      </button>

    </div>

  </div>
</article>


      <!-- TEAM AUCTION -->

      <article
        class="game-mode-card team-mode"
      >
        <div class="game-mode-overlay"></div>

        <div class="game-mode-content">

          <div class="game-mode-title">
            

            <h2>
              Créer ta team
            </h2>
          </div>


          <div class="game-mode-buttons three-buttons">

            <button
              type="button"
              class="mode-button"
              @click="
                goTeamAuction(
                  '1v1-ai',
                )
              "
            >
              VS IA
            </button>

            <button
              type="button"
              class="mode-button"
              @click="
                openInviteDialog(
                  'team-1v1',
                )
              "
            >
              1V1
            </button>

            <button
              type="button"
              class="mode-button"
              @click="
                openInviteDialog(
                  'team-1v1v1',
                )
              "
            >
              1V1V1
            </button>

          </div>

        </div>
      </article>


      <!-- VERSUS -->

      <article
        class="game-mode-card category-mode"
      >
        <div class="game-mode-overlay"></div>

        <div class="game-mode-content">

          <div class="game-mode-title">
           

            <h2>
              Affronter tes amis
            </h2>
          </div>


          <div class="game-mode-buttons three-buttons">

            <button
              type="button"
              class="mode-button"
              @click="
                openInviteDialog(
                  '1v1',
                )
              "
            >
              1V1
            </button>

            <button
              type="button"
              class="mode-button"
              @click="
                openInviteDialog(
                  '1v1v1',
                )
              "
            >
              1V1V1
            </button>

            <button
              type="button"
              class="mode-button"
              @click="
                openInviteDialog(
                  '1v1v1v1',
                )
              "
            >
              1V1V1V1
            </button>

          </div>

        </div>
      </article>

    </section>


    <!-- =================================================
         MODAL INVITATION
         ================================================= -->

    <div
      v-if="inviteMode"
      class="invite-overlay"
      @click.self="closeInviteDialog"
    >

      <section
        class="invite-dialog"
        role="dialog"
        aria-modal="true"
      >

        <div class="invite-handle"></div>


        <div class="invite-heading">

          <div>
            <span>
              COMBAT SOCIAL
            </span>

            <h2>
              {{ inviteTitle }}
            </h2>
          </div>


          <button
            type="button"
            class="invite-close"
            aria-label="Fermer"
            @click="closeInviteDialog"
          >
            ×
          </button>

        </div>


        <p class="invite-description">
          {{ inviteDescription }}
        </p>


        <button
          v-if="
            inviteMode === '1v1v1'
          "
          type="button"
          class="complete-ai-button"
          :class="{
            active:
              completeWithAi,
          }"
          @click="
            toggleCompleteWithAi
          "
        >
          <span>
            Compléter avec l’IA
          </span>

          <span class="ai-toggle">
            {{
              completeWithAi
                ? '✓'
                : '+'
            }}
          </span>
        </button>


        <p
          v-if="friendsLoading"
          class="invite-message"
        >
          Chargement des amis...
        </p>


        <p
          v-else-if="inviteError"
          class="invite-error"
        >
          {{ inviteError }}
        </p>


        <div
          v-else
          class="friend-list"
        >

          <button
            v-for="friend in friends"
            :key="friend.id"
            type="button"
            class="friend-item"
            :class="{
              selected:
                selectedFriendIds.includes(
                  friend.id,
                ),
            }"
            @click="
              toggleFriend(
                friend.id,
              )
            "
          >

            <span class="friend-avatar">

              <img
                v-if="friend.avatarUrl"
                :src="friend.avatarUrl"
                :alt="friend.displayName"
              />

              <span v-else>
                {{
                  friend.displayName
                    .slice(0, 1)
                    .toUpperCase()
                }}
              </span>

            </span>


            <strong>
              {{ friend.displayName }}
            </strong>


            <span
              class="friend-selection"
              :class="{
                active:
                  selectedFriendIds.includes(
                    friend.id,
                  ),
              }"
            >
              {{
                selectedFriendIds.includes(
                  friend.id,
                )
                  ? '✓'
                  : ''
              }}
            </span>

          </button>


          <p
            v-if="!friends.length"
            class="invite-message"
          >
            Aucun ami disponible.
          </p>

        </div>


        <button
          type="button"
          class="create-lobby-button"
          :disabled="
            friendsLoading ||
            sendingInvite ||
            selectedFriendIds.length !==
              requiredFriendCount()
          "
          @click="createInvite"
        >
          {{
            sendingInvite
              ? 'CRÉATION...'
              : 'CRÉER LE SALON'
          }}
        </button>

      </section>

    </div>

  </main>
</template>


<style scoped src="./Home.css"></style>