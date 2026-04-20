/**
 * ANCHOR_LEXICON_EN - English Sensory Anchor Lexicon
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

export const ANCHOR_LEXICON_EN = {
  c1_material: [
    "metal", "metals", "steel", "iron", "copper", "bronze", "brass", "aluminum", "tin", "lead",
    "gold", "silver", "platinum", "nickel", "cobalt", "titanium", "mercury", "arsenic",
    "wood", "woods", "oak", "pine", "cedar", "birch", "maple", "ash", "elm", "spruce",
    "fir", "walnut", "teak", "mahogany", "cypress", "larch", "beech", "hickory", "poplar",
    "marble", "granite", "slate", "limestone", "sandstone", "basalt", "flint", "obsidian",
    "chalk", "schist", "dolomite", "quartz", "gneiss", "shale", "siltstone",
    "silica",
    "fabric", "fabrics", "silk", "wool", "cotton", "linen", "hemp", "jute", "burlap", "muslin",
    "damask", "velvet", "satin", "organza", "taffeta", "rayon", "nylon", "polyester", "sable", "fur",
    "leather", "suede", "hide", "parchment", "vellum",
    "wax", "clay", "plaster", "cement", "concrete", "mortar", "gypsum", "adobe", "brick",
    "sand", "earth", "soil", "mud", "peat", "loam", "silt",
    "rust", "patina", "verdigris", "oxidation",
    "moss", "lichen", "algae", "fungus", "mold",
    "cork", "bark", "lignin", "cellulose",
    "rubber", "latex", "resin", "amber", "pitch", "tar", "bitumen", "asphalt",
    "rope", "cord", "twine", "string", "yarn",
    "chain", "chains", "link", "links",
    "wire", "wires",
    "paper", "papyrus", "tissue", "cardboard", "kraft"
  ] as const,

  c1_object: [
    "table", "tables", "desk", "desks", "bench", "benches", "throne", "thrones", "pedestal", "pedestals",
    "chair", "chairs", "stool", "stools", "settee", "settees", "couch", "couches", "sofa", "sofas",
    "door", "doors", "gate", "gates", "hatch", "hatches", "shutter", "shutters", "porthole",
    "window", "windows", "frame", "frames", "pane", "panes", "lattice", "lattices",
    "wall", "walls", "partition", "partitions", "bulkhead", "bulkheads", "rampart", "ramparts", "bastion", "bastions",
    "floor", "floors", "tile", "tiles", "plank", "planks", "board", "boards",
    "ceiling", "ceilings", "vault", "vaults", "dome", "domes", "cupola", "cupolas",
    "bed", "beds", "cot", "cots", "crib", "cradle", "hammock", "hammocks", "pallet", "pallets",
    "lamp", "lamps", "lantern", "lanterns", "candle", "candles", "torch", "torches", "sconce", "sconces",
    "mirror", "mirrors", "prism", "prisms",
    "clock", "clocks", "watch", "watches", "hourglass", "hourglasses", "sundial", "sundials",
    "knife", "knives", "blade", "blades", "dagger", "daggers", "sword", "swords", "sabre", "sabres",
    "fork", "forks", "spoon", "spoons", "ladle", "ladles", "spatula", "spatulas", "tongs",
    "cup", "cups", "mug", "mugs", "goblet", "goblets", "chalice", "chalices", "tankard", "tankards",
    "plate", "plates", "dish", "dishes", "bowl", "bowls", "saucer", "saucers", "tureen", "tureens",
    "bottle", "bottles", "flask", "flasks", "vial", "vials", "decanter", "decanters", "carafe", "carafes",
    "basket", "baskets", "crate", "crates", "hamper", "hampers", "chests",
    "bucket", "buckets", "pail", "pails", "kettle", "kettles", "pitcher", "pitchers", "ewer", "ewers",
    "curtain", "curtains", "drape", "drapes", "tapestry", "tapestries", "hanging", "hangings",
    "carpet", "carpets", "rug", "rugs", "mat", "mats", "runner", "runners",
    "shelf", "shelves", "ledge", "ledges", "mantel", "mantels", "credenza", "credenzas", "hutch", "hutches",
    "drawer", "drawers", "cabinet", "cabinets", "case", "cases", "cupboard", "cupboards", "armoire", "armoires",
    "staircase", "staircases", "steps", "step", "ladder", "ladders", "ramp", "ramps", "stair", "stairs",
    "balcony", "balconies", "terrace", "terraces", "veranda", "verandas", "porch", "porches", "stoop", "stoops",
    "threshold", "thresholds", "vestibule", "vestibules", "foyer", "foyers", "anteroom", "anterooms",
    "pillar", "pillars", "column", "columns", "post", "posts", "beam", "beams", "joist", "joists",
    "arch", "arches", "alcove", "alcoves", "niche", "niches", "recess", "recesses"
  ] as const,

  c1_micro_detail: [
    "lock", "locks", "padlock", "padlocks", "bolt", "bolts", "latch", "latches",
    "hinge", "hinges", "pivot", "pivots", "joint", "joints",
    "knob", "knobs", "handle", "handles", "lever", "levers", "pulley", "pulleys",
    "buckle", "buckles", "brooch", "brooches", "pin", "pins", "clip", "clips",
    "button", "buttons", "toggle", "toggles", "snap", "snaps", "hook", "hooks", "eye", "eyes",
    "needle", "needles", "thimble", "thimbles", "bobbin", "bobbins",
    "ribbon", "ribbons", "bow", "bows", "rosette", "rosettes", "tassel", "tassels", "fringe", "fringes",
    "bead", "beads", "pearl", "pearls", "gem", "gems", "jewel", "jewels", "pebble", "pebbles", "gravel", "gravels", "aggregate",
    "splinter", "splinters", "thorn", "thorns", "burr", "burrs",
    "grain", "grains", "crumb", "crumbs", "morsel", "morsels", "fragment", "fragments", "scrap", "scraps",
    "flake", "flakes", "scale", "scales", "chip", "chips", "shard", "shards",
    "thread", "threads", "seam", "seams", "stitch", "stitches", "loop", "loops",
    "nail", "nails", "spike", "spikes", "fastener", "fasteners", "rivet", "rivets",
    "screw", "screws", "nut", "nuts", "washer", "washers",
    "wrinkle", "wrinkles", "crease", "creases", "fold", "folds", "pleat", "pleats",
    "dimple", "dimples", "indent", "indents", "mark", "marks", "scar", "scars",
    "hollow", "hollows", "groove", "grooves", "channel", "channels"
  ] as const,

  c2_body: [
    "hand", "hands", "palm", "palms", "knuckle", "knuckles",
    "arm", "arms", "upper arm", "forearm", "forearms",
    "leg", "legs", "upper leg", "lower leg", "shin", "shins",
    "foot", "feet", "sole", "soles", "heel", "heels", "toe", "toes",
    "back", "backs", "backbone", "spine", "spinal",
    "shoulder", "shoulders", "deltoid", "deltoids",
    "knee", "knees", "kneecap", "kneecaps",
    "hip", "hips", "pelvic", "pelvis",
    "stomach", "belly", "abdomen", "abdominal", "gut", "guts",
    "thorax", "thoracic", "breast", "breasts",
    "neck", "nape", "throat", "gullet",
    "head", "skull", "cranium", "cranial",
    "forehead",
    "cheek", "cheeks", "temple", "temples",
    "chin", "jowl", "jowls",
    "jaw", "mandible", "maxilla",
    "torso", "core",
    "waist", "loin", "loins",
    "thigh", "thighs", "femur",
    "calf", "calves",
    "ankle", "ankles", "talus",
    "wrist", "wrists", "carpus",
    "elbow", "elbows",
    "buttock", "buttocks", "gluteus", "rump",
    "flank", "flanks", "side", "sides"
  ] as const,

  c2_organ: [
    "finger", "fingers", "index", "middle", "ring", "pinky", "pinkies", "thumb", "thumbs",
    "fingertip", "fingertips", "cuticle", "cuticles", "thumbnail", "thumbnails",
    "lip", "lips", "upper lip", "lower lip",
    "mouth", "oral", "cavity",
    "tooth", "teeth", "molar", "molars", "incisor", "incisors", "canine", "canines",
    "gum", "gums", "gingiva",
    "tongue", "lingual", "dorsum",
    "palate", "hard palate", "soft palate", "velum",
    "tonsil", "tonsils",
    "eyelid", "eyelids", "lid", "lids",
    "eyelash", "eyelashes", "lash", "lashes", "cilium",
    "eyebrow", "eyebrows",
    "iris", "irises", "pupil", "pupils", "sclera", "sclerae",
    "cornea", "corneas",
    "ear", "ears", "earlobe", "earlobes", "auricle", "auricles", "pinna", "pinnae",
    "nostril", "nostrils", "naris", "nares",
    "tendon", "tendons", "sinew", "sinews",
    "vein", "veins", "artery", "arteries", "capillary", "capillaries",
    "nerve", "nerves", "neural",
    "bone", "bones", "skeletal",
    "rib", "ribs", "costal",
    "cartilage", "cartilages", "gristle", "gristles",
    "muscle", "muscles", "muscular",
    "skin", "dermal", "dermis", "epidermis",
    "pore", "pores", "follicle", "follicles",
    "hair", "hairs",
    "blood", "vascular",
    "lymph", "lymphatic",
    "organ", "organs", "viscera",
    "heart", "cardiac",
    "lung", "lungs", "pulmonary",
    "liver", "hepatic",
    "kidney", "kidneys", "renal",
    "intestine", "intestines", "bowel", "bowels"
  ] as const,

  c3_reaction: [
    "shiver", "shivers", "shivered", "shivering",
    "sweat", "sweats", "sweated", "sweating", "perspiration", "perspiring",
    "tremble", "trembles", "trembled", "trembling",
    "gasp", "gasps", "gasped", "gasping",
    "flinch", "flinches", "flinched", "flinching",
    "shudder", "shudders", "shuddered", "shuddering",
    "goosebump", "goosebumps", "goosebumped",
    "blush", "blushes", "blushed", "blushing",
    "nausea", "nauseated", "nauseating",
    "vertigo", "dizziness", "dizzy",
    "cramp", "cramps", "cramped", "cramping",
    "spasm", "spasms", "spasmed", "spasmic",
    "twitch", "twitches", "twitched", "twitching",
    "palpitation", "palpitations", "palpitate", "palpitating",
    "pounding", "pound", "pounds", "pounded",
    "racing", "race", "races", "raced",
    "quickening", "quicken", "quickens", "quickened",
    "tightening", "tighten", "tightens", "tightened",
    "lurch", "lurches", "lurched", "lurching",
    "jolt", "jolts", "jolted", "jolting",
    "stagger", "staggers", "staggered", "staggering",
    "stumble", "stumbles", "stumbled", "stumbling",
    "sob", "sobs", "sobbed", "sobbing",
    "whimper", "whimpers", "whimpered", "whimpering",
    "groan", "groans", "groaned", "groaning",
    "moan", "moans", "moaned", "moaning",
    "wheeze", "wheezes", "wheezed", "wheezing",
    "pant", "pants", "panted", "panting",
    "gulp", "gulps", "gulped", "gulping",
    "choke", "chokes", "choked", "choking",
    "cough", "coughs", "coughed", "coughing",
    "sigh", "sighs", "sighed", "sighing",
    "retch", "retches", "retched", "retching",
    "heave", "heaves", "heaved", "heaving",
    "convulse", "convulses", "convulsed", "convulsing"
  ] as const,

  c3_interaction: [
    "embrace", "embraces", "embraced", "embracing",
    "caress", "caresses", "caressed", "caressing",
    "slap", "slaps", "slapped", "slapping",
    "kiss", "kisses", "kissed", "kissing",
    "punch", "punches", "punched", "punching",
    "push", "pushes", "pushed", "pushing",
    "pull", "pulls", "pulled", "pulling",
    "grab", "grabs", "grabbed", "grabbing",
    "grasp", "grasps", "grasped", "grasping",
    "grip", "grips", "gripped", "gripping",
    "squeeze", "squeezes", "squeezed", "squeezing",
    "stroke", "strokes", "stroked", "stroking",
    "touch", "touches", "touched", "touching",
    "pinch", "pinches", "pinched", "pinching",
    "scratch", "scratches", "scratched", "scratching",
    "tickle", "tickles", "tickled", "tickling",
    "poke", "pokes", "poked", "poking",
    "prod", "prods", "prodded", "prodding",
    "jab", "jabs", "jabbed", "jabbing",
    "strike", "strikes", "struck", "striking",
    "hit", "hits", "hitting",
    "smash", "smashes", "smashed", "smashing",
    "crush", "crushes", "crushed", "crushing",
    "bend", "bends", "bent", "bending",
    "twist", "twists", "twisted", "twisting",
    "wring", "wrings", "wrung", "wringing",
    "knead", "kneads", "kneaded", "kneading",
    "massage", "massages", "massaged", "massaging",
    "rub", "rubs", "rubbed", "rubbing",
    "brush", "brushes", "brushed", "brushing",
    "wipe", "wipes", "wiped", "wiping",
    "scrub", "scrubs", "scrubbed", "scrubbing",
    "hug", "hugs", "hugged", "hugging",
    "hold", "holds", "held", "holding",
    "clutch", "clutches", "clutched", "clutching",
    "seize", "seizes", "seized", "seizing",
    "snatch", "snatches", "snatched", "snatching",
    "throw", "throws", "threw", "throwing",
    "toss", "tosses", "tossed", "tossing",
    "lift", "lifts", "lifted", "lifting",
    "carry", "carries", "carried", "carrying",
    "lower", "lowers", "lowered", "lowering",
    "place", "places", "placed", "placing",
    "set", "sets", "setting",
    "drop", "drops", "dropped", "dropping",
    "press", "presses", "pressed", "pressing",
    "lean", "leans", "leaned", "leaning"
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

/**
 * Build a searchable index of anchors with their layer and weight.
 * Returns a Map where key = normalized word, value = {layer, weight}
 */
