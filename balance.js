const balancePortfolioData = {
  exchangeRates: {
    KRW: 1,
    USD: 1470,
  },
  accounts: [
    {
      id: "hana",
      name: "하나 메인계좌",
      shortName: "하나",
      cashBalances: [
        { currency: "KRW", amount: 2480000 },
        { currency: "USD", amount: 980 },
      ],
    },
    {
      id: "kb",
      name: "KB 서브계좌",
      shortName: "KB",
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
      currency: "KRW",
      shares: 52,
      avgCost: 71200,
      currentPrice: 74800,
    },
    {
      id: "skhynix-hana",
      accountId: "hana",
      name: "SK하이닉스",
      currency: "KRW",
      shares: 16,
      avgCost: 164500,
      currentPrice: 181000,
    },
    {
      id: "nvidia-hana",
      accountId: "hana",
      name: "NVIDIA",
      currency: "USD",
      shares: 11,
      avgCost: 118.2,
      currentPrice: 129.4,
    },
    {
      id: "naver-kb",
      accountId: "kb",
      name: "NAVER",
      currency: "KRW",
      shares: 22,
      avgCost: 198000,
      currentPrice: 213500,
    },
    {
      id: "apple-kb",
      accountId: "kb",
      name: "Apple",
      currency: "USD",
      shares: 14,
      avgCost: 201.5,
      currentPrice: 214.2,
    },
    {
      id: "tesla-kb",
      accountId: "kb",
      name: "Tesla",
      currency: "USD",
      shares: 8,
      avgCost: 228.6,
      currentPrice: 242.5,
    },
  ],
};

const balanceCurrencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const balanceUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const balanceState = {
  selectedAccountId: balancePortfolioData.accounts[0]?.id || null,
  pickerOpen: false,
};

const balanceDom = {};

document.addEventListener("DOMContentLoaded", initBalancePage);

function initBalancePage() {
  cacheBalanceDom();
  bindBalanceEvents();
  renderBalancePage();
}

function cacheBalanceDom() {
  [
    "balanceTotalAssetValue",
    "accountPickerButton",
    "accountCountValue",
    "accountCountMeta",
    "holdingCountValue",
    "holdingCountMeta",
    "accountPickerPanel",
    "accountPickerList",
    "balanceSectionTitle",
    "balanceSectionMeta",
    "balanceHoldingsBody",
  ].forEach((id) => {
    balanceDom[id] = document.getElementById(id);
  });
}

function bindBalanceEvents() {
  if (balanceDom.accountPickerButton) {
    balanceDom.accountPickerButton.addEventListener("click", () => {
      balanceState.pickerOpen = !balanceState.pickerOpen;
      renderBalancePicker();
    });
  }

  if (balanceDom.accountPickerList) {
    balanceDom.accountPickerList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-account-id]");
      if (!button) {
        return;
      }

      balanceState.selectedAccountId = button.dataset.accountId;
      balanceState.pickerOpen = false;
      renderBalancePage();
    });
  }
}

function renderBalancePage() {
  renderBalanceStats();
  renderBalancePicker();
  renderAccountHoldings();
}

function renderBalanceStats() {
  const totalAsset = balancePortfolioData.accounts.reduce(
    (sum, account) => sum + getAccountAssetValue(account.id),
    0
  );
  const totalHoldingCount = balancePortfolioData.holdings.length;
  const domesticCount = balancePortfolioData.holdings.filter((holding) => holding.currency === "KRW").length;
  const foreignCount = totalHoldingCount - domesticCount;
  const selectedAccount = getSelectedAccount();

  balanceDom.balanceTotalAssetValue.textContent = formatBalanceKrw(totalAsset);
  balanceDom.accountCountValue.textContent = `${balancePortfolioData.accounts.length}개`;
  balanceDom.accountCountMeta.textContent = selectedAccount
    ? `${selectedAccount.name} 선택됨`
    : "아래에서 계좌를 선택하세요.";
  balanceDom.holdingCountValue.textContent = `${totalHoldingCount}개`;
  balanceDom.holdingCountMeta.textContent = `국내 ${domesticCount}개 · 해외 ${foreignCount}개`;
}

