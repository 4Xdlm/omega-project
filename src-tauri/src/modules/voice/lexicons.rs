//! OMEGA VOICE — Lexiques Français (NASA-Grade)
//! ═══════════════════════════════════════════════════════════════════════════════
//!
//! Lexiques embarqués pour analyse stylistique française.
//! Figés, versionnés, déterministes.
//!
//! @version FR_LEXICON_VOICE_v1.0.0
//! @certification AEROSPACE_GRADE

// ═══════════════════════════════════════════════════════════════════════════════
// STOPWORDS FRANÇAIS (150+ mots)
// ═══════════════════════════════════════════════════════════════════════════════

/// Mots vides français (articles, pronoms, prépositions, conjonctions)
/// Source: Compilation manuelle + liste standard FR
pub const FR_STOPWORDS: &[&str] = &[
    // Articles
    "le", "la", "les", "l", "un", "une", "des", "du", "de", "d",
    // Pronoms personnels
    "je", "j", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
    "me", "m", "te", "t", "se", "s", "lui", "leur", "nous", "vous",
    "moi", "toi", "soi", "eux",
    // Pronoms démonstratifs
    "ce", "c", "cet", "cette", "ces", "ceci", "cela", "ça",
    // Pronoms relatifs
    "qui", "que", "qu", "quoi", "dont", "où", "lequel", "laquelle", "lesquels", "lesquelles",
    // Pronoms possessifs
    "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
    "notre", "nos", "votre", "vos", "leur", "leurs",
    // Prépositions
    "à", "au", "aux", "de", "du", "des", "en", "dans", "sur", "sous",
    "avec", "sans", "pour", "par", "contre", "entre", "vers", "chez",
    "avant", "après", "depuis", "pendant", "durant", "jusque", "jusqu",
    "derrière", "devant", "dessus", "dessous", "hors", "près", "loin",
    // Conjonctions
    "et", "ou", "mais", "donc", "or", "ni", "car", "que", "quand",
    "si", "comme", "lorsque", "puisque", "quoique", "bien",
    // Adverbes courants
    "ne", "n", "pas", "plus", "moins", "très", "trop", "assez", "peu",
    "bien", "mal", "mieux", "pire", "vite", "lentement",
    "toujours", "jamais", "souvent", "parfois", "encore", "déjà",
    "ici", "là", "partout", "ailleurs", "dehors", "dedans",
    "oui", "non", "peut-être", "certainement", "probablement",
    "alors", "ainsi", "aussi", "même", "surtout", "seulement",
    // Verbes auxiliaires (formes courantes)
    "être", "est", "es", "suis", "sommes", "êtes", "sont", "était", "étais", "étaient",
    "avoir", "ai", "as", "a", "avons", "avez", "ont", "avait", "avais", "avaient",
    "faire", "fait", "fais", "font", "faisait",
    "aller", "vais", "vas", "va", "allons", "allez", "vont", "allait",
    "pouvoir", "peux", "peut", "pouvons", "pouvez", "peuvent", "pouvait",
    "vouloir", "veux", "veut", "voulons", "voulez", "veulent", "voulait",
    "devoir", "dois", "doit", "devons", "devez", "doivent", "devait",
    // Autres
    "tout", "tous", "toute", "toutes", "autre", "autres", "chaque", "quelque", "quelques",
    "aucun", "aucune", "certain", "certains", "certaine", "certaines",
    "tel", "telle", "tels", "telles", "quel", "quelle", "quels", "quelles",
    "y", "en",
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTEURS LOGIQUES (50+ mots)
// ═══════════════════════════════════════════════════════════════════════════════

/// Connecteurs et mots de liaison
pub const FR_CONNECTORS: &[&str] = &[
    // Opposition
    "mais", "cependant", "pourtant", "toutefois", "néanmoins", "or", "tandis",
    "alors", "malgré", "quoique", "bien", "contrairement",
    // Cause
    "car", "parce", "puisque", "comme", "vu", "étant",
    // Conséquence
    "donc", "ainsi", "alors", "par", "conséquent", "conséquence", "résultat",
    "c'est", "pourquoi", "dès", "lors",
    // Addition
    "et", "puis", "ensuite", "également", "aussi", "de", "plus", "en", "outre",
    "d'ailleurs", "par", "ailleurs", "non", "seulement",
    // Illustration
    "par", "exemple", "notamment", "ainsi", "comme",
    // Conclusion
    "enfin", "finalement", "bref", "en", "somme", "conclusion",
    // Temps
    "d'abord", "premièrement", "deuxièmement", "ensuite", "puis", "après",
    "avant", "pendant", "durant", "lors", "quand", "lorsque",
    // Condition
    "si", "à", "condition", "pourvu", "au", "cas", "où",
    // But
    "pour", "afin", "dans", "le", "but",
];

// ═══════════════════════════════════════════════════════════════════════════════
// VOCABULAIRE SENSORIEL (80+ mots)
// ═══════════════════════════════════════════════════════════════════════════════

/// Mots relatifs aux 5 sens
pub const FR_SENSORY: &[&str] = &[
    // Vue (20)
    "voir", "regarder", "observer", "contempler", "apercevoir", "distinguer",
    "lumière", "ombre", "obscurité", "clarté", "brillant", "sombre", "noir",
    "blanc", "rouge", "bleu", "vert", "couleur", "forme", "silhouette",
    // Ouïe (15)
    "entendre", "écouter", "bruit", "son", "silence", "murmure", "cri",
    "voix", "écho", "tonnerre", "fracas", "chuchoter", "hurler", "résonner", "tinter",
    // Toucher (15)
    "toucher", "sentir", "caresser", "frôler", "effleurer",
    "doux", "rugueux", "lisse", "chaud", "froid", "tiède", "glacé", "brûlant",
    "mou", "dur",
    // Odorat (15)
    "odeur", "parfum", "senteur", "arôme", "puanteur", "fragrance",
    "renifler", "humer", "flairer",
    "âcre", "suave", "nauséabond", "odorant", "musqué", "floral",
    // Goût (15)
    "goût", "saveur", "goûter", "déguster", "savourer",
    "sucré", "salé", "amer", "acide", "épicé", "fade", "délicieux",
    "aigre", "doux", "piquant",
];

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT POSITIF (100+ mots)
// ═══════════════════════════════════════════════════════════════════════════════

/// Mots à connotation positive
pub const FR_SENTIMENT_POS: &[&str] = &[
    // Émotions positives
    "joie", "bonheur", "plaisir", "félicité", "euphorie", "extase", "ravissement",
    "amour", "tendresse", "affection", "passion", "adoration",
    "espoir", "optimisme", "confiance", "assurance", "sérénité", "paix",
    "fierté", "satisfaction", "contentement", "épanouissement",
    "enthousiasme", "excitation", "émerveillement", "admiration",
    "gratitude", "reconnaissance",
    // Adjectifs positifs
    "heureux", "joyeux", "content", "ravi", "enchanté", "comblé",
    "magnifique", "splendide", "sublime", "merveilleux", "extraordinaire",
    "beau", "belle", "superbe", "génial", "formidable", "fantastique",
    "excellent", "parfait", "idéal", "optimal",
    "calme", "serein", "paisible", "tranquille", "apaisé",
    "fort", "puissant", "courageux", "brave", "héroïque",
    "gentil", "aimable", "doux", "tendre", "bienveillant",
    "intelligent", "brillant", "talentueux", "doué", "génial",
    // Verbes positifs
    "aimer", "adorer", "chérir", "apprécier", "savourer",
    "sourire", "rire", "s'épanouir", "rayonner", "briller",
    "réussir", "triompher", "gagner", "vaincre", "accomplir",
    "créer", "construire", "bâtir", "développer", "améliorer",
    "aider", "soutenir", "encourager", "inspirer", "motiver",
    "célébrer", "fêter", "applaudir", "féliciter", "remercier",
    // Noms positifs
    "succès", "victoire", "triomphe", "réussite", "accomplissement",
    "miracle", "merveille", "prodige", "trésor", "cadeau",
    "ami", "amitié", "famille", "camarade", "compagnon",
    "lumière", "soleil", "étoile", "arc-en-ciel", "aurore",
];

// ═══════════════════════════════════════════════════════════════════════════════
// SENTIMENT NÉGATIF (100+ mots)
// ═══════════════════════════════════════════════════════════════════════════════

/// Mots à connotation négative
pub const FR_SENTIMENT_NEG: &[&str] = &[
    // Émotions négatives
    "peur", "terreur", "effroi", "angoisse", "anxiété", "panique", "frayeur",
    "colère", "rage", "fureur", "irritation", "agacement", "énervement",
    "tristesse", "chagrin", "mélancolie", "dépression", "désespoir", "affliction",
    "haine", "mépris", "dégoût", "répulsion", "aversion",
    "jalousie", "envie", "rancœur", "ressentiment", "amertume",
    "honte", "culpabilité", "remords", "regret",
    "solitude", "abandon", "rejet", "exclusion",
    // Adjectifs négatifs
    "triste", "malheureux", "déprimé", "abattu", "accablé",
    "furieux", "enragé", "irrité", "agacé", "exaspéré",
    "effrayé", "terrifié", "apeuré", "angoissé", "anxieux",
    "sombre", "noir", "ténébreux", "lugubre", "sinistre",
    "cruel", "méchant", "mauvais", "terrible", "horrible", "affreux",
    "faible", "fragile", "vulnérable", "impuissant", "démuni",
    "seul", "isolé", "abandonné", "rejeté", "exclu",
    "malade", "souffrant", "blessé", "meurtri", "traumatisé",
    // Verbes négatifs
    "détester", "haïr", "mépriser", "abhorrer",
    "pleurer", "sangloter", "gémir", "se lamenter",
    "crier", "hurler", "rugir", "vociférer",
    "frapper", "blesser", "tuer", "détruire", "anéantir",
    "souffrir", "endurer", "subir", "supporter",
    "échouer", "perdre", "rater", "manquer",
    "fuir", "s'enfuir", "abandonner", "renoncer",
    "mentir", "tromper", "trahir", "décevoir",
    // Noms négatifs
    "mort", "deuil", "malheur", "catastrophe", "désastre", "tragédie",
    "danger", "menace", "risque", "péril",
    "douleur", "souffrance", "tourment", "supplice", "agonie",
    "guerre", "conflit", "combat", "bataille",
    "ennemi", "adversaire", "traître", "monstre", "démon",
    "ombre", "ténèbres", "nuit", "obscurité", "néant",
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUFFIXES ADJECTIFS FRANÇAIS
// ═══════════════════════════════════════════════════════════════════════════════

/// Suffixes typiques des adjectifs français
pub const FR_ADJ_SUFFIXES: &[&str] = &[
    // Courants
    "eux", "euse", "euses",
    "able", "ables", "ible", "ibles",
    "ique", "iques",
    "if", "ive", "ifs", "ives",
    "al", "ale", "aux", "ales",
    "el", "elle", "els", "elles",
    "ant", "ante", "ants", "antes",
    "ent", "ente", "ents", "entes",
    "é", "ée", "és", "ées",
    "i", "ie", "is", "ies",
    "u", "ue", "us", "ues",
    // Moins courants
    "ard", "arde",
    "âtre",
    "ien", "ienne",
    "ais", "aise",
    "ois", "oise",
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUFFIXES VERBES FRANÇAIS
// ═══════════════════════════════════════════════════════════════════════════════

/// Suffixes typiques des verbes français (conjugués)
pub const FR_VERB_SUFFIXES: &[&str] = &[
    // Infinitif
    "er", "ir", "re", "oir",
    // Présent
    "e", "es", "ons", "ez", "ent",
    "is", "it", "issons", "issez", "issent",
    // Imparfait
    "ais", "ait", "ions", "iez", "aient",
    // Passé simple
    "ai", "as", "a", "âmes", "âtes", "èrent",
    "us", "ut", "ûmes", "ûtes", "urent",
    // Futur
    "ai", "as", "a", "ons", "ez", "ont",
    // Conditionnel
    "ais", "ait", "ions", "iez", "aient",
    // Participes
    "ant", "é", "i", "u",
];

// ═══════════════════════════════════════════════════════════════════════════════
// VERBES D'ACTION (pour Show/Tell et cadence)
// ═══════════════════════════════════════════════════════════════════════════════

/// Verbes d'action (mouvement, geste, activité)
pub const FR_ACTION_VERBS: &[&str] = &[
    // Mouvement
    "marcher", "courir", "sauter", "bondir", "grimper", "descendre",
    "avancer", "reculer", "s'élancer", "se précipiter", "fuir",
    "entrer", "sortir", "partir", "arriver", "venir", "aller",
    // Gestes
    "prendre", "saisir", "attraper", "lâcher", "lancer", "jeter",
    "pousser", "tirer", "frapper", "toucher", "caresser",
    "ouvrir", "fermer", "tourner", "retourner",
    // Combat
    "combattre", "lutter", "se battre", "attaquer", "défendre",
    "esquiver", "parer", "riposter", "charger",
    // Perception active
    "regarder", "observer", "scruter", "fouiller", "chercher",
    "écouter", "guetter", "surveiller",
    // Parole active
    "crier", "hurler", "appeler", "interpeller", "ordonner",
    "murmurer", "chuchoter", "souffler",
    // Création
    "créer", "construire", "fabriquer", "bâtir", "forger",
    "écrire", "dessiner", "peindre", "sculpter",
];

// ═══════════════════════════════════════════════════════════════════════════════
// VERBES D'ÉTAT (pour Show/Tell ratio)
// ═══════════════════════════════════════════════════════════════════════════════

/// Verbes d'état (être, avoir, paraître...)
pub const FR_STATE_VERBS: &[&str] = &[
    // Être et dérivés
    "être", "suis", "es", "est", "sommes", "êtes", "sont",
    "était", "étais", "étaient", "fus", "fut", "furent",
    "serai", "seras", "sera", "seront",
    // Avoir
    "avoir", "ai", "as", "a", "avons", "avez", "ont",
    "avait", "avais", "avaient", "eus", "eut", "eurent",
    // Paraître
    "paraître", "parais", "paraît", "paraissons", "paraissent",
    "sembler", "semble", "semblent",
    // Devenir
    "devenir", "deviens", "devient", "devenons", "deviennent",
    // Rester
    "rester", "reste", "restes", "restent", "restait",
    // Demeurer
    "demeurer", "demeure", "demeurent",
];

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/// Vérifie si un mot est un stopword
pub fn is_stopword(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_STOPWORDS.contains(&lower.as_str())
}

/// Vérifie si un mot est un connecteur
pub fn is_connector(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_CONNECTORS.contains(&lower.as_str())
}

/// Vérifie si un mot est sensoriel
pub fn is_sensory(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_SENSORY.contains(&lower.as_str())
}

/// Retourne le sentiment d'un mot (-1, 0, 1)
pub fn get_sentiment(word: &str) -> i8 {
    let lower = word.to_lowercase();
    if FR_SENTIMENT_POS.contains(&lower.as_str()) {
        1
    } else if FR_SENTIMENT_NEG.contains(&lower.as_str()) {
        -1
    } else {
        0
    }
}

/// Vérifie si un mot ressemble à un adjectif (heuristique)
pub fn is_adjective_like(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_ADJ_SUFFIXES.iter().any(|s| lower.ends_with(s))
}

/// Vérifie si un mot ressemble à un verbe (heuristique)
pub fn is_verb_like(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_VERB_SUFFIXES.iter().any(|s| lower.ends_with(s))
}

/// Vérifie si un mot est un verbe d'action
pub fn is_action_verb(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_ACTION_VERBS.contains(&lower.as_str())
}

/// Vérifie si un mot est un verbe d'état
pub fn is_state_verb(word: &str) -> bool {
    let lower = word.to_lowercase();
    FR_STATE_VERBS.contains(&lower.as_str())
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTIQUES LEXIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/// Statistiques sur les lexiques embarqués
pub struct LexiconStats {
    pub stopwords_count: usize,
    pub connectors_count: usize,
    pub sensory_count: usize,
    pub sentiment_pos_count: usize,
    pub sentiment_neg_count: usize,
    pub action_verbs_count: usize,
    pub state_verbs_count: usize,
}

impl LexiconStats {
    pub fn compute() -> Self {
        Self {
            stopwords_count: FR_STOPWORDS.len(),
            connectors_count: FR_CONNECTORS.len(),
            sensory_count: FR_SENSORY.len(),
            sentiment_pos_count: FR_SENTIMENT_POS.len(),
            sentiment_neg_count: FR_SENTIMENT_NEG.len(),
            action_verbs_count: FR_ACTION_VERBS.len(),
            state_verbs_count: FR_STATE_VERBS.len(),
        }
    }

    pub fn total(&self) -> usize {
        self.stopwords_count
            + self.connectors_count
            + self.sensory_count
            + self.sentiment_pos_count
            + self.sentiment_neg_count
            + self.action_verbs_count
            + self.state_verbs_count
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stopwords_count() {
        assert!(FR_STOPWORDS.len() >= 150, "Expected 150+ stopwords, got {}", FR_STOPWORDS.len());
    }

    #[test]
    fn test_connectors_count() {
        assert!(FR_CONNECTORS.len() >= 50, "Expected 50+ connectors, got {}", FR_CONNECTORS.len());
    }

    #[test]
    fn test_sensory_count() {
        assert!(FR_SENSORY.len() >= 80, "Expected 80+ sensory, got {}", FR_SENSORY.len());
    }

    #[test]
    fn test_sentiment_pos_count() {
        assert!(FR_SENTIMENT_POS.len() >= 100, "Expected 100+ pos, got {}", FR_SENTIMENT_POS.len());
    }

    #[test]
    fn test_sentiment_neg_count() {
        assert!(FR_SENTIMENT_NEG.len() >= 100, "Expected 100+ neg, got {}", FR_SENTIMENT_NEG.len());
    }

    #[test]
    fn test_is_stopword() {
        assert!(is_stopword("le"));
        assert!(is_stopword("Le"));
        assert!(!is_stopword("maison"));
    }

    #[test]
    fn test_get_sentiment() {
        assert_eq!(get_sentiment("joie"), 1);
        assert_eq!(get_sentiment("tristesse"), -1);
        assert_eq!(get_sentiment("table"), 0);
    }

    #[test]
    fn test_is_adjective_like() {
        assert!(is_adjective_like("magnifique")); // -ique
        assert!(is_adjective_like("heureux"));    // -eux
        assert!(is_adjective_like("adorable"));   // -able
    }

    #[test]
    fn test_is_action_verb() {
        assert!(is_action_verb("courir"));
        assert!(is_action_verb("frapper"));
        assert!(!is_action_verb("être"));
    }

    #[test]
    fn test_is_state_verb() {
        assert!(is_state_verb("être"));
        assert!(is_state_verb("suis"));
        assert!(!is_state_verb("courir"));
    }

    #[test]
    fn test_lexicon_stats() {
        let stats = LexiconStats::compute();
        assert!(stats.total() >= 500, "Expected 500+ total words, got {}", stats.total());
    }
}
