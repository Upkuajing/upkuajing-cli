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
import { registerConfigCommands } from './commands/config';
import { registerInitCommand } from './init';
import { registerUpdateCommand } from './commands/update';
import { getLocalVersion } from './helpers';
import { parsePlanMode, setPlanModeOverride } from './plan';

/**
 * 提取 --plan-mode 并设置本次调用的计费模式。
 *
 * Commander 的全局选项只识别子命令之前的参数；这里统一预扫描，
 * 让 `up-cli search company ... --plan-mode balance` 与
 * `up-cli --plan-mode balance search company ...` 都能生效。
 */
function extractPlanMode(args: string[]): { args: string[]; planMode?: number } {
  const rest: string[] = [];
  let planMode: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      rest.push(...args.slice(i));
      break;
    }
    if (arg === '--plan-mode' || arg.startsWith('--plan-mode=')) {
      const value = arg === '--plan-mode' ? args[++i] : arg.slice('--plan-mode='.length);
      const parsed = parsePlanMode(value);
      if (value === undefined || parsed === undefined) {
        console.error(
          `错误：--plan-mode 取值无效${value === undefined ? '' : '：' + value}，可用 plan / balance / auto`,
        );
        process.exit(1);
      }
      planMode = parsed;
      continue;
    }
    rest.push(arg);
  }

  return { args: rest, planMode };
}

const { args: cliArgs, planMode } = extractPlanMode(process.argv.slice(2));
setPlanModeOverride(planMode);

const program = new Command();

program
  .name('up-cli')
  .description('Upkuajing (跨境魔方) CLI — 封装 OpenAPI 调用，面向开发者和 AI Agent')
  .version(getLocalVersion())
  .option('--plan-mode <mode>', '本次调用的计费模式：plan=套餐（默认）、balance=API余额、auto=不传');

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
registerConfigCommands(program);
registerInitCommand(program);
registerUpdateCommand(program);

program.parse(cliArgs, { from: 'user' });
