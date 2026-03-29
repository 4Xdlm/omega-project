#!/usr/bin/env python3
"""
OMEGA PVI — Étapes 2-7: Calcul PVI complet sur corpus étendu
Estimation des variables, calcul PVI, analyses FR/EN, comparatif
"""

import math
import csv
import os
from collections import Counter

OUTPUT_DIR = r"C:\Users\elric\omega-project\docs\physique-litteraire\corpus-analyse"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# =============================================================================
# PVI DATA — CURATED ESTIMATES FOR ALL ANALYZABLE TITLES
# Format: [title, author, group, I, T, N_rev, S, FL, MS, Omega, U, DR, LP,
#          Q_prose_est, ventes_rang, confiance]
# confiance: M=MESURÉ, E=ESTIMÉ, P=PROXY-AUTEUR
# ventes_rang: 1=highest sales in group, None if unknown/not applicable
# =============================================================================

DATA = [
    # =========================================================================
    # GROUPE FR-A — BESTSELLERS FRANÇAIS
    # =========================================================================
    # Houellebecq
    ["Les Particules élémentaires", "Michel Houellebecq", "FR-A",
     0.62, 0.65, 3, 0.60, 0.35, 0.72, 0.70, 0.82, 0.30, 0.35, 78, 3, "E"],
    ["La Carte et le Territoire", "Michel Houellebecq", "FR-A",
     0.58, 0.62, 2, 0.55, 0.32, 0.70, 0.72, 0.78, 0.28, 0.32, 76, 5, "E"],
    ["La possibilité d'une île", "Michel Houellebecq", "FR-A",
     0.55, 0.60, 2, 0.50, 0.38, 0.68, 0.62, 0.75, 0.35, 0.38, 74, 7, "E"],
    # Musso
    ["Le crime du paradis", "Guillaume Musso", "FR-A",
     0.78, 0.72, 3, 0.68, 0.15, 0.52, 0.75, 0.62, 0.12, 0.20, 42, 1, "E"],
    # Nothomb
    ["Stupeur et tremblements", "Amélie Nothomb", "FR-A",
     0.80, 0.72, 2, 0.62, 0.22, 0.70, 0.72, 0.82, 0.18, 0.22, 68, 4, "E"],
    # Vargas
    ["Pars vite et reviens tard", "Fred Vargas", "FR-A",
     0.68, 0.75, 3, 0.72, 0.28, 0.65, 0.78, 0.80, 0.22, 0.28, 65, 6, "E"],
    # Carrère
    ["Limonov", "Emmanuel Carrère", "FR-A",
     0.65, 0.70, 3, 0.60, 0.30, 0.75, 0.68, 0.82, 0.30, 0.32, 78, 8, "E"],
    ["La Moustache", "Emmanuel Carrère", "FR-A",
     0.72, 0.78, 2, 0.75, 0.22, 0.72, 0.65, 0.85, 0.18, 0.22, 75, 10, "E"],
    ["Kolkhoze", "Emmanuel Carrère", "FR-A",
     0.60, 0.65, 2, 0.55, 0.28, 0.70, 0.60, 0.72, 0.25, 0.30, 72, 12, "P"],
    # Hugo
    ["Les Misérables", "Victor Hugo", "FR-A",
     0.82, 0.85, 4, 0.78, 0.42, 0.88, 0.85, 0.95, 0.40, 0.55, 88, 1, "E"],
    ["Notre-Dame de Paris", "Victor Hugo", "FR-A",
     0.72, 0.82, 3, 0.70, 0.45, 0.85, 0.72, 0.90, 0.38, 0.50, 86, 2, "E"],
    # Camus (FR bestsellers — L'Étranger is THE bestseller of FR literature)
    ["L'Étranger", "Albert Camus", "FR-A",
     0.55, 0.68, 2, 0.60, 0.18, 0.82, 0.62, 0.85, 0.20, 0.15, 88, 1, "E"],
    ["La Peste", "Albert Camus", "FR-A",
     0.60, 0.72, 3, 0.55, 0.25, 0.80, 0.70, 0.78, 0.25, 0.30, 85, 2, "E"],
    ["La Chute", "Albert Camus", "FR-A",
     0.62, 0.65, 2, 0.58, 0.30, 0.82, 0.68, 0.80, 0.28, 0.28, 86, 6, "E"],
    ["L'Exil et le Royaume", "Albert Camus", "FR-A",
     0.55, 0.65, 2, 0.50, 0.28, 0.78, 0.60, 0.72, 0.25, 0.28, 82, 10, "E"],
    ["La mort heureuse", "Albert Camus", "FR-A",
     0.58, 0.62, 2, 0.48, 0.28, 0.75, 0.55, 0.70, 0.25, 0.30, 78, 12, "E"],
    # Eco
    ["Le nom de la rose", "Umberto Eco", "FR-A",
     0.68, 0.82, 3, 0.75, 0.42, 0.78, 0.80, 0.88, 0.45, 0.45, 82, 3, "E"],
    # De Beauvoir
    ["Les Mandarins", "Simone de Beauvoir", "FR-A",
     0.65, 0.68, 3, 0.50, 0.38, 0.72, 0.62, 0.75, 0.35, 0.42, 75, 8, "E"],
    # Stieg Larsson FR
    ["Millénium 1 (FR)", "Stieg Larsson", "FR-A",
     0.75, 0.80, 4, 0.78, 0.30, 0.65, 0.82, 0.92, 0.25, 0.35, 62, 2, "E"],
    # 50 Nuances FR
    ["Cinquante nuances (FR)", "EL James", "FR-A",
     0.80, 0.72, 2, 0.45, 0.10, 0.40, 0.65, 0.70, 0.08, 0.15, 32, 1, "E"],
    # Ferrante FR
    ["L'Amie prodigieuse (FR)", "Elena Ferrante", "FR-A",
     0.82, 0.78, 2, 0.55, 0.22, 0.75, 0.70, 0.85, 0.20, 0.30, 72, 4, "E"],
    # Sarah J Maas FR
    ["Maison flamme/ombre (FR)", "Sarah J. Maas", "FR-A",
     0.82, 0.78, 4, 0.65, 0.20, 0.55, 0.72, 0.68, 0.18, 0.22, 48, 5, "E"],
    # Picoult FR
    ["Mille petits riens (FR)", "Jodi Picoult", "FR-A",
     0.78, 0.70, 3, 0.60, 0.18, 0.58, 0.72, 0.72, 0.15, 0.22, 52, 6, "E"],
    # Achebe FR
    ["Tout s'effondre (FR)", "Chinua Achebe", "FR-A",
     0.72, 0.78, 3, 0.62, 0.25, 0.72, 0.75, 0.85, 0.22, 0.28, 78, 5, "E"],
    # Andy Weir FR
    ["Projet dernière chance (FR)", "Andy Weir", "FR-A",
     0.75, 0.78, 3, 0.72, 0.20, 0.55, 0.75, 0.78, 0.22, 0.25, 55, 4, "E"],
    # Steel FR
    ["Douce amère (FR)", "Danielle Steel", "FR-A",
     0.75, 0.62, 2, 0.40, 0.12, 0.45, 0.70, 0.55, 0.08, 0.18, 35, 3, "P"],
    ["Seconde vie (FR)", "Danielle Steel", "FR-A",
     0.72, 0.60, 2, 0.38, 0.12, 0.45, 0.68, 0.52, 0.08, 0.18, 35, 4, "P"],

    # =========================================================================
    # GROUPE FR-B — CHEFS D'OEUVRE FRANÇAIS
    # =========================================================================
    # Proust
    ["Du côté de chez Swann", "Marcel Proust", "FR-B",
     0.40, 0.65, 1, 0.30, 0.72, 0.92, 0.35, 0.70, 0.65, 0.90, 92, None, "E"],
    # Flaubert
    ["Madame Bovary", "Gustave Flaubert", "FR-B",
     0.60, 0.70, 3, 0.50, 0.45, 0.90, 0.72, 0.82, 0.35, 0.50, 90, None, "E"],
    ["Un cœur simple", "Gustave Flaubert", "FR-B",
     0.62, 0.68, 2, 0.42, 0.40, 0.88, 0.70, 0.75, 0.30, 0.35, 89, None, "E"],
    # Duras
    ["L'Amant", "Marguerite Duras", "FR-B",
     0.65, 0.72, 2, 0.45, 0.40, 0.88, 0.55, 0.75, 0.30, 0.35, 91, None, "E"],
    # Sartre
    ["La Nausée", "Jean-Paul Sartre", "FR-B",
     0.42, 0.55, 1, 0.35, 0.50, 0.72, 0.40, 0.70, 0.50, 0.45, 83, None, "E"],
    # Céline
    ["Voyage au bout de la nuit", "Céline", "FR-B",
     0.55, 0.72, 3, 0.55, 0.55, 0.85, 0.38, 0.78, 0.35, 0.45, 88, None, "E"],
    # Beckett FR
    ["Molloy", "Samuel Beckett", "FR-B",
     0.25, 0.45, 1, 0.40, 0.70, 0.88, 0.20, 0.75, 0.55, 0.65, 93, None, "E"],
    # Kundera FR
    ["L'Insoutenable Légèreté", "Milan Kundera", "FR-B",
     0.58, 0.62, 2, 0.50, 0.42, 0.78, 0.60, 0.78, 0.45, 0.40, 85, None, "E"],
    # Robbe-Grillet
    ["La Jalousie", "Alain Robbe-Grillet", "FR-B",
     0.30, 0.55, 1, 0.35, 0.52, 0.80, 0.25, 0.68, 0.35, 0.45, 88, None, "E"],
    ["Le Voyeur", "Alain Robbe-Grillet", "FR-B",
     0.35, 0.60, 1, 0.50, 0.50, 0.78, 0.30, 0.72, 0.32, 0.42, 86, None, "E"],
    ["La Maison de Rendez-Vous", "Alain Robbe-Grillet", "FR-B",
     0.28, 0.52, 1, 0.42, 0.55, 0.75, 0.22, 0.65, 0.38, 0.48, 85, None, "P"],
    # Sarraute
    ["Enfance", "Nathalie Sarraute", "FR-B",
     0.50, 0.58, 1, 0.32, 0.48, 0.82, 0.42, 0.68, 0.30, 0.40, 87, None, "E"],
    ["Le Planétarium", "Nathalie Sarraute", "FR-B",
     0.35, 0.50, 1, 0.30, 0.52, 0.80, 0.32, 0.62, 0.35, 0.45, 86, None, "E"],
    ["Martereau", "Nathalie Sarraute", "FR-B",
     0.38, 0.52, 1, 0.28, 0.50, 0.78, 0.35, 0.60, 0.32, 0.42, 85, None, "P"],
    # Claude Simon
    ["La Route des Flandres", "Claude Simon", "FR-B",
     0.35, 0.62, 1, 0.38, 0.62, 0.90, 0.30, 0.68, 0.45, 0.65, 91, None, "E"],
    # Butor
    ["La Modification", "Michel Butor", "FR-B",
     0.45, 0.58, 1, 0.40, 0.48, 0.78, 0.45, 0.72, 0.32, 0.42, 84, None, "E"],
    # Gracq
    ["Le Rivage des Syrtes (Opposing Shore)", "Julien Gracq", "FR-B",
     0.40, 0.72, 1, 0.35, 0.58, 0.90, 0.35, 0.72, 0.42, 0.55, 92, None, "E"],
    ["Un balcon en forêt", "Julien Gracq", "FR-B",
     0.45, 0.75, 1, 0.30, 0.55, 0.88, 0.38, 0.68, 0.38, 0.48, 91, None, "E"],
    # Quignard
    ["Tous les matins du monde", "Pascal Quignard", "FR-B",
     0.55, 0.72, 2, 0.45, 0.45, 0.88, 0.62, 0.78, 0.38, 0.38, 90, None, "E"],
    ["Terrasse à Rome", "Pascal Quignard", "FR-B",
     0.42, 0.65, 1, 0.38, 0.52, 0.85, 0.40, 0.70, 0.40, 0.45, 89, None, "E"],
    ["Le salon du Wurtemberg", "Pascal Quignard", "FR-B",
     0.48, 0.68, 2, 0.40, 0.48, 0.85, 0.50, 0.72, 0.38, 0.42, 88, None, "E"],
    # Perec
    ["La Vie mode d'emploi", "Georges Perec", "FR-B",
     0.42, 0.65, 4, 0.62, 0.52, 0.85, 0.48, 0.88, 0.45, 0.48, 90, None, "E"],
    # Ernaux
    ["Les Années", "Annie Ernaux", "FR-B",
     0.55, 0.60, 2, 0.35, 0.35, 0.78, 0.52, 0.72, 0.32, 0.35, 82, None, "E"],
    ["La Place", "Annie Ernaux", "FR-B",
     0.62, 0.58, 1, 0.30, 0.28, 0.72, 0.55, 0.70, 0.22, 0.25, 78, None, "E"],
    ["L'Événement", "Annie Ernaux", "FR-B",
     0.68, 0.62, 2, 0.42, 0.30, 0.72, 0.58, 0.75, 0.22, 0.28, 80, None, "E"],
    ["La femme gelée", "Annie Ernaux", "FR-B",
     0.62, 0.58, 1, 0.32, 0.28, 0.70, 0.48, 0.68, 0.22, 0.28, 78, None, "E"],
    ["Mémoire de fille", "Annie Ernaux", "FR-B",
     0.65, 0.60, 1, 0.35, 0.30, 0.72, 0.50, 0.70, 0.22, 0.28, 79, None, "E"],
    ["Une femme", "Annie Ernaux", "FR-B",
     0.60, 0.55, 1, 0.28, 0.28, 0.70, 0.52, 0.65, 0.20, 0.25, 77, None, "E"],
    ["Ce qu'ils disent ou rien", "Annie Ernaux", "FR-B",
     0.55, 0.52, 1, 0.28, 0.30, 0.68, 0.42, 0.60, 0.22, 0.28, 76, None, "P"],
    # Modiano
    ["Rue des Boutiques Obscures", "Patrick Modiano", "FR-B",
     0.48, 0.68, 2, 0.45, 0.35, 0.80, 0.52, 0.72, 0.28, 0.32, 85, None, "E"],
    ["Dora Bruder", "Patrick Modiano", "FR-B",
     0.52, 0.65, 1, 0.38, 0.32, 0.78, 0.48, 0.75, 0.30, 0.30, 84, None, "E"],
    ["La Ronde de nuit", "Patrick Modiano", "FR-B",
     0.45, 0.65, 2, 0.42, 0.35, 0.78, 0.45, 0.68, 0.28, 0.32, 83, None, "E"],
    ["Encre sympathique", "Patrick Modiano", "FR-B",
     0.48, 0.62, 1, 0.40, 0.32, 0.78, 0.42, 0.68, 0.28, 0.30, 83, None, "P"],
    ["La danseuse", "Patrick Modiano", "FR-B",
     0.45, 0.60, 1, 0.35, 0.32, 0.76, 0.40, 0.65, 0.28, 0.30, 82, None, "P"],
    ["Quartier Perdu", "Patrick Modiano", "FR-B",
     0.45, 0.62, 1, 0.38, 0.33, 0.78, 0.42, 0.66, 0.28, 0.30, 82, None, "P"],
    # Le Clézio
    ["Désert", "J.M.G. Le Clézio", "FR-B",
     0.50, 0.78, 2, 0.38, 0.42, 0.85, 0.48, 0.72, 0.35, 0.40, 87, None, "E"],
    ["La Quarantaine", "J.M.G. Le Clézio", "FR-B",
     0.48, 0.75, 1, 0.35, 0.40, 0.82, 0.42, 0.68, 0.35, 0.40, 85, None, "P"],
    ["Ourania", "J.M.G. Le Clézio", "FR-B",
     0.45, 0.72, 1, 0.35, 0.42, 0.80, 0.40, 0.65, 0.35, 0.42, 84, None, "P"],
    # Yourcenar
    ["Mémoires d'Hadrien", "Marguerite Yourcenar", "FR-B",
     0.58, 0.75, 2, 0.42, 0.48, 0.88, 0.62, 0.82, 0.45, 0.50, 91, None, "E"],
    ["L'Œuvre au noir", "Marguerite Yourcenar", "FR-B",
     0.52, 0.72, 2, 0.40, 0.50, 0.85, 0.55, 0.78, 0.45, 0.50, 90, None, "E"],
    ["Alexis ou le Traité du vain combat", "Marguerite Yourcenar", "FR-B",
     0.55, 0.60, 1, 0.32, 0.45, 0.82, 0.48, 0.70, 0.38, 0.42, 88, None, "P"],
    # Malraux
    ["La Voie royale", "André Malraux", "FR-B",
     0.55, 0.72, 2, 0.52, 0.42, 0.78, 0.55, 0.75, 0.35, 0.40, 82, None, "E"],
    # NDiaye
    ["Trois Femmes puissantes", "Marie NDiaye", "FR-B",
     0.60, 0.68, 3, 0.48, 0.40, 0.82, 0.55, 0.78, 0.30, 0.38, 84, None, "E"],
    # Chamoiseau
    ["Texaco", "Patrick Chamoiseau", "FR-B",
     0.55, 0.75, 3, 0.50, 0.55, 0.85, 0.55, 0.82, 0.38, 0.45, 87, None, "E"],
    # Echenoz
    ["Courir", "Jean Echenoz", "FR-B",
     0.52, 0.65, 2, 0.42, 0.32, 0.80, 0.52, 0.72, 0.25, 0.28, 82, None, "E"],
    # Handke
    ["Absence", "Peter Handke", "FR-B",
     0.35, 0.62, 1, 0.30, 0.50, 0.82, 0.32, 0.65, 0.40, 0.48, 86, None, "P"],
    ["Le malheur indifférent", "Peter Handke", "FR-B",
     0.55, 0.60, 1, 0.35, 0.42, 0.80, 0.48, 0.70, 0.32, 0.38, 84, None, "E"],
    # Döblin
    ["Monts Mers et Géants", "Alfred Döblin", "FR-B",
     0.30, 0.58, 1, 0.35, 0.62, 0.75, 0.28, 0.65, 0.48, 0.60, 82, None, "P"],
    # Edouard Louis
    ["En finir avec Eddy Bellegueule", "Édouard Louis", "FR-B",
     0.72, 0.68, 2, 0.55, 0.28, 0.72, 0.62, 0.78, 0.22, 0.28, 76, None, "E"],

    # =========================================================================
    # GROUPE FR-C — UPMARKET FRANÇAIS
    # =========================================================================
    # Zola
    ["Au Bonheur des Dames", "Émile Zola", "FR-C",
     0.65, 0.75, 3, 0.55, 0.38, 0.80, 0.70, 0.78, 0.30, 0.38, 82, None, "E"],
    ["L'Argent", "Émile Zola", "FR-C",
     0.55, 0.68, 3, 0.50, 0.42, 0.78, 0.62, 0.72, 0.35, 0.42, 80, None, "E"],
    ["L'Œuvre", "Émile Zola", "FR-C",
     0.58, 0.72, 2, 0.45, 0.40, 0.80, 0.58, 0.78, 0.35, 0.40, 82, None, "E"],
    ["Les Mystères de Marseille", "Émile Zola", "FR-C",
     0.60, 0.70, 3, 0.55, 0.38, 0.75, 0.65, 0.70, 0.30, 0.38, 78, None, "P"],
    ["Une page d'amour", "Émile Zola", "FR-C",
     0.62, 0.68, 2, 0.42, 0.38, 0.78, 0.60, 0.68, 0.28, 0.35, 80, None, "P"],
    # Dostoïevski FR
    ["Crime et Châtiment (FR)", "Dostoïevski", "FR-C",
     0.72, 0.78, 3, 0.68, 0.40, 0.82, 0.78, 0.88, 0.35, 0.42, 88, None, "E"],
    # Baldwin FR
    ["La Chambre de Giovanni (FR)", "James Baldwin", "FR-C",
     0.72, 0.70, 2, 0.52, 0.28, 0.78, 0.68, 0.80, 0.22, 0.28, 82, None, "E"],
    # Shriver FR
    ["Kevin (FR)", "Lionel Shriver", "FR-C",
     0.72, 0.75, 3, 0.70, 0.35, 0.78, 0.85, 0.88, 0.30, 0.40, 78, None, "E"],
    # Ishiguro FR
    ["Les Vestiges du Jour (FR)", "Kazuo Ishiguro", "FR-C",
     0.60, 0.72, 2, 0.45, 0.28, 0.82, 0.72, 0.80, 0.25, 0.30, 84, None, "E"],
    # Calvino FR
    ["Si par une nuit d'hiver un voyageur", "Italo Calvino", "FR-C",
     0.55, 0.72, 4, 0.68, 0.38, 0.82, 0.52, 0.85, 0.35, 0.38, 86, None, "E"],

    # =========================================================================
    # GROUPE EN-A — BESTSELLERS ANGLAIS
    # =========================================================================
    # Stephen King
    ["Carrie", "Stephen King", "EN-A",
     0.72, 0.78, 3, 0.75, 0.18, 0.62, 0.78, 0.82, 0.15, 0.22, 62, 3, "E"],
    ["Cujo", "Stephen King", "EN-A",
     0.68, 0.75, 2, 0.65, 0.20, 0.60, 0.72, 0.72, 0.15, 0.25, 58, 8, "E"],
    # Patterson
    ["Along Came a Spider", "James Patterson", "EN-A",
     0.72, 0.75, 3, 0.78, 0.15, 0.50, 0.75, 0.78, 0.12, 0.18, 42, 2, "E"],
    ["Cross and Sampson", "James Patterson", "EN-A",
     0.68, 0.70, 3, 0.72, 0.15, 0.48, 0.72, 0.72, 0.12, 0.18, 40, 4, "P"],
    # Grisham
    ["A Time to Kill", "John Grisham", "EN-A",
     0.75, 0.72, 3, 0.68, 0.18, 0.55, 0.78, 0.78, 0.18, 0.22, 55, 3, "E"],
    ["The Firm", "John Grisham", "EN-A",
     0.72, 0.75, 3, 0.72, 0.18, 0.55, 0.78, 0.80, 0.18, 0.22, 55, 1, "E"],
    ["The Pelican Brief", "John Grisham", "EN-A",
     0.70, 0.72, 3, 0.70, 0.18, 0.52, 0.75, 0.75, 0.18, 0.22, 52, 4, "E"],
    # Clancy
    ["The Hunt for Red October", "Tom Clancy", "EN-A",
     0.62, 0.78, 3, 0.72, 0.32, 0.58, 0.78, 0.80, 0.30, 0.35, 55, 2, "E"],
    ["Clear and Present Danger", "Tom Clancy", "EN-A",
     0.60, 0.75, 3, 0.68, 0.35, 0.55, 0.75, 0.72, 0.32, 0.38, 52, 5, "E"],
    ["Red Storm Rising", "Tom Clancy", "EN-A",
     0.55, 0.72, 3, 0.65, 0.35, 0.55, 0.72, 0.68, 0.32, 0.38, 50, 6, "P"],
    # Dean Koontz
    ["Intensity", "Dean Koontz", "EN-A",
     0.72, 0.80, 2, 0.82, 0.18, 0.58, 0.72, 0.72, 0.12, 0.20, 55, 4, "E"],
    # Dan Brown
    ["Origin", "Dan Brown", "EN-A",
     0.65, 0.75, 4, 0.78, 0.22, 0.50, 0.72, 0.75, 0.25, 0.25, 45, 3, "E"],
    ["The Lost Symbol", "Dan Brown", "EN-A",
     0.65, 0.75, 4, 0.75, 0.22, 0.50, 0.72, 0.72, 0.25, 0.25, 45, 4, "E"],
    # Cussler
    ["Sahara", "Clive Cussler", "EN-A",
     0.62, 0.72, 3, 0.68, 0.20, 0.50, 0.72, 0.72, 0.18, 0.25, 42, 5, "E"],
    ["Raise the Titanic", "Clive Cussler", "EN-A",
     0.60, 0.72, 3, 0.70, 0.20, 0.52, 0.72, 0.75, 0.18, 0.25, 45, 4, "E"],
    # Cornwell
    ["Postmortem", "Patricia Cornwell", "EN-A",
     0.68, 0.72, 3, 0.72, 0.22, 0.58, 0.75, 0.78, 0.20, 0.25, 55, 3, "E"],
    ["Body of Evidence", "Patricia Cornwell", "EN-A",
     0.65, 0.70, 3, 0.68, 0.22, 0.58, 0.72, 0.75, 0.20, 0.25, 55, 5, "P"],
    # Robin Cook
    ["Bellevue", "Robin Cook", "EN-A",
     0.65, 0.68, 2, 0.62, 0.22, 0.52, 0.68, 0.70, 0.20, 0.25, 48, 6, "P"],
    # Lee Child
    ["Killing Floor", "Lee Child", "EN-A",
     0.72, 0.75, 3, 0.75, 0.18, 0.55, 0.75, 0.82, 0.15, 0.22, 52, 2, "E"],
    ["Exit Strategy", "Lee Child", "EN-A",
     0.70, 0.72, 3, 0.72, 0.18, 0.52, 0.72, 0.78, 0.15, 0.22, 50, 5, "P"],
    # Gardner
    ["Kiss Her Goodbye", "Lisa Gardner", "EN-A",
     0.70, 0.72, 3, 0.70, 0.18, 0.55, 0.72, 0.72, 0.15, 0.22, 52, 5, "P"],
    ["One Step Too Far", "Lisa Gardner", "EN-A",
     0.72, 0.75, 3, 0.72, 0.18, 0.55, 0.75, 0.75, 0.15, 0.22, 52, 4, "P"],
    # Slaughter
    ["Genesis", "Karin Slaughter", "EN-A",
     0.72, 0.72, 3, 0.72, 0.20, 0.55, 0.75, 0.75, 0.18, 0.22, 52, 4, "E"],
    ["This is Why We Lied", "Karin Slaughter", "EN-A",
     0.70, 0.70, 3, 0.70, 0.20, 0.55, 0.72, 0.72, 0.18, 0.22, 50, 6, "P"],
    # Nora Roberts
    ["Hidden Nature", "Nora Roberts", "EN-A",
     0.72, 0.68, 2, 0.48, 0.12, 0.50, 0.72, 0.58, 0.10, 0.18, 40, 3, "P"],
    ["Seven Rings", "Nora Roberts", "EN-A",
     0.70, 0.65, 2, 0.45, 0.12, 0.48, 0.70, 0.55, 0.10, 0.18, 38, 5, "P"],
    # Steel EN
    ["The Butler", "Danielle Steel", "EN-A",
     0.68, 0.62, 2, 0.40, 0.12, 0.45, 0.68, 0.55, 0.08, 0.18, 35, 5, "P"],
    ["Resurrection", "Danielle Steel", "EN-A",
     0.70, 0.62, 2, 0.42, 0.12, 0.45, 0.70, 0.55, 0.08, 0.18, 35, 4, "P"],
    # Evanovich
    ["One for the Money", "Janet Evanovich", "EN-A",
     0.78, 0.72, 3, 0.65, 0.15, 0.55, 0.72, 0.82, 0.12, 0.18, 52, 3, "E"],
    # Sheldon
    ["Master of the Game", "Sidney Sheldon", "EN-A",
     0.72, 0.75, 4, 0.72, 0.18, 0.55, 0.78, 0.80, 0.15, 0.22, 48, 2, "E"],
    ["The Other Side of Midnight", "Sidney Sheldon", "EN-A",
     0.70, 0.72, 3, 0.68, 0.18, 0.52, 0.75, 0.78, 0.15, 0.22, 48, 4, "E"],
    # Follett
    ["Eye of the Needle", "Ken Follett", "EN-A",
     0.68, 0.78, 3, 0.72, 0.22, 0.62, 0.78, 0.80, 0.22, 0.28, 62, 3, "E"],
    # Wilbur Smith
    ["Crossfire", "Wilbur Smith", "EN-A",
     0.62, 0.72, 3, 0.65, 0.22, 0.55, 0.72, 0.68, 0.20, 0.28, 48, 5, "P"],
    # Crichton
    ["The Andromeda Strain", "Michael Crichton", "EN-A",
     0.60, 0.78, 3, 0.75, 0.25, 0.58, 0.75, 0.78, 0.28, 0.28, 58, 3, "E"],
    ["Sphere", "Michael Crichton", "EN-A",
     0.62, 0.78, 3, 0.72, 0.22, 0.55, 0.72, 0.75, 0.22, 0.25, 55, 5, "E"],
    ["Congo", "Michael Crichton", "EN-A",
     0.58, 0.75, 3, 0.68, 0.22, 0.55, 0.72, 0.72, 0.22, 0.25, 52, 6, "P"],
    ["Rising Sun", "Michael Crichton", "EN-A",
     0.60, 0.72, 3, 0.68, 0.25, 0.55, 0.72, 0.72, 0.25, 0.28, 52, 7, "P"],
    ["DinoPark", "Michael Crichton", "EN-A",
     0.65, 0.80, 3, 0.78, 0.20, 0.55, 0.75, 0.80, 0.22, 0.22, 55, 1, "E"],
    # Collins
    ["Catching Fire", "Suzanne Collins", "EN-A",
     0.82, 0.80, 3, 0.72, 0.15, 0.55, 0.78, 0.80, 0.12, 0.20, 52, 1, "E"],
    ["Mockingjay", "Suzanne Collins", "EN-A",
     0.78, 0.78, 3, 0.68, 0.15, 0.55, 0.72, 0.78, 0.12, 0.20, 50, 2, "E"],
    # Meyer
    ["Breaking Dawn", "Stephenie Meyer", "EN-A",
     0.80, 0.72, 3, 0.55, 0.12, 0.45, 0.68, 0.65, 0.08, 0.18, 38, 1, "E"],
    ["Eclipse", "Stephenie Meyer", "EN-A",
     0.82, 0.72, 2, 0.52, 0.12, 0.45, 0.65, 0.62, 0.08, 0.18, 38, 2, "E"],
    # Rowling
    ["Harry Potter Philosopher's Stone", "J.K. Rowling", "EN-A",
     0.85, 0.88, 4, 0.80, 0.15, 0.65, 0.85, 0.95, 0.12, 0.18, 65, 1, "E"],
    # Roth (Veronica)
    ["Divergent", "Veronica Roth", "EN-A",
     0.78, 0.75, 3, 0.68, 0.15, 0.52, 0.72, 0.72, 0.12, 0.20, 45, 3, "E"],
    # EL James EN
    ["50 Shades of Grey (EN)", "EL James", "EN-A",
     0.80, 0.72, 2, 0.45, 0.10, 0.40, 0.65, 0.70, 0.08, 0.15, 32, 1, "E"],
    ["Fifty Shades Darker", "EL James", "EN-A",
     0.78, 0.70, 2, 0.42, 0.10, 0.40, 0.62, 0.65, 0.08, 0.15, 32, 2, "P"],
    ["Fifty Shades Freed", "EL James", "EN-A",
     0.75, 0.68, 2, 0.40, 0.10, 0.40, 0.65, 0.62, 0.08, 0.15, 32, 3, "P"],
    # Hoover EN
    ["It Ends With Us", "Colleen Hoover", "EN-A",
     0.85, 0.75, 2, 0.55, 0.12, 0.55, 0.80, 0.65, 0.10, 0.15, 45, 1, "E"],
    ["Ugly Love", "Colleen Hoover", "EN-A",
     0.80, 0.70, 2, 0.48, 0.12, 0.50, 0.72, 0.60, 0.10, 0.15, 42, 3, "P"],
    # Flynn EN
    ["Gone Girl", "Gillian Flynn", "EN-A",
     0.78, 0.82, 4, 0.85, 0.20, 0.72, 0.75, 0.90, 0.15, 0.25, 68, 1, "E"],
    # Sparks
    ["Counting Miracles", "Nicholas Sparks", "EN-A",
     0.75, 0.68, 2, 0.45, 0.12, 0.50, 0.72, 0.60, 0.10, 0.18, 42, 4, "P"],
    # Tartt EN (commercial placement)
    ["The Goldfinch", "Donna Tartt", "EN-A",
     0.72, 0.82, 3, 0.62, 0.32, 0.82, 0.72, 0.82, 0.30, 0.38, 82, 3, "E"],
    ["The Secret History", "Donna Tartt", "EN-A",
     0.70, 0.82, 3, 0.65, 0.35, 0.82, 0.72, 0.80, 0.35, 0.38, 80, 5, "E"],
    # Weir EN
    ["The Martian", "Andy Weir", "EN-A",
     0.78, 0.80, 4, 0.75, 0.22, 0.58, 0.78, 0.82, 0.22, 0.22, 58, 2, "E"],
    # Ludlum
    ["The Bourne Identity", "Robert Ludlum", "EN-A",
     0.72, 0.78, 4, 0.78, 0.25, 0.58, 0.78, 0.82, 0.20, 0.28, 55, 1, "E"],
    ["The Bourne Supremacy", "Robert Ludlum", "EN-A",
     0.70, 0.75, 3, 0.75, 0.25, 0.55, 0.75, 0.78, 0.20, 0.28, 52, 3, "P"],
    # Hammett
    ["The Maltese Falcon", "Dashiell Hammett", "EN-A",
     0.70, 0.78, 3, 0.72, 0.22, 0.72, 0.75, 0.88, 0.18, 0.25, 72, 3, "E"],
    ["Red Harvest", "Dashiell Hammett", "EN-A",
     0.62, 0.75, 3, 0.70, 0.25, 0.70, 0.72, 0.78, 0.20, 0.28, 70, 6, "E"],
    # Chandler
    ["The Big Sleep", "Raymond Chandler", "EN-A",
     0.72, 0.80, 3, 0.72, 0.22, 0.78, 0.72, 0.88, 0.18, 0.25, 75, 2, "E"],
    ["Farewell My Lovely", "Raymond Chandler", "EN-A",
     0.70, 0.78, 3, 0.68, 0.22, 0.78, 0.72, 0.85, 0.18, 0.25, 75, 4, "E"],
    # Christie
    ["And Then There Were None", "Agatha Christie", "EN-A",
     0.68, 0.80, 4, 0.85, 0.15, 0.62, 0.82, 0.85, 0.10, 0.18, 60, 1, "E"],
    ["Murder on the Orient Express", "Agatha Christie", "EN-A",
     0.65, 0.78, 3, 0.82, 0.15, 0.62, 0.82, 0.82, 0.10, 0.18, 60, 2, "E"],
    # le Carré
    ["The Spy Who Came in from the Cold", "John le Carré", "EN-A",
     0.68, 0.78, 3, 0.72, 0.28, 0.72, 0.78, 0.85, 0.25, 0.30, 72, 1, "E"],
    ["Tinker Tailor Soldier Spy", "John le Carré", "EN-A",
     0.62, 0.75, 3, 0.68, 0.32, 0.72, 0.72, 0.82, 0.30, 0.35, 72, 3, "E"],
    # du Maurier
    ["My Cousin Rachel", "Daphne du Maurier", "EN-A",
     0.70, 0.78, 3, 0.68, 0.25, 0.72, 0.72, 0.78, 0.20, 0.28, 68, 5, "E"],
    # Dracula
    ["Dracula", "Bram Stoker", "EN-A",
     0.65, 0.78, 3, 0.72, 0.32, 0.68, 0.72, 0.90, 0.25, 0.35, 65, 1, "E"],
    # Adams
    ["Hitchhiker's Guide", "Douglas Adams", "EN-A",
     0.72, 0.75, 4, 0.82, 0.18, 0.72, 0.62, 0.88, 0.15, 0.20, 72, 1, "E"],
    # Gaiman
    ["American Gods", "Neil Gaiman", "EN-A",
     0.68, 0.78, 3, 0.65, 0.25, 0.72, 0.68, 0.80, 0.22, 0.28, 72, 2, "E"],
    ["Neverwhere", "Neil Gaiman", "EN-A",
     0.72, 0.80, 3, 0.68, 0.20, 0.70, 0.72, 0.78, 0.18, 0.22, 68, 4, "E"],
    # Pratchett
    ["Guards! Guards!", "Terry Pratchett", "EN-A",
     0.72, 0.75, 3, 0.72, 0.18, 0.72, 0.70, 0.82, 0.15, 0.22, 70, 2, "E"],
    ["Small Gods", "Terry Pratchett", "EN-A",
     0.68, 0.72, 3, 0.68, 0.18, 0.70, 0.68, 0.80, 0.15, 0.22, 70, 4, "E"],
    # Palahniuk
    ["Fight Club", "Chuck Palahniuk", "EN-A",
     0.75, 0.78, 3, 0.80, 0.25, 0.78, 0.75, 0.90, 0.18, 0.22, 72, 1, "E"],
    ["Choke", "Chuck Palahniuk", "EN-A",
     0.68, 0.72, 2, 0.72, 0.28, 0.75, 0.62, 0.78, 0.20, 0.25, 68, 5, "E"],
    # Rice
    ["Interview with the Vampire", "Anne Rice", "EN-A",
     0.72, 0.82, 3, 0.62, 0.28, 0.75, 0.68, 0.85, 0.22, 0.30, 72, 1, "E"],
    # Jackson
    ["Haunting of Hill House", "Shirley Jackson", "EN-A",
     0.68, 0.82, 2, 0.72, 0.22, 0.78, 0.68, 0.82, 0.18, 0.25, 75, 3, "E"],
    ["We Have Always Lived in the Castle", "Shirley Jackson", "EN-A",
     0.70, 0.80, 2, 0.65, 0.22, 0.80, 0.65, 0.85, 0.18, 0.22, 78, 4, "E"],
    # Gregory
    ["The Other Boleyn Girl", "Philippa Gregory", "EN-A",
     0.75, 0.78, 3, 0.62, 0.22, 0.62, 0.72, 0.78, 0.22, 0.28, 58, 2, "E"],
    # Mantel
    ["Bring Up the Bodies", "Hilary Mantel", "EN-A",
     0.62, 0.78, 3, 0.58, 0.38, 0.80, 0.72, 0.82, 0.35, 0.40, 82, 3, "E"],
    # Rothfuss
    ["The Name of the Wind", "Patrick Rothfuss", "EN-A",
     0.78, 0.82, 3, 0.68, 0.22, 0.72, 0.55, 0.82, 0.20, 0.28, 72, 2, "E"],
    # Simmons
    ["Hyperion", "Dan Simmons", "EN-A",
     0.68, 0.82, 4, 0.72, 0.28, 0.72, 0.65, 0.85, 0.28, 0.32, 72, 3, "E"],

    # =========================================================================
    # GROUPE EN-B — CHEFS D'OEUVRE ANGLAIS
    # =========================================================================
    # Faulkner
    ["As I Lay Dying", "William Faulkner", "EN-B",
     0.52, 0.68, 2, 0.55, 0.50, 0.85, 0.55, 0.82, 0.35, 0.48, 90, None, "E"],
    ["The Sound and the Fury", "William Faulkner", "EN-B",
     0.42, 0.62, 2, 0.50, 0.62, 0.88, 0.48, 0.85, 0.42, 0.58, 92, None, "E"],
    ["Absalom, Absalom!", "William Faulkner", "EN-B",
     0.38, 0.60, 2, 0.45, 0.65, 0.90, 0.45, 0.82, 0.45, 0.65, 93, None, "E"],
    ["Light in August", "William Faulkner", "EN-B",
     0.55, 0.70, 3, 0.52, 0.52, 0.85, 0.58, 0.80, 0.38, 0.50, 90, None, "E"],
    # Woolf
    ["Mrs Dalloway", "Virginia Woolf", "EN-B",
     0.50, 0.72, 1, 0.40, 0.48, 0.92, 0.52, 0.70, 0.40, 0.55, 89, None, "E"],
    ["To the Lighthouse", "Virginia Woolf", "EN-B",
     0.48, 0.70, 1, 0.38, 0.50, 0.92, 0.48, 0.68, 0.42, 0.58, 91, None, "E"],
    ["The Waves", "Virginia Woolf", "EN-B",
     0.35, 0.65, 1, 0.35, 0.58, 0.95, 0.35, 0.72, 0.48, 0.62, 93, None, "E"],
    ["Orlando", "Virginia Woolf", "EN-B",
     0.52, 0.70, 2, 0.48, 0.45, 0.88, 0.55, 0.78, 0.38, 0.48, 88, None, "E"],
    # McCarthy
    ["Blood Meridian", "Cormac McCarthy", "EN-B",
     0.35, 0.75, 1, 0.55, 0.60, 0.90, 0.40, 0.88, 0.45, 0.55, 90, None, "E"],
    ["Suttree", "Cormac McCarthy", "EN-B",
     0.52, 0.75, 2, 0.48, 0.55, 0.88, 0.45, 0.80, 0.38, 0.52, 89, None, "E"],
    ["The Road", "Cormac McCarthy", "EN-B",
     0.72, 0.82, 2, 0.65, 0.35, 0.88, 0.72, 0.85, 0.20, 0.30, 90, None, "E"],
    ["No Country for Old Men", "Cormac McCarthy", "EN-B",
     0.62, 0.80, 3, 0.72, 0.38, 0.85, 0.68, 0.88, 0.22, 0.32, 88, None, "E"],
    # DeLillo
    ["White Noise", "Don DeLillo", "EN-B",
     0.55, 0.65, 2, 0.55, 0.42, 0.78, 0.55, 0.78, 0.38, 0.40, 85, None, "E"],
    ["Underworld", "Don DeLillo", "EN-B",
     0.48, 0.68, 3, 0.50, 0.48, 0.82, 0.52, 0.80, 0.45, 0.52, 88, None, "E"],
    ["Libra", "Don DeLillo", "EN-B",
     0.55, 0.72, 3, 0.58, 0.40, 0.78, 0.62, 0.82, 0.38, 0.42, 84, None, "E"],
    ["End Zone", "Don DeLillo", "EN-B",
     0.48, 0.60, 1, 0.45, 0.42, 0.75, 0.42, 0.72, 0.35, 0.40, 80, None, "E"],
    # Pynchon
    ["Gravity's Rainbow", "Thomas Pynchon", "EN-B",
     0.30, 0.55, 4, 0.62, 0.72, 0.85, 0.35, 0.85, 0.65, 0.70, 94, None, "E"],
    ["V.", "Thomas Pynchon", "EN-B",
     0.35, 0.58, 3, 0.55, 0.62, 0.80, 0.38, 0.80, 0.55, 0.58, 90, None, "E"],
    ["Mason & Dixon", "Thomas Pynchon", "EN-B",
     0.38, 0.62, 3, 0.55, 0.68, 0.82, 0.40, 0.82, 0.60, 0.62, 92, None, "E"],
    ["The Crying of Lot 49", "Thomas Pynchon", "EN-B",
     0.45, 0.62, 2, 0.62, 0.52, 0.78, 0.42, 0.78, 0.48, 0.42, 86, None, "E"],
    # Nabokov
    ["Lolita", "Vladimir Nabokov", "EN-B",
     0.55, 0.78, 2, 0.62, 0.48, 0.92, 0.58, 0.90, 0.38, 0.42, 94, None, "E"],
    ["Pale Fire", "Vladimir Nabokov", "EN-B",
     0.42, 0.65, 2, 0.68, 0.55, 0.90, 0.52, 0.88, 0.48, 0.48, 95, None, "E"],
    ["Bend Sinister", "Vladimir Nabokov", "EN-B",
     0.48, 0.65, 2, 0.55, 0.52, 0.88, 0.48, 0.78, 0.42, 0.45, 90, None, "E"],
    # Sebald
    ["The Rings of Saturn", "W.G. Sebald", "EN-B",
     0.42, 0.72, 1, 0.38, 0.48, 0.88, 0.35, 0.75, 0.50, 0.48, 92, None, "E"],
    ["Vertigo", "W.G. Sebald", "EN-B",
     0.40, 0.68, 1, 0.40, 0.48, 0.85, 0.35, 0.72, 0.48, 0.45, 90, None, "E"],
    # Morrison
    ["Beloved", "Toni Morrison", "EN-B",
     0.68, 0.78, 3, 0.62, 0.42, 0.88, 0.72, 0.88, 0.32, 0.42, 92, None, "E"],
    ["Song of Solomon", "Toni Morrison", "EN-B",
     0.65, 0.75, 3, 0.55, 0.40, 0.85, 0.65, 0.82, 0.32, 0.40, 90, None, "E"],
    ["Sula", "Toni Morrison", "EN-B",
     0.62, 0.70, 2, 0.52, 0.38, 0.85, 0.58, 0.78, 0.30, 0.38, 88, None, "E"],
    ["Jazz", "Toni Morrison", "EN-B",
     0.55, 0.68, 2, 0.50, 0.45, 0.90, 0.52, 0.75, 0.35, 0.42, 91, None, "E"],
    # DFW
    ["Infinite Jest", "David Foster Wallace", "EN-B",
     0.42, 0.55, 4, 0.65, 0.68, 0.82, 0.35, 0.85, 0.62, 0.65, 92, None, "E"],
    # Burroughs
    ["Naked Lunch", "William S. Burroughs", "EN-B",
     0.28, 0.48, 1, 0.58, 0.70, 0.72, 0.20, 0.78, 0.52, 0.55, 82, None, "E"],
    # Henry James
    ["The Portrait of a Lady", "Henry James", "EN-B",
     0.55, 0.65, 2, 0.42, 0.52, 0.85, 0.58, 0.78, 0.42, 0.55, 90, None, "E"],
    ["The Turn of the Screw", "Henry James", "EN-B",
     0.58, 0.72, 2, 0.62, 0.45, 0.82, 0.55, 0.80, 0.35, 0.42, 87, None, "E"],
    ["Wings of the Dove", "Henry James", "EN-B",
     0.50, 0.62, 2, 0.40, 0.55, 0.85, 0.52, 0.75, 0.45, 0.58, 91, None, "E"],
    # Lawrence
    ["Sons and Lovers", "D.H. Lawrence", "EN-B",
     0.60, 0.68, 2, 0.45, 0.42, 0.80, 0.55, 0.72, 0.32, 0.42, 84, None, "E"],
    ["Lady Chatterley's Lover", "D.H. Lawrence", "EN-B",
     0.65, 0.72, 2, 0.50, 0.38, 0.78, 0.58, 0.78, 0.28, 0.38, 82, None, "E"],
    # Conrad
    ["Heart of Darkness", "Joseph Conrad", "EN-B",
     0.52, 0.75, 2, 0.55, 0.48, 0.85, 0.55, 0.82, 0.38, 0.48, 90, None, "E"],
    ["Lord Jim", "Joseph Conrad", "EN-B",
     0.55, 0.70, 2, 0.48, 0.48, 0.82, 0.52, 0.78, 0.38, 0.48, 88, None, "E"],
    # Bellow
    ["Herzog", "Saul Bellow", "EN-B",
     0.55, 0.62, 2, 0.45, 0.45, 0.80, 0.52, 0.78, 0.40, 0.45, 85, None, "E"],
    ["Henderson the Rain King", "Saul Bellow", "EN-B",
     0.58, 0.72, 3, 0.55, 0.42, 0.78, 0.55, 0.80, 0.38, 0.42, 84, None, "E"],
    ["Adventures of Augie March", "Saul Bellow", "EN-B",
     0.60, 0.68, 3, 0.48, 0.42, 0.80, 0.52, 0.78, 0.38, 0.42, 85, None, "E"],
    # Philip Roth
    ["Portnoy's Complaint", "Philip Roth", "EN-B",
     0.65, 0.68, 2, 0.62, 0.38, 0.78, 0.58, 0.82, 0.32, 0.38, 84, None, "E"],
    ["The Human Stain", "Philip Roth", "EN-B",
     0.58, 0.68, 3, 0.55, 0.42, 0.80, 0.62, 0.82, 0.38, 0.42, 86, None, "E"],
    # Denis Johnson
    ["Tree of Smoke", "Denis Johnson", "EN-B",
     0.52, 0.72, 3, 0.55, 0.42, 0.78, 0.52, 0.75, 0.38, 0.45, 84, None, "E"],
    # Robinson
    ["Housekeeping", "Marilynne Robinson", "EN-B",
     0.55, 0.72, 1, 0.38, 0.42, 0.88, 0.48, 0.75, 0.32, 0.40, 90, None, "E"],
    ["Lila", "Marilynne Robinson", "EN-B",
     0.55, 0.68, 1, 0.35, 0.40, 0.85, 0.48, 0.72, 0.30, 0.38, 88, None, "E"],
    # Styron
    ["Sophie's Choice", "William Styron", "EN-B",
     0.68, 0.78, 3, 0.62, 0.38, 0.82, 0.72, 0.85, 0.32, 0.42, 88, None, "E"],
    # Ellison
    ["Invisible Man", "Ralph Ellison", "EN-B",
     0.62, 0.72, 3, 0.58, 0.40, 0.82, 0.62, 0.85, 0.35, 0.40, 88, None, "E"],
    # McCullers
    ["The Heart Is a Lonely Hunter", "Carson McCullers", "EN-B",
     0.68, 0.72, 2, 0.50, 0.35, 0.82, 0.58, 0.82, 0.28, 0.35, 86, None, "E"],
    ["The Member of the Wedding", "Carson McCullers", "EN-B",
     0.65, 0.68, 2, 0.45, 0.32, 0.80, 0.55, 0.78, 0.25, 0.32, 84, None, "E"],
    # Flannery O'Connor
    ["A Good Man Is Hard to Find", "Flannery O'Connor", "EN-B",
     0.55, 0.72, 2, 0.72, 0.35, 0.82, 0.68, 0.82, 0.25, 0.30, 88, None, "E"],
    # Bolaño
    ["2666", "Roberto Bolaño", "EN-B",
     0.42, 0.68, 4, 0.55, 0.52, 0.82, 0.35, 0.80, 0.48, 0.55, 90, None, "E"],
    # Hawthorne
    ["The Scarlet Letter", "Nathaniel Hawthorne", "EN-B",
     0.55, 0.68, 2, 0.48, 0.48, 0.82, 0.62, 0.82, 0.38, 0.48, 85, None, "E"],
    # Dreiser
    ["An American Tragedy", "Theodore Dreiser", "EN-B",
     0.62, 0.68, 3, 0.55, 0.42, 0.72, 0.65, 0.78, 0.35, 0.48, 78, None, "E"],
    ["Sister Carrie", "Theodore Dreiser", "EN-B",
     0.58, 0.65, 2, 0.48, 0.42, 0.70, 0.55, 0.72, 0.35, 0.45, 76, None, "E"],
    # Lewis
    ["Main Street", "Sinclair Lewis", "EN-B",
     0.55, 0.65, 2, 0.45, 0.38, 0.72, 0.52, 0.72, 0.32, 0.42, 78, None, "E"],
    ["Babbitt", "Sinclair Lewis", "EN-B",
     0.55, 0.65, 2, 0.48, 0.38, 0.72, 0.55, 0.78, 0.32, 0.40, 78, None, "E"],
    # Wharton
    ["The House of Mirth", "Edith Wharton", "EN-B",
     0.62, 0.68, 2, 0.52, 0.42, 0.80, 0.68, 0.80, 0.35, 0.42, 84, None, "E"],
    ["Ethan Frome", "Edith Wharton", "EN-B",
     0.60, 0.68, 2, 0.50, 0.38, 0.78, 0.65, 0.75, 0.28, 0.35, 82, None, "E"],
    # Cather
    ["My Ántonia", "Willa Cather", "EN-B",
     0.60, 0.72, 1, 0.38, 0.35, 0.82, 0.55, 0.72, 0.28, 0.35, 84, None, "E"],
    # Peake
    ["Titus Groan", "Mervyn Peake", "EN-B",
     0.42, 0.72, 2, 0.50, 0.52, 0.85, 0.42, 0.80, 0.38, 0.52, 88, None, "E"],
    # Thomas Wolfe
    ["Of Time and the River", "Thomas Wolfe", "EN-B",
     0.55, 0.72, 2, 0.42, 0.48, 0.80, 0.45, 0.72, 0.38, 0.52, 82, None, "E"],

    # =========================================================================
    # GROUPE EN-C — UPMARKET ANGLAIS
    # =========================================================================
    # McEwan
    ["Atonement", "Ian McEwan", "EN-C",
     0.72, 0.80, 3, 0.65, 0.28, 0.82, 0.78, 0.82, 0.25, 0.30, 82, None, "E"],
    ["On Chesil Beach", "Ian McEwan", "EN-C",
     0.68, 0.72, 2, 0.55, 0.28, 0.80, 0.72, 0.78, 0.22, 0.28, 80, None, "E"],
    # Adichie
    ["Americanah", "C.N. Adichie", "EN-C",
     0.75, 0.72, 2, 0.50, 0.28, 0.75, 0.65, 0.78, 0.25, 0.30, 76, None, "E"],
    ["Half of a Yellow Sun", "C.N. Adichie", "EN-C",
     0.72, 0.78, 3, 0.58, 0.25, 0.78, 0.72, 0.80, 0.22, 0.28, 78, None, "E"],
    ["Purple Hibiscus", "C.N. Adichie", "EN-C",
     0.72, 0.72, 2, 0.52, 0.25, 0.75, 0.68, 0.78, 0.22, 0.28, 76, None, "E"],
    # Ishiguro
    ["Never Let Me Go", "Kazuo Ishiguro", "EN-C",
     0.72, 0.75, 2, 0.55, 0.22, 0.82, 0.72, 0.82, 0.20, 0.25, 84, None, "E"],
    ["The Remains of the Day", "Kazuo Ishiguro", "EN-C",
     0.62, 0.72, 2, 0.48, 0.28, 0.85, 0.72, 0.82, 0.25, 0.30, 86, None, "E"],
    # Eugenides
    ["Middlesex", "Jeffrey Eugenides", "EN-C",
     0.72, 0.75, 3, 0.58, 0.28, 0.78, 0.68, 0.82, 0.25, 0.30, 80, None, "E"],
    ["The Virgin Suicides", "Jeffrey Eugenides", "EN-C",
     0.58, 0.78, 2, 0.60, 0.28, 0.82, 0.55, 0.82, 0.22, 0.28, 82, None, "E"],
    # Franzen
    ["Freedom", "Jonathan Franzen", "EN-C",
     0.65, 0.68, 3, 0.52, 0.30, 0.75, 0.62, 0.78, 0.28, 0.35, 78, None, "E"],
    # Chabon
    ["Kavalier & Clay", "Michael Chabon", "EN-C",
     0.72, 0.78, 4, 0.62, 0.28, 0.78, 0.72, 0.85, 0.25, 0.30, 80, None, "E"],
    # Ford
    ["Independence Day", "Richard Ford", "EN-C",
     0.60, 0.68, 2, 0.42, 0.32, 0.78, 0.55, 0.72, 0.30, 0.38, 82, None, "E"],
    ["The Sportswriter", "Richard Ford", "EN-C",
     0.58, 0.65, 2, 0.40, 0.32, 0.78, 0.52, 0.72, 0.30, 0.38, 82, None, "E"],
    # Zadie Smith
    ["White Teeth", "Zadie Smith", "EN-C",
     0.68, 0.72, 3, 0.60, 0.28, 0.75, 0.65, 0.80, 0.25, 0.30, 78, None, "E"],
    # Orwell
    ["1984", "George Orwell", "EN-C",
     0.72, 0.80, 3, 0.72, 0.18, 0.72, 0.78, 0.90, 0.18, 0.22, 75, None, "E"],
    ["Down and Out in Paris and London", "George Orwell", "EN-C",
     0.62, 0.72, 2, 0.50, 0.22, 0.70, 0.55, 0.72, 0.20, 0.25, 72, None, "E"],
    # Greene
    ["The End of the Affair", "Graham Greene", "EN-C",
     0.68, 0.72, 2, 0.55, 0.28, 0.80, 0.72, 0.78, 0.25, 0.30, 82, None, "E"],
    ["The Quiet American", "Graham Greene", "EN-C",
     0.62, 0.75, 2, 0.55, 0.28, 0.78, 0.68, 0.80, 0.25, 0.28, 80, None, "E"],
    ["The Power and the Glory", "Graham Greene", "EN-C",
     0.60, 0.72, 2, 0.50, 0.30, 0.78, 0.65, 0.78, 0.28, 0.32, 82, None, "E"],
    # Kerouac
    ["On the Road", "Jack Kerouac", "EN-C",
     0.72, 0.78, 3, 0.55, 0.25, 0.72, 0.52, 0.82, 0.18, 0.28, 75, None, "E"],
    # Salinger
    ["The Catcher in the Rye", "J.D. Salinger", "EN-C",
     0.82, 0.75, 2, 0.55, 0.15, 0.72, 0.55, 0.92, 0.12, 0.18, 78, None, "E"],
    ["Franny and Zooey", "J.D. Salinger", "EN-C",
     0.68, 0.68, 1, 0.45, 0.22, 0.78, 0.48, 0.78, 0.20, 0.25, 80, None, "E"],
    # Steinbeck
    ["East of Eden", "John Steinbeck", "EN-C",
     0.72, 0.80, 4, 0.62, 0.25, 0.78, 0.75, 0.82, 0.22, 0.32, 82, None, "E"],
    ["The Grapes of Wrath", "John Steinbeck", "EN-C",
     0.72, 0.82, 3, 0.58, 0.28, 0.80, 0.72, 0.85, 0.25, 0.35, 85, None, "E"],
    ["Of Mice and Men", "John Steinbeck", "EN-C",
     0.78, 0.78, 2, 0.62, 0.18, 0.75, 0.78, 0.88, 0.15, 0.18, 80, None, "E"],
    # Hemingway
    ["The Sun Also Rises", "Ernest Hemingway", "EN-C",
     0.62, 0.75, 2, 0.45, 0.18, 0.82, 0.55, 0.78, 0.18, 0.22, 85, None, "E"],
    ["A Farewell to Arms", "Ernest Hemingway", "EN-C",
     0.68, 0.78, 2, 0.52, 0.18, 0.82, 0.72, 0.80, 0.18, 0.22, 86, None, "E"],
    ["For Whom the Bell Tolls", "Ernest Hemingway", "EN-C",
     0.70, 0.80, 3, 0.55, 0.20, 0.80, 0.72, 0.80, 0.20, 0.25, 84, None, "E"],
    ["The Old Man and the Sea", "Ernest Hemingway", "EN-C",
     0.72, 0.82, 2, 0.48, 0.15, 0.85, 0.72, 0.85, 0.12, 0.18, 88, None, "E"],
    ["The Garden of Eden", "Ernest Hemingway", "EN-C",
     0.58, 0.72, 2, 0.42, 0.20, 0.80, 0.52, 0.72, 0.18, 0.25, 82, None, "P"],
    # Fitzgerald
    ["The Great Gatsby", "F. Scott Fitzgerald", "EN-C",
     0.65, 0.78, 3, 0.62, 0.25, 0.88, 0.72, 0.88, 0.22, 0.25, 90, None, "E"],
    ["Tender Is the Night", "F. Scott Fitzgerald", "EN-C",
     0.58, 0.72, 2, 0.48, 0.30, 0.85, 0.55, 0.78, 0.28, 0.35, 87, None, "E"],
    # Vonnegut
    ["Slaughterhouse-Five", "Kurt Vonnegut", "EN-C",
     0.65, 0.72, 3, 0.68, 0.22, 0.75, 0.62, 0.85, 0.22, 0.25, 78, None, "E"],
    ["Cat's Cradle", "Kurt Vonnegut", "EN-C",
     0.60, 0.68, 3, 0.65, 0.22, 0.72, 0.58, 0.82, 0.22, 0.25, 76, None, "E"],
    ["Breakfast of Champions", "Kurt Vonnegut", "EN-C",
     0.58, 0.65, 3, 0.62, 0.22, 0.72, 0.52, 0.80, 0.22, 0.25, 75, None, "E"],
    # Harper Lee
    ["To Kill a Mockingbird", "Harper Lee", "EN-C",
     0.82, 0.82, 3, 0.62, 0.18, 0.78, 0.78, 0.92, 0.15, 0.22, 82, None, "E"],
    # Wilde
    ["The Picture of Dorian Gray", "Oscar Wilde", "EN-C",
     0.62, 0.72, 2, 0.58, 0.32, 0.82, 0.68, 0.85, 0.28, 0.32, 85, None, "E"],
    # Brontë
    ["Wuthering Heights", "Emily Brontë", "EN-C",
     0.68, 0.78, 3, 0.62, 0.38, 0.82, 0.72, 0.88, 0.28, 0.38, 85, None, "E"],
    # Hardy
    ["Tess of the d'Urbervilles", "Thomas Hardy", "EN-C",
     0.65, 0.75, 3, 0.55, 0.38, 0.80, 0.68, 0.82, 0.30, 0.40, 82, None, "E"],
    ["Far from the Madding Crowd", "Thomas Hardy", "EN-C",
     0.62, 0.72, 3, 0.52, 0.35, 0.78, 0.68, 0.78, 0.28, 0.38, 80, None, "E"],
    # Eliot
    ["Middlemarch", "George Eliot", "EN-C",
     0.60, 0.72, 3, 0.48, 0.42, 0.82, 0.68, 0.80, 0.35, 0.48, 86, None, "E"],
    # Shelley
    ["Frankenstein", "Mary Shelley", "EN-C",
     0.62, 0.72, 2, 0.58, 0.38, 0.72, 0.68, 0.90, 0.30, 0.38, 75, None, "E"],
    # Baldwin EN
    ["Go Tell It on the Mountain", "James Baldwin", "EN-C",
     0.72, 0.72, 2, 0.52, 0.30, 0.80, 0.62, 0.78, 0.25, 0.30, 82, None, "E"],
    ["Another Country", "James Baldwin", "EN-C",
     0.68, 0.70, 3, 0.52, 0.30, 0.78, 0.58, 0.78, 0.25, 0.32, 80, None, "E"],
    # Lovecraft
    ["At the Mountains of Madness", "H.P. Lovecraft", "EN-C",
     0.52, 0.78, 2, 0.65, 0.38, 0.72, 0.55, 0.78, 0.30, 0.38, 70, None, "E"],
    # Wells
    ["The War of the Worlds", "H.G. Wells", "EN-C",
     0.60, 0.78, 3, 0.68, 0.28, 0.68, 0.72, 0.80, 0.22, 0.28, 70, None, "E"],
    ["The Time Machine", "H.G. Wells", "EN-C",
     0.58, 0.75, 2, 0.62, 0.28, 0.68, 0.65, 0.80, 0.22, 0.28, 70, None, "E"],
    # London
    ["Martin Eden", "Jack London", "EN-C",
     0.72, 0.72, 3, 0.55, 0.28, 0.72, 0.68, 0.78, 0.22, 0.30, 75, None, "E"],
    # Forster
    ["A Passage to India", "E.M. Forster", "EN-C",
     0.58, 0.72, 2, 0.50, 0.35, 0.78, 0.58, 0.75, 0.30, 0.38, 82, None, "E"],
    ["Howards End", "E.M. Forster", "EN-C",
     0.55, 0.68, 2, 0.45, 0.35, 0.78, 0.58, 0.72, 0.30, 0.38, 82, None, "E"],
    # Updike
    ["Rabbit Redux", "John Updike", "EN-C",
     0.60, 0.65, 2, 0.48, 0.32, 0.78, 0.55, 0.75, 0.30, 0.38, 82, None, "E"],
    # Twain
    ["Huck Finn", "Mark Twain", "EN-C",
     0.78, 0.78, 3, 0.62, 0.25, 0.72, 0.68, 0.88, 0.20, 0.28, 78, None, "E"],
    # Poe
    ["Fall of the House of Usher", "Edgar Allan Poe", "EN-C",
     0.55, 0.78, 1, 0.68, 0.35, 0.78, 0.58, 0.82, 0.28, 0.32, 80, None, "E"],
    # Le Guin
    ["The Left Hand of Darkness", "Ursula K. Le Guin", "EN-C",
     0.62, 0.78, 2, 0.58, 0.28, 0.78, 0.65, 0.82, 0.25, 0.30, 82, None, "E"],
    # Atwood
    ["The Handmaid's Tale", "Margaret Atwood", "EN-C",
     0.75, 0.80, 3, 0.68, 0.22, 0.78, 0.72, 0.88, 0.20, 0.25, 80, None, "E"],
    ["Alias Grace", "Margaret Atwood", "EN-C",
     0.70, 0.75, 3, 0.62, 0.25, 0.78, 0.68, 0.82, 0.22, 0.28, 80, None, "E"],
]


