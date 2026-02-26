import { Injectable } from '@nestjs/common';
import { Asset } from '../ideas/entities/asset.entity';
import { Caption } from '../ideas/entities/caption.entity';
import { Idea } from '../ideas/entities/idea.entity';
import { PolicyRule } from '../policy-rules/entities/policy-rule.entity';
import {
  ModerationCheckItem,
  ModerationChecksPayload,
} from './entities/moderation-check.entity';

type BuildModerationChecksParams = {
  idea: Idea;
  caption: Caption | null;
  selectedAssets: Asset[];
  hardDontRules: PolicyRule[];
};

@Injectable()
export class PostDraftsModerationService {
  private static readonly NSFW_KEYWORDS = [
    'porn',
    'sex',
    'nude',
    'naked',
    'эрот',
    'обнажен',
    '18+',
  ];

  private static readonly TOXICITY_KEYWORDS = [
    'kill',
    'hate',
    'idiot',
    'stupid',
    'ненавиж',
    'убей',
    'тупой',
  ];

  private static readonly FORBIDDEN_TOPIC_KEYWORDS = [
    'drugs',
    'weapon',
    'terror',
    'violence',
    'наркот',
    'оруж',
    'террор',
    'насилие',
  ];

  buildChecks(params: BuildModerationChecksParams): ModerationChecksPayload {
    const textCorpus = this.buildModerationCorpus(
      params.idea,
      params.caption,
      params.selectedAssets,
    );

    return {
      nsfw: this.evaluateKeywords(
        textCorpus,
        PostDraftsModerationService.NSFW_KEYWORDS,
      ),
      toxicity: this.evaluateKeywords(
        textCorpus,
        PostDraftsModerationService.TOXICITY_KEYWORDS,
      ),
      forbiddenTopics: this.evaluateKeywords(
        textCorpus,
        PostDraftsModerationService.FORBIDDEN_TOPIC_KEYWORDS,
      ),
      policy: this.evaluatePolicyRules(textCorpus, params.hardDontRules),
    };
  }

  isPassed(checks: ModerationChecksPayload): boolean {
    return Object.values(checks).every((item) => item.passed);
  }

  getFailedCheckNames(checks: ModerationChecksPayload): string[] {
    return Object.entries(checks)
      .filter(([, item]) => !item.passed)
      .map(([name]) => name);
  }

  private buildModerationCorpus(
    idea: Idea,
    caption: Caption | null,
    selectedAssets: Asset[],
  ): string {
    const parts = [
      idea.topic,
      idea.hook,
      caption?.text ?? '',
      ...(caption?.hashtags ?? []),
      ...selectedAssets.map((asset) => asset.sourcePrompt ?? ''),
    ];
    return parts.join('\n').toLowerCase();
  }

  private evaluateKeywords(
    corpus: string,
    keywords: string[],
  ): ModerationCheckItem {
    const hits = Array.from(
      new Set(
        keywords
          .map((keyword) => keyword.toLowerCase())
          .filter((keyword) => corpus.includes(keyword)),
      ),
    );

    return {
      passed: hits.length === 0,
      score: hits.length / Math.max(keywords.length, 1),
      hits,
    };
  }

  private evaluatePolicyRules(
    corpus: string,
    hardDontRules: PolicyRule[],
  ): ModerationCheckItem {
    const hits = Array.from(
      new Set(
        hardDontRules
          .map((rule) => rule.text.trim())
          .filter(Boolean)
          .filter((ruleText) => corpus.includes(ruleText.toLowerCase())),
      ),
    );

    return {
      passed: hits.length === 0,
      score: hits.length / Math.max(hardDontRules.length, 1),
      hits,
    };
  }
}
