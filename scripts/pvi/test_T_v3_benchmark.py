#!/usr/bin/env python3
"""
Benchmark T_v3 vs T_v2 on 8 reference titles.
Validates that Flynn and Murakami improve while convergent cases don't regress.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pvi_nlp_scorer import extract_T_v2, extract_T_v3

# Synthetic excerpts representative of the 8 benchmark titles
# These capture the KEY features each title is known for

TEXTS = {
    "Zevin (T×3)": {
        "proxy": 0.65,
        "text": """Sam regarda Sadie. Elle ne lui rendit pas son regard. Il voulait lui parler
de ce qu'il ressentait, mais les mots ne venaient pas. Depuis des années, ils avaient
construit ensemble ce monde virtuel, mais le monde réel entre eux restait un terrain
miné. « Tu te souviens de ce jour-là ? » demanda-t-il. Elle hocha la tête sans
répondre. Le silence entre eux pesait plus lourd que n'importe quel dialogue.
Marx les observait depuis le couloir, comprenant que certaines douleurs ne se
partagent pas. Il toucha le mur froid, sentit la texture rugueuse sous ses doigts.
Dehors, la pluie tombait sur les vitres de l'immeuble. Sadie pensait à sa sœur.
Toujours sa sœur. « Je dois partir, » dit-elle. Sam ne bougea pas.""",
    },
    "Hoover": {
        "proxy": 0.75,
        "text": """Mon cœur battait si fort que je pouvais l'entendre dans mes oreilles.
Ryle me regardait avec cette expression que je connaissais trop bien. « Lily. »
Sa voix était douce. Trop douce. Ses mains tremblaient. J'ai reculé d'un pas.
« Ne me touche pas. » Les mots sont sortis avant que je puisse les retenir.
Il a tendu la main vers moi, puis s'est arrêté. Le silence. Insupportable.
J'ai pensé à Atlas. À cette lettre qu'il m'avait écrite quand nous étions
adolescents. « Tout le monde mérite d'être aimé. » Mais est-ce que je méritais
ça ? Cette peur ? Ce doute permanent ? « Lily, s'il te plaît. » Non. Plus jamais.
J'ai pris mon sac. Mes mains ne tremblaient plus.""",
    },
    "Flynn": {
        "proxy": 0.82,
        "text": """Nick : Je ne suis pas l'homme que vous croyez. Personne ne l'est jamais.
Mais Amy — Amy était pire. Bien pire. Le jour de notre anniversaire, elle avait
tout planifié. Chaque détail. Chaque indice. Vous pensez connaître quelqu'un ?
Vous ne connaissez rien. Le journal d'Amy disait une chose. La réalité en disait
une autre. Laquelle croire ? Ni l'une ni l'autre, évidemment. C'est ça, le
piège. Quand la police a trouvé le sang dans la cuisine — mon sang ? son sang ?
celui de personne ? — j'ai compris que le jeu avait commencé. Un jeu dont je
ne connaissais pas les règles. Soudain, tout s'est inversé. Les preuves pointaient
vers moi. Toutes. Sans exception. « Où est votre femme, monsieur Dunne ? »
Bonne question. Excellente question. Mais la vraie question était : qui est
ma femme ? L'ai-je jamais su ? Non. Jamais.""",
    },
    "Camus": {
        "proxy": 0.68,
        "text": """Aujourd'hui, maman est morte. Ou peut-être hier, je ne sais pas.
J'ai reçu un télégramme de l'asile. Le soleil tapait dur sur la route.
L'autobus m'a secoué pendant deux heures. À l'arrivée, la chaleur était
si forte que je ne distinguais plus les visages. La lumière blanche mangeait
les ombres. Le directeur m'a parlé. Je n'écoutais pas vraiment. La sueur
coulait le long de mon dos. Près du cercueil, les vieillards pleuraient
sans bruit. L'odeur du bois verni montait dans la chaleur. Dehors, les
cigales chantaient. Je pensais que c'était dimanche et que cela m'ennuyait.""",
    },
    "Proust": {
        "proxy": 0.65,
        "text": """Longtemps, je me suis couché de bonne heure. Parfois, à peine ma bougie
éteinte, mes yeux se fermaient si vite que je n'avais pas le temps de me dire :
Je m'endors. Et, une demi-heure après, la pensée qu'il était temps de chercher
le sommeil m'éveillait ; je voulais poser le volume que je croyais avoir encore
dans les mains et souffler ma lumière ; je n'avais pas cessé en dormant de faire
des réflexions sur ce que je venais de lire, mais ces réflexions avaient pris un
tour un peu particulier ; il me semblait que j'étais moi-même ce dont parlait
l'ouvrage : une église, un quatuor, la rivalité de François Ier et de Charles
Quint. Le parfum des aubépines montait par la fenêtre ouverte.""",
    },
    "Murakami": {
        "proxy": 0.80,
        "text": """Kafka Tamura avait quinze ans quand il décida de quitter la maison.
Personne ne savait où il allait. Lui-même ne le savait pas vraiment. Mais
quelque chose l'appelait — ou le poussait. La bibliothèque était silencieuse.
Oshima le regardait sans rien dire. « Tu as lu quelque chose d'intéressant ? »
Dehors, la pluie tombait sans fin. Le chat était revenu. Toujours le même chat.
Pourquoi revenait-il ? Nakata parlait aux chats. Les chats lui répondaient.
Personne n'y croyait, mais c'était vrai. Le monde avait des couches, des
épaisseurs que les gens normaux ne voyaient pas. « Parfois, » dit Oshima,
« les choses les plus importantes sont celles qu'on ne comprend jamais. »
Kafka ne répondit rien. Il pensait à son père. Toujours son père.""",
    },
    "Carlton": {
        "proxy": 0.80,
        "text": """Ses doigts s'enfoncèrent dans ma chair. La douleur irradiait le long
de mon bras. Son souffle chaud contre mon oreille. « Tu m'appartiens, Adeline. »
Les mots me brûlaient autant que ses mains. Je sentais l'odeur de cuir de sa
veste, le goût de sang dans ma bouche. Dehors, la nuit avait englouti la forêt.
Les arbres craquaient sous le vent. Mon cœur battait si fort qu'il devait
l'entendre. Ses yeux — sombres, impénétrables — ne me quittaient pas. « Dis
quelque chose. » Je ne pouvais pas. Les mots étaient coincés dans ma gorge
comme des éclats de verre. Il me lâcha brusquement. Le froid m'envahit.""",
    },
    "Houellebecq": {
        "proxy": 0.50,
        "text": """Le restaurant était à moitié vide. La serveuse avait des hanches larges.
Il commanda un steak-frites. La viande était trop cuite, comme d'habitude dans
ce genre d'établissement. Il pensa aux statistiques de divorce qu'il avait lues
le matin. Soixante-trois pour cent. Le vin était passable. Par la fenêtre, la
pluie tombait sur le boulevard Raspail avec cette régularité mécanique qui
caractérisait le mois de novembre. Les gens passaient, courbés sous leurs
parapluies. Certains portaient des sacs de courses. La consommation était
le dernier réflexe vital d'une civilisation à bout de souffle.""",
    },
}


