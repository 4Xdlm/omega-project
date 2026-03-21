"""
OMEGA Phase R-6b — Semantic Depth Features (Python port)
Computes 21 semantic features on 571-work corpus.
Port exact of semantic-depth-features.ts for batch measurement.
"""
import json
import math
import os
import re

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
OUT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
OUT_MASTER = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json")

os.makedirs(os.path.dirname(OUT), exist_ok=True)

# Load tier info
with open(TIERS, 'r', encoding='utf-8') as f:
    tiers_data = json.load(f)
tier_lookup = {e['filename']: e.get('tier_suggestion', '?') for e in tiers_data}

# Load master to get filenames
with open(MASTER, 'r', encoding='utf-8') as f:
    master = json.load(f)

STOP_FR = {
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
    'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
    'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'lui', 'en', 'y',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'entre',
    'vers', 'chez', 'contre', 'après', 'avant', 'pendant', 'depuis',
    'que', 'qui', 'dont', 'où', 'quand', 'comme', 'si',
    'ne', 'pas', 'plus', 'jamais', 'rien',
    'est', 'sont', 'était', 'étaient', 'être', 'avoir', 'avait', 'avaient',
    'fait', 'faire', 'dit', 'dire', 'peut', 'pouvoir', 'doit', 'devoir',
    'tout', 'tous', 'toute', 'toutes', 'autre', 'autres',
    'même', 'aussi', 'très', 'bien', 'peu', 'trop', 'assez',
    'alors', 'encore', 'déjà', 'là', 'ici', 'puis',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'from', 'by', 'is', 'was', 'were', 'are', 'been', 'be',
    'has', 'had', 'have', 'do', 'did', 'does', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'must',
    'it', 'its', 'he', 'she', 'they', 'them', 'their', 'his', 'her',
    'this', 'that', 'these', 'those', 'not', 'no', 'so', 'if', 'as',
}


