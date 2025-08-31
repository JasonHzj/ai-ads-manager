/**
 * =======================================================================
 * 主函数 - 脚本执行的入口
 *
 * v6 版修正:
 * - 修复了 syncAllAccounts 函数中批量获取当日性能数据时，
 * 在经理账户层级查询指标的错误。
 * - 改为在遍历子账户的循环体内，逐个获取其当日性能。
 * =======================================================================
 */
function main() {
  // --- 配置区域 ---
  var YOUR_BASE_URL = 'https://adwords.7055.net/api';
  var YOUR_SECRET_KEY = '07efb477b36c36b5055c2630578ee4eeeb6cfb1e33f89b3c2eb7cb319a5baf0d';

  const managerAccount = AdsApp.currentAccount();
  const managerAccountId = managerAccount.getCustomerId();
  const managerAccountName = managerAccount.getName();

  Logger.log('脚本以高频/实时模式运行 (修正版 v6)...');
  processPendingJobs(YOUR_BASE_URL, YOUR_SECRET_KEY);
  syncAllAccountsWithTodayPerformance(YOUR_BASE_URL, YOUR_SECRET_KEY, managerAccountId,
    managerAccountName);
  Logger.log('高频/实时模式运行结束。');
}


/**
 * =======================================================================
 * 模块二: 数据同步器 (修正版)
 *
 * 修正内容:
 * - 移除了在循环外批量获取性能数据的错误逻辑。
 * - 在循环体内，进入每个子账户后，单独为该账户查询当日性能数据。
 * =======================================================================
 */
