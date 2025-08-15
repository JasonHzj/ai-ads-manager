/**
 * 主函数，用于运行谷歌广告自动化脚本。
 * 它会获取配置，从外部 API 抓取账户数据，
 * 然后相应地创建或更新广告系列、广告组和广告。
 */
function main() {
  // --- 配置信息 ---
  const api_domain = CONFIG.api_domain;
  const username = CONFIG.username;
  const password = CONFIG.password;
  const adContent = CONFIG.AD_CONTENT;
  let delay_seconds = CONFIG.delay_seconds;
  const finalUrl = CONFIG.final_url;
  let max_accounts_in_parallel = CONFIG.max_accounts_in_parallel;

  // --- 延迟验证 ---
  if (delay_seconds < 1) {
    delay_seconds = 30;
  } else if (delay_seconds > 30) {
    delay_seconds = 30;
  }
  delay_seconds = 10; // 覆盖延迟时间

  // --- API 端点构建 ---
  let apiEndpoint;
  if (api_domain.includes('googleads.googleapis.com')) {
    apiEndpoint = api_domain;
  } else {
    apiEndpoint = 'https://' + api_domain;
  }

  if (api_domain.endsWith('/')) {
    apiEndpoint = apiEndpoint + 'ai/request/177.html';
  } else {
    apiEndpoint = apiEndpoint + '/ai/request/177.html';
  }

  // --- 账户处理 ---
  const accounts = AdsManagerApp.accounts().get();
  let accountIds = [];
  for (const account of accounts) {
    AdsManagerApp.select(account);
    accountIds.push(account.getCustomerId());
  }

  // 在开始主流程前延迟一段时间
  const endTime = new Date().getTime() + Number(delay_seconds) * 1000;
  while (new Date().getTime() < endTime) {
    // 这个循环用于制造延迟
  }

  // --- 主要逻辑 ---
  const payload = {
    'username': username,
    'password': password,
    'accountIds': accountIds.join(',')
  };

  const response = sendPostRequest(apiEndpoint, payload);

  if (response.success) {
    accountForRange(accounts, response.data, apiEndpoint);
    Utilities.sleep(300000); // 休眠 5 分钟
    console.log('任务已完成，脚本即将退出。');
  } else {
    console.error('未知错误', response.error);
    Utilities.sleep(60000); // 休眠 1 分钟
  }
}


/**
 * 根据从 API 获取的数据处理一系列账户。
 * @param {object} accountsIterator - 谷歌广告账户的迭代器。
 * @param {object} apiData - 从外部 API 接收到的数据。
 * @param {string} apiEndpoint - 用于发送响应数据的基础 URL。
 */
function accountForRange(accountsIterator, apiData) {
  for (const account of accountsIterator) {
    AdsManagerApp.select(account);
    const accountId = account.getCustomerId();
    const accountData = apiData.campaignList.filter(item => item.id === accountId);

    if (accountData.length === 0) {
      console.warn('在 API 数据中未找到当前账户：', accountId);
      continue;
    }

    const data = accountData[0];
    const {
      finalUrl,
      amount,
      locations,
      headlines,
      descriptions,
      adStatus
    } = data;
    const keywords = data.keywords.split(/\r?\n/);
    const negativeKeywords = data.negativeKeywords.split(/\r?\n/);

    // 检查名称中包含 'auto' 的广告系列是否已存在
    const campaignIterator = AdsApp.campaigns().withCondition("Name CONTAINS 'auto'").get();
    if (campaignIterator.hasNext()) {
      console.log('此账户已存在名称中带 "auto" 的广告系列：' + accountId + '。 名称：' + account.getName());
      const campaign = createBaseCampaign(accountId, amount, finalUrl, locations, adStatus);
      if (!campaign) {
        Logger.log('广告系列创建失败，脚本将继续。');
        sendPostResponse(apiEndpoint, accountId, 1);
        continue;
      }
    } else {
      console.log('名称中带 "auto" 的广告系列已存在。');
    }

    const autoCampaign = getCampaignByAuto();
    if (!autoCampaign) {
      Logger.log('找不到自动生成的广告系列，正在跳过。');
      continue;
    }

    if (!setTargetLocation(autoCampaign, locations)) {
      Logger.log('设置地理位置失败。');
    }

    Logger.log('广告组创建成功。');
    let adGroup = getAdGroupByAuto(autoCampaign);

    if (!adGroup) {
      Logger.log('未找到自动广告组，正在创建一个新的。');
      adGroup = createAdGroup(autoCampaign, 'Auto AdGroup');
      if (!adGroup) {
        Logger.log('创建广告组失败。');
        sendPostResponse(apiEndpoint, accountId, 1);
        continue;
      }
      Logger.log('广告组创建成功。');
    }

    const keywordsAddedCount = addKeywordsToAdGroup(adGroup, keywords, 'BROAD');
    Logger.log(`成功添加了 ${keywordsAddedCount} 个关键字。`);

    const adIterator = adGroup.ads().get();
    if (adIterator.hasNext()) {
      Logger.log('广告已存在，跳过创建。');
      continue;
    } else {
      Logger.log('未找到现有广告，正在创建一个新的。');
      const newAd = createTextAd(adGroup, headlines, descriptions, finalUrl);
      if (newAd) {
        Logger.log('文字广告创建成功，ID 为：' + newAd.getId());
        sendPostResponse(apiEndpoint, accountId, 3);
      } else {
        Logger.log('文字广告创建失败。');
        sendPostResponse(apiEndpoint, accountId, 1);
      }
    }
  }
}


