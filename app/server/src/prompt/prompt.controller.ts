import { Body, Controller, Post } from '@nestjs/common';
import { PromptPreviewDto } from './dto/prompt-preview.dto';
import { PromptService } from './prompt.service';

@Controller('prompt')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post('preview')
  preview(@Body() dto: PromptPreviewDto): Promise<{ prompt: string }> {
    return this.promptService.preview(dto);
  }
}
