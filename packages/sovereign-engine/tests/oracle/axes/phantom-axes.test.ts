/**
 * Tests: Phantom Axes (Sprint 14.3)
 * Invariant: ART-PHANTOM-03
 */

import { describe, it, expect } from 'vitest';
import { scoreAttentionSustain } from '../../../src/oracle/axes/attention-sustain.js';
import { scoreFatigueManagement } from '../../../src/oracle/axes/fatigue-management.js';
import { MOCK_PACKET } from '../../fixtures/mock-packet.js';

// Good varied prose: action + dialogue + short sentences + description
const PROSE_VARIED = `Le fer brûlait encore sous ses doigts. Elle serra le poing.

Un bruit sec. Pas à l'étage. Elle se figea.

— Qui est là ? cria-t-elle.

Silence. Puis un craquement. Elle bondit vers la porte.

Les mots résonnaient dans sa tête. Tout ce qui restait, c'était cette odeur de cendre.

Elle ouvrit la main. La clé tomba.

Quelqu'un frappa trois coups. Elle ne bougea pas. Les coups reprirent.

La porte céda avec un craquement. Elle était déjà debout.

— Partez ! hurla-t-elle.`;

// Monotone: 20 long sentences, no action, no short sentences, no dialogue
const PROSE_MONOTONE = `La grande salle rectangulaire présentait des murs couverts de tapisseries anciennes représentant des scènes mythologiques complexes. Les colonnes de marbre blanc soutenaient un plafond voûté décoré de fresques représentant des anges et des nuages dorés. Le sol de pierre était recouvert de tapis persans aux motifs géométriques entrelacés de fils dorés et argentés. Les fenêtres à vitraux filtraient une lumière colorée qui se projetait sur les meubles de bois sculpté alignés contre les murs. Une immense cheminée de pierre occupait tout le mur du fond avec un manteau orné de sculptures représentant des lions. Les candélabres de bronze disposés sur les consoles projetaient des ombres dansantes sur les portraits encadrés des ancêtres. La bibliothèque vitrée contenait des centaines de volumes reliés en cuir dont les tranches dorées brillaient faiblement. Un lustre de cristal massif pendait au centre du plafond en projetant des reflets prismatiques sur toute la surface. Les fauteuils de velours rouge étaient disposés en demi-cercle autour de la table basse en acajou parfaitement cirée. Un vase de porcelaine chinoise remplissait de ses fleurs séchées l'air de la pièce de senteurs anciennes. Les rideaux de brocart encadraient les fenêtres avec leurs lourdes embrasses de soie tressée en motifs floraux. Le parquet grinçait légèrement sous le poids des meubles disposés de manière symétrique dans toute la pièce. Les tableaux représentaient des paysages campagnards avec des ciels nuageux et des champs de blé ondulant doucement. La pendule sur la cheminée égrénait les secondes avec une régularité mécanique et monotone qui résonnait dans le silence. Les tiroirs du secrétaire contenaient des lettres jaunies et des photographies anciennes empilées en désordre. L'étagère de noyer supportait une collection de figurines en porcelaine représentant des personnages historiques. Le tapis devant la cheminée présentait des motifs orientaux complexes qui se fondaient dans les couleurs sombres. Les stores vénitiens étaient à demi fermés laissant filtrer des lignes de lumière parallèles sur le plancher. Le coffre en bois cerclé de fer contenait des documents anciens protégés par du papier de soie et de la naphtaline. Les appliques murales en laiton avaient été nettoyées récemment et brillaient d'un éclat discret contre les panneaux lambrissés.`;

// Prose with regular breaths
const PROSE_BREATHS = `La maison se dressait au bout du chemin, silhouette massive contre le ciel rougeoyant du crépuscule automnal. Silence. Le jardin avait été abandonné depuis longtemps, les ronces envahissaient les allées de gravier éparpillé. Stop. Les volets claquaient dans le vent avec un bruit régulier résonnant dans le quartier désert et vide. Rien. La porte d'entrée était entrouverte, laissant voir un couloir sombre aux murs couverts de papier décollé. Attente. Le plancher grinçait sous chaque pas dans cette maison qui semblait retenir son souffle interminablement. Vide. Les pièces se succédaient, chacune plus délabrée que la précédente, meubles sous des draps blancs. Calme. Le salon contenait encore un piano dont les touches jaunies ne produisaient plus aucun son harmonieux. Paix. La cuisine gardait l'odeur tenace de repas préparés il y a des décennies par des mains aujourd'hui disparues. Fin.`;

describe('Phantom Axes (ART-PHANTOM-03)', () => {
  it('ATTN-01: prose variée → attention_sustain score > 80', () => {
    const result = scoreAttentionSustain(MOCK_PACKET, PROSE_VARIED);

    expect(result.name).toBe('attention_sustain');
    expect(result.score).toBeGreaterThan(80);
    expect(result.weight).toBe(1.0);
    expect(result.method).toBe('CALC');
    expect(result.details).toBeDefined();
  });

  it('FATIGUE-01: prose monotone (20 phrases) → fatigue_management reflects fatigue level', () => {
    const result = scoreFatigueManagement(MOCK_PACKET, PROSE_MONOTONE);

    expect(result.name).toBe('fatigue_management');
    expect(result.weight).toBe(1.0);
    expect(result.method).toBe('CALC');
    // 20 sentences × 0.01 fatigue_rate = 0.20, well below 0.7 threshold
    // No high_fatigue danger zones → score = 100
    // But no breath distribution bonus (no short sentences)
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('FATIGUE-02: prose avec respirations → fatigue_management score > 80', () => {
    const result = scoreFatigueManagement(MOCK_PACKET, PROSE_BREATHS);

    expect(result.name).toBe('fatigue_management');
    // Well-placed short sentences keep fatigue in check
    expect(result.score).toBeGreaterThan(80);
  });
});
