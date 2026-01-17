/**
 * OMEGA CLI — Spanish Emotion Keywords
 * Phase 16.2 — Language Support
 *
 * Spanish keywords for Plutchik emotion detection.
 * External to FROZEN modules (genome/mycelium).
 * Includes accent variants (á/a, é/e, í/i, ó/o, ú/u, ñ).
 */

export const EMOTION_KEYWORDS_ES: Record<string, string[]> = {
  joy: [
    // Core joy words
    'feliz', 'felices', 'felicidad', 'alegre', 'alegria', 'contento', 'contenta',
    'contentos', 'contentas', 'dichoso', 'dichosa', 'dicha', 'gozo', 'gozar',
    'gozaba', 'gozoso', 'gozosa', 'jubilo', 'jubiloso', 'jubilosa',
    // Happiness expressions
    'sonreir', 'sonrie', 'sonreia', 'sonrisa', 'reir', 'rie', 'reia', 'risa',
    'carcajada', 'risas', 'riendo', 'sonriendo',
    // Love and affection
    'amar', 'ama', 'amaba', 'amor', 'amado', 'amada', 'querido', 'querida',
    'querer', 'quiere', 'queria', 'adorar', 'adora', 'adoraba', 'adorado',
    'carino', 'carinoso', 'carinosa', 'afecto', 'afectuoso', 'afectuosa',
    // Positive states
    'encantado', 'encantada', 'encantador', 'encantadora', 'maravilloso', 'maravillosa',
    'fantastico', 'fantastica', 'genial', 'estupendo', 'estupenda', 'magnifico',
    'magnifica', 'esplendido', 'esplendida', 'radiante', 'brillante',
    // Celebration
    'celebrar', 'celebra', 'celebraba', 'celebracion', 'fiesta', 'festejar',
    'festejo', 'triunfo', 'triunfar', 'triunfante', 'victoria', 'victorioso',
    'exito', 'exitoso', 'exitosa', 'logro', 'lograr', 'lograba',
    // Satisfaction
    'satisfecho', 'satisfecha', 'satisfaccion', 'placer', 'placido', 'placida',
    'disfrutar', 'disfruta', 'disfrutaba', 'grato', 'grata', 'agradable',
    'complacido', 'complacida', 'entusiasmo', 'entusiasmado', 'entusiasmada',
    'ilusionado', 'ilusionada', 'ilusion', 'esperanzado', 'esperanzada',
  ],
  trust: [
    // Core trust words
    'confianza', 'confiar', 'confia', 'confiaba', 'confio', 'fiar', 'fiable',
    'confiado', 'confiada', 'creer', 'cree', 'creia', 'creencia', 'fe',
    // Loyalty and honesty
    'leal', 'lealtad', 'fiel', 'fidelidad', 'honesto', 'honesta', 'honestidad',
    'sincero', 'sincera', 'sinceridad', 'verdad', 'verdadero', 'verdadera',
    'autentico', 'autentica', 'genuino', 'genuina',
    // Security and protection
    'seguro', 'segura', 'seguridad', 'proteger', 'protege', 'protegia',
    'protegido', 'protegida', 'proteccion', 'resguardar', 'resguardo',
    'amparar', 'amparo', 'cuidar', 'cuida', 'cuidaba', 'cuidado',
    // Friendship and alliance
    'amigo', 'amiga', 'amigos', 'amigas', 'amistad', 'companero', 'companera',
    'compania', 'aliado', 'aliada', 'alianza', 'socio', 'socia',
    // Certainty
    'cierto', 'cierta', 'certeza', 'certidumbre', 'convencido', 'convencida',
    'asegurar', 'asegura', 'aseguraba', 'garantia', 'garantizar',
    'prometer', 'promete', 'prometia', 'promesa', 'jurar', 'jura', 'juraba',
  ],
  fear: [
    // Core fear words
    'miedo', 'miedos', 'miedoso', 'miedosa', 'temer', 'teme', 'temia', 'temor',
    'temeroso', 'temerosa', 'terror', 'aterrorizado', 'aterrorizada',
    'aterrar', 'aterra', 'aterraba', 'terrorfico', 'terrorifica',
    // Anxiety and worry
    'angustia', 'angustiado', 'angustiada', 'ansiedad', 'ansioso', 'ansiosa',
    'inquieto', 'inquieta', 'inquietud', 'preocupado', 'preocupada',
    'preocupar', 'preocupa', 'preocupaba', 'nervioso', 'nerviosa', 'nervios',
    // Physical fear responses
    'temblar', 'tiembla', 'temblaba', 'temblor', 'tembloroso', 'temblorosa',
    'escalofrio', 'estremecerse', 'estremece', 'estremecia', 'paralizado',
    'paralizada', 'paralizar', 'helado', 'helada', 'sudor', 'sudando',
    // Panic and horror
    'panico', 'pavor', 'horror', 'horrible', 'horrendo', 'horrenda',
    'espanto', 'espantoso', 'espantosa', 'espantar', 'espanta', 'espantaba',
    'aterrador', 'aterradora', 'pesadilla', 'pesadillas',
    // Danger and threat
    'peligro', 'peligroso', 'peligrosa', 'amenaza', 'amenazar', 'amenazaba',
    'amenazante', 'sobresalto', 'sobresaltar', 'alarma', 'alarmar', 'alarmado',
    'alerta', 'huir', 'huye', 'huia', 'escapar', 'escapa', 'escapaba',
  ],
  surprise: [
    // Core surprise words
    'sorpresa', 'sorprender', 'sorprende', 'sorprendia', 'sorprendido', 'sorprendida',
    'sorprendente', 'asombro', 'asombrar', 'asombra', 'asombraba', 'asombroso',
    'asombrosa', 'asombrado', 'asombrada',
    // Shock and amazement
    'estupefacto', 'estupefacta', 'atonio', 'atonita', 'pasmado', 'pasmada',
    'pasmo', 'boquiabierto', 'boquiabierta', 'impactado', 'impactada', 'impacto',
    'chocar', 'choca', 'chocaba', 'chocante', 'impresionado', 'impresionada',
    // Unexpected events
    'inesperado', 'inesperada', 'imprevisto', 'imprevista', 'increible',
    'insolito', 'insolita', 'extraordinario', 'extraordinaria', 'inaudito',
    'inaudita', 'desconcertado', 'desconcertada', 'desconcertar',
    // Sudden occurrences
    'repentino', 'repentina', 'subito', 'subita', 'subitamente', 'repentinamente',
    'de pronto', 'de repente', 'bruscamente', 'brusco', 'brusca',
    // Wonder and awe
    'maravillado', 'maravillada', 'maravillar', 'admirado', 'admirada',
    'admiracion', 'fascinado', 'fascinada', 'fascinar', 'fascinante',
    'deslumbrado', 'deslumbrada', 'deslumbrar', 'deslumbrante',
  ],
  sadness: [
    // Core sadness words
    'triste', 'tristes', 'tristeza', 'pena', 'penas', 'penoso', 'penosa',
    'afligido', 'afligida', 'afliccion', 'abatido', 'abatida', 'abatimiento',
    'apesadumbrado', 'apesadumbrada', 'acongojado', 'acongojada',
    // Crying and tears
    'llorar', 'llora', 'lloraba', 'llanto', 'lagrima', 'lagrimas', 'llorando',
    'sollozar', 'solloza', 'sollozaba', 'sollozo', 'sollozos', 'gimotear',
    'gemir', 'gime', 'gemia', 'gemido', 'gemidos',
    // Depression and despair
    'deprimido', 'deprimida', 'depresion', 'deprimir', 'desesperado', 'desesperada',
    'desesperacion', 'desesperar', 'desconsuelo', 'desconsolado', 'desconsolada',
    'desolado', 'desolada', 'desolacion', 'vacio', 'vacia',
    // Suffering and pain
    'sufrir', 'sufre', 'sufria', 'sufrimiento', 'dolor', 'dolores', 'doloroso',
    'dolorosa', 'doler', 'duele', 'dolia', 'agonizar', 'agonia', 'tormento',
    'atormentado', 'atormentada', 'angustia', 'angustiado', 'angustiada',
    // Loss and grief
    'perder', 'pierde', 'perdia', 'perdida', 'perdido', 'perdida', 'luto',
    'duelo', 'muerte', 'morir', 'moria', 'muerto', 'muerta', 'fallecido',
    'fallecida', 'lamentar', 'lamenta', 'lamentaba', 'lamento',
    // Melancholy
    'melancolico', 'melancolica', 'melancolia', 'nostalgico', 'nostalgica',
    'nostalgia', 'anoranza', 'anorar', 'anora', 'anoraba', 'extranar',
    'solitario', 'solitaria', 'soledad', 'solo', 'sola', 'abandonado', 'abandonada',
  ],
  disgust: [
    // Core disgust words
    'asco', 'asqueroso', 'asquerosa', 'repugnante', 'repugnancia', 'repugnar',
    'repugna', 'repugnaba', 'nauseabundo', 'nauseabunda', 'nausea', 'nauseas',
    'vomitar', 'vomita', 'vomitaba', 'vomito',
    // Revulsion
    'repulsion', 'repulsivo', 'repulsiva', 'inmundo', 'inmunda', 'sucio', 'sucia',
    'mugriento', 'mugrienta', 'asqueado', 'asqueada', 'indignante',
    // Hatred and contempt
    'odiar', 'odia', 'odiaba', 'odio', 'odioso', 'odiosa', 'detestar', 'detesta',
    'detestaba', 'detestable', 'aborrecer', 'aborrece', 'aborrecia',
    'despreciar', 'desprecia', 'despreciaba', 'desprecio', 'despreciable',
    // Aversion
    'aversion', 'averso', 'aversa', 'rechazo', 'rechazar', 'rechaza', 'rechazaba',
    'repeler', 'repele', 'repelia', 'horrible', 'horrendo', 'horrenda',
    'abominable', 'abominacion', 'infame', 'infamia', 'vil', 'villano', 'villana',
    // Physical disgust
    'podrido', 'podrida', 'putrefacto', 'putrefacta', 'hedor', 'hediondo',
    'hedionda', 'fetido', 'fetida', 'pestilente', 'maloliente', 'apestoso',
    'apestosa', 'infectar', 'infecto', 'infecta', 'contaminado', 'contaminada',
  ],
  anger: [
    // Core anger words
    'enfado', 'enfadado', 'enfadada', 'enfadar', 'enfada', 'enfadaba',
    'enojo', 'enojado', 'enojada', 'enojar', 'enoja', 'enojaba',
    'ira', 'iracundo', 'iracunda', 'airado', 'airada',
    // Fury and rage
    'furia', 'furioso', 'furiosa', 'enfurecido', 'enfurecida', 'enfurecer',
    'rabia', 'rabioso', 'rabiosa', 'rabiar', 'colera', 'colerico', 'colerica',
    'indignado', 'indignada', 'indignacion', 'indignar',
    // Irritation
    'irritado', 'irritada', 'irritar', 'irrita', 'irritaba', 'irritante',
    'molesto', 'molesta', 'molestar', 'molestia', 'fastidio', 'fastidiado',
    'fastidiada', 'fastidiar', 'exasperar', 'exasperado', 'exasperada',
    // Violence
    'violento', 'violenta', 'violencia', 'agredir', 'agrede', 'agredia',
    'agresivo', 'agresiva', 'agresion', 'golpear', 'golpea', 'golpeaba',
    'golpe', 'golpes', 'pegar', 'pega', 'pegaba', 'atacar', 'ataca', 'atacaba',
    'ataque', 'asaltar', 'asalta', 'asaltaba', 'asalto',
    // Verbal anger
    'gritar', 'grita', 'gritaba', 'grito', 'gritos', 'chillar', 'chilla',
    'chillaba', 'chillido', 'insultar', 'insulta', 'insultaba', 'insulto',
    'insultos', 'maldecir', 'maldice', 'maldecia', 'maldicion',
    'amenazar', 'amenaza', 'amenazaba', 'venganza', 'vengar', 'vengativo', 'vengativa',
  ],
  anticipation: [
    // Core anticipation words
    'esperar', 'espera', 'esperaba', 'esperanza', 'esperanzado', 'esperanzada',
    'aguardar', 'aguarda', 'aguardaba', 'anhelar', 'anhela', 'anhelaba', 'anhelo',
    'ansiar', 'ansia', 'ansiaba', 'ansiado', 'ansiada',
    // Impatience and excitement
    'impaciente', 'impaciencia', 'impacientar', 'emocionado', 'emocionada',
    'emocion', 'emocionar', 'excitado', 'excitada', 'excitacion', 'excitar',
    'entusiasmado', 'entusiasmada', 'entusiasmo', 'entusiasmar',
    // Planning and preparation
    'planear', 'planea', 'planeaba', 'plan', 'planes', 'planificar',
    'preparar', 'prepara', 'preparaba', 'preparacion', 'preparado', 'preparada',
    'organizar', 'organiza', 'organizaba', 'proyecto', 'proyectar',
    // Future orientation
    'futuro', 'manana', 'pronto', 'proximo', 'proxima', 'proximamente',
    'venidero', 'venidera', 'porvenir', 'adelante', 'despues', 'luego',
    // Prediction and expectation
    'prever', 'preve', 'preveia', 'prevision', 'anticipar', 'anticipa',
    'anticipaba', 'anticipacion', 'predecir', 'predice', 'predecia',
    'presagiar', 'presagio', 'presentir', 'presiente', 'presentia',
    'intuir', 'intuye', 'intuia', 'intuicion', 'sospechar', 'sospecha', 'sospechaba',
  ],
};

export const LANG_NAME_ES = 'Español';
