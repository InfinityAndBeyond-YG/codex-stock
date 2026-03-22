const STORAGE_KEY = "stockflow-dashboard-v1";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("ko-KR");

const dom = {};

const uiState = {
  viewMode: "holdings",
  selectedAccountId: "all",
  selectedHoldingId: null,
  searchTerm: "",
  uploadPreviewUrl: "",
  ocrText: "",
  ocrParsed: null,
  ocrProgress: 0,
  ocrStatus: "대기 중",
  ocrMessage: "이미지를 올리면 텍스트를 읽고 자동 분류를 시작합니다.",
  isRecognizing: false,
};

let state = loadState();

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  hydrateAccountSelect();
  ensureSelections();
  bindEvents();
  syncHistories();
  render();
}

function cacheDom() {
  const ids = [
    "summaryTotalAsset",
    "summaryEquityValue",
    "summaryProfitLoss",
    "summaryMonthlyDelta",
    "summaryUpdatedAt",
    "summaryEquityMix",
    "summaryProfitRate",
    "summaryCashValue",
    "accountFilters",
    "portfolioBoard",
    "detailPanelContent",
    "assetFlowChart",
    "averageCostChart",
    "assetFlowCaption",
    "averageCostCaption",
    "viewModeSelect",
    "searchInput",
    "screenshotInput",
    "ocrProgressBar",
    "ocrProgressLabel",
    "ocrStatusText",
    "ocrTextPreview",
    "imagePreview",
    "ocrResults",
    "applyOcrButton",
    "manualTransactionForm",
    "manualAccountSelect",
    "focusUploaderButton",
    "uploaderSection",
    "resetDemoButton",
    "clearImportButton",
  ];

  ids.forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function bindEvents() {
  dom.viewModeSelect.addEventListener("change", (event) => {
    uiState.viewMode = event.target.value;
    ensureSelections();
    render();
  });

  dom.searchInput.addEventListener("input", (event) => {
    uiState.searchTerm = event.target.value.trim();
    ensureSelections();
    render();
  });

  dom.accountFilters.addEventListener("click", (event) => {
    const pill = event.target.closest("[data-account-filter]");
    if (!pill) {
      return;
    }

    uiState.selectedAccountId = pill.dataset.accountFilter;
    ensureSelections();
    render();
  });

  dom.portfolioBoard.addEventListener("click", (event) => {
    const holdingCard = event.target.closest("[data-holding-id]");
    if (holdingCard) {
      uiState.viewMode = "holdings";
      dom.viewModeSelect.value = "holdings";
      uiState.selectedHoldingId = holdingCard.dataset.holdingId;
      uiState.selectedAccountId = holdingCard.dataset.accountId || "all";
      render();
      return;
    }

    const accountCard = event.target.closest("[data-account-id]");
    if (accountCard) {
      uiState.viewMode = "accounts";
      dom.viewModeSelect.value = "accounts";
      uiState.selectedAccountId = accountCard.dataset.accountId;
      uiState.selectedHoldingId = null;
      render();
    }
  });

  dom.detailPanelContent.addEventListener("submit", (event) => {
    if (event.target.matches("[data-holding-form]")) {
      event.preventDefault();
      handleHoldingEdit(event.target);
      return;
    }

    if (event.target.matches("[data-account-form]")) {
      event.preventDefault();
      handleAccountEdit(event.target);
    }
  });

  dom.screenshotInput.addEventListener("change", handleScreenshotUpload);
  dom.applyOcrButton.addEventListener("click", applyParsedImport);
  dom.clearImportButton.addEventListener("click", clearImportPreview);

  dom.manualTransactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const selectedAccountId = formData.get("accountId");
    const transaction = {
      id: createId("manual"),
      accountId: selectedAccountId,
      name: String(formData.get("name") || "").trim(),
      type: formData.get("type"),
      shares: Number(formData.get("shares")),
      price: Number(formData.get("price")),
      date: formData.get("date"),
      source: "manual",
    };

    if (!transaction.accountId || !transaction.name || !transaction.shares || !transaction.price) {
      return;
    }

    applyTransaction(transaction);
    event.target.reset();
    dom.manualAccountSelect.value = selectedAccountId;
    event.target.elements.date.value = getTodayDateInputValue();
    toast("거래 내역이 추가되었습니다.");
  });

  dom.focusUploaderButton.addEventListener("click", () => {
    dom.uploaderSection.scrollIntoView({ behavior: "smooth", block: "start" });
    dom.screenshotInput.click();
  });

  dom.resetDemoButton.addEventListener("click", () => {
    state = createDefaultState();
    hydrateAccountSelect();
    clearImportPreview();
    ensureSelections();
    syncHistories();
    render();
    toast("데모 데이터로 초기화했습니다.");
  });
}

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createDefaultState();
    }

    const parsed = JSON.parse(saved);
    return migrateState(parsed);
  } catch (error) {
    return createDefaultState();
  }
}

function migrateState(parsed) {
  const fallback = createDefaultState();
  const nextState = {
    ...fallback,
    ...parsed,
    accounts: Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : fallback.accounts,
    holdings: Array.isArray(parsed.holdings) && parsed.holdings.length ? parsed.holdings : fallback.holdings,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : fallback.transactions,
  };

  nextState.accounts = nextState.accounts.map((account) => ({
    ...account,
    cash: Number(account.cash || 0),
    monthlyHistory: normalizeMonthlyHistory(account.monthlyHistory),
  }));

  nextState.holdings = nextState.holdings.map((holding) => ({
    ...holding,
    shares: Number(holding.shares || 0),
    avgPrice: Number(holding.avgPrice || 0),
    currentPrice: Number(holding.currentPrice || 0),
    monthlyHistory: normalizeHoldingHistory(holding.monthlyHistory),
  }));

  return nextState;
}

