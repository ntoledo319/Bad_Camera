/**
 * Small centralized app state. Owns: private notebook (or separate demo notebook),
 * public camera data, settings, and the user's chosen reference point / location fix.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { Notebook } from './notebook';
import { PublicData } from './publicData';
import { createKv, PLATFORM_KIND } from './kv';
import { defaultSettings, type CameraInstallation, type Claim, type Settings, type Source } from '../domain/schemas';
import type { ReferencePoint } from '../domain/distance';
import { DEMO_CLAIMS, DEMO_INSTALLATION, DEMO_SOURCE, DEMO_PHOTO_SOURCE } from '../domain/demo';
import { SOURCE_BY_ID } from '../../content/sources';
import { log } from '../platform/diagnostics';
import { stopWatch } from '../platform/location';
import { ensureDemoSeeded } from '../features/demo/seed';

export interface AppStore {
  ready: boolean;
  error: string | null;
  platform: 'native' | 'web';
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  notebook: Notebook;
  privateNotebook: Notebook;
  publicData: PublicData;
  installations: CameraInstallation[];
  installation: (id: string) => CameraInstallation | null;
  source: (id: string) => Source | null;
  claimsFor: (id: string) => Claim[];
  allClaims: Claim[];
  reference: ReferencePoint | null;
  setReference: (r: ReferencePoint | null) => void;
  /** Increments whenever notebook contents change so screens can reload. */
  rev: number;
  bump: () => void;
  locked: boolean;
  setLocked: (v: boolean) => void;
  dataRev: number;
  bumpData: () => void;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [privateNb] = useState(() => new Notebook(createKv('private')));
  const [demoNb] = useState(() => new Notebook(createKv('demo')));
  const [pub] = useState(() => new PublicData(createKv('private')));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [reference, setReference] = useState<ReferencePoint | null>(null);
  const [rev, setRev] = useState(0);
  const [dataRev, setDataRev] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await privateNb.init();
        await demoNb.init();
        await ensureDemoSeeded(demoNb).catch((e) => log('warn', 'demo.seed', (e as Error).message));
        await pub.init();
        const s = await privateNb.settings();
        setSettings(s);
        setLocked(s.appLock);
        setReady(true);
      } catch (e) {
        log('error', 'store.init', (e as Error).message);
        setError((e as Error).message);
        setReady(true);
      }
    })();
  }, [privateNb, demoNb, pub]);

  // Pause any location watch when the app is backgrounded; re-lock if app lock is on.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') {
        stopWatch();
        if (settings.appLock) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [settings.appLock]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch, filters: { ...settings.filters, ...(patch.filters ?? {}) } } as Settings;
      setSettings(next);
      await privateNb.saveSettings(next);
    },
    [settings, privateNb],
  );

  const demo = settings.demoMode;
  const value = useMemo<AppStore>(() => {
    const installations = demo ? [DEMO_INSTALLATION] : pub.installations;
    const extraSources: Record<string, Source> = demo ? { [DEMO_SOURCE.id]: DEMO_SOURCE, [DEMO_PHOTO_SOURCE.id]: DEMO_PHOTO_SOURCE } : {};
    const allClaims = demo ? DEMO_CLAIMS : pub.claims;
    return {
      ready,
      error,
      platform: PLATFORM_KIND,
      settings,
      updateSettings,
      notebook: demo ? demoNb : privateNb,
      privateNotebook: privateNb,
      publicData: pub,
      installations,
      installation: (id) => installations.find((i) => i.id === id) ?? null,
      source: (id) => extraSources[id] ?? pub.source(id) ?? SOURCE_BY_ID[id] ?? null,
      claimsFor: (id) => allClaims.filter((c) => c.subjectId === id),
      allClaims,
      reference,
      setReference,
      rev,
      bump: () => setRev((r) => r + 1),
      locked,
      setLocked,
      dataRev,
      bumpData: () => setDataRev((r) => r + 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, error, settings, demo, reference, rev, locked, dataRev, updateSettings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): AppStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
