/**
 * =======================================================================
 * 主函数 - 脚本执行的入口
 *
 * 这个脚本现在按顺序执行两个主要任务:
 * 1. 任务处理器: 从您的网页应用数据库中获取待处理的任务并执行。
 * 2. 数据同步器: 将所有广告账户的当前状态同步回您的网页应用数据库。
 * =======================================================================
 */

function main() {
  // --- 配置区域 ---
  // 重要: 请将下面的地址和密钥替换为您自己的真实信息。
  var YOUR_BASE_URL = 'https://34a7598514a2.ngrok-free.app/api';
  var YOUR_SECRET_KEY = '07efb477b36c36b5055c2630578ee4eeeb6cfb1e33f89b3c2eb7cb319a5baf0d';

  // --- 配置结束 ---
  processPendingJobs(YOUR_BASE_URL, YOUR_SECRET_KEY);
  //syncAllAccounts(YOUR_BASE_URL, YOUR_SECRET_KEY);
}
/**
 * =======================================================================
 * 模块一: 任务处理器
 *
 * 从数据库获取待处理的任务，在Google Ads中执行它们，然后将执行结果报告回去。
 * =======================================================================
 */
function processPendingJobs(baseUrl, secretKey) {
  Logger.log('--- 模块一: 正在检查待处理任务... ---');

  var jobsUrl = baseUrl + '/jobs/pending';
  var statusUpdateUrl = baseUrl + '/jobs/update-status';

  try {
    // --- 1. 从您的服务器获取待处理任务 ---
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

    if (!Array.isArray(jobs)) {
      Logger.log('服务器返回的不是一个任务数组。响应内容: ' + responseText);
      return;
    }

    if (jobs.length === 0) {
      Logger.log('没有发现待处理的任务。');
      return;
    }

    Logger.log('发现了 ' + jobs.length + ' 个待处理任务。开始执行...');

    // --- 2. 循环并执行每一个任务 ---
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      var subAccountId = job.sub_account_id;

      try {
        var payload = job.payload;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }

        // 步骤 1: 切换到目标子账户进行操作
        var account = AdsManagerApp.accounts().withIds([subAccountId]).get().next();
        AdsManagerApp.select(account);
        Logger.log('正在账户 "' + account.getName() + '" (' + subAccountId + ') 上执行任务 ID: ' + job.id);

        // 步骤 2: 根据任务类型执行相应的操作
        if (job.action_type === 'CREATE') {

          // ▼▼▼ 新增逻辑：检查广告系列名称是否重复 ▼▼▼
          let finalCampaignName = payload.campaignName;
          // 为了在查询中安全使用，需要转义名称中的双引号
          const escapedCampaignName = payload.campaignName.replace(/"/g, '\\"');
          const existingCampaigns = AdsApp.campaigns()
            .withCondition(`campaign.name = "${escapedCampaignName}"`)
            .get();

          if (existingCampaigns.hasNext()) {
            Logger.log(`广告系列名称 "${payload.campaignName}" 已存在。正在附加随机数...`);
            finalCampaignName = payload.campaignName + '_' + Math.floor(Math.random() * 10000);
            Logger.log(`新的广告系列名称为: "${finalCampaignName}"`);
          }
          // ▲▲▲ 新增逻辑结束 ▲▲▲

          var customerId = subAccountId.replace(/-/g, '');

          // 定义临时的资源名称
          var budgetResourceName = `customers/${customerId}/campaignBudgets/-1`;
          var campaignResourceName = `customers/${customerId}/campaigns/-2`;
          var adGroupResourceName = `customers/${customerId}/adGroups/-3`;

          var mutateOperations = [];

          // 清理预算名称中的特殊字符
          var sanitizedCampaignName = finalCampaignName.replace(/[^a-zA-Z0-9_ ]/g, "");
          var budgetName = `Budget_${sanitizedCampaignName}_${new Date().getTime()}`;

          // 操作 1: 创建广告系列预算
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

          // 操作 2: 创建广告系列
          mutateOperations.push({
            campaignOperation: {
              create: {
                name: finalCampaignName, // 使用确保唯一的名称
                campaignBudget: budgetResourceName,
                status: payload.campaignStatus || 'ENABLED',
                advertisingChannelType: 'SEARCH',
                networkSettings: {
                  targetGoogleSearch: true,
                  targetSearchNetwork: false,
                  targetContentNetwork: false,
                  targetPartnerSearchNetwork: false
                },
                targetSpend: {}, // 使用 targetSpend 来设置“尽可能争取更多点击次数”策略
                resourceName: campaignResourceName,
              },
            },
          });

          // 操作 - 添加地理位置定位
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

          // 操作 - 添加语言定位
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

          // 操作 3: 创建广告组
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

          // 操作 4: 创建关键字
          payload.keywords.forEach(function (kw) {
            mutateOperations.push({
              adGroupCriterionOperation: {
                create: {
                  adGroup: adGroupResourceName,
                  status: 'ENABLED',
                  keyword: {
                    text: kw,
                    matchType: 'BROAD'
                  }
                }
              }
            });
          });

          // 操作 5: 创建自适应搜索广告
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

          // 执行所有操作
          var mutateResult = AdsApp.mutateAll(mutateOperations);

          // 检查错误
          var hasErrors = false;
          var errorMessages = [];
          for (var j = 0; j < mutateResult.length; j++) {
            if (!mutateResult[j].isSuccessful()) {
              hasErrors = true;
              errorMessages.push(
                `Operation ${j} failed with error: ${JSON.stringify(mutateResult[j])}`);
            }
          }

          if (hasErrors) {
            throw new Error("批量创建操作失败: " + errorMessages.join('; '));
          } else {
            Logger.log('广告系列、广告组、关键字和广告已成功创建。');
          }

        } else if (job.action_type === 'UPDATE') {
          // 未来用于更新广告系列的功能可以写在这里
        }

        // 如果执行成功，向服务器报告“成功”
        reportStatus(statusUpdateUrl, secretKey, job.id, 'SUCCESS', '广告系列操作成功完成。');

      } catch (e) {
        // 如果在执行过程中发生任何错误，向服务器报告“失败”
        Logger.log('错误：执行任务 ID ' + job.id + ' 失败: ' + e.toString());
        reportStatus(statusUpdateUrl, secretKey, job.id, 'FAILED', e.toString());
      }
    }

  } catch (e) {
    Logger.log('错误：获取或处理任务时失败: ' + e.toString());
  }
}

