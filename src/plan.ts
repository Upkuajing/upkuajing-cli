/**
 * 套餐计费（planMode）与余额降级 — 从 Python skill 的 common.py 翻译
 *
 * 契约与 references/plan-billing.md 一致：
 * - 支持套餐的接口（/agent/search/**、/agent/customs/**、/agent/map/**）默认传 planMode=2
 * - 套餐不可用时在业务执行前停止，stdout 输出 `PLAN_UNAVAILABLE {JSON}`，退出码 3
 * - 绝不自动降级为余额：是否消耗余额必须由用户确认后，用
 *   `--plan-mode balance` / `UPKUAJING_PLAN_MODE=1` / `config set-plan-mode balance` 重跑
 */

import * as fs from 'fs';
import { readEnvFile } from './config';

// 套餐计费配置
export const PLAN_MODE_ENV = 'UPKUAJING_PLAN_MODE';
export const IDEMPOTENCY_KEY_ENV = 'UPKUAJING_IDEMPOTENCY_KEY';
export const PLAN_MODE_BALANCE = 1; // 余额计费
export const PLAN_MODE_PLAN = 2; // 套餐计费
export const EXIT_PLAN_UNAVAILABLE = 3; // 套餐不可用，需用户确认是否改用余额

// 支持套餐计费的接口前缀
const PLAN_SUPPORTED_PREFIXES = ['/agent/search/', '/agent/customs/', '/agent/map/'];

// 本次进程的命令行覆盖（--plan-mode），优先级最高
let cliPlanModeOverride: number | undefined;

/** 设置本次调用的命令行计费模式覆盖（对应 --plan-mode）。 */
export function setPlanModeOverride(mode: number | undefined): void {
  cliPlanModeOverride = mode;
}

/** 读取当前命令行覆盖值，仅用于诊断与测试。 */
export function getPlanModeOverride(): number | undefined {
  return cliPlanModeOverride;
}

// 套餐相关错误码
export const PLAN_ERROR_CODE = {
  NOT_SUPPORTED: 1003, // 接口不支持套餐计费
  NOT_AVAILABLE: 1004, // 无有效套餐
  QUOTA_EXHAUSTED: 1005, // 套餐额度已用完
} as const;

/** 判断接口是否支持套餐计费。 */
export function isPlanSupported(endpoint: string): boolean {
  return PLAN_SUPPORTED_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

/**
 * 解析 planMode 取值。
 *
 * @returns 1=余额计费，2=套餐计费，0=显式不传，undefined=未设置或非法值
 */
export function parsePlanMode(value: unknown): number | undefined {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value === 0 || value === PLAN_MODE_BALANCE || value === PLAN_MODE_PLAN
      ? value
      : undefined;
  }
  const text = String(value).trim().toLowerCase();
  if (text === '0' || text === '' || text === 'off' || text === 'none' || text === 'auto') {
    return 0;
  }
  if (text === String(PLAN_MODE_BALANCE) || text === 'balance') {
    return PLAN_MODE_BALANCE;
  }
  if (text === String(PLAN_MODE_PLAN) || text === 'plan') {
    return PLAN_MODE_PLAN;
  }
  return undefined;
}

/** 计费模式取值的来源。 */
export type PlanModeSource = 'cli' | 'env' | 'env-file' | 'default';

/** 当前生效的计费模式及其来源。 */
export interface PlanModeStatus {
  value: number | undefined;
  source: PlanModeSource;
}

/**
 * 读取全局/本次的计费模式设置（不含请求参数与接口默认值）。
 *
 * 优先级：命令行 --plan-mode > 环境变量 > ~/.upkuajing/.env 全局配置。
 * env-file 这一层与 API Key 同文件，配一次对所有 up-cli 调用生效。
 */
