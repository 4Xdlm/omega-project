#!/usr/bin/env python3
"""
OMEGA Phase R-8.6 — LOI DES LEGO (ASSEMBLY ANALYSIS)
═════════════════════════════════════════════════════
Analyzes SEQUENCES of passage types, not just proportions.

5 analyses:
  1. Transition matrix: type(N) → type(N+1) frequency, S vs C/D
  2. Sequence patterns: bigrams/trigrams of types, S vs C/D enrichment
  3. Assembly bonus: block_2000w score vs mean(4x 500w) — synergy detection
  4. Scale revelation: dominant type at 500w vs 2000w — polyphony measure
  5. Structural support: ablation of middle window in 3-window blocks

Standard: NASA-Grade L4 — zero hand-tuning.
"""

import json, os, re, math, sys
from statistics import mean, stdev
from collections import Counter, defaultdict
from datetime import datetime
import numpy as np

ROOT = r"C:\Users\elric\omega-project"
TXT_DIR = os.path.join(ROOT, "omega-autopsie", "corpus_r", "txt")
TIERS_FILE = os.path.join(ROOT, "omega-autopsie", "corpus_r", "CORPUS_TIERS_V3.json")
OUT_FILE = os.path.join(ROOT, "omega-autopsie", "results_phase_r8", "R8_ASSEMBLY_ANALYSIS.json")

TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection']
WINDOW_SMALL = 500
WINDOW_LARGE = 2000
SEED = 42

# Key features to track for assembly bonus (the discriminants from R-8.5)
KEY_FEATURES = [
    'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
    'f9a_contradiction_rate', 'f19a_approx_entropy', 'f29d_ttr_score',
    'f27a_epistemic_rate', 'f26c_period_score', 'f28d_sil_score',
    'f_subordination_depth_approx', 'f_causal_density', 'f_tension_density',
]

# ═══════════════════════════════════════════════════════════════
# Classifier + features (compact, same logic as R-8.1-R-8.5)
# ═══════════════════════════════════════════════════════════════

SENSORY_WORDS = {'lumiere','ombre','couleur','brillant','sombre','clair','lueur','reflet','bruit','son','silence','murmure','voix','echo','souffle','froid','chaud','doux','rugeux','humide','sec','peau','odeur','parfum','senteur','fumee','gout','amer','sucre','light','shadow','dark','bright','noise','sound','whisper','cold','warm','smooth','rough','smell','scent'}
ADJ_ENDINGS = ['eux','euse','ique','able','ible','ant','ent','al','el','ous','ful','less','ive','oso','osa']
ACTION_VERBS = {'marcha','marchait','courut','courait','bondit','bondissait','saisit','saisissait','frappa','frappait','lanca','lancait','jeta','jetait','tira','tirait','poussa','poussait','sauta','sautait','attrapa','attrapait','tomba','tombait','coupa','coupait','brisa','brisait','arracha','arrachait','ouvrit','ouvrait','ferma','fermait','prit','prenait','walked','ran','jumped','grabbed','threw','hit','kicked','pushed','pulled','struck','seized','caught'}
SPEECH_VERBS = {'dit','disait','repondit','repondait','murmura','murmurait','cria','criait','demanda','demandait','ajouta','ajoutait','reprit','reprenait','declara','declarait','chuchota','said','asked','replied','whispered','shouted','exclaimed'}
MODAL_MARKERS = ['semblait','paraissait','apparemment','peut-etre','probablement','sans doute','comme si','dirait-on','il semblait','seemed','appeared','perhaps','probably','possibly','as if']
STATIC_VERBS = {'etait','etaient','fut','semblait','paraissait','demeurait','restait','was','were','seemed','appeared','remained'}
PS_ENDINGS = ['a','it','ut','int','urent','irent','erent']
IMP_ENDINGS = ['ait','aient','ais']
TEMPORAL_MARKERS = ['puis','ensuite','alors','soudain','enfin','aussitot','then','suddenly','finally','next']
COND_FORMS = ['aurait','serait','pourrait','devrait','voudrait','would','could','should','might']
STOP_FR = {'le','la','les','un','une','des','de','du','au','aux','ce','cette','ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre','votre','leur','nos','vos','leurs','je','tu','il','elle','on','nous','vous','ils','elles','me','te','se','lui','en','y','et','ou','mais','donc','or','ni','car','dans','sur','sous','avec','sans','pour','par','entre','vers','chez','contre','que','qui','dont','quand','comme','si','ne','pas','plus','jamais','rien','est','sont','etait','etaient','etre','avoir','avait','avaient','fait','faire','dit','dire','peut','pouvoir','doit','devoir','tout','tous','toute','toutes','autre','autres','meme','aussi','tres','bien','peu','trop','assez','alors','encore','deja','la','ici','puis','the','a','an','and','or','but','in','on','at','to','for','of','with','from','by','is','was','were','are','been','be','has','had','have','do','did','does','will','would','could','should','may','might','shall','can','must','it','its','he','she','they','them','their','his','her','this','that','these','those','not','no','so','if','as'}
ADVERSATIVES = {'mais','cependant','toutefois','neanmoins','pourtant','or','en revanche','au contraire','certes','malgre','but','however','nevertheless','yet','although','though','despite'}
CAUSAL_MARKERS = {'parce que','car','puisque','donc','ainsi','en effet','par consequent','de ce fait','because','since','therefore','thus','hence','consequently','as a result','due to','owing to'}
DESIRE_VERBS = {'voulait','desirait','souhaitait','revait','esperait','enviait','wanted','desired','wished','dreamed','hoped','longed','craved'}
NEGATION_WORDS = {'ne','pas','plus','jamais','rien','aucun','aucune','nul','nulle','guere','point','non','not','never','nothing','none','neither','nor','nowhere'}
SUB_MARKERS = {'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles','quand','lorsque','comme','puisque','parce','bien que','quoique','afin que','pour que','avant que','apres que','tandis que','that','which','who','whom','whose','where','when','while','because','since','although','though','if','unless','until'}

