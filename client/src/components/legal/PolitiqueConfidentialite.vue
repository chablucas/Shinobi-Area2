<script setup lang="ts">
import './PolitiqueConfidentialite.css'
defineEmits<{
  (e: 'back'): void
}>()
</script>
<template>
  <article class="privacy-page">
    <button
      type="button"
      class="privacy-back"
      @click="$emit('back')"
    >
      <span aria-hidden="true">←</span>
      Retour aux informations légales
    </button>
    <header class="privacy-header">
      <span class="privacy-label">SHINOBI AREA</span>
      <h2>Politique de confidentialité</h2>
      <p>
        Découvrez comment Shinobi Area collecte,
        utilise et protège les données personnelles
        de ses utilisateurs.
      </p>
    </header>
    <div class="privacy-content">
      <section class="privacy-section">
        <h3>1. Introduction</h3>
        <p>Shinobi Area est un jeu de cartes en ligne gratuit, personnel et non commercial, réservé à un cercle d’amis admis individuellement par l’éditeur. Cette politique explique les données utilisées et les possibilités de contact concernant leur traitement.</p>
        <p>Le site ne propose aucune publicité, aucun outil Analytics et aucun chat libre. Les échanges en partie se limitent aux émotes prédéfinies affichées pendant trois secondes. Cette durée décrit leur affichage à l’écran ; elle ne constitue pas une durée de conservation en base de données.</p>
      </section>
      <section class="privacy-section">
        <h3>2. Responsable du traitement</h3>
        <p>L’éditeur de Shinobi Area, une personne physique agissant à titre non professionnel, détermine les usages des données nécessaires au jeu. Son identité civile n’est pas publiée dans cette politique.</p>
        <p>Pour toute question ou demande concernant vos données : <a class="privacy-contact" href="mailto:shinobiarea.contact@gmail.com">shinobiarea.contact@gmail.com</a>.</p>
        <p>Ce contact permet d’adresser vos demandes ; il ne remplace pas, à lui seul, les informations d’identification exigées lorsque la réglementation applicable impose leur communication.</p>
      </section>
      <section class="privacy-section">
        <h3>3. Données personnelles collectées</h3>
        <h4>Informations du compte</h4>
        <p>L’inscription nécessite une adresse email, un pseudonyme et un mot de passe. Le mot de passe est conservé sous forme hachée. Les informations de gestion du compte comprennent également ses dates de création et de modification, son statut d’accès, son rôle et, le cas échéant, sa date de blocage.</p>
        <h4>Informations du profil</h4>
        <p>Vous pouvez personnaliser votre pseudonyme et ajouter un avatar. Pour cet avatar, le site conserve l’URL et l’identifiant Cloudinary nécessaires à sa gestion.</p>
        <h4>Données liées au jeu</h4>
        <p>Le site traite les données de parties, les résultats et statistiques, les decks sauvegardés, les relations d’amitié, les invitations et les salons multijoueurs nécessaires aux fonctionnalités utilisées.</p>
        <h4>Notifications push</h4>
        <p>Si vous activez les notifications push, le site enregistre l’adresse technique de votre abonnement (endpoint) et les clés associées pour envoyer des notifications liées au jeu. Cette activation est facultative.</p>
        <h4>Données techniques</h4>
        <p>La transmission des requêtes et le fonctionnement des services techniques impliquent le traitement de données de connexion, notamment l’adresse IP. Les prestataires peuvent également traiter des journaux techniques pour exploiter et sécuriser leurs services.</p>
      </section>
      <section class="privacy-section">
        <h3>4. Utilisation des données</h3>
        <p>Pour les traitements soumis au RGPD, les finalités et bases juridiques retenues sont les suivantes :</p>
        <ul>
        <li><strong>Fourniture du jeu :</strong> création et gestion du compte, authentification, profil, decks, parties, invitations et amis. Ces traitements reposent sur l’exécution du service demandé, dans le cadre des conditions d’utilisation (article 6.1.b du RGPD).</li>
        <li><strong>Sécurité et modération :</strong> prévention des accès non autorisés, de la triche et des abus, gestion des accès et des signalements. Ces traitements reposent sur l’intérêt légitime de l’éditeur à protéger le jeu et ses utilisateurs (article 6.1.f du RGPD).</li>
        <li><strong>Notifications push facultatives :</strong> envoi des notifications activées par l’utilisateur, sur la base de son consentement (article 6.1.a du RGPD). Le refus ou le retrait de ce consentement ne conditionne pas l’accès au jeu.</li>
        <li><strong>Exercice des droits sur les données :</strong> traitement des demandes et vérifications nécessaires, au titre des obligations légales de l’éditeur (article 6.1.c du RGPD).</li></ul>
        <p>L’email, le pseudonyme et le mot de passe sont nécessaires à la création du compte. Sans ces informations, celui-ci ne peut pas être créé. L’avatar et les notifications sont facultatifs.</p>
      </section>
      <section class="privacy-section">
        <h3>5. Visibilité des informations</h3>
        <p>Votre email et le hachage de votre mot de passe ne sont pas destinés à être affichés aux autres joueurs. L’administration accède aux données nécessaires à la gestion du service.</p>
        <p>Votre pseudonyme et votre avatar peuvent être affichés aux autres joueurs dans les fonctionnalités sociales et multijoueurs. Pendant une partie, les participants voient les informations de jeu affichées, notamment les cartes et les émotes utilisées.</p>
        <p>Les communications entre joueurs se limitent aux émotes prédéfinies. Le site ne propose pas de chat libre.</p>
      </section>
      <section class="privacy-section">
        <h3>6. Prestataires techniques et hébergement</h3>
        <p>Les prestataires suivants interviennent pour les besoins techniques du jeu :</p>
        <ul>
        <li><strong>Vercel :</strong> hébergement et diffusion de l’interface du site via un CDN.</li>
        <li><strong>Render :</strong> hébergement du backend à Francfort, en Allemagne.</li>
        <li><strong>Neon :</strong> hébergement de la base PostgreSQL dans la région AWS US East 2, Ohio, États-Unis.</li>
        <li><strong>Cloudinary :</strong> stockage et diffusion des avatars.</li></ul>
        <p>La base Neon est située aux États-Unis : les données qu’elle contient font donc l’objet d’un transfert hors de l’Espace économique européen. La diffusion par CDN et les services d’images peuvent également impliquer des traitements dans plusieurs pays. La région Cloudinary, la liste complète des pays de traitement et les mécanismes juridiques applicables aux transferts ne sont pas renseignés dans cette politique. Aucune certification ni garantie particulière de transfert n’est affirmée. Pour obtenir les informations et documents disponibles, contactez l’éditeur.</p>
        <p>Les notifications push font intervenir le service de notification associé à votre navigateur. Les demandes envoyées par email sont traitées au moyen de la messagerie Gmail utilisée pour le contact du site.</p>
      </section>
      <section class="privacy-section">
        <h3>7. Durée de conservation des données</h3>
        <p>Aucune durée chiffrée ni règle exhaustive de conservation par catégorie de données n’est renseignée dans cette politique. Cela concerne notamment les inscriptions en attente ou refusées, les comptes inactifs ou bloqués, les données de jeu, les invitations, les abonnements push, les demandes par email ainsi que les éventuels journaux et sauvegardes techniques.</p>
        <p>Les données de compte, de profil, de decks, de parties et d’amitié servent aux fonctionnalités utilisées. Vous pouvez demander la suppression de votre compte et l’effacement de vos données selon les modalités ci-dessous. Les éventuelles exceptions à l’effacement doivent être justifiées et expliquées au demandeur.</p>
        <p>La suppression dans la base active et l’effacement dans les sauvegardes ou les services externes sont distincts. Les délais propres aux sauvegardes et journaux des prestataires ne sont pas renseignés ici. Pour connaître les informations disponibles sur la conservation de vos données, écrivez à shinobiarea.contact@gmail.com.</p>
      </section>
      <section class="privacy-section">
        <h3>8. Suppression du compte</h3>
        <p>Pour demander la suppression de votre compte, écrivez depuis l’adresse email qui lui est associée :</p>
        <a class="privacy-contact" href="mailto:shinobiarea.contact@gmail.com?subject=Suppression%20de%20compte">shinobiarea.contact@gmail.com</a>
        <p>Une vérification de votre qualité de titulaire du compte est effectuée avant sa suppression. Ne communiquez jamais votre mot de passe. Les informations demandées pour cette vérification doivent rester proportionnées au besoin d’éviter une suppression non autorisée.</p>
        <p>La suppression du compte entraîne la perte de l’accès au jeu avec ce compte. Elle comprend le traitement des données personnelles associées et la demande de suppression de l’avatar auprès de Cloudinary. En cas d’échec technique de cette demande, une nouvelle tentative doit être effectuée jusqu’à résolution du problème.</p>
        <p>La demande porte aussi sur les éventuelles données permettant encore de vous identifier dans les parties partagées avec d’autres joueurs. Un historique de partie ne justifie pas, à lui seul, le maintien de vos données personnelles.</p>
      </section>
      <section class="privacy-section">
        <h3>9. Droits des utilisateurs</h3>
        <p>Selon les conditions prévues par le RGPD, vous disposez des droits suivants :</p>
        <ul>
        <li>Accéder à vos données et obtenir leur rectification.</li>
        <li>Demander leur effacement ou la limitation de leur traitement.</li>
        <li>Vous opposer, pour des raisons tenant à votre situation particulière, aux traitements fondés sur l’intérêt légitime.</li>
        <li>Obtenir la portabilité des données que vous avez fournies, lorsque le traitement est automatisé et repose sur le contrat ou le consentement.</li>
        <li>Retirer votre consentement aux notifications à tout moment, sans remettre en cause les traitements déjà effectués.</li></ul>
        <p>Vous pouvez bloquer les notifications dans les paramètres de votre navigateur et demander la suppression de votre abonnement à l’adresse ci-dessous.</p>
        <a class="privacy-contact" href="mailto:shinobiarea.contact@gmail.com?subject=Donn%C3%A9es%20personnelles">shinobiarea.contact@gmail.com</a>
        <p>Une réponse est apportée dans un délai d’un mois à compter de la réception de la demande lorsque les règles du RGPD s’appliquent. Si la complexité ou le nombre des demandes justifie une prolongation, ce délai peut être prolongé de deux mois supplémentaires ; vous en êtes informé dans le premier mois, avec les motifs.</p>
        <p>Vous pouvez également déposer une réclamation auprès de la CNIL ou de l’autorité de protection des données compétente dans votre pays.</p>
        <p>Site officiel : <a href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>
      </section>
      <section class="privacy-section">
        <h3>10. Sécurité des données</h3>
        <p>Les mots de passe sont conservés sous forme hachée. Ce hachage n’est pas utilisé comme un mot de passe en clair.</p>
        <p>Ne partagez pas vos identifiants. Pour signaler un accès suspect ou un problème de sécurité, contactez l’éditeur à l’adresse indiquée dans cette politique.</p>
      </section>
      <section class="privacy-section">
        <h3>11. Cookies et stockage local</h3>
        <p>Le site conserve un jeton d’authentification JWT dans le stockage local du navigateur (localStorage) pour maintenir votre connexion. Il est supprimé de ce stockage lorsque vous utilisez la déconnexion de l’application.</p>
        <p>La suppression du jeton dans le navigateur ne signifie pas, à elle seule, qu’il est révoqué côté serveur. Fermer un onglet ne supprime pas automatiquement le localStorage.</p>
        <p>Le stockage strictement nécessaire à l’authentification demandée par l’utilisateur est exempté de consentement préalable. Shinobi Area ne propose pas de publicité et n’utilise pas d’outil Analytics.</p>
      </section>
      <section class="privacy-section">
        <h3>12. Protection des mineurs</h3>
        <p>L’accès au jeu est réservé aux amis de l’éditeur qu’il connaît personnellement et dont il sait qu’ils ont au moins 15 ans. Chaque compte est soumis à son approbation manuelle. Une inscription ne donne pas automatiquement accès au jeu.</p>
        <p>L’éditeur ne prévoit pas d’admettre des personnes de moins de 15 ans. Les personnes âgées de 15 à 17 ans restent mineures ; leur utilisation du service demeure soumise aux règles applicables à leur situation. Le seuil d’admission au jeu ne constitue pas une déclaration de majorité.</p>
        <p>Les notifications sont facultatives. L’autorisation d’accéder au jeu ne vaut pas consentement aux notifications ni à tous les traitements de données.</p>
      </section>
      <section class="privacy-section">
        <h3>13. Modification de la politique</h3>
        <p>Cette politique peut être mise à jour pour refléter l’évolution du jeu ou des traitements de données. Les modifications importantes sont portées à la connaissance des utilisateurs.</p>
        <p>Pour toute question :</p>
        <a class="privacy-contact" href="mailto:shinobiarea.contact@gmail.com">shinobiarea.contact@gmail.com</a>
      </section>
    </div>
  </article>
</template>
