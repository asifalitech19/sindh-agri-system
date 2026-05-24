# 🌾 Sindh Smart Crop Monitoring System
### Government-Level Agriculture Intelligence Platform
**Version 2.0 | Developed for Sindh Agriculture Department**

---

## 📁 Project Structure

```
sindh-agri-system/
├── backend/
│   ├── main.py                  ← FastAPI server (Disease AI + GEE + Yield)
│   ├── requirements.txt         ← Python dependencies
│   └── .env.example             ← Copy to .env and fill your keys
├── frontend/
│   ├── App.jsx                  ← React dashboard + Voice Bot UI
│   ├── package.json             ← Node dependencies
│   └── .env.example             ← Copy to .env and fill your keys
├── schema/
│   └── supabase_schema.sql      ← Paste this in Supabase SQL Editor
└── docs/
    └── agronomy_parameters.json ← Real crop/disease/treatment database
```

---

## ⚡ STEP-BY-STEP SETUP (30 Minutes to Live Demo)

---

### STEP 1 — Get Free API Keys

| Service | Link | Cost | What it does |
|---|---|---|---|
| **Anthropic Claude** | https://console.anthropic.com | Free $5 credit | Disease AI + Voice Bot |
| **Supabase** | https://supabase.com | Free tier | Database + Auth |
| **OpenWeatherMap** | https://openweathermap.org/api | Free 1000/day | Live weather |
| **Google Earth Engine** | https://earthengine.google.com | Free (NGO/Research) | Satellite NDVI |

---

### STEP 2 — Setup Supabase Database

1. Go to **https://supabase.com** → Create New Project
2. Name it: `sindh-crop-monitor` | Region: Choose nearest
3. Go to **SQL Editor** → click **"New Query"**
4. Copy-paste the entire contents of `schema/supabase_schema.sql`
5. Click **Run** — all 9 tables will be created
6. Go to **Settings → API** → copy:
   - `Project URL` → paste in both `.env` files as `SUPABASE_URL`
   - `anon public` key → paste as `SUPABASE_ANON_KEY`
   - `service_role` key → paste as `SUPABASE_SERVICE_KEY` (keep secret!)
7. Go to **Storage** → Create 3 buckets:
   - `scan-images` (public)
   - `ndvi-images` (public)
   - `profile-photos` (public)

---

### STEP 3 — Setup Python Backend

```bash
# 1. Go to backend folder
cd sindh-agri-system/backend

# 2. Create virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment file
cp .env.example .env

# 5. Open .env and paste your API keys:
#    - ANTHROPIC_API_KEY
#    - SUPABASE_URL
#    - SUPABASE_SERVICE_KEY
#    - OPENWEATHER_API_KEY

# 6. Copy agronomy database to backend folder
cp ../docs/agronomy_parameters.json ./agronomy_parameters.json

# 7. Start the server
uvicorn main:app --reload --port 8000

# ✅ Backend running at: http://localhost:8000
# ✅ API docs at:        http://localhost:8000/api/docs
```

---

### STEP 4 — Setup React Frontend

```bash
# 1. Go to frontend folder
cd sindh-agri-system/frontend

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Open .env and paste:
#    - REACT_APP_SUPABASE_URL
#    - REACT_APP_SUPABASE_ANON_KEY
#    - REACT_APP_API_BASE=http://localhost:8000

# 5. Start React app
npm start

# ✅ App running at: http://localhost:3000
```

---

### STEP 5 — Enable Google Earth Engine (Optional for Demo)

1. Register at **https://earthengine.google.com** (use NGO/Research reason)
2. Approval takes 1-3 days
3. Once approved:
   ```bash
   pip install earthengine-api
   earthengine authenticate
   ```
4. In `backend/main.py`, find the `simulate_gee_analysis` function
5. Uncomment the real GEE code block (marked with comments)
6. The system will then pull **real Sentinel-2 NDVI data**

---

### STEP 6 — Deploy for Minister Demo (Free)

#### Deploy Backend to Railway.app (Free)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
cd backend
railway init
railway up

# 3. Set environment variables in Railway dashboard
# Copy all keys from .env to Railway → Variables tab