function createDefaultState() {
  const months = getRecentMonthKeys(6);

  const accounts = [
    {
      id: "nh",
      name: "NH투자증권",
      cash: 1850000,
      color: "blue",
      monthlyHistory: buildAccountHistory(
        months,
        [10900000, 11450000, 11800000, 12320000, 12950000, 13680000],
        [10150000, 10400000, 10880000, 11330000, 11890000, 12410000]
      ),
    },
    {
      id: "kb",
      name: "KB증권",
      cash: 920000,
      color: "teal",
      monthlyHistory: buildAccountHistory(
        months,
        [7650000, 7910000, 8250000, 8610000, 9020000, 9470000],
        [7190000, 7340000, 7600000, 7930000, 8210000, 8570000]
      ),
    },
  ];

  const holdings = [
    {
      id: "holding-005930-nh",
      accountId: "nh",
      symbol: "005930",
      name: "삼성전자",
      sector: "반도체",
      shares: 48,
      avgPrice: 71200,
      currentPrice: 74800,
      monthlyHistory: buildHoldingHistory(
        months,
        [69400, 70300, 70650, 70900, 71100, 71200],
        [3180000, 3274000, 3332000, 3417000, 3496000, 3590400]
      ),
    },
    {
      id: "holding-000660-nh",
      accountId: "nh",
      symbol: "000660",
      name: "SK하이닉스",
      sector: "반도체",
      shares: 18,
      avgPrice: 164500,
      currentPrice: 181000,
      monthlyHistory: buildHoldingHistory(
        months,
        [152000, 155000, 159500, 162000, 163800, 164500],
        [2880000, 2934000, 3078000, 3168000, 3231000, 3258000]
      ),
    },
    {
      id: "holding-035420-kb",
      accountId: "kb",
      symbol: "035420",
      name: "NAVER",
      sector: "플랫폼",
      shares: 22,
      avgPrice: 198000,
      currentPrice: 213500,
      monthlyHistory: buildHoldingHistory(
        months,
        [205000, 201000, 199500, 198800, 198200, 198000],
        [4300000, 4380000, 4460000, 4565000, 4620000, 4697000]
      ),
    },
    {
      id: "holding-035720-kb",
      accountId: "kb",
      symbol: "035720",
      name: "카카오",
      sector: "인터넷",
      shares: 75,
      avgPrice: 42100,
      currentPrice: 47900,
      monthlyHistory: buildHoldingHistory(
        months,
        [44600, 43700, 43200, 42600, 42300, 42100],
        [3105000, 3165000, 3270000, 3385000, 3490000, 3592500]
      ),
    },
  ];

  const transactions = [
    {
      id: createId("seed"),
      accountId: "nh",
      name: "삼성전자",
      symbol: "005930",
      type: "buy",
      shares: 8,
      price: 70400,
      date: `${months[3]}-12`,
      source: "seed",
    },
    {
      id: createId("seed"),
      accountId: "kb",
      name: "NAVER",
      symbol: "035420",
      type: "buy",
      shares: 3,
      price: 201000,
      date: `${months[4]}-20`,
      source: "seed",
    },
    {
      id: createId("seed"),
      accountId: "kb",
      name: "카카오",
      symbol: "035720",
      type: "sell",
      shares: 5,
      price: 46800,
      date: `${months[5]}-03`,
      source: "seed",
    },
  ];

  return {
    updatedAt: new Date().toISOString(),
    accounts,
    holdings,
    transactions,
  };
}

function buildAccountHistory(months, assetValues, avgCosts) {
  return months.map((month, index) => ({
    month,
    assetValue: assetValues[index],
    avgCost: avgCosts[index],
  }));
}

function buildHoldingHistory(months, avgPrices, evaluationValues) {
  return months.map((month, index) => ({
    month,
    avgPrice: avgPrices[index],
    evaluation: evaluationValues[index],
    costBasis: 0,
  }));
}

function normalizeMonthlyHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => ({
      month: entry.month,
      assetValue: Number(entry.assetValue || 0),
      avgCost: Number(entry.avgCost || 0),
    }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

function normalizeHoldingHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => ({
      month: entry.month,
      avgPrice: Number(entry.avgPrice || 0),
      evaluation: Number(entry.evaluation || 0),
      costBasis: Number(entry.costBasis || 0),
    }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  syncHistories();
  renderSummary();
  renderAccountFilters();
  renderBoard();
  renderDetailPanel();
  renderAssetFlowChart();
  renderAverageCostChart();
  renderOcrArea();
}

function renderSummary() {
  const metrics = getPortfolioMetrics();
  const portfolioHistory = getCombinedAccountHistory();
  const last = portfolioHistory.at(-1) || { assetValue: 0 };
  const prev = portfolioHistory.at(-2) || { assetValue: 0 };
  const monthlyDelta = last.assetValue - prev.assetValue;

  dom.summaryTotalAsset.textContent = formatCurrency(metrics.assetValue);
  dom.summaryEquityValue.textContent = formatCurrency(metrics.equityValue);
  dom.summaryProfitLoss.textContent = formatSignedCurrency(metrics.profitLoss);
  dom.summaryProfitLoss.className = `metric-value ${metrics.profitLoss >= 0 ? "profit-positive" : "profit-negative"}`;
  dom.summaryMonthlyDelta.textContent = formatSignedCurrency(monthlyDelta);
  dom.summaryMonthlyDelta.className = `metric-value ${monthlyDelta >= 0 ? "profit-positive" : "profit-negative"}`;
  dom.summaryUpdatedAt.textContent = `마지막 반영 ${formatDateTime(state.updatedAt)}`;
  dom.summaryEquityMix.textContent = `현금 제외 주식 비중 ${formatPercent(metrics.assetValue ? (metrics.equityValue / metrics.assetValue) * 100 : 0, false)}`;
  dom.summaryProfitRate.textContent = `수익률 ${formatPercent(metrics.profitRate, true)}`;
  dom.summaryCashValue.textContent = `현금 ${formatCurrency(metrics.cash)}`;
}

function renderAccountFilters() {
  const pills = [
    {
      id: "all",
      label: "전체",
      count: state.holdings.length,
    },
    ...state.accounts.map((account) => ({
      id: account.id,
      label: account.name,
      count: getHoldingsByAccount(account.id).length,
    })),
  ];

  dom.accountFilters.innerHTML = pills
    .map(
      (pill) => `
        <button
          type="button"
          class="filter-pill ${uiState.selectedAccountId === pill.id ? "active" : ""}"
          data-account-filter="${pill.id}"
        >
          ${pill.label} · ${pill.count}
        </button>
      `
    )
    .join("");
}

function renderBoard() {
  const items = uiState.viewMode === "accounts" ? getFilteredAccounts() : getFilteredHoldings();

  if (!items.length) {
    dom.portfolioBoard.innerHTML = emptyStateMarkup(
      "조건에 맞는 결과가 없습니다.",
      "검색어를 바꾸거나 계좌 필터를 전체로 돌리면 다시 확인할 수 있습니다."
    );
    return;
  }

  dom.portfolioBoard.innerHTML =
    uiState.viewMode === "accounts"
      ? items.map(renderAccountCard).join("")
      : items.map(renderHoldingCard).join("");
}

function renderHoldingCard(holding) {
  const account = getAccountById(holding.accountId);
  const value = getHoldingValue(holding);
  const cost = getHoldingCost(holding);
  const profit = value - cost;
  const active = holding.id === uiState.selectedHoldingId;

  return `
    <article class="holding-card ${active ? "active" : ""}" data-holding-id="${holding.id}" data-account-id="${holding.accountId}">
      <div class="card-topline">
        <div>
          <h3 class="card-title">${holding.name}</h3>
          <p class="card-subtitle">${account?.name || "-"} · ${holding.symbol}</p>
        </div>
        <span class="badge ${profit >= 0 ? "badge-blue" : "badge-rose"}">${profit >= 0 ? "플러스" : "마이너스"}</span>
      </div>
      <div class="metric-row">
        <div class="mini-metric">
          <span>평가 금액</span>
          <strong>${formatCompactCurrency(value)}</strong>
        </div>
        <div class="mini-metric">
          <span>평균 단가</span>
          <strong>${formatCurrency(holding.avgPrice)}</strong>
        </div>
        <div class="mini-metric">
          <span>현재가</span>
          <strong>${formatCurrency(holding.currentPrice)}</strong>
        </div>
        <div class="mini-metric">
          <span>보유 수량</span>
          <strong>${numberFormatter.format(holding.shares)}주</strong>
        </div>
      </div>
      <p class="holding-summary ${profit >= 0 ? "profit-positive" : "profit-negative"}">
        평가 손익 ${formatSignedCurrency(profit)} · 수익률 ${formatPercent(cost ? (profit / cost) * 100 : 0, true)}
      </p>
    </article>
  `;
}

function renderAccountCard(account) {
  const metrics = getAccountMetrics(account.id);
  const active = account.id === uiState.selectedAccountId;
  const topHolding = getHoldingsByAccount(account.id)
    .sort((left, right) => getHoldingValue(right) - getHoldingValue(left))[0];

  return `
    <article class="account-card ${active ? "active" : ""}" data-account-id="${account.id}">
      <div class="card-topline">
        <div>
          <h3 class="card-title">${account.name}</h3>
          <p class="card-subtitle">보유 ${getHoldingsByAccount(account.id).length}종목 · 현금 ${formatCompactCurrency(account.cash)}</p>
        </div>
        <span class="badge ${account.color === "teal" ? "badge-teal" : "badge-blue"}">${account.color === "teal" ? "서브 계좌" : "메인 계좌"}</span>
      </div>
      <div class="metric-row">
        <div class="mini-metric">
          <span>총 자산</span>
          <strong>${formatCompactCurrency(metrics.assetValue)}</strong>
        </div>
        <div class="mini-metric">
          <span>주식 평가</span>
          <strong>${formatCompactCurrency(metrics.equityValue)}</strong>
        </div>
        <div class="mini-metric">
          <span>손익</span>
          <strong class="${metrics.profitLoss >= 0 ? "profit-positive" : "profit-negative"}">${formatSignedCurrency(metrics.profitLoss)}</strong>
        </div>
        <div class="mini-metric">
          <span>주력 종목</span>
          <strong>${topHolding ? topHolding.name : "-"}</strong>
        </div>
      </div>
    </article>
  `;
}

function renderDetailPanel() {
  if (uiState.viewMode === "accounts") {
    const account = getSelectedAccount();
    dom.detailPanelContent.innerHTML = account
      ? renderAccountDetail(account)
      : renderPortfolioDetail();
    return;
  }

  const holding = getSelectedHolding();
  if (!holding) {
    const account = getSelectedAccount();
    dom.detailPanelContent.innerHTML = account
      ? renderAccountDetail(account)
      : renderPortfolioDetail();
    return;
  }

  dom.detailPanelContent.innerHTML = renderHoldingDetail(holding);
}

function renderHoldingDetail(holding) {
  const account = getAccountById(holding.accountId);
  const value = getHoldingValue(holding);
  const cost = getHoldingCost(holding);
  const profit = value - cost;
  const recentTransactions = getRecentTransactions({ accountId: holding.accountId, name: holding.name }, 4);

  return `
    <div class="detail-head">
      <div>
        <h3>${holding.name}</h3>
        <p>${account?.name || "-"} · ${holding.symbol} · ${holding.sector || "기타"}</p>
      </div>
      <span class="badge ${profit >= 0 ? "badge-blue" : "badge-rose"}">${profit >= 0 ? "상승 흐름" : "조정 흐름"}</span>
    </div>
    <div class="detail-summary">
      <span>현재 평가 금액</span>
      <strong>${formatCurrency(value)}</strong>
      <p>${numberFormatter.format(holding.shares)}주 보유 · 평균단가 ${formatCurrency(holding.avgPrice)}</p>
    </div>
    <div class="detail-stat-grid">
      <div class="stat-card">
        <span>평가 손익</span>
        <strong class="${profit >= 0 ? "profit-positive" : "profit-negative"}">${formatSignedCurrency(profit)}</strong>
      </div>
      <div class="stat-card">
        <span>수익률</span>
        <strong>${formatPercent(cost ? (profit / cost) * 100 : 0, true)}</strong>
      </div>
      <div class="stat-card">
        <span>투입 원금</span>
        <strong>${formatCurrency(cost)}</strong>
      </div>
      <div class="stat-card">
        <span>현재가</span>
        <strong>${formatCurrency(holding.currentPrice)}</strong>
      </div>
    </div>
    <form class="edit-form" data-holding-form data-holding-id="${holding.id}">
      <label class="field">
        <span>주식 수</span>
        <input name="shares" type="number" min="0" step="1" value="${holding.shares}" required />
      </label>
      <label class="field">
        <span>평균 단가</span>
        <input name="avgPrice" type="number" min="0" step="1" value="${holding.avgPrice}" required />
      </label>
      <label class="field">
        <span>현재가</span>
        <input name="currentPrice" type="number" min="0" step="1" value="${holding.currentPrice}" required />
      </label>
      <label class="field">
        <span>업종 메모</span>
        <input name="sector" type="text" value="${holding.sector || ""}" placeholder="예: 반도체" />
      </label>
      <button type="submit" class="button button-primary">종목 정보 저장</button>
    </form>
    <div class="list-block">
      <h4>최근 거래</h4>
      <div class="activity-list">
        ${
          recentTransactions.length
            ? recentTransactions.map(renderTransactionItem).join("")
            : '<div class="activity-item"><span>아직 저장된 거래가 없습니다.</span><strong>-</strong></div>'
        }
      </div>
    </div>
  `;
}

function renderAccountDetail(account) {
  const metrics = getAccountMetrics(account.id);
  const topHoldings = getHoldingsByAccount(account.id)
    .sort((left, right) => getHoldingValue(right) - getHoldingValue(left))
    .slice(0, 4);
  const recentTransactions = getRecentTransactions({ accountId: account.id }, 4);

  return `
    <div class="detail-head">
      <div>
        <h3>${account.name}</h3>
        <p>계좌 전체 흐름과 현금, 종목 비중을 함께 봅니다.</p>
      </div>
      <span class="badge ${account.color === "teal" ? "badge-teal" : "badge-blue"}">${formatCompactCurrency(metrics.assetValue)}</span>
    </div>
    <div class="detail-summary">
      <span>계좌 총 평가 자산</span>
      <strong>${formatCurrency(metrics.assetValue)}</strong>
      <p>주식 ${formatCurrency(metrics.equityValue)} · 현금 ${formatCurrency(account.cash)}</p>
    </div>
    <div class="detail-stat-grid">
      <div class="stat-card">
        <span>평가 손익</span>
        <strong class="${metrics.profitLoss >= 0 ? "profit-positive" : "profit-negative"}">${formatSignedCurrency(metrics.profitLoss)}</strong>
      </div>
      <div class="stat-card">
        <span>수익률</span>
        <strong>${formatPercent(metrics.profitRate, true)}</strong>
      </div>
      <div class="stat-card">
        <span>보유 종목 수</span>
        <strong>${getHoldingsByAccount(account.id).length}개</strong>
      </div>
      <div class="stat-card">
        <span>현금 비중</span>
        <strong>${formatPercent(metrics.assetValue ? (account.cash / metrics.assetValue) * 100 : 0, false)}</strong>
      </div>
    </div>
    <form class="edit-form" data-account-form data-account-id="${account.id}">
      <label class="field">
        <span>현금 잔고</span>
        <input name="cash" type="number" min="0" step="1" value="${account.cash}" required />
      </label>
      <label class="field">
        <span>계좌 별칭</span>
        <input name="name" type="text" value="${account.name}" required />
      </label>
      <button type="submit" class="button button-primary">계좌 정보 저장</button>
    </form>
    <div class="list-block">
      <h4>비중 상위 종목</h4>
      <div class="allocation-list">
        ${
          topHoldings.length
            ? topHoldings
                .map((holding) => {
                  const share = metrics.equityValue ? (getHoldingValue(holding) / metrics.equityValue) * 100 : 0;
                  return `
                    <div class="allocation-item">
                      <div>
                        <strong>${holding.name}</strong>
                        <p>${numberFormatter.format(holding.shares)}주 · 현재가 ${formatCurrency(holding.currentPrice)}</p>
                      </div>
                      <strong>${formatPercent(share, false)}</strong>
                    </div>
                  `;
                })
                .join("")
            : '<div class="allocation-item"><span>종목이 없습니다.</span><strong>-</strong></div>'
        }
      </div>
    </div>
    <div class="list-block">
      <h4>최근 계좌 거래</h4>
      <div class="activity-list">
        ${
          recentTransactions.length
            ? recentTransactions.map(renderTransactionItem).join("")
            : '<div class="activity-item"><span>아직 저장된 거래가 없습니다.</span><strong>-</strong></div>'
        }
      </div>
    </div>
  `;
}

function renderPortfolioDetail() {
  const metrics = getPortfolioMetrics();
  const accountSummaries = state.accounts
    .map((account) => ({
      account,
      metrics: getAccountMetrics(account.id),
    }))
    .sort((left, right) => right.metrics.assetValue - left.metrics.assetValue);
  const recentTransactions = getRecentTransactions({}, 5);

  return `
    <div class="detail-head">
      <div>
        <h3>전체 포트폴리오</h3>
        <p>모든 계좌의 자산 흐름과 비중을 합산해서 봅니다.</p>
      </div>
      <span class="badge badge-blue">${state.accounts.length}개 계좌</span>
    </div>
    <div class="detail-summary">
      <span>총 평가 자산</span>
      <strong>${formatCurrency(metrics.assetValue)}</strong>
      <p>주식 ${formatCurrency(metrics.equityValue)} · 현금 ${formatCurrency(metrics.cash)}</p>
    </div>
    <div class="detail-stat-grid">
      <div class="stat-card">
        <span>평가 손익</span>
        <strong class="${metrics.profitLoss >= 0 ? "profit-positive" : "profit-negative"}">${formatSignedCurrency(metrics.profitLoss)}</strong>
      </div>
      <div class="stat-card">
        <span>수익률</span>
        <strong>${formatPercent(metrics.profitRate, true)}</strong>
      </div>
      <div class="stat-card">
        <span>보유 종목 수</span>
        <strong>${state.holdings.length}개</strong>
      </div>
      <div class="stat-card">
        <span>현금 비중</span>
        <strong>${formatPercent(metrics.assetValue ? (metrics.cash / metrics.assetValue) * 100 : 0, false)}</strong>
      </div>
    </div>
    <div class="list-block">
      <h4>계좌별 비중</h4>
      <div class="allocation-list">
        ${accountSummaries
          .map(({ account, metrics: summary }) => {
            const share = metrics.assetValue ? (summary.assetValue / metrics.assetValue) * 100 : 0;
            return `
              <div class="allocation-item">
                <div>
                  <strong>${account.name}</strong>
                  <p>주식 ${formatCurrency(summary.equityValue)} · 현금 ${formatCurrency(account.cash)}</p>
                </div>
                <strong>${formatPercent(share, false)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
    <div class="list-block">
      <h4>최근 전체 거래</h4>
      <div class="activity-list">
        ${
          recentTransactions.length
            ? recentTransactions.map(renderTransactionItem).join("")
            : '<div class="activity-item"><span>아직 저장된 거래가 없습니다.</span><strong>-</strong></div>'
        }
      </div>
    </div>
  `;
}

function renderTransactionItem(transaction) {
  return `
    <div class="activity-item">
      <div>
        <strong>${transaction.name}</strong>
        <p>${formatDate(transaction.date)} · ${transaction.type === "sell" ? "매도" : "매수"} ${numberFormatter.format(transaction.shares)}주</p>
      </div>
      <strong>${formatCurrency(transaction.price)}</strong>
    </div>
  `;
}

function renderAssetFlowChart() {
  const account = getSelectedAccount();
  const series = account ? account.monthlyHistory : getCombinedAccountHistory();
  const normalized = series.slice(-6);
  const maxValue = Math.max(...normalized.map((entry) => entry.assetValue), 1);

  dom.assetFlowCaption.textContent = account
    ? `${account.name} 기준으로 최근 6개월 자산 흐름을 봅니다.`
    : "전체 계좌를 합산한 최근 6개월 자산 흐름입니다.";

  dom.assetFlowChart.innerHTML = normalized
    .map((entry) => {
      const height = Math.max((entry.assetValue / maxValue) * 100, 10);
      return `
        <div class="bar-column">
          <div class="bar-stack">
            <div class="bar-track">
              <div class="bar-fill" style="height:${height}%"></div>
            </div>
          </div>
          <div class="bar-label">
            <strong>${formatCompactCurrency(entry.assetValue)}</strong>
            <span>${formatMonth(entry.month)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAverageCostChart() {
  const holding = getSelectedHolding();
  const series = holding ? getHoldingCostSeries(holding) : getPortfolioAverageSeries();
  const maxValue = Math.max(
    ...series.map((entry) => Math.max(entry.costBasis || entry.avgCost || 0, entry.evaluation || entry.assetValue || 0)),
    1
  );

  dom.averageCostCaption.textContent = holding
    ? `${holding.name}의 평단을 반영한 월별 매입금과 평가금 비교입니다.`
    : "선택 종목이 없으면 전체 포트폴리오 원가와 평가금 흐름을 보여줍니다.";

  dom.averageCostChart.innerHTML = series
    .map((entry) => {
      const costValue = entry.costBasis || entry.avgCost || 0;
      const evaluationValue = entry.evaluation || entry.assetValue || 0;
      const costHeight = Math.max((costValue / maxValue) * 100, 10);
      const evaluationHeight = Math.max((evaluationValue / maxValue) * 100, 10);

      return `
        <div class="dual-column">
          <div class="dual-stack">
            <div class="dual-track">
              <div class="dual-fill cost-fill" style="height:${costHeight}%"></div>
            </div>
            <div class="dual-track">
              <div class="dual-fill value-fill" style="height:${evaluationHeight}%"></div>
            </div>
          </div>
          <div class="column-label">
            <strong>${formatMonth(entry.month)}</strong>
            <span>매입금 ${formatCompactCurrency(costValue)} / 평가 ${formatCompactCurrency(evaluationValue)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderOcrArea() {
  dom.ocrProgressBar.style.width = `${uiState.ocrProgress}%`;
  dom.ocrProgressLabel.textContent = uiState.ocrStatus;
  dom.ocrStatusText.textContent = uiState.ocrMessage;
  dom.ocrTextPreview.textContent = uiState.ocrText || "아직 인식된 텍스트가 없습니다.";

  if (uiState.uploadPreviewUrl) {
    dom.imagePreview.classList.remove("image-empty");
    dom.imagePreview.innerHTML = `<img src="${uiState.uploadPreviewUrl}" alt="업로드한 스크린샷 미리보기" />`;
  } else {
    dom.imagePreview.classList.add("image-empty");
    dom.imagePreview.textContent = "업로드한 이미지가 여기에 표시됩니다.";
  }

  const result = uiState.ocrParsed;
  dom.applyOcrButton.disabled = !result || (!result.snapshots.length && !result.transactions.length);

  if (!result) {
    dom.ocrResults.innerHTML = emptyStateMarkup(
      "아직 추출 결과가 없습니다.",
      "스크린샷을 올리면 종목별 보유 현황 또는 매수·매도 내역을 자동으로 분류해 보여줍니다."
    );
    return;
  }

  const cards = [];

  if (result.snapshots.length) {
    result.snapshots.forEach((item) => {
      cards.push(`
        <article class="ocr-result-card">
          <div class="card-topline">
            <div>
              <h3 class="card-title">${item.name}</h3>
              <p class="card-subtitle">${getAccountById(item.accountId)?.name || "자동 계좌 선택"} · 보유 스냅샷</p>
            </div>
            <span class="badge badge-blue">보유 현황</span>
          </div>
          <div class="result-tags">
            <div class="result-tag">
              <span>수량</span>
              <strong>${numberFormatter.format(item.shares)}주</strong>
            </div>
            <div class="result-tag">
              <span>평균 단가</span>
              <strong>${formatCurrency(item.avgPrice)}</strong>
            </div>
            <div class="result-tag">
              <span>현재가</span>
              <strong>${formatCurrency(item.currentPrice || item.avgPrice)}</strong>
            </div>
          </div>
        </article>
      `);
    });
  }

  if (result.transactions.length) {
    result.transactions.forEach((item) => {
      cards.push(`
        <article class="ocr-result-card">
          <div class="card-topline">
            <div>
              <h3 class="card-title">${item.name}</h3>
              <p class="card-subtitle">${getAccountById(item.accountId)?.name || "자동 계좌 선택"} · ${formatDate(item.date)}</p>
            </div>
            <span class="badge ${item.type === "sell" ? "badge-rose" : "badge-teal"}">${item.type === "sell" ? "매도" : "매수"}</span>
          </div>
          <div class="result-tags">
            <div class="result-tag">
              <span>수량</span>
              <strong>${numberFormatter.format(item.shares)}주</strong>
            </div>
            <div class="result-tag">
              <span>거래가</span>
              <strong>${formatCurrency(item.price)}</strong>
            </div>
            <div class="result-tag">
              <span>합계</span>
              <strong>${formatCurrency(item.price * item.shares)}</strong>
            </div>
          </div>
        </article>
      `);
    });
  }

  if (result.warnings.length) {
    cards.push(`
      <article class="ocr-result-card">
        <div class="card-topline">
          <div>
            <h3 class="card-title">확인 포인트</h3>
            <p class="card-subtitle">OCR 특성상 아래 내용은 한 번 더 확인해 주세요.</p>
          </div>
          <span class="badge badge-rose">검토 필요</span>
        </div>
        <div class="activity-list">
          ${result.warnings.map((warning) => `<div class="activity-item"><span>${warning}</span><strong>검토</strong></div>`).join("")}
        </div>
      </article>
    `);
  }

  dom.ocrResults.innerHTML = cards.join("");
}

function emptyStateMarkup(title, body) {
  return `
    <div class="empty-state">
      <div>
        <strong>${title}</strong>
        <p>${body}</p>
      </div>
    </div>
  `;
}

async function handleScreenshotUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  clearImportPreview(false);
  uiState.uploadPreviewUrl = URL.createObjectURL(file);
  uiState.ocrStatus = "분석 중";
  uiState.ocrMessage = "업로드한 이미지에서 텍스트를 읽고 있습니다.";
  uiState.ocrProgress = 4;
  uiState.isRecognizing = true;
  renderOcrArea();

  try {
    if (!window.Tesseract) {
      throw new Error("OCR 라이브러리를 불러오지 못했습니다.");
    }

    const result = await window.Tesseract.recognize(file, "kor+eng", {
      logger: (message) => {
        if (typeof message.progress === "number") {
          uiState.ocrProgress = Math.round(message.progress * 100);
          uiState.ocrStatus = message.status === "recognizing text" ? "텍스트 인식 중" : "준비 중";
          uiState.ocrMessage = `OCR 상태: ${message.status}`;
          renderOcrArea();
        }
      },
    });

    uiState.ocrText = (result.data?.text || "").trim();
    uiState.ocrParsed = parseOcrText(uiState.ocrText);
    uiState.ocrProgress = 100;
    uiState.ocrStatus = "완료";
    uiState.ocrMessage = `보유 스냅샷 ${uiState.ocrParsed.snapshots.length}건, 거래 ${uiState.ocrParsed.transactions.length}건을 인식했습니다.`;
  } catch (error) {
    uiState.ocrStatus = "실패";
    uiState.ocrProgress = 0;
    uiState.ocrParsed = null;
    uiState.ocrMessage =
      "OCR 인식에 실패했습니다. 이미지 해상도가 낮거나 인터넷 연결로 언어 데이터를 못 받았을 수 있습니다.";
    uiState.ocrText = error instanceof Error ? error.message : "인식 오류";
  } finally {
    uiState.isRecognizing = false;
    renderOcrArea();
  }
}

function parseOcrText(rawText) {
  const text = normalizeOcrText(rawText);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const snapshots = [];
  const transactions = [];
  const warnings = [];
  const seen = new Set();
  const defaultAccountId = uiState.selectedAccountId !== "all" ? uiState.selectedAccountId : state.accounts[0]?.id;
  const accountId = findAccountIdFromText(text) || defaultAccountId;

  lines.forEach((line) => {
    const snapshot = parseSnapshotLine(line, accountId);
    if (snapshot) {
      const key = `snapshot-${snapshot.accountId}-${snapshot.name}-${snapshot.shares}-${snapshot.avgPrice}`;
      if (!seen.has(key)) {
        seen.add(key);
        snapshots.push(snapshot);
      }
      return;
    }

    const transaction = parseTransactionLine(line, accountId);
    if (transaction) {
      const key = `transaction-${transaction.accountId}-${transaction.name}-${transaction.type}-${transaction.shares}-${transaction.price}-${transaction.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        transactions.push(transaction);
      }
    }
  });

  if (!snapshots.length && !transactions.length) {
    warnings.push("텍스트 패턴이 뚜렷하지 않아 자동 분류가 어려웠습니다. OCR 미리보기를 보고 수동 거래 입력으로 보완해 주세요.");
  }

  if (snapshots.length + transactions.length > 0) {
    warnings.push("자동 반영 전 계좌와 수량, 평단이 실제 스크린샷과 맞는지 한 번만 확인해 주세요.");
  }

  return { snapshots, transactions, warnings };
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/[|]/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/원화/g, "원")
    .replace(/평 균/g, "평균")
    .replace(/평 단/g, "평단");
}

function parseSnapshotLine(line, fallbackAccountId) {
  const pattern = /(?<name>[A-Za-z가-힣0-9.&\-\s]{2,20})\s+(?<shares>[\d,]+)\s*(?:주|shares?)\s+(?:평균단가|평단|매입가)?\s*(?<avgPrice>[\d,]+(?:\.\d+)?)\s*(?:원|krw|\$)?(?:.*?(?:현재가|평가가|시세)\s*(?<currentPrice>[\d,]+(?:\.\d+)?))?/i;
  const match = line.match(pattern);
  if (!match || !match.groups) {
    return null;
  }

  const name = cleanStockName(match.groups.name);
  if (!name || isIgnoredKeyword(name)) {
    return null;
  }

  const shares = parseNumeric(match.groups.shares);
  const avgPrice = parseNumeric(match.groups.avgPrice);
  const currentPrice = parseNumeric(match.groups.currentPrice) || avgPrice;

  if (!shares || !avgPrice) {
    return null;
  }

  return {
    type: "snapshot",
    accountId: findAccountIdFromText(line) || fallbackAccountId || state.accounts[0]?.id,
    name,
    shares,
    avgPrice,
    currentPrice,
  };
}

function parseTransactionLine(line, fallbackAccountId) {
  const patterns = [
    /(?<date>\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})?\s*(?<name>[A-Za-z가-힣0-9.&\-\s]{2,20})\s+(?<type>매수|매도|buy|sell)\s+(?<shares>[\d,]+)\s*(?:주|shares?)\s+(?<price>[\d,]+(?:\.\d+)?)/i,
    /(?<date>\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2})?\s*(?<type>매수|매도|buy|sell)\s+(?<name>[A-Za-z가-힣0-9.&\-\s]{2,20})\s+(?<shares>[\d,]+)\s*(?:주|shares?)\s+(?<price>[\d,]+(?:\.\d+)?)/i,
  ];

  const matched = patterns
    .map((pattern) => line.match(pattern))
    .find((candidate) => candidate && candidate.groups);

  if (!matched || !matched.groups) {
    return null;
  }

  const name = cleanStockName(matched.groups.name);
  if (!name || isIgnoredKeyword(name)) {
    return null;
  }

  const shares = parseNumeric(matched.groups.shares);
  const price = parseNumeric(matched.groups.price);
  if (!shares || !price) {
    return null;
  }

  return {
    id: createId("ocr"),
    accountId: findAccountIdFromText(line) || fallbackAccountId || state.accounts[0]?.id,
    name,
    type: /매도|sell/i.test(matched.groups.type) ? "sell" : "buy",
    shares,
    price,
    date: normalizeTransactionDate(matched.groups.date),
    source: "ocr",
  };
}

