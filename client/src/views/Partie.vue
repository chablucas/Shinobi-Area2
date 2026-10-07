<script setup lang="ts">
import EmoteSystem from '@/components/EmoteSystem.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import GameCard from '../components/GameCard.vue'
import { useGameDataStore } from '../stores/gameData'
import { useAuthStore } from '../stores/auth'
import { saveBuild } from '../services/buildApi'
import { CombatApiError, simulateFight } from '../services/gameApi'
import { appliedRuleSentence, appliedRuleTone } from '../services/combatRuleDisplay'
import { calculateRealtimeGameResult, chooseRealtimeGameResult, getGameLobby, getLobbyGame, SocialApiError, type AutoRealtimeResult, type RealtimeGameState } from '../services/socialApi'
import { connectGameSocket, type GameSocket } from '../services/realtimeApi'
import type { Card } from '../types/card'
import type { CombatResult } from '../types/combat'
import {
  CATEGORY_DEFINITIONS,
  createPlayerBuildsForCount,
  drawRandomCard,
  filledSlotCount,
  getNextPlayerId,
  isBuildComplete,
  placeCard,
  undoPlacement,
  type CategorySlug,
  type LastPlacement,
  type PlayerBuild,
  type PlayerId,
} from '../game/gameEngine'
import { chooseBestCategory } from '../game/ai/categoryEvaluator'
import CombatDrawArea from '../components/CombatDrawArea.vue'

type Phase = 'construction' | 'combat' | 'result'
type GameMode = 'solo' | 'local2' | 'local3' | 'local4'

const props = withDefaults(defineProps<{ mode?: GameMode; lobbyId?: string }>(), { mode: 'local2' })
const auth = useAuthStore()
const gameData = useGameDataStore()
const cards = ref<Card[]>([])
const builds = ref<PlayerBuild[]>(createPlayerBuildsForCount(props.mode === 'local4' ? 4 : props.mode === 'local3' ? 3 : 2))
const usedCardIds = ref(new Set<number>())
const pendingCard = ref<Card | null>(null)
const lastPlacement = ref<LastPlacement | null>(null)
const activePlayerId = ref<PlayerId>(1)
const phase = ref<Phase>('construction')
const winnerId = ref<PlayerId | null>(null)
const combatResult = ref<CombatResult | null>(null)
const simulating = ref(false)
const loading = ref(true)
const errorMessage = ref('')
const lobbyAccessError = ref('')
const saved = ref(false)

function createGameId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const gameId = ref(createGameId())
const realtimeState = ref<RealtimeGameState | null>(null)
const realtimePlayerNumber = ref<number | null>(null)
const realtimeSocket = ref<GameSocket | null>(null)
const socketConnected = ref(false)
const drawLoading = ref(false)
const currentStateVersion = ref(0)
const realtimeHostId = ref<number | null>(null)
const resultLoading = ref(false)
const manualResultOpen = ref(false)

const activeBuild = computed(() => builds.value[activePlayerId.value - 1]!)
const availableCardCount = computed(() => cards.value.length - usedCardIds.value.size)
const allBuildsComplete = computed(() => builds.value.every(isBuildComplete))
const winnerName = computed(() => winnerId.value ? `Joueur ${winnerId.value}` : '')
const playerCount = computed<2 | 3 | 4>(() => props.mode === 'local4' ? 4 : props.mode === 'local3' ? 3 : 2)
const isComputerTurn = computed(() => props.mode === 'solo' && activePlayerId.value === 2)
const combatBlocked = computed(() => Boolean(combatResult.value && (combatResult.value.player1.validationErrors.length || combatResult.value.player2.validationErrors.length)))
const gameStatKeys: Record<string, keyof CombatResult['player1']['finalStats'] | null> = { chakra: 'chakra', invocation: 'invocation', iq: 'iq', ninjutsu: 'ninjutsuAttack', genjutsu: 'genjutsu', taijutsu: 'taijutsu', avatar: 'avatar', body: 'body', fuinjutsu: 'fuinjutsu', senjutsu: 'senjutsu', kenjutsu: 'kenjutsu', clan: null, vitesse: 'speed', 'kekkei-genkai': 'kekkeiGenkai', 'kekkei-mora': 'kekkeiMora' }
const opponentEmoteSystem = ref<InstanceType<typeof EmoteSystem> | null>(null)
const thirdPlayerEmoteSystem = ref<InstanceType<typeof EmoteSystem> | null>(null)
const fourthPlayerEmoteSystem = ref<InstanceType<typeof EmoteSystem> | null>(null)
function sendRealtimeEmote(emoteId: string) {
  const socket = realtimeSocket.value
  const game = realtimeState.value

  if (!socket || !game || !socketConnected.value) {
    return
  }

  socket.emit('game:emote', {
    gameId: game.id,
    emoteId,
  })
}