def split_sentences(text):
    raw = re.split(r'(?<=[.!?…»])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]


def get_lower_words(text):
    words = text.split()
    result = []
    for w in words:
        lower = re.sub(r"[^a-zàâäéèêëïîôùûüÿçœæñ'-]", '', w.lower())
        if len(lower) > 1:
            result.append(lower)
    return result


def r4(v):
    return round(v, 4)


def mean_val(vals):
    if not vals:
        return 0
    return sum(vals) / len(vals)


def variance_val(vals):
    if len(vals) < 2:
        return 0
    m = mean_val(vals)
    return sum((v - m) ** 2 for v in vals) / (len(vals) - 1)


# ═══════════════════════════════════════════════════════════════
# PASSAGE EXTRACTION (same as existing pipeline: 500 words at 1/4, 1/2, 3/4)
# ═══════════════════════════════════════════════════════════════

def extract_passages(text, n_passages=5, passage_words=500):
    words = text.split()
    total = len(words)
    if total < passage_words * 2:
        # Short text: single passage
        return [text]
    positions = [0.1, 0.25, 0.5, 0.75, 0.9][:n_passages]
    passages = []
    for pos in positions:
        start = max(0, int(total * pos) - passage_words // 2)
        end = min(total, start + passage_words)
        passages.append(' '.join(words[start:end]))
    return passages


# ═══════════════════════════════════════════════════════════════
# 1. REFERENTIAL COHERENCE
# ═══════════════════════════════════════════════════════════════

def compute_referential_coherence(sents):
    if len(sents) < 3:
        return {'f_referent_continuity': 0, 'f_referent_orphan_rate': 0, 'f_entity_persistence': 0}

    entities_per_sent = []
    for s in sents:
        ents = set()
        for m in re.findall(r'\b[A-ZÀÂÉÈÊËÎÏÔÙÛÜŸÇ][a-zàâäéèêëïîôùûüÿçœæ]{2,}', s):
            ents.add(m.lower())
        entities_per_sent.append(ents)

    # Continuity
    continuity_hits = 0
    continuity_total = 0
    for i in range(len(sents) - 1):
        current = entities_per_sent[i]
        if not current:
            continue
        next1 = entities_per_sent[i + 1] if i + 1 < len(sents) else set()
        next2 = entities_per_sent[i + 2] if i + 2 < len(sents) else set()
        for ent in current:
            continuity_total += 1
            if ent in next1 or ent in next2:
                continuity_hits += 1

    ref_cont = continuity_hits / continuity_total if continuity_total > 0 else 0

    # Orphan rate
    entity_counts = {}
    for ents in entities_per_sent:
        for e in ents:
            entity_counts[e] = entity_counts.get(e, 0) + 1
    total_ents = len(entity_counts)
    orphans = sum(1 for c in entity_counts.values() if c == 1)
    orphan_rate = orphans / total_ents if total_ents > 0 else 0

    # Persistence
    entity_span = {}
    for i, ents in enumerate(entities_per_sent):
        for e in ents:
            if e not in entity_span:
                entity_span[e] = {'first': i, 'last': i}
            else:
                entity_span[e]['last'] = i
    spans = [(s['last'] - s['first'] + 1) for s in entity_span.values()]
    persistence = mean_val(spans) / len(sents) if spans else 0

    return {
        'f_referent_continuity': r4(ref_cont),
        'f_referent_orphan_rate': r4(orphan_rate),
        'f_entity_persistence': r4(persistence),
    }


# ═══════════════════════════════════════════════════════════════
# 2. PROGRESSION
# ═══════════════════════════════════════════════════════════════

def compute_progression(sents):
    if len(sents) < 5:
        return {'f_lexical_progression': 0, 'f_semantic_stagnation': 0, 'f_novelty_curve_slope': 0}

    window_size = 3
    window_vocabs = []
    for i in range(len(sents) - window_size + 1):
        text = ' '.join(sents[i:i + window_size])
        words = [w for w in get_lower_words(text) if w not in STOP_FR and len(w) > 2]
        window_vocabs.append(set(words))

    if len(window_vocabs) < 2:
        return {'f_lexical_progression': 0, 'f_semantic_stagnation': 0, 'f_novelty_curve_slope': 0}

    novelty_rates = []
    cumulative = set()
    for i, vocab in enumerate(window_vocabs):
        if i == 0:
            cumulative.update(vocab)
            novelty_rates.append(1.0)
            continue
        new_words = sum(1 for w in vocab if w not in cumulative)
        cumulative.update(vocab)
        novelty_rates.append(new_words / len(vocab) if vocab else 0)

    progression = mean_val(novelty_rates[1:])
    stagnant = sum(1 for r in novelty_rates[1:] if r < 0.10)
    stagnation = stagnant / (len(novelty_rates) - 1) if len(novelty_rates) > 1 else 0

    # Slope
    n = len(novelty_rates)
    x_mean = (n - 1) / 2
    y_mean = mean_val(novelty_rates)
    num = sum((i - x_mean) * (novelty_rates[i] - y_mean) for i in range(n))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den > 0 else 0

    return {
        'f_lexical_progression': r4(progression),
        'f_semantic_stagnation': r4(stagnation),
        'f_novelty_curve_slope': r4(slope),
    }


# ═══════════════════════════════════════════════════════════════
# 3. CONTEXTUAL PRECISION
# ═══════════════════════════════════════════════════════════════

def compute_contextual_precision(sents):
    if len(sents) < 3:
        return {'f_contextual_precision': 0, 'f_rare_word_isolation': 0}

    all_words = []
    for s in sents:
        all_words.extend(w for w in get_lower_words(s) if w not in STOP_FR and len(w) > 2)

    freq = {}
    for w in all_words:
        freq[w] = freq.get(w, 0) + 1

    if len(all_words) < 10:
        return {'f_contextual_precision': 0, 'f_rare_word_isolation': 0}

    rare_words = {w for w, c in freq.items() if c <= 2}

    supported_rare = 0
    isolated_rare = 0
    total_rare = 0

    for s in sents:
        words = [w for w in get_lower_words(s) if w not in STOP_FR and len(w) > 2]
        for i, w in enumerate(words):
            if w not in rare_words:
                continue
            total_rare += 1
            stem = w[:min(4, len(w))]
            found_support = False
            for j in range(max(0, i - 5), min(len(words), i + 6)):
                if j == i:
                    continue
                neighbor = words[j]
                if neighbor[:min(4, len(neighbor))] == stem:
                    found_support = True
                    break
                if neighbor in rare_words:
                    found_support = True
                    break
            if found_support:
                supported_rare += 1
            else:
                isolated_rare += 1

    precision = supported_rare / total_rare if total_rare > 0 else 0
    isolation = isolated_rare / total_rare if total_rare > 0 else 0

    return {
        'f_contextual_precision': r4(precision),
        'f_rare_word_isolation': r4(isolation),
    }


# ═══════════════════════════════════════════════════════════════
# 4. CONTEXTUAL ORIGINALITY
# ═══════════════════════════════════════════════════════════════

def compute_contextual_originality(text):
    words = [w for w in get_lower_words(text) if w not in STOP_FR and len(w) > 2]
    if len(words) < 10:
        return {'f_hapax_contextual_rate': 0, 'f_vocabulary_depth': 0}

    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1

    hapax = [w for w, c in freq.items() if c == 1]
    hapax_rate = len(hapax) / len(words)

    mid_freq = [w for w, c in freq.items() if 2 <= c <= 3]
    vocab_depth = len(mid_freq) / max(len(freq), 1)

    return {
        'f_hapax_contextual_rate': r4(hapax_rate),
        'f_vocabulary_depth': r4(vocab_depth),
    }


# ═══════════════════════════════════════════════════════════════
# 5. IMPLICIT TENSION
# ═══════════════════════════════════════════════════════════════

PERCEPTION_RE = re.compile(r'\b(?:voyait|sentait|entendait|regardait|écoutait|touchait|percevait|aperçut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b', re.I)
DESIRE_RE = re.compile(r'\b(?:voulait|désirait|espérait|souhaitait|rêvait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b', re.I)
NEGATION_RE = re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guère|point|not|n't|never|nothing|neither|nor|without)\b", re.I)
CONCESSION_RE = re.compile(r'\b(?:mais|pourtant|cependant|toutefois|néanmoins|malgré|quoique|although|though|however|yet|despite|nevertheless|but)\b', re.I)
IRONY_RE = re.compile(r'\b(?:sans doute|bien sûr|évidemment|naturellement|certes|apparently|of course|surely|indeed|certainly)\b', re.I)


def compute_implicit_tension(sents):
    if len(sents) < 3:
        return {'f_tension_density': 0, 'f_desire_negation_rate': 0, 'f_perception_conflict_rate': 0}

    tension_sents = 0
    desire_neg = 0
    perception_conflict = 0

    for s in sents:
        lower = s.lower()
        has_perc = bool(PERCEPTION_RE.search(lower))
        has_des = bool(DESIRE_RE.search(lower))
        has_neg = bool(NEGATION_RE.search(lower))
        has_conc = bool(CONCESSION_RE.search(lower))
        has_irony = bool(IRONY_RE.search(lower))

        force_count = sum([has_perc, has_des, has_neg, has_conc, has_irony])
        if force_count >= 2:
            tension_sents += 1
        if has_des and has_neg:
            desire_neg += 1
        if has_perc and (has_neg or has_conc):
            perception_conflict += 1

    return {
        'f_tension_density': r4(tension_sents / len(sents)),
        'f_desire_negation_rate': r4(desire_neg / len(sents)),
        'f_perception_conflict_rate': r4(perception_conflict / len(sents)),
    }


# ═══════════════════════════════════════════════════════════════
# 6. POV CONTAMINATION
# ═══════════════════════════════════════════════════════════════

def classify_pov(s):
    lower = s.lower()
    p1 = len(re.findall(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|my\b|mine\b|myself\b)", lower))
    p3 = len(re.findall(r"\b(?:il|elle|lui|son|sa|ses|he\b|she\b|his\b|her\b|him\b|himself\b|herself\b)", lower))
    pn = len(re.findall(r"\b(?:on|nous|we\b|our\b|us\b|ourselves\b)", lower))
    mx = max(p1, p3, pn)
    if mx == 0:
        return '0'
    if p1 == mx:
        return '1'
    if p3 == mx:
        return '3'
    return 'N'


def compute_pov_contamination(sents):
    if len(sents) < 5:
        return {'f_pov_drift_rate': 0, 'f_pov_rupture_rate': 0, 'f_pov_stability': 0}

    pov_per_sent = [classify_pov(s) for s in sents]

    drifts = 0
    ruptures = 0
    last_pov = '0'
    for pov in pov_per_sent:
        if pov == '0':
            continue
        if last_pov != '0' and last_pov != pov:
            if (last_pov == '1' and pov == '3') or (last_pov == '3' and pov == '1'):
                ruptures += 1
            else:
                drifts += 1
        last_pov = pov

    non_zero = sum(1 for p in pov_per_sent if p != '0')
    drift_rate = drifts / (non_zero - 1) if non_zero > 1 else 0
    rupture_rate = ruptures / (non_zero - 1) if non_zero > 1 else 0

    pov_counts = {}
    for p in pov_per_sent:
        if p == '0':
            continue
        pov_counts[p] = pov_counts.get(p, 0) + 1
    max_count = max(pov_counts.values()) if pov_counts else 0
    stability = max_count / non_zero if non_zero > 0 else 0

    return {
        'f_pov_drift_rate': r4(drift_rate),
        'f_pov_rupture_rate': r4(rupture_rate),
        'f_pov_stability': r4(stability),
    }


# ═══════════════════════════════════════════════════════════════
# 7. CAUSAL COHERENCE
# ═══════════════════════════════════════════════════════════════

CAUSAL_RE = re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|dès que|à cause|grâce à|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|owing to|caused|led to|resulted)\b", re.I)
TEMPORAL_RE = re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitôt|tout à coup|après|avant|pendant|dès|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b", re.I)
REACTION_RE = re.compile(r"\b(?:sentit|comprit|réalisa|sursauta|frémit|recula|bondit|cria|murmura|soupira|trembla|felt|understood|realized|jumped|flinched|gasped|whispered|sighed|trembled|cried|screamed|froze)\b", re.I)


def compute_causal_coherence(sents):
    if len(sents) < 3:
        return {'f_causal_density': 0, 'f_causal_chain_length': 0, 'f_temporal_anchor_rate': 0}

    causal_sents = 0
    temporal_anchors = 0
    current_chain = 0
    chain_lengths = []

    for s in sents:
        lower = s.lower()
        has_causal = bool(CAUSAL_RE.search(lower))
        has_temporal = bool(TEMPORAL_RE.search(lower))
        has_reaction = bool(REACTION_RE.search(lower))

        if has_causal or has_reaction:
            causal_sents += 1
            current_chain += 1
        else:
            if current_chain > 0:
                chain_lengths.append(current_chain)
                current_chain = 0
        if has_temporal:
            temporal_anchors += 1

    if current_chain > 0:
        chain_lengths.append(current_chain)

    return {
        'f_causal_density': r4(causal_sents / len(sents)),
        'f_causal_chain_length': r4(mean_val(chain_lengths) if chain_lengths else 0),
        'f_temporal_anchor_rate': r4(temporal_anchors / len(sents)),
    }


# ═══════════════════════════════════════════════════════════════
# 8. RELATIONAL DENSITY
# ═══════════════════════════════════════════════════════════════

def compute_relational_density(sents):
    if len(sents) < 3:
        return {'f_echo_density': 0, 'f_lexical_callback_rate': 0, 'f_motif_concentration': 0}

    sent_words = []
    for s in sents:
        words = set(w for w in get_lower_words(s) if w not in STOP_FR and len(w) > 3)
        sent_words.append(words)

    word_positions = {}
    for i, ws in enumerate(sent_words):
        for w in ws:
            if w not in word_positions:
                word_positions[w] = []
            word_positions[w].append(i)

    all_content_words = set()
    for ws in sent_words:
        all_content_words.update(ws)

    echo_count = 0
    callback_count = 0

    first_third = len(sents) // 3
    last_third = len(sents) - first_third

    for word, positions in word_positions.items():
        if len(positions) < 2:
            continue
        for i in range(1, len(positions)):
            if positions[i] - positions[i - 1] >= 3:
                echo_count += 1
                break
        in_first = any(p < first_third for p in positions)
        in_last = any(p >= last_third for p in positions)
        if in_first and in_last:
            callback_count += 1

    total_cw = len(all_content_words)
    echo_density = echo_count / total_cw if total_cw > 0 else 0
    callback_rate = callback_count / total_cw if total_cw > 0 else 0

    # Motif concentration
    repeated = [(w, pos) for w, pos in word_positions.items() if len(pos) >= 2]
    gap_variances = []
    for w, positions in repeated:
        if len(positions) < 2:
            continue
        gaps = [positions[i] - positions[i - 1] for i in range(1, len(positions))]
        if gaps:
            gap_variances.append(variance_val(gaps) if len(gaps) > 1 else 0)
    concentration = min(1, mean_val(gap_variances) / 20) if gap_variances else 0

    return {
        'f_echo_density': r4(echo_density),
        'f_lexical_callback_rate': r4(callback_rate),
        'f_motif_concentration': r4(concentration),
    }


# ═══════════════════════════════════════════════════════════════
# MAIN: Compute on all 571 works
# ═══════════════════════════════════════════════════════════════

def compute_all_semantic_features(text):
    sents = split_sentences(text)
    features = {}
    features.update(compute_referential_coherence(sents))
    features.update(compute_progression(sents))
    features.update(compute_contextual_precision(sents))
    features.update(compute_contextual_originality(text))
    features.update(compute_implicit_tension(sents))
    features.update(compute_pov_contamination(sents))
    features.update(compute_causal_coherence(sents))
    features.update(compute_relational_density(sents))
    return features


SEMANTIC_FEATURE_NAMES = [
    'f_referent_continuity', 'f_referent_orphan_rate', 'f_entity_persistence',
    'f_lexical_progression', 'f_semantic_stagnation', 'f_novelty_curve_slope',
    'f_contextual_precision', 'f_rare_word_isolation',
    'f_hapax_contextual_rate', 'f_vocabulary_depth',
    'f_tension_density', 'f_desire_negation_rate', 'f_perception_conflict_rate',
    'f_pov_drift_rate', 'f_pov_rupture_rate', 'f_pov_stability',
    'f_causal_density', 'f_causal_chain_length', 'f_temporal_anchor_rate',
    'f_echo_density', 'f_lexical_callback_rate', 'f_motif_concentration',
]


def main():
    results = []
    results_master = []
    filenames = [e['filename'] for e in master]

    print(f"Computing semantic features on {len(filenames)} works...")

    for idx, fn in enumerate(filenames):
        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path):
            print(f"  SKIP: {fn} (file not found)")
            continue

        with open(txt_path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()

        tier = tier_lookup.get(fn, '?')

        # Extract passages (same as existing pipeline: 5 passages of 500 words)
        passages = extract_passages(text, n_passages=5, passage_words=500)

        # Compute features per passage, then average
        all_passage_features = []
        for passage in passages:
            feats = compute_all_semantic_features(passage)
            all_passage_features.append(feats)

        # Average across passages
        avg_features = {}
        for fname in SEMANTIC_FEATURE_NAMES:
            vals = [pf.get(fname, 0) for pf in all_passage_features]
            avg_features[fname] = r4(mean_val(vals))

        results.append({
            'filename': fn,
            'tier': tier,
            'semantic_features': avg_features,
        })

        results_master.append({
            'filename': fn,
            'tier': tier,
            'semantic_features': avg_features,
            'passages_count': len(passages),
            'per_passage': all_passage_features,
        })

        if (idx + 1) % 50 == 0:
            print(f"  {idx + 1}/{len(filenames)} done")

    print(f"\nDone: {len(results)} works measured")

    # Save
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Saved: {OUT}")

    with open(OUT_MASTER, 'w', encoding='utf-8') as f:
        json.dump(results_master, f, indent=2, ensure_ascii=False)
    print(f"Saved: {OUT_MASTER}")

    # Quick diagnostic: tier averages
    print("\n=== TIER AVERAGES ===")
    tier_feats = {}
    for r in results:
        t = r['tier']
        if t not in tier_feats:
            tier_feats[t] = {fn: [] for fn in SEMANTIC_FEATURE_NAMES}
        for fn in SEMANTIC_FEATURE_NAMES:
            tier_feats[t][fn].append(r['semantic_features'].get(fn, 0))

    for tier in ['S', 'A', 'B', 'C', 'D']:
        if tier not in tier_feats:
            continue
        print(f"\n  Tier {tier} ({len(tier_feats[tier][SEMANTIC_FEATURE_NAMES[0]])} works):")
        for fn in SEMANTIC_FEATURE_NAMES:
            vals = tier_feats[tier][fn]
            avg = mean_val(vals)
            print(f"    {fn:<35} {avg:.4f}")


if __name__ == '__main__':
    main()
