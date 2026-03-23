const portfolioData = {
  exchangeRates: {
    KRW: 1,
    USD: 1470,
    JPY: 9.8,
    CNY: 203,
    EUR: 1595,
  },
  accounts: [
    {
      id: "hana",
      name: "하나 메인계좌",
      cashBalances: [
        { currency: "KRW", amount: 2480000 },
        { currency: "USD", amount: 980 },
      ],
    },
    {
      id: "kb",
      name: "KB 서브계좌",
      cashBalances: [
        { currency: "KRW", amount: 1340000 },
        { currency: "USD", amount: 420 },
      ],
    },
  ],
  holdings: [
    {
      id: "samsung-hana",
      accountId: "hana",
      name: "삼성전자",
      market: "국내주식",
      currency: "KRW",
      shares: 52,
      avgCost: 71200,
      currentPrice: 74800,
    },
    {
      id: "skhynix-hana",
      accountId: "hana",
      name: "SK하이닉스",
      market: "국내주식",
      currency: "KRW",
      shares: 16,
      avgCost: 164500,
      currentPrice: 181000,
    },
    {
      id: "nvidia-hana",
      accountId: "hana",
      name: "NVIDIA",
      market: "해외주식",
      currency: "USD",
      shares: 11,
      avgCost: 118.2,
      currentPrice: 129.4,
    },
    {
      id: "naver-kb",
      accountId: "kb",
      name: "NAVER",
      market: "국내주식",
      currency: "KRW",
      shares: 22,
      avgCost: 198000,
      currentPrice: 213500,
    },
    {
      id: "apple-kb",
      accountId: "kb",
      name: "Apple",
      market: "해외주식",
      currency: "USD",
      shares: 14,
      avgCost: 201.5,
      currentPrice: 214.2,
    },
    {
      id: "tesla-kb",
      accountId: "kb",
      name: "Tesla",
      market: "해외주식",
      currency: "USD",
      shares: 8,
      avgCost: 228.6,
      currentPrice: 242.5,
    },
  ],
};

const colorScale = [
  "#0c72de",
  "#18a088",
  "#ef8a26",
  "#de5967",
  "#7c8ca7",
  "#4058b5",
  "#68a84e",
  "#bd6a2c",
];

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const usdCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactKrwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  notation: "compact",
  maximumFractionDigits: 1,
});

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

const percentBadgeIntegerFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

const percentBadgeDecimalFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

const currencyNameMap = {
  KRW: "원화",
  USD: "달러",
  JPY: "엔화",
  CNY: "위안화",
  EUR: "유로",
};

const dom = {};

const uiState = {
  mode: "overall",
  selectedOverallScope: "overview",
  selectedAccountId: portfolioData.accounts[0].id,
  displayCurrency: "KRW",
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  bindEvents();
  render();
}

function cacheDom() {
  [
    "avgCostValue",
    "cashKrwValue",
    "cashKrwPercent",
    "cashCurrencyList",
    "summaryCurrencyToggle",
    "allocationTitle",
    "allocationDescription",
    "donutChart",
    "donutModeLabel",
    "donutPercentLayer",
    "donutCenterValue",
    "donutCenterMeta",
    "donutLegend",
    "modeSwitch",
    "selectorTitle",
    "selectorDescription",
    "selectorList",
    "historyAverage",
    "monthlyAssetChart",
  ].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function bindEvents() {
  dom.modeSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) {
      return;
    }

    uiState.mode = button.dataset.mode;
    if (uiState.mode === "overall") {
      uiState.selectedOverallScope = "overview";
    }
    render();
  });

  dom.selectorList.addEventListener("click", (event) => {
    const overallButton = event.target.closest("[data-overall-scope]");
    if (overallButton) {
      uiState.selectedOverallScope = overallButton.dataset.overallScope;
      render();
      return;
    }

    const accountButton = event.target.closest("[data-account-id]");
    if (!accountButton) {
      return;
    }

    uiState.selectedAccountId = accountButton.dataset.accountId;
    render();
  });

  if (dom.summaryCurrencyToggle) {
    dom.summaryCurrencyToggle.addEventListener("click", (event) => {
      const currencyButton = event.target.closest("[data-display-currency]");
      if (!currencyButton) {
        return;
      }

      uiState.displayCurrency = currencyButton.dataset.displayCurrency;
      render();
    });
  }
}

