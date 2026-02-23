import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ApiTokenGuard } from './auth/guards/api-token.guard';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { HealthModule } from './health/health.module';
import { IdeasModule } from './ideas/ideas.module';
import { PolicyRulesModule } from './policy-rules/policy-rules.module';
import { PromptModule } from './prompt/prompt.module';
import { PromptTemplatesModule } from './prompt-templates/prompt-templates.module';
import { PersonasModule } from './personas/personas.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [],
      useFactory: () => buildTypeOrmOptions(),
    }),
    HealthModule,
    AuthModule,
    ProjectsModule,
    PersonasModule,
    PolicyRulesModule,
    PromptTemplatesModule,
    PromptModule,
    IdeasModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiTokenGuard,
    },
  ],
})
export class AppModule {}
