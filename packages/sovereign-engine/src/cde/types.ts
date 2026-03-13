/**
 * OMEGA Phase V — Context Distillation Engine (CDE) Types
 * Sprint V-INIT
 * Standard: NASA-Grade L4 / DO-178C
 *
 * Invariants:
 *   INV-CDE-01 : SceneBrief.token_estimate <= 150
 *   INV-CDE-02 : distillBrief() est deterministe — meme input -> meme output -> meme hash
 *   INV-CDE-03 : StateDelta contient 0 fait contradictoire avec les CanonFacts fournis
 *   INV-CDE-04 : toute dette ouverte dans le delta -> tracee dans debts_opened
 *   INV-CDE-05 : toute dette resolue -> tracee dans debts_resolved avec evidence
 *   INV-CDE-06 : chaque champ du SceneBrief est narrativement necessaire (0 decoratif)
 */

/** Un element chaud de la memoire narrative active */
export interface HotElement {
  readonly id:       string;   // identifiant unique
  readonly type:     'persona' | 'arc' | 'debt' | 'canon' | 'tension';
  readonly content:  string;   // description brute (peut etre long)
  readonly priority: number;   // [1-10] — 10 = critique pour cette scene
}

/** Fait etabli — non modifiable (Canon Lock) */
export interface CanonFact {
  readonly id:      string;
  readonly fact:    string;    // enonce court du fait canonique
  readonly sealed_at: string;  // ISO date quand le fait a ete etabli
}

/** Dette narrative — graine plantee non resolue */
export interface DebtEntry {
  readonly id:       string;
  readonly content:  string;   // description de la dette
  readonly opened_at: string;  // scene/chapitre ou elle a ete creee
  readonly resolved: boolean;
}

/** Etat de l'arc narratif d'un personnage pour cette scene */
export interface ArcState {
  readonly character_id: string;
  readonly arc_phase:    'setup' | 'confrontation' | 'resolution' | 'unknown';
  readonly current_need: string;    // ce dont le personnage a besoin maintenant
  readonly current_mask: string;    // ce qu'il montre au monde
  readonly tension:      string;    // conflit interne actif
}

/** Entrees pour la distillation */
export interface CDEInput {
  readonly hot_elements:   HotElement[];   // max recommande : 10
  readonly canon_facts:    CanonFact[];    // faits a ne jamais violer
  readonly open_debts:     DebtEntry[];    // dettes ouvertes pertinentes
  readonly arc_states:     ArcState[];     // etats d'arc des personnages actifs
  readonly scene_objective: string;        // objectif de la scene en 1 phrase
}

/**
 * Scene Brief — sortie compressee du CDE
 * INV-CDE-01 : token_estimate <= 150 (estimation 4 chars/token)
 */
export interface SceneBrief {
  readonly must_remain_true:   string;  // ce qui est vrai et doit le rester
  readonly in_tension:         string;  // ce qui cree la friction de la scene
  readonly must_move:          string;  // ce qui doit changer avant la fin
  readonly must_not_break:     string;  // interdits absolus (canon + arcs)
  readonly token_estimate:     number;  // ceil(total_chars / 4)
  readonly input_hash:         string;  // SHA256 de l'input serialise (INV-CDE-02)
}

/** Delta d'etat extrait apres generation — INV-CDE-03..05 */
export interface StateDelta {
  readonly new_facts:       string[];   // faits etablis par la scene
  readonly modified_facts:  Array<{ id: string; new_value: string }>;
  readonly debts_opened:    Array<{ content: string; evidence: string }>;  // INV-CDE-04
  readonly debts_resolved:  Array<{ id: string; evidence: string }>;       // INV-CDE-05
  readonly arc_movements:   Array<{ character_id: string; movement: string }>;
  readonly drift_flags:     string[];   // incoherences potentielles detectees
  readonly prose_hash:      string;     // SHA256 de la prose analysee
}

export class CDEError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'CDEError';
  }
}