# ✅ Backend live at: https://your-app.railway.app
```

#### Deploy Frontend to Vercel (Free)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd frontend
vercel

# 3. Set environment variables in Vercel dashboard
# ✅ Frontend live at: https://your-app.vercel.app
```

#### Create QR Code for Minister
1. Go to **https://qr-code-generator.com**
2. Paste your Vercel URL
3. Download QR code image
4. Add to your PowerPoint presentation slide

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/scan/disease` | Upload image → AI disease diagnosis |
| `POST` | `/api/v1/satellite/analyze` | Farm polygon → NDVI + moisture analysis |
| `POST` | `/api/v1/yield/predict` | Input params → ML yield prediction |
| `POST` | `/api/v1/voice/chat` | Text message → Sindhi/Urdu AI reply |
| `GET` | `/api/v1/weather/{city}` | Live weather for Sindh city |
| `GET` | `/api/v1/agronomy/{crop}` | Full crop data with treatments |
| `GET` | `/api/v1/health` | Server health check |

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `profiles` | Farmer/officer user accounts with roles |
| `farms` | Farm land parcels with GeoJSON polygons |
| `crop_seasons` | Active plantings per farm |
| `disease_scans` | AI diagnosis results with images |
| `satellite_analyses` | NDVI/moisture snapshots per farm |
| `alerts` | Smart notifications for farmers |
| `voice_sessions` | Voice bot conversation logs |
| `govt_advisories` | Government broadcast messages |
| `yield_predictions` | ML yield forecast history |

---

## 🌿 Supported Crops & Diseases

### Wheat (گندم / ڪڻڪ)
- Yellow Rust → Propiconazole 25% EC (Tilt)
- Loose Smut → Vitavax 200 seed treatment
- Aphid → Imidacloprid 200SL (Confidor)

### Cotton (کپاس / ڪپهه)
- Leaf Curl Virus → Imidacloprid + Acetamiprid rotation
- Pink Bollworm → Emamectin Benzoate (Proclaim)
- Bacterial Blight → Copper Oxychloride (Kocide)

### Sugarcane (گنا / ڪمرڪ)
- Red Rot → Carbendazim 50WP (Bavistin) seed soak
- Smut → Hot water treatment 52°C + Vitavax
- Stem Borer → Carbofuran 3G + Trichogramma bio-control

### Rice (چاول / چانور)
- Blast → Tricyclazole 75WP (Beam)
- Brown Plant Hopper → Buprofezin 25WP (Applaud)

---

## 🎯 Minister Demo Script

**Opening (Sindhi):**
> "محترم وزير صاحب، هي سسٽم سنڌ جي هر هاري کي سمارٽ فون ذريعي زرعي ماهر جي صلاح ڏئي سگهي ٿو."

**Key talking points:**
1. **"Upload karo, jawab pao"** — Show disease scan with real image
2. **"Apni zameen satellite se dekho"** — Show NDVI map of a Sindh field
3. **"Pani ki bachat 30%"** — Soil moisture prevents over-irrigation
4. **"Urdu aur Sindhi mein bolta hai"** — Demo voice bot live
5. **"Koi cost nahi"** — Free tier handles 500 farmers/month

---

## 🛠️ Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Web | React 18 + Leaflet.js | Dashboard UI |
| Frontend Mobile | React Native / Expo | Farmer mobile app |
| Backend API | Python FastAPI | AI endpoints |
| Database | Supabase PostgreSQL | All data storage |
| Auth | Supabase Auth | Farmer/officer login |
| AI Vision | Claude claude-sonnet-4-20250514 | Disease detection |
| AI Voice Bot | Claude claude-sonnet-4-20250514 | Sindhi/Urdu assistant |
| Satellite | Google Earth Engine | NDVI, moisture |
| Weather | OpenWeatherMap | Live weather |
| Hosting | Vercel + Railway | Free deployment |

---

## 📞 Support

For technical issues during demo setup, check:
- Supabase logs: Dashboard → Logs → API
- FastAPI logs: Terminal where `uvicorn` is running
- React errors: Browser Console (F12)
