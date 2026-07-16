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
| `auth` | Account management (apply key, view balance, recharge) |
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

## API Key

- Priority: environment variable `UPKUAJING_API_KEY` → `~/.upkuajing/.env` file
- Apply: `up-cli auth login` or `up-cli init`
- Recharge: `up-cli auth recharge`

## Requirements

- Node.js >= 18

## Links

- [Website](https://www.upkuajing.com)
- [GitHub](https://github.com/Upkuajing)
