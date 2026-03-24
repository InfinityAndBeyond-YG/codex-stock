const marketStocks = [
  {
    id: "kr-samsung",
    name: "삼성전자",
    ticker: "005930",
    market: "kr",
    currency: "KRW",
    price: 74800,
    changePercent: 5.1,
    volume: 12800000,
    favorite: true,
    history: [70600, 71100, 71800, 72100, 72600, 73200, 72800, 73400, 73900, 74200, 74600, 74800],
  },
  {
    id: "kr-skhynix",
    name: "SK하이닉스",
    ticker: "000660",
    market: "kr",
    currency: "KRW",
    price: 181000,
    changePercent: 4.2,
    volume: 3100000,
    favorite: true,
    history: [172000, 173500, 175000, 174000, 176200, 177900, 178600, 179400, 180200, 180800, 181400, 181000],
  },
  {
    id: "kr-naver",
    name: "NAVER",
    ticker: "035420",
    market: "kr",
    currency: "KRW",
    price: 213500,
    changePercent: -1.4,
    volume: 740000,
    favorite: false,
    history: [218000, 217500, 216800, 215400, 214200, 214900, 214100, 213700, 213200, 213900, 213600, 213500],
  },
  {
    id: "kr-kakao",
    name: "카카오",
    ticker: "035720",
    market: "kr",
    currency: "KRW",
    price: 44200,
    changePercent: 1.1,
    volume: 2100000,
    favorite: false,
    history: [43100, 43300, 43500, 43400, 43700, 43900, 43800, 44000, 44100, 44200, 44300, 44200],
  },
  {
    id: "kr-celtrion",
    name: "셀트리온",
    ticker: "068270",
    market: "kr",
    currency: "KRW",
    price: 184300,
    changePercent: 0.6,
    volume: 560000,
    favorite: false,
    history: [181000, 181600, 182100, 182800, 183400, 183900, 184100, 184000, 184400, 184200, 184500, 184300],
  },
  {
    id: "us-nvidia",
    name: "NVIDIA",
    ticker: "NVDA",
    market: "us",
    currency: "USD",
    price: 129.4,
    changePercent: 2.8,
    volume: 48600000,
    favorite: true,
    history: [123.2, 124.1, 124.6, 125.8, 126.7, 127.1, 127.9, 128.4, 128.8, 129.1, 129.6, 129.4],
  },
  {
    id: "us-apple",
    name: "Apple",
    ticker: "AAPL",
    market: "us",
    currency: "USD",
    price: 214.2,
    changePercent: 1.7,
    volume: 24100000,
    favorite: true,
    history: [208.4, 209.2, 209.6, 210.4, 211.1, 212.2, 212.7, 213.4, 213.9, 214.1, 214.5, 214.2],
  },
  {
    id: "us-tesla",
    name: "Tesla",
    ticker: "TSLA",
    market: "us",
    currency: "USD",
    price: 242.5,
    changePercent: -0.9,
    volume: 31800000,
    favorite: true,
    history: [246.4, 245.7, 245.2, 244.8, 244.3, 243.9, 243.1, 242.8, 242.6, 242.4, 242.7, 242.5],
  },
  {
    id: "us-microsoft",
    name: "Microsoft",
    ticker: "MSFT",
    market: "us",
    currency: "USD",
    price: 438.3,
    changePercent: 0.8,
    volume: 18700000,
    favorite: false,
    history: [431.5, 432.6, 433.1, 434.7, 435.4, 436.1, 436.9, 437.4, 437.8, 438.0, 438.6, 438.3],
  },
  {
    id: "us-amazon",
    name: "Amazon",
    ticker: "AMZN",
    market: "us",
    currency: "USD",
    price: 201.8,
    changePercent: 1.2,
    volume: 21300000,
    favorite: false,
    history: [197.4, 198.1, 198.7, 199.2, 199.9, 200.2, 200.7, 201.0, 201.3, 201.6, 202.0, 201.8],
  },
];

const moneyFormatterKrw = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const moneyFormatterUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

const favoriteStorageKey = "stockflow-market-favorites";
const reportStorageKey = "stockflow-market-reports";
const dom = {};

