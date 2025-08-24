<template>
  <div class="offer-card">
    <div class="card-top">
      <div class="column col-roi">
        <div class="roi-value">{{ offer.roi.toFixed(2) }}</div>
        <div class="roi-label">ROI</div>
      </div>

      <div class="column col-logo">
        <div v-if="offer.logo" class="logo-image">
          <img :src="offer.logo" :alt="offer.offer_name" @error="onLogoError" />
        </div>
        <div v-else class="logo-fallback" :style="{ backgroundColor: logoBgColor }">
          {{ offer.logo_fallback }}
        </div>
      </div>

      <div class="column col-info">
        <div class="info-name">{{ offer.offer_name }} <span class="info-id">ID: {{ offer.ad_id }}</span></div>
        <el-tooltip effect="dark" placement="top">
          <template #content>
            <div v-for="(commission, account) in offer.multi_account_commissions" :key="account">
              {{ account }}: {{ formatCurrency(commission) }}
            </div>
          </template>
          <div class="info-accounts">
            <span v-for="(commission, account) in offer.multi_account_commissions" :key="account" class="account-tag">
              {{ account }}
            </span>
          </div>
        </el-tooltip>
      </div>

      <div class="column col-metrics">
        <div class="metric-item">
          <span class="metric-value">{{ offer.cvr.toFixed(2) }}%</span>
          <span class="metric-label">点击转化率</span>
        </div>
        <div class="metric-item">
          <span class="metric-value" :class="momClass">{{ formatMom(offer.commission_mom) }}</span>
          <span class="metric-label">佣金环比</span>
        </div>
      </div>

      <div class="column col-commissions total">
        <div class="metric-item">
          <span class="metric-value">{{ formatCurrency(offer.total_commission) }}</span>
          <span class="metric-label">总佣金</span>
        </div>
        <div class="metric-item">
          <span class="metric-value green">{{ formatCurrency(offer.approved_commission) }}</span>
          <span class="metric-label">已确认佣金</span>
        </div>
      </div>
      <div class="column col-commissions status">
        <div class="metric-item">
          <span class="metric-value orange">{{ formatCurrency(offer.pending_commission) }}</span>
          <span class="metric-label">待确认佣金</span>
        </div>
        <div class="metric-item">
          <span class="metric-value red">{{ formatCurrency(offer.rejected_commission) }}</span>
          <span class="metric-label">拒绝佣金</span>
        </div>
      </div>
    </div>

    <div class="card-bottom">
      <MiniTrendChart :trend-data="offer.commission_trend" :account-names="accountNames" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PropType } from 'vue'
// ▼▼▼ 核心修正：确保 OfferData 类型与后端一致 ▼▼▼
import type { OfferData } from '@/api'
import MiniTrendChart from './MiniTrendChart.vue'
import '@/styles/dashboard.css'

const props = defineProps({
  offer: {
    type: Object as PropType<OfferData>,
    required: true
  },
  accountNames: {
    type: Array as PropType<string[]>,
    required: true
  }
})

const onLogoError = (event: Event) => {
  (event.target as HTMLImageElement).style.display = 'none'
}

const logoBgColor = ref(
  `hsl(${Math.floor(Math.random() * 360)}, 60%, 80%)`
)

const momClass = computed(() => {
  return props.offer.commission_mom >= 0 ? 'green' : 'red'
})

const formatMom = (value: number) => {
  const percentage = (value * 100).toFixed(1)
  return value >= 0 ? `+${percentage}%` : `${percentage}%`
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}
</script>

<style scoped>
.offer-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0px 0px 5px rgba(138, 138, 138, 0.1);
  margin-bottom: 20px;
  transition: box-shadow 0.3s;
}
.offer-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.card-top {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f2f5;
}
.column {
  padding: 0 5px;
}
.col-roi {
  text-align: center;
  font-family: 'Oswald', sans-serif;
  border-right: 1px solid #f0f2f5;
  flex-shrink: 0;
  padding-right: 10px;
  min-width: 50px;
}
.roi-value {
  font-weight: 500;
  color: #303133;
}
.roi-label {
  color: #909399;
  font-size: 12px;
}
.col-logo {
  flex-shrink: 0;
}
.logo-image, .logo-fallback {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-left: 10px;
}
.logo-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.logo-fallback {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}
.col-info {
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 120px;
  margin-right: auto;
}
.info-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.info-id {
  font-size: 12px;
  font-weight: normal;
  color: #c0c4cc;
  margin-left: 8px;
}
.info-accounts {
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
}
.account-tag {
  background-color: #f0f2f5;
  color: #909399;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
  white-space: nowrap;
}

/* ▼▼▼ 核心修正：调整所有指标列的样式 ▼▼▼ */
.col-metrics, .col-commissions {
  flex-shrink: 0;
  width: 95px; /* 稍微增加宽度以容纳更多列 */
  text-align: center;
}
.col-commissions.total {
    border-left: 1px solid #f0f2f5;
    padding-left: 10px;
}
.col-commissions.status {
    border-left: 1px solid #f0f2f5;
    padding-left: 10px;
}
/* ▲▲▲ 修正结束 ▲▲▲ */

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center; /* 居中对齐 */
}
.metric-item:first-child {
  margin-bottom: 5px;
}
.metric-value {
  font-size: 14px; /* 统一字体大小 */
  font-weight: 500;
  font-family: 'Oswald', sans-serif;
}
.metric-label {
  font-size: 12px; /* 统一字体大小 */
  color: #909399;
}
.red { color: #ff5b5b; }
.green { color: #2dd05e; }
.orange { color: #e6a23c;}

.card-bottom {
  padding: 5px;
}
</style>