/**
 * 辅助函数: 将任务的执行状态报告回服务器。
 */
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

/**
 * =======================================================================
 * 模块二: 数据同步器
 *
 * 这是您最初的脚本，现在已模块化并添加了注释。
 * 它会遍历所有子账户，并将它们的账户结构同步到您的服务器。
 * =======================================================================

function syncAllAccounts(baseUrl, secretKey) {
  Logger.log('--- 模块二: 开始同步账户数据... ---');

  var postUrl = baseUrl + '/ads/receive-data';
  var managerAccount = AdsApp.currentAccount();
  var managerAccountId = managerAccount.getCustomerId();
  var managerAccountName = managerAccount.getName();
  var accountsData = [];

  var accountIterator = AdsManagerApp.accounts().get();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    AdsManagerApp.select(account);
    var currencyCode = account.getCurrencyCode();

    // --- 提取广告系列数据 ---
    var campaigns = [];
    var campaignIterator = AdsApp.campaigns().withCondition("campaign.status != 'REMOVED'").get();
    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();

      // 地区和语言ID
      var locations = campaign.targeting().targetedLocations().get();
      var languages = campaign.targeting().languages().get();
      var locationIds = [];
      while (locations.hasNext()) { locationIds.push(locations.next().getId()); }
      var languageIds = [];
      while (languages.hasNext()) { languageIds.push(languages.next().getId()); }

      // 广告组数据
      var adGroups = [];
      var adGroupIterator = campaign.adGroups().withCondition("ad_group.status != 'REMOVED'").get();
      while (adGroupIterator.hasNext()) {
        var adGroup = adGroupIterator.next();

        // 关键字数据
        var keywords = [];
        var keywordIterator = adGroup.keywords().withCondition("ad_group_criterion.status != 'REMOVED'").get();
        while (keywordIterator.hasNext()) {
          var keyword = keywordIterator.next();
          keywords.push({ text: keyword.getText(), matchType: keyword.getMatchType(), status: keyword.isEnabled() ? 'ENABLED' : 'PAUSED' });
        }

        // 广告数据
        var ads = [];
        var adIterator = adGroup.ads().withCondition("ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'").withCondition("ad_group_ad.status != 'REMOVED'").get();
        while (adIterator.hasNext()) {
          var ad = adIterator.next();
          ads.push({ headlines: ad.getHeadlines().map(function(h) { return h.text; }), descriptions: ad.getDescriptions().map(function(d) { return d.text; }) });
        }

        adGroups.push({ id: adGroup.getId(), name: adGroup.getName(), status: adGroup.isEnabled() ? 'ENABLED' : 'PAUSED', keywords: keywords, ads: ads });
      }

      campaigns.push({ id: campaign.getId(), name: campaign.getName(), status: campaign.isEnabled() ? 'ENABLED' : 'PAUSED', budget: campaign.getBudget().getAmount(), biddingStrategy: campaign.getBiddingStrategyType(), advertisingChannel: campaign.getAdvertisingChannelType(), locations: locationIds, languages: languageIds, urlOptions: { trackingTemplate: campaign.urls().getTrackingTemplate() }, adGroups: adGroups });
    }

    accountsData.push({ 'manager_id': managerAccountId, 'manager_name': managerAccountName, 'sub_account_id': account.getCustomerId(), 'sub_account_name': account.getName(), 'currency_code': currencyCode, 'campaigns_data': campaigns });
  }

  // --- 将同步好的数据发送到服务器 ---
  var payload = JSON.stringify(accountsData);
  var options = { 'method': 'post', 'contentType': 'application/json', 'payload': payload, 'headers': { 'X-API-Key': secretKey }, 'muteHttpExceptions': true };

  try {
    var response = UrlFetchApp.fetch(postUrl, options);
    Logger.log('数据同步服务器响应代码: %s', response.getResponseCode());
    Logger.log('数据同步服务器响应内容: %s', response.getContentText());
  } catch (e) {
    Logger.log('数据同步失败: ' + e.toString());
  }

  Logger.log('--- 账户数据同步完成。 ---');
}
*/