onMounted(async () => {
  await auth.loadCurrentUser()
  if (props.lobbyId) {
    if (!auth.token) { lobbyAccessError.value = 'Connecte-toi pour rejoindre ce combat.'; loading.value = false; return }
    try {
      const lobby = await getGameLobby(auth.token, props.lobbyId)
      realtimeHostId.value = lobby.creatorId
      if (lobby.status !== 'PLAYING') { lobbyAccessError.value = lobby.status === 'READY' ? 'Le combat n’a pas encore commencé.' : 'Le salon attend encore les participants.'; loading.value = false; return }
      realtimeState.value = await getLobbyGame(auth.token, props.lobbyId)
      realtimePlayerNumber.value = realtimeState.value.players.find((player) => player.userId === auth.user?.id)?.playerNumber ?? null
      const socket = connectGameSocket(auth.token)
      realtimeSocket.value = socket
      const join = () => { socketConnected.value = true; errorMessage.value = ''; socket.emit('game:join', realtimeState.value?.id ?? '') }
      socket.on('connect', join)
      socket.on('disconnect', () => { socketConnected.value = false; drawLoading.value = false })
      socket.on('connect_error', () => { socketConnected.value = false; errorMessage.value = 'Connexion au combat impossible. Reconnexion...' })
      socket.on('game:state', (state) => {
        const incomingVersion = Number(state.stateVersion ?? state.turnNumber ?? 0)
        if (incomingVersion < currentStateVersion.value) {
          return
        }
        currentStateVersion.value = incomingVersion
        realtimeState.value = state
        drawLoading.value = false
        errorMessage.value = ''
      })
      socket.on('game:error', (socketError) => { errorMessage.value = socketError.message; drawLoading.value = false })
      const validEmoteIds = [
        'naruto',
        'kiba',
        'sakura',
        'shikamaru',
        'kakashi',
        'rock-lee',
      ] as const
      socket.on('game:emote', (data) => {
  if (data.userId === auth.user?.id) {
    return
  }

  if (
    !validEmoteIds.includes(
      data.emoteId as typeof validEmoteIds[number]
    )
  ) {
    return
  }

  const emoteId = data.emoteId as typeof validEmoteIds[number]

const otherPlayers =
  realtimeState.value?.players
    .filter((player) => player.userId !== auth.user?.id)
    .sort((a, b) => a.playerNumber - b.playerNumber) ?? []

const senderIndex = otherPlayers.findIndex(
  (player) => player.userId === data.userId
)

if (senderIndex === 0) {
  // Premier adversaire : bas gauche
  opponentEmoteSystem.value?.showEmote(emoteId)
} else if (senderIndex === 1) {
  // Deuxième adversaire : haut droite
  thirdPlayerEmoteSystem.value?.showEmote(emoteId)
} else if (senderIndex === 2) {
  // Troisième adversaire : haut gauche
  fourthPlayerEmoteSystem.value?.showEmote(emoteId)
}
})       
    } catch (error) {
  console.error('[PARTIE] Erreur accès combat :', error)

  if (error instanceof SocialApiError) {
    lobbyAccessError.value =
      error.status === 404
        ? error.message || 'Partie ou salon introuvable.'
        : error.status === 401
          ? 'Session expirée. Reconnecte-toi.'
          : error.status === 403
            ? error.message || 'Vous n’avez pas accès à ce combat.'
            : error.message
  } else if (error instanceof Error) {
    lobbyAccessError.value = error.message
  } else {
    lobbyAccessError.value = 'Accès au combat impossible.'
  }

  loading.value = false
  return
}
  }
  try {
  cards.value = await gameData.loadCards()

  if (cards.value.length < 30) {
    errorMessage.value =
      'Il faut au moins 30 cartes pour commencer une partie.'
  }
} catch (error) {
  errorMessage.value =
    error instanceof Error
      ? error.message
      : 'Impossible de charger les cartes.'
} finally {
  loading.value = false
}
})
onUnmounted(() => { realtimeSocket.value?.disconnect() })

const realtimeCurrentPlayer = computed(() => realtimeState.value?.players.find((player) => player.playerNumber === realtimeState.value?.currentPlayerNumber) ?? null)
const realtimeCurrentPlayerName = computed(() => realtimeCurrentPlayer.value?.displayName ?? `Joueur ${realtimeState.value?.currentPlayerNumber ?? 1}`)
const realtimeMyPlayer = computed(() => realtimeState.value?.players.find((player) => player.playerNumber === realtimePlayerNumber.value) ?? null)
const realtimeMyTurn = computed(() => Boolean(realtimeState.value && realtimePlayerNumber.value === realtimeState.value.currentPlayerNumber))
const isRealtimeHost = computed(() => auth.user?.id === realtimeHostId.value)
const autoRealtimeResult = computed(() => {
  const result = realtimeState.value?.result
  return result && 'resultMode' in result && result.resultMode === 'AUTO' ? result as AutoRealtimeResult : null
})
const realtimeWinnerName = computed(() => {
  const result = realtimeState.value?.result
  const winnerNumber = result && 'winnerNumber' in result ? result.winnerNumber : result && 'winner' in result ? result.winner === 'player1' ? 1 : result.winner === 'player2' ? 2 : null : null
  return winnerNumber ? realtimeState.value?.players.find((player) => player.playerNumber === winnerNumber)?.displayName ?? `Joueur ${winnerNumber}` : ''
})
const realtimeResultIsDraw = computed(() => {
  const result = realtimeState.value?.result
  return result && 'isDraw' in result ? result.isDraw : result && 'winner' in result ? result.winner === 'draw' : false
})
const canDraw = computed(() => Boolean(
  socketConnected.value
  && realtimeState.value?.status === 'PLAYING'
  && realtimeMyTurn.value
  && !realtimeMyPlayer.value?.pendingCard
  && (realtimeMyPlayer.value?.cardsRemaining ?? 0) > 0
  && !drawLoading.value
))
function realtimeCanPlaceCategory(category: string) {
  const player = realtimeMyPlayer.value
  if (!realtimeState.value || !realtimeMyTurn.value || !player?.pendingCard || player.playerNumber !== realtimePlayerNumber.value || player.slots[category]) return false
  return true
}
function realtimeDraw() {
  if (!realtimeState.value || !canDraw.value) return
  drawLoading.value = true
  realtimeSocket.value?.emit('game:draw', realtimeState.value.id)
}
function realtimePlace(category: string) { if (realtimeState.value && realtimeCanPlaceCategory(category)) realtimeSocket.value?.emit('game:place-card', { gameId: realtimeState.value.id, category }) }
async function calculateRealtimeWinner() {
  if (!auth.token || !realtimeState.value || resultLoading.value) return
  resultLoading.value = true
  errorMessage.value = ''
  try { realtimeState.value = await calculateRealtimeGameResult(auth.token, realtimeState.value.id) } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Calcul du résultat impossible.' } finally { resultLoading.value = false }
}
async function submitManualRealtimeWinner(winnerNumber: number | null, isDraw = false) {
  if (!auth.token || !realtimeState.value || resultLoading.value) return
  resultLoading.value = true
  errorMessage.value = ''
  try { realtimeState.value = await chooseRealtimeGameResult(auth.token, realtimeState.value.id, winnerNumber, isDraw); manualResultOpen.value = false } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Choix du résultat impossible.' } finally { resultLoading.value = false }
}

