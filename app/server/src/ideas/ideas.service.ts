import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Persona } from '../personas/entities/persona.entity';
import { Project } from '../projects/entities/project.entity';
import { AiQueueService } from './ai-queue.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ListAiRunLogsQueryDto } from './dto/list-ai-run-logs-query.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import { AiRunLog } from './entities/ai-run-log.entity';
import { Caption } from './entities/caption.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea, IdeaFormat } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import {
  DEFAULT_IDEA_COUNT,
  DEFAULT_IDEA_FORMAT,
} from './ideas.constants';

@Injectable()
export class IdeasService {
  constructor(
    private readonly aiQueueService: AiQueueService,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Script)
    private readonly scriptsRepository: Repository<Script>,
    @InjectRepository(Caption)
    private readonly captionsRepository: Repository<Caption>,
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
  ) {}

  async enqueueIdeasGeneration(dto: GenerateIdeasDto) {
    await Promise.all([
      this.ensureProjectExists(dto.projectId),
      this.ensurePersonaExists(dto.personaId),
    ]);

    const count = dto.count ?? DEFAULT_IDEA_COUNT;
    const format = dto.format ?? (DEFAULT_IDEA_FORMAT as IdeaFormat);
    const job = await this.aiQueueService.enqueueIdeasJob({
      ...dto,
      count,
      format,
    });

    return {
      jobId: String(job.id),
      status: GenerationStatus.QUEUED,
    };
  }

  async enqueueScriptGeneration(ideaId: string, dto: GenerateScriptDto) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const hasCompleted = await this.scriptsRepository.exists({
      where: {
        ideaId,
        status: GenerationStatus.SUCCEEDED,
      },
    });
    if (hasCompleted && !dto.regenerate) {
      throw new ConflictException(
        'Script already generated. Use regenerate=true to run again.',
      );
    }

    const script = await this.scriptsRepository.save(
      this.scriptsRepository.create({
        ideaId,
        status: GenerationStatus.QUEUED,
      }),
    );
    const job = await this.aiQueueService.enqueueScriptJob({
      ideaId,
      scriptId: script.id,
    });

    return {
      jobId: String(job.id),
      scriptId: script.id,
      status: script.status,
    };
  }

  async enqueueCaptionGeneration(ideaId: string, dto: GenerateCaptionDto) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const hasCompleted = await this.captionsRepository.exists({
      where: {
        ideaId,
        status: GenerationStatus.SUCCEEDED,
      },
    });
    if (hasCompleted && !dto.regenerate) {
      throw new ConflictException(
        'Caption already generated. Use regenerate=true to run again.',
      );
    }

    const caption = await this.captionsRepository.save(
      this.captionsRepository.create({
        ideaId,
        status: GenerationStatus.QUEUED,
      }),
    );
    const job = await this.aiQueueService.enqueueCaptionJob({
      ideaId,
      captionId: caption.id,
    });

    return {
      jobId: String(job.id),
      captionId: caption.id,
      status: caption.status,
    };
  }

  async findAll(query: ListIdeasQueryDto) {
    const where = query.projectId ? { projectId: query.projectId } : {};
    const ideas = await this.ideasRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (!ideas.length) {
      return [];
    }

    const ideaIds = ideas.map((idea) => idea.id);
    const [scripts, captions] = await Promise.all([
      this.scriptsRepository.find({
        where: ideaIds.map((id) => ({ ideaId: id })),
        order: { createdAt: 'DESC' },
      }),
      this.captionsRepository.find({
        where: ideaIds.map((id) => ({ ideaId: id })),
        order: { createdAt: 'DESC' },
      }),
    ]);

    const latestScriptsByIdea = new Map<string, Script>();
    for (const script of scripts) {
      if (!latestScriptsByIdea.has(script.ideaId)) {
        latestScriptsByIdea.set(script.ideaId, script);
      }
    }

    const latestCaptionsByIdea = new Map<string, Caption>();
    for (const caption of captions) {
      if (!latestCaptionsByIdea.has(caption.ideaId)) {
        latestCaptionsByIdea.set(caption.ideaId, caption);
      }
    }

    return ideas.map((idea) => ({
      ...idea,
      latestScript: latestScriptsByIdea.get(idea.id) ?? null,
      latestCaption: latestCaptionsByIdea.get(idea.id) ?? null,
    }));
  }

  async findOne(ideaId: string) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const [scripts, captions] = await Promise.all([
      this.scriptsRepository.find({
        where: { ideaId },
        order: { createdAt: 'DESC' },
      }),
      this.captionsRepository.find({
        where: { ideaId },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      ...idea,
      scripts,
      captions,
    };
  }

  async listLogs(query: ListAiRunLogsQueryDto) {
    const limit = query.limit ?? 30;
    const qb = this.logsRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .take(limit);

    if (query.projectId) {
      qb.andWhere('log.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.ideaId) {
      qb.andWhere('log.ideaId = :ideaId', { ideaId: query.ideaId });
    }

    return qb.getMany();
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const exists = await this.projectsRepository.existsBy({ id: projectId });
    if (!exists) {
      throw new NotFoundException('Project not found');
    }
  }

  private async ensurePersonaExists(personaId: string): Promise<void> {
    const exists = await this.personasRepository.existsBy({ id: personaId });
    if (!exists) {
      throw new NotFoundException('Persona not found');
    }
  }
}

