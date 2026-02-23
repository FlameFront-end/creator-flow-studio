import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiRunLog } from '../ideas/entities/ai-run-log.entity';
import { Project } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, AiRunLog])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