/**
 * 创建一个基础广告系列。
 * @param {string} accountId 账户 ID。
 * @param {number} budgetAmount 每日预算。
 * @param {string} finalUrlSuffix 最终到达网址后缀。
 * @param {string} geoLocations 要定位的地理位置。
 * @param {string} campaignStatus 广告系列的状态（'ENABLED', 'PAUSED'）。
 * @returns {object|null} 成功则返回创建的广告系列对象，失败则返回 null。
 */
function createBaseCampaign(accountId, budgetAmount, finalUrlSuffix, geoLocations, campaignStatus =
  'ENABLED') {
  accountId = accountId.replace('-', '');
  console.log('正在为账户创建广告系列：', accountId);

  const operations = [];
  const budgetName = 'budgetAuto-' + accountId + '-(' + new Date() + ')';
  const campaignName = 'campaignAuto-' + accountId + '-(' + new Date() + ')';
  budgetAmount = budgetAmount * 1000000;

  try {
    const budgetOperation = {
      campaignBudgetOperation: {
        create: {
          resourceName: budgetName,
          amountMicros: budgetAmount,
          deliveryMethod: 'STANDARD',
          explicitlyShared: false
        }
      }
    };
    operations.push(budgetOperation);

    const networkSettings = {
      targetGoogleSearch: true,
      targetSearchNetwork: false,
      targetContentNetwork: false,
      targetPartnerSearchNetwork: false
    };

    const campaignOperation = {
      campaignOperation: {
        create: {
          resourceName: campaignName,
          name: 'AutoCampaign-' + new Date(),
          advertisingChannelType: 'SEARCH',
          targetSpend: {},
          status: campaignStatus,
          campaignBudget: budgetName,
          networkSettings: networkSettings,
          finalUrlSuffix: finalUrlSuffix
        }
      }
    };
    operations.push(campaignOperation);

    const results = AdsApp.mutate(operations, {
      partialFailure: false
    });

    for (const result of results) {
      if (result.isSuccessful()) {
        console.log('广告系列 ' + result.getResourceName() + ' 创建成功。');
        return true;
      } else {
        for (const error of result.getErrorMessages()) {
          console.error('遇到错误：', error);
        }
        return false;
      }
    }
    return false;
  } catch (e) {
    console.error('错误：', e);
    if (e.errors) {
      console.error('API 错误：', e.errors);
    }
    return false;
  }
}

/**
 * 获取名称中包含 'Auto' 的广告系列。
 * @returns {object|null} 返回广告系列对象，如果找不到则返回 null。
 */
