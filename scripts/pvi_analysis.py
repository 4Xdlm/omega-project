import math

# =============================================================================
# PVI ANALYSIS — 20 TITLES
# =============================================================================

titles = [
    # GROUPE A — Bestsellers organiques
    # [Title, Author, I, T, N_rev, S, FL, MS, Omega, U, DR, LP, Q_prose_est, Ventes_rank]
    ["Gone Girl", "Gillian Flynn", 0.78, 0.82, 4, 0.85, 0.20, 0.72, 0.75, 0.90, 0.15, 0.25, 68, 3],
    ["It Ends With Us", "Colleen Hoover", 0.85, 0.75, 2, 0.55, 0.12, 0.55, 0.80, 0.65, 0.10, 0.15, 45, 2],
    ["50 Nuances de Grey", "EL James", 0.80, 0.72, 2, 0.45, 0.10, 0.40, 0.65, 0.70, 0.08, 0.15, 32, 1],
    ["Millenium 1", "Stieg Larsson", 0.75, 0.80, 4, 0.78, 0.30, 0.65, 0.82, 0.92, 0.25, 0.35, 62, 2],
    ["L Amie prodigieuse", "Elena Ferrante", 0.82, 0.78, 2, 0.55, 0.22, 0.75, 0.70, 0.85, 0.20, 0.30, 72, 5],
    ["We Need Talk Kevin", "Lionel Shriver", 0.72, 0.75, 3, 0.70, 0.35, 0.78, 0.85, 0.88, 0.30, 0.40, 78, 9],
    ["The Secret History", "Donna Tartt", 0.70, 0.82, 3, 0.65, 0.35, 0.82, 0.72, 0.80, 0.35, 0.38, 80, 6],
    ["Norwegian Wood", "Haruki Murakami", 0.78, 0.80, 2, 0.45, 0.18, 0.78, 0.68, 0.72, 0.15, 0.22, 75, 5],
    ["Americanah", "C.N. Adichie", 0.75, 0.72, 2, 0.50, 0.28, 0.75, 0.65, 0.78, 0.25, 0.30, 76, 10],
    ["Maison flamme/ombre", "Sarah J. Maas", 0.82, 0.78, 4, 0.65, 0.20, 0.55, 0.72, 0.68, 0.18, 0.22, 48, 7],

    # GROUPE B — Chefs d oeuvre
    ["Du cote chez Swann", "Marcel Proust", 0.40, 0.65, 1, 0.30, 0.72, 0.92, 0.35, 0.70, 0.65, 0.90, 92, None],
    ["Madame Bovary", "Gustave Flaubert", 0.60, 0.70, 3, 0.50, 0.45, 0.90, 0.72, 0.82, 0.35, 0.50, 90, None],
    ["L Amant", "Marguerite Duras", 0.65, 0.72, 2, 0.45, 0.40, 0.88, 0.55, 0.75, 0.30, 0.35, 91, None],
    ["L Etranger", "Albert Camus", 0.55, 0.68, 2, 0.60, 0.18, 0.82, 0.62, 0.85, 0.20, 0.15, 88, None],
    ["Blood Meridian", "Cormac McCarthy", 0.35, 0.75, 1, 0.55, 0.60, 0.90, 0.40, 0.88, 0.45, 0.55, 90, None],
    ["Mrs Dalloway", "Virginia Woolf", 0.50, 0.72, 1, 0.40, 0.48, 0.92, 0.52, 0.70, 0.40, 0.55, 89, None],
    ["Molloy", "Samuel Beckett", 0.25, 0.45, 1, 0.40, 0.70, 0.88, 0.20, 0.75, 0.55, 0.65, 93, None],
    ["Insoutenable Legerete", "Milan Kundera", 0.58, 0.62, 2, 0.50, 0.42, 0.78, 0.60, 0.78, 0.45, 0.40, 85, None],
    ["La Nausee", "Jean-Paul Sartre", 0.42, 0.55, 1, 0.35, 0.50, 0.72, 0.40, 0.70, 0.50, 0.45, 83, None],
    ["Voyage bout nuit", "Celine", 0.55, 0.72, 3, 0.55, 0.55, 0.85, 0.38, 0.78, 0.35, 0.45, 88, None],
]

results = []

