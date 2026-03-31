#!/usr/bin/env python3
"""
Test I_proxy v2 vs v1 on representative FR 3rd-person texts.
Validates the fix for P5-B bug: v1 underestimates FR distanced narration.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pvi_nlp_scorer import extract_I_proxy, extract_I_proxy_v2, extract_windows

# =============================================================================
# SYNTHETIC TEXTS — representative of the 5 problematic cases
# =============================================================================

# TEXT 1: FR 3e personne distancée — style Giraud/Sinno (autofiction deuil/trauma)
# Expected: v1 ~0.15, v2 ~0.40-0.55, lecteurs ~0.45-0.63
TEXT_FR_DISTANCED = """
Elle sentait le poids de l'absence peser sur ses épaules comme un manteau de plomb
qu'elle ne parvenait pas à retirer. Ses mains tremblaient lorsqu'elle cherchait dans
ses souvenirs le visage de celui qui n'était plus là. Elle comprit soudain que la
maison qu'elle habitait depuis l'enfance n'était plus la même, que ses murs avaient
absorbé trop de silences. Elle se demanda si le chagrin pouvait user les pierres
aussi sûrement que l'eau. Ses yeux se posèrent sur la photographie jaunie, et elle
sentit monter en elle cette vague familière de tristesse qui ne la quittait jamais
vraiment. Elle voulait comprendre pourquoi certains matins lui semblaient plus lourds
que d'autres, pourquoi son corps refusait parfois de se lever, pourquoi ses jambes
la portaient vers des lieux qu'elle craignait de retrouver. Elle observa ses doigts
qui effleuraient le papier avec cette délicatesse des gestes qui savent que tout
peut se briser. Sa gorge se serra. Elle décida de sortir marcher, comme chaque
jour, parce que le mouvement était la seule chose qui empêchait le vide de
l'engloutir tout entière. Elle hésita sur le seuil, son souffle court dans l'air
froid du matin, ses bras croisés contre sa poitrine comme pour retenir quelque
chose qui s'échappait. Elle pensait souvent à ce que serait la vie si elle
parvenait à accepter, mais elle savait que l'acceptation était un mot que les
autres utilisaient pour ne plus avoir à consoler. Elle craignait cette solitude
qui l'attendait au bout de chaque journée, cette heure où le silence devenait
trop dense pour être supporté. Son visage ne trahissait rien, mais ses mains,
ses mains racontaient tout : les ongles rongés, les doigts qui se crispaient
sur le tissu de sa jupe, le tremblement imperceptible qui la prenait quand
elle pensait trop longtemps à ce qu'elle avait perdu.
"""

# TEXT 2: FR dialogue dense — style Houellebecq (narrateur distant, peu d'ancrage)
# Expected: v1 ~0.08, v2 ~0.20-0.30, lecteurs ~0.25
TEXT_FR_HOUELLEBECQ = """
Le restaurant était à moitié vide. Il commanda un steak-frites sans conviction
particulière. La serveuse avait des hanches larges et un sourire automatique.
On pouvait argumenter que la société française avait atteint un stade terminal
de décomposition, mais les gens continuaient à manger, à travailler, à se
reproduire avec une obstination qui tenait du réflexe. Il pensait souvent à
la mort, pas de manière dramatique, plutôt comme on pense à un rendez-vous
qu'on reporte indéfiniment. Le vin était passable. Les conversations autour de
lui formaient un bruit de fond indistinct, une sorte de bourdonnement social
dont il ne parvenait plus à extraire le moindre sens. Il observa les couples
attablés et se demanda combien d'entre eux faisaient encore l'amour. La
statistique était probablement décourageante. Il avait lu quelque part que
la consommation d'antidépresseurs avait triplé en vingt ans. Cela ne le
surprenait pas. Il regarda par la fenêtre. La pluie tombait avec cette
régularité mécanique qui caractérise les mois de novembre en région parisienne.
"""

# TEXT 3: EN 1st person — style Hoover (bestseller, strong identification)
# Expected: v1 ~0.75-0.85, v2 = same (EN uses v1)
TEXT_EN_HOOVER = """
I felt my hands shaking as I reached for the door handle. My heart was
pounding so hard I could hear it in my ears. I wanted to run, but my legs
wouldn't move. I kept thinking about what he said last night, how his voice
had gone quiet in that way that made my stomach drop. I knew I had to leave.
I knew it with every fiber of my being, but knowing and doing are two very
different things. My eyes burned with tears I refused to let fall. I pressed
my forehead against the cool glass and tried to breathe. I thought about my
mother, about the way she used to hold me when I was small, and I wondered
if she ever felt this trapped. I was so scared. Not of him, exactly, but of
what my life would look like without him. I feared the emptiness more than
the pain, and I hated myself for it. My fingers found the key in my pocket.
I turned it over and over, feeling its teeth bite into my skin. I decided
that today was the day. I opened the door and stepped into the morning light,
my chest tight, my hands still trembling, but my mind finally, finally clear.
"""


def run_test():
    print("=" * 70)
    print("I_PROXY v1 vs v2 — Validation P5-B Bug Fix")
    print("=" * 70)

    tests = [
        ("FR 3e pers. distancée (Giraud/Sinno)", TEXT_FR_DISTANCED, "fr", 0.45),
        ("FR dialogue distant (Houellebecq)", TEXT_FR_HOUELLEBECQ, "fr", 0.25),
        ("EN 1st person (Hoover)", TEXT_EN_HOOVER, "en", 0.80),
    ]

    for label, text, lang, target_lecteurs in tests:
        windows = [text.strip()]
        v1 = extract_I_proxy(windows, lang)
        v2 = extract_I_proxy_v2(windows, lang)

        delta_v1 = abs(v1["score"] - target_lecteurs)
        delta_v2 = abs(v2["score"] - target_lecteurs)

        print(f"\n--- {label} ---")
        print(f"  Target (lecteurs): {target_lecteurs}")
        print(f"  v1: I={v1['score']:.4f}  delta={delta_v1:.4f}  (POV 1st={v1['pov_1st_person']})")
        print(f"  v2: I={v2['score']:.4f}  delta={delta_v2:.4f}  (POV 1st={v2['pov_1st_person']})")
        if lang == "fr" and "focalisation_interne" in v2:
            print(f"      focal={v2['focalisation_interne']:.4f}  "
                  f"ancrage={v2['ancrage_corporel']:.4f}  "
                  f"desir={v2['desir_narratif']:.4f}")
        improvement = delta_v1 - delta_v2
        print(f"  Improvement: {'+' if improvement > 0 else ''}{improvement:.4f} "
              f"({'BETTER' if improvement > 0 else 'SAME' if improvement == 0 else 'WORSE'})")

    # Run on the Scribe OMEGA chunks if available
    chunk_dir = os.path.join(os.path.dirname(__file__), "test_scribe")
    if os.path.isdir(chunk_dir):
        print(f"\n{'='*70}")
        print("SCRIBE OMEGA CHUNKS — v1 vs v2")
        print("=" * 70)
        for fname in sorted(os.listdir(chunk_dir)):
            if fname.endswith(".txt"):
                fpath = os.path.join(chunk_dir, fname)
                with open(fpath, encoding="utf-8") as f:
                    text = f.read()
                windows = [text.strip()]
                v1 = extract_I_proxy(windows, "fr")
                v2 = extract_I_proxy_v2(windows, "fr")
                print(f"\n  {fname}:")
                print(f"    v1: I={v1['score']:.4f}")
                print(f"    v2: I={v2['score']:.4f}  "
                      f"(focal={v2.get('focalisation_interne', 0):.4f}, "
                      f"ancrage={v2.get('ancrage_corporel', 0):.4f}, "
                      f"desir={v2.get('desir_narratif', 0):.4f})")

    print(f"\n{'='*70}")
    print("DONE")


if __name__ == "__main__":
    run_test()
