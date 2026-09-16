# 🪙 SmartBudget IL - Personal Finance & Multi-Source Budgeting

A modern, full-stack personal finance dashboard web application for Israeli & global financial tracking, built with **Python 3**, **SQLite**, **Tailwind CSS**, and **Chart.js**.

![Theme](https://img.shields.io/badge/Theme-Warm_Beige-amber)
![Python](https://img.shields.io/badge/Python-3.13-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **🏦 Multi-Source Account Aggregation**: Centralized tracking across Banks (Leumi, Hapoalim), Credit Cards (Isracard, Max, Cal), Investments (Altshuler Shaham), and Crypto (Binance).
- **📊 Interactive Analytics & Charts**:
  - Net Worth 6-Month Trend Line Chart.
  - Monthly Cash Flow Income vs Expense Bar Chart.
  - Spending Distribution Doughnut Chart.
- **⚙️ Custom Category Rules Manager**: Automated transaction keyword rule engine (e.g., `שופרסל` ➡️ `Groceries`).
- **📥 Data Import & Export**:
  - Drag-and-drop CSV importer for Israeli bank exports.
  - One-click export to Excel-compatible CSV.
- **🤖 Israeli Bank Scrapers Integration**: Compatible with `israeli-bank-scrapers` CLI for automated bank syncing.

---

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ErezWeinberg/SmartBudget.git
   cd SmartBudget
   ```

2. **Run the Application**:
   ```bash
   python app.py
   ```

3. **Open in Browser**:
   Go to [http://localhost:8000](http://localhost:8000)

---

## 🛠 Project Structure

- `app.py` - Lightweight REST API server (zero external dependencies).
- `db.py` - SQLite schema & default seed data.
- `importers.py` - Israeli CSV parser & simulated Open Banking API sync engine.
- `static/index.html` - Responsive Tailwind CSS frontend.
- `static/app.js` - Client-side state & Chart.js logic.
