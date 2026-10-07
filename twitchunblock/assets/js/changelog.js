// ═══════════════════════════════════════════════════════════════════════════
//  Nouveautés du site, de la plus récente à la plus ancienne. La clé suit
//  SITE_VERSION (usage.js) : à chaque nouvelle version, ajouter une entrée
//  en tête. Le site montre celles qu'on n'a pas encore vues.
// ═══════════════════════════════════════════════════════════════════════════

export const CHANGELOG = [
  {
    version: '2026.10.06b',
    items: {
      fr: [
        'Accueil : nouvel onglet « Hors ligne » pour tes chaînes suivies hors ligne ; « Suivies » ne montre plus que les lives.',
        'Page d’une chaîne : l’onglet « Supprimées » passe juste après les VODs.',
        'Nouvelle visite guidée interactive, qui montre les vrais boutons du site (Réglages > Revoir le tutoriel).',
        'Réglages : le « Journal des modifications » affiche toutes les nouveautés depuis le début.',
      ],
      en: [
        'Home: new “Offline” tab for your offline followed channels; “Following” now only shows who is live.',
        'Channel page: the “Deleted” tab now comes right after VODs.',
        'New interactive guided tour that points at the real buttons of the site (Settings > Replay the tutorial).',
        'Settings: the “Changelog” lists every update since the beginning.',
      ],
      es: [
        'Inicio: nueva pestaña «Desconectados» para tus canales seguidos sin directo; «Seguidos» ya solo muestra los directos.',
        'Página de un canal: la pestaña «Eliminados» va justo después de los VODs.',
        'Nueva visita guiada interactiva, que señala los botones reales del sitio (Ajustes > Ver el tutorial otra vez).',
        'Ajustes: el «Registro de cambios» muestra todas las novedades desde el principio.',
      ],
    },
  },
  {
    version: '2026.10.06',
    items: {
      fr: [
        'Nouvel onglet « Supprimées » sur la page d’une chaîne : récupère les VODs récemment supprimées, tant que Twitch sert encore leurs segments.',
      ],
      en: [
        'New “Deleted” tab on a channel page: recover recently deleted VODs, while Twitch still serves their segments.',
      ],
      es: [
        'Nueva pestaña «Eliminados» en la página de un canal: recupera VODs borrados recientemente, mientras Twitch siga sirviendo sus segmentos.',
      ],
    },
  },
  {
    version: '2026.10.05c',
    items: {
      fr: [
        'Barre de lecture des VODs : en la faisant glisser, le compteur affiche l’instant visé, et au doigt l’infobulle passe au-dessus du pouce.',
        'Réglages : lignes régulièrement espacées dans « À propos ».',
      ],
      en: [
        'VOD seek bar: while dragging, the time display shows where you are seeking to, and on touch screens the tooltip sits above your thumb.',
        'Settings: evenly spaced rows in “About”.',
      ],
      es: [
        'Barra de reproducción de los VODs: al deslizarla, el contador muestra el instante elegido y, en pantallas táctiles, la etiqueta queda por encima del pulgar.',
        'Ajustes: filas espaciadas de forma regular en «Acerca de».',
      ],
    },
  },
  {
    version: '2026.10.05',
    items: {
      fr: [
        'Page streamer en onglets : VODs, Highlights, Playlists et Clips.',
        'Sauvegarde : exporte et importe tes chaînes suivies, catégories et réglages (Réglages > Sauvegarde), compatible avec l’app iOS.',
        'Nouvelle option : désactiver la pause au clic sur la vidéo (Réglages > Lecteur).',
        '« Hors ligne depuis » dans ta langue, avec la date du dernier live — aussi pour chaque chaîne hors ligne de l’accueil.',
      ],
      en: [
        'Streamer page in tabs: VODs, Highlights, Playlists and Clips.',
        'Backup: export and import your followed channels, categories and settings (Settings > Backup), compatible with the iOS app.',
        'New option: turn off click-to-pause on the video (Settings > Player).',
        '“Offline for” now uses your language and shows the date of the last stream — also for each offline channel on Home.',
      ],
      es: [
        'Página del streamer en pestañas: VODs, Destacados, Listas y Clips.',
        'Copia de seguridad: exporta e importa tus canales seguidos, categorías y ajustes (Ajustes > Copia de seguridad), compatible con la app iOS.',
        'Nueva opción: desactivar la pausa al hacer clic en el vídeo (Ajustes > Reproductor).',
        '«Desconectado hace» en tu idioma, con la fecha del último directo — también para cada canal desconectado en Inicio.',
      ],
    },
  },
  {
    version: '2026.10.04c',
    items: {
      fr: [
        'Playlists des chaînes : nouvelle section sur la page streamer, avec « Tout lire » qui enchaîne les vidéos.',
        'Les highlights (vidéos des playlists) se lancent même quand Twitch refuse le jeton de lecture.',
        'Une VOD indisponible affiche « VOD introuvable » au lieu d’une fausse erreur réseau.',
      ],
      en: [
        'Channel playlists: new section on the streamer page, with “Play all” to chain the videos.',
        'Highlights (playlist videos) now play even when Twitch refuses the playback token.',
        'An unavailable VOD now says so instead of showing a misleading network error.',
      ],
      es: [
        'Listas de los canales: nueva sección en la página del streamer, con «Reproducir todo» para encadenar los vídeos.',
        'Los highlights (vídeos de las listas) se reproducen aunque Twitch rechace el token de reproducción.',
        'Un VOD no disponible lo indica en lugar de mostrar un falso error de red.',
      ],
    },
  },
  {
    version: '2026.10.04b',
    items: {
      fr: [
        'Nouvel onglet Catégories : toutes les catégories, recherche, et tes catégories suivies (bouton « Suivre »).',
        'Accueil en deux onglets : « Chaînes suivies » et « Top des lives ».',
        'Les chaînes suivies hors ligne sont listées : un clic ouvre leur page (VODs, clips).',
        'Dans le lecteur, cliquer sur le pseudo ouvre la page de la chaîne.',
      ],
      en: [
        'New Categories tab: all categories, search, and your followed categories (“Follow” button).',
        'Home split into two tabs: “Followed channels” and “Top streams”.',
        'Offline followed channels are listed: one click opens their page (VODs, clips).',
        'In the player, clicking the streamer name opens their channel page.',
      ],
      es: [
        'Nueva pestaña Categorías: todas las categorías, búsqueda y tus categorías seguidas (botón «Seguir»).',
        'Inicio en dos pestañas: «Canales seguidos» y «Top de directos».',
        'Los canales seguidos desconectados aparecen en una lista: un clic abre su página (VODs, clips).',
        'En el reproductor, hacer clic en el nombre del streamer abre su canal.',
      ],
    },
  },
  {
    version: '2026.10.04',
    items: {
      fr: [
        'Suis des chaînes sans compte Twitch : bouton « Suivre » sur leur page, elles arrivent dans « Chaînes suivies ».',
        'Accueil en liste façon Twitch ou en grille (bouton à côté de « Chaînes suivies »).',
        'Commandes des bots (Nightbot, StreamElements, Fossabot, Moobot) depuis l’en-tête du chat.',
        'Le message épinglé déplié s’affiche par-dessus le chat au lieu de le pousser.',
        'Réactions aux annonces, et cette fenêtre des nouveautés.',
      ],
      en: [
        'Follow channels without a Twitch account: “Follow” button on their page, they show up in “Followed channels”.',
        'Home as a Twitch-style list or a grid (button next to “Followed channels”).',
        'Bot commands (Nightbot, StreamElements, Fossabot, Moobot) from the chat header.',
        'An expanded pinned message now opens over the chat instead of pushing it down.',
        'React to announcements, and this “What’s new” window.',
      ],
      es: [
        'Sigue canales sin cuenta de Twitch: botón «Seguir» en su página, aparecen en «Canales seguidos».',
        'Inicio en lista al estilo Twitch o en cuadrícula (botón junto a «Canales seguidos»).',
        'Comandos de bots (Nightbot, StreamElements, Fossabot, Moobot) desde la cabecera del chat.',
        'El mensaje fijado desplegado se abre sobre el chat en lugar de empujarlo.',
        'Reacciones a los anuncios, y esta ventana de novedades.',
      ],
    },
  },
  {
    version: '2026.10.03',
    items: {
      fr: [
        'Annonces du développeur en haut de l’accueil.',
        'Top des lives dans la langue de ton appareil, réglable dans les réglages.',
        'Page /stats publique (français, anglais, espagnol).',
        'Lien vers le Discord dans le pied de page et les réglages.',
      ],
      en: [
        'Developer announcements at the top of the home page.',
        'Top streams in your device language, adjustable in settings.',
        'Public /stats page (English, French, Spanish).',
        'Discord link in the footer and settings.',
      ],
      es: [
        'Anuncios del desarrollador arriba del inicio.',
        'Top de directos en el idioma de tu dispositivo, ajustable en los ajustes.',
        'Página pública /stats (español, inglés, francés).',
        'Enlace al Discord en el pie de página y los ajustes.',
      ],
    },
  },
]
