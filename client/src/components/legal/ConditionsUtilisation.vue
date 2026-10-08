<script setup lang="ts">
import './ConditionsUtilisation.css'
defineEmits<{
  (e: 'back'): void
}>()
</script>
<template>
  <article class="cgu-page">
    <button
      type="button"
      class="cgu-back"
      @click="$emit('back')"
    >
      <span aria-hidden="true">←</span>
      Retour aux informations légales
    </button>
    <header class="cgu-header">
      <span class="cgu-label">SHINOBI AREA</span>
      <h2>Conditions générales d'utilisation</h2>
      <p>
        Les règles d'accès et d'utilisation de Shinobi Area,
        pour une expérience de jeu agréable et respectueuse.
      </p>
    </header>
    <div class="cgu-content">
      <section class="cgu-section">
        <h3>1. Présentation du service</h3>
        <p>Shinobi Area est un jeu de cartes en ligne gratuit, personnel et non commercial. Inspiré de Naruto Shippuden, il propose des parties contre une intelligence artificielle, des parties multijoueurs et des fonctionnalités de création de personnages.</p>
        <p>Le projet est indépendant, non officiel et sans affiliation avec les titulaires des droits sur Naruto.</p>
      </section>
      <section class="cgu-section">
        <h3>2. Accès et inscription</h3>
        <p>L’accès au jeu est réservé aux amis de l’éditeur qu’il connaît personnellement et dont il sait qu’ils ont au moins 15 ans. Chaque compte est soumis à son approbation manuelle. Une inscription ne donne pas automatiquement accès au jeu.</p>
        <p>Avant validation, un compte en attente ne permet pas d’accéder aux fonctionnalités du jeu. L’éditeur peut refuser une demande provenant d’une personne qu’il ne connaît pas ou qui ne respecte pas cette règle d’accès.</p>
        <p>Utilisez une adresse email qui vous appartient et un pseudonyme qui n’usurpe pas l’identité d’une autre personne. Le statut de votre compte peut être modifié après son admission ; un compte bloqué ne doit plus pouvoir accéder aux fonctionnalités réservées aux utilisateurs autorisés.</p>
      </section>
      <section class="cgu-section">
        <h3>3. Sécurité du compte</h3>
        <p>Conservez vos identifiants confidentiels et ne partagez pas votre mot de passe. Signalez à l’administration toute utilisation suspecte de votre compte.</p>
      </section>
      <section class="cgu-section">
        <h3>4. Règles de comportement</h3>
        <p>Les joueurs doivent utiliser le service de manière respectueuse et loyale. Il est interdit de :</p>
        <ul>
        <li>Tricher ou exploiter volontairement une faille pour obtenir un avantage injustifié.</li>
        <li>Accéder sans autorisation au compte ou aux données d’un autre utilisateur.</li>
        <li>Harceler, menacer ou chercher à nuire à d’autres joueurs, notamment par un pseudonyme, un avatar ou l’usage répété des émotes.</li>
        <li>Utiliser des outils automatisés pour perturber le jeu ou ses serveurs.</li>
        <li>Contourner les restrictions d’accès ou les mesures de modération.</li></ul>
        <p>Choisissez un pseudonyme et un avatar licites, respectueux et que vous avez le droit d’utiliser.</p>
      </section>
      <section class="cgu-section">
        <h3>5. Interactions entre joueurs</h3>
        <p>Les parties multijoueurs et les fonctionnalités d’amitié permettent des interactions entre joueurs. Les communications en partie sont limitées aux émotes prédéfinies, affichées pendant trois secondes ; aucun chat libre n’est proposé.</p>
        <p>Même prédéfinies, les émotes ne doivent pas être utilisées pour harceler ou perturber une partie.</p>
      </section>
      <section class="cgu-section">
        <h3>6. Fonctionnement du jeu</h3>
        <p>Les règles, caractéristiques des cartes et mécanismes de combat sont présentés dans le jeu. Ils peuvent évoluer pour corriger des erreurs ou améliorer l’équilibrage.</p>
        <p>Ces changements peuvent modifier les stratégies, les decks et les résultats des parties futures.</p>
      </section>
      <section class="cgu-section">
        <h3>7. Gratuité du service</h3>
        <p>Le jeu est gratuit, sans achat intégré, abonnement payant ni publicité.</p>
        <p>Les éventuels éléments et récompenses virtuels n’ont pas de valeur monétaire et ne sont pas échangeables contre de l’argent.</p>
      </section>
      <section class="cgu-section">
        <h3>8. Signalements et modération</h3>
        <p>Pour signaler un abus ou une tentative de triche :</p>
        <a class="cgu-contact" href="mailto:shinobiarea.contact@gmail.com?subject=Signalement%20Shinobi%20Area">shinobiarea.contact@gmail.com</a>
        <p>Décrivez les faits et le contexte, sans communiquer votre mot de passe. L’administration peut demander des précisions et prendre une mesure proportionnée à la gravité et à la répétition des faits :</p>
        <ul>
        <li>Un avertissement.</li>
        <li>Une restriction ou un blocage temporaire du compte.</li>
        <li>Un blocage durable ou une suppression du compte pour les manquements graves ou répétés.</li></ul>
        <p>Vous pouvez demander des explications ou contester une mesure en écrivant à cette même adresse.</p>
      </section>
      <section class="cgu-section">
        <h3>9. Suppression du compte</h3>
        <p>Vous pouvez demander la suppression de votre compte à tout moment :</p>
        <a class="cgu-contact" href="mailto:shinobiarea.contact@gmail.com?subject=Suppression%20de%20compte">shinobiarea.contact@gmail.com</a>
        <p>Écrivez depuis l’adresse associée au compte. Une vérification est effectuée pour éviter une suppression non autorisée ; votre mot de passe ne doit jamais être transmis.</p>
        <p>La suppression met fin à l’accès avec ce compte. Le traitement des données associées et la suppression de l’avatar Cloudinary sont décrits dans la politique de confidentialité.</p>
      </section>
      <section class="cgu-section">
        <h3>10. Protection des mineurs</h3>
        <p>L’accès est réservé aux personnes d’au moins 15 ans que l’éditeur connaît personnellement. Les personnes de moins de 15 ans ne sont pas admises.</p>
        <p>Les joueurs de 15 à 17 ans restent mineurs. Cette règle d’admission ne supprime pas les protections légales applicables aux mineurs, notamment en matière de capacité à accepter des conditions d’utilisation et de données personnelles.</p>
        <p>Les notifications sont facultatives et distinctes de l’admission au jeu.</p>
      </section>
      <section class="cgu-section">
        <h3>11. Propriété intellectuelle</h3>
        <p>Shinobi Area est un projet indépendant et non officiel, sans affiliation avec les titulaires des droits sur Naruto Shippuden.</p>
        <p>Les noms, personnages, illustrations et autres éléments protégés de cet univers restent soumis aux droits de leurs titulaires respectifs. La gratuité et le caractère non commercial du projet ne valent pas autorisation d’utiliser ces contenus.</p>
        <p>L’ajout d’un avatar ou d’un autre contenu ne vous dispense pas de respecter les droits de tiers. Signalez tout contenu dont vous estimez qu’il porte atteinte à vos droits à l’adresse de contact du site.</p>
      </section>
      <section class="cgu-section">
        <h3>12. Disponibilité et responsabilité</h3>
        <p>Le jeu peut connaître des interruptions, opérations de maintenance, bugs ou pertes de progression. Une disponibilité permanente et l’absence d’erreurs ne peuvent pas être garanties.</p>
        <p>Ces indications ne suppriment ni les droits prévus par la loi ni la responsabilité de l’éditeur lorsqu’elle est engagée selon les règles applicables.</p>
      </section>
      <section class="cgu-section">
        <h3>13. Modification ou arrêt du service</h3>
        <p>L’éditeur peut faire évoluer les fonctionnalités, suspendre le service ou arrêter le projet. Les changements importants sont annoncés aux utilisateurs dans la mesure du possible.</p>
        <p>L’arrêt du jeu ne supprime pas les obligations relatives aux données personnelles ni la possibilité d’exercer les droits correspondants.</p>
      </section>
      <section class="cgu-section">
        <h3>14. Données personnelles</h3>
        <p>La politique de confidentialité accessible depuis les informations légales décrit les données utilisées, les finalités des traitements, les prestataires et les droits des utilisateurs.</p>
        <p>L’acceptation des présentes conditions ne vaut pas consentement global à tous les traitements de données.</p>
      </section>
      <section class="cgu-section">
        <h3>15. Modification des conditions</h3>
        <p>Ces conditions peuvent évoluer avec le jeu ou la réglementation. Les modifications importantes sont portées à la connaissance des utilisateurs. La version applicable doit rester accessible depuis le site.</p>
      </section>
      <section class="cgu-section">
        <h3>16. Contact</h3>
        <p>Pour toute question concernant le jeu ou ces conditions :</p>
        <a class="cgu-contact" href="mailto:shinobiarea.contact@gmail.com">shinobiarea.contact@gmail.com</a>
      </section>
    </div>
  </article>
</template>