export function getPlanModeStatus(): PlanModeStatus {
  if (cliPlanModeOverride !== undefined) {
    return { value: cliPlanModeOverride, source: 'cli' };
  }

  const envMode = parsePlanMode(process.env[PLAN_MODE_ENV]);
  if (envMode !== undefined) {
    return { value: envMode, source: 'env' };
  }

  const fileMode = parsePlanMode(readEnvFile()[PLAN_MODE_ENV]);
  if (fileMode !== undefined) {
    return { value: fileMode, source: 'env-file' };
  }

  return { value: undefined, source: 'default' };
}

/** 把 planMode 数值转成配置里使用的文字：plan / balance / auto / default。 */
export function describePlanMode(mode: number | undefined): string {
  if (mode === PLAN_MODE_PLAN) {
    return 'plan';
  }
  if (mode === PLAN_MODE_BALANCE) {
    return 'balance';
  }
  if (mode === 0) {
    return 'auto';
  }
  return 'default';
}

/**
 * 决定本次请求的 planMode 取值。
 *
 * 优先级：--plan-mode > 环境变量 > 全局配置(~/.upkuajing/.env)
 *        > 请求参数中的 planMode > 接口默认值。
 * 全局设置优先于历史参数：续跑分页任务时会复用历史参数，
 * 必须保证用户「改用余额」的选择不会被历史 planMode=2 覆盖。
 */
export function resolvePlanMode(endpoint: string, params: Record<string, any>): number | undefined {
  const status = getPlanModeStatus();
  if (status.source !== 'default') {
    return status.value;
  }

  const paramMode = params && typeof params === 'object'
    ? parsePlanMode(params.planMode)
    : undefined;
  if (paramMode !== undefined) {
    return paramMode;
  }

  return isPlanSupported(endpoint) ? PLAN_MODE_PLAN : undefined;
}

/** 本次请求实际生效的 planMode 与注入后的参数。 */
export interface PlanInjection {
  params: Record<string, any>;
  planMode?: number;
}

/**
 * 复制入参并注入 planMode。
 *
 * 不修改调用方对象：分页类脚本会把 params 复用到后续请求，
 * 本次计费模式不能写回历史参数。
 */
export function withPlanMode(endpoint: string, params: Record<string, any>): PlanInjection {
  const requestParams: Record<string, any> = { ...params };
  let planMode = resolvePlanMode(endpoint, requestParams);
  const callerSpecified = Object.prototype.hasOwnProperty.call(params, 'planMode');

  delete requestParams.planMode;

  if (planMode) {
    if (isPlanSupported(endpoint)) {
      requestParams.planMode = planMode;
    } else {
      // 仅当调用方显式传了 planMode 才提示；
      // 会话级环境变量对不支持套餐的接口静默生效为「不传」
      if (callerSpecified) {
        console.error(`[提示] 接口 ${endpoint} 不支持套餐计费，已忽略 planMode=${planMode}`);
      }
      planMode = undefined;
    }
  }

  return { params: requestParams, planMode };
}

/** 把 resetsAt 统一成秒级时间戳（兼容秒与毫秒）。 */
export function toTimestamp(value: unknown): number | undefined {
  const number = Number.parseFloat(String(value));
  if (!Number.isFinite(number)) {
    return undefined;
  }
  const seconds = Math.trunc(number);
  return seconds > 1e12 ? Math.floor(seconds / 1000) : seconds;
}

