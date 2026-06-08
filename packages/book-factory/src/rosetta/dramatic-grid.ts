/**
 * OMEGA — S0_DRAMATIC_ROSETTA : grille de directives par fonction dramatique.
 * CONCEPT-ROSETTA-DRAMATIC-FUNCTION-CALIBRATION-001 (GO tribunal 2/2, 2026-06-08).
 *
 * Mandat : V2 a prouvé que l'escalade C17 en français générique NE MORD PAS sur
 * gemma4 (14 regens, 14 re-dérives, fallback A ×14). Le levier n'est plus la
 * gate (elle détecte) mais la TRADUCTION OPÉRATOIRE de la fonction dramatique
 * en directive que gemma4 EXÉCUTE réellement.
 *
 * Protocole ChatGPT : 4 variantes par fonction —
 *   A = vague        (« écris une révélation »)
 *   B = structurelle (« fais découvrir une information nouvelle »)
 *   C = comportementale (« l'information change la décision du personnage »)
 *   D = vérifiable AVANT/PENDANT/APRÈS (contrainte de sortie testable)
 *
 * HONNÊTETÉ EMP-19 : on ne calibre QUE les fonctions que l'instrument SAIT
 * lire. Le classifieur (arc-coherence) émet REVELATION / CONFRONTATION / ACTION
 * / TRANSITION / REDITE. DONC :
 *   - REVELATION, CONFRONTATION, ACTION = calibrées (markers positifs mesurables).
 *   - TRANSITION = fonction de CONTRÔLE (défaut du modèle ; pas un objectif à
 *     « produire » mais le baseline contre lequel mesurer la dérive).
 *   - DECISION, REVERSAL = UNMEASURABLE_BY_CURRENT_CLASSIFIER : aucune directive
 *     calibrée ici (les fabriquer serait calibrer à l'aveugle). Extension du
 *     classifieur = modif moteur = 3 preuves EMP-16 requises AVANT (consigné).
 */

export type MeasurableFn = 'REVELATION' | 'CONFRONTATION' | 'ACTION' | 'TRANSITION';
export type Variant = 'A' | 'B' | 'C' | 'D';

export interface Directive {
  readonly fn: MeasurableFn;
  readonly variant: Variant;
  readonly text: string;
}

/** Fonctions hors de portée de l'instrument actuel — JAMAIS calibrées à l'aveugle. */
export const UNMEASURABLE_FUNCTIONS: ReadonlyArray<{ fn: string; reason: string }> = [
  { fn: 'SETUP', reason: 'le classifieur ne distingue pas SETUP de TRANSITION (densités identiques)' },
  { fn: 'PAYOFF', reason: 'le classifieur ne l\'émet pas (pas de marqueur de récolte de graine)' },
  { fn: 'DECISION', reason: 'ajout ChatGPT — aucun marqueur dans arc-coherence ; extension classifieur = modif moteur = 3 preuves' },
  { fn: 'REVERSAL', reason: 'ajout ChatGPT — idem DECISION ; UNMEASURABLE tant que le classifieur ne sait pas le lire' },
];

/** 4 fonctions × 4 variantes = 16 directives. Français calibré, testable.
 *  INTERDIT (leçon Mode C / musée des horreurs) : aucune directive ne demande
 *  « ressens », « sois plus », « améliore » — uniquement des CONTRAINTES de
 *  contenu vérifiables. */
