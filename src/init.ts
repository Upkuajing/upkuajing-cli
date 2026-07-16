/**
 * init 向导 — 一键完成 CLI 配置
 *
 * 三步：
 * 1. 检查/申请 API key
 * 2. 释放引导 skill 到 Agent 目录（通过 Vercel skills 工具）
 * 3. 验证 API key 有效性
 *
 * skill 释放：从 npm 包内的 skills/upkuajing-cli/ 目录，通过 `npx skills add`
 * 释放到系统已安装的 Agent 目录。skills 工具自动检测 73 个 Agent，无需硬编码。
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { Command } from 'commander';
import { makeRequest } from './client';
import { hasApiKey, writeApiKey, getEnvFilePath } from './config';

/**
 * 通过 Vercel skills 工具释放引导 skill 到 Agent 目录。
 *
 * skill 内容来自 npm 包内的 skills/upkuajing-cli/（打包进 npm，不从远程下载）。
 * skills 工具负责检测系统已安装的 Agent 并释放到对应目录。
 *
 * npx -y 自动确认安装 skills 包本身，不提示用户；
 * skills add 不加 -y，保留用户交互式选择释放到哪些 Agent。
 */
function releaseSkill(): boolean {
  // 引导 skill 源文件在包内的路径
  const packageRoot = path.dirname(__dirname);
  const sourceSkillDir = path.join(packageRoot, 'skills', 'upkuajing-cli');

  if (!fs.existsSync(path.join(sourceSkillDir, 'SKILL.md'))) {
    console.error('  [跳过] 引导 skill 文件不存在：' + sourceSkillDir);
    return false;
  }

  try {
    // npx -y: 自动安装 skills 包，不提示 "Ok to proceed?"
    // skills add <path> -g: 释放到全局 Agent skill 目录，交互式选择 Agent
    // 不设超时，交互式流程需要用户操作时间
    execFileSync('npx', ['-y', 'skills', 'add', sourceSkillDir, '-g'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    return true;
  } catch (e: any) {
    // 用户取消不一定是失败，skill 可能已安装成功
    console.error('  skill 释放流程结束（如未成功，可手动重试）');
    console.error('  手动运行：npx skills add ' + sourceSkillDir + ' -g');
    return false;
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('一键完成 CLI 配置（检查/申请 API key、释放引导 skill、验证）')
    .action(async () => {
      console.log('Upkuajing CLI 初始化向导\n');

      // Step 1: 检查/申请 API key
      console.log('步骤 1/3: 检查 API key');
      if (hasApiKey()) {
        console.log('  已在 ' + getEnvFilePath() + ' 找到 API key');
      } else {
        console.log('  未找到 API key，正在申请新密钥...');
        const response = await makeRequest('/agent/auth/create', {}, false);

        if (response.code !== 0) {
          console.error('  API密钥申请失败：' + (response.msg || '未知错误'));
          process.exit(1);
        }

        const apiKey = response.data?.apiKey;
        if (!apiKey) {
          console.error('  API密钥申请失败：服务器响应格式异常，未返回apiKey。');
          process.exit(1);
        }

        writeApiKey(apiKey);
        console.log('  API密钥申请成功！已保存到：' + getEnvFilePath());
      }

      // Step 2: 释放引导 skill
      console.log('\n步骤 2/3: 释放引导 skill');
      console.log('  CLI 本身只是命令行工具，AI Agent 并不知道它的存在。');
      console.log('  引导 skill 是一份给 Agent 看的说明文档，告诉它有一个 up-cli 工具、');
      console.log('  能做哪些事情、怎么调用。释放到 Agent 的 skill 目录后，');
      console.log('  Agent 在你提出相关需求时会自动调用 CLI。');
      releaseSkill();

      // Step 3: 验证
      console.log('\n步骤 3/3: 验证');
      const response = await makeRequest('/agent/auth/info', {});

      if (response.code !== 0) {
        console.error('  API key 验证失败：' + (response.msg || '未知错误'));
        process.exit(1);
      }

      const data = response.data || {};
      const apiBalance = data.apiBalance ?? 0;
      console.log('  API key 验证通过');
      console.log('  开放平台账号：' + (data.apiAccount || '(空)'));
      console.log('  账号余额：' + apiBalance + '分钱(RMB)');

      console.log('\n安装完成！');
      console.log('和你的 AI 工具说："up-cli 能帮我做什么？"');
      console.log('或运行 up-cli --help 查看完整命令列表');
    });
}
