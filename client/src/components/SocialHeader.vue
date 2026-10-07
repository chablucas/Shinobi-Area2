<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  acceptFriendRequest,
  acceptGameInvite,
  listFriendRequests,
  listGameInvites,
  rejectFriendRequest,
  rejectGameInvite,
  searchGlobal,
  sendFriendRequest,
  type FriendRequest,
  type GameInvite,
  type SearchResult,
} from '../services/socialApi'
import { isTeamAuctionMode, teamAuctionGameRoute } from '../services/teamAuctionMode'
import MobileSidebar from './MobileSidebar.vue'

const auth = useAuthStore()
const router = useRouter()

const query = ref('')
const results = ref<SearchResult>({
  players: [],
  shinobis: [],
})

const requests = ref<FriendRequest[]>([])
const gameInvites = ref<GameInvite[]>([])

const open = ref(false)
const notificationsOpen = ref(false)
const sidebarOpen = ref(false)
const loading = ref(false)

const joiningInviteIds = ref<string[]>([])
const inviteJoinErrors = ref<Record<string, string>>({})

let searchTimer: ReturnType<typeof setTimeout> | undefined
let notificationTimer: ReturnType<typeof setTimeout> | undefined
let notificationRefreshInFlight = false
let isMounted = false

async function refreshNotifications() {
  if (!auth.token || notificationRefreshInFlight) return

  notificationRefreshInFlight = true

  try {
    const [nextRequests, nextInvites] = await Promise.all([
      listFriendRequests(auth.token, 'received'),
      listGameInvites(auth.token),
    ])

    requests.value = nextRequests
    gameInvites.value = nextInvites
  } catch {
    // Les notifications ne doivent pas bloquer la navigation.
  } finally {
    notificationRefreshInFlight = false
  }
}

function scheduleNotificationRefresh() {
  clearTimeout(notificationTimer)

  if (!isMounted || !auth.token) return

  notificationTimer = setTimeout(async () => {
    await refreshNotifications()

    if (isMounted) {
      scheduleNotificationRefresh()
    }
  }, 2500)
}

onMounted(async () => {
  isMounted = true

  await auth.loadCurrentUser()
  await refreshNotifications()

  scheduleNotificationRefresh()
})

onUnmounted(() => {
  isMounted = false

  clearTimeout(searchTimer)
  clearTimeout(notificationTimer)
})

watch(query, (value) => {
  clearTimeout(searchTimer)

  if (!value.trim() || !auth.token) {
    results.value = {
      players: [],
      shinobis: [],
    }

    open.value = false
    return
  }

  searchTimer = setTimeout(async () => {
    if (!auth.token) return

    loading.value = true

    try {
      results.value = await searchGlobal(auth.token, value)
      open.value = true
    } finally {
      loading.value = false
    }
  }, 220)
})

function handleBrandClick(event: MouseEvent) {
  if (typeof window !== 'undefined' && window.innerWidth <= 600) {
    event.preventDefault()
    sidebarOpen.value = true
  }
}

function publicProfile(id: number) {
  open.value = false
  void router.push(`/profil-public/${id}`)
}

async function addFriend(id: number) {
  if (!auth.token) return

  await sendFriendRequest(auth.token, id)

  const player = results.value.players.find((item) => item.id === id)

  if (player) {
    player.friendshipStatus = 'PENDING'
    player.friendshipDirection = 'sent'
  }
}

async function acceptSearchRequest(
  player: SearchResult['players'][number],
) {
  if (!auth.token || !player.friendshipRequestId) return

  await acceptFriendRequest(
    auth.token,
    player.friendshipRequestId,
  )

  player.friendshipStatus = 'ACCEPTED'
  player.friendshipDirection = null
}

async function answer(
  request: FriendRequest,
  accepted: boolean,
) {
  if (!auth.token) return

  requests.value = requests.value.filter(
    (item) => item.id !== request.id,
  )

  try {
    if (accepted) {
      await acceptFriendRequest(auth.token, request.id)
    } else {
      await rejectFriendRequest(auth.token, request.id)
    }
  } finally {
    await refreshNotifications()
  }
}

function isTeamInvite(invite: GameInvite) {
  return isTeamAuctionMode(invite.mode)
}

