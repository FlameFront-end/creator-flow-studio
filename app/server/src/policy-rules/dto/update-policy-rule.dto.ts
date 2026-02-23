import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PolicyRuleSeverity,
  PolicyRuleType,
} from '../entities/policy-rule.entity';

export class UpdatePolicyRuleDto {
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
