# upkuajing-cli

[English](./README.md)

外贸获客与跨境贸易 CLI — 搜索海关贸易数据、全球企业与人员、LinkedIn 档案；发送邮件/短信营销触达，验证联系方式有效性。面向开发者和 AI Agent。

## 能做什么

**找买家和供应商**
- 按产品、HS 编码、公司名、供应商/采购商搜索海关贸易数据
- 查看贸易统计、月度趋势、伙伴分布
- 从贸易记录中获取公司详情和联系方式

**调研公司和人员**
- 一次查询跨多个数据源（Apollo、海关、全球企业库、LinkedIn）聚合搜索
- 深入查看公司员工、股东、组织架构
- 查询一个人的同事、校友、教育背景、工作经历
- 搜索 LinkedIn 公司和职业人士

**触达和验证**
- 发送批量邮件营销，跟踪送达状态
- 发送批量短信营销，跟踪送达状态
- 在触达前验证邮箱地址、电话号码、域名有效性

**地图与地理数据**
- 按关键词、位置、半径搜索地图商户
- 浏览国家、省份、城市（无需 API key）

## 安装

```bash
npm install -g upkuajing-cli
```

## 快速开始

```bash
# 一键初始化（申请 API key + 释放引导 skill 到 AI Agent + 验证）
up-cli init

# 查看完整命令列表
up-cli --help
```

## 命令概览

| 命令组 | 说明 |
|--------|------|
| `search` | 聚合搜索（跨数据源搜公司、人员、联系方式） |
| `depth-company` | 全球企业库深度数据（员工、股东、人员关系、教育/工作经历） |
| `linkedin` | LinkedIn 公司和人员搜索 |
| `customs` | 海关数据（贸易统计、月度趋势、伙伴分布） |
| `customs-trade` | 海关贸易搜索（公司列表、详情、联系方式、贸易记录） |
| `validation` | 联系方式验证（域名、邮箱、电话） |
| `email` | 邮件营销（发送、任务列表、任务记录） |
| `sms` | 短信营销（发送、任务列表、任务记录） |
| `map` | 地图商户搜索与地理数据 |
| `auth` | 账号管理（申请 key、查看账户、充值） |
| `init` | 一键完成 CLI 配置 |

## 常用示例

```bash
# 账户信息
up-cli auth info

# 聚合搜索公司（复杂参数用 JSON）
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

## 参数格式

- **搜索类命令**（search / customs / customs-trade / map search）：用 `--params '{JSON}'` 传递复杂搜索条件，`--cursor` 翻页
- **简单命令**（depth-company employee 等）：用离散 flag 传递参数

## API Key

- 优先级：环境变量 `UPKUAJING_API_KEY` → `~/.upkuajing/.env` 文件
- 申请：`up-cli auth login` 或 `up-cli init`
- 充值：`up-cli auth recharge`

## 环境要求

- Node.js >= 18

## 链接

- [官网](https://www.upkuajing.com)
- [GitHub](https://github.com/Upkuajing)
