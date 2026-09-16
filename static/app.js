// SmartBudget IL Global State & Client-Side Fallback Engine (Local-First)

let accountsData = [];
let categoriesData = [];
let rulesData = [];
let pensionsData = [];
let realEstateData = [];
let loansData = [];

let spendingChartInstance = null;
let netWorthChartInstance = null;
let cashflowChartInstance = null;
let retirementChartInstance = null;

let selectedCsvText = "";
let isBackendConnected = false;

// Initialize Default Local DB Schema & Seed Data
const DEFAULT_LOCAL_DB = {
    accounts: [
        { id: 1, name: 'חשבון עו"ש לאומי', type: 'Bank', institution: 'בנק לאומי', currency: 'ILS', balance: 24850.0, account_number: '****4829', last_synced: '2026-09-16 10:30:00' },
        { id: 2, name: 'כרטיס ישראכרט Corporate', type: 'Credit Card', institution: 'ישראכרט', currency: 'ILS', balance: -4320.0, account_number: '****9102', last_synced: '2026-09-16 10:30:00' },
        { id: 3, name: 'כרטיס Max Executive', type: 'Credit Card', institution: 'Max', currency: 'ILS', balance: -2150.0, account_number: '****3341', last_synced: '2026-09-16 10:30:00' },
        { id: 4, name: 'תיק השקעות (אלטשולר שחם)', type: 'Investment', institution: 'אלטשולר שחם', currency: 'ILS', balance: 145000.0, account_number: 'INV-883', last_synced: '2026-09-16 10:30:00' },
        { id: 5, name: 'ארנק קריפטו Binance', type: 'Crypto', institution: 'Binance', currency: 'USD', balance: 6450.0, account_number: '0x7a...4e', last_synced: '2026-09-16 10:30:00' }
    ],
    categories: [
        { id: 1, name: 'משכורת (Salary)', type: 'income', group_name: 'Income', budget_limit: 0, icon: 'briefcase', color: '#10b981' },
        { id: 2, name: 'הכנסה נוספת (Freelance/Other)', type: 'income', group_name: 'Income', budget_limit: 0, icon: 'trending-up', color: '#059669' },
        { id: 3, name: 'הכנסה משכירות (Rental Income)', type: 'income', group_name: 'Income', budget_limit: 0, icon: 'home', color: '#047857' },
        { id: 4, name: 'שכר דירה / משכנתא (Housing)', type: 'expense', group_name: 'Fixed', budget_limit: 4500, icon: 'home', color: '#ef4444' },
        { id: 5, name: 'חשבונות (Utilities & Bills)', type: 'expense', group_name: 'Fixed', budget_limit: 800, icon: 'zap', color: '#f59e0b' },
        { id: 6, name: 'ביטוחים (Insurance)', type: 'expense', group_name: 'Fixed', budget_limit: 400, icon: 'shield-check', color: '#6366f1' },
        { id: 7, name: 'תחבורה ודלק (Transport)', type: 'expense', group_name: 'Fixed', budget_limit: 900, icon: 'car', color: '#3b82f6' },
        { id: 8, name: 'מנויים ותקשורת (Subscriptions)', type: 'expense', group_name: 'Fixed', budget_limit: 250, icon: 'tv', color: '#8b5cf6' },
        { id: 9, name: 'סופרמרקט ומזון (Groceries)', type: 'expense', group_name: 'Flexible', budget_limit: 2500, icon: 'shopping-cart', color: '#ec4899' },
        { id: 10, name: 'מסעדות ובתי קפה (Dining Out)', type: 'expense', group_name: 'Flexible', budget_limit: 1200, icon: 'utensils', color: '#f43f5e' },
        { id: 11, name: 'קניות ובילויים (Shopping & Leisure)', type: 'expense', group_name: 'Flexible', budget_limit: 1000, icon: 'shopping-bag', color: '#14b8a6' },
        { id: 12, name: 'בריאות ופארם (Health & Care)', type: 'expense', group_name: 'Flexible', budget_limit: 400, icon: 'heart-pulse', color: '#06b6d4' },
        { id: 13, name: 'שונות (Miscellaneous)', type: 'expense', group_name: 'Flexible', budget_limit: 500, icon: 'grid', color: '#64748b' },
        { id: 14, name: 'חיסכון והשקעות (Savings)', type: 'expense', group_name: 'Savings', budget_limit: 2000, icon: 'piggy-bank', color: '#84cc16' }
    ],
    pensions: [
        { id: 1, name: 'קרן פנסיה מנורה מבטחים', provider: 'מנורה מבטחים', policy_type: 'קרן פנסיה', balance: 285000.0, fee_acc: 0.18, fee_deposit: 1.2, yield_ytd: 7.8 },
        { id: 2, name: 'קרן השתלמות אלטשולר מניות', provider: 'אלטשולר שחם', policy_type: 'קרן השתלמות', balance: 125000.0, fee_acc: 0.45, fee_deposit: 0.0, yield_ytd: 9.4 },
        { id: 3, name: 'קופת גמל להשקעה הראל', provider: 'הראל', policy_type: 'קופת גמל', balance: 68000.0, fee_acc: 0.35, fee_deposit: 0.0, yield_ytd: 6.2 }
    ],
    real_estate: [
        { id: 1, name: 'דירת מגורים בתל אביב', property_type: 'דירת מגורים', market_value: 3450000.0, rental_income: 0.0, address: 'רחוב דיזנגוף, תל אביב' },
        { id: 2, name: 'דירת 3 חדרים להשקעה בחיפה', property_type: 'דירה להשקעה', market_value: 1250000.0, rental_income: 4200.0, address: 'רחוב הנביאים, חיפה' }
    ],
    loans: [
        { id: 1, name: 'משכנתא לדירת מגורים', lender: 'בנק לאומי למשכנתאות', initial_amount: 1850000.0, remaining_balance: 1420000.0, monthly_payment: 5800.0, interest_rate: 4.2 },
        { id: 2, name: 'הלוואה לרכב חדש', lender: 'מימון ישיר', initial_amount: 90000.0, remaining_balance: 38000.0, monthly_payment: 1450.0, interest_rate: 5.5 }
    ],
    rules: [
        { id: 1, keyword: 'סופר', category_id: 9, category_name: 'סופרמרקט ומזון (Groceries)', category_color: '#ec4899' },
        { id: 2, keyword: 'שופרסל', category_id: 9, category_name: 'סופרמרקט ומזון (Groceries)', category_color: '#ec4899' },
        { id: 3, keyword: 'רמי לוי', category_id: 9, category_name: 'סופרמרקט ומזון (Groceries)', category_color: '#ec4899' },
        { id: 4, keyword: 'דלק', category_id: 7, category_name: 'תחבורה ודלק (Transport)', category_color: '#3b82f6' },
        { id: 5, keyword: 'וולט', category_id: 10, category_name: 'מסעדות ובתי קפה (Dining Out)', category_color: '#f43f5e' },
        { id: 6, keyword: 'Wolt', category_id: 10, category_name: 'מסעדות ובתי קפה (Dining Out)', category_color: '#f43f5e' },
        { id: 7, keyword: 'נטפליקס', category_id: 8, category_name: 'מנויים ותקשורת (Subscriptions)', category_color: '#8b5cf6' },
        { id: 8, keyword: 'משכורת', category_id: 1, category_name: 'משכורת (Salary)', category_color: '#10b981' }
    ],
    transactions: [
        { id: 1, account_id: 1, date: '2026-09-01', merchant: 'חברת הייטק בע"מ - משכורת', amount: 18500.0, currency: 'ILS', category_id: 1, notes: 'עו"ש חודשי', source: 'api' },
        { id: 2, account_id: 1, date: '2026-09-01', merchant: 'שכירות נכנסת חיפה', amount: 4200.0, currency: 'ILS', category_id: 3, notes: 'שכירות דירה', source: 'api' },
        { id: 3, account_id: 1, date: '2026-09-02', merchant: 'לאומי משכנתא', amount: -5800.0, currency: 'ILS', category_id: 4, notes: 'חיוב משכנתא', source: 'api' },
        { id: 4, account_id: 2, date: '2026-09-05', merchant: 'שופרסל דיל תל אביב', amount: -720.50, currency: 'ILS', category_id: 9, notes: 'קניות לבית', source: 'api' },
        { id: 5, account_id: 2, date: '2026-09-10', merchant: 'חברת החשמל לישראל', amount: -380.00, currency: 'ILS', category_id: 5, notes: 'חשבון חודשי', source: 'api' },
        { id: 6, account_id: 2, date: '2026-09-12', merchant: 'וולט (Wolt Delivery)', amount: -145.00, currency: 'ILS', category_id: 10, notes: 'משלוח אוכל', source: 'api' },
        { id: 7, account_id: 3, date: '2026-09-14', merchant: 'פז תחנת דלק', amount: -280.00, currency: 'ILS', category_id: 7, notes: 'תדלוק', source: 'api' }
    ]
};

