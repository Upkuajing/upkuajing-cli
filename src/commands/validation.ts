/**
 * validation 命令组 — 联系方式验证（合并 4 个 skill）
 *
 * - domain: 域名验证（/agent/validation/domain）
 * - email: 邮箱验证（/agent/validation/email）
 * - phone: 电话验证（/agent/validation/phone）
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';

export function registerValidationCommands(program: Command): void {
  const cmd = program
    .command('validation')
    .description('联系方式验证（域名、邮箱、电话）');

  // === 域名验证 ===
  cmd
    .command('domain')
    .description('验证域名可用性和 DNS 配置')
    .requiredOption('--domains <domains...>', '要验证的域名列表（空格分隔）')
    .action(async (opts) => {
      const response = await makeRequest('/agent/validation/domain', { domains: opts.domains });

      if (response.code !== 0) {
        handleApiError(response);
      }

      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 邮箱验证 ===
  cmd
    .command('email')
    .description('验证邮箱地址格式、域名和可送达性')
    .requiredOption('--emails <emails...>', '要验证的邮箱地址列表（空格分隔）')
    .action(async (opts) => {
      const response = await makeRequest('/agent/validation/email', { emails: opts.emails });

      if (response.code !== 0) {
        handleApiError(response);
      }

      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 电话验证 ===
  cmd
    .command('phone')
    .description('验证电话号码格式和有效性')
    .requiredOption('--phones <phones...>', '要验证的电话号码列表（空格分隔）')
    .action(async (opts) => {
      const response = await makeRequest('/agent/validation/phone', { phones: opts.phones });

      if (response.code !== 0) {
        handleApiError(response);
      }

      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });
}