/** 把套餐相关时间戳（秒/毫秒）格式化为本地时间字符串。 */
export function formatPlanTime(value: unknown): string | undefined {
  const timestamp = toTimestamp(value);
  if (timestamp === undefined) {
    return undefined;
  }
  const date = new Date(timestamp * 1000);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * 把套餐额度窗口统一成数组。
 *
 * 服务端在不同接口分别返回列表与 {窗口名: 窗口信息} 两种形态。
 */
export function normalizePlanWindows(windows: any): any[] {
  if (Array.isArray(windows)) {
    return windows
      .filter((window) => window && typeof window === 'object')
      .map((window) => ({ ...window }));
  }
  if (windows && typeof windows === 'object') {
    return Object.entries(windows).map(([name, window]) => ({
      window: name,
      ...(window && typeof window === 'object' ? window : {}),
    }));
  }
  return [];
}

/** 把秒数转成便于阅读的中文时长。 */
export function formatDuration(seconds: unknown): string | undefined {
  const number = Number(seconds);
  if (!Number.isFinite(number)) {
    return undefined;
  }
  const value = Math.trunc(number);
  if (value <= 0) {
    return undefined;
  }
  if (value < 60) {
    return `约 ${value} 秒`;
  }
  if (value < 3600) {
    return `约 ${Math.round(value / 60)} 分钟`;
  }
  if (value < 86400) {
    return `约 ${Math.round((value / 3600) * 10) / 10} 小时`;
  }
  return `约 ${Math.round((value / 86400) * 10) / 10} 天`;
}

/** 生成请求参数摘要，剔除游标等无意义的超长字段。 */
function summarizeParams(params: Record<string, any>, limit: number = 300): string {
  if (!params || typeof params !== 'object') {
    return '';
  }
  const summary: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'cursor' || key === 'pitId' || key === 'planMode') {
      continue;
    }
    summary[key] = value;
  }
  const text = JSON.stringify(summary);
  return text.length <= limit ? text : text.slice(0, limit) + '...';
}

/** 套餐不可用的结构化信号。 */
export interface PlanUnavailablePayload {
  status: 'plan_unavailable';
  reason: 'no_plan' | 'quota_exhausted';
  reasonText: string;
  httpStatus: number;
  code: number | null;
  endpoint: string;
  requestId: any;
  retryAfterSeconds: number | null;
  resumeAt: string | null;
  exhaustedWindows: any[];
  serverHint: any;
  paramsSummary: string;
  billingMode: 'PLAN';
  nextActions: string[];
  retryWith: string;
  askUser: string;
}

/**
 * 识别「套餐不可用」，生成给调用方的确认信息。
 *
 * 只在本次请求确实走了套餐（planMode=2）时生效，
 * 避免把普通限流误判为额度不足。
 */
