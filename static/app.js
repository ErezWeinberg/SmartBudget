// SmartBudget IL Global State
let accountsData = [];
let categoriesData = [];
let rulesData = [];
let spendingChartInstance = null;
let netWorthChartInstance = null;
let cashflowChartInstance = null;
let selectedCsvText = "";

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    loadAllData();

    // Set today date on add transaction modal
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById("modal-tx-date");
    if (dateInput) dateInput.value = today;
});

// Tab Switcher
function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    
    document.querySelectorAll(".nav-tab").forEach(el => {
        el.classList.remove("bg-white", "text-amber-800", "shadow-sm", "border", "border-beige-200", "font-semibold");
        el.classList.add("text-slate-600", "hover:text-slate-900", "hover:bg-white/60");
    });

    const activeContent = document.getElementById(`view-${tabName}`);
    if (activeContent) activeContent.classList.remove("hidden");

    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.add("bg-white", "text-amber-800", "shadow-sm", "border", "border-beige-200", "font-semibold");
        activeBtn.classList.remove("text-slate-600", "hover:bg-white/60");
    }

    const pageTitleMap = {
        'dashboard': 'לוח בקרה ודוחות',
        'accounts': 'חשבונות מחוברים',
        'transactions': 'עסקאות וסיווג',
        'budgets': 'תקציבים חודשיים',
        'rules': 'חוקי סיווג אוטומטיים'
    };
    const titleEl = document.getElementById("page-title");
    if (titleEl && pageTitleMap[tabName]) {
        titleEl.innerText = pageTitleMap[tabName];
    }

    if (tabName === 'transactions') loadTransactions();
    if (tabName === 'accounts') renderAccounts();
    if (tabName === 'budgets') loadBudgets();
    if (tabName === 'rules') loadRules();
}

// Load All App Data
async function loadAllData() {
    await Promise.all([
        loadSummary(),
        loadAccounts(),
        loadCategories(),
        loadTransactionsDashboard(),
        loadSpendingChart(),
        loadNetWorthChart(),
        loadCashFlowChart()
    ]);
}

// 1. Load KPI Summary
async function loadSummary() {
    try {
        const res = await fetch("/api/summary");
        const data = await res.json();

        document.getElementById("stat-net-worth").innerText = formatCurrency(data.net_worth);
        document.getElementById("stat-income").innerText = formatCurrency(data.income);
        document.getElementById("stat-expenses").innerText = formatCurrency(data.expenses);
        document.getElementById("stat-savings").innerText = formatCurrency(data.net_savings);
    } catch (e) {
        console.error("Failed to load summary", e);
    }
}

// 2. Load Accounts
async function loadAccounts() {
    try {
        const res = await fetch("/api/accounts");
        accountsData = await res.json();

        const filterSelect = document.getElementById("tx-account-filter");
        const modalSelect = document.getElementById("modal-tx-account");
        const csvSelect = document.getElementById("csv-account-select");

        let optsHtml = '<option value="">כל החשבונות</option>';
        let modalOpts = '';

        accountsData.forEach(acc => {
            optsHtml += `<option value="${acc.id}">${acc.institution} - ${acc.name}</option>`;
            modalOpts += `<option value="${acc.id}">${acc.institution} - ${acc.name} (${formatCurrency(acc.balance, acc.currency)})</option>`;
        });

        if (filterSelect) filterSelect.innerHTML = optsHtml;
        if (modalSelect) modalSelect.innerHTML = modalOpts;
        if (csvSelect) csvSelect.innerHTML = modalOpts;

        renderAccounts();
    } catch (e) {
        console.error("Failed to load accounts", e);
    }
}