function render() {
  renderModeChips();
  renderSummaryCard();
  renderAllocationPanel();
  renderSelectorPanel();
  renderMonthlyAssetChart();
}

function renderModeChips() {
  const buttons = dom.modeSwitch.querySelectorAll("[data-mode]");
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === uiState.mode);
  });
}

function renderSummaryCard() {
  const totalAsset = getCurrentScopeTotalAssetValue();
  const cashAsset = getCurrentScopeCashValue();
  const cashRatio = totalAsset ? (cashAsset / totalAsset) * 100 : 0;

  if (dom.avgCostValue) {
    dom.avgCostValue.textContent = formatDisplayCurrency(totalAsset);
  }

  if (dom.cashKrwValue) {
    dom.cashKrwValue.textContent = formatCurrency(cashAsset);
  }

  if (dom.cashKrwPercent) {
    dom.cashKrwPercent.textContent = `현금 비중 ${formatPercent(cashRatio)}%`;
  }

  if (dom.cashCurrencyList) {
    dom.cashCurrencyList.innerHTML = `
      <div class="cash-summary-row">
        <div>
          <strong class="cash-currency-amount">${formatCurrency(cashAsset)}</strong>
        </div>
        <strong class="cash-currency-percent">현금 비중 ${formatPercent(cashRatio)}%</strong>
      </div>
    `;
  }

  if (dom.summaryCurrencyToggle) {
    const buttons = dom.summaryCurrencyToggle.querySelectorAll("[data-display-currency]");
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.displayCurrency === uiState.displayCurrency);
    });
  }
}

function renderAllocationPanel() {
  const segments = getAllocationSegments();
  const allocationTotal = segments.reduce((sum, segment) => sum + segment.value, 0);
  const allocationDescription = getAllocationDescription();
  const paletteSegments = segments.map((segment, index) => ({
    ...segment,
    color: segment.color || colorScale[index % colorScale.length],
  }));

  dom.allocationTitle.textContent = getAllocationTitle();
  dom.allocationDescription.textContent = allocationDescription;
  dom.allocationDescription.hidden = !allocationDescription;
  dom.donutModeLabel.textContent = getDonutModeLabel();
  dom.donutCenterValue.textContent = formatCurrency(allocationTotal);
  dom.donutCenterMeta.textContent = getDonutCenterMeta();
  dom.donutChart.style.background = buildConicGradient(paletteSegments, allocationTotal);
  dom.donutPercentLayer.innerHTML = getDonutPercentBadges(paletteSegments, allocationTotal)
    .map((badge) => renderDonutPercentBadge(badge))
    .join("");
  dom.donutLegend.innerHTML = paletteSegments.map((segment) => renderDonutLegendItem(segment)).join("");
}

function renderSelectorPanel() {
  dom.selectorTitle.textContent = getSelectorTitle();
  dom.selectorDescription.textContent = getSelectorDescription();

  if (uiState.mode === "accounts") {
    dom.selectorList.innerHTML = getAccountSelectionItems().map(renderAccountSelectorItem).join("");
    return;
  }

  if (uiState.mode === "stocks") {
    dom.selectorList.innerHTML = getStockRankingItems().map(renderStockSelectorItem).join("");
    return;
  }

  dom.selectorList.innerHTML = getOverallSelectorItems().map(renderStaticSelectorItem).join("");
}

function renderMonthlyAssetChart() {
  if (!dom.monthlyAssetChart || !dom.historyAverage) {
    return;
  }

  const history = getMonthlyAverageAssetHistory();
  const averageValue = history.reduce((sum, item) => sum + item.value, 0) / (history.length || 1);
  const maxValue = Math.max(...history.map((item) => item.value), 0);

  dom.historyAverage.textContent = `12개월 평균 ${formatDisplayCurrency(averageValue)}`;
  dom.monthlyAssetChart.innerHTML = history
    .map((item, index) => renderMonthlyAssetBar(item, maxValue, index === history.length - 1))
    .join("");
}

function getTotalAssetValue() {
  return getTotalCashValue() + getTotalHoldingValue();
}

function getMonthlyAverageAssetHistory() {
  const totalAsset = getTotalAssetValue();
  const monthlyTrend = [0.79, 0.81, 0.83, 0.85, 0.87, 0.89, 0.91, 0.94, 0.96, 0.97, 0.99, 1];
  const today = new Date();

  return monthlyTrend.map((multiplier, index) => {
    const monthDate = new Date(
      today.getFullYear(),
      today.getMonth() - (monthlyTrend.length - 1 - index),
      1
    );

    return {
      label: `${monthDate.getMonth() + 1}월`,
      fullLabel: `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`,
      value: Math.round(totalAsset * multiplier),
    };
  });
}

