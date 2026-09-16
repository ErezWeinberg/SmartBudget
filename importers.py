import csv
import io
import random
from datetime import datetime, timedelta
from db import get_db

def auto_categorize(merchant_name):
    """Matches merchant name against keyword rules stored in DB."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT keyword, category_id FROM category_rules")
    rules = cursor.fetchall()
    conn.close()

    merchant_lower = merchant_name.lower()
    for rule in rules:
        if rule['keyword'].lower() in merchant_lower:
            return rule['category_id']
    
    # Default to Miscellaneous / שונות if no rule matches
    return None

def parse_csv_content(csv_text, account_id):
    """
    Parses CSV content (supporting Israeli bank exports & standard CSV formats).
    Expected columns dynamically detected: Date, Merchant/Description, Amount.
    """
    f = io.StringIO(csv_text)
    reader = csv.reader(f)
    rows = list(reader)

    if not rows:
        return 0

    header = [col.strip().lower() for col in rows[0]]
    
    # Column detection logic
    date_idx = -1
    merchant_idx = -1
    amount_idx = -1
    debit_idx = -1
    credit_idx = -1

    for idx, col in enumerate(header):
        if any(k in col for k in ['date', 'תאריך']):
            date_idx = idx
        elif any(k in col for k in ['merchant', 'payee', 'description', 'תיאור', 'שם בית עסק', 'פרטים']):
            merchant_idx = idx
        elif any(k in col for k in ['amount', 'סכום', 'סכום חיוב', 'סה"כ']):
            amount_idx = idx
        elif any(k in col for k in ['debit', 'חובה', 'הוצאה']):
            debit_idx = idx
        elif any(k in col for k in ['credit', 'זכות', 'הכנסה']):
            credit_idx = idx

    conn = get_db()
    cursor = conn.cursor()

    imported_count = 0
    for row in rows[1:]:
        if not row or len(row) <= max(date_idx, merchant_idx):
            continue

        try:
            date_str = row[date_idx].strip() if date_idx != -1 else datetime.now().strftime("%Y-%m-%d")
            # Format date if DD/MM/YYYY
            if "/" in date_str:
                parts = date_str.split("/")
                if len(parts) == 3:
                    date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"

            merchant = row[merchant_idx].strip() if merchant_idx != -1 else "Unknown Merchant"

            amount = 0.0
            if amount_idx != -1 and row[amount_idx].strip():
                clean_amt = row[amount_idx].replace(",", "").replace("₪", "").replace("$", "").strip()
                amount = float(clean_amt)
            elif debit_idx != -1 or credit_idx != -1:
                debit = float(row[debit_idx].replace(",", "").strip()) if debit_idx != -1 and row[debit_idx].strip() else 0.0
                credit = float(row[credit_idx].replace(",", "").strip()) if credit_idx != -1 and row[credit_idx].strip() else 0.0
                amount = credit - debit

            if amount == 0.0 and merchant == "Unknown Merchant":
                continue

            category_id = auto_categorize(merchant)

            cursor.execute('''
                INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
                VALUES (?, ?, ?, ?, 'ILS', ?, 'יבוא מקובץ CSV', 'csv')
            ''', (account_id, date_str, merchant, amount, category_id))
            
            imported_count += 1
        except Exception as e:
            print(f"Skipping CSV row {row}: {e}")

    conn.commit()
    conn.close()
    return imported_count

def simulate_bank_sync(account_id):
    """
    Simulates a live Open Banking API sync for a specified account.
    Generates realistic recent transactions and updates account balance.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM accounts WHERE id = ?", (account_id,))
    account = cursor.fetchone()
    if not account:
        conn.close()
        return False, "Account not found"

    sample_merchants = [
        ("ארומה קפה", -32.00, "מסעדות ובתי קפה (Dining Out)"),
        ("טיב טעם", -214.50, "סופרמרקט ומזון (Groceries)"),
        ("תחנת דלק סונול", -240.00, "תחבורה ודלק (Transport)"),
        ("העברה נכנסת - ביט / Paybox", 150.00, "הכנסה נוספת (Freelance/Other)"),
        ("סטימצקי עזריאלי", -89.00, "קניות ובילויים (Shopping & Leisure)"),
        ("KSP מחשבים", -350.00, "קניות ובילויים (Shopping & Leisure)")
    ]

    # Select random 1-3 new transactions
    selected = random.sample(sample_merchants, random.randint(1, 3))
    now_str = datetime.now().strftime("%Y-%m-%d")
    
    new_tx_count = 0
    balance_change = 0.0

    for merch, amt, cat_name in selected:
        cursor.execute("SELECT id FROM categories WHERE name = ?", (cat_name,))
        cat_row = cursor.fetchone()
        cat_id = cat_row['id'] if cat_row else None

        cursor.execute('''
            INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
            VALUES (?, ?, ?, ?, ?, ?, 'סונכרן בלייב מ-API', 'api')
        ''', (account_id, now_str, merch, amt, account['currency'], cat_id))
        
        new_tx_count += 1
        balance_change += amt

    # Update account balance and last_synced timestamp
    new_balance = account['balance'] + balance_change
    synced_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        UPDATE accounts SET balance = ?, last_synced = ? WHERE id = ?
    ''', (new_balance, synced_at, account_id))

    conn.commit()
    conn.close()
    return True, f"סונכרנו {new_tx_count} עסקאות חדשות בהצלחה"
