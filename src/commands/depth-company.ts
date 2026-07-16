/**
 * depth-company 命令组 — 全球企业库深度数据
 *
 * 数据源：depth_company，ID 为独立体系（如 US_12345、H_67890、S_001）。
 * 与聚合搜索（search）的 ID 不互通。
 *
 * endpoint 前缀：/agent/search/depth_company/
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { parseParams, withCursor, injectSearchParamsDefaults } from '../helpers';

const BASE = '/agent/search/depth_company';

export function registerDepthCompanyCommands(program: Command): void {
  const cmd = program
    .command('depth-company')
    .description('全球企业库深度数据（depth_company 数据源，ID 独立体系）');

  // === 公司搜索 ===
  cmd
    .command('company-search')
    .description('搜索全球企业库中的公司')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标，翻页时传入上一次响应返回的 cursor')
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

  // === 员工列表 ===
  cmd
    .command('employee')
    .description('查询公司员工列表')
    .requiredOption('--pid <pid>', '公司ID（如 US_12345）')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = withCursor({ pid: opts.pid }, opts.cursor);
      const response = await makeRequest(`${BASE}/company/employee/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 股东列表 ===
  cmd
    .command('shareholder')
    .description('查询公司股东列表')
    .requiredOption('--pid <pid>', '公司ID')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = withCursor({ pid: opts.pid }, opts.cursor);
      const response = await makeRequest(`${BASE}/company/shareholder/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 人员搜索 ===
  cmd
    .command('person-search')
    .description('搜索全球企业库中的人员')
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
    .description('查询人员的同事')
    .requiredOption('--pid <pid>', '公司ID（如 US_12345）')
    .requiredOption('--hid <hid>', '人物ID（如 H_67890）')
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
    .description('查询人员的校友')
    .requiredOption('--hid <hid>', '人物ID（如 H_67890）')
    .requiredOption('--sid <sid>', '学校ID（如 S_001）')
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
    .description('查询人员的教育经历')
    .requiredOption('--hid <hid>', '人物ID（如 H_67890）')
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
    .description('查询人员的工作经历')
    .requiredOption('--hid <hid>', '人物ID（如 H_67890）')
    .option('--pid <pid>', '公司ID（可选，如 US_12345）')
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
    .description('查询学校详情')
    .requiredOption('--sid <sid>', '学校ID（如 S_001）')
    .action(async (opts) => {
      const response = await makeRequest(`${BASE}/person/school/detail`, { sid: opts.sid });

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });
}