function getCampaignByAuto() {
  try {
    const maxRetries = 3;
    const retryDelay = 60000; // 60 秒
    for (let i = 1; i <= maxRetries; i++) {
      const campaignIterator = AdsApp.campaigns().withCondition("Name CONTAINS 'auto'").get();
      if (campaignIterator.hasNext()) {
        return campaignIterator.next();
      }
      Logger.log(`未找到广告系列，正在重试... (尝试次数 ${i}/${maxRetries})`);
      Utilities.sleep(retryDelay);
    }
    Logger.log(`尝试 ${maxRetries} 次后，广告系列创建超时。该广告系列仍然不可用。`);
    return null;
  } catch (e) {
    Logger.log('查找广告系列时出错：' + e.message);
    return null;
  }
}

/**
 * 从广告系列中获取名称包含 'Auto' 的广告组。
 * @param {object} campaign 要搜索的广告系列。
 * @returns {object|null} 返回广告组对象，如果找不到则返回 null。
 */
function getAdGroupByAuto(campaign) {
  const maxRetries = 3;
  const retryDelay = 60000; // 60 秒
  for (let i = 1; i <= maxRetries; i++) {
    const campaignName = campaign.getName();
    console.log('正在广告系列中搜索广告组：' + campaignName);
    const adGroupIterator = campaign.adGroups().get();
    let adGroupCount = 0;
    while (adGroupIterator.hasNext()) {
      const adGroup = adGroupIterator.next();
      const adGroupName = adGroup.getName();
      if (adGroupName.toLowerCase().includes('auto')) {
        adGroupCount++;
        Logger.log(`[匹配的广告组 #${adGroupCount}] ${adGroupName} (ID: ${adGroup.getId()})`);
        return adGroup;
      }
    }
    if (adGroupCount === 0) {
      Logger.log('未找到包含 "auto" 的广告组。');
    }
    Logger.log(`广告组不可用，正在等待... (尝试次数 ${i}/${maxRetries})`);
    Utilities.sleep(retryDelay);
  }
  Logger.log(`尝试 ${maxRetries} 次后获取广告组超时。未找到广告组。`);
  return null;
}

/**
 * 为广告系列设置地理位置定位。
 * @param {object} campaign 要修改的广告系列。
 * @param {string} locationsCSV 以逗号分隔的地理位置 ID 字符串。默认为 '2840' (美国)。
 * @returns {boolean} 成功返回 true，失败返回 false。
 */
function setTargetLocation(campaign, locationsCSV = '2840') {
  try {
    locationsCSV = locationsCSV.replace('，', ',');
    if (locationsCSV.includes(',')) {
      let locationIds = locationsCSV.split(/,|，/);
      locationIds.forEach(function (locationId) {
        campaign.addLocation(Number(locationId), 0.15);
        Logger.log('正在将广告系列的投放国家/地区设置为：' + locationId + ')');
      });
    } else {
      campaign.addLocation(Number(locationsCSV), 0.15);
    }
    return true;
  } catch (e) {
    Logger.log('设置地理位置时出错：' + e.message);
    return false;
  }
}

/**
 * 在给定的广告系列中创建一个广告组。
 * @param {object} campaign 要添加广告组的广告系列。
 * @param {string} adGroupName 新广告组的名称。
 * @returns {object|null} 返回创建的广告组，失败则返回 null。
 */
function createAdGroup(campaign, adGroupName) {
  try {
    const adGroupBuilder = campaign.newAdGroupBuilder()
      .withName(adGroupName)
      .withCpc(0.5);

    const adGroupOperation = adGroupBuilder.build();
    const adGroupResult = adGroupOperation.getResult();

    if (adGroupResult) {
      Logger.log('广告组创建成功：' + adGroupResult.getName());
      return adGroupResult;
    } else {
      const errors = adGroupOperation.getErrors();
      Logger.log('广告组创建失败：' + (errors.length > 0 ? errors.join(', ') : '未知错误'));
      return null;
    }
  } catch (e) {
    Logger.log('创建广告组时发生错误：' + e.message);
    return null;
  }
}

/**
 * 创建一个自适应型搜索广告。
 * @param {object} adGroup 要添加广告的广告组。
 * @param {string[]} headlines 广告标题数组。
 * @param {string[]} descriptions 广告内容描述数组。
 * @param {string} finalUrl 广告的最终到达网址。
 * @returns {object|null} 返回创建的广告对象，失败则返回 null。
 */