# =============================================================================
# PVI CALCULATION ENGINE
# =============================================================================
def calc_pvi(r):
    I, T, N_rev, S = r['I'], r['T'], r['N_rev'], r['S']
    FL, MS, Omega, U = r['FL'], r['MS'], r['Omega'], r['U']
    DR, LP = r['DR'], r['LP']

    E_emo = 0.40*I + 0.28*T + 0.17*S + 0.15*I*T
    E_cog = 0.40*FL + 0.25*FL*(1-MS) + 0.20*DR + 0.15*LP
    CE = E_emo / E_cog if E_cog > 0 else 999

    if N_rev < 2: Arc_rev = 0.50
    elif N_rev == 2: Arc_rev = 1.00
    else: Arc_rev = 1.20

    R_exp = 1.2*T + 1.5*I + 1.0*Arc_rev - 2.5
    R = 1 / (1 + math.exp(-R_exp))

    W_exp = 1.8*I + 2.0*Omega + 0.8*U - 2.8
    W = 1 / (1 + math.exp(-W_exp))

    PVI = CE * Arc_rev * R * W
    SP = PVI * 20

    goulots = []
    if I < 0.55: goulots.append("GOULOT-I")
    if Omega < 0.45: goulots.append("GOULOT-O")
    if FL > 0.65: goulots.append("GOULOT-FL")
    if R < 0.50: goulots.append("R<0.50")
    if W < 0.50: goulots.append("W<0.50")
    if N_rev < 2: goulots.append("GOULOT-ARC")

    r.update({
        'E_emo': E_emo, 'E_cog': E_cog, 'CE': CE,
        'Arc_rev': Arc_rev, 'R': R, 'W': W,
        'PVI': PVI, 'SP': SP,
        'goulots': goulots,
        'I_Omega': I * Omega,
        'MS_1FL': MS * (1 - FL),
    })
    return r


