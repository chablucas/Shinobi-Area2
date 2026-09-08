<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SocialHeader from '../components/SocialHeader.vue'
import AdminNav from '../components/AdminNav.vue'
import { useAuthStore } from '../stores/auth'
import { fetchAdminOverview, fetchAdminUsers, updateAdminUserBlocked, updateAdminUserRole, type AdminOverview, type AdminUser } from '../services/adminApi'

const auth = useAuthStore()
const router = useRouter()
const overview = ref<AdminOverview | null>(null)
const users = ref<AdminUser[]>([])
const query = ref('')
const loading = ref(true)
const error = ref('')
const status = ref('')
const pendingUserId = ref<number | null>(null)

const sortedUsers = computed(() => [...users.value].sort((left, right) => left.displayName.localeCompare(right.displayName)))

onMounted(async () => {
  await auth.loadCurrentUser()
  if (!auth.token || auth.user?.role !== 'ADMIN') {
    await router.replace('/personnages')
    return
  }

  try {
    const [nextOverview, nextUsers] = await Promise.all([
      fetchAdminOverview(auth.token),
      fetchAdminUsers(auth.token, query.value),
    ])
    overview.value = nextOverview
    users.value = nextUsers
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Impossible de charger le tableau de bord.'
  } finally {
    loading.value = false
  }
})

async function refreshUsers() {
  if (!auth.token) return
  try {
    users.value = await fetchAdminUsers(auth.token, query.value)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Recherche administrateur impossible.'
  }
}

async function applyAction(userId: number, action: () => Promise<AdminUser>, message: string) {
  pendingUserId.value = userId
  status.value = ''
  error.value = ''
  try {
    const updated = await action()
    users.value = users.value.map((user) => (user.id === updated.id ? updated : user))
    if (auth.token) overview.value = await fetchAdminOverview(auth.token)
    status.value = message
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Action impossible.'
  } finally {
    pendingUserId.value = null
  }
}

function toggleRole(user: AdminUser) {
  if (!auth.token) return
  const token = auth.token
  const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
  void applyAction(
    user.id,
    () => updateAdminUserRole(token, user.id, nextRole),
    nextRole === 'ADMIN' ? `${user.displayName} est désormais administrateur.` : `Rôle administrateur retiré à ${user.displayName}.`,
  )
}

function toggleBlocked(user: AdminUser) {
  if (!auth.token) return
  const token = auth.token
  const nextBlocked = !user.blocked
  void applyAction(
    user.id,
    () => updateAdminUserBlocked(token, user.id, nextBlocked),
    nextBlocked ? `${user.displayName} n’a plus accès au site.` : `${user.displayName} peut de nouveau accéder au site.`,
  )
}
</script>

<template>
  <main class="admin-page">
    <SocialHeader />
    <section class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="eyebrow">Administration</p>
          <h1>Dashboard</h1>
          <p class="subtitle">Gestion des utilisateurs du site.</p>
        </div>
      </header>

      <AdminNav />

      <div v-if="loading" class="state-message">Chargement du dashboard...</div>
      <template v-else>
        <div v-if="error" class="state-message error">{{ error }}</div>
        <div v-if="status" class="state-message">{{ status }}</div>

        <section class="stats-grid">
          <article class="stat-card">
            <span>Utilisateurs</span>
            <strong>{{ overview?.totalUsers ?? 0 }}</strong>
          </article>
          <article class="stat-card">
            <span>Administrateurs</span>
            <strong>{{ overview?.totalAdmins ?? 0 }}</strong>
          </article>
          <article class="stat-card">
            <span>Comptes bloqués</span>
            <strong>{{ overview?.totalBlocked ?? 0 }}</strong>
          </article>
        </section>

        <section class="panel admin-tools">
          <h2>Utilisateurs</h2>
          <input v-model="query" class="auth-input" type="search" placeholder="Rechercher par pseudo ou email" @input="refreshUsers" />

          <div class="user-list">
            <article v-for="user in sortedUsers" :key="user.id" class="user-row" :class="{ blocked: user.blocked }">
              <div class="meta">
                <strong>{{ user.displayName }}</strong>
                <small>{{ user.email }}</small>
              </div>
              <div class="badges">
                <span class="badge" :class="user.role === 'ADMIN' ? 'admin' : 'user'">{{ user.role }}</span>
                <span class="badge" :class="user.blocked ? 'danger' : 'ok'">{{ user.blocked ? 'BLOQUÉ' : 'ACTIF' }}</span>
              </div>
              <div class="actions">
                <button type="button" :disabled="pendingUserId === user.id" @click="toggleRole(user)">
                  {{ user.role === 'ADMIN' ? 'RETIRER ADMIN' : 'RENDRE ADMIN' }}
                </button>
                <button type="button" class="secondary" :disabled="pendingUserId === user.id" @click="toggleBlocked(user)">
                  {{ user.blocked ? 'DÉBLOQUER' : 'BLOQUER' }}
                </button>
              </div>
            </article>
          </div>
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 20px 90px;
}
.admin-header {
  margin-bottom: 28px;
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
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  display: grid;
  gap: 8px;
  padding: 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
}
.stat-card span {
  color: var(--text-muted);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
}
.stat-card strong {
  font-size: clamp(2rem, 4vw, 3rem);
  color: var(--accent-gold);
}
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  padding: 18px;
}
.admin-tools h2 {
  margin-top: 0;
  color: var(--accent-orange);
}
.auth-input {
  min-height: 42px;
  width: 100%;
}
.meta {
  display: grid;
  min-width: 0;
}
.meta strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta small {
  color: var(--text-muted);
}
button {
  border: 1px solid var(--border-strong);
  background: var(--accent-orange);
  color: #241b12;
  font-weight: 700;
  min-height: 38px;
  padding: 0 16px;
}
.state-message {
  color: var(--accent-gold);
  margin-bottom: 12px;
}
.state-message.error {
  color: #ffb7b7;
}
.subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
}
.user-list {
  display: grid;
  gap: 12px;
}
.user-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--border-light);
  background: rgba(255, 255, 255, 0.02);
}
.user-row.blocked {
  border-color: #ff8383;
}
.badges {
  display: flex;
  gap: 8px;
}
.badge {
  padding: 4px 10px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid var(--border-strong);
}
.badge.admin {
  color: var(--accent-gold);
}
.badge.danger {
  color: #ffb7b7;
}
.badge.ok {
  color: #9be59b;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
button.secondary {
  background: transparent;
  color: var(--text-main);
}
button:disabled {
  opacity: 0.5;
  cursor: progress;
}
@media (max-width: 780px) {
  .user-row {
    grid-template-columns: 1fr;
  }
}
</style>
