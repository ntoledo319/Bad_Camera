/** Export several records as one file of independent evidence packages, with progress and cancel. */
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Download, Share2 } from 'lucide-react-native';
import { useStore } from '../data/store';
import { useTheme } from '../design/theme';
import { Banner, Button, T } from '../design/ui';
import { SPACE } from '../design/tokens';
import { exportMany } from './exportService';
import { saveBytes, shareBytes, NATIVE_SHARE } from '../platform/files';
import { log } from '../platform/diagnostics';

export function BatchExport({ ids, label }: { ids: string[]; label: string }) {
  const s = useStore();
  const { c } = useTheme();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<{ kind: 'info' | 'caution' | 'error'; text: string } | null>(null);
  const canceled = useRef(false);

  const run = async (mode: 'share' | 'save') => {
    canceled.current = false;
    setOutcome(null);
    setProgress({ done: 0, total: ids.length });
    try {
      const r = await exportMany(s, ids, label, (done, total) => setProgress({ done, total }), () => canceled.current);
      if (!r) {
        setOutcome(canceled.current ? { kind: 'caution', text: 'Export canceled. Nothing was saved.' } : { kind: 'error', text: 'None of these records could be read.' });
        return;
      }
      const o = mode === 'share' ? await shareBytes(r.name, r.bytes, 'application/zip', 'Share evidence packages') : await saveBytes(r.name, r.bytes, 'application/zip');
      const skipped = r.skipped.length ? ` ${r.skipped.length} record(s) could not be read and were left out.` : '';
      setOutcome({ kind: o.status === 'Canceled' ? 'caution' : o.status === 'Sharing unavailable' ? 'error' : 'info', text: `${o.status}: ${r.exported} evidence package${r.exported === 1 ? '' : 's'} in one ZIP. ${o.detail}${skipped}` });
      for (const id of ids) if (o.status !== 'Canceled') s.notebook.logExport(id, 'evidence:batch', o.status, null).catch(() => {});
    } catch (e) {
      log('error', 'export.batch', (e as Error).message);
      setOutcome({ kind: 'error', text: `Export failed: ${(e as Error).message}` });
    } finally {
      setProgress(null);
    }
  };

  return (
    <View style={{ gap: SPACE.s }}>
      {progress ? (
        <View style={{ gap: SPACE.s }}>
          <T v="small" accessibilityLiveRegion="polite">{`Preparing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`}</T>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: c.border }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: c.primary, width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
          </View>
          <Button kind="secondary" label="Cancel export" onPress={() => (canceled.current = true)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
          {NATIVE_SHARE && <Button kind="secondary" label="Share evidence ZIP" icon={<Share2 size={18} color={c.primary} />} disabled={!ids.length} onPress={() => run('share')} />}
          <Button kind="secondary" label="Save evidence ZIP" icon={<Download size={18} color={c.primary} />} disabled={!ids.length} onPress={() => run('save')} />
        </View>
      )}
      <T v="caption" color={c.text2}>
        Default public disclosure for each record: no photographer position, month-level dates, no private notes, reviewed photos only.
      </T>
      {outcome && (
        <Banner kind={outcome.kind} action={<Button kind="ghost" label="Dismiss" onPress={() => setOutcome(null)} />}>
          {outcome.text}
        </Banner>
      )}
    </View>
  );
}