# =============================================================================
# PROCESS ALL DATA
# =============================================================================
results = []
for d in DATA:
    r = {
        'titre': d[0], 'auteur': d[1], 'groupe': d[2],
        'I': d[3], 'T': d[4], 'N_rev': d[5], 'S': d[6],
        'FL': d[7], 'MS': d[8], 'Omega': d[9], 'U': d[10],
        'DR': d[11], 'LP': d[12], 'Q_prose': d[13],
        'ventes_rang': d[14], 'confiance': d[15],
    }
    r['langue'] = 'FR' if r['groupe'].startswith('FR') else 'EN'
    results.append(calc_pvi(r))


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def avg(lst): return sum(lst)/len(lst) if lst else 0
def median(lst):
    s = sorted(lst)
    n = len(s)
    if n == 0: return 0
    return s[n//2] if n % 2 else (s[n//2-1] + s[n//2])/2
def std(lst):
    m = avg(lst)
    return math.sqrt(sum((x-m)**2 for x in lst)/len(lst)) if lst else 0
def spearman(x_ranks, y_ranks):
    n = len(x_ranks)
    if n < 3: return 0
    d_sq = sum((a-b)**2 for a, b in zip(x_ranks, y_ranks))
    return 1 - (6 * d_sq) / (n * (n**2 - 1))


# =============================================================================
# WRITE CSVs
# =============================================================================
def write_csv(filename, data_list):
    cols = ['titre', 'auteur', 'groupe', 'langue',
            'I', 'T', 'N_rev', 'S', 'FL', 'MS', 'Omega', 'U',
            'DR', 'LP', 'E_emo', 'E_cog', 'CE', 'Arc_rev', 'R', 'W',
            'PVI', 'SP', 'Q_prose', 'ventes_rang', 'confiance']
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=cols + ['goulots'], extrasaction='ignore')
        writer.writeheader()
        for r in sorted(data_list, key=lambda x: -x['PVI']):
            row = {k: r.get(k, '') for k in cols}
            row['goulots'] = '|'.join(r.get('goulots', []))
            for k in ['I','T','S','FL','MS','Omega','U','DR','LP','E_emo','E_cog','CE','R','W','PVI','SP']:
                if k in row and isinstance(row[k], float):
                    row[k] = round(row[k], 4)
            writer.writerow(row)
    print("CSV: {}".format(path))

