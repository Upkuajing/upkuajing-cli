/**
 * customs-trade 命令组 — 海关贸易搜索
 *
 * endpoint 前缀：/agent/customs/
 * - search / trade-list：列表搜索，--params JSON + --cursor
 * - detail / contact：批量查询，--company-ids int 数组，上限 20
 *
 * 注意：海关的 company ID 是整数（不同于聚合搜索的字符串 pids/hids）。
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { parseParams, withCursor } from '../helpers';

const BATCH_LIMIT = 20;

export function registerCustomsTradeCommands(program: Command): void {
  const cmd = program
    .command('customs-trade')
    .description('海关贸易搜索（公司列表、详情、联系方式、贸易记录）');

  // === 公司列表搜索 ===
  cmd
    .command('search')
    .description('搜索海关贸易公司（params 须包含 companyType：1=供应商，2=采购商）')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = parseParams(opts.params);
      // 校验 companyType（API 必填：1=供应商，2=采购商）
      if (params.companyType !== 1 && params.companyType !== 2) {
        console.error('错误：params 中必须包含 companyType（1=供应商，2=采购商）');
        process.exit(1);
      }
      withCursor(params, opts.cursor);
      const response = await makeRequest('/agent/customs/company/list', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 公司详情批量 ===
  cmd
    .command('detail')
    .description('批量获取海关公司详情')
    .requiredOption('--company-ids <ids...>', '公司ID列表（空格分隔，整数，上限 20）')
    .action(async (opts) => {
      if (opts.companyIds.length > BATCH_LIMIT) {
        console.error(`错误：最多 ${BATCH_LIMIT} 个ID，当前 ${opts.companyIds.length} 个`);
        process.exit(1);
      }
      const companyIds = opts.companyIds.map((id: string) => parseInt(id, 10));
      const response = await makeRequest('/agent/customs/company/detail/batch', { companyIds });

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 联系方式批量 ===
  cmd
    .command('contact')
    .description('批量获取海关公司联系方式')
    .requiredOption('--company-ids <ids...>', '公司ID列表（空格分隔，整数，上限 20）')
    .action(async (opts) => {
      if (opts.companyIds.length > BATCH_LIMIT) {
        console.error(`错误：最多 ${BATCH_LIMIT} 个ID，当前 ${opts.companyIds.length} 个`);
        process.exit(1);
      }
      const companyIds = opts.companyIds.map((id: string) => parseInt(id, 10));
      const response = await makeRequest('/agent/customs/company/contact/batch', { companyIds });

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 贸易记录 ===
  cmd
    .command('trade-list')
    .description('搜索海关贸易记录')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = parseParams(opts.params);
      withCursor(params, opts.cursor);
      const response = await makeRequest('/agent/customs/trade/list', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });
}
