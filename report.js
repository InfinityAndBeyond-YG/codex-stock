const reportDom = {};
const reportState = {
  viewMode: "year",
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

const analysisViewCopy = {
  ledger: {
    kicker: "Trade View",
    title: "최근 거래 내역",
    caption: "최근 저장된 거래 내역을 바로 확인합니다.",
    emptyTitle: "거래 내역이 없습니다.",
    emptyBody: "내 주식 올리기에서 거래를 저장하면 이곳에 최근 거래가 정리됩니다.",
  },
  year: {
    kicker: "Year View",
    title: "연도별 실현손익",
    caption: "한 해 단위로 매도 손익 흐름을 정리합니다.",
    emptyTitle: "연도별 손익이 없습니다.",
    emptyBody: "매도 거래가 들어오면 연도별 실현손익이 이곳에 정리됩니다.",
  },
  quarter: {
    kicker: "Quarter View",
    title: "분기별 실현손익",
    caption: "분기 단위로 손익 흐름과 매도대금을 묶어봅니다.",
    emptyTitle: "분기별 손익이 없습니다.",
    emptyBody: "매도 거래가 들어오면 분기별 실현손익이 이곳에 정리됩니다.",
  },
  month: {
    kicker: "Month View",
    title: "월별 실현손익",
    caption: "월별로 손익 흐름을 더 촘촘하게 살펴봅니다.",
    emptyTitle: "월별 손익이 없습니다.",
    emptyBody: "매도 거래가 들어오면 월별 실현손익이 이곳에 정리됩니다.",
  },
  account: {
    kicker: "Account View",
    title: "계좌별 실현손익",
    caption: "어느 계좌에서 실현손익이 많이 났는지 바로 비교합니다.",
    emptyTitle: "계좌별 손익이 없습니다.",
    emptyBody: "매도 거래가 들어오면 계좌별 실현손익이 이곳에 정리됩니다.",
  },
  stock: {
    kicker: "Stock View",
    title: "종목별 실현손익",
    caption: "종목별로 실현손익 기여도를 한눈에 비교합니다.",
    emptyTitle: "종목별 손익이 없습니다.",
    emptyBody: "매도 거래가 들어오면 종목별 실현손익이 이곳에 정리됩니다.",
  },
};

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
    "analysisViewSwitch",
    "analysisGroupKicker",
    "analysisGroupTitle",
    "analysisGroupCaption",
    "analysisGroupList",
    "analysisGroupSection",
    "analysisLedgerSection",
    "analysisTransactionsBody",
  ].forEach((id) => {
    reportDom[id] = document.getElementById(id);
  });
}

function bindReportEvents() {
  reportDom.analysisViewSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-analysis-view]");
    if (!button) {
      return;
    }

    reportState.viewMode = button.dataset.analysisView;
    renderReportPage();
  });
}

function renderReportPage() {
  const transactions = window.StockFlowLedger.getEnrichedTransactions();
  const analysis = window.StockFlowLedger.analyzeTransactions(transactions);

  renderAnalysisViewSwitch();
  renderAnalysisContentVisibility();
  renderAnalysisGroupHeader();
  renderAnalysisGroupList(analysis.realizedTrades);
  renderAnalysisTransactionsTable(analysis);
}

function renderAnalysisViewSwitch() {
  reportDom.analysisViewSwitch
    ?.querySelectorAll("[data-analysis-view]")
    .forEach((button) => {
      button.classList.toggle("active", button.dataset.analysisView === reportState.viewMode);
    });
}

function renderAnalysisContentVisibility() {
  const showingLedger = reportState.viewMode === "ledger";

  reportDom.analysisGroupSection?.classList.toggle("analysis-panel-section-hidden", showingLedger);
  reportDom.analysisLedgerSection?.classList.toggle("analysis-panel-section-hidden", !showingLedger);
}

function renderAnalysisGroupHeader() {
  if (reportState.viewMode === "ledger") {
    return;
  }

  const copy = analysisViewCopy[reportState.viewMode];

  if (reportDom.analysisGroupKicker) {
    reportDom.analysisGroupKicker.textContent = copy.kicker;
  }

  if (reportDom.analysisGroupTitle) {
    reportDom.analysisGroupTitle.textContent = copy.title;
  }

  if (reportDom.analysisGroupCaption) {
    reportDom.analysisGroupCaption.textContent = copy.caption;
  }
}