for t in titles:
    name, author = t[0], t[1]
    I, T, N_rev, S, FL, MS, Omega, U, DR, LP, Q_prose, ventes_rank = t[2:]

    E_emo = 0.40*I + 0.28*T + 0.17*S + 0.15*I*T
    E_cog = 0.40*FL + 0.25*FL*(1-MS) + 0.20*DR + 0.15*LP

    CE = E_emo / E_cog if E_cog > 0 else 999

    if N_rev < 2:
        Arc_rev = 0.50
    elif N_rev == 2:
        Arc_rev = 1.00
    else:
        Arc_rev = 1.20

    A_score = Arc_rev
    R_exp = 1.2*T + 1.5*I + 1.0*A_score - 2.5
    R = 1 / (1 + math.exp(-R_exp))

    W_exp = 1.8*I + 2.0*Omega + 0.8*U - 2.8
    W = 1 / (1 + math.exp(-W_exp))

    PVI = CE * Arc_rev * R * W
    SP = PVI * 20

    goulots = []
    if I < 0.55: goulots.append("GOULOT-I")
    if Omega < 0.45: goulots.append("GOULOT-O")
    if FL > 0.65: goulots.append("GOULOT-FL")
    if R < 0.50: goulots.append("PVI=0(R)")
    if W < 0.50: goulots.append("W<0.50")
    if N_rev < 2: goulots.append("GOULOT-ARC")

    I_Omega = I * Omega
    MS_1FL = MS * (1 - FL)

    idx = titles.index(t)
    results.append({
        'name': name, 'author': author,
        'I': I, 'T': T, 'N_rev': N_rev, 'S': S,
        'FL': FL, 'MS': MS, 'Omega': Omega, 'U': U,
        'DR': DR, 'LP': LP,
        'E_emo': E_emo, 'E_cog': E_cog,
        'CE': CE, 'Arc_rev': Arc_rev,
        'R': R, 'W': W,
        'PVI': PVI, 'SP': SP,
        'Q_prose': Q_prose, 'ventes_rank': ventes_rank,
        'goulots': goulots,
        'I_Omega': I_Omega,
        'MS_1FL': MS_1FL,
        'group': 'A' if idx < 10 else 'B'
    })

# =============================================================================
# PRINT FULL TABLE
# =============================================================================
print("=" * 180)
print("TABLEAU COMPARATIF PVI - 20 TITRES")
print("=" * 180)

header = "{:>2} {:<25} {:<18} {:>5} {:>5} {:>5} {:>5} {:>5} {:>5} {:>5} {:>5} {:>6} {:>5} {:>5} {:>5} {:>7} {:>6} {}".format(
    "#", "Titre", "Auteur", "I", "T", "A(N)", "S", "FL", "MS", "O", "U", "CE", "R", "W", "Arc", "PVI", "SP", "Phase")
print(header)
print("-" * 180)

for i, r in enumerate(results):
    phase_str = " | ".join(r['goulots']) if r['goulots'] else "OK"
    line = "{:>2} {:<25} {:<18} {:>5.2f} {:>5.2f} {:>5d} {:>5.2f} {:>5.2f} {:>5.2f} {:>5.2f} {:>5.2f} {:>6.2f} {:>5.2f} {:>5.2f} {:>5.2f} {:>7.3f} {:>6.1f} {}".format(
        i+1, r['name'], r['author'],
        r['I'], r['T'], r['N_rev'], r['S'], r['FL'], r['MS'], r['Omega'], r['U'],
        r['CE'], r['R'], r['W'], r['Arc_rev'], r['PVI'], r['SP'], phase_str)
    print(line)

# =============================================================================
# DETAILED CALCULATIONS - 3 titles
# =============================================================================
print("\n" + "=" * 120)
print("CALCULS DETAILLES - 3 titres representatifs")
print("=" * 120)

