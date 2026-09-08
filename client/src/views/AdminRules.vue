<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import AdminNav from '../components/AdminNav.vue'
import { useAuthStore } from '../stores/auth'
import {
  createClassicRule,
  deleteClassicRule,
  fetchClassicRules,
  fetchTeamRules,
  setClassicRuleEnabled,
  updateClassicRule,
  type ClassicRule,
  type TeamRulesPayload,
} from '../services/ruleAdminApi'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tab = ref<'creator' | 'team'>(route.query.tab === 'team' ? 'team' : 'creator')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const status = ref('')
const rules = ref<ClassicRule[]>([])
const teamRules = ref<TeamRulesPayload | null>(null)
const selectedRuleId = ref<string | null>(null)
const form = ref({
  id: '',
  name: '',
  enabled: true,
  phase: 'MODIFIER',
  priority: 100,
  activationJson: '{\n  "all": []\n}',
  effectsJson: '[\n  {\n    "side": "SELF",\n    "slot": "chakra",\n    "stat": "chakra",\n    "operation": "POINT_ADD",\n    "value": 0\n  }\n]',
  notesJson: '[]',
})

const selectedRule = computed(() => rules.value.find((rule) => rule.id === selectedRuleId.value) ?? null)

watch(tab, (value) => {
  void router.replace({ query: { ...route.query, tab: value } })
})

function formatJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2)
}

function describeConditions(rule: ClassicRule) {
  const groups = rule.activation ?? {}
  const entries = [
    ...(groups.all ?? []).map((condition) => ['Toutes', condition] as const),
    ...(groups.any ?? []).map((condition) => ['Au moins une', condition] as const),
    ...(groups.none ?? []).map((condition) => ['Aucune', condition] as const),
    ...(groups.anyFailure ?? []).map((condition) => ['Échec', condition] as const),
  ]
  return entries.map(([group, condition]) => `${group}: ${condition.side}.${condition.slot} ${condition.field} ${condition.operator} ${formatJson(condition.value)}`)
}

function describeEffects(rule: ClassicRule) {
  return (rule.effects ?? []).map((effect) => `${effect.side}.${effect.slot} -> ${effect.stat} ${effect.operation} ${effect.value ?? ''}`.trim())
}

function resetForm() {
  selectedRuleId.value = null
  form.value = {
    id: '',
    name: '',
    enabled: true,
    phase: 'MODIFIER',
    priority: 100,
    activationJson: '{\n  "all": []\n}',
    effectsJson: '[\n  {\n    "side": "SELF",\n    "slot": "chakra",\n    "stat": "chakra",\n    "operation": "POINT_ADD",\n    "value": 0\n  }\n]',
    notesJson: '[]',
  }
}

function editRule(rule: ClassicRule) {
  selectedRuleId.value = rule.id
  form.value = {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    phase: rule.phase,
    priority: rule.priority,
    activationJson: formatJson(rule.activation),
    effectsJson: formatJson(rule.effects),
    notesJson: formatJson(rule.notes ?? []),
  }
}

async function loadRules() {
  if (!auth.token) return
  const [classic, team] = await Promise.all([fetchClassicRules(auth.token), fetchTeamRules(auth.token)])
  rules.value = classic
  teamRules.value = team
}

onMounted(async () => {
  await auth.loadCurrentUser()
  if (!auth.token || auth.user?.role !== 'ADMIN') {
    await router.replace('/personnages')
    return
  }
  try {
    await loadRules()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Chargement des règles impossible.'
  } finally {
    loading.value = false
  }
})