function getCurrentScopeTotalAssetValue() {
  if (uiState.mode === "accounts") {
    return getAccountAssetValue(uiState.selectedAccountId);
  }

  return getTotalAssetValue();
}

function getCurrentScopeCashValue() {
  if (uiState.mode === "accounts") {
    return getAccountCashValue(uiState.selectedAccountId);
  }

  return getTotalCashValue();
}

function getTotalCashValue() {
  return portfolioData.accounts.reduce((sum, account) => sum + getAccountCashValue(account.id), 0);
}

function getTotalHoldingValue() {
  return portfolioData.holdings.reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0);
}

function getAllocationSegments() {
  if (uiState.mode === "accounts") {
    return getAccountAllocationSegments(uiState.selectedAccountId);
  }

  if (uiState.mode === "stocks") {
    return getStockAllocationSegments();
  }

  return getOverallAllocationSegments();
}

function getOverallAllocationSegments() {
  if (uiState.selectedOverallScope === "overview") {
    return getOverallOverviewSegments();
  }

  if (uiState.selectedOverallScope === "domestic") {
    return getMarketAllocationSegments("국내주식");
  }

  if (uiState.selectedOverallScope === "foreign") {
    return getMarketAllocationSegments("해외주식");
  }

  return getCashAllocationSegments();
}

function getOverallOverviewSegments() {
  return [
    ...getCashAllocationSegments(),
    ...getGroupedStockSegments(),
  ];
}

function getCashAllocationSegments() {
  const currencyCashMap = new Map();
  portfolioData.accounts.forEach((account) => {
    account.cashBalances.forEach((cash) => {
      const current = currencyCashMap.get(cash.currency) || 0;
      currencyCashMap.set(cash.currency, current + convertToKrw(cash.amount, cash.currency));
    });
  });

  const cashSegments = Array.from(currencyCashMap.entries())
    .map(([currency, value], index) => ({
      label: formatCashCurrencyLabel(currency),
      value,
      meta: `${formatCashCurrencyLabel(currency)} 기준 현금`,
      type: "cash",
      color: index === 0 ? "#0c72de" : "#77b6ff",
    }))
    .sort((left, right) => right.value - left.value);

  return cashSegments;
}

function getGroupedStockSegments() {
  return [
    {
      label: "국내주식",
      value: getHoldingsByMarket("국내주식").reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0),
      meta: "전체 자산 기준 국내주식",
      type: "stock",
      color: "#18a088",
    },
    {
      label: "해외주식",
      value: getHoldingsByMarket("해외주식").reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0),
      meta: "전체 자산 기준 해외주식",
      type: "stock",
      color: "#ef8a26",
    },
  ].filter((segment) => segment.value > 0);
}

function getMarketAllocationSegments(market) {
  const aggregatedSegments = new Map();
  portfolioData.holdings
    .filter((holding) => holding.market === market)
    .forEach((holding) => {
      const current = aggregatedSegments.get(holding.name) || {
        label: holding.name,
        value: 0,
        meta: `${market} 종목`,
      };

      aggregatedSegments.set(holding.name, {
        ...current,
        value: current.value + getHoldingValueInKrw(holding),
      });
    });

  return Array.from(aggregatedSegments.values())
    .map((segment, index) => ({
      ...segment,
      type: "stock",
      color: colorScale[(index + 1) % colorScale.length],
      tag: market === "해외주식" ? "해외" : "국내",
    }))
    .sort((left, right) => right.value - left.value);
}

function getAccountAllocationSegments(accountId) {
  const account = getAccountById(accountId);
  const cashValue = getAccountCashValue(accountId);
  const holdingSegments = getAccountHoldings(accountId)
    .map((holding, index) => ({
      label: holding.name,
      value: getHoldingValueInKrw(holding),
      meta: `${holding.market} · ${holding.currency}`,
      type: "stock",
      color: colorScale[(index + 1) % colorScale.length],
      tag: holding.market === "해외주식" ? "해외" : "국내",
    }))
    .sort((left, right) => right.value - left.value);

  return [
    {
      label: "현금",
      value: cashValue,
      meta: `${account.name} 전체 현금`,
      type: "cash",
      color: "#0c72de",
    },
    ...holdingSegments,
  ];
}