function renderAnalysisGroupList(realizedTrades) {
  if (!reportDom.analysisGroupList) {
    return;
  }

  if (reportState.viewMode === "ledger") {
    reportDom.analysisGroupList.innerHTML = "";
    return;
  }

  const copy = analysisViewCopy[reportState.viewMode];
  const items = buildAnalysisGroupItems(realizedTrades);

  if (!items.length) {
    reportDom.analysisGroupList.innerHTML = `
      <article class="selector-item selector-item-readonly">
        <div class="selector-left">
          <div class="selector-label">
            <strong>${copy.emptyTitle}</strong>
            <span>${copy.emptyBody}</span>
          </div>
        </div>
      </article>
    `;
    return;
  }

  reportDom.analysisGroupList.innerHTML = items
    .map(
      (item) => `
        <article class="selector-item selector-item-readonly">
          <div class="selector-left">
            <span class="selector-dot" style="background:${item.realizedProfit >= 0 ? "#0c72de" : "#ef8a26"}"></span>
            <div class="selector-label">
              <strong>${item.label}</strong>
              <span>${item.meta}</span>
            </div>
          </div>
          <div class="selector-right">
            <strong class="analysis-profit-value ${item.realizedProfit >= 0 ? "positive" : "negative"}">${formatSignedKrw(
              item.realizedProfit
            )}</strong>
            <span class="selector-meta">${item.sideMeta}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function buildAnalysisGroupItems(realizedTrades) {
  if (reportState.viewMode === "ledger") {
    return [];
  }

  if (reportState.viewMode === "account") {
    return buildAccountBreakdown(realizedTrades);
  }

  if (reportState.viewMode === "stock") {
    return buildStockBreakdown(realizedTrades);
  }

  return buildPeriodGroups(realizedTrades, reportState.viewMode);
}

function renderAnalysisTransactionsTable(analysis) {
  if (!reportDom.analysisTransactionsBody) {
    return;
  }

  if (!analysis.transactions.length) {
    reportDom.analysisTransactionsBody.innerHTML = `
      <tr>
        <td colspan="7" class="stock-table-empty">거래 내역이 아직 없습니다.</td>
      </tr>
    `;
    return;
  }

  const realizedMap = new Map(analysis.realizedTrades.map((trade) => [trade.id, trade.realizedProfit]));

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

function buildPeriodGroups(realizedTrades, mode) {
  const groups = new Map();

  realizedTrades.forEach((trade) => {
    const descriptor = getPeriodDescriptor(trade.date, mode);
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

  return Array.from(groups.values())
    .sort((left, right) => right.sortValue - left.sortValue)
    .map((group) => ({
      label: group.label,
      meta: `매도 ${group.count}건 · 평균 ${formatSignedKrw(group.realizedProfit / group.count)}`,
      sideMeta: `매도대금 ${formatKrw(group.proceeds)}`,
      realizedProfit: group.realizedProfit,
    }));
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

  return Array.from(groups.values())
    .sort((left, right) => Math.abs(right.realizedProfit) - Math.abs(left.realizedProfit))
    .map((item) => ({
      label: item.label,
      meta: item.meta,
      sideMeta: `매도 ${item.count}건`,
      realizedProfit: item.realizedProfit,
    }));
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

  return Array.from(groups.values())
    .sort((left, right) => Math.abs(right.realizedProfit) - Math.abs(left.realizedProfit))
    .map((item) => ({
      label: item.label,
      meta: item.meta,
      sideMeta: `매도 ${item.count}건`,
      realizedProfit: item.realizedProfit,
    }));
}

function getPeriodDescriptor(dateString, mode) {
  const date = window.StockFlowLedger.parseLocalDate(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (mode === "year") {
    return {
      key: String(year),
      label: `${year}년`,
      sortValue: new Date(year, 0, 1).getTime(),
    };
  }

  if (mode === "month") {
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
