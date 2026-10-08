<script setup lang="ts">
import './MentionsLegales.css'

defineEmits<{
  (e: 'back'): void
}>()
</script>

<template>
  <article class="mentions-legales">
    <button type="button" class="mentions-back" @click="$emit('back')">
      <span aria-hidden="true">←</span>
      Retour aux informations légales
    </button>
    <header class="mentions-header">
      <span class="mentions-label">SHINOBI AREA</span>
      <h2>Mentions légales</h2>
      <p>Informations relatives à l’édition, à l’hébergement et au fonctionnement de Shinobi Area.</p>
    </header>
    <div class="mentions-content">
      <section class="mentions-section">
        <h3>1. Présentation du site</h3>
        <p>Shinobi Area est un jeu de cartes en ligne gratuit, développé à titre personnel et non commercial. Il propose notamment des parties contre une intelligence artificielle, des parties multijoueurs et des fonctionnalités de création de personnages.</p>
        <p>L’accès au jeu est réservé aux amis de l’éditeur qu’il connaît personnellement et dont il sait qu’ils ont au moins 15 ans. Chaque compte est soumis à son approbation manuelle. Une inscription ne donne pas automatiquement accès au jeu.</p>
        <p>Le projet est inspiré de Naruto Shippuden. Il est indépendant, non officiel et sans affiliation avec les titulaires des droits sur cet univers.</p>
      </section>
      <section class="mentions-section">
        <h3>2. Édition du site</h3>
        <p>Shinobi Area est édité à titre non professionnel par une personne physique qui souhaite préserver son identité auprès du public.</p>
        <p>Contact : <a class="mentions-contact" href="mailto:shinobiarea.contact@gmail.com">shinobiarea.contact@gmail.com</a>.</p>
        <p>Les coordonnées personnelles de l’éditeur ne sont pas publiées sur cette page. La possibilité légale de préserver l’anonymat public d’un éditeur non professionnel est subordonnée à la communication des éléments d’identification requis au fournisseur d’hébergement. La présente page ne constitue pas une attestation de l’accomplissement de cette démarche.</p>
      </section>
      <section class="mentions-section">
        <h3>3. Hébergement et services techniques</h3>
        <ul>
        <li><strong>Vercel Inc. :</strong> hébergement et diffusion de l’interface du site via un CDN. Adresse : 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Site : <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">vercel.com</a>.</li>
        <li><strong>Render :</strong> hébergement du backend à Francfort, en Allemagne.</li>
        <li><strong>Neon :</strong> hébergement de la base PostgreSQL dans la région AWS US East 2, Ohio, États-Unis.</li>
        <li><strong>Cloudinary :</strong> stockage et diffusion des avatars. La région de stockage n’est pas renseignée dans les informations disponibles pour cette page.</li></ul>
        <p>Les entités juridiques et adresses contractuelles de Render, Neon et Cloudinary ne sont pas renseignées dans cette page. Vous pouvez contacter l’éditeur pour obtenir les renseignements disponibles sur ces services.</p>
        <p>Les informations concernant les données personnelles et les transferts internationaux figurent dans la politique de confidentialité accessible depuis le site.</p>
      </section>
      <section class="mentions-section">
        <h3>4. Propriété intellectuelle</h3>
        <p>Shinobi Area est un projet indépendant et non officiel, sans affiliation avec les titulaires des droits sur Naruto Shippuden.</p>
        <p>Les noms, personnages, illustrations et autres éléments protégés de cet univers restent soumis aux droits de leurs titulaires respectifs. La gratuité et le caractère non commercial du projet ne valent pas autorisation d’utiliser ces contenus.</p>
        <p>Les éléments originaux du site sont également soumis aux droits de propriété intellectuelle applicables. Pour signaler une atteinte à vos droits, contactez l’éditeur.</p>
      </section>
      <section class="mentions-section">
        <h3>5. Disponibilité du service</h3>
        <p>Shinobi Area est un projet personnel en évolution. Des interruptions, opérations de maintenance ou erreurs techniques peuvent survenir.</p>
        <p>Les fonctionnalités, les contenus et les règles de jeu peuvent évoluer au cours du développement et de l’équilibrage du projet.</p>
      </section>
      <section class="mentions-section">
        <h3>6. Données personnelles</h3>
        <p>Le site traite des données nécessaires aux comptes, aux profils et aux parties. La politique de confidentialité décrit ces traitements et les droits des utilisateurs.</p>
        <p>Pour exercer vos droits :</p>
        <a class="mentions-contact" href="mailto:shinobiarea.contact@gmail.com">shinobiarea.contact@gmail.com</a>
      </section>
      <section class="mentions-section">
        <h3>7. Contact et signalements</h3>
        <p>Pour toute question, demande concernant un compte, difficulté technique ou signalement :</p>
        <a class="mentions-contact" href="mailto:shinobiarea.contact@gmail.com">shinobiarea.contact@gmail.com</a>
      </section>
    </div>
  </article>
</template>
