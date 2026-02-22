import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from '../api/session.api';
import socket from '../socket/socket';

// High-Intensity Glowing Green Marker
const senderIcon = L.divIcon({
  className: 'sender-glow',
  html: `
    <div style="position: relative; display: flex; justify-content: center; align-items: center;">
      <div style="position: absolute; width: 60px; height: 60px; background: rgba(34, 197, 94, 0.4); border-radius: 50%; animation: glow-pulse 1.5s infinite;"></div>
      <div style="width: 16px; height: 16px; background: #22c55e; border: 3px solid white; border-radius: 50%; z-index: 2; box-shadow: 0 0 20px #22c55e;"></div>
    </div>
    <style>
      @keyframes glow-pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
    </style>
  `,
  iconSize: [60, 60],
  iconAnchor: [30, 30]
});

function MapControls({ position }) {
  const map = useMap();
  const handleRecenter = () => { if (position) map.setView([position.lat, position.lng], 18); };
  return <button onClick={handleRecenter} style={styles.recenterBtn}>🎯</button>;
}

export default function Home() {
  const [location, setLocation] = useState(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [activeToken, setActiveToken] = useState(null);
  const [battery, setBattery] = useState(null);
  
  const intervalRef = useRef(null);
  const latestLocationRef = useRef(null);
  const batteryRef = useRef(null);

  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(batt => {
        const update = () => { setBattery(Math.round(batt.level * 100)); batteryRef.current = Math.round(batt.level * 100); };
        update(); batt.onlevelchange = update;
      });
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed || 0 };
        setLocation(coords);
        latestLocationRef.current = coords;
      },
      null, { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // --- MODIFIED: Added 'emergency' flag to the tracking data ---
  const startLiveTracking = (token, mode) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const rate = mode === "emergency" ? 1000 : 3000;
    
    intervalRef.current = setInterval(async () => {
      const currentLoc = latestLocationRef.current;
      if (!currentLoc || !token) return;
      
      const data = {
        sessionId: token,
        lat: currentLoc.lat, 
        lng: currentLoc.lng,
        speed: (currentLoc.speed * 3.6).toFixed(1),
        battery: batteryRef.current || 100,
        emergency: mode === "emergency", // This tells the receiver to keep SOS active
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      try {
        await api.put(`/${token}/location`, data);
        socket.emit("location-update", data); // Emit full data including emergency flag
      } catch (err) {
        console.error("Sync error:", err);
      }
    }, rate);
  };

  const shareToApps = async (token, emergency) => {
    const shareLink = `${window.location.origin}/share/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: emergency ? "🚨 EMERGENCY!" : "📍 My Location",
          text: emergency ? "I need help! Follow me live:" : "Follow my path:",
          url: shareLink,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareLink);
      alert("Link Copied!");
    }
  };

  // --- MODIFIED: Ensure mode is sent to API ---
  const handleEmergency = async () => {
    if (!location) return;
    try {
      setIsEmergency(true);
      const res = await api.post("/", { mode: "emergency" }); // Backend sets emergency: true
      const token = res.data.token;
      setActiveToken(token);
      
      socket.emit("emergency-on", token);
      startLiveTracking(token, "emergency");
      shareToApps(token, true);
    } catch (err) { setIsEmergency(false); }
  };

  const handleNormalShare = async () => {
    if (!location) return;
    try {
      const res = await api.post("/", { mode: "normal" });
      const token = res.data.token;
      setActiveToken(token);
      
      startLiveTracking(token, "normal");
      shareToApps(token, false);
    } catch (err) {
      console.error("Normal share error:", err);
    }
  };

  if (!location) return <div style={styles.loader}>📡 Positioning...</div>;

  return (
    <div style={styles.appContainer}>
      <MapContainer center={[location.lat, location.lng]} zoom={18} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />
          </LayersControl.BaseLayer>
        </LayersControl>
        <Marker position={[location.lat, location.lng]} icon={senderIcon} />
        <MapControls position={location} />
      </MapContainer>

      <div style={styles.controlsContainer}>
        {!isEmergency ? (
          <div style={styles.buttonRow}>
            <button onClick={handleEmergency} style={styles.btnEmergencySlim}>🚨 SOS</button>
            <button onClick={handleNormalShare} style={styles.btnShareSlim}>📍 Share</button>
          </div>
        ) : (
          <div style={styles.emergencyPanelSlim}>
            <div style={styles.statusIndicator}>🚨 EMERGENCY ACTIVE</div>
            <div style={styles.buttonRow}>
               <button onClick={() => shareToApps(activeToken, true)} style={styles.btnShareSmall}>Reshare</button>
               <button onClick={() => {setIsEmergency(false); clearInterval(intervalRef.current);}} style={styles.btnExitSmall}>Exit</button>
            </div>
          </div>
        )}
      </div>
      {isEmergency && <div style={styles.emergencyOverlay} />}
    </div>
  );
}

const styles = {
  appContainer: { height: "100vh", width: "100vw", position: "relative", overflow: "hidden" },
  loader: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
  recenterBtn: { position: 'absolute', top: '150px', right: '10px', zIndex: 1000, width: '40px', height: '40px', backgroundColor: 'white', border: 'none', borderRadius: '10px', fontSize: '20px', boxShadow: '0 2px 15px rgba(0,0,0,0.3)' },
  controlsContainer: { position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 1001, width: "90%", maxWidth: "350px" },
  buttonRow: { display: "flex", gap: "10px", width: "100%" },
  btnEmergencySlim: { flex: 1, padding: "14px", backgroundColor: "#e11d48", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold" },
  btnShareSlim: { flex: 1, padding: "14px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold" },
  emergencyPanelSlim: { backgroundColor: "rgba(255,255,255,0.95)", padding: "12px", borderRadius: "18px", display: "flex", flexDirection: "column", gap: 8, border: "2px solid #ef4444" },
  statusIndicator: { color: "#ef4444", fontWeight: "bold", textAlign: "center", fontSize: "11px" },
  btnShareSmall: { flex: 1, padding: "12px", backgroundColor: "#25D366", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "12px" },
  btnExitSmall: { flex: 1, padding: "12px", backgroundColor: "#374151", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "12px" },
  emergencyOverlay: { position: "absolute", inset: 0, border: "10px solid #ef4444", pointerEvents: "none", zIndex: 1000, animation: 'glowPulse 1s infinite' }
};