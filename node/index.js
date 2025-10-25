/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const express = require('express');
const firebase = require('firebase-admin');
const cookieParser = require('cookie-parser');

// firebase account credentials
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs'); // template engine

 // Allow all CORS (any origin, any headers, common methods, with credentials allowed)
 app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: '*' }));

app.use(cookieParser()); // parse cookies for authentication
app.use(express.static(path.join(__dirname, 'public')));
// note: form is multipart/form-data so multer will handle body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// initialize firebase-admin
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
});

const db = firebase.firestore();

// multer memory storage for easy upload to firebase storage (or fallback to local disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// helper validation (updated to validate location and serviceArea)
function validatePayload(body) {
    const errors = {};
    if (!body.fullName || !String(body.fullName).trim()) errors.fullName = 'Missing fullName';
    if (!body.email || !/^\S+@\S+\.\S+$/.test(String(body.email))) errors.email = 'Invalid email';
    const ageNum = Number(body.age);
    if (!body.age || isNaN(ageNum) || ageNum < 18) errors.age = 'Must be 18+';
    const phoneDigits = String(body.phone || '').replace(/\D/g, '');
    if (!/^\d{9}$/.test(phoneDigits)) errors.phone = 'Phone must be 9 digits without +40';
    if (!body.password || String(body.password).length < 6) errors.password = 'Password must be at least 6 characters';

    // location: expect { lat: number, lng: number }
    if (!body.location) {
        errors.location = 'Missing location';
    } else {
        const loc = typeof body.location === 'string' ? (() => { try { return JSON.parse(body.location); } catch { return null; } })() : body.location;
        if (
            !loc ||
            typeof loc.lat !== 'number' ||
            typeof loc.lng !== 'number' ||
            Number.isNaN(loc.lat) ||
            Number.isNaN(loc.lng) ||
            loc.lat < -90 || loc.lat > 90 ||
            loc.lng < -180 || loc.lng > 180
        ) {
            errors.location = 'Invalid location (expected { lat:number, lng:number })';
        }
    }

    // serviceArea: expect array of { lat: number, lng: number } with at least 3 points
    if (!body.serviceArea) {
        errors.serviceArea = 'Missing serviceArea';
    } else {
        const sa = typeof body.serviceArea === 'string' ? (() => { try { return JSON.parse(body.serviceArea); } catch { return null; } })() : body.serviceArea;
        if (!Array.isArray(sa) || sa.length < 3 || sa.some(p => !p || typeof p.lat !== 'number' || typeof p.lng !== 'number' || Number.isNaN(p.lat) || Number.isNaN(p.lng))) {
            errors.serviceArea = 'Invalid serviceArea (expected array of { lat:number, lng:number }, min 3 points)';
        }
    }

    return errors;
}

// route that receives formdata from the React app (updated to parse location and serviceArea)
app.post('/create-provider', upload.single('profileImage'), async (req, res) => {
    try {
        const { fullName, email, age, phone, password } = req.body;

        // parse tags (may come as JSON string or CSV)
        let tags = [];
        try {
            if (req.body.tags) {
                tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
            }
        } catch {
            tags = (req.body.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
        }

        // parse location
        let parsedLocation = null;
        try {
            if (req.body.location) {
                parsedLocation = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
                // ensure lat/lng are numbers
                if (parsedLocation) {
                    parsedLocation.lat = Number(parsedLocation.lat);
                    parsedLocation.lng = Number(parsedLocation.lng);
                }
            }
        } catch {
            parsedLocation = null;
        }

        // parse serviceArea
        let serviceAreaPoints = [];
        try {
            if (req.body.serviceArea) {
                const raw = typeof req.body.serviceArea === 'string' ? JSON.parse(req.body.serviceArea) : req.body.serviceArea;
                if (Array.isArray(raw)) {
                    serviceAreaPoints = raw.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }));
                }
            }
        } catch {
            serviceAreaPoints = [];
        }

        // validate (include parsed location and serviceArea)
        const errors = validatePayload({ fullName, email, age, phone, password, location: parsedLocation, serviceArea: serviceAreaPoints });
        if (Object.keys(errors).length) {
            return res.status(400).json({ ok: false, errors });
        }
        if (!Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({ ok: false, message: 'Select at least one tag' });
        }

        // create user in Firebase Auth (phone number in E.164 format)
        const phoneE164 = `+40${String(phone).replace(/\D/g, '').slice(0, 9)}`;
        const userRecord = await firebase.auth().createUser({
            email,
            emailVerified: false,
            displayName: fullName,
            phoneNumber: phoneE164,
            password,
        });

        // convert location and serviceArea to Firestore GeoPoints
        const firestoreLocation = parsedLocation ? new firebase.firestore.GeoPoint(parsedLocation.lat, parsedLocation.lng) : null;
        const firestoreServiceArea = Array.isArray(serviceAreaPoints) && serviceAreaPoints.length
            ? serviceAreaPoints.map(p => new firebase.firestore.GeoPoint(p.lat, p.lng))
            : [];

        // prepare provider document (do NOT store plaintext password)
        const providerDoc = {
            uid: userRecord.uid,
            fullName,
            email,
            age: Number(age),
            phone: phoneE164,
            tags,
            profileImagePath: req.file ? `/uploads/provider-${userRecord.uid}${path.extname(req.file.originalname).toLowerCase()}` : null,
            type: 'provider',
            rating: 0,
            reviewsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            location: firestoreLocation,
            serviceArea: firestoreServiceArea,
        };

        // save provider doc
        await db.collection('providers').doc(userRecord.uid).set(providerDoc);

        // Save uploaded profile image locally to uploads/ directory if provided
        if (req.file) {
            try {
                const file = req.file;
                const uploadsDir = path.join(__dirname, 'public', 'uploads');
                await fs.promises.mkdir(uploadsDir, { recursive: true });

                const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
                const localName = `provider-${userRecord.uid}${ext}`;
                const localPath = path.join(uploadsDir, localName);

                await fs.promises.writeFile(localPath, file.buffer);
            } catch (e) {
                console.error('Failed to save uploaded file locally:', e);
            }
        } else {
            console.warn('No profileImage uploaded for user', userRecord.uid);
        }

        const customToken = await firebase.auth().createCustomToken(userRecord.uid);
        return res.status(201).json({ ok: true, uid: userRecord.uid, customToken });

    } catch (err) {
        console.error('Error creating provider:', err);
        return res.status(500).json({ ok: false, message: 'Server error', error: (err && err.message) || 'unknown' });
    }
});

