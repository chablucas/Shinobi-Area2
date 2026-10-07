<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useGameDataStore } from '../stores/gameData'
import { useRulesDataStore } from '../stores/rulesData'

import {
  createClassicRule,
  deleteClassicRule,
  setClassicRuleEnabled,
  updateClassicRule,
  type ClassicRule,
  type TeamRulesPayload,
} from '../services/ruleAdminApi'

import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateAdminUserBlocked,
  updateAdminUserRole,
  type AdminOverview,
  type AdminUser,
} from '../services/adminApi'

import {
  RULE_CATEGORIES,
  emptyRuleForm,
  formModelToRulePayload,
  isSimpleRule,
  ruleSentence,
  ruleToFormModel,
  type RuleFormModel,
} from '../services/ruleBuilder'

import type { Card } from '../types/card'

type RulesTab = 'dashboard' | 'creator' | 'team'

const auth = useAuthStore()
const gameData = useGameDataStore()
const rulesData = useRulesDataStore()

const route = useRoute()
const router = useRouter()

const categories = [
  'Chakra',
  'Invocation',
  'IQ',
  'Ninjutsu',
  'Genjutsu',
  'Taijutsu',
  'Avatar',
  'Body',
  'Fûinjutsu',
  'Senjutsu',
  'Kenjutsu',
  'Clan',
  'Vitesse',
  'Kekkei Genkai',
  'Kekkei Mōra',
]

const sections = [
  {
    id: 'general',
    title: 'Général',
    text: 'Construis un shinobi en choisissant une carte par catégorie. Les cartes tirées et leurs compatibilités déterminent les possibilités de ton build et la victoire.',
  },
  {
    id: 'categories',
    title: 'Catégories',
    text: 'Chaque emplacement conserve son rôle. Le Clan fournit des permissions et bonus, tandis que les autres emplacements portent les statistiques et techniques correspondantes.',
  },
  {
    id: 'ninjutsu',
    title: 'Ninjutsu',
    text: 'Le Ninjutsu est évalué par une attaque et une défense distinctes. Les règles existantes peuvent modifier ces deux valeurs selon le build et l’adversaire.',
  },
  {
    id: 'clans',
    title: 'Clans',
    text: 'Les permissions et bonus de clan sont appliqués par les règles du moteur. Ils peuvent autoriser certaines compatibilités, notamment autour du Sharingan et du Rinnegan.',
  },
  {
    id: 'avatars',
    title: 'Avatars',
    text: 'Les avatars sont vérifiés selon leurs compatibilités et leurs conditions. Les effets propres aux Bijû et les contraintes du Jûbi restent ceux du moteur actuel.',
  },
  {
    id: 'genkai',
    title: 'Kekkei Genkai',
    text: 'Les capacités Kekkei Genkai sont prises en compte dans le build et dans les permissions existantes, sans transformer le Clan en statistique numérique.',
  },
  {
    id: 'mora',
    title: 'Kekkei Mōra',
    text: 'Les capacités Kekkei Mōra et leurs interactions sont traitées par les règles dédiées du moteur, y compris les conditions particulières déjà définies.',
  },
  {
    id: 'bonus',
    title: 'Bonus / Malus',
    text: 'Les bonus et malus du combat sont appliqués une seule fois par le moteur. Ils peuvent être proportionnels ou en points selon la règle concernée.',
  },
  {
    id: 'conditions',
    title: 'Conditions spéciales',
    text: 'Les conditions liées aux cartes, aux permissions, aux valeurs parfaites et à l’adversaire produisent les validations ou effets prévus par les règles existantes.',
  },
  {
    id: 'combat',
    title: 'Combat',
    text: 'Le moteur calcule les statistiques de base, applique les règles, additionne le score final et expose les erreurs de validation. Le score le plus élevé remporte le combat.',
  },
  {
    id: 'modes',
    title: 'Modes de jeu',
    text: 'Shinobi Area propose les parties contre l’IA, les duels 1v1 et les parties multijoueurs. Les salons sociaux utilisent les modes configurés par le serveur.',
  },
]

/* =========================================================
   ÉTAT GLOBAL
========================================================= */

