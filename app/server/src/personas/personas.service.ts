import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { Persona } from './entities/persona.entity';

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
  ) {}

  async create(dto: CreatePersonaDto): Promise<Persona> {
    const normalizedName = dto.name.trim();
    await this.ensureUniqueName(normalizedName);

    const persona = this.personasRepository.create({
      name: normalizedName,
      age: dto.age ?? null,
      archetypeTone: dto.archetypeTone?.trim() || null,
      bio: dto.bio?.trim() || null,
      visualCode: dto.visualCode?.trim() || null,
      voiceCode: dto.voiceCode?.trim() || null,
    });
    return this.personasRepository.save(persona);
  }

  findAll(): Promise<Persona[]> {
    return this.personasRepository.find({
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
    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();
      await this.ensureUniqueName(normalizedName, id);
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

    return this.personasRepository.save(persona);
  }

  async remove(id: string): Promise<void> {
    const persona = await this.findOne(id);
    await this.personasRepository.remove(persona);
  }

  private async ensureUniqueName(name: string, excludeId?: string): Promise<void> {
    const query = this.personasRepository
      .createQueryBuilder('persona')
      .where('LOWER(persona.name) = LOWER(:name)', { name });

    if (excludeId) {
      query.andWhere('persona.id != :excludeId', { excludeId });
    }

    const duplicateExists = await query.getExists();
    if (duplicateExists) {
      throw new ConflictException('Persona name must be unique');
    }
  }
}
