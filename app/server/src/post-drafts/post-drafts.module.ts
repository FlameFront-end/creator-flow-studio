import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../ideas/entities/asset.entity';
import { Caption } from '../ideas/entities/caption.entity';
import { Idea } from '../ideas/entities/idea.entity';
import { PolicyRule } from '../policy-rules/entities/policy-rule.entity';
import { ModerationCheck } from './entities/moderation-check.entity';
import { PostDraft } from './entities/post-draft.entity';
import { PostDraftsController } from './post-drafts.controller';
import { PostDraftsService } from './post-drafts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Idea,
      Asset,
      Caption,
      PolicyRule,
      PostDraft,
      ModerationCheck,
    ]),
  ],
  controllers: [PostDraftsController],
  providers: [PostDraftsService],
})
export class PostDraftsModule {}