function getStockAllocationSegments() {
  const cashValue = getTotalCashValue();
  const holdings = portfolioData.holdings
    .map((holding, index) => ({
      label: holding.name,
      value: getHoldingValueInKrw(holding),
      meta: `${getAccountById(holding.accountId).name} · ${holding.market}`,
      type: "stock",
      color: colorScale[(index + 1) % colorScale.length],
      tag: holding.market === "해외주식" ? "해외" : "국내",
    }))
    .sort((left, right) => right.value - left.value);

  return [
    {
      label: "현금",
      value: cashValue,
      meta: "전체 자산 기준 남아 있는 현금",
      type: "cash",
      color: "#0c72de",
    },
    ...holdings,
  ];
}

function getAllocationTitle() {
  if (uiState.mode === "accounts") {
    const account = getAccountById(uiState.selectedAccountId);
    return `${account.name} 전체 자산 비율`;
  }

  if (uiState.mode === "stocks") {
    return "전체 자산에서 주식 종목별 비율";
  }

  if (uiState.selectedOverallScope === "overview") {
    return "전체 자산 비율";
  }

  if (uiState.selectedOverallScope === "domestic") {
    return "국내주식 비율";
  }

  if (uiState.selectedOverallScope === "foreign") {
    return "해외주식 비율";
  }

  return "현금 자산 비율";
}

function getAllocationDescription() {
  if (uiState.mode === "accounts") {
    return "계좌별에서는 현금을 먼저 두고, 그다음 주식 종목 비율 순서로 보여줍니다.";
  }

  if (uiState.mode === "stocks") {
    return "주식별에서는 전체 자산 기준으로 각 종목의 퍼센트를 보게 됩니다.";
  }

  return "";
}

function getDonutModeLabel() {
  if (uiState.mode === "accounts") {
    return "계좌별";
  }

  if (uiState.mode === "stocks") {
    return "주식별";
  }

  if (uiState.selectedOverallScope === "overview") {
    return "전체 보기";
  }

  if (uiState.selectedOverallScope === "domestic") {
    return "국내주식";
  }

  if (uiState.selectedOverallScope === "foreign") {
    return "해외주식";
  }

  return "현금 자산";
}

function getDonutCenterMeta() {
  if (uiState.mode === "accounts") {
    return `${getAccountById(uiState.selectedAccountId).name} 기준`;
  }

  if (uiState.mode === "stocks") {
    return "전체 자산 대비 종목별";
  }

  if (uiState.selectedOverallScope === "overview") {
    return "통화 + 국내/해외 기준";
  }

  if (uiState.selectedOverallScope === "domestic") {
    return "국내주식 총 평가 기준";
  }

  if (uiState.selectedOverallScope === "foreign") {
    return "해외주식 총 평가 기준";
  }

  return "전체 현금 기준 통화별";
}

function getSelectorTitle() {
  if (uiState.mode === "accounts") {
    return "계좌별 보기";
  }

  if (uiState.mode === "stocks") {
    return "주식별 보기";
  }

  return "전체 자산 보기";
}

function getSelectorDescription() {
  if (uiState.mode === "accounts") {
    return "계좌를 누르면 왼쪽 원그래프가 그 계좌의 전체 자산 비율로 바뀝니다.";
  }

  if (uiState.mode === "stocks") {
    return "전체 자산 기준으로 각 주식 종목 퍼센트를 오른쪽 목록과 왼쪽 그래프에서 같이 확인합니다.";
  }

  return "오른쪽 항목을 누르면 왼쪽 원그래프가 현금, 국내주식, 해외주식 기준으로 바뀝니다.";
}

function getAccountSelectionItems() {
  const totalAsset = getTotalAssetValue();
  return portfolioData.accounts
    .map((account) => {
      const assetValue = getAccountAssetValue(account.id);
      return {
        id: account.id,
        label: account.name,
        meta: `현금 ${formatCurrency(getAccountCashValue(account.id))} · 종목 ${getAccountHoldings(account.id).length}개`,
        value: assetValue,
        ratio: totalAsset ? (assetValue / totalAsset) * 100 : 0,
        active: account.id === uiState.selectedAccountId,
      };
    })
    .sort((left, right) => right.value - left.value);
}

