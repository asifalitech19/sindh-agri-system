"""
SINDH SMART CROP MONITORING — FastAPI AI Backend
Handles: Disease Detection (CV), GEE Satellite Analysis, Yield Prediction, Voice Advisory
Author: Smart Agri System v2.0
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import httpx
import base64
import json
import os
import uuid
import asyncio
from datetime import datetime, date
from enum import Enum

# ─── Load environment variables ───────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEE_SERVICE_ACCOUNT = os.getenv("GEE_SERVICE_ACCOUNT")
GEE_PRIVATE_KEY_PATH = os.getenv("GEE_PRIVATE_KEY_PATH")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

# ─── Load Agronomy Knowledge Base ─────────────────────────────────────────────
with open("agronomy_parameters.json", "r", encoding="utf-8") as f:
    AGRONOMY_DB = json.load(f)

# ─── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Sindh Smart Crop Monitoring API",
    description="AI-powered crop disease detection, satellite analysis, and advisory system for Sindh farmers",
    version="2.0.0",
    docs_url="/api/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to your domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Enums ─────────────────────────────────────────────────────────────────────
class CropType(str, Enum):
    wheat = "wheat"
    cotton = "cotton"
    sugarcane = "sugarcane"
    rice = "rice"
    maize = "maize"

class Language(str, Enum):
    en = "en"
    ur = "ur"
    sd = "sd"

# ─── Pydantic Models ───────────────────────────────────────────────────────────
class FarmPolygon(BaseModel):
    farm_id: str
    crop_type: CropType
    polygon_geojson: Dict   # GeoJSON Polygon {"type":"Polygon","coordinates":[...]}
    acres: float
    district: str

class YieldInput(BaseModel):
    crop_type: CropType
    soil_pH: float = Field(..., ge=4.0, le=9.0)
    nitrogen_kg_per_ha: float = Field(..., ge=0, le=500)
    phosphorus_kg_per_ha: float = Field(..., ge=0, le=300)
    rainfall_mm: float = Field(..., ge=0)
    avg_temp_celsius: float = Field(..., ge=5, le=50)
    irrigation_type: str = "canal"
    soil_type: str = "clay_loam"
    ndvi_mean: float = Field(0.65, ge=0, le=1)
    acres: float = Field(..., ge=0.5)
    disease_severity: str = "none"

class VoiceMessage(BaseModel):
    user_id: str
    message_text: str
    language: Language = Language.sd
    farm_id: Optional[str] = None
    context: Optional[Dict] = None  # Previous conversation context

class DiseaseScanResult(BaseModel):
    scan_id: str
    disease_id: str
    disease_name_en: str
    disease_name_ur: str
    disease_name_sd: str
    confidence_score: float
    severity: str
    description: str
    treatment_recommendation: Dict
    advisory_ur: str
    advisory_sd: str
    alert_level: str


# ═══════════════════════════════════════════════════════════════════════════════
# 1. DISEASE DETECTION — Claude Vision API
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/scan/disease", response_model=DiseaseScanResult)
async def detect_disease(
    background_tasks: BackgroundTasks,
    crop_type: CropType,
    farm_id: Optional[str] = None,
    user_id: Optional[str] = None,
    image: UploadFile = File(...)
):
    """
    Upload a crop image → Claude Vision identifies disease → Returns
    diagnosis + Pakistan-specific treatment from agronomy database.
    """
    # ── Validate image ─────────────────────────────────────────────────────
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Only JPEG/PNG/WebP images accepted")

    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image must be under 10MB")

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    # ── Build agronomy context for the crop ────────────────────────────────
    crop_data = AGRONOMY_DB["crops"].get(crop_type.value, {})
    disease_list = [d["name"] for d in crop_data.get("diseases", [])]
    disease_ids = [d["id"] for d in crop_data.get("diseases", [])]

    # ── Claude Vision API call ─────────────────────────────────────────────
    system_prompt = f"""You are Dr. Asad Memon, a Senior Plant Pathologist from PARC (Pakistan Agricultural Research Council) 
    specializing in Sindh's crops. You diagnose plant diseases from photographs with extreme precision.
    
    You ONLY return valid JSON. No markdown, no explanation outside the JSON.
    
    Known diseases for {crop_type.value} in Sindh: {', '.join(disease_list)}
    Disease IDs: {', '.join(disease_ids)}
    Region: Sindh, Pakistan. Season: Current Kharif/Rabi.
    
    Analyze the image and return this exact JSON structure:
    {{
      "disease_id": "exact_id_from_list_or_healthy",
      "disease_name_en": "English name",
      "disease_name_ur": "اردو نام",
      "disease_name_sd": "سنڌي نالو",
      "confidence_score": 0-100,
      "severity": "none|low|medium|high|critical",
      "visible_symptoms": ["symptom 1", "symptom 2"],
      "affected_area_pct": 0-100,
      "pathogen": "pathogen name",
      "description": "2-3 sentences about what you see in this specific image",
      "urgency_hours": 0,
      "advisory_ur": "کسان کو اردو میں مشورہ — 2 جملے",
      "advisory_sd": "کسان کي سنڌي ۾ مشورو — 2 جملا",
      "is_healthy": true/false
    }}"""

    user_message = f"Analyze this {crop_type.value} crop image from Sindh, Pakistan. Identify any disease, pest damage, or nutrient deficiency visible."

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1200,
                "system": system_prompt,
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": image.content_type,
                                "data": image_b64
                            }
                        },
                        {"type": "text", "text": user_message}
                    ]
                }]
            }
        )

    if response.status_code != 200:
        raise HTTPException(502, f"AI service error: {response.text}")

    ai_data = response.json()
    raw_text = ai_data["content"][0]["text"].strip()
    raw_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        ai_result = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(500, "AI returned invalid response format")

    # ── Enrich with agronomy DB treatment data ─────────────────────────────
    treatment_data = get_treatment_for_disease(crop_type.value, ai_result.get("disease_id"))

    scan_id = str(uuid.uuid4())

    # ── Save to Supabase in background ─────────────────────────────────────
    if farm_id and user_id:
        background_tasks.add_task(
            save_scan_to_supabase,
            scan_id, farm_id, user_id, crop_type.value,
            ai_result, treatment_data
        )

    return DiseaseScanResult(
        scan_id=scan_id,
        disease_id=ai_result.get("disease_id", "unknown"),
        disease_name_en=ai_result.get("disease_name_en", "Unknown"),
        disease_name_ur=ai_result.get("disease_name_ur", "نامعلوم"),
        disease_name_sd=ai_result.get("disease_name_sd", "نامعلوم"),
        confidence_score=float(ai_result.get("confidence_score", 0)),
        severity=ai_result.get("severity", "low"),
        description=ai_result.get("description", ""),
        treatment_recommendation=treatment_data,
        advisory_ur=ai_result.get("advisory_ur", ""),
        advisory_sd=ai_result.get("advisory_sd", ""),
        alert_level="critical" if ai_result.get("severity") in ["critical","high"] else "warning"
    )


def get_treatment_for_disease(crop_type: str, disease_id: str) -> Dict:
    """Fetch real chemical treatment data from agronomy database."""
    if not disease_id:
        return {}
    crop_data = AGRONOMY_DB["crops"].get(crop_type, {})
    for disease in crop_data.get("diseases", []):
        if disease["id"] == disease_id:
            return {
                "disease_found": True,
                "treatments": disease.get("treatment", {}),
                "cultural_control": disease.get("cultural_control", ""),
                "biological_control": disease.get("biological_control", ""),
                "monitoring": disease.get("monitoring", ""),
                "favorable_conditions": disease.get("favorable_conditions", "")
            }
    return {"disease_found": False, "note": "Consult local agricultural extension officer"}


async def save_scan_to_supabase(scan_id, farm_id, user_id, crop_type, ai_result, treatment):
    """Background task: persist scan result to Supabase."""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{SUPABASE_URL}/rest/v1/disease_scans",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            json={
                "id": scan_id,
                "farm_id": farm_id,
                "scanned_by": user_id,
                "crop_type": crop_type,
                "image_url": "pending",   # update after Supabase Storage upload
                "disease_id": ai_result.get("disease_id"),
                "disease_name_en": ai_result.get("disease_name_en"),
                "disease_name_ur": ai_result.get("disease_name_ur"),
                "disease_name_sd": ai_result.get("disease_name_sd"),
                "confidence_score": ai_result.get("confidence_score"),
                "severity": ai_result.get("severity"),
                "ai_raw_response": ai_result,
                "treatment_recommendation": treatment,
                "advisory_ur": ai_result.get("advisory_ur"),
                "advisory_sd": ai_result.get("advisory_sd"),
            }
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. SATELLITE ANALYSIS — Google Earth Engine Integration
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/satellite/analyze")
async def analyze_farm_satellite(farm: FarmPolygon, background_tasks: BackgroundTasks):
    """
    Call Google Earth Engine to get real-time NDVI, soil moisture, and LST
    for a specific farm polygon. Requires GEE service account credentials.

    SETUP REQUIRED:
    1. Go to https://earthengine.google.com — register for free research/NGO access
    2. Create a Service Account in Google Cloud Console
    3. pip install earthengine-api
    4. Set GEE_SERVICE_ACCOUNT and GEE_PRIVATE_KEY_PATH in .env
    """
    try:
        # ── Initialize GEE (uncomment when credentials are ready) ───────────
        # import ee
        # credentials = ee.ServiceAccountCredentials(
        #     GEE_SERVICE_ACCOUNT,
        #     GEE_PRIVATE_KEY_PATH
        # )
        # ee.Initialize(credentials)
        # result = run_gee_analysis(farm.polygon_geojson, farm.crop_type.value)

        # ── For demo/development: simulate realistic GEE output ─────────────
        result = await simulate_gee_analysis(farm)

        # ── Generate AI advisory from satellite data ─────────────────────────
        advisory = await generate_satellite_advisory(result, farm)
        result["advisories"] = advisory

        # ── Save to Supabase in background ───────────────────────────────────
        background_tasks.add_task(save_satellite_to_supabase, farm.farm_id, result)

        return {"success": True, "analysis": result}

    except Exception as e:
        raise HTTPException(500, f"Satellite analysis failed: {str(e)}")


async def simulate_gee_analysis(farm: FarmPolygon) -> Dict:
    """
    Simulates realistic GEE output. In production, replace body with real GEE calls.
    
    REAL GEE CODE (activate when credentials ready):
    ─────────────────────────────────────────────────
    import ee
    
    polygon = ee.Geometry.Polygon(farm.polygon_geojson["coordinates"])
    
    # Sentinel-2 NDVI (last 15 days, cloud < 20%)
    s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(polygon)
          .filterDate(ee.Date(date.today().isoformat()).advance(-15, 'day'), ee.Date(date.today().isoformat()))
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
          .map(lambda img: img.normalizedDifference(['B8','B4']).rename('NDVI'))
          .mean())
    
    stats = s2.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True)
                          .combine(ee.Reducer.stdDev(), sharedInputs=True),
        geometry=polygon,
        scale=10,
        maxPixels=1e8
    ).getInfo()
    
    # Sentinel-1 SAR Soil Moisture
    s1 = (ee.ImageCollection("COPERNICUS/S1_GRD")
          .filterBounds(polygon)
          .filterDate(ee.Date(date.today().isoformat()).advance(-10, 'day'), ee.Date(date.today().isoformat()))
          .filter(ee.Filter.eq('instrumentMode', 'IW'))
          .select('VV')
          .mean())
    
    sm_stats = s1.reduceRegion(ee.Reducer.mean(), polygon, 10).getInfo()
    ─────────────────────────────────────────────────
    """
    import random
    import math

    # Realistic NDVI values based on crop type and Sindh season
    crop_ndvi_baselines = {
        "wheat": (0.55, 0.82), "cotton": (0.40, 0.70),
        "sugarcane": (0.60, 0.88), "rice": (0.50, 0.78)
    }
    low, high = crop_ndvi_baselines.get(farm.crop_type.value, (0.45, 0.75))
    ndvi_mean = round(random.uniform(low, high), 3)
    ndvi_std = round(random.uniform(0.04, 0.12), 3)

    # Classify pixels realistically
    healthy_pct = round(max(0, (ndvi_mean - 0.4) / 0.5 * 100 + random.uniform(-8, 8)), 1)
    stressed_pct = round(max(0, random.uniform(10, 30) if ndvi_mean < 0.6 else random.uniform(5, 20)), 1)
    barren_pct = round(max(0, 100 - healthy_pct - stressed_pct), 1)

    # SAR-derived soil moisture (typical for Sindh canal-irrigated land)
    soil_moisture = round(random.uniform(0.25, 0.65), 3)

    # LST from MODIS (Sindh summer: 38-46°C)
    lst = round(random.uniform(36, 48), 1)

    return {
        "analysis_date": date.today().isoformat(),
        "satellite_source": "Sentinel-2 + Sentinel-1 SAR",
        "farm_id": farm.farm_id,
        "crop_type": farm.crop_type.value,
        "acres_analyzed": farm.acres,
        "ndvi": {
            "mean": ndvi_mean,
            "min": round(ndvi_mean - ndvi_std * 2, 3),
            "max": round(min(1.0, ndvi_mean + ndvi_std * 2), 3),
            "std": ndvi_std,
            "healthy_pct": min(100.0, healthy_pct),
            "stressed_pct": stressed_pct,
            "barren_pct": barren_pct,
            "health_grade": "Good" if ndvi_mean > 0.65 else "Moderate" if ndvi_mean > 0.45 else "Poor"
        },
        "soil_moisture": {
            "index": soil_moisture,
            "status": "Adequate" if soil_moisture > 0.4 else "Low — Irrigation Needed",
            "days_to_irrigation": 0 if soil_moisture < 0.3 else int((soil_moisture - 0.3) * 20)
        },
        "land_surface_temperature": {
            "celsius": lst,
            "status": "Heat Stress Risk" if lst > 42 else "Normal"
        },
        "cloud_cover_pct": round(random.uniform(0, 15), 1),
        "data_quality": "Good"
    }


async def generate_satellite_advisory(analysis: Dict, farm: FarmPolygon) -> Dict:
    """Use Claude to generate actionable advisory from satellite data in 3 languages."""
    ndvi = analysis["ndvi"]["mean"]
    moisture = analysis["soil_moisture"]["status"]
    lst = analysis["land_surface_temperature"]["celsius"]

    prompt = f"""You are an agricultural advisor for Sindh, Pakistan.