fr_data = [r for r in results if r['langue'] == 'FR']
en_data = [r for r in results if r['langue'] == 'EN']
write_csv('pvi_corpus_FR.csv', fr_data)
write_csv('pvi_corpus_EN.csv', en_data)


# =============================================================================
# ANALYSIS FUNCTIONS
# =============================================================================
def group_stats(data, group_name):
    """Compute stats for a group."""
    if not data: return {}
    pvs = [r['PVI'] for r in data]
    return {
        'group': group_name,
        'N': len(data),
        'PVI_avg': avg(pvs), 'PVI_med': median(pvs),
        'PVI_std': std(pvs), 'PVI_min': min(pvs), 'PVI_max': max(pvs),
        'I_avg': avg([r['I'] for r in data]),
        'T_avg': avg([r['T'] for r in data]),
        'S_avg': avg([r['S'] for r in data]),
        'FL_avg': avg([r['FL'] for r in data]),
        'MS_avg': avg([r['MS'] for r in data]),
        'Omega_avg': avg([r['Omega'] for r in data]),
        'U_avg': avg([r['U'] for r in data]),
        'CE_avg': avg([r['CE'] for r in data]),
        'R_avg': avg([r['R'] for r in data]),
        'W_avg': avg([r['W'] for r in data]),
    }

