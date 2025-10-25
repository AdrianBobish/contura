import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Player from "lottie-react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import animationData from "../animations/confirmation.json";

// Fix for missing marker icons in Vite/React
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function Screen7() {
  const [accepted, setAccepted] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // Load accepted state from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("taskAccepted");
    if (saved === "true") {
      setAccepted(true);
    }
  }, []);

  const handleAccept = () => {
    if (!accepted) {
      setShowAnimation(true);
    }
  };

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setAccepted(true);
        setShowAnimation(false);
        sessionStorage.setItem("taskAccepted", "true"); // Save accepted state
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showAnimation]);

  return (
    <div className={`screen task-detail ${accepted ? "accepted" : ""}`}>
      {/* Navbar */}
      <header className="navbar">
        <Link to="/screen6" className="back">←</Link>
        <img src="/assets/logo-color.png" alt="logo" />
      </header>

      {/* Task details stay the same */}
      {!showAnimation && (
        <>
          <div className="task-header">
            <img src="/assets/tasks/dog.jpg" alt="task thumbnail" />
            <div className="thumbnail-gradient"></div>
          </div>

          <div className="task-body">
            <h2 className="task-title">Îngrijire animal de companie</h2>

            <div className="user-info">
              <img
                src="https://randomuser.me/api/portraits/women/2.jpg"
                alt="user"
              />
              <span>Maria</span>
              <span className="stars">★★★★★</span>
              
              <span className="price">
                    <img src="/assets/icons/money.png" alt="price" />
                    100 LEI
              </span>
            </div>

            <hr />

            <p className="desc">
              Caut pe cineva să aibă grijă de cățelul meu pentru o zi, să îl
              plimbe și să îi dea de mâncare. Este foarte prietenos și jucăuș!
              Pe cât este de mic, a fost obișnuit să stea cu oameni, deci nu
              va avea probleme de adaptare.
            </p>

            <hr />

            {/* Static map preview */}
            <div className="map-preview" style={{ height: "220px" }}>
              <MapContainer
                center={{ lat: 45.75372, lng: 21.22571 }} // Timișoara
                zoom={14}
                style={{ width: "100%", height: "100%" }}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                zoomControl={false}
                touchZoom={false}
              >
                <TileLayer
                  attribution="© OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={{ lat: 45.75372, lng: 21.22571 }} />
                <Circle
                  center={{ lat: 45.75372, lng: 21.22571 }}
                  radius={500}
                  pathOptions={{
                    color: "#062b6b",
                    fillColor: "#062b6b",
                    fillOpacity: 0.2,
                  }}
                />
              </MapContainer>
            </div>

          </div>
        </>
      )}

      {/* Animation state */}
      {showAnimation && (
        <div className="confirmation-screen">
          <div className="lottie-container">
            <Player
              autoplay
              loop={false}
              animationData={animationData}
              style={{ height: 200, width: 200 }}
            />
          </div>
          <p className="confirmation-text">
            Ai acceptat task-ul „Îngrijire animal de companie” pentru data de 30
            septembrie
          </p>
        </div>
      )}

      {/* Fixed button (changes only style & text when accepted) */}
      <button
        onClick={handleAccept}
        className={`btn fixed-btn ${accepted ? "accepted-btn" : "primary"}`}
        disabled={accepted}
      >
        {accepted ? "Acceptat ● 30 septembrie" : "Acceptă task-ul"}
      </button>
    </div>
  );
}
