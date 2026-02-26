import { LlmResponseError } from './llm/llm-response.error';
import { AiOperation } from './entities/ai-run-log.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { IdeasWorkerRunner } from './ideas.worker-runner';

const createRuntimeConfig = () => ({
  provider: 'openai' as const,
  model: 'gpt-4o-mini',
  baseUrl: null,
  responseLanguage: 'en',
  maxTokens: 512,
  aiTestMode: false,
  apiKey: 'test-key',
  source: 'env' as const,
});

describe('IdeasWorkerRunner smoke', () => {
  it('handles script generation happy-path', async () => {
    const script = {
      id: 'script-1',
      ideaId: 'idea-1',
      status: GenerationStatus.QUEUED,
    };
    const idea = {
      id: 'idea-1',
      projectId: 'project-1',
      personaId: 'persona-1',
      topic: 'Topic',
      hook: 'Hook',
      format: 'reel',
    };

    const aiSettingsService = {
      getRuntimeConfig: jest.fn().mockResolvedValue(createRuntimeConfig()),
    };
    const llmProvider = {
      name: 'routing',
      generateJson: jest.fn().mockResolvedValue({
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokens: 42,
        requestId: 'req-1',
        data: {
          text: 'Script text',
          shotList: ['Shot 1'],
        },
      }),
    };
    const promptService = {
      preview: jest.fn().mockResolvedValue({ prompt: 'Prompt text' }),
    };
    const responseNormalizer = {
      normalizeIdeas: jest.fn(),
      normalizeScriptText: jest.fn().mockReturnValue('Normalized script'),
      normalizeShotList: jest.fn().mockReturnValue(['Shot 1']),
      normalizeCaptionText: jest.fn(),
      normalizeHashtags: jest.fn(),
      previewUnknown: jest.fn(),
    };
    const ideasRepository = {
      findOne: jest.fn().mockResolvedValue(idea),
    };
    const scriptsRepository = {
      findOne: jest.fn().mockResolvedValue(script),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const logsRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const aiQueueService = {
      enqueueDlqJob: jest.fn().mockResolvedValue(undefined),
    };

    const runner = new IdeasWorkerRunner(
      aiQueueService as never,
      aiSettingsService as never,
      llmProvider as never,
      { name: 'image-provider' } as never,
      { name: 'video-provider' } as never,
      {} as never,
      promptService as never,
      responseNormalizer as never,
      ideasRepository as never,
      scriptsRepository as never,
      {} as never,
      logsRepository as never,
      {} as never,
    );

    await (
      runner as unknown as {
        handleGenerateScript: (job: unknown) => Promise<void>;
      }
    ).handleGenerateScript({
      data: { ideaId: 'idea-1', scriptId: 'script-1' },
    });

    expect(scriptsRepository.update).toHaveBeenNthCalledWith(1, 'script-1', {
      status: GenerationStatus.RUNNING,
      error: null,
    });
    expect(scriptsRepository.update).toHaveBeenNthCalledWith(2, 'script-1', {
      text: 'Normalized script',
      shotList: ['Shot 1'],
      status: GenerationStatus.SUCCEEDED,
      error: null,
    });
    expect(logsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: AiOperation.SCRIPT,
        status: GenerationStatus.SUCCEEDED,
      }),
    );
    expect(logsRepository.save).toHaveBeenCalledTimes(1);
  });

  it('logs failed script generation on LLM error', async () => {
    const script = {
      id: 'script-1',
      ideaId: 'idea-1',
      status: GenerationStatus.QUEUED,
    };
    const idea = {
      id: 'idea-1',
      projectId: 'project-1',
      personaId: 'persona-1',
      topic: 'Topic',
      hook: 'Hook',
      format: 'reel',
    };

    const aiSettingsService = {
      getRuntimeConfig: jest.fn().mockResolvedValue(createRuntimeConfig()),
    };
    const llmProvider = {
      name: 'routing',
      generateJson: jest
        .fn()
        .mockRejectedValue(
          new LlmResponseError(
            'LLM returned invalid JSON payload',
            'invalid_json_payload',
            { rawResponse: '{"broken":true' },
          ),
        ),
    };
    const promptService = {
      preview: jest.fn().mockResolvedValue({ prompt: 'Prompt text' }),
    };
    const responseNormalizer = {
      normalizeIdeas: jest.fn(),
      normalizeScriptText: jest.fn(),
      normalizeShotList: jest.fn(),
      normalizeCaptionText: jest.fn(),
      normalizeHashtags: jest.fn(),
      previewUnknown: jest.fn(),
    };
    const ideasRepository = {
      findOne: jest.fn().mockResolvedValue(idea),
    };
    const scriptsRepository = {
      findOne: jest.fn().mockResolvedValue(script),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const logsRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const aiQueueService = {
      enqueueDlqJob: jest.fn().mockResolvedValue(undefined),
    };

    const runner = new IdeasWorkerRunner(
      aiQueueService as never,
      aiSettingsService as never,
      llmProvider as never,
      { name: 'image-provider' } as never,
      { name: 'video-provider' } as never,
      {} as never,
      promptService as never,
      responseNormalizer as never,
      ideasRepository as never,
      scriptsRepository as never,
      {} as never,
      logsRepository as never,
      {} as never,
    );

    await expect(
      (
        runner as unknown as {
          handleGenerateScript: (job: unknown) => Promise<void>;
        }
      ).handleGenerateScript({
        data: { ideaId: 'idea-1', scriptId: 'script-1' },
      }),
    ).rejects.toThrow('LLM returned invalid JSON payload');

    expect(scriptsRepository.update).toHaveBeenNthCalledWith(1, 'script-1', {
      status: GenerationStatus.RUNNING,
      error: null,
    });
    expect(scriptsRepository.update).toHaveBeenNthCalledWith(
      2,
      'script-1',
      expect.objectContaining({
        status: GenerationStatus.FAILED,
        error: 'LLM returned invalid JSON payload',
      }),
    );
    expect(logsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: AiOperation.SCRIPT,
        status: GenerationStatus.FAILED,
        errorCode: 'invalid_json_payload',
      }),
    );
    expect(logsRepository.save).toHaveBeenCalledTimes(1);
  });
});