// LocalDB Controller
const LocalDB = {
    init() {
        if (!localStorage.getItem('smartbudget_db')) {
            localStorage.setItem('smartbudget_db', JSON.stringify(DEFAULT_LOCAL_DB));
        }
    },
    get() {
        try {
            return JSON.parse(localStorage.getItem('smartbudget_db')) || DEFAULT_LOCAL_DB;
        } catch (e) {
            return DEFAULT_LOCAL_DB;
        }
    },
    save(db) {
        localStorage.setItem('smartbudget_db', JSON.stringify(db));
    },
    reset() {
        localStorage.setItem('smartbudget_db', JSON.stringify(DEFAULT_LOCAL_DB));
    }
};

// Client-Side API Fetch Wrapper
async function apiFetch(path, options = {}) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const res = await fetch(path, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            updateConnectionBadge(true);
            return await res.json();
        }
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        updateConnectionBadge(false);
        return handleLocalFallback(path, options);
    }
}

function updateConnectionBadge(connected) {
    isBackendConnected = connected;
    const badge = document.getElementById("status-connection-badge");
    if (!badge) return;

    if (connected) {
        badge.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"><span class="w-2 h-2 ml-1.5 rounded-full bg-emerald-500 animate-pulse"></span>שרת מקומי מחובר</span>`;
    } else {
        badge.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"><span class="w-2 h-2 ml-1.5 rounded-full bg-amber-500"></span>מצב עצמאי (Local-First)</span>`;
    }
}

