/**
 * OMEGA CLI — French Emotion Keywords
 * Phase 16.1 — Language Support
 *
 * French keywords for Plutchik emotion detection.
 * External to FROZEN modules (genome/mycelium).
 */

export const EMOTION_KEYWORDS_FR: Record<string, string[]> = {
  joy: [
    'heureux', 'heureuse', 'joie', 'bonheur', 'content', 'contente', 'ravi', 'ravie',
    'enchante', 'enchantee', 'sourire', 'souriant', 'souriante', 'plaisir', 'gai', 'gaie',
    'joyeux', 'joyeuse', 'rire', 'riait', 'rit', 'aimer', 'aime', 'adore', 'adorait',
    'merveilleux', 'merveilleuse', 'fantastique', 'genial', 'geniale', 'super', 'bien',
    'formidable', 'magnifique', 'splendide', 'radieux', 'radieuse', 'epanoui', 'epanouie',
  ],
  trust: [
    'confiance', 'confiant', 'confiante', 'croire', 'croit', 'croyait', 'foi', 'fidele',
    'loyal', 'loyale', 'honnete', 'sincere', 'fiable', 'sur', 'sure', 'certain', 'certaine',
    'assure', 'assuree', 'securite', 'protege', 'protegee', 'ami', 'amie', 'amitie',
  ],
  fear: [
    'peur', 'effraye', 'effrayee', 'terreur', 'terrifie', 'terrifiee', 'angoisse', 'anxieux',
    'anxieuse', 'inquiet', 'inquiete', 'crainte', 'craint', 'craignait', 'panique', 'paniquait',
    'trembler', 'tremble', 'tremblait', 'frissonner', 'frisson', 'horreur', 'horrible',
    'effroi', 'redoute', 'redoutait', 'menace', 'menacait', 'danger', 'dangereux', 'dangereuse',
    'cauchemar', 'sursaut', 'sursauta', 'alarme', 'alarmer',
  ],
  surprise: [
    'surprise', 'surpris', 'surprenait', 'etonne', 'etonnee', 'etonnant', 'etonnante',
    'stupefait', 'stupefaite', 'abasourdi', 'abasourdie', 'choque', 'choquee', 'inattendu',
    'inattendue', 'incroyable', 'stupeur', 'soudain', 'soudaine', 'soudainement',
    'brusquement', 'subitement', 'emerveille', 'emerveillee',
  ],
  sadness: [
    'triste', 'tristesse', 'chagrin', 'peine', 'pleure', 'pleurait', 'pleurer', 'larme',
    'larmes', 'sanglot', 'sanglotait', 'melancolie', 'melancolique', 'deprime', 'deprimee',
    'abattu', 'abattue', 'desespere', 'desesperee', 'desespoir', 'malheur', 'malheureux',
    'malheureuse', 'souffrir', 'souffre', 'souffrait', 'souffrance', 'douleur', 'douloureux',
    'douloureuse', 'mort', 'mourir', 'mourait', 'deuil', 'perdu', 'perdue', 'perdre',
  ],
  disgust: [
    'degout', 'degoute', 'degoutee', 'degoutant', 'degoutante', 'repugnant', 'repugnante',
    'ecoeure', 'ecoeuree', 'ecoeurant', 'ecoeurante', 'repugne', 'immonde', 'infect',
    'infecte', 'ignoble', 'abject', 'abjecte', 'horreur', 'horrible', 'deteste', 'detestait',
    'haine', 'haissait', 'mepris', 'meprise', 'meprisait', 'repulsion',
  ],
  anger: [
    'colere', 'fureur', 'furieux', 'furieuse', 'rage', 'enrage', 'enragee', 'fache', 'fachee',
    'irrite', 'irritee', 'agace', 'agacee', 'enerve', 'enervee', 'exaspere', 'exasperee',
    'hostile', 'haine', 'haissait', 'deteste', 'detestait', 'violent', 'violente', 'violence',
    'crier', 'crie', 'criait', 'hurler', 'hurle', 'hurlait', 'gueule', 'gueulait',
    'insulte', 'insultait', 'menace', 'menacait', 'frappe', 'frappait', 'coup', 'coups',
  ],
  anticipation: [
    'attendre', 'attend', 'attendait', 'attente', 'espoir', 'espere', 'esperait', 'esperer',
    'impatient', 'impatiente', 'impatience', 'excite', 'excitee', 'excitation', 'hate',
    'prevoir', 'prevoit', 'prevoyait', 'preparer', 'prepare', 'preparait', 'projet',
    'planifier', 'demain', 'avenir', 'futur', 'bientot', 'prochain', 'prochaine',
  ],
};

export const LANG_NAME_FR = 'Français';
