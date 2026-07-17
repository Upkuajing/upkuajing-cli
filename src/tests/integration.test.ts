/**
 * 集成测试 - 真实调用测试服（CLI 端到端）
 *
 * 通过运行 CLI（dist/index.js）访问测试服，验证端到端正确性。
 * 测试服不扣费，所有接口默认运行（无 UPKUAJING_INTEGRATION 开关）。
 *
 * 测试服配置通过环境变量注入（见 helpers.ts），代码中不含任何测试地址或 key。
 * 全部命令组真实调用测试服。
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { runCli, runCliAllowFail, skipIfNoConfig, assertList } from './helpers';

describe('集成测试：真实调用测试服', { skip: skipIfNoConfig() }, () => {

  describe('map 命令组（免认证）', () => {
    it('map countries - 国家列表，第一项为阿富汗', () => {
      const data = JSON.parse(runCli(['map', 'countries']));
      const list = assertList(data);
      const first = list[0];
      assert.strictEqual(first.id, 1);
      assert.strictEqual(first.code, 'AF');
      assert.strictEqual(first.nameEn, 'Afghanistan');
      assert.strictEqual(first.name, '阿富汗');
    });

    it('map provinces --country-id 1 - 省份列表非空', () => {
      const data = JSON.parse(runCli(['map', 'provinces', '--country-id', '1']));
      const list = assertList(data);
      assert.ok(list.length > 0, '省份列表不应为空');
    });

    it('map cities --country-id 1 - 城市列表', () => {
      const data = JSON.parse(runCli(['map', 'cities', '--country-id', '1']));
      const list = assertList(data);
      assert.ok(Array.isArray(list), '城市列表应为数组');
    });
  });

  describe('auth 命令组', () => {
    it('auth info - 返回账户信息', () => {
      const data = JSON.parse(runCli(['auth', 'info']));
      assert.ok('跨境魔方开放平台账号' in data, '应有开放平台账号字段');
      assert.ok('跨境魔方开放平台账号余额' in data, '应有余额字段');
    });
  });

  describe('search 命令组', () => {
    it('search company - 搜索公司返回列表', () => {
      const data = JSON.parse(runCli([
        'search', 'company', '--params', '{"keywords":["test"]}',
      ]));
      const list = assertList(data);
      assert.ok(list.length > 0, '搜索结果不应为空');
      const first = list[0];
      assert.ok(first.pid, '应有 pid');
      assert.ok(first.company_name, '应有 company_name');
      assert.ok(first.country_code, '应有 country_code');
    });
  });

  describe('depth-company 命令组', () => {
    it('depth-company company-search - 搜索公司返回列表', () => {
      const data = JSON.parse(runCli([
        'depth-company', 'company-search', '--params', '{"keywords":["test"]}',
      ]));
      const list = assertList(data);
      assert.ok(list.length > 0, '搜索结果不应为空');
      const first = list[0];
      assert.ok(first.pid, '应有 pid');
      assert.ok(first.company_name, '应有 company_name');
      assert.ok(first.country_code, '应有 country_code');
    });

    it('depth-company employee - 查员工列表', () => {
      // 先 company-search 动态拿 pid（避免硬编码 pid 随数据变动而失效）
      const searchData = JSON.parse(runCli([
        'depth-company', 'company-search', '--params', '{"keywords":["test"]}',
      ]));
      const pid = assertList(searchData)[0]?.pid;
      assert.ok(pid, '应从 company-search 拿到 pid');

      const empData = JSON.parse(runCli(['depth-company', 'employee', '--pid', pid]));
      const empList = assertList(empData);
      // 员工列表可能为空，但应为数组；非空时断言字段
      if (empList.length > 0) {
        assert.ok(empList[0].hid, '员工项应有 hid');
      }
    });
  });

  describe('linkedin 命令组', () => {
    it('linkedin person-search - 搜索人员返回列表', () => {
      const data = JSON.parse(runCli([
        'linkedin', 'person-search', '--params', '{"keywords":["test"]}',
      ]));
      const list = assertList(data);
      assert.ok(list.length > 0, '搜索结果不应为空');
      const first = list[0];
      assert.ok(first.hid, '应有 hid');
      assert.ok(first.human_name, '应有 human_name');
      assert.ok(first.country_code, '应有 country_code');
    });
  });

  describe('customs-trade 命令组', () => {
    it('customs-trade search - 海关公司搜索（companyType=1）', () => {
      const result = runCliAllowFail([
        'customs-trade', 'search', '--params', '{"companyType":1,"products":["电子"]}',
      ]);
      assert.strictEqual(result.code, 0, `应成功，stderr: ${result.stderr}`);
      const data = JSON.parse(result.stdout);
      assert.ok(data.data !== undefined, '应有 data');
    });
  });

  describe('validation 命令组', () => {
    it('validation email - 邮箱校验', () => {
      const result = runCliAllowFail([
        'validation', 'email', '--emails', 'test@test.com',
      ]);
      assert.strictEqual(result.code, 0, `应成功，stderr: ${result.stderr}`);
      const data = JSON.parse(result.stdout);
      assert.ok(data.data !== undefined, '应有 data');
    });
  });

  describe('email 命令组', () => {
    it('email task-list - 邮件任务列表', () => {
      const result = runCliAllowFail(['email', 'task-list']);
      assert.strictEqual(result.code, 0, `应成功，stderr: ${result.stderr}`);
      const data = JSON.parse(result.stdout);
      // email task-list 输出完整 response（含 code）
      assert.strictEqual(data.code, 0, `code 应为 0，msg: ${data.msg}`);
    });
  });
});