const state = {
  selectedStockId: null,
  searchQuery: "",
  chartRange: "1D",
  favoritePanelOpen: false,
};

document.addEventListener("DOMContentLoaded", initMarketPage);

function initMarketPage() {
  hydrateFavoriteStocks();
  cacheDom();
  const boardMarket = getBoardMarket(getMarketSession());
  state.selectedStockId = getStocksByMarket(boardMarket)[0]?.id || marketStocks[0].id;
  bindEvents();
  renderMarketPage();
}

function cacheDom() {
  [
    "marketSearchInput",
    "marketSearchResults",
    "favoriteTabButton",
    "favoriteKrCountBadge",
    "favoriteUsCountBadge",
    "favoritePanel",
    "marketBoardTitle",
    "marketBoardCaption",
    "marketRankingList",
    "chartStockName",
    "chartStockMeta",
    "chartStockPrice",
    "chartStockChange",
    "chartRangeSwitch",
    "marketChart",
    "chartDetailStats",
    "chartPriceScale",
    "chartAxisLabels",
    "heroKrStatus",
    "heroUsStatus",
    "stockReportTitle",
    "stockReportMeta",
    "stockReportEditor",
  ].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function bindEvents() {
  dom.marketSearchInput?.addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim();
    renderMarketPage();
  });

  dom.marketSearchResults?.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite-toggle]");
    if (favoriteButton) {
      toggleFavoriteStock(favoriteButton.dataset.favoriteToggle);
      renderMarketPage();
      return;
    }

    const button = event.target.closest("[data-stock-id]");
    if (!button) {
      return;
    }

    const stock = getStockById(button.dataset.stockId);
    if (!stock) {
      return;
    }

    state.selectedStockId = stock.id;
    state.searchQuery = "";
    if (dom.marketSearchInput) {
      dom.marketSearchInput.value = stock.name;
    }
    renderMarketPage();
  });

  dom.favoriteTabButton?.addEventListener("click", () => {
    state.favoritePanelOpen = !state.favoritePanelOpen;
    renderFavoritePanel();
  });

  dom.favoritePanel?.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite-toggle]");
    if (favoriteButton) {
      toggleFavoriteStock(favoriteButton.dataset.favoriteToggle);
      renderMarketPage();
      return;
    }

    const button = event.target.closest("[data-stock-id]");
    if (!button) {
      return;
    }

    state.selectedStockId = button.dataset.stockId;
    renderMarketPage();
  });

  dom.marketRankingList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ranking-id]");
    if (!button) {
      return;
    }

    state.selectedStockId = button.dataset.rankingId;
    renderMarketPage();
  });

  dom.chartRangeSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chart-range]");
    if (!button) {
      return;
    }

    state.chartRange = button.dataset.chartRange;
    renderMarketPage();
  });

  dom.stockReportEditor?.addEventListener("input", (event) => {
    const selectedStock = getSelectedStock();
    if (!selectedStock) {
      return;
    }

    persistStockReport(selectedStock.id, event.target.value);
  });
}

function renderMarketPage() {
  renderSessionSummary();
  renderSearchResults();
  renderFavoritePanel();
  renderChart();
  renderRankingBoard();
  renderStockReport();
}

function renderSessionSummary() {
  const session = getMarketSession();
  if (dom.heroKrStatus) {
    dom.heroKrStatus.textContent = getKrMarketStatusLabel(session);
  }

  if (dom.heroUsStatus) {
    dom.heroUsStatus.textContent = getUsMarketStatusLabel(session);
  }
}

function renderSearchResults() {
  if (!dom.marketSearchResults) {
    return;
  }

  const query = state.searchQuery.toLowerCase();
  if (!query) {
    dom.marketSearchResults.innerHTML = "";
    return;
  }

  const results = marketStocks
    .filter((stock) => {
      const label = `${stock.name} ${stock.ticker}`.toLowerCase();
      return label.includes(query);
    })
    .slice(0, 6);

  if (!results.length) {
    dom.marketSearchResults.innerHTML = `<p class="empty-search-result">검색 결과가 없습니다.</p>`;
    return;
  }

  dom.marketSearchResults.innerHTML = results
    .map(
      (stock) => `
        <article class="search-result-chip">
          <button type="button" class="search-result-main" data-stock-id="${stock.id}">
            <span>${stock.name}</span>
            <small>${stock.ticker} · ${stock.market === "kr" ? "한국주식" : "미국주식"}</small>
          </button>
          <button
            type="button"
            class="favorite-star-button ${stock.favorite ? "active" : ""}"
            data-favorite-toggle="${stock.id}"
            aria-pressed="${stock.favorite ? "true" : "false"}"
            aria-label="${stock.favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}"
          >
            &#9733;
          </button>
        </article>
      `
    )
    .join("");
}

