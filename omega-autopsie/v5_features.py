#!/usr/bin/env python3
"""
OMEGA v5 — Features F1-F30 + F31-F40 (topologie)
Phase R0 — Refondation Metrologique

F1-F23  : delegues a autopsie_v4.py (spaCy)
F24-F30 : repris de v4 (pur Python)
F31-F40 : NOUVELLES features topologiques (v5)
"""

import re, math, importlib.util, logging
from pathlib import Path
from statistics import mean, stdev
from collections import Counter

log = logging.getLogger("omega_v5")

# ══════════════════════════════════════════════════════════════════════════
# CHARGEMENT AUTOPSIE V4 (F1-F23)
# ══════════════════════════════════════════════════════════════════════════

_autopsie = None
_autopsie_load_attempted = False

def load_autopsie():
    global _autopsie, _autopsie_load_attempted
    if _autopsie:
        return _autopsie
    if _autopsie_load_attempted:
        return None
    _autopsie_load_attempted = True
    for p in [Path("autopsie_v4.py"), Path("../autopsie_v4.py")]:
        if p.exists():
            try:
                spec = importlib.util.spec_from_file_location("autopsie_v4", str(p))
                mod  = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                _autopsie = mod
                log.info(f"autopsie_v4 charge: {p.resolve()}")
                return mod
            except Exception as e:
                log.warning(f"autopsie_v4 import FAIL: {e}")
                log.warning("  -> F1-F23 desactivees. F24-F30 actives.")
                return None
    return None

def run_autopsie(text: str, work_id: str, lang_orig: str) -> dict:
    mod = load_autopsie()
    if not mod:
        return {}
    try:
        meta = {"work_id": work_id, "lang_original": lang_orig, "author": work_id}
        return mod.analyze(text, work_id, meta)
    except Exception as e:
        log.error(f"  autopsie error [{work_id}]: {e}")
        return {}

# ══════════════════════════════════════════════════════════════════════════
# UTILS
# ══════════════════════════════════════════════════════════════════════════