const tab = ref<RulesTab>(
  route.query.tab === 'team'
    ? 'team'
    : route.query.tab === 'dashboard'
      ? 'dashboard'
      : 'creator',
)

const loading = ref(true)
const saving = ref(false)

const error = ref('')
const status = ref('')

const rules = ref<ClassicRule[]>([])
const teamRules = ref<TeamRulesPayload | null>(null)
const cards = ref<Card[]>([])

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

/* =========================================================
   ÉDITEUR RÈGLES CRÉER TON PERSO
========================================================= */

const showForm = ref(false)
const editingRuleId = ref<string | null>(null)
const showAdvanced = ref(false)

const form = ref<RuleFormModel>(emptyRuleForm())

/* =========================================================
   DASHBOARD ADMIN
========================================================= */

const overview = ref<AdminOverview | null>(null)
const users = ref<AdminUser[]>([])

const adminQuery = ref('')
const adminLoading = ref(false)
const adminError = ref('')
const adminStatus = ref('')

const pendingUserId = ref<number | null>(null)

const sortedUsers = computed(() =>
  [...users.value].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  ),
)

/* =========================================================
   NAVIGATION
========================================================= */

watch(tab, (value) => {
  if (value === 'dashboard' && !isAdmin.value) {
    tab.value = 'creator'
    return
  }

  void router.replace({
    query: {
      ...route.query,
      tab: value,
    },
  })
})

/* =========================================================
   DONNÉES POUR LES RÈGLES
========================================================= */

const nameBySlug = computed(() =>
  Object.fromEntries(
    cards.value.map((card) => [card.slug, card.name]),
  ),
)

const powerLabels = computed(
  () => cards.value[0]?.catalog?.powerCatalog ?? {},
)

const traitLabels = computed(
  () => cards.value[0]?.catalog?.physicalTraitCatalog ?? {},
)

const avatarNameById = computed(() => {
  const map: Record<string, string> = {}

  for (const card of cards.value) {
    for (const avatar of card.avatars ?? []) {
      map[avatar.id] = avatar.name
    }
  }

  return map
})