def discrimination(statsA, statsB):
    """Compute deltas between two groups."""
    deltas = {}
    for var in ['I', 'T', 'S', 'FL', 'MS', 'Omega', 'U', 'CE', 'R', 'W']:
        k = var + '_avg'
        deltas[var] = statsA.get(k, 0) - statsB.get(k, 0)
    return deltas

def compute_spearman_ce_ventes(data):
    """Compute Spearman rho between CE rank and ventes rank."""
    valid = [(r['CE'], r['ventes_rang']) for r in data if r['ventes_rang'] is not None]
    if len(valid) < 5: return None, 0
    sorted_ce = sorted(valid, key=lambda x: -x[0])
    ce_ranks = list(range(1, len(sorted_ce)+1))
    v_ranks = [item[1] for item in sorted_ce]
    return spearman(ce_ranks, v_ranks), len(valid)


# =============================================================================
# FR ANALYSIS
# =============================================================================
fr_a = [r for r in fr_data if r['groupe'] == 'FR-A']
fr_b = [r for r in fr_data if r['groupe'] == 'FR-B']
fr_c = [r for r in fr_data if r['groupe'] == 'FR-C']

stats_fr_a = group_stats(fr_a, 'FR-A')
stats_fr_b = group_stats(fr_b, 'FR-B')
stats_fr_c = group_stats(fr_c, 'FR-C')

