#!/usr/bin/env python3
"""
OMEGA — Autopsie Litteraire
autopsie_extractor.py v2.3
Features CALC (Niveaux 1+2, zero LLM)
Segmentation SSOT unique (spaCy fr_core_news_lg sentencizer)
"""

import json
import hashlib
import re
import unicodedata
import sys
import logging
from pathlib import Path
from datetime import datetime
from collections import Counter

import numpy as np
import spacy

PROTOCOL_VERSION = "autopsie_v2.3"
SCRIPT_VERSION = "2.3.0"
SPACY_MODEL = "fr_core_news_lg"
MIN_WORDS = 400
MAX_WORDS = 850
MIN_SENT_WORDS = 3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("omega_autopsie.log"), logging.StreamHandler()]
)
log = logging.getLogger("OMEGA")

# ══════════════════════════════════════════════
# LEXICONS SSOT
# ══════════════════════════════════════════════

TEMPORAL_MARKERS = [
    "avant", "après", "depuis", "soudain", "encore", "jamais", "autrefois",
    "jadis", "désormais", "bientôt", "déjà", "toujours", "parfois", "souvent",
    "naguère", "dorénavant", "auparavant", "ensuite", "puis", "soudainement",
    "enfin", "longtemps", "brusquement", "tout à coup", "dès lors",
    "pendant", "durant", "le lendemain", "la veille", "à présent", "maintenant",
    "hier", "demain", "récemment", "prochainement", "simultanément",
]
SUBJECTIVITY_MARKERS = [
    "peut-être", "comme si", "à vrai dire", "on aurait dit", "il semblait",
    "paraissait", "semblait", "avait l'air", "donnait l'impression",
    "apparemment", "vraisemblablement", "probablement", "sans doute",
    "il me semble", "je crois", "je pense", "j'imagine", "je suppose",
]
JUDGMENT_MARKERS = [
    "ridicule", "absurde", "indigne", "magnifique", "terrible", "horrible",
    "merveilleux", "atroce", "sublime", "misérable", "admirable", "détestable",
    "pathétique", "grotesque", "splendide", "ignoble", "odieux", "remarquable",
]
BANALITY_WHITELIST = [
    "il faisait chaud", "le soleil", "la lumière", "le silence",
    "il était fatigué", "elle regardait", "il marchait", "la nuit tombait",
    "le vent soufflait", "il pleuvait", "elle sourit", "il acquiesça",
]
BANALITY_BLACKLIST = [
    "des larmes coulaient", "son cœur battait", "une vague d'émotion",
    "les larmes aux yeux", "un frisson le parcourut",
    "il sentit son cœur se serrer", "submergé par l'émotion",
    "une boule dans la gorge", "les yeux brillants de larmes",
]
EMOTION_WORDS = [
    "triste", "tristesse", "douleur", "souffrance", "angoisse", "anxiété",
    "peur", "effroi", "terreur", "joie", "bonheur", "amour", "haine",
    "colère", "rage", "désespoir", "espoir", "nostalgie", "mélancolie",
    "chagrin", "affliction", "détresse", "tourment", "allégresse", "passion",
    "tendresse", "émoi", "trouble",
]
ADVERSATIVE_MARKERS = [
    "pourtant", "cependant", "néanmoins", "toutefois", "mais", "or",
    "bien que", "quoique", "malgré", "en dépit de", "quand même", "tout de même",
]
COPULA_VERBS = {
    "être", "avoir", "sembler", "paraître", "devenir", "rester",
    "demeurer", "s'avérer", "constituer", "représenter",
}
CONNECTORS = [
    "et", "ou", "mais", "donc", "or", "ni", "car", "puis", "ensuite",
    "enfin", "alors", "ainsi", "parce", "puisque", "quand", "lorsque",
    "si", "pourtant", "cependant", "néanmoins", "toutefois",
]

# ══════════════════════════════════════════════
# SPACY SINGLETON
# ══════════════════════════════════════════════

_NLP = None

