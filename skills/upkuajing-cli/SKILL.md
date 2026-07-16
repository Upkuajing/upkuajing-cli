---
name: upkuajing-cli
description: Upkuajing (跨境魔方) CLI provides customs trade data search, global company and people search, LinkedIn data query, map merchants search, email/SMS marketing, and contact validation. Run `up-cli --help` to explore all commands.
metadata: {"version":"1.0.0","homepage":"https://www.upkuajing.com","clawdbot":{"emoji":"🚀","requires":{"bins":["up-cli"],"env":["UPKUAJING_API_KEY"]},"primaryEnv":"UPKUAJING_API_KEY"}}
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
| `auth` | 账号管理（申请 key、查看账户、充值） |

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

## 探索更多

运行 `up-cli <命令组> --help` 查看每个命令组的子命令和参数说明。
