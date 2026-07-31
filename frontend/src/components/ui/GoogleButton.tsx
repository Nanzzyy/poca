"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@/lib/queries";
import { useAuthStore, useUIStore } from "@/stores";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    google?: any;
    onGoogleSignIn?: (res: any) => void;
  }
}

export function GoogleButton({ label = "Lanjutkan dengan Google" }: { label?: string }) {
  const btnRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const googleLogin = useGoogleLogin();
  const setToken = useAuthStore((s) => s.setToken);
  const addToast = useUIStore((s) => s.addToast);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Skip if already loaded or SSR
    if (typeof window === "undefined" || document.querySelector('script[src*="gsi/client"]')) {
      // re-init: if google is already available and button not rendered
      if (window.google?.accounts && btnRef.current && !loaded) {
        initButton();
      }
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initButton();
      setLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove on unmount — other components may use it
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (loaded && window.google?.accounts && btnRef.current) {
      initButton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const initButton = () => {
    if (!btnRef.current || !window.google?.accounts) return;
    // Clear previous if any
    btnRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: "390968374314-1tnqpvldf0qqi6jcfmd0pvonbu3fo27f.apps.googleusercontent.com",
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: label === "Lanjutkan dengan Google" ? "signin_with" : "signup_with",
      shape: "rectangular",
      width: btnRef.current.offsetWidth > 200 ? btnRef.current.offsetWidth : 300,
    });
  };

  const handleCredentialResponse = async (response: any) => {
    try {
      const result = await googleLogin.mutateAsync(response.credential);
      setToken(result.access_token);
      addToast("Berhasil masuk dengan Google!", "success");
      router.push("/");
    } catch {
      addToast("Gagal masuk dengan Google", "error");
    }
  };

  if (!loaded) {
    return (
      <div className="w-full h-12 bg-surface-container-low rounded-xl flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={btnRef} className="w-full flex justify-center" />
  );
}