def get_nlp():
    global _NLP
    if _NLP is None:
        log.info(f"Chargement modele {SPACY_MODEL}...")
        _NLP = spacy.load(SPACY_MODEL)
        log.info("Modele charge.")
    return _NLP


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def segment(text: str):
    """Segmentation SSOT unique via spaCy. Retourne (doc, sentences_list)."""
    nlp = get_nlp()
    doc = nlp(text)
    sents = [s.text.strip() for s in doc.sents
             if len(s.text.strip().split()) >= MIN_SENT_WORDS]
    return doc, sents


def build_contract(text: str, filepath: str, sents: list) -> dict:
    sha256 = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return {
        "text_sha256": sha256,
        "start_char": 0,
        "end_char": len(text),
        "word_count_exact": len(text.split()),
        "sentence_count_ssot": len(sents),
        "segmentation_model": SPACY_MODEL,
        "segmentation_version": "1",
        "source_file": Path(filepath).name,
    }


def find_apex(sents: list) -> int:
    """Identifie la phrase d'intensite emotionnelle max (proxy lexical)."""
    scores = []
    for s in sents:
        wl = s.lower().split()
        e = sum(1 for w in wl if any(ew in w for ew in EMOTION_WORDS))
        p = sum(1 for c in ["!", "—", "...", "?!"] if c in s)
        short_bonus = 1 if len(wl) < 10 else 0
        scores.append(e * 2 + p + short_bonus)
    return int(np.argmax(scores)) if scores else len(sents) // 2

# ══════════════════════════════════════════════
# FEATURES CALC
# ══════════════════════════════════════════════

def compute_f1(sents: list) -> dict:
    """F1 Rhythm variance."""
    lens = [len(s.split()) for s in sents]
    if len(lens) < 3:
        return {"_f1": "NON_CALCULABLE", "_f1_reason": "< 3 phrases"}
    a = np.array(lens, dtype=float)
    mu = float(np.mean(a))
    sigma = float(np.std(a))
    q4 = a[int(len(a) * 0.75):]
    return {
        "f1a_rhythm_variance": round(sigma, 3),
        "f1b_rhythm_ratio": round(sigma / mu, 4) if mu > 0 else None,
        "f1c_rhythm_q4_variance": round(float(np.std(q4)), 3) if len(q4) >= 2 else None,
        "f1_mean": round(mu, 2),
        "f1_max": int(np.max(a)),
        "f1_min": int(np.min(a)),
        "f1_sentence_count": len(lens),
    }


def compute_f2(sents: list) -> dict:
    """F2 Apex compression ratio."""
    if len(sents) < 3:
        return {"_f2": "NON_CALCULABLE"}
    ai = find_apex(sents)
    al = len(sents[ai].split())
    pl = len(sents[ai - 1].split()) if ai > 0 else al
    nl = len(sents[ai + 1].split()) if ai < len(sents) - 1 else al
    ctx = (pl + nl) / 2
    pos_ratio = ai / len(sents)
    pos = f"Q{min(int(pos_ratio * 4) + 1, 4)}"
    return {
        "f2_apex_compression_ratio": round(al / ctx, 4) if ctx > 0 else None,
        "f2_apex_position": pos,
        "f2_apex_length": al,
        "f2_apex_context_mean": round(ctx, 2),
        "f2_apex_index": ai,
        "f2_apex_source": "AUTO_LEXICAL_PROXY",
    }


def compute_f4(doc, sents: list) -> dict:
    """F4 Concreteness proxy (POS-based)."""
    nlp = get_nlp()
    ABSTRACT = {
        "sentiment", "émotion", "pensée", "idée", "concept", "vérité",
        "réalité", "existence", "conscience", "liberté", "âme", "esprit",
        "néant", "absurde", "essence", "nature", "bonheur", "malheur",
    }

    def score_tokens(tokens):
        sc = []
        for t in tokens:
            if t.is_stop or t.is_punct or len(t.text) <= 2:
                continue
            if t.pos_ in {"NOUN", "PROPN"}:
                sc.append(0.3 if t.lemma_.lower() in ABSTRACT else 0.9)
            elif t.pos_ == "VERB":
                sc.append(0.7)
            elif t.pos_ == "ADJ":
                sc.append(0.4)
            else:
                sc.append(0.5)
        return float(np.mean(sc)) if sc else None

    global_score = score_tokens(list(doc))

    ai = find_apex(sents)
    apex_text = sents[ai] if ai < len(sents) else ""
    apex_doc = nlp(apex_text) if apex_text else None
    apex_score = score_tokens(list(apex_doc)) if apex_doc else None

    return {
        "f4a_concreteness_proxy": round(global_score, 4) if global_score else None,
        "f4b_apex_delta": round(apex_score - global_score, 4) if (apex_score and global_score) else None,
        "f4_method": "POS_PROXY",
    }


