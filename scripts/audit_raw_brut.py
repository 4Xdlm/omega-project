#!/usr/bin/env python3
"""
OMEGA — AUDIT MULTI-ECHELLE BRUT SUR CHAPITRES REELS
Date: 2026-03-27
Standard: NASA-Grade L4 / DO-178C Level A
Mode: CALCUL PUR — 0 API — ZERO INTERPOLATION

Reads ALL raw text files from corpus, splits into real chapters,
computes features at 200/500/700/1000/2000/full from TEXT BRUT.
No pre-computed values used as source of truth.
"""
import json, math, os, re, sys, csv, time, hashlib
from collections import defaultdict
import numpy as np
from scipy import stats as sp_stats

# ============================================================
# CONFIG
# ============================================================
BASE = "C:/Users/elric/omega-project"
TXT_DIR = f"{BASE}/omega-autopsie/corpus_r/txt"
TIERS_FILE = f"{BASE}/omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json"
OUT_DIR = f"{BASE}/src/scoring/data"

WINDOW_SIZES = [200, 500, 700, 1000, 2000]  # + 'full' for chapter
STRIDE_RATIO = 0.10  # 10% stride
MIN_STRIDE = 20
MIN_CHAPTER_WORDS = 200  # minimum to be a valid chapter

# Thresholds — EXPLICITLY DOCUMENTED
LONG_SENT_THRESHOLD = 40   # words — sentence is LONG if > 40
SHORT_SENT_THRESHOLD = 10  # words — sentence is SHORT if < 10
KNIFE_THRESHOLD = 5        # words — f17 knife if <= 5
TRANS_LONG = 30            # words — for transition analysis, LONG > 30
TRANS_SHORT = 10           # words — for transition analysis, SHORT < 10

print("=" * 80)
print("OMEGA — AUDIT MULTI-ECHELLE BRUT")
print("ZERO INTERPOLATION — CALCUL PUR — 0 API")
print("=" * 80)

# ============================================================
# SENTENCE SPLITTER (regex, no NLP)
# ============================================================
def split_sentences(text):
    """Split French/English text into sentences using regex."""
    sents = [s.strip() for s in re.split(r'(?<=[.!?\u2026\u00bb])\s+', text) if len(s.strip()) > 5]
    return sents

# ============================================================
# CHAPTER SPLITTER
# ============================================================
CHAPTER_RE = re.compile(
    r"(?:^|\n\n+)\s*"
    r"(?:"
    r"(?:CHAPITRE|CHAPTER|LIVRE|BOOK|PART(?:IE)?|ACTE|PRIMERA|SEGUNDA|TERCERA|CAPITULO|CAPITOLO)"
    r"\s+(?:[IVXLCDM]+|[0-9]+)"
    r"|"
    r"(?:[IVXLCDM]{1,8}|[0-9]{1,3})\s*\.?\s*\n"
    r")",
    re.IGNORECASE | re.MULTILINE
)

GUTENBERG_START = re.compile(r'\*\*\*\s*START OF.*?\*\*\*', re.IGNORECASE)
GUTENBERG_END = re.compile(r'\*\*\*\s*END OF.*?\*\*\*', re.IGNORECASE)

def clean_gutenberg(text):
    """Remove Gutenberg headers/footers."""
    m = GUTENBERG_START.search(text)
    if m:
        text = text[m.end():]
    m = GUTENBERG_END.search(text)
    if m:
        text = text[:m.start()]
    return text.strip()

def split_chapters(text):
    """Split text into chapters. Returns list of (title, text, word_count)."""
    text = clean_gutenberg(text)

    # Remove common OCR/PDF artifacts
    text = re.sub(r'OceanofPDF\.com', '', text)

    matches = list(CHAPTER_RE.finditer(text))
    if len(matches) >= 3:
        chapters = []
        for i, m in enumerate(matches):
            start = m.end()
            end = matches[i+1].start() if i+1 < len(matches) else len(text)
            ch_text = text[start:end].strip()
            ch_words = len(ch_text.split())
            title = m.group().strip()[:50]
            if ch_words >= MIN_CHAPTER_WORDS:
                chapters.append((title, ch_text, ch_words))
        return chapters

    # No chapter structure detected — return None
    return None

# ============================================================
# FEATURE COMPUTATION (from raw text)
# ============================================================
# Marker sets for feature computation
ALL_SUB = {'que','qui','dont','ou','lequel','laquelle','lesquels','lesquelles',
           'quand','comme','si','puisque','parce','bien','quoique','malgre',
           'tandis','alors','lorsque','des','avant','apres','pendant','jusqu',
           'that','which','who','whom','whose','where','when','although',
           'because','since','while','until','unless','whether','after',
           'before','though','even','whereas','provided'}

ADVERSATIVE = ['mais','cependant','pourtant','toutefois','neanmoins','or',
               'en revanche','au contraire','malgre','bien que','quoique',
               'but','however','yet','nevertheless','although','despite',
               'nonetheless','on the contrary','whereas']

