import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "finance.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Accounts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL, -- Bank, Credit Card, Investment, Crypto, Cash
            institution TEXT NOT NULL, -- e.g. Leumi, Hapoalim, Cal, Max, Binance
            currency TEXT DEFAULT 'ILS',
            balance REAL DEFAULT 0.0,
            account_number TEXT,
            last_synced DATETIME,
            status TEXT DEFAULT 'active'
        )
    ''')

    # Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL, -- expense, income
            group_name TEXT NOT NULL, -- Fixed, Flexible, Savings, Income
            budget_limit REAL DEFAULT 0.0,
            icon TEXT DEFAULT 'tag',
            color TEXT DEFAULT '#d97706'
        )
    ''')

    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            date DATE NOT NULL,
            merchant TEXT NOT NULL,
            amount REAL NOT NULL, -- Positive = Income, Negative = Expense
            currency TEXT DEFAULT 'ILS',
            category_id INTEGER,
            notes TEXT,
            source TEXT DEFAULT 'manual', -- api, csv, manual
            FOREIGN KEY (account_id) REFERENCES accounts (id),
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')

    # Auto-categorization rules
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS category_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL UNIQUE,
            category_id INTEGER NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')

    # Pensions & Provident Funds (פנסיה וגמל)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pensions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            provider TEXT NOT NULL, -- e.g. מנורה, הראל, אלטשולר, הפניקס
            policy_type TEXT NOT NULL, -- קרן פנסיה, קופת גמל, קרן השתלמות, ביטוח מנהלים
            balance REAL DEFAULT 0.0,
            fee_acc REAL DEFAULT 0.0, -- דמי ניהול מצבור (%)
            fee_deposit REAL DEFAULT 0.0, -- דמי ניהול הפקדה (%)
            yield_ytd REAL DEFAULT 0.0 -- תשואה מתחילת השנה (%)
        )
    ''')

    # Real Estate Assets (נדל"ן)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS real_estate (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            property_type TEXT NOT NULL, -- דירת מגורים, דירה להשקעה, משרד/מסחרי
            market_value REAL DEFAULT 0.0,
            rental_income REAL DEFAULT 0.0, -- הכנסה חודשית משכירות
            address TEXT
        )
    ''')

    # Loans & Mortgages (הלוואות ומשכנתאות)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS loans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            lender TEXT NOT NULL, -- e.g. בנקים, חברת אשראי, קרן פנסיה
            initial_amount REAL DEFAULT 0.0,
            remaining_balance REAL DEFAULT 0.0,
            monthly_payment REAL DEFAULT 0.0,
            interest_rate REAL DEFAULT 0.0, -- ריבית שנתית (%)
            end_date DATE
        )
    ''')

    conn.commit()

    # Insert default categories if empty
    cursor.execute("SELECT COUNT(*) as count FROM categories")
    if cursor.fetchone()['count'] == 0:
        seed_default_data(cursor)
        conn.commit()

    conn.close()

def seed_default_data(cursor):
    categories = [
        # Income
        ("משכורת (Salary)", "income", "Income", 0, "briefcase", "#10b981"),
        ("הכנסה נוספת (Freelance/Other)", "income", "Income", 0, "trending-up", "#059669"),
        ("הכנסה משכירות (Rental Income)", "income", "Income", 0, "home", "#047857"),
        
        # Fixed Expenses
        ("שכר דירה / משכנתא (Housing)", "expense", "Fixed", 4500, "home", "#ef4444"),
        ("חשבונות (Utilities & Bills)", "expense", "Fixed", 800, "zap", "#f59e0b"),
        ("ביטוחים (Insurance)", "expense", "Fixed", 400, "shield-check", "#6366f1"),
        ("תחבורה ודלק (Transport)", "expense", "Fixed", 900, "car", "#3b82f6"),
        ("מנויים ותקשורת (Subscriptions)", "expense", "Fixed", 250, "tv", "#8b5cf6"),
        
        # Flexible Expenses
        ("סופרמרקט ומזון (Groceries)", "expense", "Flexible", 2500, "shopping-cart", "#ec4899"),
        ("מסעדות ובתי קפה (Dining Out)", "expense", "Flexible", 1200, "utensils", "#f43f5e"),
        ("קניות ובילויים (Shopping & Leisure)", "expense", "Flexible", 1000, "shopping-bag", "#14b8a6"),
        ("בריאות ופארם (Health & Care)", "expense", "Flexible", 400, "heart-pulse", "#06b6d4"),
        ("שונות (Miscellaneous)", "expense", "Flexible", 500, "grid", "#64748b"),

        # Savings / Investments
        ("חיסכון והשקעות (Savings)", "expense", "Savings", 2000, "piggy-bank", "#84cc16")
    ]

    for name, cat_type, group_name, budget_limit, icon, color in categories:
        cursor.execute('''
            INSERT INTO categories (name, type, group_name, budget_limit, icon, color)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, cat_type, group_name, budget_limit, icon, color))

    cursor.execute("SELECT id, name FROM categories")
    cat_map = {row['name']: row['id'] for row in cursor.fetchall()}

    # Rules
    rules = [
        ("סופר", cat_map["סופרמרקט ומזון (Groceries)"]),
        ("שופרסל", cat_map["סופרמרקט ומזון (Groceries)"]),
        ("רמי לוי", cat_map["סופרמרקט ומזון (Groceries)"]),
        ("יוחננוף", cat_map["סופרמרקט ומזון (Groceries)"]),
        ("דלק", cat_map["תחבורה ודלק (Transport)"]),
        ("פז", cat_map["תחבורה ודלק (Transport)"]),
        ("דור אלון", cat_map["תחבורה ודלק (Transport)"]),
        ("וולט", cat_map["מסעדות ובתי קפה (Dining Out)"]),
        ("Wolt", cat_map["מסעדות ובתי קפה (Dining Out)"]),
        ("תן ביס", cat_map["מסעדות ובתי קפה (Dining Out)"]),
        ("נטפליקס", cat_map["מנויים ותקשורת (Subscriptions)"]),
        ("Netflix", cat_map["מנויים ותקשורת (Subscriptions)"]),
        ("Spotify", cat_map["מנויים ותקשורת (Subscriptions)"]),
        ("סלקום", cat_map["מנויים ותקשורת (Subscriptions)"]),
        ("פרטנר", cat_map["מנויים ותקשורת (Subscriptions)"]),
        ("ארנונה", cat_map["חשבונות (Utilities & Bills)"]),
        ("חברת החשמל", cat_map["חשבונות (Utilities & Bills)"]),
        ("סופר-פארם", cat_map["בריאות ופארם (Health & Care)"]),
        ("משכורת", cat_map["משכורת (Salary)"])
    ]

    for keyword, cat_id in rules:
        cursor.execute("INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)", (keyword, cat_id))

    # Accounts
    seed_accounts = [
        ("חשבון עו\"ש לאומי", "Bank", "בנק לאומי", "ILS", 24850.0, "****4829", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("כרטיס ישראכרט Corporate", "Credit Card", "ישראכרט", "ILS", -4320.0, "****9102", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("כרטיס Max Executive", "Credit Card", "Max", "ILS", -2150.0, "****3341", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("תיק השקעות (אלטשולר שחם)", "Investment", "אלטשולר שחם", "ILS", 145000.0, "INV-883", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("ארנק קריפטו Binance", "Crypto", "Binance", "USD", 6450.0, "0x7a...4e", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    ]

    for name, acc_type, inst, curr, bal, num, synced in seed_accounts:
        cursor.execute('''
            INSERT INTO accounts (name, type, institution, currency, balance, account_number, last_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, acc_type, inst, curr, bal, num, synced))

    # Seed Pensions & Provident Funds
    seed_pensions = [
        ("קרן פנסיה מנורה מבטחים", "מנורה מבטחים", "קרן פנסיה", 285000.0, 0.18, 1.2, 7.8),
        ("קרן השתלמות אלטשולר מניות", "אלטשולר שחם", "קרן השתלמות", 125000.0, 0.45, 0.0, 9.4),
        ("קופת גמל להשקעה הראל", "הראל", "קופת גמל", 68000.0, 0.35, 0.0, 6.2)
    ]
    for n, p, t, b, fa, fd, y in seed_pensions:
        cursor.execute('''
            INSERT INTO pensions (name, provider, policy_type, balance, fee_acc, fee_deposit, yield_ytd)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (n, p, t, b, fa, fd, y))

    # Seed Real Estate Assets
    seed_real_estate = [
        ("דירת מגורים בתל אביב", "דירת מגורים", 3450000.0, 0.0, "רחוב דיזנגוף, תל אביב"),
        ("דירת 3 חדרים להשקעה בחיפה", "דירה להשקעה", 1250000.0, 4200.0, "רחוב הנביאים, חיפה")
    ]
    for n, t, mv, ri, ad in seed_real_estate:
        cursor.execute('''
            INSERT INTO real_estate (name, property_type, market_value, rental_income, address)
            VALUES (?, ?, ?, ?, ?)
        ''', (n, t, mv, ri, ad))

    # Seed Loans & Mortgages
    seed_loans = [
        ("משכנתא לדירת מגורים", "בנק לאומי למשכנתאות", 1850000.0, 1420000.0, 5800.0, 4.2, "2048-06-30"),
        ("הלוואה לרכב חדש", "מימון ישיר", 90000.0, 38000.0, 1450.0, 5.5, "2028-12-31")
    ]
    for n, l, ia, rb, mp, ir, ed in seed_loans:
        cursor.execute('''
            INSERT INTO loans (name, lender, initial_amount, remaining_balance, monthly_payment, interest_rate, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (n, l, ia, rb, mp, ir, ed))

    # Seed Transactions
    today = datetime.now()
    for month_offset in range(0, 6):
        m_date = today - timedelta(days=30 * month_offset)
        m_start = m_date.replace(day=1)
        
        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (1, ?, 'חברת הייטק בע"מ - משכורת', 18500.0, 'ILS', ?, 'עו"ש חודשי', 'api')
        ''', (m_start.replace(day=1).strftime("%Y-%m-%d"), cat_map["משכורת (Salary)"]))

        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (1, ?, 'שכירות נכנסת חיפה', 4200.0, 'ILS', ?, 'שכירות דירה', 'api')
        ''', (m_start.replace(day=1).strftime("%Y-%m-%d"), cat_map["הכנסה משכירות (Rental Income)"]))

        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (1, ?, 'לאומי משכנתא', -5800.0, 'ILS', ?, 'חיוב משכנתא', 'api')
        ''', (m_start.replace(day=2).strftime("%Y-%m-%d"), cat_map["שכר דירה / משכנתא (Housing)"]))

        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (2, ?, 'שופרסל דיל תל אביב', -720.50, 'ILS', ?, 'קניות לבית', 'api')
        ''', (m_start.replace(day=5).strftime("%Y-%m-%d"), cat_map["סופרמרקט ומזון (Groceries)"]))

        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (2, ?, 'חברת החשמל לישראל', -380.00, 'ILS', ?, 'חשבון חודשי', 'api')
        ''', (m_start.replace(day=10).strftime("%Y-%m-%d"), cat_map["חשבונות (Utilities & Bills)"]))

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
