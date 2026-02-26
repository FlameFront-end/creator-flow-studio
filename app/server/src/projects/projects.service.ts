import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AiRunLog } from '../ideas/entities/ai-run-log.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

const PROJECT_NAME_UNIQUE_INDEX = 'UQ_projects_name_ci';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
  ) {}

  async create(dto: CreateProjectDto): Promise<Project> {
    const normalizedName = dto.name.trim();
    await this.ensureUniqueName(normalizedName);

    const project = this.projectsRepository.create({
      name: normalizedName,
      description: dto.description?.trim() || null,
    });

    return this.saveWithConflictHandling(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOneBy({ id });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();
      await this.ensureUniqueName(normalizedName, id);
      project.name = normalizedName;
    }
    if (dto.description !== undefined) {
      project.description = dto.description.trim() || null;
    }

    return this.saveWithConflictHandling(project);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    await this.logsRepository.delete({ projectId: id });
    await this.projectsRepository.remove(project);
  }

  private async ensureUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const query = this.projectsRepository
      .createQueryBuilder('project')
      .where('LOWER(project.name) = LOWER(:name)', { name });

    if (excludeId) {
      query.andWhere('project.id != :excludeId', { excludeId });
    }

    const duplicateExists = await query.getExists();
    if (duplicateExists) {
      throw new ConflictException('Project name must be unique');
    }
  }

  private async saveWithConflictHandling(project: Project): Promise<Project> {
    try {
      return await this.projectsRepository.save(project);
    } catch (error) {
      if (this.isProjectNameUniqueViolation(error)) {
        throw new ConflictException('Project name must be unique');
      }
      throw error;
    }
  }

  private isProjectNameUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const queryError = error as QueryFailedError & {
      code?: string;
      constraint?: string;
    };
    return (
      queryError.code === '23505' &&
      queryError.constraint === PROJECT_NAME_UNIQUE_INDEX
    );
  }
}
