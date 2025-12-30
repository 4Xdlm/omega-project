import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { getEmotionLabel } from "../i18n/emotions";

interface KeywordCount {
  word: string;
  count: number;
}

interface EmotionStat {
  emotion: string;
  intensity: number;
  occurrences: number;
  keywords: string[];
  keyword_counts?: KeywordCount[];
}

interface SegmentResult {
  id: string;
  index: number;
  title: string;
  word_count: number;
  total_emotion_hits: number;
  emotions: EmotionStat[];
  dominant_emotion: string | null;
}

interface AnalyzeResult {
  timestamp: string;
  duration_ms: number;
  source: string;
  word_count: number;
  char_count: number;
  total_emotion_hits: number;
  emotions: EmotionStat[];
  dominant_emotion: string | null;
  version: string;
  segmentation?: {
    mode: string;
    segments_count: number;
  };
  segments?: SegmentResult[];
}

const EMOTION_COLORS: Record<string, string> = {
  joy: "#FFD700",
  trust: "#20B2AA",
  fear: "#9333EA",
  sadness: "#3B82F6",
  anger: "#EF4444",
  surprise: "#F97316",
  disgust: "#14B8A6",
  anticipation: "#EC4899",
  love: "#E11D48",
  pride: "#A855F7"
};

interface Props {
  result: AnalyzeResult;
  onBack: () => void;
}

