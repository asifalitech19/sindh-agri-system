/**
 * SINDH SMART CROP MONITORING — React Dashboard + Voice Bot
 * Single-file implementation for rapid demo deployment
 * Stack: React 18, Supabase JS v2, Leaflet.js, Web Speech API
 */

// ─── Install: npm install @supabase/supabase-js ──────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Environment Configuration ───────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Translation Strings ─────────────────────────────────────────────────────
const I18N = {
  en: {
    appName: "Smart Crop Monitor",
    appSub: "Agriculture Intelligence — Sindh",
    dashboard: "Dashboard",
    diseaseScan: "Disease Scan",
    satellite: "Satellite",
    yieldPredict: "Yield",
    voiceBot: "Voice AI",
    alerts: "Alerts",
    scanNow: "Scan Crop",
    analyzeSatellite: "Analyze Field",
    predictYield: "Predict Yield",
    talkToBot: "Talk to AI",
    uploadImage: "Upload crop image",
    analyzing: "AI analyzing...",
    ndviScore: "NDVI Score",
    soilMoisture: "Soil Moisture",
    cropHealth: "Crop Health",
    temperature: "Temperature",
    voicePlaceholder: "Ask me about your crops...",
    speak: "🎤 Speak",
    send: "Send",
    selectCrop: "Select Crop",
    selectFarm: "Select Farm",
    runAnalysis: "Run Analysis",
    downloadReport: "Download Report",
    noAlerts: "No active alerts",
    criticalAlert: "Critical Alert",
    warningAlert: "Warning",
  },
  ur: {
    appName: "سمارٹ فصل نگران",
    appSub: "زرعی ذہانت — سندھ",
    dashboard: "ڈیش بورڈ",
    diseaseScan: "بیماری اسکین",
    satellite: "سیٹلائٹ",
    yieldPredict: "پیداوار",
    voiceBot: "آواز AI",
    alerts: "الرٹس",
    scanNow: "فصل اسکین کریں",
    analyzeSatellite: "کھیت تجزیہ",
    predictYield: "پیداوار اندازہ",
    talkToBot: "AI سے بات کریں",
    uploadImage: "فصل کی تصویر اپ لوڈ کریں",
    analyzing: "AI تجزیہ کر رہا ہے...",
    ndviScore: "NDVI سکور",
    soilMoisture: "مٹی نمی",
    cropHealth: "فصل صحت",
    temperature: "درجہ حرارت",
    voicePlaceholder: "اپنی فصل کے بارے میں پوچھیں...",
    speak: "🎤 بولیں",
    send: "بھیجیں",
    selectCrop: "فصل منتخب کریں",
    selectFarm: "کھیت منتخب کریں",
    runAnalysis: "تجزیہ چلائیں",
    downloadReport: "رپورٹ ڈاؤن لوڈ",
    noAlerts: "کوئی الرٹ نہیں",
    criticalAlert: "فوری الرٹ",
    warningAlert: "انتباہ",
  },
  sd: {
    appName: "سمارٽ فصل نگران",
    appSub: "زرعي ذهانت — سنڌ",
    dashboard: "ڊيش بورڊ",
    diseaseScan: "بيماري اسڪين",
    satellite: "سيٽلائيٽ",
    yieldPredict: "پيداوار",
    voiceBot: "آواز AI",
    alerts: "الرٽس",
    scanNow: "فصل اسڪين ڪريو",
    analyzeSatellite: "کيت تجزيو",
    predictYield: "پيداوار اندازو",
    talkToBot: "AI سان ڳالهايو",
    uploadImage: "فصل جي تصوير اپلوڊ ڪريو",
    analyzing: "AI تجزيو ڪري رهيو آهي...",
    ndviScore: "NDVI اسڪور",
    soilMoisture: "مٽي نمي",
    cropHealth: "فصل صحت",
    temperature: "گرمائش",
    voicePlaceholder: "پنهنجي فصل بابت پڇو...",
    speak: "🎤 ڳالهايو",
    send: "موڪليو",
    selectCrop: "فصل چونڊيو",
    selectFarm: "کيت چونڊيو",
    runAnalysis: "تجزيو هلايو",
    downloadReport: "رپورٽ ڊائونلوڊ",
    noAlerts: "ڪو الرٽ ناهي",
    criticalAlert: "فوري الرٽ",
    warningAlert: "خبردار",
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  app: { fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh" },
  header: { background: "linear-gradient(135deg,#052e16,#14532d,#166534)", color: "#fff", position: "sticky", top: 0, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,.3)" },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", flexWrap: "wrap", gap: 8 },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { width: 38, height: 38, background: "rgba(255,255,255,.15)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  navTabs: { display: "flex", background: "rgba(0,0,0,.2)", overflowX: "auto" },
  navTab: (active) => ({ padding: "9px 16px", color: active ? "#fff" : "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 11, letterSpacing: ".6px", borderBottom: active ? "2px solid #4ade80" : "2px solid transparent", background: active ? "rgba(255,255,255,.08)" : "none", border: "none", borderTop: "none", borderLeft: "none", borderRight: "none", textTransform: "uppercase", fontFamily: "inherit", borderBottomStyle: "solid", borderBottomWidth: 2, borderBottomColor: active ? "#4ade80" : "transparent", whiteSpace: "nowrap" }),
  content: { padding: 16, maxWidth: 1100, margin: "0 auto" },
  card: { background: "#fff", borderRadius: 10, padding: 15, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 14 },
  cardTitle: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 10 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  metricValue: { fontSize: 30, fontWeight: 800, color: "#1e293b", lineHeight: 1 },
  metricLabel: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  btn: (variant) => ({ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, background: variant === "primary" ? "#16a34a" : variant === "danger" ? "#dc2626" : "#f1f5f9", color: variant === "primary" ? "#fff" : variant === "danger" ? "#fff" : "#334155" }),
  uploadZone: (hasFile) => ({ border: `2px dashed ${hasFile ? "#16a34a" : "#cbd5e1"}`, borderRadius: 10, padding: 28, textAlign: "center", cursor: "pointer", background: hasFile ? "#f0fdf4" : "#f8fafc" }),
  badge: (type) => ({ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: type === "green" ? "#dcfce7" : type === "red" ? "#fee2e2" : type === "amber" ? "#fef3c7" : "#dbeafe", color: type === "green" ? "#15803d" : type === "red" ? "#991b1b" : type === "amber" ? "#92400e" : "#1e40af" }),
  voiceInput: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  msgBubble: (isUser) => ({ padding: "10px 14px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isUser ? "#15803d" : "#f1f5f9", color: isUser ? "#fff" : "#334155", maxWidth: "85%", marginLeft: isUser ? "auto" : 0, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }),
  progressBar: { height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", flex: 1 },
  progressFill: (pct, color) => ({ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width .8s" }),
  langBtn: (active) => ({ padding: "4px 11px", border: `1px solid ${active ? "#fff" : "rgba(255,255,255,.25)"}`, background: active ? "#fff" : "transparent", color: active ? "#15803d" : "rgba(255,255,255,.75)", borderRadius: 20, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: active ? 600 : 400 }),
  alertCard: (sev) => ({ display: "flex", gap: 9, padding: 10, borderRadius: 8, marginBottom: 7, border: `1px solid ${sev === "critical" ? "#fecaca" : sev === "warning" ? "#fde68a" : "#bbf7d0"}`, background: sev === "critical" ? "#fef2f2" : sev === "warning" ? "#fffbeb" : "#f0fdf4" }),
  select: { width: "100%", padding: "8px 11px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, color: "#334155", background: "#fff", fontFamily: "inherit", cursor: "pointer", outline: "none" },
  input: { width: "100%", padding: "8px 11px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13, color: "#334155", background: "#fff", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [lang, setLang] = useState("sd");
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [farms, setFarms] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const t = I18N[lang];

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Load farms for current user ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from("farms").select("*").eq("owner_id", user.id).then(({ data }) => {
      if (data) setFarms(data);
    });
    supabase.from("alerts").select("*").eq("recipient_id", user.id).eq("is_dismissed", false)
      .order("created_at", { ascending: false }).limit(20).then(({ data }) => {
        if (data) setAlerts(data);
      });
  }, [user]);

  // ── Real-time alerts subscription ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("alerts_" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts",
          filter: `recipient_id=eq.${user.id}` },
        (payload) => setAlerts(prev => [payload.new, ...prev]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const criticalCount = alerts.filter(a => a.severity === "critical" && !a.is_read).length;

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🌾</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.appName}</div>
              <div style={{ fontSize: 10, opacity: .65, letterSpacing: 1, textTransform: "uppercase" }}>{t.appSub}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.1)", padding: "4px 10px", borderRadius: 20 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "blink 1.4s infinite" }}></span>
              Live
            </div>
            {criticalCount > 0 && <div style={{ ...styles.badge("red"), cursor: "pointer" }} onClick={() => setTab("alerts")}>⚠️ {criticalCount}</div>}
            <div style={{ display: "flex", gap: 4 }}>
              {["en", "ur", "sd"].map(l => (
                <button key={l} style={styles.langBtn(lang === l)} onClick={() => setLang(l)}>
                  {l === "en" ? "EN" : l === "ur" ? "اردو" : "سنڌي"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={styles.navTabs}>
          {[["dashboard","📊",t.dashboard],["disease","🔬",t.diseaseScan],["satellite","🛰️",t.satellite],
            ["yield","📈",t.yieldPredict],["voice","🎤",t.voiceBot],["alerts","⚠️",t.alerts+(criticalCount?" ("+criticalCount+")":"")]
          ].map(([id, icon, label]) => (
            <button key={id} style={styles.navTab(tab === id)} onClick={() => setTab(id)}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {tab === "dashboard" && <DashboardTab t={t} lang={lang} farms={farms} />}
        {tab === "disease" && <DiseaseScanTab t={t} lang={lang} farms={farms} user={user} />}
        {tab === "satellite" && <SatelliteTab t={t} lang={lang} farms={farms} />}
        {tab === "yield" && <YieldPredictTab t={t} lang={lang} />}
        {tab === "voice" && <VoiceBotTab t={t} lang={lang} farms={farms} user={user} />}
        {tab === "alerts" && <AlertsTab t={t} lang={lang} alerts={alerts} setAlerts={setAlerts} />}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ t, lang, farms }) {
  const [weather, setWeather] = useState(null);
  const [dashStats, setDashStats] = useState({ total_farms: 0, total_acres: 0, critical_alerts: 0, scans_last_30_days: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/weather/Sukkur`)
      .then(r => r.json())
      .then(setWeather)
      .catch(() => {});
  }, []);

  const rtl = lang !== "en" ? { direction: "rtl", textAlign: "right" } : {};

  return (
    <div style={rtl}>
      <div style={{ ...styles.grid4, marginTop: 12 }}>
        {[
          { label: t.temperature, value: weather ? Math.round(weather.temp_celsius) + "°C" : "--°C", sub: weather?.description || "Loading...", color: "#1e293b" },
          { label: t.soilMoisture, value: "68%", sub: "Field A Sensor", color: "#15803d" },
          { label: t.ndviScore, value: "0.73", sub: "Sentinel-2 · Today", color: "#15803d" },
          { label: t.cropHealth, value: farms.length + " Farms", sub: farms.reduce((s, f) => s + (f.total_acres || 0), 0).toFixed(1) + " acres", color: "#1e293b" },
        ].map((m, i) => (
          <div key={i} style={styles.card}>
            <div style={styles.cardTitle}>{m.label}</div>
            <div style={{ ...styles.metricValue, color: m.color }}>{m.value}</div>
            <div style={styles.metricLabel}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>🌱 Active Crops</div>
          {[{ name: lang === "sd" ? "ڪڻڪ (Wheat)" : lang === "ur" ? "گندم (Wheat)" : "Wheat (گندم)", pct: 82, color: "#22c55e" },
            { name: lang === "sd" ? "چانور (Rice)" : lang === "ur" ? "چاول (Rice)" : "Rice (چاول)", pct: 61, color: "#f59e0b" },
            { name: lang === "sd" ? "ڪپهه (Cotton)" : lang === "ur" ? "کپاس (Cotton)" : "Cotton (کپاس)", pct: 43, color: "#ef4444" },
          ].map((crop, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: 20 }}>🌾</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{crop.name}</span>
                  <span style={styles.badge(crop.pct > 70 ? "green" : crop.pct > 50 ? "amber" : "red")}>{crop.pct}%</span>
                </div>
                <div style={styles.progressBar}><div style={styles.progressFill(crop.pct, crop.color)}></div></div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>🌤️ Weather · {weather?.city || "Sukkur"}</div>
          {weather ? (
            <div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#1e293b" }}>{Math.round(weather.temp_celsius)}°C</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{weather.description}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                {[["💧 Humidity", weather.humidity_pct + "%"], ["💨 Wind", weather.wind_speed_ms + " m/s"],
                  ["🌡️ Feels Like", Math.round(weather.feels_like) + "°C"], ["📊 Pressure", weather.pressure_hpa + " hPa"]
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#f8fafc", borderRadius: 7, padding: 9, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{k}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>Loading live weather...</div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// DISEASE SCAN TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DiseaseScanTab({ t, lang, farms, user }) {
  const [crop, setCrop] = useState("wheat");
  const [farmId, setFarmId] = useState(farms[0]?.id || "");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef();
  const rtl = lang !== "en" ? { direction: "rtl", textAlign: "right" } : {};

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const analyze = async () => {
    if (!image) { setError("Please upload a crop image first"); return; }
    setLoading(true); setError(null);
    try {
      const form = new FormData();
      form.append("image", image);
      form.append("crop_type", crop);
      if (farmId) form.append("farm_id", farmId);
      if (user?.id) form.append("user_id", user.id);

      const res = await fetch(`${API_BASE}/api/v1/scan/disease?crop_type=${crop}&farm_id=${farmId || ""}&user_id=${user?.id || ""}`, {
        method: "POST", body: form
      });
      if (!res.ok) throw new Error("Analysis failed: " + res.statusText);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev) => ({ none: "green", low: "green", medium: "amber", high: "red", critical: "red" }[sev] || "amber");

  return (
    <div style={rtl}>
      <div style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 12px", display: "flex", alignItems: "center", gap: 7 }}>
        🔬 {t.diseaseScan}
      </div>
      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>{t.uploadImage}</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{t.selectCrop}</label>
            <select style={styles.select} value={crop} onChange={e => setCrop(e.target.value)}>
              <option value="wheat">🌾 Wheat — گندم — ڪڻڪ</option>
              <option value="cotton">🌿 Cotton — کپاس — ڪپهه</option>
              <option value="sugarcane">🎋 Sugarcane — گنا — ڪمرڪ</option>
              <option value="rice">🌾 Rice — چاول — چانور</option>
            </select>
          </div>
          {farms.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{t.selectFarm}</label>
              <select style={styles.select} value={farmId} onChange={e => setFarmId(e.target.value)}>
                {farms.map(f => <option key={f.id} value={f.id}>{f.farm_name} — {f.total_acres} acres</option>)}
              </select>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          <div style={styles.uploadZone(!!image)} onClick={() => fileRef.current.click()}>
            {preview ? (
              <img src={preview} alt="crop" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }} />
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 6 }}>📸</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{t.uploadImage}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>JPG, PNG • Max 10MB</div>
              </div>
            )}
          </div>
          {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8, padding: 8, background: "#fef2f2", borderRadius: 6 }}>❌ {error}</div>}
          <button style={{ ...styles.btn("primary"), width: "100%", marginTop: 10, justifyContent: "center" }} onClick={analyze} disabled={loading}>
            {loading ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }}></span> {t.analyzing}</> : `🔬 ${t.scanNow}`}
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>AI Diagnosis Result</div>
          {result ? (
            <div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 9, padding: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#9a3412" }}>
                      🦠 {lang === "ur" ? result.disease_name_ur : lang === "sd" ? result.disease_name_sd : result.disease_name_en}
                    </div>
                    <div style={{ fontSize: 12, color: "#c2410c", marginTop: 2 }}>
                      Confidence: {result.confidence_score?.toFixed(1)}%
                    </div>
                  </div>
                  <span style={styles.badge(getSeverityColor(result.severity))}>{result.severity}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{result.description}</div>

                {result.treatment_recommendation?.treatments && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>💊 Recommended Treatments:</div>
                    {Object.entries(result.treatment_recommendation.treatments).slice(0, 3).map(([k, v]) => (
                      <div key={k} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: 8, marginBottom: 6, fontSize: 11 }}>
                        <strong>{v.product}</strong>
                        <div style={{ color: "#64748b", marginTop: 2 }}>Dose: {v.dose}</div>
                        {v.interval && <div style={{ color: "#64748b" }}>Interval: {v.interval}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {lang !== "en" && (
                  <div style={{ marginTop: 10, padding: 10, background: "#fdf4ff", borderRadius: 7, border: "1px solid #e9d5ff", fontSize: 12, direction: "rtl", textAlign: "right", lineHeight: 1.8, fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                    {lang === "ur" ? result.advisory_ur : result.advisory_sd}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#cbd5e1" }}>
              <div style={{ fontSize: 44 }}>🌿</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>{t.uploadImage}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// VOICE BOT TAB — Web Speech API + Claude AI
// ═══════════════════════════════════════════════════════════════════════════════
function VoiceBotTab({ t, lang, farms, user }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: lang === "sd" ? "سلام! آئون توهان جو زرعي مددگار آهيان. پنهنجي فصل بابت ڪجهه پڇو."
           : lang === "ur" ? "سلام! میں آپ کا زرعی مددگار ہوں۔ اپنی فصل کے بارے میں کچھ پوچھیں۔"
           : "Hello! I am your Agricultural AI Assistant. Ask me about your crops.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const msgEndRef = useRef();
  const recognitionRef = useRef();
  const rtl = lang !== "en" ? { direction: "rtl", textAlign: "right" } : {};

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── TTS — speak AI reply ─────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "sd" ? "ur-PK" : lang === "ur" ? "ur-PK" : "en-US";
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [lang]);

  // ── STT — listen with Web Speech API ─────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Please type your message."); return; }
    const recognition = new SR();
    recognition.lang = lang === "en" ? "en-US" : "ur-PK";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText) return;
    setInput("");

    const userMsg = { role: "user", text: userText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.text }));
      const res = await fetch(`${API_BASE}/api/v1/voice/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id || "anonymous",
          message_text: userText,
          language: lang,
          context: { history }
        })
      });
      const data = await res.json();
      const aiMsg = { role: "assistant", text: data.reply.text, timestamp: data.reply.timestamp };
      setMessages(prev => [...prev, aiMsg]);
      speak(data.reply.text);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick-action prompts based on language
  const quickPrompts = {
    en: ["How to treat Cotton Leaf Curl?", "Wheat fertilizer schedule", "When to irrigate sugarcane?", "How to read NDVI?"],
    ur: ["کپاس پتہ مروڑ کا علاج کیسے کریں؟", "گندم کی کھاد کا شیڈول", "گنے کی آبپاشی کب کریں؟", "مٹی کا pH کیا ہونا چاہیے؟"],
    sd: ["ڪپهه جي بيماري جو علاج?", "ڪڻڪ جي کاتي جو وقت", "ڪمرڪ ۾ پاڻي ڪڏهن ڏيو?", "مٽي جو pH ڪيترو هجڻ گهرجي?"],
  };

  return (
    <div style={rtl}>
      <div style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 12px" }}>🎤 {t.voiceBot}</div>

      {/* Quick prompts */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {(quickPrompts[lang] || quickPrompts.en).map((q, i) => (
          <button key={i} style={{ ...styles.btn("secondary"), fontSize: 11, padding: "5px 10px" }} onClick={() => sendMessage(q)}>{q}</button>
        ))}
      </div>

      <div style={styles.card}>
        {/* Chat messages */}
        <div style={{ height: 320, overflowY: "auto", padding: "8px 0", display: "flex", flexDirection: "column" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div style={{ ...styles.msgBubble(m.role === "user"), fontFamily: lang !== "en" ? "'Noto Nastaliq Urdu', serif" : "inherit", lineHeight: lang !== "en" ? 2.2 : 1.5 }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 4, padding: 10 }}>
              {[0,1,2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#94a3b8", animation: `blink ${.8+i*.2}s infinite` }}></span>)}
            </div>
          )}
          {isSpeaking && <div style={{ fontSize: 11, color: "#15803d", padding: "4px 10px" }}>🔊 Speaking...</div>}
          <div ref={msgEndRef} />
        </div>

        {/* Input area */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
          <div style={styles.voiceInput}>
            <button style={{ ...styles.btn(isListening ? "danger" : "secondary"), flexShrink: 0 }} onClick={isListening ? () => recognitionRef.current?.stop() : startListening}>
              {isListening ? "⏹ Stop" : t.speak}
            </button>
            <input
              style={{ ...styles.input, flex: 1, direction: lang !== "en" ? "rtl" : "ltr", fontFamily: lang !== "en" ? "'Noto Nastaliq Urdu', serif" : "inherit", fontSize: lang !== "en" ? 15 : 13 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder={t.voicePlaceholder}
            />
            <button style={{ ...styles.btn("primary"), flexShrink: 0 }} onClick={() => sendMessage()} disabled={loading}>
              {t.send}
            </button>
          </div>
          {isListening && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5, textAlign: "center" }}>🎤 Listening... Speak in {lang === "en" ? "English" : lang === "ur" ? "Urdu" : "Sindhi"}</div>}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SATELLITE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SatelliteTab({ t, lang, farms }) {
  const [selectedFarm, setSelectedFarm] = useState(farms[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      // In production: use actual farm polygon from Supabase
      const mockPolygon = { type: "Polygon", coordinates: [[[68.82, 27.72],[68.83, 27.72],[68.83, 27.73],[68.82, 27.73],[68.82, 27.72]]] };
      const res = await fetch(`${API_BASE}/api/v1/satellite/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farm_id: selectedFarm || "demo", crop_type: "wheat", polygon_geojson: mockPolygon, acres: 12, district: "Sukkur" })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const rtl = lang !== "en" ? { direction: "rtl", textAlign: "right" } : {};

  return (
    <div style={rtl}>
      <div style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 12px" }}>🛰️ {t.satellite}</div>
      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>{t.selectFarm}</div>
          {farms.length > 0 && (
            <select style={{ ...styles.select, marginBottom: 10 }} value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
              {farms.map(f => <option key={f.id} value={f.id}>{f.farm_name}</option>)}
            </select>
          )}
          <div id="leaflet-map" style={{ height: 220, borderRadius: 10, border: "1px solid #e2e8f0", background: "#1a2e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80", fontSize: 13 }}>
            🛰️ Leaflet Map — see integration instructions
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 5 }}>
            Add Leaflet.js + ESRI tiles for live satellite view. See README.
          </div>
          <button style={{ ...styles.btn("primary"), width: "100%", justifyContent: "center", marginTop: 10 }} onClick={runAnalysis} disabled={loading}>
            {loading ? "⚙️ Analyzing..." : `🛰️ ${t.runAnalysis}`}
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>NDVI Analysis Results</div>
          {analysis ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {[
                  { label: t.ndviScore, value: analysis.ndvi.mean, bg: "#f0fdf4", bc: "#bbf7d0", vc: "#15803d" },
                  { label: t.soilMoisture, value: (analysis.soil_moisture.index * 100).toFixed(0) + "%", bg: "#eff6ff", bc: "#bfdbfe", vc: "#1e40af" },
                  { label: "Stressed Area", value: analysis.ndvi.stressed_pct + "%", bg: "#fef9c3", bc: "#fde68a", vc: "#92400e" },
                  { label: "LST", value: analysis.land_surface_temperature.celsius + "°C", bg: "#fdf4ff", bc: "#e9d5ff", vc: "#6b21a8" },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 10, background: s.bg, border: `1px solid ${s.bc}`, borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.vc }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: s.vc, textTransform: "uppercase", letterSpacing: .5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {analysis.advisories && (
                <div style={{ marginTop: 12, padding: 11, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 12, color: "#15803d", lineHeight: 1.6, fontFamily: lang !== "en" ? "'Noto Nastaliq Urdu', serif" : "inherit", direction: lang !== "en" ? "rtl" : "ltr", textAlign: lang !== "en" ? "right" : "left" }}>
                  <strong>🤖 AI:</strong> {lang === "ur" ? analysis.advisories.ur : lang === "sd" ? analysis.advisories.sd : analysis.advisories.en}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#cbd5e1" }}>
              <div style={{ fontSize: 44 }}>🛰️</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Run analysis to see satellite data</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// YIELD PREDICTION TAB
// ═══════════════════════════════════════════════════════════════════════════════
function YieldPredictTab({ t, lang }) {
  const [form, setForm] = useState({ crop_type: "wheat", soil_pH: 6.8, nitrogen_kg_per_ha: 142, phosphorus_kg_per_ha: 46, rainfall_mm: 380, avg_temp_celsius: 28, irrigation_type: "canal", soil_type: "clay_loam", ndvi_mean: 0.65, acres: 12, disease_severity: "none" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const predict = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/yield/predict`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
      });
      const data = await res.json();
      setResult(data.prediction);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: parseFloat(v) || v }));
  const rtl = lang !== "en" ? { direction: "rtl", textAlign: "right" } : {};

  return (
    <div style={rtl}>
      <div style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 12px" }}>📈 {t.yieldPredict}</div>
      <div style={styles.grid2}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>{t.selectCrop}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["crop_type","Crop",["wheat","cotton","sugarcane","rice"]],
              ["irrigation_type","Irrigation",["canal","drip","tube_well","rainwater"]],
              ["soil_type","Soil Type",["clay_loam","sandy_loam","silt_loam","loamy_sand"]],
              ["disease_severity","Disease",["none","low","medium","high","critical"]]
            ].map(([k, label, opts]) => (
              <div key={k}>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                <select style={styles.select} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {[["soil_pH","Soil pH"],["nitrogen_kg_per_ha","N (kg/ha)"],
              ["rainfall_mm","Rainfall (mm)"],["avg_temp_celsius","Temp (°C)"],
              ["ndvi_mean","NDVI (0-1)"],["acres","Area (Acres)"]
            ].map(([k, label]) => (
              <div key={k}>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                <input type="number" style={styles.input} value={form[k]} onChange={e => set(k, e.target.value)} step="0.1" />
              </div>
            ))}
          </div>
          <button style={{ ...styles.btn("primary"), width: "100%", justifyContent: "center", marginTop: 12 }} onClick={predict} disabled={loading}>
            {loading ? "⚙️ Calculating..." : `🤖 ${t.predictYield}`}
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>ML Prediction Result</div>
          {result ? (
            <div>
              <div style={{ background: "linear-gradient(135deg,#f0fdf4,#f0f9ff)", border: "1px solid #a7f3d0", borderRadius: 10, padding: 18, textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: "#15803d" }}>{result.predicted_yield_per_acre.value}</div>
                <div style={{ fontSize: 13, color: "#16a34a" }}>{result.predicted_yield_per_acre.unit}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Total: {result.total_predicted_yield.value} maunds for {result.total_predicted_yield.acres} acres</div>
                <div style={{ marginTop: 8 }}>
                  <span style={styles.badge(result.comparison_to_avg.startsWith("+") ? "green" : "red")}>{result.comparison_to_avg} vs district avg</span>
                </div>
              </div>
              {result.risk_factors.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 7, color: "#475569" }}>⚠️ Risk Factors ({result.risk_factors.length}):</div>
                  {result.risk_factors.map((r, i) => (
                    <div key={i} style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 7, padding: 8, marginBottom: 6, fontSize: 11 }}>
                      <strong style={{ color: "#92400e" }}>{r.factor}</strong> <span style={{ color: "#dc2626" }}>{r.impact}</span>
                      <div style={{ color: "#64748b", marginTop: 3 }}>💡 {r.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#cbd5e1" }}>
              <div style={{ fontSize: 44 }}>📈</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Fill parameters and predict</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AlertsTab({ t, lang, alerts, setAlerts }) {
  const dismiss = async (id) => {
    await supabase.from("alerts").update({ is_dismissed: true }).eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };
  const markRead = async (id) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };
  const rtl = lang !== "en" ? { direction: "rtl", textAlign: "right" } : {};

  return (
    <div style={rtl}>
      <div style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 12px" }}>⚠️ {t.alerts}</div>
      {alerts.length === 0 ? (
        <div style={{ ...styles.card, textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <div style={{ marginTop: 8 }}>{t.noAlerts}</div>
        </div>
      ) : alerts.map(a => (
        <div key={a.id} style={styles.alertCard(a.severity)} onClick={() => markRead(a.id)}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>{a.severity === "critical" ? "🔴" : a.severity === "warning" ? "⚠️" : "ℹ️"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: lang !== "en" ? "'Noto Nastaliq Urdu', serif" : "inherit" }}>
                {lang === "ur" ? (a.title_ur || a.title_en) : lang === "sd" ? (a.title_sd || a.title_en) : a.title_en}
              </span>
              {!a.is_read && <span style={styles.badge("red")}>New</span>}
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2, fontFamily: lang !== "en" ? "'Noto Nastaliq Urdu', serif" : "inherit", lineHeight: 1.7 }}>
              {lang === "ur" ? (a.body_ur || a.body_en) : lang === "sd" ? (a.body_sd || a.body_en) : a.body_en}
            </div>
            <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
              <span style={styles.badge(a.severity === "critical" ? "red" : a.severity === "warning" ? "amber" : "green")}>{a.severity}</span>
              <span style={{ fontSize: 10, color: "#94a3b8", alignSelf: "center" }}>{new Date(a.created_at).toLocaleDateString()}</span>
              <button style={{ ...styles.btn("secondary"), fontSize: 10, padding: "2px 8px", marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); dismiss(a.id); }}>Dismiss</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
