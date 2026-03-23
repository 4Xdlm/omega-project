import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line, CartesianGrid, Cell } from "recharts";

const COLORS = {
  bg: "#0a0a0f",
  card: "#12121a",
  border: "#1e1e2e",
  gold: "#f4c542",
  red: "#ff4444",
  green: "#44ff88",
  blue: "#4488ff",
  purple: "#aa66ff",
  cyan: "#44ddff",
  pink: "#ff66aa",
  text: "#e0e0e0",
  muted: "#888899",
  orange: "#ff8844",
};

const TIER_COLORS = { S: "#f4c542", A: "#44ff88", B: "#4488ff", C: "#aa66ff", D: "#ff4444" };

// === DATA ===
const top7Data = [
  { name: "Malaise", gb: 0.455, intra: 0.436, icon: "😰" },
  { name: "Vertige", gb: 0.451, intra: 0.448, icon: "🌀" },
  { name: "Ironie", gb: 0.443, intra: 0.405, icon: "🎭" },
  { name: "Compression", gb: 0.440, intra: 0.400, icon: "⚡" },
  { name: "Silence", gb: 0.384, intra: 0.401, icon: "🤫" },
  { name: "Mélancolie", gb: 0.373, intra: 0.345, icon: "🌧️" },
  { name: "Négation", gb: 0.369, intra: 0.330, icon: "🚫" },
];

const mythsData = [
  { myth: "Les clichés améliorent la qualité", truth: "Artefact d'époque — Flaubert a INVENTÉ les clichés", icon: "💀" },
  { myth: "Le maître saute entre les phrases", truth: "FAUX — les S-tier sont plus cohérents lexicalement (-0.085)", icon: "🔄" },
  { myth: "La violence fait la qualité", truth: "FAUX — corrélation = +0.047 (quasi-nulle)", icon: "⚔️" },
  { myth: "La vitesse fait la qualité", truth: "FAUX — propulsion = +0.055 (quasi-nulle)", icon: "🏃" },
  { myth: "Les synergies sont négatives", truth: "ARTEFACT du classifieur cassé qui mettait 93% en narration", icon: "🧪" },
  { myth: "La narration domine la littérature", truth: "FAUX — c'était le type POUBELLE qui aspirait tout", icon: "🗑️" },
];

const radarLabels = ["Malaise", "Vertige", "Ironie", "Compression", "Silence", "Mélancolie", "Négation", "Irreversib.", "Richesse", "Contradiction", "Fascination"];
const radarKeys = ["M9_malaise", "M9_vertige", "M9_ironie_mordante", "M3.4_compression_causale", "M2.7_silence", "M9_melancolie", "M2.2_neg_creatrice", "M3.1_irreversibilite", "M8.5_richesse_poly", "M4.3_contradiction", "M9_fascination"];
const tierRaw = {
  S: [0.0031,0.0027,0.0033,0.0006,0.0073,0.0078,0.0146,0.0309,0.0879,0.151,0.2706],
  A: [0.002,0.002,0.0025,0.0004,0.0043,0.0048,0.0079,0.0151,0.0493,0.1103,0.1867],
  B: [0.0026,0.0024,0.003,0.0004,0.0053,0.006,0.0091,0.0205,0.0559,0.1221,0.1706],
  C: [0.0022,0.0018,0.0017,0.0003,0.0043,0.004,0.0053,0.0103,0.0305,0.0737,0.0615],
  D: [0.0005,0.0004,0.0016,0.0005,0.0027,0.003,0.0037,0.008,0.0289,0.057,0.1692],
};
const maxPerMeasure = radarKeys.map((_, i) => Math.max(...Object.values(tierRaw).map(t => t[i])));
const radarData = radarLabels.map((label, i) => ({
  label,
  S: Math.round((tierRaw.S[i] / maxPerMeasure[i]) * 100),
  A: Math.round((tierRaw.A[i] / maxPerMeasure[i]) * 100),
  C: Math.round((tierRaw.C[i] / maxPerMeasure[i]) * 100),
  D: Math.round((tierRaw.D[i] / maxPerMeasure[i]) * 100),
}));