app.post('/create-requester', upload.single('profileImage'), async (req, res) => {
    try {
        const { fullName, email, age, phone, password } = req.body;

        // parse location
        let parsedLocation = null;
        try {
            if (req.body.location) {
                parsedLocation = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
                if (parsedLocation) {
                    parsedLocation.lat = Number(parsedLocation.lat);
                    parsedLocation.lng = Number(parsedLocation.lng);
                }
            }
        } catch {
            parsedLocation = null;
        }

        // parse serviceArea
        let serviceAreaPoints = [];
        try {
            if (req.body.serviceArea) {
                const raw = typeof req.body.serviceArea === 'string' ? JSON.parse(req.body.serviceArea) : req.body.serviceArea;
                if (Array.isArray(raw)) {
                    serviceAreaPoints = raw.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }));
                }
            }
        } catch {
            serviceAreaPoints = [];
        }

        // validate (include parsed location and serviceArea)
        const errors = validatePayload({ fullName, email, age, phone, password, location: parsedLocation, serviceArea: serviceAreaPoints });
        if (Object.keys(errors).length) {
            return res.status(400).json({ ok: false, errors });
        }

        // create user in Firebase Auth (phone number in E.164 format)
        const phoneE164 = `+40${String(phone).replace(/\D/g, '').slice(0, 9)}`;
        const userRecord = await firebase.auth().createUser({
            email,
            emailVerified: false,
            displayName: fullName,
            phoneNumber: phoneE164,
            password,
        });

        // convert location and serviceArea to Firestore GeoPoints
        const firestoreLocation = parsedLocation ? new firebase.firestore.GeoPoint(parsedLocation.lat, parsedLocation.lng) : null;
        const firestoreServiceArea = Array.isArray(serviceAreaPoints) && serviceAreaPoints.length
            ? serviceAreaPoints.map(p => new firebase.firestore.GeoPoint(p.lat, p.lng))
            : [];

        // prepare requester document (do NOT store plaintext password)
        const requesterDoc = {
            uid: userRecord.uid,
            fullName,
            email,
            age: Number(age),
            phone: phoneE164,
            profileImagePath: req.file ? `/uploads/requester-${userRecord.uid}${path.extname(req.file.originalname).toLowerCase()}` : null,
            type: 'requester',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            location: firestoreLocation,
            serviceArea: firestoreServiceArea,
        };

        // save requester doc
        await db.collection('requesters').doc(userRecord.uid).set(requesterDoc);

        // Save uploaded profile image locally to uploads/ directory if provided
        if (req.file) {
            try {
                const file = req.file;
                const uploadsDir = path.join(__dirname, 'public', 'uploads');
                await fs.promises.mkdir(uploadsDir, { recursive: true });

                const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
                const localName = `requester-${userRecord.uid}${ext}`;
                const localPath = path.join(uploadsDir, localName);

                await fs.promises.writeFile(localPath, file.buffer);
            } catch (e) {
                console.error('Failed to save uploaded file locally:', e);
            }
        } else {
            console.warn('No profileImage uploaded for user', userRecord.uid);
        }

        const customToken = await firebase.auth().createCustomToken(userRecord.uid);
        return res.status(201).json({ ok: true, uid: userRecord.uid, customToken });
    } catch (err) {
        console.error('Error creating requester:', err);
        return res.status(500).json({ ok: false, message: 'Server error', error: (err && err.message) || 'unknown' });
    }
});

app.post("/createCustomToken", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid || typeof uid !== "string") {
      console.error("❌ Missing or invalid UID in request body:", req.body);
      return res.status(400).json({ error: "Missing or invalid UID" });
    }

    // Attempt to create the token
    const customToken = await firebase.auth().createCustomToken(uid);
    console.log("✅ Created custom token for UID:", uid);

    return res.json({ token: customToken });
  } catch (err) {
    console.error("🔥 Error in /createCustomToken:", err);

    // Return a readable error message for debugging
    return res.status(500).json({
      error: err?.message || "Internal server error",
      code: err?.code || null,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    });
  }
});



app.get('/', (_req, res) => {
     res.send('Welcome to the Roflexi Hackathon App!');
 });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
