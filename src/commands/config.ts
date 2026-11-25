/**
 * config 命令组 — 全局配置（与 API Key 共用 ~/.upkuajing/.env）
 *
 * - show: 查看当前生效的计费模式、来源与 API Key 配置
 * - set-plan-mode <mode>: 写入全局计费模式（plan / balance / auto）
 * - unset-plan-mode: 删除全局计费模式，恢复接口默认（套餐优先）
 */

import { Command } from 'commander';
import { output } from '../output';
import { getEnvFilePath, hasApiKey, readEnvFile, setEnvFileValue } from '../config';
import {
  PLAN_MODE_ENV,
  describePlanMode,
  getPlanModeStatus,
  parsePlanMode,
  type PlanModeSource,
} from '../plan';

const SOURCE_TEXT: Record<PlanModeSource, string> = {
  cli: '命令行 --plan-mode',
  env: '环境变量 UPKUAJING_PLAN_MODE',
  'env-file': '全局配置 ~/.upkuajing/.env',
  default: '接口默认（搜索/海关/地图套餐优先）',
};

export function registerConfigCommands(program: Command): void {
  const cmd = program
    .command('config')
    .description('全局配置（计费模式等，保存在 ~/.upkuajing/.env）');

  // === 查看当前配置 ===
  cmd
    .command('show')
    .description('查看计费模式、生效来源与 API Key 配置')
    .action(() => {
      const status = getPlanModeStatus();
      const inEnv = !!process.env.UPKUAJING_API_KEY;
      const inFile = !!readEnvFile().UPKUAJING_API_KEY;

      output({
        envFile: getEnvFilePath(),
        planMode: status.value === undefined ? null : describePlanMode(status.value),
        planModeSource: status.source,
        planModeSourceText: SOURCE_TEXT[status.source],
        apiKeyConfigured: hasApiKey(),
        apiKeySource: inEnv ? 'env' : inFile ? 'env-file' : null,
      });
    });

  // === 设置全局计费模式 ===
  cmd
    .command('set-plan-mode <mode>')
    .description('设置全局计费模式：plan=套餐，balance=API余额，auto=不传')
    .action((mode: string) => {
      const parsed = parsePlanMode(mode);
      if (parsed === undefined) {
        console.error(`错误：plan-mode 取值无效：${mode}，可用 plan / balance / auto`);
        process.exit(1);
      }

      setEnvFileValue(PLAN_MODE_ENV, describePlanMode(parsed));

      const note =
        process.env[PLAN_MODE_ENV] !== undefined
          ? `环境变量 ${PLAN_MODE_ENV} 已设置，会覆盖该全局配置`
          : undefined;

      output({
        ok: true,
        planMode: describePlanMode(parsed),
        envFile: getEnvFilePath(),
        ...(note ? { note } : {}),
      });
    });

  // === 删除全局计费模式 ===
  cmd
    .command('unset-plan-mode')
    .description('删除全局计费模式，恢复接口默认（搜索/海关/地图套餐优先）')
    .action(() => {
      setEnvFileValue(PLAN_MODE_ENV, null);

      const note =
        process.env[PLAN_MODE_ENV] !== undefined
          ? `环境变量 ${PLAN_MODE_ENV} 仍生效，如需恢复默认请取消该环境变量`
          : undefined;

      output({
        ok: true,
        planMode: null,
        envFile: getEnvFilePath(),
        ...(note ? { note } : {}),
      });
    });
}
