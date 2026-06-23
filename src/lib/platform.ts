import { Capacitor } from "@capacitor/core";

/** True when running inside the native iOS app (Capacitor webview). */
export function isNativeIOS(): boolean {
  return Capacitor.getPlatform() === "ios";
}

/** True when running inside any native (iOS/Android) shell. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