export function buildPlanUnavailable(
  endpoint: string,
  params: Record<string, any>,
  planMode: number | undefined,
  httpStatus: number,
  data: any,
  retryAfterHeader?: string | null,
): PlanUnavailablePayload | null {
  if (planMode !== PLAN_MODE_PLAN) {
    return null;
  }

  const code = data?.code;
  const body = data?.data && typeof data.data === 'object' ? data.data : {};
  const windows = normalizePlanWindows(body.windows);
  const exhausted = windows.filter((window) => window.remaining === 0);
  const exhaustedWindows = exhausted.length > 0 ? exhausted : windows;

  // 响应体优先；缺失时回退到 Retry-After 响应头
  let retryAfter: any = body.retryAfter;
  if (retryAfter === undefined || retryAfter === null) {
    retryAfter = retryAfterHeader;
  }
  if (typeof retryAfter === 'string' && /^\d+$/.test(retryAfter.trim())) {
    retryAfter = Number.parseInt(retryAfter.trim(), 10);
  }

  let reason: 'no_plan' | 'quota_exhausted';
  let reasonText: string;
  if (code === PLAN_ERROR_CODE.NOT_AVAILABLE) {
    reason = 'no_plan';
    reasonText = '当前账号无有效套餐';
  } else if (
    code === PLAN_ERROR_CODE.QUOTA_EXHAUSTED ||
    (httpStatus === 429 && (windows.length > 0 || (retryAfter !== undefined && retryAfter !== null)))
  ) {
    reason = 'quota_exhausted';
    reasonText = '套餐额度已用完';
  } else {
    return null;
  }

  const resetTimestamps = exhaustedWindows
    .map((window) => toTimestamp(window.resetsAt))
    .filter((timestamp): timestamp is number => typeof timestamp === 'number');

  // retryAfter 是服务端给出的「预计恢复时间」，优先使用；没有时按窗口 resetsAt 推算
  let duration = formatDuration(retryAfter);
  let resumeAt: string | undefined;
  if (duration) {
    const seconds = toTimestamp(retryAfter);
    resumeAt = seconds === undefined
      ? undefined
      : formatPlanTime(Math.floor(Date.now() / 1000) + seconds);
  } else if (resetTimestamps.length > 0) {
    const earliest = Math.min(...resetTimestamps);
    duration = formatDuration(earliest - Math.floor(Date.now() / 1000));
    resumeAt = formatPlanTime(earliest);
  }

  const recovery = [
    duration ? `预计${duration}后恢复` : '',
    resumeAt ? `恢复时间约 ${resumeAt}` : '',
  ].filter(Boolean).join('，');
  const askUser =
    `${reasonText}${recovery ? '，' + recovery : ''}。` +
    '是否改用API余额继续本次调用？改用余额将按接口定价扣费，' +
    '可用 up-cli auth price-info 查询单价。';

  return {
    status: 'plan_unavailable',
    reason,
    reasonText,
    httpStatus,
    code: code ?? null,
    endpoint,
    requestId: data?.requestId ?? null,
    retryAfterSeconds: typeof retryAfter === 'number' ? retryAfter : null,
    resumeAt: resumeAt ?? null,
    exhaustedWindows,
    serverHint: body.hint ?? null,
    paramsSummary: summarizeParams(params),
    billingMode: 'PLAN',
    nextActions: ['use_balance', 'retry_later', 'upgrade_plan'],
    retryWith: `${PLAN_MODE_ENV}=${PLAN_MODE_BALANCE} <同一条命令>`,
    askUser,
  };
}

/**
 * 输出套餐不可用的结构化确认信息并退出（退出码 3）。
 *
 * 这里只输出信号，绝不自动改传 planMode=1：
 * 是否消耗余额必须由用户明确确认。
 */
export function emitPlanUnavailable(payload: PlanUnavailablePayload): never {
  // 用同步写保证退出前信号完整落到 stdout/stderr
  fs.writeSync(1, 'PLAN_UNAVAILABLE ' + JSON.stringify(payload) + '\n');
  fs.writeSync(2, `套餐不可用：${payload.askUser}\n`);
  if (payload.requestId) {
    fs.writeSync(2, `requestId：${payload.requestId}\n`);
  }
  process.exit(EXIT_PLAN_UNAVAILABLE);
}

/** 把响应中的 usage 转成一句话套餐消耗说明。 */
export function formatPlanUsage(usage: any): string {
  if (!usage || typeof usage !== 'object' || usage.billingMode !== 'PLAN') {
    return '';
  }

  const parts: string[] = [];
  const requestUsage = usage.request;
  const suffixOf = (remaining: any): string =>
    remaining === undefined || remaining === null ? '' : `（剩余 ${remaining}）`;

  if (requestUsage && typeof requestUsage === 'object' && requestUsage.used) {
    parts.push(
      `${requestUsage.quotaType || 'REQUEST'} ${requestUsage.used} 次${suffixOf(requestUsage.remaining)}`,
    );
  }

  for (const record of usage.records || []) {
    if (!record || typeof record !== 'object' || !record.used) {
      continue;
    }
    parts.push(`${record.quotaType || 'RECORD'} ${record.used} 条${suffixOf(record.remaining)}`);
  }

  if (parts.length === 0) {
    return '';
  }
  return '本次套餐消耗：' + parts.join('，');
}

/** 套餐计费成功时向 stderr 输出本次消耗，供调用方转述给用户。 */
export function notifyPlanUsage(usage: any): void {
  const text = formatPlanUsage(usage);
  if (text) {
    console.error(`[套餐] ${text}`);
  }
}
