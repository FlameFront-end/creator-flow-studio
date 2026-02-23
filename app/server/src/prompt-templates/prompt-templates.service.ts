import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { PromptTemplate } from './entities/prompt-template.entity';

@Injectable()
export class PromptTemplatesService {
  constructor(
    @InjectRepository(PromptTemplate)
    private readonly promptTemplatesRepository: Repository<PromptTemplate>,
  ) {}

  async create(dto: CreatePromptTemplateDto): Promise<PromptTemplate> {
    const promptTemplate = this.promptTemplatesRepository.create({
      key: dto.key,
      template: dto.template.trim(),
    });

    return this.saveWithConflictHandling(promptTemplate);
  }

  findAll(): Promise<PromptTemplate[]> {
    return this.promptTemplatesRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<PromptTemplate> {
    const promptTemplate = await this.promptTemplatesRepository.findOneBy({ id });
    if (!promptTemplate) {
      throw new NotFoundException('Prompt template not found');
    }
    return promptTemplate;
  }

  async findByKey(key: PromptTemplate['key']): Promise<PromptTemplate> {
    const promptTemplate = await this.promptTemplatesRepository.findOneBy({ key });
    if (!promptTemplate) {
      throw new NotFoundException(`Prompt template "${key}" not found`);
    }
    return promptTemplate;
  }

  async update(id: string, dto: UpdatePromptTemplateDto): Promise<PromptTemplate> {
    const promptTemplate = await this.findOne(id);
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
        throw new ConflictException('Template key must be unique');
      }
      throw error;
    }
  }
}
