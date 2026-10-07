import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Partie from '../views/Partie.vue'
import Profil from '../views/Profil.vue'
import Connexion from '../views/Connexion.vue'
import Inscription from '../views/Inscription.vue'
import Jouer from '../views/Jouer.vue'
import ProfilPublic from '../views/ProfilPublic.vue'
import CarteDetail from '../views/CarteDetail.vue'
import Lobby from '../views/Lobby.vue'
import Personnages from '../views/Personnages.vue'
import Regles from '../views/Regles.vue'
import Simulation from '../views/Simulation.vue'
import TeamAuction from '../views/TeamAuction.vue'
import Pending from '../views/Pending.vue'
import Blocked from '../views/Blocked.vue'

import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    // Pages publiques
    {
      path: '/',
      component: Home,
      meta: { public: true },
    },

    {
      path: '/connexion',
      component: Connexion,
      meta: { public: true },
    },

    {
      path: '/inscription',
      component: Inscription,
      meta: { public: true },
    },

    // Pages spéciales liées au statut du compte
    {
      path: '/pending',
      component: Pending,
      meta: { accessPage: true },
    },

    {
      path: '/blocked',
      component: Blocked,
      meta: { accessPage: true },
    },

    // Jeu
    {
      path: '/partie',
      component: Partie,
      props: { mode: 'local2' },
    },

    {
      name: 'partie-lobby',
      path: '/partie/:lobbyId',
      component: Partie,
      props: (route) => ({
        lobbyId: String(route.params.lobbyId),

        mode:
          route.query.mode === '1v1v1v1'
            ? 'local4'
            : route.query.mode === '1v1v1'
              ? 'local3'
              : 'local2',
      }),
    },

    {
      path: '/4-joueurs',
      component: Partie,
      props: { mode: 'local4' },
    },

    {
      path: '/solo',
      component: Partie,
      props: { mode: 'solo' },
    },

    {
      path: '/2-joueurs',
      redirect: '/partie',
    },

    {
      path: '/3-joueurs',
      component: Partie,
      props: { mode: 'local3' },
    },

    {
      path: '/profil',
      component: Profil,
    },

    {
      path: '/jouer',
      component: Jouer,
    },

    {
      path: '/profil-public/:id',
      component: ProfilPublic,
    },

    {
      path: '/cartes/:slug',
      component: CarteDetail,
    },

    {
      path: '/lobby/:id',
      component: Lobby,
    },

    {
      path: '/personnages',
      component: Personnages,
    },

    {
      path: '/regles',
      component: Regles,
    },

    {
      path: '/simulation',
      component: Simulation,
    },

    {
      path: '/team-game',
      component: TeamAuction,
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // Sans token :
  // uniquement Home / Connexion / Inscription.
  if (!auth.token) {
    if (to.meta.public) {
      next()
      return
    }

    next('/')
    return
  }

  // Un token existe :
  // on récupère toujours l'état actuel du compte.
  await auth.loadCurrentUser()

  // Token invalide / expiré / utilisateur supprimé.
  if (!auth.user) {
    if (to.meta.public) {
      next()
      return
    }

    next('/')
    return
  }

  // Compte en attente.
  if (auth.user.accessStatus === 'PENDING') {
    if (to.path === '/pending') {
      next()
      return
    }

    next('/pending')
    return
  }

  // Compte bloqué.
  if (auth.user.accessStatus === 'BLOCKED') {
    if (to.path === '/blocked') {
      next()
      return
    }

    next('/blocked')
    return
  }

  // À partir d'ici le compte est APPROVED.

  // Un compte approuvé n'a rien à faire
  // sur les pages Pending / Blocked.
  if (to.meta.accessPage) {
    next('/')
    return
  }

  // Route réservée aux administrateurs.
  if (to.meta.requiresAdmin) {
    if (
      auth.user.role !== 'ADMIN' &&
      auth.user.role !== 'SUPER_ADMIN'
    ) {
      next('/personnages')
      return
    }
  }

  next()
})

export default router