const cardOptions = computed(() =>
  (cards.value[0]?.catalog?.cardCatalog ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const clanOptions = computed(
  () => cards.value[0]?.catalog?.clanCatalog ?? [],
)

const powerOptions = computed(() =>
  Object.entries(powerLabels.value)
    .map(([id, entry]) => ({
      id,
      label: entry.label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const traitOptions = computed(() =>
  Object.entries(traitLabels.value)
    .map(([id, entry]) => ({
      id,
      label: entry.label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const avatarOptions = computed(() =>
  Object.entries(avatarNameById.value)
    .map(([id, label]) => ({
      id,
      label,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const sortedRules = computed(() =>
  rules.value
    .slice()
    .sort((a, b) => b.priority - a.priority),
)

/* =========================================================
   AFFICHAGE DES RÈGLES
========================================================= */

function sentenceFor(rule: ClassicRule) {
  return ruleSentence(rule, {
    nameBySlug: nameBySlug.value,
    powerLabels: powerLabels.value,
    traitLabels: traitLabels.value,
    avatarNameById: avatarNameById.value,
  })
}

function describeConditionsRaw(rule: ClassicRule) {
  const groups = rule.activation ?? {}

  const entries = [
    ...(groups.all ?? []).map(
      (condition) => ['Toutes', condition] as const,
    ),
    ...(groups.any ?? []).map(
      (condition) => ['Au moins une', condition] as const,
    ),
    ...(groups.none ?? []).map(
      (condition) => ['Aucune', condition] as const,
    ),
    ...(groups.anyFailure ?? []).map(
      (condition) => ['Échec', condition] as const,
    ),
  ]

  return entries.map(
    ([group, condition]) =>
      `${group} : ${condition.side}.${condition.slot} ${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`,
  )
}

function describeEffectsRaw(rule: ClassicRule) {
  return (rule.effects ?? []).map(
    (effect) =>
      `${effect.side}.${effect.slot} → ${effect.stat} ${effect.operation} ${effect.value ?? ''}`.trim(),
  )
}

/* =========================================================
   FORMULAIRE RÈGLES
========================================================= */

function openCreate() {
  if (!isAdmin.value) return

  editingRuleId.value = null
  form.value = emptyRuleForm()
  showAdvanced.value = false
  showForm.value = true
}

function openEdit(rule: ClassicRule) {
  if (!isAdmin.value) return

  editingRuleId.value = rule.id
  form.value = ruleToFormModel(rule)

  showAdvanced.value = Boolean(
    form.value.requiredPowerIds.length ||
    form.value.requiredTraitIds.length ||
    form.value.requiredClans.length ||
    form.value.requiredAvatarIds.length,
  )

  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

/* =========================================================
   CHARGEMENT RÈGLES
========================================================= */

async function refreshRules() {
  await rulesData.loadRules(
    auth.token || undefined,
    true,
  )

  rules.value = rulesData.classicRules
  teamRules.value = rulesData.teamRules
}

/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {
  if (!auth.token || !isAdmin.value) return

  adminLoading.value = true
  adminError.value = ''

  try {
    const [nextOverview, nextUsers] =
      await Promise.all([
        fetchAdminOverview(auth.token),
        fetchAdminUsers(
          auth.token,
          adminQuery.value,
        ),
      ])

    overview.value = nextOverview
    users.value = nextUsers
  } catch (exception) {
    adminError.value =
      exception instanceof Error
        ? exception.message
        : 'Impossible de charger le tableau de bord.'
  } finally {
    adminLoading.value = false
  }
}

async function refreshUsers() {
  if (!auth.token || !isAdmin.value) return

  try {
    users.value = await fetchAdminUsers(
      auth.token,
      adminQuery.value,
    )
  } catch (exception) {
    adminError.value =
      exception instanceof Error
        ? exception.message
        : 'Recherche administrateur impossible.'
  }
}

async function applyAdminAction(
  userId: number,
  action: () => Promise<AdminUser>,
  message: string,
) {
  if (!isAdmin.value) return

  pendingUserId.value = userId
  adminStatus.value = ''
  adminError.value = ''

  try {
    const updated = await action()

    users.value = users.value.map((user) =>
      user.id === updated.id
        ? updated
        : user,
    )

    if (auth.token) {
      overview.value =
        await fetchAdminOverview(auth.token)
    }

    adminStatus.value = message
  } catch (exception) {
    adminError.value =
      exception instanceof Error
        ? exception.message
        : 'Action impossible.'
  } finally {
    pendingUserId.value = null
  }
}

function toggleRole(user: AdminUser) {
  if (!auth.token || !isAdmin.value) return

  const token = auth.token

  const nextRole =
    user.role === 'ADMIN'
      ? 'USER'
      : 'ADMIN'

  void applyAdminAction(
    user.id,
    () =>
      updateAdminUserRole(
        token,
        user.id,
        nextRole,
      ),
    nextRole === 'ADMIN'
      ? `${user.displayName} est désormais administrateur.`
      : `Rôle administrateur retiré à ${user.displayName}.`,
  )
}

function toggleBlocked(user: AdminUser) {
  if (!auth.token || !isAdmin.value) return

  const token = auth.token
  const nextBlocked = !user.blocked

  void applyAdminAction(
    user.id,
    () =>
      updateAdminUserBlocked(
        token,
        user.id,
        nextBlocked,
      ),
    nextBlocked
      ? `${user.displayName} n’a plus accès au site.`
      : `${user.displayName} peut de nouveau accéder au site.`,
  )
}

/* =========================================================
   INITIALISATION
========================================================= */

onMounted(async () => {
  try {
    await auth.loadCurrentUser()

    /*
     * Sécurité :
     * un USER ne peut jamais rester sur l'onglet Dashboard,
     * même avec ?tab=dashboard dans l'URL.
     */
    if (
      route.query.tab === 'dashboard' &&
      !isAdmin.value
    ) {
      tab.value = 'creator'
    }

    /*
     * Pour un ADMIN, Dashboard devient le premier
     * onglet affiché lorsqu'aucun onglet n'est demandé.
     */
    if (
      isAdmin.value &&
      !route.query.tab
    ) {
      tab.value = 'dashboard'
    }

    /*
     * Lecture des règles :
     * USER et ADMIN ont accès aux règles.
     */
    await rulesData.loadRules(
      auth.token || undefined,
    )

    rules.value = rulesData.classicRules
    teamRules.value = rulesData.teamRules

    /*
     * Les cartes complètes servent à l'éditeur admin
     * des règles Créer ton perso.
     */
    if (isAdmin.value) {
      const [,] = await Promise.all([
        gameData.loadCards(),
        loadDashboard(),
      ])

      cards.value = gameData.cards
    }
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Chargement des règles impossible.'
  } finally {
    loading.value = false
  }
})

/* =========================================================
   ACTIONS RÈGLES CRÉER TON PERSO
========================================================= */

async function submitRule() {
  if (
    !auth.token ||
    !isAdmin.value
  ) {
    return
  }

  error.value = ''
  status.value = ''

  if (!form.value.name.trim()) {
    error.value =
      'Le nom de la règle est requis.'
    return
  }

  if (!form.value.affectedCategories.length) {
    error.value =
      'Sélectionnez au moins une catégorie affectée.'
    return
  }

  saving.value = true

  try {
    const payload =
      formModelToRulePayload(form.value)

    if (editingRuleId.value) {
      await updateClassicRule(
        auth.token,
        editingRuleId.value,
        payload,
      )
    } else {
      await createClassicRule(
        auth.token,
        payload,
      )
    }

    await refreshRules()

    status.value = 'Règle enregistrée.'
    showForm.value = false
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function toggleRule(
  rule: ClassicRule,
) {
  if (
    !auth.token ||
    !isAdmin.value
  ) {
    return
  }

  saving.value = true
  error.value = ''
  status.value = ''

  try {
    await setClassicRuleEnabled(
      auth.token,
      rule.id,
      !rule.enabled,
    )

    await refreshRules()

    status.value = !rule.enabled
      ? 'Règle activée.'
      : 'Règle désactivée.'
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Action impossible.'
  } finally {
    saving.value = false
  }
}

async function removeRule(
  rule: ClassicRule,
) {
  if (
    !auth.token ||
    !isAdmin.value
  ) {
    return
  }

  saving.value = true
  error.value = ''
  status.value = ''

  try {
    await deleteClassicRule(
      auth.token,
      rule.id,
    )

    await refreshRules()

    if (
      editingRuleId.value === rule.id
    ) {
      closeForm()
    }

    status.value =
      rule.source === 'CANONICAL'
        ? 'Règle canonique désactivée (structure conservée dans classic.json).'
        : 'Règle supprimée.'
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Suppression impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="rules-page">
    <section class="rules-shell">

      <header class="rules-header">
       

        <h1>RÈGLES</h1>
      </header>

      <!-- ================================================
           ONGLETS
      ================================================= -->

      <nav class="tabs">

        <button
          v-if="isAdmin"
          type="button"
          :class="{ active: tab === 'dashboard' }"
          @click="tab = 'dashboard'"
        >
          Dashboard
        </button>

        <button
          type="button"
          :class="{ active: tab === 'creator' }"
          @click="tab = 'creator'"
        >
          Créer ton perso
        </button>

        <button
          type="button"
          :class="{ active: tab === 'team' }"
          @click="tab = 'team'"
        >
          Créer ta team
        </button>

      </nav>

      <div
        v-if="loading"
        class="state-message"
      >
        Chargement...
      </div>

      <template v-else>

        <div
          v-if="error"
          class="state-message error"
        >
          {{ error }}
        </div>

        <div
          v-if="status"
          class="state-message"
        >
          {{ status }}
        </div>

        <!-- ================================================
             DASHBOARD ADMIN
        ================================================= -->

        <section
          v-if="tab === 'dashboard' && isAdmin"
          class="dashboard-tab"
        >

          <header class="admin-header">
            <div>
              <p class="eyebrow">
                Administration
              </p>

              <h2>Dashboard</h2>

              <p class="subtitle">
                Gestion des utilisateurs du site.
              </p>
            </div>
          </header>

          <div
            v-if="adminLoading"
            class="state-message"
          >
            Chargement du dashboard...
          </div>

          <template v-else>

            <div
              v-if="adminError"
              class="state-message error"
            >
              {{ adminError }}
            </div>

            <div
              v-if="adminStatus"
              class="state-message"
            >
              {{ adminStatus }}
            </div>

            <section class="stats-grid">

              <article class="stat-card">
                <span>Utilisateurs</span>
                <strong>
                  {{ overview?.totalUsers ?? 0 }}
                </strong>
              </article>

              <article class="stat-card">
                <span>Administrateurs</span>
                <strong>
                  {{ overview?.totalAdmins ?? 0 }}
                </strong>
              </article>

              <article class="stat-card">
                <span>Comptes bloqués</span>
                <strong>
                  {{ overview?.totalBlocked ?? 0 }}
                </strong>
              </article>

            </section>

            <section class="panel admin-tools">

              <h2>Utilisateurs</h2>

              <input
                v-model="adminQuery"
                class="auth-input"
                type="search"
                placeholder="Rechercher par pseudo ou email"
                @input="refreshUsers"
              />

              <div class="user-list">

                <article
                  v-for="user in sortedUsers"
                  :key="user.id"
                  class="user-row"
                  :class="{ blocked: user.blocked }"
                >

                  <div class="meta">
                    <strong>
                      {{ user.displayName }}
                    </strong>

                    <small>
                      {{ user.email }}
                    </small>
                  </div>

                  <div class="badges">

                    <span
                      class="badge"
                      :class="
                        user.role === 'ADMIN'
                          ? 'admin'
                          : 'user'
                      "
                    >
                      {{ user.role }}
                    </span>

                    <span
                      class="badge"
                      :class="
                        user.blocked
                          ? 'danger'
                          : 'ok'
                      "
                    >
                      {{
                        user.blocked
                          ? 'BLOQUÉ'
                          : 'ACTIF'
                      }}
                    </span>

                  </div>

                  <div class="actions">

                    <button
                      type="button"
                      :disabled="
                        pendingUserId === user.id
                      "
                      @click="toggleRole(user)"
                    >
                      {{
                        user.role === 'ADMIN'
                          ? 'RETIRER ADMIN'
                          : 'RENDRE ADMIN'
                      }}
                    </button>

                    <button
                      type="button"
                      class="secondary"
                      :disabled="
                        pendingUserId === user.id
                      "
                      @click="toggleBlocked(user)"
                    >
                      {{
                        user.blocked
                          ? 'DÉBLOQUER'
                          : 'BLOQUER'
                      }}
                    </button>

                  </div>

                </article>

              </div>

            </section>

          </template>

        </section>

        <!-- ================================================
             CRÉER TON PERSO
        ================================================= -->

        <section
          v-else-if="tab === 'creator'"
        >

          <article class="rules-content">

            <section
              v-for="(section, index) in sections"
              :id="section.id"
              :key="section.id"
              class="rule-section"
            >

              <p class="eyebrow">
                {{
                  String(index + 1)
                    .padStart(2, '0')
                }}
              </p>

              <h2>
                {{ section.title }}
              </h2>

              <p>
                {{ section.text }}
              </p>

              <div
                v-if="
                  section.id === 'categories'
                "
                class="category-list"
              >
                <span
                  v-for="category in categories"
                  :key="category"
                >
                  {{ category }}
                </span>
              </div>

            </section>

          </article>

          <section
            class="panel rules-list-panel"
          >

            <header class="panel-header">

              <h2>
                Règles enregistrées
              </h2>

              <button
                v-if="isAdmin"
                type="button"
                @click="openCreate"
              >
                NOUVELLE RÈGLE
              </button>

            </header>

            <article
              v-for="rule in sortedRules"
              :key="rule.id"
              class="rule-card"
              :class="{
                inactive: !rule.enabled,
              }"
            >

              <div class="rule-body">

                <p
                  v-if="isSimpleRule(rule)"
                  class="rule-sentence"
                >
                  {{ sentenceFor(rule) }}
                </p>

                <template v-else>

                  <p
                    class="rule-sentence advanced"
                  >
                    <strong>
                      Règle avancée
                    </strong>

                    —
                    {{ rule.name }}
                  </p>

                  <p
                    v-if="rule.notes?.length"
                    class="rule-sentence-human"
                  >
                    {{ rule.notes[0] }}
                  </p>

                  <ul class="raw-list">

                    <li
                      v-for="line in describeConditionsRaw(rule)"
                      :key="line"
                    >
                      {{ line }}
                    </li>

                    <li
                      v-for="line in describeEffectsRaw(rule)"
                      :key="line"
                    >
                      {{ line }}
                    </li>

                  </ul>

                </template>

                <small>
                  {{
                    rule.enabled
                      ? 'Active'
                      : 'Inactive'
                  }}
                  · priorité
                  {{ rule.priority }}
                </small>

              </div>

              <div
                v-if="isAdmin"
                class="rule-actions"
              >

                <button
                  v-if="isSimpleRule(rule)"
                  type="button"
                  class="secondary"
                  :disabled="saving"
                  @click="openEdit(rule)"
                >
                  MODIFIER
                </button>

                <button
                  type="button"
                  class="secondary"
                  :disabled="saving"
                  @click="toggleRule(rule)"
                >
                  {{
                    rule.enabled
                      ? 'DÉSACTIVER'
                      : 'ACTIVER'
                  }}
                </button>

                <button
                  type="button"
                  class="danger"
                  :disabled="saving"
                  @click="removeRule(rule)"
                >
                  SUPPRIMER
                </button>

              </div>

            </article>

          </section>

        </section>

        <!-- ================================================
             CRÉER TA TEAM
        ================================================= -->

        <section
          v-else-if="
            tab === 'team' &&
            teamRules
          "
          class="panel team-doc"
        >

          <header class="panel-header">
            <div>
              <p class="eyebrow">
                Team Combat
              </p>

              <h2>
                Règles Créer ta team
              </h2>
            </div>
          </header>

          <dl>

            <div>
              <dt>Équipes</dt>

              <dd>
                {{
                  teamRules.settings
                    .defaultTeamSizes
                }}
                cartes par équipe selon la
                configuration serveur.
              </dd>
            </div>

            <div>
              <dt>Budget</dt>

              <dd>
                {{
                  teamRules.settings
                    .defaultInitialBudget
                }}
                points au départ.
              </dd>
            </div>

            <div>
              <dt>Enchères</dt>

              <dd>
                Ouverture à
                {{
                  teamRules.rules
                    .openingBid
                }},
                minimum
                {{
                  teamRules.rules.minBid
                }},
                pas de
                {{
                  teamRules.rules.bidUnit
                }}.
              </dd>
            </div>

            <div>
              <dt>Passer</dt>

              <dd>
                {{
                  teamRules.rules.allowPass
                    ? 'Autorisé'
                    : 'Non autorisé'
                }}

                {{
                  teamRules.rules
                    .passIsFinalForCurrentCard
                    ? ', définitif pour la carte en cours.'
                    : '.'
                }}
              </dd>
            </div>

            <div>
              <dt>All-in</dt>

              <dd>
                {{
                  teamRules.rules.allowAllIn
                    ? 'Autorisé.'
                    : 'Non autorisé.'
                }}
              </dd>
            </div>

            <div>
              <dt>Attribution</dt>

              <dd>
                La meilleure mise valide
                obtient la carte et choisit
                sa place dans une équipe
                disponible.
              </dd>
            </div>

            <div>
              <dt>Score d’équipe</dt>

              <dd>
                {{
                  teamRules.rules.scoring
                    .team.method
                }}.
                Chaque personnage utilise
                sa note Team dédiée
                (Cartes · Team Combat).
              </dd>
            </div>

            <div>
              <dt>Égalités</dt>

              <dd>
                {{
                  teamRules.rules.scoring
                    .tiebreak.method
                }}.
              </dd>
            </div>

            <div>
              <dt>IA</dt>

              <dd>
                Seuil carte forte
                {{
                  teamRules.rules.ai
                    .topCardThreshold
                }},
                seuil carte faible
                {{
                  teamRules.rules.ai
                    .weakCardThreshold
                }},
                déclenchement all-in
                {{
                  teamRules.rules.ai
                    .allInTriggerScore
                }}.
              </dd>
            </div>

          </dl>

        </section>

      </template>

    </section>

    <!-- ===================================================
         FORMULAIRE ADMIN - CRÉER TON PERSO
    ==================================================== -->

    <div
      v-if="showForm && isAdmin"
      class="rule-overlay"
      @click.self="closeForm"
    >

      <section
        class="rule-form-panel"
        role="dialog"
        aria-modal="true"
      >

        <button
          class="close-button"
          type="button"
          aria-label="Fermer"
          @click="closeForm"
        >
          ×
        </button>

        <h2>
          {{
            editingRuleId
              ? 'Modifier la règle'
              : 'Nouvelle règle'
          }}
        </h2>

        <form
          @submit.prevent="submitRule"
        >

          <label>

            <span>
              Nom de la règle
            </span>

            <input
              v-model="form.name"
              type="text"
              placeholder="Nouveau pouvoir"
              required
            />

          </label>

          <div class="field-grid">

            <label>

              <span>Type</span>

              <select v-model="form.type">
                <option value="BOOST">
                  Boost
                </option>

                <option value="NERF">
                  Nerf
                </option>
              </select>

            </label>

            <label>

              <span>Valeur</span>

              <input
                v-model.number="form.value"
                type="number"
                min="0"
                step="1"
              />

            </label>

            <label>

              <span>Unité</span>

              <select v-model="form.unit">
                <option value="PERCENT">
                  Pourcentage
                </option>

                <option value="POINTS">
                  Points
                </option>
              </select>

            </label>

            <label class="check-row">

              <input
                v-model="form.enabled"
                type="checkbox"
              />

              <span>
                Règle active
              </span>

            </label>

          </div>

          <fieldset>

            <legend>
              Catégorie(s) affectée(s)
            </legend>

            <div class="checkbox-grid">

              <label
                v-for="category in RULE_CATEGORIES"
                :key="category.value"
                class="checkbox-item"
              >

                <input
                  v-model="form.affectedCategories"
                  type="checkbox"
                  :value="category.value"
                />

                <span>
                  {{ category.label }}
                </span>

              </label>

            </div>

          </fieldset>

          <label>

            <span>
              Condition : personnage(s)
            </span>

            <select
              v-model="form.characterSlugs"
              multiple
              class="multi-select"
            >

              <option
                v-for="option in cardOptions"
                :key="option.slug"
                :value="option.slug"
              >
                {{ option.name }}
              </option>

            </select>

          </label>

          <label>

            <span>
              Condition : catégorie de placement
            </span>

            <select
              v-model="form.placementCategory"
            >

              <option value="">
                Toutes catégories
              </option>

              <option
                v-for="category in RULE_CATEGORIES"
                :key="category.value"
                :value="category.value"
              >
                {{ category.label }}
              </option>

            </select>

          </label>

          <button
            type="button"
            class="secondary advanced-toggle"
            @click="
              showAdvanced = !showAdvanced
            "
          >
            {{
              showAdvanced
                ? 'Masquer'
                : 'Afficher'
            }}
            pouvoir / trait / clan /
            avatar requis
          </button>

          <div
            v-if="showAdvanced"
            class="field-grid"
          >

            <label>

              <span>
                Pouvoir requis
              </span>

              <select
                v-model="form.requiredPowerIds"
                multiple
                class="multi-select"
              >

                <option
                  v-for="option in powerOptions"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>

              </select>

            </label>

            <label>

              <span>
                Trait physique requis
              </span>

              <select
                v-model="form.requiredTraitIds"
                multiple
                class="multi-select"
              >

                <option
                  v-for="option in traitOptions"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>

              </select>

            </label>

            <label>

              <span>
                Clan requis
              </span>

              <select
                v-model="form.requiredClans"
                multiple
                class="multi-select"
              >

                <option
                  v-for="clan in clanOptions"
                  :key="clan"
                  :value="clan"
                >
                  {{ clan }}
                </option>

              </select>

            </label>

            <label>

              <span>
                Avatar requis
              </span>

              <select
                v-model="form.requiredAvatarIds"
                multiple
                class="multi-select"
              >

                <option
                  v-for="option in avatarOptions"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>

              </select>

            </label>

          </div>

          <button
            type="submit"
            :disabled="saving"
          >
            SAUVEGARDER LA RÈGLE
          </button>

        </form>

      </section>

    </div>

  </main>
</template>

<style scoped src="./Regles.css"></style>