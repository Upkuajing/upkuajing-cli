/**
 * API client — 从 Python common.py 的 make_request 翻译
 *
 * 统一 HTTP POST client，Bearer token 鉴权，对应现有 skill 的 make_request。
 * 套餐计费：支持套餐的接口默认携带 planMode=2；套餐不可用时输出确认信息并以
 * 退出码 3 结束，不会自动降级为余额计费。
 */

import { getApiKey } from './config';
import {
  IDEMPOTENCY_KEY_ENV,
  PLAN_ERROR_CODE,
  PLAN_MODE_BALANCE,
  PLAN_MODE_PLAN,
  buildPlanUnavailable,
  emitPlanUnavailable,
  notifyPlanUsage,
  withPlanMode,
} from './plan';

// API 配置
const API_BASE_URL = process.env.UPKUAJING_API_BASE_URL || 'https://openapi.upkuajing.com';
const API_TIMEOUT = 120_000; // 总超时 120s（列表查询可能较慢）

// API 响应信封
export interface ApiResponse {
  code: number;
  data: any;
  fee?: any;
  msg?: string;
  requestId?: string;
  usage?: any;
}

// API 错误码常量
export const API_ERROR_CODE = {
  UNKNOWN_ERROR: 99,
  REQUEST_PARAM_ERROR: 98,
  REQUEST_METHOD_ERROR: 97,
  REQUEST_AUTH_ERROR: 96,
  SEARCH_BALANCE_NOT_ENOUGH: 95,
  PLAN_NOT_SUPPORTED: PLAN_ERROR_CODE.NOT_SUPPORTED,
  PLAN_NOT_AVAILABLE: PLAN_ERROR_CODE.NOT_AVAILABLE,
  PLAN_QUOTA_EXHAUSTED: PLAN_ERROR_CODE.QUOTA_EXHAUSTED,
} as const;

// API 错误码 → 中文消息
const API_ERROR_MESSAGES: Record<number, string> = {
  [API_ERROR_CODE.UNKNOWN_ERROR]: '系统繁忙，请稍后重试',
  [API_ERROR_CODE.REQUEST_PARAM_ERROR]: '请求参数错误，请检查参数名称和值',
  [API_ERROR_CODE.REQUEST_METHOD_ERROR]: '请求方式错误，请使用正确的HTTP方法',
  [API_ERROR_CODE.REQUEST_AUTH_ERROR]: '认证错误，请检查API密钥是否有效',
  [API_ERROR_CODE.SEARCH_BALANCE_NOT_ENOUGH]: '余额不足，请充值后继续使用',
  [API_ERROR_CODE.PLAN_NOT_SUPPORTED]: '接口不支持套餐计费，请勿传 planMode=2',
  [API_ERROR_CODE.PLAN_NOT_AVAILABLE]: '当前账号无有效套餐，请先购买套餐',
  [API_ERROR_CODE.PLAN_QUOTA_EXHAUSTED]: '套餐额度已用完，可稍后重试或改用API余额',
};

// API 错误码 → 处理建议
const API_ERROR_SUGGESTIONS: Record<number, string> = {
  [API_ERROR_CODE.REQUEST_AUTH_ERROR]: '请检查环境变量 UPKUAJING_API_KEY 或文件 ~/.upkuajing/.env 中的API密钥是否正确',
  [API_ERROR_CODE.SEARCH_BALANCE_NOT_ENOUGH]: '请运行 up-cli auth recharge 创建充值订单',
  [API_ERROR_CODE.REQUEST_PARAM_ERROR]: '请参考 API 文档检查参数格式',
  [API_ERROR_CODE.PLAN_NOT_SUPPORTED]: '该接口固定按余额计费，移除 planMode 参数后重试',
  [API_ERROR_CODE.PLAN_QUOTA_EXHAUSTED]: '可等待额度恢复，或设置 UPKUAJING_PLAN_MODE=1 改用API余额',
};