function syncAllAccountsWithTodayPerformance(baseUrl, secretKey, managerAccountId,
  managerAccountName) {
  Logger.log('--- 模块二: 开始同步账户数据及当日性能... ---');

  var postUrl = baseUrl + '/ads/receive-data';
  var accountsData = [];
  var accountIterator = AdsManagerApp.accounts().get();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    var subAccountId = account.getCustomerId();

    try {
      AdsManagerApp.select(account);
      Utilities.sleep(500);

      // 1. 在子账户上下文中获取当日性能数据
      var performanceData = {
        impressions: 0,
        clicks: 0,
        ctr: 0.0,
        cpc: 0.0,
        cost_micros: 0
      };
      try {
        var report = AdsApp.report(
          'SELECT metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros ' +
          'FROM customer ' +
          'WHERE segments.date DURING TODAY');

        var rows = report.rows();
        if (rows.hasNext()) {
          var row = rows.next();
          performanceData = {
            impressions: parseInt(row['metrics.impressions'], 10),
            clicks: parseInt(row['metrics.clicks'], 10),
            ctr: parseFloat(row['metrics.ctr']),
            cpc: parseFloat(row['metrics.average_cpc']) / 1000000,
            cost_micros: parseInt(row['metrics.cost_micros'], 10)
          };
        }
      } catch (perfError) {
        Logger.log('警告: 获取账户 ' + subAccountId + ' 的当日性能数据失败: ' + perfError.toString());
        // 如果性能数据获取失败，我们仍然继续同步账户结构，只是性能数据为0
      }


      // 2. 获取账户结构 (这部分逻辑不变)
      var currencyCode = account.getCurrencyCode();
      var campaigns = [];
      var campaignIterator = retry(function () {
        return AdsApp.campaigns().withCondition("campaign.status != 'REMOVED'").get();
      }, "广告系列");
      while (campaignIterator.hasNext()) {
        var campaign = campaignIterator.next();
        var locations = retry(function () {
          return campaign.targeting().targetedLocations().get();
        }, `广告系列 "${campaign.getName()}" 的地理位置`);
        var languages = retry(function () {
          return campaign.targeting().languages().get();
        }, `广告系列 "${campaign.getName()}" 的语言`);
        var locationIds = [];
        while (locations.hasNext()) {
          locationIds.push(locations.next().getId());
        }
        var languageIds = [];
        while (languages.hasNext()) {
          languageIds.push(languages.next().getId());
        }
        var adGroups = [];
        var adGroupIterator = retry(function () {
          return campaign.adGroups().withCondition("ad_group.status != 'REMOVED'").get();
        }, `广告系列 "${campaign.getName()}" 的广告组`);
        while (adGroupIterator.hasNext()) {
          var adGroup = adGroupIterator.next();
          var keywords = [];
          var keywordIterator = retry(function () {
            return adGroup.keywords().withCondition("ad_group_criterion.status != 'REMOVED'")
              .get();
          }, `广告组 "${adGroup.getName()}" 的关键字`);
          while (keywordIterator.hasNext()) {
            var keyword = keywordIterator.next();
            keywords.push({
              text: keyword.getText(),
              matchType: keyword.getMatchType(),
              status: getStatusLabel(keyword)
            });
          }
          var ads = [];
          var adIterator = retry(function () {
            return adGroup.ads().withCondition("ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'")
              .withCondition("ad_group_ad.status != 'REMOVED'").get();
          }, `广告组 "${adGroup.getName()}" 的广告`);
          while (adIterator.hasNext()) {
            var ad = adIterator.next();
            var rsa = ad.asType().responsiveSearchAd();
            var headlines = rsa.getHeadlines() ? rsa.getHeadlines().map(function (h) {
              return {
                text: h
              };
            }) : [];
            var descriptions = rsa.getDescriptions() ? rsa.getDescriptions().map(function (d) {
              return {
                text: d
              };
            }) : [];
            var finalUrl = ad.urls().getFinalUrl();
            ads.push({
              finalUrls: finalUrl ? [finalUrl] : [],
              headlines: headlines,
              descriptions: descriptions
            });
          }
          adGroups.push({
            id: adGroup.getId(),
            name: adGroup.getName(),
            status: getStatusLabel(adGroup),
            keywords: keywords,
            ads: ads
          });
        }
        campaigns.push({
          id: campaign.getId(),
          name: campaign.getName(),
          status: getStatusLabel(campaign),
          budget: campaign.getBudget().getAmount(),
          biddingStrategy: campaign.getBiddingStrategyType(),
          advertisingChannel: campaign.getAdvertisingChannelType(),
          locations: locationIds,
          languages: languageIds,
          urlOptions: {
            trackingTemplate: campaign.urls().getTrackingTemplate()
          },
          adGroups: adGroups
        });
      }

      // 3. 构建最终数据对象
      accountsData.push({
        manager_id: managerAccountId,
        manager_name: managerAccountName,
        sub_account_id: subAccountId,
        sub_account_name: account.getName(),
        currency_code: currencyCode,
        campaigns_data: campaigns,
        impressions: performanceData.impressions,
        clicks: performanceData.clicks,
        ctr: performanceData.ctr,
        cpc: performanceData.cpc,
        cost_micros: performanceData.cost_micros
      });

    } catch (e) {
      Logger.log(`账户 ${subAccountId} 结构读取失败: ${e.toString()}。已跳过此账户。`);
    }
  }

  // 4. 上传数据 (这部分逻辑不变)
  if (accountsData.length > 0) {
    var payload = JSON.stringify(accountsData);
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      headers: {
        'X-API-Key': secretKey
      },
      muteHttpExceptions: true
    };
    try {
      var response = UrlFetchApp.fetch(postUrl, options);
      Logger.log('数据同步服务器响应代码: %s', response.getResponseCode());
    } catch (e) {
      Logger.log('数据同步失败: ' + e.toString());
    }
  } else {
    Logger.log('没有发现任何可同步的账户数据。');
  }

  Logger.log('--- 账户数据及当日性能同步完成。 ---');
}


