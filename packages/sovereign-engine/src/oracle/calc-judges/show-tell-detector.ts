// src/oracle/calc-judges/show-tell-detector.ts
// INV-SDT-PROXY-01 + INV-SOMA-01
// CALC pur — zero LLM — regex deterministe

export interface ShowTellResult {
  readonly score: number;          // 0.0 -> 1.0
  readonly violations_sdt: number; // INV-SDT-PROXY-01
  readonly violations_soma: number; // INV-SOMA-01
  readonly penalty_total: number;
}

// INV-SDT-PROXY-01 — Pattern 1: Label emotionnel explicite (-0.15/occurrence)
// NOTE: (?=\W|$) remplace \b en fin de pattern car JS \b ne gere pas
// les caracteres accentues francais (é, è, à sont non-word pour \w)
const LABEL_PATTERNS = [
  /\b(il|elle)\s+(était|semblait|paraissait)\s+(terrifié|effrayé|triste|furieux|joyeux|anxieux|angoissé|désespéré|soulagé)(?=\W|$)/gi,
  /\b(il|elle)\s+(se\s+sentit|ressentit|éprouva)\s+(de\s+la\s+)?(peur|tristesse|colère|joie|terreur|honte|culpabilité)(?=\W|$)/gi,
  /\b(il|elle)\s+(était)\s+(submergé|envahi|écrasé|assailli)\s+(par|de)\s+/gi,
] as const;

// INV-SDT-PROXY-01 — Pattern 2: Ordre interdit label->sensation (-0.20/occurrence)
const FORBIDDEN_ORDER =
  /\b(peur|terreur|colère|tristesse|angoisse|honte)(?=\W|$).{1,60}\b(mains|cœur|yeux|souffle|gorge|ventre|jambes)\b/gi;

// INV-SOMA-01 — Anatomie generique (-0.10/occurrence)
const GENERIC_ANATOMY = [
  /\bson\s+cœur\s+(s'emballa|battait\s+(à\s+tout\s+rompre|fort|vite)|se\s+serra|se\s+souleva)\b/gi,
  /\bses\s+mains\s+(tremblaient|se\s+crispèrent|devinrent\s+moites)\b/gi,
  /\bses\s+jambes\s+(flageolaient|se\s+dérobèrent|devinrent\s+coton)\b/gi,
  /\bses\s+yeux\s+s'écarquillèrent\b/gi,
  /\bsa\s+gorge\s+s(e|'était)\s+serrée\b/gi,
  /\bson\s+ventre\s+se?\s+noua\b/gi,
] as const;

export function calculateShowTellScore(prose: string): ShowTellResult {
  let penalty = 0;
  let v_sdt = 0;
  let v_soma = 0;

  // INV-SDT-PROXY-01 — labels emotionnels
  for (const pattern of LABEL_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const m = prose.match(re);
    if (m) { v_sdt += m.length; penalty += m.length * 0.15; }
  }

  // INV-SDT-PROXY-01 — ordre interdit
  const forbiddenRe = new RegExp(FORBIDDEN_ORDER.source, FORBIDDEN_ORDER.flags);
  const om = prose.match(forbiddenRe);
  if (om) { v_sdt += om.length; penalty += om.length * 0.20; }

  // INV-SOMA-01 — anatomie generique
  for (const pattern of GENERIC_ANATOMY) {
    const re = new RegExp(pattern.source, pattern.flags);
    const m = prose.match(re);
    if (m) { v_soma += m.length; penalty += m.length * 0.10; }
  }

  return {
    score: Math.max(0, 1.0 - penalty),
    violations_sdt: v_sdt,
    violations_soma: v_soma,
    penalty_total: penalty,
  };
}