def split_sentences(text):
    raw = re.split(r'(?<=[.!?\u2026\u00bb])\s+', text)
    return [s.strip() for s in raw if len(s.strip()) > 5]

def r5(v):
    if v is None: return None
    return round(float(v), 5)

def clean_word(w):
    return w.lower().replace(',','').replace('.','').replace(';','').replace(':','').replace('!','').replace('?','').replace('"','').replace("'",'').replace('(','').replace(')','')

def classify_passage(text):
    sents = split_sentences(text)
    words = [w for w in text.split() if w]; nw = max(len(words),1); ns = max(len(sents),1)
    lines = [l.strip() for l in text.split('\n') if l.strip()]; nl = max(len(lines),1)
    dl = sum(1 for l in lines if l.startswith('\u2014') or l.startswith('\u2013') or l.startswith('- ') or l.startswith('\u00ab') or '\u00ab ' in l or ' \u00bb' in l or re.match(r'^["""\u201C]',l))
    svc = sum(1 for w in words if clean_word(w) in SPEECH_VERBS)
    dial = min(1.0,(dl/nl)*1.5+(svc/nw)*10)
    ac2 = sum(1 for w in words if any(clean_word(w).endswith(e) for e in ADJ_ENDINGS) and len(clean_word(w))>4)
    snc = sum(1 for w in words if clean_word(w) in SENSORY_WORDS)
    stc = sum(1 for w in words if clean_word(w) in STATIC_VERBS)
    desc = min(1.0,(ac2/nw)*8+(snc/nw)*15+(stc/nw)*10)
    avc = sum(1 for w in words if clean_word(w) in ACTION_VERBS)
    lw = [clean_word(w) for w in words if len(w)>3]; nlo = max(len(lw),1)
    psc = sum(1 for w in lw if any(w.endswith(e) for e in PS_ENDINGS)); psr = psc/nlo
    sl = [len(s.split()) for s in sents]; msl = sum(sl)/ns; ssr = sum(1 for l in sl if l<10)/ns
    act = min(1.0,(avc/nw)*20+psr*2+ssr*0.5+(0.2 if msl<12 else 0))
    tl = text.lower(); mc = 0
    for m in MODAL_MARKERS:
        p=0
        while True:
            p=tl.find(m,p)
            if p==-1: break
            mc+=1; p+=len(m)
    cc = sum(1 for w in words if clean_word(w) in COND_FORMS)
    fp = len(re.findall(r"\b(?:je|j'|me|m'|moi)\b",tl))
    intro = min(1.0,(mc/nw)*15+(cc/nw)*12+(fp/nw)*3)
    tp = len(re.findall(r"\b(?:il|elle|ils|elles|son|sa|ses|he\b|she\b|his\b|her\b)\b",tl))
    ic = sum(1 for w in lw if any(w.endswith(e) for e in IMP_ENDINGS))
    tc = sum(1 for w in words if clean_word(w) in TEMPORAL_MARKERS)
    narr = min(1.0,(tp/nw)*4+(ic/nlo)*2+psr*2+(tc/nw)*8)
    raw = {'narration':narr,'description':desc,'dialogue':dial,'introspection':intro,'action':act}
    total = sum(raw.values())
    if total==0: return {'narration':0,'description':1,'dialogue':0,'introspection':0,'action':0}
    return {k: round(v/total,5) for k,v in raw.items()}

