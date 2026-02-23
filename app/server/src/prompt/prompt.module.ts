import { Module } from '@nestjs/common';
import { PolicyRulesModule } from '../policy-rules/policy-rules.module';
import { PromptTemplatesModule } from '../prompt-templates/prompt-templates.module';
import { PersonasModule } from '../personas/personas.module';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';

@Module({
  imports: [PersonasModule, PolicyRulesModule, PromptTemplatesModule],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
