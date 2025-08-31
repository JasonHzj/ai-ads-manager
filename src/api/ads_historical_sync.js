/**
 * =======================================================================
 * Google Ads 脚本 - 每日历史性能数据同步器
 *
 * 作用:
 * - 这个脚本应该在每日凌晨运行一次 (例如 3 AM)。
 * - 它会查询所有子账户【前一天】的最终性能数据 (展示, 点击, 消费等)。
 * - 将这些数据打包，通过 POST 请求发送到您的后端API接口，
 * 用于填充 `ads_historical_performance` 数据表。
 *
 * API端点: /api/ads/receive-historical-data
 * =======================================================================
 */
function main() {
  // --- 配置区域 ---
  // 重要: 请将下面的地址和密钥替换为您自己的真实信息。
  var YOUR_BASE_URL = 'https://711a45bdd2e7.ngrok-free.app/api'; // 请确保这是您正确的API地址
  var YOUR_SECRET_KEY =
    '07efb477b36c36b5055c2630578ee4eeeb6cfb1e33f89b3c2eb7cb319a5baf0d'; // 请确保这是您正确的密钥

  Logger.log('--- 开始执行每日历史数据同步任务 ---');

  const managerAccount = AdsApp.currentAccount();
  const managerAccountId = managerAccount.getCustomerId();
  const managerAccountName = managerAccount.getName();
  const postUrl = YOUR_BASE_URL + '/ads/receive-historical-data';

  var historicalData = [];

  try {
    // 使用 AdsApp.report API 来高效获取所有子账户前一天的数据
    var report = AdsApp.report(
      'SELECT customer.id, customer.descriptive_name, customer.currency_code, segments.date, ' +
      'metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros ' +
      'FROM customer ' +
      // 关键: 查询 YESTERDAY (昨天) 的数据
      'WHERE segments.date DURING YESTERDAY'
    );

    var rows = report.rows();
    while (rows.hasNext()) {
      var row = rows.next();
      historicalData.push({
        manager_id: managerAccountId,
        manager_name: managerAccountName,
        sub_account_id: row['customer.id'],
        sub_account_name: row['customer.descriptive_name'],
        currency_code: row['customer.currency_code'],
        data_date: row['segments.date'],
        impressions: parseInt(row['metrics.impressions'], 10),
        clicks: parseInt(row['metrics.clicks'], 10),
        ctr: parseFloat(row['metrics.ctr']),
        // API返回的CPC是微单位，需要除以1,000,000转换成标准单位
        cpc: parseFloat(row['metrics.average_cpc']) / 1000000,
        cost_micros: parseInt(row['metrics.cost_micros'], 10)
      });
    }

    Logger.log('成功获取了 ' + historicalData.length + ' 条历史性能记录。');

  } catch (e) {
    Logger.log('错误: 查询历史性能报告失败: ' + e.toString());
    // 如果报告失败，脚本将终止，不会发送不完整的数据
    return;
  }

  // 将采集到的数据发送到您的服务器
  if (historicalData.length > 0) {
    var payload = JSON.stringify(historicalData);
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': payload,
      'headers': {
        'X-API-Key': YOUR_SECRET_KEY
      },
      'muteHttpExceptions': true
    };

    try {
      var response = UrlFetchApp.fetch(postUrl, options);
      Logger.log('数据上传成功。服务器响应代码: %s', response.getResponseCode());
      Logger.log('服务器响应内容: %s', response.getContentText());
    } catch (e) {
      Logger.log('错误: 上传历史数据到服务器时失败: ' + e.toString());
    }
  } else {
    Logger.log('昨天没有任何账户产生数据，无需同步。');
  }

  Logger.log('--- 每日历史数据同步任务执行完毕 ---');
}
