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
import { CreatePolicyRuleDto } from './dto/create-policy-rule.dto';
import { ListPolicyRulesQueryDto } from './dto/list-policy-rules-query.dto';
import { UpdatePolicyRuleDto } from './dto/update-policy-rule.dto';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyRulesService } from './policy-rules.service';

@Controller('policy-rules')
export class PolicyRulesController {
  constructor(private readonly policyRulesService: PolicyRulesService) {}

  @Post()
  create(@Body() dto: CreatePolicyRuleDto): Promise<PolicyRule> {
    return this.policyRulesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListPolicyRulesQueryDto): Promise<PolicyRule[]> {
    return this.policyRulesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PolicyRule> {
    return this.policyRulesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyRuleDto,
  ): Promise<PolicyRule> {
    return this.policyRulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.policyRulesService.remove(id);
  }
}
