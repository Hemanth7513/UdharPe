# UdharPe — Business Credit & Digital Ledger Platform

UdharPe is a modern business credit (*Udhar*) and payment (*Jama*) ledger platform built for Indian merchants, wholesalers, and local businesses. It replaces paper bahi-khata books with an accurate, auditable, multi-language web application.

**Live App:** https://udhar-pe.vercel.app

## Core Capabilities

- **Merchant Dashboard:** Real-time summary of total receivables, collections, recent ledger activity, and quick search (`Ctrl+K` / `⌘K`).
- **Customer Ledgers:** Per-customer credit and settlement history with chronological running balances, GST/contact details, and instant status tracking.
- **Billing & Settlements:** Atomic bill creation (`create_bill`) and payment recording (`record_payment`) backed by PostgreSQL RPCs and append-only settlement records.
- **PDF & CSV Statements:** Downloadable ledger statements (all entries or settled bills) and spreadsheet-safe CSV exports with formula-injection protection.
- **Payment Reminders:** Email reminders and statement delivery via Supabase Edge Functions and Resend.
- **Multi-Language Support:** Full interface available in **English**, **Hindi (हिन्दी)**, **Telugu (తెలుగు)**, and **Tamil (தமிழ்)**.
- **Offline Awareness & PWA:** Automatic offline detection screen with one-tap connection retry and service worker support.
- **Superadmin Command Center:** Platform-wide merchant, customer, and 30-day credit vs. collection analytics protected by cryptographic `app_metadata.role` verification.

## Architecture & Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Recharts, jsPDF, i18next, Lucide Icons
- **Backend & Database:** Supabase Auth, PostgreSQL with Row Level Security (RLS), atomic SQL RPCs, and immutable settlement policies
- **Serverless Edge Functions:** Deno / TypeScript (`admin-stats`, `send-email`, `send-auth-email`, `send-reminders`)
- **Hosting & Security:** Vercel with strict Content Security Policy (CSP), `X-Frame-Options: DENY`, HSTS, and CORS origin allowlisting
