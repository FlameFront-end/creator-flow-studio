import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePolicyRuleDto } from './dto/create-policy-rule.dto';
import { UpdatePolicyRuleDto } from './dto/update-policy-rule.dto';
import { PolicyRule } from './entities/policy-rule.entity';

@Injectable()
export class PolicyRulesService {
  constructor(
    @InjectRepository(PolicyRule)
    private readonly policyRulesRepository: Repository<PolicyRule>,
  ) {}

  create(dto: CreatePolicyRuleDto): Promise<PolicyRule> {
    const rule = this.policyRulesRepository.create({
      type: dto.type,
      text: dto.text.trim(),
      severity: dto.severity,
    });
    return this.policyRulesRepository.save(rule);
  }

  findAll(): Promise<PolicyRule[]> {
    return this.policyRulesRepository.find({
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
}
