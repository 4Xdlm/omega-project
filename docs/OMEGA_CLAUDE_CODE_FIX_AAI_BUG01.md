# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA — CLAUDE CODE PROMPT : FIX BUG-01 — CÂBLER LE VRAI LLM DANS AAI
# L'adversarial judge doit appeler le vrai LLM, pas tomber en fallback CALC
# ═══════════════════════════════════════════════════════════════════════════════
#
# Standard : NASA-Grade L4 / DO-178C Level A
# Branche : phase-r-metrology-rebuild
# Tests avant : 2003 PASS
#
# DIAGNOSTIC (AUDIT_AAI_BUG01.md) :
# adversarial-judge.ts ligne ~96 appelle provider.llm_generate()
# Cette méthode N'EXISTE PAS dans SovereignProvider (types.ts)
# → try/catch → fallback CALC → fraud_score=null → AAI=95.6 TOUJOURS
#
# IMPACT : AAI pèse 25% du composite. Score fixe = pas de discrimination.
# Les 3/5 SAGA_READY pourraient changer si AAI réel varie.
#
# FIX : Remplacer llm_generate() par generateStructuredJSON() qui EXISTE.
# ═══════════════════════════════════════════════════════════════════════════════

## ÉTAPE 1 — Modifier adversarial-judge.ts

### Fichier : `src/authenticity/adversarial-judge.ts`

Trouver la ligne ~96 qui fait :
```typescript
const response = await provider.llm_generate({
  prompt,
  max_tokens: 300,
  temperature: 0.1,
});
```

Remplacer par :
```typescript
const response = await provider.generateStructuredJSON(prompt);
```

### Adapter le parsing

La méthode `generateStructuredJSON` retourne un `unknown` (pas `{text: string}`).
Il faut adapter le code juste après l'appel :

AVANT :
```typescript
const parsed = parseAdversarialResponse(response.text);
```

APRÈS :
```typescript
// generateStructuredJSON retourne le texte brut ou un objet
const responseText = typeof response === 'string' ? response : JSON.stringify(response);
const parsed = parseAdversarialResponse(responseText);
```

### Mettre à jour le commentaire de version

Changer `ADVERSARIAL_PROMPT_VERSION` de `'v1.0.0'` à `'v1.1.0'`
(le prompt ne change pas mais le path d'exécution change — invalider le cache).

### Mettre à jour le header

Ajouter au header du fichier :
```typescript
// BUG-01 FIX: provider.llm_generate() n'existait pas dans SovereignProvider.
// Remplacé par provider.generateStructuredJSON() (v1.1.0).
// Avant ce fix, fraud_score était TOUJOURS null → fallback CALC → AAI=95.6 invariant.
```

## ÉTAPE 2 — Vérifier que le fallback CALC reste fonctionnel

Le try/catch existant gère déjà le cas où le LLM échoue → fallback CALC.
Vérifier que ce path fonctionne toujours :

```typescript
} catch (err: unknown) {
  const errorMsg = err instanceof Error ? err.message : String(err);
  return {
    fraud_score: null,
    rationale: `LLM indisponible ou erreur: ${errorMsg}. Utiliser CALC fallback uniquement.`,
    cached: false,
    method: 'calc_fallback',
  };
}
```

Ce code doit rester INCHANGÉ. Le fallback CALC est un filet de sécurité.

## ÉTAPE 3 — Vérifier le consommateur : authenticity.ts

Ouvrir `src/oracle/axes/authenticity.ts` et vérifier comment `fraud_score`
est utilisé quand il n'est PAS null :

- Si `fraud_score !== null` : il doit être intégré dans le score (HYBRID)
- Si `fraud_score === null` : CALC seul (le comportement actuel)

Vérifier que le calcul HYBRID fonctionne correctement quand fraud_score
a une valeur réelle (ex: 72, 85, 45). Si le code n'a jamais été testé
avec une vraie valeur fraud_score, il peut y avoir un bug secondaire.

## ÉTAPE 4 — Tests

### Tests existants à adapter

Trouver les tests de `adversarial-judge.ts` et `authenticity.ts`.
Adapter si nécessaire pour le nouveau path (generateStructuredJSON).

### Nouveaux tests

```
it('judgeFraudScore calls generateStructuredJSON (not llm_generate)')
it('judgeFraudScore returns method=llm when LLM succeeds')
it('judgeFraudScore returns method=calc_fallback when LLM fails')
it('AAI varies when fraud_score is not null')
it('AAI with fraud_score=50 < AAI with fraud_score=90')
```

Le test le plus important : vérifier que quand le LLM retourne un score
réel (ex: {"score": 72, "rationale": "...", "worst_sentences": [...]}),
le AAI CHANGE et n'est plus 95.6.

## ÉTAPE 5 — Script de vérification (0 API pour les tests, API pour le script)

Créer `scripts/verify-aai-fix.ts` qui :

1. Prend 2-3 textes très différents (une contemplation, un dialogue sec, du texte IA générique)
2. Appelle computeAAI() sur chacun avec le vrai provider
3. Affiche les scores AAI et vérifie qu'ils VARIENT

Si les 3 AAI sont identiques → le fix n'a pas marché.
Si les 3 AAI varient → BUG-01 résolu.

Budget : 3-6 API calls

## VÉRIFICATION

1. `npm test` → tous GREEN (2003+ PASS)
2. `npx tsc --noEmit` → 0 erreurs (l'erreur TS2339 sur llm_generate doit DISPARAÎTRE)
3. Le test `it('AAI varies...')` PASSE

## COMMIT

```
fix(aai): BUG-01 résolu — adversarial judge câblé au vrai LLM

Root cause: provider.llm_generate() n'existait pas dans SovereignProvider.
L'adversarial judge tombait TOUJOURS en fallback CALC.
AAI = show_dont_tell(CALC=100) × 0.6 + authenticity(CALC=89) × 0.4 = 95.6 invariant.

Fix: remplacé llm_generate() par generateStructuredJSON() (existe et fonctionne).
Le cache adversarial est invalidé (prompt version v1.0.0 → v1.1.0).
Le fallback CALC reste en filet de sécurité si LLM échoue.

AAI devrait maintenant VARIER entre les briques :
  - Prose littéraire forte : AAI ~85-95
  - Prose avec patterns IA : AAI ~60-80
  - Prose avec telling violations : AAI ~70-85

Impact sur composite : AAI pèse 25%. Si AAI baisse de 95.6 à ~85,
le composite baisse de ~2.5 pts. Les 3/5 SAGA_READY doivent être re-confirmés.
```

## CE QUI NE DOIT PAS CHANGER

- Les autres juges (Necessity V2, Impact V1, Interiority V1)
- Le moteur de génération
- Le Duel / CV Gate
- Les prompts du Scribe
- Les poids macro-axes (AAI reste à 25%)
- Le Glossaire et le Linker