function renderAccounts() {
    const grid = document.getElementById("accounts-grid");
    if (!grid) return;

    if (accountsData.length === 0) {
        grid.innerHTML = '<p class="text-slate-500 text-sm">אין חשבונות מחוברים עדיין.</p>';
        return;
    }

    grid.innerHTML = accountsData.map(acc => {
        const isPositive = acc.balance >= 0;
        const syncTime = acc.last_synced ? acc.last_synced.split(' ')[1] || acc.last_synced : 'טרם סונכרן';

        let instBadge = 'bg-slate-100 text-slate-700 border-slate-200';
        if (acc.type === 'Bank') instBadge = 'bg-blue-50 text-blue-700 border-blue-200';
        if (acc.type === 'Credit Card') instBadge = 'bg-amber-50 text-amber-800 border-amber-200';
        if (acc.type === 'Investment') instBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (acc.type === 'Crypto') instBadge = 'bg-purple-50 text-purple-700 border-purple-200';

        return `
            <div class="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 transition flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${instBadge}">
                            ${acc.type}
                        </span>
                        <span class="text-xs text-slate-400 flex items-center gap-1">
                            <i data-lucide="refresh-cw" class="w-3 h-3"></i> ${syncTime}
                        </span>
                    </div>

                    <h4 class="text-base font-bold text-slate-900 mt-3">${acc.name}</h4>
                    <p class="text-xs text-slate-500">${acc.institution} • ${acc.account_number || ''}</p>

                    <div class="mt-4">
                        <p class="text-xs text-slate-400">יתרה עדכנית</p>
                        <p class="text-2xl font-bold ${isPositive ? 'text-slate-900' : 'text-rose-600'} mt-0.5">
                            ${formatCurrency(acc.balance, acc.currency)}
                        </p>
                    </div>
                </div>

                <div class="mt-5 pt-4 border-t border-beige-100 flex space-x-2 space-x-reverse">
                    <button onclick="syncAccount(${acc.id})" class="flex-1 py-2 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl transition flex items-center justify-center gap-1.5">
                        <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i> סנכרן בלייב (Mock API)
                    </button>
                    <button onclick="openCsvModal(${acc.id})" class="py-2 px-3 text-xs font-semibold bg-beige-50 border border-beige-200 hover:bg-beige-100 text-slate-700 rounded-xl transition">
                        ייבוא CSV
                    </button>
                </div>
            </div>
        `;
    }).join("");

    lucide.createIcons();
}

// 3. Load Categories
async function loadCategories() {
    try {
        const res = await fetch("/api/categories");
        categoriesData = await res.json();

        const filterSelect = document.getElementById("tx-category-filter");
        const modalSelect = document.getElementById("modal-tx-category");
        const ruleSelect = document.getElementById("rule-category-select");

        let filterOpts = '<option value="">כל הקטגוריות</option>';
        let modalOpts = '<option value="">ללא קטגוריה</option>';
        let ruleOpts = '<option value="">בחר קטגוריה</option>';

        categoriesData.forEach(cat => {
            filterOpts += `<option value="${cat.id}">${cat.name}</option>`;
            modalOpts += `<option value="${cat.id}">${cat.name}</option>`;
            ruleOpts += `<option value="${cat.id}">${cat.name}</option>`;
        });

        if (filterSelect) filterSelect.innerHTML = filterOpts;
        if (modalSelect) modalSelect.innerHTML = modalOpts;
        if (ruleSelect) ruleSelect.innerHTML = ruleOpts;
    } catch (e) {
        console.error("Failed to load categories", e);
    }
}

