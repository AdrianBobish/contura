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
    phone: string; // single Romanian number (9 digits, without +40)
};

export default function CreateProvider() {
    const navigate = useNavigate();

    // steps: 1 = personal info, 2 = tags, 3 = map/location, 4 = profile image
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [form, setForm] = useState<FormState>({
        fullName: "Andrei Frintu",
        email: "example@gmail.com",
        age: "18",
        password: "andrei07",
        phone: "123456789",
    });
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);

    // profile image state (for step 4)
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);

    // location & service area (for step 3)
    const [location, setLocation] = useState<L.LatLng | null>(null);
    const [serviceAreaPoints, setServiceAreaPoints] = useState<Array<{ lat: number; lng: number }>>([]);

    // notification
    const [notifMessage, setNotifMessage] = useState<string | null>(null);
    const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevPreviewRef = useRef<string | null>(null);

    // ref for the hidden file input so we can open it programmatically
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        return () => {
            if (notifTimerRef.current) {
                clearTimeout(notifTimerRef.current);
            }
            try {
                const url = prevPreviewRef.current;
                if (url && url.startsWith("blob:")) {
                    URL.revokeObjectURL(url);
                }
            } catch {
                // ignore
            }
        };
    }, []);

    useEffect(() => {
        try {
            const prev = prevPreviewRef.current;
            if (prev && prev.startsWith("blob:")) {
                URL.revokeObjectURL(prev);
            }
        } catch {
            // ignore
        }
        prevPreviewRef.current = null;

        if (!profileImage) {
            setProfilePreview(null);
            return;
        }

        try {
            const url = URL.createObjectURL(profileImage);
            prevPreviewRef.current = url;
            setProfilePreview(url);
            return () => {
                try {
                    const p = prevPreviewRef.current;
                    if (p && p.startsWith("blob:")) {
                        URL.revokeObjectURL(p);
                    }
                    prevPreviewRef.current = null;
                } catch {
                    // ignore
                }
            };
        } catch {
            const fr = new FileReader();
            fr.onload = () => {
                setProfilePreview(typeof fr.result === "string" ? fr.result : null);
            };
            fr.onerror = () => {
                setProfilePreview(null);
                showNotification("Nu s-a putut încărca imaginea.");
            };
            fr.readAsDataURL(profileImage);
            return () => {
                // nothing
            };
        }
    }, [profileImage]);

    const popularTags = [
        "Grădinărit",
        "Îngrijire animale",
        "Curățenie",
        "Reparații",
        "Muncă fizică",
        "Asistență IT",
    ];

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    }

    function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 9);
        setForm((s) => ({ ...s, phone: cleaned }));
    }

    function validate(): Record<string, string> {
        const e: Record<string, string> = {};
        if (!form.fullName.trim()) e.fullName = "Completați numele.";
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Adresă de e-mail invalidă.";
        const ageNum = Number(form.age);
        if (!form.age || isNaN(ageNum) || ageNum < 18) e.age = "Trebuie să ai cel puțin 18 ani.";

        if (!form.password || form.password.length < 6) {
            e.password = "Parola trebuie să aibă cel puțin 6 caractere.";
        }

        const phoneDigits = form.phone.replace(/\D/g, "");
        if (!phoneDigits) {
            e.phone = "Introduceți un număr de telefon.";
        } else if (!/^\d{9}$/.test(phoneDigits)) {
            e.phone = "Numărul trebuie să conțină 9 cifre (fără prefix).";
        }

        return e;
    }

    function showNotification(message: string) {
        setNotifMessage(message);
        if (notifTimerRef.current) {
            clearTimeout(notifTimerRef.current);
        }
        notifTimerRef.current = setTimeout(() => {
            setNotifMessage(null);
            notifTimerRef.current = null;
        }, 3000);
    }

    // on first step submit
    function onSubmitFirst(e?: React.FormEvent) {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            showNotification(Object.values(errs)[0]);
            return;
        }
        setNotifMessage(null);
        setStep(2);
    }

    // image input handler (upload only, no camera logic)
    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        if (!file) return;
        const isImageType = typeof file.type === "string" && file.type.startsWith("image/");
        const hasImageExt = /\.(jpe?g|png|gif|heic|heif)$/i.test(file.name);
        if (!isImageType && !hasImageExt) {
            showNotification("Fișier invalid. Selectează o imagine.");
            return;
        }
        try {
            const prev = prevPreviewRef.current;
            if (prev && prev.startsWith("blob:")) {
                URL.revokeObjectURL(prev);
            }
        } catch {
            // ignore
        }
        prevPreviewRef.current = null;
        setProfileImage(file);
    }

    function removeImage() {
        setProfileImage(null);
    }

    function toggleTag(tag: string) {
        setSelectedTags((prev) => {
            const next = new Set(prev);
            if (next.has(tag)) next.delete(tag);
            else next.add(tag);
            return next;
        });
    }

    const filteredTags = popularTags.filter((t) =>
        t.toLowerCase().includes(search.trim().toLowerCase())
    );

    // simplified: only open file picker (no camera permission prompt)
    function openFileDialog() {
        fileInputRef.current?.click();
    }

    // Helper to compute square corners (half-side = km)
    function kmToLatDeg(km: number) {
        // approx: 1 deg latitude ~ 110.574 km
        return km / 110.574;
    }
    function kmToLngDeg(km: number, latDeg: number) {
        // approx: 1 deg longitude ~ 111.320 * cos(lat)
        return km / (111.320 * Math.cos((latDeg * Math.PI) / 180));
    }

    function computeSquareCorners(center: L.LatLng, halfSideKm = 2) {
        const dLat = kmToLatDeg(halfSideKm);
        const dLng = kmToLngDeg(halfSideKm, center.lat);

        // corners: NE, NW, SW, SE (clockwise)
        return [
            { lat: center.lat + dLat, lng: center.lng + dLng }, // NE
            { lat: center.lat + dLat, lng: center.lng - dLng }, // NW
            { lat: center.lat - dLat, lng: center.lng - dLng }, // SW
            { lat: center.lat - dLat, lng: center.lng + dLng }, // SE
        ];
    }

    // final submission: send form + tags + image + location + serviceArea to server
    async function submitAll() {
        if (!profileImage) {
            showNotification("Te rugăm să încarci o poză.");
            return;
        }
        if (selectedTags.size === 0) {
            showNotification("Selectează cel puțin un serviciu.");
            return;
        }
        // basic validation of personal info before sending
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            showNotification(Object.values(errs)[0]);
            setStep(1);
            return;
        }

        if (!location) {
            showNotification("Alege o zonă pe hartă.");
            setStep(3);
            return;
        }

        // quick offline check to provide a clearer message
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            showNotification("Lipsă conexiune la internet. Verifică conexiunea și încearcă din nou.");
            return;
        }

        const fd = new FormData();
        fd.append("fullName", form.fullName);
        fd.append("email", form.email);
        fd.append("age", form.age);
        fd.append("password", form.password);
        fd.append("phone", form.phone);
        // send tags as JSON string (server can parse)
        fd.append("tags", JSON.stringify(Array.from(selectedTags)));
        // include filename when appending the file to help some servers
        fd.append("profileImage", profileImage, profileImage.name);

        // append location and service area
        fd.append("location", JSON.stringify({ lat: location.lat, lng: location.lng }));
        fd.append("serviceArea", JSON.stringify(serviceAreaPoints));

        // use AbortController to avoid indefinite waits
        const controller = new AbortController();
        const timeoutMs = 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            showNotification("Se trimit datele...");
            const res = await fetch("http://192.168.0.131:3000/create-provider", {
                method: "POST",
                body: fd,
                signal: controller.signal,
            });
            const data = await res.json();

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

            // optionally reset form / navigate away:
            setForm({ fullName: "", email: "", age: "", password: "", phone: "" });
            setSelectedTags(new Set());
            setProfileImage(null);
            setProfilePreview(null);
            setLocation(null);
            setServiceAreaPoints([]);
            setStep(1);
        } catch (err: unknown) {
            const e = (err && typeof err === "object") ? (err as any) : { message: String(err) };

            if (e && (e.name === "AbortError" || /abort(ed)?/i.test(String(e?.name || "") + String(e?.message || "")))) {
                console.error("submitAll aborted:", e);
                showNotification("Timpul de trimitere a expirat. Încearcă din nou.");
                return;
            }

            const message = String(e?.message ?? e ?? "");

            if (e instanceof TypeError || /failed|network|fetch|cors|net::err/i.test(message)) {
                console.error("submitAll network error:", e);
                showNotification("Eroare de rețea: Imposibil de a contacta serverul (verifică conexiunea sau CORS).");
                return;
            }

            try {
                console.error("submitAll unknown error:", JSON.stringify(e));
            } catch {
                console.error("submitAll unknown error (non-serializable):", e);
            }

            showNotification(message || "Eroare necunoscută. Încearcă din nou.");
        } finally {
            try {
                clearTimeout(timeoutId);
            } catch {
                // ignore
            }
        }
    }

    // Map helper component to pick location on click
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
                        top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
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
            <div
                className="content"
                style={{
                    paddingBottom: step === 1 || step === 2 || step === 3 || step === 4 ? 96 : undefined,
                }}
            >
                {step === 1 && (
                    <>
                        <h2 className="text-white">Creează-ți cont</h2>
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
                                <img src="https://img.icons8.com/ios-filled/90/062b6b/private2.png" alt="password" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Parolă (minim 6 caractere)..."
                                    value={form.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <div
                                className="input phone"
                                style={{ display: "flex", alignItems: "center" }}
                            >
                                <img
                                    src="https://img.icons8.com/emoji/96/romania-emoji.png"
                                    alt="România"
                                    style={{ width: 24, height: 24, marginRight: 10, borderRadius: 4 }}
                                />
                                <span className="prefix" aria-hidden="true" style={{ fontWeight: 600 }}>
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
                        <h2 className="text-white">Cu ce te ocupi?</h2>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                                <input
                                    type="search"
                                    placeholder="Caută servicii..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    style={{
                                        width: 360,
                                        maxWidth: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        outline: "none",
                                        fontSize: 14,
                                        boxSizing: "border-box",
                                        boxShadow: searchFocused ? "0 0 0 4px rgba(3,42,107,0.06)" : undefined,
                                    }}
                                    aria-label="Caută servicii"
                                />
                                <div
                                    style={{
                                        color: "#eee",
                                        fontWeight: 600,
                                        marginBottom: 8,
                                    }}
                                    aria-hidden={true}
                                >
                                    Cele mai populare
                                </div>

                                <div
                                    style={{
                                        width: 360,
                                        height: 400,
                                        maxWidth: "100%",
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 10,
                                        minHeight: 72,
                                        alignContent: "flex-start",
                                    }}
                                >
                                    {filteredTags.length === 0 && (
                                        <div style={{ color: "#eee", padding: 8 }}>
                                            Niciun rezultat
                                        </div>
                                    )}
                                    {filteredTags.map((tag) => {
                                        const selected = selectedTags.has(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleTag(tag)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    padding: "8px 12px",
                                                    borderRadius: 10,
                                                    border: "1px solid rgba(0,0,0,0.08)",
                                                    background: selected ? "#062b6b" : "#fff",
                                                    color: selected ? "#fff" : "#062b6b",
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                    boxShadow: selected ? "0 2px 6px rgba(3,42,107,0.2)" : undefined,
                                                }}
                                                aria-pressed={selected}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: 6,
                                                        background: selected ? "#fff" : "#062b6b",
                                                        color: selected ? "#062b6b" : "#fff",
                                                        fontSize: 14,
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    +
                                                </span>
                                                <span>{tag}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h2 className="text-white">În ce zonă oferi ajutor?</h2>

                        <div style={{ marginTop: 12 }}>
                            <div style={{ width: "100%", height: 420, maxWidth: 960, margin: "0 auto", borderRadius: 8, overflow: "hidden" }}>
                                <MapContainer
                                    center={[45.75372, 21.22571]}
                                    zoom={13}
                                    style={{ width: "100%", height: "100%" }}
                                >
                                    <TileLayer
                                        attribution='© OpenStreetMap contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    <LocationPicker onPick={(latlng) => {
                                        setLocation(latlng);
                                        // compute square corners immediately as visual feedback and for request
                                        const corners = computeSquareCorners(latlng, 2);
                                        setServiceAreaPoints(corners);
                                    }} />

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

                            <div style={{ color: "#eee", fontSize: 13, marginTop: 8 }}>
                                Apasă pe hartă pentru a selecta centrul zonei tale. Va fi folosit un cerc de 2 km pentru afișare și un pătrat (4 colțuri) de 2 km half-side trimis la server.
                            </div>
                        </div>
                    </>
                )}

                {step === 4 && (
                    <>
                        <h2 className="text-white">Adaugă o poză de profil</h2>
                        <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                            <div
                                style={{
                                    width: 140,
                                    height: 140,
                                    borderRadius: 140,
                                }}
                            >
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
                                            boxSizing: "border-box",
                                            boxShadow: "inset 0 0 0 1px rgba(6,43,107,0.06)",
                                        }}
                                        aria-hidden={true}
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                            <img
                                                src="https://img.icons8.com/ios-filled/90/062b6b/picture.png"
                                                alt="Placeholder icon"
                                                style={{ width: 48, height: 48, opacity: 0.9 }}
                                            />
                                            <div style={{ fontWeight: 800, marginTop: 8 }}>Nicio poză</div>
                                            <div style={{ fontSize: 12, marginTop: 4, color: "rgba(6,43,107,0.8)" }}>
                                                Încarcă o imagine
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <input
                                id="profileImageInput"
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
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "10px 14px",
                                    borderRadius: 8,
                                    background: "#062b6b",
                                    color: "#fff",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                                aria-label="Încarcă poză"
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

                            <div style={{ color: "#eee", fontSize: 13, maxWidth: 320 }}>
                                Acceptăm imagini JPG/PNG. Imaginea ajută la verificarea identității — asigură-te că fața este clar vizibilă.
                            </div>
                        </div>
                    </>
                )}
            </div>

            {(step === 1 || step === 2 || step === 3 || step === 4) && (
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
                        background: "transparent",
                        zIndex: 60,
                    }}
                >
                    {step === 2 || step === 3 || step === 4 ? (
                        <button
                            type="button"
                            className="btn secondary"
                            onClick={() => {
                                if (step === 2) setStep(1);
                                else if (step === 3) setStep(2);
                                else if (step === 4) setStep(3);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <img
                                src="/assets/icons/next.png"
                                alt="back"
                                style={{ transform: "rotate(180deg)" }}
                            />
                            Înapoi
                        </button>
                    ) : (
                        <Link
                            to="/"
                            className="btn secondary"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                textDecoration: "none",
                            }}
                        >
                            <img
                                src="/assets/icons/next.png"
                                alt="back"
                                style={{ transform: "rotate(180deg)" }}
                            />
                            Înapoi
                        </Link>
                    )}

                    {step === 1 ? (
                        <button
                            type="button"
                            className="btn continue"
                            onClick={() => onSubmitFirst()}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <img src="/assets/icons/next.png" alt="next" />
                            Continuă
                        </button>
                    ) : step === 2 ? (
                        <button
                            type="button"
                            className="btn continue"
                            onClick={() => {
                                if (selectedTags.size === 0) {
                                    showNotification("Selectează cel puțin un serviciu.");
                                    return;
                                }
                                setStep(3);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <img src="/assets/icons/next.png" alt="next" />
                            Continuă
                        </button>
                    ) : step === 3 ? (
                        <button
                            type="button"
                            className="btn continue"
                            onClick={() => {
                                if (!location) {
                                    showNotification("Selectează o zonă pe hartă înainte de a continua.");
                                    return;
                                }
                                // ensure serviceAreaPoints computed (if user set location by other means)
                                if (serviceAreaPoints.length === 0 && location) {
                                    setServiceAreaPoints(computeSquareCorners(location, 2));
                                }
                                setStep(4);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <img src="/assets/icons/next.png" alt="next" />
                            Continuă
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn continue"
                            onClick={() => {
                                submitAll();
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <img src="/assets/icons/next.png" alt="next" />
                            Continuă
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
