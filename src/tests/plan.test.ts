/**
 * plan.ts 测试 — 套餐计费与余额降级
 *
 * 两部分：
 * 1. 纯函数单测：planMode 解析优先级、注入、不可用信号、用量文案
 * 2. 本地仿真集成：起一个 HTTP mock 服务并拉起 CLI 子进程，
 *    验证请求体注入、退出码 3、PLAN_UNAVAILABLE 信号，全程不访问真实 API
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { getEnvFilePath, readEnvFile, setEnvFileValue } from '../config';
import {
  PLAN_MODE_BALANCE,
  PLAN_MODE_PLAN,
  buildPlanUnavailable,
  formatPlanUsage,
  getPlanModeStatus,
  isPlanSupported,
  normalizePlanWindows,
  parsePlanMode,
  resolvePlanMode,
  setPlanModeOverride,
  withPlanMode,
} from '../plan';

const CLI = path.join(__dirname, '..', 'index.js');

/** 在指定 UPKUAJING_PLAN_MODE 下执行，结束后恢复原值。 */
function withPlanModeEnv(value: string | undefined, fn: () => void): void {
  const original = process.env.UPKUAJING_PLAN_MODE;
  if (value === undefined) {
    delete process.env.UPKUAJING_PLAN_MODE;
  } else {
    process.env.UPKUAJING_PLAN_MODE = value;
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.UPKUAJING_PLAN_MODE;
    } else {
      process.env.UPKUAJING_PLAN_MODE = original;
    }
  }
}

