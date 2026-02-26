import { Injectable } from '@nestjs/common';
import { IdeaFormat } from './entities/idea.entity';
import { DEFAULT_MAX_HASHTAGS, DEFAULT_MAX_SHOTS } from './ideas.constants';

type RawIdeaCandidate = {
  topic?: unknown;
  title?: unknown;
  hook?: unknown;
  description?: unknown;
  format?: unknown;
  type?: unknown;
};

export type IdeasResponse = {
  ideas?: RawIdeaCandidate[];
};

export type ScriptResponse = {
  text?: unknown;
  script?: unknown;
  shotList?: unknown;
  content?: unknown;
  output?: unknown;
  result?: unknown;
  message?: unknown;
  shots?: unknown;
  scenes?: unknown;
  steps?: unknown;
  reel?: unknown;
  storyboard?: unknown;
  reel_title?: unknown;
  duration?: unknown;
  theme?: unknown;
  structure?: unknown;
};

export type CaptionResponse = {
  text?: unknown;
  hashtags?: unknown;
};

const IDEA_FORMAT_VALUES = new Set<string>(Object.values(IdeaFormat));

@Injectable()
export class IdeasWorkerResponseNormalizerService {
  normalizeIdeas(data: unknown, defaultFormat: string) {
    const rawIdeas = this.extractIdeasArray(data);
    return rawIdeas
      .map((item) => {
        const topicSource =
          typeof item.topic === 'string'
            ? item.topic
            : typeof item.title === 'string'
              ? item.title
              : undefined;
        const hookSource =
          typeof item.hook === 'string'
            ? item.hook
            : typeof item.description === 'string'
              ? item.description
              : undefined;
        const topic = topicSource?.trim();
        const hook = hookSource?.trim();
        const rawFormat =
          typeof item.format === 'string'
            ? item.format.trim().toLowerCase()
            : typeof item.type === 'string'
              ? item.type.trim().toLowerCase()
              : defaultFormat;
        const format = this.isValidIdeaFormat(rawFormat)
          ? rawFormat
          : (defaultFormat as IdeaFormat);

        if (!topic || !hook) {
          return null;
        }

        return {
          topic: topic.slice(0, 280),
          hook: hook.slice(0, 2000),
          format,
        };
      })
      .filter(
        (item): item is { topic: string; hook: string; format: IdeaFormat } =>
          Boolean(item),
      );
  }

  normalizeScriptText(data: ScriptResponse, maxScriptChars: number): string {
    const directText = this.pickFirstNonEmptyString([
      data.text,
      data.content,
      data.output,
      data.result,
      data.message,
    ]);

    const scriptField = data.script;
    const nestedScriptText = this.isRecord(scriptField)
      ? this.pickFirstNonEmptyString([
          scriptField.text,
          scriptField.content,
          scriptField.output,
          scriptField.result,
          scriptField.message,
        ])
      : null;

    const reelLike = this.extractReelLikeObject(data);
    const reelText = reelLike
      ? this.pickFirstNonEmptyString([
          reelLike.text,
          reelLike.script,
          reelLike.content,
          reelLike.output,
          reelLike.result,
          reelLike.message,
          reelLike.concept,
          reelLike.description,
          reelLike.hook,
        ])
      : null;

    const structuredFallbackText =
      this.buildScriptTextFromStructuredResponse(data);

    const value =
      directText ??
      nestedScriptText ??
      reelText ??
      structuredFallbackText ??
      (typeof scriptField === 'string' ? scriptField.trim() : null);

    if (!value) {
      throw new Error(
        `LLM returned empty script text. Response preview: ${this.previewUnknown(data)}`,
      );
    }
    return value.slice(0, maxScriptChars);
  }

  normalizeShotList(data: ScriptResponse): string[] {
    const reelLike = this.extractReelLikeObject(data);
    const nestedReelShots = reelLike
      ? this.pickFirstArray([
          reelLike.shotList,
          reelLike.shots,
          reelLike.scenes,
          reelLike.steps,
        ])
      : null;

    const rawList =
      this.pickFirstArray([
        data.shotList,
        data.shots,
        data.scenes,
        data.steps,
        data.structure,
        nestedReelShots,
        this.isRecord(data.script) ? data.script.shotList : null,
        this.isRecord(data.script) ? data.script.shots : null,
        this.isRecord(data.script) ? data.script.scenes : null,
      ]) ??
      this.toLineArray(
        this.pickFirstNonEmptyString([
          this.isRecord(data.script) ? data.script.shotList : null,
          data.shotList,
        ]),
      );

    return rawList
      .map((item) => this.normalizeShotItem(item))
      .filter(Boolean)
      .slice(0, DEFAULT_MAX_SHOTS);
  }

