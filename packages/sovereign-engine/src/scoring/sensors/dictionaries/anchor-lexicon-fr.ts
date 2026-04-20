/**
 * ANCHOR_LEXICON_FR - French Sensory Anchor Lexicon
 * 
 * Defines concrete anchors that validate sensory events in literary text.
 * An anchor co-occurs with a sensory word within an 8-token window to confirm
 * the sensory reference is REAL (not abstract/metaphorical).
 * 
 * Three layers with cumulative weights:
 * - C1 (weight 1.0-1.6): concrete materials, objects, micro-details
 * - C2 (weight 1.2-1.4): body parts, sensory organs
 * - C3 (weight 1.3-1.5): physical reaction verbs, interaction verbs
 */

export const ANCHOR_LEXICON_FR = {
  c1_material: [
    "acier", "aciers", "argent", "fer", "fers", "cuivre", "cuivres", "bronze",
    "or", "ors", "nickel", "nickels", "chrome", "chromes", "chromé", "chromée",
    "chromées", "plomb", "plombs", "étain", "étains", "zinc", "zincs", "zingue",
    "zingues", "laiton", "laitons", "alliage", "alliages", "amalgame", "amalgames",
    "métal", "métaux", "pierre", "pierres", "marbre", "marbres", "granite", "granits",
    "schiste", "schistes", "ardoise", "ardoises", "calcaire", "calcaires", "basalte",
    "basaltes", "roche", "roches", "rocher", "rochers", "galet", "galets", "gravier",
    "graviers", "caillou", "cailloux", "carreau", "carreaux", "dallage", "dallages",
    "argile", "argiles", "céramique", "céramiques", "porcelaine", "porcelaines",
    "faïence", "faïences", "grès", "brique", "briques", "tuile", "tuiles", "poterie",
    "poteries", "béton", "bétons", "ciment", "ciments", "mortier", "mortiers", "chaux",
    "plâtre", "plâtres", "asphalte", "asphaltes", "pavé", "pavés", "carrelage",
    "carrelages", "coton", "cotons", "laine", "laines", "lin", "lins", "soie", "soies",
    "chanvre", "chanvres", "jute", "jutes", "toile", "toiles", "velours", "satin",
    "satins", "serge", "serges", "tweed", "tweeds", "mousseline", "mousselines",
    "voile", "voiles", "taffetas", "tulle", "tulles", "dentelle", "dentelles",
    "batiste", "batistes", "cotonnade", "cotonnades", "flanelle", "flanelles",
    "mérinos", "tissu", "tissus", "étoffe", "étoffes", "drap", "draps", "maille",
    "mailles", "tricot", "tricots", "filet", "filets", "bois",
    "chêne", "chênes", "pin", "pins", "sapin", "sapins", "hêtre", "hêtres", "frêne",
    "frênes", "orme", "ormes", "acajou", "acajous", "teck", "tecks", "érable",
    "érables", "noyer", "noyers", "tilleul", "tilleuls", "châtaignier", "châtaigniers",
    "noisetier", "noisetiers", "bouleau", "bouleaux", "charme", "charmes", "liège",
    "lièges", "écorce", "écorces", "liber", "libers", "billon", "billons", "bille",
    "billes", "barreau", "barreaux", "barrette", "barrettes", "chevron", "chevrons",
    "verre", "verres", "cristal", "cristaux", "vitrail", "vitraux", "vitrage",
    "vitrages", "vitrine", "vitrines", "glace", "glaces", "miroir", "miroirs",
    "lentille", "lentilles", "vitre", "vitres", "cuir", "cuirs", "cuirasse",
    "cuirasses", "pellicule", "pellicules", "membrane", "membranes",
    "parchemin", "parchemins", "fourrure", "fourrures", "duvet", "duvets", "crin", "crins", "bourre", "bourres", "feutre",
    "feutres", "cire", "cires", "cération", "cérations", "céruse", "céruses", "résine",
    "résines", "ambre", "ambres", "copal", "copals", "mastic", "mastics", "encens",
    "goudron", "goudrons", "poix", "brai", "brais", "cachou", "cachous", "laque",
    "laques", "shellac", "shellacs", "sable", "sables", "sablon", "sablons", "poussière",
    "poussières", "poudre", "poudres", "talc", "talcs", "magnésie", "magnésies",
    "craie", "craies", "ocre", "ocres", "terre", "terres", "terreau", "terreaux",
    "humus", "compost", "composts", "paille", "pailles", "sciure", "sciures", "copeaux",
    "fragment", "fragments", "éclat", "éclats", "morceau", "morceaux", "lambeau",
    "lambeaux", "chiffon", "chiffons", "loupe", "loupes", "eau", "eaux", "boue",
    "boues", "fange", "fanges", "limon", "limons", "vase", "vases", "bourbe", "bourbes",
    "crotte", "crottes", "crasse", "crasses", "ordure", "ordures", "rouille", "rouilles",
    "mousse", "mousses", "lichens", "algue", "algues", "varech", "varechs", "goémon",
    "goémons", "fucus"
  ] as const,

  c1_object: [
    "table", "tables", "chaise", "chaises", "fauteuil", "fauteuils", "lit", "lits",
    "matelas", "oreiller", "oreillers", "couette", "couettes", "édredon", "édredons",
    "traverse", "traverses", "traversin", "traversins", "sommier", "sommiers", "cadre",
    "cadres", "canapé", "canapés", "sofa", "sofas", "divan", "divans", "banc", "bancs",
    "banquette", "banquettes", "tabouret", "tabourets", "escabeau", "escabeaux",
    "porte", "portes", "portail", "portails", "portillon", "portillons", "poterne",
    "poternes", "hublot", "hublots", "fenêtre", "fenêtres", "baie", "baies", "lucarne",
    "lucarnes", "fenestron", "fenestrons", "jalousie", "jalousies", "persienne",
    "persiennes", "contrevent", "contrevents", "volet", "volets", "store", "stores",
    "rideau", "rideaux", "draperie", "draperies", "tenture", "tentures", "mur", "murs",
    "muraille", "murailles", "pan", "pans", "paroi", "parois", "cloison", "cloisons",
    "surface", "surfaces", "plafond", "plafonds", "sol", "sols", "cheminée",
    "cheminées", "foyer", "foyers", "âtre", "âtres", "manteau", "manteaux", "linteau",
    "linteaux", "trumeau", "trumeaux", "jambage", "jambages", "embrasure", "embrasures",
    "voussure", "voussures", "corniche", "corniches", "cimaise", "cimaises", "plinthe",
    "plinthes", "moulure", "moulures", "basrelief", "basreliefs", "relief", "reliefs",
    "drapeau", "drapeaux", "bannière", "bannières", "étendard", "étendards", "armoirie",
    "armoiries", "blason", "blasons", "arche", "arches", "arcade", "arcades", "voûte",
    "voûtes", "niche", "niches", "alcôve", "alcôves", "cellier", "celliers", "caveau",
    "caveaux", "catacombes", "crypte", "cryptes", "oubliettes",
    "donjon", "donjons", "tourelle", "tourelles", "bastion", "bastions",
    "redoute", "redoutes", "fortification", "fortifications", "palissade", "palissades",
    "fossé", "fossés", "douves", "pont", "ponts",
    "passerelle", "passerelles", "viaduc", "viaducs", "culée", "culées", "pile", "piles",
    "cintrage", "cintrages", "intrados", "extrados", "clef",
    "clefs", "voussoir", "voussoirs", "chaînage", "chaînages",
    "appentis", "hangar", "hangars", "remise", "remises", "étable",
    "étables", "écurie", "écuries", "fenil", "fenils", "grange", "granges", "silo",
    "silos", "tour", "tours", "moulin", "moulins", "meule", "meules", "minoterie",
    "minoteries", "pressoir", "pressoirs", "cave", "caves", "chai", "chais", "chambre",
    "chambres", "chambrelan", "chambrelans", "chambrette", "chambrettes"
  ] as const,

  c1_micro_detail: [
    "bouton", "boutons", "poignée", "poignées", "noeud", "noeuds", "boucle", "boucles",
    "fermoir", "fermoirs", "agrafe", "agrafes", "crochet", "crochets", "charnière",
    "charnières", "biseau", "biseaux", "boulon", "boulons", "vis", "clou",
    "clous", "rivet", "rivets", "rivage", "rivages", "perle", "perles", "aiguille",
    "aiguilles", "épingle", "épingles", "fil", "fils", "ruban", "rubans",
    "cordage", "cordages", "cordelette", "cordelettes", "ficelle", "ficelles",
    "corde", "cordes", "câble", "câbles", "hauban", "haubans",
    "drisse", "drisses", "écoute", "écoutes", "itague", "itagues", "baguette",
    "baguettes", "bâton", "bâtons", "tringle", "tringles", "cornière", "cornières",
    "équerre", "équerres", "ressort", "ressorts", "rouleau", "rouleaux", "loquet",
    "loquets", "verrou", "verrous", "pêne", "pênes", "mentonnet", "mentonnets",
    "gâche", "gâches", "clenche", "clenches", "mèche", "mèches", "miette", "miettes",
    "flocon", "flocons", "brin", "brins", "pinceau", "pinceaux"
  ] as const,

  c2_body: [
    "main", "mains", "bras", "épaule", "épaules", "cou", "gorge", "torse", "torses",
    "poitrine", "poitrines", "jambe", "jambes", "pied", "pieds", "cuisse", "cuisses",
    "mollet", "mollets", "ventre", "ventres", "dos", "taille", "tailles", "genou",
    "genoux", "coude", "coudes", "poignet", "poignets", "cheville", "chevilles",
    "hanche", "hanches", "aine", "aines", "aisselle", "aisselles", "crâne", "crânes",
    "front", "fronts", "joue", "joues", "menton", "mentons", "mâchoire", "mâchoires",
    "lèvre", "lèvres", "palais", "langue", "langues", "narine", "narines", "nez",
    "paupière", "paupières", "cil", "cils", "sourcil", "sourcils", "iris", "pupille",
    "pupilles", "orbite", "orbites", "tempe", "tempes", "pommette", "pommettes",
    "ossature", "ossatures", "maxillaire", "maxillaires", "mandibule", "mandibules"
  ] as const,

  c2_organ: [
    "doigt", "doigts", "ongle", "ongles", "orteil", "orteils", "tendon", "tendons",
    "veine", "veines", "artère", "artères", "nerf", "nerfs", "os", "côte", "côtes",
    "colonne", "colonnes", "cartilage", "cartilages", "muscle", "muscles",
    "pore", "pores", "toupet", "toupets"
  ] as const,

  c3_reaction: [
    "frisson", "frissons", "tremblement", "tremblements", "tressaillement",
    "tressaillements", "frémissement", "frémissements", "sueur", "sueurs",
    "transpiration", "transpirations", "larme", "larmes", "bave", "baves", "sursaut",
    "sursauts", "spasme", "spasmes", "convulsion", "convulsions", "crampe", "crampes",
    "halètement", "halètements", "essoufflement", "essouflements", "souffle", "souffles",
    "suffocation", "suffocations", "étouffement", "étouffements", "sanglot", "sanglots",
    "hoquet", "hoquets", "râle", "râles", "nausée", "nausées", "vertige", "vertiges",
    "palpitation", "palpitations", "battement", "battements"
  ] as const,

  c3_interaction: [
    "étreinte", "étreintes", "caresse", "caresses", "gifle", "gifles", "baiser",
    "baisers", "poussée", "poussées", "pression", "pressions", "griffure", "griffures",
    "pincement", "pincements", "massage", "massages", "accolade", "accolades", "morsure",
    "morsures", "coup", "coups", "tape", "tapes", "contact", "contacts", "friction",
    "frictions", "effleurement", "effleurements", "empoignade", "empoignades", "emprise",
    "emprises", "secousse", "secousses", "choc", "chocs", "heurt", "heurts", "ébranlement",
    "ébranlements", "emportement", "emportements", "saisissement", "empoignement",
    "empoignements", "saisie", "saisies", "étau", "étaux"
  ] as const,
} as const;