/** 在隔离的 HOME（可预置 ~/.upkuajing/.env）下执行，结束后恢复并清理。 */
function withTempHome(envLines: Record<string, string>, fn: () => void): void {
  const originalHome = process.env.HOME;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upcli-home-'));

  if (Object.keys(envLines).length > 0) {
    fs.mkdirSync(path.join(dir, '.upkuajing'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.upkuajing', '.env'),
      Object.entries(envLines).map(([key, value]) => `${key}=${value}`).join('\n') + '\n',
    );
  }

  process.env.HOME = dir;
  try {
    fn();
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('plan 纯函数', () => {
  it('isPlanSupported 只覆盖 search / customs / map', () => {
    assert.strictEqual(isPlanSupported('/agent/search/company/list'), true);
    assert.strictEqual(isPlanSupported('/agent/customs/company/list'), true);
    assert.strictEqual(isPlanSupported('/agent/map/search'), true);
    assert.strictEqual(isPlanSupported('/agent/validation/email'), false);
    assert.strictEqual(isPlanSupported('/agent/mail/send'), false);
    assert.strictEqual(isPlanSupported('/agent/plan/quota'), false);
  });

  it('parsePlanMode 与 Python 实现一致', () => {
    assert.strictEqual(parsePlanMode(PLAN_MODE_BALANCE), 1);
    assert.strictEqual(parsePlanMode(PLAN_MODE_PLAN), 2);
    assert.strictEqual(parsePlanMode('1'), 1);
    assert.strictEqual(parsePlanMode('2'), 2);
    assert.strictEqual(parsePlanMode('0'), 0);
    assert.strictEqual(parsePlanMode('off'), 0);
    assert.strictEqual(parsePlanMode('none'), 0);
    assert.strictEqual(parsePlanMode('auto'), 0);
    assert.strictEqual(parsePlanMode('plan'), 2);
    assert.strictEqual(parsePlanMode('balance'), 1);
    assert.strictEqual(parsePlanMode(''), 0);
    assert.strictEqual(parsePlanMode('abc'), undefined);
    assert.strictEqual(parsePlanMode(3), undefined);
    assert.strictEqual(parsePlanMode(null), undefined);
    assert.strictEqual(parsePlanMode(true), undefined);
  });

  it('resolvePlanMode 优先级：环境变量 > 请求参数 > 接口默认值', () => {
    withTempHome({}, () => {
      withPlanModeEnv(undefined, () => {
        assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), PLAN_MODE_PLAN);
        assert.strictEqual(resolvePlanMode('/agent/validation/email', {}), undefined);
        assert.strictEqual(
          resolvePlanMode('/agent/search/company/list', { planMode: PLAN_MODE_BALANCE }),
          PLAN_MODE_BALANCE,
        );
      });
      withPlanModeEnv('1', () => {
        // 历史参数里的 planMode=2 不能覆盖用户「改用余额」的选择
        assert.strictEqual(
          resolvePlanMode('/agent/search/company/list', { planMode: PLAN_MODE_PLAN }),
          PLAN_MODE_BALANCE,
        );
      });
      withPlanModeEnv('off', () => {
        assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), 0);
      });
    });
  });

  it('--plan-mode 覆盖优先级最高（高于环境变量与参数）', () => {
    try {
      setPlanModeOverride(PLAN_MODE_BALANCE);
      withPlanModeEnv('2', () => {
        assert.strictEqual(
          resolvePlanMode('/agent/search/company/list', { planMode: PLAN_MODE_PLAN }),
          PLAN_MODE_BALANCE,
        );
      });

      setPlanModeOverride(0);
      withPlanModeEnv('2', () => {
        assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), 0);
      });
    } finally {
      setPlanModeOverride(undefined);
    }
  });

  it('~/.upkuajing/.env 的全局配置生效，环境变量优先', () => {
    withPlanModeEnv(undefined, () => {
      withTempHome({ UPKUAJING_PLAN_MODE: 'balance' }, () => {
        assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), PLAN_MODE_BALANCE);
        assert.strictEqual(getPlanModeStatus().source, 'env-file');
      });

      withTempHome({ UPKUAJING_PLAN_MODE: 'auto' }, () => {
        assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), 0);
      });

      withTempHome({ UPKUAJING_PLAN_MODE: 'balance' }, () => {
        withPlanModeEnv('plan', () => {
          assert.strictEqual(getPlanModeStatus().source, 'env');
          assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), PLAN_MODE_PLAN);
        });
      });

      withTempHome({}, () => {
        assert.strictEqual(getPlanModeStatus().source, 'default');
        assert.strictEqual(resolvePlanMode('/agent/search/company/list', {}), PLAN_MODE_PLAN);
      });
    });
  });

  it('setEnvFileValue 只更新目标行并保持 0600', () => {
    withTempHome({ UPKUAJING_API_KEY: 'k1', UPKUAJING_PLAN_MODE: 'plan' }, () => {
      setEnvFileValue('UPKUAJING_PLAN_MODE', 'balance');
      assert.strictEqual(readEnvFile().UPKUAJING_API_KEY, 'k1');
      assert.strictEqual(readEnvFile().UPKUAJING_PLAN_MODE, 'balance');
      assert.strictEqual(fs.statSync(getEnvFilePath()).mode & 0o777, 0o600);

      setEnvFileValue('UPKUAJING_PLAN_MODE', null);
      assert.strictEqual(readEnvFile().UPKUAJING_PLAN_MODE, undefined);
      assert.strictEqual(readEnvFile().UPKUAJING_API_KEY, 'k1');
    });
  });

  it('withPlanMode 不改入参，且对不支持套餐的接口剔除 planMode', () => {
    withTempHome({}, () => {
      withPlanModeEnv(undefined, () => {
        const params = { keyword: 'led' };
        const injected = withPlanMode('/agent/search/company/list', params);
        assert.deepStrictEqual(params, { keyword: 'led' });
        assert.strictEqual(injected.params.planMode, PLAN_MODE_PLAN);

        const unsupported = withPlanMode('/agent/validation/email', { emails: ['a@b.com'], planMode: 2 });
        assert.strictEqual(unsupported.params.planMode, undefined);
        assert.strictEqual(unsupported.planMode, undefined);
      });
    });
  });

  it('normalizePlanWindows 兼容列表与对象两种形态', () => {
    const list = normalizePlanWindows([{ window: 'req5h', remaining: 0 }]);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].remaining, 0);

    const object = normalizePlanWindows({ req5h: { remaining: 3 } });
    assert.strictEqual(object.length, 1);
    assert.strictEqual(object[0].window, 'req5h');
    assert.strictEqual(object[0].remaining, 3);
  });

  it('buildPlanUnavailable 识别无套餐与额度用完', () => {
    const noPlan = buildPlanUnavailable(
      '/agent/search/company/list',
      { keywords: ['led'] },
      PLAN_MODE_PLAN,
      200,
      { code: 1004, data: {} },
      null,
    );
    assert.ok(noPlan);
    assert.strictEqual(noPlan.reason, 'no_plan');
    assert.strictEqual(noPlan.status, 'plan_unavailable');
    assert.strictEqual(noPlan.billingMode, 'PLAN');
    assert.strictEqual(noPlan.paramsSummary, '{"keywords":["led"]}');

    const exhausted = buildPlanUnavailable(
      '/agent/search/company/list',
      {},
      PLAN_MODE_PLAN,
      429,
      {
        code: 1005,
        requestId: 'req-1',
        data: {
          retryAfter: 1800,
          windows: [{ window: 'req5h', remaining: 0, limit: 300, used: 300 }],
        },
      },
      null,
    );
    assert.ok(exhausted);
    assert.strictEqual(exhausted.reason, 'quota_exhausted');
    assert.strictEqual(exhausted.retryAfterSeconds, 1800);
    assert.ok(exhausted.askUser.includes('是否改用API余额'));

    // 非套餐计费或普通限流不应误判
    assert.strictEqual(
      buildPlanUnavailable('/agent/search/company/list', {}, PLAN_MODE_BALANCE, 200, { code: 1004 }, null),
      null,
    );
    assert.strictEqual(
      buildPlanUnavailable('/agent/search/company/list', {}, PLAN_MODE_PLAN, 200, { code: 95 }, null),
      null,
    );
    assert.strictEqual(
      buildPlanUnavailable('/agent/search/company/list', {}, PLAN_MODE_PLAN, 429, { code: 0 }, null),
      null,
    );
  });

  it('formatPlanUsage 汇总套餐消耗', () => {
    assert.strictEqual(formatPlanUsage(null), '');
    assert.strictEqual(
      formatPlanUsage({ billingMode: 'BALANCE', request: { used: 1 } }),
      '',
    );
    assert.strictEqual(
      formatPlanUsage({
        billingMode: 'PLAN',
        request: { quotaType: 'SEARCH', used: 1, remaining: 299 },
        records: [{ quotaType: 'RECORD', used: 20, remaining: 80 }],
      }),
      '本次套餐消耗：SEARCH 1 次（剩余 299），RECORD 20 条（剩余 80）',
    );
  });
});

