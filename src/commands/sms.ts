/**
 * sms 命令组 — 短信营销
 *
 * endpoint 前缀：/agent/sms/
 * 结构与 email 完全对称，区别：
 * - send 参数不同（content + phones JSON 数组 + channel_type）
 * - task-records status 枚举不同（0-待发送 1-发送中 2-成功 3-失败）
 *
 * 注意：--phones 是 JSON 数组字符串（如 '["13800138000","13800138001"]'）。
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output } from '../output';
import { parseJsonArray } from '../helpers';

export function registerSmsCommands(program: Command): void {
  const cmd = program
    .command('sms')
    .description('短信营销（发送短信、任务列表、任务记录）');

  // === 发送短信 ===
  cmd
    .command('send')
    .description('发送短信')
    .requiredOption('--content <content>', '短信内容')
    .requiredOption('--phones <json>', '手机号列表（JSON数组格式，如 \'["13800138000","13800138001"]\'）')
    .option('--channel-type <type>', '发送类型（0-单向发送 1-双向，支持接收回复）', '0')
    .action(async (opts) => {
      const phones = parseJsonArray(opts.phones, 'phones');
      const params = {
        content: opts.content,
        phones,
        channelType: parseInt(opts.channelType, 10),
      };

      const response = await makeRequest('/agent/sms/send', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output(response);
    });

  // === 任务列表 ===
  cmd
    .command('task-list')
    .description('查询短信任务列表')
    .option('--page-no <no>', '页码（默认1）', '1')
    .option('--page-size <size>', '页大小（默认10）', '10')
    .option('--start-time <ts>', '开始时间（秒级时间戳）')
    .option('--end-time <ts>', '结束时间（秒级时间戳）')
    .option('--status <status>', '发送状态（0-待发送 1-发送中 2-发送完成）')
    .action(async (opts) => {
      const params: Record<string, any> = {
        pageNo: parseInt(opts.pageNo, 10),
        pageSize: parseInt(opts.pageSize, 10),
      };
      if (opts.startTime) params.startTime = parseInt(opts.startTime, 10);
      if (opts.endTime) params.endTime = parseInt(opts.endTime, 10);
      if (opts.status) params.status = parseInt(opts.status, 10);

      const response = await makeRequest('/agent/sms/task/list', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output(response);
    });

  // === 任务记录 ===
  cmd
    .command('task-records')
    .description('查询短信任务发送记录')
    .requiredOption('--task-id <id>', '任务ID')
    .option('--page-no <no>', '页码（默认1）', '1')
    .option('--page-size <size>', '页大小（默认10）', '10')
    .option('--start-time <ts>', '开始时间（秒级时间戳）')
    .option('--end-time <ts>', '结束时间（秒级时间戳）')
    .option('--status <status>', '发送状态（0-待发送 1-发送中 2-成功 3-失败）')
    .action(async (opts) => {
      const params: Record<string, any> = {
        taskId: parseInt(opts.taskId, 10),
        pageNo: parseInt(opts.pageNo, 10),
        pageSize: parseInt(opts.pageSize, 10),
      };
      if (opts.startTime) params.startTime = parseInt(opts.startTime, 10);
      if (opts.endTime) params.endTime = parseInt(opts.endTime, 10);
      if (opts.status) params.status = parseInt(opts.status, 10);

      const response = await makeRequest('/agent/sms/task/record/list', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output(response);
    });
}