def compute_f5(doc) -> dict:
    """F5 Verb density + ratios."""
    toks = [t for t in doc if not t.is_space and not t.is_punct]
    verbs = [t for t in toks if t.pos_ == "VERB"]
    adjs = [t for t in toks if t.pos_ == "ADJ"]
    act = [v for v in verbs if v.lemma_.lower() not in COPULA_VERBS]
    if not toks:
        return {"_f5": "NON_CALCULABLE"}
    return {
        "f5a_verb_density": round(len(verbs) / len(toks), 4),
        "f5b_verb_adj_ratio": round(len(verbs) / max(len(adjs), 1), 4),
        "f5c_action_verb_ratio": round(len(act) / max(len(verbs), 1), 4),
        "f5_verb_count": len(verbs),
        "f5_adj_count": len(adjs),
        "f5_total_tokens": len(toks),
    }


def compute_f8a(text: str) -> dict:
    """F8a Emotional density ratio."""
    words = text.lower().split()
    if not words:
        return {"_f8a": "NON_CALCULABLE"}
    hits = [w for w in words if any(e in w for e in EMOTION_WORDS)]
    r = len(hits) / len(words)
    zone = "HEMINGWAY" if r < 0.005 else ("PURPLE_PROSE" if r > 0.02 else "NORMAL")
    return {
        "f8a_emotional_density_ratio": round(r, 5),
        "f8a_emotion_count": len(hits),
        "f8a_zone": zone,
    }


def compute_f9(sents: list) -> dict:
    """F9 Contradiction rate."""
    count = sum(1 for s in sents if any(m in s.lower() for m in ADVERSATIVE_MARKERS))
    return {
        "f9a_contradiction_rate": round(count / max(len(sents), 1), 4),
        "f9a_adversative_count": count,
        "f9a_sentences_analyzed": len(sents),
    }


def compute_f12(doc, text: str) -> dict:
    """F12 Temporal operator density."""
    tl = text.lower()
    total_words = len([t for t in doc if not t.is_space and not t.is_punct])
    mc = sum(1 for m in TEMPORAL_MARKERS if m in tl)
    mr = mc / max(total_words, 1)

    sw, prev_tense = 0, None
    sent_count = 0
    for sent in doc.sents:
        sent_count += 1
        tenses = []
        for tok in sent:
            if tok.pos_ in {"VERB", "AUX"}:
                t = tok.morph.get("Tense")
                if t:
                    tenses.extend(t)
        if tenses:
            ct = max(set(tenses), key=tenses.count)
            if prev_tense and ct != prev_tense:
                sw += 1
            prev_tense = ct

    sr = sw / max(sent_count, 1)
    return {
        "f12a_temporal_marker_rate": round(mr, 5),
        "f12b_tense_switch_rate": round(sr, 4),
        "f12c_temporal_density": round((mr + sr) / 2, 5),
        "f12_marker_count": mc,
        "f12_tense_switches": sw,
    }


def compute_f13(text: str) -> dict:
    """F13 Banality budget."""
    tl = text.lower()
    wl = [(w, 2) for w in BANALITY_WHITELIST if w in tl]
    bl = [(w, 4) for w in BANALITY_BLACKLIST if w in tl]
    total = sum(p for _, p in wl) + sum(p for _, p in bl)
    return {
        "f13_banality_budget": total,
        "f13_whitelist_hits": len(wl),
        "f13_blacklist_hits": len(bl),
        "f13_status": "PASS" if total <= 6 else "OVER_BUDGET",
        "f13_whitelist_examples": [w for w, _ in wl[:3]],
        "f13_blacklist_examples": [w for w, _ in bl[:3]],
    }