interface MockResponse {
  status: number;
  body: any;
}

interface CliResult {
  stdout: string;
  stderr: string;
  code: number;
  requests: any[];
  headers: http.IncomingHttpHeaders[];
}

/** 起本地 mock 服务并运行 CLI 子进程，返回退出码、输出与收到的请求。 */
async function runCliWithMock(
  cliArgs: string[],
  responder: (body: any, requestIndex: number) => MockResponse,
  extraEnv: Record<string, string> = {},
  homeDir?: string,
): Promise<CliResult> {
  const requests: any[] = [];
  const headers: http.IncomingHttpHeaders[] = [];
  // 隔离 HOME，避免读到本机真实的 ~/.upkuajing/.env
  const ownsHome = !homeDir;
  const home = homeDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'upcli-home-'));
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      let body: any = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = { raw };
      }
      requests.push(body);
      headers.push(req.headers);
      const result = responder(body, requests.length - 1);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  env.UPKUAJING_API_BASE_URL = `http://127.0.0.1:${address.port}`;
  env.UPKUAJING_API_KEY = 'test-key';
  env.HOME = home;
  env.USERPROFILE = home;
  delete env.UPKUAJING_PLAN_MODE;
  delete env.UPKUAJING_DEBUG;
  Object.assign(env, extraEnv);

  try {
    // 必须异步执行：同步 execFileSync 会阻塞本进程事件循环，
    // 导致下面的 mock HTTP 服务无法处理子进程请求而死锁。
    return await new Promise((resolve) => {
      execFile(
        'node',
        [CLI, ...cliArgs],
        { encoding: 'utf-8', env, timeout: 30_000 },
        (error, stdout, stderr) => {
          const exitCode = error
            ? typeof (error as any).code === 'number'
              ? ((error as any).code as number)
              : 1
            : 0;
          resolve({ stdout: stdout || '', stderr: stderr || '', code: exitCode, requests, headers });
        },
      );
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (ownsHome) {
      fs.rmSync(home, { recursive: true, force: true });
    }
  }
}

describe('plan CLI 行为（本地 mock）', () => {
  it('默认注入 planMode=2；无套餐时输出 PLAN_UNAVAILABLE 并退出 3', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}'],
      () => ({ status: 200, body: { code: 1004, msg: 'no plan', data: {} } }),
    );

    assert.strictEqual(result.code, 3);
    const line = result.stdout.split('\n').find((item) => item.startsWith('PLAN_UNAVAILABLE '));
    assert.ok(line, 'stdout 应包含 PLAN_UNAVAILABLE 行');
    const payload = JSON.parse(line!.slice('PLAN_UNAVAILABLE '.length));
    assert.strictEqual(payload.reason, 'no_plan');
    assert.strictEqual(payload.endpoint, '/agent/search/company/list');
    assert.strictEqual(payload.billingMode, 'PLAN');

    assert.strictEqual(result.requests.length, 1);
    assert.strictEqual(result.requests[0].planMode, PLAN_MODE_PLAN);
  });

  it('UPKUAJING_PLAN_MODE=1 时改走余额，不触发退出码 3', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
      { UPKUAJING_PLAN_MODE: '1' },
    );

    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.requests[0].planMode, PLAN_MODE_BALANCE);
  });

  it('参数里的 planMode 生效，但环境变量优先级更高', async () => {
    const fromParams = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led","planMode":1}'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
    );
    assert.strictEqual(fromParams.requests[0].planMode, PLAN_MODE_BALANCE);

    const fromEnv = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led","planMode":2}'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
      { UPKUAJING_PLAN_MODE: '1' },
    );
    assert.strictEqual(fromEnv.requests[0].planMode, PLAN_MODE_BALANCE);
  });

  it('不支持套餐的接口不带 planMode', async () => {
    const result = await runCliWithMock(
      ['validation', 'email', '--emails', 'a@b.com'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
    );

    assert.strictEqual(result.code, 0);
    assert.strictEqual('planMode' in result.requests[0], false);
  });

  it('429 + 额度用完同样输出退出码 3，并带恢复时间', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}'],
      () => ({
        status: 429,
        body: {
          code: 1005,
          requestId: 'req-2',
          data: {
            retryAfter: 1800,
            windows: [{ window: 'req5h', remaining: 0, limit: 300, used: 300 }],
          },
        },
      }),
    );

    assert.strictEqual(result.code, 3);
    const line = result.stdout.split('\n').find((item) => item.startsWith('PLAN_UNAVAILABLE '));
    assert.ok(line);
    const payload = JSON.parse(line!.slice('PLAN_UNAVAILABLE '.length));
    assert.strictEqual(payload.reason, 'quota_exhausted');
    assert.strictEqual(payload.retryAfterSeconds, 1800);
    assert.ok(payload.resumeAt);
    assert.deepStrictEqual(payload.nextActions, ['use_balance', 'retry_later', 'upgrade_plan']);
  });

  it('UPKUAJING_IDEMPOTENCY_KEY 透传为 Idempotency-Key 请求头', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
      { UPKUAJING_IDEMPOTENCY_KEY: 'idem-123' },
    );

    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.headers[0]['idempotency-key'], 'idem-123');
    assert.strictEqual(result.headers[0]['authorization'], 'Bearer test-key');
  });

  it('套餐计费成功时在 stderr 输出本次消耗', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}'],
      () => ({
        status: 200,
        body: {
          code: 0,
          data: { list: [] },
          usage: {
            billingMode: 'PLAN',
            request: { quotaType: 'SEARCH', used: 1, remaining: 55995 },
          },
        },
      }),
    );

    assert.strictEqual(result.code, 0);
    assert.ok(
      result.stderr.includes('[套餐] 本次套餐消耗：SEARCH 1 次（剩余 55995）'),
      `stderr 应包含套餐消耗行，实际为：${result.stderr}`,
    );
  });

  it('--plan-mode 可在命令任意位置切换，且高于环境变量', async () => {
    const after = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}', '--plan-mode', 'balance'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
    );
    assert.strictEqual(after.code, 0);
    assert.strictEqual(after.requests[0].planMode, PLAN_MODE_BALANCE);

    const before = await runCliWithMock(
      ['--plan-mode=plan', 'search', 'company', '--params', '{"keyword":"led"}'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
      { UPKUAJING_PLAN_MODE: '1' },
    );
    assert.strictEqual(before.code, 0);
    assert.strictEqual(before.requests[0].planMode, PLAN_MODE_PLAN);
  });

  it('--plan-mode auto 表示不传 planMode', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}', '--plan-mode', 'auto'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
    );

    assert.strictEqual(result.code, 0);
    assert.strictEqual('planMode' in result.requests[0], false);
  });

  it('--plan-mode 非法取值报错退出 1，不发请求', async () => {
    const result = await runCliWithMock(
      ['search', 'company', '--params', '{"keyword":"led"}', '--plan-mode', 'wrong'],
      () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
    );

    assert.strictEqual(result.code, 1);
    assert.ok(result.stderr.includes('--plan-mode'), result.stderr);
    assert.strictEqual(result.requests.length, 0);
  });

  it('全局配置（~/.upkuajing/.env）作为默认计费模式生效', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'upcli-home-'));
    fs.mkdirSync(path.join(home, '.upkuajing'), { recursive: true });
    fs.writeFileSync(path.join(home, '.upkuajing', '.env'), 'UPKUAJING_PLAN_MODE=balance\n');
    try {
      const result = await runCliWithMock(
        ['search', 'company', '--params', '{"keyword":"led"}'],
        () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
        {},
        home,
      );
      assert.strictEqual(result.code, 0);
      assert.strictEqual(result.requests[0].planMode, PLAN_MODE_BALANCE);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('config set-plan-mode / unset-plan-mode 管理全局配置', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'upcli-home-'));
    const envFile = path.join(home, '.upkuajing', '.env');
    try {
      const set = await runCliWithMock(
        ['config', 'set-plan-mode', 'balance'],
        () => ({ status: 200, body: { code: 0, data: {} } }),
        {},
        home,
      );
      assert.strictEqual(set.code, 0);
      assert.ok(fs.readFileSync(envFile, 'utf-8').includes('UPKUAJING_PLAN_MODE=balance'));

      const show = await runCliWithMock(
        ['config', 'show'],
        () => ({ status: 200, body: { code: 0, data: {} } }),
        {},
        home,
      );
      const shown = JSON.parse(show.stdout);
      assert.strictEqual(shown.planMode, 'balance');
      assert.strictEqual(shown.planModeSource, 'env-file');

      const run = await runCliWithMock(
        ['search', 'company', '--params', '{"keyword":"led"}'],
        () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
        {},
        home,
      );
      assert.strictEqual(run.requests[0].planMode, PLAN_MODE_BALANCE);

      const unset = await runCliWithMock(
        ['config', 'unset-plan-mode'],
        () => ({ status: 200, body: { code: 0, data: {} } }),
        {},
        home,
      );
      assert.strictEqual(unset.code, 0);
      assert.ok(!fs.readFileSync(envFile, 'utf-8').includes('UPKUAJING_PLAN_MODE'));

      const back = await runCliWithMock(
        ['search', 'company', '--params', '{"keyword":"led"}'],
        () => ({ status: 200, body: { code: 0, data: { list: [] } } }),
        {},
        home,
      );
      assert.strictEqual(back.requests[0].planMode, PLAN_MODE_PLAN);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('auth login 不会清掉全局计费配置', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'upcli-home-'));
    fs.mkdirSync(path.join(home, '.upkuajing'), { recursive: true });
    const envFile = path.join(home, '.upkuajing', '.env');
    fs.writeFileSync(envFile, 'UPKUAJING_PLAN_MODE=balance\n');
    try {
      const result = await runCliWithMock(
        ['auth', 'login'],
        () => ({ status: 200, body: { code: 0, data: { apiKey: 'new-key' } } }),
        {},
        home,
      );
      assert.strictEqual(result.code, 0);
      const content = fs.readFileSync(envFile, 'utf-8');
      assert.ok(content.includes('UPKUAJING_API_KEY=new-key'), content);
      assert.ok(content.includes('UPKUAJING_PLAN_MODE=balance'), content);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