// =======================================================================
// 以下是您原有的任务处理和辅助函数 (无需任何修改)
// =======================================================================
function processPendingJobs(baseUrl, secretKey) {
  Logger.log('--- 模块一: 正在检查待处理任务... ---');
  var jobsUrl = baseUrl + '/jobs/pending';
  var statusUpdateUrl = baseUrl + '/jobs/update-status';
  try {
    var options = {
      'method': 'get',
      'headers': {
        'X-API-Key': secretKey,
        'ngrok-skip-browser-warning': 'true'
      },
      'muteHttpExceptions': true
    };
    var response = UrlFetchApp.fetch(jobsUrl, options);
    var responseText = response.getContentText();
    var jobs = JSON.parse(responseText);
    if (!Array.isArray(jobs) || jobs.length === 0) {
      Logger.log('没有发现待处理的任务。');
      return;
    }
    Logger.log('发现了 ' + jobs.length + ' 个待处理任务。开始执行...');
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      var subAccountId = job.sub_account_id;
      var payload;
      try {
        payload = job.payload;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }
        var cid = String(subAccountId).replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{4})/,
          "$1-$2-$3");
        var accIt = AdsManagerApp.accounts().withIds([cid]).get();
        if (!accIt.hasNext()) {
          throw new Error("找不到子账户: " + cid);
        }
        var account = accIt.next();
        AdsManagerApp.select(account);
        Logger.log('正在账户 "' + account.getName() + '" (' + subAccountId + ') 上执行任务 ID: ' + job.id);
        if (job.action_type === 'CREATE') {
          handleCreateAction(payload, subAccountId);
        } else if (job.action_type === 'UPDATE') {
          if (!payload.campaignId || !payload.adGroupId) {
            Logger.log('任务 ' + job.id +
              ' 类型为 "UPDATE"，但缺少 campaignId 或 adGroupId。将按 "CREATE" (新建) 流程处理。');
            handleCreateAction(payload, subAccountId);
          } else {
            handleUpdateAction(payload);
          }
        } else if (job.action_type === 'DELETE') {
          handleDeleteAction(payload);
        }
        reportStatus(statusUpdateUrl, secretKey, job.id, 'SUCCESS', '操作成功完成。');
      } catch (e) {
        var originalError = '执行任务 ID ' + job.id + ' 失败: ' + e.toString();
        Logger.log(originalError);
        var finalErrorMessage = originalError;
        if ((job.action_type === 'CREATE' || job.action_type === 'UPDATE') && payload) {
          try {
            Logger.log('正在尝试清理部分创建的实体...');
            var cleanupMessage = handleCreationFailureAndCleanup(payload, subAccountId);
            finalErrorMessage += '; ' + cleanupMessage;
          } catch (cleanupError) {
            var cleanupErrorMessage = '严重错误: 清理过程也失败了: ' + cleanupError.toString();
            Logger.log(cleanupErrorMessage);
            finalErrorMessage += '; ' + cleanupErrorMessage;
          }
        }
        reportStatus(statusUpdateUrl, secretKey, job.id, 'FAILED', finalErrorMessage);
      }
    }
  } catch (e) {
    Logger.log('错误: 获取或处理任务时失败: ' + e.toString());
  }
}