function createTextAd(adGroup, headlines, descriptions, finalUrl) {
  console.log('正在创建一个新的自适应型搜索广告。');
  try {
    const adBuilder = adGroup.newAd().responsiveSearchAdBuilder()
      .withHeadlines(headlines.slice(0, 15))
      .withDescriptions(descriptions.slice(0, 4))
      .withFinalUrl(finalUrl)
      .build();

    console.log('广告操作已构建。');
    const adResult = adBuilder.getResult();
    if (adResult) {
      return adResult;
    } else {
      const errors = adBuilder.getErrors();
      Logger.log('广告创建失败：' + (errors.length > 0 ? errors.join(', ') : '未知错误'));
      return null;
    }
  } catch (e) {
    Logger.log('广告创建失败：' + e.message);
    return null;
  }
}


/**
 * 向广告组添加关键字。
 * @param {object} adGroup 要添加关键字的广告组。
 * @param {string[]} keywords 关键字数组。
 * @param {string} matchType 匹配类型（'BROAD', 'PHRASE', 'EXACT'）。
 * @returns {number} 成功添加的关键字数量。
 */
function addKeywordsToAdGroup(adGroup, keywords, matchType = 'BROAD') {
  let successCount = 0;
  try {
    keywords.forEach(keyword => {
      let keywordText = keyword;
      if (matchType === 'PHRASE') {
        keywordText = `"${keyword}"`;
      }
      if (matchType === 'EXACT') {
        keywordText = `[${keyword}]`;
      }

      const keywordOperation = adGroup.newKeywordBuilder().withText(keywordText).build();
      const keywordResult = keywordOperation.getResult();

      if (keywordResult) {
        successCount++;
        Logger.log('关键字添加成功：' + keyword);
      } else {
        const errors = keywordOperation.getErrors();
        Logger.log(`为 "${keyword}" 添加关键字失败 - ` + (errors.length > 0 ? errors.join(', ') :
          '未知错误'));
      }
    });
    return successCount;
  } catch (e) {
    Logger.log('添加关键字时出错：' + e.message);
    return successCount;
  }
}


/**
 * 向指定 URL 发送 POST 请求。
 * @param {string} url 要发送请求的 URL。
 * @param {object} payload JSON 格式的有效载荷。
 * @returns {object} 返回一个包含成功状态和数据或错误信息的对象。
 */
function sendPostRequest(url, payload) {
  try {
    const options = {
      method: 'post',
      payload: payload
    };
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    const jsonData = JSON.parse(responseText);

    if (jsonData == null || !responseText || jsonData.campaignList == null) {
      Utilities.sleep(1000 * 300);
      return {
        success: false,
        error: '创建失败'
      };
    }

    console.log('数据接收成功。');
    return {
      success: true,
      data: jsonData
    };
  } catch (e) {
    console.error('请求期间发生错误：', e.message);
    Utilities.sleep(1000 * 300);
    return {
      success: false,
      error: e.message
    };
  }
}


/**
 * 发送 POST 请求以反馈创建状态。
 * @param {string} url 基础 URL。
 * @param {string} accountId 账户 ID。
 * @param {number} createStatus 创建状态码（例如，1 表示失败，3 表示成功）。
 * @returns {object} 返回一个包含成功状态和数据或错误信息的对象。
 */
function sendPostResponse(url, accountId, createStatus) {
  try {
    const username = CONFIG.username;
    const password = CONFIG.password;
    const payload = {
      'username': username,
      'password': password,
      'accountId': accountId,
      'createStatus': createStatus
    };

    const responseUrl = url.replace('/ai/request/177.html', '/ai/response/177.html');
    const options = {
      method: 'post',
      payload: payload
    };
    UrlFetchApp.fetch(responseUrl, options);
    console.log('响应已发送。');
    return {
      success: true,
      error: ''
    };
  } catch (e) {
    console.error('API 响应失败：' + e.message);
    Utilities.sleep(1000 * 300);
    return {
      success: false,
      error: e.message
    };
  }
}
