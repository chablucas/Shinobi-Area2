<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import { useAuthStore } from '../stores/auth'
import { fetchAllCards } from '../services/cardApi'
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

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const categories = ['Chakra', 'Invocation', 'IQ', 'Ninjutsu', 'Genjutsu', 'Taijutsu', 'Avatar', 'Body', 'Fûinjutsu', 'Senjutsu', 'Kenjutsu', 'Clan', 'Vitesse', 'Kekkei Genkai', 'Kekkei Mōra']
const sections = [
  { id: 'general', title: 'Général', text: 'Construis un shinobi en choisissant une carte par catégorie. Les cartes tirées et leurs compatibilités déterminent les possibilités de ton build et la victoire.' },
  { id: 'categories', title: 'Catégories', text: 'Chaque emplacement conserve son rôle. Le Clan fournit des permissions et bonus, tandis que les autres emplacements portent les statistiques et techniques correspondantes.' },
  { id: 'ninjutsu', title: 'Ninjutsu', text: 'Le Ninjutsu est évalué par une attaque et une défense distinctes. Les règles existantes peuvent modifier ces deux valeurs selon le build et l’adversaire.' },
  { id: 'clans', title: 'Clans', text: 'Les permissions et bonus de clan sont appliqués par les règles du moteur. Ils peuvent autoriser certaines compatibilités, notamment autour du Sharingan et du Rinnegan.' },
  { id: 'avatars', title: 'Avatars', text: 'Les avatars sont vérifiés selon leurs compatibilités et leurs conditions. Les effets propres aux Bijû et les contraintes du Jûbi restent ceux du moteur actuel.' },
  { id: 'genkai', title: 'Kekkei Genkai', text: 'Les capacités Kekkei Genkai sont prises en compte dans le build et dans les permissions existantes, sans transformer le Clan en statistique numérique.' },
  { id: 'mora', title: 'Kekkei Mōra', text: 'Les capacités Kekkei Mōra et leurs interactions sont traitées par les règles dédiées du moteur, y compris les conditions particulières déjà définies.' },
  { id: 'bonus', title: 'Bonus / Malus', text: 'Les bonus et malus du combat sont appliqués une seule fois par le moteur. Ils peuvent être proportionnels ou en points selon la règle concernée.' },
  { id: 'conditions', title: 'Conditions spéciales', text: 'Les conditions liées aux cartes, aux permissions, aux valeurs parfaites et à l’adversaire produisent les validations ou effets prévus par les règles existantes.' },
  { id: 'combat', title: 'Combat', text: 'Le moteur calcule les statistiques de base, applique les règles, additionne le score final et expose les erreurs de validation. Le score le plus élevé remporte le combat.' },
  { id: 'modes', title: 'Modes de jeu', text: 'Shinobi Area propose les parties contre l’IA, les duels 1v1 et les parties 1v1v1. Les salons sociaux utilisent les modes configurés par le serveur.' },
]

const tab = ref<'creator' | 'team'>(route.query.tab === 'team' ? 'team' : 'creator')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const status = ref('')
const rules = ref<ClassicRule[]>([])
const teamRules = ref<TeamRulesPayload | null>(null)
const cards = ref<Card[]>([])
const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const showForm = ref(false)
const editingRuleId = ref<string | null>(null)
const showAdvanced = ref(false)
const form = ref<RuleFormModel>(emptyRuleForm())

watch(tab, (value) => {
  void router.replace({ query: { ...route.query, tab: value } })
})

const nameBySlug = computed(() => Object.fromEntries(cards.value.map((card) => [card.slug, card.name])))
const powerLabels = computed(() => cards.value[0]?.catalog?.powerCatalog ?? {})
const traitLabels = computed(() => cards.value[0]?.catalog?.physicalTraitCatalog ?? {})
const avatarNameById = computed(() => {
  const map: Record<string, string> = {}
  for (const card of cards.value) for (const avatar of card.avatars ?? []) map[avatar.id] = avatar.name
  return map
})
const cardOptions = computed(() => (cards.value[0]?.catalog?.cardCatalog ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)))
const clanOptions = computed(() => cards.value[0]?.catalog?.clanCatalog ?? [])
const powerOptions = computed(() => Object.entries(powerLabels.value).map(([id, entry]) => ({ id, label: entry.label })).sort((a, b) => a.label.localeCompare(b.label)))
const traitOptions = computed(() => Object.entries(traitLabels.value).map(([id, entry]) => ({ id, label: entry.label })).sort((a, b) => a.label.localeCompare(b.label)))
const avatarOptions = computed(() => Object.entries(avatarNameById.value).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label)))
const sortedRules = computed(() => rules.value.slice().sort((a, b) => b.priority - a.priority))

