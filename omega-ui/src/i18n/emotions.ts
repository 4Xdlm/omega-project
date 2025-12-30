// OMEGA — Internationalisation Émotions (Aérospatial Grade)
export const EMOTION_LABELS_FR: Record<string, string> = {
  joy: "Joie",
  sadness: "Tristesse",
  anger: "Colère",
  fear: "Peur",
  trust: "Confiance",
  love: "Amour",
  surprise: "Surprise",
  anticipation: "Anticipation",
  pride: "Fierté",
  disgust: "Dégoût",
};

export const EMOTION_COLORS: Record<string, string> = {
  joy: "#f1c40f",
  sadness: "#3498db",
  anger: "#e74c3c",
  fear: "#9b59b6",
  trust: "#2ecc71",
  love: "#e91e63",
  surprise: "#ff5722",
  anticipation: "#ff9800",
  pride: "#ffc107",
  disgust: "#795548",
};

export const normEmotionKey = (key: string): string =>
  (key || "").trim().toLowerCase();

export const getEmotionLabel = (key: string): string => {
  const k = normEmotionKey(key);
  return EMOTION_LABELS_FR[k] || key || "";
};

export const getEmotionColor = (key: string): string => {
  const k = normEmotionKey(key);
  return EMOTION_COLORS[k] || "#888888";
};
