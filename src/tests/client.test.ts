/**
 * client.ts 单元测试
 *
 * 测试 makeRequest 的 URL 构建、headers、body、鉴权逻辑。
 * 通过 mock globalThis.fetch 实现，不实际调用 API。
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import {
  createMockFetch,
  assertSingleCall,
  assertBody,
  assertEndpoint,
  assertAuthHeader,
  assertNoAuthHeader,
} from './helpers';

// 保存原始 fetch 和 env
const originalFetch = globalThis.fetch;
const originalEnv = process.env.UPKUAJING_API_KEY;

describe('client.makeRequest', () => {
  const TEST_KEY = 'test-api-key-12345';

  before(() => {
    process.env.UPKUAJING_API_KEY = TEST_KEY;
  });

  after(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.UPKUAJING_API_KEY;
    } else {
      process.env.UPKUAJING_API_KEY = originalEnv;
    }
  });

  it('认证请求：URL、headers、body 正确', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { ok: true }, fee: {} });
    globalThis.fetch = mockFetch as any;

    // 动态导入，确保拿到 mock 后的模块
    const { makeRequest } = await import('../client');
    const res = await makeRequest('/agent/auth/info', {});

    const call = assertSingleCall(calls);
    assertEndpoint(call, '/agent/auth/info');
    assertAuthHeader(call, TEST_KEY);
    assertBody(call, {});
    assert.strictEqual(res.code, 0);
  });

  it('免认证请求：无 Authorization header', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: [], fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    await makeRequest('/agent/common/country/list', {}, false);

    const call = assertSingleCall(calls);
    assertNoAuthHeader(call);
    assertBody(call, {});
  });

  it('POST 方法 + JSON body 正确', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: {}, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    await makeRequest('/agent/validation/email', { emails: ['a@x.com', 'b@y.com'] });

    const call = assertSingleCall(calls);
    assert.strictEqual(call.method, 'POST');
    assert.strictEqual(call.headers['Content-Type'], 'application/json');
    assertBody(call, { emails: ['a@x.com', 'b@y.com'] });
  });

  it('API 错误（code≠0）时返回原始响应，不退出', async () => {
    const errorResponse = { code: 95, msg: '余额不足', data: null, fee: {} };
    const { mockFetch, calls } = createMockFetch(errorResponse);
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const res = await makeRequest('/agent/search/company/list', { keywords: ['test'] });

    assert.strictEqual(res.code, 95);
    assert.strictEqual(res.msg, '余额不足');
    assert.strictEqual(calls.length, 1);
  });

  it('完整 URL 包含 base URL', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: {}, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    await makeRequest('/agent/auth/info', {});

    const call = assertSingleCall(calls);
    assert.strictEqual(
      call.url,
      'https://openapi.upkuajing.com/agent/auth/info',
      'URL should include base URL + endpoint',
    );
  });
});
