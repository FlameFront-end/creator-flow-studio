import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../personas/entities/persona.entity';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyRulesController } from './policy-rules.controller';
import { PolicyRulesService } from './policy-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([PolicyRule, Persona])],
  controllers: [PolicyRulesController],
  providers: [PolicyRulesService],
  exports: [PolicyRulesService],
})
export class PolicyRulesModule {}
