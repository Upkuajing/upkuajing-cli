/**
 * customs 命令组 — 海关数据（合并 3 个 skill）
 *
 * - stats: 贸易统计（/agent/customs/company/stats）
 * - trends: 月度趋势（/agent/customs/company/trends）
 * - partner: 伙伴分布（/agent/customs/company/partner/stats）
 *
 * 注意：stats 用离散参数，trends 和 partner 用 --params JSON。
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { parseParams } from '../helpers';

export function registerCustomsCommands(program: Command): void {
  const cmd = program
    .command('customs')
    .description('海关数据查询（贸易统计、月度趋势、伙伴分布）');

  // === 贸易统计 ===
  cmd
    .command('stats')
    .description('查询公司海关贸易统计（贸易笔数、重量、金额、伙伴数）')
    .requiredOption('--company-id <companyId>', '公司ID（如 100001）')
    .requiredOption('--company-type <companyType>', '公司类型（1：供应商，2：采购商）')
    .action(async (opts) => {
      const params = {
        companyId: opts.companyId,
        companyType: parseInt(opts.companyType, 10),
      };
      const response = await makeRequest('/agent/customs/company/stats', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 月度趋势 ===
  cmd
    .command('trends')
    .description('查询公司海关月度贸易趋势')
    .requiredOption('--params <json>', 'JSON格式查询参数，如 {"companyId":"100001","companyType":1,"dateStart":1700000000000,"dateEnd":1735689599999}')
    .action(async (opts) => {
      const params = parseParams(opts.params);
      const response = await makeRequest('/agent/customs/company/trends', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 伙伴分布 ===
  cmd
    .command('partner')
    .description('查询公司海关贸易伙伴分布（HS编码、产品分布、月度贸易日期）')
    .requiredOption('--params <json>', 'JSON格式查询参数，如 {"companyId":"100001","companyType":1,"dateStart":1700000000000,"dateEnd":1735689599999}')
    .action(async (opts) => {
      const params = parseParams(opts.params);
      const response = await makeRequest('/agent/customs/company/partner/stats', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });
}
