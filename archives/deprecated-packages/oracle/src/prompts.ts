/**
 * Oracle Prompt Templates
 * @module @omega/oracle/prompts
 * @description Prompt templates for AI analysis
 */

/**
 * Prompt template parameters
 */
export interface PromptParams {
  text: string;
  depth: 'quick' | 'standard' | 'deep';
  language?: string;
  context?: string;
  format?: 'json' | 'text';
}

/**
 * Prompt template result
 */
export interface PromptTemplate {
  system: string;
  user: string;
}

/**
 * Base system prompt for emotional analysis
 */
const SYSTEM_BASE = `You are OMEGA Oracle, an advanced emotional analysis AI.
Your role is to analyze text for emotional content with high precision and nuance.
You identify emotions from the Emotion14 canonical set: joy, sadness, anger, fear,
surprise, disgust, trust, anticipation, love, guilt, shame, pride, envy, contempt.

Guidelines:
- Be precise and evidence-based in your analysis
- Provide confidence scores between 0 and 1
- Identify specific text evidence for each emotion
- Consider cultural and contextual nuances
- Maintain objectivity and avoid bias`;

/**
 * Analysis depth configurations
 */
const DEPTH_CONFIG = {
  quick: {
    maxEmotions: 3,
    includeEvidence: false,
    includeNarrative: false,
    responseLength: 'brief',
  },
  standard: {
    maxEmotions: 5,
    includeEvidence: true,
    includeNarrative: true,
    responseLength: 'moderate',
  },
  deep: {
    maxEmotions: 8,
    includeEvidence: true,
    includeNarrative: true,
    responseLength: 'comprehensive',
  },
};

/**
 * Create emotional analysis prompt
 */
export function createAnalysisPrompt(params: PromptParams): PromptTemplate {
  const config = DEPTH_CONFIG[params.depth];

  const system = `${SYSTEM_BASE}

Analysis depth: ${params.depth}
Maximum emotions to identify: ${config.maxEmotions}
Include evidence: ${config.includeEvidence}
Include narrative analysis: ${config.includeNarrative}
Response format: ${params.format || 'json'}`;

  const user = `Analyze the following text for emotional content:

"""
${params.text}
"""

${params.context ? `Context: ${params.context}` : ''}

Provide your analysis in the following structure:
1. Primary emotions detected (up to ${config.maxEmotions})
2. Confidence scores for each emotion
${config.includeEvidence ? '3. Text evidence supporting each emotion' : ''}
${config.includeNarrative ? '4. Narrative analysis (tone, arc, themes)' : ''}
5. Overall emotional summary`;

  return { system, user };
}

/**
 * Create narrative analysis prompt
 */
export function createNarrativePrompt(params: PromptParams): PromptTemplate {
  const system = `${SYSTEM_BASE}

You are analyzing narrative structure and emotional progression.
Focus on:
- Narrative arc (rising, falling, stable, mixed)
- Tonal shifts throughout the text
- Character voice and perspective
- Thematic elements`;

  const user = `Analyze the narrative structure of the following text:

"""
${params.text}
"""

Provide:
1. Overall tone description
2. Narrative arc classification
3. Key themes identified (up to 4)
4. Voice/perspective analysis
5. Emotional progression throughout the text`;

  return { system, user };
}

/**
 * Create comparison prompt
 */
export function createComparisonPrompt(
  text1: string,
  text2: string,
  params: Partial<PromptParams>
): PromptTemplate {
  const system = `${SYSTEM_BASE}

You are comparing the emotional content of two texts.
Identify similarities and differences in:
- Primary emotions
- Emotional intensity
- Tonal characteristics
- Narrative elements`;

  const user = `Compare the emotional content of these two texts:

Text 1:
"""
${text1}
"""

Text 2:
"""
${text2}
"""

Provide:
1. Common emotions in both texts
2. Unique emotions in each text
3. Intensity comparison
4. Tonal similarities and differences
5. Overall comparison summary`;

  return { system, user };
}

/**
 * Create summary prompt
 */
export function createSummaryPrompt(params: PromptParams): PromptTemplate {
  const system = `${SYSTEM_BASE}

You are creating a concise emotional summary.
Focus on the most significant emotional elements.
Be clear and accessible in your language.`;

  const user = `Provide a brief emotional summary of the following text:

"""
${params.text}
"""

Summary should be:
- 2-3 sentences maximum
- Focus on dominant emotions
- Include emotional intensity
- Accessible to non-experts`;

  return { system, user };
}

/**
 * Create recommendations prompt
 */
export function createRecommendationsPrompt(
  text: string,
  insights: Array<{ emotion: string; intensity: number }>
): PromptTemplate {
  const system = `${SYSTEM_BASE}

You are providing constructive recommendations for emotional expression.
Be supportive and constructive in your feedback.
Focus on enhancing emotional clarity and impact.`;

  const insightsSummary = insights
    .map((i) => `- ${i.emotion}: ${(i.intensity * 100).toFixed(0)}%`)
    .join('\n');

  const user = `Based on this text and its emotional analysis, provide recommendations:

Text:
"""
${text}
"""

Current emotional profile:
${insightsSummary}

Provide 3-5 specific, actionable recommendations for:
1. Strengthening emotional expression
2. Balancing emotional content
3. Improving narrative impact`;

  return { system, user };
}

/**
 * Prompt template registry
 */
export const PROMPT_REGISTRY = {
  analysis: createAnalysisPrompt,
  narrative: createNarrativePrompt,
  comparison: createComparisonPrompt,
  summary: createSummaryPrompt,
  recommendations: createRecommendationsPrompt,
};

/**
 * Get available prompt types
 */
export function getAvailablePromptTypes(): string[] {
  return Object.keys(PROMPT_REGISTRY);
}

/**
 * Validate prompt parameters
 */
export function validatePromptParams(params: PromptParams): string[] {
  const errors: string[] = [];

  if (!params.text || params.text.trim().length === 0) {
    errors.push('Text is required');
  }

  if (params.text && params.text.length > 50000) {
    errors.push('Text exceeds maximum length of 50000 characters');
  }

  if (!['quick', 'standard', 'deep'].includes(params.depth)) {
    errors.push('Invalid depth: must be quick, standard, or deep');
  }

  return errors;
}

/**
 * Estimate token count for prompt
 */
export function estimateTokenCount(prompt: PromptTemplate): number {
  const totalChars = prompt.system.length + prompt.user.length;
  // Rough estimate: ~4 characters per token
  return Math.ceil(totalChars / 4);
}
