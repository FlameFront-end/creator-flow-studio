import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { GenerateImageDto } from './dto/generate-image.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ListAiRunLogsQueryDto } from './dto/list-ai-run-logs-query.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import { IdeasService } from './ideas.service';

@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post('generate')
  enqueueIdeasGeneration(@Body() dto: GenerateIdeasDto) {
    return this.ideasService.enqueueIdeasGeneration(dto);
  }

  @Post(':id/script/generate')
  enqueueScriptGeneration(
    @Param('id', new ParseUUIDPipe()) ideaId: string,
    @Body() dto: GenerateScriptDto,
  ) {
    return this.ideasService.enqueueScriptGeneration(ideaId, dto);
  }

  @Post(':id/caption/generate')
  enqueueCaptionGeneration(
    @Param('id', new ParseUUIDPipe()) ideaId: string,
    @Body() dto: GenerateCaptionDto,
  ) {
    return this.ideasService.enqueueCaptionGeneration(ideaId, dto);
  }

  @Post(':id/image-prompt/generate')
  generateImagePrompt(@Param('id', new ParseUUIDPipe()) ideaId: string) {
    return this.ideasService.generateImagePrompt(ideaId);
  }

  @Post(':id/video-prompt/generate')
  generateVideoPrompt(@Param('id', new ParseUUIDPipe()) ideaId: string) {
    return this.ideasService.generateVideoPrompt(ideaId);
  }

  @Post(':id/images/generate')
  enqueueImageGeneration(
    @Param('id', new ParseUUIDPipe()) ideaId: string,
    @Body() dto: GenerateImageDto,
  ) {
    return this.ideasService.enqueueImageGeneration(ideaId, dto);
  }

  @Post(':id/videos/generate')
  enqueueVideoGeneration(
    @Param('id', new ParseUUIDPipe()) ideaId: string,
    @Body() dto: GenerateImageDto,
  ) {
    return this.ideasService.enqueueVideoGeneration(ideaId, dto);
  }

  @Get()
  findAll(@Query() query: ListIdeasQueryDto) {
    return this.ideasService.findAll(query);
  }

  @Get('logs')
  listLogs(@Query() query: ListAiRunLogsQueryDto) {
    return this.ideasService.listLogs(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) ideaId: string) {
    return this.ideasService.findOne(ideaId);
  }

  @Delete()
  clearIdeas(@Query() query: ListIdeasQueryDto) {
    return this.ideasService.clearIdeas(query);
  }

  @Delete('logs')
  clearLogs(@Query() query: ListAiRunLogsQueryDto) {
    return this.ideasService.clearLogs(query);
  }

  @Delete('logs/:id')
  removeLog(@Param('id', new ParseUUIDPipe()) logId: string) {
    return this.ideasService.removeLog(logId);
  }

  @Delete('assets/:id')
  removeAsset(@Param('id', new ParseUUIDPipe()) assetId: string) {
    return this.ideasService.removeAsset(assetId);
  }

  @Delete(':id')
  removeIdea(@Param('id', new ParseUUIDPipe()) ideaId: string) {
    return this.ideasService.removeIdea(ideaId);
  }
}
