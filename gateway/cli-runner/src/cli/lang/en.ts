/**
 * OMEGA CLI — English Emotion Keywords
 * Phase 16.1 — Language Support
 *
 * English keywords for Plutchik emotion detection.
 * External to FROZEN modules (genome/mycelium).
 */

export const EMOTION_KEYWORDS_EN: Record<string, string[]> = {
  joy: [
    'happy', 'joy', 'delight', 'pleased', 'cheerful', 'elated', 'wonderful', 'fantastic',
    'love', 'loved', 'loving', 'smile', 'smiling', 'laugh', 'laughing', 'laughed',
    'great', 'amazing', 'brilliant', 'excellent', 'good', 'nice', 'beautiful',
  ],
  trust: [
    'trust', 'believe', 'faith', 'confident', 'reliable', 'honest', 'loyal', 'faithful',
    'friend', 'friendship', 'safe', 'secure', 'certain', 'sure', 'depend', 'rely',
  ],
  fear: [
    'fear', 'afraid', 'scared', 'terrified', 'anxious', 'worried', 'panic', 'dread',
    'horror', 'horrible', 'terror', 'frightened', 'nervous', 'trembling', 'shaking',
    'danger', 'dangerous', 'threat', 'threatening', 'nightmare',
  ],
  surprise: [
    'surprise', 'surprised', 'amazing', 'amazed', 'astonished', 'shocked', 'unexpected',
    'wonder', 'startled', 'sudden', 'suddenly', 'incredible', 'unbelievable',
  ],
  sadness: [
    'sad', 'grief', 'sorrow', 'melancholy', 'depressed', 'unhappy', 'miserable', 'tragic',
    'tears', 'cry', 'crying', 'cried', 'weep', 'weeping', 'pain', 'painful', 'suffer',
    'suffering', 'death', 'die', 'died', 'dying', 'loss', 'lost', 'mourn', 'mourning',
  ],
  disgust: [
    'disgust', 'disgusted', 'disgusting', 'revolting', 'repulsive', 'loathing', 'hatred',
    'vile', 'nasty', 'gross', 'sick', 'sickening', 'horrible', 'awful', 'hate', 'hated',
  ],
  anger: [
    'angry', 'rage', 'fury', 'furious', 'mad', 'hostile', 'irritated', 'outraged',
    'hate', 'hatred', 'violent', 'violence', 'yell', 'yelling', 'scream', 'screaming',
    'shout', 'shouting', 'hit', 'hitting', 'punch', 'fight', 'fighting',
  ],
  anticipation: [
    'anticipate', 'expect', 'await', 'hope', 'hoping', 'eager', 'looking forward', 'excited',
    'excitement', 'impatient', 'wait', 'waiting', 'plan', 'planning', 'prepare', 'preparing',
    'tomorrow', 'future', 'soon', 'next',
  ],
};

export const LANG_NAME_EN = 'English';
