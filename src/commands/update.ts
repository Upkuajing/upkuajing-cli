/**
 * update 命令 - 检查并更新 CLI 到 npm 最新版本
 *
 * 从 npm 官方 registry 查最新版本（不走本地镜像，避免同步延迟），
 * 与本地版本对比，有新版则执行 npm install -g 更新。
 *
 * 注意：查版本固定用官方 registry.npmjs.org，更新安装走本地 npm config。
 */

import { Command } from 'commander';
import { execFileSync } from 'child_process';
import { getLocalVersion } from '../helpers';

const PACKAGE_NAME = 'upkuajing-cli';
const REGISTRY_URL = 'https://registry.npmjs.org';

/**
 * 查询 npm 官方 registry 的最新版本。
 *
 * 固定走官方源，不受本地 npm 镜像配置影响（镜像有同步延迟，会查到旧版本）。
 */
export async function getLatestVersion(): Promise<string> {
  const url = `${REGISTRY_URL}/${PACKAGE_NAME}/latest`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as { version: string };
  if (!data.version) {
    throw new Error('响应未包含 version 字段');
  }
  return data.version;
}

/**
 * 比较 semver 版本，返回 true 表示 remote 比 local 新。
 * 简单实现，仅支持 x.y.z 数字格式。
 */
export function isNewer(local: string, remote: string): boolean {
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10));
  const [a1, a2, a3] = parse(local);
  const [b1, b2, b3] = parse(remote);
  if (b1 !== a1) return b1 > a1;
  if (b2 !== a2) return b2 > a2;
  return b3 > a3;
}

export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('检查并更新 up-cli 到 npm 最新版本')
    .action(async () => {
      const local = getLocalVersion();
      console.log(`当前版本：${local}`);

      let latest: string;
      try {
        latest = await getLatestVersion();
      } catch (e: any) {
        console.error(`查询最新版本失败：${e.message}`);
        console.error(`可手动运行：npm install -g ${PACKAGE_NAME}@latest`);
        process.exit(1);
        return; // unreachable，满足 TS
      }

      console.log(`最新版本：${latest}`);

      if (!isNewer(local, latest)) {
        console.log('已是最新版本，无需更新。');
        return;
      }

      console.log('发现新版本，正在更新...');
      try {
        execFileSync('npm', ['install', '-g', `${PACKAGE_NAME}@latest`], {
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });
        console.log('更新完成。');
      } catch (e: any) {
        console.error('自动更新失败，请手动运行：npm install -g ' + PACKAGE_NAME + '@latest');
        process.exit(1);
      }
    });
}
