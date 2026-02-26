import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { ListPersonasQueryDto } from './dto/list-personas-query.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { Persona } from './entities/persona.entity';
import { Project } from '../projects/entities/project.entity';

const PERSONA_NAME_UNIQUE_INDEX = 'UQ_personas_project_name_ci';

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async create(dto: CreatePersonaDto): Promise<Persona> {
    await this.ensureProjectExists(dto.projectId);
    const normalizedName = dto.name.trim();
    await this.ensureUniqueName(normalizedName, dto.projectId);

    const persona = this.personasRepository.create({
      projectId: dto.projectId,
      name: normalizedName,
      age: dto.age ?? null,
      archetypeTone: dto.archetypeTone?.trim() || null,
      bio: dto.bio?.trim() || null,
      visualCode: dto.visualCode?.trim() || null,
      voiceCode: dto.voiceCode?.trim() || null,
    });
    return this.saveWithConflictHandling(persona);
  }

  findAll(query: ListPersonasQueryDto): Promise<Persona[]> {
    const where = query.projectId ? { projectId: query.projectId } : {};
    return this.personasRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Persona> {
    const persona = await this.personasRepository.findOneBy({ id });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }
    return persona;
  }

  async update(id: string, dto: UpdatePersonaDto): Promise<Persona> {
    const persona = await this.findOne(id);
    if (dto.projectId !== undefined) {
      await this.ensureProjectExists(dto.projectId);
      persona.projectId = dto.projectId;
    }
    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();
      await this.ensureUniqueName(normalizedName, persona.projectId, id);
      persona.name = normalizedName;
    }
    if (dto.age !== undefined) {
      persona.age = dto.age;
    }
    if (dto.archetypeTone !== undefined) {
      persona.archetypeTone = dto.archetypeTone.trim() || null;
    }
    if (dto.bio !== undefined) {
      persona.bio = dto.bio.trim() || null;
    }
    if (dto.visualCode !== undefined) {
      persona.visualCode = dto.visualCode.trim() || null;
    }
    if (dto.voiceCode !== undefined) {
      persona.voiceCode = dto.voiceCode.trim() || null;
    }

    return this.saveWithConflictHandling(persona);
  }

  async remove(id: string): Promise<void> {
    const persona = await this.findOne(id);
    await this.personasRepository.remove(persona);
  }

  private async ensureUniqueName(
    name: string,
    projectId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const query = this.personasRepository
      .createQueryBuilder('persona')
      .where('LOWER(persona.name) = LOWER(:name)', { name });

    if (projectId) {
      query.andWhere('persona.projectId = :projectId', { projectId });
    } else {
      query.andWhere('persona.projectId IS NULL');
    }

    if (excludeId) {
      query.andWhere('persona.id != :excludeId', { excludeId });
    }

    const duplicateExists = await query.getExists();
    if (duplicateExists) {
      throw new ConflictException('Persona name must be unique');
    }
  }

  private async saveWithConflictHandling(persona: Persona): Promise<Persona> {
    try {
      return await this.personasRepository.save(persona);
    } catch (error) {
      if (this.isPersonaNameUniqueViolation(error)) {
        throw new ConflictException('Persona name must be unique');
      }
      throw error;
    }
  }

  private isPersonaNameUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const queryError = error as QueryFailedError & {
      code?: string;
      constraint?: string;
    };
    return (
      queryError.code === '23505' &&
      queryError.constraint === PERSONA_NAME_UNIQUE_INDEX
    );
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const exists = await this.projectsRepository.existsBy({ id: projectId });
    if (!exists) {
      throw new NotFoundException('Project not found');
    }
  }
}
