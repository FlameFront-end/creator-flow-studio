import { Injectable } from '@nestjs/common';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import {
  PolicyRuleSeverity,
  PolicyRuleType,
} from '../policy-rules/entities/policy-rule.entity';
import { PolicyRulesService } from '../policy-rules/policy-rules.service';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';
import { PersonasService } from '../personas/personas.service';
import { PromptPreviewDto } from './dto/prompt-preview.dto';

@Injectable()
export class PromptService {
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
      this.policyRulesService.findAll(),
      this.promptTemplatesService.findByKey(dto.templateKey),
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
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
      key in variables ? String(variables[key]) : `{{${key}}}`,
    );
  }

  private formatRules(
    rules: { type: PolicyRuleType; severity: PolicyRuleSeverity; text: string }[],
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
}