function handleCreationFailureAndCleanup(payload, subAccountId) {
  var campaignNameToFind = payload.campaignName;
  if (!campaignNameToFind) {
    return "清理已跳过: 任务数据中未找到广告系列名称。";
  }
  var escapedCampaignName = campaignNameToFind.replace(/"/g, '\\"');
  var campaignIterator = AdsApp.campaigns().withCondition(
    `campaign.name STARTS_WITH_IGNORE_CASE "${escapedCampaignName}"`).get();
  if (!campaignIterator.hasNext()) {
    return "清理检查完成: 未发现需要移除的部分创建的广告系列。";
  }
  var campaignsRemovedCount = 0;
  while (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    if (campaign.getName().startsWith(campaignNameToFind)) {
      Logger.log(`发现部分创建的广告系列: "${campaign.getName()}"。正在移除...`);
      campaign.remove();
      campaignsRemovedCount++;
    }
  }
  var message = `清理成功: 移除了 ${campaignsRemovedCount} 个部分创建的广告系列。`;
  Logger.log(message);
  return message;
}

function validateAndCreateRsa(adGroup, payload) {
  if (!payload.adLink || payload.adLink.trim() === '') {
    throw new Error('无法创建广告: 任务数据中的 adLink (最终链接) 为空。');
  }
  if (!payload.headlines || !Array.isArray(payload.headlines) || payload.headlines.length < 3) {
    throw new Error('无法创建广告: 任务数据中的 headlines (标题) 数量少于3个。');
  }
  if (!payload.descriptions || !Array.isArray(payload.descriptions) || payload.descriptions.length <
    2) {
    throw new Error('无法创建广告: 任务数据中的 descriptions (描述) 数量少于2个。');
  }
  Logger.log('正在创建新的自适应搜索广告...');
  const adOperation = adGroup.newAd().responsiveSearchAdBuilder().withHeadlines(payload.headlines)
    .withDescriptions(payload.descriptions).withFinalUrl(payload.adLink).build();
  if (!adOperation.isSuccessful()) {
    throw new Error('创建新广告失败: ' + adOperation.getErrors().join(', '));
  }
  Logger.log('新广告创建成功。');
  return adOperation.getResult();
}

function handleCreateAction(payload, subAccountId) {
  let finalCampaignName = payload.campaignName;
  const escapedCampaignName = payload.campaignName.replace(/"/g, '\\"');
  const existingCampaigns = AdsApp.campaigns().withCondition(
    `campaign.name = "${escapedCampaignName}"`).get();
  if (existingCampaigns.hasNext()) {
    Logger.log(`广告系列名称 "${payload.campaignName}" 已存在。正在附加随机数...`);
    finalCampaignName = payload.campaignName + '_' + Math.floor(Math.random() * 10000);
    Logger.log(`新的广告系列名称为: "${finalCampaignName}"`);
  }
  var customerId = subAccountId.replace(/-/g, '');
  var budgetResourceName = `customers/${customerId}/campaignBudgets/-1`;
  var campaignResourceName = `customers/${customerId}/campaigns/-2`;
  var adGroupResourceName = `customers/${customerId}/adGroups/-3`;
  var mutateOperations = [];
  var sanitizedCampaignName = finalCampaignName.replace(/[^a-zA-Z0-9_ ]/g, "");
  var budgetName = `Budget_${sanitizedCampaignName}_${new Date().getTime()}`;
  mutateOperations.push({
    campaignBudgetOperation: {
      create: {
        name: budgetName,
        amountMicros: payload.budget * 1000000,
        deliveryMethod: 'STANDARD',
        resourceName: budgetResourceName,
      },
    },
  });
  mutateOperations.push({
    campaignOperation: {
      create: {
        name: finalCampaignName,
        campaignBudget: budgetResourceName,
        status: payload.campaignStatus || 'ENABLED',
        advertisingChannelType: 'SEARCH',
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: false,
          targetContentNetwork: false,
        },
        targetSpend: {},
        resourceName: campaignResourceName,
      },
    },
  });
  if (payload.locations && Array.isArray(payload.locations)) {
    payload.locations.forEach(function (locationId) {
      mutateOperations.push({
        campaignCriterionOperation: {
          create: {
            campaign: campaignResourceName,
            location: {
              geoTargetConstant: `geoTargetConstants/${locationId}`
            }
          }
        }
      });
    });
  }
  if (payload.languages && Array.isArray(payload.languages)) {
    payload.languages.forEach(function (languageId) {
      mutateOperations.push({
        campaignCriterionOperation: {
          create: {
            campaign: campaignResourceName,
            language: {
              languageConstant: `languageConstants/${languageId}`
            }
          }
        }
      });
    });
  }
  mutateOperations.push({
    adGroupOperation: {
      create: {
        name: payload.adGroupName,
        campaign: campaignResourceName,
        status: 'ENABLED',
        resourceName: adGroupResourceName,
      },
    },
  });
  (payload.keywords || []).forEach(function (kw) {
    mutateOperations.push({
      adGroupCriterionOperation: {
        create: {
          adGroup: adGroupResourceName,
          status: 'ENABLED',
          keyword: {
            text: kw,
            matchType: payload.keywordMatchType || 'BROAD'
          }
        }
      }
    });
  });
  mutateOperations.push({
    adGroupAdOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: payload.headlines.map(function (h) {
              return {
                text: h
              };
            }),
            descriptions: payload.descriptions.map(function (d) {
              return {
                text: d
              };
            }),
          },
          finalUrls: [payload.adLink],
        },
      },
    },
  });
  var mutateResult = AdsApp.mutateAll(mutateOperations);
  var hasErrors = false;
  var errorMessages = [];
  for (var j = 0; j < mutateResult.length; j++) {
    if (!mutateResult[j].isSuccessful()) {
      hasErrors = true;
      errorMessages.push(`操作 ${j} 失败，错误: ${JSON.stringify(mutateResult[j])}`);
    }
  }
  if (hasErrors) {
    throw new Error("批量创建操作失败: " + errorMessages.join('; '));
  } else {
    Logger.log('广告系列、广告组、关键字和广告已成功创建。');
  }
}

