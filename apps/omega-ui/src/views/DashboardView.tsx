/**
 * Dashboard View for OMEGA UI
 * @module views/DashboardView
 * @description Main dashboard with overview statistics
 */

import { useMemo, useCallback } from 'react';
import { StatCard } from '../components/dashboard/StatCard';
import { EmotionOverview } from '../components/dashboard/EmotionOverview';
import { RecentAnalyses } from '../components/dashboard/RecentAnalyses';
import { useAnalysisStore } from '../stores/analysisStore';
import { useUIStore } from '../stores/uiStore';
import type { TextAnalysisResult } from '../core/types';

/**
 * Dashboard view component
 * @returns Dashboard with stats and widgets
 */
export function DashboardView(): JSX.Element {
  const { results } = useAnalysisStore();
  const { setCurrentView } = useUIStore();

  const stats = useMemo(() => {
    const totalAnalyses = results.length;
    const totalWords = results.reduce((sum, r) => sum + r.metadata.wordCount, 0);
    const totalCharacters = results.reduce((sum, r) => sum + r.metadata.textLength, 0);

    // Find most common emotion
    const emotionCounts: Record<string, number> = {};
    results.forEach((result) => {
      const dominant = Object.entries(result.emotions).sort((a, b) => b[1] - a[1])[0];
      if (dominant) {
        emotionCounts[dominant[0]] = (emotionCounts[dominant[0]] || 0) + 1;
      }
    });
    const mostCommon = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

    // Average emotion intensity
    let totalIntensity = 0;
    let intensityCount = 0;
    results.forEach((result) => {
      Object.values(result.emotions).forEach((value) => {
        if (value > 0) {
          totalIntensity += value;
          intensityCount++;
        }
      });
    });
    const avgIntensity = intensityCount > 0 ? totalIntensity / intensityCount : 0;

    return {
      totalAnalyses,
      totalWords,
      totalCharacters,
      mostCommonEmotion: mostCommon?.[0] || 'none',
      mostCommonCount: mostCommon?.[1] || 0,
      avgIntensity,
    };
  }, [results]);

  const handleSelectAnalysis = useCallback(
    (result: TextAnalysisResult) => {
      setCurrentView('history');
    },
    [setCurrentView]
  );

  const handleNavigateToAnalyze = useCallback(() => {
    setCurrentView('analyze');
  }, [setCurrentView]);

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-omega-text">Dashboard</h1>
          <p className="text-sm text-omega-muted mt-1">
            Overview of your emotional analysis activity
          </p>
        </div>
        <button
          onClick={handleNavigateToAnalyze}
          className="px-4 py-2 bg-omega-primary text-white rounded-lg hover:bg-omega-primary/90 transition-colors text-sm font-medium"
        >
          New Analysis
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Analyses"
          value={stats.totalAnalyses}
          subtitle="Texts analyzed"
          icon={<AnalysisIcon />}
          color="primary"
        />
        <StatCard
          title="Words Processed"
          value={formatNumber(stats.totalWords)}
          subtitle="Total word count"
          icon={<WordIcon />}
        />
        <StatCard
          title="Dominant Emotion"
          value={capitalize(stats.mostCommonEmotion)}
          subtitle={stats.mostCommonCount > 0 ? `${stats.mostCommonCount} occurrences` : 'No data'}
          icon={<EmotionIcon />}
          color={stats.mostCommonEmotion !== 'none' ? 'success' : 'default'}
        />
        <StatCard
          title="Avg. Intensity"
          value={`${(stats.avgIntensity * 100).toFixed(0)}%`}
          subtitle="Emotion strength"
          icon={<IntensityIcon />}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Emotion overview (2 cols) */}
        <div className="lg:col-span-2">
          <EmotionOverview results={results} maxEmotions={8} />
        </div>

        {/* Recent analyses (1 col) */}
        <div>
          <RecentAnalyses
            results={results}
            maxItems={6}
            onSelect={handleSelectAnalysis}
          />
        </div>
      </div>

      {/* Quick actions */}
      {results.length === 0 && (
        <div className="bg-omega-surface/50 rounded-lg border border-omega-border border-dashed p-8 text-center">
          <WelcomeIcon />
          <h3 className="text-lg font-medium text-omega-text mt-4">
            Welcome to OMEGA
          </h3>
          <p className="text-sm text-omega-muted mt-2 max-w-md mx-auto">
            Start by analyzing some text to see emotional insights and build your analysis history.
          </p>
          <button
            onClick={handleNavigateToAnalyze}
            className="mt-4 px-6 py-2 bg-omega-primary text-white rounded-lg hover:bg-omega-primary/90 transition-colors text-sm font-medium"
          >
            Start Your First Analysis
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Format large numbers
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Icon components
 */
function AnalysisIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function WordIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
  );
}

function EmotionIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IntensityIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function WelcomeIcon(): JSX.Element {
  return (
    <svg className="w-16 h-16 mx-auto text-omega-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
