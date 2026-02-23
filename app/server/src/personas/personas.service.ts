import { Injectable, NotFoundException } from '@nestjs/common';
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

  create(dto: CreatePersonaDto): Promise<Persona> {
    const persona = this.personasRepository.create({
      name: dto.name.trim(),
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
      persona.name = dto.name.trim();
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
}
