import { Injectable } from '@nestjs/common';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import {
  PolicyRuleSeverity,
  PolicyRuleType,
} from '../policy-rules/entities/policy-rule.entity';
import { PolicyRulesService } from '../policy-rules/policy-rules.service';
import {
  PromptTemplate,
  PromptTemplateKey,
} from '../prompt-templates/entities/prompt-template.entity';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';
import { PersonasService } from '../personas/personas.service';
import { PromptPreviewDto } from './dto/prompt-preview.dto';

type CacheEntry<T> = {
  value: T;
  expiresAtMs: number;
};

@Injectable()
export class PromptService {
  private readonly cacheTtlMs =
    this.toPositiveInt(process.env.PROMPT_CACHE_TTL_SECONDS, 30) * 1000;
  private readonly policyRulesCache = new Map<
    string,
    CacheEntry<
      {
        type: PolicyRuleType;
        severity: PolicyRuleSeverity;
        text: string;
      }[]
    >
  >();
  private readonly templateCache = new Map<
    string,
    CacheEntry<PromptTemplate>
  >();

  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly personasService: PersonasService,
    private readonly policyRulesService: PolicyRulesService,
    private readonly promptTemplatesService: PromptTemplatesService,
  ) {}

  async preview(dto: PromptPreviewDto): Promise<{ prompt: string }> {
    const [runtimeConfig, persona, rules, template] = await Promise.all([
      this.aiSettingsService.getRuntimeConfig(),
      this.personasService.findOne(dto.personaId),
      this.getPolicyRulesCached(dto.personaId),
      this.getTemplateCached(dto.templateKey, dto.personaId),
    ]);

    const renderedTemplate = this.interpolateTemplate(
      template.template,
      dto.variables ?? {},
    );
    const prompt = [
      'SYSTEM CONTEXT',
      '',
      'PERSONA',
      `Name: ${persona.name}`,
      `Age: ${persona.age ?? 'n/a'}`,
      `Archetype/Tone: ${persona.archetypeTone ?? 'n/a'}`,
      `Bio: ${persona.bio ?? 'n/a'}`,
      `Visual code: ${persona.visualCode ?? 'n/a'}`,
      `Voice code: ${persona.voiceCode ?? 'n/a'}`,
      `Response language: ${runtimeConfig.responseLanguage}`,
      '',
      'POLICY',
      this.formatRules(rules, PolicyRuleType.DO, PolicyRuleSeverity.HARD),
      this.formatRules(rules, PolicyRuleType.DO, PolicyRuleSeverity.SOFT),
      this.formatRules(rules, PolicyRuleType.DONT, PolicyRuleSeverity.HARD),
      this.formatRules(rules, PolicyRuleType.DONT, PolicyRuleSeverity.SOFT),
      '',
      `TASK TEMPLATE [${dto.templateKey}]`,
      renderedTemplate,
    ].join('\n');

    return { prompt };
  }

  private interpolateTemplate(
    template: string,
    variables: Record<string, string | number | boolean>,
  ): string {
    return template.replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (_, key: string) =>
        key in variables ? String(variables[key]) : `{{${key}}}`,
    );
  }

  private formatRules(
    rules: {
      type: PolicyRuleType;
      severity: PolicyRuleSeverity;
      text: string;
    }[],
    type: PolicyRuleType,
    severity: PolicyRuleSeverity,
  ): string {
    const header = `${type} (${severity})`;
    const matched = rules
      .filter((rule) => rule.type === type && rule.severity === severity)
      .map((rule) => `- ${rule.text}`);

    if (!matched.length) {
      return `${header}\n- none`;
    }

    return `${header}\n${matched.join('\n')}`;
  }

  private async getPolicyRulesCached(personaId: string): Promise<
    {
      type: PolicyRuleType;
      severity: PolicyRuleSeverity;
      text: string;
    }[]
  > {
    const nowMs = Date.now();
    const cacheKey = personaId;
    const cached = this.policyRulesCache.get(cacheKey);
    if (cached && cached.expiresAtMs > nowMs) {
      return cached.value;
    }

    const rules = await this.policyRulesService.findAll({
      personaId,
      includeGlobal: true,
    });
    this.policyRulesCache.set(cacheKey, {
      value: rules,
      expiresAtMs: nowMs + this.cacheTtlMs,
    });
    return rules;
  }

  private async getTemplateCached(
    key: PromptTemplateKey,
    personaId: string,
  ): Promise<PromptTemplate> {
    const nowMs = Date.now();
    const cacheKey = `${personaId}:${key}`;
    const cached = this.templateCache.get(cacheKey);
    if (cached && cached.expiresAtMs > nowMs) {
      return cached.value;
    }

    const template = await this.promptTemplatesService.findByKey(
      key,
      personaId,
    );
    this.templateCache.set(cacheKey, {
      value: template,
      expiresAtMs: nowMs + this.cacheTtlMs,
    });
    return template;
  }

  private toPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }
}
