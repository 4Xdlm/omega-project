import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
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
  runA: AnalyzeResult;
  runB: AnalyzeResult;
  runIdA: string;
  runIdB: string;
  onBack: () => void;
}

function DiffViewer({ runA, runB, onBack }: Props) {
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [showTop, setShowTop] = useState<5 | 7>(5);
  const [showOnlySignificant, setShowOnlySignificant] = useState(false);

  const getSourceName = (source: string) => {
    const parts = source.split(/[/\\]/);
    return parts[parts.length - 1] || source;
  };

  // Verifier compatibilite
  const isCompatible = useMemo(() => {
    if (!runA.segments || !runB.segments) return false;
    if (runA.segmentation?.mode !== runB.segmentation?.mode) return false;
    if (runA.segments.length !== runB.segments.length) return false;
    return true;
  }, [runA, runB]);

  // Diff global
  const globalDiff = useMemo(() => {
    const diff: { emotion: string; a: number; b: number; delta: number }[] = [];

    const allEmotions = new Set([
      ...runA.emotions.map(e => e.emotion),
      ...runB.emotions.map(e => e.emotion)
    ]);

    allEmotions.forEach(emotion => {
      const eA = runA.emotions.find(e => e.emotion === emotion);
      const eB = runB.emotions.find(e => e.emotion === emotion);
      const a = eA?.intensity || 0;
      const b = eB?.intensity || 0;
      diff.push({ emotion, a, b, delta: b - a });
    });

    diff.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    return diff;
  }, [runA, runB]);

  // Top emotions pour les courbes
  const topEmotions = useMemo(() => {
    return runA.emotions
      .slice(0, showTop)
      .map(e => e.emotion);
  }, [runA.emotions, showTop]);

  // Diff par segment (delta curves)
  const segmentDeltaData = useMemo(() => {
    if (!isCompatible || !runA.segments || !runB.segments) return [];

    return runA.segments.map((segA, i) => {
      const segB = runB.segments![i];
      const point: Record<string, any> = {
        name: `CH${segA.index}`,
        titleA: segA.title,
        titleB: segB.title
      };

      topEmotions.forEach(emotion => {
        const eA = segA.emotions.find(e => e.emotion === emotion);
        const eB = segB.emotions.find(e => e.emotion === emotion);
        const delta = (eB?.intensity || 0) - (eA?.intensity || 0);
        point[emotion] = delta;
      });

      // Density delta
      const densityA = segA.word_count > 0 ? segA.total_emotion_hits / segA.word_count * 1000 : 0;
      const densityB = segB.word_count > 0 ? segB.total_emotion_hits / segB.word_count * 1000 : 0;
      point.densityDelta = densityB - densityA;
      point.densityA = densityA;
      point.densityB = densityB;

      return point;
    });
  }, [runA, runB, topEmotions, isCompatible]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    if (!isCompatible || !runA.segments || !runB.segments) return [];

    return runA.segments.map((segA, i) => {
      const segB = runB.segments![i];

      let totalDelta = 0;
      topEmotions.forEach(emotion => {
        const eA = segA.emotions.find(e => e.emotion === emotion);
        const eB = segB.emotions.find(e => e.emotion === emotion);
        totalDelta += Math.abs((eB?.intensity || 0) - (eA?.intensity || 0));
      });

      return {
        index: i,
        segIndex: segA.index,
        title: segA.title,
        totalDelta,
        dominantA: segA.dominant_emotion,
        dominantB: segB.dominant_emotion,
        changed: segA.dominant_emotion !== segB.dominant_emotion
      };
    });
  }, [runA, runB, topEmotions, isCompatible]);

  // Segment detail
  const selectedSegmentDiff = useMemo(() => {
    if (selectedSegmentIndex === null || !runA.segments || !runB.segments) return null;

    const segA = runA.segments[selectedSegmentIndex];
    const segB = runB.segments[selectedSegmentIndex];

    const emotionDiffs: { emotion: string; a: number; b: number; delta: number; occA: number; occB: number }[] = [];

    const allEmotions = new Set([
      ...segA.emotions.map(e => e.emotion),
      ...segB.emotions.map(e => e.emotion)
    ]);

    allEmotions.forEach(emotion => {
      const eA = segA.emotions.find(e => e.emotion === emotion);
      const eB = segB.emotions.find(e => e.emotion === emotion);
      emotionDiffs.push({
        emotion,
        a: eA?.intensity || 0,
        b: eB?.intensity || 0,
        delta: (eB?.intensity || 0) - (eA?.intensity || 0),
        occA: eA?.occurrences || 0,
        occB: eB?.occurrences || 0
      });
    });

    emotionDiffs.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

    return { segA, segB, emotionDiffs };
  }, [selectedSegmentIndex, runA, runB]);

  const DeltaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">{data.titleA || label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {getEmotionLabel(p.dataKey)}: {p.value > 0 ? "+" : ""}{(p.value * 100).toFixed(1)}%
          </p>
        ))}
      </div>
    );
  };

  if (!isCompatible) {
    return (
      <div className="diff-viewer">
        <div className="viewer-header">
          <button className="btn btn-secondary" onClick={onBack}>Retour</button>
          <h2>Comparaison impossible</h2>
        </div>
        <div className="incompatible-warning">
          <h3>Runs non compatibles pour diff</h3>
          <p>Les deux runs doivent avoir:</p>
          <ul>
            <li>Le meme mode de segmentation</li>
            <li>Le meme nombre de segments</li>
          </ul>
          <div className="incompatible-details">
            <div>
              <strong>Run A:</strong> {runA.segmentation?.mode || "none"}
              ({runA.segments?.length || 0} segments)
            </div>
            <div>
              <strong>Run B:</strong> {runB.segmentation?.mode || "none"}
              ({runB.segments?.length || 0} segments)
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="viewer-header">
        <button className="btn btn-secondary" onClick={onBack}>Retour</button>
        <h2>Diff Emotionnel</h2>
        <span className="viewer-version">v0.8.0</span>
      </div>

      {/* Run infos */}
      <div className="diff-runs-info">
        <div className="diff-run-card run-a">
          <span className="run-label">A (avant)</span>
          <span className="run-source">{getSourceName(runA.source)}</span>
          <span className="run-date">{new Date(runA.timestamp).toLocaleDateString()}</span>
        </div>
        <div className="diff-arrow">→</div>
        <div className="diff-run-card run-b">
          <span className="run-label">B (apres)</span>
          <span className="run-source">{getSourceName(runB.source)}</span>
          <span className="run-date">{new Date(runB.timestamp).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Global diff table */}
      <div className="diff-section">
        <h3>Diff Global</h3>
        <div className="diff-global-table">
          <div className="diff-table-header">
            <span>Emotion</span>
            <span>A</span>
            <span>B</span>
            <span>Δ</span>
          </div>
          {globalDiff
            .filter(d => !showOnlySignificant || Math.abs(d.delta) > 0.02)
            .slice(0, 8)
            .map((d, i) => (
            <div key={i} className="diff-table-row">
              <span style={{ color: EMOTION_COLORS[d.emotion] }}>{getEmotionLabel(d.emotion)}</span>
              <span>{(d.a * 100).toFixed(1)}%</span>
              <span>{(d.b * 100).toFixed(1)}%</span>
              <span className={`delta ${d.delta > 0 ? "positive" : d.delta < 0 ? "negative" : ""}`}>
                {d.delta > 0 ? "+" : ""}{(d.delta * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="chart-controls">
        <button
          className={showTop === 5 ? "active" : ""}
          onClick={() => setShowTop(5)}
        >Top 5</button>
        <button
          className={showTop === 7 ? "active" : ""}
          onClick={() => setShowTop(7)}
        >Top 7</button>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showOnlySignificant}
            onChange={(e) => setShowOnlySignificant(e.target.checked)}
          />
          Deltas significatifs seulement
        </label>
      </div>

      {/* Delta timeline */}
      <div className="chart-section">
        <h3>Timeline Δ par segment</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={segmentDeltaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 11}} />
            <YAxis stroke="#9CA3AF" tick={{fontSize: 11}} />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            <Tooltip content={<DeltaTooltip />} />
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
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap segments */}
      <div className="diff-section">
        <h3>Impact par segment</h3>
        <div className="heatmap-grid">
          {heatmapData.map((seg, i) => (
            <div
              key={i}
              className={`heatmap-cell ${selectedSegmentIndex === i ? "selected" : ""} ${seg.changed ? "changed" : ""}`}
              onClick={() => setSelectedSegmentIndex(selectedSegmentIndex === i ? null : i)}
              style={{
                backgroundColor: seg.totalDelta > 0.3 ? "rgba(239, 68, 68, 0.3)" :
                                seg.totalDelta > 0.15 ? "rgba(251, 191, 36, 0.3)" :
                                "transparent"
              }}
            >
              <span className="heatmap-index">#{seg.segIndex}</span>
              <span className="heatmap-delta">
                {seg.totalDelta > 0 ? `Δ ${(seg.totalDelta * 100).toFixed(0)}%` : "-"}
              </span>
              {seg.changed && (
                <span className="heatmap-changed">
                  {getEmotionLabel(seg.dominantA || "")} → {getEmotionLabel(seg.dominantB || "")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Segment diff detail */}
      {selectedSegmentDiff && (
        <div className="segment-diff-detail">
          <h3>{selectedSegmentDiff.segA.title}</h3>
          <div className="segment-diff-meta">
            <span>A: {selectedSegmentDiff.segA.word_count} mots, {selectedSegmentDiff.segA.total_emotion_hits} hits</span>
            <span>B: {selectedSegmentDiff.segB.word_count} mots, {selectedSegmentDiff.segB.total_emotion_hits} hits</span>
          </div>
          <div className="segment-diff-emotions">
            {selectedSegmentDiff.emotionDiffs
              .filter(d => !showOnlySignificant || Math.abs(d.delta) > 0.03)
              .slice(0, 6)
              .map((d, i) => (
              <div key={i} className="segment-diff-row">
                <span className="emotion-label" style={{ color: EMOTION_COLORS[d.emotion] }}>
                  {getEmotionLabel(d.emotion)}
                </span>
                <span>{(d.a * 100).toFixed(1)}%</span>
                <span className="diff-arrow-small">→</span>
                <span>{(d.b * 100).toFixed(1)}%</span>
                <span className={`delta ${d.delta > 0 ? "positive" : d.delta < 0 ? "negative" : ""}`}>
                  ({d.delta > 0 ? "+" : ""}{(d.delta * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DiffViewer;