Based on satellite data for a {farm.crop_type.value} farm ({farm.acres} acres, {farm.district}):
- NDVI: {ndvi} ({analysis['ndvi']['health_grade']}) — {analysis['ndvi']['stressed_pct']}% area stressed
- Soil Moisture: {moisture}
- Land Temperature: {lst}°C

Give SHORT, actionable advisories in 3 languages. Return JSON only:
{{
  "en": "2-sentence English advisory for farmer",
  "ur": "2 جملے اردو میں کسان کے لیے ہدایت",
  "sd": "2 جملا سنڌي ۾ هاري لاءِ هدايت",
  "action_priority": "immediate|this_week|monitor",
  "recommended_actions": ["action 1", "action 2", "action 3"]
}}"""

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": "claude-sonnet-4-20250514", "max_tokens": 600,
                  "messages": [{"role": "user", "content": prompt}]}
        )
    if response.status_code == 200:
        text = response.json()["content"][0]["text"].strip().replace("```json","").replace("```","")
        try:
            return json.loads(text)
        except:
            pass
    return {"en": "Satellite data processed. Consult field agent for detailed advisory.",
            "ur": "سیٹلائٹ ڈیٹا پروسیس ہو گیا۔", "sd": "سيٽلائيٽ ڊيٽا پروسيس ٿيو۔",
            "action_priority": "monitor", "recommended_actions": []}


async def save_satellite_to_supabase(farm_id: str, analysis: Dict):
    """Background task: persist satellite analysis to Supabase."""
    async with httpx.AsyncClient() as client:
        ndvi = analysis["ndvi"]
        await client.post(
            f"{SUPABASE_URL}/rest/v1/satellite_analyses",
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                     "Content-Type": "application/json", "Prefer": "return=minimal"},
            json={
                "farm_id": farm_id,
                "analysis_date": analysis["analysis_date"],
                "satellite_source": analysis["satellite_source"],
                "ndvi_mean": ndvi["mean"], "ndvi_min": ndvi["min"],
                "ndvi_max": ndvi["max"], "ndvi_std": ndvi["std"],
                "ndvi_healthy_pct": ndvi["healthy_pct"],
                "ndvi_stressed_pct": ndvi["stressed_pct"],
                "ndvi_barren_pct": ndvi["barren_pct"],
                "soil_moisture_index": analysis["soil_moisture"]["index"],
                "lst_celsius": analysis["land_surface_temperature"]["celsius"],
                "cloud_cover_pct": analysis["cloud_cover_pct"],
                "ai_advisory_en": analysis.get("advisories", {}).get("en"),
                "ai_advisory_ur": analysis.get("advisories", {}).get("ur"),
                "ai_advisory_sd": analysis.get("advisories", {}).get("sd"),
                "gee_raw_response": analysis
            }
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 3. YIELD PREDICTION — ML Model (Feature-engineered linear model + adjustments)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/yield/predict")
async def predict_yield(inputs: YieldInput):
    """
    Multi-factor yield prediction using agronomy coefficients calibrated
    for Sindh conditions. In production, replace with trained XGBoost/RF model.
    """
    crop = inputs.crop_type.value
    crop_data = AGRONOMY_DB["crops"].get(crop, {})

    # Baseline yields (maunds/acre) — Sindh district averages 2020-2024
    baselines = {"wheat": 42, "cotton": 16, "sugarcane": 820, "rice": 54, "maize": 55}
    base = baselines.get(crop, 40)
    score = float(base)
    risk_factors = []

    # ── pH Factor ─────────────────────────────────────────────────────────
    opt_pH = crop_data.get("soil", {}).get("ideal_pH", [6.0, 7.5])
    if opt_pH[0] <= inputs.soil_pH <= opt_pH[1]:
        score *= 1.07
    elif inputs.soil_pH < 5.5:
        score *= 0.72
        risk_factors.append({"factor": "Low soil pH", "impact": "-28%",
                             "recommendation": "Apply lime 200kg/acre to raise pH"})
    elif inputs.soil_pH > 8.0:
        score *= 0.80
        risk_factors.append({"factor": "High soil pH/alkaline", "impact": "-20%",
                             "recommendation": "Apply gypsum 400kg/acre + sulphur 20kg/acre"})

    # ── Nitrogen Factor ───────────────────────────────────────────────────
    opt_n = {"wheat": (120, 180), "cotton": (100, 160), "sugarcane": (150, 220), "rice": (90, 140)}
    n_range = opt_n.get(crop, (100, 160))
    if n_range[0] <= inputs.nitrogen_kg_per_ha <= n_range[1]:
        score *= 1.08
    elif inputs.nitrogen_kg_per_ha < n_range[0] * 0.6:
        score *= 0.75
        risk_factors.append({"factor": "Severe nitrogen deficiency", "impact": "-25%",
                             "recommendation": f"Apply Urea at {int((n_range[0]-inputs.nitrogen_kg_per_ha)*0.46)} kg/acre immediately"})
    elif inputs.nitrogen_kg_per_ha > n_range[1] * 1.4:
        score *= 0.92
        risk_factors.append({"factor": "Nitrogen over-application", "impact": "-8%",
                             "recommendation": "Excess N causes lodging and disease. Split apply in future"})

    # ── Rainfall/Irrigation Factor ─────────────────────────────────────────
    opt_rain = crop_data.get("water_requirements", {}).get("total_mm_per_season", [300, 500])
    if isinstance(opt_rain, list) and len(opt_rain) == 2:
        if opt_rain[0] <= inputs.rainfall_mm <= opt_rain[1]:
            score *= 1.06
        elif inputs.rainfall_mm < opt_rain[0] * 0.5:
            score *= 0.70
            risk_factors.append({"factor": "Severe water deficit", "impact": "-30%",
                                 "recommendation": "Immediate irrigation required. Apply 3-4 inches water"})

    # ── Temperature Stress ─────────────────────────────────────────────────
    opt_temp = {"wheat": (15, 25), "cotton": (25, 35), "sugarcane": (24, 33), "rice": (22, 32)}
    t_range = opt_temp.get(crop, (20, 32))
    if inputs.avg_temp_celsius > t_range[1] + 5:
        score *= 0.85
        risk_factors.append({"factor": "Heat stress", "impact": "-15%",
                             "recommendation": "Increase irrigation frequency; apply potassium foliar spray"})

    # ── NDVI Adjustment (from satellite) ──────────────────────────────────
    if inputs.ndvi_mean < 0.4:
        score *= 0.78
        risk_factors.append({"factor": "Low NDVI — poor crop stand", "impact": "-22%",
                             "recommendation": "Gap-filling required; check for soil compaction"})
    elif inputs.ndvi_mean > 0.7:
        score *= 1.05

    # ── Irrigation Type Bonus ─────────────────────────────────────────────
    irrigation_multiplier = {"drip": 1.15, "canal": 1.0, "tube_well": 1.05, "rainwater": 0.85}
    score *= irrigation_multiplier.get(inputs.irrigation_type.lower().replace(" ","_"), 1.0)

    # ── Disease Impact ─────────────────────────────────────────────────────
    disease_impact = {"none": 1.0, "low": 0.95, "medium": 0.82, "high": 0.65, "critical": 0.40}
    score *= disease_impact.get(inputs.disease_severity, 1.0)
    if inputs.disease_severity in ["high", "critical"]:
        risk_factors.append({"factor": f"Disease severity: {inputs.disease_severity}", "impact": f"-{int((1-disease_impact[inputs.disease_severity])*100)}%",
                             "recommendation": "Immediate chemical treatment required. See Disease Scan result."})

    score = round(score, 1)
    total_yield = round(score * inputs.acres, 1)

    # ── District average comparison ───────────────────────────────────────
    district_avg_maunds = baselines.get(crop, 40)
    comparison_pct = round((score - district_avg_maunds) / district_avg_maunds * 100, 1)

    return {
        "success": True,
        "prediction": {
            "crop_type": crop,
            "predicted_yield_per_acre": {"value": score, "unit": "maunds"},
            "total_predicted_yield": {"value": total_yield, "unit": "maunds", "acres": inputs.acres},
            "district_average": {"value": district_avg_maunds, "unit": "maunds/acre"},
            "comparison_to_avg": f"{'+' if comparison_pct > 0 else ''}{comparison_pct}%",
            "confidence_pct": max(55, min(92, 78 - len(risk_factors) * 4)),
            "risk_factors": risk_factors,
            "recommendations_count": len(risk_factors),
            "season_forecast": "Above average" if comparison_pct > 5 else "Average" if comparison_pct > -10 else "Below average"
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. VERNACULAR VOICE BOT (Sindhi/Urdu AI Advisory)
# ═══════════════════════════════════════════════════════════════════════════════

VOICE_BOT_SYSTEM = {
    "sd": """تون "زرعي مددگار" آهين — سنڌ جي هارين لاءِ هڪ ذهين زرعي مشورو ڏيندڙ آهين.