function sentenceFor(rule: ClassicRule) {
  return ruleSentence(rule, { nameBySlug: nameBySlug.value, powerLabels: powerLabels.value, traitLabels: traitLabels.value, avatarNameById: avatarNameById.value })
}

function describeConditionsRaw(rule: ClassicRule) {
  const groups = rule.activation ?? {}
  const entries = [
    ...(groups.all ?? []).map((condition) => ['Toutes', condition] as const),
    ...(groups.any ?? []).map((condition) => ['Au moins une', condition] as const),
    ...(groups.none ?? []).map((condition) => ['Aucune', condition] as const),
    ...(groups.anyFailure ?? []).map((condition) => ['Échec', condition] as const),
  ]
  return entries.map(([group, condition]) => `${group} : ${condition.side}.${condition.slot} ${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`)
}
function describeEffectsRaw(rule: ClassicRule) {
  return (rule.effects ?? []).map((effect) => `${effect.side}.${effect.slot} → ${effect.stat} ${effect.operation} ${effect.value ?? ''}`.trim())
}

function openCreate() {
  editingRuleId.value = null
  form.value = emptyRuleForm()
  showAdvanced.value = false
  showForm.value = true
}
function openEdit(rule: ClassicRule) {
  editingRuleId.value = rule.id
  form.value = ruleToFormModel(rule)
  showAdvanced.value = Boolean(form.value.requiredPowerIds.length || form.value.requiredTraitIds.length || form.value.requiredClans.length || form.value.requiredAvatarIds.length)
  showForm.value = true
}
function closeForm() {
  showForm.value = false
}

async function loadAll() {
  const [classic, team, allCards] = await Promise.all([fetchClassicRules(auth.token || undefined), fetchTeamRules(auth.token || undefined), fetchAllCards()])
  rules.value = classic
  teamRules.value = team
  cards.value = allCards
}

onMounted(async () => {
  try {
    await auth.loadCurrentUser()
    await loadAll()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Chargement des règles impossible.'
  } finally {
    loading.value = false
  }
})

