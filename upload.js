const uploadDom = {};

document.addEventListener("DOMContentLoaded", initUploadPage);

function initUploadPage() {
  if (!window.StockFlowLedger) {
    return;
  }

  cacheUploadDom();
  populateUploadSelects();
  bindUploadEvents();
  setUploadDefaults();
  renderUploadPage();
}

function cacheUploadDom() {
  [
    "uploadTradeCount",
    "uploadTradeCountMeta",
    "uploadTradeMix",
    "uploadLastTradeDate",
    "tradeEntryForm",
    "tradeDateInput",
    "tradeAccountInput",
    "tradeStockInput",
    "tradeTypeInput",
    "tradeQuantityInput",
    "tradePriceInput",
    "tradeFeeInput",
    "tradeTaxInput",
    "tradeFormFeedback",
    "uploadTransactionList",
  ].forEach((id) => {
    uploadDom[id] = document.getElementById(id);
  });
}

function populateUploadSelects() {
  if (uploadDom.tradeAccountInput) {
    uploadDom.tradeAccountInput.innerHTML = window.StockFlowLedger.accounts
      .map(
        (account) => `<option value="${account.id}">${account.name}</option>`
      )
      .join("");
  }

  if (uploadDom.tradeStockInput) {
    uploadDom.tradeStockInput.innerHTML = window.StockFlowLedger.stocks
      .map(
        (stock) =>
          `<option value="${stock.id}">${stock.name} · ${stock.ticker} · ${
            stock.market === "kr" ? "한국주식" : "미국주식"
          }</option>`
      )
      .join("");
  }
}

function bindUploadEvents() {
  uploadDom.tradeEntryForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      date: uploadDom.tradeDateInput?.value,
      accountId: uploadDom.tradeAccountInput?.value,
      stockId: uploadDom.tradeStockInput?.value,
      type: uploadDom.tradeTypeInput?.value,
      quantity: Number(uploadDom.tradeQuantityInput?.value || 0),
      price: Number(uploadDom.tradePriceInput?.value || 0),
      fee: Number(uploadDom.tradeFeeInput?.value || 0),
      tax: Number(uploadDom.tradeTaxInput?.value || 0),
    };

    if (!payload.date || !payload.accountId || !payload.stockId || payload.quantity <= 0 || payload.price <= 0) {
      setTradeFormFeedback("거래일, 계좌, 종목, 수량, 체결가를 모두 입력해 주세요.");
      return;
    }

    if (payload.type === "sell") {
      const currentOpenQuantity = getOpenQuantity(payload.accountId, payload.stockId);
      if (payload.quantity > currentOpenQuantity) {
        setTradeFormFeedback(`현재 보유수량보다 큰 매도는 저장할 수 없습니다. 현재 보유수량 ${currentOpenQuantity}주`);
        return;
      }
    }

    window.StockFlowLedger.addTransaction(payload);
    setTradeFormFeedback("거래 원장에 추가했습니다. 거래 분석 탭에서 바로 집계됩니다.");
    resetTradeEntryForm();
    renderUploadPage();
  });
}

function setUploadDefaults() {
  if (uploadDom.tradeDateInput) {
    uploadDom.tradeDateInput.value = getTodayInputValue();
  }

  if (uploadDom.tradeTypeInput) {
    uploadDom.tradeTypeInput.value = "buy";
  }
}

function resetTradeEntryForm() {
  if (uploadDom.tradeQuantityInput) {
    uploadDom.tradeQuantityInput.value = "";
  }

  if (uploadDom.tradePriceInput) {
    uploadDom.tradePriceInput.value = "";
  }

  if (uploadDom.tradeFeeInput) {
    uploadDom.tradeFeeInput.value = "";
  }

  if (uploadDom.tradeTaxInput) {
    uploadDom.tradeTaxInput.value = "";
  }

  setUploadDefaults();
}

function renderUploadPage() {
  const transactions = window.StockFlowLedger.getEnrichedTransactions();
  const analysis = window.StockFlowLedger.analyzeTransactions(transactions);
  renderUploadStats(transactions, analysis);
  renderUploadTransactionList(transactions);
}

function renderUploadStats(transactions, analysis) {
  if (uploadDom.uploadTradeCount) {
    uploadDom.uploadTradeCount.textContent = `${transactions.length}건`;
  }

  if (uploadDom.uploadTradeCountMeta) {
    uploadDom.uploadTradeCountMeta.textContent = `매수 ${analysis.buyCount} · 매도 ${analysis.sellCount}`;
  }

  if (uploadDom.uploadTradeMix) {
    uploadDom.uploadTradeMix.textContent = `${analysis.buyCount} : ${analysis.sellCount}`;
  }

  if (uploadDom.uploadLastTradeDate) {
    uploadDom.uploadLastTradeDate.textContent = transactions.length
      ? formatUploadDate(transactions[0].date)
      : "-";
  }
}

function renderUploadTransactionList(transactions) {
  if (!uploadDom.uploadTransactionList) {
    return;
  }

  if (!transactions.length) {
    uploadDom.uploadTransactionList.innerHTML = `
      <article class="transaction-item transaction-item-empty">
        <strong>저장된 거래가 없습니다.</strong>
        <p>왼쪽 입력창에서 첫 거래를 추가해 주세요.</p>
      </article>
    `;
    return;
  }

  uploadDom.uploadTransactionList.innerHTML = transactions
    .slice(0, 8)
    .map(
      (transaction) => `
        <article class="transaction-item">
          <div class="transaction-item-head">
            <div class="transaction-item-copy">
              <strong>${transaction.stockName}</strong>
              <p>${transaction.accountName} · ${formatUploadDate(transaction.date)}</p>
            </div>
            <span class="trade-badge ${transaction.type === "sell" ? "sell" : "buy"}">${
              transaction.type === "sell" ? "매도" : "매수"
            }</span>
          </div>
          <div class="transaction-item-foot">
            <span>${formatUploadQuantity(transaction.quantity)} · ${formatUploadPrice(
              transaction.price,
              transaction.currency
            )}</span>
            <strong>${formatUploadKrw(transaction.grossAmountKrw)}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function setTradeFormFeedback(message) {
  if (!uploadDom.tradeFormFeedback) {
    return;
  }

  uploadDom.tradeFormFeedback.hidden = !message;
  uploadDom.tradeFormFeedback.textContent = message;
}

function formatUploadDate(value) {
  const [year, month, day] = String(value).split("-");
  return `${year}.${month}.${day}`;
}

function formatUploadQuantity(value) {
  return `${new Intl.NumberFormat("ko-KR").format(value || 0)}주`;
}

function formatUploadPrice(value, currency) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value || 0);
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatUploadKrw(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOpenQuantity(accountId, stockId) {
  const transactions = window.StockFlowLedger.getEnrichedTransactions();
  const analysis = window.StockFlowLedger.analyzeTransactions(transactions);
  return (
    analysis.openPositions.find(
      (position) => position.accountId === accountId && position.stockId === stockId
    )?.quantity || 0
  );
}
