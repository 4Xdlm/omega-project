import re
import unicodedata

PATCH_MARKER = "# TD-PATH-01-PATCHED"

def windows_safe_slug(s: str, max_len: int = 40) -> str:
    """
    Normalise une chaine en slug valide Windows + POSIX.
    - Décompose les diacritiques (é->e, â->a, etc.)
    - Supprime les caractères interdits Windows: < > : " / \ | ? *
    - Remplace espaces et apostrophes par _
    - Coupe à max_len
    - Anti-vide: retourne 'untitled' si résultat vide
    """
    # 1. NFD decompose + strip combining marks
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    # 2. Forbidden Windows chars
    s = re.sub(r"[<>:\"/\\|?*']", '_', s)
    # 3. Spaces
    s = s.replace(' ', '_')
    # 4. Collapse multiple underscores
    s = re.sub(r'_+', '_', s)
    # 5. Strip leading/trailing underscores and dots
    s = s.strip('_.')
    # 6. Truncate
    s = s[:max_len]
    return s if s else 'untitled'

# ── Tests unitaires ────────────────────────────────────────────────────────
TESTS = [
    # (input, expected_contains_not, description)
    ("Quoi ? L'Éternité", ["?", "'", "é"], "Quoi? apostrophe accent"),
    ("Alexis / Le Coup de grâce", ["/", "â"], "Alexis slash accent"),
    ("Blood Meridian", [], "Normal title"),
    ("La Route des Flandres", [], "FR normal"),
    ("", [], "Empty string -> untitled"),
    ("???***///", ["?", "*", "/"], "All forbidden chars"),
]

print("=" * 60)
print("TD-PATH-01 — windows_safe_slug() — TESTS")
print("=" * 60)
all_pass = True
for title, forbidden_chars, desc in TESTS:
    result = windows_safe_slug(title, 20)
    fails = [c for c in forbidden_chars if c in result]
    status = "PASS" if not fails else f"FAIL — chars {fails} present"
    if fails:
        all_pass = False
    print(f"  [{status}] {desc!r}")
    print(f"    input:  {title!r}")
    print(f"    output: {result!r}")

# Anti-collision test
slug1 = windows_safe_slug("Quoi ? L'Éternité", 15)
slug2 = windows_safe_slug("Quoi _ L Eternite", 15)
print(f"\n  [INFO] Collision check: {slug1!r} == {slug2!r} → {'COLLISION' if slug1==slug2 else 'DISTINCT'}")

print()
if all_pass:
    print("VERDICT: PASS — windows_safe_slug() opérationnelle")
else:
    print("VERDICT: FAIL — corriger la fonction")
    raise SystemExit(1)

# ── Patch full_work_analyzer_v4.py ────────────────────────────────────────
import pathlib, shutil

TARGET = pathlib.Path(r"C:\Users\elric\omega-project\omega-autopsie\full_work_analyzer_v4.py")

content = TARGET.read_text(encoding="utf-8")

if PATCH_MARKER in content:
    print(f"\nPatch déjà appliqué ({PATCH_MARKER}) — skip")
else:
    OLD = "        fname = f\"{title[:15].replace(' ','_')}_{ex['type']}.txt\""
    NEW = (
        f"        # {PATCH_MARKER}\n"
        "        fname = f\"{windows_safe_slug(title, 20)}_{ex['type']}.txt\""
    )
    if OLD not in content:
        print(f"\nERROR: Ligne cible introuvable dans {TARGET}")
        raise SystemExit(1)

    # Inject windows_safe_slug function après les imports (avant CATALOG_PUBLIC)
    FUNC_INJECT_AFTER = "log = logging.getLogger(\"omega_v4\")"
    FUNC_CODE = '''

# ── TD-PATH-01: Windows-safe slug ─────────────────────────────────────────
import unicodedata as _ud

def windows_safe_slug(s: str, max_len: int = 40) -> str:
    """Normalise en slug valide Windows. Interdit: < > : " / \\\\ | ? * '"""
    s = _ud.normalize('NFD', s)
    s = ''.join(c for c in s if _ud.category(c) != 'Mn')
    s = re.sub(r'[<>:"/\\\\|?*\\\']+', '_', s)
    s = s.replace(' ', '_')
    s = re.sub(r'_+', '_', s).strip('_.')
    return s[:max_len] if s.strip('_.') else 'untitled'
'''

    if FUNC_INJECT_AFTER not in content:
        print(f"ERROR: Anchor not found: {FUNC_INJECT_AFTER!r}")
        raise SystemExit(1)

    content = content.replace(FUNC_INJECT_AFTER, FUNC_INJECT_AFTER + FUNC_CODE)
    content = content.replace(OLD, NEW)

    # Backup
    shutil.copy(TARGET, str(TARGET) + ".bak_td_path01")
    TARGET.write_text(content, encoding="utf-8")
    print(f"\nPatch appliqué → {TARGET.name}")
    print(f"Backup → {TARGET.name}.bak_td_path01")
    print("VERDICT: PASS")
