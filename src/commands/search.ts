/**
 * search 命令组 — 聚合搜索（跨数据源，ID 为各源自有）
 *
 * 与 depth-company 的区别：聚合搜索跨多数据源，搜到的 ID 是各数据源自己的 ID，
 * 不能用于 depth-company 的深度查询（ID 体系不互通）。
 *
 * endpoint 前缀：/agent/search/
 * - company / person：列表搜索，--params JSON + --cursor
 * - company-batch / person-batch / contact：批量详情，数组参数，上限 20
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { parseParams, withCursor, injectSearchParamsDefaults } from '../helpers';

const BASE = '/agent/search';
const BATCH_LIMIT = 20;

export function registerSearchCommands(program: Command): void {
  const cmd = program
    .command('search')
    .description('聚合搜索（跨数据源，ID 为各源自有）');

  // === 公司搜索 ===
  cmd
    .command('company')
    .description('聚合搜索公司（按名称、行业、产品等）')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = injectSearchParamsDefaults(parseParams(opts.params));
      withCursor(params, opts.cursor);
      const response = await makeRequest(`${BASE}/company/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 公司信息批量 ===
  cmd
    .command('company-batch')
    .description('批量获取公司详情')
    .requiredOption('--pids <pids...>', '公司ID列表（空格分隔，上限 20）')
    .action(async (opts) => {
      if (opts.pids.length > BATCH_LIMIT) {
        console.error(`错误：最多 ${BATCH_LIMIT} 个ID，当前 ${opts.pids.length} 个`);
        process.exit(1);
      }
      const response = await makeRequest(`${BASE}/company/info/batch`, { pids: opts.pids });

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 人员搜索 ===
  cmd
    .command('person')
    .description('聚合搜索人员（按姓名、职位、学校等）')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = injectSearchParamsDefaults(parseParams(opts.params));
      withCursor(params, opts.cursor);
      const response = await makeRequest(`${BASE}/person/list`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 人员信息批量 ===
  cmd
    .command('person-batch')
    .description('批量获取人员详情')
    .requiredOption('--hids <hids...>', '人物ID列表（空格分隔，上限 20）')
    .action(async (opts) => {
      if (opts.hids.length > BATCH_LIMIT) {
        console.error(`错误：最多 ${BATCH_LIMIT} 个ID，当前 ${opts.hids.length} 个`);
        process.exit(1);
      }
      const response = await makeRequest(`${BASE}/person/info/batch`, { hids: opts.hids });

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 联系方式批量 ===
  cmd
    .command('contact')
    .description('批量获取联系方式（邮箱、电话、WhatsApp）')
    .requiredOption('--bus-ids <ids...>', '公司ID或人物ID列表（空格分隔，上限 20）')
    .requiredOption('--bus-type <type>', '业务类型（1=公司，2=人物）')
    .action(async (opts) => {
      if (opts.busIds.length > BATCH_LIMIT) {
        console.error(`错误：最多 ${BATCH_LIMIT} 个ID，当前 ${opts.busIds.length} 个`);
        process.exit(1);
      }
      const params = {
        bus_ids: opts.busIds,
        bus_type: parseInt(opts.busType, 10),
      };
      const response = await makeRequest(`${BASE}/contact/batch`, params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });
}
