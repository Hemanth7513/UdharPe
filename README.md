# UdharPe

UdharPe is a credit tracking and digital ledger platform designed for local businesses and merchants.

## Features

- **Merchant Dashboard**: Real-time overview of outstanding balances, payments, and recent ledger activity.
- **Customer Ledgers**: Individual customer ledger tracking with chronological credit and payment entries.
- **Invoicing & Payments**: Transaction processing with atomic database RPCs and running balance calculation.
- **Audit Reports**: Secure platform audit reporting and CSV data export.
- **PWA Ready**: Offline-first capability with service worker caching.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend & Auth**: Supabase Auth, PostgreSQL with Row Level Security (RLS)
- **Functions**: Supabase Edge Functions (Deno / TypeScript)
- **Email**: Transactional email integration via Resend

## Getting Started

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the sample environment file and add your credentials:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```
