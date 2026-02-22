import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function Recenter({ position }) {
  const map = useMap();
  if (position) {
    map.setView([position.lat, position.lng], map.getZoom());
  }
  return null;
}

export default function MapView({ position }) {
  if (!position) return <p>Fetching location...</p>;

  return (
    <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: "80vh" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[position.lat, position.lng]} />
      <Recenter position={position} />
    </MapContainer>
  );
}
