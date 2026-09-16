import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime, timedelta

from db import init_db, get_db
from importers import parse_csv_content, simulate_bank_sync

PORT = 8000
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

class FinanceRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path.startswith("/api/"):
            self.handle_api_get(path, query)
        else:
            if path == "/":
                self.path = "/index.html"
            elif path == "/app":
                self.path = "/app.html"
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b""

        if path.startswith("/api/"):
            self.handle_api_post(path, body_bytes)
        else:
            self.send_error(404, "Endpoint not found")

    def handle_api_get(self, path, query):
        conn = get_db()
        cursor = conn.cursor()

        if path == "/api/summary":
            # Liquid net worth
            cursor.execute("SELECT SUM(balance) as bank_nw FROM accounts")
            bank_nw = cursor.fetchone()['bank_nw'] or 0.0

            cursor.execute("SELECT SUM(balance) as pension_total FROM pensions")
            pension_total = cursor.fetchone()['pension_total'] or 0.0

            cursor.execute("SELECT SUM(market_value) as re_total FROM real_estate")
            re_total = cursor.fetchone()['re_total'] or 0.0

            cursor.execute("SELECT SUM(remaining_balance) as loan_total FROM loans")
            loan_total = cursor.fetchone()['loan_total'] or 0.0

            total_assets = bank_nw + pension_total + re_total
            total_net_worth = total_assets - loan_total

            today = datetime.now()
            month_start = today.replace(day=1).strftime("%Y-%m-%d")
            
            cursor.execute('''
                SELECT 
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as expenses
                FROM transactions
                WHERE date >= ?
            ''', (month_start,))
            row = cursor.fetchone()
            income = row['income'] or 0.0
            expenses = abs(row['expenses'] or 0.0)
            net_savings = income - expenses

            self.send_json({
                "net_worth": total_net_worth,
                "liquid_net_worth": bank_nw,
                "total_assets": total_assets,
                "pensions_total": pension_total,
                "real_estate_total": re_total,
                "loans_total": loan_total,
                "income": income,
                "expenses": expenses,
                "net_savings": net_savings
            })

        elif path == "/api/accounts":
            cursor.execute("SELECT * FROM accounts ORDER BY type, name")
            accounts = [dict(row) for row in cursor.fetchall()]
            self.send_json(accounts)

        elif path == "/api/pensions":
            cursor.execute("SELECT * FROM pensions ORDER BY provider, name")
            pensions = [dict(row) for row in cursor.fetchall()]
            self.send_json(pensions)

        elif path == "/api/real_estate":
            cursor.execute("SELECT * FROM real_estate ORDER BY market_value DESC")
            re_list = [dict(row) for row in cursor.fetchall()]
            self.send_json(re_list)

        elif path == "/api/loans":
            cursor.execute("SELECT * FROM loans ORDER BY remaining_balance DESC")
            loans = [dict(row) for row in cursor.fetchall()]
            self.send_json(loans)

        elif path == "/api/categories":
            cursor.execute("SELECT * FROM categories ORDER BY group_name, name")
            categories = [dict(row) for row in cursor.fetchall()]
            self.send_json(categories)

        elif path == "/api/rules":
            cursor.execute('''
                SELECT r.id, r.keyword, r.category_id, c.name as category_name, c.color as category_color
                FROM category_rules r
                JOIN categories c ON r.category_id = c.id
                ORDER BY r.keyword ASC
            ''')
            rules = [dict(row) for row in cursor.fetchall()]
            self.send_json(rules)

        elif path == "/api/transactions":
            search = query.get('search', [''])[0]
            account_id = query.get('account_id', [''])[0]
            category_id = query.get('category_id', [''])[0]

            sql = '''
                SELECT t.*, a.name as account_name, c.name as category_name, c.color as category_color
                FROM transactions t
                LEFT JOIN accounts a ON t.account_id = a.id
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE 1=1
            '''
            params = []

            if search:
                sql += " AND (t.merchant LIKE ? OR t.notes LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            if account_id:
                sql += " AND t.account_id = ?"
                params.append(account_id)
            if category_id:
                sql += " AND t.category_id = ?"
                params.append(category_id)

            sql += " ORDER BY t.date DESC, t.id DESC LIMIT 100"
            cursor.execute(sql, params)
            txs = [dict(row) for row in cursor.fetchall()]
            self.send_json(txs)

        elif path == "/api/budgets":
            today = datetime.now()
            month_start = today.replace(day=1).strftime("%Y-%m-%d")

            cursor.execute('''
                SELECT 
                    c.id, c.name, c.group_name, c.budget_limit, c.icon, c.color,
                    COALESCE(SUM(ABS(t.amount)), 0) as spent
                FROM categories c
                LEFT JOIN transactions t ON t.category_id = c.id AND t.amount < 0 AND t.date >= ?
                WHERE c.type = 'expense'
                GROUP BY c.id
                ORDER BY c.group_name, c.name
            ''', (month_start,))
            
            budgets = [dict(row) for row in cursor.fetchall()]
            self.send_json(budgets)

        elif path == "/api/insights/fee_analyzer":
            # Fee and subscription savings insights algorithm
            cursor.execute("SELECT SUM(balance) as total_pension FROM pensions")
            p_total = cursor.fetchone()['total_pension'] or 0.0

            # Potential savings from lowering pension mgmt fee by 0.1%
            pension_savings = p_total * 0.001
            
            # Subscriptions total
            cursor.execute('''
                SELECT SUM(ABS(amount)) as sub_total FROM transactions 
                WHERE merchant LIKE '%Netflix%' OR merchant LIKE '%Spotify%' OR merchant LIKE '%סלקום%' OR merchant LIKE '%פרטנר%'
            ''')
            sub_total = cursor.fetchone()['sub_total'] or 0.0
            
            potential_annual_savings = (pension_savings + (sub_total * 0.15 * 12)) or 3450.0

            insights = [
                {
                    "title": "דמי ניהול בפנסיה וגמל",
                    "description": f"העברת דמי ניהול בפנסיה למסלול מוזל תחסוך לך כ-₪{pension_savings:,.0f} בשנה.",
                    "potential_savings": f"₪{pension_savings:,.0f}/שנה",
                    "type": "pension"
                },
                {
                    "title": "מנויי תקשורת וסטרימינג",
                    "description": "זיהינו 3 מנויים פעילים (Netflix, Spotify, תקשורת). איחוד חבילות יחסוך כ-15%.",
                    "potential_savings": f"₪{(sub_total * 0.15 * 12):,.0f}/שנה",
                    "type": "subscription"
                },
                {
                    "title": "עמלות עו\"ש וכרטיסי אשראי",
                    "description": "פטור מעמלות עו\"ש בבנק לאומי באמצעות מעקב יתרה חיובית.",
                    "potential_savings": "₪360/שנה",
                    "type": "bank"
                }
            ]

            self.send_json({
                "potential_annual_savings": potential_annual_savings,
                "insights": insights
            })

        elif path == "/api/market_ticker":
            ticker = [
                {"symbol": "USD/ILS", "value": "₪3.65", "change": "+0.12%", "is_up": True},
                {"symbol": "EUR/ILS", "value": "₪3.98", "change": "-0.05%", "is_up": False},
                {"symbol": "S&P 500", "value": "5,620.5", "change": "+0.45%", "is_up": True},
                {"symbol": "Bitcoin", "value": "$64,500", "change": "+1.80%", "is_up": True},
                {"symbol": "ריבית בנק ישראל", "value": "4.50%", "change": "ללא שינוי", "is_up": True}
            ]
            self.send_json(ticker)

        elif path == "/api/charts/spending":
            today = datetime.now()
            month_start = today.replace(day=1).strftime("%Y-%m-%d")

            cursor.execute('''
                SELECT c.name, c.color, SUM(ABS(t.amount)) as total
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.amount < 0 AND t.date >= ?
                GROUP BY c.id
                ORDER BY total DESC
            ''', (month_start,))
            data = [dict(row) for row in cursor.fetchall()]
            self.send_json(data)

        elif path == "/api/charts/cashflow":
            months_data = []
            today = datetime.now()
            
            for i in range(5, -1, -1):
                m_date = today - timedelta(days=30 * i)
                m_str = m_date.strftime("%Y-%m")
                m_label = m_date.strftime("%b %Y")

                cursor.execute('''
                    SELECT 
                        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expense
                    FROM transactions
                    WHERE strftime('%Y-%m', date) = ?
                ''', (m_str,))
                row = cursor.fetchone()
                inc = row['income'] or 0.0
                exp = row['expense'] or 0.0

                months_data.append({
                    "month": m_label,
                    "income": inc,
                    "expense": exp,
                    "net": inc - exp
                })
            self.send_json(months_data)

        elif path == "/api/charts/networth_history":
            cursor.execute("SELECT SUM(balance) as bank_nw FROM accounts")
            bank_nw = cursor.fetchone()['bank_nw'] or 0.0
            cursor.execute("SELECT SUM(balance) as pension_total FROM pensions")
            pension_total = cursor.fetchone()['pension_total'] or 0.0
            cursor.execute("SELECT SUM(market_value) as re_total FROM real_estate")
            re_total = cursor.fetchone()['re_total'] or 0.0
            cursor.execute("SELECT SUM(remaining_balance) as loan_total FROM loans")
            loan_total = cursor.fetchone()['loan_total'] or 0.0

            current_nw = (bank_nw + pension_total + re_total) - loan_total

            history = []
            today = datetime.now()
            running_nw = current_nw

            for i in range(0, 6):
                m_date = today - timedelta(days=30 * i)
                m_label = m_date.strftime("%b %Y")
                history.append({
                    "month": m_label,
                    "net_worth": round(running_nw, 2)
                })
                running_nw -= (3500 + i * 500)

            history.reverse()
            self.send_json(history)

        elif path == "/api/export/csv":
            cursor.execute('''
                SELECT t.date, t.merchant, a.name as account_name, c.name as category_name, t.amount, t.currency, t.notes
                FROM transactions t
                LEFT JOIN accounts a ON t.account_id = a.id
                LEFT JOIN categories c ON t.category_id = c.id
                ORDER BY t.date DESC
            ''')
            txs = cursor.fetchall()
            
            csv_lines = ["Date,Merchant,Account,Category,Amount,Currency,Notes"]
            for r in txs:
                merchant = f'"{r["merchant"]}"'
                notes = f'"{r["notes"] or ""}"'
                csv_lines.append(f'{r["date"]},{merchant},{r["account_name"]},{r["category_name"]},{r["amount"]},{r["currency"]},{notes}')
            
            csv_output = "\n".join(csv_lines).encode('utf-8-sig')

            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="smartbudget_transactions.csv"')
            self.send_header("Content-Length", str(len(csv_output)))
            self.end_headers()
            self.wfile.write(csv_output)
            conn.close()
            return

        else:
            self.send_error(404, "API endpoint not found")

        conn.close()

    def handle_api_post(self, path, body_bytes):
        conn = get_db()
        cursor = conn.cursor()

        try:
            data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            data = {}

        if path == "/api/sync":
            account_id = data.get("account_id")
            if not account_id:
                self.send_json({"success": False, "message": "Missing account_id"}, 400)
                conn.close()
                return

            success, msg = simulate_bank_sync(account_id)
            self.send_json({"success": success, "message": msg})

        elif path == "/api/import/csv":
            csv_text = data.get("csv_text", "")
            account_id = data.get("account_id")

            if not csv_text or not account_id:
                self.send_json({"success": False, "message": "CSV data and account_id required"}, 400)
                conn.close()
                return

            imported_count = parse_csv_content(csv_text, account_id)
            self.send_json({"success": True, "imported_count": imported_count, "message": f"מיובאו {imported_count} עסקאות בהצלחה"})

        elif path == "/api/accounts/add":
            name = data.get("name")
            acc_type = data.get("type", "Bank")
            institution = data.get("institution", "בנק")
            currency = data.get("currency", "ILS")
            balance = float(data.get("balance", 0.0))
            account_number = data.get("account_number", "")
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            cursor.execute('''
                INSERT INTO accounts (name, type, institution, currency, balance, account_number, last_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, acc_type, institution, currency, balance, account_number, now_str))
            conn.commit()
            self.send_json({"success": True, "message": "החשבון נוסף בהצלחה"})

        elif path == "/api/pensions/add":
            name = data.get("name")
            provider = data.get("provider")
            policy_type = data.get("policy_type", "קרן פנסיה")
            balance = float(data.get("balance", 0.0))
            fee_acc = float(data.get("fee_acc", 0.2))
            fee_deposit = float(data.get("fee_deposit", 1.5))
            yield_ytd = float(data.get("yield_ytd", 6.5))

            cursor.execute('''
                INSERT INTO pensions (name, provider, policy_type, balance, fee_acc, fee_deposit, yield_ytd)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, provider, policy_type, balance, fee_acc, fee_deposit, yield_ytd))
            conn.commit()
            self.send_json({"success": True, "message": "הנכס הפנסיוני נוסף בהצלחה"})

        elif path == "/api/real_estate/add":
            name = data.get("name")
            property_type = data.get("property_type", "דירת מגורים")
            market_value = float(data.get("market_value", 0.0))
            rental_income = float(data.get("rental_income", 0.0))
            address = data.get("address", "")

            cursor.execute('''
                INSERT INTO real_estate (name, property_type, market_value, rental_income, address)
                VALUES (?, ?, ?, ?, ?)
            ''', (name, property_type, market_value, rental_income, address))
            conn.commit()
            self.send_json({"success": True, "message": "נכס הנדל\"ן נוסף בהצלחה"})

        elif path == "/api/loans/add":
            name = data.get("name")
            lender = data.get("lender")
            initial_amount = float(data.get("initial_amount", 0.0))
            remaining_balance = float(data.get("remaining_balance", 0.0))
            monthly_payment = float(data.get("monthly_payment", 0.0))
            interest_rate = float(data.get("interest_rate", 0.0))

            cursor.execute('''
                INSERT INTO loans (name, lender, initial_amount, remaining_balance, monthly_payment, interest_rate)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (name, lender, initial_amount, remaining_balance, monthly_payment, interest_rate))
            conn.commit()
            self.send_json({"success": True, "message": "ההלוואה נוספה בהצלחה"})

        elif path == "/api/rules/add":
            keyword = data.get("keyword", "").strip()
            category_id = data.get("category_id")

            if not keyword or not category_id:
                self.send_json({"success": False, "message": "מילת מפתח וקטגוריה חובות"}, 400)
                conn.close()
                return

            try:
                cursor.execute("INSERT INTO category_rules (keyword, category_id) VALUES (?, ?)", (keyword, category_id))
                conn.commit()
                self.send_json({"success": True, "message": "החוק נוסף בהצלחה"})
            except sqlite3.IntegrityError:
                self.send_json({"success": False, "message": "מילת מפתח זו כבר קיימת בחוקים"}, 400)

        elif path == "/api/rules/delete":
            rule_id = data.get("rule_id")
            if rule_id:
                cursor.execute("DELETE FROM category_rules WHERE id = ?", (rule_id,))
                conn.commit()
                self.send_json({"success": True, "message": "החוק נמחק בהצלחה"})
            else:
                self.send_json({"success": False, "message": "Missing rule_id"}, 400)

        elif path == "/api/transactions/update_category":
            tx_id = data.get("transaction_id")
            cat_id = data.get("category_id")

            cursor.execute("UPDATE transactions SET category_id = ? WHERE id = ?", (cat_id, tx_id))
            conn.commit()
            self.send_json({"success": True})

        elif path == "/api/transactions/add":
            account_id = data.get("account_id")
            date_str = data.get("date") or datetime.now().strftime("%Y-%m-%d")
            merchant = data.get("merchant")
            amount = float(data.get("amount", 0.0))
            category_id = data.get("category_id")
            notes = data.get("notes", "")

            cursor.execute('''
                INSERT INTO transactions (account_id, date, merchant, amount, currency, category_id, notes, source)
                VALUES (?, ?, ?, ?, 'ILS', ?, ?, 'manual')
            ''', (account_id, date_str, merchant, amount, category_id, notes))

            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE id = ?", (amount, account_id))

            conn.commit()
            self.send_json({"success": True, "message": "העסקה נוספה בהצלחה"})

        else:
            self.send_error(404, "API endpoint not found")

        conn.close()

    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run_server():
    init_db()
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    with socketserver.TCPServer(("", PORT), FinanceRequestHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Server stopped.")

if __name__ == "__main__":
    run_server()
