export const AI_GENERATION_QUEUE = 'ai-generation';

export enum AiJobName {
  GENERATE_IDEAS = 'generate-ideas',
  GENERATE_SCRIPT = 'generate-script',
  GENERATE_CAPTION = 'generate-caption',
  GENERATE_IMAGE = 'generate-image',
  GENERATE_VIDEO = 'generate-video',
}

export const DEFAULT_IDEA_COUNT = 5;
export const DEFAULT_IDEA_FORMAT = 'reel';
export const DEFAULT_MAX_SCRIPT_CHARS = 4000;
export const DEFAULT_MAX_SHOTS = 20;
export const DEFAULT_MAX_HASHTAGS = 20;
export const DEFAULT_LLM_MAX_TOKENS = 1400;
export const DEFAULT_IMAGE_MAX_PROMPT_CHARS = 1200;
