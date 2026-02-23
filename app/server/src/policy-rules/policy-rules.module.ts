import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyRulesController } from './policy-rules.controller';
import { PolicyRulesService } from './policy-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([PolicyRule])],
  controllers: [PolicyRulesController],
  providers: [PolicyRulesService],
  exports: [PolicyRulesService],
})
export class PolicyRulesModule {}
