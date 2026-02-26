import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PolicyRuleSeverity,
  PolicyRuleType,
} from '../entities/policy-rule.entity';

export class CreatePolicyRuleDto {
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsEnum(PolicyRuleType)
  type!: PolicyRuleType;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  text!: string;

  @IsEnum(PolicyRuleSeverity)
  severity!: PolicyRuleSeverity;
}