watch([activePlayerId, phase, cards], () => {
  if (isComputerTurn.value && !loading.value) playComputerTurn()
})

function drawCard() {
  if (phase.value !== 'construction' || pendingCard.value || allBuildsComplete.value) return
  errorMessage.value = ''
  const card = drawRandomCard(cards.value, usedCardIds.value)
  if (!card) {
    errorMessage.value = 'Aucune carte ne reste disponible.'
    return
  }
  pendingCard.value = card
  usedCardIds.value = new Set(usedCardIds.value).add(card.id)
}

function placePendingCard(category: CategorySlug) {
  if (!pendingCard.value || phase.value !== 'construction' || activeBuild.value.slots[category]) return
  const playerIndex = activePlayerId.value - 1
  builds.value[playerIndex] = placeCard(activeBuild.value, category, pendingCard.value)
  lastPlacement.value = { playerId: activePlayerId.value, category, card: pendingCard.value }
  pendingCard.value = null

  if (allBuildsComplete.value) {
    phase.value = 'combat'
    return
  }
  activePlayerId.value = getNextPlayerId(activePlayerId.value, playerCount.value)
}

function playComputerTurn() {
  if (!isComputerTurn.value || phase.value !== 'construction' || pendingCard.value) return
  const card = drawRandomCard(cards.value, usedCardIds.value)
  if (!card) return
  const category = chooseBestCategory(activeBuild.value, card)
  if (!category) return
  usedCardIds.value = new Set(usedCardIds.value).add(card.id)
  builds.value[1] = placeCard(activeBuild.value, category, card)
  lastPlacement.value = { playerId: 2, category, card }
  if (allBuildsComplete.value) phase.value = 'combat'
  else activePlayerId.value = 1
}

function undoLastPlacement() {
  if (phase.value !== 'construction' || !lastPlacement.value || pendingCard.value || (props.mode === 'solo' && lastPlacement.value.playerId === 2)) return
  const placement = lastPlacement.value
  const playerIndex = placement.playerId - 1
  builds.value[playerIndex] = undoPlacement(builds.value[playerIndex]!, placement)
  pendingCard.value = placement.card
  activePlayerId.value = placement.playerId
  lastPlacement.value = null
}

function compositionFor(build: PlayerBuild) {
  return { slots: Object.fromEntries(CATEGORY_DEFINITIONS.map(([, slug]) => [slug, build.slots[slug]?.slug ?? ''])) }
}

function manualResult(): CombatResult {
  const results = builds.value.slice(0, 2).map((build) => {
    const finalStats = Object.fromEntries(Object.keys(gameStatKeys).filter((key) => gameStatKeys[key]).map((key) => [gameStatKeys[key], build.slots[key as CategorySlug]?.stats[gameStatKeys[key]!] ?? 0])) as CombatResult['player1']['finalStats']
    finalStats.clan = 0
    finalStats.kekkeiMora = build.slots['kekkei-mora']?.stats.kekkeiMora ?? 0
    const totalBeforeAvatarPenalty = Object.entries(finalStats).filter(([key]) => key !== 'clan').reduce((total, [, value]) => total + Math.max(0, value), 0)
    const hasValidAvatar = finalStats.avatar > 0
    const total = hasValidAvatar ? totalBeforeAvatarPenalty : totalBeforeAvatarPenalty * 0.85
    const appliedRules = hasValidAvatar ? [] : [{ ruleId: 'NO_AVATAR_FINAL_PENALTY', label: 'Aucun Avatar valide', target: 'total', operation: 'percentage' as const, value: -0.15, before: totalBeforeAvatarPenalty, after: total }]
    return { baseStats: { ...finalStats }, finalStats, total, appliedRules, permissions: { sharingan: false, rinnegan: false, byakugan: false, tenseigan: false, otsutsuki: false, uzumaki: false }, validationErrors: [] }
  })
  return { resolutionMode: 'manual', winner: 'draw', player1: results[0]!, player2: results[1]!, player1Total: results[0]!.total, player2Total: results[1]!.total, scores: { player1: 0, player2: 0 }, categories: [] }
}

function chooseManualWinner(winner: 'player1' | 'player2' | 'draw') {
  if (phase.value !== 'combat') return
  combatResult.value = { ...manualResult(), winner }
  winnerId.value = winner === 'player1' ? 1 : winner === 'player2' ? 2 : null
  phase.value = 'result'
}

function cardFor(build: PlayerBuild, slug: CategorySlug) { return build.slots[slug] }
function finalValue(player: CombatResult['player1'], slug: CategorySlug) {
  if (slug === 'clan') return null
  const value = player.finalStats[gameStatKeys[slug]!]
  return typeof value === 'number' ? Number(value.toFixed(2)) : value
}

async function runSimulation() {
  if (phase.value !== 'combat' || simulating.value || builds.value.length < 2) return
  simulating.value = true
  errorMessage.value = ''
  try {
    combatResult.value = await simulateFight(compositionFor(builds.value[0]!), compositionFor(builds.value[1]!))
    winnerId.value = combatResult.value.winner === 'player1' ? 1 : combatResult.value.winner === 'player2' ? 2 : null
    phase.value = 'result'
    if (props.mode === 'solo' && auth.isAuthenticated && winnerId.value) void auth.recordResult(gameId.value, winnerId.value === 1)
  } catch (error) {
    if (error instanceof CombatApiError && error.result) { combatResult.value = error.result; phase.value = 'result' }
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de simuler le combat.'
  } finally { simulating.value = false }
}