async function submitRule() {
  if (!auth.token) return
  error.value = ''
  status.value = ''
  if (!form.value.name.trim()) { error.value = 'Le nom de la règle est requis.'; return }
  if (!form.value.affectedCategories.length) { error.value = 'Sélectionnez au moins une catégorie affectée.'; return }
  saving.value = true
  try {
    const payload = formModelToRulePayload(form.value)
    if (editingRuleId.value) await updateClassicRule(auth.token, editingRuleId.value, payload)
    else await createClassicRule(auth.token, payload)
    rules.value = await fetchClassicRules(auth.token)
    status.value = 'Règle enregistrée.'
    showForm.value = false
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
    if (editingRuleId.value === rule.id) closeForm()
    status.value = rule.source === 'CANONICAL' ? 'Règle canonique désactivée (structure conservée dans classic.json).' : 'Règle supprimée.'
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Suppression impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="rules-page">
    <SocialHeader />
    <section class="rules-shell">
      <header class="rules-header">
        <p class="eyebrow">Manuel de l’arène</p>
        <h1>RÈGLES</h1>
      </header>

      <nav class="tabs">
        <button type="button" :class="{ active: tab === 'creator' }" @click="tab = 'creator'">Créer ton perso</button>
        <button type="button" :class="{ active: tab === 'team' }" @click="tab = 'team'">Team</button>
      </nav>

      <div v-if="loading" class="state-message">Chargement des règles...</div>
      <template v-else>
        <div v-if="error" class="state-message error">{{ error }}</div>
        <div v-if="status" class="state-message">{{ status }}</div>

        <section v-if="tab === 'creator'">
          <article class="rules-content">
            <section v-for="(section, index) in sections" :id="section.id" :key="section.id" class="rule-section">
              <p class="eyebrow">{{ String(index + 1).padStart(2, '0') }}</p>
              <h2>{{ section.title }}</h2>
              <p>{{ section.text }}</p>
              <div v-if="section.id === 'categories'" class="category-list">
                <span v-for="category in categories" :key="category">{{ category }}</span>
              </div>
            </section>
          </article>

          <section class="panel rules-list-panel">
            <header class="panel-header">
              <h2>Règles enregistrées</h2>
              <button v-if="isAdmin" type="button" @click="openCreate">NOUVELLE RÈGLE</button>
            </header>

            <article v-for="rule in sortedRules" :key="rule.id" class="rule-card" :class="{ inactive: !rule.enabled }">
              <div class="rule-body">
                <p v-if="isSimpleRule(rule)" class="rule-sentence">{{ sentenceFor(rule) }}</p>
                <template v-else>
                  <p class="rule-sentence advanced">
                    <strong>Règle avancée</strong> — {{ rule.name }}
                  </p>
                  <ul class="raw-list">
                    <li v-for="line in describeConditionsRaw(rule)" :key="line">{{ line }}</li>
                    <li v-for="line in describeEffectsRaw(rule)" :key="line">{{ line }}</li>
                  </ul>
                </template>
                <small>{{ rule.enabled ? 'Active' : 'Inactive' }} · priorité {{ rule.priority }}</small>
              </div>
              <div v-if="isAdmin" class="rule-actions">
                <button v-if="isSimpleRule(rule)" type="button" class="secondary" :disabled="saving" @click="openEdit(rule)">MODIFIER</button>
                <button type="button" class="secondary" :disabled="saving" @click="toggleRule(rule)">{{ rule.enabled ? 'DÉSACTIVER' : 'ACTIVER' }}</button>
                <button type="button" class="danger" :disabled="saving" @click="removeRule(rule)">SUPPRIMER</button>
              </div>
            </article>
          </section>
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
              <dd>{{ teamRules.rules.scoring.team.method }}. Chaque personnage utilise sa note Team dédiée (Cartes · Team Combat).</dd>
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

    <div v-if="showForm" class="rule-overlay" @click.self="closeForm">
      <section class="rule-form-panel" role="dialog" aria-modal="true">
        <button class="close-button" type="button" aria-label="Fermer" @click="closeForm">×</button>
        <h2>{{ editingRuleId ? 'Modifier la règle' : 'Nouvelle règle' }}</h2>
        <form @submit.prevent="submitRule">
          <label>
            <span>Nom de la règle</span>
            <input v-model="form.name" type="text" placeholder="Nouveau pouvoir" required />
          </label>

          <div class="field-grid">
            <label>
              <span>Type</span>
              <select v-model="form.type">
                <option value="BOOST">Boost</option>
                <option value="NERF">Nerf</option>
              </select>
            </label>
            <label>
              <span>Valeur</span>
              <input v-model.number="form.value" type="number" min="0" step="1" />
            </label>
            <label>
              <span>Unité</span>
              <select v-model="form.unit">
                <option value="PERCENT">Pourcentage</option>
                <option value="POINTS">Points</option>
              </select>
            </label>
            <label class="check-row">
              <input v-model="form.enabled" type="checkbox" />
              <span>Règle active</span>
            </label>
          </div>

          <fieldset>
            <legend>Catégorie(s) affectée(s)</legend>
            <div class="checkbox-grid">
              <label v-for="category in RULE_CATEGORIES" :key="category.value" class="checkbox-item">
                <input v-model="form.affectedCategories" type="checkbox" :value="category.value" />
                <span>{{ category.label }}</span>
              </label>
            </div>
          </fieldset>

          <label>
            <span>Condition : personnage(s)</span>
            <select v-model="form.characterSlugs" multiple class="multi-select">
              <option v-for="option in cardOptions" :key="option.slug" :value="option.slug">{{ option.name }}</option>
            </select>
          </label>

          <label>
            <span>Condition : catégorie de placement</span>
            <select v-model="form.placementCategory">
              <option value="">Toutes catégories</option>
              <option v-for="category in RULE_CATEGORIES" :key="category.value" :value="category.value">{{ category.label }}</option>
            </select>
          </label>

          <button type="button" class="secondary advanced-toggle" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? 'Masquer' : 'Afficher' }} pouvoir / trait / clan / avatar requis
          </button>

          <div v-if="showAdvanced" class="field-grid">
            <label>
              <span>Pouvoir requis</span>
              <select v-model="form.requiredPowerIds" multiple class="multi-select">
                <option v-for="option in powerOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
            </label>
            <label>
              <span>Trait physique requis</span>
              <select v-model="form.requiredTraitIds" multiple class="multi-select">
                <option v-for="option in traitOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
            </label>
            <label>
              <span>Clan requis</span>
              <select v-model="form.requiredClans" multiple class="multi-select">
                <option v-for="clan in clanOptions" :key="clan" :value="clan">{{ clan }}</option>
              </select>
            </label>
            <label>
              <span>Avatar requis</span>
              <select v-model="form.requiredAvatarIds" multiple class="multi-select">
                <option v-for="option in avatarOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
              </select>
            </label>
          </div>

          <button type="submit" :disabled="saving">SAUVEGARDER LA RÈGLE</button>
        </form>
      </section>
    </div>
  </main>
