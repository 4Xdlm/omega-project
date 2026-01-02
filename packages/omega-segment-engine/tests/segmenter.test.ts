// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — TESTS L4
// ═══════════════════════════════════════════════════════════════════════════════
// 45+ tests NASA-Grade pour certification aérospatiale
// Standard: DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { segmentText } from "../src/segmenter.js";
import { assertAllInvariants } from "../src/invariants.js";
import { normalizeText } from "../src/normalizer.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE MODE — BASIQUE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Sentence Mode — Basique", () => {
  it("découpe sur point final", () => {
    const input = "Salut. Ça va.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Salut.");
    expect(result.segments[1].text).toBe("Ça va.");

    const { text } = normalizeText(input, "normalize_lf");
    assertAllInvariants(text, result);
  });

  it("découpe sur point d'exclamation", () => {
    const input = "Incroyable! C'est fou!";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Incroyable!");
    expect(result.segments[1].text).toBe("C'est fou!");
  });

  it("découpe sur point d'interrogation", () => {
    const input = "Vraiment? Tu es sûr?";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Vraiment?");
    expect(result.segments[1].text).toBe("Tu es sûr?");
  });

  it("découpe sur ellipse Unicode", () => {
    const input = "Je ne sais pas… Peut-être.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Je ne sais pas…");
  });

  it("normalise ... en … avant découpe", () => {
    const input = "Hum... Je réfléchis.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Hum…");
  });

  it("gère texte sans ponctuation finale", () => {
    const input = "Texte sans fin";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
    expect(result.segments[0].text).toBe("Texte sans fin");
  });

  it("double newline force frontière", () => {
    const input = "Phrase sans point\n\nAutre phrase";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Phrase sans point");
    expect(result.segments[1].text).toBe("Autre phrase");
  });

  it("ignore double newline si désactivé", () => {
    const input = "Phrase sans point\n\nContinuation";
    const result = segmentText(input, {
      mode: "sentence",
      sentence_break_on_double_newline: false,
    });

    expect(result.segment_count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE MODE — ABRÉVIATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Sentence Mode — Abréviations FR", () => {
  it("ne coupe pas sur M.", () => {
    const input = "M. Dupont est arrivé.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
    expect(result.segments[0].text).toBe("M. Dupont est arrivé.");
  });

  it("ne coupe pas sur Dr.", () => {
    const input = "Le Dr. Martin consulte.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
  });

  it("ne coupe pas sur etc.", () => {
    const input = "Pommes, poires, etc. sont des fruits.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
  });

  it("ne coupe pas sur cf.", () => {
    const input = "Voir cf. page 42 pour plus.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
  });

  it("ne coupe pas sur nombre décimal 3.14", () => {
    const input = "Pi vaut 3.14159 environ.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
  });

  it("gère J.-C. correctement", () => {
    const input = "En 44 av. J.-C. César mourut.";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARAGRAPH MODE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Paragraph Mode", () => {
  it("découpe sur ligne vide simple", () => {
    const input = "Paragraphe 1\n\nParagraphe 2";
    const result = segmentText(input, { mode: "paragraph" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Paragraphe 1");
    expect(result.segments[1].text).toBe("Paragraphe 2");
  });

  it("découpe sur multiple lignes vides", () => {
    const input = "P1\n\n\n\nP2";
    const result = segmentText(input, { mode: "paragraph" });

    expect(result.segment_count).toBe(2);
  });

  it("préserve contenu multi-lignes dans paragraphe", () => {
    const input = "Ligne 1\nLigne 2\n\nAutre paragraphe";
    const result = segmentText(input, { mode: "paragraph" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Ligne 1\nLigne 2");
  });

  it("gère CRLF en mode normalize", () => {
    const input = "P1\r\n\r\nP2";
    const result = segmentText(input, { mode: "paragraph", newline_policy: "normalize_lf" });

    expect(result.segment_count).toBe(2);
    // Vérifie pas de \r dans le résultat
    expect(result.segments[0].text.includes("\r")).toBe(false);
  });

  it("préserve CRLF en mode preserve", () => {
    const input = "P1\r\n\r\nP2";
    const result = segmentText(input, { mode: "paragraph", newline_policy: "preserve" });

    expect(result.segment_count).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE MODE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Scene Mode", () => {
  it("découpe sur ### (par défaut)", () => {
    const input = "Scene 1\n###\nScene 2";
    const result = segmentText(input, { mode: "scene" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Scene 1");
    expect(result.segments[1].text).toBe("Scene 2");
  });

  it("découpe sur *** (par défaut)", () => {
    const input = "Scene A\n***\nScene B";
    const result = segmentText(input, { mode: "scene" });

    expect(result.segment_count).toBe(2);
  });

  it("découpe sur --- (par défaut)", () => {
    const input = "Scene X\n---\nScene Y";
    const result = segmentText(input, { mode: "scene" });

    expect(result.segment_count).toBe(2);
  });

  it("découpe sur séparateurs personnalisés", () => {
    const input = "Part 1\n~~~\nPart 2";
    const result = segmentText(input, {
      mode: "scene",
      scene_separators: ["~~~"],
    });

    expect(result.segment_count).toBe(2);
  });

  it("ignore séparateur non seul sur ligne", () => {
    const input = "Text ### more text\n---\nScene 2";
    const result = segmentText(input, { mode: "scene" });

    // ### n'est pas seul sur sa ligne, donc pas de découpe là
    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Text ### more text");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("texte vide retourne 0 segments", () => {
    const result = segmentText("", { mode: "sentence" });

    expect(result.segment_count).toBe(0);
    expect(result.segments).toHaveLength(0);
    expect(result.input_char_count).toBe(0);
  });

  it("texte uniquement whitespace retourne 0 segments", () => {
    const result = segmentText("   \n\n  \t  ", { mode: "sentence" });

    expect(result.segment_count).toBe(0);
  });

  it("single char non-whitespace", () => {
    const result = segmentText("A", { mode: "sentence" });

    expect(result.segment_count).toBe(1);
    expect(result.segments[0].text).toBe("A");
  });

  it("gère emoji dans le texte", () => {
    const input = "Bonjour 👋. Comment ça va?";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
    expect(result.segments[0].text).toBe("Bonjour 👋.");
  });

  it("gère caractères Unicode étendus", () => {
    const input = "日本語です。中文也可以。";
    const result = segmentText(input, { mode: "sentence" });

    expect(result.segment_count).toBe(2);
  });

  it("coverage_ratio correct", () => {
    const input = "A. B.";
    const result = segmentText(input, { mode: "sentence" });

    // Segments: "A." (2) + "B." (2) = 4
    // Input après trim segments: on vérifie cohérence
    expect(result.coverage_ratio).toBeGreaterThan(0);
    expect(result.coverage_ratio).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DÉTERMINISME
// ═══════════════════════════════════════════════════════════════════════════════

describe("Déterminisme (L4 Critical)", () => {
  it("100 runs sentence mode → même hash", () => {
    const input = "Une peur. Une joie! Surprise… OK.";
    const hashes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = segmentText(input, { mode: "sentence" });
      hashes.add(result.segmentation_hash);
    }

    expect(hashes.size).toBe(1); // Toutes identiques
  });

  it("100 runs paragraph mode → même hash", () => {
    const input = "P1 line1\nP1 line2\n\nP2 text";
    const hashes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = segmentText(input, { mode: "paragraph" });
      hashes.add(result.segmentation_hash);
    }

    expect(hashes.size).toBe(1);
  });

  it("100 runs scene mode → même hash", () => {
    const input = "Scene1\n###\nScene2\n---\nScene3";
    const hashes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = segmentText(input, { mode: "scene" });
      hashes.add(result.segmentation_hash);
    }

    expect(hashes.size).toBe(1);
  });

  it("même texte + même options → mêmes segments.id", () => {
    const input = "Test. Phrase.";

    const r1 = segmentText(input, { mode: "sentence" });
    const r2 = segmentText(input, { mode: "sentence" });

    expect(r1.segments.map(s => s.id)).toEqual(r2.segments.map(s => s.id));
  });

  it("texte différent (longueur différente) → hash différent", () => {
    const r1 = segmentText("A. B.", { mode: "sentence" });
    const r2 = segmentText("Plus long texte. Autre phrase.", { mode: "sentence" });

    expect(r1.segmentation_hash).not.toBe(r2.segmentation_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANTS EXPLICITES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Invariants L4 Explicites", () => {
  it("INV-SEG-01: offsets valides sur texte complexe", () => {
    const input = "Phrase 1. Phrase 2!\n\nParagraphe 2.";
    const result = segmentText(input, { mode: "sentence" });

    for (const seg of result.segments) {
      expect(seg.start).toBeGreaterThanOrEqual(0);
      expect(seg.end).toBeGreaterThan(seg.start);
      expect(seg.end).toBeLessThanOrEqual(result.input_char_count);
    }
  });

  it("INV-SEG-02: slice exacte vérifiée", () => {
    const input = "Test. De. Slice.";
    const result = segmentText(input, { mode: "sentence" });
    const { text } = normalizeText(input, "normalize_lf");

    for (const seg of result.segments) {
      expect(seg.text).toBe(text.slice(seg.start, seg.end));
    }
  });

  it("INV-SEG-03: aucun segment vide après trim", () => {
    const input = "  A.   B.  \n\n  C.  ";
    const result = segmentText(input, { mode: "sentence" });

    for (const seg of result.segments) {
      expect(seg.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("INV-SEG-04: index monotone strict", () => {
    const input = "A. B. C. D. E.";
    const result = segmentText(input, { mode: "sentence" });

    for (let i = 0; i < result.segments.length; i++) {
      expect(result.segments[i].index).toBe(i);
    }
  });

  it("INV-SEG-05: hash format 64 hex lowercase", () => {
    const result = segmentText("Test.", { mode: "sentence" });

    expect(result.segmentation_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("INV-SEG-06: char_count === text.length", () => {
    const input = "Phrase courte. Phrase plus longue avec des mots.";
    const result = segmentText(input, { mode: "sentence" });

    for (const seg of result.segments) {
      expect(seg.char_count).toBe(seg.text.length);
    }
  });

  it("INV-SEG-07: word_count >= 1 si texte non vide", () => {
    const input = "Un. Deux trois. Quatre cinq six sept.";
    const result = segmentText(input, { mode: "sentence" });

    for (const seg of result.segments) {
      if (seg.text.trim().length > 0) {
        expect(seg.word_count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("INV-SEG-08: pas de \\r avec normalize_lf", () => {
    const input = "Test\r\nAvec\r\nCRLF.";
    const result = segmentText(input, { mode: "sentence", newline_policy: "normalize_lf" });

    for (const seg of result.segments) {
      expect(seg.text.includes("\r")).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSERT ALL INVARIANTS (META-TEST)
// ═══════════════════════════════════════════════════════════════════════════════

describe("assertAllInvariants — Validation complète", () => {
  it("passe sur segmentation sentence correcte", () => {
    const input = "Test OK. Bien.";
    const result = segmentText(input, { mode: "sentence" });
    const { text } = normalizeText(input, "normalize_lf");

    expect(() => assertAllInvariants(text, result)).not.toThrow();
  });

  it("passe sur segmentation paragraph correcte", () => {
    const input = "P1 text\n\nP2 text";
    const result = segmentText(input, { mode: "paragraph" });
    const { text } = normalizeText(input, "normalize_lf");

    expect(() => assertAllInvariants(text, result)).not.toThrow();
  });

  it("passe sur segmentation scene correcte", () => {
    const input = "Scene1\n###\nScene2";
    const result = segmentText(input, { mode: "scene" });
    const { text } = normalizeText(input, "normalize_lf");

    expect(() => assertAllInvariants(text, result)).not.toThrow();
  });

  it("passe sur texte vide", () => {
    const input = "";
    const result = segmentText(input, { mode: "sentence" });

    expect(() => assertAllInvariants("", result)).not.toThrow();
  });

  it("passe sur texte complexe multimode", () => {
    const input = `Chapitre 1. Dr. Watson entra.

Il pleuvait... La nuit tombait!

###

Chapitre 2. Nouvelle scène?`;

    const modes: Array<"sentence" | "paragraph" | "scene"> = ["sentence", "paragraph", "scene"];

    for (const mode of modes) {
      const result = segmentText(input, { mode });
      const { text } = normalizeText(input, "normalize_lf");
      expect(() => assertAllInvariants(text, result)).not.toThrow();
    }
  });
});