// 4. Load Dashboard Recent Transactions Table
async function loadTransactionsDashboard() {
    try {
        const res = await fetch("/api/transactions");
        const txs = await res.json();

        const tbody = document.getElementById("table-dash-txs");
        if (!tbody) return;

        tbody.innerHTML = txs.slice(0, 6).map(tx => {
            const isIncome = tx.amount > 0;
            return `
                <tr class="hover:bg-beige-50/60">
                    <td class="py-3 px-3 text-xs text-slate-500">${tx.date}</td>
                    <td class="py-3 px-3 font-semibold text-slate-900">${tx.merchant}</td>
                    <td class="py-3 px-3 text-xs text-slate-500">${tx.account_name || '-'}</td>
                    <td class="py-3 px-3">
                        <span class="text-xs px-2.5 py-1 rounded-full font-semibold" style="background-color: ${tx.category_color || '#d97706'}15; color: ${tx.category_color || '#b45309'}; border: 1px solid ${tx.category_color || '#d97706'}30">
                            ${tx.category_name || 'לא סווג'}
                        </span>
                    </td>
                    <td class="py-3 px-3 text-left font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'}">
                        ${isIncome ? '+' : ''}${formatCurrency(tx.amount)}
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        console.error("Failed dashboard txs", e);
    }
}

// 5. Load Full Transactions Explorer Table
async function loadTransactions() {
    const searchInput = document.getElementById("tx-search-input");
    const accountFilter = document.getElementById("tx-account-filter");
    const categoryFilter = document.getElementById("tx-category-filter");

    const search = searchInput ? searchInput.value : '';
    const account_id = accountFilter ? accountFilter.value : '';
    const category_id = categoryFilter ? categoryFilter.value : '';

    const url = `/api/transactions?search=${encodeURIComponent(search)}&account_id=${account_id}&category_id=${category_id}`;

    try {
        const res = await fetch(url);
        const txs = await res.json();

        const tbody = document.getElementById("table-full-txs");
        if (!tbody) return;

        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-slate-500 text-sm">לא נמצאו עסקאות תואמות.</td></tr>';
            return;
        }

        tbody.innerHTML = txs.map(tx => {
            const isIncome = tx.amount > 0;
            const srcBadge = tx.source === 'api' 
                ? '<span class="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">Live API</span>'
                : tx.source === 'csv'
                ? '<span class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">CSV File</span>'
                : '<span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Manual</span>';

            const catSelectOptions = categoriesData.map(c => 
                `<option value="${c.id}" ${c.id === tx.category_id ? 'selected' : ''}>${c.name}</option>`
            ).join("");

            return `
                <tr class="hover:bg-beige-50/60">
                    <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">${tx.date}</td>
                    <td class="py-3 px-4 font-bold text-slate-900">
                        ${tx.merchant}
                        ${tx.notes ? `<p class="text-xs text-slate-400 font-normal">${tx.notes}</p>` : ''}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600">${tx.account_name || '-'}</td>
                    <td class="py-3 px-4">
                        <select onchange="updateTxCategory(${tx.id}, this.value)" class="bg-beige-50 border border-beige-200 text-xs rounded-xl px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-amber-600">
                            <option value="">לא סווג</option>
                            ${catSelectOptions}
                        </select>
                    </td>
                    <td class="py-3 px-4">${srcBadge}</td>
                    <td class="py-3 px-4 text-left font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-900'} dir-ltr">
                        ${isIncome ? '+' : ''}${formatCurrency(tx.amount)}
                    </td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        console.error("Failed to load txs", e);
    }
}

// Update Transaction Category
async function updateTxCategory(txId, categoryId) {
    try {
        await fetch("/api/transactions/update_category", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction_id: txId, category_id: categoryId || null })
        });
        loadSummary();
        loadSpendingChart();
    } catch (e) {
        console.error("Update category failed", e);
    }
}

// 6. Load Net Worth Line Chart
async function loadNetWorthChart() {
    try {
        const res = await fetch("/api/charts/networth_history");
        const data = await res.json();

        const ctx = document.getElementById("chart-networth-line");
        if (!ctx) return;

        if (netWorthChartInstance) netWorthChartInstance.destroy();

        const labels = data.map(d => d.month);
        const values = data.map(d => d.net_worth);

        netWorthChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'שווי נקי (₪)',
                    data: values,
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#059669'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Rubik', size: 11 } } },
                    y: { grid: { color: '#e8ded0' }, ticks: { color: '#64748b', font: { family: 'Rubik', size: 11 } } }
                }
            }
        });
    } catch (e) {
        console.error("Net worth chart failed", e);
    }
}