[{
  "id": "22560673351",
  "name": "【LB】Olive Piper_US_40781",
  "budget": 2,
  "status": "ENABLED",
  "adGroups": [{
    "id": "179190576229",
    "ads": [{
      "finalUrls": ["https://www.oliveandpiper.com/"],
      "headlines": [{
        "text": {
          "text": "Olive & Piper official website",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Shop Pearl Bridesmaid Earrings",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Olive & Piper Wedding",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Wedding & Bridesmaids Jewelry",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Shop Pearl Bridal Necklace Set",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Online Jewelry Boutique",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Olive & Rich Jewelry",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Jewelry For The Bridesmaids",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Necklaces, Earrings, Bracelets",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Shop Bridesmaid Earrings",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Olive & Piper",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Bridal Wedding Jewelry",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Wedding Jewelry Gifts",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Wedding & Statement Jewelry",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Olive & Piper Online",
          "pinning": null
        }
      }],
      "descriptions": [{
        "text": {
          "text": "Shop beautifully designed jewelry featuring crystals and pearls for an elegant look.",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Whether You're Looking for Understated or Eye-Catching, Find Your Match at Olive & Piper",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Creating Statement Jewelry to Elevate You and All the Moments That Matter.",
          "pinning": null
        }
      }, {
        "text": {
          "text": "Free shipping with minimum order and easy returns. View Collections. Send A Message.",
          "pinning": null
        }
      }]
    }],
    "name": "广告组 1",
    "status": "ENABLED",
    "keywords": [{
      "text": "olive and piper",
      "status": "ENABLED",
      "matchType": "EXACT"
    }]
  }],
  "languages": ["1000"],
  "locations": ["2840"],
  "urlOptions": {
    "trackingTemplate": "{lpurl}?source=aw&sv1=affiliate&sv_campaign_id=685769&utm_medium=&=&affiliate=&utm_source=685769&utm_campaign4011410=&awc=89009_1755082753_afe3ad1ab886548fd83540751856bc77&sscid=89009_1755082753_afe3ad1ab886548fd83540751856bc77"
  },
  "biddingStrategy": "TARGET_SPEND",
  "advertisingChannel": "SEARCH"
}]