def split_sentences(text: str) -> list:
    raw = re.split(r"(?<=[.!?…»])\s+", text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

# ══════════════════════════════════════════════════════════════════════════
# F24 — CONTRAST BUDGET
# ══════════════════════════════════════════════════════════════════════════

def compute_f24(sents: list, features: dict) -> dict:
    if len(sents) < 10:
        return {"f24a_banal_rate": None, "f24b_apex_rate": None,
                "f24c_contrast_delta": None, "f24d_apex_isolation": None,
                "f24e_contrast_score": None, "f24f_profile": "INSUFFICIENT"}

    lens = [len(s.split()) for s in sents]
    s_lens = sorted(lens)
    n = len(s_lens)
    p25 = s_lens[n // 4]
    p75 = s_lens[3 * n // 4]

    banal_lens = [l for l in lens if l <= p25]
    apex_lens  = [l for l in lens if l >= p75]
    banal_rate = len(banal_lens) / n
    apex_rate  = len(apex_lens)  / n
    mean_banal = mean(banal_lens) if banal_lens else 0
    mean_apex  = mean(apex_lens)  if apex_lens  else 0
    contrast   = mean_apex - mean_banal

    apex_positions = [i for i, l in enumerate(lens) if l >= p75]
    if len(apex_positions) >= 2:
        gaps = [apex_positions[i+1] - apex_positions[i] for i in range(len(apex_positions)-1)]
        apex_isolation = mean(gaps)
    else:
        apex_isolation = float(n)

    balance_score   = max(0.0, 1.0 - abs(banal_rate - 0.25) * 2)
    contrast_score  = min(1.0, contrast / 15.0)
    isolation_score = max(0.0, 1.0 - abs(apex_isolation - 6.0) / 10.0)
    score = round((balance_score * 0.3 + contrast_score * 0.5 + isolation_score * 0.2), 5)
    score = max(0.0, min(1.0, score))

    if contrast < 5:
        profile = "UNIFORM"
    elif apex_rate > 0.35 and mean_apex > 30:
        profile = "PROUST"
    elif apex_rate > 0.30 and mean_apex <= 30:
        profile = "RUSHDIE"
    elif banal_rate > 0.35 and mean_banal < 8:
        profile = "HEMINGWAY" if contrast > 10 else "DURAS"
    else:
        profile = "MIXED"

    return {
        "f24a_banal_rate":     round(banal_rate,   5),
        "f24b_apex_rate":      round(apex_rate,    5),
        "f24c_contrast_delta": round(contrast,     3),
        "f24d_apex_isolation": round(apex_isolation, 2),
        "f24e_contrast_score": score,
        "f24f_profile":        profile,
        "f24_method":          "CONTRAST_BUDGET_OMEGA_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F25 — DESCRIPTION SCENE INDEX
# ══════════════════════════════════════════════════════════════════════════

def compute_f25(text: str, sents: list) -> dict:
    txt_lower = text.lower()
    words     = text.split()
    n_words   = max(len(words), 1)
    n_sents   = max(len(sents), 1)

    SENSORY = {
        "visuel":   ["lumiere","ombre","couleur","brillant","sombre","clair","lueur","reflet",
                     "light","shadow","gleam","glow","dark","bright","shimmer",
                     "luz","sombra","color","brillante","oscuro","claro","resplandor"],
        "auditif":  ["bruit","son","silence","murmure","voix","echo","craquement","souffle",
                     "noise","sound","whisper","creak","rumble","hum",
                     "ruido","sonido","silencio","murmullo","voz","eco"],
        "tactile":  ["froid","chaud","doux","rugeux","humide","sec","peau","cold","warm",
                     "smooth","rough","damp","dry","skin",
                     "frio","caliente","suave","aspero","humedo","seco","piel"],
        "olfactif": ["odeur","parfum","senteur","fumee","smell","scent","fragrance","smoke","stench",
                     "olor","perfume","aroma","humo"],
        "gustatif": ["gout","amer","sucre","sale","taste","bitter","sweet","salty","sour",
                     "sabor","amargo","dulce","salado"],
    }
    sensory_score = sum(1 for markers in SENSORY.values() if any(m in txt_lower for m in markers))

    ADJ_MARKERS = ["eux","euse","ique","able","ible","ant","ent","al","el","ous","ful","less","ive",
                   "oso","osa","ado","ada","ido","ida"]
    ADV_MARKERS = ["ment","ement","amment","ly","ally","mente"]
    ACTION_VERBS = ["marcha","couri","dit","repondi","prit","saisi","ouvri","ferma",
                    "walked","ran","said","took","opened","closed","grabbed","threw",
                    "camino","corrio","dijo","tomo","abrio","cerro"]
    adj_count    = sum(1 for w in words if any(w.lower().endswith(m) for m in ADJ_MARKERS))
    adv_count    = sum(1 for w in words if any(w.lower().endswith(m) for m in ADV_MARKERS))
    action_count = max(sum(1 for w in words if any(v in w.lower() for v in ACTION_VERBS)), 1)
    description_density = min(round((adj_count + adv_count) / action_count, 4), 10.0)

    SUSPENSION = ["etait","semblait","paraissait","demeurait","restait","planait","flottait",
                  "regnait","s'etendait","was","seemed","appeared","remained","hovered","lay",
                  "era","parecia","permanecia","quedaba","flotaba"]
    susp_count      = sum(1 for w in words if w.lower() in SUSPENSION)
    time_suspension = round(susp_count / n_sents, 5)

    SPATIAL = ["loin","pres","derriere","devant","sous","au-dessus","au-dela","au fond",
               "en bas","en haut","far","near","behind","beneath","above","beyond","horizon",
               "lejos","cerca","detras","delante","debajo","encima"]
    spatial_depth = round(min(sum(1 for m in SPATIAL if m in txt_lower) / 10.0, 1.0), 4)

    ABSTRACT_NOUNS = ["silence","lumiere","obscurite","douleur","joie","tristesse","solitude",
                      "memoire","temps","espace","light","darkness","pain","joy","sadness",
                      "memory","time","space","death","life","soul","fear","hope",
                      "silencio","luz","oscuridad","dolor","alegria","tristeza","soledad",
                      "memoria","tiempo","espacio","muerte","vida","alma","miedo"]
    abstract_count  = sum(1 for w in words if w.lower() in ABSTRACT_NOUNS)
    nominalization  = round(abstract_count / n_words, 5)

    CONCRETE = ["pierre","bois","metal","fer","verre","tissu","cuir","terre","eau","feu","cendre",
                "os","stone","wood","metal","glass","leather","earth","water","fire","ash","bone",
                "piedra","madera","hierro","vidrio","cuero","tierra","agua","fuego","ceniza","hueso"]
    object_density = round(sum(1 for w in words if w.lower() in CONCRETE) / n_words, 5)

    desc_score = round(
        min(description_density / 5.0, 1.0) * 0.25 +
        sensory_score / 5.0                 * 0.30 +
        min(time_suspension * 5, 1.0)       * 0.15 +
        spatial_depth                        * 0.15 +
        min(nominalization * 100, 1.0)      * 0.10 +
        min(object_density * 100, 1.0)      * 0.05, 5)

    if sensory_score >= 4 and object_density > 0.003:
        profile = "SENSORIEL"
    elif description_density > 4 and spatial_depth > 0.5:
        profile = "PICTURAL"
    elif time_suspension > 0.08 and nominalization > 0.005:
        profile = "ATMOSPHERIQUE"
    elif action_count > adj_count + adv_count:
        profile = "CINEMATIQUE"
    else:
        profile = "INVENTAIRE"

    return {
        "f25a_description_density": description_density,
        "f25b_sensory_coverage":    sensory_score,
        "f25c_time_suspension":     time_suspension,
        "f25d_spatial_depth":       spatial_depth,
        "f25e_nominalization":      nominalization,
        "f25f_object_density":      object_density,
        "f25g_description_score":   desc_score,
        "f25h_profile":             profile,
        "f25_method":               "OMEGA_DESC_INDEX_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F26 — PERIODE SYNTAXIQUE
# ══════════════════════════════════════════════════════════════════════════

def compute_f26(sents: list) -> dict:
    SUB_FR = ["que","qui","dont","ou","lequel","laquelle","lesquels","lesquelles",
              "quand","comme","si","puisque","parce","bien","quoique","malgre",
              "tandis","alors","lorsque","des","avant","apres","pendant","jusqu"]
    SUB_EN = ["that","which","who","whom","whose","where","when","although",
              "because","since","while","until","unless","whether","after",
              "before","though","even","whereas","provided"]
    SUB_ES = ["que","quien","cual","donde","cuando","aunque","porque","mientras",
              "hasta","sino","puesto","como","pues","ya"]
    ALL_SUB = set(SUB_FR + SUB_EN + SUB_ES)

    sub_counts  = []
    sent_lens   = []
    for s in sents:
        words = s.lower().split()
        sub_n = sum(1 for w in words if w.rstrip(".,;:!?") in ALL_SUB)
        sub_counts.append(sub_n)
        sent_lens.append(len(words))

    if not sents:
        return {"f26a_mean_sub": 0, "f26b_long_rate": 0,
                "f26c_period_score": 0, "f26d_regime": "INSUFFICIENT"}

    mean_sub   = round(mean(sub_counts), 4)
    long_rate  = round(sum(1 for l in sent_lens if l > 40) / len(sent_lens), 4)

    sub_score  = min(mean_sub / 6.0, 1.0)
    len_score  = long_rate
    period_score = round(sub_score * 0.6 + len_score * 0.4, 5)

    if period_score > 0.55:
        regime = "PERIODIQUE"
    elif period_score > 0.35:
        regime = "COMPLEXE"
    elif period_score > 0.18:
        regime = "EQUILIBRE"
    else:
        regime = "TELEGRAPHIQUE"

    return {
        "f26a_mean_sub_markers": mean_sub,
        "f26b_long_sent_rate":   long_rate,
        "f26c_period_score":     period_score,
        "f26d_regime":           regime,
        "f26_method":            "OMEGA_PERIOD_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F27 — MODALITE EPISTEMIQUE
# ══════════════════════════════════════════════════════════════════════════

def compute_f27(text: str, sents: list) -> dict:
    txt_lower  = text.lower()
    n_sents    = max(len(sents), 1)

    EPISTEMIC_FR = ["semblait","paraissait","apparemment","peut-etre","probablement",
                    "sans doute","il me semblait","comme si","on eut dit","dirait-on",
                    "quelque chose","une sorte","une espece","je croyais","il croyait",
                    "il lui semblait","avait l'air","avait l'impression"]
    EPISTEMIC_EN = ["seemed","appeared","apparently","perhaps","probably","possibly",
                    "as if","as though","something like","a kind of","sort of","might",
                    "could","would have","had seemed","it seemed"]
    EPISTEMIC_ES = ["parecia","aparentemente","quizas","tal vez","probablemente",
                    "como si","una especie de","algo asi","acaso","sin duda"]

    ep_count = sum(txt_lower.count(m) for m in EPISTEMIC_FR + EPISTEMIC_EN + EPISTEMIC_ES)
    epistemic_rate = round(ep_count / n_sents * 100, 4)

    CONDITIONAL_FR = ["aurait","aurait ete","eut","eut ete","serait","fut","voudrait"]
    PASSE_SIMPLE   = ["fut","eut","dit","prit","vit","alla","revint","sembla","parut"]
    cond_count = sum(txt_lower.count(m) for m in CONDITIONAL_FR)
    ps_count   = max(sum(txt_lower.count(m) for m in PASSE_SIMPLE), 1)
    conditional_rate = round(cond_count / ps_count, 4)

    NEG_COMPLEX = ["ne...que","nul","aucun","jamais","guere","ni...ni","point",
                   "nullement","en aucune facon","rien de","pas un seul"]
    neg_count   = sum(txt_lower.count(m) for m in NEG_COMPLEX)
    negation_rate = round(neg_count / n_sents * 100, 4)

    ep_score   = min(epistemic_rate / 20.0, 1.0)
    cond_score = min(conditional_rate / 2.0, 1.0)
    neg_score  = min(negation_rate / 10.0, 1.0)
    modal_score = round(ep_score * 0.5 + cond_score * 0.3 + neg_score * 0.2, 5)

    if modal_score > 0.6:
        register = "HALLUCINATOIRE"
    elif modal_score > 0.35:
        register = "DUBITATIVE"
    elif modal_score > 0.15:
        register = "NUANCE"
    else:
        register = "ASSERTIF"

    return {
        "f27a_epistemic_rate":    epistemic_rate,
        "f27b_conditional_rate":  conditional_rate,
        "f27c_negation_rate":     negation_rate,
        "f27d_modal_score":       modal_score,
        "f27e_register":          register,
        "f27_method":             "OMEGA_EPISTEMIC_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F28 — STYLE INDIRECT LIBRE
# ══════════════════════════════════════════════════════════════════════════

def compute_f28(text: str, sents: list) -> dict:
    txt_lower = text.lower()
    sents_lower = [s.lower() for s in sents]
    n_sents = max(len(sents), 1)

    SIL_MARKERS_FR = ["apres tout","bien sur","evidemment","comment donc","n'etait-ce pas",
                      "car enfin","mais non","mais si","que diable","sapre",
                      "certainement","decidement","vraiment","quelle idee","quel imbecile"]
    SIL_MARKERS_EN = ["after all","of course","certainly","how odd","no doubt",
                      "why not","what a","surely","indeed","obviously","well then"]
    SIL_MARKERS_ES = ["despues de todo","por supuesto","ciertamente","sin duda",
                      "como no","claro","desde luego","evidentemente"]

    sil_count = sum(1 for m in SIL_MARKERS_FR + SIL_MARKERS_EN + SIL_MARKERS_ES if m in txt_lower)
    sil_rate  = round(sil_count / n_sents * 100, 4)

    IRONY = ["on eut dit","c'etait bien la","voila qui","comme c'est","comme il convient",
             "naturellement","il va sans dire","cela s'entend","bien entendu"]
    irony_density = round(sum(txt_lower.count(m) for m in IRONY) / n_sents * 100, 4)

    interior_count = sum(
        1 for s in sents_lower
        if s.endswith("?") and any(m in s for m in ["ait","ait-il","ait-elle","etait"])
    )
    interior_rate = round(interior_count / n_sents, 4)

    sil_score = round(
        min(sil_rate / 20.0, 1.0)    * 0.4 +
        min(irony_density / 5.0, 1.0) * 0.35 +
        min(interior_rate * 5, 1.0)   * 0.25, 5)

    if sil_score > 0.6:
        profile = "STREAM"
    elif sil_score > 0.35:
        profile = "FLAUBERTIEN"
    elif sil_score > 0.15:
        profile = "INDIRECT"
    else:
        profile = "EXPLICIT"

    return {
        "f28a_sil_rate":       sil_rate,
        "f28b_irony_density":  irony_density,
        "f28c_interior_rate":  interior_rate,
        "f28d_sil_score":      sil_score,
        "f28e_profile":        profile,
        "f28_method":          "OMEGA_SIL_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F29 — DENSITE LEXICALE TTR
# ══════════════════════════════════════════════════════════════════════════

def compute_f29(text: str) -> dict:
    WINDOW = 100
    words = [w.lower().strip(".,;:!?\"'()[]") for w in text.split() if len(w) > 1]
    n = len(words)

    if n < WINDOW:
        return {"f29a_ttr_global": 0, "f29b_ttr_window": 0, "f29c_ttr_stdev": 0,
                "f29d_ttr_score": 0, "f29e_register": "INSUFFICIENT"}

    ttr_global = round(len(set(words)) / n, 4)

    window_ttrs = []
    for i in range(0, n - WINDOW + 1, 50):
        w = words[i: i + WINDOW]
        window_ttrs.append(len(set(w)) / WINDOW)

    ttr_window = round(mean(window_ttrs), 4)
    ttr_stdev  = round(stdev(window_ttrs) if len(window_ttrs) > 1 else 0.0, 4)

    ttr_score = round(min(ttr_window / 0.80, 1.0) * 0.7 + min(ttr_stdev * 5, 1.0) * 0.3, 5)

    if ttr_window > 0.75:
        register = "HYPER_RICHE"
    elif ttr_window > 0.60:
        register = "RICHE"
    elif ttr_window > 0.45:
        register = "STANDARD"
    else:
        register = "REDONDANT"

    return {
        "f29a_ttr_global":  ttr_global,
        "f29b_ttr_window":  ttr_window,
        "f29c_ttr_stdev":   ttr_stdev,
        "f29d_ttr_score":   ttr_score,
        "f29e_register":    register,
        "f29_method":       "OMEGA_TTR_WINDOW100_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F30 — SIGNATURE TEMPORELLE
# ══════════════════════════════════════════════════════════════════════════

def compute_f30(text: str) -> dict:
    words = text.split()
    PS_ENDS  = ("a","it","ut","int","urent","irent","erent","nt")
    IMP_ENDS = ("ait","aient","ais")
    PR_ENDS  = ("e","es","ent","er")

    long_words = [w.lower().rstrip(".,;:!?\"'") for w in words if len(w) > 3]
    ps_count  = sum(1 for w in long_words if any(w.endswith(e) for e in PS_ENDS))
    imp_count = sum(1 for w in long_words if any(w.endswith(e) for e in IMP_ENDS))
    pr_count  = sum(1 for w in long_words if any(w.endswith(e) for e in PR_ENDS))
    total = max(ps_count + imp_count + pr_count, 1)

    ps_rate  = round(ps_count  / total, 4)
    imp_rate = round(imp_count / total, 4)
    pr_rate  = round(pr_count  / total, 4)
    ps_imp_ratio = round(math.log1p(ps_count / max(imp_count, 1)), 4)

    if ps_rate > 0.40:
        signature = "NARRATIF"
    elif imp_rate > 0.40:
        signature = "DURATIF"
    elif pr_rate > 0.50:
        signature = "IMMEDIAT"
    else:
        signature = "MIXTE"

    return {
        "f30a_passe_simple_rate":  ps_rate,
        "f30b_imparfait_rate":     imp_rate,
        "f30c_present_rate":       pr_rate,
        "f30d_ps_imp_ratio":       ps_imp_ratio,
        "f30e_temporal_signature": signature,
        "f30_method":              "OMEGA_TEMPORAL_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# F31-F40 — FEATURES TOPOLOGIQUES (NOUVELLES v5)
# ══════════════════════════════════════════════════════════════════════════

def compute_f31_chapter_length(chapters: list) -> dict:
    """F31 — Distribution des longueurs de chapitres."""
    if not chapters:
        return {"f31a_mean_chapter_words": 0, "f31b_stdev_chapter_words": 0,
                "f31c_min_chapter_words": 0, "f31d_max_chapter_words": 0,
                "f31e_cv_chapter_length": 0}
    lens = [len(c.split()) for c in chapters]
    m = mean(lens)
    sd = stdev(lens) if len(lens) > 1 else 0
    return {
        "f31a_mean_chapter_words":  round(m, 1),
        "f31b_stdev_chapter_words": round(sd, 1),
        "f31c_min_chapter_words":   min(lens),
        "f31d_max_chapter_words":   max(lens),
        "f31e_cv_chapter_length":   round(sd / m, 4) if m > 0 else 0,
        "f31_method": "OMEGA_CHAP_LEN_V1",
    }

def compute_f33_punctuation_ratio(text: str) -> dict:
    """F33 — Ratio points/virgules (rythme cardiaque)."""
    dots    = text.count('.') + text.count('!') + text.count('?')
    commas  = text.count(',') + text.count(';')
    total_p = max(dots + commas, 1)
    ratio   = round(dots / max(commas, 1), 4)
    return {
        "f33a_dots_count":   dots,
        "f33b_commas_count": commas,
        "f33c_dot_comma_ratio": ratio,
        "f33d_rhythm_type": "STACCATO" if ratio > 2.0 else ("LEGATO" if ratio < 0.8 else "EQUILIBRE"),
        "f33_method": "OMEGA_PUNCT_RATIO_V1",
    }

def compute_f34_paragraph_density(text: str) -> dict:
    """F34 — Densite paragraphique (paragraphes par 1000 mots)."""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    n_words = max(len(text.split()), 1)
    density = round(len(paras) / n_words * 1000, 2)
    return {
        "f34a_paragraph_count": len(paras),
        "f34b_para_per_1000w":  density,
        "f34c_speed": "RAPIDE" if density > 8 else ("LENT" if density < 3 else "MOYEN"),
        "f34_method": "OMEGA_PARA_DENSITY_V1",
    }

def compute_f35_hook(text: str) -> dict:
    """F35 — Hook strength (100 premiers mots)."""
    words = text.split()
    hook_text = " ".join(words[:100])
    sents = split_sentences(hook_text)
    if not sents:
        return {"f35a_hook_tension": 0, "f35b_hook_question": False, "f35c_hook_score": 0}

    has_question = any(s.strip().endswith("?") for s in sents)
    has_excl     = any(s.strip().endswith("!") for s in sents)
    mean_len     = mean(len(s.split()) for s in sents)
    # Phrases courtes = plus de tension
    tension = min(1.0, 20.0 / max(mean_len, 1))
    score = round(tension * 0.5 + (0.3 if has_question else 0) + (0.2 if has_excl else 0), 4)

    return {
        "f35a_hook_tension":  round(tension, 4),
        "f35b_hook_question": has_question,
        "f35c_hook_score":    score,
        "f35_method": "OMEGA_HOOK_V1",
    }

def compute_f36_cliffhanger(text: str) -> dict:
    """F36 — Cliffhanger strength (100 derniers mots)."""
    words = text.split()
    cliff_text = " ".join(words[-100:])
    sents = split_sentences(cliff_text)
    if not sents:
        return {"f36a_cliff_tension": 0, "f36b_cliff_incomplete": False, "f36c_cliff_score": 0}

    last_sent = sents[-1].strip()
    ends_ellipsis   = last_sent.endswith("...") or last_sent.endswith("…")
    ends_incomplete = not last_sent[-1] in ".!?…" if last_sent else False
    mean_len = mean(len(s.split()) for s in sents)
    tension  = min(1.0, 20.0 / max(mean_len, 1))
    score = round(tension * 0.5 + (0.3 if ends_ellipsis else 0) + (0.2 if ends_incomplete else 0), 4)

    return {
        "f36a_cliff_tension":    round(tension, 4),
        "f36b_cliff_incomplete": ends_ellipsis or ends_incomplete,
        "f36c_cliff_score":      score,
        "f36_method": "OMEGA_CLIFF_V1",
    }

def compute_f38_typographic_speed(text: str) -> dict:
    """F38 — Vitesse typographique."""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paras:
        return {"f38a_short_para_rate": 0, "f38b_speed_score": 0}
    para_lens = [len(p.split()) for p in paras]
    short_rate = round(sum(1 for l in para_lens if l < 30) / len(paras), 4)
    punct_density = round((text.count('.') + text.count('!') + text.count('?') +
                           text.count(',') + text.count(';')) / max(len(text.split()), 1), 4)
    speed = round(short_rate * 0.6 + min(punct_density * 5, 1.0) * 0.4, 4)
    return {
        "f38a_short_para_rate": short_rate,
        "f38b_punct_density":   punct_density,
        "f38c_speed_score":     speed,
        "f38_method": "OMEGA_TYPO_SPEED_V1",
    }

# ══════════════════════════════════════════════════════════════════════════
# AGGREGATION
# ══════════════════════════════════════════════════════════════════════════

def compute_all_features(text: str, sents: list, features: dict) -> dict:
    """Calcule F24-F30 + F33-F36 + F38 et fusionne."""
    out = {}
    out.update(compute_f24(sents, features))
    out.update(compute_f25(text, sents))
    out.update(compute_f26(sents))
    out.update(compute_f27(text, sents))
    out.update(compute_f28(text, sents))
    out.update(compute_f29(text))
    out.update(compute_f30(text))
    out.update(compute_f33_punctuation_ratio(text))
    out.update(compute_f34_paragraph_density(text))
    out.update(compute_f35_hook(text))
    out.update(compute_f36_cliffhanger(text))
    out.update(compute_f38_typographic_speed(text))
    return out

def compute_averages(feat_dicts: list) -> dict:
    """Moyenne par feature sur une liste de dicts."""
    all_vals = {}
    for fd in feat_dicts:
        for k, v in fd.items():
            if isinstance(v, (int, float)) and v is not None:
                all_vals.setdefault(k, []).append(float(v))
    return {k: round(mean(v), 6) for k, v in all_vals.items() if v}
