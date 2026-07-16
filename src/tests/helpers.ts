/**
 * 测试辅助工具：mock fetch + 捕获调用参数
 */

import * as assert from 'node:assert';

/** 捕获的 fetch 调用信息 */
export interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

/** 创建 mock fetch，记录调用并返回指定响应 */
export function createMockFetch(responseData: any, status: number = 200) {
  const calls: FetchCall[] = [];

  const mockFetch = async (url: string, init: any) => {
    const call: FetchCall = {
      url,
      method: init?.method || 'GET',
      headers: init?.headers || {},
      body: init?.body || '',
    };
    calls.push(call);

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    };
  };

  return { mockFetch, calls };
}

/** 断言 fetch 被调用了一次，返回调用详情 */
export function assertSingleCall(calls: FetchCall[]): FetchCall {
  assert.strictEqual(calls.length, 1, `Expected 1 fetch call, got ${calls.length}`);
  return calls[0];
}

/** 断言请求体是预期的 JSON */
export function assertBody(call: FetchCall, expected: Record<string, any>) {
  const actual = JSON.parse(call.body);
  assert.deepStrictEqual(actual, expected, `Request body mismatch`);
}

/** 断言 URL 包含指定 endpoint */
export function assertEndpoint(call: FetchCall, endpoint: string) {
  assert.ok(
    call.url.endsWith(endpoint),
    `Expected URL to end with "${endpoint}", got "${call.url}"`,
  );
}

/** 断言 headers 包含 Bearer token */
export function assertAuthHeader(call: FetchCall, token: string) {
  assert.strictEqual(
    call.headers['Authorization'],
    `Bearer ${token}`,
    'Authorization header mismatch',
  );
}

/** 断言 headers 不含 Authorization */
export function assertNoAuthHeader(call: FetchCall) {
  assert.ok(
    !call.headers['Authorization'],
    'Expected no Authorization header, but found one',
  );
}