export const ANCHOR_WEIGHTS = {
  c1_material: 1.0,
  c1_object: 1.3,
  c1_micro_detail: 1.6,
  c2_body: 1.2,
  c2_organ: 1.4,
  c3_reaction: 1.5,
  c3_interaction: 1.3,
} as const;

/** Build anchor index: word → { layer, weight } */
export function buildAnchorIndex(
  lexicon: typeof ANCHOR_LEXICON_FR,
  weights: typeof ANCHOR_WEIGHTS
): Map<string, { layer: string; weight: number }> {
  const idx = new Map<string, { layer: string; weight: number }>();
  for (const [layerKey, words] of Object.entries(lexicon)) {
    const w = (weights as any)[layerKey] ?? 1.0;
    for (const word of words as readonly string[]) {
      if (!idx.has(word)) idx.set(word, { layer: layerKey, weight: w });
    }
  }
  return idx;
}

/** Check if a word is an anchor. */
export function isAnchor(word: string, lexicon: typeof ANCHOR_LEXICON_FR): boolean {
  for (const words of Object.values(lexicon)) {
    if ((words as readonly string[]).includes(word)) return true;
  }
  return false;
}

/** Get stats. */
export function getAnchorStats(lexicon: typeof ANCHOR_LEXICON_FR): Record<string, number> {
  const stats: Record<string, number> = { total: 0 };
  for (const [layer, words] of Object.entries(lexicon)) {
    stats[layer] = (words as readonly string[]).length;
    stats.total += (words as readonly string[]).length;
  }
  return stats;
}
