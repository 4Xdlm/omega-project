/**
 * Dashboard Page Component
 * @module pages/DashboardPage
 * @description Overview and statistics
 */

import { useAnalysisStore, useSettingsStore } from '../stores';

/**
 * Dashboard page component
 * @returns Dashboard overview page
 */
export function DashboardPage(): JSX.Element {
  const { history } = useAnalysisStore();
  const { version } = useSettingsStore();

  const stats = calculateStats(history);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-omega-text">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Analyses" value={stats.totalAnalyses} />
        <StatCard label="Total Words" value={stats.totalWords} />
        <StatCard label="Avg Confidence" value={`${stats.avgConfidence}%`} />
        <StatCard label="Top Emotion" value={stats.topEmotion} />
      </div>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          System Status
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded bg-omega-bg border border-omega-border">
            <p className="text-xs text-omega-muted">Version</p>
            <p className="text-lg font-mono text-omega-primary">v{version}</p>
          </div>
          <div className="p-3 rounded bg-omega-bg border border-omega-border">
            <p className="text-xs text-omega-muted">Phase</p>
            <p className="text-lg font-mono text-omega-success">130</p>
          </div>
          <div className="p-3 rounded bg-omega-bg border border-omega-border">
            <p className="text-xs text-omega-muted">Status</p>
            <p className="text-lg text-omega-success">Operational</p>
          </div>
          <div className="p-3 rounded bg-omega-bg border border-omega-border">
            <p className="text-xs text-omega-muted">Standard</p>
            <p className="text-sm text-omega-text">NASA-Grade L4</p>
          </div>
        </div>
      </div>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          Emotion Distribution
        </h3>
        <EmotionChart history={history} />
      </div>
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="omega-card">
      <p className="text-xs text-omega-muted">{label}</p>
      <p className="text-2xl font-bold text-omega-primary mt-1 capitalize">{value}</p>
    </div>
  );
}

/**
 * Simple emotion chart component
 */
function EmotionChart({ history }: { history: { result: { aggregateEmotions: Record<string, number | undefined> } }[] }): JSX.Element {
  const emotionCounts: Record<string, number> = {};

  history.forEach(entry => {
    Object.entries(entry.result.aggregateEmotions).forEach(([emotion, intensity]) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + (intensity ?? 0);
    });
  });

  const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-2">
      {sorted.slice(0, 8).map(([emotion, count]) => (
        <div key={emotion} className="flex items-center gap-3">
          <span className="w-24 text-sm text-omega-text capitalize">{emotion}</span>
          <div className="flex-1 h-4 bg-omega-bg rounded overflow-hidden">
            <div
              className="h-full bg-omega-primary rounded"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-xs text-omega-muted text-right">
            {count.toFixed(1)}
          </span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p className="text-omega-muted text-center py-4">No data yet</p>
      )}
    </div>
  );
}

/**
 * Calculate dashboard statistics
 */
function calculateStats(history: { result: { wordCount: number; averageConfidence: number; dominantEmotion: string | null } }[]) {
  if (history.length === 0) {
    return {
      totalAnalyses: 0,
      totalWords: 0,
      avgConfidence: 0,
      topEmotion: 'None',
    };
  }

  const totalWords = history.reduce((sum, h) => sum + h.result.wordCount, 0);
  const avgConfidence = history.reduce((sum, h) => sum + h.result.averageConfidence, 0) / history.length;

  const emotionCounts: Record<string, number> = {};
  history.forEach(h => {
    if (h.result.dominantEmotion) {
      emotionCounts[h.result.dominantEmotion] = (emotionCounts[h.result.dominantEmotion] || 0) + 1;
    }
  });
  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  return {
    totalAnalyses: history.length,
    totalWords,
    avgConfidence: (avgConfidence * 100).toFixed(1),
    topEmotion,
  };
}
