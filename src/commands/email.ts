/**
 * email 命令组 — 邮件营销
 *
 * endpoint 前缀：/agent/mail/
 * - send: 发送邮件，条件参数构建，snake_case → camelCase 映射
 * - task-list: 任务列表，分页 + 过滤
 * - task-records: 任务记录，分页 + 过滤（status 枚举和 task-list 不同）
 *
 * 注意：--emails 是 JSON 数组字符串（如 '["a@x.com","b@y.com"]'），
 * 非空格分隔。
 */

import { Command } from 'commander';
import { makeRequest, handleApiError } from '../client';
import { output } from '../output';
import { parseJsonArray } from '../helpers';

export function registerEmailCommands(program: Command): void {
  const cmd = program
    .command('email')
    .description('邮件营销（发送邮件、任务列表、任务记录）');

  // === 发送邮件 ===
  cmd
    .command('send')
    .description('发送邮件')
    .requiredOption('--subject <subject>', '邮件主题（最长250字符）')
    .requiredOption('--content <content>', '邮件内容')
    .requiredOption('--emails <json>', '收件人邮箱列表（JSON数组格式，如 \'["a@x.com","b@y.com"]\'）')
    .option('--send-name <name>', '发送名称（默认 service，最长50字符）')
    .option('--email-name <name>', '邮件名（默认 service，最长50字符）')
    .option('--reply-email <email>', '回复邮箱')
    .action(async (opts) => {
      const emails = parseJsonArray(opts.emails, 'emails');
      const params: Record<string, any> = {
        subject: opts.subject,
        content: opts.content,
        emails,
      };
      if (opts.sendName) params.sendName = opts.sendName;
      if (opts.emailName) params.emailName = opts.emailName;
      if (opts.replyEmail) params.replyEmail = opts.replyEmail;

      const response = await makeRequest('/agent/mail/send', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output(response);
    });

  // === 任务列表 ===
  cmd
    .command('task-list')
    .description('查询邮件任务列表')
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

      const response = await makeRequest('/agent/mail/task/list', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output(response);
    });

  // === 任务记录 ===
  cmd
    .command('task-records')
    .description('查询邮件任务发送记录')
    .requiredOption('--task-id <id>', '任务ID')
    .option('--page-no <no>', '页码（默认1）', '1')
    .option('--page-size <size>', '页大小（默认10）', '10')
    .option('--start-time <ts>', '开始时间（秒级时间戳）')
    .option('--end-time <ts>', '结束时间（秒级时间戳）')
    .option('--status <status>', '发送状态（1-发送中 2-成功 3-失败 4-已读）')
    .action(async (opts) => {
      const params: Record<string, any> = {
        taskId: parseInt(opts.taskId, 10),
        pageNo: parseInt(opts.pageNo, 10),
        pageSize: parseInt(opts.pageSize, 10),
      };
      if (opts.startTime) params.startTime = parseInt(opts.startTime, 10);
      if (opts.endTime) params.endTime = parseInt(opts.endTime, 10);
      if (opts.status) params.status = parseInt(opts.status, 10);

      const response = await makeRequest('/agent/mail/task/record/list', params);

      if (response.code !== 0) {
        handleApiError(response);
      }
      output(response);
    });
}