STOP_FR = {'le','la','les','un','une','des','de','du','au','aux','ce','cette',
           'ces','mon','ton','son','ma','ta','sa','mes','tes','ses','notre',
           'votre','leur','nos','vos','leurs','je','tu','il','elle','on',
           'nous','vous','ils','elles','me','te','se','lui','en','y','et',
           'ou','mais','donc','or','ni','car','dans','sur','sous','avec',
           'sans','pour','par','entre','vers','chez','que','qui','dont',
           'ne','pas','plus','jamais','rien','est','sont','etait','etaient',
           'etre','avoir','avait','avaient','fait','dit','peut','tout',
           'tous','toute','toutes','autre','autres','meme','aussi','tres',
           'bien','peu','trop','assez','alors','encore','the','a','an',
           'and','or','but','in','on','at','to','for','of','with','from',
           'by','is','was','were','are','been','be','has','had','have',
           'it','he','she','they','them','their','his','her','this','that',
           'not','no','so','if','as','i','my','me','we','our','you','your'}

def count_occ(text, marker):
    c = 0; p = 0
    while True:
        p = text.find(marker, p)
        if p == -1: break
        c += 1; p += len(marker)
    return c

def compute_features(text):
    """Compute ALL available features from raw text. No NLP, no API."""
    words_list = text.split()
    total_words = len(words_list)

    if total_words < 10:
        return None

    sents = split_sentences(text)
    ns = len(sents)

    if ns < 2:
        return None

    # Paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 10]
    np_count = max(len(paragraphs), 1)

    # === FAMILLE A: TAILLE / RYTHME / STRUCTURE ===
    sent_lens = [len(s.split()) for s in sents]
    mean_sent = np.mean(sent_lens)
    median_sent = np.median(sent_lens)
    std_sent = np.std(sent_lens, ddof=1) if ns > 1 else 0
    cv_sent = std_sent / mean_sent if mean_sent > 0 else 0
    range_sent = max(sent_lens) - min(sent_lens) if sent_lens else 0

    para_lens = [len(p.split()) for p in paragraphs]
    mean_para = np.mean(para_lens) if para_lens else 0
    std_para = np.std(para_lens, ddof=1) if len(para_lens) > 1 else 0
    cv_para = std_para / mean_para if mean_para > 0 else 0

    # f1a_rhythm_variance (stdev of sentence lengths)
    f1a = float(std_sent)
    # f1b_rhythm_ratio
    f1b = float(max(sent_lens) / min(sent_lens)) if min(sent_lens) > 0 else 0

    # === FAMILLE B: LONGUES / COURTES / ALTERNANCE ===
    n_long = sum(1 for l in sent_lens if l > LONG_SENT_THRESHOLD)
    n_short = sum(1 for l in sent_lens if l < SHORT_SENT_THRESHOLD)
    f26b = n_long / ns  # long_sent_rate
    f17 = sum(1 for l in sent_lens if l <= KNIFE_THRESHOLD)  # knife_count
    knife_rate = f17 / ns

    # Transitions
    t_lc = 0  # Long->Court
    t_cl = 0  # Court->Long
    for i in range(ns - 1):
        if sent_lens[i] > TRANS_LONG and sent_lens[i+1] < TRANS_SHORT:
            t_lc += 1
        if sent_lens[i] < TRANS_SHORT and sent_lens[i+1] > TRANS_LONG:
            t_cl += 1
    ratio_alt = (t_lc + t_cl) / ns if ns > 0 else 0

    # Longest/shortest runs
    longest_run_long = 0
    longest_run_short = 0
    curr_long = 0
    curr_short = 0
    for l in sent_lens:
        if l > LONG_SENT_THRESHOLD:
            curr_long += 1
            longest_run_long = max(longest_run_long, curr_long)
            curr_short = 0
        elif l < SHORT_SENT_THRESHOLD:
            curr_short += 1
            longest_run_short = max(longest_run_short, curr_short)
            curr_long = 0
        else:
            curr_long = 0
            curr_short = 0

    # === FAMILLE C: LEXICAL ===
    clean_words = [re.sub(r'[.,;:!?\"\'\(\)\[\]\u00ab\u00bb\u2014\u2013]', '', w.lower())
                   for w in words_list if len(w) > 1]
    clean_words = [w for w in clean_words if w and w not in STOP_FR]

    # TTR (Type-Token Ratio)
    if len(clean_words) >= 100:
        W = 100
        ttrs = []
        for i in range(0, len(clean_words) - W + 1, 50):
            window = clean_words[i:i+W]
            ttrs.append(len(set(window)) / W)
        ttr_mean = np.mean(ttrs) if ttrs else 0
        ttr_std = np.std(ttrs, ddof=1) if len(ttrs) > 1 else 0
        f29d = min(ttr_mean / 0.80, 1) * 0.7 + min(ttr_std * 5, 1) * 0.3
    else:
        unique = len(set(clean_words))
        f29d = unique / max(len(clean_words), 1) if clean_words else 0

    # Bigram rarity
    bigrams = [f"{clean_words[i]}_{clean_words[i+1]}" for i in range(len(clean_words)-1)]
    if bigrams:
        unique_bg = len(set(bigrams))
        f16a = unique_bg / len(bigrams)
    else:
        f16a = 0

    # === FAMILLE D: SYNTAX (regex-based proxy) ===
    tl = text.lower()
    sub_count = sum(1 for s in sents for w in s.lower().split()
                    if re.sub(r'[.,;:!?]', '', w) in ALL_SUB)
    sub_per_sent = sub_count / ns

    # === FAMILLE E: PUNCTUATION ===
    n_dash = text.count('\u2014') + text.count('\u2013') + text.count(' - ')
    n_colon = text.count(':')
    n_semicolon = text.count(';')
    n_excl = text.count('!')
    n_quest = text.count('?')
    n_ellipsis = text.count('...') + text.count('\u2026')
    n_quotes = text.count('\u00ab') + text.count('\u00bb') + text.count('"')

    # Dialogue detection (rough)
    dialogue_markers = text.count('\u00ab') + text.count('\u2014 ') + text.count('"')
    dialogue_ratio = dialogue_markers / ns if ns > 0 else 0

    # === FAMILLE F: HOOKS / CLIFFS (proxy from text) ===
    hook_sents = split_sentences(' '.join(words_list[:100]))
    if hook_sents:
        hook_mean = np.mean([len(s.split()) for s in hook_sents])
        hook_q = 0.3 if any(s.strip().endswith('?') for s in hook_sents) else 0
        hook_e = 0.2 if any(s.strip().endswith('!') for s in hook_sents) else 0
        f35c = min(1, 20 / max(hook_mean, 1)) * 0.5 + hook_q + hook_e
    else:
        f35c = 0

    cliff_sents = split_sentences(' '.join(words_list[-100:]))
    if cliff_sents:
        ls = cliff_sents[-1].strip()
        cliff_mean = np.mean([len(s.split()) for s in cliff_sents])
        cliff_ell = 0.3 if (ls.endswith('...') or ls.endswith('\u2026')) else 0
        cliff_open = 0.2 if ls[-1:] not in '.!?\u2026' else 0
        f36c = min(1, 20 / max(cliff_mean, 1)) * 0.5 + cliff_ell + cliff_open
    else:
        f36c = 0

    # Adversative rate
    adv_count = sum(count_occ(tl, m) for m in ADVERSATIVE)
    f9a = adv_count / ns

    # Long sentence subordination proxy
    if ns >= 4:
        ms = sub_per_sent
        lr = f26b
        f26c = min(ms / 6, 1) * 0.6 + lr * 0.4  # period_score
    else:
        f26c = 0

    # Contrast delta
    if ns >= 10:
        sl = sorted(sent_lens)
        n_sl = len(sl)
        top_q = [l for l in sent_lens if l >= sl[3 * n_sl // 4]]
        bot_q = [l for l in sent_lens if l <= sl[n_sl // 4]]
        f24c = np.mean(top_q) - np.mean(bot_q) if top_q and bot_q else 0
    else:
        f24c = 0

    # Approx entropy (CV of sentence lengths)
    f19a = min(cv_sent, 2.0)

    return {
        # Famille A
        'words': total_words,
        'sentence_count': ns,
        'paragraph_count': np_count,
        'mean_sent_len': round(float(mean_sent), 3),
        'median_sent_len': round(float(median_sent), 3),
        'std_sent_len': round(float(std_sent), 3),
        'cv_sent': round(float(cv_sent), 4),
        'mean_para_len': round(float(mean_para), 3),
        'std_para_len': round(float(std_para), 3),
        'cv_para': round(float(cv_para), 4),
        'f1_mean': round(float(mean_sent), 3),
        'f1a_rhythm_variance': round(float(f1a), 3),
        'f1b_rhythm_ratio': round(float(f1b), 3),
        'range_sent_len': int(range_sent),
        # Famille B
        'f26b_long_sent_rate': round(float(f26b), 4),
        'f17_knife_count': int(f17),
        'knife_rate': round(float(knife_rate), 4),
        'n_long_sentences': int(n_long),
        'n_short_sentences': int(n_short),
        'T_LC': int(t_lc),
        'T_CL': int(t_cl),
        'ratio_alt': round(float(ratio_alt), 4),
        'longest_sent_words': int(max(sent_lens)) if sent_lens else 0,
        'shortest_sent_words': int(min(sent_lens)) if sent_lens else 0,
        'longest_run_long': int(longest_run_long),
        'longest_run_short': int(longest_run_short),
        # Famille C
        'f29d_ttr_score': round(float(f29d), 4),
        'f16a_bigram_rarity': round(float(f16a), 4),
        # Famille D
        'sub_per_sentence': round(float(sub_per_sent), 3),
        # Famille E
        'dash_count': n_dash,
        'colon_count': n_colon,
        'semicolon_count': n_semicolon,
        'excl_count': n_excl,
        'quest_count': n_quest,
        'ellipsis_count': n_ellipsis,
        'dialogue_ratio': round(float(dialogue_ratio), 4),
        # Famille F/G (proxies)
        'f35c_hook_score': round(float(f35c), 4),
        'f36c_cliff_score': round(float(f36c), 4),
        'f9a_contradiction_rate': round(float(f9a), 3),
        'f26c_period_score': round(float(f26c), 4),
        'f24c_contrast_delta': round(float(f24c), 3),
        'f19a_approx_entropy': round(float(f19a), 4),
    }

# Features that are NOT available without NLP/API
UNAVAILABLE_FEATURES = [
    'sensory_richness', 'corporeal_anchoring', 'focalisation',
    'attention_sustain', 'fatigue_management', 'metaphor_novelty',
    'anti_cliche', 'f22f_literary_index', 'f25g_description_score',
    'f25b_sensory_coverage', 'f20d_composite_fg', 'f27d_modal_score',
    'f28d_sil_score', 'f38c_speed_score', 'f30d_ps_imp_ratio',
    'f12b_tense_switch_rate', 'f19b_shannon_entropy',
    'tension_14d', 'emotion_coherence',
]

FEATURE_KEYS = [
    'words', 'sentence_count', 'paragraph_count',
    'mean_sent_len', 'median_sent_len', 'std_sent_len', 'cv_sent',
    'mean_para_len', 'std_para_len', 'cv_para',
    'f1_mean', 'f1a_rhythm_variance', 'f1b_rhythm_ratio', 'range_sent_len',
    'f26b_long_sent_rate', 'f17_knife_count', 'knife_rate',
    'n_long_sentences', 'n_short_sentences',
    'T_LC', 'T_CL', 'ratio_alt',
    'longest_sent_words', 'shortest_sent_words',
    'longest_run_long', 'longest_run_short',
    'f29d_ttr_score', 'f16a_bigram_rarity',
    'sub_per_sentence',
    'dash_count', 'colon_count', 'semicolon_count',
    'excl_count', 'quest_count', 'ellipsis_count', 'dialogue_ratio',
    'f35c_hook_score', 'f36c_cliff_score',
    'f9a_contradiction_rate', 'f26c_period_score',
    'f24c_contrast_delta', 'f19a_approx_entropy',
]

# Key features for statistical analysis
STAT_FEATURES = [
    'mean_sent_len', 'cv_sent', 'f1a_rhythm_variance', 'f1b_rhythm_ratio',
    'f26b_long_sent_rate', 'f17_knife_count', 'knife_rate', 'ratio_alt',
    'f29d_ttr_score', 'f16a_bigram_rarity', 'sub_per_sentence',
    'dialogue_ratio', 'f35c_hook_score', 'f36c_cliff_score',
    'f24c_contrast_delta', 'f19a_approx_entropy', 'cv_para',
]

# ============================================================
# PHASE 1: LOAD CORPUS + TIERS
# ============================================================
print("\n[PHASE 1] Loading corpus and tiers...")

# Load tiers
with open(TIERS_FILE, encoding='utf-8') as f:
    master = json.load(f)

tier_map = {}  # filename.txt -> tier
lang_map = {}
for m in master:
    fn = m['filename']
    tier_map[fn] = m.get('tier', 'X')
    lang_map[fn] = m.get('language', 'unknown')

print(f"  Tiers loaded: {len(tier_map)} works")
tier_dist = defaultdict(int)
for t in tier_map.values():
    tier_dist[t] += 1
print(f"  Distribution: {dict(tier_dist)}")

# Scan text files
txt_files = sorted([f for f in os.listdir(TXT_DIR) if f.endswith('.txt')])
print(f"  Text files found: {len(txt_files)}")

# ============================================================
# PHASE 2: EXTRACT CHAPTERS + MEASURE
# ============================================================
print(f"\n[PHASE 2] Extracting chapters and computing features...")

all_windows = []  # list of dicts for CSV
inventory = []
chapter_manifest = []

t_start = time.time()
books_ok = 0
books_no_chapters = 0
books_too_short = 0
books_error = 0
total_chapters = 0
total_windows = 0
na_counts = defaultdict(lambda: defaultdict(int))  # feature -> size -> count NA

for fi, txt_file in enumerate(txt_files):
    if fi % 50 == 0:
        elapsed = time.time() - t_start
        print(f"  [{fi}/{len(txt_files)}] {elapsed:.0f}s elapsed...")

    fpath = os.path.join(TXT_DIR, txt_file)
    tier = tier_map.get(txt_file, 'X')
    lang = lang_map.get(txt_file, 'unknown')

    try:
        with open(fpath, encoding='utf-8', errors='replace') as f:
            raw_text = f.read()
    except Exception as e:
        inventory.append({
            'filename': txt_file, 'tier': tier, 'lang': lang,
            'status': 'ERROR_READ', 'reason': str(e),
            'word_count': 0, 'chapters': 0,
        })
        books_error += 1
        continue

    total_words = len(raw_text.split())

    if total_words < MIN_CHAPTER_WORDS:
        inventory.append({
            'filename': txt_file, 'tier': tier, 'lang': lang,
            'status': 'TOO_SHORT', 'reason': f'{total_words} words',
            'word_count': total_words, 'chapters': 0,
        })
        books_too_short += 1
        continue

    # Try to split chapters
    chapters = split_chapters(raw_text)

    if chapters is None or len(chapters) < 2:
        # No chapter structure — treat whole text as 1 chapter
        cleaned = clean_gutenberg(raw_text)
        cleaned = re.sub(r'OceanofPDF\.com', '', cleaned).strip()
        ch_words = len(cleaned.split())
        if ch_words >= MIN_CHAPTER_WORDS:
            chapters = [("FULL_TEXT", cleaned, ch_words)]
            has_chapters = False
        else:
            inventory.append({
                'filename': txt_file, 'tier': tier, 'lang': lang,
                'status': 'NO_CONTENT', 'reason': f'cleaned={ch_words}w',
                'word_count': total_words, 'chapters': 0,
            })
            books_no_chapters += 1
            continue
    else:
        has_chapters = True

    inventory.append({
        'filename': txt_file, 'tier': tier, 'lang': lang,
        'status': 'OK' if has_chapters else 'NO_CHAPTER_STRUCTURE',
        'reason': f'{len(chapters)} chapters' if has_chapters else 'whole text as 1 chapter',
        'word_count': total_words, 'chapters': len(chapters),
    })
    books_ok += 1

    for ch_idx, (ch_title, ch_text, ch_wc) in enumerate(chapters):
        total_chapters += 1

        chapter_manifest.append({
            'filename': txt_file,
            'tier': tier,
            'lang': lang,
            'chapter_idx': ch_idx,
            'chapter_title': ch_title[:50],
            'chapter_words': ch_wc,
            'has_chapter_structure': has_chapters,
        })

        ch_words_list = ch_text.split()

        # Compute on FULL chapter
        feats_full = compute_features(ch_text)
        if feats_full:
            row = {
                'filename': txt_file, 'tier': tier, 'lang': lang,
                'chapter_idx': ch_idx, 'window_size': 'full',
                'window_type': 'FULL_CHAPTER',
                'window_start': 0, 'window_end': ch_wc,
                'p_rel': 0.5,
            }
            row.update(feats_full)
            all_windows.append(row)
            total_windows += 1

        # Compute on fixed windows
        for wsize in WINDOW_SIZES:
            if ch_wc < wsize:
                # Log NA
                for feat in STAT_FEATURES:
                    na_counts[feat][wsize] += 1
                continue

            stride = max(int(wsize * STRIDE_RATIO), MIN_STRIDE)

            # Sliding windows
            n_windows_this = 0
            for start in range(0, ch_wc - wsize + 1, stride):
                window_text = ' '.join(ch_words_list[start:start + wsize])
                p_rel = (start + wsize / 2) / ch_wc if ch_wc > 0 else 0.5

                feats = compute_features(window_text)
                if feats:
                    row = {
                        'filename': txt_file, 'tier': tier, 'lang': lang,
                        'chapter_idx': ch_idx, 'window_size': wsize,
                        'window_type': 'SLIDING',
                        'window_start': start, 'window_end': start + wsize,
                        'p_rel': round(p_rel, 4),
                    }
                    row.update(feats)
                    all_windows.append(row)
                    total_windows += 1
                    n_windows_this += 1

                # Limit sliding windows per chapter/size to avoid explosion
                if n_windows_this >= 20:
                    break

            # Anchored windows: START, MIDDLE, END
            for anchor, anchor_start in [
                ('START', 0),
                ('MIDDLE', max(0, (ch_wc - wsize) // 2)),
                ('END', max(0, ch_wc - wsize)),
            ]:
                if ch_wc < wsize:
                    continue
                window_text = ' '.join(ch_words_list[anchor_start:anchor_start + wsize])
                p_rel_a = (anchor_start + wsize / 2) / ch_wc if ch_wc > 0 else 0.5

                feats = compute_features(window_text)
                if feats:
                    row = {
                        'filename': txt_file, 'tier': tier, 'lang': lang,
                        'chapter_idx': ch_idx, 'window_size': wsize,
                        'window_type': anchor,
                        'window_start': anchor_start, 'window_end': anchor_start + wsize,
                        'p_rel': round(p_rel_a, 4),
                    }
                    row.update(feats)
                    all_windows.append(row)
                    total_windows += 1

elapsed = time.time() - t_start
print(f"\n  DONE in {elapsed:.0f}s")
print(f"  Books OK: {books_ok}")
print(f"  Books no chapters: {books_no_chapters}")
print(f"  Books too short: {books_too_short}")
print(f"  Books error: {books_error}")
print(f"  Total chapters: {total_chapters}")
print(f"  Total windows: {total_windows}")

# ============================================================
# SAVE RAW DATA
# ============================================================
print(f"\n[SAVING] Raw data...")

os.makedirs(OUT_DIR, exist_ok=True)

# 1. MASTER_CORPUS_INVENTORY.json
inv_path = f"{OUT_DIR}/MASTER_CORPUS_INVENTORY.json"
with open(inv_path, 'w', encoding='utf-8') as f:
    json.dump({'generated': '2026-03-27', 'total_files': len(txt_files),
               'books_ok': books_ok, 'books_no_chapters': books_no_chapters,
               'books_too_short': books_too_short, 'books_error': books_error,
               'inventory': inventory}, f, indent=2, ensure_ascii=False)
print(f"  Saved: {inv_path}")

# 2. MASTER_CHAPTER_MANIFEST.csv
manifest_path = f"{OUT_DIR}/MASTER_CHAPTER_MANIFEST.csv"
if chapter_manifest:
    with open(manifest_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=chapter_manifest[0].keys())
        w.writeheader()
        w.writerows(chapter_manifest)
    print(f"  Saved: {manifest_path}")

# 3. MASTER_RAW_WINDOWS.csv
csv_path = f"{OUT_DIR}/MASTER_RAW_WINDOWS.csv"
if all_windows:
    fieldnames = list(all_windows[0].keys())
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(all_windows)
    print(f"  Saved: {csv_path} ({len(all_windows)} rows)")

# ============================================================
# PHASE 5-6: STATISTICAL ANALYSIS
# ============================================================
print(f"\n[PHASE 5-6] Statistical analysis...")

def compute_stats(values):
    if not values:
        return None
    arr = np.array(values, dtype=float)
    arr = arr[np.isfinite(arr)]
    n = len(arr)
    if n < 2:
        return None
    mu = float(np.mean(arr))
    std = float(np.std(arr, ddof=1))
    cv = std / abs(mu) if abs(mu) > 1e-10 else float('inf')
    return {
        'n': n, 'mean': round(mu, 6), 'median': round(float(np.median(arr)), 6),
        'std': round(std, 6), 'cv': round(cv, 4),
        'min': round(float(np.min(arr)), 6), 'max': round(float(np.max(arr)), 6),
        'p10': round(float(np.percentile(arr, 10)), 6),
        'p25': round(float(np.percentile(arr, 25)), 6),
        'p50': round(float(np.percentile(arr, 50)), 6),
        'p75': round(float(np.percentile(arr, 75)), 6),
        'p90': round(float(np.percentile(arr, 90)), 6),
        'iqr': round(float(np.percentile(arr, 75) - np.percentile(arr, 25)), 6),
    }

# Group windows by size
windows_by_size = defaultdict(list)
for w in all_windows:
    ws = w['window_size']
    if w['window_type'] == 'SLIDING' or w['window_type'] == 'FULL_CHAPTER':
        windows_by_size[ws].append(w)

sizes_present = sorted([s for s in windows_by_size.keys() if isinstance(s, int)]) + ['full']

# Stats by feature x size x tier
print(f"\n  --- Stats by feature x size ---")
summary_by_size = {}
for sz in sizes_present:
    wins = windows_by_size.get(sz, [])
    if not wins:
        continue
    summary_by_size[str(sz)] = {'n_windows': len(wins), 'features': {}}

    for feat in STAT_FEATURES:
        vals = [w[feat] for w in wins if feat in w and w[feat] is not None]
        s = compute_stats(vals)
        if s:
            summary_by_size[str(sz)]['features'][feat] = s

# Print key table
print(f"\n{'Feature':<22} | {'200':>8} | {'500':>8} | {'700':>8} | {'1000':>8} | {'2000':>8} | {'full':>8}")
print("-" * 85)
for feat in ['mean_sent_len', 'cv_sent', 'f26b_long_sent_rate', 'f17_knife_count',
             'ratio_alt', 'f29d_ttr_score', 'f1a_rhythm_variance']:
    row = f"{feat:<22} |"
    for sz in [200, 500, 700, 1000, 2000, 'full']:
        s = summary_by_size.get(str(sz), {}).get('features', {}).get(feat)
        if s:
            row += f" {s['mean']:>7.3f} |"
        else:
            row += f"       - |"
    print(row)

# CV table
print(f"\n{'Feature':<22} | {'CV@200':>8} | {'CV@500':>8} | {'CV@700':>8} | {'CV@1000':>8} | {'CV@2000':>8} | {'CV@full':>8}")
print("-" * 85)
for feat in STAT_FEATURES:
    row = f"{feat:<22} |"
    for sz in [200, 500, 700, 1000, 2000, 'full']:
        s = summary_by_size.get(str(sz), {}).get('features', {}).get(feat)
        if s and s['cv'] < 100:
            row += f" {s['cv']:>7.3f} |"
        else:
            row += f"       - |"
    print(row)

# Stats by tier
print(f"\n  --- Stats by tier (at 500w) ---")
tier_summary = {}
for tier_val in ['S', 'A', 'B', 'C', 'D']:
    wins = [w for w in windows_by_size.get(500, []) if w.get('tier') == tier_val]
    if not wins:
        continue
    tier_summary[tier_val] = {'n': len(wins), 'features': {}}
    for feat in STAT_FEATURES:
        vals = [w[feat] for w in wins if feat in w and w[feat] is not None]
        s = compute_stats(vals)
        if s:
            tier_summary[tier_val]['features'][feat] = s

print(f"\n{'Feature':<22} | {'S':>10} | {'A':>10} | {'B':>10} | {'C':>10} | {'D':>10}")
print("-" * 75)
for feat in ['mean_sent_len', 'cv_sent', 'f26b_long_sent_rate', 'ratio_alt',
             'f29d_ttr_score', 'f1a_rhythm_variance', 'sub_per_sentence']:
    row = f"{feat:<22} |"
    for t in ['S', 'A', 'B', 'C', 'D']:
        s = tier_summary.get(t, {}).get('features', {}).get(feat)
        if s:
            row += f" {s['mean']:>9.3f} |"
        else:
            row += f"         - |"
    print(row)

# ============================================================
# CORRELATIONS BY SIZE
# ============================================================
print(f"\n  --- Correlations by size ---")

CORR_PAIRS = [
    ('f26b_long_sent_rate', 'f17_knife_count'),
    ('f26b_long_sent_rate', 'f1a_rhythm_variance'),
    ('f26b_long_sent_rate', 'cv_sent'),
    ('f26b_long_sent_rate', 'ratio_alt'),
    ('f17_knife_count', 'f1a_rhythm_variance'),
    ('f17_knife_count', 'cv_sent'),
    ('mean_sent_len', 'f26b_long_sent_rate'),
    ('mean_sent_len', 'f1a_rhythm_variance'),
    ('cv_sent', 'f1a_rhythm_variance'),
    ('dialogue_ratio', 'knife_rate'),
    ('f29d_ttr_score', 'f16a_bigram_rarity'),
    ('ratio_alt', 'cv_sent'),
]

correlations_by_size = {}
for sz in sizes_present:
    wins = windows_by_size.get(sz, [])
    if len(wins) < 20:
        continue
    correlations_by_size[str(sz)] = {}
    for fa, fb in CORR_PAIRS:
        va = [w.get(fa) for w in wins]
        vb = [w.get(fb) for w in wins]
        pairs = [(a, b) for a, b in zip(va, vb)
                 if a is not None and b is not None and np.isfinite(a) and np.isfinite(b)]
        if len(pairs) < 10:
            continue
        arr_a = np.array([p[0] for p in pairs])
        arr_b = np.array([p[1] for p in pairs])
        if np.std(arr_a) < 1e-10 or np.std(arr_b) < 1e-10:
            continue
        try:
            sr, sp = sp_stats.spearmanr(arr_a, arr_b)
            pr, pp = sp_stats.pearsonr(arr_a, arr_b)
            correlations_by_size[str(sz)][f"{fa}_vs_{fb}"] = {
                'n': len(pairs),
                'spearman_r': round(float(sr), 4),
                'pearson_r': round(float(pr), 4),
            }
        except:
            pass

# Print correlation table
print(f"\n{'Pair':<45} | {'200':>7} | {'500':>7} | {'700':>7} | {'1000':>7} | {'2000':>7} | {'full':>7}")
print("-" * 95)
for fa, fb in CORR_PAIRS:
    key = f"{fa}_vs_{fb}"
    short = f"{fa[:18]} v {fb[:18]}"
    row = f"{short:<45} |"
    for sz in [200, 500, 700, 1000, 2000, 'full']:
        c = correlations_by_size.get(str(sz), {}).get(key)
        if c:
            row += f" {c['spearman_r']:>+.3f} |"
        else:
            row += f"       - |"
    print(row)

# ============================================================
# SAVE ANALYSIS OUTPUTS
# ============================================================
print(f"\n[SAVING] Analysis outputs...")

# Summary by size
sum_csv = f"{OUT_DIR}/MASTER_RAW_SUMMARY_BY_SIZE.csv"
rows_sum = []
for sz in sizes_present:
    feats = summary_by_size.get(str(sz), {}).get('features', {})
    for feat, stats in feats.items():
        rows_sum.append({'size': sz, 'feature': feat, **stats})
if rows_sum:
    with open(sum_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=rows_sum[0].keys())
        w.writeheader()
        w.writerows(rows_sum)
    print(f"  Saved: {sum_csv}")

# Summary by tier
tier_csv = f"{OUT_DIR}/MASTER_RAW_SUMMARY_BY_TIER.csv"
rows_tier = []
for tier_val, tdata in tier_summary.items():
    for feat, stats in tdata.get('features', {}).items():
        rows_tier.append({'tier': tier_val, 'n_windows': tdata['n'], 'feature': feat, **stats})
if rows_tier:
    with open(tier_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=rows_tier[0].keys())
        w.writeheader()
        w.writerows(rows_tier)
    print(f"  Saved: {tier_csv}")

# Correlations
corr_path = f"{OUT_DIR}/MASTER_RAW_CORRELATIONS_BY_SIZE.json"
with open(corr_path, 'w', encoding='utf-8') as f:
    json.dump({'generated': '2026-03-27', 'correlations': correlations_by_size}, f, indent=2)
print(f"  Saved: {corr_path}")

# Coverage
coverage = {
    'generated': '2026-03-27',
    'total_txt_files': len(txt_files),
    'books_ok': books_ok,
    'books_no_chapters': books_no_chapters,
    'books_too_short': books_too_short,
    'books_error': books_error,
    'total_chapters': total_chapters,
    'total_windows': total_windows,
    'windows_per_size': {str(s): len(windows_by_size.get(s, [])) for s in sizes_present},
    'na_counts': {f: dict(v) for f, v in na_counts.items()},
    'thresholds': {
        'LONG_SENT_THRESHOLD': LONG_SENT_THRESHOLD,
        'SHORT_SENT_THRESHOLD': SHORT_SENT_THRESHOLD,
        'KNIFE_THRESHOLD': KNIFE_THRESHOLD,
        'TRANS_LONG': TRANS_LONG,
        'TRANS_SHORT': TRANS_SHORT,
        'MIN_CHAPTER_WORDS': MIN_CHAPTER_WORDS,
    },
    'unavailable_features': UNAVAILABLE_FEATURES,
}
cov_path = f"{OUT_DIR}/MASTER_RAW_COVERAGE.json"
with open(cov_path, 'w', encoding='utf-8') as f:
    json.dump(coverage, f, indent=2, ensure_ascii=False)
print(f"  Saved: {cov_path}")

# Size gating
gating = {}
for feat in STAT_FEATURES:
    feat_gating = {}
    for sz in [200, 500, 700, 1000, 2000]:
        s = summary_by_size.get(str(sz), {}).get('features', {}).get(feat)
        if s:
            feat_gating[str(sz)] = {
                'cv': s['cv'],
                'n': s['n'],
                'reliable': s['cv'] < 0.50,
            }

    # Find min reliable size
    min_reliable = None
    for sz in [200, 500, 700, 1000, 2000]:
        if feat_gating.get(str(sz), {}).get('reliable', False):
            min_reliable = sz
            break

    gating[feat] = {
        'by_size': feat_gating,
        'min_reliable_size': min_reliable,
    }

gating_path = f"{OUT_DIR}/MASTER_RAW_SIZE_GATING.json"
with open(gating_path, 'w', encoding='utf-8') as f:
    json.dump({'generated': '2026-03-27', 'gating': gating}, f, indent=2)
print(f"  Saved: {gating_path}")

# ============================================================
# PHASE 9: EQUATIONS
# ============================================================
print(f"\n[PHASE 9] Regression equations...")

equations = {}
for feat in STAT_FEATURES:
    sizes_num = []
    means = []
    cvs = []
    for sz in [200, 500, 700, 1000, 2000]:
        s = summary_by_size.get(str(sz), {}).get('features', {}).get(feat)
        if s and s['n'] >= 20:
            sizes_num.append(sz)
            means.append(s['mean'])
            cvs.append(s['cv'])

    if len(sizes_num) < 3:
        equations[feat] = {'status': 'INSUFFICIENT_DATA', 'n_points': len(sizes_num)}
        continue

    x = np.array(sizes_num, dtype=float)
    y_mean = np.array(means, dtype=float)
    y_cv = np.array(cvs, dtype=float)

    # Try linear: y = a*x + b
    try:
        slope_m, intercept_m, r_m, p_m, se_m = sp_stats.linregress(x, y_mean)
        slope_c, intercept_c, r_c, p_c, se_c = sp_stats.linregress(x, y_cv)
    except:
        equations[feat] = {'status': 'REGRESSION_ERROR'}
        continue

    # Try log: y = a*log(x) + b
    log_x = np.log(x)
    try:
        slope_ml, intercept_ml, r_ml, p_ml, _ = sp_stats.linregress(log_x, y_mean)
        slope_cl, intercept_cl, r_cl, p_cl, _ = sp_stats.linregress(log_x, y_cv)
    except:
        r_ml = 0; r_cl = 0

    # Choose best model for mean
    if abs(r_ml) > abs(r_m) + 0.05:
        mean_model = 'LOG'
        mean_eq = f"mean = {slope_ml:.4f} * log(size) + {intercept_ml:.4f}"
        mean_r2 = r_ml ** 2
    elif abs(r_m) > 0.5:
        mean_model = 'LINEAR'
        mean_eq = f"mean = {slope_m:.6f} * size + {intercept_m:.4f}"
        mean_r2 = r_m ** 2
    else:
        mean_model = 'NO_STABLE_EQUATION'
        mean_eq = f"R2_linear={r_m**2:.3f}, R2_log={r_ml**2:.3f}"
        mean_r2 = max(r_m**2, r_ml**2)

    # Choose best model for CV
    if abs(r_cl) > abs(r_c) + 0.05:
        cv_model = 'LOG'
        cv_eq = f"cv = {slope_cl:.4f} * log(size) + {intercept_cl:.4f}"
        cv_r2 = r_cl ** 2
    elif abs(r_c) > 0.5:
        cv_model = 'LINEAR'
        cv_eq = f"cv = {slope_c:.6f} * size + {intercept_c:.4f}"
        cv_r2 = r_c ** 2
    else:
        cv_model = 'NO_STABLE_EQUATION'
        cv_eq = f"R2_linear={r_c**2:.3f}, R2_log={r_cl**2:.3f}"
        cv_r2 = max(r_c**2, r_cl**2)

    equations[feat] = {
        'status': 'OK' if mean_r2 > 0.25 or cv_r2 > 0.25 else 'WEAK',
        'mean_model': mean_model,
        'mean_equation': mean_eq,
        'mean_r2': round(mean_r2, 4),
        'cv_model': cv_model,
        'cv_equation': cv_eq,
        'cv_r2': round(cv_r2, 4),
        'data_points': len(sizes_num),
    }

print(f"\n{'Feature':<22} | {'Mean Model':>12} | {'R2':>6} | {'CV Model':>12} | {'R2':>6}")
print("-" * 75)
for feat in STAT_FEATURES:
    eq = equations.get(feat, {})
    mm = eq.get('mean_model', '-')[:12]
    mr = eq.get('mean_r2', 0)
    cm = eq.get('cv_model', '-')[:12]
    cr = eq.get('cv_r2', 0)
    print(f"{feat:<22} | {mm:>12} | {mr:>5.3f} | {cm:>12} | {cr:>5.3f}")

# ============================================================
# FINAL OUTPUTS
# ============================================================
print(f"\n{'='*80}")
print(f"AUDIT COMPLETE — {total_windows} windows measured on {total_chapters} chapters from {books_ok} books")
print(f"{'='*80}")

# Print window counts
print(f"\nWindows per size:")
for sz in sizes_present:
    print(f"  {str(sz):>6}: {len(windows_by_size.get(sz, [])):>8} windows")

print(f"\nUnavailable features (require NLP/API): {len(UNAVAILABLE_FEATURES)}")
for f in UNAVAILABLE_FEATURES[:5]:
    print(f"  - {f}")
print(f"  ... and {len(UNAVAILABLE_FEATURES)-5} more")