def run_benchmark():
    print("=" * 70)
    print("T_v2 vs T_v3 BENCHMARK — 8 titres de reference")
    print("=" * 70)

    v2_deltas = []
    v3_deltas = []
    convergent_v2 = ["Zevin (T×3)", "Camus", "Proust", "Houellebecq"]

    print(f"\n{'Titre':<20} {'Proxy':>6} {'T_v2':>6} {'dv2':>6} {'T_v3':>6} {'dv3':>6} {'T_nar':>6} {'Verdict':>10}")
    print("-" * 80)

    for title, data in TEXTS.items():
        windows = [data["text"].strip()]
        proxy = data["proxy"]

        v2 = extract_T_v2(windows, "fr" if title not in ["Hoover"] else "en")
        v3 = extract_T_v3(windows, "fr" if title not in ["Hoover"] else "en")

        # Use FR for all since we have FR excerpts (even Flynn/Murakami are FR translations)
        if title == "Hoover":
            # Hoover is the only one with 1st person EN-style markers
            v2 = extract_T_v2(windows, "fr")
            v3 = extract_T_v3(windows, "fr")

        d_v2 = abs(v2["score"] - proxy)
        d_v3 = abs(v3["score"] - proxy)
        t_nar = v3.get("T_narratif", 0)

        v2_deltas.append(d_v2)
        v3_deltas.append(d_v3)

        improved = d_v3 < d_v2
        regressed = d_v3 > d_v2 + 0.02
        if title in convergent_v2:
            verdict = "REGRESS" if regressed else "OK"
        elif title in ["Flynn", "Murakami"]:
            verdict = "FIXED" if d_v3 < 0.20 else ("BETTER" if improved else "FAIL")
        else:
            verdict = "BETTER" if improved else ("SAME" if abs(d_v3 - d_v2) < 0.02 else "WORSE")

        print(f"{title:<20} {proxy:>6.3f} {v2['score']:>6.3f} {d_v2:>6.3f} {v3['score']:>6.3f} {d_v3:>6.3f} {t_nar:>6.3f} {verdict:>10}")

    print("-" * 80)
    mean_v2 = sum(v2_deltas) / len(v2_deltas)
    mean_v3 = sum(v3_deltas) / len(v3_deltas)
    print(f"{'MEAN DELTA':<20} {'':>6} {'':>6} {mean_v2:>6.3f} {'':>6} {mean_v3:>6.3f}")
    print(f"\nImprovement: {mean_v2:.3f} -> {mean_v3:.3f} ({'+' if mean_v3 < mean_v2 else '-'}{abs(mean_v2 - mean_v3):.3f})")

    # Validation criteria
    flynn_d = v3_deltas[2]  # Flynn is index 2
    murakami_d = v3_deltas[5]  # Murakami is index 5
    conv_ok = all(v3_deltas[i] < 0.15 for i, t in enumerate(TEXTS) if t in convergent_v2)

    print(f"\nVALIDATION:")
    print(f"  Flynn delta < 0.20:      {flynn_d:.3f} -> {'PASS' if flynn_d < 0.20 else 'FAIL'}")
    print(f"  Murakami delta < 0.20:   {murakami_d:.3f} -> {'PASS' if murakami_d < 0.20 else 'FAIL'}")
    print(f"  Convergents no regress:  {'PASS' if conv_ok else 'FAIL'}")
    print(f"\n{'=' * 70}")


if __name__ == "__main__":
    run_benchmark()
