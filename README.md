# Ledgerly — Invoice Manager

A clean, fast invoice creator and tracker. Create professional invoices, track who owes you what, and record payments — all from the browser, with no account or server required.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

The app opens with sample data so you can explore. Go to **Settings → Data** to erase it and start fresh.

## Features

**Invoices**
- Editor with a side-by-side **live preview** (switch between Edit and Preview on mobile)
- Line items with drag-to-reorder, auto-calculated amounts, and descriptions/rates suggested from items you have billed before
- Percentage or fixed discount, tax rate, and multiple currencies (set per client or per invoice)
- Payment-term shortcuts (On receipt, Net 7/14/30/60) and automatic invoice numbering
- **Recurring invoices** (weekly/monthly/quarterly/yearly) that create new drafts automatically
- Status tracking: Draft → Awaiting payment → Partially paid → Paid, plus automatic **Overdue** and manual **Void**
- Record full or partial payments with method and note; view an activity timeline
- Print or **save as PDF** (the print layout shows only the invoice)
- Pre-filled **email** and **payment reminder** drafts that open in your mail app
- Duplicate, revert to draft, void, delete

**Tracking**
- Dashboard with outstanding, overdue, collected (last 30 days) and draft totals
- 6-month revenue chart and a "Needs attention" list of overdue or soon-due invoices
- Invoice list with status tabs, search, column sorting, and CSV export
- Client directory with billed and outstanding totals per client

**Settings**
- Business profile, logo, brand color, tax ID, and payment instructions printed on every invoice
- Defaults for currency, tax, terms, number prefix, notes
- JSON backup export and restore

Keyboard shortcut: press **N** anywhere to start a new invoice.

## Data storage

All data is stored in your browser's `localStorage`. Use **Settings → Export backup** regularly, or before switching browsers.

## Roadmap — features found in leading tools (FreshBooks, Zoho Invoice, Wave, Invoice Ninja, Harvest, Stripe Invoicing)

| Priority | Feature | Why |
|---|---|---|
| High | **Online payments** (Stripe / PayPal "Pay now" link on the invoice) | The biggest driver of faster payment in every tool reviewed |
| High | **Cloud sync and accounts** (e.g. Supabase or Firebase) | Use it on multiple devices; no risk of losing browser data |
| High | **Real email sending + automatic reminders** (before the due date, on it, and after) | Reminders with configurable timing and tone are a standard feature |
| High | **Client portal** (shareable link to view, download, and pay) | Clients see their invoice history and pay balances themselves |
| Medium | Estimates/quotes that convert to invoices | Common workflow for project work |
| Medium | Time and expense tracking billed onto invoices | Harvest's and FreshBooks' core strength |
| Medium | Multiple invoice templates/layouts | Brand flexibility |
| Medium | Per-line-item tax and multiple tax rates (e.g. GST + PST) | Required in some regions |
| Medium | Late fees applied automatically | Encourages on-time payment |
| Medium | Reports: aging receivables, tax summary, revenue by client | Accounting and tax time |
| Low | Credit notes and refunds | Corrections without deleting history |
| Low | Multi-language invoices | International clients |
| Low | Accounting export (QuickBooks, Xero) | Hand-off to an accountant |
| Low | Team members and roles | Agencies and growing teams |

## Tech

React 18, TypeScript, Vite, React Router (hash routing, so it works on any static host), and lucide icons. No backend.