// Local Storage Fallback Handlers
function handleLocalFallback(path, options) {
    LocalDB.init();
    const db = LocalDB.get();
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    const urlObj = new URL(path, window.location.origin);
    const pathname = urlObj.pathname;
    const query = new URLSearchParams(urlObj.search);

    if (method === 'GET') {
        if (pathname === '/api/summary') {
            const bank_nw = (db.accounts || []).reduce((sum, a) => sum + (a.balance || 0), 0);
            const pension_total = (db.pensions || []).reduce((sum, p) => sum + (p.balance || 0), 0);
            const re_total = (db.real_estate || []).reduce((sum, r) => sum + (r.market_value || 0), 0);
            const loan_total = (db.loans || []).reduce((sum, l) => sum + (l.remaining_balance || 0), 0);

            const total_assets = bank_nw + pension_total + re_total;
            const net_worth = total_assets - loan_total;

            const income = (db.transactions || []).filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
            const expenses = Math.abs((db.transactions || []).filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
            const net_savings = income - expenses;

            return {
                net_worth, liquid_net_worth: bank_nw, total_assets, pensions_total: pension_total,
                real_estate_total: re_total, loans_total: loan_total, income, expenses, net_savings
            };
        }

        if (pathname === '/api/accounts') return db.accounts || [];
        if (pathname === '/api/pensions') return db.pensions || [];
        if (pathname === '/api/real_estate') return db.real_estate || [];
        if (pathname === '/api/loans') return db.loans || [];
        if (pathname === '/api/categories') return db.categories || [];
        if (pathname === '/api/rules') return db.rules || [];

        if (pathname === '/api/transactions') {
            const search = (query.get('search') || '').toLowerCase();
            const account_id = query.get('account_id');
            const category_id = query.get('category_id');

            let list = [...(db.transactions || [])];

            if (search) {
                list = list.filter(t => (t.merchant || '').toLowerCase().includes(search) || (t.notes || '').toLowerCase().includes(search));
            }
            if (account_id) {
                list = list.filter(t => String(t.account_id) === String(account_id));
            }
            if (category_id) {
                list = list.filter(t => String(t.category_id) === String(category_id));
            }

            return list.map(t => {
                const cat = (db.categories || []).find(c => c.id === t.category_id);
                const acc = (db.accounts || []).find(a => a.id === t.account_id);
                return {
                    ...t,
                    category_name: cat ? cat.name : 'לא סווג',
                    category_color: cat ? cat.color : '#d97706',
                    account_name: acc ? acc.name : ''
                };
            }).sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        if (pathname === '/api/budgets') {
            return (db.categories || []).filter(c => c.type === 'expense').map(cat => {
                const spent = Math.abs((db.transactions || [])
                    .filter(t => t.category_id === cat.id && t.amount < 0)
                    .reduce((sum, t) => sum + t.amount, 0));
                return {
                    id: cat.id,
                    name: cat.name,
                    group_name: cat.group_name,
                    budget_limit: cat.budget_limit || 1000,
                    spent: spent,
                    color: cat.color
                };
            });
        }

        if (pathname === '/api/market_ticker') {
            return [
                { symbol: 'USD/ILS', value: '3.74', change: '+0.15%', is_up: true },
                { symbol: 'EUR/ILS', value: '4.08', change: '-0.22%', is_up: false },
                { symbol: 'S&P 500', value: '5,620.10', change: '+0.45%', is_up: true },
                { symbol: 'TA-125', value: '2,045.30', change: '+0.80%', is_up: true },
                { symbol: 'BTC/USD', value: '$58,400', change: '+2.10%', is_up: true }
            ];
        }

        if (pathname === '/api/insights/fee_analyzer') {
            return {
                potential_annual_savings: 3420.0,
                insights: [
                    { type: 'דמי ניהול פנסיה', title: 'דמי ניהול גבוהים בצבירה (0.45%)', description: 'ניתן להפחית את דמי הניהול ל-0.18% באלשטר/מנורה ולחסוך כ-₪1,200 בשנה.', potential_savings: 'חיסכון ₪1,200/שנה' },
                    { type: 'עמלות עו"ש', title: 'דמי טיפול בכרטיס אשראי', description: 'חיובי דמי כרטיס חודשיים כפולים בישראכרט ו-Max. מומלץ לבקש פטור מועד עובדים/הייטק.', potential_savings: 'חיסכון ₪480/שנה' },
                    { type: 'משכנתא', title: 'פער ריביות במסלול פריים', description: 'ניתן לבצע מחזור משכנתא חלקי עבור היתרה הנותרת בריבית 4.2%.', potential_savings: 'חיסכון ₪1,740/שנה' }
                ]
            };
        }

        if (pathname === '/api/charts/networth_history') {
            return [
                { month: 'מרץ', net_worth: 2150000 },
                { month: 'אפריל', net_worth: 2190000 },
                { month: 'מאי', net_worth: 2240000 },
                { month: 'יוני', net_worth: 2285000 },
                { month: 'יולי', net_worth: 2330000 },
                { month: 'אוגוסט', net_worth: 2378000 }
            ];
        }

        if (pathname === '/api/charts/cashflow') {
            return [
                { month: 'מרץ', income: 22700, expense: 14200 },
                { month: 'אפריל', income: 22700, expense: 15800 },
                { month: 'מאי', income: 24500, expense: 13900 },
                { month: 'יוני', income: 22700, expense: 16400 },
                { month: 'יולי', income: 26000, expense: 14800 },
                { month: 'אוגוסט', income: 22700, expense: 15100 }
            ];
        }

        if (pathname === '/api/charts/spending') {
            const catMap = {};
            (db.transactions || []).filter(t => t.amount < 0).forEach(t => {
                const cat = (db.categories || []).find(c => c.id === t.category_id);
                const name = cat ? cat.name : 'לא סווג';
                const color = cat ? cat.color : '#64748b';
                if (!catMap[name]) catMap[name] = { name, total: 0, color };
                catMap[name].total += Math.abs(t.amount);
            });
            return Object.values(catMap);
        }
    }

    if (method === 'POST') {
        if (pathname === '/api/accounts/add') {
            const newAcc = {
                id: Date.now(),
                name: body.name || 'חשבון חדש',
                type: body.type || 'Bank',
                institution: body.institution || 'בנק',
                currency: body.currency || 'ILS',
                balance: parseFloat(body.balance || 0),
                account_number: body.account_number || '****',
                last_synced: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            db.accounts = db.accounts || [];
            db.accounts.push(newAcc);
            LocalDB.save(db);
            return { success: true, message: 'החשבון נוסף בהצלחה' };
        }

        if (pathname === '/api/pensions/add') {
            const newPen = {
                id: Date.now(),
                name: body.name,
                provider: body.provider,
                policy_type: body.policy_type || 'קרן פנסיה',
                balance: parseFloat(body.balance || 0),
                fee_acc: parseFloat(body.fee_acc || 0.2),
                fee_deposit: parseFloat(body.fee_deposit || 1.5),
                yield_ytd: parseFloat(body.yield_ytd || 6.5)
            };
            db.pensions = db.pensions || [];
            db.pensions.push(newPen);
            LocalDB.save(db);
            return { success: true, message: 'הנכס הפנסיוני נוסף בהצלחה' };
        }

        if (pathname === '/api/real_estate/add') {
            const newRE = {
                id: Date.now(),
                name: body.name,
                property_type: body.property_type || 'דירת מגורים',
                market_value: parseFloat(body.market_value || 0),
                rental_income: parseFloat(body.rental_income || 0),
                address: body.address || ''
            };
            db.real_estate = db.real_estate || [];
            db.real_estate.push(newRE);
            LocalDB.save(db);
            return { success: true, message: 'נכס הנדל"ן נוסף בהצלחה' };
        }

        if (pathname === '/api/loans/add') {
            const newLoan = {
                id: Date.now(),
                name: body.name,
                lender: body.lender,
                initial_amount: parseFloat(body.initial_amount || 0),
                remaining_balance: parseFloat(body.remaining_balance || 0),
                monthly_payment: parseFloat(body.monthly_payment || 0),
                interest_rate: parseFloat(body.interest_rate || 0)
            };
            db.loans = db.loans || [];
            db.loans.push(newLoan);
            LocalDB.save(db);
            return { success: true, message: 'ההלוואה נוספה בהצלחה' };
        }

        if (pathname === '/api/rules/add') {
            const cat = (db.categories || []).find(c => c.id === parseInt(body.category_id));
            const newRule = {
                id: Date.now(),
                keyword: body.keyword,
                category_id: parseInt(body.category_id),
                category_name: cat ? cat.name : 'סיווג',
                category_color: cat ? cat.color : '#d97706'
            };
            db.rules = db.rules || [];
            db.rules.push(newRule);
            LocalDB.save(db);
            return { success: true, message: 'החוק נוסף בהצלחה' };
        }

        if (pathname === '/api/rules/delete') {
            db.rules = (db.rules || []).filter(r => String(r.id) !== String(body.rule_id));
            LocalDB.save(db);
            return { success: true, message: 'החוק נמחק בהצלחה' };
        }

        if (pathname === '/api/transactions/add') {
            const amount = parseFloat(body.amount || 0);
            const account_id = parseInt(body.account_id);

            const newTx = {
                id: Date.now(),
                account_id: account_id,
                date: body.date || new Date().toISOString().split('T')[0],
                merchant: body.merchant,
                amount: amount,
                currency: 'ILS',
                category_id: body.category_id ? parseInt(body.category_id) : null,
                notes: body.notes || '',
                source: 'manual'
            };
            db.transactions = db.transactions || [];
            db.transactions.unshift(newTx);

            const acc = (db.accounts || []).find(a => a.id === account_id);
            if (acc) acc.balance += amount;

            LocalDB.save(db);
            return { success: true, message: 'העסקה נוספה בהצלחה' };
        }

        if (pathname === '/api/transactions/update_category') {
            const tx = (db.transactions || []).find(t => String(t.id) === String(body.transaction_id));
            if (tx) {
                tx.category_id = body.category_id ? parseInt(body.category_id) : null;
                LocalDB.save(db);
            }
            return { success: true };
        }

        if (pathname === '/api/sync') {
            const acc = (db.accounts || []).find(a => String(a.id) === String(body.account_id));
            if (acc) {
                acc.last_synced = new Date().toISOString().replace('T', ' ').substring(0, 19);
                LocalDB.save(db);
            }
            return { success: true, message: 'החשבון סונכרן בהצלחה' };
        }

        if (pathname === '/api/import/csv') {
            const parsedCount = parseCsvClientSide(body.csv_text, body.account_id);
            return { success: true, imported_count: parsedCount, message: `מיובאו ${parsedCount} עסקאות בהצלחה` };
        }
    }

    return { success: false, message: 'Not found' };
}

// Client-Side CSV Parser
function parseCsvClientSide(csvText, accountId) {
    const db = LocalDB.get();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    let importedCount = 0;

    lines.forEach((line, idx) => {
        if (idx === 0 && (line.includes('תאריך') || line.includes('Date'))) return;

        const parts = line.split(/[,;\t]/).map(p => p.replace(/"/g, '').trim());
        if (parts.length < 3) return;

        const dateStr = parts[0] || new Date().toISOString().split('T')[0];
        const merchant = parts[1] || 'עסקה מיובאת';
        const amount = parseFloat(parts[2] || 0);

        if (isNaN(amount) || amount === 0) return;

        let catId = null;
        (db.rules || []).forEach(r => {
            if (merchant.toLowerCase().includes(r.keyword.toLowerCase())) {
                catId = r.category_id;
            }
        });

        db.transactions = db.transactions || [];
        db.transactions.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000),
            account_id: parseInt(accountId),
            date: dateStr,
            merchant: merchant,
            amount: amount,
            currency: 'ILS',
            category_id: catId,
            notes: 'ייבוא CSV',
            source: 'csv'
        });

        const acc = (db.accounts || []).find(a => String(a.id) === String(accountId));
        if (acc) acc.balance += amount;

        importedCount++;
    });

    LocalDB.save(db);
    return importedCount;
}

// --- App Event Handlers & View Loaders ---

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    renderUserProfile();
    loadAllData();

    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById("modal-tx-date");
    if (dateInput) dateInput.value = today;
});

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
        'accounts': 'חשבונות בנק ואשראי',
        'pensions': 'פנסיה, גמל והשתלמות',
        'real_estate': 'נדל"ן ונכסים קבועים',
        'loans': 'הלוואות ומשכנתאות',
        'transactions': 'עסקאות וסיווג',
        'budgets': 'תקציבים חודשיים',
        'fee_analyzer': 'מנוע תובנות וחיסכון בעמלות',
        'planning': 'תכנון פיננסי וסימולטור פרישה',
        'rules': 'חוקי סיווג אוטומטיים'
    };
    const titleEl = document.getElementById("page-title");
    if (titleEl && pageTitleMap[tabName]) {
        titleEl.innerText = pageTitleMap[tabName];
    }

    closeMobileMenu();

    if (tabName === 'transactions') loadTransactions();
    if (tabName === 'accounts') renderAccounts();
    if (tabName === 'pensions') loadPensions();
    if (tabName === 'real_estate') loadRealEstate();
    if (tabName === 'loans') loadLoans();
    if (tabName === 'budgets') loadBudgets();
    if (tabName === 'fee_analyzer') loadFeeAnalyzer();
    if (tabName === 'planning') calculateRetirement();
    if (tabName === 'rules') loadRules();
}

