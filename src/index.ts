#!/usr/bin/env node

/**
 * up-cli 入口
 *
 * 跨境魔方（Upkuajing）命令行工具 — 封装 OpenAPI 调用。
 * 面向开发者和 AI Agent。
 */

import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth';
import { registerValidationCommands } from './commands/validation';
import { registerDepthCompanyCommands } from './commands/depth-company';
import { registerLinkedinCommands } from './commands/linkedin';
import { registerCustomsCommands } from './commands/customs';
import { registerSearchCommands } from './commands/search';
import { registerCustomsTradeCommands } from './commands/customs-trade';
import { registerEmailCommands } from './commands/email';
import { registerSmsCommands } from './commands/sms';
import { registerMapCommands } from './commands/map';
import { registerInitCommand } from './init';

const program = new Command();

program
  .name('up-cli')
  .description('Upkuajing (跨境魔方) CLI — 封装 OpenAPI 调用，面向开发者和 AI Agent')
  .version('1.0.0');

// 注册命令组
registerAuthCommands(program);
registerValidationCommands(program);
registerDepthCompanyCommands(program);
registerLinkedinCommands(program);
registerCustomsCommands(program);
registerSearchCommands(program);
registerCustomsTradeCommands(program);
registerEmailCommands(program);
registerSmsCommands(program);
registerMapCommands(program);
registerInitCommand(program);

program.parse();
