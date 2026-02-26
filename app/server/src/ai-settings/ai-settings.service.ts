import { BadRequestException, Injectable } from '@nestjs/common';
import { isIP } from 'node:net';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSettingsCryptoService } from './ai-settings-crypto.service';
import {
  AiProviderName,
  AiRuntimeConfig,
  AiSettingsView,
  AI_PROVIDER_VALUES,
  DEFAULT_AI_RESPONSE_LANGUAGE,
  DEFAULT_AI_MAX_TOKENS,
} from './ai-settings.types';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { TestAiSettingsDto } from './dto/test-ai-settings.dto';
import { AiProviderSettings } from './entities/ai-provider-settings.entity';

const GLOBAL_SETTINGS_SCOPE_KEY = 'global';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

@Injectable()
export class AiSettingsService {
  constructor(
    @InjectRepository(AiProviderSettings)
    private readonly aiProviderSettingsRepository: Repository<AiProviderSettings>,
    private readonly aiSettingsCryptoService: AiSettingsCryptoService,
  ) {}

  async getPublicSettings(): Promise<AiSettingsView> {
    const stored = await this.findStoredSettings();
    const runtime = this.resolveRuntimeConfig(stored);
    const hasApiKey = Boolean(runtime.apiKey.trim());

    return {
      provider: runtime.provider,
      model: runtime.model,
      baseUrl: runtime.baseUrl,
      responseLanguage: runtime.responseLanguage,
      maxTokens: runtime.maxTokens,
      aiTestMode: runtime.aiTestMode,
      isEnabled: stored?.isEnabled ?? false,
      source: runtime.source,
      hasApiKey,
      apiKeyMasked: hasApiKey
        ? this.aiSettingsCryptoService.maskSecret(runtime.apiKey)
        : null,
      updatedAt: stored?.updatedAt?.toISOString() ?? null,
      updatedBy: stored?.updatedBy ?? null,
    };
  }

  async updateSettings(
    dto: UpdateAiSettingsDto,
    updatedBy: string | null,
  ): Promise<AiSettingsView> {
    const stored = await this.findStoredSettings();
    const provider = this.normalizeProvider(dto.provider);
    const model = this.normalizeRequiredModel(dto.model);
    const nextMaxTokens = this.normalizeMaxTokens(
      dto.maxTokens ?? stored?.maxTokens ?? this.resolveEnvMaxTokens(),
    );
    const nextResponseLanguage = this.normalizeResponseLanguage(
      dto.responseLanguage ??
        stored?.responseLanguage ??
        this.resolveEnvResponseLanguage(),
    );
    const nextAiTestMode =
      dto.aiTestMode ?? stored?.aiTestMode ?? this.resolveEnvAiTestMode();
    const nextIsEnabled = dto.isEnabled ?? stored?.isEnabled ?? true;

    const persistedKey = this.decryptStoredKey(stored?.apiKeyEncrypted ?? null);
    const providedApiKey = this.normalizeOptionalText(dto.apiKey);
    const apiKey = dto.clearApiKey
      ? ''
      : providedApiKey !== null
        ? providedApiKey
        : persistedKey;

    const baseUrl =
      provider === 'openai-compatible'
        ? this.requireNormalizedCompatibleBaseUrl(
            this.normalizeOptionalText(dto.baseUrl) ??
              stored?.baseUrl ??
              this.resolveEnvCompatibleBaseUrl(),
          )
        : null;

    this.assertProviderConfig({
      provider,
      model,
      apiKey,
      baseUrl,
    });

    const entity = stored ?? this.aiProviderSettingsRepository.create();
    entity.scopeKey = GLOBAL_SETTINGS_SCOPE_KEY;
    entity.provider = provider;
    entity.model = model;
    entity.baseUrl = baseUrl;
    entity.responseLanguage = nextResponseLanguage;
    entity.maxTokens = nextMaxTokens;
    entity.aiTestMode = nextAiTestMode;
    entity.isEnabled = nextIsEnabled;
    entity.updatedBy = this.normalizeOptionalText(updatedBy);
    entity.apiKeyEncrypted = apiKey
      ? this.aiSettingsCryptoService.encrypt(apiKey)
      : null;

    await this.aiProviderSettingsRepository.save(entity);
    return this.getPublicSettings();
  }

  async resetToEnvDefaults(): Promise<AiSettingsView> {
    await this.aiProviderSettingsRepository.delete({
      scopeKey: GLOBAL_SETTINGS_SCOPE_KEY,
    });
    return this.getPublicSettings();
  }

  async getRuntimeConfig(): Promise<AiRuntimeConfig> {
    const stored = await this.findStoredSettings();
    return this.resolveRuntimeConfig(stored);
  }