async function loadAllData() {
    await Promise.all([
        loadMarketTicker(),
        loadSummary(),
        loadAccounts(),
        loadCategories(),
        loadTransactionsDashboard(),
        loadSpendingChart(),
        loadNetWorthChart(),
        loadCashFlowChart()
    ]);
}

// 1. Market Ticker
async function loadMarketTicker() {
    try {
        const items = await apiFetch("/api/market_ticker");
        const container = document.getElementById("market-ticker-container");
        if (!container || !Array.isArray(items)) return;

        container.innerHTML = items.map(it => `
            <span class="flex items-center space-x-1.5 space-x-reverse">
                <span class="text-slate-400 font-semibold">${it.symbol}:</span>
                <span class="text-white font-bold">${it.value}</span>
                <span class="${it.is_up ? 'text-emerald-400' : 'text-rose-400'} text-[11px]">${it.change}</span>
            </span>
        `).join('<span class="text-slate-700">•</span>');
    } catch (e) {
        console.error("Ticker load error", e);
    }
}

// 2. Load KPI Summary
async function loadSummary() {
    try {
        const data = await apiFetch("/api/summary");

        document.getElementById("stat-net-worth").innerText = formatCurrency(data.net_worth);
        document.getElementById("stat-income").innerText = formatCurrency(data.income);
        document.getElementById("stat-expenses").innerText = formatCurrency(data.expenses);
        document.getElementById("stat-savings").innerText = formatCurrency(data.net_savings);
    } catch (e) {
        console.error("Failed to load summary", e);
    }
}

