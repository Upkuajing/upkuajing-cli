/**
 * 测试辅助工具 - 真实请求测试
 *
 * 测试服配置从环境变量注入（代码中不含任何测试地址或 API key）：
 * - UPKUAJING_API_BASE_URL：测试服地址
 * - UPKUAJING_API_KEY：测试服 API key
 *
 * 未配置时测试整体 skip，避免本地无配置时误报失败。
 * 运行：UPKUAJING_API_BASE_URL=... UPKUAJING_API_KEY=... npm test
 */

import * as assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

/** 测试服配置 */
export interface TestConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * 读取测试服配置，缺失返回 null。
 * 仅从环境变量读取，代码中不含任何测试地址或 key。
 */
export function getTestConfig(): TestConfig | null {
  const baseUrl = process.env.UPKUAJING_API_BASE_URL;
  const apiKey = process.env.UPKUAJING_API_KEY;
  if (!baseUrl || !apiKey) {
    return null;
  }
  return { baseUrl, apiKey };
}

/**
 * 未配置测试服时返回 skip 原因字符串；已配置返回 false（不 skip）。
 * 用于 describe/it 的 { skip } 选项。
 */
export function skipIfNoConfig(): string | false {
  return getTestConfig()
    ? false
    : '未配置测试服环境变量 UPKUAJING_API_BASE_URL / UPKUAJING_API_KEY';
}

// CLI 入口（编译产物 dist/index.js）
const CLI = path.join(__dirname, '..', 'index.js');

/** 运行 CLI 命令，返回 stdout（非零退出码会抛错） */
export function runCli(args: string[]): string {
  return execFileSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 30_000,
    env: { ...process.env },
  });
}

/** 运行 CLI 命令，返回 stdout/stderr/exitCode（允许非零退出码） */
export function runCliAllowFail(args: string[]): { stdout: string; stderr: string; code: number } {
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

/** 断言 API 成功响应（code=0） */
export function assertSuccess(data: any): void {
  assert.strictEqual(
    data.code,
    0,
    `Expected code=0, got code=${data.code}, msg=${data.msg ?? ''}`,
  );
}

/** 断言响应含 data.list 数组并返回该数组 */
export function assertList(data: any): any[] {
  assert.ok(data.data, '响应应有 data 字段');
  assert.ok(Array.isArray(data.data.list), 'data.list 应为数组');
  return data.data.list;
}
