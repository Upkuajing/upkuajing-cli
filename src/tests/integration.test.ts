/**
 * 集成测试 — 真实 API 调用
 *
 * 分两类：
 * - 免认证测试：map countries/provinces/cities，无需 API key，不扣费，默认运行
 * - 付费测试：search/depth-company 等需要余额的接口，需设置 UPKUAJING_INTEGRATION=1 才运行
 *
 * 付费测试在调用前/后都会运行 auth info 打印余额，方便追踪扣费。
 *
 * 用法：
 *   npm test                                    # 只跑单元测试 + 免认证集成测试
 *   UPKUAJING_INTEGRATION=1 npm test            # 加上付费集成测试（会消耗余额）
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

const CLI = path.join(__dirname, '..', 'index.js');

/** 运行 CLI 命令，返回 stdout */
function runCli(args: string[]): string {
  return execFileSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 30_000,
    env: { ...process.env },
  });
}

/** 运行 CLI 命令，返回 stdout/stderr/exitCode（允许非零退出码） */
function runCliAllowFail(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', code: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || '',
      code: e.status || 1,
    };
  }
}

/** 从 auth info 输出提取余额（分钱），打印并返回 */
function printBalance(label: string): number {
  const result = runCliAllowFail(['auth', 'info']);
  if (result.code !== 0) {
    console.log(`[${label}] 无法获取余额（auth info 失败）`);
    return -1;
  }
  try {
    const data = JSON.parse(result.stdout);
    const balanceStr = data['跨境魔方开放平台账号余额'] || '';
    const match = balanceStr.match(/(\d+)/);
    const balance = match ? parseInt(match[1], 10) : -1;
    console.log(`[${label}] 账号余额：${balanceStr}`);
    return balance;
  } catch {
    console.log(`[${label}] auth info 返回解析失败`);
    return -1;
  }
}

// 付费测试是否运行
const RUN_PAID = process.env.UPKUAJING_INTEGRATION === '1';

describe('集成测试：免认证接口', () => {
  it('map countries — 返回国家列表', () => {
    const output = runCli(['map', 'countries']);
    const data = JSON.parse(output);
    assert.ok(data.data, '应有 data 字段');
    assert.ok(Array.isArray(data.data.list), 'list 应为数组');
    assert.ok(data.data.list.length > 0, '列表不应为空');
    const first = data.data.list[0];
    assert.ok(first.id, '应有 id');
    assert.ok(first.name, '应有 name');
    assert.ok(first.nameEn, '应有 nameEn');
  });

  it('map provinces — 需要国家ID参数', () => {
    const output = runCli(['map', 'provinces', '--country-id', '1']);
    const data = JSON.parse(output);
    assert.ok(data.data, '应有 data 字段');
    assert.ok(Array.isArray(data.data.list), 'list 应为数组');
  });

  it('map cities — 需要国家ID参数', () => {
    const output = runCli(['map', 'cities', '--country-id', '1']);
    const data = JSON.parse(output);
    assert.ok(data.data, '应有 data 字段');
    assert.ok(Array.isArray(data.data.list), 'list 应为数组');
  });
});

describe('集成测试：付费接口', { skip: !RUN_PAID }, () => {
  it('auth info — 返回账户信息（不扣费）', () => {
    const output = runCli(['auth', 'info']);
    const data = JSON.parse(output);
    assert.ok('跨境魔方开放平台账号' in data, '应有账号字段');
    assert.ok('跨境魔方开放平台账号余额' in data, '应有余额字段');
  });

  it('search company — 搜索公司（付费）', () => {
    const balanceBefore = printBalance('search company 调用前');

    const result = runCliAllowFail([
      'search', 'company', '--params', '{"keywords":["test"]}',
    ]);
    const data = JSON.parse(result.stdout);

    const balanceAfter = printBalance('search company 调用后');

    if (result.code !== 0) {
      assert.ok(data.code !== undefined, 'API 错误应返回 code');
      console.log(`  search company 返回 code=${data.code}, msg=${data.msg}`);
      return;
    }

    assert.ok(data.data, '成功时应有 data');
    console.log(`  search company 成功，返回数据`);

    if (balanceBefore >= 0 && balanceAfter >= 0) {
      console.log(`  本次消耗：${balanceBefore - balanceAfter}分钱(RMB)`);
    }
  });

  it('depth-company employee — 查员工（付费）', () => {
    const balanceBefore = printBalance('depth-company employee 调用前');

    const result = runCliAllowFail([
      'depth-company', 'employee', '--pid', 'TEST_001',
    ]);
    const data = JSON.parse(result.stdout);

    const balanceAfter = printBalance('depth-company employee 调用后');

    assert.ok(data.code !== undefined || data.data !== undefined, '应返回结构化响应');
    if (data.code) {
      console.log(`  depth-company employee 返回 code=${data.code}, msg=${data.msg}`);
    } else {
      console.log(`  depth-company employee 成功，返回数据`);
    }

    if (balanceBefore >= 0 && balanceAfter >= 0) {
      console.log(`  本次消耗：${balanceBefore - balanceAfter}分钱(RMB)`);
    }
  });
});