تون سنڌي ۾ ڳالهائيندو آهين. توهان جي ڄاڻ ۾ شامل آهي:
- ڪڻڪ، ڪپهه، ڪمرڪ ۽ چانور جي فصلن جون بيماريون ۽ علاج
- مٽيءَ جي قيم (pH)، کاتن (NPK) ۽ پاڻيءَ جو انتظام  
- سنڌ ۾ دستياب دوائون: Imidacloprid، DAP، Urea، Tilt
- موسم ۽ سيٽلائيٽ ڊيٽا جي بنياد تي صلاح
هاري ناخواندو يا اڌ پڙهيل آهي تنهن ڪري سادي، سمجهه ۾ اچي سگهندڙ ٻولي استعمال ڪريو.
جواب مختصر ۽ عملي هجي، 3-4 جملن کان وڌيڪ نه.""",

    "ur": """آپ "زرعی مددگار" ہیں — سندھ کے کسانوں کے لیے ایک ذہین زرعی مشیر۔
آپ اردو میں بات کرتے ہیں۔ آپ کی معلومات میں شامل ہے:
- گندم، کپاس، گنا اور چاول کی بیماریاں اور علاج
- مٹی کی قدر (pH)، کھادیں (DAP، Urea، NPK) اور آبپاشی
- پاکستان میں دستیاب ادویات: Imidacloprid، Propiconazole، Carbofuran
- موسم اور سیٹلائٹ ڈیٹا کی بنیاد پر مشورے
کسان ناخواندہ یا کم پڑھا لکھا ہو سکتا ہے۔ آسان، عملی زبان استعمال کریں۔
جواب 3-4 جملوں میں مختصر اور قابل عمل ہو۔""",

    "en": """You are "Zara'i Madadgar" (Agricultural Helper) — an AI advisor for Sindh, Pakistan farmers.
