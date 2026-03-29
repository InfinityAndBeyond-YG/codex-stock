(function () {
  const storageKey = "stockflow-trade-ledger-v1";
  const exchangeRates = {
    KRW: 1,
    USD: 1470,
  };

  const accounts = [
    { id: "hana", name: "하나 메인계좌", shortName: "하나 메인" },
    { id: "kb", name: "KB 서브계좌", shortName: "KB 서브" },
  ];

  const stocks = [
    { id: "samsung", name: "삼성전자", ticker: "005930", market: "kr", currency: "KRW" },
    { id: "skhynix", name: "SK하이닉스", ticker: "000660", market: "kr", currency: "KRW" },
    { id: "naver", name: "NAVER", ticker: "035420", market: "kr", currency: "KRW" },
    { id: "nvidia", name: "NVIDIA", ticker: "NVDA", market: "us", currency: "USD" },
    { id: "apple", name: "Apple", ticker: "AAPL", market: "us", currency: "USD" },
    { id: "tesla", name: "Tesla", ticker: "TSLA", market: "us", currency: "USD" },
  ];

  const defaultTransactions = [
    {
      id: "tx-001",
      date: "2025-01-17",
      accountId: "kb",
      stockId: "apple",
      type: "buy",
      quantity: 8,
      price: 189.7,
      fee: 1.1,
      tax: 0,
    },
    {
      id: "tx-002",
      date: "2025-02-11",
      accountId: "hana",
      stockId: "samsung",
      type: "buy",
      quantity: 40,
      price: 68400,
      fee: 3500,
      tax: 0,
    },
    {
      id: "tx-003",
      date: "2025-03-22",
      accountId: "hana",
      stockId: "skhynix",
      type: "buy",
      quantity: 8,
      price: 149500,
      fee: 3400,
      tax: 0,
    },
    {
      id: "tx-004",
      date: "2025-04-09",
      accountId: "kb",
      stockId: "naver",
      type: "buy",
      quantity: 12,
      price: 187000,
      fee: 4100,
      tax: 0,
    },
    {
      id: "tx-005",
      date: "2025-05-14",
      accountId: "hana",
      stockId: "nvidia",
      type: "buy",
      quantity: 6,
      price: 103.4,
      fee: 1.2,
      tax: 0,
    },
    {
      id: "tx-006",
      date: "2025-06-18",
      accountId: "kb",
      stockId: "tesla",
      type: "buy",
      quantity: 5,
      price: 201.6,
      fee: 1.1,
      tax: 0,
    },
    {
      id: "tx-007",
      date: "2025-07-03",
      accountId: "hana",
      stockId: "samsung",
      type: "buy",
      quantity: 22,
      price: 72900,
      fee: 3600,
      tax: 0,
    },
    {
      id: "tx-008",
      date: "2025-08-12",
      accountId: "kb",
      stockId: "apple",
      type: "buy",
      quantity: 6,
      price: 212.8,
      fee: 1.0,
      tax: 0,
    },
    {
      id: "tx-009",
      date: "2025-09-27",
      accountId: "kb",
      stockId: "naver",
      type: "buy",
      quantity: 10,
      price: 205000,
      fee: 4200,
      tax: 0,
    },
    {
      id: "tx-010",
      date: "2025-10-29",
      accountId: "hana",
      stockId: "nvidia",
      type: "buy",
      quantity: 5,
      price: 124.8,
      fee: 1.2,
      tax: 0,
    },
    {
      id: "tx-011",
      date: "2025-11-18",
      accountId: "hana",
      stockId: "skhynix",
      type: "buy",
      quantity: 8,
      price: 179000,
      fee: 3600,
      tax: 0,
    },
    {
      id: "tx-012",
      date: "2025-12-04",
      accountId: "kb",
      stockId: "tesla",
      type: "buy",
      quantity: 3,
      price: 238.4,
      fee: 1.1,
      tax: 0,
    },
    {
      id: "tx-013",
      date: "2026-01-09",
      accountId: "kb",
      stockId: "naver",
      type: "sell",
      quantity: 3,
      price: 216500,
      fee: 4300,
      tax: 2100,
    },
    {
      id: "tx-014",
      date: "2026-01-16",
      accountId: "hana",
      stockId: "samsung",
      type: "sell",
      quantity: 10,
      price: 76400,
      fee: 3700,
      tax: 1900,
    },
    {
      id: "tx-015",
      date: "2026-02-06",
      accountId: "kb",
      stockId: "apple",
      type: "sell",
      quantity: 3,
      price: 221.4,
      fee: 1.2,
      tax: 0,
    },
    {
      id: "tx-016",
      date: "2026-02-19",
      accountId: "hana",
      stockId: "skhynix",
      type: "sell",
      quantity: 2,
      price: 188000,
      fee: 3500,
      tax: 1900,
    },
    {
      id: "tx-017",
      date: "2026-03-06",
      accountId: "hana",
      stockId: "nvidia",
      type: "sell",
      quantity: 2,
      price: 136.5,
      fee: 1.4,
      tax: 0,
    },
    {
      id: "tx-018",
      date: "2026-03-14",
      accountId: "kb",
      stockId: "tesla",
      type: "sell",
      quantity: 1,
      price: 245.8,
      fee: 1.2,
      tax: 0,
    },
  ];

  function parseLocalDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  function sortTransactionsDescending(left, right) {
    const dateDiff = parseLocalDate(right.date) - parseLocalDate(left.date);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
  }

  function cloneTransactions(transactions) {
    return transactions.map((transaction) => ({ ...transaction }));
  }

  function getAccountById(accountId) {
    return accounts.find((account) => account.id === accountId) || null;
  }

  function getStockById(stockId) {
    return stocks.find((stock) => stock.id === stockId) || null;
  }

  function normalizeNumber(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeTransaction(transaction) {
    const stock = getStockById(transaction.stockId);

    return {
      id:
        transaction.id ||
        `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: String(transaction.date || getTodayLedgerDate()),
      accountId: String(transaction.accountId || accounts[0].id),
      stockId: String(transaction.stockId || stocks[0].id),
      type: transaction.type === "sell" ? "sell" : "buy",
      quantity: normalizeNumber(transaction.quantity),
      price: normalizeNumber(transaction.price),
      fee: normalizeNumber(transaction.fee),
      tax: normalizeNumber(transaction.tax),
      currency: transaction.currency || stock?.currency || "KRW",
      createdAt: transaction.createdAt || new Date().toISOString(),
    };
  }

  function persistTransactions(transactions) {
    const normalized = transactions.map(normalizeTransaction);
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  }

  function ensureLedgerSeeded() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        persistTransactions(defaultTransactions);
        return;
      }

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.length) {
        persistTransactions(defaultTransactions);
      }
    } catch (error) {
      console.warn("Trade ledger seed could not be loaded.", error);
      persistTransactions(defaultTransactions);
    }
  }

  function loadTransactions() {
    ensureLedgerSeeded();

    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) {
        return cloneTransactions(defaultTransactions).sort(sortTransactionsDescending);
      }

      return parsed.map(normalizeTransaction).sort(sortTransactionsDescending);
    } catch (error) {
      console.warn("Trade ledger could not be loaded.", error);
      return cloneTransactions(defaultTransactions).sort(sortTransactionsDescending);
    }
  }

  function getTodayLedgerDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addTransaction(transaction) {
    const nextTransaction = normalizeTransaction(transaction);
    const currentTransactions = loadTransactions();
    currentTransactions.push(nextTransaction);
    persistTransactions(currentTransactions);
    return nextTransaction;
  }

  function removeTransaction(transactionId) {
    const nextTransactions = loadTransactions().filter(
      (transaction) => transaction.id !== transactionId
    );
    persistTransactions(nextTransactions);
  }

  function convertToKrw(amount, currency) {
    return normalizeNumber(amount) * (exchangeRates[currency] || 1);
  }

  function getEnrichedTransactions() {
    return loadTransactions().map((transaction) => {
      const account = getAccountById(transaction.accountId);
      const stock = getStockById(transaction.stockId);
      const grossAmount = transaction.price * transaction.quantity;

      return {
        ...transaction,
        accountName: account?.name || transaction.accountId,
        accountShortName: account?.shortName || transaction.accountId,
        stockName: stock?.name || transaction.stockId,
        ticker: stock?.ticker || "-",
        market: stock?.market || "kr",
        currency: transaction.currency || stock?.currency || "KRW",
        grossAmount,
        grossAmountKrw: convertToKrw(grossAmount, transaction.currency || stock?.currency),
      };
    });
  }

  function analyzeTransactions(transactionsInput) {
    const transactions = (transactionsInput || getEnrichedTransactions())
      .map((transaction) => ({ ...transaction }))
      .sort((left, right) => parseLocalDate(left.date) - parseLocalDate(right.date));

    const positions = new Map();
    const realizedTrades = [];
    let buyCount = 0;
    let sellCount = 0;
    let cumulativeBuyAmount = 0;
    let cumulativeSellAmount = 0;

    transactions.forEach((transaction) => {
      const key = `${transaction.accountId}:${transaction.stockId}`;
      const position = positions.get(key) || { quantity: 0, costBasis: 0 };
      const grossAmount = transaction.price * transaction.quantity;

      if (transaction.type === "buy") {
        buyCount += 1;
        cumulativeBuyAmount += convertToKrw(
          grossAmount + transaction.fee + transaction.tax,
          transaction.currency
        );
        position.quantity += transaction.quantity;
        position.costBasis += grossAmount + transaction.fee + transaction.tax;
        positions.set(key, position);
        return;
      }

      sellCount += 1;
      cumulativeSellAmount += convertToKrw(
        grossAmount - transaction.fee - transaction.tax,
        transaction.currency
      );

      const avgCost = position.quantity > 0 ? position.costBasis / position.quantity : 0;
      const matchedCost = avgCost * transaction.quantity;
      const proceeds = grossAmount - transaction.fee - transaction.tax;
      const realizedProfitNative = proceeds - matchedCost;

      position.quantity = Math.max(position.quantity - transaction.quantity, 0);
      position.costBasis = position.quantity > 0 ? Math.max(position.costBasis - matchedCost, 0) : 0;
      positions.set(key, position);

      realizedTrades.push({
        ...transaction,
        avgCost,
        matchedCost,
        matchedCostKrw: convertToKrw(matchedCost, transaction.currency),
        proceeds,
        proceedsKrw: convertToKrw(proceeds, transaction.currency),
        realizedProfitNative,
        realizedProfit: convertToKrw(realizedProfitNative, transaction.currency),
      });
    });

    const openPositions = Array.from(positions.entries())
      .filter(([, position]) => position.quantity > 0)
      .map(([key, position]) => {
        const [accountId, stockId] = key.split(":");
        const stock = getStockById(stockId);
        return {
          accountId,
          stockId,
          quantity: position.quantity,
          avgCost: position.quantity > 0 ? position.costBasis / position.quantity : 0,
          currency: stock?.currency || "KRW",
        };
      });

    return {
      transactions: transactions.sort(sortTransactionsDescending),
      realizedTrades: realizedTrades.sort(sortTransactionsDescending),
      openPositions,
      buyCount,
      sellCount,
      cumulativeBuyAmount,
      cumulativeSellAmount,
    };
  }

  window.StockFlowLedger = {
    storageKey,
    exchangeRates,
    accounts,
    stocks,
    parseLocalDate,
    getAccountById,
    getStockById,
    loadTransactions,
    addTransaction,
    removeTransaction,
    getEnrichedTransactions,
    analyzeTransactions,
    convertToKrw,
  };
})();