def compute_f14(doc, sents: list) -> dict:
    """F14 Subjectivity footprint."""
    tl = doc.text.lower()
    total = len([t for t in doc if not t.is_space and not t.is_punct])
    if not total:
        return {"_f14": "NON_CALCULABLE"}
    mc = sum(1 for m in SUBJECTIVITY_MARKERS if m in tl)
    jc = sum(1 for j in JUDGMENT_MARKERS if j in tl)
    rq = sum(1 for s in sents if s.strip().endswith("?"))
    mr = mc / total
    jr = jc / total
    rr = rq / max(len(sents), 1)
    return {
        "f14a_modalizer_rate": round(mr, 5),
        "f14b_judgment_rate": round(jr, 5),
        "f14c_rhetorical_rate": round(rr, 4),
        "f14d_subjectivity_footprint": round((mr + jr + rr) / 3, 5),
        "f14_modalizer_count": mc,
        "f14_judgment_count": jc,
        "f14_rhetorical_count": rq,
    }


def compute_f15(sents: list) -> dict:
    """F15 Redundancy compression."""
    if len(sents) < 5:
        return {"_f15": "NON_CALCULABLE"}

    def bigrams(t):
        w = re.sub(r"[^\w\s]", "", t.lower()).split()
        return set(zip(w, w[1:]))

    total_bg, dup_bg = 0, 0
    for i, s in enumerate(sents):
        win = sents[max(0, i - 2):i] + sents[i + 1:min(len(sents), i + 3)]
        cur = bigrams(s)
        wbg = bigrams(" ".join(win))
        dup_bg += len(cur & wbg)
        total_bg += len(cur)

    rr = dup_bg / total_bg if total_bg else 0
    return {
        "f15a_local_repetition_rate": round(rr, 4),
        "f15b_redundancy_compression": round(1 - rr, 4),
        "f15_bigrams_total": total_bg,
        "f15_bigrams_dup": dup_bg,
    }


def compute_f16(text: str) -> dict:
    """F16 Lexical surprise."""
    words = re.sub(r"[^\w\s]", "", text.lower()).split()
    if len(words) < 10:
        return {"_f16": "NON_CALCULABLE"}
    wc = Counter(words)
    hapax = sum(1 for w, c in wc.items() if c == 1 and len(w) > 3)
    hr = hapax / max(len(wc), 1)
    bgl = list(zip(words, words[1:]))
    bgc = Counter(bgl)
    ub = sum(1 for _, c in bgc.items() if c == 1)
    br = ub / max(len(bgc), 1)
    return {
        "f16a_bigram_rarity": round(br, 4),
        "f16b_hapax_rate": round(hr, 4),
        "f16c_lexical_surprise": round(hr * 0.4 + br * 0.6, 4),
        "f16_vocab_size": len(wc),
        "f16_hapax_count": hapax,
        "f16_unique_bigrams": ub,
    }