async function saveHumanBuild() {
  if (!auth.token || saved.value) return
  const slots = CATEGORY_DEFINITIONS.map(([_, slug]) => {
    const cardId = builds.value[0]?.slots[slug]?.id
    return typeof cardId === 'number' ? { categorySlug: slug, cardId } : null
  }).filter((slot): slot is { categorySlug: typeof CATEGORY_DEFINITIONS[number][1]; cardId: number } => slot !== null)
  if (slots.length !== CATEGORY_DEFINITIONS.length) return
  try { await saveBuild(auth.token, `Composition ${new Date().toLocaleDateString('fr-FR')}`, slots); saved.value = true } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Impossible de sauvegarder la composition.' }
}

function replay() {
  builds.value = createPlayerBuildsForCount(playerCount.value)
  usedCardIds.value = new Set()
  pendingCard.value = null
  lastPlacement.value = null
  activePlayerId.value = 1
  winnerId.value = null
  combatResult.value = null
  simulating.value = false
  errorMessage.value = ''
  phase.value = 'construction'
  saved.value = false
  gameId.value = createGameId()
}

function slotCard(build: PlayerBuild, slug: CategorySlug) {
  return build.slots[slug]
}

type DrawCardLike = Pick<Card, 'name' | 'imageUrl' | 'clans' | 'traits'> & {
  stats?: Record<string, number | null>
}

function drawStatsFor(card: DrawCardLike | null) {
  if (!card) return []
  const statsMap = card.stats ?? {}
  const allStats = [
    ['Chakra', statsMap.chakra ?? 0],
    ['IQ', statsMap.iq ?? 0],
    ['Ninjutsu ATQ', statsMap.ninjutsuAttack ?? 0],
    ['Ninjutsu DEF', statsMap.ninjutsuDefense ?? 0],
    ['Genjutsu', statsMap.genjutsu ?? 0],
    ['Taijutsu', statsMap.taijutsu ?? 0],
    ['Body', statsMap.body ?? 0],
    ['Fūinjutsu', statsMap.fuinjutsu ?? 0],
    ['Senjutsu', statsMap.senjutsu ?? 0],
    ['Kenjutsu', statsMap.kenjutsu ?? 0],
    ['Vitesse', statsMap.speed ?? 0],
    ['Kekkei Genkai', statsMap.kekkeiGenkai ?? 0],
    ['Kekkei Mōra', statsMap.kekkeiMora ?? 0],
    ['Avatar', statsMap.avatar ?? 0],
    ['Invocation', statsMap.invocation ?? 0],
    ['Sensoriel', statsMap.sensory ?? 0],
  ] as Array<[string, number]>
  return allStats.filter(([, value]) => Number(value) > 0).map(([label, value]) => ({ label, value: Number(value).toFixed(0) }))
}

function drawBonusesFor(card: DrawCardLike | null) {
  if (!card) return []

  return [{
    label: 'Clan',
    value: card.clans?.length
      ? card.clans.join(' · ')
      : 'Aucun clan',
  }]
}

function placedCardValue(
  card: Card | null | undefined,
  category: CategorySlug,
) {
  if (!card) return '—'

  if (category === 'clan') {
    return card.clans?.join(' · ') || 'Aucun clan'
  }

  const key = gameStatKeys[category]
  if (!key) return '—'

  return Number(card.stats[key] ?? 0).toFixed(0)
}

</script>

