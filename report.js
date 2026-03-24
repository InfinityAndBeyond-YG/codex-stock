const reportStocks = [
  { id: "kr-samsung", name: "삼성전자", ticker: "005930", market: "kr" },
  { id: "kr-skhynix", name: "SK하이닉스", ticker: "000660", market: "kr" },
  { id: "kr-naver", name: "NAVER", ticker: "035420", market: "kr" },
  { id: "kr-kakao", name: "카카오", ticker: "035720", market: "kr" },
  { id: "kr-celtrion", name: "셀트리온", ticker: "068270", market: "kr" },
  { id: "us-nvidia", name: "NVIDIA", ticker: "NVDA", market: "us" },
  { id: "us-apple", name: "Apple", ticker: "AAPL", market: "us" },
  { id: "us-tesla", name: "Tesla", ticker: "TSLA", market: "us" },
  { id: "us-microsoft", name: "Microsoft", ticker: "MSFT", market: "us" },
  { id: "us-amazon", name: "Amazon", ticker: "AMZN", market: "us" },
];

const reportStorageKey = "stockflow-market-reports";
const dom = {};
const state = {
  selectedStockId: reportStocks[0].id,
};

document.addEventListener("DOMContentLoaded", initReportPage);

function initReportPage() {
  cacheDom();
  bindEvents();
  renderReportPage();
}

function cacheDom() {
  [
    "reportTotalCount",
    "reportSavedCount",
    "reportMarketMix",
    "reportStockList",
    "reportPageTitle",
    "reportPageMeta",
    "reportPageEditor",
  ].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function bindEvents() {
  dom.reportStockList?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-stock-id]");
    if (!item) {
      return;
    }

    state.selectedStockId = item.dataset.stockId;
    renderReportPage();
  });

  dom.reportPageEditor?.addEventListener("input", (event) => {
    const stock = getSelectedStock();
    if (!stock) {
      return;
    }

    persistStockReport(stock.id, event.target.value);
    renderReportStats();
    renderReportStockList();
  });
}

function renderReportPage() {
  renderReportStats();
  renderReportStockList();
  renderReportEditor();
}

function renderReportStats() {
  const savedCount = reportStocks.filter((stock) => Boolean(getStockReport(stock.id).trim())).length;
  const krCount = reportStocks.filter((stock) => stock.market === "kr").length;
  const usCount = reportStocks.filter((stock) => stock.market === "us").length;

  if (dom.reportTotalCount) {
    dom.reportTotalCount.textContent = `${reportStocks.length}개`;
  }

  if (dom.reportSavedCount) {
    dom.reportSavedCount.textContent = `${savedCount}개`;
  }

  if (dom.reportMarketMix) {
    dom.reportMarketMix.textContent = `한국 ${krCount} · 미국 ${usCount}`;
  }
}

function renderReportStockList() {
  if (!dom.reportStockList) {
    return;
  }

  dom.reportStockList.innerHTML = reportStocks
    .map((stock, index) => renderReportStockItem(stock, index))
    .join("");
}

function renderReportStockItem(stock, index) {
  const note = getStockReport(stock.id).trim();
  const preview = note ? `${note.slice(0, 22)}${note.length > 22 ? "..." : ""}` : "메모 없음";
  const status = note ? "작성됨" : "비어있음";
  const color = stock.market === "us" ? "#ef8a26" : "#0c72de";

  return `
    <article class="selector-item ${state.selectedStockId === stock.id ? "active" : ""}" data-stock-id="${stock.id}">
      <div class="selector-left">
        <span class="selector-dot" style="background:${color}"></span>
        <div class="selector-label">
          <strong>${stock.name}</strong>
          <span>${stock.ticker} · ${stock.market === "kr" ? "한국주식" : "미국주식"}</span>
        </div>
      </div>
      <div class="selector-right">
        <strong class="selector-value">${status}</strong>
        <span class="selector-meta">${preview}</span>
      </div>
    </article>
  `;
}

function renderReportEditor() {
  const stock = getSelectedStock();
  if (!stock) {
    return;
  }

  if (dom.reportPageTitle) {
    dom.reportPageTitle.textContent = `${stock.name} 리포트`;
  }

  if (dom.reportPageMeta) {
    dom.reportPageMeta.textContent = `${stock.ticker} · ${stock.market === "kr" ? "한국주식" : "미국주식"} 분석 메모`;
  }

  if (dom.reportPageEditor) {
    dom.reportPageEditor.value = getStockReport(stock.id);
  }
}

function getSelectedStock() {
  return reportStocks.find((stock) => stock.id === state.selectedStockId) || reportStocks[0];
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
