// OMEGA Text Analyzer - Emotion Detection
// Analyse un texte et détecte les émotions

interface EmotionResult {
  emotion: string;
  intensity: number;
  keywords: string[];
}

interface AnalysisResult {
  text: string;
  word_count: number;
  emotions: EmotionResult[];
  dominant_emotion: string | null;
  timestamp: string;
}

// Dictionnaire de mots-clés par émotion
const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ["heureux", "joie", "bonheur", "content", "ravi", "sourire", "rire", "happy", "joy", "glad", "pleased", "delighted", "cheerful", "aimer", "adore", "super", "génial", "formidable", "excellent", "parfait", "magnifique", "merveilleux"],
  sadness: ["triste", "tristesse", "pleurer", "larmes", "chagrin", "mélancolie", "déprimé", "sad", "unhappy", "depressed", "miserable", "gloomy", "heartbroken", "malheureux", "désolé", "peine", "douleur"],
  anger: ["colère", "furieux", "énervé", "rage", "agacé", "irrité", "angry", "furious", "mad", "enraged", "annoyed", "frustrated", "déteste", "haine", "haïr", "insupportable"],
  fear: ["peur", "effrayé", "terrifié", "anxieux", "inquiet", "paniqué", "afraid", "scared", "terrified", "anxious", "worried", "nervous", "crainte", "angoisse", "trembler"],
  surprise: ["surpris", "étonné", "choqué", "stupéfait", "incroyable", "surprised", "amazed", "astonished", "shocked", "wow", "incroyable", "inattendu"],
  disgust: ["dégoût", "écœuré", "répugnant", "horrible", "disgusted", "revolted", "nauseating", "gross", "horrible", "affreux", "immonde"],
  trust: ["confiance", "foi", "fidèle", "loyal", "fiable", "trust", "faith", "reliable", "honest", "croire", "sûr", "certain"],
  anticipation: ["attente", "espoir", "excité", "impatient", "anticipation", "excited", "eager", "hopeful", "looking forward", "hâte", "vivement"]
};

function analyzeText(text: string): AnalysisResult {
  const lowerText = text.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const emotions: EmotionResult[] = [];

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const foundKeywords: string[] = [];
    let count = 0;

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword);
        // Compter les occurrences
        const regex = new RegExp(keyword, "gi");
        const matches = lowerText.match(regex);
        count += matches ? matches.length : 0;
      }
    }

    if (foundKeywords.length > 0) {
      // Intensité basée sur le nombre de mots-clés trouvés
      const intensity = Math.min(1, count / 5);
      emotions.push({
        emotion,
        intensity: Math.round(intensity * 100) / 100,
        keywords: foundKeywords
      });
    }
  }

  // Trier par intensité décroissante
  emotions.sort((a, b) => b.intensity - a.intensity);

  return {
    text: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
    word_count: words.length,
    emotions,
    dominant_emotion: emotions.length > 0 ? emotions[0].emotion : null,
    timestamp: new Date().toISOString()
  };
}

// Export pour utilisation
export { analyzeText, AnalysisResult, EmotionResult };

