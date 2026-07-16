/**
 * 配置管理 — 从 Python common.py 的 get_api_key / load_env_file 翻译
 *
 * API key 优先级：环境变量 UPKUAJING_API_KEY → ~/.upkuajing/.env 文件
 * 和现有 Python skill 共用同一份配置。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const API_KEY_ENV = 'UPKUAJING_API_KEY';
const UPKUAJING_DIR = path.join(os.homedir(), '.upkuajing');
const UPKUAJING_ENV_FILE = path.join(UPKUAJING_DIR, '.env');

/**
 * 从 ~/.upkuajing/.env 文件加载环境变量。
 *
 * 对应 Python common.py:load_env_file。
 * 解析 KEY=VALUE 格式，跳过空行和 # 注释。
 */
function loadEnvFile(): Record<string, string> {
  const envVars: Record<string, string> = {};
  if (!fs.existsSync(UPKUAJING_ENV_FILE)) {
    return envVars;
  }
  const content = fs.readFileSync(UPKUAJING_ENV_FILE, 'utf-8');
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
  const envVars = loadEnvFile();
  const fileKey = envVars[API_KEY_ENV];
  if (fileKey) {
    return fileKey;
  }

  console.error(
    `错误：未找到API密钥。\n` +
    `请设置环境变量 ${API_KEY_ENV}，\n` +
    `或在 ${UPKUAJING_ENV_FILE} 文件中添加：${API_KEY_ENV}=your_api_key_here`,
  );
  process.exit(1);
  return ''; // unreachable，满足 TS 返回类型
}

/**
 * 写入 API key 到 ~/.upkuajing/.env 文件。
 * 用于 init 向导申请新 key 后保存。
 */
export function writeApiKey(apiKey: string): void {
  // 确保目录存在
  fs.mkdirSync(UPKUAJING_DIR, { recursive: true });
  fs.writeFileSync(UPKUAJING_ENV_FILE, `${API_KEY_ENV}=${apiKey}\n`, 'utf-8');
}

/**
 * 检查是否已有 API key（不退出）。
 * 用于 init 向导判断是否需要申请新 key。
 */
export function hasApiKey(): boolean {
  if (process.env[API_KEY_ENV]) {
    return true;
  }
  const envVars = loadEnvFile();
  return !!envVars[API_KEY_ENV];
}

/** 返回配置文件路径，供 init 向导使用 */
export function getEnvFilePath(): string {
  return UPKUAJING_ENV_FILE;
}