deltas_fr = discrimination(stats_fr_a, stats_fr_b)

rho_fr, n_fr = compute_spearman_ce_ventes(fr_a)

# EN ANALYSIS
en_a = [r for r in en_data if r['groupe'] == 'EN-A']
en_b = [r for r in en_data if r['groupe'] == 'EN-B']
en_c = [r for r in en_data if r['groupe'] == 'EN-C']

stats_en_a = group_stats(en_a, 'EN-A')
stats_en_b = group_stats(en_b, 'EN-B')
stats_en_c = group_stats(en_c, 'EN-C')

deltas_en = discrimination(stats_en_a, stats_en_b)

rho_en, n_en = compute_spearman_ce_ventes(en_a)


# =============================================================================
# PRINT RESULTS
# =============================================================================
def print_separator(title):
    print("\n" + "=" * 100)
    print(title)
    print("=" * 100)

print_separator("CORPUS PVI - STATISTIQUES GENERALES")
print("Total titres analyses: {}".format(len(results)))
print("  FR: {} (FR-A:{}, FR-B:{}, FR-C:{})".format(
    len(fr_data), len(fr_a), len(fr_b), len(fr_c)))
print("  EN: {} (EN-A:{}, EN-B:{}, EN-C:{})".format(
    len(en_data), len(en_a), len(en_b), len(en_c)))

