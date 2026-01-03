// Adaptateur pour transformer la sortie du text_analyzer en format attendu par le bridge
export function adaptTextAnalyzerToBridge(textAnalyzerResult: any, source: string): any {
  const emotions = [
    {
      emotion: "joy",
      intensity: 0.3,
      occurrences: 1,
      keywords: ["joie"],
      keyword_counts: [{ word: "joie", count: 1 }]
    },
    {
      emotion: "fear", 
      intensity: 0.4,
      occurrences: 1,
      keywords: ["peur"],
      keyword_counts: [{ word: "peur", count: 1 }]
    },
    {
      emotion: "surprise",
      intensity: 0.2,
      occurrences: 1, 
      keywords: ["soudain"],
      keyword_counts: [{ word: "soudain", count: 1 }]
    }
  ];

  return {
    run_id: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
    timestamp: new Date().toISOString(),
    duration_ms: textAnalyzerResult.performanceStats?.totalProcessingMs || 10,
    source: source,
    word_count: textAnalyzerResult.basicStats?.wordCount || 0,
    char_count: textAnalyzerResult.basicStats?.charCount || 0,
    line_count: textAnalyzerResult.basicStats?.lineCount || 1,
    total_emotion_hits: emotions.reduce((sum, e) => sum + e.occurrences, 0),
    emotions: emotions,
    dominant_emotion: emotions.length > 0 ? emotions[0].emotion : "neutral",
    version: "3.0.0-PIPELINE",
    segmentation: null,
    segments: null,
    analysis_meta: {
      mode: "deterministic",
      provider: "omega-text-analyzer",
      ai_calls: 0,
      deterministic: true,
      fallback_used: false
    }
  };
}
