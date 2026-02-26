import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { ListPromptTemplatesQueryDto } from './dto/list-prompt-templates-query.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { PromptTemplate } from './entities/prompt-template.entity';
import { Persona } from '../personas/entities/persona.entity';

@Injectable()
export class PromptTemplatesService {
  constructor(
    @InjectRepository(PromptTemplate)
    private readonly promptTemplatesRepository: Repository<PromptTemplate>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
  ) {}

  async create(dto: CreatePromptTemplateDto): Promise<PromptTemplate> {
    if (dto.personaId) {
      await this.ensurePersonaExists(dto.personaId);
    }
    const promptTemplate = this.promptTemplatesRepository.create({
      personaId: dto.personaId ?? null,
      key: dto.key,
      template: dto.template.trim(),
    });

    return this.saveWithConflictHandling(promptTemplate);
  }

  findAll(query: ListPromptTemplatesQueryDto): Promise<PromptTemplate[]> {
    const includeGlobal = query.includeGlobal ?? false;
    const where = query.personaId
      ? includeGlobal
        ? [{ personaId: query.personaId }, { personaId: IsNull() }]
        : { personaId: query.personaId }
      : {};

    return this.promptTemplatesRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<PromptTemplate> {
    const promptTemplate = await this.promptTemplatesRepository.findOneBy({
      id,
    });
    if (!promptTemplate) {
      throw new NotFoundException('Prompt template not found');
    }
    return promptTemplate;
  }

  async findByKey(
    key: PromptTemplate['key'],
    personaId?: string | null,
  ): Promise<PromptTemplate> {
    let promptTemplate: PromptTemplate | null = null;
    if (personaId) {
      promptTemplate = await this.promptTemplatesRepository.findOneBy({
        key,
        personaId,
      });
      if (!promptTemplate) {
        promptTemplate = await this.promptTemplatesRepository.findOneBy({
          key,
          personaId: IsNull(),
        });
      }
    } else {
      promptTemplate = await this.promptTemplatesRepository.findOneBy({ key });
    }
    if (!promptTemplate) {
      throw new NotFoundException(`Prompt template "${key}" not found`);
    }
    return promptTemplate;
  }

  async update(
    id: string,
    dto: UpdatePromptTemplateDto,
  ): Promise<PromptTemplate> {
    const promptTemplate = await this.findOne(id);
    if (dto.personaId !== undefined) {
      await this.ensurePersonaExists(dto.personaId);
      promptTemplate.personaId = dto.personaId;
    }
    if (dto.key !== undefined) {
      promptTemplate.key = dto.key;
    }
    if (dto.template !== undefined) {
      promptTemplate.template = dto.template.trim();
    }
    return this.saveWithConflictHandling(promptTemplate);
  }

  async remove(id: string): Promise<void> {
    const promptTemplate = await this.findOne(id);
    await this.promptTemplatesRepository.remove(promptTemplate);
  }

  private async saveWithConflictHandling(
    promptTemplate: PromptTemplate,
  ): Promise<PromptTemplate> {
    try {
      return await this.promptTemplatesRepository.save(promptTemplate);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Template key must be unique for persona');
      }
      throw error;
    }
  }

  private async ensurePersonaExists(personaId: string): Promise<void> {
    const exists = await this.personasRepository.existsBy({ id: personaId });
    if (!exists) {
      throw new NotFoundException('Persona not found');
    }
  }
}