async function joinGameInvite(invite: GameInvite) {
  if (
    !auth.token ||
    joiningInviteIds.value.includes(invite.id)
  ) {
    return
  }

  joiningInviteIds.value = [
    ...joiningInviteIds.value,
    invite.id,
  ]

  inviteJoinErrors.value = {
    ...inviteJoinErrors.value,
    [invite.id]: '',
  }

  try {
    const lobby = await acceptGameInvite(
      auth.token,
      invite.id,
    )

    gameInvites.value = gameInvites.value.filter(
      (item) => item.id !== invite.id,
    )

    if (isTeamInvite(invite)) {
      await router.push(
        teamAuctionGameRoute(lobby.mode, lobby.id),
      )
    } else {
      await router.push(`/lobby/${lobby.id}`)
    }
  } catch (error) {
    inviteJoinErrors.value = {
      ...inviteJoinErrors.value,
      [invite.id]:
        error instanceof Error
          ? error.message
          : 'Impossible de rejoindre ce salon.',
    }
  } finally {
    joiningInviteIds.value =
      joiningInviteIds.value.filter(
        (id) => id !== invite.id,
      )

    await refreshNotifications()
  }
}

async function declineGameInvite(invite: GameInvite) {
  if (
    !auth.token ||
    joiningInviteIds.value.includes(invite.id)
  ) {
    return
  }

  joiningInviteIds.value = [
    ...joiningInviteIds.value,
    invite.id,
  ]

  inviteJoinErrors.value = {
    ...inviteJoinErrors.value,
    [invite.id]: '',
  }

  try {
    await rejectGameInvite(auth.token, invite.id)

    gameInvites.value = gameInvites.value.filter(
      (item) => item.id !== invite.id,
    )
  } catch (error) {
    inviteJoinErrors.value = {
      ...inviteJoinErrors.value,
      [invite.id]:
        error instanceof Error
          ? error.message
          : 'Impossible de refuser cette invitation.',
    }
  } finally {
    joiningInviteIds.value =
      joiningInviteIds.value.filter(
        (id) => id !== invite.id,
      )

    await refreshNotifications()
  }
}

function statusLabel(
  player: SearchResult['players'][number],
) {
  if (player.friendshipStatus === 'ACCEPTED') {
    return 'AMI'
  }

  if (player.friendshipDirection === 'received') {
    return 'ACCEPTER'
  }

  if (player.friendshipStatus === 'PENDING') {
    return 'DEMANDE ENVOYÉE'
  }

  return 'AJOUTER EN AMI'
}
</script>