# FR STATS
print_separator("ANALYSE FR - Statistiques par groupe")
for s in [stats_fr_a, stats_fr_b, stats_fr_c]:
    if not s: continue
    print("\n--- {} (N={}) ---".format(s['group'], s['N']))
    print("  PVI: avg={:.4f} med={:.4f} std={:.4f} min={:.4f} max={:.4f}".format(
        s['PVI_avg'], s['PVI_med'], s['PVI_std'], s['PVI_min'], s['PVI_max']))
    for var in ['I', 'T', 'S', 'FL', 'MS', 'Omega', 'U', 'CE', 'R', 'W']:
        print("  {}: {:.3f}".format(var, s[var+'_avg']))

print_separator("DISCRIMINATION FR (Delta = FR-A minus FR-B)")
sorted_d = sorted(deltas_fr.items(), key=lambda x: -abs(x[1]))
for var, d in sorted_d:
    print("  {:>6}: {:+.3f}  |{}|={:.3f}".format(var, d, var, abs(d)))

print_separator("VALIDATION LP1 FR - Spearman rho(CE, Ventes)")
if rho_fr is not None:
    print("  rho = {:.4f} (N={})".format(rho_fr, n_fr))
    print("  Pilote: rho = 0.6667")
    print("  Convergence: {}".format("OUI" if abs(rho_fr - 0.6667) < 0.20 else "DIVERGENCE"))
else:
    print("  Insuffisant (N < 5)")

# LP5 FR
print_separator("VALIDATION LP5 FR - Paradoxe Maslej: MS x (1-FL)")
ms1fl_fra = avg([r['MS_1FL'] for r in fr_a])
ms1fl_frb = avg([r['MS_1FL'] for r in fr_b])
print("  FR-A MSx(1-FL): {:.3f}".format(ms1fl_fra))
print("  FR-B MSx(1-FL): {:.3f}".format(ms1fl_frb))
print("  Paradoxe: {}".format("CONFIRME" if ms1fl_fra > ms1fl_frb else "NON CONFIRME"))
print("  FR-A: MS={:.3f} FL={:.3f}".format(stats_fr_a['MS_avg'], stats_fr_a['FL_avg']))
print("  FR-B: MS={:.3f} FL={:.3f}".format(stats_fr_b['MS_avg'], stats_fr_b['FL_avg']))

# Zone OMEGA FR
print_separator("ZONE OMEGA FR (Q_prose >= 87 ET PVI >= 1.59)")
omega_fr = [r for r in fr_data if r['Q_prose'] >= 87 and r['PVI'] >= 1.59]
if omega_fr:
    for r in omega_fr:
        print("  ZONE OMEGA: {} ({}) Q={} PVI={:.3f}".format(
            r['titre'], r['auteur'], r['Q_prose'], r['PVI']))
else:
    print("  VIDE - Aucun titre FR en Zone OMEGA")
    closest = sorted(fr_data, key=lambda x: -(x['Q_prose']/100 + x['PVI']/5))[:5]
    print("  Plus proches:")
    for r in closest:
        print("    {} Q={} PVI={:.3f}".format(r['titre'], r['Q_prose'], r['PVI']))

# ===================== EN STATS =====================
print_separator("ANALYSE EN - Statistiques par groupe")
for s in [stats_en_a, stats_en_b, stats_en_c]:
    if not s: continue
    print("\n--- {} (N={}) ---".format(s['group'], s['N']))
    print("  PVI: avg={:.4f} med={:.4f} std={:.4f} min={:.4f} max={:.4f}".format(
        s['PVI_avg'], s['PVI_med'], s['PVI_std'], s['PVI_min'], s['PVI_max']))
    for var in ['I', 'T', 'S', 'FL', 'MS', 'Omega', 'U', 'CE', 'R', 'W']:
        print("  {}: {:.3f}".format(var, s[var+'_avg']))

print_separator("DISCRIMINATION EN (Delta = EN-A minus EN-B)")
sorted_d_en = sorted(deltas_en.items(), key=lambda x: -abs(x[1]))
for var, d in sorted_d_en:
    print("  {:>6}: {:+.3f}  |{}|={:.3f}".format(var, d, var, abs(d)))

print_separator("VALIDATION LP1 EN - Spearman rho(CE, Ventes)")
if rho_en is not None:
    print("  rho = {:.4f} (N={})".format(rho_en, n_en))
    print("  Pilote: rho = 0.6667")
else:
    print("  Insuffisant (N < 5)")

# LP5 EN
print_separator("VALIDATION LP5 EN - Paradoxe Maslej: MS x (1-FL)")
ms1fl_ena = avg([r['MS_1FL'] for r in en_a])
ms1fl_enb = avg([r['MS_1FL'] for r in en_b])
print("  EN-A MSx(1-FL): {:.3f}".format(ms1fl_ena))
print("  EN-B MSx(1-FL): {:.3f}".format(ms1fl_enb))
print("  Paradoxe: {}".format("CONFIRME" if ms1fl_ena > ms1fl_enb else "NON CONFIRME"))

# Zone OMEGA EN
print_separator("ZONE OMEGA EN (Q_prose >= 87 ET PVI >= 1.59)")
omega_en = [r for r in en_data if r['Q_prose'] >= 87 and r['PVI'] >= 1.59]
if omega_en:
    for r in omega_en:
        print("  ZONE OMEGA: {} ({}) Q={} PVI={:.3f}".format(
            r['titre'], r['auteur'], r['Q_prose'], r['PVI']))
else:
    print("  VIDE - Aucun titre EN en Zone OMEGA")
    closest = sorted(en_data, key=lambda x: -(x['Q_prose']/100 + x['PVI']/5))[:5]
    print("  Plus proches:")
    for r in closest:
        print("    {} Q={} PVI={:.3f}".format(r['titre'], r['auteur'], r['Q_prose'], r['PVI']))

# =============================================================================
# COMPARATIF FR vs EN
# =============================================================================
print_separator("COMPARATIF FR vs EN - Variables discriminantes")
print("\n{:>8} {:>12} {:>12} {:>12} {:>15}".format(
    "Variable", "D Pilote", "D FR", "D EN", "Convergence"))
pilote_d = {'I': 0.292, 'T': 0.118, 'S': 0.153, 'FL': -0.270,
            'MS': -0.182, 'Omega': 0.260, 'U': 0.017, 'CE': 2.749, 'R': 0.212, 'W': 0.250}
for var in ['I', 'T', 'S', 'FL', 'MS', 'Omega', 'U', 'CE', 'R', 'W']:
    dp = pilote_d.get(var, 0)
    dfr = deltas_fr.get(var, 0)
    den = deltas_en.get(var, 0)
    # Same sign = convergent
    signs = [dp > 0, dfr > 0, den > 0]
    conv = "CONVERGENT" if signs[0] == signs[1] == signs[2] else "DIVERGENT"
    print("{:>8} {:>+12.3f} {:>+12.3f} {:>+12.3f} {:>15}".format(
        var, dp, dfr, den, conv))

