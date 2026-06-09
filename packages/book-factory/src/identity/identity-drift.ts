/**
 * OMEGA — AP-2 : détecteur de DÉRIVE D'IDENTITÉ de niveau coréférence (ferme la
 * dette EMP-16 laissée par author-rule-gate). Le détecteur précédent (arc-coherence
 * co-occurrence, fenêtre 80c) a halluciné sur le V3 (« gardien porte Léna/Yvon/
 * Garcia/Gaspard » = interlocuteurs). Ici : APPOSITION SERRÉE uniquement — un rôle
 * n'est lié à un nom que par « le <rôle> <Nom> » ou « <Nom>, le <rôle> » (adjacent).
 * Un personnage proche du mot-rôle mais NON apposé n'est PAS lié → zéro faux-positif
 * d'interlocuteur. Dérive = un rôle apposé à ≥2 noms DISTINCTS (hors alias déclarés).
 *
 * MÉCANISME : deux patrons d'apposition par rôle, comptage par nom, exclusion des
 * alias et des mots qui existent en minuscules (pas de vrais prénoms). Pur,
 * déterministe. LIMITE : un rôle porté par périphrase (« l'homme du phare ») ou une
 * dérive sans apposition échappe (faux-négatif assumé — mieux que le faux-positif
 * d'une gate dure). Lexique de rôles extensible.
 */

export const ROLE_LEXICON: readonly string[] = ['gardien', 'maire', 'curé', 'pharmacien', 'patron', 'capitaine', 'médecin', 'docteur', 'commissaire', 'inspecteur', 'aubergiste', 'instituteur'];

const NAME = '[A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,}(?:-[A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})?';

export interface IdentityDriftSignal {
  readonly role: string;
  readonly names: ReadonlyArray<{ readonly name: string; readonly occurrences: number }>;
}

export interface IdentityDriftOptions {
  readonly roles?: readonly string[];
  /** Noms à traiter comme une même personne (alias légitimes) par rôle. */
  readonly aliases?: ReadonlyMap<string, readonly string[]>;
  /** Occurrences minimales d'apposition pour qu'un nom compte (anti-bruit). */
  readonly minOccurrences?: number;
}

/** Vocabulaire minuscule du texte : un VRAI prénom n'apparaît jamais en minuscules. */
function lowercaseVocab(text: string): ReadonlySet<string> {
  const v = new Set<string>();
  for (const w of text.normalize('NFC').split(/[\s,;:!?.…«»"()—]+/u)) {
    if (w.length >= 3 && /^[a-zàâçéèêëîïôûùüÿ-]+$/u.test(w)) v.add(w);
  }
  return v;
}

export function detectIdentityDrift(text: string, opts: IdentityDriftOptions = {}): readonly IdentityDriftSignal[] {
  const roles = opts.roles ?? ROLE_LEXICON;
  const minOcc = opts.minOccurrences ?? 2;
  const vocab = lowercaseVocab(text);
  const norm = text.normalize('NFC');
  const out: IdentityDriftSignal[] = [];

  for (const role of roles) {
    const aliasGroups = opts.aliases?.get(role) ?? [];
    const aliasSet = new Set(aliasGroups);
    const counts = new Map<string, number>();
    const before = new RegExp(`\\b(?:le|la|du|de\\s+la|au|un|une|ce|cette|vieux|vieille)\\s+${role}\\s+(${NAME})\\b`, 'giu');
    const after = new RegExp(`\\b(${NAME}),?\\s+(?:le|la)\\s+(?:vieux\\s+|vieille\\s+)?${role}\\b`, 'giu');
    for (const re of [before, after]) {
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(norm)) !== null) {
        const name = m[1];
        if (name === undefined) continue;
        if (vocab.has(name.toLowerCase())) continue; // mot de début de phrase, pas un prénom
        if (aliasSet.has(name)) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    const names = [...counts.entries()]
      .filter(([, n]) => n >= minOcc)
      .map(([name, occurrences]) => ({ name, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences || a.name.localeCompare(b.name));
    if (names.length >= 2) out.push({ role, names });
  }
  return out;
}

export const hasIdentityDrift = (text: string, opts?: IdentityDriftOptions): boolean => detectIdentityDrift(text, opts).length > 0;