def compute_f17(sents: list) -> dict:
    """F17 Contrast arc."""
    def is_knife(s):
        w = s.split()
        short_strong = len(w) < 12 and any(p in s for p in ["!", "—", "...", "«"])
        has_adv = any(m in s.lower() for m in ["pourtant", "mais", "cependant", "or"])
        return short_strong or has_adv

    def is_banal(s):
        return any(w in s.lower() for w in BANALITY_WHITELIST) or \
               (15 <= len(s.split()) <= 25 and not is_knife(s))

    ki = [i for i, s in enumerate(sents) if is_knife(s)]
    bi = [i for i, s in enumerate(sents) if is_banal(s)]

    if not ki:
        return {
            "f17_contrast_arc_score": 0.0,
            "f17_contrast_ratio": 0.0,
            "f17_contrast_spacing": None,
            "f17_return_to_plain": 0.0,
            "f17_knife_count": 0,
            "f17_banal_count": len(bi),
        }

    cr = len(ki) / (len(bi) + 1)
    sp = float(np.mean([ki[j + 1] - ki[j] for j in range(len(ki) - 1)])) if len(ki) >= 2 else None
    rt = sum(1 for k in ki if any(is_banal(s) for s in sents[k + 1:k + 3])) / len(ki)

    if sp is not None:
        ss = 1.0 if 3 <= sp <= 9 else max(0.0, 1.0 - abs(sp - 6) / 6)
    else:
        ss = 0.5

    arc = rt * 0.5 + ss * 0.3 + min(cr, 1.0) * 0.2
    return {
        "f17_contrast_arc_score": round(arc, 4),
        "f17_contrast_ratio": round(cr, 4),
        "f17_contrast_spacing": round(sp, 2) if sp else None,
        "f17_return_to_plain": round(rt, 4),
        "f17_knife_count": len(ki),
        "f17_banal_count": len(bi),
        "f17_note": "Proxy CALC — F3 knife exact non disponible sans LLM",
    }


def compute_f18(doc, sents: list) -> dict:
    """F18 Ellipsis pressure."""
    total = len(sents)
    if not total:
        return {"_f18": "NON_CALCULABLE"}

    frag_count, nom_count = 0, 0
    for sent in doc.sents:
        toks = [t for t in sent if not t.is_space and not t.is_punct]
        has_verb = any(t.pos_ in {"VERB", "AUX"} for t in toks)
        has_noun = any(t.pos_ in {"NOUN", "PROPN"} for t in toks)
        if not has_verb and len(toks) >= 2:
            frag_count += 1
        if not has_verb and has_noun:
            nom_count += 1

    cuts = sum(
        1 for i in range(len(sents) - 1)
        if not any(
            sents[i + 1].strip().lower().startswith(c + " ") or
            sents[i + 1].strip().lower().startswith(c + ",")
            for c in CONNECTORS
        )
    )

    fr = frag_count / total
    nr = nom_count / total
    cr = cuts / max(total - 1, 1)
    raw = (fr + nr + cr) / 3
    spam = (fr - 0.25) * 0.3 if fr > 0.25 else 0.0
    final = max(0.0, raw - spam)

    return {
        "f18a_fragment_rate": round(fr, 4),
        "f18b_nominal_rate": round(nr, 4),
        "f18c_cut_rate": round(cr, 4),
        "f18d_ellipsis_raw": round(raw, 4),
        "f18e_spam_penalty": round(spam, 4),
        "f18f_ellipsis_final": round(final, 4),
        "f18_fragment_count": frag_count,
        "f18_nominal_count": nom_count,
        "f18_cut_count": cuts,
    }

# ══════════════════════════════════════════════
# GOLDEN NUMBERS VALIDATION
# ══════════════════════════════════════════════

def validate_golden(features: dict, work_id: str, author: str, golden_path: Path) -> dict:
    """Compare features aux golden numbers academiques."""
    if not golden_path.exists():
        return {"status": "NO_GOLDEN_DATA"}

    with open(golden_path, encoding="utf-8") as f:
        golden = json.load(f)

    warnings = []
    tol = golden.get("tolerance", 0.15)

    for entry in golden.get("golden_data", []):
        entry_author = entry.get("author", "").lower()
        if entry_author not in author.lower() and entry_author not in work_id.lower():
            continue

        known = entry.get("known_values", {})

        checks = [
            ("f1_mean", "mean_sentence_length_words"),
            ("f5a_verb_density", "verb_density_approx"),
            ("f16b_hapax_rate", "hapax_rate"),
        ]

        for feat_key, golden_key in checks:
            if golden_key in known and feat_key in features:
                expected = known[golden_key]
                actual = features[feat_key]
                if actual is not None and expected is not None and expected != 0:
                    delta = abs(actual - expected) / abs(expected)
                    if delta > tol:
                        warnings.append({
                            "feature": feat_key,
                            "expected": expected,
                            "actual": actual,
                            "delta_pct": round(delta * 100, 1),
                            "source": entry.get("source_study", ""),
                            "flag": "CALIBRATION_WARNING",
                        })

    return {
        "golden_warnings": warnings,
        "calibration_status": "CALIBRATION_WARNING" if warnings else "CALIBRATED_OK",
    }

