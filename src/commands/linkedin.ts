/**
 * linkedin 命令组 — LinkedIn 数据（合并 8 个 skill）
 *
 * endpoint 前缀：/agent/search/linkedin/
 *
 * list 搜索（company-search、person-search）有额外的 pitId 游标：
 * 首次响应返回 data.pitId，后续请求通过 --pit-id 回传以保证深分页稳定性。
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { parseParams, withCursor, injectSearchParamsDefaults } from '../helpers';

const BASE = '/agent/search/linkedin';

export function registerLinkedinCommands(program: Command): void {
  const cmd = program
    .command('linkedin')
    .description('LinkedIn 数据搜索与查询');

  // === 公司搜索 ===
  cmd
    .command('company-search')
    .description('搜索 LinkedIn 公司')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .option('--pit-id <pitId>', 'PIT 游标ID，深分页时传入首次响应返回的 pitId')
    .action(async (opts) => {
      const params = injectSearchParamsDefaults(parseParams(opts.params));
      withCursor(params, opts.cursor);
      if (opts.pitId) params.pitId = opts.pitId;
      const response = await makeRequest(`${BASE}/company/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 公司员工 ===
  cmd
    .command('company-employee')
    .description('查询 LinkedIn 公司员工列表')
    .requiredOption('--pid <pid>', '公司ID')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = withCursor({ pid: opts.pid }, opts.cursor);
      const response = await makeRequest(`${BASE}/company/employee/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 人员搜索 ===
  cmd
    .command('person-search')
    .description('搜索 LinkedIn 人员')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .option('--pit-id <pitId>', 'PIT 游标ID')
    .action(async (opts) => {
      const params = injectSearchParamsDefaults(parseParams(opts.params));
      withCursor(params, opts.cursor);
      if (opts.pitId) params.pitId = opts.pitId;
      const response = await makeRequest(`${BASE}/person/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 同事查询 ===
  cmd
    .command('person-colleague')
    .description('查询 LinkedIn 人员的同事')
    .requiredOption('--pid <pid>', '公司ID')
    .requiredOption('--hid <hid>', '人物ID')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = withCursor({ pid: opts.pid, hid: opts.hid }, opts.cursor);
      const response = await makeRequest(`${BASE}/person/colleague/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 校友查询 ===
  cmd
    .command('person-alumni')
    .description('查询 LinkedIn 人员的校友')
    .requiredOption('--hid <hid>', '人物ID')
    .requiredOption('--sid <sid>', '学校ID')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = withCursor({ hid: opts.hid, sid: opts.sid }, opts.cursor);
      const response = await makeRequest(`${BASE}/person/alumni/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 教育经历 ===
  cmd
    .command('person-education')
    .description('查询 LinkedIn 人员的教育经历')
    .requiredOption('--hid <hid>', '人物ID')
    .option('--cursor <cursor>', '分页游标')
    .option('--limit <limit>', '每页条数，默认20')
    .action(async (opts) => {
      const params: Record<string, any> = { hid: opts.hid };
      if (opts.limit) params.limit = parseInt(opts.limit, 10);
      withCursor(params, opts.cursor);
      const response = await makeRequest(`${BASE}/person/education/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 工作经历 ===
  cmd
    .command('person-experience')
    .description('查询 LinkedIn 人员的工作经历')
    .requiredOption('--hid <hid>', '人物ID')
    .option('--pid <pid>', '公司ID（可选）')
    .option('--cursor <cursor>', '分页游标')
    .option('--limit <limit>', '每页条数，默认20')
    .action(async (opts) => {
      const params: Record<string, any> = { hid: opts.hid };
      if (opts.pid) params.pid = opts.pid;
      if (opts.limit) params.limit = parseInt(opts.limit, 10);
      withCursor(params, opts.cursor);
      const response = await makeRequest(`${BASE}/person/experience/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 学校详情 ===
  cmd
    .command('person-school')
    .description('查询 LinkedIn 学校详情')
    .requiredOption('--sid <sid>', '学校ID')
    .action(async (opts) => {
      const response = await makeRequest(`${BASE}/person/school/detail`, { sid: opts.sid });

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });
}
