#!/usr/bin/env python3
"""
OMEGA — CONSOLIDATION BLACK-BOX CLAUDE SONNET
Phase A : Zero API — Consolider toutes les donnees existantes en contrat preliminaire.
Sources : Rosetta, BESTOF3, Telemetry, Volume Tests, Angostura
"""
import json, os, math, re
from collections import defaultdict
import numpy as np

BASE = "C:/Users/elric/omega-project"
OUT_DIR = f"{BASE}/sessions/CLAUDE_BLACKBOX"
os.makedirs(OUT_DIR, exist_ok=True)

print("=" * 80)
print("OMEGA — CONSOLIDATION BLACK-BOX CLAUDE SONNET")
print("Phase A : Zero API — Donnees existantes uniquement")
print("=" * 80)

# ============================================================
# 1. ROSETTA PILOTABILITY
# ============================================================
print("\n[1] Loading Rosetta pilotability...")
with open(f"{BASE}/omega-autopsie/results_rosetta/s0/rosetta_claude-sonnet-4-20250514_v1.json", encoding='utf-8') as f:
    rosetta = json.load(f)

pilotability = {}
for feat, data in rosetta['features'].items():
    pilotability[feat] = {
        'pilotability': data['pilotability'],
        'category': data['category'],
        'taux_declared': data['taux_respect_declared'],
        'taux_optimized': data.get('taux_respect_optimized'),
    }
print(f"  {len(pilotability)} features with pilotability data")

# ============================================================
# 2. CONFUSION MATRIX
# ============================================================
print("\n[2] Loading confusion matrix...")
with open(f"{BASE}/omega-autopsie/results_rosetta/07_confusion_matrix.json", encoding='utf-8') as f:
    confusion = json.load(f)

mode_verdicts = {}
for mode_asked, data in confusion.items():
    mode_name = mode_asked.replace('_demande', '')
    mode_verdicts[mode_name] = {
        'produced': data['plus_proche_classique'],
        'verdict': data['verdict'],
        'distances': data['distances'],
    }
print(f"  {len(mode_verdicts)} modes analyzed")

# ============================================================
# 3. BESTOF3 TEXTS — Feature extraction on winner texts
# ============================================================
print("\n[3] Measuring features on BESTOF3 winner texts...")

def split_sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?\u2026\u00bb])\s+', text) if len(s.strip()) > 5]

def measure_text(text):
    words = text.split()
    nw = len(words)
    sents = split_sentences(text)
    ns = len(sents) if sents else 1
    sent_lens = [len(s.split()) for s in sents] if sents else [nw]

    mean_sl = np.mean(sent_lens)
    std_sl = np.std(sent_lens, ddof=1) if len(sent_lens) > 1 else 0
    cv_sent = std_sl / mean_sl if mean_sl > 0 else 0

    n_long = sum(1 for l in sent_lens if l > 40)
    n_short = sum(1 for l in sent_lens if l < 10)
    f26b = n_long / ns
    f17 = sum(1 for l in sent_lens if l <= 5)
    knife_rate = f17 / ns

    # Transitions
    t_lc = sum(1 for i in range(ns-1) if sent_lens[i] > 30 and sent_lens[i+1] < 10)
    t_cl = sum(1 for i in range(ns-1) if sent_lens[i] < 10 and sent_lens[i+1] > 30)
    ratio_alt = (t_lc + t_cl) / ns if ns > 0 else 0

    # Punctuation
    semicolons = text.count(';')
    dashes = text.count('\u2014') + text.count('\u2013') + text.count(' - ')
    colons = text.count(':')
    excl = text.count('!')
    quest = text.count('?')
    ellipsis = text.count('...') + text.count('\u2026')
    quotes = text.count('\u00ab') + text.count('\u00bb')

    # Subordination proxy
    sub_words = {'que','qui','dont','ou','quand','comme','si','puisque','parce',
                 'bien','quoique','tandis','lorsque','avant','apres','pendant'}
    sub_count = sum(1 for s in sents for w in s.lower().split()
                    if re.sub(r'[.,;:!?]', '', w) in sub_words)

    paras = [p.strip() for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 10]
    np_count = max(len(paras), 1)

    return {
        'words': nw,
        'sentence_count': ns,
        'paragraph_count': np_count,
        'mean_sent_len': round(float(mean_sl), 2),
        'std_sent_len': round(float(std_sl), 2),
        'cv_sent': round(float(cv_sent), 3),
        'f26b_long_sent_rate': round(float(f26b), 4),
        'f17_knife_count': f17,
        'knife_rate': round(float(knife_rate), 4),
        'ratio_alt': round(float(ratio_alt), 4),
        'T_LC': t_lc,
        'T_CL': t_cl,
        'semicolon_count': semicolons,
        'dash_count': dashes,
        'colon_count': colons,
        'excl_count': excl,
        'quest_count': quest,
        'ellipsis_count': ellipsis,
        'dialogue_markers': quotes,
        'sub_per_sentence': round(sub_count / ns, 3),
        'longest_sent': max(sent_lens) if sent_lens else 0,
        'shortest_sent': min(sent_lens) if sent_lens else 0,
    }

