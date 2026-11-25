---
name: upkuajing-cli
description: Upkuajing (跨境魔方) CLI provides customs trade data search, global company and people search, LinkedIn data query, map merchants search, email/SMS marketing, and contact validation. Run `up-cli --help` to explore all commands.
metadata: {"version":"1.1.0","homepage":"https://www.upkuajing.com","clawdbot":{"emoji":"🚀","requires":{"bins":["up-cli"],"env":["UPKUAJING_API_KEY"]},"primaryEnv":"UPKUAJING_API_KEY"}}
---

# Upkuajing CLI

跨境魔方（Upkuajing）命令行工具，封装 OpenAPI 调用，面向开发者和 AI Agent。

## 能力概览

| 命令组 | 说明 |
|--------|------|
| `search` | 聚合搜索（跨数据源搜公司、人员、联系方式） |
| `depth-company` | 全球企业库深度数据（员工、股东、人员关系、教育/工作经历） |
| `linkedin` | LinkedIn 数据搜索与查询 |
| `customs` | 海关数据（贸易统计、月度趋势、伙伴分布） |
| `customs-trade` | 海关贸易搜索（公司列表、详情、联系方式、贸易记录） |
| `validation` | 联系方式验证（域名、邮箱、电话） |
| `email` | 邮件营销（发送、任务列表、任务记录） |
| `sms` | 短信营销（发送、任务列表、任务记录） |
| `map` | 地图商户搜索与地理数据 |
| `auth` | 账号管理（申请 key、查看账户、充值、套餐额度 `plan-quota`、档位 `plan-config`、定价 `price-info`） |
| `update` | 检查并更新 up-cli 到 npm 最新版本 |

## 安装与配置

```bash
# 安装
npm install -g upkuajing-cli

# 初始化（申请 API key + 释放引导 skill + 验证）
up-cli init
```

API key 存储在 `~/.upkuajing/.env`，也可通过环境变量 `UPKUAJING_API_KEY` 设置。

## 常用命令示例

```bash
# 查看完整命令列表
up-cli --help

# 账户信息
up-cli auth info

# 搜索公司（聚合搜索，复杂参数用 JSON）
up-cli search company --params '{"keyword":"电子"}'

# 全球企业库查员工
up-cli depth-company employee --pid US_12345

# LinkedIn 搜人
up-cli linkedin person-search --params '{"keyword":"张三"}'

# 海关贸易统计
up-cli customs stats --company-id 100001 --company-type 1

# 验证邮箱
up-cli validation email --emails test@example.com

# 国家列表（免认证）
up-cli map countries
```

## 参数格式说明

- **搜索类命令**（search/customs/customs-trade/map search）：用 `--params '{JSON}'` 传递复杂搜索条件，`--cursor` 翻页
- **简单命令**（depth-company employee 等）：用离散 flag 传递参数

## 套餐计费与余额降级

搜索/海关/地图类命令**默认走套餐**：CLI 自动携带 `"planMode": 2`，无需手动传。

- **套餐不可用**（无有效套餐或额度用完）：CLI 在业务执行前停止，不会产生扣费；stdout 会输出一行以 `PLAN_UNAVAILABLE ` 开头的单行 JSON，退出码为 **3**。**禁止自动重试**。
- **先询问用户**：用自然语言说明原因（无套餐 / 额度用完及恢复时间，JSON 的 `reasonText`、`resumeAt`、`askUser` 可直接转述），说明改用余额将按接口定价扣费（单价用 `up-cli auth price-info` 查询），然后等待用户在独立消息中明确回复。
- **用户同意**：用同一条命令加 `--plan-mode balance` 重跑（或环境变量 `UPKUAJING_PLAN_MODE=1`），成功后展示响应里的 `fee`（`apiCost` / `balance`，单位：分钱）。
- **用户拒绝**：本次不执行、不扣费；给出「稍后重试 / 升级套餐 / 使用余额」三个出口，同一轮不要重复弹窗。
- **改余额后仍余额不足**（错误码 95）：提示用户运行 `up-cli auth recharge` 充值并停止，不再重试。
- **批量调用前**：先用 `up-cli auth plan-quota` 预检额度；`available=0` 或目标窗口 `remaining=0` 时，直接先问是否用余额。
- **全局设置**：`up-cli config set-plan-mode balance|plan|auto` 把默认计费模式写入 `~/.upkuajing/.env`（与 API Key 同文件，配一次全局生效）；`up-cli config show` 查看生效值与来源；`up-cli config unset-plan-mode` 恢复接口默认。用户说"以后都用余额"时使用该命令。
- **取值优先级**：`--plan-mode`（`plan` / `balance` / `auto`，可放在命令任意位置）→ 环境变量 `UPKUAJING_PLAN_MODE`（`1`=余额、`2`=套餐、`0|off|none`=不传）→ `~/.upkuajing/.env` 的全局配置 → `--params` 中的 `planMode` → 接口默认值（搜索/海关/地图为 `2`，其他接口不传）。
- **禁止**静默改走余额，**禁止**向用户暴露内部错误码原文。

## 探索更多

运行 `up-cli <命令组> --help` 查看每个命令组的子命令和参数说明。