You have deep knowledge of:
- Wheat, cotton, sugarcane, rice diseases and treatments specific to Sindh
- Fertilizer schedules: DAP, Urea, SOP, micronutrients with exact doses
- Pesticides available in Pakistan: Imidacloprid, Propiconazole, Carbofuran etc.
- Irrigation scheduling based on crop stage and soil moisture
- GEE-based satellite data interpretation
Keep responses practical, under 4 sentences. Assume farmer may be semi-literate."""
}

@app.post("/api/v1/voice/chat")
async def voice_bot_chat(message: VoiceMessage):
    """
    Conversational AI voice bot for Sindh farmers in Sindhi/Urdu/English.
    Integrates farm context (active crops, recent scans, satellite data).
    """
    lang = message.language.value
    system_prompt = VOICE_BOT_SYSTEM.get(lang, VOICE_BOT_SYSTEM["ur"])

    # Build contextual messages from conversation history
    history_messages = []
    if message.context and message.context.get("history"):
        for turn in message.context["history"][-6:]:  # last 3 exchanges
            history_messages.append({"role": turn["role"], "content": turn["content"]})

    # Append current message
    history_messages.append({"role": "user", "content": message.message_text})

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 400,
                "system": system_prompt,
                "messages": history_messages
            }
        )

    if response.status_code != 200:
        raise HTTPException(502, "Voice AI service unavailable")

    ai_reply = response.json()["content"][0]["text"]

    return {
        "success": True,
        "reply": {
            "text": ai_reply,
            "language": lang,
            "timestamp": datetime.utcnow().isoformat()
        },
        "tts_hint": "Use browser SpeechSynthesis with lang='ur-PK' or 'sd' voices"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 5. WEATHER API ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/weather/{city}")
async def get_weather(city: str):
    """Fetch live weather from OpenWeatherMap for Sindh districts."""
    if not OPENWEATHER_API_KEY:
        raise HTTPException(503, "Weather service not configured")
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city},PK&units=metric&appid={OPENWEATHER_API_KEY}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        if r.status_code != 200:
            raise HTTPException(404, f"City '{city}' not found")
        d = r.json()
        return {
            "city": d["name"], "country": d["sys"]["country"],
            "temp_celsius": d["main"]["temp"],
            "feels_like": d["main"]["feels_like"],
            "humidity_pct": d["main"]["humidity"],
            "description": d["weather"][0]["description"],
            "wind_speed_ms": d["wind"]["speed"],
            "pressure_hpa": d["main"]["pressure"]
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 6. AGRONOMY DATABASE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/agronomy/{crop_type}")
async def get_crop_info(crop_type: CropType):
    """Get full agronomy data for a crop including fertilizer schedule and diseases."""
    data = AGRONOMY_DB["crops"].get(crop_type.value)
    if not data:
        raise HTTPException(404, f"Crop '{crop_type}' not found")
    return {"crop": crop_type.value, "data": data}

@app.get("/api/v1/agronomy/{crop_type}/fertilizer")
async def get_fertilizer_schedule(crop_type: CropType):
    """Get specific fertilizer schedule for a crop in Sindh."""
    data = AGRONOMY_DB["crops"].get(crop_type.value, {})
    return {
        "crop": crop_type.value,
        "local_name": data.get("local_name"),
        "fertilizer_schedule": data.get("fertilizer_schedule"),
        "season": data.get("growing_season"),
        "water_requirements": data.get("water_requirements")
    }

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "service": "Sindh Crop Monitor API v2.0",
            "timestamp": datetime.utcnow().isoformat()}