  async buildRuntimeConfigForTest(
    dto: TestAiSettingsDto,
  ): Promise<AiRuntimeConfig> {
    const runtime = await this.getRuntimeConfig();
    const provider = dto.provider
      ? this.normalizeProvider(dto.provider)
      : runtime.provider;
    const model = dto.model
      ? this.normalizeRequiredModel(dto.model)
      : runtime.model;
    const maxTokens = this.normalizeMaxTokens(
      dto.maxTokens ?? runtime.maxTokens,
    );
    const responseLanguage = this.normalizeResponseLanguage(
      dto.responseLanguage ?? runtime.responseLanguage,
    );
    const aiTestMode = dto.aiTestMode ?? runtime.aiTestMode;
    const providedApiKey = this.normalizeOptionalText(dto.apiKey);
    const apiKey = dto.clearApiKey
      ? ''
      : providedApiKey !== null
        ? providedApiKey
        : runtime.apiKey;
    const baseUrl =
      provider === 'openai-compatible'
        ? this.requireNormalizedCompatibleBaseUrl(
            this.normalizeOptionalText(dto.baseUrl) ?? runtime.baseUrl,
          )
        : null;

    this.assertProviderConfig({
      provider,
      model,
      apiKey,
      baseUrl,
    });

    return {
      provider,
      model,
      baseUrl,
      responseLanguage,
      maxTokens,
      aiTestMode,
      apiKey,
      source: runtime.source,
    };
  }

  private async findStoredSettings(): Promise<AiProviderSettings | null> {
    return this.aiProviderSettingsRepository.findOneBy({
      scopeKey: GLOBAL_SETTINGS_SCOPE_KEY,
    });
  }

  private resolveRuntimeConfig(
    stored: AiProviderSettings | null,
  ): AiRuntimeConfig {
    if (!stored || !stored.isEnabled) {
      return this.resolveEnvRuntimeConfig();
    }

    const provider = this.normalizeProvider(stored.provider);
    const envFallback = this.resolveEnvRuntimeConfigByProvider(provider);
    const decryptedKey = this.decryptStoredKey(stored.apiKeyEncrypted);

    return {
      provider,
      model: this.normalizeModelOrFallback(stored.model, envFallback.model),
      apiKey: decryptedKey || envFallback.apiKey,
      baseUrl:
        provider === 'openai-compatible'
          ? (this.normalizeCompatibleBaseUrlOrNull(stored.baseUrl) ??
            envFallback.baseUrl)
          : null,
      responseLanguage: this.normalizeResponseLanguage(
        stored.responseLanguage ?? envFallback.responseLanguage,
      ),
      maxTokens: this.normalizeMaxTokens(
        stored.maxTokens ?? envFallback.maxTokens,
      ),
      aiTestMode: stored.aiTestMode ?? envFallback.aiTestMode,
      source: 'database',
    };
  }

  private resolveEnvRuntimeConfig(): AiRuntimeConfig {
    const provider = this.resolveEnvProvider();
    return this.resolveEnvRuntimeConfigByProvider(provider);
  }

  private resolveEnvRuntimeConfigByProvider(
    provider: AiProviderName,
  ): AiRuntimeConfig {
    const maxTokens = this.normalizeMaxTokens(this.resolveEnvMaxTokens());
    const responseLanguage = this.resolveEnvResponseLanguage();
    const aiTestMode = this.resolveEnvAiTestMode();

    switch (provider) {
      case 'openai':
        return {
          provider,
          apiKey: this.normalizeOptionalText(process.env.OPENAI_API_KEY) ?? '',
          model: this.normalizeModelOrFallback(
            process.env.OPENAI_MODEL,
            OPENAI_DEFAULT_MODEL,
          ),
          baseUrl: null,
          responseLanguage,
          maxTokens,
          aiTestMode,
          source: 'env',
        };
      case 'openrouter':
        return {
          provider,
          apiKey:
            this.normalizeOptionalText(process.env.OPENROUTER_API_KEY) ?? '',
          model: this.normalizeModelOrFallback(
            process.env.OPENROUTER_MODEL,
            OPENROUTER_DEFAULT_MODEL,
          ),
          baseUrl: null,
          responseLanguage,
          maxTokens,
          aiTestMode,
          source: 'env',
        };
      case 'openai-compatible':
        return {
          provider,
          apiKey: this.normalizeOptionalText(process.env.LLM_API_KEY) ?? '',
          model: this.normalizeModelOrFallback(process.env.LLM_MODEL, ''),
          baseUrl:
            this.normalizeCompatibleBaseUrlOrNull(process.env.LLM_BASE_URL) ??
            null,
          responseLanguage,
          maxTokens,
          aiTestMode,
          source: 'env',
        };
      default:
        return {
          provider: 'openai',
          apiKey: this.normalizeOptionalText(process.env.OPENAI_API_KEY) ?? '',
          model: this.normalizeModelOrFallback(
            process.env.OPENAI_MODEL,
            OPENAI_DEFAULT_MODEL,
          ),
          baseUrl: null,
          responseLanguage,
          maxTokens,
          aiTestMode,
          source: 'env',
        };
    }
  }

  private resolveEnvProvider(): AiProviderName {
    const candidate = this.normalizeOptionalText(process.env.LLM_PROVIDER);
    if (!candidate) {
      return 'openai';
    }
    try {
      return this.normalizeProvider(candidate);
    } catch {
      return 'openai';
    }
  }