function getStockRankingItems() {
  const totalAsset = getTotalAssetValue();
  return portfolioData.holdings
    .map((holding, index) => ({
      id: holding.id,
      label: holding.name,
      meta: `${getAccountById(holding.accountId).name} · ${holding.market}`,
      value: getHoldingValueInKrw(holding),
      ratio: totalAsset ? (getHoldingValueInKrw(holding) / totalAsset) * 100 : 0,
      color: colorScale[(index + 1) % colorScale.length],
      tag: holding.market === "해외주식" ? "해외" : "국내",
    }))
    .sort((left, right) => right.value - left.value);
}

function getOverallSelectorItems() {
  const totalAsset = getTotalAssetValue();
  const cashValue = getTotalCashValue();
  const domesticValue = getHoldingsByMarket("국내주식").reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0);
  const foreignValue = getHoldingsByMarket("해외주식").reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0);

  return [
    {
      id: "cash",
      label: "현금 자산",
      meta: "통화별 비율 보기",
      value: cashValue,
      ratio: totalAsset ? (cashValue / totalAsset) * 100 : 0,
      color: "#0c72de",
      tagClass: "tag-blue",
      tag: "현금",
      active: uiState.selectedOverallScope === "cash",
    },
    {
      id: "domestic",
      label: "국내주식",
      meta: "국내 종목별 비율 보기",
      value: domesticValue,
      ratio: totalAsset ? (domesticValue / totalAsset) * 100 : 0,
      color: "#18a088",
      tagClass: "tag-teal",
      tag: "국내",
      active: uiState.selectedOverallScope === "domestic",
    },
    {
      id: "foreign",
      label: "해외주식",
      meta: "해외 종목별 비율 보기",
      value: foreignValue,
      ratio: totalAsset ? (foreignValue / totalAsset) * 100 : 0,
      color: "#ef8a26",
      tagClass: "tag-orange",
      tag: "해외",
      active: uiState.selectedOverallScope === "foreign",
    },
  ];
}

function renderAccountSelectorItem(item) {
  return `
    <article class="selector-item ${item.active ? "active" : ""}" data-account-id="${item.id}">
      <div class="selector-left">
        <span class="selector-dot" style="background:${item.active ? "#0c72de" : "#9fb0c9"}"></span>
        <div class="selector-label">
          <strong>${item.label}</strong>
          <span class="selector-meta">${item.meta}</span>
        </div>
      </div>
      <div class="selector-right">
        <strong class="selector-value">${formatPercent(item.ratio)}%</strong>
        <span class="selector-meta">${formatCurrency(item.value)}</span>
      </div>
    </article>
  `;
}

function renderStockSelectorItem(item) {
  return `
    <article class="selector-item selector-item-readonly">
      <div class="selector-left">
        <span class="selector-dot" style="background:${item.color}"></span>
        <div class="selector-label">
          <strong>${item.label}</strong>
          <span class="selector-meta">${item.meta}</span>
        </div>
      </div>
      <div class="selector-right">
        <strong class="selector-value">${formatPercent(item.ratio)}%</strong>
        <span class="selector-meta">${formatCurrency(item.value)}</span>
      </div>
    </article>
  `;
}

function renderDonutLegendItem(segment) {
  return `
    <div class="donut-legend-item">
      <div class="donut-legend-left">
        <span class="donut-legend-swatch" style="background:${segment.color}"></span>
        <span class="donut-legend-label">${segment.label}</span>
      </div>
      <strong class="donut-legend-value">${formatCurrency(segment.value)}</strong>
    </div>
  `;
}

function getDonutPercentBadges(segments, totalAsset) {
  if (!segments.length || totalAsset <= 0) {
    return [];
  }

  let currentAngle = 0;
  return segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const angle = (segment.value / totalAsset) * 360;
      const midpoint = currentAngle + angle / 2;
      currentAngle += angle;

      const radians = ((midpoint - 90) * Math.PI) / 180;
      const radius = 39;

      return {
        label: segment.label,
        percent: formatDonutBadgePercent((segment.value / totalAsset) * 100),
        color: segment.color,
        textColor: getReadableTextColor(segment.color),
        x: 50 + Math.cos(radians) * radius,
        y: 50 + Math.sin(radians) * radius,
      };
    });
}

function renderDonutPercentBadge(badge) {
  return `
    <span
      class="donut-percent-badge"
      style="--badge-x:${badge.x}%; --badge-y:${badge.y}%; --badge-bg:${badge.color}; --badge-color:${badge.textColor};"
      title="${badge.label} ${badge.percent}"
    >
      ${badge.percent}
    </span>
  `;
}

