/**
 * auth 命令组 — 账号管理
 *
 * 对应各 skill 的 scripts/auth.py。
 * - login: 申请新 API key（/agent/auth/create，无需认证）
 * - info: 账户信息（/agent/auth/info）
 * - recharge: 充值（/agent/auth/pay/url）
 * - plan-quota: 套餐额度用量（/agent/plan/quota）
 * - plan-config: 各套餐档位额度上限（/agent/plan/config，无需认证）
 * - price-info: 接口定价信息（/agent/api/list）
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { writeApiKey, getEnvFilePath } from '../config';
import { normalizePlanWindows, formatPlanTime } from '../plan';

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

      const result: Record<string, any> = {
        '跨境魔方账号': data.orgPhone || '',
        '跨境魔方账号余额': `${orgBalance}分钱(RMB)`,
        '跨境魔方开放平台账号': data.apiAccount || '',
        '跨境魔方开放平台账号余额': `${apiBalance}分钱(RMB)`,
      };

      // 套餐信息：具体字段以服务端返回为准，未返回时明确提示
      const plan = data.plan;
      if (plan && typeof plan === 'object') {
        const available = plan.available;
        result['套餐可用'] =
          available === undefined || available === null
            ? '未知'
            : available === 1 || available === true || available === '1'
              ? '是'
              : '否';
        result['套餐详情'] = plan;
      } else {
        result['套餐'] = '接口未返回套餐信息（可用 up-cli auth plan-quota 查询额度）';
      }

      result.fee = coverFeeInfo(response.fee);
      output(result);
    });

  // === 套餐额度用量 ===
  cmd
    .command('plan-quota')
    .description('查询当前账号的套餐额度用量')
    .action(async () => {
      const response = await makeRequest('/agent/plan/quota', {});

      if (response.code !== 0) {
        handleApiError(response);
      }

      const data = response.data && typeof response.data === 'object' ? response.data : {};
      const available = data.available;
      const windows = normalizePlanWindows(data.windows).map((window: any) => ({
        window: window.window,
        capability: window.capability,
        quotaType: window.quotaType,
        limit: window.limit,
        used: window.used,
        remaining: window.remaining,
        resetsAt: window.resetsAt,
        resetsAtText: formatPlanTime(window.resetsAt) ?? null,
      }));

      const availableText =
        available === undefined || available === null
          ? '套餐状态未知'
          : available === 1 || available === true || available === '1'
            ? '套餐可用'
            : '无可用套餐';

      output({
        available,
        availableText,
        windows,
        guidance:
          '目标窗口 remaining=0 时套餐调用会返回额度不足；' +
          '可改用余额（设置 UPKUAJING_PLAN_MODE=1）或查看 up-cli auth plan-config 升级档位',
        requestId: response.requestId ?? null,
      });
    });

  // === 套餐档位 ===
  cmd
    .command('plan-config')
    .description('查询各套餐档位的额度上限（无需认证）')
    .action(async () => {
      const response = await makeRequest('/agent/plan/config', {}, false);

      if (response.code !== 0) {
        handleApiError(response);
      }

      output(response);
    });

  // === 接口定价 ===
  cmd
    .command('price-info')
    .description('获取开放平台接口定价信息')
    .option('--name <name>', '目标技能/接口名称', 'upkuajing-cli')
    .action(async (opts) => {
      const response = await makeRequest('/agent/api/list', { name: opts.name });

      if (response.code !== 0) {
        handleApiError(response);
      }

      output(response);
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