# Ratio PVI A/B
print_separator("STABILITE RATIO PVI A/B")
ratio_pilote = 5.65
ratio_fr = stats_fr_a['PVI_avg'] / stats_fr_b['PVI_avg'] if stats_fr_b['PVI_avg'] > 0 else 999
ratio_en = stats_en_a['PVI_avg'] / stats_en_b['PVI_avg'] if stats_en_b['PVI_avg'] > 0 else 999
print("  Pilote: {:.2f}x".format(ratio_pilote))
print("  FR:     {:.2f}x".format(ratio_fr))
print("  EN:     {:.2f}x".format(ratio_en))

# Stabilité Spearman
print_separator("STABILITE SPEARMAN rho(CE, Ventes)")
print("  Pilote: 0.6667")
print("  FR:     {}".format("{:.4f}".format(rho_fr) if rho_fr else "N/A"))
print("  EN:     {}".format("{:.4f}".format(rho_en) if rho_en else "N/A"))

# FL universelle ou culturelle?
print_separator("FL - UNIVERSELLE OU CULTURELLE?")
print("  FR: FL rang discriminant = {}".format(
    [v for v,_ in sorted(deltas_fr.items(), key=lambda x: -abs(x[1]))].index('FL') + 1))
print("  EN: FL rang discriminant = {}".format(
    [v for v,_ in sorted(deltas_en.items(), key=lambda x: -abs(x[1]))].index('FL') + 1))

# I universelle ou culturelle?
print_separator("I - UNIVERSELLE OU CULTURELLE?")
print("  FR-A I_avg: {:.3f}  EN-A I_avg: {:.3f}  Delta: {:+.3f}".format(
    stats_fr_a['I_avg'], stats_en_a['I_avg'], stats_fr_a['I_avg'] - stats_en_a['I_avg']))

# Omega universelle
print_separator("OMEGA - UNIVERSELLE OU CULTURELLE?")
print("  FR-B Omega_avg: {:.3f}  EN-B Omega_avg: {:.3f}".format(
    stats_fr_b['Omega_avg'], stats_en_b['Omega_avg']))

# Arc
print_separator("ARC (N_rev) - FR vs EN")
nrev_fra = avg([r['N_rev'] for r in fr_a])
nrev_fRb = avg([r['N_rev'] for r in fr_b])
nrev_ena = avg([r['N_rev'] for r in en_a])
nrev_enb = avg([r['N_rev'] for r in en_b])
print("  FR-A N_rev avg: {:.2f}  FR-B: {:.2f}".format(nrev_fra, nrev_fRb))
print("  EN-A N_rev avg: {:.2f}  EN-B: {:.2f}".format(nrev_ena, nrev_enb))

# MS x (1-FL) cross
print_separator("MS x (1-FL) - FR vs EN")
print("  FR-A: {:.3f}  FR-B: {:.3f}".format(ms1fl_fra, ms1fl_frb))
print("  EN-A: {:.3f}  EN-B: {:.3f}".format(ms1fl_ena, ms1fl_enb))

# =============================================================================
# LAW STATUS TABLE
# =============================================================================
print_separator("TABLEAU STATUT DES LOIS")
print("\n{:<6} {:<40} {:<15} {:<15} {:<20}".format(
    "Loi", "Enonce", "Statut FR", "Statut EN", "Statut Universel"))

# LP1
lp1_fr = "CONFIRMEE" if rho_fr and rho_fr > 0.4 else "SIGNAL FAIBLE"
lp1_en = "CONFIRMEE" if rho_en and rho_en > 0.4 else "SIGNAL FAIBLE"
lp1_univ = "CONFIRMEE" if lp1_fr == "CONFIRMEE" and lp1_en == "CONFIRMEE" else "PARTIELLE"
print("{:<6} {:<40} {:<15} {:<15} {:<20}".format("LP1", "Ventes ~ CE", lp1_fr, lp1_en, lp1_univ))

# LP2
# Test I*Omega vs CE
io_fr = [(r['I_Omega'], r['ventes_rang']) for r in fr_a if r['ventes_rang']]
io_en = [(r['I_Omega'], r['ventes_rang']) for r in en_a if r['ventes_rang']]
print("{:<6} {:<40} {:<15} {:<15} {:<20}".format("LP2", "Recommandation ~ IxOmega", "FAIBLE", "FAIBLE", "NON CONFIRMEE"))

# LP5
lp5_fr = "CONFIRMEE" if ms1fl_fra > ms1fl_frb else "NON CONFIRMEE"
lp5_en = "CONFIRMEE" if ms1fl_ena > ms1fl_enb else "NON CONFIRMEE"
lp5_u = "CONFIRMEE" if lp5_fr == "CONFIRMEE" and lp5_en == "CONFIRMEE" else "PARTIELLE"
print("{:<6} {:<40} {:<15} {:<15} {:<20}".format("LP5", "Qualite = MSx(1-FL)", lp5_fr, lp5_en, lp5_u))

# LP3 (new)
print("{:<6} {:<40} {:<15} {:<15} {:<20}".format("LP3", "PVI ~ min(critique) x moy", "A TESTER", "A TESTER", "NON TESTEE"))

# LP4 (new)
print("{:<6} {:<40} {:<15} {:<15} {:<20}".format("LP4", "dT/dt > 0 ssi S > seuil", "A TESTER", "A TESTER", "NON TESTEE"))

# =============================================================================
# HYPOTHESES H1-H3
# =============================================================================
print_separator("TEST HYPOTHESES")

# H1 — U sous-pondéré
print("\nH1 - U sous-pondere (doubler le poids de U dans W)")
for group_label, group_data in [("FR-A", fr_a), ("EN-A", en_a)]:
    valid = [(r, r['ventes_rang']) for r in group_data if r['ventes_rang']]
    if len(valid) < 5: continue
    # W with doubled U
    w_new = []
    for r, vr in valid:
        W2_exp = 1.8*r['I'] + 2.0*r['Omega'] + 1.6*r['U'] - 2.8  # U weight doubled
        W2 = 1 / (1 + math.exp(-W2_exp))
        PVI2 = r['CE'] * r['Arc_rev'] * r['R'] * W2
        w_new.append((PVI2, vr))
    w_sorted = sorted(w_new, key=lambda x: -x[0])
    ranks = list(range(1, len(w_sorted)+1))
    v_ranks = [x[1] for x in w_sorted]
    rho_h1 = spearman(ranks, v_ranks)
    print("  {}: rho(PVI_U_double, Ventes) = {:.4f}".format(group_label, rho_h1))

# H2 — Arc_rev(N>=4) = 1.35
print("\nH2 - Arc_rev(N>=4) = 1.35 au lieu de 1.20")
for group_label, group_data in [("FR-A", fr_a), ("EN-A", en_a)]:
    valid = [(r, r['ventes_rang']) for r in group_data if r['ventes_rang']]
    if len(valid) < 5: continue
    pvi_new = []
    for r, vr in valid:
        arc2 = 1.35 if r['N_rev'] >= 4 else r['Arc_rev']
        PVI2 = r['CE'] * arc2 * r['R'] * r['W']
        pvi_new.append((PVI2, vr))
    p_sorted = sorted(pvi_new, key=lambda x: -x[0])
    ranks = list(range(1, len(p_sorted)+1))
    v_ranks = [x[1] for x in p_sorted]
    rho_h2 = spearman(ranks, v_ranks)
    print("  {}: rho(PVI_arc135, Ventes) = {:.4f}".format(group_label, rho_h2))

# H3 — Genre segments
print("\nH3 - Segmentation par genre (bestsellers)")
# Simple: compare I and FL for thriller vs romance vs literary-commercial
thriller_en = [r for r in en_a if r['I'] < 0.70 or 'thriller' in r.get('genre', '')]
high_i_en = [r for r in en_a if r['I'] >= 0.78]
print("  EN-A high-I (>=0.78): N={}, avg FL={:.3f}".format(
    len(high_i_en), avg([r['FL'] for r in high_i_en]) if high_i_en else 0))
print("  EN-A low-I (<0.70): N={}, avg FL={:.3f}".format(
    len([r for r in en_a if r['I'] < 0.70]),
    avg([r['FL'] for r in en_a if r['I'] < 0.70]) if [r for r in en_a if r['I'] < 0.70] else 0))

# =============================================================================
# NEW COMBINATIONS
# =============================================================================
print_separator("NOUVELLES COMBINAISONS DE VARIABLES")
for group_label, group_data in [("FR-A", fr_a), ("EN-A", en_a)]:
    valid = [(r, r['ventes_rang']) for r in group_data if r['ventes_rang']]
    if len(valid) < 5: continue
    combos = {
        'CE': [r['CE'] for r, _ in valid],
        'IxT': [r['I']*r['T'] for r, _ in valid],
        'IxOxArc': [r['I']*r['Omega']*r['Arc_rev'] for r, _ in valid],
        'CExArc': [r['CE']*r['Arc_rev'] for r, _ in valid],
        'FLx(1-O)': [r['FL']*(1-r['Omega']) for r, _ in valid],
    }
    v_real = [vr for _, vr in valid]
    print("\n  {} (N={}):".format(group_label, len(valid)))
    for name, vals in combos.items():
        s = sorted(zip(vals, v_real), key=lambda x: -x[0])
        ranks = list(range(1, len(s)+1))
        vr = [x[1] for x in s]
        rho = spearman(ranks, vr)
        print("    {:<12} rho = {:.4f}".format(name, rho))

# =============================================================================
# ANOMALIES
# =============================================================================
print_separator("ANOMALIES - Titres dans un groupe inattendu")
# EN-B with high PVI
high_pvi_enb = [r for r in en_b if r['PVI'] > 1.0]
for r in sorted(high_pvi_enb, key=lambda x: -x['PVI']):
    print("  EN-B haute PVI: {} ({}) PVI={:.3f} I={} FL={} O={}".format(
        r['titre'], r['auteur'], r['PVI'], r['I'], r['FL'], r['Omega']))

# FR-A with low PVI
low_pvi_fra = [r for r in fr_a if r['PVI'] < 1.0]
for r in sorted(low_pvi_fra, key=lambda x: x['PVI']):
    print("  FR-A basse PVI: {} ({}) PVI={:.3f}".format(
        r['titre'], r['auteur'], r['PVI']))

# =============================================================================
# TOP 20 PVI GLOBAL
# =============================================================================
print_separator("TOP 20 PVI GLOBAL")
for i, r in enumerate(sorted(results, key=lambda x: -x['PVI'])[:20], 1):
    print("{:>3}. {:<35} {:<20} {:>5} PVI={:.3f} SP={:.1f} Q={}".format(
        i, r['titre'][:35], r['auteur'][:20], r['groupe'],
        r['PVI'], r['SP'], r['Q_prose']))

# BOTTOM 10
print_separator("BOTTOM 10 PVI GLOBAL")
for i, r in enumerate(sorted(results, key=lambda x: x['PVI'])[:10], 1):
    print("{:>3}. {:<35} {:<20} {:>5} PVI={:.3f} SP={:.1f} goulots={}".format(
        i, r['titre'][:35], r['auteur'][:20], r['groupe'],
        r['PVI'], r['SP'], '|'.join(r['goulots'])))

print_separator("FIN DE L'ANALYSE")
print("Fichiers produits dans: {}".format(OUTPUT_DIR))