const surfaceData = [
  { measure: "Malaise", S: 0.0031, D: 0.0005, ratio: 6.2 },
  { measure: "Irréversibilité", S: 0.0309, D: 0.008, ratio: 3.9 },
  { measure: "Silence", S: 0.0073, D: 0.0027, ratio: 2.7 },
  { measure: "Négation", S: 0.0146, D: 0.0037, ratio: 3.9 },
  { measure: "Ironie", S: 0.0033, D: 0.0016, ratio: 2.1 },
  { measure: "Mélancolie", S: 0.0078, D: 0.003, ratio: 2.6 },
  { measure: "Fascination", S: 0.2706, D: 0.1692, ratio: 1.6 },
];

const allMeasures = [
  { name: "Malaise", corr: 0.455, status: "TRUSTED", role: "RANKER" },
  { name: "Vertige", corr: 0.451, status: "TRUSTED", role: "RANKER" },
  { name: "Ironie mordante", corr: 0.443, status: "TRUSTED", role: "RANKER" },
  { name: "Compression causale", corr: 0.440, status: "TRUSTED", role: "RANKER" },
  { name: "Silence narratif", corr: 0.384, status: "TRUSTED", role: "RANKER" },
  { name: "Mélancolie", corr: 0.373, status: "TRUSTED", role: "RANKER" },
  { name: "Négation créatrice", corr: 0.369, status: "TRUSTED", role: "RANKER" },
  { name: "Show Don't Tell", corr: 0.332, status: "TRUSTED", role: "RANKER" },
  { name: "Apaisement", corr: 0.327, status: "TRUSTED", role: "RANKER" },
  { name: "Irréversibilité", corr: 0.290, status: "PROVISIONAL", role: "RANKER" },
  { name: "Richesse poly-type", corr: 0.274, status: "PROVISIONAL", role: "RANKER" },
  { name: "Suggestion", corr: 0.262, status: "PROVISIONAL", role: "RANKER" },
  { name: "Régularité rythme", corr: 0.229, status: "PROVISIONAL", role: "RANKER" },
  { name: "Contradiction", corr: 0.226, status: "QUARANTINED", role: "RANKER" },
  { name: "Concret/Abstrait", corr: 0.168, status: "PROVISIONAL", role: "REGIME" },
  { name: "Écourtées (...)", corr: 0.150, status: "QUARANTINED", role: "SENTINEL" },
  { name: "Menace sans événement", corr: 0.146, status: "QUARANTINED", role: "REGIME" },
  { name: "Entropie bigrams", corr: 0.144, status: "QUARANTINED", role: "REGIME" },
  { name: "Oppression", corr: 0.138, status: "QUARANTINED", role: "REGIME" },
  { name: "Recueillement", corr: 0.135, status: "QUARANTINED", role: "SENTINEL" },
  { name: "Fascination", corr: 0.134, status: "QUARANTINED", role: "REGIME" },
  { name: "Rugosité phonologique", corr: 0.126, status: "QUARANTINED", role: "SENTINEL" },
  { name: "Questions sans rép.", corr: 0.118, status: "QUARANTINED", role: "REGIME" },
  { name: "Switch rate", corr: 0.114, status: "QUARANTINED", role: "SENTINEL" },
  { name: "Tension", corr: 0.097, status: "LEGACY", role: "REGIME" },
  { name: "Saut sémantique", corr: -0.085, status: "LEGACY", role: "SENTINEL" },
  { name: "Mystère", corr: 0.078, status: "LEGACY", role: "REGIME" },
  { name: "Propulsion", corr: 0.055, status: "LEGACY", role: "REGIME" },
  { name: "Violence sèche", corr: 0.047, status: "LEGACY", role: "REGIME" },
  { name: "Arousal", corr: 0.046, status: "LEGACY", role: "REGIME" },
  { name: "Valence", corr: 0.023, status: "LEGACY", role: "REGIME" },
];

const statusColors = { TRUSTED: COLORS.green, PROVISIONAL: COLORS.cyan, QUARANTINED: COLORS.orange, LEGACY: COLORS.muted };
const roleIcons = { RANKER: "📊", SENTINEL: "🚨", REGIME: "🏷️" };

const Section = ({ id, title, subtitle, children }) => (
  <section id={id} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
    <h2 style={{ fontSize: 28, fontWeight: 800, color: COLORS.gold, marginBottom: 4, letterSpacing: "-0.5px" }}>{title}</h2>
    {subtitle && <p style={{ color: COLORS.muted, fontSize: 14, marginBottom: 24, fontStyle: "italic" }}>{subtitle}</p>}
    {children}
  </section>
);

const Card = ({ children, style }) => (
  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 16, ...style }}>
    {children}
  </div>
);