for idx in [0, 10, 5]:  # Gone Girl, Proust, Kevin
    r = results[idx]
    print("\n--- {} ({}) ---".format(r['name'], r['author']))
    print("  Variables: I={}, T={}, N_rev={}, S={}, FL={}, MS={}, O={}, U={}, DR={}, LP={}".format(
        r['I'], r['T'], r['N_rev'], r['S'], r['FL'], r['MS'], r['Omega'], r['U'], r['DR'], r['LP']))
    print("  E_emo = 0.40x{} + 0.28x{} + 0.17x{} + 0.15x{}x{}".format(
        r['I'], r['T'], r['S'], r['I'], r['T']))
    print("        = {:.4f} + {:.4f} + {:.4f} + {:.4f} = {:.4f}".format(
        0.40*r['I'], 0.28*r['T'], 0.17*r['S'], 0.15*r['I']*r['T'], r['E_emo']))
    print("  E_cog = 0.40x{} + 0.25x{}x(1-{}) + 0.20x{} + 0.15x{}".format(
        r['FL'], r['FL'], r['MS'], r['DR'], r['LP']))
    print("        = {:.4f} + {:.4f} + {:.4f} + {:.4f} = {:.4f}".format(
        0.40*r['FL'], 0.25*r['FL']*(1-r['MS']), 0.20*r['DR'], 0.15*r['LP'], r['E_cog']))
    print("  CE    = {:.4f} / {:.4f} = {:.4f}".format(r['E_emo'], r['E_cog'], r['CE']))
    print("  Arc_rev = {:.2f} (N_rev={})".format(r['Arc_rev'], r['N_rev']))
    R_exp = 1.2*r['T'] + 1.5*r['I'] + 1.0*r['Arc_rev'] - 2.5
    print("  R     = s(1.2x{} + 1.5x{} + 1.0x{} - 2.5) = s({:.4f}) = {:.4f}".format(
        r['T'], r['I'], r['Arc_rev'], R_exp, r['R']))
    W_exp = 1.8*r['I'] + 2.0*r['Omega'] + 0.8*r['U'] - 2.8
    print("  W     = s(1.8x{} + 2.0x{} + 0.8x{} - 2.8) = s({:.4f}) = {:.4f}".format(
        r['I'], r['Omega'], r['U'], W_exp, r['W']))
    print("  PVI   = {:.4f} x {:.2f} x {:.4f} x {:.4f} = {:.4f}".format(
        r['CE'], r['Arc_rev'], r['R'], r['W'], r['PVI']))
    print("  SP    = {:.4f} x 20 = {:.2f}".format(r['PVI'], r['SP']))
    if r['goulots']:
        print("  >> GOULOTS: {}".format(', '.join(r['goulots'])))

# =============================================================================
# GROUP ANALYSIS
# =============================================================================
print("\n" + "=" * 120)
print("ANALYSE GROUPE A vs GROUPE B")
print("=" * 120)

gA = [r for r in results if r['group'] == 'A']
gB = [r for r in results if r['group'] == 'B']

def avg(lst): return sum(lst)/len(lst) if lst else 0
def std(lst):
    m = avg(lst)
    return math.sqrt(sum((x-m)**2 for x in lst)/len(lst)) if lst else 0

pvi_A = [r['PVI'] for r in gA]
pvi_B = [r['PVI'] for r in gB]

print("\nMoyenne PVI Groupe A (bestsellers): {:.4f}".format(avg(pvi_A)))
print("Moyenne PVI Groupe B (chefs d oeuvre): {:.4f}".format(avg(pvi_B)))
print("Ratio A/B: {:.2f}x".format(avg(pvi_A)/avg(pvi_B) if avg(pvi_B) != 0 else 999))
print("Ecart-type Groupe A: {:.4f}".format(std(pvi_A)))
print("Ecart-type Groupe B: {:.4f}".format(std(pvi_B)))

print("\nDISCRIMINATION PAR VARIABLE (D = moyenne_A - moyenne_B):")
for var in ['I', 'T', 'S', 'FL', 'MS', 'Omega', 'U', 'CE', 'R', 'W']:
    va = avg([r[var] for r in gA])
    vb = avg([r[var] for r in gB])
    delta = va - vb
    print("  {:>6}: A={:.3f}  B={:.3f}  D={:+.3f}".format(var, va, vb, delta))

# =============================================================================
# SPEARMAN CORRELATION - CE vs Ventes (Groupe A)
# =============================================================================
print("\n" + "=" * 120)
print("VALIDATION LOI LP1 - CE predit-il les ventes organiques?")
print("=" * 120)

