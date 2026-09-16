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

    conn.commit()

    # Insert default categories if empty
    cursor.execute("SELECT COUNT(*) as count FROM categories")
    if cursor.fetchone()['count'] == 0:
        seed_default_data(cursor)
        conn.commit()

    conn.close()

def seed_default_data(cursor):
    # Default Categories (Hebrew & English friendly)
    categories = [
        # Income
        ("משכורת (Salary)", "income", "Income", 0, "briefcase", "#10b981"),
        ("הכנסה נוספת (Freelance/Other)", "income", "Income", 0, "trending-up", "#059669"),
        
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

    # Fetch inserted category IDs for default rules & seed accounts
    cursor.execute("SELECT id, name FROM categories")
    cat_map = {row['name']: row['id'] for row in cursor.fetchall()}

    # Category Rules
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

    # Seed Accounts
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

    # Seed Transactions for current and previous months (for trend charts)
    today = datetime.now()
    
    for month_offset in range(0, 6):
        m_date = today - timedelta(days=30 * month_offset)
        m_start = m_date.replace(day=1)
        
        # Monthly salary
        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (1, ?, 'חברת הייטק בע"מ - משכורת', 18500.0, 'ILS', ?, 'עו"ש חודשי', 'api')
        ''', (m_start.replace(day=1).strftime("%Y-%m-%d"), cat_map["משכורת (Salary)"]))

        # Monthly Rent
        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (1, ?, 'בעל הדירה - שכר דירה', -4500.0, 'ILS', ?, 'העברה בנקאית', 'api')
        ''', (m_start.replace(day=2).strftime("%Y-%m-%d"), cat_map["שכר דירה / משכנתא (Housing)"]))

        # Supermarket
        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (2, ?, 'שופרסל דיל תל אביב', -720.50, 'ILS', ?, 'קניות לבית', 'api')
        ''', (m_start.replace(day=5).strftime("%Y-%m-%d"), cat_map["סופרמרקט ומזון (Groceries)"]))

        # Utilities
        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (2, ?, 'חברת החשמל לישראל', -380.00, 'ILS', ?, 'חשבון חודשי', 'api')
        ''', (m_start.replace(day=10).strftime("%Y-%m-%d"), cat_map["חשבונות (Utilities & Bills)"]))

        # Dining Out
        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (2, ?, 'Wolt - מסעדת ג\'ירף', -210.00, 'ILS', ?, 'ארוחת ערב', 'api')
        ''', (m_start.replace(day=14).strftime("%Y-%m-%d"), cat_map["מסעדות ובתי קפה (Dining Out)"]))

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
