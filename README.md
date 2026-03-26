# RippleBoards
Decision Support System for Analyzing Mortality Policy Interventions

## Quick Start (Firebase Backend - Recommended)

**Prerequisites:**
- Node.js 16+ and npm
- Firebase project with Realtime Database

### 1. Configure Firebase

Update `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebaseDatabaseUrl: 'https://your-project-default-rtdb.firebaseio.com'
};
```

### 2. Migrate CSV Data to Firebase

```bash
cd scripts
npm install
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json npm run migrate
```

[See detailed setup instructions](./FIREBASE_MIGRATION.md)

### 3. Start Frontend

```bash
cd frontend
npm install
npm run serve
```

Open http://localhost:4200 — the app loads all data directly from Firebase.

---

## Alternative: Python Backend

If you prefer running a local Python Flask backend instead of Firebase:

Quick start

### Backend Setup (Optional: Local Python Server)

If you want to run the Flask backend locally instead of using Firebase:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

This starts a dev Flask server on `http://localhost:5000`.

**To use the Python backend:**

Set `firebaseDatabaseUrl: ''` in `frontend/src/environments/environment.ts`. The app will automatically fall back to `http://localhost:5000/api`.

## Architecture

**Frontend:** Angular 16 with TypeScript, Leaflet for mapping, RxJS for state management

**Backend Options:**
1. **Firebase Realtime Database** (recommended, serverless) — REST API at `<db-url>/<path>.json`
2. **Python Flask** (local development) — REST API at `http://localhost:5000/api`

**Data Source:** 
- `data/Non-Medical_Factor_Measures_for_Place__ACS_2017-2021.csv` (SDOH indicators by state)
- Automatically migrated to Firebase by the migration script

## Key Features

- 🗺️ Interactive US state map with mortality rate choropleth
- 🎚️ 5 policy intervention sliders (broadband, housing, education, employment, healthcare)
- 📊 Real-time mortality trajectory projections with intervention impact
- 💰 Weighted impact model with synergy bonuses
- 🔄 Dual state selection: click map or search dropdown
- ☁️ Fully hosted on Firebase (zero server management)
