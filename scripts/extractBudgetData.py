#!/usr/bin/env python3
"""
Extract FY26 budget data from Excel and output JSON for the financial dashboard.

Reads from: ~/Development/fpa/data-sources/budget/Budget Summary w Projects FY26.xlsx
Outputs to:  ~/Development/fpa/public/data/budget-fy26.json
"""

import json
import os

import openpyxl

BASE_DIR = os.path.expanduser("~/Development/fpa/data-sources/budget")
OUTPUT_PATH = os.path.expanduser("~/Development/fpa/public/data/budget-fy26.json")

FILENAME = "Budget Summary w Projects FY26.xlsx"
SHEET_NAME = "Sheet1"

# Column indices (0-based from column C which is index 2 in Excel, but we read from C onward)
# C=label, D=OLD, E=EJLD, F=LBBLD, G=FPAE, H=TOTALS
DISTRICTS = ["OLD", "EJLD", "LBBLD", "FPAE"]

# Expense categories to extract (exact labels from the spreadsheet)
EXPENSE_CATEGORIES = [
    "Personnel Services",
    "Training",
    "Professional Services",
    "Contractuals",
    "Materials",
    "Equipments",
    "Other Charges",
    "MMCI",
    "CostSharing",
]


def safe_num(value):
    """Convert a cell value to a number, defaulting to 0."""
    if value is None:
        return 0
    try:
        return round(float(value))
    except (ValueError, TypeError):
        return 0


def extract_budget():
    """Extract budget data from the Excel file."""
    filepath = os.path.join(BASE_DIR, FILENAME)
    if not os.path.exists(filepath):
        print(f"ERROR: File not found: {filepath}")
        return None

    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb[SHEET_NAME]

    # Read all rows into a list for easier access
    # Data starts at column C (index 2), so we read columns C through H
    rows = []
    for row in ws.iter_rows(min_col=3, max_col=8, values_only=True):
        rows.append(row)

    wb.close()

    # Build a lookup: label -> [OLD, EJLD, LBBLD, FPAE, TOTALS]
    label_data = {}
    for row in rows:
        label = row[0]
        if label and isinstance(label, str):
            label = label.strip()
            values = [safe_num(row[i]) for i in range(1, 6)]  # D, E, F, G, H
            label_data[label] = values

    # Extract revenue
    revenue_values = label_data.get("Total Revenues", [0, 0, 0, 0, 0])
    revenue = {
        "OLD": revenue_values[0],
        "EJLD": revenue_values[1],
        "LBBLD": revenue_values[2],
        "FPAE": revenue_values[3],
        "total": revenue_values[4],
    }

    # Extract expenses by category
    expenses = []
    for category in EXPENSE_CATEGORIES:
        values = label_data.get(category, [0, 0, 0, 0, 0])
        expenses.append({
            "category": category,
            "OLD": values[0],
            "EJLD": values[1],
            "LBBLD": values[2],
            "FPAE": values[3],
            "total": values[4],
        })

    # Extract totals
    total_expenses_values = label_data.get("Total Expenses", [0, 0, 0, 0, 0])
    total_expenses = {
        "OLD": total_expenses_values[0],
        "EJLD": total_expenses_values[1],
        "LBBLD": total_expenses_values[2],
        "FPAE": total_expenses_values[3],
        "total": total_expenses_values[4],
    }

    sources_uses_values = label_data.get("Total SourcesUses", [0, 0, 0, 0, 0])
    sources_uses = {
        "OLD": sources_uses_values[0],
        "EJLD": sources_uses_values[1],
        "LBBLD": sources_uses_values[2],
        "FPAE": sources_uses_values[3],
        "total": sources_uses_values[4],
    }

    grand_total_values = label_data.get("GRAND TOTAL", [0, 0, 0, 0, 0])
    grand_total = {
        "OLD": grand_total_values[0],
        "EJLD": grand_total_values[1],
        "LBBLD": grand_total_values[2],
        "FPAE": grand_total_values[3],
        "total": grand_total_values[4],
    }

    return {
        "fiscalYear": 2026,
        "districts": DISTRICTS,
        "districtNames": {
            "OLD": "Orleans Levee District",
            "EJLD": "East Jefferson Levee District",
            "LBBLD": "Lake Borgne Basin Levee District",
            "FPAE": "Flood Protection Authority East",
        },
        "revenue": revenue,
        "expenses": expenses,
        "totalExpenses": total_expenses,
        "sourcesUses": sources_uses,
        "grandTotal": grand_total,
    }


def main():
    print("Extracting FY26 budget data...")
    data = extract_budget()
    if data is None:
        return

    # Summary
    print(f"\nRevenue: ${data['revenue']['total']:,.0f}")
    print(f"Total Expenses: ${data['totalExpenses']['total']:,.0f}")
    print(f"Grand Total: ${data['grandTotal']['total']:,.0f}")

    print("\nExpenses by category:")
    for exp in data["expenses"]:
        print(f"  {exp['category']}: ${exp['total']:,.0f}")

    print("\nGrand total by district:")
    for d in DISTRICTS:
        print(f"  {d}: ${data['grandTotal'][d]:,.0f}")

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nOutput written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