// 3. Load Accounts
async function loadAccounts() {
    try {
        accountsData = await apiFetch("/api/accounts");

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
        grid.innerHTML = `
            <div class="col-span-full bg-white border border-beige-200 rounded-2xl p-8 text-center space-y-3">
                <i data-lucide="building-2" class="w-10 h-10 text-amber-600 mx-auto"></i>
                <h4 class="font-bold text-slate-800 text-base">טרם קושרו חשבונות בנק או כרטיסים</h4>
                <p class="text-xs text-slate-500 max-w-sm mx-auto">לחץ על "חבר בנק בלייב (Open Banking API)" או "ייבוא CSV" להוספת החשבון האישי שלך.</p>
                <div class="flex justify-center gap-3 pt-2">
                    <button onclick="openBankConnectModal()" class="px-4 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl shadow-sm">חבר בנק בלייב</button>
                    <button onclick="openAddAccountModal()" class="px-4 py-2 text-xs font-semibold bg-beige-100 text-slate-700 rounded-xl">הוספה ידנית</button>
                </div>
            </div>
        `;
        lucide.createIcons();
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
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400 flex items-center gap-1">
                                <i data-lucide="refresh-cw" class="w-3 h-3"></i> ${syncTime}
                            </span>
                            <button onclick="deleteAccount(${acc.id})" title="מחק חשבון" class="text-slate-300 hover:text-rose-600 transition">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
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
                        <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i> סנכרן בלייב
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

// Delete Handlers
function deleteAccount(accId) {
    if (!confirm("האם למחוק חשבון זה? כל העסקאות המשויכות יימחקו.")) return;
    const db = LocalDB.get();
    db.accounts = (db.accounts || []).filter(a => String(a.id) !== String(accId));
    db.transactions = (db.transactions || []).filter(t => String(t.account_id) !== String(accId));
    LocalDB.save(db);
    loadAllData();
}

function deletePension(pensionId) {
    if (!confirm("האם למחוק נכס פנסיוני זה?")) return;
    const db = LocalDB.get();
    db.pensions = (db.pensions || []).filter(p => String(p.id) !== String(pensionId));
    LocalDB.save(db);
    loadPensions();
    loadSummary();
}

function deleteRealEstate(reId) {
    if (!confirm("האם למחוק נכס נדל\"ן זה?")) return;
    const db = LocalDB.get();
    db.real_estate = (db.real_estate || []).filter(r => String(r.id) !== String(reId));
    LocalDB.save(db);
    loadRealEstate();
    loadSummary();
}

function deleteLoan(loanId) {
    if (!confirm("האם למחוק הלוואה זו?")) return;
    const db = LocalDB.get();
    db.loans = (db.loans || []).filter(l => String(l.id) !== String(loanId));
    LocalDB.save(db);
    loadLoans();
    loadSummary();
}

function deleteTransaction(txId) {
    if (!confirm("האם למחוק עסקה זו?")) return;
    const db = LocalDB.get();
    db.transactions = (db.transactions || []).filter(t => String(t.id) !== String(txId));
    LocalDB.save(db);
    loadTransactions();
    loadSummary();
    loadSpendingChart();
}

// Clean Mode vs Demo Mode Switches
function clearAllDemoData() {
    if (!confirm("האם למחוק את כל הנתונים הקיים ולעבור למצב נורמלי (מסך נקי מנתוני הדגמה)?")) return;
    const db = LocalDB.get();
    db.accounts = [];
    db.pensions = [];
    db.real_estate = [];
    db.loans = [];
    db.transactions = [];
    LocalDB.save(db);
    alert("כעת האפליקציה במצב נורמלי/נקי (0 נתוני הדגמה). תוכל לחבר את הבנק או להוסיף סעיפים משלך!");
    loadAllData();
}

function loadDemoData() {
    LocalDB.reset();
    alert("נתוני הדגמה נטענו בהצלחה!");
    loadAllData();
}

// 4. Load Pensions
async function loadPensions() {
    try {
        pensionsData = await apiFetch("/api/pensions");
        const container = document.getElementById("pensions-container");
        if (!container) return;

        if (pensionsData.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-white border border-beige-200 rounded-2xl p-8 text-center space-y-2">
                    <p class="text-slate-500 text-sm">אין נכסים פנסיוניים להצגה.</p>
                    <button onclick="openAddPensionModal()" class="px-4 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl shadow-sm">הוסף נכס פנסיוני ראשון</button>
                </div>
            `;
            return;
        }

        container.innerHTML = pensionsData.map(p => `
            <div class="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">${p.policy_type}</span>
                        <h4 class="text-base font-bold text-slate-900 mt-2">${p.name}</h4>
                        <p class="text-xs text-slate-500">${p.provider}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">YTD +${p.yield_ytd}%</span>
                        <button onclick="deletePension(${p.id})" title="מחק נכס" class="text-slate-300 hover:text-rose-600 transition">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                <div class="pt-2 border-t border-beige-100 flex justify-between items-end">
                    <div>
                        <p class="text-[11px] text-slate-400">צבירה כוללת</p>
                        <p class="text-2xl font-black text-slate-900">${formatCurrency(p.balance)}</p>
                    </div>
                    <div class="text-left text-[11px] text-slate-500">
                        <p>דמי ניהול מצבור: <strong>${p.fee_acc}%</strong></p>
                        <p>דמי ניהול הפקדה: <strong>${p.fee_deposit}%</strong></p>
                    </div>
                </div>
            </div>
        `).join("");
        lucide.createIcons();
    } catch (e) {
        console.error("Pensions load error", e);
    }
}

// 5. Load Real Estate
async function loadRealEstate() {
    try {
        realEstateData = await apiFetch("/api/real_estate");
        const container = document.getElementById("real-estate-container");
        if (!container) return;

        if (realEstateData.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-white border border-beige-200 rounded-2xl p-8 text-center space-y-2">
                    <p class="text-slate-500 text-sm">אין נכסי נדל"ן להצגה.</p>
                    <button onclick="openAddRealEstateModal()" class="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-sm">הוסף נכס נדל"ן ראשון</button>
                </div>
            `;
            return;
        }

        container.innerHTML = realEstateData.map(re => `
            <div class="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">${re.property_type}</span>
                        <h4 class="text-base font-bold text-slate-900 mt-2">${re.name}</h4>
                        <p class="text-xs text-slate-500">${re.address || ''}</p>
                    </div>
                    <button onclick="deleteRealEstate(${re.id})" title="מחק נכס" class="text-slate-300 hover:text-rose-600 transition">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                <div class="pt-2 border-t border-beige-100 flex justify-between items-end">
                    <div>
                        <p class="text-[11px] text-slate-400">שווי שוק מוערך</p>
                        <p class="text-2xl font-black text-slate-900">${formatCurrency(re.market_value)}</p>
                    </div>
                    ${re.rental_income > 0 ? `
                        <div class="text-left">
                            <p class="text-[11px] text-slate-400">שכירות חודשית</p>
                            <p class="text-lg font-bold text-emerald-600">+${formatCurrency(re.rental_income)}/חודש</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join("");
        lucide.createIcons();
    } catch (e) {
        console.error("Real estate error", e);
    }
}

// 6. Load Loans
async function loadLoans() {
    try {
        loansData = await apiFetch("/api/loans");
        const container = document.getElementById("loans-container");
        if (!container) return;

        if (loansData.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-white border border-beige-200 rounded-2xl p-8 text-center space-y-2">
                    <p class="text-slate-500 text-sm">אין הלוואות להצגה.</p>
                    <button onclick="openAddLoanModal()" class="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl shadow-sm">הוסף הלוואה / משכנתא</button>
                </div>
            `;
            return;
        }

        container.innerHTML = loansData.map(l => `
            <div class="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full">${l.lender}</span>
                        <h4 class="text-base font-bold text-slate-900 mt-2">${l.name}</h4>
                        <p class="text-xs text-slate-500">סכום מקורי: ${formatCurrency(l.initial_amount)}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">ריבית ${l.interest_rate}%</span>
                        <button onclick="deleteLoan(${l.id})" title="מחק הלוואה" class="text-slate-300 hover:text-rose-600 transition">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                <div class="pt-2 border-t border-beige-100 flex justify-between items-end">
                    <div>
                        <p class="text-[11px] text-slate-400">יתרת חוב נותרת</p>
                        <p class="text-2xl font-black text-rose-600">-${formatCurrency(l.remaining_balance)}</p>
                    </div>
                    <div class="text-left">
                        <p class="text-[11px] text-slate-400">החזר חודשי</p>
                        <p class="text-base font-bold text-slate-900">${formatCurrency(l.monthly_payment)}/חודש</p>
                    </div>
                </div>
            </div>
        `).join("");
        lucide.createIcons();
    } catch (e) {
        console.error("Loans load error", e);
    }
}

// 7. Fee Analyzer
async function loadFeeAnalyzer() {
    try {
        const data = await apiFetch("/api/insights/fee_analyzer");

        document.getElementById("stat-potential-savings").innerText = `${formatCurrency(data.potential_annual_savings)} / שנה`;

        const container = document.getElementById("fee-insights-container");
        if (!container) return;

        container.innerHTML = data.insights.map(ins => `
            <div class="bg-white border border-beige-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center">
                        <span class="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">${ins.type}</span>
                        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">${ins.potential_savings}</span>
                    </div>
                    <h4 class="text-base font-bold text-slate-900 mt-3">${ins.title}</h4>
                    <p class="text-xs text-slate-600 mt-1 leading-relaxed">${ins.description}</p>
                </div>
                <button onclick="alert('נציג פיננסי יחזור אליך ליישום החיסכון!')" class="w-full py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition">
                    ממש חיסכון זה
                </button>
            </div>
        `).join("");
    } catch (e) {
        console.error("Fee analyzer error", e);
    }
}

// 8. Compound Interest Retirement Simulator
function calculateRetirement() {
    const monthlyContrib = parseFloat(document.getElementById("sim-monthly-contrib").value || 0);
    const returnRate = parseFloat(document.getElementById("sim-return-rate").value || 0) / 100;
    const years = parseInt(document.getElementById("sim-years").value || 0);

    const months = years * 12;
    const rMonthly = returnRate / 12;

    let totalVal = 0;
    let totalInvested = 0;
    const yearlyLabels = [];
    const yearlyValues = [];

    for (let m = 1; m <= months; m++) {
        totalVal = (totalVal + monthlyContrib) * (1 + rMonthly);
        totalInvested += monthlyContrib;

        if (m % 12 === 0) {
            yearlyLabels.push(`שנה ${m / 12}`);
            yearlyValues.push(Math.round(totalVal));
        }
    }

    const interestGained = Math.max(0, totalVal - totalInvested);

    document.getElementById("sim-future-value").innerText = formatCurrency(totalVal);
    document.getElementById("sim-interest-gained").innerText = formatCurrency(interestGained);

    const ctx = document.getElementById("chart-retirement-sim");
    if (!ctx) return;

    if (retirementChartInstance) retirementChartInstance.destroy();

    retirementChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: yearlyLabels,
            datasets: [{
                label: 'צמיחת הון צפויה (₪)',
                data: yearlyValues,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Rubik', size: 10 } } },
                y: { grid: { color: '#e8ded0' }, ticks: { color: '#64748b', font: { family: 'Rubik', size: 10 } } }
            }
        }
    });
}

// 9. Load Categories
async function loadCategories() {
    try {
        categoriesData = await apiFetch("/api/categories");

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

// 10. Dashboard Recent Transactions
async function loadTransactionsDashboard() {
    try {
        const txs = await apiFetch("/api/transactions");

        const tbody = document.getElementById("table-dash-txs");
        if (!tbody || !Array.isArray(txs)) return;

        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400 text-xs">אין עסקאות להצגה.</td></tr>';
            return;
        }

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

// 11. Load Full Transactions Explorer Table
async function loadTransactions() {
    const searchInput = document.getElementById("tx-search-input");
    const accountFilter = document.getElementById("tx-account-filter");
    const categoryFilter = document.getElementById("tx-category-filter");

    const search = searchInput ? searchInput.value : '';
    const account_id = accountFilter ? accountFilter.value : '';
    const category_id = categoryFilter ? categoryFilter.value : '';

    const url = `/api/transactions?search=${encodeURIComponent(search)}&account_id=${account_id}&category_id=${category_id}`;

    try {
        const txs = await apiFetch(url);

        const tbody = document.getElementById("table-full-txs");
        if (!tbody || !Array.isArray(txs)) return;

        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-slate-500 text-sm">לא נמצאו עסקאות תואמות.</td></tr>';
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
                    <td class="py-3 px-4 text-center">
                        <button onclick="deleteTransaction(${tx.id})" title="מחק עסקה" class="text-slate-300 hover:text-rose-600 transition">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
        lucide.createIcons();
    } catch (e) {
        console.error("Failed to load txs", e);
    }
}

// Update Category
async function updateTxCategory(txId, categoryId) {
    try {
        await apiFetch("/api/transactions/update_category", {
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

// Charts
async function loadNetWorthChart() {
    try {
        const data = await apiFetch("/api/charts/networth_history");
        const ctx = document.getElementById("chart-networth-line");
        if (!ctx || !Array.isArray(data)) return;

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

async function loadCashFlowChart() {
    try {
        const data = await apiFetch("/api/charts/cashflow");
        const ctx = document.getElementById("chart-cashflow-bar");
        if (!ctx || !Array.isArray(data)) return;

        if (cashflowChartInstance) cashflowChartInstance.destroy();

        const labels = data.map(d => d.month);
        const incomeValues = data.map(d => d.income);
        const expenseValues = data.map(d => d.expense);

        cashflowChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'הכנסות', data: incomeValues, backgroundColor: '#10b981', borderRadius: 6 },
                    { label: 'הוצאות', data: expenseValues, backgroundColor: '#f43f5e', borderRadius: 6 }
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

async function loadSpendingChart() {
    try {
        const data = await apiFetch("/api/charts/spending");
        const ctx = document.getElementById("chart-spending-pie");
        if (!ctx || !Array.isArray(data)) return;

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

// Budgets View
async function loadBudgets() {
    try {
        const budgets = await apiFetch("/api/budgets");
        const container = document.getElementById("budgets-container");
        if (!container || !Array.isArray(budgets)) return;

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

// Rules Manager
async function loadRules() {
    try {
        rulesData = await apiFetch("/api/rules");
        const container = document.getElementById("rules-list-container");
        if (!container || !Array.isArray(rulesData)) return;

        if (rulesData.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm col-span-full">אין חוקי סיווג אוטומטיים מוגדרים.</p>';
            return;
        }

        container.innerHTML = rulesData.map(r => `
            <div class="bg-beige-50 border border-beige-200 rounded-xl p-3 flex justify-between items-center">
                <div>
                    <span class="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-beige-200">"${r.keyword}"</span>
                    <i data-lucide="arrow-left" class="w-3.5 h-3.5 inline mx-1 text-slate-400"></i>
                    <span class="text-xs font-semibold px-2 py-1 rounded-md" style="background-color: ${r.category_color || '#d97706'}20; color: ${r.category_color || '#d97706'}">
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
        const data = await apiFetch("/api/rules/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword, category_id })
        });
        alert(data.message || 'החוק נוסף בהצלחה');
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
        await apiFetch("/api/rules/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rule_id: ruleId })
        });
        loadRules();
    } catch (e) {
        alert("שגיאה במחיקת החוק");
    }
}

// Account Sync
async function syncAccount(accId) {
    try {
        const result = await apiFetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account_id: accId })
        });
        alert(result.message || 'החשבון סונכרן בהצלחה');
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

