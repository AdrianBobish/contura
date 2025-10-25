import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import { useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for missing marker icons in Vite/React
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to handle clicks
function LocationPicker({ onPick }: { onPick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function Screen4() {
  const [location, setLocation] = useState<L.LatLng | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (location) {
      console.log("Location is set:", location.lat, location.lng);
      navigate("/screen5");
    } else {
      alert("Selectează o zonă pe hartă înainte de a continua.");
    }
  };

  return (
    <div className="screen">
      <header className="navbar">
        <Link to="/screen3" className="back">←</Link>
        <img src="/assets/logo-color.png" alt="logo" />
      </header>

      <div className="content">
        <h2>În ce zonă oferi ajutor?</h2>

        <div className="form">
          <div className="map-placeholder actual-map">
            <MapContainer
              center={{ lat: 45.75372, lng: 21.22571 }} // Timișoara
              zoom={13}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                attribution='© OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <LocationPicker onPick={(latlng) => setLocation(latlng)} />

              {location && (
                <>
                  <Marker position={location} />
                  <Circle
                    center={location}
                    radius={500}
                    pathOptions={{
                      color: "#062b6b",
                      fillColor: "#062b6b",
                      fillOpacity: 0.2,
                    }}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </div>

        <button onClick={handleContinue} className="btn continue">
          <img src="/assets/icons/next.png" alt="next" />
          Continuă
        </button>
      </div>
    </div>
  );
}
