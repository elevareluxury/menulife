import type { LegalDict } from './es'
import es from './es'

const fr: LegalDict = {
  ui: {
    termsTitle: "Conditions générales",
    privacyTitle: "Politique de confidentialité",
    termsIntro: "En créant un compte ou en utilisant Mycen, vous acceptez ces conditions. Elles sont écrites pour être comprises.",
    privacyIntro: "Quelles données nous utilisons, pourquoi, avec qui nous les partageons et quel contrôle vous avez.",
    updated: "Dernière mise à jour",
    contents: "Sommaire",
    reference: "La version espagnole fait foi. Les traductions sont fournies pour votre confort ; en cas de différence, le texte espagnol prévaut, sauf si la loi de votre pays en dispose autrement.",
    seeOther: { terms: "Politique de confidentialité", privacy: "Conditions générales" },
    language: "Langue",
    back: "Retour à Mycen",
    supportTitle: "Aide et assistance",
    supportIntro: "Comment nous écrire et réponses aux questions les plus fréquentes.",
    deletionTitle: "Supprimer votre compte Mycen",
    deletionIntro: "Comment supprimer votre compte et vos données Mycen (app et web), ce qui est supprimé et ce qui peut rester.",
  },
  updated: es.updated,
  support: [
    { id: "contacto", title: "Écrivez-nous", body: [
      "Pour toute question, problème ou demande, écrivez à **team@mycen.id**. Indiquez votre nom d’utilisateur Mycen (ou l’e-mail du compte) et, si possible, joignez une capture d’écran. Nous répondons au plus vite.",
    ] },
    { id: "acceso", title: "Accéder à votre compte", body: [
      { list: [
        "**J’ai oublié mon mot de passe :** sur l’écran de connexion, touchez « Mot de passe oublié ? » et suivez le lien reçu par e-mail.",
        "**Je n’ai pas reçu l’e-mail de confirmation :** vérifiez les spams et les promotions. S’il n’y est pas, inscrivez-vous à nouveau avec le même e-mail et nous le renverrons.",
        "**Je me suis connecté avec Google :** utilisez toujours le même bouton ; aucun mot de passe n’est nécessaire.",
      ] },
    ] },
    { id: "datos", title: "Vos données", body: [
      { list: [
        "**Les télécharger :** Studio → Réglages → « Télécharger mes données » (votre profil, vos modules et Life OS dans un fichier). Dans Life OS → Réglages → « Vos données », vous pouvez aussi télécharger Argent en CSV.",
        "**Supprimer votre compte :** depuis Studio → Réglages ou Life OS → Réglages → Compte. Toutes les étapes, et ce qui est supprimé, sur **mycen.id/eliminar-cuenta**.",
      ] },
    ] },
    { id: "seguridad", title: "Signaler ou bloquer", body: [
      { list: [
        "**Un profil :** sur n’importe quel profil public, touchez « Signaler ». L’équipe Mycen l’examine et le propriétaire ne sait pas qui a signalé.",
        "**Un message :** dans Studio → Messages, « Signaler » envoie le message à l’équipe et bloque l’expéditeur ; « Bloquer » arrête seulement ses messages.",
      ] },
      "Si c’est urgent ou si quelqu’un est en danger, écrivez à **team@mycen.id** avec l’objet « Urgent ».",
    ] },
  ],
  deletion: [
    { id: "app", title: "Depuis l’app ou le web", body: [
      "Connectez-vous et choisissez l’une de ces options :",
      { list: [
        "**Life OS → Réglages → Compte → « Supprimer mon compte »**",
        "**Studio → Réglages → « Supprimer mon compte »**",
      ] },
      "Pour confirmer, tapez le mot demandé. Le compte est supprimé immédiatement.",
    ] },
    { id: "sin-acceso", title: "Si vous ne pouvez pas vous connecter", body: [
      "Écrivez à **team@mycen.id** depuis l’e-mail de votre compte, avec l’objet « Supprimer mon compte ». Nous le supprimons dans les délais légaux (en Argentine, 5 jours ouvrables) et vous prévenons quand c’est fait.",
    ] },
    { id: "que-se-borra", title: "Ce qui est supprimé", body: [
      { list: [
        "Votre compte et votre e-mail de connexion.",
        "Votre identité : profils, Spaces, modules, projets, images, versions publiées, statistiques, messages et abonnés.",
        "Tout Life OS : tâches, habitudes, objectifs, Ma journée, bilans, Argent et journal.",
      ] },
    ] },
    { id: "que-queda", title: "Ce qui peut rester", body: [
      { list: [
        "Les sauvegardes des prestataires, écrasées selon leurs cycles habituels, et la sauvegarde quotidienne des photos et PDF, qui garde ce qui a été supprimé pendant 30 jours.",
        "Les journaux d’erreurs, qui ne sont pas liés à votre compte.",
        "Ce que la loi impose de conserver (par exemple, les données de facturation), pendant la durée qu’elle fixe.",
        "Si votre compte avait un profil suspendu, son nom d’utilisateur reste réservé pour que personne ne le réutilise, et le registre de cette suspension est conservé 3 ans.",
        "Si votre compte a une entreprise dans Mycen Business, écrivez-nous : nous la fermons avec vous pour protéger les données de vos clients et de vos ventes.",
      ] },
    ] },
  ],
  terms: [
    { id: "quien", title: "Qui fournit le service", body: [
      "Mycen est un service exploité par **Luca Cazzoli** (identifiant fiscal argentin CUIT 20-42325961-3), sous le nom commercial **Resilio**, domicilié en République argentine. Vous pouvez nous écrire à **team@mycen.id**.",
      "Mycen vous permet de créer une identité numérique publique (Mycen Identity), de la gérer depuis Mycen Studio et d’organiser votre vie personnelle dans Life OS. Mycen Business, pour gérer des entreprises, n’est pas encore ouvert aux nouvelles entreprises.",
      "**Point de contact :** pour les utilisateurs et les autorités (y compris au titre du règlement européen sur les services numériques), écrivez à **team@mycen.id**, en espagnol ou en anglais.",
    ] },
    { id: "edad", title: "Qui peut utiliser Mycen", body: [
      "Pour utiliser Mycen, vous devez avoir au moins **13 ans**, ou l’âge plus élevé fixé par la loi de votre pays pour utiliser un service comme celui-ci sans le consentement de votre parent ou tuteur (par exemple **14 ans** en Corée du Sud et en Chine, et jusqu’à **16 ans** dans certains pays de l’Union européenne).",
      "En créant un compte, vous confirmez avoir l’âge requis. Si nous apprenons qu’un compte appartient à une personne qui ne l’a pas, nous le supprimons.",
      "Pour utiliser Mycen Business au nom d’une entreprise, vous devez être majeur et autorisé à la représenter.",
    ] },
    { id: "cuenta", title: "Votre compte", body: [
      "Vous êtes responsable de la sécurité de votre mot de passe et de ce qui se passe sur votre compte. Les données que vous ajoutez doivent être exactes et vous appartenir, ou vous devez avoir l’autorisation de les utiliser.",
      "Si vous remarquez une utilisation que vous n’avez pas autorisée, changez votre mot de passe et écrivez-nous.",
    ] },
    { id: "contenido", title: "Votre contenu", body: [
      "Ce que vous publiez reste à vous. Vous nous accordez une autorisation gratuite et mondiale de le stocker, de l’afficher à votre adresse publique et de l’adapter techniquement (par exemple, réduire des images) tant qu’il est publié. Vous pouvez le modifier, le masquer, le dépublier ou le supprimer quand vous voulez.",
      "Ce que vous publiez doit respecter les règles de contenu. Nous pouvons masquer ou suspendre ce qui ne les respecte pas.",
      "Si vous publiez des contenus ou des données concernant d’autres personnes ou des marques (par exemple les coordonnées de votre agence, une citation de presse, un logo ou les chiffres de votre audience), vous devez en avoir le droit et ce que vous dites doit être vrai. Si quelque chose est une publicité payée ou un partenariat en échange de produits, indiquez-le, comme l’exigent les lois sur la publicité de nombreux pays.",
    ] },
    { id: "reglas", title: "Règles de contenu", body: [
      "Il est interdit de publier sur Mycen :",
      { list: [
        "**Spam ou publicité trompeuse :** fausses promesses, liens qui ne mènent pas là où ils le disent ou faux avis.",
        "**Arnaques ou fraude :** demander de l’argent ou des données par la tromperie, vendre ce qui n’existe pas.",
        "**Usurpation d’identité :** se faire passer pour une autre personne, entreprise ou marque.",
        "**Haine ou harcèlement :** attaquer des personnes ou des groupes pour ce qu’ils sont, ou harceler quelqu’un.",
        "**Violence ou menaces :** menacer, inciter à la violence ou la montrer gratuitement.",
        "**Contenu sexuel explicite**, et tout contenu sexuel impliquant des mineurs (signalé aux autorités).",
        "**Tout ce qui est illégal :** produits ou services interdits, ou contenu portant atteinte aux droits d’autrui (marques, photos, textes).",
        "**Liens malveillants :** virus, hameçonnage ou sites trompeurs.",
      ] },
      "Toute personne peut signaler un profil ou un projet avec le lien « Signaler » en bas de la page, sans compte et anonymement. Nous examinons chaque signalement. Si un profil enfreint les règles, nous le suspendons : il n’est plus visible (page, projets et carte de contact) et son propriétaire voit le motif dans Studio. Si vous pensez qu’il s’agit d’une erreur, écrivez-nous depuis le compte avec lequel vous l’avez créé et nous le réexaminerons.",
      "Tant qu’un profil est suspendu, son compte ne peut ni créer de nouveaux profils ni le supprimer pour repartir de zéro. Si le compte est supprimé, ce nom d’utilisateur reste réservé et ne peut plus être utilisé.",
      "**Comment nous modérons :** nous combinons des outils automatiques et des personnes. Par exemple, nous vérifions les liens publiés avec Google Web Risk et appliquons des limites automatiques contre les abus, mais aucun profil n’est suspendu par un outil automatique seul : une personne de l’équipe examine chaque cas. Quand nous masquons ou suspendons quelque chose, nous vous disons quoi, pourquoi et quelle règle est enfreinte, et vous pouvez demander un nouvel examen. Si vous vivez dans l’Union européenne, vous pouvez aussi saisir un organe certifié de règlement extrajudiciaire des litiges ou les tribunaux. Si un contenu révèle une menace pour la vie ou la sécurité d’une personne, ou des abus sexuels sur mineurs, nous prévenons les autorités.",
    ] },
    { id: "uso", title: "Bon usage du service", body: [
      "En plus des règles de contenu, il est interdit de :",
      { list: [
        "**Automatiser** la création de comptes, les visites, les votes ou les messages, ou utiliser des robots pour gonfler les chiffres.",
        "**Copier en masse** les profils ou les données d’autres personnes (scraping), sauf ce que font les moteurs de recherche avec les pages publiques.",
        "**Attaquer ou tester la sécurité** de Mycen sans autorisation. Si vous trouvez une faille, signalez-la à team@mycen.id.",
        "**Contourner** une suspension, un blocage ou les limites du service, par exemple en créant un autre compte.",
        "**Vendre, louer ou céder** votre compte ou votre nom d’utilisateur.",
      ] },
    ] },
    { id: "derechos-de-autor", title: "Droits d’auteur et autres droits", body: [
      "Si vous pensez qu’un contenu publié sur Mycen porte atteinte à vos droits d’auteur ou à d’autres droits (par exemple votre marque ou votre image), vous pouvez nous demander de le retirer. Écrivez à **team@mycen.id** en indiquant :",
      { list: [
        "**Le lien vers le contenu :** l’adresse exacte sur Mycen du profil, du projet ou de l’image.",
        "**Le titulaire** du droit et comment le contacter. Si vous agissez au nom d’une autre personne ou d’une entreprise, précisez-le.",
        "**En quoi il y a atteinte :** de quelle œuvre, marque ou autre droit il s’agit et comment il est utilisé sans autorisation.",
        "**Une déclaration :** que vous pensez de bonne foi que cet usage n’est pas autorisé par le titulaire, son représentant ou la loi et, sous peine de parjure, que les informations sont exactes et que vous êtes le titulaire ou êtes autorisé à agir en son nom.",
        "**Votre signature**, manuscrite ou électronique (votre nom complet tapé suffit).",
      ] },
      "Nous examinons chaque demande. Le cas échéant, nous retirons ou bloquons le contenu et prévenons la personne qui l’a publié, en lui indiquant le motif. Elle peut nous répondre avec sa version (par exemple si elle a l’autorisation de l’utiliser) et nous réexaminons la situation.",
      "**Si nous retirons un de vos contenus et que vous pensez que c’est une erreur,** envoyez-nous une contre-notification avec le lien du contenu retiré, une déclaration sous peine de parjure indiquant que vous pensez de bonne foi qu’il a été retiré par erreur ou à la suite d’une mauvaise identification, vos nom, adresse et téléphone, et votre acceptation de la compétence des tribunaux concernés. Nous la transmettons à l’auteur de la demande et si, dans un délai de 10 à 14 jours ouvrables, il ne nous montre pas qu’il a engagé une action en justice, nous pouvons republier le contenu.",
      "Les comptes qui publient de manière répétée des contenus portant atteinte aux droits d’autrui peuvent être suspendus ou fermés.",
    ] },
    { id: "usernames", title: "Noms d’utilisateur", body: [
      "Certains noms sont réservés. Il est interdit d’enregistrer des noms pour se faire passer pour une autre personne ou une marque, ou pour les revendre ; dans ces cas, nous pouvons les récupérer. Si vous changez de nom d’utilisateur, l’ancienne adresse redirige vers la nouvelle pour que vos liens et QR codes continuent de fonctionner.",
      "Il n’est pas possible de choisir des noms qui imitent des banques, des portefeuilles, des services ou des marques connues (par exemple avec le mot « banque » ou le nom d’une marque) : Mycen les refuse au moment du choix. Si votre compte est vérifié et que vous changez votre nom ou votre nom d’utilisateur, le badge de vérification repasse en examen.",
      "À la demande d’une personnalité, d’une marque ou de son représentant, nous pouvons réserver son nom d’utilisateur avant qu’elle crée son compte : seule cette personne peut le prendre. Si vous pensez que quelqu’un a enregistré un nom qui vous revient, écrivez-nous avec des preuves et nous examinerons la demande.",
    ] },
    { id: "propiedad", title: "Ce qui appartient à Mycen", body: [
      "La marque Mycen, l’empreinte, le design et le logiciel de Mycen appartiennent à leurs titulaires. Ces conditions vous autorisent à utiliser le service, sans vous donner de droits sur ces éléments. Si vous nous envoyez des idées ou des suggestions, nous pouvons les utiliser librement pour améliorer Mycen, sans aucune obligation envers vous.",
    ] },
    { id: "pagos", title: "Prix", body: [
      "Aujourd’hui, Mycen est **gratuit** : votre identité, Studio et Life OS ne coûtent rien et nous ne vous demandons aucun moyen de paiement.",
      "Si nous ajoutons des offres payantes à l’avenir (par exemple à l’ouverture de Mycen Business), nous vous préviendrons à l’avance, avec leur prix en dollars américains (US$) plus les taxes de votre pays, et rien de ce que vous utilisez gratuitement aujourd’hui ne deviendra payant sans votre accord. Il n’y aura pas de durée minimale et, si vous êtes consommateur, vous conservez les droits que vous accorde la loi de votre pays, comme le droit de rétractation pour un achat à distance.",
    ] },
    { id: "servicio", title: "Le service", body: [
      "Nous travaillons pour que Mycen fonctionne toujours bien, mais il peut y avoir des interruptions, des erreurs ou des changements. Les fonctionnalités peuvent évoluer, s’améliorer ou cesser d’être disponibles ; si quelque chose d’important change, nous vous prévenons à l’avance dans la mesure du possible.",
      "Dans les limites permises par la loi, Mycen est fourni « en l’état » et nous ne sommes pas responsables des dommages indirects ni des pertes de profits liés à l’utilisation du service. Rien de ceci ne limite les droits que la loi de votre pays ne permet pas de limiter, comme les droits des consommateurs.",
      "Les liens, vidéos, chansons et services de tiers qui apparaissent sur les profils appartiennent à ces tiers : nous ne les contrôlons pas et n’en sommes pas responsables.",
      "Si notre responsabilité était malgré tout engagée, elle serait limitée au total à ce que vous nous avez payé au cours des 12 mois précédents ou à 100 US$, le montant le plus élevé étant retenu. Cette limite ne s’applique pas en cas de dol ou de faute lourde, d’atteinte à la vie ou à la santé, ni lorsque la loi ne permet pas de la limiter.",
    ] },
    { id: "baja", title: "Clôture et suspension", body: [
      "Vous pouvez supprimer votre compte à tout moment depuis Studio → Réglages, et télécharger d’abord une copie de vos données. Les comptes avec une entreprise active sur Mycen Business sont clôturés via le support, car ils impliquent des données de clients et de ventes.",
      "Nous pouvons suspendre ou fermer les comptes qui enfreignent ces conditions ou la loi, ou qui mettent en danger d’autres personnes ou le service. Dans la mesure du possible, nous vous prévenons et vous expliquons pourquoi.",
    ] },
    { id: "apps", title: "Si vous utilisez l’application iPhone ou Android", body: [
      "Si vous avez téléchargé Mycen depuis l’App Store d’Apple, les points suivants s’appliquent aussi :",
      { list: [
        "Ces conditions vous lient à Mycen, et non à Apple. Apple n’est pas responsable de l’application ni de son contenu.",
        "Vous pouvez utiliser l’application sur les appareils Apple que vous possédez ou contrôlez, conformément aux règles d’utilisation de l’App Store.",
        "Apple n’a aucune obligation de fournir maintenance ou assistance pour l’application ; pour cela, écrivez-nous à team@mycen.id.",
        "Si l’application ne respecte pas une garantie applicable, vous pouvez en informer Apple, qui vous remboursera le prix payé (l’application est gratuite) ; Apple n’a aucune autre obligation de garantie. Les réclamations concernant l’application (responsabilité du fait des produits, conformité légale, protection des consommateurs ou droits de propriété intellectuelle de tiers) sont traitées par Mycen, et non par Apple.",
        "Vous déclarez ne pas vous trouver dans un pays soumis à un embargo des États-Unis et ne figurer sur aucune liste américaine de personnes interdites ou soumises à restrictions.",
        "Apple et ses filiales sont des tiers bénéficiaires de ces conditions et peuvent les faire valoir contre vous.",
      ] },
      "Si vous l’avez téléchargée sur Google Play, les conditions de Google Play s’appliquent aussi.",
    ] },
    { id: "cambios", title: "Modifications de ces conditions", body: [
      "Si nous modifions ces conditions de manière importante, nous vous prévenons par e-mail ou dans Mycen avant leur entrée en vigueur. Si vous n’êtes pas d’accord, vous pouvez cesser d’utiliser le service et supprimer votre compte.",
    ] },
    { id: "ley", title: "Droit applicable", body: [
      "Ces conditions sont régies par les lois de la République argentine. Si vous utilisez Mycen en tant que consommateur depuis un autre pays, vous êtes aussi protégé par les règles impératives de votre pays et pouvez saisir les tribunaux de votre domicile.",
      "**Autres dispositions :** si une partie de ces conditions n’est pas valable, le reste demeure en vigueur. Ne pas faire valoir un droit à un moment donné ne signifie pas y renoncer. Nous ne sommes pas responsables des retards ou défaillances dus à des événements échappant à notre contrôle raisonnable. Nous pouvons céder ces conditions si Mycen passe à une autre personne ou société (par exemple lors de la création d’une société), avec un préavis ; vous ne pouvez pas les céder sans notre accord. Ces conditions et la politique de confidentialité constituent l’intégralité de l’accord entre vous et Mycen.",
      "Avant toute réclamation, écrivez-nous à **team@mycen.id** : presque tout se règle en discutant.",
    ] },
  ],
  privacy: [
    { id: "responsable", title: "Qui est responsable de vos données", body: [
      "Le responsable du traitement est **Luca Cazzoli** (identifiant fiscal argentin CUIT 20-42325961-3), qui exploite Mycen sous le nom commercial **Resilio** et est domicilié en République argentine. Pour toute question sur vos données, écrivez à **team@mycen.id**.",
      "Lorsqu’une entreprise utilise Mycen Business pour gérer les données de ses propres clients (commandes, réservations, rendez-vous), cette entreprise est responsable de ces données et Mycen les traite pour son compte et selon ses instructions.",
      "Mycen n’a pas d’établissement dans l’Union européenne ni au Royaume-Uni. Pour toute question de protection des données — y compris pour contacter le délégué ou le responsable exigé par la loi de votre pays, comme l’« encarregado » de la LGPD au Brésil ou le responsable des réclamations prévu par la loi indienne — écrivez à **team@mycen.id**.",
    ] },
    { id: "datos", title: "Quelles données nous utilisons", body: [
      { list: [
        "**Votre compte :** nom, e-mail, mot de passe (stocké chiffré, nous ne le voyons jamais), langue, devise, fuseau horaire et date d’acceptation de ces conditions. Si vous activez la validation en deux étapes, aussi la clé de votre application d’authentification (conservée chiffrée par Supabase).",
        "**Noms réservés et empreinte digitale ou visage :** si l’équipe Mycen a réservé votre nom d’utilisateur à votre demande ou à celle de votre agence ou représentant (qui nous fournit ces données si vous n’avez pas encore de compte), nous conservons votre nom, votre e-mail et une note pendant la durée de la réservation, uniquement pour que personne d’autre ne l’utilise. Si vous vous connectez avec votre empreinte ou votre visage, ces données ne quittent jamais votre appareil : Mycen (avec Supabase) ne conserve qu’une clé publique.",
        "**Portfolio (mensurations, audience, marques, presse, crédits et représentation) :** ce sont des informations que vous saisissez vous-même, facultatives, affichées sur votre profil public seulement si vous les remplissez et que le module est visible. Mycen ne les vérifie ni ne les calcule : les chiffres d’audience portent la date que vous avez indiquée et ne s’affichent plus après un an. Vous pouvez les modifier ou les masquer à tout moment.",
        "**Votre profil public :** ce que vous ajoutez dans Studio (nom, photo, textes, liens, projets, carte de contact). Seul ce que vous choisissez de montrer est publié. Chaque photo est régénérée sur votre appareil avant l’envoi : les données cachées qu’elle contient (comme la position GPS ou le modèle de l’appareil photo) sont donc supprimées.",
        "**Life OS :** vos objectifs, habitudes, tâches, finances et notes, y compris les noms que vous saisissez (par exemple, avec qui vous avez partagé une dépense). Ils sont privés : vous seul pouvez les voir. Votre journal aussi : le verrouillage par code PIN, empreinte ou visage fonctionne uniquement sur votre appareil (il n’est pas envoyé à Mycen) et les entrées ne sont pas chiffrées de bout en bout.",
        "**Comment vous vous êtes senti :** si, en clôturant la journée, vous touchez l’un des visages, nous enregistrons cette valeur (de 1 à 5) et la date. Elle peut révéler quelque chose de votre santé : c’est pourquoi elle est facultative, vous seul la voyez et nous ne l’utilisons que pour vous montrer vos propres tendances (par exemple dans Insights et « Votre mois »). Toucher un visage vaut consentement ; vous le retirez en le touchant de nouveau (il est effacé) ou en supprimant Life OS.",
        "**Mycen Business :** les données de votre entreprise et ce que vous ajoutez sur vos clients et ventes.",
        "**Statistiques de visites :** événements pseudonymisés (visites et touches sur votre profil) : au lieu de savoir qui est chaque visiteur, nous utilisons un identifiant qui change chaque jour et ne peut pas être inversé. Nous ne conservons ni adresse IP ni données de l’appareil, et nous ne comptons pas les robots. Nous conservons aussi le site ou le lien d’où vient la visite (par exemple Instagram ou le QR code).",
        "**Signalements :** le motif et le détail rédigés par la personne qui signale, avec un identifiant pseudonymisé qui change chaque jour, pour éviter les abus. Si la personne qui signale est connectée, nous conservons aussi son compte : seule l’équipe Mycen le voit, jamais la personne signalée.",
        "**Messages du formulaire de contact :** le nom, le contact (e-mail ou WhatsApp) et le message laissés par un visiteur. Si le profil a le module Collaborations, une marque indique aussi son entreprise et ce qu’elle recherche et, si elle le souhaite, son site web, un budget et une date limite. Seule la personne propriétaire du profil les voit, dans Studio ; ils ne sont ni publiés ni envoyés par e-mail. Pour éviter les abus, nous utilisons un identifiant pseudonymisé qui change chaque jour, sans IP ni données de l’appareil. Si la personne propriétaire signale un message, nous en gardons une copie pour que l’équipe Mycen l’examine. Si elle bloque un contact (ou le signale), nous enregistrons cet e-mail ou ce téléphone sur son profil pour écarter ce qu’il enverrait à nouveau.",
        "**Abonnements :** si vous vous abonnez via le module « S’abonner » d’un profil, nous conservons votre e-mail (et votre nom, si le profil le demande), la date de votre consentement et votre langue, et nous les transmettons à la personne propriétaire de ce profil, qui les voit dans Studio et peut les exporter. Mycen n’envoie rien à cette liste : la personne propriétaire du profil décide comment l’utiliser et en est responsable. Pour vous désabonner, demandez-le à cette personne ou écrivez à team@mycen.id et nous le supprimons. Pour éviter les abus, nous utilisons un identifiant pseudonymisé qui change chaque jour, sans IP ni données de l’appareil.",
        "**Sondages :** si vous votez dans le sondage d’un profil, nous enregistrons votre choix avec un identifiant pseudonymisé qui change chaque jour (sans IP, sans compte et sans données de l’appareil), pour compter un vote par personne. La personne propriétaire ne voit que les totaux. Votre navigateur se souvient de votre vote, pour vous l’afficher.",
        "**Invitations :** si tu crées ton compte depuis « Crée ton identité » sur le profil de quelqu’un d’autre, nous enregistrons quel profil t’a amené et son type, pour comprendre comment Mycen grandit. Cette personne ne voit pas tes données.",
        "**Utilisation de l’app :** pour savoir si Mycen fonctionne et comment il grandit, nous enregistrons des événements d’utilisation (par exemple, que vous avez publié votre profil, ouvert « Ma journée » ou coché une habitude) avec votre compte, la date et des informations courtes comme la structure choisie ou un nombre de jours. De plus, une fois par jour, nous notons que vous avez utilisé Mycen, depuis quel type d’appareil (navigateur, app installée, iPhone ou Android), dans quelle langue et avec quel fuseau horaire de l’appareil (par exemple, « America/Argentina/Buenos_Aires ») ; jamais votre adresse IP ni votre position exacte. Nous n’enregistrons jamais le contenu de vos tâches, habitudes, notes ou messages. Nous n’utilisons aucun service d’analyse tiers.",
        "**Vérification du compte :** si tu demandes le badge de compte vérifié, nous conservons ton message, le lien que tu nous donnes et notre réponse. Seule l’équipe Mycen les voit, pour examiner la demande ; si elle est acceptée, ton profil affiche le badge.",
        "**Erreurs techniques :** quand quelque chose échoue, nous conservons le message d’erreur, l’écran, la version de Mycen et le navigateur (par exemple « Chrome 128 · Android »), sans IP ni données personnelles, pour pouvoir corriger.",
        "**Notifications avec l’app fermée (web) :** si vous autorisez les notifications de Life OS dans le navigateur, nous conservons l’adresse d’envoi créée par votre navigateur, ses clés de chiffrement, le fuseau horaire et le nom du navigateur (par exemple « Chrome · Android »), pour vous envoyer vos rappels. Elles sont supprimées quand vous désactivez les notifications, quand le navigateur annule l’abonnement ou quand vous supprimez votre compte.",
        "**Protection contre les abus :** pour bloquer les attaques, nous comptons combien de requêtes arrivent de chaque connexion vers les fonctions publiques (visites, messages, votes, signalements). Nous ne conservons pas l’adresse IP : nous la transformons en un code qui ne peut pas être inversé (un hachage avec une clé secrète) et nous l’effaçons au bout de 2 jours.",
        "**Ce que fait l’équipe Mycen :** quand l’équipe suspend un profil, traite un signalement, vérifie un compte ou supprime des fichiers, il est noté qui l’a fait, quand et sur quel compte, pour pouvoir en rendre compte. Ce registre ne peut pas être modifié et est conservé 3 ans.",
      ] },
    ] },
    { id: "para-que", title: "Pourquoi nous les utilisons et sur quelle base", body: [
      { list: [
        "**Fournir le service** que vous avez demandé en créant votre compte : stocker, afficher et synchroniser vos informations (exécution du contrat).",
        "**Enregistrer comment vous vous êtes senti** (les visages de Life OS), seulement si vous le notez : avec votre consentement explicite, que vous retirez quand vous voulez en l’effaçant.",
        "**Vous envoyer des notifications avec l’app fermée**, seulement si vous les autorisez dans votre navigateur ou sur votre téléphone (consentement ; vous le retirez en les désactivant).",
        "**Garder Mycen sûr et fonctionnel :** prévenir les abus, examiner les signalements et corriger les erreurs (intérêt légitime).",
        "**Vous montrer des statistiques** sur votre profil, avec des données pseudonymisées (intérêt légitime).",
        "**Vous envoyer les e-mails nécessaires** concernant votre compte : confirmation, récupération du mot de passe et changements importants (exécution du contrat).",
        "**Éviter l’usurpation d’identité :** examiner les demandes de vérification et réserver les noms de personnalités à leur demande (intérêt légitime).",
        "**Comprendre comment Mycen est utilisé et se développe** (utilisation de l’application et invitations), sans publicité ni tiers (intérêt légitime).",
        "**Rendre des comptes et conserver des preuves** lorsque la loi l’exige, par exemple le registre des actions de l’équipe ou un signalement d’abus sexuels sur mineurs (obligation légale et intérêt légitime).",
        "**Respecter la loi** lorsqu’une autorité compétente l’exige.",
      ] },
      "Lorsque la base est l’intérêt légitime, vous pouvez vous y opposer en nous écrivant et nous cessons le traitement, sauf motifs légitimes impérieux ou nécessité pour une action en justice. Nous ne prenons pas de décisions automatisées produisant des effets juridiques ou d’une importance similaire à votre égard : lorsqu’un outil signale quelque chose (par exemple un lien dangereux), une personne l’examine.",
      "Nous ne vendons pas vos données, nous ne les utilisons pas pour la publicité et il n’y a aucun traceur tiers sur Mycen.",
    ] },
    { id: "publico", title: "Ce qui est public", body: [
      "Votre page publique n’affiche que ce que vous publiez. Les modules masqués, les brouillons et les Spaces non publiés ne sont pas visibles. Les profils publics peuvent apparaître dans les moteurs de recherche ; si vous choisissez la visibilité « non répertorié » ou « privé », ils ne figurent pas dans le plan du site lu par les moteurs.",
    ] },
    { id: "proveedores", title: "Avec qui nous les partageons", body: [
      "Nous faisons appel à des prestataires qui traitent les données uniquement pour fournir le service et sous contrat :",
      { list: [
        "**Supabase :** base de données, connexion et fichiers.",
        "**Vercel :** hébergement de l’application et diffusion des pages.",
        "**Resend :** envoi des e-mails de votre compte.",
        "**Cloudflare (Turnstile) :** la vérification anti-robots de l’inscription, de la connexion et de la récupération du mot de passe. Lorsque vous ouvrez ces écrans, Cloudflare reçoit des données techniques de votre navigateur (comme l’adresse IP) uniquement pour vérifier que vous n’êtes pas un robot.",
        "**Cloudflare R2 :** conserve une sauvegarde quotidienne des photos et des PDF envoyés par les profils, pour pouvoir les récupérer en cas de problème. Ce qui est supprimé dans Mycen reste 30 jours dans cette sauvegarde, puis est effacé.",
        "**Google Web Risk :** nous vérifions avec Google les liens publics des profils et projets publiés, pour repérer les arnaques et les virus. Seul le lien est envoyé ; rien sur vous ni sur vos visiteurs. Si un lien est dangereux, l’équipe Mycen l’examine.",
        "**YouTube, Vimeo, TikTok, Spotify et SoundCloud :** seulement si un profil intègre une vidéo ou un morceau et que vous appuyez sur « Lire ». Aucune connexion avant ; ensuite, leurs propres politiques s’appliquent. Si un profil affiche sa « Dernière vidéo », le serveur de Mycen consulte la liste publique des vidéos de la chaîne YouTube choisie par son propriétaire, sans envoyer aucune de vos données. Lorsque le propriétaire d’un profil colle l’un de ces liens dans Studio, le serveur de Mycen récupère la couverture publique de cette vidéo ou de ce titre et l’enregistre comme une photo de son profil : la page l’affiche ainsi sans vous connecter au fournisseur. Si un profil affiche un podcast, le serveur de Mycen lit le flux RSS public choisi par son propriétaire, sans envoyer aucune de vos données ; quand vous appuyez sur « Écouter », votre navigateur se connecte au service qui héberge ce podcast et ses politiques s’appliquent. Si un profil a plusieurs adresses et que vous appuyez sur « Voir la plus proche », votre navigateur demande l’autorisation d’utiliser votre position : elle sert uniquement sur votre appareil à trier la liste et n’est envoyée ni à Mycen ni à personne.",
        "**Anthropic :** uniquement si une entreprise utilise l’import de son menu depuis un PDF ; ce fichier est traité.",
        "**Mercado Pago :** uniquement si une entreprise le configure pour encaisser ; le paiement se fait sur Mercado Pago.",
        "**Google (connexion) :** uniquement si vous choisissez « Continuer avec Google ». Google nous confirme votre nom, votre email et votre photo ; nous ne recevons jamais votre mot de passe Google et n’accédons à rien d’autre dans votre compte.",
        "**Apple (connexion) :** uniquement si vous choisissez « Continuer avec Apple ». Apple nous confirme votre nom et votre email (ou un email de relais créé par Apple si vous préférez masquer le vôtre) ; nous ne recevons jamais votre mot de passe et n’accédons à rien d’autre dans votre compte.",
        "**Application iOS et Android :** si vous la téléchargez, Apple (App Store) ou Google (Google Play) enregistrent le téléchargement selon leurs propres règles. Dans l’application, les rappels sont programmés sur votre téléphone, sans service de notifications tiers.",
        "**Service de notifications de votre navigateur :** seulement si vous autorisez les notifications de Life OS sur le web. Le rappel (le nom de la tâche ou de l’habitude et son heure) voyage chiffré jusqu’à votre appareil via le service de notifications de votre navigateur : Google (Firebase Cloud Messaging) sur Chrome et Android, Microsoft sur Edge, Apple sur Safari et Mozilla sur Firefox. Ce service voit l’adresse d’envoi mais ne peut pas lire le contenu.",
        "**Google Agenda, Apple ou un autre calendrier :** seulement si vous activez le lien de calendrier de Life OS ; ce service télécharge vos tâches en attente avec une date (titre, date, heure et rappel). Vous pouvez le désactiver ou le changer à tout moment.",
        "**La reconnaissance vocale de votre navigateur :** seulement si vous utilisez « Dicter » dans Life OS. Votre navigateur transforme la voix en texte (dans Chrome, c’est le service vocal de Google ; dans Safari, Apple). Mycen ne reçoit que le texte.",
      ] },
      "En dehors de cela, nous ne partageons des données que si la loi l’exige ou pour protéger les droits et la sécurité des personnes.",
    ] },
    { id: "transferencias", title: "Données hors de votre pays", body: [
      "Mycen est exploité depuis l’Argentine, pays que la Commission européenne reconnaît comme offrant un niveau de protection adéquat. Nos prestataires peuvent stocker ou traiter des données dans d’autres pays, comme les États-Unis ou des pays de l’Union européenne. Dans ce cas, nous utilisons les garanties prévues par la loi : décisions d’adéquation (par exemple le cadre de protection des données UE-États-Unis pour les prestataires adhérents), les clauses contractuelles types de la Commission européenne et du Royaume-Uni, et les clauses types de l’autorité argentine (AAIP). Vous pouvez nous demander plus d’informations ou une copie de ces garanties.",
    ] },
    { id: "plazos", title: "Combien de temps nous les conservons", body: [
      { list: [
        "Les données de votre compte, de votre profil et de Life OS, tant que vous avez le compte. Si vous le supprimez, nous les effaçons, y compris vos photos et PDF ; les sauvegardes des prestataires sont écrasées selon leurs cycles habituels et la sauvegarde quotidienne des photos et PDF garde ce qui a été supprimé pendant 30 jours.",
        "Les statistiques de visites sont conservées pseudonymisées (avec l’identifiant qui change chaque jour) pendant 13 mois —Studio affiche jusqu’à 90 jours— et les votes des sondages tant que le profil existe. Si le profil est supprimé, ils le sont avec lui.",
        "Les messages du formulaire de contact, jusqu’à ce que la personne propriétaire du profil les supprime ou supprime son compte.",
        "Les e-mails d’abonnement, jusqu’à ce que la personne propriétaire du profil les supprime, supprime son compte ou que vous nous demandiez de les supprimer.",
        "Les journaux d’erreurs sont conservés tant qu’ils servent à corriger les problèmes (une erreur résolue reste enregistrée au cas où elle se reproduirait) ; le décompte des personnes concernées, 90 jours.",
        "Les événements d’utilisation de l’app et le relevé des jours où vous avez utilisé Mycen, 25 mois (ensuite ils sont supprimés automatiquement) ; si vous supprimez votre compte avant, ils ne sont plus liés à vous d’aucune façon.",
        "Les notifications du navigateur, jusqu’à ce que vous les désactiviez ou supprimiez votre compte ; le code de connexion servant à bloquer les abus, 2 jours ; les contacts bloqués, jusqu’à ce que la personne propriétaire les débloque ou supprime son profil ; et le registre de ce que fait l’équipe Mycen, 3 ans.",
        "Les signalements, tant que le profil signalé existe (ils sont supprimés avec lui) ; les demandes de vérification et les invitations, tant que le compte existe ; les noms réservés, pendant la durée de la réservation ; et les liens signalés comme dangereux, 13 mois.",
        "Ce que la loi oblige à conserver (par exemple les données de facturation ou les preuves demandées par une autorité en cas d’abus sexuels sur mineurs), pendant la durée qu’elle fixe, bloqué pour tout autre usage et même si la suppression est demandée.",
      ] },
    ] },
    { id: "dispositivo", title: "Ce qui est stocké sur votre appareil", body: [
      "Mycen n’utilise pas de cookies publicitaires ni de suivi. Dans votre navigateur, nous ne conservons que le nécessaire au fonctionnement : votre session, votre langue et quelques brouillons et préférences. Vous pouvez l’effacer dans les réglages du navigateur (vous devrez vous reconnecter). Si vous saisissez quelque chose dans Life OS hors connexion, cela reste sur votre appareil jusqu’à l’envoi (uniquement avec votre session). Pour le code PIN du journal, nous ne gardons qu’une empreinte chiffrée (hash), jamais le code. C’est pourquoi nous n’affichons pas de bandeau cookies : nous n’utilisons que le strict nécessaire, que la loi autorise sans demander de consentement.",
    ] },
    { id: "seguridad", title: "Sécurité", body: [
      "Nous utilisons des connexions chiffrées, des mots de passe stockés de façon chiffrée, la vérification en deux étapes pour l’équipe et des autorisations dans la base de données pour que chacun ne voie que ses propres données. Aucun système n’est parfait : si une violation pouvait porter atteinte à vos droits, nous prévenons l’autorité compétente (dans l’Union européenne, dans les 72 heures) et, si le risque est élevé, vous aussi, sans délai.",
    ] },
    { id: "derechos", title: "Vos droits", body: [
      "Vous pouvez demander à accéder à vos données, à les rectifier, à les effacer, à les emporter (portabilité), à vous opposer à certains usages ou à les limiter, et à retirer un consentement donné, sans que cela affecte ce qui a été fait auparavant. Beaucoup de choses se font directement depuis Studio → Paramètres (télécharger vos données, supprimer votre compte) ou Life OS → Paramètres → Vos données. Pour le reste, écrivez à **team@mycen.id** ; pour protéger votre compte, nous pouvons vous demander de confirmer qu’il s’agit bien de vous (par exemple en écrivant depuis l’e-mail du compte). C’est gratuit.",
      "Nous répondons dans les délais légaux (en Argentine, 10 jours calendaires pour l’accès et 5 jours ouvrables pour rectifier ou effacer ; dans l’Union européenne, un mois). Vous pouvez aussi déposer une plainte auprès de l’autorité de protection des données : en Argentine, l’**Agencia de Acceso a la Información Pública (AAIP)** ; dans l’Union européenne, l’autorité de votre pays (en France, la **CNIL**) ; au Brésil, l’**ANPD**.",
    ] },
    { id: "segun-pais", title: "Selon votre lieu de résidence", body: [
      "En plus de ce qui précède :",
      { list: [
        "**Union européenne, Espace économique européen, Royaume-Uni et Suisse :** nous répondons dans un délai d’un mois (deux de plus si la demande est complexe, et nous vous prévenons). Vous pouvez introduire une réclamation auprès de l’autorité de protection des données de votre pays (en France, la CNIL).",
        "**Brésil (LGPD) :** vous pouvez aussi demander avec quelles entreprises nous partageons vos données et demander le réexamen d’une décision automatisée. Autorité : l’**ANPD**.",
        "**États-Unis (Californie et États dotés de lois sur la vie privée, comme la Virginie, le Colorado, le Connecticut ou le Texas) :** vous pouvez savoir quelles données nous détenons — identifiants comme votre nom et votre e-mail, ce que vous publiez, données d’utilisation de l’application et, seulement si vous le notez, votre humeur, une donnée sensible que nous utilisons uniquement pour vous la montrer —, demander leur rectification ou leur suppression et les emporter. Nous ne vendons ni ne partageons vos données à des fins publicitaires, il n’y a donc rien à refuser ; nous respectons tout de même le signal Global Privacy Control. Vous pouvez agir par l’intermédiaire d’un mandataire autorisé et nous ne vous traiterons pas différemment parce que vous exercez vos droits. Si nous refusons une demande, vous pouvez faire appel en répondant avec l’objet « Appel » et, si vous n’êtes toujours pas d’accord, saisir le procureur général de votre État.",
        "**Canada, Australie, Japon et Corée du Sud :** vous pouvez accéder à vos données, les corriger et retirer votre consentement. Vous pouvez porter plainte auprès du Commissariat à la protection de la vie privée du Canada, de l’OAIC en Australie, de la PPC au Japon ou de la PIPC en Corée.",
        "**Inde (DPDP) :** vous pouvez accéder à vos données, les corriger et les effacer, et désigner une personne qui exercera vos droits si vous ne pouvez pas le faire. Les réclamations sont d’abord adressées à nous (team@mycen.id), puis au Data Protection Board of India.",
        "**Corée du Sud et Chine continentale :** comme Mycen n’y a pas de serveurs, lors de l’inscription nous demandons un consentement distinct pour stocker et traiter vos données hors du pays, en précisant quelles données sortent, vers quels prestataires et pays (ceux de « Données hors de votre pays »), dans quel but et pour combien de temps. Vous pouvez le retirer à tout moment en supprimant votre compte. En Corée, vous pouvez saisir la PIPC et, en Chine, l’Administration du cyberespace (CAC).",
        "**Autres pays :** nous vous accordons les droits que vous reconnaît la loi de votre pays ; écrivez-nous et nous vous aiderons.",
      ] },
    ] },
    { id: "menores", title: "Mineurs", body: [
      "Mycen ne s’adresse pas aux enfants de moins de 13 ans, ni aux personnes n’ayant pas l’âge plus élevé exigé par la loi de leur pays pour utiliser un tel service sans consentement parental (par exemple 14 ans en Corée du Sud et en Chine, et jusqu’à 16 ans dans certains pays de l’Union européenne). Nous ne collectons pas sciemment de données concernant des personnes n’ayant pas cet âge : si nous apprenons qu’un compte appartient à une telle personne, nous le supprimons avec ses données. Si vous êtes parent ou tuteur et pensez que c’est le cas, écrivez à **team@mycen.id**.",
      "Si vous avez moins de 18 ans, n’oubliez pas que tout le monde peut voir votre profil public : ne publiez pas votre adresse, votre école ni des informations permettant de vous localiser. Dans les Paramètres, vous pouvez choisir « Seulement avec le lien » ou « Privé ».",
    ] },
    { id: "cambios", title: "Modifications de cette politique", body: [
      "Si nous modifions cette politique de manière importante, nous vous prévenons par e-mail ou dans Mycen avant son application. La date de la dernière mise à jour figure toujours en haut.",
    ] },
  ],
}

export default fr
