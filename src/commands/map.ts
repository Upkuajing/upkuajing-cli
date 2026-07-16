/**
 * map 命令组 — 地图商户
 *
 * - search: 商户搜索（/agent/map/search），--params JSON + --cursor
 * - countries / provinces / cities: 地理列表（/agent/common/xxx/list），
 *   require_auth=false（唯一免认证接口）
 *
 * 注意：地理列表接口无需 API key，是公开数据。
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output, coverFeeInfo } from '../output';
import { parseParams, withCursor } from '../helpers';

export function registerMapCommands(program: Command): void {
  const cmd = program
    .command('map')
    .description('地图商户搜索与地理数据');

  // === 商户搜索 ===
  cmd
    .command('search')
    .description('搜索地图商户')
    .requiredOption('--params <json>', '搜索参数JSON字符串')
    .option('--cursor <cursor>', '分页游标')
    .action(async (opts) => {
      const params = parseParams(opts.params);
      withCursor(params, opts.cursor);
      const response = await makeRequest('/agent/map/search', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data, fee: coverFeeInfo(response.fee) });
    });

  // === 国家列表（免认证） ===
  cmd
    .command('countries')
    .description('获取国家列表（无需 API key）')
    .action(async () => {
      const response = await makeRequest('/agent/common/country/list', {}, false);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data });
    });

  // === 省份列表（免认证） ===
  cmd
    .command('provinces')
    .description('获取省份列表（无需 API key）')
    .requiredOption('--country-id <id>', '国家ID')
    .action(async (opts) => {
      const response = await makeRequest('/agent/common/province/list', { id: parseInt(opts.countryId, 10) }, false);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data });
    });

  // === 城市列表（免认证） ===
  cmd
    .command('cities')
    .description('获取城市列表（无需 API key）')
    .requiredOption('--country-id <id>', '国家ID')
    .action(async (opts) => {
      const response = await makeRequest('/agent/common/city/list', { id: parseInt(opts.countryId, 10) }, false);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output({ data: response.data });
    });
}