function renderFavoritePanel() {
  if (!dom.favoritePanel || !dom.favoriteTabButton || !dom.favoriteKrCountBadge || !dom.favoriteUsCountBadge) {
    return;
  }

  const session = getMarketSession();
  const favorites = getFavoriteStocks(getPreferredFavoriteMarket(session));
  dom.favoriteKrCountBadge.textContent = `${getFavoriteStocksByMarket("kr").length}`;
  dom.favoriteUsCountBadge.textContent = `${getFavoriteStocksByMarket("us").length}`;
  dom.favoriteTabButton.classList.toggle("active", state.favoritePanelOpen);
  dom.favoriteTabButton.setAttribute("aria-expanded", state.favoritePanelOpen ? "true" : "false");
  dom.favoritePanel.classList.toggle("open", state.favoritePanelOpen);

  if (!state.favoritePanelOpen) {
    dom.favoritePanel.innerHTML = "";
    return;
  }

  if (!favorites.length) {
    dom.favoritePanel.innerHTML = `<p class="favorite-empty-copy">즐겨찾기한 종목이 아직 없습니다.</p>`;
    return;
  }

  dom.favoritePanel.innerHTML = favorites
    .map(
      (stock) => `
        <article class="favorite-item ${stock.id === state.selectedStockId ? "active" : ""}">
          <button type="button" class="favorite-item-main" data-stock-id="${stock.id}">
            <strong>${stock.name}</strong>
            <small>${stock.ticker} · ${formatMoney(stock.price, stock.currency)}</small>
          </button>
          <button
            type="button"
            class="favorite-star-button active"
            data-favorite-toggle="${stock.id}"
            aria-pressed="true"
            aria-label="즐겨찾기 해제"
          >
            &#9733;
          </button>
        </article>
      `
    )
    .join("");
}

function renderChart() {
  const selectedStock = getSelectedStock();
  if (!selectedStock || !dom.marketChart) {
    return;
  }

  const chartSeries = getChartSeriesByRange(selectedStock, state.chartRange);
  const chartDetails = getChartDetails(chartSeries);

  if (dom.chartStockName) {
    dom.chartStockName.textContent = selectedStock.name;
  }

  if (dom.chartStockMeta) {
    const marketLabel = selectedStock.market === "kr" ? "한국주식" : "미국주식";
    dom.chartStockMeta.textContent = `${selectedStock.ticker} · ${marketLabel} · ${chartSeries.rangeLabel}`;
  }

  if (dom.chartStockPrice) {
    dom.chartStockPrice.textContent = formatMoney(selectedStock.price, selectedStock.currency);
  }

  if (dom.chartStockChange) {
    const positive = selectedStock.changePercent >= 0;
    dom.chartStockChange.className = `change-pill ${positive ? "positive" : "negative"}`;
    dom.chartStockChange.textContent = `${positive ? "+" : ""}${percentFormatter.format(selectedStock.changePercent)}%`;
  }

  const lineColor = getChartLineColor(selectedStock);
  const gridMarkup = [20, 66, 112, 158, 204]
    .map(
      (y) =>
        `<line x1="24" y1="${y}" x2="616" y2="${y}" stroke="rgba(21,42,76,0.08)" stroke-width="1" stroke-dasharray="4 6" />`
    )
    .join("");

  const { linePath, areaPath, points } = buildChartPaths(chartSeries.values);
  const lastPoint = points[points.length - 1];
  dom.marketChart.innerHTML = `
    <defs>
      <linearGradient id="chartAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.24" />
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02" />
      </linearGradient>
    </defs>
    ${gridMarkup}
    <line x1="24" y1="${lastPoint.y.toFixed(2)}" x2="616" y2="${lastPoint.y.toFixed(2)}" stroke="${lineColor}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.55"></line>
    <path d="${areaPath}" fill="url(#chartAreaGradient)"></path>
    <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    <circle cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="6" fill="#ffffff" stroke="${lineColor}" stroke-width="3"></circle>
  `;

  if (dom.chartAxisLabels) {
    dom.chartAxisLabels.innerHTML = chartSeries.labels.map((label) => `<span>${label}</span>`).join("");
  }

  if (dom.chartRangeSwitch) {
    const buttons = dom.chartRangeSwitch.querySelectorAll("[data-chart-range]");
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.chartRange === state.chartRange);
    });
  }

  if (dom.chartDetailStats) {
    dom.chartDetailStats.innerHTML = [
      { label: "시가", value: formatMoney(chartDetails.open, selectedStock.currency) },
      { label: "고가", value: formatMoney(chartDetails.high, selectedStock.currency) },
      { label: "저가", value: formatMoney(chartDetails.low, selectedStock.currency) },
      { label: "변동폭", value: formatMoney(chartDetails.range, selectedStock.currency) },
    ]
      .map(
        (item) => `
          <span class="chart-inline-stat">
            <em>${item.label}</em>
            <strong>${item.value}</strong>
          </span>
        `
      )
      .join("");
  }

  if (dom.chartPriceScale) {
    dom.chartPriceScale.innerHTML = chartDetails.priceScale
      .map((value) => `<span>${formatMoney(value, selectedStock.currency)}</span>`)
      .join("");
  }
}