function renderStaticSelectorItem(item) {
  return `
    <article class="selector-item ${item.active ? "active" : ""}" data-overall-scope="${item.id}">
      <div class="selector-left">
        <span class="selector-dot" style="background:${item.color}"></span>
        <div class="selector-label">
          <strong>${item.label}</strong>
          <span class="selector-meta">${item.meta}</span>
        </div>
      </div>
      <div class="selector-right">
        <span class="selector-tag ${item.tagClass}">${item.tag}</span>
        <strong class="selector-value">${formatPercent(item.ratio)}%</strong>
        <span class="selector-meta">${formatCurrency(item.value)}</span>
      </div>
    </article>
  `;
}

function renderMonthlyAssetBar(item, maxValue, isCurrentMonth) {
  const heightPercent = maxValue ? (item.value / maxValue) * 100 : 0;

  return `
    <article class="history-bar-item ${isCurrentMonth ? "current" : ""}" title="${item.fullLabel} ${formatDisplayCurrency(item.value)}">
      <strong class="history-bar-value">${formatCompactDisplayCurrency(item.value)}</strong>
      <div class="history-bar-track">
        <div class="history-bar-fill" style="height:${heightPercent}%"></div>
      </div>
      <span class="history-bar-label">${item.label}</span>
    </article>
  `;
}

function getAccountById(accountId) {
  return portfolioData.accounts.find((account) => account.id === accountId);
}

function getAccountCashValue(accountId) {
  const account = getAccountById(accountId);
  return account.cashBalances.reduce(
    (sum, cash) => sum + convertToKrw(cash.amount, cash.currency),
    0
  );
}

function getAccountHoldings(accountId) {
  return portfolioData.holdings.filter((holding) => holding.accountId === accountId);
}

function getAccountAssetValue(accountId) {
  return getAccountCashValue(accountId) + getAccountHoldings(accountId).reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0);
}

function getHoldingsByMarket(market) {
  return portfolioData.holdings.filter((holding) => holding.market === market);
}

function getHoldingValueInKrw(holding) {
  return convertToKrw(holding.shares * holding.currentPrice, holding.currency);
}

function getHoldingCostInKrw(holding) {
  return convertToKrw(holding.shares * holding.avgCost, holding.currency);
}

function convertToKrw(amount, currency) {
  return amount * (portfolioData.exchangeRates[currency] || 1);
}

function buildConicGradient(segments, totalAsset) {
  if (!segments.length || totalAsset <= 0) {
    return "conic-gradient(#dfe8f3 0deg 360deg)";
  }

  let currentAngle = 0;
  const stops = segments.map((segment) => {
    const angle = (segment.value / totalAsset) * 360;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return `${segment.color} ${start}deg ${end}deg`;
  });

  if (currentAngle < 360) {
    stops.push(`#dfe8f3 ${currentAngle}deg 360deg`);
  }

  return `conic-gradient(${stops.join(", ")})`;
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.round(value || 0));
}

function formatDisplayCurrency(value) {
  const numericValue = Math.round(value || 0);
  if (uiState.displayCurrency === "USD") {
    return usdCurrencyFormatter.format(numericValue / portfolioData.exchangeRates.USD);
  }

  return currencyFormatter.format(numericValue);
}

function formatCompactDisplayCurrency(value) {
  const numericValue = Math.round(value || 0);
  if (uiState.displayCurrency === "USD") {
    return compactUsdFormatter.format(numericValue / portfolioData.exchangeRates.USD);
  }

  return compactKrwFormatter.format(numericValue);
}

function formatPercent(value) {
  return percentFormatter.format(Number(value || 0));
}

function formatDonutBadgePercent(value) {
  const numericValue = Number(value || 0);
  if (numericValue >= 10) {
    return `${percentBadgeIntegerFormatter.format(numericValue)}%`;
  }

  return `${percentBadgeDecimalFormatter.format(numericValue)}%`;
}

function getReadableTextColor(hexColor) {
  const normalized = `${hexColor || ""}`.replace("#", "");
  if (normalized.length !== 6) {
    return "#ffffff";
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 160 ? "#153052" : "#ffffff";
}

function formatCashCurrencyLabel(currency) {
  const code = `${currency || ""}`.toUpperCase();
  const currencyName = currencyNameMap[code] || currency;
  return `${code} ${currencyName}`;
}