export const DRAMATIC_GRID: readonly Directive[] = [
  /* ── RÉVÉLATION ── */
  { fn: 'REVELATION', variant: 'A', text: 'Écris une révélation forte dans cette scène.' },
  { fn: 'REVELATION', variant: 'B', text: 'Un personnage doit découvrir une information nouvelle qu\'il ignorait.' },
  { fn: 'REVELATION', variant: 'C', text: 'Un personnage apprend un fait précis qui change immédiatement sa décision ou son rapport à un autre personnage.' },
  { fn: 'REVELATION', variant: 'D', text: 'STRUCTURE OBLIGATOIRE de la scène : (1) AVANT — montre ce que le personnage croit ; (2) RÉVÉLATION — un autre personnage avoue, confirme ou découvre un fait nouveau et vérifiable (emploie un verbe d\'aveu : « il avoua », « elle comprit que », « la vérité éclata ») ; (3) APRÈS — le personnage modifie sa décision ou son action sur-le-champ. INTERDIT de finir sans le fait nouveau.' },

  /* ── CONFRONTATION ── */
  { fn: 'CONFRONTATION', variant: 'A', text: 'Écris une scène de confrontation.' },
  { fn: 'CONFRONTATION', variant: 'B', text: 'Deux personnages s\'opposent sur un désaccord précis.' },
  { fn: 'CONFRONTATION', variant: 'C', text: 'Deux personnages s\'affrontent EN DIALOGUE direct : l\'un accuse ou exige, l\'autre refuse ou se défend, sans narrateur entre les répliques.' },
  { fn: 'CONFRONTATION', variant: 'D', text: 'STRUCTURE OBLIGATOIRE : un personnage ACCUSE, MENACE ou EXIGE quelque chose de précis (emploie le verbe : « il l\'accusa de… », « elle exigea… ») ; l\'autre RIPOSTE en dialogue ; le ton MONTE réplique après réplique. Majorité de la scène en dialogue (tirets ou guillemets). INTERDIT de désamorcer par une description apaisante.' },

  /* ── ACTION ── */
  { fn: 'ACTION', variant: 'A', text: 'Écris une scène d\'action.' },
  { fn: 'ACTION', variant: 'B', text: 'Un personnage accomplit des gestes physiques rapides et concrets.' },
  { fn: 'ACTION', variant: 'C', text: 'Un événement physique force un personnage à agir vite : il court, saisit, frappe ou fuit — des verbes d\'action concrets, pas d\'introspection.' },
  { fn: 'ACTION', variant: 'D', text: 'STRUCTURE OBLIGATOIRE : un déclencheur physique soudain (un bruit, une chute, une attaque) ; puis le personnage RÉAGIT par des gestes concrets enchaînés (emploie des verbes d\'action forte : courut, saisit, frappa, brisa, bondit, se jeta). Phrases courtes. INTERDIT de ralentir par une réflexion intérieure pendant l\'action.' },

  /* ── TRANSITION (contrôle — baseline du modèle, pas un objectif) ── */
  { fn: 'TRANSITION', variant: 'A', text: 'Écris une scène de transition.' },
  { fn: 'TRANSITION', variant: 'B', text: 'Relie deux moments de l\'histoire par un passage calme.' },
  { fn: 'TRANSITION', variant: 'C', text: 'Fais passer le temps et changer de lieu sans événement majeur.' },
  { fn: 'TRANSITION', variant: 'D', text: 'Un personnage se déplace d\'un lieu à un autre ; le temps s\'écoule ; aucun fait nouveau n\'est révélé, aucun affrontement, aucune action violente. Atmosphère et observation.' },
];

export function directivesFor(fn: MeasurableFn): readonly Directive[] {
  return DRAMATIC_GRID.filter((d) => d.fn === fn);
}

/**
 * EXEMPLARS FEW-SHOT — le SEUL levier PROUVÉ (S0-bis, 2026-06-08) :
 *   REVELATION : directive D seule 0% → few-shot 100% (3/3)
 *   CONFRONTATION : directive D seule 0% → few-shot 67% (2/3)
 * gemma4 a besoin de VOIR le registre lexical, pas qu'on le lui DÉCRIVE
 * (S0 a réfuté « la directive vérifiable mord » ; le Gold-Set innocente la
 * mesure recall 0.75 ; gemma4 sous-produit 37× la densité humaine).
 * Texte IDENTIQUE à la preuve s0-fewshot.ts — SSOT.
 */
export const FEWSHOT_EXEMPLARS: Readonly<Record<'REVELATION' | 'CONFRONTATION', string>> = {
  REVELATION: 'EXEMPLE du registre attendu (ne PAS le recopier, écris une scène neuve dans le même registre d\'aveu) :\n« Garcia baissa les yeux. Puis il avoua : c\'était lui qui avait éteint le phare cette nuit-là. Léna comprit alors que tout ce qu\'on lui avait raconté était faux. La vérité éclata d\'un coup : son père n\'était pas mort en mer. »',
  CONFRONTATION: 'EXEMPLE du registre attendu (ne PAS le recopier, écris une scène neuve dans le même registre d\'affrontement) :\n« — Tu m\'accuses, moi ? exigea Léna.\n— Je t\'accuse, oui, dit Garcia, et je te défie de le nier.\nElle se dressa, menaça de tout révéler. Le ton montait, réplique après réplique. »',
};
