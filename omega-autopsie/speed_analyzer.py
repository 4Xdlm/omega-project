#!/usr/bin/env python3
"""
OMEGA — Speed Analyzer — CALC-only feature extraction (0 API, 0 spaCy)
Phase W — Mission 1

Extracts 13 features from raw text, identical to full_work_analyzer_v4 pipeline
(F24-F30 exact, F1/F1a/F19/F21/F23 exact, F22 approximated without spaCy).

Target: < 0.5s per 2000-word text.

Features:
  f1_mean, f1a_rhythm_variance, f19e_window_median, f21e_ritual_index,
  f22f_literary_index, f23d_literary_causal_score, f24e_contrast_score,
  f25g_description_score, f26c_period_score, f27d_modal_score,
  f28d_sil_score, f29b_ttr_window, f30d_ps_imp_ratio

Standard: NASA-Grade L4 / DO-178C Level A
"""

import re
import math
import numpy as np
from statistics import mean, stdev


# ═══════════════════════════════════════════════════════════════════════════════
# SENTENCE SPLITTER (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

def split_sentences(text: str) -> list:
    raw = re.split(r"(?<=[.!?…»])\s+", text)
    return [s.strip() for s in raw if len(s.strip()) > 5]


# ═══════════════════════════════════════════════════════════════════════════════
# F1 / F1a — Rhythm (identical to autopsie_v4.py compute_f1)
# ═══════════════════════════════════════════════════════════════════════════════

