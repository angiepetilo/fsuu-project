import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY || "app-key";
const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1";
const isPusherEnabled = Boolean(import.meta.env.VITE_PUSHER_APP_KEY);

let echoInstance = null;

if (isPusherEnabled) {
  try {
    echoInstance = new Echo({
      broadcaster: "pusher",
      key: pusherKey,
      cluster: pusherCluster,
      wsHost: import.meta.env.VITE_PUSHER_HOST || undefined,
      wsPort: import.meta.env.VITE_PUSHER_PORT ? parseInt(import.meta.env.VITE_PUSHER_PORT, 10) : undefined,
      wssPort: import.meta.env.VITE_PUSHER_PORT ? parseInt(import.meta.env.VITE_PUSHER_PORT, 10) : undefined,
      forceTLS: import.meta.env.VITE_PUSHER_SCHEME ? import.meta.env.VITE_PUSHER_SCHEME === "https" : true,
      enabledTransports: ["ws", "wss"],
    });
  } catch (err) {
    console.warn("[Echo] Failed to initialize Pusher instance:", err);
    echoInstance = null;
  }
} else {
  // Graceful dummy fallback to prevent errors when Pusher keys are not set in .env
  echoInstance = {
    channel: () => ({
      listen: () => ({ listen: () => {} }),
      stopListening: () => {},
    }),
    private: () => ({
      listen: () => ({ listen: () => {} }),
      stopListening: () => {},
    }),
    leave: () => {},
  };
}

export default echoInstance;
