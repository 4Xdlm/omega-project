/**
 * OMEGA CLI — German Emotion Keywords
 * Phase 16.3 — Language Support
 *
 * German keywords for Plutchik emotion detection.
 * External to FROZEN modules (genome/mycelium).
 * Handles umlauts (ä, ö, ü, Ä, Ö, Ü) and ß.
 */

export const EMOTION_KEYWORDS_DE: Record<string, string[]> = {
  joy: [
    // Core joy words
    'freude', 'freudig', 'freuen', 'freut', 'freute', 'glueck', 'gluecklich',
    'froehlich', 'froh', 'heiter', 'heiterkeit', 'vergnuegt', 'vergnuegen',
    // Happiness expressions
    'laecheln', 'laechelt', 'laechelte', 'lachen', 'lacht', 'lachte', 'gelacht',
    'strahlen', 'strahlt', 'strahlend', 'jubeln', 'jubel', 'jauchzen',
    // Love and affection
    'liebe', 'lieben', 'liebt', 'liebte', 'geliebt', 'liebevoll', 'lieblich',
    'zuneigung', 'herzlich', 'herz', 'herzen', 'innig', 'zaertlich', 'zaertlichkeit',
    // Positive states
    'begeistert', 'begeisterung', 'begeistern', 'entzueckt', 'entzueckend',
    'wunderbar', 'wunderschoen', 'wundervoll', 'herrlich', 'grossartig',
    'fantastisch', 'fabelhaft', 'prachtvoll', 'ausgezeichnet', 'toll', 'super',
    // Satisfaction
    'zufrieden', 'zufriedenheit', 'erfuellt', 'erfuellung', 'geniessen',
    'genuss', 'geniesst', 'genoss', 'wohlbefinden', 'behagen', 'behaglich',
    'spass', 'spassig', 'lustig', 'amuesant', 'amuesieren', 'erfreut', 'erfreuen',
    // Celebration
    'feiern', 'feiert', 'feierte', 'feier', 'fest', 'festlich', 'triumph',
    'triumphieren', 'siegen', 'sieg', 'erfolg', 'erfolgreich', 'gelingen',
  ],
  trust: [
    // Core trust words
    'vertrauen', 'vertraut', 'vertraute', 'vertrauensvoll', 'vertrauenswuerdig',
    'glauben', 'glaubt', 'glaubte', 'glaube', 'glaubwuerdig', 'zuversicht',
    // Loyalty and honesty
    'treu', 'treue', 'loyal', 'loyalitaet', 'ehrlich', 'ehrlichkeit', 'aufrichtig',
    'aufrichtigkeit', 'redlich', 'wahrheit', 'wahrhaftig', 'echt', 'authentisch',
    // Security and protection
    'sicher', 'sicherheit', 'schuetzen', 'schuetzt', 'schuetzte', 'schutz',
    'beschuetzen', 'geborgen', 'geborgenheit', 'bewahren', 'hueten',
    // Friendship
    'freund', 'freundin', 'freunde', 'freundschaft', 'freundlich', 'freundlichkeit',
    'kamerad', 'kameradschaft', 'verbuendet', 'verbuendete', 'partner', 'partnerschaft',
    // Reliability
    'zuverlaessig', 'zuverlaessigkeit', 'bestaendig', 'bestaendigkeit',
    'versprechen', 'verspricht', 'versprach', 'versprochen', 'schwur', 'schwoeren',
  ],
  fear: [
    // Core fear words
    'angst', 'aengstlich', 'aengste', 'fuerchten', 'fuerchtet', 'fuerchtete',
    'furcht', 'furchtbar', 'furchtsam', 'bange', 'bangen', 'schrecken',
    // Terror and panic
    'terror', 'terrorisieren', 'panik', 'panisch', 'entsetzen', 'entsetzt',
    'entsetzlich', 'grauen', 'grauenhaft', 'grauenvoll', 'grausam', 'grausamkeit',
    // Anxiety and worry
    'sorge', 'sorgen', 'besorgt', 'besorgnis', 'unruhe', 'unruhig', 'nervoes',
    'nervositaet', 'beklemmung', 'beklemmt', 'beklommen', 'aengstigen',
    // Physical fear responses
    'zittern', 'zittert', 'zitterte', 'zitternd', 'schaudern', 'schauder',
    'erschaudern', 'erstarren', 'erstarrt', 'laehmen', 'gelaehmt', 'laehmung',
    // Danger and threat
    'gefahr', 'gefaehrlich', 'gefaehrden', 'bedrohung', 'bedrohen', 'bedroht',
    'bedrohlich', 'warnung', 'warnen', 'alarm', 'alarmieren', 'flucht', 'fliehen',
    'flieht', 'floh', 'alptraum', 'albtraum', 'horror', 'schrecklich',
  ],
  surprise: [
    // Core surprise words
    'ueberraschung', 'ueberraschen', 'ueberrascht', 'ueberraschend',
    'erstaunen', 'erstaunt', 'erstaunlich', 'staunen', 'staunt', 'staunte',
    // Shock and amazement
    'verblueffen', 'verbluefft', 'verblueffend', 'sprachlos', 'fassungslos',
    'baff', 'perplex', 'verdutzt', 'bestuerzt', 'bestuerzung', 'schock',
    'schockiert', 'schockieren', 'erschuettern', 'erschuettert',
    // Unexpected events
    'unerwartet', 'unvorhergesehen', 'unglaublich', 'ungeahnt', 'ploetzlich',
    'ploetzlichkeit', 'abrupt', 'jaeh', 'jaeher', 'unvermittelt', 'urploetzlich',
    // Wonder and awe
    'wunder', 'wundern', 'wundersam', 'verwundern', 'verwundert', 'verwunderung',
    'bewundern', 'bewundert', 'bewunderung', 'staunend', 'faszinieren',
    'fasziniert', 'faszinierend', 'faszination', 'beeindrucken', 'beeindruckt',
  ],
  sadness: [
    // Core sadness words
    'traurig', 'trauer', 'traurigkeit', 'betruebt', 'betruebnis', 'kummer',
    'kuemmern', 'bekuemmert', 'leid', 'leiden', 'leidet', 'litt', 'gelitten',
    // Crying and tears
    'weinen', 'weint', 'weinte', 'geweint', 'traene', 'traenen', 'schluchzen',
    'schluchzt', 'schluchzte', 'jammern', 'jammert', 'klagen', 'klage', 'beklagen',
    // Depression and despair
    'deprimiert', 'depression', 'depressiv', 'verzweifeln', 'verzweifelt',
    'verzweiflung', 'hoffnungslos', 'hoffnungslosigkeit', 'trostlos', 'trostlosigkeit',
    'niedergeschlagen', 'niedergeschlagenheit', 'mutlos', 'mutlosigkeit',
    // Suffering and pain
    'schmerz', 'schmerzen', 'schmerzhaft', 'schmerzvoll', 'qual', 'qualen',
    'quaelen', 'pein', 'peinigen', 'peinvoll', 'elend', 'elendig', 'jammer',
    // Loss and grief
    'verlust', 'verlieren', 'verliert', 'verlor', 'verloren', 'trauern',
    'beerdigung', 'tod', 'sterben', 'stirbt', 'starb', 'gestorben', 'tot',
    'verstorben', 'dahinscheiden', 'abschied', 'verabschieden',
    // Loneliness
    'einsam', 'einsamkeit', 'allein', 'alleinsein', 'verlassen', 'verlassenheit',
    'isoliert', 'isolation', 'melancholie', 'melancholisch', 'schwermut', 'schwermutig',
  ],
  disgust: [
    // Core disgust words
    'ekel', 'ekelhaft', 'ekelig', 'ekeln', 'anwidern', 'widerlich', 'widerwille',
    'abscheu', 'abscheulich', 'abgestossen', 'abstossend', 'grausig',
    // Revulsion
    'uebelkeit', 'uebel', 'erbrechen', 'wuergereiz', 'wuergen', 'kotzen',
    'abneigung', 'antipathie', 'aversion', 'degoutant', 'degoutieren',
    // Hatred and contempt
    'hass', 'hassen', 'hasst', 'hasste', 'hasserfuellt', 'verabscheuen',
    'verabscheuungswuerdig', 'verachten', 'verachtet', 'verachtung', 'veraechtlich',
    'gering schaetzen', 'geringschaetzig', 'geringschaetzung',
    // Rejection
    'ablehnung', 'ablehnen', 'ablehnt', 'lehnte ab', 'zurueckweisen',
    'zurueckweisung', 'verschmaehen', 'verschmaeht', 'verabscheut',
    // Physical disgust
    'schmutzig', 'schmutz', 'dreckig', 'dreck', 'verdorben', 'verrottet',
    'verfault', 'stinkend', 'stinken', 'gestank', 'widerwaertig', 'abscheuung',
  ],
  anger: [
    // Core anger words
    'wut', 'wuetend', 'wueten', 'zorn', 'zornig', 'aerger', 'aergerlich',
    'aergern', 'aergert', 'aergerte', 'veraergert', 'gereizt', 'reizen',
    // Fury and rage
    'rasend', 'raserei', 'rasen', 'tobsucht', 'toben', 'tobt', 'tobte',
    'furie', 'aufgebracht', 'entruestet', 'entruestung', 'empoert', 'empoerung',
    // Irritation
    'irritiert', 'irritieren', 'genervt', 'nerven', 'nervt', 'nervte',
    'ungehalten', 'missmutig', 'verdrossen', 'verstimmt', 'verstimmung',
    // Violence
    'gewalttaetig', 'gewalt', 'gewaltsam', 'angreifen', 'angriff', 'attacke',
    'attackieren', 'schlagen', 'schlaegt', 'schlug', 'geschlagen', 'pruegeln',
    'hauen', 'treten', 'tritt', 'trat', 'getreten', 'kaempfen', 'kampf',
    // Verbal anger
    'schreien', 'schreit', 'schrie', 'geschrien', 'bruellen', 'bruellt',
    'bruellte', 'gebruell', 'anschreien', 'beschimpfen', 'beschimpfung',
    'beleidigen', 'beleidigung', 'fluchen', 'fluch', 'verfluchen', 'drohen',
    'drohung', 'bedrohen', 'rache', 'raechen', 'rachsuechtig',
  ],
  anticipation: [
    // Core anticipation words
    'erwarten', 'erwartet', 'erwartete', 'erwartung', 'erwartungsvoll',
    'hoffen', 'hofft', 'hoffte', 'hoffnung', 'hoffnungsvoll', 'zuversichtlich',
    // Impatience and excitement
    'ungeduld', 'ungeduldig', 'aufgeregt', 'aufregung', 'aufregen', 'gespannt',
    'spannung', 'neugier', 'neugierig', 'wissbegierig', 'enthusiasmus',
    'enthusiastisch', 'begeisterung', 'begeistert', 'vorfreude',
    // Planning and preparation
    'planen', 'plant', 'plante', 'plan', 'plaene', 'vorhaben', 'vorbereiten',
    'vorbereitet', 'vorbereitung', 'organisieren', 'organisation', 'projekt',
    // Future orientation
    'zukunft', 'zukuenftig', 'morgen', 'demnaechst', 'bald', 'spaeter',
    'kuenftig', 'kommend', 'naechste', 'naechster', 'naechstes', 'voraus',
    // Prediction and expectation
    'vorhersagen', 'vorhersage', 'voraussehen', 'vorausahnen', 'ahnen', 'ahnung',
    'antizipieren', 'antizipation', 'vermuten', 'vermutung', 'prognose',
    'prophezeien', 'prophezeiung', 'sehnsucht', 'sehnen', 'ersehnen', 'ersehnt',
  ],
};

export const LANG_NAME_DE = 'Deutsch';
