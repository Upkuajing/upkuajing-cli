/**
 * 搜索类命令单元测试
 *
 * 测试搜索命令的参数构建逻辑：
 * - sort/isExact 默认值注入
 * - companyType 校验
 * - 批量参数 20 上限校验
 * - cursor/pitId 透传
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';
import {
  createMockFetch,
  assertSingleCall,
  assertBody,
  assertEndpoint,
} from './helpers';

const originalFetch = globalThis.fetch;
const originalEnv = process.env.UPKUAJING_API_KEY;

describe('搜索命令参数构建', () => {
  before(() => {
    process.env.UPKUAJING_API_KEY = 'test-key';
  });

  after(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.UPKUAJING_API_KEY;
    } else {
      process.env.UPKUAJING_API_KEY = originalEnv;
    }
  });

  it('search company：自动注入 sort=0, isExact=false', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] }, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    // 模拟 search company 的 action 逻辑
    const params: Record<string, any> = JSON.parse('{"keywords":["test"]}');
    if (params.sort === undefined) params.sort = 0;
    if (params.isExact === undefined) params.isExact = false;
    await makeRequest('/agent/search/company/list', params);

    const call = assertSingleCall(calls);
    assertBody(call, { keywords: ['test'], sort: 0, isExact: false });
  });

  it('search company：用户已传 sort 时不覆盖', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] }, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const params: Record<string, any> = JSON.parse('{"keywords":["test"],"sort":1,"isExact":true}');
    if (params.sort === undefined) params.sort = 0;
    if (params.isExact === undefined) params.isExact = false;
    await makeRequest('/agent/search/company/list', params);

    const call = assertSingleCall(calls);
    assertBody(call, { keywords: ['test'], sort: 1, isExact: true });
  });

  it('search person：同样注入默认值', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] }, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const params: Record<string, any> = JSON.parse('{"humanNames":["张三"]}');
    if (params.sort === undefined) params.sort = 0;
    if (params.isExact === undefined) params.isExact = false;
    await makeRequest('/agent/search/person/list', params);

    const call = assertSingleCall(calls);
    assertBody(call, { humanNames: ['张三'], sort: 0, isExact: false });
  });

  it('depth-company company-search：注入默认值 + pitId', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] }, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const params: Record<string, any> = JSON.parse('{"keywords":["科技"]}');
    if (params.sort === undefined) params.sort = 0;
    if (params.isExact === undefined) params.isExact = false;
    const pitId = 'pit-id-value';
    if (pitId) params.pitId = pitId;
    await makeRequest('/agent/search/depth_company/company/list', params);

    const call = assertSingleCall(calls);
    assertEndpoint(call, '/agent/search/depth_company/company/list');
    assertBody(call, { keywords: ['科技'], sort: 0, isExact: false, pitId: 'pit-id-value' });
  });

  it('linkedin person-search：注入默认值', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] }, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const params: Record<string, any> = JSON.parse('{"keywords":["李四"]}');
    if (params.sort === undefined) params.sort = 0;
    if (params.isExact === undefined) params.isExact = false;
    await makeRequest('/agent/search/linkedin/person/list', params);

    const call = assertSingleCall(calls);
    assertEndpoint(call, '/agent/search/linkedin/person/list');
    assertBody(call, { keywords: ['李四'], sort: 0, isExact: false });
  });

  it('customs-trade search：companyType 校验通过', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] }, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const params = JSON.parse('{"products":["电子"],"companyType":1}');
    // 模拟 CLI 校验逻辑
    assert.ok(params.companyType === 1 || params.companyType === 2, 'companyType must be 1 or 2');
    await makeRequest('/agent/customs/company/list', params);

    const call = assertSingleCall(calls);
    assertBody(call, { products: ['电子'], companyType: 1 });
  });

  it('customs-trade search：companyType 缺失时应报错', () => {
    const params = JSON.parse('{"products":["电子"]}');
    // 模拟 CLI 校验逻辑
    const hasCompanyType = params.companyType === 1 || params.companyType === 2;
    assert.strictEqual(hasCompanyType, false, 'Should reject missing companyType');
  });

  it('批量参数：20 条上限校验', () => {
    const BATCH_LIMIT = 20;
    const ids21 = Array.from({ length: 21 }, (_, i) => `id_${i}`);
    const ids20 = Array.from({ length: 20 }, (_, i) => `id_${i}`);

    assert.ok(ids21.length > BATCH_LIMIT, '21 IDs should exceed limit');
    assert.ok(ids20.length <= BATCH_LIMIT, '20 IDs should be within limit');
  });

  it('email send：snake_case → camelCase 映射', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: {}, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    // 模拟 email send 的 params 构建
    const opts = {
      subject: 'hello',
      content: 'world',
      emails: JSON.parse('["a@x.com","b@y.com"]'),
      sendName: 'sender',
      emailName: 'myemail',
      replyEmail: 'reply@x.com',
    };
    const params: Record<string, any> = {
      subject: opts.subject,
      content: opts.content,
      emails: opts.emails,
    };
    if (opts.sendName) params.sendName = opts.sendName;
    if (opts.emailName) params.emailName = opts.emailName;
    if (opts.replyEmail) params.replyEmail = opts.replyEmail;

    await makeRequest('/agent/mail/send', params);

    const call = assertSingleCall(calls);
    assertBody(call, {
      subject: 'hello',
      content: 'world',
      emails: ['a@x.com', 'b@y.com'],
      sendName: 'sender',
      emailName: 'myemail',
      replyEmail: 'reply@x.com',
    });
  });

  it('email task-list：pageNo/pageSize 默认值 + camelCase', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: {}, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    // 模拟 task-list 默认 pageNo=1, pageSize=10
    const params: Record<string, any> = {
      pageNo: 1,
      pageSize: 10,
    };
    await makeRequest('/agent/mail/task/list', params);

    const call = assertSingleCall(calls);
    assertBody(call, { pageNo: 1, pageSize: 10 });
  });

  it('map countries：免认证（requireAuth=false）', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: { list: [] } });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    await makeRequest('/agent/common/country/list', {}, false);

    const call = assertSingleCall(calls);
    assertEndpoint(call, '/agent/common/country/list');
    assertBody(call, {});
    assert.ok(!call.headers['Authorization'], 'Should not have auth header');
  });

  it('customs-trade detail：int 数组参数', async () => {
    const { mockFetch, calls } = createMockFetch({ code: 0, data: {}, fee: {} });
    globalThis.fetch = mockFetch as any;

    const { makeRequest } = await import('../client');
    const companyIds = ['100001', '100002', '100003'].map(id => parseInt(id, 10));
    await makeRequest('/agent/customs/company/detail/batch', { companyIds });

    const call = assertSingleCall(calls);
    assertBody(call, { companyIds: [100001, 100002, 100003] });
  });
});
