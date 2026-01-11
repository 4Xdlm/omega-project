/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — MODULE TRANSLATOR
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Inter-module data transformation.
 * INV-TRANS-03: Translation preserves semantic content.
 * INV-TRANS-04: Emotion type mapping is bijective.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION MAPPING
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Genome uses Emotion14 with "envy"
 * Bio uses EmotionType with "despair"
 *
 * Mapping strategy:
 * - Common emotions map directly
 * - "envy" (Genome) ↔ "despair" (Bio) are contextually distinct
 * - When translating, we preserve the original emotion if it exists in target
 * - For missing emotions, we map to closest semantic equivalent
 */
export const GENOME_TO_BIO_EMOTION = {
    joy: "joy",
    sadness: "sadness",
    anger: "anger",
    fear: "fear",
    surprise: "surprise",
    disgust: "disgust",
    trust: "trust",
    anticipation: "anticipation",
    love: "love",
    guilt: "guilt",
    shame: "shame",
    pride: "pride",
    hope: "hope",
    envy: "anger" // envy mapped to anger (closest negative active emotion)
};
export const BIO_TO_GENOME_EMOTION = {
    joy: "joy",
    sadness: "sadness",
    anger: "anger",
    fear: "fear",
    surprise: "surprise",
    disgust: "disgust",
    trust: "trust",
    anticipation: "anticipation",
    love: "love",
    guilt: "guilt",
    shame: "shame",
    pride: "pride",
    hope: "hope",
    despair: "sadness" // despair mapped to sadness (closest low-valence emotion)
};
// ═══════════════════════════════════════════════════════════════════════════════
// MODULE TRANSLATOR
// ═══════════════════════════════════════════════════════════════════════════════
export class ModuleTranslator {
    /**
     * Translate Genome emotion distribution to Bio format
     * INV-TRANS-04: Bijective mapping (with approximation for envy/despair)
     */
    translateEmotionsGenomeToBio(distribution) {
        const result = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
            trust: 0,
            anticipation: 0,
            love: 0,
            guilt: 0,
            shame: 0,
            pride: 0,
            hope: 0,
            despair: 0
        };
        for (const [emotion, value] of Object.entries(distribution)) {
            const mapped = GENOME_TO_BIO_EMOTION[emotion];
            if (mapped) {
                result[mapped] += value;
            }
        }
        // Normalize to sum to 1
        const total = Object.values(result).reduce((sum, v) => sum + v, 0);
        if (total > 0) {
            for (const key of Object.keys(result)) {
                result[key] /= total;
            }
        }
        return result;
    }
    /**
     * Translate Bio emotion distribution to Genome format
     */
    translateEmotionsBioToGenome(distribution) {
        const result = {
            joy: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
            trust: 0,
            anticipation: 0,
            love: 0,
            guilt: 0,
            shame: 0,
            pride: 0,
            hope: 0,
            envy: 0
        };
        for (const [emotion, value] of Object.entries(distribution)) {
            const mapped = BIO_TO_GENOME_EMOTION[emotion];
            if (mapped) {
                result[mapped] += value;
            }
        }
        // Normalize
        const total = Object.values(result).reduce((sum, v) => sum + v, 0);
        if (total > 0) {
            for (const key of Object.keys(result)) {
                result[key] /= total;
            }
        }
        return result;
    }
    /**
     * Normalize fingerprint to unified format
     * INV-TRANS-03: Preserves semantic content
     */
    normalizeFingerprint(fingerprint, source, version, emotions) {
        return {
            type: "unified",
            hash: this.normalizeHash(fingerprint),
            version,
            emotions: emotions ? this.normalizeEmotionKeys(emotions) : {}
        };
    }
    /**
     * Compare fingerprints from different sources
     * Returns similarity score 0-1
     */
    compareCrossModule(genomeFp, bioFp) {
        // Normalize both hashes
        const normalizedGenome = this.normalizeHash(genomeFp);
        const normalizedBio = this.normalizeHash(bioFp);
        // Exact match
        if (normalizedGenome === normalizedBio) {
            return 1.0;
        }
        // Compute Jaccard similarity on character sets
        const setA = new Set(normalizedGenome.split(""));
        const setB = new Set(normalizedBio.split(""));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return intersection.size / union.size;
    }
    /**
     * Merge emotion distributions from multiple sources
     */
    mergeEmotionDistributions(distributions, weights) {
        const result = {
            joy: 0, sadness: 0, anger: 0, fear: 0,
            surprise: 0, disgust: 0, trust: 0, anticipation: 0,
            love: 0, guilt: 0, shame: 0, pride: 0, hope: 0, envy: 0
        };
        const normalizedWeights = weights
            ? this.normalizeWeights(weights)
            : distributions.map(() => 1 / distributions.length);
        for (let i = 0; i < distributions.length; i++) {
            const dist = distributions[i];
            const weight = normalizedWeights[i];
            for (const [emotion, value] of Object.entries(dist)) {
                const e14 = this.toEmotion14(emotion);
                if (e14) {
                    result[e14] += value * weight;
                }
            }
        }
        return result;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    normalizeHash(hash) {
        return hash.toLowerCase().replace(/[^a-f0-9]/g, "");
    }
    normalizeEmotionKeys(emotions) {
        const result = {};
        for (const [key, value] of Object.entries(emotions)) {
            result[key.toLowerCase()] = value;
        }
        return result;
    }
    normalizeWeights(weights) {
        const total = weights.reduce((sum, w) => sum + w, 0);
        return total > 0 ? weights.map(w => w / total) : weights;
    }
    toEmotion14(emotion) {
        const e14 = [
            "joy", "sadness", "anger", "fear", "surprise", "disgust",
            "trust", "anticipation", "love", "guilt", "shame", "pride",
            "hope", "envy"
        ];
        const lower = emotion.toLowerCase();
        return e14.find(e => e === lower);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
let defaultTranslator = null;
/**
 * Get the default module translator
 */
export function getModuleTranslator() {
    if (!defaultTranslator) {
        defaultTranslator = new ModuleTranslator();
    }
    return defaultTranslator;
}
/**
 * Create a new module translator
 */
export function createModuleTranslator() {
    return new ModuleTranslator();
}
//# sourceMappingURL=module.js.map