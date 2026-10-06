import type { LegalDict } from './es'
import es from './es'

const fr: LegalDict = {
  ui: {
    termsTitle: 'Conditions générales',
    privacyTitle: 'Politique de confidentialité',
    termsIntro: 'En créant un compte ou en utilisant Mycen, vous acceptez ces conditions. Elles sont écrites pour être comprises.',
    privacyIntro: 'Quelles données nous utilisons, pourquoi, avec qui nous les partageons et quel contrôle vous avez.',
    updated: 'Dernière mise à jour',
    contents: 'Sommaire',
    reference: 'La version espagnole fait foi. Les traductions sont fournies pour votre confort ; en cas de différence, le texte espagnol prévaut.',
    seeOther: { terms: 'Politique de confidentialité', privacy: 'Conditions générales' },
    language: 'Langue',
    back: 'Retour à Mycen',
  },
  updated: es.updated,
  terms: [
    { id: 'quien', title: 'Qui fournit le service', body: [
      'Mycen est un service exploité par **Resilio**, domicilié en République argentine. Vous pouvez nous écrire à **team@mycen.id**.',
      'Mycen vous permet de créer une identité numérique publique (Mycen Identity), de la gérer depuis Mycen Studio, d’organiser votre vie personnelle dans Life OS et, si vous avez une entreprise, de la gérer avec Mycen Business.',
    ] },
    { id: 'edad', title: 'Qui peut utiliser Mycen', body: [
      'Vous devez avoir au moins **13 ans**. Si, dans votre pays, l’âge minimum pour accepter ces conditions ou pour le traitement de vos données est plus élevé (par exemple 15 ou 16 ans dans certains pays de l’Union européenne), vous devez avoir cet âge ou l’autorisation de votre parent ou tuteur.',
      'Pour utiliser Mycen Business au nom d’une entreprise, vous devez être majeur et autorisé à la représenter.',
    ] },
    { id: 'cuenta', title: 'Votre compte', body: [
      'Vous êtes responsable de la sécurité de votre mot de passe et de ce qui se passe sur votre compte. Les données que vous ajoutez doivent être exactes et vous appartenir, ou vous devez avoir l’autorisation de les utiliser.',
      'Si vous remarquez une utilisation que vous n’avez pas autorisée, changez votre mot de passe et écrivez-nous.',
    ] },
    { id: 'contenido', title: 'Votre contenu', body: [
      'Ce que vous publiez reste à vous. Vous nous accordez une autorisation gratuite et mondiale de le stocker, de l’afficher à votre adresse publique et de l’adapter techniquement (par exemple, réduire des images) tant qu’il est publié. Vous pouvez le modifier, le masquer, le dépublier ou le supprimer quand vous voulez.',
      'Ce que vous publiez doit respecter les règles de contenu. Nous pouvons masquer ou suspendre ce qui ne les respecte pas.',
    ] },
    { id: 'reglas', title: 'Règles de contenu', body: [
      'Il est interdit de publier sur Mycen :',
      { list: [
        '**Spam ou publicité trompeuse :** fausses promesses, liens qui ne mènent pas là où ils le disent ou faux avis.',
        '**Arnaques ou fraude :** demander de l’argent ou des données par la tromperie, vendre ce qui n’existe pas.',
        '**Usurpation d’identité :** se faire passer pour une autre personne, entreprise ou marque.',
        '**Haine ou harcèlement :** attaquer des personnes ou des groupes pour ce qu’ils sont, ou harceler quelqu’un.',
        '**Violence ou menaces :** menacer, inciter à la violence ou la montrer gratuitement.',
        '**Contenu sexuel explicite**, et tout contenu sexuel impliquant des mineurs (signalé aux autorités).',
        '**Tout ce qui est illégal :** produits ou services interdits, ou contenu portant atteinte aux droits d’autrui (marques, photos, textes).',
        '**Liens malveillants :** virus, hameçonnage ou sites trompeurs.',
      ] },
      'Toute personne peut signaler un profil ou un projet avec le lien « Signaler » en bas de la page, sans compte et anonymement. Nous examinons chaque signalement. Si un profil enfreint les règles, nous le suspendons : il n’est plus visible (page, projets et carte de contact) et son propriétaire voit le motif dans Studio. Si vous pensez qu’il s’agit d’une erreur, écrivez-nous depuis le compte avec lequel vous l’avez créé et nous le réexaminerons.',
    ] },
    { id: 'derechos-de-autor', title: 'Droits d’auteur et marques', body: [
      'Si vous pensez qu’un contenu publié sur Mycen utilise votre œuvre ou votre marque sans autorisation, écrivez à **team@mycen.id** en indiquant : vos coordonnées, l’œuvre ou la marque qui vous appartient, l’adresse exacte du contenu sur Mycen et une déclaration attestant que les informations sont exactes et que vous êtes titulaire des droits ou agissez en son nom.',
      'Si la réclamation est fondée, nous retirons ou bloquons le contenu et prévenons la personne qui l’a publié, qui peut répondre. Quiconque publie à plusieurs reprises le contenu d’autrui sans autorisation peut perdre son compte.',
    ] },
    { id: 'usernames', title: 'Noms d’utilisateur', body: [
      'Certains noms sont réservés. Il est interdit d’enregistrer des noms pour se faire passer pour une autre personne ou une marque, ou pour les revendre ; dans ces cas, nous pouvons les récupérer. Si vous changez de nom d’utilisateur, l’ancienne adresse redirige vers la nouvelle pour que vos liens et QR codes continuent de fonctionner.',
    ] },
    { id: 'pagos', title: 'Formules payantes de Mycen Business', body: [
      'Votre identité, Studio et Life OS sont gratuits. Les formules Mycen Business ont le prix affiché lors de la souscription, en dollars américains (US$), plus les taxes applicables dans votre pays.',
      'Il n’y a pas d’engagement : vous pouvez résilier quand vous voulez et la formule reste active jusqu’à la fin de la période payée. Si nous changeons un prix, nous vous prévenons à l’avance et le changement s’applique à partir de la période suivante. Si vous êtes consommateur, vous conservez les droits que vous donne la loi de votre pays, comme le droit de rétractation pour les achats à distance.',
    ] },
    { id: 'servicio', title: 'Le service', body: [
      'Nous travaillons pour que Mycen fonctionne toujours bien, mais il peut y avoir des interruptions, des erreurs ou des changements. Les fonctionnalités peuvent évoluer, s’améliorer ou cesser d’être disponibles ; si quelque chose d’important change, nous vous prévenons à l’avance dans la mesure du possible.',
      'Dans les limites permises par la loi, Mycen est fourni « en l’état » et nous ne sommes pas responsables des dommages indirects ni des pertes de profits liés à l’utilisation du service. Rien de ceci ne limite les droits que la loi de votre pays ne permet pas de limiter, comme les droits des consommateurs.',
    ] },
    { id: 'baja', title: 'Clôture et suspension', body: [
      'Vous pouvez supprimer votre compte à tout moment depuis Studio → Réglages, et télécharger d’abord une copie de vos données. Les comptes avec une entreprise active sur Mycen Business sont clôturés via le support, car ils impliquent des données de clients et de ventes.',
      'Nous pouvons suspendre ou fermer les comptes qui enfreignent ces conditions ou la loi, ou qui mettent en danger d’autres personnes ou le service. Dans la mesure du possible, nous vous prévenons et vous expliquons pourquoi.',
    ] },
    { id: 'cambios', title: 'Modifications de ces conditions', body: [
      'Si nous modifions ces conditions de manière importante, nous vous prévenons par e-mail ou dans Mycen avant leur entrée en vigueur. Si vous n’êtes pas d’accord, vous pouvez cesser d’utiliser le service et supprimer votre compte.',
    ] },
    { id: 'ley', title: 'Droit applicable', body: [
      'Ces conditions sont régies par les lois de la République argentine. Si vous utilisez Mycen en tant que consommateur depuis un autre pays, vous êtes aussi protégé par les règles impératives de votre pays et pouvez saisir les tribunaux de votre domicile.',
      'Avant toute réclamation, écrivez-nous à **team@mycen.id** : presque tout se règle en discutant.',
    ] },
  ],
  privacy: [
    { id: 'responsable', title: 'Qui est responsable de vos données', body: [
      'Le responsable du traitement est **Resilio**, domicilié en République argentine, qui exploite Mycen. Pour toute question sur vos données, écrivez à **team@mycen.id**.',
      'Lorsqu’une entreprise utilise Mycen Business pour gérer les données de ses propres clients (commandes, réservations, rendez-vous), cette entreprise est responsable de ces données et Mycen les traite pour son compte et selon ses instructions.',
    ] },
    { id: 'datos', title: 'Quelles données nous utilisons', body: [
      { list: [
        '**Votre compte :** nom, e-mail, mot de passe (stocké chiffré, nous ne le voyons jamais), langue, devise, fuseau horaire et date d’acceptation de ces conditions.',
        '**Votre profil public :** ce que vous ajoutez dans Studio (nom, photo, textes, liens, projets, carte de contact). Seul ce que vous choisissez d’afficher est publié.',
        '**Life OS :** vos objectifs, habitudes, tâches, finances et notes. Ils sont privés : vous seul pouvez les voir.',
        '**Mycen Business :** les données de votre entreprise et ce que vous ajoutez sur vos clients et ventes.',
        '**Statistiques de visites :** événements anonymes (visites et clics sur votre profil) avec un identifiant qui change chaque jour. Nous ne conservons ni adresses IP ni données de l’appareil, et nous ne comptons pas les robots.',
        '**Signalements :** le motif et le détail écrits par la personne qui signale, avec un identifiant anonyme quotidien pour éviter les abus.',
        '**Erreurs techniques :** quand quelque chose échoue, nous conservons le message d’erreur, l’écran, la version de Mycen et le navigateur (par exemple « Chrome 128 · Android »), sans IP ni données personnelles, pour pouvoir corriger.',
      ] },
    ] },
    { id: 'para-que', title: 'Pourquoi nous les utilisons et sur quelle base', body: [
      { list: [
        '**Fournir le service** que vous avez demandé en créant votre compte : stocker, afficher et synchroniser vos informations (exécution du contrat).',
        '**Garder Mycen sûr et fonctionnel :** prévenir les abus, examiner les signalements et corriger les erreurs (intérêt légitime).',
        '**Vous montrer des statistiques** sur votre profil, de façon anonyme (intérêt légitime).',
        '**Vous envoyer les e-mails nécessaires** sur votre compte : confirmation, récupération du mot de passe et changements importants.',
        '**Respecter la loi** lorsqu’une autorité compétente l’exige.',
      ] },
      'Nous ne vendons pas vos données, nous ne les utilisons pas pour la publicité et il n’y a aucun traceur tiers sur Mycen.',
    ] },
    { id: 'publico', title: 'Ce qui est public', body: [
      'Votre page publique n’affiche que ce que vous publiez. Les modules masqués, les brouillons et les Spaces non publiés ne sont pas visibles. Les profils publics peuvent apparaître dans les moteurs de recherche ; si vous choisissez la visibilité « non répertorié » ou « privé », ils ne figurent pas dans le plan du site lu par les moteurs.',
    ] },
    { id: 'proveedores', title: 'Avec qui nous les partageons', body: [
      'Nous faisons appel à des prestataires qui traitent les données uniquement pour fournir le service et sous contrat :',
      { list: [
        '**Supabase :** base de données, connexion et fichiers.',
        '**Vercel :** hébergement de l’application et diffusion des pages.',
        '**Resend :** envoi des e-mails de votre compte.',
        '**Anthropic :** uniquement si une entreprise utilise l’import de son menu depuis un PDF ; ce fichier est traité.',
        '**Mercado Pago :** uniquement si une entreprise le configure pour encaisser ; le paiement se fait sur Mercado Pago.',
      ] },
      'En dehors de cela, nous ne partageons des données que si la loi l’exige ou pour protéger les droits et la sécurité des personnes.',
    ] },
    { id: 'transferencias', title: 'Données hors de votre pays', body: [
      'Nos prestataires peuvent stocker ou traiter des données sur des serveurs situés dans d’autres pays, comme les États-Unis ou des pays de l’Union européenne. Dans ce cas, nous utilisons les garanties prévues par la loi, comme des clauses contractuelles approuvées par les autorités de protection des données, pour assurer un niveau de protection adéquat.',
    ] },
    { id: 'plazos', title: 'Combien de temps nous les conservons', body: [
      { list: [
        'Les données de votre compte, de votre profil et de Life OS, tant que vous avez le compte. Si vous le supprimez, nous les effaçons ; les sauvegardes des prestataires sont écrasées selon leurs cycles habituels.',
        'Les statistiques de visites sont conservées agrégées et anonymes.',
        'Les journaux d’erreurs sont conservés jusqu’à leur résolution ; le décompte des personnes concernées, 90 jours.',
        'Ce que la loi oblige à conserver (par exemple, les données de facturation), pendant la durée qu’elle fixe.',
      ] },
    ] },
    { id: 'dispositivo', title: 'Ce qui est stocké sur votre appareil', body: [
      'Mycen n’utilise pas de cookies publicitaires ni de suivi. Dans votre navigateur, nous ne conservons que le nécessaire au fonctionnement : votre session, votre langue et quelques brouillons et préférences. Vous pouvez l’effacer dans les réglages du navigateur (vous devrez vous reconnecter).',
    ] },
    { id: 'seguridad', title: 'Sécurité', body: [
      'Nous utilisons des connexions chiffrées, des mots de passe stockés chiffrés et des permissions dans la base de données pour que chaque personne ne voie que ce qui lui appartient. Aucun système n’est parfait : si un incident touchait vos données, nous vous préviendrions et agirions comme la loi l’exige.',
    ] },
    { id: 'derechos', title: 'Vos droits', body: [
      'Vous pouvez demander à accéder à vos données, à les rectifier, à les effacer, à les emporter (portabilité), à vous opposer à certains usages ou à les limiter, et à retirer un consentement donné. Vous pouvez faire beaucoup de choses directement depuis Studio → Réglages (télécharger vos données, supprimer votre compte) ou depuis Life OS → Réglages → Vos données. Pour le reste, écrivez à **team@mycen.id** depuis l’e-mail de votre compte.',
      'Nous répondons dans les délais légaux (en Argentine, 10 jours calendaires pour l’accès et 5 jours ouvrables pour rectifier ou effacer ; dans l’Union européenne, un mois). Vous pouvez aussi déposer une plainte auprès de l’autorité de protection des données : en Argentine, l’**Agencia de Acceso a la Información Pública (AAIP)** ; dans l’Union européenne, l’autorité de votre pays (en France, la **CNIL**) ; au Brésil, l’**ANPD**.',
      'Si vous vivez en Californie : nous ne vendons ni ne partageons vos données personnelles à des fins publicitaires, et nous ne vous traiterons pas différemment parce que vous exercez vos droits.',
    ] },
    { id: 'menores', title: 'Mineurs', body: [
      'Mycen ne s’adresse pas aux moins de 13 ans. Si nous apprenons qu’un compte appartient à une personne n’ayant pas cet âge (ou celui fixé par la loi de son pays) sans autorisation, nous le supprimons. Si vous êtes parent ou tuteur et pensez que c’est le cas, écrivez-nous.',
    ] },
    { id: 'cambios', title: 'Modifications de cette politique', body: [
      'Si nous modifions cette politique de manière importante, nous vous prévenons par e-mail ou dans Mycen avant son application. La date de la dernière mise à jour figure toujours en haut.',
    ] },
  ],
}

export default fr