/**
 * 向跨境魔方 API 发起 HTTP POST 请求。
 *
 * 对应 Python common.py:make_request。
 * - 套餐不可用（无套餐/额度用完）→ stdout 输出 PLAN_UNAVAILABLE 并以退出码 3 结束
 * - HTTP/网络错误 → 打印到 stderr 并 process.exit(1)
 * - API 错误（code≠0）→ 返回原始 response 供调用者处理
 * - 成功（code=0）→ 返回完整 response
 *
 * @param endpoint API 端点路径，如 '/agent/auth/info'
 * @param params 请求参数
 * @param requireAuth 是否需要 Bearer token，默认 true
 */
export async function makeRequest(
  endpoint: string,
  params: Record<string, any>,
  requireAuth: boolean = true,
): Promise<ApiResponse> {
  const url = `${API_BASE_URL}${endpoint}`;

  // 复制入参再注入 planMode，不污染调用方的参数对象
  const { params: requestParams, planMode } = withPlanMode(endpoint, params);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const apiKey = getApiKey();
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // 网络超时后的重试复用同一个幂等键，避免重复计费
  const idempotencyKey = process.env[IDEMPOTENCY_KEY_ENV];
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const debug = !!process.env.UPKUAJING_DEBUG;

  if (debug) {
    console.error(`[debug] POST ${url}`);
    console.error(`[debug] body: ${JSON.stringify(requestParams)}`);
  }

  // 用 AbortController 实现总超时
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestParams),
      signal: controller.signal,
    });

    // 解析 JSON，失败则用空对象兜底
    let data: ApiResponse;
    try {
      data = (await response.json()) as ApiResponse;
    } catch {
      data = { code: -1, data: {} } as ApiResponse;
    }

    if (debug) {
      console.error(`[debug] status: ${response.status}`);
      console.error(`[debug] response: ${JSON.stringify(data)}`);
    }

    // 套餐不可用：输出确认信息并以退出码 3 结束，由调用方询问用户
    const planUnavailable = buildPlanUnavailable(
      endpoint,
      requestParams,
      planMode,
      response.status,
      data,
      response.headers.get('Retry-After'),
    );
    if (planUnavailable) {
      emitPlanUnavailable(planUnavailable);
    }

    // 检查 HTTP 状态
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`HTTP错误：${response.status}`, text);
      process.exit(1);
    }

    // 检查 API 级别的错误，0 表示成功，非 0 代表错误
    if (data.code !== 0) {
      if (data.code === API_ERROR_CODE.REQUEST_PARAM_ERROR && planMode === PLAN_MODE_PLAN) {
        console.error(
          `[提示] 参数错误可能与 planMode=2 有关，可设置 UPKUAJING_PLAN_MODE=${PLAN_MODE_BALANCE} 改用余额重试`,
        );
      } else if (data.code === API_ERROR_CODE.SEARCH_BALANCE_NOT_ENOUGH) {
        console.error('[提示] 余额不足，请运行 up-cli auth recharge 充值');
      } else if (data.code === API_ERROR_CODE.PLAN_NOT_SUPPORTED) {
        console.error('[提示] 该接口不支持套餐计费，请移除 planMode 后重试');
      }
      return data;
    }

    // 套餐计费成功时输出本次用量，便于调用方转述给用户
    notifyPlanUsage(data.usage);

    return data;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.error('网络错误：请求超时');
    } else {
      console.error('网络错误：无法连接到API服务器');
      console.error(`详细信息：${e.message || e}`);
    }
    process.exit(1);
    return { code: -1, data: {} } as ApiResponse; // unreachable，满足 TS 返回类型
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 处理 API 错误响应，打印详细错误消息到 stderr。
 *
 * 对应 Python common.py:handle_api_error。
 * 默认 exit_on_error=true，遇到错误时 process.exit(1)。
 */
export function handleApiError(responseData: ApiResponse, exitOnError: boolean = true): void {
  const errorCode = responseData.code;
  const serverMsg = responseData.msg || '';

  const standardMsg = API_ERROR_MESSAGES[errorCode] || serverMsg || '未知错误';

  console.error(`API错误（代码：${errorCode}）：${standardMsg}`);

  if (serverMsg && serverMsg !== standardMsg) {
    console.error(`服务器消息：${serverMsg}`);
  }

  const suggestion = API_ERROR_SUGGESTIONS[errorCode];
  if (suggestion) {
    console.error(`建议：${suggestion}`);
  }

  if (exitOnError) {
    process.exit(1);
  }
}