# ══════════════════════════════════════════════
# ANALYZE
# ══════════════════════════════════════════════

def analyze(text_raw: str, filepath: str, meta: dict, golden_path: Path = None) -> dict:
    text = normalize_text(text_raw)
    lang_orig = meta.get("lang_original", "fr")
    lang_flag = f"LANG_{lang_orig.upper()}_FR_MODEL" if lang_orig != "fr" else None

    doc, sents = segment(text)
    contract = build_contract(text, filepath, sents)

    features = {}
    errors = []

    feature_pipeline = [
        ("F1", lambda: compute_f1(sents)),
        ("F2", lambda: compute_f2(sents)),
        ("F4", lambda: compute_f4(doc, sents)),
        ("F5", lambda: compute_f5(doc)),
        ("F8a", lambda: compute_f8a(text)),
        ("F9", lambda: compute_f9(sents)),
        ("F12", lambda: compute_f12(doc, text)),
        ("F13", lambda: compute_f13(text)),
        ("F14", lambda: compute_f14(doc, sents)),
        ("F15", lambda: compute_f15(sents)),
        ("F16", lambda: compute_f16(text)),
        ("F17", lambda: compute_f17(sents)),
        ("F18", lambda: compute_f18(doc, sents)),
    ]

    for fname, func in feature_pipeline:
        try:
            result = func()
            features.update(result)
        except Exception as e:
            errors.append(f"{fname}: {str(e)}")
            log.error(f"{fname} erreur sur {meta.get('work_id')}: {e}")

    # Golden validation
    golden_result = {}
    if golden_path and golden_path.exists():
        golden_result = validate_golden(
            features, meta.get("work_id", ""), meta.get("author", ""), golden_path
        )

    # Translation bias flags
    translation_biased = []
    if lang_orig != "fr":
        translation_biased = [
            "f16c_lexical_surprise", "f14d_subjectivity_footprint",
            "f1a_rhythm_variance", "f15a_local_repetition_rate",
        ]

    return {
        "meta": {
            "work_id": meta.get("work_id"),
            "title": meta.get("title"),
            "author": meta.get("author"),
            "year": meta.get("year"),
            "category": meta.get("category"),
            "extract_type": meta.get("extract_type"),
            "lang_original": lang_orig,
            "lang_flag": lang_flag,
            "protocol_version": PROTOCOL_VERSION,
            "script_version": SCRIPT_VERSION,
            "spacy_model": SPACY_MODEL,
            "extraction_date": datetime.now().isoformat(),
            "mode": "CALC_ONLY_NO_LLM",
        },
        "segmentation_contract": contract,
        "extract_info": {
            "word_count": len(text.split()),
            "sentence_count": len(sents),
            "range_ok": MIN_WORDS <= len(text.split()) <= MAX_WORDS,
        },
        "features": features,
        "golden_validation": golden_result,
        "flags": {
            "errors": errors,
            "lang_model_mismatch": lang_flag is not None,
            "translation_biased": translation_biased,
            "llm_features_pending": [
                "f3a_knife_micro", "f3b_knife_major",
                "f6_sensory_rupture", "f8b_omission_blacklist",
                "f9b_contradiction_internal", "f10_shadow_qcm",
                "f0_stability_index",
            ],
        },
    }

# ══════════════════════════════════════════════
# CORPUS RUNNER
# ══════════════════════════════════════════════