bestof_dir = f"{BASE}/packages/sovereign-engine/sessions/BESTOF3_2026-03-26T13-39-57"
bestof_texts = {}
for brick in ['contemplation', 'confrontation', 'souvenir', 'menace', 'revelation']:
    fpath = f"{bestof_dir}/brick_{brick}_winner.txt"
    if os.path.exists(fpath):
        with open(fpath, encoding='utf-8') as f:
            text = f.read()
        feats = measure_text(text)
        bestof_texts[brick] = feats

print(f"  {len(bestof_texts)} BESTOF3 winners measured")

# Print baseline table
print(f"\n  {'Brick':<16} {'Words':>5} {'mean':>6} {'cv':>6} {'f26b':>6} {'f17':>4} {'alt%':>5} {';':>3} {'—':>3} {'sub':>5}")
print("  " + "-" * 72)
for brick, f in bestof_texts.items():
    print(f"  {brick:<16} {f['words']:>5} {f['mean_sent_len']:>6.1f} {f['cv_sent']:>6.3f} {f['f26b_long_sent_rate']:>6.3f} {f['f17_knife_count']:>4} {f['ratio_alt']*100:>4.1f}% {f['semicolon_count']:>3} {f['dash_count']:>3} {f['sub_per_sentence']:>5.2f}")

# ============================================================
# 4. TELEMETRY — Duel candidates features
# ============================================================
print("\n[4] Loading Telemetry Duel data...")
tel_dir = f"{BASE}/packages/sovereign-engine/sessions/TELEMETRY5_2026-03-26T17-45-50"
duel_by_mode = defaultdict(list)

for brick in ['contemplation', 'confrontation', 'souvenir', 'menace', 'revelation']:
    fpath = f"{tel_dir}/telemetry_{brick}.json"
    if not os.path.exists(fpath):
        continue
    with open(fpath, encoding='utf-8') as f:
        tel = json.load(f)
    for snap in tel['snapshots']:
        if snap['stage'].startswith('DUEL_') and snap['stage'] != 'DUEL_WINNER':
            mode = snap.get('details', {}).get('mode', 'unknown')
            feats = snap['features']
            duel_by_mode[mode].append({
                'brick': brick,
                'words': snap['words'],
                'f1_mean': feats.get('f1_mean_sent_len', 0),
                'f1a': feats.get('f1a_rhythm_variance', 0),
                'f26b': feats.get('f26b_long_sent_rate', 0),
                'f17': feats.get('f17_knife_count', 0),
                'cv_sent': feats.get('cv_sent', 0),
            })

print(f"  Modes: {list(duel_by_mode.keys())}")
for mode, entries in duel_by_mode.items():
    means = {
        'words': np.mean([e['words'] for e in entries]),
        'f1_mean': np.mean([e['f1_mean'] for e in entries]),
        'f26b': np.mean([e['f26b'] for e in entries]),
        'f17': np.mean([e['f17'] for e in entries]),
        'cv_sent': np.mean([e['cv_sent'] for e in entries]),
    }
    print(f"  {mode:<28} n={len(entries):>2} words={means['words']:.0f} f1={means['f1_mean']:.1f} f26b={means['f26b']:.3f} f17={means['f17']:.1f} cv={means['cv_sent']:.3f}")

