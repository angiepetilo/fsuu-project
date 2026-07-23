import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

/**
 * GoogleCallback — Google redirects to /auth/google/callback?code=...
 * This page forwards the code to the Laravel backend, receives the Sanctum
 * token, stores it, and redirects to /dashboard.
 *
 * It must be registered as a route in App.jsx:
 *   <Route path="/auth/google/callback" element={<GoogleCallback />} />
 */
export default function GoogleCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const called = useRef(false); // prevent double-call in React StrictMode

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code  = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      navigate("/login?error=google_denied", { replace: true });
      return;
    }

    // Forward the ?code= to the backend — it exchanges with Google and returns a token
    api.get(`/auth/google/callback?code=${code}`)
      .then(({ data }) => {
        login(data.user, data.token);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        navigate("/login?error=auth_failed", { replace: true });
      });
  }, [params, login, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <img src="/fsuu_logo.png" alt="FSUU" className="w-16 h-auto mb-6 animate-pulse" />
      <p className="text-slate-600 text-sm font-medium">Signing you in…</p>
    </div>
  );
}