export function buildAnchorIndex(
  lexicon: typeof ANCHOR_LEXICON_EN,
  weights: typeof ANCHOR_WEIGHTS
): Map<string, { layer: keyof typeof ANCHOR_LEXICON_EN; weight: number }> {
  const index = new Map<string, { layer: keyof typeof ANCHOR_LEXICON_EN; weight: number }>();

  for (const layer of Object.keys(lexicon) as Array<keyof typeof ANCHOR_LEXICON_EN>) {
    const words = lexicon[layer];
    const weight = weights[layer];

    for (const word of words) {
      const normalized = word.toLowerCase().trim();
      if (!index.has(normalized)) {
        index.set(normalized, { layer, weight });
      }
    }
  }

  return index;
}

/**
 * Check if a word is an anchor.
 * Returns true if the word exists in any layer of the lexicon.
 */
export function isAnchor(word: string, lexicon: typeof ANCHOR_LEXICON_EN): boolean {
  const normalized = word.toLowerCase().trim();

  for (const layer of Object.keys(lexicon) as Array<keyof typeof ANCHOR_LEXICON_EN>) {
    const words = lexicon[layer];
    if ((words as readonly string[]).includes(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Get statistics about anchor lexicon coverage.
 * Returns an object with entry counts per layer and totals.
 */
export function getAnchorStats(
  lexicon: typeof ANCHOR_LEXICON_EN
): Record<string, number> {
  const stats: Record<string, number> = {};
  let total = 0;

  for (const layer of Object.keys(lexicon) as Array<keyof typeof ANCHOR_LEXICON_EN>) {
    const count = lexicon[layer].length;
    stats[layer] = count;
    total += count;
  }

  stats["total"] = total;

  // Check for duplicates
  const allWords = new Set<string>();
  let duplicateCount = 0;

  for (const layer of Object.keys(lexicon) as Array<keyof typeof ANCHOR_LEXICON_EN>) {
    const words = lexicon[layer];
    for (const word of words) {
      const normalized = word.toLowerCase().trim();
      if (allWords.has(normalized)) {
        duplicateCount++;
      } else {
        allWords.add(normalized);
      }
    }
  }

  stats["duplicates"] = duplicateCount;
  stats["unique"] = allWords.size;

  return stats;
}
