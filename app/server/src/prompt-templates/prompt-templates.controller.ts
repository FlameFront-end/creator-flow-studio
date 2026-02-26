import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { ListPromptTemplatesQueryDto } from './dto/list-prompt-templates-query.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { PromptTemplate } from './entities/prompt-template.entity';
import { PromptTemplatesService } from './prompt-templates.service';

@Controller('prompt-templates')
export class PromptTemplatesController {
  constructor(
    private readonly promptTemplatesService: PromptTemplatesService,
  ) {}

  @Post()
  create(@Body() dto: CreatePromptTemplateDto): Promise<PromptTemplate> {
    return this.promptTemplatesService.create(dto);
  }

  @Get()
  findAll(
    @Query() query: ListPromptTemplatesQueryDto,
  ): Promise<PromptTemplate[]> {
    return this.promptTemplatesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PromptTemplate> {
    return this.promptTemplatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptTemplateDto,
  ): Promise<PromptTemplate> {
    return this.promptTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.promptTemplatesService.remove(id);
  }
}
