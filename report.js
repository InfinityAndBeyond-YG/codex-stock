const reportDom = {};
const reportState = {
  periodMode: "quarter",
};

const reportKrwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const reportUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

document.addEventListener("DOMContentLoaded", initReportPage);

function initReportPage() {
  if (!window.StockFlowLedger) {
    return;
  }

  cacheReportDom();
  bindReportEvents();
  renderReportPage();
}

function cacheReportDom() {
  [
    "analysisTradeCount",
    "analysisTradeCountMeta",
    "analysisYearProfit",
    "analysisYearMeta",
    "analysisRollingProfit",
    "analysisRollingMeta",
    "analysisQuarterProfit",
    "analysisQuarterMeta",
    "analysisPeriodSwitch",
    "analysisPeriodList",
    "analysisTransactionsBody",
    "analysisStockRankList",
    "analysisAccountRankList",
  ].forEach((id) => {
    reportDom[id] = document.getElementById(id);
  });
}

function bindReportEvents() {
  reportDom.analysisPeriodSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-period-mode]");
    if (!button) {
      return;
    }

    reportState.periodMode = button.dataset.periodMode;
    renderReportPage();
  });
}

function renderReportPage() {
  const transactions = window.StockFlowLedger.getEnrichedTransactions();
  const analysis = window.StockFlowLedger.analyzeTransactions(transactions);

  renderAnalysisQuickStats(analysis);
  renderAnalysisPeriodSwitch();
  renderAnalysisPeriodList(analysis.realizedTrades);
  renderAnalysisTransactionsTable(analysis);
  renderAnalysisBreakdowns(analysis.realizedTrades);
}

function renderAnalysisQuickStats(analysis) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const quarter = getQuarterNumber(now);
  const rollingStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365);

  const yearRealized = analysis.realizedTrades
    .filter((trade) => window.StockFlowLedger.parseLocalDate(trade.date).getFullYear() === currentYear)
    .reduce((sum, trade) => sum + trade.realizedProfit, 0);
  const rollingRealized = analysis.realizedTrades
    .filter((trade) => window.StockFlowLedger.parseLocalDate(trade.date) >= rollingStart)
    .reduce((sum, trade) => sum + trade.realizedProfit, 0);
  const quarterRealized = analysis.realizedTrades
    .filter((trade) => {
      const tradeDate = window.StockFlowLedger.parseLocalDate(trade.date);
      return (
        tradeDate.getFullYear() === currentYear &&
        getQuarterNumber(tradeDate) === quarter
      );
    })
    .reduce((sum, trade) => sum + trade.realizedProfit, 0);

  if (reportDom.analysisTradeCount) {
    reportDom.analysisTradeCount.textContent = `${analysis.transactions.length}건`;
  }

  if (reportDom.analysisTradeCountMeta) {
    reportDom.analysisTradeCountMeta.textContent = `매수 ${analysis.buyCount} · 매도 ${analysis.sellCount}`;
  }

  setSignedMetric(reportDom.analysisYearProfit, yearRealized);
  if (reportDom.analysisYearMeta) {
    reportDom.analysisYearMeta.textContent = `${currentYear}년 실현손익`;
  }

  setSignedMetric(reportDom.analysisRollingProfit, rollingRealized);
  if (reportDom.analysisRollingMeta) {
    reportDom.analysisRollingMeta.textContent = "최근 12개월 실현손익";
  }

  setSignedMetric(reportDom.analysisQuarterProfit, quarterRealized);
  if (reportDom.analysisQuarterMeta) {
    reportDom.analysisQuarterMeta.textContent = `${currentYear}년 ${quarter}분기 기준`;
  }
}

function renderAnalysisPeriodSwitch() {
  reportDom.analysisPeriodSwitch
    ?.querySelectorAll("[data-period-mode]")
    .forEach((button) => {
      button.classList.toggle("active", button.dataset.periodMode === reportState.periodMode);
    });
}