def get_dominant(cl):
    return max(TYPES, key=lambda t: cl.get(t, 0))

def compute_key_features(text):
    """Compute only the 12 key discriminant features."""
    sents = split_sentences(text); wc = [clean_word(w) for w in text.split() if w]
    nw = max(len(wc),1); ns = max(len(sents),1); tl = text.lower()
    sl = [len(s.split()) for s in sents]; f = {}

    f['f1_mean'] = mean(sl) if sl else 0
    f['f1a_rhythm_variance'] = stdev(sl) if len(sl) > 1 else 0
    long_s = sum(1 for l in sl if l > 30)
    f['f26b_long_sent_rate'] = long_s / ns if ns > 0 else 0
    adc = sum(tl.count(m) for m in ADVERSATIVES)
    f['f9a_contradiction_rate'] = adc / ns
    cw = [w for w in wc if w not in STOP_FR and len(w) > 2]
    if cw:
        tc2 = len(cw); fr = Counter(cw)
        en = -sum((c/tc2)*math.log2(c/tc2) for c in fr.values() if c > 0)
        me = math.log2(len(fr)) if len(fr) > 1 else 1
        f['f19a_approx_entropy'] = en/me if me > 0 else 0
    else:
        f['f19a_approx_entropy'] = 0
    al = [w for w in wc if len(w) > 1]
    if len(al) >= 200:
        ttrs = [len(set(al[i:i+100]))/100 for i in range(0, len(al)-99, 50)]
        f['f29d_ttr_score'] = mean(ttrs)
    else:
        f['f29d_ttr_score'] = len(set(al)) / max(len(al), 1)
    epist = {'peut-etre','sans doute','probablement','il semble','apparemment','perhaps','probably','possibly','seemingly'}
    epc = sum(1 for m in epist if m in tl)
    f['f27a_epistemic_rate'] = epc / ns * 100 if ns > 0 else 0
    subc = sum(tl.count(f' {m} ') for m in SUB_MARKERS)
    f['f26c_period_score'] = (subc / ns) * (long_s / ns) if ns > 0 else 0
    sp2 = [r'il\s+(?:semblait|lui\s+semblait|croyait|pensait)', r'elle\s+(?:semblait|croyait|pensait|sentait)']
    slc = sum(len(re.findall(p, tl)) for p in sp2)
    f['f28d_sil_score'] = slc / ns if ns > 0 else 0
    f['f_subordination_depth_approx'] = subc / ns if ns > 0 else 0
    caus = sum(tl.count(m) for m in CAUSAL_MARKERS)
    f['f_causal_density'] = caus / ns if ns > 0 else 0
    nc = sum(1 for w in wc if w in NEGATION_WORDS)
    des = sum(1 for w in wc if w in DESIRE_VERBS)
    f['f_tension_density'] = (des + nc * 0.3) / nw
    return f

# ═══════════════════════════════════════════════════════════════
# EXTRACTION: consecutive windows from a work
# ═══════════════════════════════════════════════════════════════

