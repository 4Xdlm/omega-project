/** OMEGA — AP-2 : dérive d'identité coref-grade. Détecte une vraie dérive (un rôle
 *  apposé à 2 noms) SANS attraper les interlocuteurs proches du mot-rôle (le faux
 *  positif du détecteur co-occurrence précédent). */
import { describe, expect, it } from 'vitest';

import { detectIdentityDrift, hasIdentityDrift } from '../src/identity/identity-drift.js';

describe('AP-2 — détecteur identité coref-grade', () => {
  it('ID-001 — vraie dérive : le gardien apposé à 2 noms distincts ⇒ détecté', () => {
    const t = 'Le gardien Thomas alluma la lampe. Thomas, le gardien, redescendit l\'escalier. Plus tard, le gardien Henri ouvrit le registre. Henri, le gardien, ferma les yeux.';
    const d = detectIdentityDrift(t);
    const gardien = d.find((s) => s.role === 'gardien');
    expect(gardien).toBeDefined();
    expect(gardien?.names.map((n) => n.name).sort()).toEqual(['Henri', 'Thomas']);
  });

  it('ID-002 — interlocuteurs proches du rôle NON apposés ⇒ AUCUNE dérive (anti-faux-positif)', () => {
    // Garcia/Léna parlent AU gardien mais ne sont pas « le gardien Garcia » → non liés.
    const t = 'Garcia fixa le gardien longuement. Léna parla au gardien à voix basse. Le gardien Thomas resta immobile. Thomas, le gardien, soupira enfin.';
    expect(hasIdentityDrift(t)).toBe(false); // seul Thomas est apposé
  });

  it('ID-003 — alias déclaré ⇒ pas de dérive (même personne)', () => {
    const t = 'Le gardien Thomas parla. Thomas, le gardien, se tut. Le gardien Tom revint. Tom, le gardien, partit.';
    const aliases = new Map([['gardien', ['Tom']]]); // Tom = alias de Thomas
    expect(hasIdentityDrift(t, { aliases })).toBe(false);
  });

  it('ID-004 — mot de début de phrase (minuscule ailleurs) n\'est pas un prénom', () => {
    // « Vieux » n'est pas un prénom ; pas d'apposition réelle ⇒ rien.
    const t = 'Le gardien resta. Vieux et las, le gardien dormait. Le gardien veillait encore.';
    expect(hasIdentityDrift(t)).toBe(false);
  });
});
