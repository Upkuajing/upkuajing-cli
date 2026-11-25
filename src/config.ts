/**
 * 配置管理 — 从 Python common.py 的 get_api_key / load_env_file 翻译
 *
 * 配置文件 ~/.upkuajing/.env 与现有 Python skill 共用，保存：
 * - UPKUAJING_API_KEY：API 密钥（环境变量优先）
 * - UPKUAJING_PLAN_MODE：全局计费模式（plan / balance / auto）
 *
 * 路径惰性计算，便于测试通过 HOME 隔离。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const API_KEY_ENV = 'UPKUAJING_API_KEY';

/** 配置目录（惰性计算，测试可覆盖 HOME）。 */
function upkuajingDir(): string {
  return path.join(os.homedir(), '.upkuajing');
}

/** 配置文件路径。 */
function envFilePath(): string {
  return path.join(upkuajingDir(), '.env');
}

/**
 * 从 ~/.upkuajing/.env 文件加载变量。
 *
 * 对应 Python common.py:load_env_file。
 * 解析 KEY=VALUE 格式，跳过空行和 # 注释。
 */
export function readEnvFile(): Record<string, string> {
  const envVars: Record<string, string> = {};
  const file = envFilePath();
  if (!fs.existsSync(file)) {
    return envVars;
  }
  const content = fs.readFileSync(file, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      envVars[key] = value;
    }
  }
  return envVars;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 设置或删除配置文件中的某个变量。
 *
 * 只改动目标行，保留文件中的其他变量和注释；
 * 文件权限固定为 0600，避免密钥被同机其他用户读取。
 *
 * @param key 变量名
 * @param value 新值；传 null 表示删除该变量
 */
export function setEnvFileValue(key: string, value: string | null): void {
  const file = envFilePath();
  // 删除不存在的配置时不要凭空创建配置文件
  if (value === null && !fs.existsSync(file)) {
    return;
  }

  fs.mkdirSync(upkuajingDir(), { recursive: true });
  const lines: string[] = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf-8').split('\n')
    : [];

  const pattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);
  const kept: string[] = [];
  let written = false;

  for (const line of lines) {
    if (pattern.test(line)) {
      if (!written && value !== null) {
        kept.push(`${key}=${value}`);
        written = true;
      }
      continue;
    }
    kept.push(line);
  }

  while (kept.length > 0 && kept[kept.length - 1].trim() === '') {
    kept.pop();
  }
  if (value !== null && !written) {
    kept.push(`${key}=${value}`);
  }

  fs.writeFileSync(file, kept.length > 0 ? kept.join('\n') + '\n' : '', {
    encoding: 'utf-8',
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

/**
 * 获取 API 密钥，优先从环境变量，其次从 ~/.upkuajing/.env。
 *
 * 对应 Python common.py:get_api_key。
 * 未找到时打印错误到 stderr 并 process.exit(1)。
 */
export function getApiKey(): string {
  // 优先从环境变量获取
  const apiKey = process.env[API_KEY_ENV];
  if (apiKey) {
    return apiKey;
  }

  // 从 ~/.upkuajing/.env 读取
  const fileKey = readEnvFile()[API_KEY_ENV];
  if (fileKey) {
    return fileKey;
  }

  console.error(
    `错误：未找到API密钥。\n` +
    `请设置环境变量 ${API_KEY_ENV}，\n` +
    `或在 ${envFilePath()} 文件中添加：${API_KEY_ENV}=your_api_key_here`,
  );
  process.exit(1);
  return ''; // unreachable，满足 TS 返回类型
}

/**
 * 写入 API key 到 ~/.upkuajing/.env 文件。
 *
 * 只更新 UPKUAJING_API_KEY 一行，保留同文件中的其他配置（如全局计费模式）。
 */
export function writeApiKey(apiKey: string): void {
  setEnvFileValue(API_KEY_ENV, apiKey);
}

/**
 * 检查是否已有 API key（不退出）。
 * 用于 init 向导判断是否需要申请新 key。
 */
export function hasApiKey(): boolean {
  if (process.env[API_KEY_ENV]) {
    return true;
  }
  return !!readEnvFile()[API_KEY_ENV];
}

/** 返回配置文件路径，供 init 向导与 config 命令使用 */
export function getEnvFilePath(): string {
  return envFilePath();
}