function applyParsedImport() {
  const result = uiState.ocrParsed;
  if (!result) {
    return;
  }

  const recordTransactionsOnly = result.snapshots.length > 0;
  result.snapshots.forEach((snapshot) => applySnapshot(snapshot, { silent: true }));
  result.transactions
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((transaction) =>
      applyTransaction(transaction, {
        silent: true,
        recordOnly: recordTransactionsOnly,
      })
    );

  commitState();
  ensureSelections();
  render();
  clearImportPreview();
  toast("스크린샷 인식 결과를 반영했습니다.");
}

function clearImportPreview(resetInput = true) {
  if (uiState.uploadPreviewUrl) {
    URL.revokeObjectURL(uiState.uploadPreviewUrl);
  }

  uiState.uploadPreviewUrl = "";
  uiState.ocrText = "";
  uiState.ocrParsed = null;
  uiState.ocrProgress = 0;
  uiState.ocrStatus = "대기 중";
  uiState.ocrMessage = "이미지를 올리면 텍스트를 읽고 자동 분류를 시작합니다.";

  if (resetInput) {
    dom.screenshotInput.value = "";
  }

  renderOcrArea();
}

function applySnapshot(snapshot, options = {}) {
  const accountId = snapshot.accountId || state.accounts[0]?.id;
  const holding = findHolding(accountId, snapshot.name);

  if (holding) {
    holding.shares = snapshot.shares;
    holding.avgPrice = snapshot.avgPrice;
    holding.currentPrice = snapshot.currentPrice || snapshot.avgPrice;
  } else {
    state.holdings.push({
      id: createId("holding"),
      accountId,
      symbol: createSymbolFromName(snapshot.name),
      name: snapshot.name,
      sector: "자동 인식",
      shares: snapshot.shares,
      avgPrice: snapshot.avgPrice,
      currentPrice: snapshot.currentPrice || snapshot.avgPrice,
      monthlyHistory: [],
    });
  }

  if (!options.silent) {
    commitState();
    ensureSelections();
    render();
  }
}