function renderRankingBoard() {
  if (!dom.marketRankingList || !dom.marketBoardTitle || !dom.marketBoardCaption) {
    return;
  }

  const session = getMarketSession();
  const boardMarket = getBoardMarket(session);
  const stocks = getStocksByMarket(boardMarket).slice().sort((left, right) => right.volume - left.volume);

  dom.marketBoardTitle.textContent =
    boardMarket === "kr" ? "한국주식 거래량 순위" : "미국주식 거래량 순위";
  dom.marketBoardCaption.textContent = getBoardCaption(session, boardMarket);

  dom.marketRankingList.innerHTML = stocks
    .map((stock, index) => {
      const positive = stock.changePercent >= 0;
      return `
        <button type="button" class="ranking-card ${stock.id === state.selectedStockId ? "active" : ""}" data-ranking-id="${stock.id}">
          <span class="ranking-number">${index + 1}</span>
          <div class="ranking-copy">
            <strong>${stock.name}</strong>
            <p>${stock.ticker} · ${formatMoney(stock.price, stock.currency)}</p>
          </div>
          <div class="ranking-meta">
            <span class="change-pill ${positive ? "positive" : "negative"}">${positive ? "+" : ""}${percentFormatter.format(stock.changePercent)}%</span>
            <small>${formatCompactValue(stock.volume)}</small>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderStockReport() {
  const selectedStock = getSelectedStock();
  if (!selectedStock) {
    return;
  }

  if (dom.stockReportTitle) {
    dom.stockReportTitle.textContent = `${selectedStock.name} 리포트`;
  }

  if (dom.stockReportMeta) {
    dom.stockReportMeta.textContent = `${selectedStock.ticker} · ${selectedStock.market === "kr" ? "한국주식" : "미국주식"} 분석 메모`;
  }

  if (dom.stockReportEditor) {
    dom.stockReportEditor.value = getStockReport(selectedStock.id);
  }
}

function getSelectedStock() {
  const boardMarket = getBoardMarket(getMarketSession());
  return getStockById(state.selectedStockId) || getStocksByMarket(boardMarket)[0] || marketStocks[0];
}

function getStocksByMarket(market) {
  return marketStocks.filter((stock) => stock.market === market);
}

function getStockById(stockId) {
  return marketStocks.find((stock) => stock.id === stockId);
}

function getFavoriteStocksByMarket(market) {
  return marketStocks.filter((stock) => stock.favorite && stock.market === market);
}

function getPreferredFavoriteMarket(session) {
  return getBoardMarket(session);
}

function getFavoriteStocks(preferredMarket) {
  const favorites = marketStocks.filter((stock) => stock.favorite);
  if (!preferredMarket) {
    return favorites;
  }

  return favorites.sort((left, right) => {
    const leftPriority = left.market === preferredMarket ? 0 : 1;
    const rightPriority = right.market === preferredMarket ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.market !== right.market) {
      return left.market.localeCompare(right.market);
    }

    return left.name.localeCompare(right.name, "ko");
  });
}

function toggleFavoriteStock(stockId) {
  const stock = getStockById(stockId);
  if (!stock) {
    return;
  }

  stock.favorite = !stock.favorite;
  persistFavoriteStocks();
}

function hydrateFavoriteStocks() {
  try {
    const saved = window.localStorage.getItem(favoriteStorageKey);
    if (!saved) {
      return;
    }

    const ids = JSON.parse(saved);
    if (!Array.isArray(ids)) {
      return;
    }

    marketStocks.forEach((stock) => {
      stock.favorite = ids.includes(stock.id);
    });
  } catch (error) {
    console.warn("Favorite stocks could not be loaded.", error);
  }
}

function persistFavoriteStocks() {
  try {
    const favoriteIds = marketStocks.filter((stock) => stock.favorite).map((stock) => stock.id);
    window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favoriteIds));
  } catch (error) {
    console.warn("Favorite stocks could not be saved.", error);
  }
}

function getStockReport(stockId) {
  try {
    const saved = window.localStorage.getItem(reportStorageKey);
    if (!saved) {
      return "";
    }

    const reports = JSON.parse(saved);
    if (!reports || typeof reports !== "object") {
      return "";
    }

    return typeof reports[stockId] === "string" ? reports[stockId] : "";
  } catch (error) {
    console.warn("Stock report could not be loaded.", error);
    return "";
  }
}

function persistStockReport(stockId, value) {
  try {
    const saved = window.localStorage.getItem(reportStorageKey);
    const reports = saved ? JSON.parse(saved) : {};
    const nextReports = reports && typeof reports === "object" ? reports : {};
    nextReports[stockId] = value;
    window.localStorage.setItem(reportStorageKey, JSON.stringify(nextReports));
  } catch (error) {
    console.warn("Stock report could not be saved.", error);
  }
}

function getMarketSession() {
  return {
    kr: getSessionStateForTimeZone("Asia/Seoul", 9, 0, 15, 30),
    us: getSessionStateForTimeZone("America/New_York", 9, 30, 16, 0),
  };
}

function getSessionStateForTimeZone(timeZone, startHour, startMinute, endHour, endMinute) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const totalMinutes = hour * 60 + minute;
  const openMinutes = startHour * 60 + startMinute;
  const closeMinutes = endHour * 60 + endMinute;
  const weekdayOpen = !["Sat", "Sun"].includes(weekday);

  return {
    open: weekdayOpen && totalMinutes >= openMinutes && totalMinutes <= closeMinutes,
    timeZone,
  };
}

function getKrMarketStatusLabel(session) {
  return `${session.kr.open ? "한국 장중" : "한국 장마감"} · ${formatClock("Asia/Seoul")} KST`;
}

function getUsMarketStatusLabel(session) {
  return `${session.us.open ? "미국 장중" : "미국 장마감"} · ${formatClock("America/New_York")} ET`;
}

function getChartLineColor(stock) {
  if (stock.market === "us") {
    return "#f28c28";
  }

  return stock.changePercent >= 0 ? "#0c72de" : "#de5967";
}

function getBoardCaption(session, boardMarket) {
  if (boardMarket === "kr") {
    return session.kr.open ? "한국 정규장 · 거래량 높은 순" : "한국 장마감 · 최근 기준 순위";
  }

  return session.us.open ? "미국 정규장 · 거래량 높은 순" : "미국 장마감 · 최근 기준 순위";
}

function getBoardMarket(session) {
  if (session.kr.open) {
    return "kr";
  }

  if (session.us.open) {
    return "us";
  }

  return "kr";
}

function buildChartPaths(series) {
  const width = 640;
  const height = 240;
  const left = 24;
  const right = 24;
  const top = 20;
  const bottom = 28;
  const minValue = Math.min(...series);
  const maxValue = Math.max(...series);
  const valueRange = maxValue - minValue || 1;
  const stepX = (width - left - right) / Math.max(series.length - 1, 1);

  const points = series.map((value, index) => {
    const x = left + stepX * index;
    const normalized = (value - minValue) / valueRange;
    const y = height - bottom - normalized * (height - top - bottom);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height - bottom} L ${points[0].x.toFixed(2)} ${height - bottom} Z`;

  return { linePath, areaPath, points };
}

function getChartDetails(chartSeries) {
  const history = chartSeries.values;
  const open = history[0];
  const high = Math.max(...history);
  const low = Math.min(...history);
  const priceScale = buildPriceScale(low, high);

  return {
    open,
    high,
    low,
    range: high - low,
    priceScale,
  };
}

function buildPriceScale(low, high) {
  const steps = 5;
  const range = high - low || 1;
  return Array.from({ length: steps }, (_, index) => {
    const ratio = 1 - index / (steps - 1);
    return low + range * ratio;
  });
}

function getChartSeriesByRange(stock, range) {
  if (range === "ALL") {
    return {
      values: buildRangeSeries(stock.price, 18, 0.95, stock.changePercent),
      labels: buildYearLabels(15),
      rangeLabel: "전체 흐름",
    };
  }

  if (range === "10Y") {
    return {
      values: buildRangeSeries(stock.price, 16, 0.72, stock.changePercent),
      labels: buildYearLabels(10),
      rangeLabel: "10년 흐름",
    };
  }

  if (range === "5Y") {
    return {
      values: buildRangeSeries(stock.price, 14, 0.48, stock.changePercent),
      labels: buildYearLabels(5),
      rangeLabel: "5년 흐름",
    };
  }

  if (range === "3Y") {
    return {
      values: buildRangeSeries(stock.price, 12, 0.32, stock.changePercent),
      labels: buildYearLabels(3),
      rangeLabel: "3년 흐름",
    };
  }

  if (range === "1W") {
    return {
      values: buildRangeSeries(stock.price, 5, 0.042, stock.changePercent),
      labels: ["월", "화", "수", "목", "금"],
      rangeLabel: "1주 흐름",
    };
  }

  if (range === "1M") {
    return {
      values: buildRangeSeries(stock.price, 6, 0.085, stock.changePercent),
      labels: ["1주", "2주", "3주", "4주", "5주", "현재"],
      rangeLabel: "1달 흐름",
    };
  }

  if (range === "1Y") {
    return {
      values: buildRangeSeries(stock.price, 12, 0.18, stock.changePercent),
      labels: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
      rangeLabel: "1년 흐름",
    };
  }

  return {
    values: stock.history,
    labels: stock.market === "kr" ? ["09:00", "11:00", "13:00", "15:30"] : ["09:30", "11:30", "14:00", "16:00"],
    rangeLabel: "1일 흐름",
  };
}

function buildRangeSeries(latestPrice, count, spreadRatio, changePercent) {
  const direction = changePercent >= 0 ? 1 : -1;
  const baseStart = latestPrice * (1 - spreadRatio * direction);

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(count - 1, 1);
    const wave = Math.sin((index + 1) * 1.35) * latestPrice * spreadRatio * 0.18;
    const trend = baseStart + (latestPrice - baseStart) * progress;
    return Math.max(1, trend + wave);
  }).map((value, index, values) => (index === values.length - 1 ? latestPrice : Number(value.toFixed(2))));
}

function buildYearLabels(yearSpan) {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearSpan;
  const checkpoints = [0, 0.33, 0.66, 1]
    .map((ratio) => startYear + Math.round(yearSpan * ratio))
    .filter((year, index, years) => years.indexOf(year) === index);

  if (checkpoints[checkpoints.length - 1] !== currentYear) {
    checkpoints[checkpoints.length - 1] = currentYear;
  }

  return checkpoints.map((year) => `${year}`);
}

function formatClock(timeZone) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatMoney(value, currency) {
  if (currency === "USD") {
    return moneyFormatterUsd.format(value);
  }

  return moneyFormatterKrw.format(Math.round(value));
}

function formatCompactValue(value) {
  return compactFormatter.format(value);
}
