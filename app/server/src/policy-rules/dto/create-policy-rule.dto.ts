import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PolicyRuleSeverity,
  PolicyRuleType,
} from '../entities/policy-rule.entity';

export class CreatePolicyRuleDto {
  @IsEnum(PolicyRuleType)
  type!: PolicyRuleType;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  text!: string;

  @IsEnum(PolicyRuleSeverity)
  severity!: PolicyRuleSeverity;
}