  private normalizeProvider(value: string): AiProviderName {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'compatible' || normalized === 'custom') {
      return 'openai-compatible';
    }
    if ((AI_PROVIDER_VALUES as readonly string[]).includes(normalized)) {
      return normalized as AiProviderName;
    }
    throw new BadRequestException(
      'Unsupported provider. Use openai, openrouter, or openai-compatible.',
    );
  }

  private normalizeRequiredModel(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('Model is required');
    }
    return normalized.slice(0, 255);
  }

  private normalizeModelOrFallback(
    value: string | undefined | null,
    fallback: string,
  ): string {
    const normalized = this.normalizeOptionalText(value);
    return normalized ? normalized.slice(0, 255) : fallback;
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizeResponseLanguage(value: string | undefined | null): string {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return DEFAULT_AI_RESPONSE_LANGUAGE;
    }
    return normalized.slice(0, 64);
  }

  private normalizeCompatibleBaseUrlOrNull(
    value: string | undefined | null,
  ): string | null {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }
    return this.stripChatCompletionsSuffix(normalized);
  }

  private requireNormalizedCompatibleBaseUrl(
    value: string | undefined | null,
  ): string {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      throw new BadRequestException(
        'Base URL is required for openai-compatible provider',
      );
    }

    const baseUrl = this.stripChatCompletionsSuffix(normalized);
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new BadRequestException('Base URL must be a valid HTTP(S) URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('Base URL must use HTTP or HTTPS');
    }
    if (this.isForbiddenBaseUrlHost(parsed.hostname)) {
      throw new BadRequestException(
        'Base URL host is not allowed for security reasons',
      );
    }

    return baseUrl;
  }

  private stripChatCompletionsSuffix(value: string): string {
    return value.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '');
  }

  private isForbiddenBaseUrlHost(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    if (
      normalized === 'localhost' ||
      normalized.endsWith('.localhost') ||
      normalized === '127.0.0.1' ||
      normalized === '::1'
    ) {
      return false;
    }

    if (normalized === '0.0.0.0' || normalized === '::') {
      return true;
    }

    const ipVersion = isIP(normalized);
    if (ipVersion === 4) {
      const octets = normalized.split('.').map((item) => Number(item));
      const [a, b] = octets;
      if (a === 10) {
        return true;
      }
      if (a === 127) {
        return true;
      }
      if (a === 169 && b === 254) {
        return true;
      }
      if (a === 172 && b >= 16 && b <= 31) {
        return true;
      }
      if (a === 192 && b === 168) {
        return true;
      }
    }

    if (ipVersion === 6) {
      if (
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80')
      ) {
        return true;
      }
    }

    return false;
  }

  private normalizeMaxTokens(value: number): number {
    if (!Number.isFinite(value)) {
      return DEFAULT_AI_MAX_TOKENS;
    }
    const normalized = Math.trunc(value);
    if (normalized < 128) {
      return 128;
    }
    if (normalized > 8000) {
      return 8000;
    }
    return normalized;
  }

  private resolveEnvMaxTokens(): number {
    const parsed = Number(process.env.LLM_MAX_TOKENS);
    return Number.isFinite(parsed) ? parsed : DEFAULT_AI_MAX_TOKENS;
  }

  private resolveEnvResponseLanguage(): string {
    return this.normalizeResponseLanguage(process.env.LLM_RESPONSE_LANGUAGE);
  }

  private resolveEnvAiTestMode(): boolean {
    return this.toBoolean(process.env.AI_TEST_MODE, false);
  }

  private resolveEnvCompatibleBaseUrl(): string | null {
    return this.normalizeCompatibleBaseUrlOrNull(process.env.LLM_BASE_URL);
  }

  private resolveEnvApiKey(provider: AiProviderName): string {
    if (provider === 'openai') {
      return this.normalizeOptionalText(process.env.OPENAI_API_KEY) ?? '';
    }
    if (provider === 'openrouter') {
      return this.normalizeOptionalText(process.env.OPENROUTER_API_KEY) ?? '';
    }
    return this.normalizeOptionalText(process.env.LLM_API_KEY) ?? '';
  }

  private assertProviderConfig(params: {
    provider: AiProviderName;
    model: string;
    apiKey: string;
    baseUrl: string | null;
  }): void {
    if (!params.model.trim()) {
      throw new BadRequestException('Model is required');
    }

    if (
      (params.provider === 'openai' || params.provider === 'openrouter') &&
      !params.apiKey.trim() &&
      !this.resolveEnvApiKey(params.provider)
    ) {
      if (params.provider === 'openai') {
        throw new BadRequestException(
          'OPENAI API key is required to save this provider',
        );
      }
      throw new BadRequestException(
        'OPENROUTER API key is required to save this provider',
      );
    }

    if (
      params.provider === 'openai-compatible' &&
      (!params.baseUrl || !params.baseUrl.trim())
    ) {
      throw new BadRequestException(
        'Base URL is required for openai-compatible provider',
      );
    }
  }

  private decryptStoredKey(encrypted: string | null): string {
    if (!encrypted) {
      return '';
    }
    return this.aiSettingsCryptoService.decrypt(encrypted);
  }

  private toBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value == null) {
      return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return fallback;
  }
}
