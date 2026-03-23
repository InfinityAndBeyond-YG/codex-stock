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

const dom = {};

const state = {
  selectedStockId: null,
  searchQuery: "",
};

document.addEventListener("DOMContentLoaded", initMarketPage);

function initMarketPage() {
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
    "marketBoardTitle",
    "marketBoardCaption",
    "marketRankingList",
    "chartStockName",
    "chartStockMeta",
    "chartStockPrice",
    "chartStockChange",
    "marketChart",
    "chartAxisLabels",
    "heroLiveStatus",
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
    const button = event.target.closest("[data-stock-id]");
    if (!button) {
      return;
    }

    const stock = getStockById(button.dataset.stockId);
    if (!stock) {
      return;
    }

    state.selectedStockId = stock.id;
    state.searchQuery = stock.name;
    if (dom.marketSearchInput) {
      dom.marketSearchInput.value = stock.name;
    }
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
}

function renderMarketPage() {
  renderSessionSummary();
  renderSearchResults();
  renderChart();
  renderRankingBoard();
}

function renderSessionSummary() {
  const session = getMarketSession();
  if (dom.heroLiveStatus) {
    dom.heroLiveStatus.textContent = getLiveMarketStatusLabel(session);
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
        <button type="button" class="search-result-chip" data-stock-id="${stock.id}">
          <span>${stock.name}</span>
          <small>${stock.ticker} · ${stock.market === "kr" ? "한국주식" : "미국주식"}</small>
        </button>
      `
    )
    .join("");
}

function renderChart() {
  const selectedStock = getSelectedStock();
  if (!selectedStock || !dom.marketChart) {
    return;
  }

  if (dom.chartStockName) {
    dom.chartStockName.textContent = selectedStock.name;
  }

  if (dom.chartStockMeta) {
    const marketLabel = selectedStock.market === "kr" ? "한국주식" : "미국주식";
    dom.chartStockMeta.textContent = `${selectedStock.ticker} · ${marketLabel} · 거래량 ${formatCompactValue(selectedStock.volume)}`;
  }

  if (dom.chartStockPrice) {
    dom.chartStockPrice.textContent = formatMoney(selectedStock.price, selectedStock.currency);
  }

  if (dom.chartStockChange) {
    const positive = selectedStock.changePercent >= 0;
    dom.chartStockChange.className = `change-pill ${positive ? "positive" : "negative"}`;
    dom.chartStockChange.textContent = `${positive ? "+" : ""}${percentFormatter.format(selectedStock.changePercent)}%`;
  }

  const lineColor = selectedStock.changePercent >= 0 ? "#0c72de" : "#de5967";
  const gridMarkup = [20, 80, 140, 200]
    .map(
      (y) =>
        `<line x1="24" y1="${y}" x2="616" y2="${y}" stroke="rgba(21,42,76,0.08)" stroke-width="1" stroke-dasharray="4 6" />`
    )
    .join("");

  const { linePath, areaPath } = buildChartPaths(selectedStock.history);
  dom.marketChart.innerHTML = `
    <defs>
      <linearGradient id="chartAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.24" />
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02" />
      </linearGradient>
    </defs>
    ${gridMarkup}
    <path d="${areaPath}" fill="url(#chartAreaGradient)"></path>
    <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
  `;

  if (dom.chartAxisLabels) {
    const labels = selectedStock.market === "kr"
      ? ["09:00", "11:00", "13:00", "15:30"]
      : ["09:30", "11:30", "14:00", "16:00"];

    dom.chartAxisLabels.innerHTML = labels.map((label) => `<span>${label}</span>`).join("");
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

function getLiveMarketStatusLabel(session) {
  if (session.kr.open) {
    return `한국 장중 · ${formatClock("Asia/Seoul")} KST`;
  }

  if (session.us.open) {
    return `미국 장중 · ${formatClock("America/New_York")} ET`;
  }

  return `장중 시장 없음 · ${formatClock("Asia/Seoul")} KST`;
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

  return { linePath, areaPath };
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