def compute_f1(sents: list) -> dict:
    lens = [len(s.split()) for s in sents]
    if len(lens) < 3:
        return {"f1_mean": 0.0, "f1a_rhythm_variance": 0.0}
    a = np.array(lens, dtype=float)
    return {
        "f1_mean": round(float(np.mean(a)), 2),
        "f1a_rhythm_variance": round(float(np.std(a)), 3),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# F19e — Approximate Entropy windowed (identical to autopsie_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

def _approximate_entropy(data: list, m: int = 2, r: float = None) -> float:
    n = len(data)
    if n < m + 2:
        return 0.0
    arr = np.array(data, dtype=float)
    if r is None:
        r = 0.2 * float(np.std(arr))
        if r == 0:
            r = 0.001

    def phi(m_len):
        templates = [arr[i:i + m_len] for i in range(n - m_len + 1)]
        count = 0
        for i, tmpl in enumerate(templates):
            matches = sum(
                1 for j, other in enumerate(templates)
                if np.max(np.abs(tmpl - other)) <= r
            )
            if matches > 0:
                count += math.log(matches / (n - m_len + 1))
        return count / (n - m_len + 1)

    return abs(phi(m) - phi(m + 1))


def compute_f19(sents: list) -> dict:
    WINDOW = 15
    STEP = 5

    if len(sents) < WINDOW:
        lens = [len(s.split()) for s in sents]
        apen = _approximate_entropy(lens, m=2)
        return {"f19e_window_median": round(apen, 5)}

    lens = [len(s.split()) for s in sents]
    window_apens = []
    for start in range(0, len(sents) - WINDOW + 1, STEP):
        w = lens[start: start + WINDOW]
        apen_w = _approximate_entropy(w, m=2)
        window_apens.append(apen_w)

    w_arr = np.array(window_apens)
    w_median = float(np.median(w_arr))
    return {"f19e_window_median": round(w_median, 5)}


# ═══════════════════════════════════════════════════════════════════════════════
# F21e — Ritual Index (identical to autopsie_v4.py compute_f21)
# ═══════════════════════════════════════════════════════════════════════════════

_SW = {"le","la","les","un","une","des","de","du","en","à","au","aux",
       "et","ou","ni","mais","donc","or","car","que","qui","quoi","dont",
       "il","elle","ils","elles","je","tu","nous","vous","on","se","sa",
       "son","ses","leur","leurs","ce","cet","cette","ces","y","si"}


def compute_f21(sents: list) -> dict:
    if len(sents) < 4:
        return {"f21e_ritual_index": 0.0}

    n = len(sents)

    # Anaphore
    anaphora_count = 0
    for i in range(n - 1):
        w1 = sents[i].lower().split()[:2]
        w2 = sents[i + 1].lower().split()[:2]
        if len(w1) >= 2 and w1 == w2:
            anaphora_count += 1
    f21a = anaphora_count / max(n - 1, 1)

    # Épistrophe
    epistrophe_count = 0
    for i in range(n - 1):
        w1 = re.sub(r"[^\w]", "", sents[i].lower().split()[-1]) if sents[i].split() else ""
        w2 = re.sub(r"[^\w]", "", sents[i + 1].lower().split()[-1]) if sents[i + 1].split() else ""
        if w1 and w2 and w1 == w2 and len(w1) > 3:
            epistrophe_count += 1
    f21b = epistrophe_count / max(n - 1, 1)

    # Diacope
    words_per_sent = [
        set(re.sub(r"[^\w\s]", "", s.lower()).split())
        for s in sents
    ]
    diacope_count = 0
    for i in range(n):
        sig_words = words_per_sent[i] - _SW
        for w in sig_words:
            if len(w) <= 3:
                continue
            for j in range(i + 2, min(i + 6, n)):
                if w in words_per_sent[j]:
                    diacope_count += 1
                    break
    f21c = diacope_count / max(n, 1)

    # Echo rythmique
    lens = [len(s.split()) for s in sents]
    def quantize(l):
        if l <= 6: return "XS"
        if l <= 12: return "S"
        if l <= 20: return "M"
        if l <= 35: return "L"
        return "XL"
    qsizes = [quantize(l) for l in lens]
    echo_count = 0
    for i in range(2, n):
        if qsizes[i] == qsizes[i - 2] and qsizes[i] != qsizes[i - 1]:
            echo_count += 1
    for i in range(3, n):
        if qsizes[i] == qsizes[i - 2] and qsizes[i - 1] == qsizes[i - 3] and qsizes[i] != qsizes[i - 1]:
            echo_count += 1
    f21d = echo_count / max(n - 2, 1)

    composite = min(1.0, f21a * 0.35 + f21c * 0.30 + f21d * 0.25 + f21b * 0.10)
    return {"f21e_ritual_index": round(composite, 5)}


# ═══════════════════════════════════════════════════════════════════════════════
# F22f — Literary Index (CALC approximation — no spaCy)
# Uses word-list matching instead of POS tags/lemmas.
# NOTE: ~5% delta vs spaCy version on edge cases (modal verbs with ambiguous POS).
# ═══════════════════════════════════════════════════════════════════════════════

MODAL_VERBS_FORMS = {
    "pourrait", "pourraient", "devrait", "devraient", "aurait", "auraient",
    "serait", "seraient", "voudrait", "voudraient", "saurait", "sauraient",
    "semblait", "semblaient", "paraissait", "paraissaient",
    "peut-être", "sembler", "paraître",
}

FOCALIZATION_FORMS = {
    "voir", "voit", "voyait", "voyaient", "vu",
    "entendre", "entend", "entendait", "entendaient", "entendu",
    "sentir", "sent", "sentait", "sentaient", "senti",
    "ressentir", "ressentait", "ressent", "ressenti",
    "penser", "pense", "pensait", "pensaient", "pensé",
    "croire", "croit", "croyait", "croyaient", "cru",
    "savoir", "sait", "savait", "savaient", "su",
    "comprendre", "comprend", "comprenait", "comprenaient", "compris",
    "imaginer", "imagine", "imaginait", "imaginé",
    "remarquer", "remarque", "remarquait", "remarqué",
    "percevoir", "perçoit", "percevait", "perçu",
    "contempler", "contemple", "contemplait", "contemplé",
    "observer", "observe", "observait", "observé",
    "songer", "songe", "songeait", "songé",
    "rêver", "rêve", "rêvait", "rêvé",
}

SUSPENSION_MARKERS = ["…", "...", "—", "–"]
RHETORICAL_Q = re.compile(r"\?(?!\s*[A-Z])")

SUBORD_CONJ = ["que", "qui", "dont", "où", "lorsque", "quand", "comme", "puisque",
               "parce que", "bien que", "quoique", "afin que", "pour que",
               "avant que", "après que", "dès que", "si", "bien sûr que"]


def compute_f22(sents: list, text: str) -> dict:
    """F22 Literary Index — CALC-only (no spaCy). Heuristic word-list POS approximation."""
    n = len(sents)
    if n < 3:
        return {"f22f_literary_index": 0.0}

    # Subordination
    subord_count = sum(1 for s in sents
                       for conj in SUBORD_CONJ if (" " + conj + " ") in (" " + s.lower() + " "))
    f22a = subord_count / max(n, 1)

    # Suspensions
    susp_count = sum(sum(1 for m in SUSPENSION_MARKERS if m in s) for s in sents)
    f22b = min(susp_count / max(n, 1), 1.0)

    # Modal density (word-list approx instead of spaCy POS)
    words = text.lower().split()
    modal_count = sum(1 for w in words if w.rstrip(".,;:!?\"'") in MODAL_VERBS_FORMS)
    # Approximate verb count: ~15-20% of words are verbs in French prose
    approx_verb_count = max(len(words) * 0.17, 1)
    f22c = modal_count / approx_verb_count

    # Rhetorical questions
    rhet_q = len(RHETORICAL_Q.findall(text))
    f22d = rhet_q / max(n, 1)

    # Internal focalization (word-list approx)
    foc_count = sum(1 for w in words if w.rstrip(".,;:!?\"'") in FOCALIZATION_FORMS)
    f22e = foc_count / max(n, 1)

    composite = (f22a * 0.30 + f22b * 0.15 + f22c * 0.20 + f22d * 0.10 + f22e * 0.25)
    return {"f22f_literary_index": round(composite, 5)}


# ═══════════════════════════════════════════════════════════════════════════════
# F23d — Literary Causal Score (identical to autopsie_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

CAUSAL_CONNECTORS = [
    "parce que", "parce qu", "car", "puisque", "puisqu", "donc", "ainsi",
    "c'est pourquoi", "c'est pour cela", "de ce fait", "par conséquent",
    "en conséquence", "à cause de", "grâce à", "en raison de",
    "il en résulte", "il s'ensuit", "voilà pourquoi", "d'où",
    "étant donné", "vu que", "attendu que", "sachant que",
]

CAUSAL_IMPLICIT_MARKERS = [
    "et puis", "or", "mais", "pourtant", "cependant", "néanmoins", "toutefois",
    "quand même", "tout de même", "malgré", "en dépit de",
]


def compute_f23(sents: list, text: str) -> dict:
    n = len(sents)
    if n < 3:
        return {"f23d_literary_causal_score": 0.0}

    tl = text.lower()
    explicit_total = sum(tl.count(conn) for conn in CAUSAL_CONNECTORS)
    f23a = explicit_total / max(n, 1)
    f23d = max(0.0, 1.0 - f23a * 5)
    return {"f23d_literary_causal_score": round(f23d, 5)}


# ═══════════════════════════════════════════════════════════════════════════════
# F24e — Contrast Score (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

def compute_f24(sents: list) -> dict:
    if len(sents) < 10:
        return {"f24e_contrast_score": 0.0}

    lens = [len(s.split()) for s in sents]
    s_lens = sorted(lens)
    n = len(s_lens)
    p25 = s_lens[n // 4]
    p75 = s_lens[3 * n // 4]

    banal_lens = [l for l in lens if l <= p25]
    apex_lens = [l for l in lens if l >= p75]
    banal_rate = len(banal_lens) / n
    mean_banal = mean(banal_lens) if banal_lens else 0
    mean_apex = mean(apex_lens) if apex_lens else 0
    contrast = mean_apex - mean_banal

    apex_positions = [i for i, l in enumerate(lens) if l >= p75]
    if len(apex_positions) >= 2:
        gaps = [apex_positions[i + 1] - apex_positions[i] for i in range(len(apex_positions) - 1)]
        apex_isolation = mean(gaps)
    else:
        apex_isolation = float(n)

    balance_score = max(0.0, 1.0 - abs(banal_rate - 0.25) * 2)
    contrast_score = min(1.0, contrast / 15.0)
    isolation_score = max(0.0, 1.0 - abs(apex_isolation - 6.0) / 10.0)
    score = round((balance_score * 0.3 + contrast_score * 0.5 + isolation_score * 0.2), 5)
    score = max(0.0, min(1.0, score))
    return {"f24e_contrast_score": score}


# ═══════════════════════════════════════════════════════════════════════════════
# F25g — Description Score (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

_SENSORY = {
    "visuel":   ["lumière", "ombre", "couleur", "brillant", "sombre", "clair", "lueur", "reflet",
                 "light", "shadow", "gleam", "glow", "dark", "bright", "shimmer"],
    "auditif":  ["bruit", "son", "silence", "murmure", "voix", "écho", "craquement", "souffle",
                 "noise", "sound", "whisper", "creak", "rumble", "hum"],
    "tactile":  ["froid", "chaud", "doux", "rugeux", "humide", "sec", "peau", "cold", "warm",
                 "smooth", "rough", "damp", "dry", "skin"],
    "olfactif": ["odeur", "parfum", "senteur", "fumée", "smell", "scent", "fragrance", "smoke", "stench"],
    "gustatif": ["goût", "amer", "sucré", "salé", "taste", "bitter", "sweet", "salty", "sour"],
}

_ADJ_MARKERS = ["eux", "euse", "ique", "able", "ible", "ant", "ent", "al", "el", "ous", "ful", "less", "ive"]
_ADV_MARKERS = ["ment", "ement", "amment", "ément", "ly", "ally"]
_ACTION_VERBS = ["marcha", "couri", "dit", "répondi", "prit", "saisi", "ouvri", "ferma",
                 "walked", "ran", "said", "took", "opened", "closed", "grabbed", "threw"]
_SUSPENSION = ["était", "semblait", "paraissait", "demeurait", "restait", "planait", "flottait",
               "régnait", "s'étendait", "was", "seemed", "appeared", "remained", "hovered", "lay"]
_SPATIAL = ["loin", "près", "derrière", "devant", "sous", "au-dessus", "au-delà", "au fond",
            "en bas", "en haut", "far", "near", "behind", "beneath", "above", "beyond", "horizon"]
_ABSTRACT_NOUNS = ["silence", "lumière", "obscurité", "douleur", "joie", "tristesse", "solitude",
                   "mémoire", "temps", "espace", "light", "darkness", "pain", "joy", "sadness",
                   "memory", "time", "space", "death", "life", "soul", "fear", "hope"]
_CONCRETE = ["pierre", "bois", "métal", "fer", "verre", "tissu", "cuir", "terre", "eau", "feu", "cendre",
             "os", "stone", "wood", "metal", "glass", "leather", "earth", "water", "fire", "ash", "bone"]


def compute_f25(text: str, sents: list) -> dict:
    txt_lower = text.lower()
    words = text.split()
    n_words = max(len(words), 1)
    n_sents = max(len(sents), 1)

    sensory_score = sum(1 for markers in _SENSORY.values() if any(m in txt_lower for m in markers))
    adj_count = sum(1 for w in words if any(w.lower().endswith(m) for m in _ADJ_MARKERS))
    adv_count = sum(1 for w in words if any(w.lower().endswith(m) for m in _ADV_MARKERS))
    action_count = max(sum(1 for w in words if any(v in w.lower() for v in _ACTION_VERBS)), 1)
    description_density = min(round((adj_count + adv_count) / action_count, 4), 10.0)

    susp_count = sum(1 for w in words if w.lower() in _SUSPENSION)
    time_suspension = round(susp_count / n_sents, 5)

    spatial_depth = round(min(sum(1 for m in _SPATIAL if m in txt_lower) / 10.0, 1.0), 4)

    abstract_count = sum(1 for w in words if w.lower() in _ABSTRACT_NOUNS)
    nominalization = round(abstract_count / n_words, 5)

    object_density = round(sum(1 for w in words if w.lower() in _CONCRETE) / n_words, 5)

    desc_score = round(
        min(description_density / 5.0, 1.0) * 0.25 +
        sensory_score / 5.0 * 0.30 +
        min(time_suspension * 5, 1.0) * 0.15 +
        spatial_depth * 0.15 +
        min(nominalization * 100, 1.0) * 0.10 +
        min(object_density * 100, 1.0) * 0.05, 5)

    return {"f25g_description_score": desc_score}


# ═══════════════════════════════════════════════════════════════════════════════
# F26c — Period Score (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

_ALL_SUB = {"que", "qui", "dont", "où", "lequel", "laquelle", "lesquels", "lesquelles",
            "quand", "comme", "si", "puisque", "parce", "bien", "quoique", "malgré",
            "tandis", "alors", "lorsque", "dès", "avant", "après", "pendant", "jusqu",
            "that", "which", "who", "whom", "whose", "where", "when", "although",
            "because", "since", "while", "until", "unless", "whether", "after",
            "before", "though", "even", "whereas", "provided"}


def compute_f26(sents: list) -> dict:
    if not sents:
        return {"f26c_period_score": 0.0}

    sub_counts = []
    sent_lens = []
    for s in sents:
        words = s.lower().split()
        sub_n = sum(1 for w in words if w.rstrip(".,;:!?") in _ALL_SUB)
        sub_counts.append(sub_n)
        sent_lens.append(len(words))

    mean_sub = mean(sub_counts)
    long_rate = sum(1 for l in sent_lens if l > 40) / len(sent_lens)
    sub_score = min(mean_sub / 6.0, 1.0)
    len_score = long_rate
    period_score = round(sub_score * 0.6 + len_score * 0.4, 5)
    return {"f26c_period_score": period_score}


# ═══════════════════════════════════════════════════════════════════════════════
# F27d — Modal Score (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

_EPISTEMIC_FR = ["semblait", "paraissait", "apparemment", "peut-être", "probablement",
                 "sans doute", "il me semblait", "comme si", "on eût dit", "dirait-on",
                 "quelque chose", "une sorte", "une espèce", "je croyais", "il croyait",
                 "il lui semblait", "avait l'air", "avait l'impression"]
_EPISTEMIC_EN = ["seemed", "appeared", "apparently", "perhaps", "probably", "possibly",
                 "as if", "as though", "something like", "a kind of", "sort of", "might",
                 "could", "would have", "had seemed", "it seemed"]

_CONDITIONAL_FR = ["aurait", "aurait été", "eût", "eût été", "serait", "fût", "voudrait"]
_PASSE_SIMPLE = ["fut", "eut", "dit", "prit", "vit", "alla", "revint", "sembla", "parut"]

_NEG_COMPLEX = ["ne...que", "nul", "aucun", "jamais", "guère", "ni...ni", "point",
                "nullement", "en aucune façon", "rien de", "pas un seul"]


def compute_f27(text: str, sents: list) -> dict:
    txt_lower = text.lower()
    n_sents = max(len(sents), 1)

    ep_fr = sum(txt_lower.count(m) for m in _EPISTEMIC_FR)
    ep_en = sum(txt_lower.count(m) for m in _EPISTEMIC_EN)
    epistemic_rate = (ep_fr + ep_en) / n_sents * 100

    cond_count = sum(txt_lower.count(m) for m in _CONDITIONAL_FR)
    ps_count = max(sum(txt_lower.count(m) for m in _PASSE_SIMPLE), 1)
    conditional_rate = cond_count / ps_count

    neg_count = sum(txt_lower.count(m) for m in _NEG_COMPLEX)
    negation_rate = neg_count / n_sents * 100

    ep_score = min(epistemic_rate / 20.0, 1.0)
    cond_score = min(conditional_rate / 2.0, 1.0)
    neg_score = min(negation_rate / 10.0, 1.0)
    modal_score = round(ep_score * 0.5 + cond_score * 0.3 + neg_score * 0.2, 5)
    return {"f27d_modal_score": modal_score}


# ═══════════════════════════════════════════════════════════════════════════════
# F28d — SIL Score (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

_SIL_MARKERS = ["après tout", "bien sûr", "évidemment", "comment donc", "n'était-ce pas",
                "car enfin", "mais non", "mais si", "que diable", "sapré",
                "certainement", "décidément", "vraiment", "quelle idée", "quel imbécile",
                "after all", "of course", "certainly", "how odd", "no doubt",
                "why not", "what a", "surely", "indeed", "obviously", "well then"]

_IRONY = ["on eût dit", "c'était bien là", "voilà qui", "comme c'est", "comme il convient",
          "naturellement", "il va sans dire", "cela s'entend", "bien entendu"]


def compute_f28(text: str, sents: list) -> dict:
    txt_lower = text.lower()
    sents_lower = [s.lower() for s in sents]
    n_sents = max(len(sents), 1)

    sil_count = sum(1 for m in _SIL_MARKERS if m in txt_lower)
    sil_rate = sil_count / n_sents * 100

    irony_density = sum(txt_lower.count(m) for m in _IRONY) / n_sents * 100

    interior_count = sum(
        1 for s in sents_lower
        if s.endswith("?") and any(m in s for m in ["ait", "ait-il", "ait-elle", "était"])
    )
    interior_rate = interior_count / n_sents

    sil_score = round(
        min(sil_rate / 20.0, 1.0) * 0.4 +
        min(irony_density / 5.0, 1.0) * 0.35 +
        min(interior_rate * 5, 1.0) * 0.25, 5)
    return {"f28d_sil_score": sil_score}


# ═══════════════════════════════════════════════════════════════════════════════
# F29b — TTR Window (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

def compute_f29(text: str) -> dict:
    WINDOW = 100
    words = [w.lower().strip(".,;:!?\"'()[]") for w in text.split() if len(w) > 1]
    n = len(words)
    if n < WINDOW:
        return {"f29b_ttr_window": 0.0}

    window_ttrs = []
    for i in range(0, n - WINDOW + 1, 50):
        w = words[i: i + WINDOW]
        window_ttrs.append(len(set(w)) / WINDOW)

    ttr_window = round(mean(window_ttrs), 4)
    return {"f29b_ttr_window": ttr_window}


# ═══════════════════════════════════════════════════════════════════════════════
# F30d — PS/IMP Ratio (identical to full_work_analyzer_v4.py)
# ═══════════════════════════════════════════════════════════════════════════════

_PS_ENDS = ("a", "it", "ut", "int", "urent", "irent", "èrent", "nt")
_IMP_ENDS = ("ait", "aient", "ais")
_PR_ENDS = ("e", "es", "ent", "er")


def compute_f30(text: str) -> dict:
    words = text.split()
    long_words = [w.lower().rstrip(".,;:!?\"'") for w in words if len(w) > 3]

    ps_count = sum(1 for w in long_words if any(w.endswith(e) for e in _PS_ENDS))
    imp_count = sum(1 for w in long_words if any(w.endswith(e) for e in _IMP_ENDS))
    pr_count = sum(1 for w in long_words if any(w.endswith(e) for e in _PR_ENDS))
    total = max(ps_count + imp_count + pr_count, 1)

    ps_imp_ratio = round(math.log1p(ps_count / max(imp_count, 1)), 4)
    return {"f30d_ps_imp_ratio": ps_imp_ratio}


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN API — analyze(text) → dict of 13 features
# ═══════════════════════════════════════════════════════════════════════════════

FEATURE_KEYS = [
    "f1_mean", "f1a_rhythm_variance", "f19e_window_median",
    "f21e_ritual_index", "f22f_literary_index", "f23d_literary_causal_score",
    "f24e_contrast_score", "f25g_description_score", "f26c_period_score",
    "f27d_modal_score", "f28d_sil_score", "f29b_ttr_window", "f30d_ps_imp_ratio",
]


def analyze(text: str) -> dict:
    """
    Analyze a text and return all 13 features.
    CALC-only (0 API, 0 spaCy). Target < 0.5s per 2000 words.
    """
    sents = split_sentences(text)

    result = {}
    result.update(compute_f1(sents))
    result.update(compute_f19(sents))
    result.update(compute_f21(sents))
    result.update(compute_f22(sents, text))
    result.update(compute_f23(sents, text))
    result.update(compute_f24(sents))
    result.update(compute_f25(text, sents))
    result.update(compute_f26(sents))
    result.update(compute_f27(text, sents))
    result.update(compute_f28(text, sents))
    result.update(compute_f29(text))
    result.update(compute_f30(text))

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# CLI — Quick test on stdin or file
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    import time

    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    t0 = time.perf_counter()
    features = analyze(text)
    dt = time.perf_counter() - t0

    print(f"Speed Analyzer — {len(text.split())} words — {dt:.3f}s")
    for k in FEATURE_KEYS:
        print(f"  {k:30s} = {features.get(k, 'MISSING')}")