<template>
  <main class="game-shell">
    <header class="page-heading">
      <div>
        <p class="eyebrow">{{ props.mode === 'solo' ? 'Solo · joueur contre ordinateur' : props.mode === 'local3' ? 'Local · 3 joueurs' : 'Local · 2 joueurs' }}</p>
        <h1>Arène de combat</h1>
      </div>
      <div v-if="phase === 'construction'" class="turn-status" :class="{ active: !pendingCard }">
        <span class="status-dot"></span>
        <strong>
          {{ isComputerTurn ? 'Tour de l’ordinateur...' : pendingCard ? `Joueur ${activePlayerId} : place ta carte` : `Tour du Joueur ${activePlayerId} : pioche une carte` }}
        </strong>
        <small>{{ availableCardCount }} cartes restantes dans le deck</small>
      </div>
    </header>

    <p v-if="lobbyAccessError" class="error-message">{{ lobbyAccessError }}</p>
    <template v-else>
      <p v-if="loading" class="loading-message">Chargement des 163 cartes...</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <!-- Combat multijoueur temps réel -->
      <section v-if="props.lobbyId && realtimeState" class="realtime-game">
        <div class="realtime-turn" :class="{ active: realtimeMyTurn }">
          <strong>{{ realtimeMyTurn ? 'À TON TOUR' : `AU TOUR DE ${realtimeCurrentPlayerName.toUpperCase()}` }}</strong>
          <span>Tour {{ realtimeState.turnNumber }}</span>
        </div>
        <div v-if="realtimeMyPlayer" class="realtime-global-draw">
          <CombatDrawArea
            :card="realtimeMyPlayer.pendingCard"
            title="Carte piochée"
            :show-button="true"
            :button-disabled="!canDraw"
            :stats="drawStatsFor(realtimeMyPlayer.pendingCard)"
            :bonuses="drawBonusesFor(realtimeMyPlayer.pendingCard)"
            button-label="PIOCHER"
            empty-text="Aucune carte"
            :waiting-text="realtimeMyTurn ? 'PIOCHER' : 'EN ATTENTE'"
            @draw="realtimeDraw"
          />
        </div>

        <div class="realtime-battle-layout">
          <article
            v-for="player in [
              ...realtimeState.players.filter((p) => p.playerNumber === realtimePlayerNumber),
              ...realtimeState.players.filter((p) => p.playerNumber !== realtimePlayerNumber),
            ]"
            :key="player.playerNumber"
            class="build-panel realtime-build-panel"
            :class="{
              'is-active': player.playerNumber === realtimeState.currentPlayerNumber,
              'is-me': player.userId === auth.user?.id,
            }"
          >
            <header class="build-header">
              <div>
                <p class="eyebrow">Joueur {{ player.playerNumber }}</p>
                <h2>
                  {{ player.displayName }}
                  <span v-if="player.userId === auth.user?.id"> (Toi)</span>
                </h2>
              </div>
              <span class="build-count">
                {{ 15 - Object.values(player.slots).filter(Boolean).length }}
                <small>places libres</small>
              </span>
            </header>

            <div class="category-grid">
              <button
                v-for="[label, category] in CATEGORY_DEFINITIONS"
                :key="category"
                type="button"
                class="category-slot"
                :disabled="player.playerNumber !== realtimePlayerNumber || !realtimeCanPlaceCategory(category)"
                :class="{
                  filled: !!player.slots[category],
                  selectable:
                    player.playerNumber === realtimePlayerNumber &&
                    realtimeCanPlaceCategory(category) &&
                    !player.slots[category],
                }"
                @click="player.playerNumber === realtimePlayerNumber && realtimePlace(category)"
              >
                <span class="slot-label">{{ label }}</span>

                <template v-if="player.slots[category]">
                  <span class="slot-card-preview">
                    <img
                      v-if="player.slots[category]?.imageUrl"
                      :src="player.slots[category]?.imageUrl ?? undefined"
                      :alt="`Miniature de ${player.slots[category]?.name}`"
                      loading="lazy"
                    />
                    <span v-else class="slot-card-fallback">
                      {{ player.slots[category]?.name.slice(0, 1) }}
                    </span>
                  </span>

                  <span class="slot-card-details">
                    <span class="slot-card-name">{{ player.slots[category]?.name }}</span>

                    <span v-if="category === 'ninjutsu'" class="final-stat-pair">
                      ATQ {{ player.slots[category]?.stats.ninjutsuAttack }}
                      · DEF {{ player.slots[category]?.stats.ninjutsuDefense }}
                    </span>

                    <span v-else-if="category === 'clan'" class="final-stat-value">
                      {{ player.slots[category]?.clans.join(' · ') || 'Aucun' }}
                    </span>

                    <span v-else class="final-stat-value">
                      {{
                        category === 'vitesse'
                          ? Number(player.slots[category]?.stats.speed ?? 0).toFixed(0)
                          : category === 'kekkei-genkai'
                            ? Number(player.slots[category]?.stats.kekkeiGenkai ?? 0).toFixed(0)
                            : category === 'kekkei-mora'
                              ? Number(player.slots[category]?.stats.kekkeiMora ?? 0).toFixed(0)
                              : typeof player.slots[category]?.stats[category] === 'number'
                                ? Number(player.slots[category]!.stats[category]).toFixed(0)
                                : '—'
                      }}
                    </span>

                    <span class="slot-state">Posée</span>
                  </span>
                </template>

                <template v-else>
                  <span class="slot-empty">Libre</span>
                  <span class="slot-state">
                    {{
                      player.playerNumber === realtimePlayerNumber &&
                      realtimeMyTurn &&
                      realtimeMyPlayer?.pendingCard
                        ? 'Placer ici'
                        : 'En attente'
                    }}
                  </span>
                </template>
              </button>
            </div>
          </article>
        </div>

        <section v-if="realtimeState.status === 'AWAITING_RESULT'" class="realtime-result">
          <p class="eyebrow">Combat terminé</p>
          <h2>Les deux shinobis sont complets.</h2>
          <div class="combat-actions">
            <button type="button" :disabled="resultLoading" @click="calculateRealtimeWinner">
              {{ resultLoading ? 'CALCUL EN COURS...' : 'CALCULER LE VAINQUEUR' }}
            </button>
            <button v-if="isRealtimeHost" type="button" :disabled="resultLoading" @click="manualResultOpen = true">
              CHOISIR LE VAINQUEUR
            </button>
          </div>
        </section>

        <section v-if="realtimeState.status === 'FINISHED' && realtimeState.result" class="realtime-result">
          <p class="eyebrow">Résultat du combat</p>
          <template v-if="autoRealtimeResult">
            <div class="combat-score realtime-ranking">
              <article v-for="ranking in autoRealtimeResult.rankings" :key="ranking.playerIndex">
                <h3>{{ ranking.rank }}{{ ranking.rank === 1 ? 'er' : 'e' }} · {{ realtimeState.players[ranking.playerIndex]?.displayName }}</h3>
                <strong>{{ ranking.total }}</strong>
                <span>{{ ranking.score }} catégorie(s)</span>
                <div v-if="autoRealtimeResult.players[ranking.playerIndex]?.appliedRules.length" class="rules-applied-section">
                  <h4>BONUS / MALUS JOUEUR {{ ranking.playerIndex + 1 }}</h4>
                  <p
                    v-for="rule in autoRealtimeResult.players[ranking.playerIndex]?.appliedRules"
                    :key="rule.ruleId + rule.target + rule.after"
                    class="rule-row"
                    :class="appliedRuleTone(rule)"
                  >
                    {{ appliedRuleSentence(rule) }}
                  </p>
                </div>
              </article>
            </div>
            <h2>{{ autoRealtimeResult.isDraw ? 'ÉGALITÉ' : `VAINQUEUR : ${realtimeWinnerName}` }}</h2>
            <p>Résultat calculé par le moteur officiel.</p>
          </template>
          <template v-else>
            <h2>{{ realtimeResultIsDraw ? 'ÉGALITÉ' : `VAINQUEUR : ${realtimeWinnerName}` }}</h2>
            <p>Résultat choisi manuellement par l’hôte.</p>
          </template>
        </section>

        <div v-if="manualResultOpen" class="manual-result-modal" role="dialog" aria-modal="true">
          <section>
            <p class="eyebrow">Qui a gagné ?</p>
            <button v-for="player in realtimeState.players" :key="player.playerNumber" type="button" :disabled="resultLoading" @click="submitManualRealtimeWinner(player.playerNumber)">
              JOUEUR {{ player.playerNumber }} — {{ player.displayName }}
            </button>
            <button type="button" :disabled="resultLoading" @click="submitManualRealtimeWinner(null, true)">
              ÉGALITÉ
            </button>
            <button type="button" :disabled="resultLoading" @click="manualResultOpen = false">
              ANNULER
            </button>
          </section>
        </div>
      </section>

      <!-- Phase 1: Construction des Shinobis (Local / Solo / 1v1v1) -->
      <template v-if="!props.lobbyId && phase === 'construction'">
        <!-- BLOC PIOCHE GLOBAL (Desktop/Tablette: au-dessus des decks) -->
        <div v-if="phase === 'construction'" class="global-draw-container">
          <CombatDrawArea
            :card="pendingCard"
            title="Carte piochée"
            :show-button="!pendingCard"
            :button-disabled="loading || availableCardCount === 0 || allBuildsComplete"
            :stats="drawStatsFor(pendingCard)"
            :bonuses="drawBonusesFor(pendingCard)"
            :button-label="`PIOCHER UNE CARTE (J${activePlayerId})`"
            empty-text="Aucune carte"
            :waiting-text="pendingCard ? 'Place ta carte' : `En attente du tour de Joueur ${activePlayerId}`"
            @draw="drawCard"
          />
          <button
            v-if="lastPlacement && (lastPlacement.playerId === activePlayerId || (activePlayerId === 2 && isComputerTurn))"
            class="undo-action-btn"
            type="button"
            @click="undoLastPlacement"
          >
            ← Annuler le coup
          </button>
        </div>

        <section class="vertical-battle-layout">
          <!-- JOUEUR 1 -->
          <article class="build-panel player-one" :class="{ 'is-active': activePlayerId === 1 }">
            <header class="build-header">
              <div>
                <p class="eyebrow">Composition 01</p>
                <h2>{{ props.mode === 'solo' ? 'Ton Shinobi' : 'Joueur 1' }}</h2>
              </div>
              <span class="build-count">{{ filledSlotCount(builds[0]!) }} <small>/ 15</small></span>
            </header>

            <!-- Grille des 15 cartes Joueur 1 -->
            <div class="category-grid">
              <button
                v-for="[label, slug] in CATEGORY_DEFINITIONS"
                :key="slug"
                class="category-slot"
                :class="{
                  filled: slotCard(builds[0]!, slug),
                  selectable: activePlayerId === 1 && !!pendingCard && !slotCard(builds[0]!, slug),
                }"
                type="button"
                :disabled="activePlayerId !== 1 || !pendingCard || !!slotCard(builds[0]!, slug)"
                @click="placePendingCard(slug)"
              >
                <span class="slot-label">{{ label }}</span>
                <template v-if="slotCard(builds[0]!, slug)">
                  <span class="slot-card-preview">
                    <img
                      v-if="slotCard(builds[0]!, slug)?.imageUrl"
                      :src="slotCard(builds[0]!, slug)?.imageUrl ?? undefined"
                      :alt="`Miniature de ${slotCard(builds[0]!, slug)?.name}`"
                    />
                    <span v-else class="slot-card-fallback">{{ slotCard(builds[0]!, slug)?.name.slice(0, 1) }}</span>
                  </span>
                  <span class="slot-card-details">
                    <span class="slot-card-name">{{ slotCard(builds[0]!, slug)?.name }}</span>
                    <span class="slot-state">{{ placedCardValue(slotCard(builds[0]!, slug), slug) }}</span>
                  </span>
                </template>
                <template v-else>
                  <span class="slot-empty">Libre</span>
                  <span class="slot-state">{{ activePlayerId === 1 && pendingCard ? 'Placer ici' : 'En attente' }}</span>
                </template>
              </button>
            </div>
          </article>

          <!-- ZONE CENTRALE DE COMBAT -->
          <div class="battle-center-arena">
            <div class="arena-badge">
              <span class="arena-icon">⚔</span>
              <span class="arena-text">ZONE DE COMBAT</span>
              <span class="arena-icon">⚔</span>
            </div>
            <p class="arena-status">
              {{
                allBuildsComplete
                  ? 'Compositions complètes ! Prêt pour le combat.'
                  : isComputerTurn
                    ? 'L’ordinateur analyse la pioche...'
                    : pendingCard
                      ? `Joueur ${activePlayerId} : choisis l'emplacement de ta carte`
                      : `Joueur ${activePlayerId} : tire une carte`
              }}
            </p>
          </div>

          <!-- JOUEUR 2 -->
          <article class="build-panel player-two" :class="{ 'is-active': activePlayerId === 2 }">
            <header class="build-header">
              <div>
                <p class="eyebrow">Composition 02</p>
                <h2>{{ props.mode === 'solo' ? 'IA Adversaire' : 'Joueur 2' }}</h2>
              </div>
              <span class="build-count">{{ filledSlotCount(builds[1]!) }} <small>/ 15</small></span>
            </header>

            <!-- Grille des 15 cartes Joueur 2 -->
            <div class="category-grid">
              <button
                v-for="[label, slug] in CATEGORY_DEFINITIONS"
                :key="slug"
                class="category-slot"
                :class="{
                  filled: slotCard(builds[1]!, slug),
                  selectable: activePlayerId === 2 && !!pendingCard && !slotCard(builds[1]!, slug),
                }"
                type="button"
                :disabled="isComputerTurn || activePlayerId !== 2 || !pendingCard || !!slotCard(builds[1]!, slug)"
                @click="placePendingCard(slug)"
              >
                <span class="slot-label">{{ label }}</span>
                <template v-if="slotCard(builds[1]!, slug)">
                  <span class="slot-card-preview">
                    <img
                      v-if="slotCard(builds[1]!, slug)?.imageUrl"
                      :src="slotCard(builds[1]!, slug)?.imageUrl ?? undefined"
                      :alt="`Miniature de ${slotCard(builds[1]!, slug)?.name}`"
                      loading="lazy"
                    />
                    <span v-else class="slot-card-fallback">{{ slotCard(builds[1]!, slug)?.name.slice(0, 1) }}</span>
                  </span>
                  <span class="slot-card-details">
                    <span class="slot-card-name">{{ slotCard(builds[1]!, slug)?.name }}</span>
                    <span class="slot-state">{{ placedCardValue(slotCard(builds[1]!, slug), slug) }}</span>
                  </span>
                </template>
                <template v-else>
                  <span class="slot-empty">Libre</span>
                  <span class="slot-state">{{ activePlayerId === 2 && pendingCard ? 'Placer ici' : 'En attente' }}</span>
                </template>
              </button>
            </div>
          </article>

          <!-- JOUEUR 3 (si mode 1v1v1) -->
          <article
            v-if="props.mode === 'local3' && builds[2]"
            class="build-panel player-three"
            :class="{ 'is-active': activePlayerId === 3 }"
          >
            <header class="build-header">
              <div>
                <p class="eyebrow">Composition 03</p>
                <h2>Joueur 3</h2>
              </div>
              <span class="build-count">{{ filledSlotCount(builds[2]!) }} <small>/ 15</small></span>
            </header>

            <div class="category-grid">
              <button
                v-for="[label, slug] in CATEGORY_DEFINITIONS"
                :key="slug"
                class="category-slot"
                :class="{
                  filled: slotCard(builds[2]!, slug),
                  selectable: activePlayerId === 3 && !!pendingCard && !slotCard(builds[2]!, slug),
                }"
                type="button"
                :disabled="activePlayerId !== 3 || !pendingCard || !!slotCard(builds[2]!, slug)"
                @click="placePendingCard(slug)"
              >
                <span class="slot-label">{{ label }}</span>
                <template v-if="slotCard(builds[2]!, slug)">
                  <span class="slot-card-preview">
                    <img
                      v-if="slotCard(builds[2]!, slug)?.imageUrl"
                      :src="slotCard(builds[2]!, slug)?.imageUrl ?? undefined"
                      :alt="`Miniature de ${slotCard(builds[2]!, slug)?.name}`"
                      loading="lazy"
                    />
                    <span v-else class="slot-card-fallback">{{ slotCard(builds[2]!, slug)?.name.slice(0, 1) }}</span>
                  </span>
                  <span class="slot-card-details">
                    <span class="slot-card-name">{{ slotCard(builds[2]!, slug)?.name }}</span>
                    <span class="slot-state">{{ placedCardValue(slotCard(builds[2]!, slug), slug) }}</span>
                  </span>
                </template>
                <template v-else>
                  <span class="slot-empty">Libre</span>
                  <span class="slot-state">{{ activePlayerId === 3 && pendingCard ? 'Placer ici' : 'En attente' }}</span>
                </template>
              </button>
            </div>
          </article>

          <article
            v-if="props.mode === 'local4' && builds[3]"
            class="build-panel player-four"
            :class="{ 'is-active': activePlayerId === 4 }"
          >
            <header class="build-header">
              <div>
                <p class="eyebrow">Composition 04</p>
                <h2>Joueur 4</h2>
              </div>
              <span class="build-count">{{ filledSlotCount(builds[3]!) }} <small>/ 15</small></span>
            </header>

            <div class="category-grid">
              <button
                v-for="[label, slug] in CATEGORY_DEFINITIONS"
                :key="slug"
                class="category-slot"
                :class="{
                  filled: slotCard(builds[3]!, slug),
                  selectable: activePlayerId === 4 && !!pendingCard && !slotCard(builds[3]!, slug),
                }"
                type="button"
                :disabled="activePlayerId !== 4 || !pendingCard || !!slotCard(builds[3]!, slug)"
                @click="placePendingCard(slug)"
              >
                <span class="slot-label">{{ label }}</span>
                <template v-if="slotCard(builds[3]!, slug)">
                  <span class="slot-card-preview">
                    <img
                      v-if="slotCard(builds[3]!, slug)?.imageUrl"
                      :src="slotCard(builds[3]!, slug)?.imageUrl ?? undefined"
                      :alt="`Miniature de ${slotCard(builds[3]!, slug)?.name}`"
                      loading="lazy"
                    />
                    <span v-else class="slot-card-fallback">{{ slotCard(builds[3]!, slug)?.name.slice(0, 1) }}</span>
                  </span>
                  <span class="slot-card-details">
                    <span class="slot-card-name">{{ slotCard(builds[3]!, slug)?.name }}</span>
                    <span class="slot-state">{{ placedCardValue(slotCard(builds[3]!, slug), slug) }}</span>
                  </span>
                </template>
                <template v-else>
                  <span class="slot-empty">Libre</span>
                  <span class="slot-state">{{ activePlayerId === 4 && pendingCard ? 'Placer ici' : 'En attente' }}</span>
                </template>
              </button>
            </div>
          </article>
        </section>
      </template>

      <!-- Phase 2: Étape de combat -->
      <section v-else-if="!props.lobbyId && phase === 'combat'" class="combat-panel">
        <div class="combat-intro">
          <p class="eyebrow">Arène finale</p>
          <h2>Simuler le combat</h2>
          <p>Les deux shinobis sont complets. Lance la confrontation officielle ou choisis le dénouement.</p>
        </div>

        <div class="combat-actions">
          <button type="button" class="btn-simulate" :disabled="simulating" @click="runSimulation">
            <span>{{ simulating ? 'Simulation en cours...' : '⚡ SIMULER LE COMBAT' }}</span>
            <span>→</span>
          </button>
          <div class="manual-choices">
            <button type="button" :disabled="simulating" @click="chooseManualWinner('player1')">
              Victoire J1
            </button>
            <button type="button" :disabled="simulating" @click="chooseManualWinner('player2')">
              Victoire J2
            </button>
            <button type="button" :disabled="simulating" @click="chooseManualWinner('draw')">
              Égalité
            </button>
          </div>
        </div>

        <div class="combat-builds">
          <article
            v-for="build in builds"
            :key="build.playerId"
            class="build-panel"
            :class="{ 'player-one': build.playerId === 1, 'player-two': build.playerId === 2, 'player-three': build.playerId === 3 }"
          >
            <header class="build-header">
              <h3>Joueur {{ build.playerId }}</h3>
              <span class="build-count">15 <small>/ 15</small></span>
            </header>
            <div class="category-grid">
              <div v-for="[label, slug] in CATEGORY_DEFINITIONS" :key="slug" class="category-slot filled">
                <span class="slot-label">{{ label }}</span>
                <span class="slot-card-preview">
                  <img
                    v-if="slotCard(build, slug)?.imageUrl"
                    :src="slotCard(build, slug)?.imageUrl ?? undefined"
                    :alt="`Miniature de ${slotCard(build, slug)?.name}`"
                  />
                  <span v-else class="slot-card-fallback">{{ slotCard(build, slug)?.name.slice(0, 1) }}</span>
                </span>
                <span class="slot-card-details">
                  <span class="slot-card-name">{{ slotCard(build, slug)?.name }}</span>
                  <span class="slot-state">{{ placedCardValue(slotCard(build, slug), slug) }}</span>
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- Phase 3: Résultats du combat -->
      <section v-else-if="!props.lobbyId" class="result-panel">
        <p class="eyebrow">Dénouement de l'arène</p>

        <template v-if="combatResult && combatBlocked">
          <h2>Composition invalide</h2>
          <div class="validation-errors">
            <p v-for="error in [...combatResult.player1.validationErrors, ...combatResult.player2.validationErrors]" :key="error.ruleId + error.message">
              {{ error.message }}
            </p>
          </div>
        </template>

        <template v-else-if="combatResult">
          <h2>
            {{
              combatResult.resolutionMode === 'manual'
                ? combatResult.winner === 'draw'
                  ? 'Égalité'
                  : `Vainqueur choisi : Joueur ${combatResult.winner === 'player1' ? 1 : 2}`
                : combatResult.winner === 'draw'
                  ? 'Égalité'
                  : `Gagnant : Joueur ${combatResult.winner === 'player1' ? 1 : 2}`
            }}
          </h2>

          <div class="combat-score">
            <article class="score-card player-one">
              <h3>Joueur 1</h3>
              <strong>{{ Number(combatResult.player1.total).toFixed(2) }}</strong>
              <span>Total Points</span>
            </article>
            <b class="score-vs">VS</b>
            <article class="score-card player-two">
              <h3>Joueur 2</h3>
              <strong>{{ Number(combatResult.player2.total).toFixed(2) }}</strong>
              <span>Total Points</span>
            </article>
          </div>

          <div class="result-builds final-builds">
            <article
              v-for="(player, index) in [combatResult.player1, combatResult.player2]"
              :key="index"
              class="build-panel"
              :class="{ 'player-one': index === 0, 'player-two': index === 1 }"
            >
              <header class="build-header">
                <h3>Joueur {{ index + 1 }} · Statistiques finales</h3>
              </header>
              <div class="category-grid">
                <div v-for="[label, slug] in CATEGORY_DEFINITIONS" :key="slug" class="category-slot filled">
                  <span class="slot-label">{{ label }}</span>
                  <span class="slot-card-preview">
                    <img
                      v-if="cardFor(builds[index]!, slug)?.imageUrl"
                      :src="cardFor(builds[index]!, slug)?.imageUrl ?? undefined"
                      :alt="`Miniature de ${cardFor(builds[index]!, slug)?.name}`"
                    />
                    <span v-else class="slot-card-fallback">{{ cardFor(builds[index]!, slug)?.name.slice(0, 1) }}</span>
                  </span>
                  <span class="slot-card-details">
                    <span class="slot-card-name">{{ cardFor(builds[index]!, slug)?.name }}</span>
                    <span v-if="slug === 'ninjutsu'" class="final-stat-pair">ATQ {{ player.finalStats.ninjutsuAttack }} · DEF {{ player.finalStats.ninjutsuDefense }}</span>
                    <span v-else-if="slug === 'clan'" class="final-stat-pair">{{ cardFor(builds[index]!, slug)?.name }}</span>
                    <span v-else class="final-stat-value">{{ finalValue(player, slug) }}</span>
                  </span>
                </div>
              </div>

              <div v-if="player.appliedRules.length" class="rules-applied-section">
                <h4>BONUS / MALUS JOUEUR {{ index + 1 }}</h4>
                <p
                  v-for="rule in player.appliedRules"
                  :key="rule.ruleId + rule.target + rule.after"
                  class="rule-row"
                  :class="appliedRuleTone(rule)"
                >
                  {{ appliedRuleSentence(rule) }}
                </p>
              </div>
            </article>
          </div>
        </template>

        <div v-else class="error-message">Aucun résultat de combat disponible.</div>

        <div class="result-actions">
          <button v-if="auth.isAuthenticated" class="primary-button" type="button" :disabled="saved" @click="saveHumanBuild">
            {{ saved ? '✓ Perso sauvegardé' : '💾 Sauvegarder mon perso' }}
          </button>
          <a v-else class="secondary-button" href="/connexion">Connecte-toi pour sauvegarder</a>
          <button class="primary-button" type="button" @click="replay">
            Rejouer <span>↻</span>
          </button>
          <a class="secondary-button" href="/">Retour à l’accueil <span>↗</span></a>
        </div>
      </section>
    </template>
  </main>
<!-- MES EMOTES : BAS DROITE -->
<EmoteSystem
  class="emote-self"
  @send-emote="sendRealtimeEmote"
/>

<!-- EMOTES ADVERSAIRE : BAS GAUCHE -->
<EmoteSystem
  v-if="props.lobbyId"
  ref="opponentEmoteSystem"
  class="emote-opponent"
  :display-only="true"
/>

<!-- EMOTES J3 : HAUT DROITE -->
<EmoteSystem
  v-if="props.lobbyId"
  ref="thirdPlayerEmoteSystem"
  class="emote-third"
  :display-only="true"
/>
</template>

<style scoped src="./Partie.css"></style>