function RunViewer({ result, onBack }: Props) {
  const [selectedSegment, setSelectedSegment] = useState<SegmentResult | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionStat | null>(null);
  const [showTop, setShowTop] = useState<5 | 7>(5);

  const hasSegments = result.segments && result.segments.length > 0;

  const topEmotions = useMemo(() => {
    return result.emotions
      .slice(0, showTop)
      .map(e => e.emotion);
  }, [result.emotions, showTop]);

  const dominantData = useMemo(() => {
    if (!hasSegments) return [];
    return result.segments!.map(seg => ({
      name: `CH${seg.index}`,
      fullTitle: seg.title,
      dominant: seg.dominant_emotion || "none",
      intensity: seg.emotions[0]?.intensity || 0,
      hits: seg.total_emotion_hits,
      words: seg.word_count
    }));
  }, [result.segments, hasSegments]);

  const emotionCurvesData = useMemo(() => {
    if (!hasSegments) return [];
    return result.segments!.map(seg => {
      const point: Record<string, any> = {
        name: `CH${seg.index}`,
        fullTitle: seg.title
      };
      topEmotions.forEach(emotion => {
        const found = seg.emotions.find(e => e.emotion === emotion);
        point[emotion] = found ? found.intensity : 0;
      });
      return point;
    });
  }, [result.segments, topEmotions, hasSegments]);

  const densityData = useMemo(() => {
    if (!hasSegments) return [];
    return result.segments!.map(seg => ({
      name: `CH${seg.index}`,
      fullTitle: seg.title,
      density: seg.word_count > 0 ? (seg.total_emotion_hits / seg.word_count * 1000) : 0,
      hits: seg.total_emotion_hits,
      words: seg.word_count
    }));
  }, [result.segments, hasSegments]);

  const getSourceName = (source: string) => {
    const parts = source.split(/[/\\]/);
    return parts[parts.length - 1] || source;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">{data.fullTitle || label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {getEmotionLabel(p.dataKey)}: {(p.value * 100).toFixed(1)}%
          </p>
        ))}
        {data.hits !== undefined && <p>Hits: {data.hits}</p>}
        {data.words !== undefined && <p>Mots: {data.words}</p>}
      </div>
    );
  };

  const DensityTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">{data.fullTitle || label}</p>
        <p>Densite: {data.density.toFixed(1)} hits/1000 mots</p>
        <p>Hits: {data.hits} | Mots: {data.words}</p>
      </div>
    );
  };

  return (
    <div className="run-viewer">
      <div className="viewer-header">
        <button className="btn btn-secondary" onClick={onBack}>Retour</button>
        <h2>Timeline Emotionnelle</h2>
        <span className="viewer-version">v{result.version}</span>
      </div>

      <div className="viewer-meta">
        <span>{getSourceName(result.source)}</span>
        <span>{result.word_count.toLocaleString()} mots</span>
        <span>{result.total_emotion_hits} marqueurs</span>
        <span>{result.duration_ms}ms</span>
      </div>

      {/* Profil Global avec click pour voir les mots */}
      <div className="global-profile">
        <h3>Profil Global <span className="hint">(cliquez pour voir les mots)</span></h3>
        <div className="emotion-bars-global">
          {result.emotions.slice(0, 7).map((e, i) => (
            <div
              key={i}
              className={`emotion-bar-row clickable ${selectedEmotion?.emotion === e.emotion ? "selected" : ""}`}
              onClick={() => setSelectedEmotion(selectedEmotion?.emotion === e.emotion ? null : e)}
            >
              <span className="emotion-name" style={{ color: EMOTION_COLORS[e.emotion] }}>
                {getEmotionLabel(e.emotion)}
              </span>
              <div className="emotion-bar-track">
                <div
                  className="emotion-bar-fill-global"
                  style={{
                    width: `${e.intensity * 100}%`,
                    backgroundColor: EMOTION_COLORS[e.emotion]
                  }}
                />
              </div>
              <span className="emotion-pct">{(e.intensity * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Panel mots declencheurs global */}
        {selectedEmotion && (
          <div className="keyword-panel">
            <h4 style={{ color: EMOTION_COLORS[selectedEmotion.emotion] }}>
              {getEmotionLabel(selectedEmotion.emotion).toUpperCase()} — Mots declencheurs
            </h4>
            <p className="keyword-stats">
              {selectedEmotion.occurrences} occurrences totales
            </p>
            <div className="keyword-list">
              {selectedEmotion.keyword_counts && selectedEmotion.keyword_counts.length > 0 ? (
                selectedEmotion.keyword_counts.slice(0, 10).map((kc, i) => (
                  <div key={i} className="keyword-item">
                    <span className="keyword-word">"{kc.word}"</span>
                    <span className="keyword-count">x{kc.count}</span>
                    <div className="keyword-bar">
                      <div
                        className="keyword-bar-fill"
                        style={{
                          width: `${(kc.count / selectedEmotion.occurrences) * 100}%`,
                          backgroundColor: EMOTION_COLORS[selectedEmotion.emotion]
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-keywords">Aucun detail disponible (run ancien)</p>
              )}
            </div>
          </div>
        )}
      </div>

      {!hasSegments ? (
        <div className="no-segments">
          <p>Run non segmente (v0.5 ou mode "none")</p>
          <p>Relancez avec segmentation pour voir la timeline.</p>
        </div>
      ) : (
        <>
          <div className="chart-controls">
            <button
              className={showTop === 5 ? "active" : ""}
              onClick={() => setShowTop(5)}
            >Top 5</button>
            <button
              className={showTop === 7 ? "active" : ""}
              onClick={() => setShowTop(7)}
            >Top 7</button>
          </div>

          <div className="chart-section">
            <h3>Timeline Emotions Dominantes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dominantData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 11}} />
                <YAxis stroke="#9CA3AF" tick={{fontSize: 11}} domain={[0, 1]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="intensity"
                  fill="#FFD700"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-section">
            <h3>Courbes Emotionnelles (Top {showTop})</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionCurvesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 11}} />
                <YAxis stroke="#9CA3AF" tick={{fontSize: 11}} domain={[0, 1]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => getEmotionLabel(value)} />
                {topEmotions.map(emotion => (
                  <Line
                    key={emotion}
                    type="monotone"
                    dataKey={emotion}
                    name={getEmotionLabel(emotion)}
                    stroke={EMOTION_COLORS[emotion]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-section">
            <h3>Densite Emotionnelle (hits/1000 mots)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={densityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 11}} />
                <YAxis stroke="#9CA3AF" tick={{fontSize: 11}} />
                <Tooltip content={<DensityTooltip />} />
                <Line
                  type="monotone"
                  dataKey="density"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="segments-inspector">
            <h3>Segments ({result.segmentation?.segments_count}) <span className="hint">(cliquez pour details)</span></h3>
            <div className="segments-grid">
              {result.segments!.map(seg => (
                <div
                  key={seg.id}
                  className={`segment-card ${selectedSegment?.id === seg.id ? "selected" : ""}`}
                  onClick={() => setSelectedSegment(selectedSegment?.id === seg.id ? null : seg)}
                  style={{ borderLeftColor: EMOTION_COLORS[seg.dominant_emotion || ""] }}
                >
                  <span className="seg-num">#{seg.index}</span>
                  <span className="seg-title-short">{seg.title.substring(0, 20)}</span>
                  <span
                    className="seg-dom"
                    style={{ color: EMOTION_COLORS[seg.dominant_emotion || ""] }}
                  >
                    {getEmotionLabel(seg.dominant_emotion || "")}
                  </span>
                </div>
              ))}
            </div>

            {selectedSegment && (
              <div className="segment-detail-panel">
                <h4>{selectedSegment.title}</h4>
                <p>{selectedSegment.word_count} mots | {selectedSegment.total_emotion_hits} marqueurs</p>

                <div className="segment-emotions-detail">
                  {selectedSegment.emotions.slice(0, 5).map((e, i) => (
                    <div key={i} className="seg-emotion-block">
                      <div className="seg-emo-header">
                        <span style={{ color: EMOTION_COLORS[e.emotion] }}>{getEmotionLabel(e.emotion)}</span>
                        <span>{(e.intensity * 100).toFixed(1)}%</span>
                        <span>({e.occurrences} hits)</span>
                      </div>
                      {e.keyword_counts && e.keyword_counts.length > 0 && (
                        <div className="seg-keywords">
                          {e.keyword_counts.slice(0, 5).map((kc, j) => (
                            <span key={j} className="seg-keyword-tag">
                              {kc.word} <strong>x{kc.count}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-small"
                  onClick={() => {
                    const lines = [selectedSegment.title, `${selectedSegment.word_count} mots`, ""];
                    selectedSegment.emotions.slice(0, 5).forEach(e => {
                      lines.push(`${getEmotionLabel(e.emotion)}: ${(e.intensity * 100).toFixed(1)}%`);
                      if (e.keyword_counts) {
                        e.keyword_counts.slice(0, 3).forEach(kc => {
                          lines.push(`  - "${kc.word}" x${kc.count}`);
                        });
                      }
                    });
                    navigator.clipboard.writeText(lines.join("\n"));
                  }}
                >
                  Copier resume
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default RunViewer;