function renderBalancePicker() {
  const selectedAccount = getSelectedAccount();

  balanceDom.accountPickerButton?.setAttribute("aria-expanded", String(balanceState.pickerOpen));
  if (balanceDom.accountPickerPanel) {
    balanceDom.accountPickerPanel.hidden = !balanceState.pickerOpen;
  }

  if (!balanceDom.accountPickerList) {
    return;
  }

  balanceDom.accountPickerList.innerHTML = balancePortfolioData.accounts
    .map((account) => {
      const accountHoldings = getAccountHoldings(account.id);
      const activeClass = selectedAccount?.id === account.id ? "active" : "";
      return `
        <button type="button" class="account-picker-item ${activeClass}" data-account-id="${account.id}">
          <div class="account-picker-copy">
            <strong>${account.name}</strong>
            <span>${accountHoldings.length}개 종목</span>
          </div>
          <div class="account-picker-values">
            <strong>${formatBalanceKrw(getAccountAssetValue(account.id))}</strong>
            <span>현금 ${formatBalanceKrw(getAccountCashValue(account.id))}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderAccountHoldings() {
  const selectedAccount = getSelectedAccount();
  const holdings = selectedAccount ? getAccountHoldings(selectedAccount.id) : [];

  if (balanceDom.balanceSectionTitle) {
    balanceDom.balanceSectionTitle.textContent = selectedAccount
      ? `${selectedAccount.name} 잔고`
      : "계좌별 잔고";
  }

  if (balanceDom.balanceSectionMeta) {
    balanceDom.balanceSectionMeta.textContent = selectedAccount
      ? `선택한 계좌의 보유 종목만 바로 보여줍니다. 총 ${holdings.length}개 종목`
      : "아래에서 계좌를 선택하면 해당 계좌 종목만 보여줍니다.";
  }

  if (!balanceDom.balanceHoldingsBody) {
    return;
  }

  if (!holdings.length) {
    balanceDom.balanceHoldingsBody.innerHTML = `
      <tr>
        <td colspan="5" class="stock-table-empty">표시할 종목이 없습니다.</td>
      </tr>
    `;
    return;
  }

  balanceDom.balanceHoldingsBody.innerHTML = holdings
    .map(
      (holding) => `
        <tr>
          <td>${holding.name}</td>
          <td>${holding.shares}주</td>
          <td>${formatHoldingPrice(holding.avgCost, holding.currency)}</td>
          <td>${formatHoldingPrice(holding.currentPrice, holding.currency)}</td>
          <td>${formatBalanceKrw(getHoldingValueInKrw(holding))}</td>
        </tr>
      `
    )
    .join("");
}

function getSelectedAccount() {
  return balancePortfolioData.accounts.find(
    (account) => account.id === balanceState.selectedAccountId
  ) || balancePortfolioData.accounts[0];
}

function getAccountHoldings(accountId) {
  return balancePortfolioData.holdings.filter((holding) => holding.accountId === accountId);
}

function getAccountCashValue(accountId) {
  const account = balancePortfolioData.accounts.find((item) => item.id === accountId);
  if (!account) {
    return 0;
  }

  return account.cashBalances.reduce(
    (sum, cash) => sum + convertBalanceToKrw(cash.amount, cash.currency),
    0
  );
}

function getAccountAssetValue(accountId) {
  return (
    getAccountCashValue(accountId) +
    getAccountHoldings(accountId).reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0)
  );
}

function getHoldingValueInKrw(holding) {
  return convertBalanceToKrw(holding.shares * holding.currentPrice, holding.currency);
}

function convertBalanceToKrw(amount, currency) {
  return amount * (balancePortfolioData.exchangeRates[currency] || 1);
}

function formatBalanceKrw(value) {
  return balanceCurrencyFormatter.format(Math.round(value || 0));
}

function formatHoldingPrice(value, currency) {
  if (currency === "USD") {
    return balanceUsdFormatter.format(value || 0);
  }

  return formatBalanceKrw(value);
}