def extract_consecutive_windows(text, window_size, step=None):
    """Extract consecutive non-overlapping windows of window_size words."""
    if step is None:
        step = window_size
    words = text.split()
    n = len(words)
    windows = []
    pos = 0
    while pos + window_size <= n:
        chunk = ' '.join(words[pos:pos + window_size])
        windows.append({'start_word': pos, 'text': chunk, 'p_rel': pos / n})
        pos += step
    return windows

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  OMEGA R-8.6 -- LOI DES LEGO (ASSEMBLY ANALYSIS)")
    print(f"  Small window: {WINDOW_SMALL}w | Large window: {WINDOW_LARGE}w")
    print(f"  Key features tracked: {len(KEY_FEATURES)}")
    print("=" * 70)

    # Load tiers
    with open(TIERS_FILE, 'r', encoding='utf-8') as fh:
        tiers_data = json.load(fh)
    tier_lookup = {e['filename']: e.get('tier_final') or e.get('tier_suggestion', '?') for e in tiers_data}

    # Process works by tier group
    tier_groups = {'S': [], 'A': [], 'B': [], 'C': [], 'D': []}
    all_files = list(tier_lookup.keys())
    skipped = 0; processed = 0

    # Data collectors
    transitions_by_tier = defaultdict(lambda: Counter())  # tier -> (typeA, typeB) -> count
    bigrams_by_tier = defaultdict(lambda: Counter())
    trigrams_by_tier = defaultdict(lambda: Counter())
    assembly_bonuses = []  # list of {tier, feature, bonus}
    scale_revelations = []  # {tier, small_type, large_type, changed}
    type_diversity_by_tier = defaultdict(list)  # tier -> [n_unique_types per work]

    for i, fn in enumerate(all_files):
        tier = tier_lookup.get(fn, '?')
        if tier not in tier_groups:
            continue

        txt_path = os.path.join(TXT_DIR, fn)
        if not os.path.exists(txt_path):
            skipped += 1; continue
        try:
            with open(txt_path, 'r', encoding='utf-8', errors='replace') as fh:
                text = fh.read()
        except:
            skipped += 1; continue

        words = text.split()
        if len(words) < WINDOW_LARGE * 3:
            skipped += 1; continue

        # === ANALYSIS 1+2: Extract 500w consecutive windows, build transitions ===
        small_windows = extract_consecutive_windows(text, WINDOW_SMALL)
        if len(small_windows) < 4:
            skipped += 1; continue

        # Classify each small window
        small_types = []
        for sw in small_windows:
            cl = classify_passage(sw['text'])
            dom = get_dominant(cl)
            small_types.append(dom)

        # Transitions (bigrams of consecutive types)
        for j in range(len(small_types) - 1):
            pair = (small_types[j], small_types[j+1])
            transitions_by_tier[tier][pair] += 1
            bigrams_by_tier[tier][pair] += 1

        # Trigrams
        for j in range(len(small_types) - 2):
            tri = (small_types[j], small_types[j+1], small_types[j+2])
            trigrams_by_tier[tier][tri] += 1

        # Type diversity per work
        unique_types = len(set(small_types))
        type_diversity_by_tier[tier].append(unique_types)

        # === ANALYSIS 3: Assembly bonus ===
        # For every 4 consecutive 500w windows forming a 2000w block:
        # Compare features of block vs mean of 4 windows
        for j in range(0, len(small_windows) - 3, 4):
            block_text = ' '.join(sw['text'] for sw in small_windows[j:j+4])
            if len(block_text.split()) < WINDOW_LARGE * 0.8:
                continue

            # Features on 4 individual windows
            window_features = [compute_key_features(small_windows[j+k]['text']) for k in range(4)]
            # Features on the combined block
            block_features = compute_key_features(block_text)

            for fk in KEY_FEATURES:
                w_vals = [wf[fk] for wf in window_features if fk in wf]
                b_val = block_features.get(fk, 0)
                if w_vals and any(v != 0 for v in w_vals):
                    w_mean = mean(w_vals)
                    bonus = b_val - w_mean
                    assembly_bonuses.append({
                        'tier': tier, 'feature': fk,
                        'block_val': b_val, 'window_mean': w_mean, 'bonus': bonus,
                    })

        # === ANALYSIS 4: Scale revelation ===
        # Same position, 500w vs 2000w: does dominant type change?
        large_windows = extract_consecutive_windows(text, WINDOW_LARGE)
        for lw in large_windows[:10]:  # cap at 10 per work
            large_cl = classify_passage(lw['text'])
            large_dom = get_dominant(large_cl)

            # Find overlapping small windows
            start = lw['start_word']
            small_in_range = [sw for sw in small_windows
                              if sw['start_word'] >= start
                              and sw['start_word'] < start + WINDOW_LARGE]
            if small_in_range:
                # Dominant type of the first small window at same position
                first_small_cl = classify_passage(small_in_range[0]['text'])
                small_dom = get_dominant(first_small_cl)
                changed = small_dom != large_dom
                scale_revelations.append({
                    'tier': tier, 'small_type': small_dom, 'large_type': large_dom,
                    'changed': bool(changed),
                })

        processed += 1
        if (i+1) % 100 == 0:
            print(f"  [{i+1}/{len(all_files)}] processed={processed} skipped={skipped}")

    print(f"\n  TOTAL: {processed} works processed, {skipped} skipped")

    # ═══════════════════════════════════════════════════════════
    # ANALYSIS 1: Transition matrix
    # ═══════════════════════════════════════════════════════════

    print("\n" + "=" * 70)
    print("  ANALYSIS 1: TRANSITION MATRIX (S vs C/D)")
    print("=" * 70)

    def normalize_transitions(counter):
        total = sum(counter.values())
        if total == 0: return {}
        return {f"{a}->{b}": round(v/total, 4) for (a,b), v in counter.most_common()}

    s_trans = normalize_transitions(transitions_by_tier['S'])
    cd_trans_raw = transitions_by_tier['C'] + transitions_by_tier['D']
    cd_trans = normalize_transitions(cd_trans_raw)

    # Enrichment: which transitions are MORE common in S vs C/D
    enrichment = {}
    all_pairs = set(list(s_trans.keys()) + list(cd_trans.keys()))
    for pair in all_pairs:
        s_pct = s_trans.get(pair, 0)
        cd_pct = cd_trans.get(pair, 0.001)
        ratio = s_pct / cd_pct if cd_pct > 0 else 999
        enrichment[pair] = {'s_pct': s_pct, 'cd_pct': cd_pct, 'ratio': r5(ratio)}

    s_enriched = sorted(enrichment.items(), key=lambda x: -x[1]['ratio'])
    cd_enriched = sorted(enrichment.items(), key=lambda x: x[1]['ratio'])

    print(f"\n  TOP 10 TRANSITIONS ENRICHED IN S (vs C/D):")
    for pair, data in s_enriched[:10]:
        print(f"    {pair:<30} S={data['s_pct']:.3f}  CD={data['cd_pct']:.3f}  ratio={data['ratio']:.2f}x")

    print(f"\n  TOP 10 TRANSITIONS ENRICHED IN C/D (vs S):")
    for pair, data in cd_enriched[:10]:
        print(f"    {pair:<30} S={data['s_pct']:.3f}  CD={data['cd_pct']:.3f}  ratio={data['ratio']:.2f}x")

    # ═══════════════════════════════════════════════════════════
    # ANALYSIS 2: Sequence patterns
    # ═══════════════════════════════════════════════════════════

    print(f"\n" + "=" * 70)
    print("  ANALYSIS 2: SEQUENCE PATTERNS (TRIGRAMS)")
    print("=" * 70)

    s_trigrams = trigrams_by_tier['S']
    cd_trigrams = trigrams_by_tier['C'] + trigrams_by_tier['D']
    s_tri_total = max(sum(s_trigrams.values()), 1)
    cd_tri_total = max(sum(cd_trigrams.values()), 1)

    tri_enrichment = {}
    all_tris = set(list(s_trigrams.keys()) + list(cd_trigrams.keys()))
    for tri in all_tris:
        s_pct = s_trigrams[tri] / s_tri_total
        cd_pct = cd_trigrams[tri] / cd_tri_total if cd_tri_total > 0 else 0.001
        if s_pct > 0.005 or cd_pct > 0.005:  # filter noise
            ratio = s_pct / cd_pct if cd_pct > 0 else 999
            tri_enrichment[tri] = {'s_pct': r5(s_pct), 'cd_pct': r5(cd_pct), 'ratio': r5(ratio)}

    s_tri_enriched = sorted(tri_enrichment.items(), key=lambda x: -x[1]['ratio'])
    print(f"\n  TOP 10 TRIGRAMS ENRICHED IN S:")
    for tri, data in s_tri_enriched[:10]:
        tri_str = "->".join(tri)
        print(f"    {tri_str:<40} S={data['s_pct']:.4f}  CD={data['cd_pct']:.4f}  ratio={data['ratio']:.2f}x")

    cd_tri_enriched = sorted(tri_enrichment.items(), key=lambda x: x[1]['ratio'])
    print(f"\n  TOP 10 TRIGRAMS ENRICHED IN C/D:")
    for tri, data in cd_tri_enriched[:10]:
        tri_str = "->".join(tri)
        print(f"    {tri_str:<40} S={data['s_pct']:.4f}  CD={data['cd_pct']:.4f}  ratio={data['ratio']:.2f}x")

    # ═══════════════════════════════════════════════════════════
    # ANALYSIS 3: Assembly bonus (block > sum of parts?)
    # ═══════════════════════════════════════════════════════════

    print(f"\n" + "=" * 70)
    print("  ANALYSIS 3: ASSEMBLY BONUS (block 2000w vs mean 4x500w)")
    print("=" * 70)

    # Group by tier and feature
    bonus_by_tier_feat = defaultdict(lambda: defaultdict(list))
    for ab in assembly_bonuses:
        bonus_by_tier_feat[ab['tier']][ab['feature']].append(ab['bonus'])

    print(f"\n  {'Feature':<32} {'S bonus':>8} {'A bonus':>8} {'B bonus':>8} {'C bonus':>8} {'S>C?':>6}")
    print("  " + "-" * 75)
    assembly_summary = {}
    for fk in KEY_FEATURES:
        row = {}
        for tier in ['S', 'A', 'B', 'C']:
            vals = bonus_by_tier_feat[tier][fk]
            row[tier] = r5(mean(vals)) if vals else 0
        s_gt_c = "YES" if (row.get('S',0) or 0) > (row.get('C',0) or 0) else "no"
        print(f"  {fk:<32} {row.get('S',0):>+8.4f} {row.get('A',0):>+8.4f} "
              f"{row.get('B',0):>+8.4f} {row.get('C',0):>+8.4f} {s_gt_c:>6}")
        assembly_summary[fk] = row

    # ═══════════════════════════════════════════════════════════
    # ANALYSIS 4: Scale revelation
    # ═══════════════════════════════════════════════════════════

    print(f"\n" + "=" * 70)
    print("  ANALYSIS 4: SCALE REVELATION (type change 500w → 2000w)")
    print("=" * 70)

    rev_by_tier = defaultdict(list)
    for sr in scale_revelations:
        rev_by_tier[sr['tier']].append(sr['changed'])

    print(f"\n  {'Tier':<6} {'Changed%':>10} {'N':>6} | Interpretation")
    print("  " + "-" * 60)
    revelation_rates = {}
    for tier in ['S', 'A', 'B', 'C', 'D']:
        vals = rev_by_tier[tier]
        if vals:
            pct = sum(vals) / len(vals) * 100
            revelation_rates[tier] = r5(pct)
            interp = "HIGH polyphony" if pct > 50 else "moderate" if pct > 30 else "LOW (monotone)"
            print(f"  {tier:<6} {pct:>9.1f}% {len(vals):>6} | {interp}")

    # What are the most common type changes?
    change_counter = Counter()
    for sr in scale_revelations:
        if sr['changed']:
            change_counter[(sr['small_type'], sr['large_type'])] += 1

    print(f"\n  TOP 10 TYPE CHANGES (500w → 2000w):")
    for (s_type, l_type), count in change_counter.most_common(10):
        print(f"    {s_type:<15} → {l_type:<15} count={count}")

    # ═══════════════════════════════════════════════════════════
    # ANALYSIS 5: Type diversity per work
    # ═══════════════════════════════════════════════════════════

    print(f"\n" + "=" * 70)
    print("  ANALYSIS 5: TYPE DIVERSITY PER WORK")
    print("=" * 70)

    print(f"\n  {'Tier':<6} {'Mean types':>12} {'Stdev':>8} {'N':>6}")
    print("  " + "-" * 35)
    diversity_summary = {}
    for tier in ['S', 'A', 'B', 'C', 'D']:
        vals = type_diversity_by_tier[tier]
        if vals:
            diversity_summary[tier] = {'mean': r5(mean(vals)), 'stdev': r5(stdev(vals)) if len(vals) > 1 else 0, 'n': len(vals)}
            print(f"  {tier:<6} {mean(vals):>12.2f} {stdev(vals) if len(vals)>1 else 0:>8.2f} {len(vals):>6}")

    # ═══════════════════════════════════════════════════════════
    # HYPOTHESES TEST
    # ═══════════════════════════════════════════════════════════

    print(f"\n" + "=" * 70)
    print("  HYPOTHESES TEST")
    print("=" * 70)

    # H1: Masters have richer transitions
    s_unique_trans = len([p for p, v in transitions_by_tier['S'].items() if v >= 3])
    cd_unique_trans = len([p for p, v in cd_trans_raw.items() if v >= 3])
    h1 = s_unique_trans > cd_unique_trans
    print(f"\n  H1: Masters have richer transitions")
    print(f"    S unique transitions (>=3): {s_unique_trans}")
    print(f"    C/D unique transitions (>=3): {cd_unique_trans}")
    print(f"    VERDICT: {'CONFIRMED' if h1 else 'REJECTED'}")

    # H2: Masters get assembly bonus
    s_bonuses = [ab['bonus'] for ab in assembly_bonuses if ab['tier'] == 'S']
    cd_bonuses = [ab['bonus'] for ab in assembly_bonuses if ab['tier'] in ('C', 'D')]
    s_bonus_mean = mean(s_bonuses) if s_bonuses else 0
    cd_bonus_mean = mean(cd_bonuses) if cd_bonuses else 0
    h2 = s_bonus_mean > cd_bonus_mean
    print(f"\n  H2: Masters get assembly bonus (block > sum parts)")
    print(f"    S mean bonus: {s_bonus_mean:+.4f}")
    print(f"    C/D mean bonus: {cd_bonus_mean:+.4f}")
    print(f"    VERDICT: {'CONFIRMED' if h2 else 'REJECTED'}")

    # H3: LLMs repeat patterns without structural return
    s_rev = revelation_rates.get('S', 0)
    c_rev = revelation_rates.get('C', 0)
    h3 = s_rev > c_rev
    print(f"\n  H3: LLMs are more monotone (less scale revelation)")
    print(f"    S revelation rate: {s_rev:.1f}%")
    print(f"    C revelation rate: {c_rev:.1f}%")
    print(f"    VERDICT: {'CONFIRMED' if h3 else 'REJECTED'}")

    # ═══════════════════════════════════════════════════════════
    # SAVE
    # ═══════════════════════════════════════════════════════════

    output = {
        'phase': 'R-8.6',
        'description': 'Assembly analysis: transitions, patterns, bonus, scale revelation, diversity',
        'works_processed': processed,
        'timestamp': datetime.now().isoformat(),
        'transition_enrichment_S_top10': [
            {'pair': p, **d} for p, d in s_enriched[:10]
        ],
        'transition_enrichment_CD_top10': [
            {'pair': p, **d} for p, d in cd_enriched[:10]
        ],
        'trigram_enrichment_S_top10': [
            {'trigram': "->".join(t), **d} for t, d in s_tri_enriched[:10]
        ],
        'assembly_bonus_by_tier': {
            tier: {fk: r5(mean(bonus_by_tier_feat[tier][fk])) if bonus_by_tier_feat[tier][fk] else 0
                   for fk in KEY_FEATURES}
            for tier in ['S','A','B','C','D']
        },
        'scale_revelation_rates': revelation_rates,
        'type_diversity': diversity_summary,
        'hypotheses': {
            'H1_richer_transitions': bool(h1),
            'H2_assembly_bonus': bool(h2),
            'H3_llm_monotone': bool(h3),
        },
    }
    with open(OUT_FILE, 'w', encoding='utf-8') as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\n  SAVED: {OUT_FILE}")
    print("=" * 70)

if __name__ == '__main__':
    main()
