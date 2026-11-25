# upkuajing-cli

[中文文档](./README-zh.md)

A B2B lead generation and cross-border trade CLI — search customs trade data, global companies and professionals, LinkedIn profiles; run email/SMS outreach campaigns and validate contact info. Designed for developers and AI agents.

## What It Does

**Find buyers and suppliers**
- Search customs trade data by product, HS code, company name, or supplier/buyer
- View trade statistics, monthly trends, and partner distribution
- Get company details and contact information from trade records

**Research companies and people**
- Search across multiple data sources (Apollo, customs, depth company, LinkedIn) in one query
- Deep-dive into company employees, shareholders, and org structure
- Look up a person's colleagues, alumni, education history, and work experience
- Query LinkedIn companies and professionals

**Reach out and validate**
- Send bulk email campaigns with delivery tracking
- Send bulk SMS campaigns with delivery tracking
- Validate email addresses, phone numbers, and domains before reaching out

**Map and geography**
- Search map merchants by keyword, location, and radius
- Browse countries, provinces, and cities (no API key required)

## Installation

```bash
npm install -g upkuajing-cli
```

## Quick Start

```bash
# One-step setup (apply API key + release guide skill to your AI agent + verify)
up-cli init

# See all commands
up-cli --help
```

## Command Overview

| Command | Description |
|---------|-------------|
| `search` | Aggregated search across data sources (companies, people, contacts) |
| `depth-company` | Global company deep data (employees, shareholders, people relationships, education/experience) |
| `linkedin` | LinkedIn company and people search |
| `customs` | Customs data (trade stats, monthly trends, partner distribution) |
| `customs-trade` | Customs trade search (company list, details, contacts, trade records) |
| `validation` | Contact validation (domain, email, phone) |
| `email` | Email marketing (send, task list, task records) |
| `sms` | SMS marketing (send, task list, task records) |
| `map` | Map merchant search and geography data |
| `auth` | Account management (apply key, view balance, recharge, plan quota, pricing) |
| `config` | Global settings (default billing mode, stored in `~/.upkuajing/.env`) |
| `init` | One-step CLI setup |

## Examples

```bash
# Account info
up-cli auth info

# Search companies (aggregated, complex params as JSON)
up-cli search company --params '{"keyword":"electronics"}'

# Company employees from global database
up-cli depth-company employee --pid US_12345

# Search LinkedIn professionals
up-cli linkedin person-search --params '{"keyword":"John"}'

# Customs trade statistics
up-cli customs stats --company-id 100001 --company-type 1

# Validate emails
up-cli validation email --emails test@example.com

# Country list (no auth required)
up-cli map countries
```

## Parameter Format

- **Search commands** (search / customs / customs-trade / map search): pass complex search criteria via `--params '{JSON}'`, paginate with `--cursor`
- **Simple commands** (depth-company employee, etc.): use discrete flags

## Billing (plan mode)

Search, customs and map calls are **plan-first**: the CLI automatically sends `"planMode": 2`.

- **Plan unavailable** (no plan or quota exhausted): the CLI stops before executing, prints one `PLAN_UNAVAILABLE {JSON}` line on stdout, and exits with code **3**. Nothing is charged.
- **Ask the user first**: explain the reason in plain language (no plan / quota exhausted, plus the reset time when known), state that continuing will be charged to the API balance (unit price: `up-cli auth price-info`), then wait for an explicit answer in a separate message.
- **User agrees**: rerun the same command with `--plan-mode balance` (or `UPKUAJING_PLAN_MODE=1`) and report `fee` from the response.
- **User declines**: stop; nothing is executed or charged.
- **Check quota up front**: `up-cli auth plan-quota`; tier limits: `up-cli auth plan-config`.
- **Switch for one call**: `up-cli --plan-mode balance <command>` (`--plan-mode plan|balance|auto`, accepted anywhere in the command line).
- **Global default**: `up-cli config set-plan-mode balance|plan|auto` (stored in `~/.upkuajing/.env` next to the API key); `up-cli config show` prints the effective mode and its source; `up-cli config unset-plan-mode` restores the endpoint default.
- Resolution order: `--plan-mode` flag → `UPKUAJING_PLAN_MODE` env var → `UPKUAJING_PLAN_MODE` in `~/.upkuajing/.env` → `planMode` inside `--params` → endpoint default (`2` for search/customs/map, absent otherwise).

## API Key

- Priority: environment variable `UPKUAJING_API_KEY` → `~/.upkuajing/.env` file
- Apply: `up-cli auth login` or `up-cli init`
- Recharge: `up-cli auth recharge`
- The same file stores the global billing mode: `up-cli config set-plan-mode plan|balance|auto`

## Requirements

- Node.js >= 18

## Links

- [Website](https://www.upkuajing.com)
- [GitHub](https://github.com/Upkuajing)
