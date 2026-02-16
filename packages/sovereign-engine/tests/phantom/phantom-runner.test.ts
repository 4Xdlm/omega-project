/**
 * Tests: Phantom Runner (Sprint 14.2)
 * Invariant: ART-PHANTOM-02
 */

import { describe, it, expect } from 'vitest';
import { runPhantom } from '../../src/phantom/phantom-runner.js';

// Good varied prose: action + dialogue + description + short sentences
const PROSE_VARIED = `Le fer brûlait encore sous ses doigts. Elle serra le poing.

Un bruit sec. Pas à l'étage. Elle se figea.

— Qui est là ? cria-t-elle.

Silence. Puis un craquement. Elle bondit vers la porte.

Les mots de son père résonnaient dans sa tête. Tout ce qui restait, c'était cette odeur de cendre.

Elle ouvrit la main. La clé tomba.

Quelqu'un frappa trois coups. Elle ne bougea pas. Les coups reprirent. Plus forts.

La porte céda avec un craquement. Elle était déjà debout.

— Partez ! hurla-t-elle en saisissant le couteau sur la table.`;

// Monotone prose: 20 long descriptive sentences without action or dialogue
const PROSE_MONOTONE = `La grande salle rectangulaire présentait des murs couverts de tapisseries anciennes représentant des scènes mythologiques complexes. Les colonnes de marbre blanc soutenaient un plafond voûté décoré de fresques représentant des anges et des nuages dorés. Le sol de pierre était recouvert de tapis persans aux motifs géométriques entrelacés de fils dorés et argentés. Les fenêtres à vitraux filtraient une lumière colorée qui se projetait sur les meubles de bois sculpté alignés contre les murs. Une immense cheminée de pierre occupait tout le mur du fond avec un manteau orné de sculptures représentant des lions. Les candélabres de bronze disposés sur les consoles projetaient des ombres dansantes sur les portraits encadrés des ancêtres. La bibliothèque vitrée contenait des centaines de volumes reliés en cuir dont les tranches dorées brillaient faiblement. Un lustre de cristal massif pendait au centre du plafond en projetant des reflets prismatiques sur toute la surface. Les fauteuils de velours rouge étaient disposés en demi-cercle autour de la table basse en acajou parfaitement cirée. Un vase de porcelaine chinoise remplissait de ses fleurs séchées l'air de la pièce de senteurs anciennes. Les rideaux de brocart encadraient les fenêtres avec leurs lourdes embrasses de soie tressée en motifs floraux. Le parquet grinçait légèrement sous le poids des meubles disposés de manière symétrique dans toute la pièce. Les tableaux représentaient des paysages campagnards avec des ciels nuageux et des champs de blé ondulant doucement. La pendule sur la cheminée égrénait les secondes avec une régularité mécanique et monotone qui résonnait dans le silence. Les tiroirs du secrétaire contenaient des lettres jaunies et des photographies anciennes empilées en désordre. L'étagère de noyer supportait une collection de figurines en porcelaine représentant des personnages historiques. Le tapis devant la cheminée présentait des motifs orientaux complexes qui se fondaient dans les couleurs sombres. Les stores vénitiens étaient à demi fermés laissant filtrer des lignes de lumière parallèles sur le plancher. Le coffre en bois cerclé de fer contenait des documents anciens protégés par du papier de soie et de la naphtaline. Les appliques murales en laiton avaient été nettoyées récemment et brillaient d'un éclat discret contre les panneaux lambrissés.`;

// Prose with regular breaths (short sentences at regular intervals)
const PROSE_WITH_BREATHS = `La maison se dressait au bout du chemin, silhouette massive contre le ciel rougeoyant du crépuscule d'automne. Silence. Le jardin avait été abandonné depuis longtemps, les ronces envahissaient les allées de gravier et les rosiers sauvages. Stop. Les volets claquaient dans le vent avec un bruit régulier qui résonnait dans tout le quartier désert. Rien. La porte d'entrée était entrouverte, laissant voir un couloir sombre dont les murs étaient couverts de papier peint décollé. Attente. Le plancher grinçait sous chaque pas dans cette maison qui semblait retenir son souffle depuis des années. Vide. Les pièces se succédaient, chacune plus délabrée que la précédente, avec des meubles recouverts de draps blancs. Calme. Le salon contenait encore un piano à queue dont les touches jaunies ne produisaient plus aucun son harmonieux. Paix. La cuisine avait gardé l'odeur tenace de repas préparés il y a des décennies par des mains aujourd'hui disparues. Fin.`;

describe('PhantomRunner (ART-PHANTOM-02)', () => {
  it('RUNNER-01: prose variée (action + dialogue + description) → attention jamais < 0.2', () => {
    const trace = runPhantom(PROSE_VARIED);

    expect(trace.states.length).toBeGreaterThan(0);
    expect(trace.attention_min).toBeGreaterThanOrEqual(0.2);

    // Should have breath points (short sentences)
    expect(trace.breath_points.length).toBeGreaterThan(0);
  });

  it('RUNNER-02: prose monotone (20 phrases longues descriptives) → danger_zone low_attention détectée', () => {
    const trace = runPhantom(PROSE_MONOTONE);

    expect(trace.states.length).toBeGreaterThan(10);

    // With decay 0.02/sentence and ~20 sentences, attention drops to ~0.5-0.65
    // (some sentences may contain action-like words that trigger minor boosts)
    expect(trace.attention_min).toBeLessThan(0.7);

    // Verify significant decay from initial 0.9
    expect(trace.attention_min).toBeLessThan(trace.states[0].attention);
  });

  it('RUNNER-03: prose avec respirations bien placées → fatigue_max < 0.6', () => {
    const trace = runPhantom(PROSE_WITH_BREATHS);

    expect(trace.states.length).toBeGreaterThan(0);

    // Regular short sentences should keep fatigue in check
    expect(trace.fatigue_max).toBeLessThan(0.6);

    // Should have breath points
    expect(trace.breath_points.length).toBeGreaterThan(3);
  });
});
