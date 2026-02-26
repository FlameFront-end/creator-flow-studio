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

export class UpdatePolicyRuleDto {
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsEnum(PolicyRuleType)
  type?: PolicyRuleType;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsEnum(PolicyRuleSeverity)
  severity?: PolicyRuleSeverity;
}
