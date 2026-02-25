import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApprovePostDraftDto } from './dto/approve-post-draft.dto';
import { CreatePostDraftFromIdeaDto } from './dto/create-post-draft-from-idea.dto';
import { PostDraftsService } from './post-drafts.service';

@Controller('post-drafts')
export class PostDraftsController {
  constructor(private readonly postDraftsService: PostDraftsService) {}

  @Post('from-idea/:ideaId')
  createFromIdea(
    @Param('ideaId', ParseUUIDPipe) ideaId: string,
    @Body() dto: CreatePostDraftFromIdeaDto,
  ) {
    return this.postDraftsService.createFromIdea(ideaId, dto);
  }

  @Get('by-idea/:ideaId/latest')
  findLatestByIdea(@Param('ideaId', ParseUUIDPipe) ideaId: string) {
    return this.postDraftsService.findLatestByIdea(ideaId);
  }

  @Post(':id/moderate')
  moderate(@Param('id', ParseUUIDPipe) postDraftId: string) {
    return this.postDraftsService.moderate(postDraftId);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) postDraftId: string,
    @Body() dto: ApprovePostDraftDto,
  ) {
    return this.postDraftsService.approve(postDraftId, dto);
  }

  @Post(':id/unapprove')
  unapprove(@Param('id', ParseUUIDPipe) postDraftId: string) {
    return this.postDraftsService.unapprove(postDraftId);
  }

  @Post(':id/publish/mark')
  markPublished(@Param('id', ParseUUIDPipe) postDraftId: string) {
    return this.postDraftsService.markPublished(postDraftId);
  }

  @Get(':id/export')
  export(@Param('id', ParseUUIDPipe) postDraftId: string) {
    return this.postDraftsService.export(postDraftId);
  }
}
