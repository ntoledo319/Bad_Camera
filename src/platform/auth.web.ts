/** Browser preview has no device authentication; app lock is unavailable and says so. */
export async function authAvailable(): Promise<{ ok: boolean; reason?: string }> {
  return { ok: false, reason: 'App lock uses device authentication and is only available in the native app.' };
}
export async function unlock(): Promise<{ ok: boolean; message?: string }> {
  return { ok: true };
}
