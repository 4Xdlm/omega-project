"""
OMEGA Phase R-7 Step 1 — Multi-Scale Test
Compare 500-word vs 2000-word windows on diagnostic texts.
Same GB model (retrained identically), no recalibration.

Question: Does Claude Opus collapse at 2000 words?
"""
import json
import math
import os
import re
import random
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from collections import defaultdict

ROOT = r"C:\Users\elric\omega-project"
MASTER = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json")
DEPTH = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_DEPTH_FEATURES.json")
TIERS = os.path.join(ROOT, "omega-autopsie/corpus_r/CORPUS_TIERS_V3.json")
SEMANTIC = os.path.join(ROOT, "omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES.json")
TXT_DIR = os.path.join(ROOT, "omega-autopsie/corpus_r/txt")
LLM_DIR = os.path.join(ROOT, "omega-autopsie/results_rosetta/s0/p5_test")
OUT = os.path.join(ROOT, "omega-autopsie/results_phase_r/R7_MULTISCALE_TEST.json")

# ═══════════════════════════════════════════════════════════════
# UTILS
# ═══════════════════════════════════════════════════════════════

def r4(v):
    return round(v, 4)

def safe(v):
    if v is None or (isinstance(v, float) and not math.isfinite(v)):
        return 0.0
    return float(v)

def mean_val(vals):
    return sum(vals) / len(vals) if vals else 0

def stdev_val(vals):
    if len(vals) < 2:
        return 0
    m = mean_val(vals)
    return math.sqrt(sum((v - m)**2 for v in vals) / (len(vals) - 1))

def count_occ(text, marker):
    count = 0
    pos = 0
    while True:
        pos = text.find(marker, pos)
        if pos == -1:
            break
        count += 1
        pos += len(marker)
    return count

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def get_lower_words(text):
    words = text.split()
    result = []
    for w in words:
        lower = re.sub(r"[^a-z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00ff\u00e7\u0153\u00e6\u00f1'-]", '', w.lower())
        if len(lower) > 1:
            result.append(lower)
    return result


# ═══════════════════════════════════════════════════════════════
# V3 TEXT FEATURES (Python port of text-features.ts)
# Only the 14 features used by the model
# ═══════════════════════════════════════════════════════════════

ALL_SUB = {
    'que', 'qui', 'dont', 'ou', 'lequel', 'laquelle', 'lesquels', 'lesquelles',
    'quand', 'comme', 'si', 'puisque', 'parce', 'bien', 'quoique', 'malgre',
    'tandis', 'alors', 'lorsque', 'des', 'avant', 'apres', 'pendant', 'jusqu',
    'that', 'which', 'who', 'whom', 'whose', 'where', 'when', 'although',
    'because', 'since', 'while', 'until', 'unless', 'whether', 'after',
    'before', 'though', 'even', 'whereas', 'provided',
    'quien', 'cual', 'donde', 'cuando', 'aunque', 'porque', 'mientras',
    'hasta', 'sino', 'puesto', 'como', 'pues', 'ya',
}

EPISTEMIC_ALL = [
    'semblait', 'paraissait', 'apparemment', 'peut-etre', 'probablement',
    'sans doute', 'il me semblait', 'comme si', 'on eut dit', 'dirait-on',
    'quelque chose', 'une sorte', 'une espece', 'je croyais', 'il croyait',
    'il lui semblait', "avait l'air", "avait l'impression",
    'seemed', 'appeared', 'apparently', 'perhaps', 'probably', 'possibly',
    'as if', 'as though', 'something like', 'a kind of', 'sort of', 'might',
    'could', 'would have', 'had seemed', 'it seemed',
    'parecia', 'aparentemente', 'quizas', 'tal vez', 'probablemente',
    'como si', 'una especie de', 'algo asi', 'acaso', 'sin duda',
]

CONDITIONAL_FR = ['aurait', 'aurait ete', 'eut', 'eut ete', 'serait', 'fut', 'voudrait']
PASSE_SIMPLE = ['fut', 'eut', 'dit', 'prit', 'vit', 'alla', 'revint', 'sembla', 'parut']
NEG_COMPLEX = ['ne...que', 'nul', 'aucun', 'jamais', 'guere', 'ni...ni', 'point',
               'nullement', 'en aucune facon', 'rien de', 'pas un seul']

SIL_MARKERS = [
    'apres tout', 'bien sur', 'evidemment', 'comment donc', "n'etait-ce pas",
    'car enfin', 'mais non', 'mais si', 'que diable', 'sapre',
    'certainement', 'decidement', 'vraiment', 'quelle idee', 'quel imbecile',
    'after all', 'of course', 'certainly', 'how odd', 'no doubt',
    'why not', 'what a', 'surely', 'indeed', 'obviously', 'well then',
]

IRONY_MARKERS_V3 = ['on eut dit', "c'etait bien la", 'voila qui', "comme c'est",
                    'comme il convient', 'naturellement', 'il va sans dire',
                    "cela s'entend", 'bien entendu']

ADVERSATIVE = [
    'mais', 'cependant', 'pourtant', 'toutefois', 'neanmoins', 'or',
    'en revanche', 'au contraire', 'malgre', 'bien que', 'quoique',
    'but', 'however', 'yet', 'nevertheless', 'although', 'despite',
    'nonetheless', 'on the contrary', 'whereas',
    'pero', 'sin embargo', 'no obstante', 'aunque', 'a pesar de',
]