ce_vals = [(r['name'], r['CE'], r['ventes_rank']) for r in gA]
ce_sorted = sorted(ce_vals, key=lambda x: -x[1])
print("\nClassement CE vs Ventes (Groupe A):")
print("{:<25} {:>7} {:>8} {:>12}".format("Titre", "CE", "Rang_CE", "Rang_Ventes"))
for rank_ce, (name, ce, vr) in enumerate(ce_sorted, 1):
    print("{:<25} {:>7.3f} {:>8} {:>12}".format(name, ce, rank_ce, vr))

n = len(ce_sorted)
ranks_ce = list(range(1, n+1))
ranks_v = [item[2] for item in ce_sorted]
d_sq = sum((rc - rv)**2 for rc, rv in zip(ranks_ce, ranks_v))
rho = 1 - (6 * d_sq) / (n * (n**2 - 1))
print("\nSpearman rho(CE_rang, Ventes_rang) = {:.4f}".format(rho))
print("  Sum_d2 = {}".format(d_sq))
interp = 'Forte' if abs(rho)>0.7 else ('Moderee' if abs(rho)>0.4 else 'Faible')
print("  Interpretation: {} correlation".format(interp))

# =============================================================================
# VALIDATION LP2 - I x Omega
# =============================================================================
print("\n" + "=" * 120)
print("VALIDATION LOI LP2 - I x Omega predit-il mieux que CE?")
print("=" * 120)

io_vals = [(r['name'], r['I_Omega'], r['ventes_rank']) for r in gA]
io_sorted = sorted(io_vals, key=lambda x: -x[1])
print("\n{:<25} {:>7} {:>8} {:>12}".format("Titre", "IxO", "Rang_IO", "Rang_Ventes"))
for rank, (name, io, vr) in enumerate(io_sorted, 1):
    print("{:<25} {:>7.3f} {:>8} {:>12}".format(name, io, rank, vr))

ranks_io = list(range(1, n+1))
ranks_v2 = [item[2] for item in io_sorted]
d_sq2 = sum((r1 - r2)**2 for r1, r2 in zip(ranks_io, ranks_v2))
rho2 = 1 - (6 * d_sq2) / (n * (n**2 - 1))
print("\nSpearman rho(IxO_rang, Ventes_rang) = {:.4f}".format(rho2))
print("  CE seul:  rho = {:.4f}".format(rho))
print("  IxO:      rho = {:.4f}".format(rho2))
better = 'IxO' if abs(rho2) > abs(rho) else 'CE'
print("  -> {} est le meilleur predicteur".format(better))

# =============================================================================
# VALIDATION LP5 - Paradoxe Maslej
# =============================================================================
print("\n" + "=" * 120)
print("VALIDATION LOI LP5 - Paradoxe Maslej: MS x (1-FL)")
print("=" * 120)

print("\n{:<25} {:>5} {:>5} {:>10} {:>7}".format("Titre", "MS", "FL", "MSx(1-FL)", "Groupe"))
for r in results:
    print("{:<25} {:>5.2f} {:>5.2f} {:>10.3f} {:>7}".format(
        r['name'], r['MS'], r['FL'], r['MS_1FL'], r['group']))

ms1fl_A = avg([r['MS_1FL'] for r in gA])
ms1fl_B = avg([r['MS_1FL'] for r in gB])
ms_A = avg([r['MS'] for r in gA])
ms_B = avg([r['MS'] for r in gB])
fl_A = avg([r['FL'] for r in gA])
fl_B = avg([r['FL'] for r in gB])

print("\nMoyenne MS Groupe A: {:.3f} vs Groupe B: {:.3f}".format(ms_A, ms_B))
print("Moyenne FL Groupe A: {:.3f} vs Groupe B: {:.3f}".format(fl_A, fl_B))
print("Moyenne MSx(1-FL) Groupe A: {:.3f} vs Groupe B: {:.3f}".format(ms1fl_A, ms1fl_B))
print("\nParadoxe Maslej:")
print("  Bestsellers: MS modere ({:.2f}) + FL BAS ({:.2f}) -> MSx(1-FL) ELEVE ({:.3f})".format(ms_A, fl_A, ms1fl_A))
print("  Chefs d oeuvre: MS ELEVE ({:.2f}) + FL ELEVE ({:.2f}) -> MSx(1-FL) similaire ({:.3f})".format(ms_B, fl_B, ms1fl_B))

