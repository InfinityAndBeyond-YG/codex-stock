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

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

const dom = {};

const uiState = {
  mode: "overall",
  selectedAccountId: portfolioData.accounts[0].id,
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
    "allocationTitle",
    "allocationDescription",
    "donutChart",
    "donutModeLabel",
    "donutCenterValue",
    "donutCenterMeta",
    "modeSwitch",
    "selectorTitle",
    "selectorDescription",
    "selectorList",
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
    render();
  });

  dom.selectorList.addEventListener("click", (event) => {
    const accountButton = event.target.closest("[data-account-id]");
    if (!accountButton) {
      return;
    }

    uiState.selectedAccountId = accountButton.dataset.accountId;
    render();
  });
}

function render() {
  renderModeChips();
  renderSummaryCard();
  renderAllocationPanel();
  renderSelectorPanel();
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
    dom.avgCostValue.textContent = formatCurrency(totalAsset);
  }

  if (dom.cashKrwValue) {
    dom.cashKrwValue.textContent = formatCurrency(cashAsset);
  }

  if (dom.cashKrwPercent) {
    dom.cashKrwPercent.textContent = `${formatPercent(cashRatio)}%`;
  }

  if (dom.cashCurrencyList) {
    dom.cashCurrencyList.innerHTML = `
      <div class="cash-summary-row">
        <div>
          <strong class="cash-currency-amount">${formatCurrency(cashAsset)}</strong>
        </div>
        <strong class="cash-currency-percent">${formatPercent(cashRatio)}%</strong>
      </div>
    `;
  }
}

function renderAllocationPanel() {
  const segments = getAllocationSegments();
  const totalAsset = getCurrentScopeTotalAssetValue();
  const paletteSegments = segments.map((segment, index) => ({
    ...segment,
    color: segment.color || colorScale[index % colorScale.length],
  }));

  dom.allocationTitle.textContent = getAllocationTitle();
  dom.allocationDescription.textContent = getAllocationDescription();
  dom.donutModeLabel.textContent = getDonutModeLabel();
  dom.donutCenterValue.textContent = formatCurrency(totalAsset);
  dom.donutCenterMeta.textContent = getDonutCenterMeta();
  dom.donutChart.style.background = buildConicGradient(paletteSegments, totalAsset);
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

function getTotalAssetValue() {
  return getTotalCashValue() + getTotalHoldingValue();
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
  const currencyCashMap = new Map();
  portfolioData.accounts.forEach((account) => {
    account.cashBalances.forEach((cash) => {
      const current = currencyCashMap.get(cash.currency) || 0;
      currencyCashMap.set(cash.currency, current + convertToKrw(cash.amount, cash.currency));
    });
  });

  const cashSegments = Array.from(currencyCashMap.entries())
    .map(([currency, value], index) => ({
      label: `${currency} 현금`,
      value,
      meta: `${currency} 통화 기준 현금`,
      type: "cash",
      color: index === 0 ? "#0c72de" : "#77b6ff",
    }))
    .sort((left, right) => right.value - left.value);

  const stockSegments = [
    {
      label: "국내주식",
      value: getHoldingsByMarket("국내주식").reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0),
      meta: "전체 자산에서 국내 종목 비중",
      type: "stock",
      color: "#18a088",
    },
    {
      label: "해외주식",
      value: getHoldingsByMarket("해외주식").reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0),
      meta: "전체 자산에서 해외 종목 비중",
      type: "stock",
      color: "#ef8a26",
    },
  ].filter((segment) => segment.value > 0);

  stockSegments.sort((left, right) => right.value - left.value);
  return [...cashSegments, ...stockSegments];
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

  return "전체 자산 비율";
}

function getAllocationDescription() {
  if (uiState.mode === "accounts") {
    return "계좌별에서는 현금을 먼저 두고, 그다음 주식 종목 비율 순서로 보여줍니다.";
  }

  if (uiState.mode === "stocks") {
    return "주식별에서는 전체 자산 기준으로 각 종목의 퍼센트를 보게 됩니다.";
  }

  return "전체 보기에서는 현금 통화부터 보여주고, 그다음 국내주식과 해외주식을 비율 순서로 보여줍니다.";
}

function getDonutModeLabel() {
  if (uiState.mode === "accounts") {
    return "계좌별";
  }

  if (uiState.mode === "stocks") {
    return "주식별";
  }

  return "전체 보기";
}

function getDonutCenterMeta() {
  if (uiState.mode === "accounts") {
    return `${getAccountById(uiState.selectedAccountId).name} 기준`;
  }

  if (uiState.mode === "stocks") {
    return "전체 자산 대비 종목별";
  }

  return "통화 + 국내/해외 기준";
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

  return "현금 통화와 국내/해외 주식 비율을 먼저 한 번에 보는 기본 구조입니다.";
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
      label: "현금 자산",
      meta: "먼저 보이도록 가장 위에 둔 기준",
      value: cashValue,
      ratio: totalAsset ? (cashValue / totalAsset) * 100 : 0,
      color: "#0c72de",
      tagClass: "tag-blue",
      tag: "현금",
    },
    {
      label: "국내주식",
      meta: "국내 종목을 한 덩어리로 본 구조",
      value: domesticValue,
      ratio: totalAsset ? (domesticValue / totalAsset) * 100 : 0,
      color: "#18a088",
      tagClass: "tag-teal",
      tag: "국내",
    },
    {
      label: "해외주식",
      meta: "해외 종목을 한 덩어리로 본 구조",
      value: foreignValue,
      ratio: totalAsset ? (foreignValue / totalAsset) * 100 : 0,
      color: "#ef8a26",
      tagClass: "tag-orange",
      tag: "해외",
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
    <article class="selector-item">
      <div class="selector-left">
        <span class="selector-dot" style="background:${item.color}"></span>
        <div class="selector-label">
          <strong>${item.label}</strong>
          <span class="selector-meta">${item.meta}</span>
        </div>
      </div>
      <div class="selector-right">
        <span class="selector-tag ${item.tag === "해외" ? "tag-orange" : "tag-teal"}">${item.tag}</span>
        <strong class="selector-value">${formatPercent(item.ratio)}%</strong>
        <span class="selector-meta">${formatCurrency(item.value)}</span>
      </div>
    </article>
  `;
}

function renderStaticSelectorItem(item) {
  return `
    <article class="selector-item">
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

function formatPercent(value) {
  return percentFormatter.format(Number(value || 0));
}
