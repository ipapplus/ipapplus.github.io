// ═══════════════════════════════════════════════════════════════════════════
//  Traductions. Une clé absente d'une langue retombe sur l'anglais, puis sur
//  la clé elle-même : un oubli se voit sans rien casser.
// ═══════════════════════════════════════════════════════════════════════════

const STRINGS = {
  fr: {
    nav_discover: 'Découvrir', nav_channel: 'Streamer', nav_link: 'Lien / ID',
    tagline: 'Les lives et VODs Twitch, sans abonnement.',
    login: 'Se connecter avec Twitch', logout: 'Déconnexion',
    login_prompt: 'Connecte-toi pour retrouver tes chaînes suivies et synchroniser ton historique entre tes appareils.',
    followed: 'Chaînes suivies', top: 'Top des lives', top_fr: 'France', top_world: 'Monde', announcement_open: 'Ouvrir', whats_new: 'Nouveautés', nav_categories: 'Catégories', cat_followed: 'Suivies', cat_all: 'Toutes', cat_search_ph: 'Chercher une catégorie', cat_followed_empty_web: 'Aucune catégorie suivie. Ouvre une catégorie et clique sur « Suivre ».', offline_channels: 'Hors ligne', load_more: 'Charger plus', no_result: 'Aucun résultat', back: 'Retour', got_it: 'Compris', replay_tutorial: 'Revoir le tutoriel', next: 'Suivant', follow: 'Suivre', following: 'Suivi', on_this_device: 'sur cet appareil', follow_local_sub: 'Sans compte Twitch : la chaîne apparaît dans « Chaînes suivies » dès qu’elle est en live.', layout_grid: 'Afficher en grille', layout_list: 'Afficher en liste', home_list: 'Accueil en liste', home_list_sub: 'Chaînes en liste comme sur Twitch (miniature à gauche) au lieu de la grille.', login_optional: 'Facultatif : connecte-toi pour tes chaînes suivies Twitch et le chat.', login_prompt_local: 'Connecte-toi pour retrouver tes chaînes suivies, ou suis des chaînes sans compte : bouton « Suivre » sur leur page.', bot_commands: 'Commandes des bots', bot_commands_filter: 'Filtrer les commandes', bot_commands_none: 'Aucune commande trouvée (Nightbot, StreamElements, Fossabot, Moobot).', react: 'Réagir', react_failed: 'Réaction non envoyée, réessaie plus tard', top_lang: 'Top des lives', top_lang_sub: 'Langue des streamers dans « Top des lives ». Par défaut celle de ton appareil ({l}).',
    continue_watching: 'Reprendre', recent_channels: 'Streamers récents', clear_all: 'Tout effacer',
    refresh: 'Actualiser', loading: 'Chargement…', err_loading: 'Impossible de charger.',
    no_live_followed: 'Aucune de tes chaînes n’est en live pour l’instant.',
    no_live: 'Aucun live pour le moment.',
    login_required_top: 'Connecte-toi pour afficher le top des lives.',
    session_expired: 'Session expirée, reconnecte-toi.',
    search_channel_ph: 'Nom du streamer, puis un mot-clé (ex : squeezie horreur)',
    search: 'Chercher', not_found: 'Streamer introuvable.',
    live_now: 'En direct', offline: 'Hors ligne', offline_since: 'Hors ligne depuis {t}',
    watch_live: 'Regarder le live', vods: 'Rediffusions', no_vod: 'Aucune VOD trouvée.',
    filter_none: 'Aucune VOD ne contient « {k} » dans les 100 dernières.',
    filter_count: '{n} VOD(s) pour « {k} »',
    link_title: 'Ouvrir une VOD', link_desc: 'Colle un lien twitch.tv/videos/… ou un identifiant.',
    link_ph: 'https://www.twitch.tv/videos/123456789', link_open: 'Ouvrir',
    invalid_id: 'Identifiant de VOD invalide.',
    loading_vod: 'Chargement de la VOD…', loading_live: 'Connexion au live…',
    err_vod: 'Cette VOD est indisponible.', err_live: 'Ce live est indisponible.', err_network: 'Erreur réseau.',
    viewers: 'spectateurs', latency: 'latence',
    quality: 'Qualité', speed: 'Vitesse', normal: 'Normale', auto: 'Auto',
    go_live: 'Revenir au direct', chat: 'Chat', pip: 'Image dans l’image',
    fullscreen: 'Plein écran', exit_fullscreen: 'Quitter le plein écran',
    play: 'Lecture', pause: 'Pause', mute: 'Couper le son', unmute: 'Rétablir le son',
    back10: 'Reculer de 10 s', fwd10: 'Avancer de 10 s', minimize: 'Réduire', close: 'Fermer',
    open_in: 'Ouvrir dans…', copy_link: 'Copier le lien du flux', download_m3u: 'Télécharger le .m3u',
    copied: 'Lien copié.', see_vods: 'Voir les VODs', resume_at: 'Reprise à {t}',
    // Chat
    chat_connecting: 'Connexion au chat…', chat_connected: 'Bienvenue dans le chat !',
    chat_disconnected: 'Chat déconnecté, reconnexion…',
    chat_send_ph: 'Envoyer un message', chat_readonly: 'Connecte-toi pour écrire',
    chat_rescope: 'Reconnecte-toi pour pouvoir écrire',
    chat_paused: 'Chat en pause', chat_new: '{n} nouveaux messages',
    chat_vod: 'Chat de la rediffusion', chat_vod_empty: 'Aucun message à ce moment de la VOD.',
    chat_history: 'Messages précédents', emotes: 'Emotes', emotes_channel: 'Cette chaîne', emotes_global: 'Globales',
    emote_search_ph: 'Chercher une emote', user_messages: 'Ses messages', mention: 'Mentionner', reply: 'Répondre',
    deleted: 'message supprimé', first_msg: 'Premier message', reply_to: 'En réponse à @{u}',
    chatters: 'Présents', show_pinned: 'Afficher le message épinglé', pinned: 'Message épinglé', pinned_by: 'Épinglé par {u}', theatre: 'Mode théâtre (t)', shortcuts_help: 'Espace/K lecture · ←/→ ±10 s · ↑/↓ volume · M muet · F plein écran · T théâtre · C chat · 0 début', chapters: 'Chapitres', discord_join: 'Rejoindre le Discord', usage_details: 'Statistiques détaillées', clip: 'Clip', clips: 'Clips', no_clips: 'Aucun clip sur cette période', recover_tab: 'Supprimées', recover_hint: 'Diffusions passées reconstruites depuis une source externe, tant que Twitch sert encore leurs segments. Les plus anciennes peuvent avoir disparu.', recover_empty: 'Aucune diffusion récupérable pour cette chaîne.', recover_play: 'Récupérer', recover_resolving: 'Reconstruction…', recover_failed: 'Cette diffusion n’est plus disponible sur les serveurs.', recover_views: 'vues max', home_followed: 'Suivies', see_offline: 'Voir les chaînes hors ligne ({n})', offline_all_live: 'Toutes tes chaînes suivies sont en live !', offline_none: 'Aucune chaîne suivie pour l’instant : touche « Suivre » sur la page d’une chaîne.', changelog: 'Journal des modifications', tour_welcome_title: 'Bienvenue sur TwitchUnblock', tour_welcome_text: 'Lives et VODs Twitch en qualité maximale, sans abonnement, avec le vrai chat. Choisis ta langue, puis fais le tour du site en une minute.', tour_start: 'Visite guidée', tour_skip: 'Passer', tour_done: 'C’est parti', tour_tap: 'Appuie dessus pour continuer', tour_home_title: 'Tes lives', tour_home_text: 'Tes chaînes suivies en direct, le top des lives, et tes chaînes hors ligne dans leur propre onglet. Pas de compte ? « Suivre » sur la page d’une chaîne suffit.', tour_channel_tab_text: 'Pour retrouver une chaîne et tout ce qu’elle a publié.', tour_channel_title: 'Cherche une chaîne', tour_channel_text: 'Ses lives, VODs, highlights, playlists et clips, plus l’onglet « Supprimées » qui récupère les VODs effacées récemment.', tour_link_text: 'Colle le lien ou l’ID d’une VOD pour l’ouvrir directement.', tour_cat_text: 'Toutes les catégories, et celles que tu suis.', tour_settings_title: 'Compte et réglages', tour_settings_text: 'Connexion Twitch facultative, pour tes chaînes suivies et le chat. Dans les réglages : langue, lecteur, chat, sauvegarde, journal des modifications… et ce tutoriel.', tour_player_title: 'Dans le lecteur', tour_tip_keys: 'Espace ou K : lecture · ←/→ : ±10 s · F : plein écran · T : mode théâtre.', tour_tip_seek: 'Fais glisser la barre d’une VOD : l’instant visé s’affiche.', tour_tip_mini: 'Réduis le lecteur pour continuer à naviguer pendant la lecture.', tour_tip_app: 'L’app iPhone va plus loin : zoom à deux doigts, écran verrouillé, points de chaîne.', highlights: 'Highlights', no_highlights: 'Aucun highlight', no_playlists: 'Aucune playlist', playlists: 'Playlists', play_all: 'Tout lire', videos_count: '{n} vidéo(s)', err_clip: 'Ce clip est introuvable', clipped_by: 'par {u}', full_vod: 'VOD complète', period_day: '24 h', period_week: '7 j', period_month: '30 j', period_all: 'Tout', hide_bots: 'Masquer les bots', hide_bots_sub: 'Nightbot, StreamElements, Fossabot…', hide_commands: 'Masquer les commandes', hide_commands_sub: 'Les messages qui commencent par « ! ».', muted_words: 'Mots masqués', muted_words_sub: 'Séparés par des virgules : les messages qui les contiennent ne s’affichent pas.', hidden_users: '{n} personne(s) masquée(s)', clear: 'Effacer', hide_user: 'Masquer', unhide_user: 'Réafficher', user_hidden: '{u} est masqué', user_unhidden: '{u} est réaffiché', hidden_cleared: 'Plus personne n’est masqué', raid_incoming: '{u} arrive en raid avec {n} spectateurs', see_channel: 'Voir la chaîne', highlight_words: 'Mots surlignés', highlight_words_sub: 'Séparés par des virgules. Les messages qui les contiennent (ou qui te mentionnent) sont mis en avant.', raid_title: 'Raid vers {u}', raid_viewers: '{n} spectateurs', raid_follow: 'Suivre', raid_in: 'départ dans {n} s', raid_following: 'Raid : direction {u}', pred_result: 'Résultat', pred_locked: 'Paris fermés', live_ended: 'Le live est terminé', watch_target: 'Regarder {u}', player_settings: 'Lecteur', click_pause: 'Clic sur la vidéo = pause', click_pause_sub: 'Désactivé, un clic affiche seulement les commandes.', backup: 'Sauvegarde', backup_sub: 'Exporte tes chaînes et catégories suivies et tes réglages dans un fichier, pour les importer ailleurs (site ou app iOS).', export_data: 'Exporter', import_data: 'Importer un fichier', export_done: 'Fichier exporté', import_done: 'Import terminé : {n} chaîne(s) ajoutée(s)', import_bad: 'Ce fichier n’est pas une sauvegarde TwitchUnblock', auto_raid: 'Suivre les raids', auto_raid_sub: 'Quand le streamer part en raid, on le suit automatiquement chez la chaîne visée.', cancel: 'Annuler', pinned_short: 'Épinglé', just_now: "à l'instant", minutes_ago: 'il y a {n} min', hours_ago: 'il y a {n} h', pin_left: 'encore {n} min',
    // Réglages
    settings: 'Réglages', language: 'Langue', lang_auto: 'Appareil', lang_auto_sub: 'Suit la langue de ton appareil ({l}).', account: 'Compte', playback: 'Lecture',
    chat_settings: 'Chat', chat_sync: 'Synchroniser le chat avec la vidéo', chat_sync_sub: 'Retarde les messages du direct du retard de l’image : on lit les réactions au moment où l’on voit ce qui les provoque.', timestamps: 'Afficher l’heure', keep_deleted: 'Garder les messages supprimés (barrés)',
    load_history: 'Charger les messages précédents', chat_size: 'Taille du texte',
    connected_as: 'Connecté en tant que {u}', not_connected: 'Non connecté',
    source_site: 'Code source du site', source_app: 'Code source de l’app iOS', credits: 'Crédits', made_by: 'Créé par', thanks: 'Merci à', not_affiliated: 'Projet indépendant, sans lien avec Twitch.',
    usage: 'Utilisation', usage_today: 'Aujourd’hui', usage_week: '7 jours', usage_month: '30 jours', usage_note: 'Personnes distinctes sur le site (globe) et l’app iOS : un compte Twitch connecté compte une fois, sinon un identifiant aléatoire par navigateur.', usage_unavailable: 'Le serveur n’a pas encore les routes de comptage.', share_usage: 'Partager mon utilisation', share_usage_sub: 'Sans compte : un identifiant aléatoire. Connecté : ton compte Twitch (pour te compter une seule fois sur tous tes appareils). Coupé, tout est effacé du serveur.',
    about: 'À propos', about_text: 'Aucune donnée n’est revendue. L’historique reste dans ton navigateur et, si tu es connecté, dans une sauvegarde liée à ton compte.',
  },
  en: {
    nav_discover: 'Discover', nav_channel: 'Streamer', nav_link: 'Link / ID',
    tagline: 'Twitch lives and VODs, no subscription needed.',
    login: 'Log in with Twitch', logout: 'Log out',
    login_prompt: 'Log in to find your followed channels and sync your history across devices.',
    followed: 'Followed channels', top: 'Top streams', top_fr: 'France', top_world: 'World', announcement_open: 'Open', whats_new: 'What’s new', nav_categories: 'Categories', cat_followed: 'Followed', cat_all: 'All', cat_search_ph: 'Search a category', cat_followed_empty_web: 'No followed categories. Open a category and click “Follow”.', offline_channels: 'Offline', load_more: 'Load more', no_result: 'No results', back: 'Back', got_it: 'Got it', replay_tutorial: 'Replay the tutorial', next: 'Next', follow: 'Follow', following: 'Following', on_this_device: 'on this device', follow_local_sub: 'No Twitch account needed: the channel shows up in “Followed channels” as soon as it goes live.', layout_grid: 'Show as grid', layout_list: 'Show as list', home_list: 'Home as a list', home_list_sub: 'Channels in a list like on Twitch (thumbnail on the left) instead of a grid.', login_optional: 'Optional: log in for your Twitch follows and chat.', login_prompt_local: 'Log in to see your followed channels, or follow channels without an account: “Follow” button on their page.', bot_commands: 'Bot commands', bot_commands_filter: 'Filter commands', bot_commands_none: 'No commands found (Nightbot, StreamElements, Fossabot, Moobot).', react: 'React', react_failed: 'Reaction not sent, try again later', top_lang: 'Top streams', top_lang_sub: 'Streamer language for “Top streams”. Defaults to your device language ({l}).',
    continue_watching: 'Continue watching', recent_channels: 'Recent streamers', clear_all: 'Clear all',
    refresh: 'Refresh', loading: 'Loading…', err_loading: 'Couldn’t load.',
    no_live_followed: 'None of your channels are live right now.',
    no_live: 'No live streams right now.',
    login_required_top: 'Log in to see the top streams.',
    session_expired: 'Session expired, please log in again.',
    search_channel_ph: 'Streamer name, then a keyword (e.g. shroud horror)',
    search: 'Search', not_found: 'Streamer not found.',
    live_now: 'Live', offline: 'Offline', offline_since: 'Offline for {t}',
    watch_live: 'Watch live', vods: 'Past broadcasts', no_vod: 'No VODs found.',
    filter_none: 'No VOD contains “{k}” in the last 100.',
    filter_count: '{n} VOD(s) for “{k}”',
    link_title: 'Open a VOD', link_desc: 'Paste a twitch.tv/videos/… link or an ID.',
    link_ph: 'https://www.twitch.tv/videos/123456789', link_open: 'Open',
    invalid_id: 'Invalid VOD ID.',
    loading_vod: 'Loading VOD…', loading_live: 'Connecting to the live…',
    err_vod: 'This VOD is unavailable.', err_live: 'This live is unavailable.', err_network: 'Network error.',
    viewers: 'viewers', latency: 'latency',
    quality: 'Quality', speed: 'Speed', normal: 'Normal', auto: 'Auto',
    go_live: 'Back to live', chat: 'Chat', pip: 'Picture in picture',
    fullscreen: 'Fullscreen', exit_fullscreen: 'Exit fullscreen',
    play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute',
    back10: 'Back 10 s', fwd10: 'Forward 10 s', minimize: 'Minimize', close: 'Close',
    open_in: 'Open in…', copy_link: 'Copy stream link', download_m3u: 'Download .m3u',
    copied: 'Link copied.', see_vods: 'See VODs', resume_at: 'Resuming at {t}',
    chat_connecting: 'Connecting to chat…', chat_connected: 'Welcome to the chat!',
    chat_disconnected: 'Chat disconnected, reconnecting…',
    chat_send_ph: 'Send a message', chat_readonly: 'Log in to chat',
    chat_rescope: 'Log in again to be able to chat',
    chat_paused: 'Chat paused', chat_new: '{n} new messages',
    chat_vod: 'Replay chat', chat_vod_empty: 'No messages at this point of the VOD.',
    chat_history: 'Earlier messages', emotes: 'Emotes', emotes_channel: 'This channel', emotes_global: 'Global',
    emote_search_ph: 'Search emotes', user_messages: 'Their messages', mention: 'Mention', reply: 'Reply',
    deleted: 'message deleted', first_msg: 'First message', reply_to: 'Replying to @{u}',
    chatters: 'Present', show_pinned: 'Show pinned message', pinned: 'Pinned message', pinned_by: 'Pinned by {u}', theatre: 'Theatre mode (t)', shortcuts_help: 'Space/K play · ←/→ ±10s · ↑/↓ volume · M mute · F fullscreen · T theatre · C chat · 0 start', chapters: 'Chapters', discord_join: 'Join the Discord', usage_details: 'Detailed statistics', clip: 'Clip', clips: 'Clips', no_clips: 'No clips for this period', recover_tab: 'Deleted', recover_hint: 'Past broadcasts rebuilt from an external source, while Twitch still serves their segments. Older ones may be gone.', recover_empty: 'No recoverable broadcast for this channel.', recover_play: 'Recover', recover_resolving: 'Rebuilding…', recover_failed: 'This broadcast is no longer available on the servers.', recover_views: 'peak viewers', home_followed: 'Following', see_offline: 'See offline channels ({n})', offline_all_live: 'All your followed channels are live!', offline_none: 'No followed channels yet: hit “Follow” on a channel page.', changelog: 'Changelog', tour_welcome_title: 'Welcome to TwitchUnblock', tour_welcome_text: 'Twitch lives and VODs at full quality, with no subscription, and the real chat. Pick your language, then take a one-minute tour of the site.', tour_start: 'Take the tour', tour_skip: 'Skip', tour_done: 'Let’s go', tour_tap: 'Press it to continue', tour_home_title: 'Your streams', tour_home_text: 'Your followed channels that are live, the top streams, and your offline channels in their own tab. No account? “Follow” on a channel page is enough.', tour_channel_tab_text: 'To find a channel and everything it has published.', tour_channel_title: 'Look up a channel', tour_channel_text: 'Its lives, VODs, highlights, playlists and clips, plus the “Deleted” tab that recovers recently deleted VODs.', tour_link_text: 'Paste a VOD link or ID to open it right away.', tour_cat_text: 'Every category, and the ones you follow.', tour_settings_title: 'Account and settings', tour_settings_text: 'Optional Twitch login, for your followed channels and the chat. In the settings: language, player, chat, backup, changelog… and this tutorial.', tour_player_title: 'In the player', tour_tip_keys: 'Space or K: play · ←/→: ±10s · F: fullscreen · T: theatre mode.', tour_tip_seek: 'Drag a VOD’s seek bar: the time you’re seeking to shows up.', tour_tip_mini: 'Minimize the player to keep browsing while it plays.', tour_tip_app: 'The iPhone app goes further: pinch to zoom, lock screen controls, channel points.', highlights: 'Highlights', no_highlights: 'No highlights', no_playlists: 'No playlists', playlists: 'Playlists', play_all: 'Play all', videos_count: '{n} video(s)', err_clip: 'This clip could not be found', clipped_by: 'by {u}', full_vod: 'Full VOD', period_day: '24h', period_week: '7d', period_month: '30d', period_all: 'All', hide_bots: 'Hide bots', hide_bots_sub: 'Nightbot, StreamElements, Fossabot…', hide_commands: 'Hide commands', hide_commands_sub: 'Messages starting with “!”.', muted_words: 'Muted words', muted_words_sub: 'Comma-separated: messages containing them are not shown.', hidden_users: '{n} hidden user(s)', clear: 'Clear', hide_user: 'Hide', unhide_user: 'Unhide', user_hidden: '{u} is hidden', user_unhidden: '{u} is visible again', hidden_cleared: 'Nobody is hidden anymore', raid_incoming: '{u} is raiding with {n} viewers', see_channel: 'See channel', highlight_words: 'Highlighted words', highlight_words_sub: 'Comma-separated. Messages containing them (or mentioning you) stand out.', raid_title: 'Raiding {u}', raid_viewers: '{n} viewers', raid_follow: 'Follow', raid_in: 'leaving in {n}s', raid_following: 'Raid: heading to {u}', pred_result: 'Result', pred_locked: 'Predictions closed', live_ended: 'The stream has ended', watch_target: 'Watch {u}', player_settings: 'Player', click_pause: 'Click on video to pause', click_pause_sub: 'When off, a click only shows the controls.', backup: 'Backup', backup_sub: 'Export your followed channels, categories and settings to a file, to import them elsewhere (website or iOS app).', export_data: 'Export', import_data: 'Import a file', export_done: 'File exported', import_done: 'Import done: {n} channel(s) added', import_bad: 'This file is not a TwitchUnblock backup', auto_raid: 'Follow raids', auto_raid_sub: 'When the streamer raids, you follow them to the target channel automatically.', cancel: 'Cancel', pinned_short: 'Pinned', just_now: 'just now', minutes_ago: '{n} min ago', hours_ago: '{n} h ago', pin_left: '{n} min left',
    settings: 'Settings', language: 'Language', lang_auto: 'Device', lang_auto_sub: 'Follows your device language ({l}).', account: 'Account', playback: 'Playback',
    chat_settings: 'Chat', chat_sync: 'Sync chat with the video', chat_sync_sub: 'Holds live messages back by the video delay, so reactions show up when you see what caused them.', timestamps: 'Show timestamps', keep_deleted: 'Keep deleted messages (struck through)',
    load_history: 'Load earlier messages', chat_size: 'Text size',
    connected_as: 'Logged in as {u}', not_connected: 'Not logged in',
    source_site: 'Website source code', source_app: 'iOS app source code', credits: 'Credits', made_by: 'Made by', thanks: 'Thanks to', not_affiliated: 'Independent project, not affiliated with Twitch.',
    usage: 'Usage', usage_today: 'Today', usage_week: '7 days', usage_month: '30 days', usage_note: 'Distinct people on the website (globe) and the iOS app: a logged-in Twitch account counts once, otherwise a random ID per browser.', usage_unavailable: 'The server doesn’t have the usage routes yet.', share_usage: 'Share my usage', share_usage_sub: 'Logged out: a random ID. Logged in: your Twitch account (so you count once across all your devices). Off, it is all deleted from the server.',
    about: 'About', about_text: 'No data is sold. Your history stays in your browser and, if you log in, in a backup tied to your account.',
  },
  es: {
    nav_discover: 'Descubrir', nav_channel: 'Streamer', nav_link: 'Enlace / ID',
    tagline: 'Directos y VODs de Twitch, sin suscripción.',
    login: 'Iniciar sesión con Twitch', logout: 'Cerrar sesión',
    login_prompt: 'Inicia sesión para ver tus canales seguidos y sincronizar tu historial entre dispositivos.',
    followed: 'Canales seguidos', top: 'Top directos', top_fr: 'Francia', top_world: 'Mundo', announcement_open: 'Abrir', whats_new: 'Novedades', nav_categories: 'Categorías', cat_followed: 'Seguidas', cat_all: 'Todas', cat_search_ph: 'Buscar una categoría', cat_followed_empty_web: 'Ninguna categoría seguida. Abre una categoría y haz clic en «Seguir».', offline_channels: 'Desconectados', load_more: 'Cargar más', no_result: 'Sin resultados', back: 'Atrás', got_it: 'Entendido', replay_tutorial: 'Ver el tutorial otra vez', next: 'Siguiente', follow: 'Seguir', following: 'Siguiendo', on_this_device: 'en este dispositivo', follow_local_sub: 'Sin cuenta de Twitch: el canal aparece en «Canales seguidos» en cuanto está en directo.', layout_grid: 'Ver en cuadrícula', layout_list: 'Ver en lista', home_list: 'Inicio en lista', home_list_sub: 'Canales en lista como en Twitch (miniatura a la izquierda) en lugar de cuadrícula.', login_optional: 'Opcional: inicia sesión para tus canales seguidos de Twitch y el chat.', login_prompt_local: 'Inicia sesión para ver tus canales seguidos, o sigue canales sin cuenta: botón «Seguir» en su página.', bot_commands: 'Comandos de bots', bot_commands_filter: 'Filtrar comandos', bot_commands_none: 'No se encontraron comandos (Nightbot, StreamElements, Fossabot, Moobot).', react: 'Reaccionar', react_failed: 'Reacción no enviada, inténtalo más tarde', top_lang: 'Top directos', top_lang_sub: 'Idioma de los streamers en «Top directos». Por defecto, el de tu dispositivo ({l}).',
    continue_watching: 'Seguir viendo', recent_channels: 'Streamers recientes', clear_all: 'Borrar todo',
    refresh: 'Actualizar', loading: 'Cargando…', err_loading: 'No se pudo cargar.',
    no_live_followed: 'Ninguno de tus canales está en directo ahora.',
    no_live: 'No hay directos ahora.',
    login_required_top: 'Inicia sesión para ver el top de directos.',
    session_expired: 'Sesión caducada, vuelve a iniciar sesión.',
    search_channel_ph: 'Nombre del streamer y una palabra clave (ej: ibai terror)',
    search: 'Buscar', not_found: 'Streamer no encontrado.',
    live_now: 'En directo', offline: 'Desconectado', offline_since: 'Desconectado hace {t}',
    watch_live: 'Ver el directo', vods: 'Emisiones anteriores', no_vod: 'No se encontraron VODs.',
    filter_none: 'Ningún VOD contiene «{k}» en los últimos 100.',
    filter_count: '{n} VOD(s) para «{k}»',
    link_title: 'Abrir un VOD', link_desc: 'Pega un enlace twitch.tv/videos/… o un ID.',
    link_ph: 'https://www.twitch.tv/videos/123456789', link_open: 'Abrir',
    invalid_id: 'ID de VOD no válido.',
    loading_vod: 'Cargando VOD…', loading_live: 'Conectando al directo…',
    err_vod: 'Este VOD no está disponible.', err_live: 'Este directo no está disponible.', err_network: 'Error de red.',
    viewers: 'espectadores', latency: 'latencia',
    quality: 'Calidad', speed: 'Velocidad', normal: 'Normal', auto: 'Auto',
    go_live: 'Volver al directo', chat: 'Chat', pip: 'Imagen en imagen',
    fullscreen: 'Pantalla completa', exit_fullscreen: 'Salir de pantalla completa',
    play: 'Reproducir', pause: 'Pausa', mute: 'Silenciar', unmute: 'Activar sonido',
    back10: 'Retroceder 10 s', fwd10: 'Avanzar 10 s', minimize: 'Minimizar', close: 'Cerrar',
    open_in: 'Abrir en…', copy_link: 'Copiar enlace del flujo', download_m3u: 'Descargar .m3u',
    copied: 'Enlace copiado.', see_vods: 'Ver VODs', resume_at: 'Reanudando en {t}',
    chat_connecting: 'Conectando al chat…', chat_connected: '¡Bienvenido al chat!',
    chat_disconnected: 'Chat desconectado, reconectando…',
    chat_send_ph: 'Enviar un mensaje', chat_readonly: 'Inicia sesión para escribir',
    chat_rescope: 'Vuelve a iniciar sesión para poder escribir',
    chat_paused: 'Chat en pausa', chat_new: '{n} mensajes nuevos',
    chat_vod: 'Chat de la repetición', chat_vod_empty: 'No hay mensajes en este punto del VOD.',
    chat_history: 'Mensajes anteriores', emotes: 'Emotes', emotes_channel: 'Este canal', emotes_global: 'Globales',
    emote_search_ph: 'Buscar emotes', user_messages: 'Sus mensajes', mention: 'Mencionar', reply: 'Responder',
    deleted: 'mensaje eliminado', first_msg: 'Primer mensaje', reply_to: 'Respondiendo a @{u}',
    chatters: 'Presentes', show_pinned: 'Mostrar mensaje fijado', pinned: 'Mensaje fijado', pinned_by: 'Fijado por {u}', theatre: 'Modo teatro (t)', shortcuts_help: 'Espacio/K reproducir · ←/→ ±10 s · ↑/↓ volumen · M silencio · F pantalla completa · T teatro · C chat · 0 inicio', chapters: 'Capítulos', discord_join: 'Unirse al Discord', usage_details: 'Estadísticas detalladas', clip: 'Clip', clips: 'Clips', no_clips: 'No hay clips en este periodo', recover_tab: 'Eliminados', recover_hint: 'Directos pasados reconstruidos desde una fuente externa, mientras Twitch siga sirviendo sus segmentos. Los más antiguos pueden haber desaparecido.', recover_empty: 'Ningún directo recuperable para este canal.', recover_play: 'Recuperar', recover_resolving: 'Reconstruyendo…', recover_failed: 'Este directo ya no está disponible en los servidores.', recover_views: 'espectadores máx.', home_followed: 'Seguidos', see_offline: 'Ver los canales desconectados ({n})', offline_all_live: '¡Todos tus canales seguidos están en directo!', offline_none: 'Aún no sigues ningún canal: toca «Seguir» en la página de un canal.', changelog: 'Registro de cambios', tour_welcome_title: 'Bienvenido a TwitchUnblock', tour_welcome_text: 'Directos y VODs de Twitch en máxima calidad, sin suscripción y con el chat real. Elige tu idioma y haz un recorrido de un minuto por el sitio.', tour_start: 'Visita guiada', tour_skip: 'Saltar', tour_done: 'Empezar', tour_tap: 'Púlsalo para continuar', tour_home_title: 'Tus directos', tour_home_text: 'Tus canales seguidos en directo, el top de directos y tus canales desconectados en su propia pestaña. ¿Sin cuenta? Basta con «Seguir» en la página de un canal.', tour_channel_tab_text: 'Para encontrar un canal y todo lo que ha publicado.', tour_channel_title: 'Busca un canal', tour_channel_text: 'Sus directos, VODs, destacados, listas y clips, además de la pestaña «Eliminados», que recupera VODs borrados recientemente.', tour_link_text: 'Pega el enlace o el ID de un VOD para abrirlo directamente.', tour_cat_text: 'Todas las categorías, y las que sigues.', tour_settings_title: 'Cuenta y ajustes', tour_settings_text: 'Inicio de sesión con Twitch opcional, para tus canales seguidos y el chat. En los ajustes: idioma, reproductor, chat, copia de seguridad, registro de cambios… y este tutorial.', tour_player_title: 'En el reproductor', tour_tip_keys: 'Espacio o K: reproducir · ←/→: ±10 s · F: pantalla completa · T: modo teatro.', tour_tip_seek: 'Desliza la barra de un VOD: se muestra el instante elegido.', tour_tip_mini: 'Minimiza el reproductor para seguir navegando mientras se reproduce.', tour_tip_app: 'La app de iPhone va más allá: zoom con dos dedos, pantalla de bloqueo, puntos del canal.', highlights: 'Destacados', no_highlights: 'Sin destacados', no_playlists: 'Sin listas', playlists: 'Listas', play_all: 'Reproducir todo', videos_count: '{n} vídeo(s)', err_clip: 'No se encontró este clip', clipped_by: 'por {u}', full_vod: 'VOD completo', period_day: '24 h', period_week: '7 d', period_month: '30 d', period_all: 'Todo', hide_bots: 'Ocultar bots', hide_bots_sub: 'Nightbot, StreamElements, Fossabot…', hide_commands: 'Ocultar comandos', hide_commands_sub: 'Los mensajes que empiezan por «!».', muted_words: 'Palabras silenciadas', muted_words_sub: 'Separadas por comas: los mensajes que las contienen no se muestran.', hidden_users: '{n} persona(s) oculta(s)', clear: 'Borrar', hide_user: 'Ocultar', unhide_user: 'Mostrar', user_hidden: '{u} está oculto', user_unhidden: '{u} vuelve a mostrarse', hidden_cleared: 'Ya no hay nadie oculto', raid_incoming: '{u} llega en raid con {n} espectadores', see_channel: 'Ver canal', highlight_words: 'Palabras resaltadas', highlight_words_sub: 'Separadas por comas. Los mensajes que las contienen (o te mencionan) se destacan.', raid_title: 'Raid a {u}', raid_viewers: '{n} espectadores', raid_follow: 'Seguir', raid_in: 'sale en {n} s', raid_following: 'Raid: rumbo a {u}', pred_result: 'Resultado', pred_locked: 'Apuestas cerradas', live_ended: 'El directo ha terminado', watch_target: 'Ver a {u}', player_settings: 'Reproductor', click_pause: 'Clic en el vídeo = pausa', click_pause_sub: 'Desactivado, un clic solo muestra los controles.', backup: 'Copia de seguridad', backup_sub: 'Exporta tus canales y categorías seguidos y tus ajustes a un archivo, para importarlos en otro lugar (web o app iOS).', export_data: 'Exportar', import_data: 'Importar un archivo', export_done: 'Archivo exportado', import_done: 'Importación terminada: {n} canal(es) añadido(s)', import_bad: 'Este archivo no es una copia de TwitchUnblock', auto_raid: 'Seguir los raids', auto_raid_sub: 'Cuando el streamer hace un raid, lo sigues automáticamente al canal de destino.', cancel: 'Cancelar', pinned_short: 'Fijado', just_now: 'ahora mismo', minutes_ago: 'hace {n} min', hours_ago: 'hace {n} h', pin_left: 'quedan {n} min',
    settings: 'Ajustes', language: 'Idioma', lang_auto: 'Dispositivo', lang_auto_sub: 'Sigue el idioma de tu dispositivo ({l}).', account: 'Cuenta', playback: 'Reproducción',
    chat_settings: 'Chat', chat_sync: 'Sincronizar el chat con el vídeo', chat_sync_sub: 'Retrasa los mensajes del directo lo que tarda la imagen: las reacciones llegan cuando ves lo que las provoca.', timestamps: 'Mostrar la hora', keep_deleted: 'Mantener mensajes eliminados (tachados)',
    load_history: 'Cargar mensajes anteriores', chat_size: 'Tamaño del texto',
    connected_as: 'Conectado como {u}', not_connected: 'Sin conectar',
    source_site: 'Código fuente del sitio', source_app: 'Código fuente de la app iOS', credits: 'Créditos', made_by: 'Creado por', thanks: 'Gracias a', not_affiliated: 'Proyecto independiente, sin relación con Twitch.',
    usage: 'Uso', usage_today: 'Hoy', usage_week: '7 días', usage_month: '30 días', usage_note: 'Personas distintas en el sitio (globo) y la app iOS: una cuenta de Twitch conectada cuenta una vez; si no, un ID aleatorio por navegador.', usage_unavailable: 'El servidor aún no tiene las rutas de conteo.', share_usage: 'Compartir mi uso', share_usage_sub: 'Sin sesión: un ID aleatorio. Con sesión: tu cuenta de Twitch (para contarte una sola vez en todos tus dispositivos). Desactivado, todo se borra del servidor.',
    about: 'Acerca de', about_text: 'No se vende ningún dato. Tu historial se queda en tu navegador y, si inicias sesión, en una copia ligada a tu cuenta.',
  },
}

export const LANGS = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
]

let current = 'en'

/** Langue de l'appareil : la première de ses langues préférées que le site
 *  connaît (navigator.languages est déjà triée par préférence). */
export function deviceLang() {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  for (const l of list) {
    const code = String(l).slice(0, 2).toLowerCase()
    if (STRINGS[code]) return code
  }
  return 'en'
}

/** `saved` vide ou `auto` : on suit l'appareil. */
export function initLang(saved) {
  current = STRINGS[saved] ? saved : deviceLang()
  document.documentElement.lang = current
  return current
}

export function setLang(lang) {
  if (!STRINGS[lang]) return current
  current = lang
  document.documentElement.lang = lang
  return current
}

export const lang = () => current

/** Traduit une clé, avec remplacement des `{param}`. */
export function t(key, params) {
  let s = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, () => String(v))
  return s
}

/** Applique les traductions aux éléments statiques marqués `data-i18n`. */
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
  for (const el of root.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh)
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle)
    el.setAttribute('aria-label', t(el.dataset.i18nTitle))
  }
}
