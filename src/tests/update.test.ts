/**
 * update 命令测试
 *
 * - isNewer：semver 版本比较（纯函数单元测试）
 * - getLocalVersion：读取本地 package.json 版本
 * - getLatestVersion：真实查询 npm 官方 registry
 *
 * 注：upkuajing-cli 尚未发布到 npm 时，getLatestVersion 返回 404，
 *     测试接受 404（包未发布）或版本号（包已发布）两种情况。
 *     update 命令端到端的"执行 npm install -g"不测（全局安装有副作用）。
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { isNewer, getLatestVersion } from '../commands/update';
import { getLocalVersion } from '../helpers';

describe('update 命令', () => {
  describe('isNewer 版本比较', () => {
    it('远程版本更新时返回 true', () => {
      assert.strictEqual(isNewer('1.0.0', '1.0.1'), true);
      assert.strictEqual(isNewer('1.0.0', '1.1.0'), true);
      assert.strictEqual(isNewer('1.0.0', '2.0.0'), true);
    });

    it('远程版本相同或更旧时返回 false', () => {
      assert.strictEqual(isNewer('1.0.0', '1.0.0'), false);
      assert.strictEqual(isNewer('1.0.1', '1.0.0'), false);
      assert.strictEqual(isNewer('2.0.0', '1.9.9'), false);
    });

    it('主版本号优先于次版本号', () => {
      assert.strictEqual(isNewer('1.9.9', '2.0.0'), true);
      assert.strictEqual(isNewer('2.0.0', '1.9.9'), false);
    });
  });

  it('getLocalVersion - 返回本地 package.json 版本（x.y.z 格式）', () => {
    const v = getLocalVersion();
    assert.match(v, /^\d+\.\d+\.\d+$/, '版本应为 x.y.z 格式');
  });

  it('getLatestVersion - 真实查询 npm registry', async () => {
    // upkuajing-cli 未发布时返回 404（可接受）；已发布时返回版本号
    try {
      const v = await getLatestVersion();
      assert.match(v, /^\d+\.\d+\.\d+$/, '版本应为 x.y.z 格式');
    } catch (e: any) {
      assert.ok(
        e.message.includes('404'),
        `预期 404（包未发布）或成功，实际错误：${e.message}`,
      );
    }
  });
});