// Open Banking / Live Bank Connect Modal
function openBankConnectModal() {
    const modal = document.getElementById("modal-bank-connect");
    if (modal) modal.classList.remove("hidden");
}

function closeBankConnectModal() {
    const modal = document.getElementById("modal-bank-connect");
    if (modal) modal.classList.add("hidden");
}

async function submitBankConnect(e) {
    e.preventDefault();
    const bankInst = document.getElementById("bank-connect-inst").value;
    const accName = document.getElementById("bank-connect-name").value;
    const bal = parseFloat(document.getElementById("bank-connect-bal").value || 0);

    const payload = {
        name: accName || `חשבון ${bankInst}`,
        type: bankInst.includes("ישראכרט") || bankInst.includes("Max") || bankInst.includes("Cal") ? "Credit Card" : "Bank",
        institution: bankInst,
        currency: "ILS",
        balance: bal,
        account_number: "*****" + Math.floor(1000 + Math.random() * 9000)
    };

    try {
        const data = await apiFetch("/api/accounts/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        alert(`החשבון ב-${bankInst} קושר בהצלחה בלייב!`);
        closeBankConnectModal();
        loadAccounts();
        loadSummary();
    } catch (err) {
        alert("שגיאה בחיבור הבנק");
    }
}

// Modals: Add Financial Assets (Account, Pension, Real Estate, Loan)

function openAddAccountModal() { document.getElementById("modal-add-account").classList.remove("hidden"); }
function closeAccountModal() { document.getElementById("modal-add-account").classList.add("hidden"); }

async function submitAddAccount(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("acc-name-input").value,
        type: document.getElementById("acc-type-select").value,
        institution: document.getElementById("acc-institution-input").value,
        balance: parseFloat(document.getElementById("acc-balance-input").value || 0),
        account_number: document.getElementById("acc-number-input").value || '****'
    };

    try {
        const data = await apiFetch("/api/accounts/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        alert(data.message || 'החשבון נוסף בהצלחה');
        closeAccountModal();
        loadAccounts();
        loadSummary();
    } catch (err) {
        alert("שגיאה בהוספת חשבון");
    }
}

function openAddPensionModal() { document.getElementById("modal-add-pension").classList.remove("hidden"); }
function closePensionModal() { document.getElementById("modal-add-pension").classList.add("hidden"); }

async function submitAddPension(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("pension-name-input").value,
        provider: document.getElementById("pension-provider-input").value,
        policy_type: document.getElementById("pension-type-select").value,
        balance: parseFloat(document.getElementById("pension-balance-input").value || 0),
        fee_acc: parseFloat(document.getElementById("pension-fee-acc-input").value || 0.2),
        fee_deposit: parseFloat(document.getElementById("pension-fee-dep-input").value || 1.5),
        yield_ytd: parseFloat(document.getElementById("pension-yield-input").value || 6.5)
    };

    try {
        const data = await apiFetch("/api/pensions/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        alert(data.message || 'הנכס הפנסיוני נוסף בהצלחה');
        closePensionModal();
        loadPensions();
        loadSummary();
    } catch (err) {
        alert("שגיאה בהוספת נכס פנסיוני");
    }
}

function openAddRealEstateModal() { document.getElementById("modal-add-real-estate").classList.remove("hidden"); }
function closeRealEstateModal() { document.getElementById("modal-add-real-estate").classList.add("hidden"); }

async function submitAddRealEstate(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("re-name-input").value,
        property_type: document.getElementById("re-type-select").value,
        market_value: parseFloat(document.getElementById("re-value-input").value || 0),
        rental_income: parseFloat(document.getElementById("re-rent-input").value || 0),
        address: document.getElementById("re-address-input").value || ''
    };

    try {
        const data = await apiFetch("/api/real_estate/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        alert(data.message || 'נכס הנדל"ן נוסף בהצלחה');
        closeRealEstateModal();
        loadRealEstate();
        loadSummary();
    } catch (err) {
        alert("שגיאה בהוספת נכס נדל\"ן");
    }
}

function openAddLoanModal() { document.getElementById("modal-add-loan").classList.remove("hidden"); }
function closeLoanModal() { document.getElementById("modal-add-loan").classList.add("hidden"); }

async function submitAddLoan(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById("loan-name-input").value,
        lender: document.getElementById("loan-lender-input").value,
        initial_amount: parseFloat(document.getElementById("loan-initial-input").value || 0),
        remaining_balance: parseFloat(document.getElementById("loan-balance-input").value || 0),
        monthly_payment: parseFloat(document.getElementById("loan-payment-input").value || 0),
        interest_rate: parseFloat(document.getElementById("loan-interest-input").value || 0)
    };

    try {
        const data = await apiFetch("/api/loans/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        alert(data.message || 'ההלוואה נוספה בהצלחה');
        closeLoanModal();
        loadLoans();
        loadSummary();
    } catch (err) {
        alert("שגיאה בהוספת הלוואה");
    }
}

// Transaction Modal
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
        const data = await apiFetch("/api/transactions/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        alert(data.message || 'העסקה נשמרה בהצלחה');
        closeTxModal();
        loadAllData();
    } catch (err) {
        alert("שגיאה בשמירת עסקה");
    }
}