function renderAnalysisPeriodList(realizedTrades) {
  if (!reportDom.analysisPeriodList) {
    return;
  }

  const groups = buildPeriodGroups(realizedTrades);
  if (!groups.length) {
    reportDom.analysisPeriodList.innerHTML = `
      <article class="selector-item selector-item-readonly">
        <div class="selector-left">
          <div class="selector-label">
            <strong>표시할 실현손익이 없습니다.</strong>
            <span>매도 거래가 들어오면 기간별 손익이 이곳에 정리됩니다.</span>
          </div>
        </div>
      </article>
    `;
    return;
  }

  reportDom.analysisPeriodList.innerHTML = groups
    .map(
      (group) => `
        <article class="selector-item selector-item-readonly">
          <div class="selector-left">
            <span class="selector-dot" style="background:${
              group.realizedProfit >= 0 ? "#0c72de" : "#ef8a26"
            }"></span>
            <div class="selector-label">
              <strong>${group.label}</strong>
              <span>매도 ${group.count}건 · 평균 ${formatSignedKrw(group.realizedProfit / group.count)}</span>
            </div>
          </div>
          <div class="selector-right">
            <strong class="analysis-profit-value ${
              group.realizedProfit >= 0 ? "positive" : "negative"
            }">${formatSignedKrw(group.realizedProfit)}</strong>
            <span class="selector-meta">매도대금 ${formatKrw(group.proceeds)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAnalysisTransactionsTable(analysis) {
  if (!reportDom.analysisTransactionsBody) {
    return;
  }

  if (!analysis.transactions.length) {
    reportDom.analysisTransactionsBody.innerHTML = `
      <tr>
        <td colspan="7" class="stock-table-empty">거래 원장이 아직 없습니다.</td>
      </tr>
    `;
    return;
  }

  const realizedMap = new Map(
    analysis.realizedTrades.map((trade) => [trade.id, trade.realizedProfit])
  );

  reportDom.analysisTransactionsBody.innerHTML = analysis.transactions
    .slice(0, 10)
    .map((transaction) => {
      const realizedProfit = realizedMap.get(transaction.id);

      return `
        <tr>
          <td>${formatShortDate(transaction.date)}</td>
          <td>${transaction.accountShortName}</td>
          <td>${transaction.stockName}</td>
          <td>
            <span class="trade-badge ${transaction.type === "sell" ? "sell" : "buy"}">${
              transaction.type === "sell" ? "매도" : "매수"
            }</span>
          </td>
          <td>${formatQuantity(transaction.quantity)}</td>
          <td>${formatTradePrice(transaction.price, transaction.currency)}</td>
          <td>
            ${
              typeof realizedProfit === "number"
                ? `<span class="analysis-table-profit ${
                    realizedProfit >= 0 ? "positive" : "negative"
                  }">${formatSignedKrw(realizedProfit)}</span>`
                : '<span class="analysis-table-profit neutral">-</span>'
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAnalysisBreakdowns(realizedTrades) {
  renderAnalysisBreakdownList(
    reportDom.analysisStockRankList,
    buildStockBreakdown(realizedTrades),
    "종목별"
  );
  renderAnalysisBreakdownList(
    reportDom.analysisAccountRankList,
    buildAccountBreakdown(realizedTrades),
    "계좌별"
  );
}

function renderAnalysisBreakdownList(target, items, typeLabel) {
  if (!target) {
    return;
  }

  if (!items.length) {
    target.innerHTML = `
      <article class="selector-item selector-item-readonly">
        <div class="selector-left">
          <div class="selector-label">
            <strong>${typeLabel} 손익이 없습니다.</strong>
            <span>매도 거래가 생기면 자동으로 정리됩니다.</span>
          </div>
        </div>
      </article>
    `;
    return;
  }

  target.innerHTML = items
    .map(
      (item) => `
        <article class="selector-item selector-item-readonly">
          <div class="selector-left">
            <span class="selector-dot" style="background:${
              item.realizedProfit >= 0 ? "#0c72de" : "#ef8a26"
            }"></span>
            <div class="selector-label">
              <strong>${item.label}</strong>
              <span>${item.meta}</span>
            </div>
          </div>
          <div class="selector-right">
            <strong class="analysis-profit-value ${
              item.realizedProfit >= 0 ? "positive" : "negative"
            }">${formatSignedKrw(item.realizedProfit)}</strong>
            <span class="selector-meta">매도 ${item.count}건</span>
          </div>
        </article>
      `
    )
    .join("");
}

function buildPeriodGroups(realizedTrades) {
  const groups = new Map();

  realizedTrades.forEach((trade) => {
    const descriptor = getPeriodDescriptor(trade.date);
    const current = groups.get(descriptor.key) || {
      key: descriptor.key,
      label: descriptor.label,
      sortValue: descriptor.sortValue,
      count: 0,
      realizedProfit: 0,
      proceeds: 0,
    };

    current.count += 1;
    current.realizedProfit += trade.realizedProfit;
    current.proceeds += trade.proceedsKrw;
    groups.set(descriptor.key, current);
  });

  return Array.from(groups.values()).sort((left, right) => right.sortValue - left.sortValue);
}

function buildStockBreakdown(realizedTrades) {
  const groups = new Map();

  realizedTrades.forEach((trade) => {
    const current = groups.get(trade.stockId) || {
      label: trade.stockName,
      meta: `${trade.ticker} · ${trade.market === "kr" ? "한국주식" : "미국주식"}`,
      count: 0,
      realizedProfit: 0,
    };

    current.count += 1;
    current.realizedProfit += trade.realizedProfit;
    groups.set(trade.stockId, current);
  });

  return Array.from(groups.values()).sort(
    (left, right) => Math.abs(right.realizedProfit) - Math.abs(left.realizedProfit)
  );
}

function buildAccountBreakdown(realizedTrades) {
  const groups = new Map();

  realizedTrades.forEach((trade) => {
    const current = groups.get(trade.accountId) || {
      label: trade.accountName,
      meta: `${trade.accountShortName} 기준 실현손익`,
      count: 0,
      realizedProfit: 0,
    };

    current.count += 1;
    current.realizedProfit += trade.realizedProfit;
    groups.set(trade.accountId, current);
  });

  return Array.from(groups.values()).sort(
    (left, right) => Math.abs(right.realizedProfit) - Math.abs(left.realizedProfit)
  );
}

function getPeriodDescriptor(dateString) {
  const date = window.StockFlowLedger.parseLocalDate(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (reportState.periodMode === "year") {
    return {
      key: String(year),
      label: `${year}년`,
      sortValue: new Date(year, 0, 1).getTime(),
    };
  }

  if (reportState.periodMode === "month") {
    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${year}.${String(month).padStart(2, "0")}`,
      sortValue: new Date(year, month - 1, 1).getTime(),
    };
  }

  const quarter = getQuarterNumber(date);
  return {
    key: `${year}-Q${quarter}`,
    label: `${year}년 ${quarter}분기`,
    sortValue: new Date(year, (quarter - 1) * 3, 1).getTime(),
  };
}

function setSignedMetric(element, value) {
  if (!element) {
    return;
  }

  element.textContent = formatSignedKrw(value);
  element.classList.remove("positive", "negative", "neutral");
  if (value > 0) {
    element.classList.add("positive");
  } else if (value < 0) {
    element.classList.add("negative");
  } else {
    element.classList.add("neutral");
  }
}

function getQuarterNumber(date) {
  return Math.floor(date.getMonth() / 3) + 1;
}

function formatShortDate(value) {
  const [year, month, day] = String(value).split("-");
  return `${year}.${month}.${day}`;
}

function formatQuantity(value) {
  return `${new Intl.NumberFormat("ko-KR").format(value || 0)}주`;
}

function formatTradePrice(value, currency) {
  if (currency === "USD") {
    return reportUsdFormatter.format(value || 0);
  }

  return reportKrwFormatter.format(Math.round(value || 0));
}

function formatKrw(value) {
  return reportKrwFormatter.format(Math.round(value || 0));
}

function formatSignedKrw(value) {
  const rounded = Math.round(value || 0);
  const absolute = reportKrwFormatter.format(Math.abs(rounded));
  if (rounded > 0) {
    return `+${absolute}`;
  }
  if (rounded < 0) {
    return `-${absolute}`;
  }
  return absolute;
}
