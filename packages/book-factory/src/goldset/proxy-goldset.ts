/**
 * OMEGA Book-Factory — GOLD-SET PROXYS V1 (BF-08) — étalonnage des proxys
 * narratifs C9 (ordre Architecte 2026-06-06 : « calibrer proxys et seuils sur
 * corpus AVANT l'UI »).
 *
 * MÉTHODE : 64 extraits FR courts à VÉRITÉ TERRAIN labellisée — 32 POSITIFS
 * révélation (aveu, confirmation, découverte matérielle, compréhension,
 * démasquage, identification — moitié ADAPTÉS de patrons du domaine public
 * type Maupassant/Leblanc, moitié écrits pour couvrir les classes), 32 NÉGATIFS
 * PIÈGES (question sans réponse, mystère affiché, dialogue plat, négation de
 * savoir, révélation ANNONCÉE mais différée — le piège classique).
 *
 * STATUT ÉPISTÉMIQUE (honnêteté) : labels IA (moi), pas humains —
 * GOLD_SET_PROXY_V1_IA_LABELLED. Suffisant pour mesurer/réduire les FAUX
 * NÉGATIFS structurels d'un regex (la classe d'erreur prouvée : « confirma »
 * raté sur le 88k) ; la validation humaine = upgrade V2. Pattern identique au
 * Gold-Set v4 des juges (construit en session, validé par usage).
 */

export interface GoldExtract {
  readonly id: string;
  readonly text: string;
  /** Vérité terrain : ce passage CONTIENT-il une révélation narrative ? */
  readonly revelation: boolean;
  /** Classe (pour l'analyse d'erreurs par catégorie). */
  readonly cls:
    | 'AVEU' | 'CONFIRMATION' | 'DECOUVERTE' | 'COMPREHENSION' | 'DEMASQUAGE' | 'IDENTIFICATION'
    | 'QUESTION' | 'MYSTERE_AFFICHE' | 'DIALOGUE_PLAT' | 'NEGATION_SAVOIR' | 'REVELATION_DIFFEREE' | 'DESCRIPTION';
}