function handleUpdateAction(payload) {
  if (!payload.campaignId || !payload.adGroupId) {
    throw new Error("更新任务的数据格式不正确，缺少 campaignId 或 adGroupId 字段。");
  }
  const cIt = AdsApp.campaigns().withIds([payload.campaignId]).get();
  if (!cIt.hasNext()) throw new Error(`找不到 ID 为 ${payload.campaignId} 的广告系列。`);
  const campaign = cIt.next();
  const gIt = AdsApp.adGroups().withIds([payload.adGroupId]).get();
  if (!gIt.hasNext()) throw new Error(`找不到 ID 为 ${payload.adGroupId} 的广告组。`);
  const adGroup = gIt.next();
  if (!campaign) throw new Error(`找不到 ID 为 ${payload.campaignId} 的广告系列。`);
  if (!adGroup) throw new Error(`找不到 ID 为 ${payload.adGroupId} 的广告组。`);
  Logger.log(`开始同步广告系列 "${campaign.getName()}"`);
  const currentBudget = campaign.getBudget().getAmount();
  if (currentBudget !== payload.budget) {
    Logger.log(`预算不一致。当前: ${currentBudget}, 目标: ${payload.budget}。正在更新...`);
    campaign.getBudget().setAmount(payload.budget);
  }
  const existingKeywords = new Set();
  const keywordIterator = adGroup.keywords().get();
  while (keywordIterator.hasNext()) {
    existingKeywords.add(keywordIterator.next().getText());
  }
  const desiredKeywords = new Set(payload.keywords || []);
  desiredKeywords.forEach(kw => {
    if (!existingKeywords.has(kw)) {
      Logger.log(`正在添加新关键字: "${kw}"`);
      adGroup.newKeywordBuilder().withText(kw).build();
    }
  });
  existingKeywords.forEach(kw => {
    if (!desiredKeywords.has(kw)) {
      Logger.log(`正在移除旧关键字: "${kw}"`);
      const kwToRemoveIterator = adGroup.keywords().withCondition(
        `ad_group_criterion.keyword.text = "${kw.replace(/"/g, '\\"')}"`).get();
      if (kwToRemoveIterator.hasNext()) {
        kwToRemoveIterator.next().remove();
      }
    }
  });
  const customerId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  const campaignId = campaign.getId();
  const campaignResourceName = campaign.getResourceName();
  const criteriaMutateOperations = [];
  const existingLocationIds = new Set();
  const locationIterator = campaign.targeting().targetedLocations().get();
  while (locationIterator.hasNext()) {
    existingLocationIds.add(locationIterator.next().getId());
  }
  const desiredLocationIds = new Set(payload.locations || []);
  desiredLocationIds.forEach(id => {
    if (!existingLocationIds.has(id)) {
      if (typeof id === 'number' && isFinite(id)) {
        Logger.log(`正在添加新的地理位置定位: ${id}`);
        criteriaMutateOperations.push({
          campaignCriterionOperation: {
            create: {
              campaign: campaignResourceName,
              location: {
                geoTargetConstant: `geoTargetConstants/${id}`
              }
            }
          }
        });
      } else {
        Logger.log(`警告: 无效的地理位置 ID "${id}"。ID 必须是一个数字。已跳过此项。`);
      }
    }
  });
  existingLocationIds.forEach(id => {
    if (!desiredLocationIds.has(id)) {
      Logger.log(`正在移除旧的地理位置定位: ${id}`);
      criteriaMutateOperations.push({
        campaignCriterionOperation: {
          remove: `customers/${customerId}/campaignCriteria/${campaignId}~${id}`
        }
      });
    }
  });
  const existingLanguageIds = new Set();
  const languageIterator = campaign.targeting().languages().get();
  while (languageIterator.hasNext()) {
    existingLanguageIds.add(languageIterator.next().getId());
  }
  const desiredLanguageIds = new Set(payload.languages || []);
  desiredLanguageIds.forEach(id => {
    if (!existingLanguageIds.has(id)) {
      if (typeof id === 'number' && isFinite(id)) {
        Logger.log(`正在添加新的语言定位: ${id}`);
        criteriaMutateOperations.push({
          campaignCriterionOperation: {
            create: {
              campaign: campaignResourceName,
              language: {
                languageConstant: `languageConstants/${id}`
              }
            }
          }
        });
      } else {
        Logger.log(`警告: 无效的语言 ID "${id}"。ID 必须是一个数字。已跳过此项。`);
      }
    }
  });
  existingLanguageIds.forEach(id => {
    if (!desiredLanguageIds.has(id)) {
      Logger.log(`正在移除旧的语言定位: ${id}`);
      criteriaMutateOperations.push({
        campaignCriterionOperation: {
          remove: `customers/${customerId}/campaignCriteria/${campaignId}~${id}`
        }
      });
    }
  });
  if (criteriaMutateOperations.length > 0) {
    AdsApp.mutateAll(criteriaMutateOperations);
    Logger.log('地理位置和语言定位已同步。');
  }
  const adIterator = adGroup.ads().withCondition("ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'")
    .get();
  if (adIterator.hasNext()) {
    const existingAdObject = adIterator.next();
    const existingAdRsa = existingAdObject.asType().responsiveSearchAd();
    const existingHeadlines = new Set(existingAdRsa.getHeadlines().map(h => h.text));
    const existingDescriptions = new Set(existingAdRsa.getDescriptions().map(d => d.text));
    const desiredHeadlines = new Set(payload.headlines);
    const desiredDescriptions = new Set(payload.descriptions);
    let adsAreDifferent = false;
    if (existingAdObject.urls().getFinalUrl() !== payload.adLink || existingHeadlines.size !==
      desiredHeadlines.size || existingDescriptions.size !== desiredDescriptions.size) {
      adsAreDifferent = true;
    } else {
      desiredHeadlines.forEach(h => {
        if (!existingHeadlines.has(h)) adsAreDifferent = true;
      });
      desiredDescriptions.forEach(d => {
        if (!existingDescriptions.has(d)) adsAreDifferent = true;
      });
    }
    if (adsAreDifferent) {
      Logger.log('广告内容已更改，正在替换广告...');
      validateAndCreateRsa(adGroup, payload);
      existingAdObject.remove();
      Logger.log('广告已成功替换。');
    } else {
      Logger.log('广告内容一致，无需更新。');
    }
  } else {
    validateAndCreateRsa(adGroup, payload);
  }
  Logger.log('广告系列同步完成。');
}

