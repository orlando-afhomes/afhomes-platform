import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

let emulatorConnected = false;

/** Browser Firebase Auth. Used only to check a password; the server issues the real session. */
export function getClientAuth(): Auth {
  // shortcut: placeholder web config for emulator work. Staging adds the real project's public config.
  const app = getApps().length
    ? getApp()
    : initializeApp({ apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key", projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-afhomes" });
  const auth = getAuth(app);
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost && !emulatorConnected) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
    emulatorConnected = true;
  }
  return auth;
}
