/**
 * OMEGA — SCEAUX D'AUTEUR EMP-16 (PX-1) — ledger BOOK-SCOPED.
 * Règle BOOK_SCOPED_LEDGER : un fichier de sceaux PAR livre — verifyAnchors
 * contrôle TOUS les locks actifs contre LE texte ; mélanger deux livres
 * fabrique des UNRESOLVED_LOCK faux positifs.
 * Provenance : délégation Francky 2026-06-07 + tribunal Gemini/ChatGPT 2/2.
 * Idempotent : refuse d'écraser un ledger existant (append-only par nature).
 */

import { existsSync, writeFileSync } from 'node:fs';

import { AuthorDecisionLedger } from '../identity/author-seal.js';

const OUT = '../../nexus/proof/AUTHOR_DECISIONS_EMP16.json';

function main(): void {
  if (existsSync(OUT)) {
    console.log('LEDGER DEJA PRESENT — append-only, aucune réécriture. Rien à faire.');
    return;
  }
  const led = new AuthorDecisionLedger();

  led.seal({
    kind: 'ENTITY_LOCK', verdict: 'MARK_AS_CANON',
    question: 'Marc Vallet (×5, « ancien officier… sur le pont au naufrage ») est apparu HORS PLAN_LOCK. Minter ou rejeter ?',
    answer: 'MINT_AS_ENTITY — AUTHOR_ACCEPTED_POST_MINT (tribunal 2/2 : Gemini « excellente initiative », ChatGPT « pas un bruit lexical »). Règle MAINTENUE : tout futur personnage nommé hors PLAN_LOCK déclenche Author Review — zéro laissez-passer automatique.',
    ruleText: 'CHARACTER Vallet (alias Marc Vallet) — source GENERATED_OUT_OF_PLAN — status AUTHOR_ACCEPTED_POST_MINT',
  });

  led.seal({
    kind: 'SPAN_LOCK', verdict: 'KEEP',
    question: 'Résidu sémantique ch.39 : « Je parlerai si je disparais. » flaggé TRUNCATED_STEM. Réparer ?',
    answer: 'KEEP — le texte était SAIN : faux positif FLEXIONNEL du détecteur (hapax « disparais », préfixe de « disparaissent » ×5), corrigé à la racine par NCR-PX2-001 (M1 clitique sujet + M2 fusion « » » nu). Phrase verrouillée contre toute retouche future.',
    anchorExcerpt: "Le prix du sang ne s'efface pas avec le temps. Je parlerai si je disparais. »",
  });

  led.seal({
    kind: 'DECISION_LOCK', verdict: 'REPAIR',
    question: '11 incipits clonés (têtes 4 mots ×≥3). Réparer un par un ?',
    answer: 'REPAIR_SYSTEMIC — divergence tranchée : ChatGPT interdit le patch manuel, Gemini diagnostique lui-même une cause GÉNÉRATIONNELLE. La cause est traitée par INCIPIT_DIVERSITY_GATE (VARIATION_ENGINE) au runtime du prochain run ; le manuscrit EMP-16 reste un échantillon clinique non retouché.',
    ruleText: 'INCIPIT_CLONES = SYSTEMIC_REDUNDANCY → gate runtime (C18) ; interdiction de chirurgie locale de masse',
  });

  writeFileSync(OUT, led.toJson(), 'utf8');
  console.log(`SCELLÉ → ${OUT} : ${led.activeLocks().length} locks actifs.`);
}

main();