function applyTransaction(transaction, options = {}) {
  const account = getAccountById(transaction.accountId);
  if (!account) {
    return;
  }

  let holding = findHolding(transaction.accountId, transaction.name);
  if (!holding && options.recordOnly) {
    transaction.symbol = transaction.symbol || createSymbolFromName(transaction.name);
    if (!state.transactions.some((item) => item.id === transaction.id)) {
      state.transactions.push(transaction);
    }

    if (!options.silent) {
      commitState();
      ensureSelections();
      render();
    }
    return;
  }

  if (!holding) {
    holding = {
      id: createId("holding"),
      accountId: transaction.accountId,
      symbol: transaction.symbol || createSymbolFromName(transaction.name),
      name: transaction.name,
      sector: "자동 분류",
      shares: 0,
      avgPrice: transaction.price,
      currentPrice: transaction.price,
      monthlyHistory: [],
    };
    state.holdings.push(holding);
  }

  const totalAmount = transaction.price * transaction.shares;
  const existingCost = holding.avgPrice * holding.shares;

  transaction.symbol = holding.symbol;

  if (!state.transactions.some((item) => item.id === transaction.id)) {
    state.transactions.push(transaction);
  }

  if (options.recordOnly) {
    if (!options.silent) {
      commitState();
      ensureSelections();
      render();
    }
    return;
  }

  if (transaction.type === "buy") {
    const nextShares = holding.shares + transaction.shares;
    holding.avgPrice = nextShares ? Math.round((existingCost + totalAmount) / nextShares) : transaction.price;
    holding.shares = nextShares;
    account.cash = Math.max(account.cash - totalAmount, 0);
  } else {
    holding.shares = Math.max(holding.shares - transaction.shares, 0);
    account.cash += totalAmount;
  }

  holding.currentPrice = transaction.price;

  if (holding.shares === 0) {
    holding.currentPrice = transaction.price;
  }

  if (!options.silent) {
    commitState();
    ensureSelections();
    render();
  }
}