# =============================================================================
# SENSITIVITY ANALYSIS
# =============================================================================
print("\n" + "=" * 120)
print("TABLEAU DE SENSIBILITE - dPVI/dvariable (+0.10)")
print("=" * 120)

sorted_by_pvi = sorted(results, key=lambda x: x['PVI'])
median_r = sorted_by_pvi[len(sorted_by_pvi)//2]
print("\nTitre median: {} (PVI={:.4f})".format(median_r['name'], median_r['PVI']))

variables_to_test = ['I', 'T', 'S', 'FL', 'MS', 'Omega', 'U']
print("\n{:>10} {:>10} {:>10} {:>10} {:>10}".format("Variable", "PVI_base", "PVI_+0.10", "dPVI", "%Gain"))

for var in variables_to_test:
    vals = dict(median_r)
    base_pvi = vals['PVI']

    I2, T2, S2, FL2, MS2, Om2, U2 = vals['I'], vals['T'], vals['S'], vals['FL'], vals['MS'], vals['Omega'], vals['U']
    DR2, LP2_val = vals['DR'], vals['LP']
    N_rev2 = vals['N_rev']

    if var == 'I': I2 = min(vals['I'] + 0.10, 1.0)
    elif var == 'T': T2 = min(vals['T'] + 0.10, 1.0)
    elif var == 'S': S2 = min(vals['S'] + 0.10, 1.0)
    elif var == 'FL': FL2 = max(vals['FL'] - 0.10, 0.0)
    elif var == 'MS': MS2 = min(vals['MS'] + 0.10, 1.0)
    elif var == 'Omega': Om2 = min(vals['Omega'] + 0.10, 1.0)
    elif var == 'U': U2 = min(vals['U'] + 0.10, 1.0)

    E_emo2 = 0.40*I2 + 0.28*T2 + 0.17*S2 + 0.15*I2*T2
    E_cog2 = 0.40*FL2 + 0.25*FL2*(1-MS2) + 0.20*DR2 + 0.15*LP2_val
    CE2 = E_emo2 / E_cog2 if E_cog2 > 0 else 999
    Arc2 = 0.50 if N_rev2 < 2 else (1.00 if N_rev2 == 2 else 1.20)
    R2 = 1 / (1 + math.exp(-(1.2*T2 + 1.5*I2 + 1.0*Arc2 - 2.5)))
    W2 = 1 / (1 + math.exp(-(1.8*I2 + 2.0*Om2 + 0.8*U2 - 2.8)))
    PVI2 = CE2 * Arc2 * R2 * W2

    delta = PVI2 - base_pvi
    pct = (delta / base_pvi * 100) if base_pvi != 0 else 0
    direction = "(+0.10)" if var != 'FL' else "(-0.10)"
    print("{:>10} {:>10.4f} {:>10.4f} {:>+10.4f} {:>+9.1f}%".format(
        var + direction, base_pvi, PVI2, delta, pct))

# =============================================================================
# Q_PROSE x PVI - 2D POSITIONING
# =============================================================================
print("\n" + "=" * 120)
print("CROISEMENT Q_PROSE x PVI - CARTE 2D")
print("=" * 120)

print("\n{:<25} {:>8} {:>8} {:>6} {:<30}".format("Titre", "Q_prose", "PVI", "SP", "Zone"))
for r in results:
    q = r['Q_prose']
    pvi = r['PVI']
    if q >= 87 and pvi >= 1.59:
        zone = "** ZONE OMEGA **"
    elif q >= 87 and pvi < 1.59:
        zone = "B: Chef-d oeuvre hermetique"
    elif q < 87 and pvi >= 1.59:
        zone = "C: Commercial sans prose"
    else:
        zone = "A: Niche/Mixte"
    r['zone'] = zone
    print("{:<25} {:>8} {:>8.3f} {:>6.1f} {:<30}".format(r['name'], q, pvi, r['SP'], zone))

print("\n--- TITRES EN ZONE OMEGA (Q_prose >= 87 ET PVI >= 1.59) ---")
omega_zone = [r for r in results if r['Q_prose'] >= 87 and r['PVI'] >= 1.59]
if omega_zone:
    for r in omega_zone:
        print("  * {} - Q={}, PVI={:.3f}, SP={:.1f}".format(r['name'], r['Q_prose'], r['PVI'], r['SP']))
else:
    print("  Aucun titre n atteint la Zone OMEGA dans ce corpus.")
    print("\n  Titres les plus proches:")
    for r in sorted(results, key=lambda x: -(x['Q_prose']/100 + x['PVI']/5))[:5]:
        print("  -> {} - Q={}, PVI={:.3f}".format(r['name'], r['Q_prose'], r['PVI']))

# =============================================================================
# VERDICT FINAL
# =============================================================================
print("\n" + "=" * 120)
print("VERDICT FINAL")
print("=" * 120)

I_A = avg([r['I'] for r in gA])
I_B = avg([r['I'] for r in gB])
Om_A = avg([r['Omega'] for r in gA])
Om_B = avg([r['Omega'] for r in gB])

print("\n1) COUT PROSE DES BESTSELLERS:")
print("   FL moyen bestsellers = {:.2f} vs chefs d oeuvre = {:.2f}".format(fl_A, fl_B))
print("   MS moyen bestsellers = {:.2f} vs chefs d oeuvre = {:.2f}".format(ms_A, ms_B))
print("   -> Pour maintenir FL bas, les bestsellers SACRIFIENT la MS (musicalite).")
print("   -> Ecart MS = {:+.2f} en faveur des chefs d oeuvre.".format(ms_B - ms_A))

print("\n2) COUT VENTES DES CHEFS D OEUVRE:")
print("   I moyen bestsellers = {:.2f} vs chefs d oeuvre = {:.2f} (D={:+.2f})".format(I_A, I_B, I_A-I_B))
print("   O moyen bestsellers = {:.2f} vs chefs d oeuvre = {:.2f} (D={:+.2f})".format(Om_A, Om_B, Om_A-Om_B))
print("   FL moyen bestsellers = {:.2f} vs chefs d oeuvre = {:.2f} (D={:+.2f})".format(fl_A, fl_B, fl_A-fl_B))
print("   -> TRIPLE PENALITE: I bas, FL eleve, O bas.")

print("\n3) OMEGA - RESOLUTION FINALE:")
print("   O bestsellers = {:.2f} vs O chefs d oeuvre = {:.2f}".format(Om_A, Om_B))
print("   -> OUI, les bestsellers maximisent systematiquement Omega.")
print("   -> Ecart = {:+.2f}".format(Om_A - Om_B))

print("\n4) RECOMMANDATION ARCHITECTURALE - Zone OMEGA:")
print("   Cible: I >= 0.65, FL <= 0.25, O >= 0.65, MS >= 0.80")
print("   Modeles les plus proches dans le corpus:")
for r in sorted(results, key=lambda x: abs(x['I']-0.65) + abs(x['FL']-0.25) + abs(x['Omega']-0.65) + abs(x['MS']-0.80)):
    score = abs(r['I']-0.65) + abs(r['FL']-0.25) + abs(r['Omega']-0.65) + abs(r['MS']-0.80)
    if score < 0.60:
        print("   -> {} (dist={:.2f}) I={}, FL={}, O={}, MS={}".format(
            r['name'], score, r['I'], r['FL'], r['Omega'], r['MS']))

# =============================================================================
# SUMMARY STATS
# =============================================================================
print("\n" + "=" * 120)
print("STATISTIQUES SYNTHESE")
print("=" * 120)
print("\nPVI max (Groupe A): {:.4f} - {}".format(max(pvi_A), gA[pvi_A.index(max(pvi_A))]['name']))
print("PVI min (Groupe A): {:.4f} - {}".format(min(pvi_A), gA[pvi_A.index(min(pvi_A))]['name']))
print("PVI max (Groupe B): {:.4f} - {}".format(max(pvi_B), gB[pvi_B.index(max(pvi_B))]['name']))
print("PVI min (Groupe B): {:.4f} - {}".format(min(pvi_B), gB[pvi_B.index(min(pvi_B))]['name']))

print("\nSP max global: {:.1f} - {}".format(max(r['SP'] for r in results), max(results, key=lambda x: x['SP'])['name']))
print("SP min global: {:.1f} - {}".format(min(r['SP'] for r in results), min(results, key=lambda x: x['SP'])['name']))