# ============================================================
# 5. VOLUME TEST — Volume vs quality
# ============================================================
print("\n[5] Loading Volume Test results...")
vol_path = f"{BASE}/packages/sovereign-engine/sessions/VOLUME_TEST_2026-03-27/VOLUME_RESULTS.json"
if os.path.exists(vol_path):
    with open(vol_path, encoding='utf-8') as f:
        vol_results = json.load(f)
    print(f"  {len(vol_results)} volume test runs")
    for r in vol_results:
        print(f"  {r['scene']:<12} target={r['target_words']:>5} actual={r['actual_words']:>4} comp={r['composite']:.1f} min={r['min_axis']:.1f}")

# ============================================================
# 6. BESTOF3 SCORES (from results JSON)
# ============================================================
print("\n[6] Loading BESTOF3 scores...")
with open(f"{bestof_dir}/BESTOF3_RESULTS.json", encoding='utf-8') as f:
    bestof_results = json.load(f)

for r in bestof_results:
    w = r['winner']
    saga = "SAGA" if w.get('saga_ready', False) else "----"
    print(f"  {r['scene']:<16} comp={w['composite']:.1f} min={w['min_axis']:.1f} words={w['words']:>4} attempts={r['attempts']} [{saga}]")

# ============================================================
# SYNTHESIS — PRELIMINARY BEHAVIORAL CONTRACT
# ============================================================
print("\n" + "=" * 80)
print("CONTRAT COMPORTEMENTAL PRELIMINAIRE")
print("=" * 80)

# Compute baseline statistics from BESTOF3 winners
all_feats = list(bestof_texts.values())
baseline = {}
for key in all_feats[0].keys():
    vals = [f[key] for f in all_feats]
    baseline[key] = {
        'mean': round(float(np.mean(vals)), 3),
        'std': round(float(np.std(vals, ddof=1)), 3) if len(vals) > 1 else 0,
        'min': round(float(np.min(vals)), 3),
        'max': round(float(np.max(vals)), 3),
    }

print("\n=== SECTION A — CE QUE CLAUDE FAIT SPONTANEMENT ===")
print(f"  Baseline sur 5 briques BESTOF3 (n=5, mesure directe) :")
for key in ['words', 'mean_sent_len', 'cv_sent', 'f26b_long_sent_rate',
            'f17_knife_count', 'knife_rate', 'ratio_alt', 'semicolon_count',
            'dash_count', 'sub_per_sentence']:
    b = baseline[key]
    print(f"  {key:<25} mean={b['mean']:>8.3f} std={b['std']:>7.3f} [{b['min']:.3f} — {b['max']:.3f}]")

print("\n=== SECTION B — CE QU'IL SAIT FAIRE SUR DEMANDE (Rosetta) ===")
for feat, data in pilotability.items():
    status = f"PILOTABLE ({data['taux_declared']*100:.0f}%)" if data['pilotability'] >= 0.8 else \
             f"ILLUSION ({data['taux_declared']*100:.0f}%)" if data['category'] == 'ILLUSION_DÉCLARATIVE' else \
             f"AUTONOME ({data['taux_declared']*100:.0f}%)"
    print(f"  {feat:<30} {status}")

print("\n=== SECTION C — CE QU'IL FAIT MAL (confusion matrix) ===")
print("  PUITS GRAVITATIONNEL : INTROSPECTION")
print("  7/7 modes demandes -> produisent de l'INTROSPECTION")
print("  Seul match exact : INTROSPECTION -> INTROSPECTION")
for mode, v in mode_verdicts.items():
    if v['verdict'].startswith('SUBSTITUTION'):
        dist = v['distances'].get(v['produced'], 0)
        print(f"    {mode:>15} demande -> {v['produced']} produit (distance={dist:.3f})")

print("\n=== SECTION D — COMPRESSION / REINTERPRETATION ===")
print("  Volume test : target_word_count NON respecte")
if vol_results:
    for r in vol_results:
        ratio = r['actual_words'] / r['target_words'] if r['target_words'] > 0 else 0
        print(f"    {r['scene']:<12} {r['target_words']:>5}w demande -> {r['actual_words']:>4}w produit ({ratio*100:.0f}%)")

