/**
 * 命令参数校验测试 - 纯客户端校验逻辑
 *
 * 验证 CLI 在发送请求前的参数校验：
 * - companyType 缺失/非法 -> 报错退出
 * - 批量 ID 超过 20 上限 -> 报错退出
 * - --params JSON 无效 -> 报错退出
 *
 * 通过 runCliAllowFail 运行 CLI，断言退出码（非零）和 stderr 内容。
 * 校验在发请求前发生，不实际调用 API，因此无需测试服配置。
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { runCliAllowFail } from './helpers';

describe('命令参数校验（纯客户端，不发请求）', () => {
  it('customs-trade search：缺 companyType 报错退出', () => {
    const result = runCliAllowFail([
      'customs-trade', 'search', '--params', '{"products":["电子"]}',
    ]);
    assert.strictEqual(result.code, 1, '应非零退出');
    assert.ok(
      result.stderr.includes('companyType'),
      `stderr 应提示 companyType，实际：${result.stderr}`,
    );
  });

  it('customs-trade search：companyType 非 1/2 报错退出', () => {
    const result = runCliAllowFail([
      'customs-trade', 'search', '--params', '{"companyType":3}',
    ]);
    assert.strictEqual(result.code, 1, '应非零退出');
    assert.ok(result.stderr.includes('companyType'));
  });

  it('search company-batch：超过 20 个 pid 报错退出', () => {
    const pids = Array.from({ length: 21 }, (_, i) => `pid_${i}`);
    const result = runCliAllowFail(['search', 'company-batch', '--pids', ...pids]);
    assert.strictEqual(result.code, 1, '应非零退出');
    assert.ok(
      result.stderr.includes('20'),
      `stderr 应提示上限 20，实际：${result.stderr}`,
    );
  });

  it('customs-trade detail：超过 20 个 company-id 报错退出', () => {
    const ids = Array.from({ length: 21 }, (_, i) => String(i + 1));
    const result = runCliAllowFail([
      'customs-trade', 'detail', '--company-ids', ...ids,
    ]);
    assert.strictEqual(result.code, 1, '应非零退出');
    assert.ok(result.stderr.includes('20'));
  });

  it('search company：--params 非 JSON 报错退出', () => {
    const result = runCliAllowFail([
      'search', 'company', '--params', 'not-a-json',
    ]);
    assert.strictEqual(result.code, 1, '应非零退出');
    assert.ok(
      result.stderr.includes('JSON'),
      `stderr 应提示 JSON 无效，实际：${result.stderr}`,
    );
  });

  it('search company-batch：恰好 20 个 pid 不触发上限报错', () => {
    // 20 个不报错，但会因 key/pid 无效在后续失败；这里只验证不触发"上限"校验
    const pids = Array.from({ length: 20 }, (_, i) => `pid_${i}`);
    const result = runCliAllowFail(['search', 'company-batch', '--pids', ...pids]);
    assert.ok(
      !result.stderr.includes('最多 20'),
      `20 个不应触发上限校验，实际：${result.stderr}`,
    );
  });
});
