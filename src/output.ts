/**
 * 输出格式化 — 从 Python common.py 的 print_json_output / cover_fee_info 翻译
 */

/**
 * 将数据以格式化的 JSON 打印到 stdout。
 *
 * 对应 Python common.py:print_json_output。
 * indent=2，不转义非 ASCII 字符。
 */
export function output(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * 将 API 响应的费用信息转为利于 AI 理解的格式。
 *
 * 对应 Python common.py:cover_fee_info。
 * 余额单位为"分钱（RMB）"。
 */
export function coverFeeInfo(fee: any): Record<string, string> {
  if (!fee) {
    return {};
  }
  const apiCost = fee.apiCost ?? 0;
  const balance = fee.accountBalance ?? 0;
  return {
    apiCost: `${apiCost}分钱(RMB)`,
    balance: `${balance}分钱(RMB)`,
  };
}