<template>
  <nav
    class="social-header"
    aria-label="Navigation principale"
  >
    <a
      class="social-brand"
      href="/"
      aria-label="Shinobi Area, ouvrir le menu ou accueil"
      @click="handleBrandClick"
    >
      <img
        src="/logo.png"
        alt="Logo Shinobi Area"
      />

      <span
        class="mobile-menu-indicator"
        aria-hidden="true"
      >
        <span class="indicator-bar"></span>
        <span class="indicator-bar"></span>
        <span class="indicator-bar"></span>
      </span>
    </a>

    <div class="header-links desktop-only">
      <a href="/personnages">Cartes</a>
      <a href="/simulation">Simulation</a>
      <a href="/regles">Règles</a>

      <a
        v-if="
          auth.user?.role === 'ADMIN' ||
          auth.user?.role === 'SUPER_ADMIN'
        "
        href="/admin"
      >
        Admin
      </a>
    </div>

    <div
      v-if="auth.isAuthenticated"
      class="global-search"
    >
      <input
        v-model="query"
        type="search"
        placeholder="Rechercher un joueur ou un shinobi..."
        aria-label="Recherche globale"
        @focus="open = !!query.trim()"
      />

      <div
        v-if="open"
        class="search-dropdown"
      >
        <p
          v-if="loading"
          class="social-muted"
        >
          Recherche...
        </p>

        <template v-else>
          <section
            v-if="results.players.length"
            class="search-section"
          >
            <strong>JOUEURS</strong>

            <button
              v-for="player in results.players"
              :key="player.id"
              type="button"
              class="search-row"
              @click="publicProfile(player.id)"
            >
              <span class="social-avatar">
                {{ player.displayName.slice(0, 1) }}
              </span>

              <span class="search-name">
                {{ player.displayName }}
              </span>

              <span
                class="search-action"
                role="button"
                tabindex="0"
                @click.stop="
                  player.friendshipDirection === 'received'
                    ? acceptSearchRequest(player)
                    : player.friendshipStatus === null
                      ? addFriend(player.id)
                      : undefined
                "
              >
                {{ statusLabel(player) }}
              </span>
            </button>
          </section>

          <section
            v-if="results.shinobis.length"
            class="search-section"
          >
            <strong>SHINOBIS</strong>

            <button
              v-for="shinobi in results.shinobis"
              :key="shinobi.id"
              type="button"
              class="search-row"
              @click="
                open = false;
                void router.push(`/cartes/${shinobi.slug}`)
              "
            >
              <span class="search-card-image">
                <img
                  v-if="shinobi.imageUrl"
                  :src="shinobi.imageUrl"
                  :alt="shinobi.name"
                />
              </span>

              <span class="search-name">
                {{ shinobi.name }}
              </span>
            </button>
          </section>

          <p
            v-if="
              !results.players.length &&
              !results.shinobis.length
            "
            class="social-muted"
          >
            Aucun résultat.
          </p>
        </template>
      </div>
    </div>

    <div class="social-actions">
      <button
        v-if="auth.isAuthenticated"
        class="notification-button"
        type="button"
        aria-label="Notifications"
        @click="
          notificationsOpen = !notificationsOpen
        "
      >
        <span class="notif-icon">◉</span>

        <span
          v-if="requests.length + gameInvites.length"
          class="notification-badge"
        >
          {{ requests.length + gameInvites.length }}
        </span>
      </button>

      <a
        class="social-profile-link"
        :href="
          auth.isAuthenticated
            ? '/profil'
            : '/connexion'
        "
      >
        {{
          auth.isAuthenticated
            ? (auth.user?.displayName || 'Profil')
            : 'Connexion'
        }}
      </a>
    </div>

    <div
      v-if="notificationsOpen"
      class="notifications-panel"
    >
      <strong>NOTIFICATIONS</strong>

      <p
        v-if="
          !requests.length &&
          !gameInvites.length
        "
        class="social-muted"
      >
        Aucune notification.
      </p>

      <article
        v-for="request in requests"
        :key="`friend-${request.id}`"
        class="notif-item"
      >
        <button
          type="button"
          class="notif-sender"
          @click="publicProfile(request.sender.id)"
        >
          {{ request.sender.displayName }}
        </button>

        <span class="notif-desc">
          demande à devenir ton ami
        </span>

        <div class="notif-actions">
          <button
            type="button"
            class="btn-accept"
            @click="answer(request, true)"
          >
            ACCEPTER
          </button>

          <button
            type="button"
            class="btn-reject"
            @click="answer(request, false)"
          >
            REFUSER
          </button>
        </div>
      </article>

      <article
        v-for="invite in gameInvites"
        :key="`game-${invite.id}`"
        class="notif-item"
      >
        <span class="notif-desc">
          <b>{{ invite.creator.displayName }}</b>
          vous défie en
          {{
            invite.mode === 'team-1v1'
              ? 'Team Auction 1v1'
              : invite.mode === 'team-1v1v1'
                ? 'Team Auction 1v1v1'
                : invite.mode
          }}
        </span>

        <div class="notif-actions">
          <button
            type="button"
            class="btn-accept"
            :disabled="
              joiningInviteIds.includes(invite.id)
            "
            @click="joinGameInvite(invite)"
          >
            {{
              joiningInviteIds.includes(invite.id)
                ? 'Connexion au salon...'
                : isTeamInvite(invite)
                  ? 'REJOINDRE'
                  : 'ACCEPTER'
            }}
          </button>

          <button
            type="button"
            class="btn-reject"
            :disabled="
              joiningInviteIds.includes(invite.id)
            "
            @click="declineGameInvite(invite)"
          >
            REFUSER
          </button>
        </div>

        <p
          v-if="inviteJoinErrors[invite.id]"
          class="notif-error"
        >
          {{ inviteJoinErrors[invite.id] }}
        </p>
      </article>
    </div>

    <MobileSidebar
      :open="sidebarOpen"
      @close="sidebarOpen = false"
    />
  </nav>
</template>

<style scoped src="./SocialHeader.css"></style>