function handleHoldingEdit(form) {
  const holding = state.holdings.find((item) => item.id === form.dataset.holdingId);
  if (!holding) {
    return;
  }

  const formData = new FormData(form);
  holding.shares = Number(formData.get("shares"));
  holding.avgPrice = Number(formData.get("avgPrice"));
  holding.currentPrice = Number(formData.get("currentPrice"));
  holding.sector = String(formData.get("sector") || "").trim() || "기타";
  commitState();
  render();
  toast("종목 정보를 저장했습니다.");
}

function handleAccountEdit(form) {
  const account = state.accounts.find((item) => item.id === form.dataset.accountId);
  if (!account) {
    return;
  }

  const formData = new FormData(form);
  account.cash = Number(formData.get("cash"));
  account.name = String(formData.get("name") || account.name).trim();
  commitState();
  hydrateAccountSelect();
  render();
  toast("계좌 정보를 저장했습니다.");
}

function commitState() {
  state.updatedAt = new Date().toISOString();
  syncHistories();
  saveState();
}

function syncHistories() {
  const currentMonth = getCurrentMonthKey();

  state.accounts.forEach((account) => {
    const metrics = getAccountMetrics(account.id);
    upsertAccountMonth(account.monthlyHistory, currentMonth, {
      assetValue: metrics.assetValue,
      avgCost: metrics.invested + account.cash,
    });
  });

  state.holdings.forEach((holding) => {
    upsertHoldingMonth(holding.monthlyHistory, currentMonth, {
      avgPrice: holding.avgPrice,
      evaluation: getHoldingValue(holding),
      costBasis: holding.avgPrice * holding.shares,
    });
  });

  state.accounts.forEach((account) => {
    account.monthlyHistory = normalizeMonthlyHistory(account.monthlyHistory).slice(-6);
  });
  state.holdings.forEach((holding) => {
    holding.monthlyHistory = normalizeHoldingHistory(holding.monthlyHistory).slice(-6);
  });

  saveState();
}

