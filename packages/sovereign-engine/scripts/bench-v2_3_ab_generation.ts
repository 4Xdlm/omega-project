/**
 * V2.3-A P2 — Bench A/B routage (MOCK, zéro qwen).
 *
 * Démontre que la plomberie route les DEUX bras (contrôle naïf vs traitement scalpel)
 * et assemble les prompts (briefs) SANS appeler le vrai LLM. Utilise MOCK_GENERATE
 * ([MOCK GENERATION]) -> aucun token, aucune heure GPU. C'est le pré-requis avant
 * d'allumer Qwen en P3/P4.
 *
 * Sortie : log de routage console + JSON V2_3_AB_ROUTING.json (workspace).
 * Sprint V2.3-A P2 2026-05-29.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runABRouting, MOCK_GENERATE } from '../src/chunking/abRouting.js';

const RESULTS_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_3_AB_ROUTING.json';
const CORPUS_DIR = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/v2_1_1/corpus_text';
const SELECTION_FILE = 'C:/Users/elric/Claude-Workspace/OMEGA/outputs/V2_2_B_B2_book_selection.json';

/** Charge une vraie source longue (1er livre B2) pour un A/B contrasté ; fallback fixture inline. */
function loadSource(): { text: string; origin: string } {
  try {
    if (existsSync(SELECTION_FILE)) {
      const books = (JSON.parse(readFileSync(SELECTION_FILE, 'utf8')) as { books: string[] }).books;
      const file = books[0];
      if (file && existsSync(join(CORPUS_DIR, file))) {
        // Prendre les ~3000 premiers mots comme "source à réécrire" (chapitre)
        const raw = readFileSync(join(CORPUS_DIR, file), 'utf8');
        const words = raw.replace(/\s+/g, ' ').trim().split(' ');
        return { text: words.slice(0, 3000).join(' '), origin: `corpus:${file} (3000 premiers mots)` };
      }
    }
  } catch {
    /* fallback */
  }
  return { text: FIXTURE, origin: 'inline_fixture (court, K=1 attendu)' };
}

// Texte source fixture (réécriture). Aucun fichier corpus requis pour la démo de routage.
const FIXTURE =
  "L'aube se levait à peine sur les toits de la ville endormie. Marie poussa la porte de l'atelier, " +
  "le bois grinça, l'odeur de térébenthine la saisit. Sur la table, la toile inachevée attendait, " +
  "muette. Elle prit un pinceau, hésita ; sa main tremblait. Dehors, un merle chanta, puis se tut. " +
  "Le silence revint, dense, presque solide. Elle approcha la couleur de la toile, le cœur battant, " +
  "et le premier geste, enfin, déchira l'attente — rouge, vif, irrévocable, comme une blessure ouverte.";

function main(): void {
  console.log('[V2.3-A P2] Bench A/B routage (MOCK, zéro qwen) — START');
  const { text, origin } = loadSource();
  console.log(`Source : ${origin}`);
  const result = runABRouting(text, MOCK_GENERATE);

  // Divergence des frontières entre bras : combien de segments diffèrent (hash)
  const tHashes = result.treatment.segments.map((s) => s.packet_hash);
  const cHashes = result.control.segments.map((s) => s.packet_hash);
  const divergent = tHashes.filter((h, i) => h !== cHashes[i]).length;

  console.log(`K segments (identique 2 bras) : ${result.k_segments} | identical=${result.identical_segment_count} | segments divergents (frontières) = ${divergent}/${result.k_segments}`);
  for (const arm of [result.control, result.treatment]) {
    console.log(`\n--- BRAS ${arm.arm} (${arm.segment_count} segments) ---`);
    for (const s of arm.segments) {
      console.log(
        `  [${s.index}] words=${s.word_count} conf=${s.confidence} brief_len=${s.brief_length} ` +
          `non_empty=${s.brief_non_empty} packet=${s.packet_hash.slice(0, 10)} gen="${s.generation}"`
      );
    }
  }

  const suite = {
    date_iso: new Date().toISOString(),
    sprint: 'V2.3-A P2 A/B routing (mock)',
    note: 'MOCK generate — aucun appel qwen/Ollama. Frontière (naïve vs scalpel) = seule variable, K identique.',
    source_origin: origin,
    divergent_segments: divergent,
    result,
  };
  writeFileSync(RESULTS_FILE, JSON.stringify(suite, null, 2), 'utf8');

  console.log('\n' + '='.repeat(60));
  console.log(`[V2.3-A P2] ROUTAGE OK — 2 bras, K=${result.k_segments}, mock (zéro qwen).`);
  console.log(`Briefs non vides : control=${result.control.segments.every((s) => s.brief_non_empty)} ` +
    `treatment=${result.treatment.segments.every((s) => s.brief_non_empty)}`);
  console.log(`Results: ${RESULTS_FILE}`);
}

main();