def run_corpus(extract_dir: Path, results_dir: Path, entries: list,
               extract_types: list, golden_path: Path) -> dict:
    results_dir.mkdir(parents=True, exist_ok=True)
    summary = {"processed": [], "failed": [], "skipped": []}

    for entry in entries:
        wid = entry.get("work_id", "unknown")

        for ext_type in extract_types:
            fp = extract_dir / f"{wid}_{ext_type}.txt"

            if not fp.exists():
                summary["skipped"].append(f"{wid}_{ext_type}")
                continue

            try:
                text_raw = fp.read_text(encoding="utf-8").strip()
                if len(text_raw.split()) < 50:
                    log.warning(f"TROP COURT: {wid}/{ext_type} — {len(text_raw.split())} mots")
                    summary["skipped"].append(f"{wid}_{ext_type}")
                    continue

                meta = {**entry, "extract_type": ext_type}
                result = analyze(text_raw, str(fp), meta, golden_path)

                out = results_dir / f"{wid}_{ext_type}.json"
                with open(out, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)

                rh = hashlib.sha256(
                    json.dumps(result, ensure_ascii=False, sort_keys=True).encode()
                ).hexdigest()
                log.info(f"OK: {wid}/{ext_type} — {result['extract_info']['word_count']}w — [{rh[:12]}]")

                summary["processed"].append({
                    "work_id": wid,
                    "type": ext_type,
                    "word_count": result["extract_info"]["word_count"],
                    "result_sha256": rh,
                    "errors": result["flags"]["errors"],
                    "golden": result.get("golden_validation", {}).get("calibration_status", "N/A"),
                })

            except Exception as e:
                log.error(f"ERREUR CRITIQUE {wid}/{ext_type}: {e}")
                summary["failed"].append({"work_id": wid, "type": ext_type, "error": str(e)})

    return summary


def main():
    manifest_path = Path("ssot/corpus_manifest.json")
    golden_path = Path("ssot/academic/golden_numbers.json")

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    log.info(f"OMEGA Autopsie v2.3 — {len(manifest['romans'])} romans + "
             f"{len(manifest.get('proses_reference', []))} proses")

    # Romans: APEX, NEUTRE, SEUIL
    rom_summary = run_corpus(
        Path("extracts/romans"),
        Path("results/romans"),
        manifest["romans"],
        ["APEX", "NEUTRE", "SEUIL"],
        golden_path,
    )

    # Proses: P1, P2, P3
    prose_entries = []
    prose_types_map = {}
    for prose in manifest.get("proses_reference", []):
        wid = prose.get("work_id")
        n_texts = len(prose.get("texts_to_extract", []))
        types = [f"P{i+1}" for i in range(min(n_texts, 3))]
        prose_entries.append(prose)
        prose_types_map[wid] = types

    pro_summary = {"processed": [], "failed": [], "skipped": []}
    for entry in prose_entries:
        wid = entry.get("work_id")
        types = prose_types_map.get(wid, ["P1"])
        s = run_corpus(
            Path("extracts/proses"),
            Path("results/proses"),
            [entry],
            types,
            golden_path,
        )
        pro_summary["processed"].extend(s["processed"])
        pro_summary["failed"].extend(s["failed"])
        pro_summary["skipped"].extend(s["skipped"])

    # Master summary
    total_ok = len(rom_summary["processed"]) + len(pro_summary["processed"])
    total_fail = len(rom_summary["failed"]) + len(pro_summary["failed"])
    total_skip = len(rom_summary["skipped"]) + len(pro_summary["skipped"])

    summary = {
        "run_date": datetime.now().isoformat(),
        "protocol": PROTOCOL_VERSION,
        "script_version": SCRIPT_VERSION,
        "spacy_model": SPACY_MODEL,
        "romans_summary": rom_summary,
        "proses_summary": pro_summary,
        "global": {
            "total_processed": total_ok,
            "total_failed": total_fail,
            "total_skipped": total_skip,
            "success_rate": f"{total_ok}/{total_ok + total_fail + total_skip}",
        },
    }

    Path("results").mkdir(parents=True, exist_ok=True)
    with open("results/00_MASTER_SUMMARY.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    log.info(f"\n{'='*60}")
    log.info(f"TERMINE — Traites: {total_ok} | Echecs: {total_fail} | Skippes: {total_skip}")
    log.info(f"Summary: results/00_MASTER_SUMMARY.json")
    log.info(f"{'='*60}")


if __name__ == "__main__":
    main()