function upsertAccountMonth(history, month, value) {
  const index = history.findIndex((entry) => entry.month === month);
  if (index >= 0) {
    history[index] = { ...history[index], ...value };
  } else {
    history.push({ month, ...value });
  }
}

function upsertHoldingMonth(history, month, value) {
  const index = history.findIndex((entry) => entry.month === month);
  if (index >= 0) {
    history[index] = { ...history[index], ...value };
  } else {
    history.push({ month, ...value });
  }
}

function ensureSelections() {
  if (!state.accounts.some((account) => account.id === uiState.selectedAccountId) && uiState.selectedAccountId !== "all") {
    uiState.selectedAccountId = "all";
  }

  if (uiState.viewMode === "holdings") {
    const filteredHoldings = getFilteredHoldings();
    if (!filteredHoldings.some((holding) => holding.id === uiState.selectedHoldingId)) {
      uiState.selectedHoldingId = filteredHoldings[0]?.id || null;
    }
  } else {
    uiState.selectedHoldingId = null;
    const filteredAccounts = getFilteredAccounts();
    if (filteredAccounts.length && !filteredAccounts.some((account) => account.id === uiState.selectedAccountId) && uiState.selectedAccountId !== "all") {
      uiState.selectedAccountId = filteredAccounts[0].id;
    }
  }
}