  normalizeCaptionText(data: CaptionResponse): string {
    if (typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error('LLM returned empty caption text');
    }
    return data.text.trim().slice(0, 3000);
  }

  normalizeHashtags(data: CaptionResponse): string[] {
    const hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
    return hashtags
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, DEFAULT_MAX_HASHTAGS);
  }

  previewUnknown(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private extractIdeasArray(data: unknown): RawIdeaCandidate[] {
    if (Array.isArray(data)) {
      return data as RawIdeaCandidate[];
    }
    if (!this.isRecord(data)) {
      return [];
    }
    if (Array.isArray(data.ideas)) {
      return data.ideas as RawIdeaCandidate[];
    }
    if (Array.isArray(data.results)) {
      return data.results as RawIdeaCandidate[];
    }
    if (Array.isArray(data.items)) {
      return data.items as RawIdeaCandidate[];
    }
    if (Array.isArray(data.data)) {
      return data.data as RawIdeaCandidate[];
    }
    return [];
  }

  private isValidIdeaFormat(value: string): value is IdeaFormat {
    return IDEA_FORMAT_VALUES.has(value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private pickFirstNonEmptyString(values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private pickFirstArray(values: unknown[]): unknown[] | null {
    for (const value of values) {
      if (Array.isArray(value)) {
        return value as unknown[];
      }
    }
    return null;
  }

  private normalizeShotItem(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (!this.isRecord(value)) {
      return '';
    }
    return (
      this.pickFirstNonEmptyString([
        value.description,
        value.text,
        value.title,
        value.visuals,
        value.text_overlay,
        value.audio,
        value.shot,
        value.scene,
        value.action,
      ]) ?? ''
    );
  }

  private buildScriptTextFromStructuredResponse(
    data: ScriptResponse,
  ): string | null {
    const title = this.pickFirstNonEmptyString([data.reel_title]);
    const duration = this.pickFirstNonEmptyString([data.duration]);
    const theme = this.pickFirstNonEmptyString([data.theme]);
    const structureItems = Array.isArray(data.structure) ? data.structure : [];

    const lines: string[] = [];
    if (title) {
      lines.push(`Title: ${title}`);
    }
    if (duration) {
      lines.push(`Duration: ${duration}`);
    }
    if (theme) {
      lines.push(`Theme: ${theme}`);
    }

    const structureLines = structureItems
      .map((item, index) => {
        if (!this.isRecord(item)) {
          if (typeof item === 'string' && item.trim()) {
            return `${index + 1}. ${item.trim()}`;
          }
          return '';
        }

        const time = this.pickFirstNonEmptyString([item.time]);
        const visuals = this.pickFirstNonEmptyString([
          item.visuals,
          item.description,
          item.text,
        ]);
        const audio = this.pickFirstNonEmptyString([item.audio]);
        const overlay = this.pickFirstNonEmptyString([
          item.text_overlay,
          item.overlay,
        ]);

        const parts = [
          time ? `[${time}]` : null,
          visuals,
          audio ? `Audio: ${audio}` : null,
          overlay ? `Text: ${overlay}` : null,
        ].filter((part): part is string => Boolean(part));

        return parts.length ? `${index + 1}. ${parts.join(' | ')}` : '';
      })
      .filter(Boolean);

    if (structureLines.length) {
      lines.push('Structure:', ...structureLines);
    }

    if (!lines.length) {
      return null;
    }

    return lines.join('\n');
  }

  private extractReelLikeObject(
    data: ScriptResponse,
  ): Record<string, unknown> | null {
    if (this.isRecord(data.reel)) {
      return data.reel;
    }
    if (this.isRecord(data.storyboard)) {
      return data.storyboard;
    }
    return null;
  }

  private toLineArray(value: string | null): string[] {
    if (!value) {
      return [];
    }
    return value
      .split('\n')
      .map((item) => item.replace(/^\s*[-*]\s*/, '').trim())
      .filter(Boolean);
  }
}
