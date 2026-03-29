const balancePortfolioData = {
  exchangeRates: {
    KRW: 1,
    USD: 1470,
  },
  accounts: [
    {
      id: "hana",
      name: "하나 메인계좌",
      shortName: "하나 메인",
      cashBalances: [
        { currency: "KRW", amount: 2480000 },
        { currency: "USD", amount: 980 },
      ],
    },
    {
      id: "kb",
      name: "KB 서브계좌",
      shortName: "KB 서브",
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
  holdingFilterOpen: false,
  tableScope: "account",
  holdingFilter: "all",
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
    "balanceTotalAssetMeta",
    "totalAssetButton",
    "accountPickerButton",
    "accountCountValue",
    "accountSelectedLabel",
    "accountSelectedAmount",
    "accountCountMeta",
    "holdingCountValue",
    "holdingCountMeta",
    "holdingFilterButton",
    "accountPickerPanel",
    "accountPickerList",
    "holdingFilterPanel",
    "balanceSectionTitle",
    "balanceSectionAsset",
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
      balanceState.holdingFilterOpen = false;
      renderBalancePicker();
      renderHoldingFilterPanel();
    });
  }

  if (balanceDom.accountPickerList) {
    balanceDom.accountPickerList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-account-id]");
      if (!button) {
        return;
      }

      balanceState.selectedAccountId = button.dataset.accountId;
      balanceState.tableScope = "account";
      balanceState.holdingFilter = "all";
      balanceState.pickerOpen = false;
      renderBalancePage();
    });
  }

  if (balanceDom.totalAssetButton) {
    balanceDom.totalAssetButton.addEventListener("click", () => {
      balanceState.tableScope = "all";
      balanceState.holdingFilter = "all";
      balanceState.pickerOpen = false;
      balanceState.holdingFilterOpen = false;
      renderBalancePage();
    });
  }

  if (balanceDom.holdingFilterButton) {
    balanceDom.holdingFilterButton.addEventListener("click", () => {
      balanceState.holdingFilterOpen = !balanceState.holdingFilterOpen;
      balanceState.pickerOpen = false;
      renderBalancePicker();
      renderHoldingFilterPanel();
    });
  }

  if (balanceDom.holdingFilterPanel) {
    balanceDom.holdingFilterPanel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-holding-filter]");
      if (!button) {
        return;
      }

      balanceState.tableScope = "all";
      balanceState.holdingFilter = button.dataset.holdingFilter;
      balanceState.holdingFilterOpen = false;
      renderBalancePage();
    });
  }
}

function renderBalancePage() {
  renderBalanceStats();
  renderBalanceQuickStatState();
  renderBalancePicker();
  renderHoldingFilterPanel();
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
  if (balanceDom.balanceTotalAssetMeta) {
    balanceDom.balanceTotalAssetMeta.textContent = getTotalAssetMetaLabel();
  }
  balanceDom.accountCountValue.textContent = `${balancePortfolioData.accounts.length}개`;
  if (balanceDom.accountSelectedLabel) {
    balanceDom.accountSelectedLabel.textContent = selectedAccount ? selectedAccount.name : "-";
    balanceDom.accountSelectedLabel.hidden = !selectedAccount;
  }
  if (balanceDom.accountSelectedAmount) {
    balanceDom.accountSelectedAmount.textContent = selectedAccount
      ? formatBalanceKrw(getAccountAssetValue(selectedAccount.id))
      : "-";
    balanceDom.accountSelectedAmount.hidden = !selectedAccount;
  }
  balanceDom.accountCountMeta.textContent = "아래에서 계좌를 선택하세요.";
  balanceDom.holdingCountValue.textContent = `${totalHoldingCount}개`;
  balanceDom.holdingCountMeta.textContent =
    balanceState.holdingFilter === "domestic"
      ? `한국 주식 ${domesticCount}개`
      : balanceState.holdingFilter === "foreign"
        ? `미국주식 ${foreignCount}개`
        : `국내 ${domesticCount}개 · 해외 ${foreignCount}개`;
}

function renderBalanceQuickStatState() {
  const totalAssetActive = balanceState.tableScope === "all" && balanceState.holdingFilter === "all";
  const accountPickerActive = balanceState.tableScope === "account" || balanceState.pickerOpen;
  const holdingFilterActive =
    balanceState.holdingFilterOpen ||
    (balanceState.tableScope === "all" && balanceState.holdingFilter !== "all");

  toggleQuickStatState(balanceDom.totalAssetButton, totalAssetActive);
  toggleQuickStatState(balanceDom.accountPickerButton, accountPickerActive);
  toggleQuickStatState(balanceDom.holdingFilterButton, holdingFilterActive);
}

