# Smart Aquaculture Web

Commercial-grade web application for pond management.

## Features

- **Authentication**: Login via OpenID.
- **Dashboard**: 
  - Pond Overview with real-time status (pH, Salinity, Ammonia, etc.).
  - Farm Information & Staff List.
  - Dynamic Timeline of system events.
- **Pond Detail**:
  - Water Quality Trend Charts (pH, DO, Temperature, etc.).
  - AI Analysis Reports (Breeding detection).
  - Historical Data View.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

3. **Build for Production**
   ```bash
   npm run build
   ```

## Configuration

- **API Proxy**: Configured in `vite.config.ts` to forward `/api` requests to `https://api.pondrobotics.com`.
- **Environment**: 
  - Base API URL: `/api/v1`
  - Login Endpoint: `/api/v1/auth/login/apifox`

## Notes

- Some data (Sidebar info, Dynamic timeline) uses mock data for demonstration as specific APIs were not fully detailed in the provided context.
- The `getPondList` and `login` functions are connected to the backend API structure.
