/**
 * auth 命令组 — 账号管理
 *
 * 对应各 skill 的 scripts/auth.py。
 * - login: 申请新 API key（/agent/auth/create，无需认证）
 * - info: 账户信息（/agent/auth/info）
 * - recharge: 充值（/agent/auth/pay/url）
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { writeApiKey, getEnvFilePath } from '../config';

export function registerAuthCommands(program: Command): void {
  const cmd = program
    .command('auth')
    .description('账号管理（申请 API key、查看账户、充值）');

  // === 申请 API key ===
  cmd
    .command('login')
    .description('申请新的 API 密钥并保存到 ~/.upkuajing/.env')
    .action(async () => {
      const response = await makeRequest('/agent/auth/create', {}, false);

      if (response.code !== 0) {
        handleApiError(response);
      }

      const apiKey = response.data?.apiKey;
      if (!apiKey) {
        console.error('API密钥申请失败：服务器响应格式异常，未返回apiKey。');
        process.exit(1);
      }

      writeApiKey(apiKey);
      console.error(`API密钥申请成功！密钥已保存到：${getEnvFilePath()}`);
      console.error('请妥善保管密钥，请勿泄露给他人。');
      output({ success: true, envFilePath: getEnvFilePath() });
    });

  // === 账户信息 ===
  cmd
    .command('info')
    .description('获取当前账户信息')
    .action(async () => {
      const response = await makeRequest('/agent/auth/info', {});

      if (response.code !== 0) {
        handleApiError(response);
      }

      const data = response.data || {};
      const orgBalance = data.orgBalance ?? 0;
      const apiBalance = data.apiBalance ?? 0;

      output({
        '跨境魔方账号': data.orgPhone || '',
        '跨境魔方账号余额': `${orgBalance}分钱(RMB)`,
        '跨境魔方开放平台账号': data.apiAccount || '',
        '跨境魔方开放平台账号余额': `${apiBalance}分钱(RMB)`,
        fee: coverFeeInfo(response.fee),
      });
    });

  // === 充值 ===
  cmd
    .command('recharge')
    .description('创建充值订单，返回支付地址')
    .action(async () => {
      const response = await makeRequest('/agent/auth/pay/url', {});

      if (response.code !== 0) {
        handleApiError(response);
      }

      output(response);
    });
}