function toggleQuickStatState(element, active) {
  if (!element) {
    return;
  }

  element.classList.toggle("is-active", active);
  element.setAttribute("aria-pressed", String(active));
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
      const activeClass = selectedAccount?.id === account.id ? "active" : "";
      return `
        <button type="button" class="account-picker-item ${activeClass}" data-account-id="${account.id}">
          <strong class="account-picker-name">${account.shortName}</strong>
          <strong class="account-picker-amount">${formatBalanceKrw(getAccountAssetValue(account.id))}</strong>
        </button>
      `;
    })
    .join("");
}

function renderHoldingFilterPanel() {
  const domesticCount = balancePortfolioData.holdings.filter((holding) => holding.currency === "KRW").length;
  const foreignCount = balancePortfolioData.holdings.filter((holding) => holding.currency === "USD").length;

  if (balanceDom.holdingFilterButton) {
    balanceDom.holdingFilterButton.setAttribute("aria-expanded", String(balanceState.holdingFilterOpen));
  }

  if (balanceDom.holdingFilterPanel) {
    balanceDom.holdingFilterPanel.hidden = !balanceState.holdingFilterOpen;
  }

  if (!balanceDom.holdingFilterPanel) {
    return;
  }

  balanceDom.holdingFilterPanel
    .querySelectorAll("[data-holding-filter]")
    .forEach((button) => {
      const isDomestic = button.dataset.holdingFilter === "domestic";
      const count = isDomestic ? domesticCount : foreignCount;
      const label = isDomestic ? "한국 주식" : "미국주식";

      button.innerHTML = `
        <span class="holding-filter-name">${label}</span>
        <span class="holding-filter-count">${count}개</span>
      `;
      button.classList.toggle("active", button.dataset.holdingFilter === balanceState.holdingFilter);
    });
}

function renderAccountHoldings() {
  const selectedAccount = getSelectedAccount();
  const holdings = getVisibleHoldings();

  if (balanceDom.balanceSectionTitle) {
    balanceDom.balanceSectionTitle.textContent = getBalanceSectionTitle(selectedAccount);
  }

  if (balanceDom.balanceSectionAsset) {
    balanceDom.balanceSectionAsset.textContent = getBalanceSectionAssetLabel(selectedAccount);
    balanceDom.balanceSectionAsset.hidden = false;
  }

  if (balanceDom.balanceSectionMeta) {
    balanceDom.balanceSectionMeta.textContent = getBalanceSectionMeta(selectedAccount, holdings.length);
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

function getVisibleHoldings() {
  let holdings =
    balanceState.tableScope === "account" && balanceState.selectedAccountId
      ? getAccountHoldings(balanceState.selectedAccountId)
      : [...balancePortfolioData.holdings];

  if (balanceState.holdingFilter === "domestic") {
    holdings = holdings.filter((holding) => holding.currency === "KRW");
  } else if (balanceState.holdingFilter === "foreign") {
    holdings = holdings.filter((holding) => holding.currency === "USD");
  }

  return holdings;
}

function getVisibleHoldingsAssetValue() {
  return getVisibleHoldings().reduce((sum, holding) => sum + getHoldingValueInKrw(holding), 0);
}

function getTotalAssetMetaLabel() {
  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "all") {
    return "전체 주식 보기";
  }

  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "domestic") {
    return "한국 주식 보기";
  }

  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "foreign") {
    return "미국주식 보기";
  }

  return "전체 계좌 합산";
}

function getBalanceSectionTitle(selectedAccount) {
  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "domestic") {
    return "한국 주식 잔고";
  }

  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "foreign") {
    return "미국주식 잔고";
  }

  if (balanceState.tableScope === "all") {
    return "전체 보유 종목";
  }

  return selectedAccount ? `${selectedAccount.name} 잔고` : "계좌별 잔고";
}

function getBalanceSectionAssetLabel(selectedAccount) {
  if (balanceState.tableScope === "all") {
    return `총 평가 ${formatBalanceKrw(getVisibleHoldingsAssetValue())}`;
  }

  return selectedAccount
    ? `계좌 총 자산 ${formatBalanceKrw(getAccountAssetValue(selectedAccount.id))}`
    : "-";
}

function getBalanceSectionMeta(selectedAccount, holdingCount) {
  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "domestic") {
    return `전체 계좌 기준 한국 주식만 보여줍니다. 총 ${holdingCount}개 종목`;
  }

  if (balanceState.tableScope === "all" && balanceState.holdingFilter === "foreign") {
    return `전체 계좌 기준 미국주식만 보여줍니다. 총 ${holdingCount}개 종목`;
  }

  if (balanceState.tableScope === "all") {
    return `전체 계좌의 보유 종목을 모두 보여줍니다. 총 ${holdingCount}개 종목`;
  }

  return selectedAccount
    ? `선택한 계좌의 보유 종목만 바로 보여줍니다. 총 ${holdingCount}개 종목`
    : "아래에서 계좌를 선택하면 해당 계좌 종목만 보여줍니다.";
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
