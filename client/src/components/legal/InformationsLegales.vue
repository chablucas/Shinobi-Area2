
<script setup lang="ts">
import { ref } from 'vue'

import MentionsLegales from './MentionsLegales.vue'
import PolitiqueConfidentialite from './PolitiqueConfidentialite.vue'
import ConditionsUtilisation from './ConditionsUtilisation.vue'

import './InformationsLegales.css'

type LegalPage = 'home' | 'mentions' | 'privacy' | 'terms'

const currentPage = ref<LegalPage>('home')

function openPage(page: LegalPage) {
  currentPage.value = page
}

function goBack() {
  currentPage.value = 'home'
}
</script>

<template>
  <div class="legal-container">
    <template v-if="currentPage === 'home'">
      <header class="legal-header">
        <span class="legal-label">SHINOBI AREA</span>
        <h2>Informations légales</h2>
        <p>
          Retrouvez les informations relatives au
          fonctionnement de Shinobi Area, à la protection
          de vos données et aux conditions d'utilisation du jeu.
        </p>
      </header>

      <div class="legal-grid">
        <button
          type="button"
          class="legal-card"
          @click="openPage('mentions')"
        >
          <span class="legal-card-icon" aria-hidden="true">⚖️</span>

          <span class="legal-card-content">
            <strong>Mentions légales</strong>
            <span>
              Éditeur, hébergement, propriété intellectuelle
              et informations de contact.
            </span>
          </span>

          <span class="legal-card-arrow" aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          class="legal-card"
          @click="openPage('privacy')"
        >
          <span class="legal-card-icon" aria-hidden="true">🛡️</span>

          <span class="legal-card-content">
            <strong>Politique de confidentialité</strong>
            <span>
              Découvrez comment vos données personnelles
              sont utilisées et protégées.
            </span>
          </span>

          <span class="legal-card-arrow" aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          class="legal-card"
          @click="openPage('terms')"
        >
          <span class="legal-card-icon" aria-hidden="true">📜</span>

          <span class="legal-card-content">
            <strong>Conditions d'utilisation</strong>
            <span>
              Consultez les règles du jeu, les conditions
              d'inscription et les règles de modération.
            </span>
          </span>

          <span class="legal-card-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <div class="legal-help">
        <div class="legal-help-icon" aria-hidden="true">✉</div>

        <div class="legal-help-content">
          <h3>Une question ou un signalement ?</h3>
          <p>
            Pour toute demande concernant votre compte,
            vos données personnelles ou le fonctionnement
            de Shinobi Area, contactez-nous.
          </p>

          <a href="mailto:shinobiarea.contact@gmail.com">
            shinobiarea.contact@gmail.com
          </a>
        </div>
      </div>
    </template>

    <MentionsLegales
      v-else-if="currentPage === 'mentions'"
      @back="goBack"
    />

    <PolitiqueConfidentialite
      v-else-if="currentPage === 'privacy'"
      @back="goBack"
    />

    <ConditionsUtilisation
      v-else-if="currentPage === 'terms'"
      @back="goBack"
    />
  </div>
</template>
