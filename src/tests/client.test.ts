/**
 * client.ts 测试 - 真实请求
 *
 * 直接调用 makeRequest 访问测试服，验证函数级行为：
 * - 认证请求：带 Authorization，调通 auth/info
 * - 免认证请求：不带 Authorization，调通 country/list
 * - POST + JSON body：调通 province/list（传 countryId）
 * - API 错误（code≠0）：auth/info 不带 key 返回 code=96，makeRequest 返回原始响应不退出
 *
 * 测试服配置通过环境变量注入（见 helpers.ts），代码中不含任何测试地址或 key。
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { makeRequest } from '../client';
import { skipIfNoConfig, assertSuccess, assertList } from './helpers';

describe('client.makeRequest 真实请求', { skip: skipIfNoConfig() }, () => {
  it('认证请求：调通 /agent/auth/info，返回账户信息', async () => {
    const res = await makeRequest('/agent/auth/info', {});
    assertSuccess(res);
    // 严格断言账户字段
    assert.ok(res.data.apiAccount, '应有 apiAccount');
    assert.ok(typeof res.data.orgBalance === 'number', 'orgBalance 应为数字');
    assert.ok(typeof res.data.apiBalance === 'number', 'apiBalance 应为数字');
  });

  it('免认证请求：调通 /agent/common/country/list，不带 Authorization', async () => {
    const res = await makeRequest('/agent/common/country/list', {}, false);
    assertSuccess(res);
    const list = assertList(res);
    // 严格断言第一项（阿富汗，id=1，测试服稳定种子数据）
    const first = list[0];
    assert.strictEqual(first.id, 1);
    assert.strictEqual(first.code, 'AF');
    assert.strictEqual(first.nameEn, 'Afghanistan');
    assert.strictEqual(first.name, '阿富汗');
  });

  it('POST + JSON body：调通 /agent/common/province/list（id=1）', async () => {
    const res = await makeRequest('/agent/common/province/list', { id: 1 }, false);
    assertSuccess(res);
    const list = assertList(res);
    assert.ok(list.length > 0, '省份列表不应为空');
    // 严格断言第一项字段（顺序可能变动，仅断言字段存在与类型）
    const first = list[0];
    assert.ok(typeof first.id === 'number', '应有数字 id');
    assert.ok(first.nameEn, '应有 nameEn');
    assert.ok(first.name, '应有 name');
  });

  it('API 错误（code≠0）：auth/info 不带 key 返回 code=96，不退出', async () => {
    // requireAuth=false 时不带 Authorization，测试服返回 code=96（HTTP 200）
    // 验证 makeRequest 在 API 错误时不 process.exit，返回原始响应
    const res = await makeRequest('/agent/auth/info', {}, false);
    assert.strictEqual(res.code, 96);
    assert.strictEqual(res.msg, '认证错误');
  });
});