export const PROXY_GOLDSET: readonly GoldExtract[] = [
  /* ── POSITIFS : AVEU (6) ── */
  { id: 'P01', cls: 'AVEU', revelation: true, text: 'Yvon avoua enfin : la vérité du naufrage tenait dans une nuit de novembre.' },
  { id: 'P02', cls: 'AVEU', revelation: true, text: '« C\'est moi qui ai fermé la vanne », admit-elle, les yeux baissés sur la table.' },
  { id: 'P03', cls: 'AVEU', revelation: true, text: 'Il finit par reconnaître que la lettre n\'avait jamais été postée.' },
  { id: 'P04', cls: 'AVEU', revelation: true, text: '« J\'étais sur le quai cette nuit-là », confessa le vieil homme d\'une voix éteinte.' },
  { id: 'P05', cls: 'AVEU', revelation: true, text: 'Elle céda : « Oui, je savais. Depuis le début, je savais. »' },
  { id: 'P06', cls: 'AVEU', revelation: true, text: 'Le maire admit, à mi-voix, que le registre avait été falsifié sur son ordre.' },
  /* ── POSITIFS : CONFIRMATION (5) — la classe RATÉE sur le 88k ── */
  { id: 'P07', cls: 'CONFIRMATION', revelation: true, text: '« Ta mère est morte », confirma Yvon d\'une voix monocorde, sans lever les yeux.' },
  { id: 'P08', cls: 'CONFIRMATION', revelation: true, text: 'Le médecin confirma ce que tous redoutaient : l\'eau du puits était empoisonnée.' },
  { id: 'P09', cls: 'CONFIRMATION', revelation: true, text: 'L\'expertise le confirma : l\'écriture était bien celle du gardien.' },
  { id: 'P10', cls: 'CONFIRMATION', revelation: true, text: '« C\'est exact », attesta le notaire. « Le testament a été modifié la veille de sa mort. »' },
  { id: 'P11', cls: 'CONFIRMATION', revelation: true, text: 'Les registres de la capitainerie le confirmèrent : aucun bateau n\'était sorti ce soir-là.' },
  /* ── POSITIFS : DÉCOUVERTE MATÉRIELLE (6) ── */
  { id: 'P12', cls: 'DECOUVERTE', revelation: true, text: 'Derrière le panneau de bois, dans le grenier, elle trouva les lettres. Toutes les lettres.' },
  { id: 'P13', cls: 'DECOUVERTE', revelation: true, text: 'Le tiroir à double fond contenait un carnet : les comptes du naufrage, ligne par ligne.' },
  { id: 'P14', cls: 'DECOUVERTE', revelation: true, text: 'Sous la pierre descellée du seuil, Garcia découvrit la clé que tout le monde cherchait.' },
  { id: 'P15', cls: 'DECOUVERTE', revelation: true, text: 'En soulevant la bâche, ils mirent au jour la coque repeinte du Ker-Vo.' },
  { id: 'P16', cls: 'DECOUVERTE', revelation: true, text: 'La doublure du manteau cachait une photographie : le gardien, vivant, daté de l\'an dernier.' },
  { id: 'P17', cls: 'DECOUVERTE', revelation: true, text: 'Le coffre s\'ouvrit enfin : à l\'intérieur, le registre manquant de la mairie.' },
  /* ── POSITIFS : COMPRÉHENSION (6) ── */
  { id: 'P18', cls: 'COMPREHENSION', revelation: true, text: 'Elle comprit alors que le silence du village n\'était pas de la peur : c\'était un pacte.' },
  { id: 'P19', cls: 'COMPREHENSION', revelation: true, text: 'Tout s\'éclaira d\'un coup : les dates, les absences, la dette — tout désignait le même homme.' },
  { id: 'P20', cls: 'COMPREHENSION', revelation: true, text: 'Il sut enfin pourquoi la lampe restait éteinte : personne ne devait voir entrer le bateau.' },
  { id: 'P21', cls: 'COMPREHENSION', revelation: true, text: 'La vérité éclata dans son esprit : Henri n\'avait pas glissé. On l\'avait poussé.' },
  { id: 'P22', cls: 'COMPREHENSION', revelation: true, text: 'Alors elle saisit le sens des mots du curé : la quête n\'avait jamais financé l\'église.' },
  { id: 'P23', cls: 'COMPREHENSION', revelation: true, text: 'Il réalisa soudain que la tombe était vide depuis le premier jour.' },
  /* ── POSITIFS : DÉMASQUAGE / IDENTIFICATION (9) ── */
  { id: 'P24', cls: 'DEMASQUAGE', revelation: true, text: '« C\'était lui qui signait les lettres », dit Garcia en posant la loupe. « Depuis dix ans. »' },
  { id: 'P25', cls: 'DEMASQUAGE', revelation: true, text: 'Le masque tomba : sous la capuche du pêcheur, le visage du fils Squarcioni.' },
  { id: 'P26', cls: 'DEMASQUAGE', revelation: true, text: 'Elle arracha le gant : la cicatrice était là, celle du naufragé qu\'on disait mort.' },
  { id: 'P27', cls: 'IDENTIFICATION', revelation: true, text: 'Il s\'appelait Henri. Henri Morel. Il vivait seul dans le phare depuis la guerre.' },
  { id: 'P28', cls: 'IDENTIFICATION', revelation: true, text: 'L\'homme du quai et le notaire de Brest n\'étaient qu\'une seule et même personne.' },
  { id: 'P29', cls: 'IDENTIFICATION', revelation: true, text: '« Du naufrage », dit Yvon simplement. « Le navire de marchandises. Tout vient de là. »' },
  { id: 'P30', cls: 'DEMASQUAGE', revelation: true, text: 'Le témoin anonyme des lettres, c\'était elle. Sa propre sœur. Depuis le début.' },
  { id: 'P31', cls: 'COMPREHENSION', revelation: true, text: 'Les chiffres parlaient d\'eux-mêmes : la moitié du village avait touché sa part.' },
  { id: 'P32', cls: 'DECOUVERTE', revelation: true, text: 'Au dos du portrait, une dédicace révélait le vrai nom du donateur : Squarcioni père.' },
  /* ── NÉGATIFS : QUESTION SANS RÉPONSE (6) ── */
  { id: 'N01', cls: 'QUESTION', revelation: false, text: 'Qui avait éteint la lampe ? La question restait suspendue entre eux, sans réponse.' },
  { id: 'N02', cls: 'QUESTION', revelation: false, text: 'Pourquoi le maire mentait-il ? Elle n\'en avait aucune idée.' },
  { id: 'N03', cls: 'QUESTION', revelation: false, text: 'Que cachait la cale du Ker-Vo ? Personne, au village, n\'osait le demander.' },
  { id: 'N04', cls: 'QUESTION', revelation: false, text: 'Et si la lettre n\'avait jamais existé ? Le doute la rongeait depuis l\'aube.' },
  { id: 'N05', cls: 'QUESTION', revelation: false, text: 'D\'où venait l\'argent ? Les comptes ne disaient rien, et les hommes encore moins.' },
  { id: 'N06', cls: 'QUESTION', revelation: false, text: 'Combien savaient ? Trois ? Dix ? Tout le village ? Impossible à dire.' },
  /* ── NÉGATIFS : MYSTÈRE AFFICHÉ (6) ── */
  { id: 'N07', cls: 'MYSTERE_AFFICHE', revelation: false, text: 'Une silhouette longeait le quai, indistincte dans la brume, étrangère à tout.' },
  { id: 'N08', cls: 'MYSTERE_AFFICHE', revelation: false, text: 'Le secret pesait sur la maison comme une dalle. Nul ne le nommait jamais.' },
  { id: 'N09', cls: 'MYSTERE_AFFICHE', revelation: false, text: 'Quelque chose clochait dans son récit, sans qu\'elle pût dire quoi.' },
  { id: 'N10', cls: 'MYSTERE_AFFICHE', revelation: false, text: 'L\'énigme demeurait entière : le coffre, la clé, l\'absence — rien ne s\'emboîtait.' },
  { id: 'N11', cls: 'MYSTERE_AFFICHE', revelation: false, text: 'Il cachait quelque chose. Cela se voyait à ses mains, à son silence, à tout.' },
  { id: 'N12', cls: 'MYSTERE_AFFICHE', revelation: false, text: 'Des ombres passaient derrière les volets clos. On aurait dit des veilleurs.' },
  /* ── NÉGATIFS : DIALOGUE PLAT / DESCRIPTION (8) ── */
  { id: 'N13', cls: 'DIALOGUE_PLAT', revelation: false, text: '« Tu prendras du café ? » — « Volontiers. La nuit a été longue. »' },
  { id: 'N14', cls: 'DIALOGUE_PLAT', revelation: false, text: '« Le vent tourne », dit Gaspard en remontant son col. « Pluie avant ce soir. »' },
  { id: 'N15', cls: 'DIALOGUE_PLAT', revelation: false, text: '« Tu repars demain ? » demanda-t-elle. Il haussa les épaules sans répondre.' },
  { id: 'N16', cls: 'DESCRIPTION', revelation: false, text: 'La cuisine sentait le café froid et le bois humide. Les carreaux blanchissaient à l\'aube.' },
  { id: 'N17', cls: 'DESCRIPTION', revelation: false, text: 'Le phare se dressait au bout de la jetée, noir sur le ciel gris, muet.' },
  { id: 'N18', cls: 'DESCRIPTION', revelation: false, text: 'Elle marchait le long de la grève, les bottes lourdes de sable mouillé.' },
  { id: 'N19', cls: 'DIALOGUE_PLAT', revelation: false, text: '« Bonsoir, Garcia. » — « Bonsoir. Ferme derrière toi, le vent se lève. »' },
  { id: 'N20', cls: 'DESCRIPTION', revelation: false, text: 'Les filets séchaient sur les casiers, et l\'odeur de saumure montait du port.' },
  /* ── NÉGATIFS PIÈGES DURS : NÉGATION DE SAVOIR + RÉVÉLATION DIFFÉRÉE (12) ── */
  { id: 'N21', cls: 'NEGATION_SAVOIR', revelation: false, text: 'Il ne comprit pas, ce soir-là, ce que la marée venait de rendre au rivage.' },
  { id: 'N22', cls: 'NEGATION_SAVOIR', revelation: false, text: 'Elle ne sut jamais qui avait déposé le paquet devant sa porte.' },
  { id: 'N23', cls: 'NEGATION_SAVOIR', revelation: false, text: 'Personne n\'avoua. Les interrogatoires ne donnèrent rien, semaine après semaine.' },
  { id: 'N24', cls: 'NEGATION_SAVOIR', revelation: false, text: 'Le notaire refusa de confirmer quoi que ce soit, invoquant le secret de l\'étude.' },
  { id: 'N25', cls: 'REVELATION_DIFFEREE', revelation: false, text: '« Je te dirai tout demain », promit-il. « Pas ici. Pas ce soir. »' },
  { id: 'N26', cls: 'REVELATION_DIFFEREE', revelation: false, text: 'La vérité attendrait. Elle rangea le dossier sans l\'ouvrir et souffla la lampe.' },
  { id: 'N27', cls: 'REVELATION_DIFFEREE', revelation: false, text: 'Il faillit parler. Les mots montèrent, puis moururent. Il reprit sa pelle en silence.' },
  { id: 'N28', cls: 'REVELATION_DIFFEREE', revelation: false, text: '« Un jour, tu sauras pourquoi. Pas maintenant. » Elle referma doucement la porte.' },
  { id: 'N29', cls: 'NEGATION_SAVOIR', revelation: false, text: 'Ce que contenait la malle, nul ne devait jamais l\'apprendre de son vivant.' },
  { id: 'N30', cls: 'REVELATION_DIFFEREE', revelation: false, text: 'La lettre qui aurait tout expliqué brûla dans l\'âtre, scellée, jamais lue.' },
  { id: 'N31', cls: 'NEGATION_SAVOIR', revelation: false, text: 'On ne découvrit rien dans la cale : ni caisse, ni registre, ni trace de rien.' },
  { id: 'N32', cls: 'QUESTION', revelation: false, text: 'Restait l\'inconnue du carnet : payé, volé, perdu ? Chaque hypothèse en valait une autre.' },
];

export interface ProxyBenchResult {
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly trueNegatives: number;
  readonly falseNegatives: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly missedIds: readonly string[];
  readonly spuriousIds: readonly string[];
}

/** Bench un détecteur de révélation contre le gold-set. Pur. */
export function benchRevelationProxy(detect: (text: string) => boolean): ProxyBenchResult {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const missed: string[] = [];
  const spurious: string[] = [];
  for (const ex of PROXY_GOLDSET) {
    const hit = detect(ex.text);
    if (ex.revelation && hit) tp += 1;
    else if (ex.revelation && !hit) { fn += 1; missed.push(ex.id); }
    else if (!ex.revelation && hit) { fp += 1; spurious.push(ex.id); }
    else tn += 1;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn,
    precision: Number(precision.toFixed(3)), recall: Number(recall.toFixed(3)), f1: Number(f1.toFixed(3)),
    missedIds: missed, spuriousIds: spurious,
  };
}