function hydrateAccountSelect() {
  const selectedValue = dom.manualAccountSelect.value;
  dom.manualAccountSelect.innerHTML = state.accounts
    .map((account) => `<option value="${account.id}">${account.name}</option>`)
    .join("");
  if (state.accounts.some((account) => account.id === selectedValue)) {
    dom.manualAccountSelect.value = selectedValue;
  }

  if (!dom.manualTransactionForm.elements.date.value) {
    dom.manualTransactionForm.elements.date.value = getTodayDateInputValue();
  }
}

function getFilteredHoldings() {
  const search = uiState.searchTerm.toLowerCase();
  return state.holdings.filter((holding) => {
    const matchesAccount = uiState.selectedAccountId === "all" || holding.accountId === uiState.selectedAccountId;
    const haystack = `${holding.name} ${holding.symbol} ${getAccountById(holding.accountId)?.name || ""}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesAccount && matchesSearch;
  });
}

function getFilteredAccounts() {
  const search = uiState.searchTerm.toLowerCase();
  return state.accounts.filter((account) => {
    const matchesAccount = uiState.selectedAccountId === "all" || account.id === uiState.selectedAccountId;
    const haystack = account.name.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesAccount && matchesSearch;
  });
}

function getSelectedHolding() {
  return state.holdings.find((holding) => holding.id === uiState.selectedHoldingId) || null;
}

function getSelectedAccount() {
  if (uiState.selectedAccountId === "all") {
    return null;
  }

  return getAccountById(uiState.selectedAccountId) || null;
}

function getAccountById(accountId) {
  return state.accounts.find((account) => account.id === accountId) || null;
}

function getHoldingsByAccount(accountId) {
  return state.holdings.filter((holding) => holding.accountId === accountId);
}

function getHoldingValue(holding) {
  return holding.shares * holding.currentPrice;
}

function getHoldingCost(holding) {
  return holding.shares * holding.avgPrice;
}

function getAccountMetrics(accountId) {
  const account = getAccountById(accountId);
  const holdings = getHoldingsByAccount(accountId);
  const equityValue = holdings.reduce((sum, holding) => sum + getHoldingValue(holding), 0);
  const invested = holdings.reduce((sum, holding) => sum + getHoldingCost(holding), 0);
  const cash = account?.cash || 0;
  const assetValue = equityValue + cash;
  const profitLoss = equityValue - invested;
  const profitRate = invested ? (profitLoss / invested) * 100 : 0;

  return { equityValue, invested, cash, assetValue, profitLoss, profitRate };
}

function getPortfolioMetrics() {
  const summary = state.accounts.reduce(
    (accumulator, account) => {
      const metrics = getAccountMetrics(account.id);
      accumulator.equityValue += metrics.equityValue;
      accumulator.invested += metrics.invested;
      accumulator.cash += metrics.cash;
      accumulator.assetValue += metrics.assetValue;
      return accumulator;
    },
    {
      equityValue: 0,
      invested: 0,
      cash: 0,
      assetValue: 0,
      profitLoss: 0,
      profitRate: 0,
    }
  );

  summary.profitLoss = summary.equityValue - summary.invested;
  summary.profitRate = summary.invested ? (summary.profitLoss / summary.invested) * 100 : 0;
  return summary;
}

function getCombinedAccountHistory() {
  const months = getRecentMonthKeys(6);
  return months.map((month) => {
    const values = state.accounts.map((account) => account.monthlyHistory.find((entry) => entry.month === month) || { assetValue: 0, avgCost: 0 });
    return {
      month,
      assetValue: values.reduce((sum, entry) => sum + entry.assetValue, 0),
      avgCost: values.reduce((sum, entry) => sum + entry.avgCost, 0),
    };
  });
}

function getPortfolioAverageSeries() {
  return getCombinedAccountHistory();
}

function getHoldingCostSeries(holding) {
  return holding.monthlyHistory.slice(-6).map((entry) => ({
    month: entry.month,
    costBasis: entry.costBasis || entry.avgPrice * holding.shares,
    evaluation: entry.evaluation,
  }));
}

function getRecentTransactions(filter, limit) {
  return state.transactions
    .filter((transaction) => {
      const matchesAccount = !filter.accountId || transaction.accountId === filter.accountId;
      const matchesName = !filter.name || transaction.name === filter.name;
      return matchesAccount && matchesName;
    })
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
}

function findAccountIdFromText(text) {
  const normalized = compactHangul(text);
  return state.accounts.find((account) => normalized.includes(compactHangul(account.name)))?.id || null;
}

function findHolding(accountId, name) {
  const normalizedName = compactHangul(name);
  return state.holdings.find(
    (holding) => holding.accountId === accountId && compactHangul(holding.name) === normalizedName
  );
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatCompactCurrency(value) {
  return `${compactCurrencyFormatter.format(Number(value || 0))}원`;
}

function formatSignedCurrency(value) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function formatPercent(value, includeSign) {
  const numeric = Number(value || 0);
  const text = `${Math.abs(numeric).toFixed(1)}%`;
  if (!includeSign) {
    return text;
  }
  return `${numeric >= 0 ? "+" : "-"}${text}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatMonth(month) {
  const [year, numericMonth] = month.split("-");
  return `${year.slice(2)}.${numericMonth}`;
}

function parseNumeric(value) {
  if (!value) {
    return 0;
  }
  return Number(String(value).replace(/[^\d.]/g, ""));
}

function normalizeTransactionDate(value) {
  if (!value) {
    return getTodayDateInputValue();
  }

  const normalized = value.replace(/\./g, "-").replace(/\//g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-");
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (/^\d{1,2}-\d{1,2}$/.test(normalized)) {
    const [month, day] = normalized.split("-");
    return `${new Date().getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return getTodayDateInputValue();
}

function cleanStockName(name) {
  return String(name || "")
    .replace(/\b(?:매수|매도|buy|sell|평단|평균단가|현재가|시세|주)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isIgnoredKeyword(text) {
  const compact = compactHangul(text);
  return ["총자산", "평가금액", "보유종목", "계좌잔고", "평가손익", "주문가능", "예수금"].some((keyword) =>
    compact.includes(compactHangul(keyword))
  );
}

function createSymbolFromName(name) {
  return compactHangul(name).slice(0, 10).toUpperCase();
}

function compactHangul(text) {
  return String(text || "").replace(/\s+/g, "").toLowerCase();
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRecentMonthKeys(count) {
  const now = new Date();
  const result = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    result.push(getCurrentMonthKey(date));
  }
  return result;
}

function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getTodayDateInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toast(message) {
  uiState.ocrMessage = message;
  renderOcrArea();
}
