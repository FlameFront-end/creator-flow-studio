import { IdeasService } from './ideas.service';
import { GenerationStatus } from './entities/generation-status.enum';
import { IdeaFormat } from './entities/idea.entity';
import { DEFAULT_IDEA_COUNT, DEFAULT_IDEA_FORMAT } from './ideas.constants';

describe('IdeasService smoke', () => {
  it('enqueues ideas job with defaults', async () => {
    const aiQueueService = {
      enqueueIdeasJob: jest.fn().mockResolvedValue({ id: 'job-42' }),
    };
    const projectsRepository = {
      existsBy: jest.fn().mockResolvedValue(true),
    };
    const personasRepository = {
      existsBy: jest.fn().mockResolvedValue(true),
    };

    const service = new IdeasService(
      aiQueueService as never,
      {} as never,
      {} as never,
      projectsRepository as never,
      personasRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.enqueueIdeasGeneration({
      projectId: '11111111-1111-1111-1111-111111111111',
      personaId: '22222222-2222-2222-2222-222222222222',
      topic: 'AI content ideas',
    });

    expect(projectsRepository.existsBy).toHaveBeenCalledWith({
      id: '11111111-1111-1111-1111-111111111111',
    });
    expect(personasRepository.existsBy).toHaveBeenCalledWith({
      id: '22222222-2222-2222-2222-222222222222',
    });
    expect(aiQueueService.enqueueIdeasJob).toHaveBeenCalledWith({
      projectId: '11111111-1111-1111-1111-111111111111',
      personaId: '22222222-2222-2222-2222-222222222222',
      topic: 'AI content ideas',
      count: DEFAULT_IDEA_COUNT,
      format: DEFAULT_IDEA_FORMAT as IdeaFormat,
    });
    expect(result).toEqual({
      jobId: 'job-42',
      status: GenerationStatus.QUEUED,
    });
  });
});
