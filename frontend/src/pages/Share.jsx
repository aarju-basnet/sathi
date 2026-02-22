import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import api from '../api/session.api';
import socket from '../socket/socket';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const lastEmergencyRef = { current: false };

function sendEmergencyNotificationOnce() {
  if (!("Notification" in window)) return;
  if (window.__EMERGENCY_NOTIFIED__) return;
  window.__EMERGENCY_NOTIFIED__ = true;

  if (Notification.permission === "granted") {
    new Notification("🚨 EMERGENCY ALERT", {
      body: "Someone shared their LIVE emergency location with you.",
      vibrate: [500, 300, 500, 300, 500],
      requireInteraction: true,
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("🚨 EMERGENCY ALERT", {
          body: "Someone shared their LIVE emergency location with you.",
          vibrate: [500, 300, 500, 300, 500],
          requireInteraction: true,
        });
      }
    });
  }
}

const createGlowIcon = (color) => L.divIcon({
  className: 'glow-marker',
  html: `
    <div style="position: relative; display: flex; justify-content: center; align-items: center;">
      <div style="position: absolute; width: 60px; height: 60px; background: ${color}66; border-radius: 50%; animation: glowPulse 1.5s infinite;"></div>
      <div style="width: 16px; height: 16px; background: ${color}; border: 2px solid white; border-radius: 50%; z-index: 2; box-shadow: 0 0 20px ${color};"></div>
    </div>
    <style>
      @keyframes glowPulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
      @keyframes strobeBorder { 0% { border-color: #ef4444; } 50% { border-color: transparent; } 100% { border-color: #ef4444; } }
    </style>
  `,
  iconSize: [60, 60], iconAnchor: [30, 30]
});

const getDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const R = 6371e3; 
  const φ1 = p1.lat * Math.PI/180;
  const φ2 = p2.lat * Math.PI/180;
  const Δφ = (p2.lat-p1.lat) * Math.PI/180;
  const Δλ = (p2.lng-p1.lng) * Math.PI/180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(0);
};

function MapControls({ senderLoc }) {
  const map = useMap();
  return <button onClick={() => senderLoc && map.setView([senderLoc.lat, senderLoc.lng], 18)} style={styles.recenterBtn}>🎯</button>;
}

export default function Share() {
  const { token } = useParams();
  const [senderLoc, setSenderLoc] = useState(null);
  const [receiverLoc, setReceiverLoc] = useState(null);
  const [emergency, setEmergency] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ speed: 0, battery: 0 });
  const [muted, setMuted] = useState(false);

  const audioRef = useRef(new Audio("https://www.soundjay.com/buttons/beep-01a.mp3"));
  const vibrateRef = useRef(null);

  useEffect(() => {
    socket.emit("join-session", token);
    audioRef.current.load();

    navigator.geolocation.watchPosition((pos) => {
      setReceiverLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, null, { enableHighAccuracy: true });

    api.get(`/${token}`).then((res) => {
      if (res.data) {
        setSenderLoc(res.data.location);
        setHistory([[res.data.location.lat, res.data.location.lng]]);
        if (res.data.mode === "emergency") setEmergency(true);
      }
    });

    socket.on("location-receive", (data) => {
      setSenderLoc({ lat: data.lat, lng: data.lng });
      setHistory(prev => [...prev, [data.lat, data.lng]]);
      setStats({ speed: data.speed, battery: data.battery });

      const isEmergencyNow = data.emergency === true;

      // 🔹 Trigger emergency only when true
      if (!lastEmergencyRef.current && isEmergencyNow) {
        setEmergency(true);
        sendEmergencyNotificationOnce();
        playEmergencySound();
      }

      if (!isEmergencyNow) {
        setEmergency(false);
        window.__EMERGENCY_NOTIFIED__ = false;
        stopEmergencySound();
      }

      lastEmergencyRef.current = isEmergencyNow;
    });

    socket.on("sender-exit", () => {
      alert("⚠️ The sender has stopped sharing their location.");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⚠️ Sender exited", {
          body: "The sender has stopped sharing their location with you.",
          requireInteraction: false,
        });
      }
      stopEmergencySound();
    });

    return () => {
      stopEmergencySound();
      socket.off("location-receive");
      socket.off("sender-exit");
    };
  }, [token]);

  const playEmergencySound = () => {
    audioRef.current.loop = true;
    if (!muted) audioRef.current.play().catch(err => console.log(err));
    if ("vibrate" in navigator) {
      vibrateRef.current = setInterval(() => navigator.vibrate([500, 500]), 1000);
    }
  };

  const stopEmergencySound = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    if (vibrateRef.current) clearInterval(vibrateRef.current);
  };

  const toggleMute = () => {
    setMuted(prev => !prev);
    if (muted) {
      audioRef.current.play().catch(err => console.log(err));
    } else {
      audioRef.current.pause();
    }
  };

  if (!senderLoc) return <div style={styles.loading}>📡 Syncing GPS...</div>;

  const distance = getDistance(senderLoc, receiverLoc);

  return (
    <div style={{...styles.container, border: emergency ? '12px solid #ef4444' : 'none', animation: emergency ? 'strobeBorder 1s infinite' : 'none'}}>
      
      {emergency && (
        <div style={styles.muteToggle}>
          <button onClick={toggleMute} style={styles.muteBtn}>{muted ? "🔈 Unmute" : "🔇 Mute"}</button>
        </div>
      )}

      <MapContainer center={[senderLoc.lat, senderLoc.lng]} zoom={18} zoomControl={false} style={styles.map}>
        <TileLayer url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} />
        <Polyline positions={history} pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 10' }} />
        <Marker position={[senderLoc.lat, senderLoc.lng]} icon={createGlowIcon('#ef4444')} />
        {receiverLoc && <Marker position={[receiverLoc.lat, receiverLoc.lng]} icon={createGlowIcon('#3b82f6')} />}
        <MapControls senderLoc={senderLoc} />
      </MapContainer>

      <div style={styles.dash}>
        <div style={styles.stat}>🚀 {stats.speed} km/h</div>
        <div style={styles.stat}>📏 {distance > 1000 ? (distance/1000).toFixed(1) + 'km' : distance + 'm'} away</div>
        <div style={styles.stat}>🔋 {stats.battery}%</div>
      </div>
    </div>
  );
}

const styles = {
  container: { height: "100vh", width: "100vw", position: "relative", overflow: "hidden", boxSizing: 'border-box' },
  loading: { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#000", color: "#fff" },
  map: { height: "100%", width: "100%", zIndex: 1 },
  dash: { position: 'absolute', bottom: '25px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,255,255,0.95)', padding: '15px', borderRadius: '20px', width: '90%', display: 'flex', justifyContent: 'space-between', zIndex: 1000, fontWeight: 'bold', fontSize: '13px' },
  recenterBtn: { position: 'absolute', top: '150px', right: '10px', zIndex: 1000, width: '45px', height: '45px', backgroundColor: '#fff', border: 'none', borderRadius: '12px', fontSize: '22px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  muteToggle: { position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000 },
  muteBtn: { backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontWeight: 'bold', fontSize: '16px' },
};