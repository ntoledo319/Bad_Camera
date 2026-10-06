/** Optional app lock using device authentication (biometric or device passcode fallback). Not an account. */
import * as LocalAuthentication from 'expo-local-authentication';

export async function authAvailable(): Promise<{ ok: boolean; reason?: string }> {
  const hw = await LocalAuthentication.hasHardwareAsync();
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (!hw && level === LocalAuthentication.SecurityLevel.NONE) return { ok: false, reason: 'This device has no screen lock set up.' };
  if (level === LocalAuthentication.SecurityLevel.NONE) return { ok: false, reason: 'Set up a device passcode or biometrics first.' };
  return { ok: true };
}

export async function unlock(): Promise<{ ok: boolean; message?: string }> {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock your Sightline notebook', disableDeviceFallback: false, cancelLabel: 'Cancel' });
  if (r.success) return { ok: true };
  return { ok: false, message: r.error === 'user_cancel' || r.error === 'system_cancel' ? 'Unlock canceled.' : `Could not unlock (${r.error}).` };
}
