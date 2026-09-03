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

    const token = params.get("token");
    const code  = params.get("code");
    const error = params.get("error");

    if (token) {
      const role = params.get("role") || "admin";
      let permissions = [];
      try {
        const permsParam = params.get("permissions");
        if (permsParam) {
          permissions = JSON.parse(permsParam);
        }
      } catch (e) {}

      const user = {
        id: params.get("id") ? parseInt(params.get("id"), 10) : undefined,
        name: params.get("name") || "Authenticated User",
        email: params.get("email_address") || params.get("email") || "",
        email_address: params.get("email_address") || params.get("email") || "",
        avatar: params.get("avatar") || null,
        office_id: params.get("office_id") ? parseInt(params.get("office_id"), 10) : null,
        location: params.get("location") || "FSUU Main Campus",
        office: params.get("location") || "FSUU Main Campus",
        role_id: params.get("role_id") ? parseInt(params.get("role_id"), 10) : (role === "superadmin" ? 1 : (role === "staff" ? 3 : 2)),
        role: role,
        permissions: permissions,
        status: params.get("status") || "active",
      };
      login(user, token);
      if (role === "superadmin" || role === "super_admin") {
        navigate("/sysad/dashboard", { replace: true });
      } else {
        navigate("/general/dashboard", { replace: true });
      }
      return;
    }

    if (error || !code) {
      navigate(`/login?error=${encodeURIComponent(error || "google_denied")}`, { replace: true });
      return;
    }

    // Forward the ?code= to the backend — it exchanges with Google and returns a token
    api.get(`/auth/google/callback?code=${code}`)
      .then(({ data }) => {
        login(data.user, data.token);
        const isSuper = data.user?.role === "superadmin" || data.user?.role?.name === "superadmin" || data.user?.role_id === 1 || data.user?.email === "superadmin@fsuu.edu.ph";
        if (isSuper) {
          navigate("/sysad/dashboard", { replace: true });
        } else {
          navigate("/general/dashboard", { replace: true });
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Authentication failed.";
        navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
      });
  }, [params, login, navigate]);


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <img src="/fsuu_logo.png" alt="FSUU" className="w-16 h-auto mb-6 animate-pulse" />
      <p className="text-slate-600 text-sm font-medium">Signing you in…</p>
    </div>
  );
}