const Formula = ({ label, formula, explanation }) => (
  <Card style={{ borderLeft: `3px solid ${COLORS.purple}` }}>
    <div style={{ fontSize: 13, color: COLORS.purple, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 16, color: COLORS.gold, marginBottom: 8, padding: "8px 12px", background: "rgba(244,197,66,0.06)", borderRadius: 6 }}>{formula}</div>
    <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{explanation}</div>
  </Card>
);

const Stat = ({ value, label, color }) => (
  <div style={{ textAlign: "center", padding: "16px 8px" }}>
    <div style={{ fontSize: 32, fontWeight: 900, color: color || COLORS.gold }}>{value}</div>
    <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
  </div>
);

const tabs = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "top7", label: "Les 7 Mesures" },
  { id: "radar", label: "Radar S vs D" },
  { id: "formulas", label: "Formules" },
  { id: "all", label: "38 Mesures" },
  { id: "myths", label: "Mythes Détruits" },
  { id: "deductions", label: "Déductions" },
];

export default function OmegaManifesto() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100vh", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* HEADER */}
      <header style={{ textAlign: "center", padding: "48px 24px 32px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: COLORS.muted, textTransform: "uppercase", marginBottom: 12 }}>Omega Supreme — NASA-Grade L4</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: COLORS.gold, lineHeight: 1.1, marginBottom: 8 }}>Manifeste de la<br/>Physique Littéraire</h1>
        <p style={{ color: COLORS.muted, fontSize: 14, maxWidth: 500, margin: "0 auto" }}>571 romans · 4 millions de phrases · 38 mesures · La vérité mathématique sur ce qui fait un chef-d'œuvre</p>
      </header>

      {/* NAV */}
      <nav style={{ display: "flex", gap: 4, padding: "12px 16px", overflowX: "auto", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 10, background: COLORS.bg }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            background: activeTab === t.id ? COLORS.gold : "transparent",
            color: activeTab === t.id ? COLORS.bg : COLORS.muted,
          }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>

        {/* === OVERVIEW === */}
        {activeTab === "overview" && <>
          <Section id="overview" title="La Découverte Centrale" subtitle="Ce que 571 romans nous ont appris">
            <Card style={{ borderLeft: `3px solid ${COLORS.gold}`, background: "linear-gradient(135deg, #1a1a2e, #12121a)" }}>
              <p style={{ fontSize: 18, lineHeight: 1.6, margin: 0 }}>
                La grande littérature ne rassure pas. Elle <span style={{ color: COLORS.red, fontWeight: 700 }}>dérange</span>,{" "}
                <span style={{ color: COLORS.purple, fontWeight: 700 }}>déstabilise</span>,{" "}
                <span style={{ color: COLORS.cyan, fontWeight: 700 }}>ironise</span>,{" "}
                <span style={{ color: COLORS.green, fontWeight: 700 }}>comprime</span>{" "}et{" "}
                <span style={{ color: COLORS.pink, fontWeight: 700 }}>se tait</span>.
              </p>
              <p style={{ fontSize: 14, color: COLORS.muted, marginTop: 12 }}>
                Les LLM, optimisés pour plaire (RLHF), produisent de l'apaisement. Les maîtres produisent du malaise.
                C'est exactement pourquoi la prose IA plafonne au A-tier (3.80) et n'atteint pas le S-tier (4.5+).
              </p>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 24 }}>
              <Card><Stat value="571" label="Romans analysés" /></Card>
              <Card><Stat value="4M" label="Phrases taggées" /></Card>
              <Card><Stat value="382K" label="Fenêtres 20 phrases" /></Card>
              <Card><Stat value="38" label="Mesures calculées" /></Card>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
              <Card><Stat value="7" label="Mesures TRUSTED" color={COLORS.green} /></Card>
              <Card><Stat value="0" label="Mesures INVALID" color={COLORS.green} /></Card>
              <Card><Stat value="0.82" label="PCA PC1 × GB" color={COLORS.gold} /></Card>
            </div>

            <Card style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, color: COLORS.purple, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Le Vecteur de Qualité (PCA)</div>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                L'analyse en composantes principales montre que malaise, vertige, ironie, compression et silence
                sont les <strong style={{ color: COLORS.gold }}>5 facettes d'une seule force</strong> — le "vecteur de qualité littéraire".
                La première composante capture <strong style={{ color: COLORS.gold }}>82% de la variance</strong> liée au score GB.
              </p>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(244,197,66,0.06)", borderRadius: 8, fontFamily: "monospace", fontSize: 14, color: COLORS.gold }}>
                PC1 = 0.26×ironie + 0.26×malaise + 0.23×intra + 0.22×GB − 0.87×mean → rho = 0.82
              </div>
            </Card>
          </Section>
        </>}

        {/* === TOP 7 === */}
        {activeTab === "top7" && <>
          <Section id="top7" title="Les 7 Mesures TRUSTED" subtitle="Signaux robustes, non contaminés, tiennent intra-auteur">
            <Card>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={top7Data} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <XAxis type="number" domain={[0, 0.5]} tick={{ fill: COLORS.muted, fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: COLORS.text, fontSize: 13 }} width={75} />
                  <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="gb" fill={COLORS.gold} name="Corrélation GB" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="intra" fill={COLORS.cyan} name="Intra-auteur" radius={[0, 4, 4, 0]} barSize={16} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {top7Data.map((m, i) => (
                <Card key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.gold }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted }}>GB: +{m.gb} · Intra: +{m.intra}</div>
                  </div>
                </Card>
              ))}
            </div>

            <Card style={{ marginTop: 16, borderLeft: `3px solid ${COLORS.red}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.red, marginBottom: 8 }}>CE QUE ÇA SIGNIFIE</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Chez Dostoïevski, ses <strong>meilleures fenêtres</strong> ont plus de compression causale que ses fenêtres moyennes.
                Ce n'est pas juste que "Dostoïevski est meilleur que X" — c'est que <strong>ses meilleurs passages ont cette propriété</strong>.
                La corrélation tient INTRA-AUTEUR : c'est une propriété du texte, pas de l'auteur.
              </p>
            </Card>
          </Section>
        </>}

        {/* === RADAR === */}
        {activeTab === "radar" && <>
          <Section id="radar" title="Radar S-tier vs D-tier" subtitle="Profil normalisé des mesures par niveau de qualité">
            <Card>
              <ResponsiveContainer width="100%" height={420}>
                <RadarChart data={radarData} outerRadius={140}>
                  <PolarGrid stroke={COLORS.border} />
                  <PolarAngleAxis dataKey="label" tick={{ fill: COLORS.muted, fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar name="S-tier" dataKey="S" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="D-tier" dataKey="D" stroke={COLORS.red} fill={COLORS.red} fillOpacity={0.1} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginBottom: 12, marginTop: 8 }}>MULTIPLICATEURS S-TIER vs D-TIER</div>
            <Card>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={surfaceData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="measure" tick={{ fill: COLORS.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="ratio" name="Ratio S/D" radius={[4, 4, 0, 0]} barSize={36}>
                    {surfaceData.map((_, i) => <Cell key={i} fill={i === 0 ? COLORS.red : i < 4 ? COLORS.gold : COLORS.cyan} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ borderLeft: `3px solid ${COLORS.gold}` }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Le S-tier a <strong style={{ color: COLORS.red }}>6.2× plus de malaise</strong>,{" "}
                <strong style={{ color: COLORS.gold }}>3.9× plus d'irréversibilité</strong> et{" "}
                <strong style={{ color: COLORS.cyan }}>2.7× plus de silence</strong> que le D-tier.
                Le maître détruit le statu quo et refuse d'expliquer l'impact au lecteur.
              </p>
            </Card>
          </Section>
        </>}

        {/* === FORMULAS === */}
        {activeTab === "formulas" && <>
          <Section id="formulas" title="Les Formules" subtitle="Comment chaque mesure est calculée — simplement">
            <Formula
              label="Malaise (M9)"
              formula="malaise = count(détails_dérangeants + contradictions_non_résolues + absence_explication) / phrases"
              explanation="Le malaise naît quand quelque chose ne va pas mais le texte ne l'explique pas. Le lecteur ressent le malaise, le texte ne le nomme jamais."
            />
            <Formula
              label="Compression Causale (M3.4)"
              formula="compression = (changements_état × liens_causaux) / nombre_mots"
              explanation="La narration qui AVANCE : chaque phrase change quelque chose ET est causalement liée à la suivante. Pas de remplissage. Dense comme un diamant."
            />
            <Formula
              label="Silence Narratif (M2.7)"
              formula='silence = count("se tut", "ne dit rien", "silence", "immobile") / phrases'
              explanation="Ce qui n'est PAS dit. Le maître laisse des trous. Le LLM remplit tout. Le cerveau du lecteur travaille plus quand le texte se tait."
            />
            <Formula
              label="Ironie Mordante (M9)"
              formula='ironie = count("naturellement", "évidemment", "bien sûr", litotes, contraste registre/contenu) / phrases'
              explanation="La distance critique. Dire A en signifiant B. Le RLHF entraîne les LLM à être littéraux. L'ironie est l'anti-machine par excellence."
            />
            <Formula
              label="Négation Créatrice (M2.2)"
              formula='négation = count("ne dit rien", "personne ne vint", "pas un bruit") / phrases'
              explanation='La négation crée l\'image de ce qui AURAIT PU arriver. "Il ne pleura pas" fait IMAGINER les larmes. Plus puissant que "il pleura".'
            />
            <Formula
              label="Show Don't Tell (M1.1)"
              formula="SDT = mots_corporels / (mots_corporels + mots_émotions + 1)"
              explanation='"Ses phalanges blanchirent sur la rampe" (SHOW) vs "Il était terrifié" (TELL). Le maître montre, le LLM dit.'
            />
            <Formula
              label="Irréversibilité (M3.1)"
              formula="irreversibility = changements_état_jamais_annulés / phrases"
              explanation="Quand le maître fait agir un personnage, le monde CHANGE. Pas de retour en arrière. Le LLM fait de l'agitation réversible."
            />

            <Card style={{ marginTop: 16, borderLeft: `3px solid ${COLORS.gold}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginBottom: 8 }}>LA FORMULE MAÎTRESSE</div>
              <div style={{ fontFamily: "monospace", fontSize: 15, color: COLORS.gold, padding: "12px 16px", background: "rgba(244,197,66,0.06)", borderRadius: 8, lineHeight: 1.8 }}>
                Qualité ≈ PC1 = malaise + vertige + ironie + compression + silence<br/>
                <span style={{ color: COLORS.muted, fontSize: 12 }}>PCA PC1 × GB = 0.82 — une seule force vue sous 5 angles</span>
              </div>
            </Card>
          </Section>
        </>}

        {/* === ALL MEASURES === */}
        {activeTab === "all" && <>
          <Section id="all" title="Les 38 Mesures" subtitle="Classement complet par corrélation avec la qualité (GB V1)">
            <div style={{ display: "grid", gap: 6 }}>
              {allMeasures.map((m, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  background: COLORS.card, borderRadius: 8,
                  borderLeft: `3px solid ${statusColors[m.status]}`,
                  opacity: m.status === "LEGACY" ? 0.5 : 1
                }}>
                  <div style={{ width: 24, fontSize: 12, color: COLORS.muted, fontWeight: 700 }}>#{i + 1}</div>
                  <div style={{ fontSize: 14 }}>{roleIcons[m.role]}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                  </div>
                  <div style={{ width: 60, textAlign: "right" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: m.corr > 0.3 ? COLORS.green : m.corr > 0.1 ? COLORS.cyan : COLORS.muted }}>
                      {m.corr > 0 ? "+" : ""}{m.corr.toFixed(3)}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: statusColors[m.status] + "22", color: statusColors[m.status], fontWeight: 700 }}>
                    {m.status}
                  </div>
                </div>
              ))}
            </div>

            <Card style={{ marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div><span style={{ color: COLORS.green }}>■</span> TRUSTED — Signal robuste, intra-auteur validé</div>
                <div><span style={{ color: COLORS.cyan }}>■</span> PROVISIONAL — Signal probable, à confirmer</div>
                <div><span style={{ color: COLORS.orange }}>■</span> QUARANTINED — Signal faible ou intra incertain</div>
                <div><span style={{ color: COLORS.muted }}>■</span> LEGACY — Corrélation < 0.10, reclassé REGIME/SENTINEL</div>
                <div>📊 RANKER — Prédit la qualité globale</div>
                <div>🚨 SENTINEL — Signal local (transition, climax)</div>
                <div>🏷️ REGIME — Distingue les types de scène</div>
                <div style={{ color: COLORS.gold }}>0 INVALID — Toutes ont un rôle</div>
              </div>
            </Card>
          </Section>
        </>}

        {/* === MYTHS === */}
        {activeTab === "myths" && <>
          <Section id="myths" title="Les Mythes Détruits" subtitle="6 croyances que les mathématiques ont pulvérisées">
            {mythsData.map((m, i) => (
              <Card key={i} style={{ borderLeft: `3px solid ${COLORS.red}`, display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ fontSize: 32, marginTop: 4 }}>{m.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.red, textDecoration: "line-through", marginBottom: 4 }}>"{m.myth}"</div>
                  <div style={{ fontSize: 14, color: COLORS.green, lineHeight: 1.5 }}>{m.truth}</div>
                </div>
              </Card>
            ))}

            <Card style={{ marginTop: 16, borderLeft: `3px solid ${COLORS.gold}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.gold, marginBottom: 8 }}>LA LEÇON</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: COLORS.muted }}>
                On ne trie pas par intuition. On mesure. On prouve. On se trompe.
                Puis on corrige et on mesure à nouveau. 6 de nos croyances initiales étaient FAUSSES.
                Les mathématiques les ont détruites. C'est exactement pour ça qu'on mesure.
              </p>
            </Card>
          </Section>
        </>}

        {/* === DEDUCTIONS === */}
        {activeTab === "deductions" && <>
          <Section id="deductions" title="Les Déductions" subtitle="Ce que tout ça signifie pour le Scribe et pour la littérature">
            <Card style={{ borderLeft: `3px solid ${COLORS.gold}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.gold, marginBottom: 12 }}>1. Le RLHF est le problème</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Le Reinforcement Learning from Human Feedback entraîne les LLM à <strong>plaire</strong>.
                Or les 7 marqueurs de qualité sont tous liés au <strong>dérangement</strong>.
                Malaise, ironie, silence — tout ce que le RLHF éteint. Le LLM est biologiquement
                incapable de produire ce qui fait la qualité littéraire, sauf si on le force.
              </p>
            </Card>

            <Card style={{ borderLeft: `3px solid ${COLORS.green}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.green, marginBottom: 12 }}>2. La chimie est réelle (mais pas magique)</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Le mélange de types (dialogue + narration + introspection) RENFORCE la qualité.
                4 synergies sur 4 sont statistiquement significatives au bootstrap.
                65% des maîtres ont plus de diversité dans leurs meilleures fenêtres.
                Mais c'est une <strong>observation robuste</strong>, pas une loi éternelle scellée.
              </p>
            </Card>

            <Card style={{ borderLeft: `3px solid ${COLORS.purple}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.purple, marginBottom: 12 }}>3. Le GB V1 ne voit pas l'ordre</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Permuter les phrases d'une fenêtre ne change PAS le score GB (delta = -0.007).
                Le juge actuel mesure la qualité de SURFACE mais pas la STRUCTURE.
                Un futur scorer V2 devra intégrer les trajectoires et les transitions.
              </p>
            </Card>

            <Card style={{ borderLeft: `3px solid ${COLORS.red}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.red, marginBottom: 12 }}>4. Montrer, pas dire (Show Don't Tell)</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                "Ses phalanges blanchirent sur la rampe" fait RESSENTIR la peur.
                "Il était terrifié" ne fait RIEN ressentir.
                Le LLM NOMME les émotions. Le maître donne les CONDITIONS pour que
                le cerveau du lecteur FABRIQUE l'émotion lui-même.
                Une image fabriquée par le cerveau est 10× plus puissante qu'une image donnée.
              </p>
            </Card>

            <Card style={{ borderLeft: `3px solid ${COLORS.cyan}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.cyan, marginBottom: 12 }}>5. Le silence est une arme</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Le S-tier a <strong>2.7× plus de silence</strong> que le D-tier.
                Ce qui n'est PAS dit crée plus de tension que ce qui est dit.
                La négation créatrice ("il ne pleura pas") fait IMAGINER les larmes.
                Le LLM sur-explique par design (RLHF). Le maître retient.
              </p>
            </Card>

            <Card style={{ background: "linear-gradient(135deg, #1a1a2e, #12121a)", marginTop: 24 }}>
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 11, letterSpacing: 4, color: COLORS.muted, textTransform: "uppercase", marginBottom: 16 }}>Omega Supreme — Manifeste v1.0</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.gold, lineHeight: 1.6 }}>
                  "Ce qui n'est pas prouvé n'existe pas."<br/>
                  "Ce qui n'est pas mesuré n'est pas acceptable."<br/>
                  "Kafka n'est pas bizarre. Notre détecteur était bête."
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 16 }}>
                  571 romans · 4 035 518 phrases · 382 239 fenêtres · 38 mesures · 7 TRUSTED · 0 INVALID
                </div>
              </div>
            </Card>
          </Section>
        </>}

      </main>
    </div>
  );
}
