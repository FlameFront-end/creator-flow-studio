import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreatePolicyRuleDto } from './dto/create-policy-rule.dto';
import { ListPolicyRulesQueryDto } from './dto/list-policy-rules-query.dto';
import { UpdatePolicyRuleDto } from './dto/update-policy-rule.dto';
import { PolicyRule } from './entities/policy-rule.entity';
import { Persona } from '../personas/entities/persona.entity';

@Injectable()
export class PolicyRulesService {
  constructor(
    @InjectRepository(PolicyRule)
    private readonly policyRulesRepository: Repository<PolicyRule>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
  ) {}

  async create(dto: CreatePolicyRuleDto): Promise<PolicyRule> {
    if (dto.personaId) {
      await this.ensurePersonaExists(dto.personaId);
    }
    const rule = this.policyRulesRepository.create({
      personaId: dto.personaId ?? null,
      type: dto.type,
      text: dto.text.trim(),
      severity: dto.severity,
    });
    return this.policyRulesRepository.save(rule);
  }

  findAll(query: ListPolicyRulesQueryDto): Promise<PolicyRule[]> {
    const includeGlobal = query.includeGlobal ?? false;
    const where = query.personaId
      ? includeGlobal
        ? [{ personaId: query.personaId }, { personaId: IsNull() }]
        : { personaId: query.personaId }
      : {};

    return this.policyRulesRepository.find({
      where,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<PolicyRule> {
    const rule = await this.policyRulesRepository.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException('Policy rule not found');
    }
    return rule;
  }

  async update(id: string, dto: UpdatePolicyRuleDto): Promise<PolicyRule> {
    const rule = await this.findOne(id);
    if (dto.personaId !== undefined) {
      await this.ensurePersonaExists(dto.personaId);
      rule.personaId = dto.personaId;
    }
    if (dto.type !== undefined) {
      rule.type = dto.type;
    }
    if (dto.text !== undefined) {
      rule.text = dto.text.trim();
    }
    if (dto.severity !== undefined) {
      rule.severity = dto.severity;
    }
    return this.policyRulesRepository.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.policyRulesRepository.remove(rule);
  }

  private async ensurePersonaExists(personaId: string): Promise<void> {
    const exists = await this.personasRepository.existsBy({ id: personaId });
    if (!exists) {
      throw new NotFoundException('Persona not found');
    }
  }
}