function handleDeleteAction(payload) {
  if (!payload.campaignId) {
    throw new Error("删除任务的数据格式不正确，缺少 campaignId 字段。");
  }
  const campaignIterator = AdsApp.campaigns().withIds([payload.campaignId]).get();
  if (campaignIterator.hasNext()) {
    const campaign = campaignIterator.next();
    const campaignName = campaign.getName();
    const campaignResourceName = campaign.getResourceName();
    const mutateResult = AdsApp.mutate({
      campaignOperation: {
        remove: campaignResourceName
      }
    });
    if (mutateResult.isSuccessful()) {
      Logger.log(`广告系列 "${campaignName}" (ID: ${payload.campaignId}) 已成功移除。`);
    } else {
      throw new Error(`移除广告系列失败: ${mutateResult.getError()}`);
    }
  } else {
    Logger.log(`警告: 找不到 ID 为 ${payload.campaignId} 的广告系列，可能已被删除。`);
  }
}

function reportStatus(url, secretKey, jobId, status, message) {
  var payload = JSON.stringify({
    jobId: jobId,
    status: status,
    message: message
  });
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': payload,
    'headers': {
      'X-API-Key': secretKey
    },
    'muteHttpExceptions': true
  };
  UrlFetchApp.fetch(url, options);
  Logger.log('已为任务 ID ' + jobId + ' 报告状态: ' + status);
}

function retry(fn, description, maxRetries = 3, delaySeconds = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (e) {
      if (e.toString().includes('Could not read from Google Ads') && i < maxRetries - 1) {
        Logger.log(
          `读取 ${description} 时遇到暂时性错误。将在 ${delaySeconds} 秒后重试... (尝试 ${i + 1}/${maxRetries})`);
        Utilities.sleep(delaySeconds * 1000);
      } else {
        throw e;
      }
    }
  }
}

function getStatusLabel(entity) {
  try {
    if (typeof entity.isRemoved === 'function' && entity.isRemoved()) return 'REMOVED';
    if (typeof entity.isPaused === 'function' && entity.isPaused()) return 'PAUSED';
    if (typeof entity.isEnabled === 'function' && entity.isEnabled()) return 'ENABLED';
  } catch (e) {}
  return 'UNKNOWN';
}