def compute_f1_basic(sents):
    if not sents:
        return {'f1_mean': 0, 'f1a_rhythm_variance': 0}
    lens = [len(s.split()) for s in sents]
    return {
        'f1_mean': r4(mean_val(lens)),
        'f1a_rhythm_variance': r4(stdev_val(lens)),
    }


def compute_f9(text, sents):
    txt_lower = text.lower()
    n_sents = max(len(sents), 1)
    adv_count = sum(count_occ(txt_lower, m) for m in ADVERSATIVE)
    return {'f9a_contradiction_rate': r4(adv_count / n_sents)}


def compute_f17(sents):
    if len(sents) < 4:
        return {'f17_knife_count': 0}
    lens = [len(s.split()) for s in sents]
    return {'f17_knife_count': sum(1 for l in lens if l <= 5)}


def compute_f19(sents):
    if len(sents) < 4:
        return {'f19a_approx_entropy': 0}
    lens = [len(s.split()) for s in sents]
    m = mean_val(lens)
    s = stdev_val(lens)
    cv = s / m if m > 0 else 0
    return {'f19a_approx_entropy': r4(min(cv, 2.0))}


def compute_f24(sents):
    if len(sents) < 10:
        return {'f24c_contrast_delta': 0}
    lens = [len(s.split()) for s in sents]
    sorted_lens = sorted(lens)
    n = len(sorted_lens)
    p25 = sorted_lens[n // 4]
    p75 = sorted_lens[3 * n // 4]
    banal = [l for l in lens if l <= p25]
    apex = [l for l in lens if l >= p75]
    mean_banal = mean_val(banal) if banal else 0
    mean_apex = mean_val(apex) if apex else 0
    return {'f24c_contrast_delta': r4(mean_apex - mean_banal)}


def compute_f26(sents):
    if not sents:
        return {'f26b_long_sent_rate': 0, 'f26c_period_score': 0}
    sub_counts = []
    sent_lens = []
    for s in sents:
        words = s.lower().split()
        sub_n = sum(1 for w in words if re.sub(r'[.,;:!?]', '', w) in ALL_SUB)
        sub_counts.append(sub_n)
        sent_lens.append(len(words))
    mean_sub = mean_val(sub_counts)
    long_rate = sum(1 for l in sent_lens if l > 40) / len(sent_lens)
    sub_score = min(mean_sub / 6.0, 1.0)
    period_score = r4(sub_score * 0.6 + long_rate * 0.4)
    return {'f26b_long_sent_rate': r4(long_rate), 'f26c_period_score': period_score}


def compute_f27(text, sents):
    txt_lower = text.lower()
    n_sents = max(len(sents), 1)
    ep_count = sum(count_occ(txt_lower, m) for m in EPISTEMIC_ALL)
    epistemic_rate = r4(ep_count / n_sents * 100)
    cond_count = sum(count_occ(txt_lower, m) for m in CONDITIONAL_FR)
    ps_count = max(sum(count_occ(txt_lower, m) for m in PASSE_SIMPLE), 1)
    cond_rate = r4(cond_count / ps_count)
    neg_count = sum(count_occ(txt_lower, m) for m in NEG_COMPLEX)
    neg_rate = r4(neg_count / n_sents * 100)
    ep_score = min(epistemic_rate / 20.0, 1.0)
    cond_score = min(cond_rate / 2.0, 1.0)
    neg_score = min(neg_rate / 10.0, 1.0)
    modal_score = r4(ep_score * 0.5 + cond_score * 0.3 + neg_score * 0.2)
    return {'f27a_epistemic_rate': epistemic_rate, 'f27d_modal_score': modal_score}


def compute_f28(text, sents):
    txt_lower = text.lower()
    n_sents = max(len(sents), 1)
    irony_density = r4(sum(count_occ(txt_lower, m) for m in IRONY_MARKERS_V3) / n_sents * 100)
    return {'f28b_irony_density': irony_density}


def compute_f29(text):
    WINDOW = 100
    words = [re.sub(r'[.,;:!?\"\'\(\)\[\]]', '', w.lower()) for w in text.split() if len(w) > 1]
    n = len(words)
    if n < WINDOW:
        return {'f29d_ttr_score': 0}
    ttr_global = len(set(words)) / n
    window_ttrs = []
    for i in range(0, n - WINDOW + 1, 50):
        w = words[i:i + WINDOW]
        window_ttrs.append(len(set(w)) / WINDOW)
    ttr_window = mean_val(window_ttrs)
    ttr_stdev = stdev_val(window_ttrs) if len(window_ttrs) > 1 else 0
    ttr_score = r4(min(ttr_window / 0.80, 1.0) * 0.7 + min(ttr_stdev * 5, 1.0) * 0.3)
    return {'f29d_ttr_score': ttr_score}


def compute_f35(text):
    words = text.split()
    hook_text = ' '.join(words[:100])
    sents = split_sentences(hook_text)
    if not sents:
        return {'f35c_hook_score': 0}
    has_q = any(s.strip().endswith('?') for s in sents)
    has_excl = any(s.strip().endswith('!') for s in sents)
    mean_len = mean_val([len(s.split()) for s in sents])
    tension = min(1.0, 20.0 / max(mean_len, 1))
    score = r4(tension * 0.5 + (0.3 if has_q else 0) + (0.2 if has_excl else 0))
    return {'f35c_hook_score': score}


def compute_f36(text):
    words = text.split()
    cliff_text = ' '.join(words[-100:])
    sents = split_sentences(cliff_text)
    if not sents:
        return {'f36c_cliff_score': 0}
    last_sent = sents[-1].strip()
    ends_ellipsis = last_sent.endswith('...') or last_sent.endswith('\u2026')
    last_char = last_sent[-1] if last_sent else ''
    ends_incomplete = last_char not in '.!?\u2026'
    mean_len = mean_val([len(s.split()) for s in sents])
    tension = min(1.0, 20.0 / max(mean_len, 1))
    score = r4(tension * 0.5 + (0.3 if ends_ellipsis else 0) + (0.2 if ends_incomplete else 0))
    return {'f36c_cliff_score': score}


def compute_v3_text_features(text):
    """Compute the 14 V3 original + suspect features from raw text"""
    sents = split_sentences(text)
    features = {}
    features.update(compute_f1_basic(sents))
    features.update(compute_f9(text, sents))
    features.update(compute_f17(sents))
    features.update(compute_f19(sents))
    features.update(compute_f24(sents))
    features.update(compute_f26(sents))
    features.update(compute_f27(text, sents))
    features.update(compute_f28(text, sents))
    features.update(compute_f29(text))
    features.update(compute_f35(text))
    features.update(compute_f36(text))
    return features


# ═══════════════════════════════════════════════════════════════
# DEPTH FEATURES (Python port of depth-features.ts)
# ═══════════════════════════════════════════════════════════════

SUBORDINATION_MARKERS_RE = [
    r'\bqui\b', r'\bque\b', r'\bdont\b', r'\bo\u00f9\b',
    r'\blorsqu', r'\bquand\b', r'\btandis qu', r'\bapr\u00e8s qu',
    r'\bavant qu', r'\bdepuis qu', r'\bpuisqu', r'\bparce qu',
    r'\bcar\b', r'\bbien qu', r'\bquoiqu', r'\bm\u00eame si\b',
    r'\bafin qu', r'\bpour qu', r'\bsi\b', r'\bcomme\b',
    r'\bwhich\b', r'\bwho\b', r'\bwhom\b', r'\bwhose\b',
    r'\bthat\b', r'\bwhere\b', r'\bwhen\b', r'\bwhile\b',
    r'\bbecause\b', r'\balthough\b', r'\bthough\b',
    r'\bsince\b', r'\bunless\b', r'\bwhereas\b', r'\bif\b', r'\bas\b',
]


def compute_depth_features(text):
    sents = split_sentences(text)
    if not sents:
        return {'f_pov_shift_rate': 0, 'f_subordination_depth': 0, 'f_clause_per_sentence': 0}

    # Subordination depth
    sub_counts = []
    for s in sents:
        lower = s.lower()
        total = 0
        for pat in SUBORDINATION_MARKERS_RE:
            total += len(re.findall(pat, lower, re.I))
        sub_counts.append(total)
    sub_depth = mean_val(sub_counts)

    # Clause per sentence (approximate via conjugated verbs)
    clause_counts = []
    for s in sents:
        lower = s.lower()
        pv = len(re.findall(r"\b(?:j[e']|tu|il|elle|on|nous|vous|ils|elles|ce|c'|qui)\s+\w+", lower))
        fe = len(re.findall(r'\b\w{3,}(?:ait|aient|ais|ions|iez|urent|\u00e8rent|erait|eraient|eront)\b', lower))
        etre = len(re.findall(r'\b(?:est|\u00e9tait|fut|sera|sont|\u00e9taient|serait|f\u00fbt|soient)\b', lower))
        avoir = len(re.findall(r'\b(?:avait|eut|aura|avaient|auraient|aurait|e\u00fbt)\b', lower))
        count = pv + int(fe * 0.5) + etre + avoir
        clause_counts.append(max(1, count))
    clause_per_sent = mean_val(clause_counts)

    # POV shift rate
    shifts = 0
    first_p = re.compile(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|me\b|my\b|mine\b)", re.I)
    third_p = re.compile(r"\b(?:il|elle|ils|elles|lui|leur|son|sa|ses|he\b|she\b|his\b|her\b|they\b|their\b)", re.I)
    coll_p = re.compile(r"\b(?:on|nous|we\b|our\b|us\b)", re.I)
    for s in sents:
        lower = s.lower()
        has1 = bool(first_p.search(lower))
        has3 = bool(third_p.search(lower))
        hasc = bool(coll_p.search(lower))
        if sum([has1, has3, hasc]) >= 2:
            shifts += 1
    pov_shift = shifts / len(sents)

    return {
        'f_pov_shift_rate': r4(pov_shift),
        'f_subordination_depth': r4(sub_depth),
        'f_clause_per_sentence': r4(clause_per_sent),
    }


# ═══════════════════════════════════════════════════════════════
# SEMANTIC FEATURES (from r6b_semantic_features.py)
# ═══════════════════════════════════════════════════════════════

STOP_FR = {
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
    'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
    'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'lui', 'en', 'y',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'entre',
    'vers', 'chez', 'contre', 'apres', 'avant', 'pendant', 'depuis',
    'que', 'qui', 'dont', 'ou', 'quand', 'comme', 'si',
    'ne', 'pas', 'plus', 'jamais', 'rien',
    'est', 'sont', 'etait', 'etaient', 'etre', 'avoir', 'avait', 'avaient',
    'fait', 'faire', 'dit', 'dire', 'peut', 'pouvoir', 'doit', 'devoir',
    'tout', 'tous', 'toute', 'toutes', 'autre', 'autres',
    'meme', 'aussi', 'tres', 'bien', 'peu', 'trop', 'assez',
    'alors', 'encore', 'deja', 'la', 'ici', 'puis',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'from', 'by', 'is', 'was', 'were', 'are', 'been', 'be',
    'has', 'had', 'have', 'do', 'did', 'does', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'must',
    'it', 'its', 'he', 'she', 'they', 'them', 'their', 'his', 'her',
    'this', 'that', 'these', 'those', 'not', 'no', 'so', 'if', 'as',
}

PERCEPTION_RE = re.compile(r'\b(?:voyait|sentait|entendait|regardait|ecoutait|touchait|percevait|apercut|distinguait|saw|felt|heard|watched|noticed|sensed|perceived|glimpsed)\b', re.I)
DESIRE_RE = re.compile(r'\b(?:voulait|desirait|esperait|souhaitait|revait|cherchait|attendait|aspirait|wanted|desired|hoped|wished|longed|craved|yearned|dreamed)\b', re.I)
NEGATION_SEM_RE = re.compile(r"\b(?:ne|n'|pas|jamais|rien|aucun|sans|ni|guere|point|not|n't|never|nothing|neither|nor|without)\b", re.I)
CONCESSION_RE = re.compile(r'\b(?:mais|pourtant|cependant|toutefois|neanmoins|malgre|quoique|although|though|however|yet|despite|nevertheless|but)\b', re.I)
IRONY_SEM_RE = re.compile(r'\b(?:sans doute|bien sur|evidemment|naturellement|certes|apparently|of course|surely|indeed|certainly)\b', re.I)
CAUSAL_RE = re.compile(r"\b(?:parce qu|puisqu|car\b|donc\b|alors\b|ainsi\b|en effet|de sorte|si bien|c'est pourquoi|des que|a cause|grace a|because|since|therefore|thus|hence|so\b|consequently|as a result|due to|owing to|caused|led to|resulted)\b", re.I)
TEMPORAL_RE = re.compile(r"\b(?:soudain|alors|puis|ensuite|enfin|d'abord|aussitot|tout a coup|apres|avant|pendant|des|lorsqu|quand|suddenly|then|next|finally|first|immediately|after|before|during|when|while|meanwhile|soon)\b", re.I)
REACTION_RE = re.compile(r"\b(?:sentit|comprit|realisa|sursauta|fremit|recula|bondit|cria|murmura|soupira|trembla|felt|understood|realized|jumped|flinched|gasped|whispered|sighed|trembled|cried|screamed|froze)\b", re.I)


def compute_semantic_features(text):
    """Compute all 21 semantic features from raw text"""
    sents = split_sentences(text)
    features = {}

    # 1. Referential coherence
    if len(sents) >= 3:
        entities_per_sent = []
        for s in sents:
            ents = set(m.lower() for m in re.findall(r'\b[A-Z\u00c0\u00c2\u00c9\u00c8\u00ca\u00cb\u00ce\u00cf\u00d4\u00d9\u00db\u00dc\u0178\u00c7][a-z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00ff\u00e7\u0153\u00e6]{2,}', s))
            entities_per_sent.append(ents)
        cont_hits = cont_total = 0
        for i in range(len(sents) - 1):
            curr = entities_per_sent[i]
            if not curr:
                continue
            nxt1 = entities_per_sent[i+1] if i+1 < len(sents) else set()
            nxt2 = entities_per_sent[i+2] if i+2 < len(sents) else set()
            for e in curr:
                cont_total += 1
                if e in nxt1 or e in nxt2:
                    cont_hits += 1
        ec = {}
        for es in entities_per_sent:
            for e in es:
                ec[e] = ec.get(e, 0) + 1
        total_ents = len(ec)
        orphans = sum(1 for c in ec.values() if c == 1)
        entity_span = {}
        for i, es in enumerate(entities_per_sent):
            for e in es:
                if e not in entity_span:
                    entity_span[e] = [i, i]
                else:
                    entity_span[e][1] = i
        spans = [s[1] - s[0] + 1 for s in entity_span.values()]
        features['f_referent_continuity'] = r4(cont_hits / cont_total if cont_total else 0)
        features['f_referent_orphan_rate'] = r4(orphans / total_ents if total_ents else 0)
        features['f_entity_persistence'] = r4(mean_val(spans) / len(sents) if spans else 0)
    else:
        features['f_referent_continuity'] = 0
        features['f_referent_orphan_rate'] = 0
        features['f_entity_persistence'] = 0

    # 2. Progression
    if len(sents) >= 5:
        ws = 3
        window_vocabs = []
        for i in range(len(sents) - ws + 1):
            txt = ' '.join(sents[i:i+ws])
            words = [w for w in get_lower_words(txt) if w not in STOP_FR and len(w) > 2]
            window_vocabs.append(set(words))
        novelty_rates = []
        cumul = set()
        for i, v in enumerate(window_vocabs):
            if i == 0:
                cumul.update(v)
                novelty_rates.append(1.0)
                continue
            new = sum(1 for w in v if w not in cumul)
            cumul.update(v)
            novelty_rates.append(new / len(v) if v else 0)
        features['f_lexical_progression'] = r4(mean_val(novelty_rates[1:]) if len(novelty_rates) > 1 else 0)
        features['f_semantic_stagnation'] = r4(sum(1 for r in novelty_rates[1:] if r < 0.10) / max(len(novelty_rates)-1, 1))
        n = len(novelty_rates)
        xm = (n-1)/2
        ym = mean_val(novelty_rates)
        num = sum((i-xm)*(novelty_rates[i]-ym) for i in range(n))
        den = sum((i-xm)**2 for i in range(n))
        features['f_novelty_curve_slope'] = r4(num/den if den else 0)
    else:
        features['f_lexical_progression'] = 0
        features['f_semantic_stagnation'] = 0
        features['f_novelty_curve_slope'] = 0

    # 3. Contextual precision
    if len(sents) >= 3:
        all_words = []
        for s in sents:
            all_words.extend(w for w in get_lower_words(s) if w not in STOP_FR and len(w) > 2)
        freq = {}
        for w in all_words:
            freq[w] = freq.get(w, 0) + 1
        if len(all_words) >= 10:
            rare = {w for w, c in freq.items() if c <= 2}
            supported = isolated = total_rare = 0
            for s in sents:
                words = [w for w in get_lower_words(s) if w not in STOP_FR and len(w) > 2]
                for i, w in enumerate(words):
                    if w not in rare:
                        continue
                    total_rare += 1
                    stem = w[:min(4, len(w))]
                    found = False
                    for j in range(max(0, i-5), min(len(words), i+6)):
                        if j == i:
                            continue
                        nb = words[j]
                        if nb[:min(4, len(nb))] == stem or nb in rare:
                            found = True
                            break
                    if found:
                        supported += 1
                    else:
                        isolated += 1
            features['f_contextual_precision'] = r4(supported / total_rare if total_rare else 0)
            features['f_rare_word_isolation'] = r4(isolated / total_rare if total_rare else 0)
        else:
            features['f_contextual_precision'] = 0
            features['f_rare_word_isolation'] = 0
    else:
        features['f_contextual_precision'] = 0
        features['f_rare_word_isolation'] = 0

    # 4. Contextual originality
    words = [w for w in get_lower_words(text) if w not in STOP_FR and len(w) > 2]
    if len(words) >= 10:
        freq = {}
        for w in words:
            freq[w] = freq.get(w, 0) + 1
        hapax = sum(1 for c in freq.values() if c == 1)
        features['f_hapax_contextual_rate'] = r4(hapax / len(words))
        mid = sum(1 for c in freq.values() if 2 <= c <= 3)
        features['f_vocabulary_depth'] = r4(mid / max(len(freq), 1))
    else:
        features['f_hapax_contextual_rate'] = 0
        features['f_vocabulary_depth'] = 0

    # 5. Implicit tension
    if len(sents) >= 3:
        tension_s = desire_neg = perc_conflict = 0
        for s in sents:
            lower = s.lower()
            hp = bool(PERCEPTION_RE.search(lower))
            hd = bool(DESIRE_RE.search(lower))
            hn = bool(NEGATION_SEM_RE.search(lower))
            hc = bool(CONCESSION_RE.search(lower))
            hi = bool(IRONY_SEM_RE.search(lower))
            if sum([hp,hd,hn,hc,hi]) >= 2:
                tension_s += 1
            if hd and hn:
                desire_neg += 1
            if hp and (hn or hc):
                perc_conflict += 1
        features['f_tension_density'] = r4(tension_s / len(sents))
        features['f_desire_negation_rate'] = r4(desire_neg / len(sents))
        features['f_perception_conflict_rate'] = r4(perc_conflict / len(sents))
    else:
        features['f_tension_density'] = 0
        features['f_desire_negation_rate'] = 0
        features['f_perception_conflict_rate'] = 0

    # 6. POV contamination
    if len(sents) >= 5:
        def classify_pov(s):
            lower = s.lower()
            p1 = len(re.findall(r"\b(?:je|j'|me|m'|moi|mon|ma|mes|i\b|my\b|mine\b|myself\b)", lower))
            p3 = len(re.findall(r"\b(?:il|elle|lui|son|sa|ses|he\b|she\b|his\b|her\b|him\b)", lower))
            pn = len(re.findall(r"\b(?:on|nous|we\b|our\b|us\b)", lower))
            mx = max(p1, p3, pn)
            if mx == 0: return '0'
            if p1 == mx: return '1'
            if p3 == mx: return '3'
            return 'N'
        povs = [classify_pov(s) for s in sents]
        drifts = ruptures = 0
        last = '0'
        for p in povs:
            if p == '0': continue
            if last != '0' and last != p:
                if (last == '1' and p == '3') or (last == '3' and p == '1'):
                    ruptures += 1
                else:
                    drifts += 1
            last = p
        nz = sum(1 for p in povs if p != '0')
        features['f_pov_drift_rate'] = r4(drifts / max(nz - 1, 1))
        features['f_pov_rupture_rate'] = r4(ruptures / max(nz - 1, 1))
        pov_counts = {}
        for p in povs:
            if p == '0': continue
            pov_counts[p] = pov_counts.get(p, 0) + 1
        features['f_pov_stability'] = r4(max(pov_counts.values(), default=0) / max(nz, 1))
    else:
        features['f_pov_drift_rate'] = 0
        features['f_pov_rupture_rate'] = 0
        features['f_pov_stability'] = 0

    # 7. Causal coherence
    if len(sents) >= 3:
        causal_s = temporal_a = 0
        chain = 0
        chains = []
        for s in sents:
            lower = s.lower()
            hcaus = bool(CAUSAL_RE.search(lower))
            htemp = bool(TEMPORAL_RE.search(lower))
            hreac = bool(REACTION_RE.search(lower))
            if hcaus or hreac:
                causal_s += 1
                chain += 1
            else:
                if chain > 0: chains.append(chain)
                chain = 0
            if htemp: temporal_a += 1
        if chain > 0: chains.append(chain)
        features['f_causal_density'] = r4(causal_s / len(sents))
        features['f_causal_chain_length'] = r4(mean_val(chains) if chains else 0)
        features['f_temporal_anchor_rate'] = r4(temporal_a / len(sents))
    else:
        features['f_causal_density'] = 0
        features['f_causal_chain_length'] = 0
        features['f_temporal_anchor_rate'] = 0

    # 8. Relational density
    if len(sents) >= 3:
        sent_words_sets = []
        for s in sents:
            ws = set(w for w in get_lower_words(s) if w not in STOP_FR and len(w) > 3)
            sent_words_sets.append(ws)
        word_pos = {}
        for i, ws in enumerate(sent_words_sets):
            for w in ws:
                if w not in word_pos: word_pos[w] = []
                word_pos[w].append(i)
        all_cw = set()
        for ws in sent_words_sets: all_cw.update(ws)
        echo_count = callback_count = 0
        ft = len(sents) // 3
        lt = len(sents) - ft
        for w, pos in word_pos.items():
            if len(pos) < 2: continue
            for i in range(1, len(pos)):
                if pos[i] - pos[i-1] >= 3:
                    echo_count += 1
                    break
            if any(p < ft for p in pos) and any(p >= lt for p in pos):
                callback_count += 1
        tcw = len(all_cw)
        features['f_echo_density'] = r4(echo_count / tcw if tcw else 0)
        features['f_lexical_callback_rate'] = r4(callback_count / tcw if tcw else 0)
        repeated = [(w, pos) for w, pos in word_pos.items() if len(pos) >= 2]
        gap_vars = []
        for w, pos in repeated:
            gaps = [pos[i] - pos[i-1] for i in range(1, len(pos))]
            if len(gaps) > 1:
                gm = mean_val(gaps)
                gv = sum((g-gm)**2 for g in gaps) / (len(gaps)-1)
                gap_vars.append(gv)
            elif gaps:
                gap_vars.append(0)
        features['f_motif_concentration'] = r4(min(1, mean_val(gap_vars) / 20) if gap_vars else 0)
    else:
        features['f_echo_density'] = 0
        features['f_lexical_callback_rate'] = 0
        features['f_motif_concentration'] = 0

    return features


# ═══════════════════════════════════════════════════════════════
# COMPUTE ALL 42 FEATURES FROM RAW TEXT
# ═══════════════════════════════════════════════════════════════

V3_FEATURES = [
    'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
    'f24c_contrast_delta', 'f28b_irony_density', 'f27a_epistemic_rate',
    'f9a_contradiction_rate', 'f19a_approx_entropy', 'f27d_modal_score',
    'f26c_period_score',
    'f_pov_shift_rate', 'f_subordination_depth', 'f_clause_per_sentence',
    'f17_knife_count', 'f29d_ttr_score', 'f35c_hook_score', 'f36c_cliff_score',
    'ix_mean_x_subdepth', 'ix_pov_x_irony', 'ix_variance_x_longrate',
]

SEMANTIC_FEATURES = [
    'f_referent_continuity', 'f_referent_orphan_rate', 'f_entity_persistence',
    'f_lexical_progression', 'f_semantic_stagnation', 'f_novelty_curve_slope',
    'f_contextual_precision', 'f_rare_word_isolation',
    'f_hapax_contextual_rate', 'f_vocabulary_depth',
    'f_tension_density', 'f_desire_negation_rate', 'f_perception_conflict_rate',
    'f_pov_drift_rate', 'f_pov_rupture_rate', 'f_pov_stability',
    'f_causal_density', 'f_causal_chain_length', 'f_temporal_anchor_rate',
    'f_echo_density', 'f_lexical_callback_rate', 'f_motif_concentration',
]

ALL_FEATURES = V3_FEATURES + SEMANTIC_FEATURES


def compute_all_features(text):
    """Compute all 42 features from raw text"""
    f = {}
    f.update(compute_v3_text_features(text))
    f.update(compute_depth_features(text))
    f.update(compute_semantic_features(text))
    # Interactions
    f['ix_mean_x_subdepth'] = f.get('f1_mean', 0) * f.get('f_subordination_depth', 0)
    f['ix_pov_x_irony'] = f.get('f_pov_shift_rate', 0) * f.get('f28b_irony_density', 0)
    f['ix_variance_x_longrate'] = f.get('f1a_rhythm_variance', 0) * f.get('f26b_long_sent_rate', 0)
    return f


# ═══════════════════════════════════════════════════════════════
# RETRAIN GB MODEL (exact same as R-6b)
# ═══════════════════════════════════════════════════════════════

print("Loading corpus data...")
with open(MASTER, 'r', encoding='utf-8') as f:
    master = json.load(f)
with open(DEPTH, 'r', encoding='utf-8') as f:
    depth_data = json.load(f)
with open(TIERS, 'r', encoding='utf-8') as f:
    tiers_data = json.load(f)
with open(SEMANTIC, 'r', encoding='utf-8') as f:
    semantic_data = json.load(f)

tier_lookup = {e['filename']: e.get('tier_suggestion', '?') for e in tiers_data}
depth_lookup = {e['filename']: e['depth_features'] for e in depth_data}
semantic_lookup = {e['filename']: e['semantic_features'] for e in semantic_data}
TIER_RANK = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}

ORIG_F = ['f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
          'f24c_contrast_delta', 'f28b_irony_density', 'f27a_epistemic_rate',
          'f9a_contradiction_rate', 'f19a_approx_entropy', 'f27d_modal_score', 'f26c_period_score']
DEPTH_F = ['f_pov_shift_rate', 'f_subordination_depth', 'f_clause_per_sentence']
SUSPECT_F = ['f17_knife_count', 'f29d_ttr_score', 'f35c_hook_score', 'f36c_cliff_score']
IX_F = ['ix_mean_x_subdepth', 'ix_pov_x_irony', 'ix_variance_x_longrate']

data = []
for entry in master:
    fn = entry['filename']
    tier = entry.get('tier') or tier_lookup.get(fn, '?')
    if tier not in TIER_RANK:
        continue
    feats = entry['features']
    d_feats = depth_lookup.get(fn, {})
    s_feats = semantic_lookup.get(fn, {})
    row = {}
    for ff in ORIG_F:
        row[ff] = safe(feats.get(ff, 0))
    for ff in DEPTH_F:
        row[ff] = safe(d_feats.get(ff, 0))
    for ff in SUSPECT_F:
        row[ff] = safe(feats.get(ff, 0))
    row['ix_mean_x_subdepth'] = row['f1_mean'] * row['f_subordination_depth']
    row['ix_pov_x_irony'] = row['f_pov_shift_rate'] * row['f28b_irony_density']
    row['ix_variance_x_longrate'] = row['f1a_rhythm_variance'] * row['f26b_long_sent_rate']
    for ff in SEMANTIC_FEATURES:
        row[ff] = safe(s_feats.get(ff, 0))
    data.append((row, TIER_RANK[tier], fn))

# Same split
random.seed(42)
indices = list(range(len(data)))
random.shuffle(indices)
n = len(data)
n_train = int(n * 0.70)
n_val = int(n * 0.15)
train_idx = indices[:n_train]

X_train = np.array([[data[i][0].get(f, 0) for f in ALL_FEATURES] for i in train_idx])
y_train = np.array([data[i][1] for i in train_idx])

# Same GB params as R-6b winner
print("Training GB model (same params as R-6b)...")
gb = GradientBoostingRegressor(
    n_estimators=50, max_depth=4, learning_rate=0.05,
    random_state=42, subsample=0.8, min_samples_leaf=5,
)
gb.fit(X_train, y_train)
print("  Model trained.")


# ═══════════════════════════════════════════════════════════════
# DIAGNOSTIC SOURCES
# ═══════════════════════════════════════════════════════════════

SOURCES = [
    {'label': 'Flaubert-Bovary', 'path': os.path.join(TXT_DIR, 'flaubert_bovary_14155.txt'), 'tier': 'S'},
    {'label': 'Flaubert-Education', 'path': os.path.join(TXT_DIR, 'flaubert_education_14285.txt'), 'tier': 'S'},
    {'label': 'Flaubert-Salammbo', 'path': os.path.join(TXT_DIR, 'flaubert_salammbo_10884.txt'), 'tier': 'S'},
    {'label': 'Flaubert-TroisContes', 'path': os.path.join(TXT_DIR, 'flaubert_trois_contes_10719.txt'), 'tier': 'S'},
    {'label': 'GPT-5.4', 'path': os.path.join(LLM_DIR, 'chatgpt_5.4_correction.txt'), 'tier': 'LLM'},
    {'label': 'GPT-original', 'path': os.path.join(LLM_DIR, 'gpt.txt'), 'tier': 'LLM'},
    {'label': 'Claude-Opus', 'path': os.path.join(LLM_DIR, 'claude_opus.txt'), 'tier': 'LLM'},
    {'label': 'Riviera', 'path': os.path.join(LLM_DIR, 'riviera.txt'), 'tier': 'LLM'},
]


def extract_window(text, window_words, position_frac):
    """Extract a window of window_words centered at position_frac"""
    words = text.split()
    total = len(words)
    if total <= window_words:
        return ' '.join(words)
    center = int(total * position_frac)
    start = max(0, center - window_words // 2)
    end = min(total, start + window_words)
    if end - start < window_words:
        start = max(0, end - window_words)
    return ' '.join(words[start:end])


def score_text(text):
    """Compute features and score with GB model"""
    feats = compute_all_features(text)
    X = np.array([[feats.get(f, 0) for f in ALL_FEATURES]])
    pred = gb.predict(X)[0]
    return pred, feats


# ═══════════════════════════════════════════════════════════════
# MAIN TEST
# ═══════════════════════════════════════════════════════════════

print("\n" + "=" * 80)
print("  OMEGA R-7 STEP 1 : MULTI-SCALE TEST (500w vs 2000w)")
print("=" * 80)

results = []
positions = [0.25, 0.50, 0.75]

for src in SOURCES:
    if not os.path.exists(src['path']):
        print(f"  SKIP: {src['label']} (not found)")
        continue

    with open(src['path'], 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()

    word_count = len(text.split())
    print(f"\n  {src['label']} ({word_count} words)")

    scores_500 = []
    scores_2000 = []

    for pos in positions:
        # 500-word window
        w500 = extract_window(text, 500, pos)
        score_500, _ = score_text(w500)
        scores_500.append(score_500)

        # 2000-word window
        if word_count >= 2000:
            w2000 = extract_window(text, 2000, pos)
        else:
            # Use full text (< 2000 words)
            w2000 = text
        score_2000, _ = score_text(w2000)
        scores_2000.append(score_2000)

    mean_500 = mean_val(scores_500)
    mean_2000 = mean_val(scores_2000)
    delta = mean_2000 - mean_500
    direction = "UP" if delta > 0 else "DOWN" if delta < 0 else "FLAT"

    entry = {
        'source': src['label'],
        'tier': src['tier'],
        'total_words': word_count,
        'scores_500': [round(s, 4) for s in scores_500],
        'scores_2000': [round(s, 4) for s in scores_2000],
        'mean_500': round(mean_500, 4),
        'mean_2000': round(mean_2000, 4),
        'delta': round(delta, 4),
        'direction': direction,
    }
    results.append(entry)

    print(f"    500w:  {' / '.join(f'{s:.3f}' for s in scores_500)}  -> mean={mean_500:.3f}")
    print(f"    2000w: {' / '.join(f'{s:.3f}' for s in scores_2000)}  -> mean={mean_2000:.3f}")
    print(f"    delta: {delta:+.3f} ({direction})")

# ═══════════════════════════════════════════════════════════════
# COMPARISON TABLE
# ═══════════════════════════════════════════════════════════════

print("\n" + "=" * 80)
print("  COMPARISON TABLE")
print("=" * 80)
print(f"\n  {'Source':<25} {'500w':>8} {'2000w':>8} {'Delta':>8} {'Dir':>6}")
print(f"  {'-'*25} {'-'*8} {'-'*8} {'-'*8} {'-'*6}")
for r in results:
    print(f"  {r['source']:<25} {r['mean_500']:>8.3f} {r['mean_2000']:>8.3f} {r['delta']:>+8.3f} {r['direction']:>6}")

# Key question: does the gap invert at 2000w?
flaubert_500 = mean_val([r['mean_500'] for r in results if 'Flaubert' in r['source']])
flaubert_2000 = mean_val([r['mean_2000'] for r in results if 'Flaubert' in r['source']])
opus_entries = [r for r in results if 'Opus' in r['source']]
opus_500 = opus_entries[0]['mean_500'] if opus_entries else 0
opus_2000 = opus_entries[0]['mean_2000'] if opus_entries else 0
gpt_entries = [r for r in results if 'GPT-5.4' in r['source']]
gpt_500 = gpt_entries[0]['mean_500'] if gpt_entries else 0
gpt_2000 = gpt_entries[0]['mean_2000'] if gpt_entries else 0

print(f"\n  CRITICAL COMPARISONS:")
print(f"    Flaubert avg  : 500w={flaubert_500:.3f}  2000w={flaubert_2000:.3f}  delta={flaubert_2000-flaubert_500:+.3f}")
print(f"    Claude Opus   : 500w={opus_500:.3f}  2000w={opus_2000:.3f}  delta={opus_2000-opus_500:+.3f}")
print(f"    GPT-5.4       : 500w={gpt_500:.3f}  2000w={gpt_2000:.3f}  delta={gpt_2000-gpt_500:+.3f}")

gap_500 = flaubert_500 - opus_500
gap_2000 = flaubert_2000 - opus_2000
print(f"\n    Flaubert-Opus gap at 500w:  {gap_500:+.3f}  {'Flaubert wins' if gap_500 > 0 else 'OPUS WINS'}")
print(f"    Flaubert-Opus gap at 2000w: {gap_2000:+.3f}  {'Flaubert wins' if gap_2000 > 0 else 'OPUS WINS'}")

if gap_2000 > 0 and gap_500 <= 0:
    verdict = "GAP INVERTED: Flaubert overtakes Opus at 2000w. Scale matters."
elif gap_2000 > gap_500:
    verdict = "GAP REDUCED at 2000w but not inverted. Partial improvement."
else:
    verdict = "NO IMPROVEMENT at 2000w. Need new features, not scale."

print(f"\n  VERDICT: {verdict}")

# Save
output = {
    'phase': 'R-7',
    'step': 1,
    'title': 'Multi-Scale Test',
    'date': '2026-03-21',
    'window_sizes': [500, 2000],
    'positions': positions,
    'gb_params': {'n_estimators': 50, 'max_depth': 4, 'learning_rate': 0.05},
    'results': results,
    'summary': {
        'flaubert_avg_500': round(flaubert_500, 4),
        'flaubert_avg_2000': round(flaubert_2000, 4),
        'claude_opus_500': round(opus_500, 4),
        'claude_opus_2000': round(opus_2000, 4),
        'gpt54_500': round(gpt_500, 4),
        'gpt54_2000': round(gpt_2000, 4),
        'gap_flaubert_opus_500': round(gap_500, 4),
        'gap_flaubert_opus_2000': round(gap_2000, 4),
        'gap_inverted': bool(gap_2000 > 0 and gap_500 <= 0),
        'verdict': verdict,
    },
}

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\n  Saved: {OUT}")
print("=" * 80)