// CSV Modal
function openCsvModal(accId) {
    if (accId) {
        document.getElementById("csv-account-select").value = accId;
    }
    document.getElementById("modal-csv").classList.remove("hidden");
}
function closeCsvModal() {
    document.getElementById("modal-csv").classList.add("hidden");
    selectedCsvText = "";
    const display = document.getElementById("csv-filename-display");
    if (display) display.classList.add("hidden");
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedCsvText = e.target.result;
        const display = document.getElementById("csv-filename-display");
        if (display) {
            display.innerText = `קובץ נבחר: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            display.classList.remove("hidden");
        }
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
        const result = await apiFetch("/api/import/csv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ csv_text: selectedCsvText, account_id: accountId })
        });
        alert(result.message || 'הקובץ יובא בהצלחה');
        closeCsvModal();
        loadAllData();
    } catch (e) {
        alert("שגיאה בייבוא הקובץ");
    }
}

// Backup & Reset Tools
function exportDataJson() {
    const db = LocalDB.get();
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBudget_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function resetLocalData() {
    if (confirm("האם לאפס את כל הנתונים המקומיים לערכי דיפולט?")) {
        LocalDB.reset();
        alert("הנתונים אופסו בהצלחה.");
        loadAllData();
    }
}

// Mobile Menu Navigation
function toggleMobileMenu() {
    const drawer = document.getElementById("mobile-drawer");
    if (drawer) drawer.classList.toggle("hidden");
}
function closeMobileMenu() {
    const drawer = document.getElementById("mobile-drawer");
    if (drawer) drawer.classList.add("hidden");
}

// Currency Formatter
function formatCurrency(amount, curr = 'ILS') {
    const symbol = curr === 'USD' ? '$' : '₪';
    return `${symbol}${Number(amount || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Google Authentication Controller
function getGoogleUser() {
    try {
        return JSON.parse(localStorage.getItem("smartbudget_user"));
    } catch (e) {
        return null;
    }
}

function setGoogleUser(user) {
    if (user) {
        localStorage.setItem("smartbudget_user", JSON.stringify(user));
    } else {
        localStorage.removeItem("smartbudget_user");
    }
    renderUserProfile();
}

function renderUserProfile() {
    const user = getGoogleUser();
    const desktopBtn = document.getElementById("desktop-user-auth-btn");
    const mobileBtn = document.getElementById("mobile-user-auth-btn");
    const sidebarBadge = document.getElementById("sidebar-user-badge");

    if (user) {
        const userHtml = `
            <div class="relative group">
                <button class="flex items-center space-x-2 space-x-reverse bg-white border border-beige-200 hover:border-amber-300 rounded-xl px-2.5 py-1.5 shadow-sm transition text-right">
                    <img src="${user.picture || 'https://lh3.googleusercontent.com/a/default-user'}" alt="${user.name}" class="w-6 h-6 rounded-full border border-amber-500 object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=d97706&color=fff'">
                    <div class="hidden lg:block text-right">
                        <p class="text-xs font-bold text-slate-800 leading-tight">${user.name}</p>
                        <p class="text-[10px] text-slate-400 truncate max-w-[110px]">${user.email}</p>
                    </div>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
                </button>
                <div class="absolute left-0 mt-1 w-48 bg-white border border-beige-200 rounded-xl shadow-lg py-1 hidden group-hover:block z-50">
                    <div class="px-3 py-2 border-b border-beige-100">
                        <p class="text-xs font-bold text-slate-900">${user.name}</p>
                        <p class="text-[10px] text-slate-500 truncate">${user.email}</p>
                    </div>
                    <button onclick="logoutGoogle()" class="w-full text-right px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5 font-semibold">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i> התנתק מחשבון Google
                    </button>
                </div>
            </div>
        `;
        if (desktopBtn) desktopBtn.innerHTML = userHtml;
        if (mobileBtn) mobileBtn.innerHTML = userHtml;

        if (sidebarBadge) {
            sidebarBadge.innerHTML = `
                <img src="${user.picture || ''}" class="w-8 h-8 rounded-full border border-amber-400 object-cover" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=d97706&color=fff'">
                <div class="overflow-hidden">
                    <p class="text-xs font-bold text-slate-800 truncate">${user.name}</p>
                    <p class="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>מחובר ב-Google</p>
                </div>
            `;
        }
    } else {
        const loginBtnHtml = `
            <button onclick="openGoogleAuthModal()" class="px-3.5 py-2 text-xs font-bold bg-white hover:bg-beige-100 text-slate-800 border border-beige-200 rounded-xl shadow-sm transition flex items-center space-x-2 space-x-reverse">
                <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/></svg>
                <span>התחבר עם Google</span>
            </button>
        `;
        if (desktopBtn) desktopBtn.innerHTML = loginBtnHtml;
        if (mobileBtn) mobileBtn.innerHTML = loginBtnHtml;

        if (sidebarBadge) {
            sidebarBadge.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs">
                    IL
                </div>
                <div class="overflow-hidden">
                    <p class="text-xs font-bold text-slate-800 truncate">תקציב משפחתי</p>
                    <button onclick="openGoogleAuthModal()" class="text-[10px] text-amber-700 hover:underline font-semibold">התחבר עם Google</button>
                </div>
            `;
        }
    }
    lucide.createIcons();
}

function openGoogleAuthModal() {
    document.getElementById("modal-google-auth").classList.remove("hidden");
}
function closeGoogleAuthModal() {
    document.getElementById("modal-google-auth").classList.add("hidden");
}

function loginWithGoogleDemo() {
    const demoUser = {
        name: "ישראל ישראלי",
        email: "israel.demo@gmail.com",
        picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        signedInAt: new Date().toISOString()
    };
    setGoogleUser(demoUser);
    closeGoogleAuthModal();
    alert("התחברת בהצלחה עם Google!");
}

function handleGoogleCredentialResponse(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);

        const googleUser = {
            name: payload.name || payload.email,
            email: payload.email,
            picture: payload.picture,
            signedInAt: new Date().toISOString()
        };
        setGoogleUser(googleUser);
        closeGoogleAuthModal();
        alert(`שלום ${googleUser.name}, התחברת בהצלחה עם Google!`);
    } catch (e) {
        console.error("JWT parse error", e);
        loginWithGoogleDemo();
    }
}

function logoutGoogle() {
    if (confirm("האם להתנתק מחשבון Google?")) {
        setGoogleUser(null);
    }
}