</template>

<style scoped>
.rules-page {
  min-height: 100vh;
  background: var(--bg-main);
}
.rules-shell {
  max-width: 1100px;
  margin: 0 auto;
  padding: 64px 20px 100px;
}
.rules-header h1 {
  margin: 10px 0 24px;
  color: var(--accent-orange);
  font-size: 3rem;
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
  margin-bottom: 24px;
}
.tabs button {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-main);
  font-weight: 700;
  min-height: 40px;
  padding: 0 18px;
  cursor: pointer;
}
.tabs button.active {
  background: var(--accent-gold);
  color: #241b12;
}
.state-message {
  color: var(--accent-gold);
  margin-bottom: 12px;
}
.state-message.error {
  color: #ffb7b7;
}
.rules-content {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}
.rule-section {
  padding: 28px;
  border-left: 2px solid var(--accent-orange);
  background: var(--bg-panel);
}
.rule-section h2 {
  margin: 8px 0 12px;
  color: var(--text-main);
  font-size: 1.3rem;
}
.rule-section > p:last-of-type {
  color: var(--text-muted);
  line-height: 1.75;
  font-size: 0.78rem;
}
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 18px;
}
.category-list span {
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  color: var(--accent-gold);
  font-size: 0.62rem;
}
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  padding: 18px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.panel h2 {
  margin: 0;
  color: var(--accent-orange);
}
.rule-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.02);
  margin-top: 12px;
}
.rule-card.inactive {
  opacity: 0.7;
}
.rule-body small {
  color: var(--text-muted);
}
.rule-sentence {
  margin: 0 0 6px;
  color: var(--text-main);
  line-height: 1.5;
}
.rule-sentence.advanced strong {
  color: var(--accent-gold);
}
.raw-list {
  margin: 0 0 6px;
  padding-left: 18px;
  color: var(--text-muted);
  font-size: 0.78rem;
}
.rule-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}
button {
  border: 1px solid var(--border-strong);
  background: var(--accent-orange);
  color: #241b12;
  font-weight: 700;
  min-height: 38px;
  padding: 0 16px;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  color: var(--text-main);
}
button.danger {
  background: #8f2b2b;
  color: #fff5f5;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
  color: var(--text-muted);
}
.rule-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(10, 11, 12, 0.8);
}
.rule-form-panel {
  position: relative;
  width: min(720px, 100%);
  max-height: 92vh;
  overflow: auto;
  padding: 28px;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
}
.rule-form-panel h2 {
  margin: 8px 0 20px;
  color: var(--accent-orange);
}
.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  min-height: 32px;
}
.rule-form-panel form {
  display: grid;
  gap: 14px;
}
.rule-form-panel label {
  display: grid;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.8rem;
}
.rule-form-panel input,
.rule-form-panel select {
  min-height: 38px;
  background: var(--bg-panel-strong);
  color: var(--text-main);
  border: 1px solid var(--border-light);
  padding: 0 10px;
}
.multi-select {
  min-height: 110px;
  padding: 6px;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.check-row {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.check-row input {
  min-height: auto;
  width: auto;
}
fieldset {
  border: 1px solid var(--border-light);
  padding: 10px;
}
legend {
  color: var(--text-muted);
  font-size: 0.8rem;
  padding: 0 6px;
}
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.checkbox-item {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  color: var(--text-main);
}
.checkbox-item input {
  min-height: auto;
  width: auto;
}
.advanced-toggle {
  justify-self: start;
}
@media (max-width: 720px) {
  .rule-card {
    grid-template-columns: 1fr;
  }
  .rule-actions {
    flex-direction: row;
    align-items: center;
  }
}
</style>