async function submitRule() {
  if (!auth.token) return
  saving.value = true
  status.value = ''
  error.value = ''
  try {
    const payload = {
      id: form.value.id.trim() || undefined,
      name: form.value.name.trim(),
      enabled: form.value.enabled,
      phase: form.value.phase,
      priority: Number(form.value.priority),
      activation: JSON.parse(form.value.activationJson),
      effects: JSON.parse(form.value.effectsJson),
      notes: JSON.parse(form.value.notesJson),
    }
    if (!payload.name) throw new Error('Le nom de la règle est requis.')
    const saved = selectedRuleId.value
      ? await updateClassicRule(auth.token, selectedRuleId.value, payload)
      : await createClassicRule(auth.token, payload)
    rules.value = await fetchClassicRules(auth.token)
    editRule(saved)
    status.value = 'Règle enregistrée.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function toggleRule(rule: ClassicRule) {
  if (!auth.token) return
  saving.value = true
  error.value = ''
  status.value = ''
  try {
    await setClassicRuleEnabled(auth.token, rule.id, !rule.enabled)
    rules.value = await fetchClassicRules(auth.token)
    status.value = !rule.enabled ? 'Règle activée.' : 'Règle désactivée.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Action impossible.'
  } finally {
    saving.value = false
  }
}

async function removeRule(rule: ClassicRule) {
  if (!auth.token) return
  saving.value = true
  error.value = ''
  status.value = ''
  try {
    await deleteClassicRule(auth.token, rule.id)
    rules.value = await fetchClassicRules(auth.token)
    if (selectedRuleId.value === rule.id) resetForm()
    status.value = rule.source === 'CANONICAL' ? 'Règle canonique désactivée.' : 'Règle supprimée.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Suppression impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="admin-page">
    <SocialHeader />
    <section class="admin-shell">
      <header class="admin-header">
        <p class="eyebrow">Administration</p>
        <h1>Règles</h1>
      </header>

      <AdminNav />

      <nav class="tabs">
        <button type="button" :class="{ active: tab === 'creator' }" @click="tab = 'creator'">Créer ton perso</button>
        <button type="button" :class="{ active: tab === 'team' }" @click="tab = 'team'">Team</button>
      </nav>

      <div v-if="loading" class="state-message">Chargement des règles...</div>
      <template v-else>
        <div v-if="error" class="state-message error">{{ error }}</div>
        <div v-if="status" class="state-message">{{ status }}</div>

        <section v-if="tab === 'creator'" class="rules-layout">
          <div class="panel rule-list">
            <header class="panel-header">
              <h2>Règles « Créer ton perso »</h2>
              <button type="button" class="secondary" @click="resetForm">NOUVELLE RÈGLE</button>
            </header>

            <article v-for="rule in rules" :key="rule.id" class="rule-row" :class="{ inactive: !rule.enabled }">
              <div class="rule-main">
                <div class="rule-title">
                  <strong>{{ rule.name }}</strong>
                  <span class="badge" :class="rule.enabled ? 'ok' : 'danger'">{{ rule.enabled ? 'ACTIF' : 'INACTIF' }}</span>
                </div>
                <small>{{ rule.id }} · {{ rule.phase }} · priorité {{ rule.priority }} · {{ rule.source }}</small>
                <p v-if="rule.notes?.length">{{ rule.notes.join(' ') }}</p>
                <ul>
                  <li v-for="condition in describeConditions(rule)" :key="condition">Condition: {{ condition }}</li>
                  <li v-for="effect in describeEffects(rule)" :key="effect">Effet: {{ effect }}</li>
                </ul>
              </div>
              <div class="row-actions">
                <button type="button" class="secondary" :disabled="saving" @click="editRule(rule)">MODIFIER</button>
                <button type="button" class="secondary" :disabled="saving" @click="toggleRule(rule)">{{ rule.enabled ? 'DÉSACTIVER' : 'ACTIVER' }}</button>
                <button type="button" class="danger-button" :disabled="saving" @click="removeRule(rule)">SUPPRIMER</button>
              </div>
            </article>
          </div>

          <form class="panel rule-form" @submit.prevent="submitRule">
            <h2>{{ selectedRule ? 'Modifier une règle' : 'Ajouter une règle' }}</h2>
            <label>
              <span>Identifiant stable</span>
              <input v-model="form.id" type="text" :readonly="!!selectedRule" placeholder="AUTO_DEPUIS_LE_NOM" />
            </label>
            <label>
              <span>Nom</span>
              <input v-model="form.name" type="text" required />
            </label>
            <div class="form-grid">
              <label>
                <span>Phase</span>
                <select v-model="form.phase">
                  <option value="VALIDATION_PENALTY">VALIDATION_PENALTY</option>
                  <option value="MODIFIER">MODIFIER</option>
                </select>
              </label>
              <label>
                <span>Priorité</span>
                <input v-model.number="form.priority" type="number" step="1" />
              </label>
              <label class="check-row">
                <input v-model="form.enabled" type="checkbox" />
                <span>Règle active</span>
              </label>
            </div>
            <label>
              <span>Condition / activation</span>
              <textarea v-model="form.activationJson" rows="10" spellcheck="false" />
            </label>
            <label>
              <span>Effets</span>
              <textarea v-model="form.effectsJson" rows="10" spellcheck="false" />
            </label>
            <label>
              <span>Notes</span>
              <textarea v-model="form.notesJson" rows="4" spellcheck="false" />
            </label>
            <button type="submit" :disabled="saving">SAUVEGARDER LA RÈGLE</button>
          </form>
        </section>

        <section v-else-if="teamRules" class="panel team-doc">
          <h2>Règles Team / Team Auction</h2>
          <dl>
            <div>
              <dt>Équipes</dt>
              <dd>{{ teamRules.settings.defaultTeamSizes }} cartes par équipe selon la configuration serveur.</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{{ teamRules.settings.defaultInitialBudget }} points au départ.</dd>
            </div>
            <div>
              <dt>Enchères</dt>
              <dd>Ouverture à {{ teamRules.rules.openingBid }}, minimum {{ teamRules.rules.minBid }}, pas de {{ teamRules.rules.bidUnit }}.</dd>
            </div>
            <div>
              <dt>Passer</dt>
              <dd>{{ teamRules.rules.allowPass ? 'Autorisé' : 'Non autorisé' }}{{ teamRules.rules.passIsFinalForCurrentCard ? ', définitif pour la carte en cours.' : '.' }}</dd>
            </div>
            <div>
              <dt>All-in</dt>
              <dd>{{ teamRules.rules.allowAllIn ? 'Autorisé.' : 'Non autorisé.' }}</dd>
            </div>
            <div>
              <dt>Attribution</dt>
              <dd>La meilleure mise valide obtient la carte et choisit sa place dans une équipe disponible.</dd>
            </div>
            <div>
              <dt>Score d’équipe</dt>
              <dd>{{ teamRules.rules.scoring.team.method }}. Chaque personnage utilise sa note Team dédiée.</dd>
            </div>
            <div>
              <dt>Égalités</dt>
              <dd>{{ teamRules.rules.scoring.tiebreak.method }}.</dd>
            </div>
            <div>
              <dt>IA</dt>
              <dd>Seuil carte forte {{ teamRules.rules.ai.topCardThreshold }}, seuil carte faible {{ teamRules.rules.ai.weakCardThreshold }}, déclenchement all-in {{ teamRules.rules.ai.allInTriggerScore }}.</dd>
            </div>
          </dl>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-main);
}
.admin-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 48px 20px 90px;
}
.admin-header h1 {
  margin: 8px 0 0;
  font-size: clamp(2.2rem, 5vw, 4rem);
  color: var(--accent-orange);
}
.eyebrow {
  margin: 0;
  color: var(--accent-gold);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.tabs button,
button {
  border: 1px solid var(--border-strong);
  background: var(--accent-orange);
  color: #241b12;
  font-weight: 700;
  min-height: 38px;
  padding: 0 16px;
  cursor: pointer;
}
.tabs button {
  background: transparent;
  color: var(--text-main);
}
.tabs button.active {
  background: var(--accent-gold);
  color: #241b12;
}
button.secondary {
  background: transparent;
  color: var(--text-main);
}
button.danger-button {
  background: #8f2b2b;
  color: #fff5f5;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  padding: 18px;
}
.panel h2 {
  margin-top: 0;
  color: var(--accent-orange);
}
.rules-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
  gap: 18px;
  align-items: start;
}
.panel-header,
.rule-title,
.row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.panel-header {
  justify-content: space-between;
}
.rule-list {
  display: grid;
  gap: 12px;
}
.rule-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.02);
}
.rule-row.inactive {
  opacity: 0.72;
}
.rule-main small,
.rule-main p,
.rule-main li,
.team-doc dd {
  color: var(--text-muted);
}
.rule-main ul {
  margin: 10px 0 0;
  padding-left: 18px;
}
.badge {
  border: 1px solid var(--border-light);
  padding: 3px 8px;
  font-size: 0.7rem;
  font-weight: 700;
}
.badge.ok {
  color: #9be59b;
}
.badge.danger {
  color: #ffb7b7;
}
.rule-form {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 12px;
}
label {
  display: grid;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.82rem;
}
input,
select,
textarea {
  width: 100%;
  background: var(--bg-panel-strong);
  color: var(--text-main);
  border: 1px solid var(--border-light);
  padding: 9px 10px;
  font: inherit;
}
textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  resize: vertical;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 12px;
}
.check-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
}
.check-row input {
  width: auto;
}
.team-doc dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin: 0;
}
.team-doc dt {
  color: var(--accent-gold);
  font-weight: 700;
  margin-bottom: 4px;
}
.team-doc dd {
  margin: 0;
}
.state-message {
  color: var(--accent-gold);
  margin-bottom: 12px;
}
.state-message.error {
  color: #ffb7b7;
}
@media (max-width: 920px) {
  .rules-layout,
  .rule-row {
    grid-template-columns: 1fr;
  }
  .rule-form {
    position: static;
  }
}
</style>