// 7. Load Cash Flow Bar Chart
async function loadCashFlowChart() {
    try {
        const res = await fetch("/api/charts/cashflow");
        const data = await res.json();

        const ctx = document.getElementById("chart-cashflow-bar");
        if (!ctx) return;

        if (cashflowChartInstance) cashflowChartInstance.destroy();

        const labels = data.map(d => d.month);
        const incomeValues = data.map(d => d.income);
        const expenseValues = data.map(d => d.expense);

        cashflowChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'הכנסות',
                        data: incomeValues,
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    },
                    {
                        label: 'הוצאות',
                        data: expenseValues,
                        backgroundColor: '#f43f5e',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#475569', font: { family: 'Rubik', size: 11, weight: '500' } }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Rubik', size: 11 } } },
                    y: { grid: { color: '#e8ded0' }, ticks: { color: '#64748b', font: { family: 'Rubik', size: 11 } } }
                }
            }
        });
    } catch (e) {
        console.error("Cashflow chart failed", e);
    }
}

// 8. Load Spending Doughnut Chart
async function loadSpendingChart() {
    try {
        const res = await fetch("/api/charts/spending");
        const data = await res.json();

        const ctx = document.getElementById("chart-spending-pie");
        if (!ctx) return;

        if (spendingChartInstance) spendingChartInstance.destroy();

        const labels = data.map(d => d.name);
        const values = data.map(d => d.total);
        const colors = data.map(d => d.color || '#d97706');

        spendingChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#475569', font: { family: 'Rubik', size: 11, weight: '500' }, padding: 12 }
                    }
                },
                cutout: '72%'
            }
        });
    } catch (e) {
        console.error("Chart load failed", e);
    }
}

// 9. Load Budgets View
async function loadBudgets() {
    try {
        const res = await fetch("/api/budgets");
        const budgets = await res.json();

        const container = document.getElementById("budgets-container");
        if (!container) return;

        const groups = {};
        budgets.forEach(b => {
            const g = b.group_name || 'שונות';
            if (!groups[g]) groups[g] = [];
            groups[g].push(b);
        });

        container.innerHTML = Object.keys(groups).map(gName => {
            const groupItems = groups[gName];

            const itemsHtml = groupItems.map(b => {
                const limit = b.budget_limit || 1;
                const remaining = Math.max(0, limit - b.spent);
                const percent = Math.min(Math.round((b.spent / limit) * 100), 100);
                
                let barColor = 'bg-emerald-500';
                if (percent > 80 && percent <= 100) barColor = 'bg-amber-500';
                if (percent > 100) barColor = 'bg-rose-500';

                return `
                    <div class="bg-white border border-beige-200 rounded-2xl p-4 space-y-2 shadow-sm">
                        <div class="flex justify-between items-center text-sm">
                            <div class="flex items-center space-x-2 space-x-reverse">
                                <span class="w-3 h-3 rounded-full" style="background-color: ${b.color}"></span>
                                <span class="font-bold text-slate-900">${b.name}</span>
                            </div>
                            <span class="text-xs text-slate-500">
                                <strong class="text-slate-900">${formatCurrency(b.spent)}</strong> ניצול מתוך ${formatCurrency(b.budget_limit)}
                            </span>
                        </div>
                        <div class="w-full bg-beige-100 rounded-full h-3 overflow-hidden p-0.5 border border-beige-200">
                            <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                        <div class="flex justify-between text-[11px] text-slate-500 pt-0.5">
                            <span>נותרו: <strong class="text-emerald-700">${formatCurrency(remaining)}</strong></span>
                            <span>${percent}% ניצול</span>
                        </div>
                    </div>
                `;
            }).join("");

            return `
                <div class="space-y-3">
                    <h4 class="text-xs font-bold text-amber-700 uppercase tracking-wider">${gName}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }).join("");

    } catch (e) {
        console.error("Budgets load failed", e);
    }
}

// 10. Load & Manage Category Rules
async function loadRules() {
    try {
        const res = await fetch("/api/rules");
        rulesData = await res.json();

        const container = document.getElementById("rules-list-container");
        if (!container) return;

        if (rulesData.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm col-span-full">אין חוקי סיווג אוטומטיים מוגדרים.</p>';
            return;
        }

        container.innerHTML = rulesData.map(r => `
            <div class="bg-beige-50 border border-beige-200 rounded-xl p-3 flex justify-between items-center">
                <div>
                    <span class="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-beige-200">"${r.keyword}"</span>
                    <i data-lucide="arrow-left" class="w-3.5 h-3.5 inline mx-1 text-slate-400"></i>
                    <span class="text-xs font-semibold px-2 py-1 rounded-md" style="background-color: ${r.category_color}20; color: ${r.category_color}">
                        ${r.category_name}
                    </span>
                </div>
                <button onclick="deleteRule(${r.id})" class="text-slate-400 hover:text-rose-600 transition p-1">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join("");

        lucide.createIcons();
    } catch (e) {
        console.error("Rules load failed", e);
    }
}

async function submitAddRule(e) {
    e.preventDefault();
    const keyword = document.getElementById("rule-keyword-input").value;
    const category_id = document.getElementById("rule-category-select").value;

    try {
        const res = await fetch("/api/rules/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword, category_id })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            document.getElementById("rule-keyword-input").value = "";
            loadRules();
        }
    } catch (e) {
        alert("שגיאה בהוספת חוק");
    }
}

async function deleteRule(ruleId) {
    if (!confirm("האם למחוק חוק סיווג זה?")) return;
    try {
        const res = await fetch("/api/rules/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rule_id: ruleId })
        });
        const data = await res.json();
        loadRules();
    } catch (e) {
        alert("שגיאה במחיקת החוק");
    }
}

// Sync Account
async function syncAccount(accId) {
    try {
        const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_id: accId })
        });
        const result = await res.json();
        alert(result.message);
        loadAllData();
    } catch (e) {
        alert("שגיאה בסנכרון החשבון");
    }
}

