import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
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

type FormState = {
  fullName: string;
  email: string;
  age: string;
  password: string;
  phone: string;
};

export default function CreateRequester() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>({
    fullName: "Andrei Frintu",
    email: "example@gmail.com",
    age: "18",
    password: "andrei07",
    phone: "123456789",
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<L.LatLng | null>(null);
  const [serviceAreaPoints, setServiceAreaPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPreviewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      const url = prevPreviewRef.current;
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    if (!profileImage) {
      setProfilePreview(null);
      return;
    }
    try {
      const prev = prevPreviewRef.current;
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      const url = URL.createObjectURL(profileImage);
      prevPreviewRef.current = url;
      setProfilePreview(url);
    } catch {
      const fr = new FileReader();
      fr.onload = () => setProfilePreview(typeof fr.result === "string" ? fr.result : null);
      fr.readAsDataURL(profileImage);
    }
  }, [profileImage]);

  const showNotification = (msg: string) => {
    setNotifMessage(msg);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotifMessage(null), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 9);
    setForm((s) => ({ ...s, phone: cleaned }));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Completați numele.";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Adresă de e-mail invalidă.";
    const ageNum = Number(form.age);
    if (!form.age || isNaN(ageNum) || ageNum < 18) e.age = "Trebuie să ai cel puțin 18 ani.";
    if (!form.password || form.password.length < 6) e.password = "Parola trebuie să aibă cel puțin 6 caractere.";
    if (!/^\d{9}$/.test(form.phone)) e.phone = "Numărul trebuie să conțină 9 cifre (fără prefix).";
    return e;
  };

  const kmToLatDeg = (km: number) => km / 110.574;
  const kmToLngDeg = (km: number, lat: number) => km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const computeSquareCorners = (center: L.LatLng, halfSideKm = 2) => {
    const dLat = kmToLatDeg(halfSideKm);
    const dLng = kmToLngDeg(halfSideKm, center.lat);
    return [
      { lat: center.lat + dLat, lng: center.lng + dLng },
      { lat: center.lat + dLat, lng: center.lng - dLng },
      { lat: center.lat - dLat, lng: center.lng - dLng },
      { lat: center.lat - dLat, lng: center.lng + dLng },
    ];
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification("Fișier invalid. Selectează o imagine.");
      return;
    }
    setProfileImage(file);
  };

  const openFileDialog = () => fileInputRef.current?.click();
  const removeImage = () => setProfileImage(null);

  const onSubmitFirst = (e?: React.FormEvent) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      showNotification(Object.values(errs)[0]);
      return;
    }
    setStep(2);
  };

  async function submitAll() {
    if (submitting) return;
    if (!profileImage) return showNotification("Te rugăm să încarci o poză.");
    const errs = validate();
    if (Object.keys(errs).length) {
      showNotification(Object.values(errs)[0]);
      setStep(1);
      return;
    }
    if (!location) {
      showNotification("Selectează o zonă pe hartă.");
      setStep(2);
      return;
    }

    const fd = new FormData();
    fd.append("fullName", form.fullName);
    fd.append("email", form.email);
    fd.append("age", form.age);
    fd.append("password", form.password);
    fd.append("phone", form.phone);
    fd.append("location", JSON.stringify({ lat: location.lat, lng: location.lng }));
    fd.append("serviceArea", JSON.stringify(serviceAreaPoints));
    fd.append("profileImage", profileImage, profileImage.name);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

    try {
      setSubmitting(true);
      showNotification("Se trimit datele...");

      const res = await fetch(`${apiUrl}/create-requester`, {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!data.ok && !data.customToken && !data.uid) {
            const msg = data.message || `Eroare la trimitere: ${res.status}`;
            showNotification(msg);
            return;
        }

        if (data.ok && data.customToken && data.uid) {
            console.log("Account created, received custom token.");
            sessionStorage.setItem('customToken', data.customToken);
            sessionStorage.setItem("createdUid", data.uid);
            // navigate to Screen5
            navigate("/screen5");
        }

    } catch (err) {
      console.error("submitAll failed:", err);
      showNotification("Eroare la trimitere sau conexiune.");
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  function LocationPicker({ onPick }: { onPick: (latlng: L.LatLng) => void }) {
    useMapEvents({
      click(e) {
        onPick(e.latlng);
      },
    });
    return null;
  }

  return (
    <div className="screen">
      {notifMessage && (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 16px)",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "90%",
            width: 420,
            background: "#ff6868",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            zIndex: 999,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {notifMessage}
        </div>
      )}

      <div className="content" style={{ paddingBottom: 96 }}>
        {step === 1 && (
          <>
            <h2 className="text-white">Creează cont solicitant</h2>
            <form className="form" onSubmit={onSubmitFirst}>
              <div className="input">
                <img src="/assets/icons/user.png" alt="user" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Nume și prenume..."
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
              <div className="input">
                <img src="/assets/icons/mail.png" alt="mail" />
                <input
                  type="email"
                  name="email"
                  placeholder="Adresă de e-mail..."
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="input">
                <img src="/assets/icons/age.png" alt="age" />
                <input
                  type="number"
                  name="age"
                  min={18}
                  max={99}
                  placeholder="Vârstă (minim 18)..."
                  value={form.age}
                  onChange={handleChange}
                />
              </div>
              <div className="input">
                <img
                  src="https://img.icons8.com/ios-filled/90/062b6b/private2.png"
                  alt="password"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Parolă (minim 6 caractere)..."
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div className="input phone" style={{ display: "flex", alignItems: "center" }}>
                <img
                  src="https://img.icons8.com/emoji/96/romania-emoji.png"
                  alt="România"
                  style={{ width: 24, height: 24, marginRight: 10, borderRadius: 4 }}
                />
                <span className="prefix" style={{ fontWeight: 600 }}>
                  +40
                </span>
                <input
                  id="phone"
                  type="text"
                  name="phone"
                  placeholder="7xx xxx xxx"
                  inputMode="numeric"
                  aria-label="Număr de telefon"
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 6,
                    outline: "none",
                    fontSize: 16,
                  }}
                  value={form.phone}
                  onChange={handlePhoneChange}
                  maxLength={9}
                />
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-white">Unde ai nevoie de ajutor?</h2>
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  width: "100%",
                  height: 420,
                  maxWidth: 960,
                  margin: "0 auto",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <MapContainer center={[45.75372, 21.22571]} zoom={13} style={{ width: "100%", height: "100%" }}>
                  <TileLayer
                    attribution="© OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker
                    onPick={(latlng) => {
                      setLocation(latlng);
                      setServiceAreaPoints(computeSquareCorners(latlng, 2));
                    }}
                  />
                  {location && (
                    <>
                      <Marker position={location} />
                      <Circle
                        center={location}
                        radius={2000}
                        pathOptions={{
                          color: "#062b6b",
                          fillColor: "#062b6b",
                          fillOpacity: 0.12,
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-white">Adaugă o poză de profil</h2>
            <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ width: 140, height: 140, borderRadius: 140 }}>
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      color: "#062b6b",
                      textAlign: "center",
                      padding: 12,
                      boxShadow: "inset 0 0 0 1px rgba(6,43,107,0.06)",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <img
                        src="https://img.icons8.com/ios-filled/90/062b6b/picture.png"
                        alt="Placeholder icon"
                        style={{ width: 48, height: 48, opacity: 0.9 }}
                      />
                      <div style={{ fontWeight: 800, marginTop: 8 }}>Nicio poză</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Încarcă o imagine</div>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.heic,.heif"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={openFileDialog}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#062b6b",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Încarcă poză
              </button>

              {profileImage && (
                <button
                  type="button"
                  onClick={removeImage}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.08)",
                    color: "#062b6b",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Șterge / Încarcă alta
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div
        style={{
          position: "fixed",
          left: 16,
          right: 16,
          bottom: 16,
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as 1 | 2 | 3)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            <img src="/assets/icons/next.png" alt="back" style={{ transform: "rotate(180deg)" }} />
            Înapoi
          </button>
        ) : (
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <img src="/assets/icons/next.png" alt="back" style={{ transform: "rotate(180deg)" }} />
            Înapoi
          </Link>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1) onSubmitFirst();
              else if (step === 2 && location) setStep(3);
              else if (step === 2) showNotification("Selectează o zonă pe hartă.");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#062b6b",
              color: "#fff",
              fontWeight: 700,
              padding: "10px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <img src="/assets/icons/next.png" alt="next" />
            Continuă
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={submitAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: submitting ? "#789" : "#062b6b",
              color: "#fff",
              fontWeight: 700,
              padding: "10px 14px",
              borderRadius: 8,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <img src="/assets/icons/next.png" alt="next" />
            {submitting ? "Se trimite..." : "Continuă"}
          </button>
        )}
      </div>
    </div>
  );
}
