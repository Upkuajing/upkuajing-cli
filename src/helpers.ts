/**
 * 命令公共工具函数
 *
 * 从 Python common.py 的 parse_params 翻译，并提取各命令文件中重复的辅助逻辑。
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 解析 JSON 字符串为参数对象。
 *
 * 对应 Python common.py:parse_params。
 * JSON 无效时打印友好错误并退出。
 */
export function parseParams(jsonStr: string): Record<string, any> {
  try {
    const params = JSON.parse(jsonStr);
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
      console.error('错误：参数必须是 JSON 对象');
      process.exit(1);
    }
    return params;
  } catch (e: any) {
    console.error('错误：参数中的 JSON 无效：' + (e.message || e));
    process.exit(1);
  }
}

/**
 * 解析 JSON 字符串为数组。
 *
 * 用于 email/sms send 的 --emails/--phones 参数。
 * JSON 无效时打印友好错误并退出。
 */
export function parseJsonArray(jsonStr: string, fieldName: string): any[] {
  try {
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) {
      console.error(`错误：${fieldName} 必须是 JSON 数组格式`);
      process.exit(1);
    }
    return arr;
  } catch (e: any) {
    console.error(`错误：${fieldName} 的 JSON 无效：` + (e.message || e));
    process.exit(1);
  }
}

/**
 * 构建游标参数，cursor 为空时不加入 params。
 */
export function withCursor(params: Record<string, any>, cursor?: string): Record<string, any> {
  if (cursor) params.cursor = cursor;
  return params;
}

/**
 * 注入 API 必填的默认参数（sort、isExact）。
 *
 * 对应 Python 脚本的默认值注入逻辑--API 要求 sort 和 isExact 必填，
 * 用户未提供时注入 sort=0（匹配度排序）、isExact=false（模糊匹配）。
 */
export function injectSearchParamsDefaults(params: Record<string, any>): Record<string, any> {
  if (params.sort === undefined) params.sort = 0;
  if (params.isExact === undefined) params.isExact = false;
  return params;
}

/**
 * 读取本地 package.json 的版本号。
 *
 * helpers.js 编译后在 dist/，package.json 在包根（上一级）。
 */
export function getLocalVersion(): string {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return pkg.version;
}