async function syncAllAccounts() {
    for (const acc of accountsData) {
        await syncAccount(acc.id);
    }
}

// Modal Handlers
function openAddTransactionModal() {
    document.getElementById("modal-tx").classList.remove("hidden");
}
function closeTxModal() {
    document.getElementById("modal-tx").classList.add("hidden");
}

async function submitAddTransaction(e) {
    e.preventDefault();
    const payload = {
        account_id: document.getElementById("modal-tx-account").value,
        merchant: document.getElementById("modal-tx-merchant").value,
        amount: parseFloat(document.getElementById("modal-tx-amount").value),
        date: document.getElementById("modal-tx-date").value,
        category_id: document.getElementById("modal-tx-category").value || null
    };

    try {
        const res = await fetch("/api/transactions/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        closeTxModal();
        loadAllData();
    } catch (err) {
        alert("שגיאה בשמירת עסקה");
    }
}

function openCsvModal(accId) {
    if (accId) {
        document.getElementById("csv-account-select").value = accId;
    }
    document.getElementById("modal-csv").classList.remove("hidden");
}
function closeCsvModal() {
    document.getElementById("modal-csv").classList.add("hidden");
    selectedCsvText = "";
    document.getElementById("csv-filename-display").classList.add("hidden");
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedCsvText = e.target.result;
        const display = document.getElementById("csv-filename-display");
        display.innerText = `קובץ נבחר: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        display.classList.remove("hidden");
    };
    reader.readAsText(file, "UTF-8");
}

async function submitCsvImport() {
    const accountId = document.getElementById("csv-account-select").value;
    if (!selectedCsvText || !accountId) {
        alert("יש לבחור קובץ CSV וחשבון יעד");
        return;
    }

    try {
        const res = await fetch("/api/import/csv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csv_text: selectedCsvText, account_id: accountId })
        });
        const result = await res.json();
        alert(result.message);
        closeCsvModal();
        loadAllData();
    } catch (e) {
        alert("שגיאה בייבוא הקובץ");
    }
}

function openScraperInfoModal() {
    document.getElementById("modal-scraper").classList.remove("hidden");
}
function closeScraperInfoModal() {
    document.getElementById("modal-scraper").classList.add("hidden");
}

// Currency Formatter
function formatCurrency(amount, curr = 'ILS') {
    const symbol = curr === 'USD' ? '$' : '₪';
    return `${symbol}${Number(amount || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
