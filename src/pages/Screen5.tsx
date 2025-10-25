import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Player, { LottieRefCurrentProps } from "lottie-react";
import animationData from "../animations/confirmation.json";
import { auth } from "../firebase";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithCustomToken,
} from "firebase/auth";

export default function Screen5() {
  const [stage, setStage] = useState<"loading" | "animating">("loading");
  const navigate = useNavigate();
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const safeNavigate = (path: string) => {
      if (mounted) {
        console.log("➡️ Navigating to:", path);
        navigate(path);
      }
    };

    const onComplete = () => {
      console.log("🎬 Animation complete → navigating to /dashboard");
      sessionStorage.setItem("accountCreationAnimationShown", "true");
      safeNavigate("/dashboard");
    };

    async function init() {
      console.log("🚀 Starting Screen5 init...");

      try {
        const uid = sessionStorage.getItem("createdUid");
        if (!uid) {
          console.error("❌ No UID found in sessionStorage — redirecting.");
          safeNavigate("/");
          return;
        }

        console.log("🔑 Fetching custom token for UID:", uid);

        const response = await fetch("http://192.168.0.131:3000/createCustomToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid }),
        });

        if (!response.ok) {
          console.error("❌ Failed to fetch custom token:", response.statusText);
          safeNavigate("/");
          return;
        }

        const data = await response.json();
        const customToken = data?.token;
        if (!customToken || typeof customToken !== "string") {
          console.error("❌ Invalid token response:", data);
          safeNavigate("/");
          return;
        }

        console.log("✅ Received custom token from backend");

        await setPersistence(auth, browserLocalPersistence);
        console.log("🔐 Attempting sign-in with custom token...");

        try {
          const userCredential = await signInWithCustomToken(auth, customToken);
          console.log("✅ Firebase sign-in success:", userCredential.user.uid);
        } catch (err: any) {
          console.error("🔥 signInWithCustomToken failed:", err);
          alert("Sign-in failed: " + (err?.message || err));
          navigate("/");
          return;
        }


        sessionStorage.removeItem("customToken");

        // Show animation
        if (!mounted) return;
        setStage("animating");

        // Wait for animation to start
        const anim = lottieRef.current;
        if (anim) {
          anim.setSpeed(1.2);
          anim.goToAndPlay(0, true);

          // Ensure we navigate even if Lottie event fails
          timeoutId = setTimeout(() => {
            console.log("⏱ Timeout fallback → navigating");
            onComplete();
          }, 3500);
        } else {
          console.warn("⚠️ No Lottie ref, using fallback navigation");
          onComplete();
        }
      } catch (err: any) {
        console.error("❌ Initialization failed:", err);
        alert(`Failed: ${err?.message || err}`);
        safeNavigate("/");
      }
    }

    init();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate]);

  // Add a manual useEffect to handle the animation complete event safely
  useEffect(() => {
    const anim = lottieRef.current;
    if (!anim) return;
    const handleComplete = () => {
      console.log("🎞 Lottie 'complete' event → navigating");
      sessionStorage.setItem("accountCreationAnimationShown", "true");
      navigate("/dashboard");
    };
    // The lottie-react ref exposes the underlying lottie-web animation as `animationItem`
    anim.animationItem?.addEventListener?.("complete", handleComplete);

    return () => {
      anim.animationItem?.removeEventListener?.("complete", handleComplete);
    };
  }, [navigate]);

  return (
    <div className="screen intro-screen">
      <div className="safe-top" />
      <div className="logo-animation">
        <Player
          lottieRef={lottieRef}
          autoplay
          loop={stage === "loading"} // loop only while waiting for token
          animationData={animationData}
          style={{ height: 180, width: 180 }}
        />
        <p className="intro-text">
          {stage === "loading"
            ? "Se procesează contul..."
            : "Cont creat cu succes!"}
        </p>
      </div>
    </div>
  );
}