print("\n=== SECTION E — PLAFONDS MECANIQUES ===")
print("  Micro-chirurgie : taux_succes = 0% (Rosetta)")
print("  f17_knife_count : pilotabilite = 0 (ILLUSION_DECLARATIVE)")
print("  Volume : compresse systematiquement vers ~300-500w")
print("  Modes : tous convergent vers INTROSPECTION")

print("\n=== SECTION F — LOIS EMERGENTES ===")
laws = [
    {"id": "L01", "statement": "Claude produit de l'INTROSPECTION quel que soit le mode demande",
     "confidence": "OBSERVE", "evidence": "confusion_matrix.json — 7/7 modes -> INTROSPECTION"},
    {"id": "L02", "statement": "f17_knife_count est une ILLUSION DECLARATIVE — Claude pretend ajouter des phrases-couteau mais ne le fait pas",
     "confidence": "OBSERVE", "evidence": "rosetta — taux_respect = 20%"},
    {"id": "L03", "statement": "Le point-virgule est le marqueur #1 de qualite litteraire",
     "confidence": "OBSERVE", "evidence": "Angostura — importance permutation 0.42"},
    {"id": "L04", "statement": "Le volume produit est compresse vers 300-500w quel que soit le target",
     "confidence": "OBSERVE", "evidence": "Volume test — 6/6 runs sous-produisent"},
    {"id": "L05", "statement": "La micro-chirurgie phrase-par-phrase ne fonctionne pas",
     "confidence": "OBSERVE", "evidence": "Rosetta — taux_succes = 0"},
    {"id": "L06", "statement": "f24e_contrast_score est parfaitement pilotable (100%)",
     "confidence": "OBSERVE", "evidence": "Rosetta — pilotability = 1.0"},
    {"id": "L07", "statement": "Les features lexicales (TTR, bigram) sont stables mais non discriminantes",
     "confidence": "OBSERVE", "evidence": "Angostura — TTR = THERMOMETER, importance ~0.004"},
    {"id": "L08", "statement": "Le conflit structurel ECC/SII vs IFI est insoluble — les phrases longues tuent les hooks",
     "confidence": "INFERE", "evidence": "Angostura — 26 features en conflit inter-axes"},
    {"id": "L09", "statement": "semicolon_count + dash_count capturent 64% de l'importance totale a 500w",
     "confidence": "OBSERVE", "evidence": "Angostura — 0.42 + 0.22 = 0.64"},
    {"id": "L10", "statement": "R2 de prediction du tier augmente avec la taille du texte (0.20 a 200w -> 0.39 a 2000w)",
     "confidence": "OBSERVE", "evidence": "Audit hierarchique — 5 tailles mesurees"},
]

for law in laws:
    print(f"\n  LOI {law['id']} [{law['confidence']}]")
    print(f"    {law['statement']}")
    print(f"    Evidence : {law['evidence']}")

# ============================================================
# SAVE
# ============================================================
contract = {
    'generated': '2026-03-27',
    'status': 'PRELIMINARY — consolidation existant, 0 API supplementaire',
    'model': 'claude-sonnet-4-20250514',
    'baseline': baseline,
    'pilotability': pilotability,
    'confusion_matrix': mode_verdicts,
    'duel_modes': {mode: {
        'n': len(entries),
        'mean_words': round(float(np.mean([e['words'] for e in entries])), 1),
        'mean_f1': round(float(np.mean([e['f1_mean'] for e in entries])), 2),
        'mean_f26b': round(float(np.mean([e['f26b'] for e in entries])), 4),
        'mean_f17': round(float(np.mean([e['f17'] for e in entries])), 2),
    } for mode, entries in duel_by_mode.items()},
    'volume_compression': vol_results if vol_results else [],
    'laws': laws,
    'bestof3_features': bestof_texts,
}

with open(f"{OUT_DIR}/PRELIMINARY_CONTRACT.json", 'w', encoding='utf-8') as f:
    json.dump(contract, f, indent=2, ensure_ascii=False)
print(f"\nSaved: {OUT_DIR}/PRELIMINARY_CONTRACT.json")

print(f"\n{'='*80}")
print("CONSOLIDATION COMPLETE — Contrat preliminaire produit")
print(f"{'='*80}")
