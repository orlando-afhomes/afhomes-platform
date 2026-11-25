import "server-only";
import { getApp, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * The one place the trusted server connects to Firebase. Local work runs on
 * emulators under a `demo-` project, which cannot reach a real Firebase project.
 * The guards below stop an emulator host from mixing with a real project, and a
 * demo project from silently running without its emulators.
 */
export function getAdminApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-afhomes";
  const emulatorsSet = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.DATA_CONNECT_EMULATOR_HOST);
  if (projectId.startsWith("demo-") && !emulatorsSet) {
    throw new Error("Demo project needs FIREBASE_AUTH_EMULATOR_HOST and DATA_CONNECT_EMULATOR_HOST (run with scripts/api-local.env).");
  }
  if (!projectId.startsWith("demo-") && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.DATA_CONNECT_EMULATOR_HOST)) {
    throw new Error("Emulator hosts are set for a non-demo project. Refusing to start.");
  }
  return getApps().length ? getApp() : initializeApp({ projectId, storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com` });
}
