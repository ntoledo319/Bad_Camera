/**
 * S15 Redaction editor. Non-destructive: edits a transformation recipe; the private original
 * is never modified. The preview is the actual rasterized public derivative (masks burned in,
 * metadata stripped) so what you review is exactly what exports.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Undo2, Redo2, RotateCw, Crop, Square, Circle, Eye, Check, RefreshCw } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, IconButton, KV, Loading, Pill, Screen, Section, Segmented, T, Toggle } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import type { Attachment, Transformation } from '../../domain/schemas';
import { renderPublicDerivative, hasSensitiveMetadata } from '../../domain/image';
import { bytesToBase64 } from '../../features/exportService';
import { bytesLabel } from '../../features/format';

type Tool = 'rect' | 'ellipse' | 'crop';
type Box = { x: number; y: number; w: number; h: number };

export default function Redact() {
  const { attachmentId, recordId } = useLocalSearchParams<{ attachmentId: string; recordId: string }>();
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const [att, setAtt] = useState<Attachment | null>(null);
  const [orig, setOrig] = useState<Uint8Array | null>(null);
  const [hist, setHist] = useState<Transformation[][]>([[]]);
  const [pos, setPos] = useState(0);
  const [tool, setTool] = useState<Tool>('rect');
  const [mode, setMode] = useState<'edit' | 'review'>('edit');
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [frame, setFrame] = useState({ w: 1, h: 1 });
  const [drag, setDrag] = useState<Box | null>(null);
  const [saving, setSaving] = useState(false);
  const t = hist[pos];

  useEffect(() => {
    (async () => {
      try {
        const a = await s.notebook.attachment(String(attachmentId));
        if (!a) throw new Error('Photo not found.');
        setAtt(a);
        setHist([a.transformations]);
        setOrig(await s.notebook.attachmentBytes(a.id));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [attachmentId, s.notebook]);

  const push = (next: Transformation[]) => {
    const h = [...hist.slice(0, pos + 1), next];
    setHist(h);
    setPos(h.length - 1);
    setConfirmed(false);
  };

  // Base view: rotation + crop applied (masks drawn on top as overlays while editing).
  const base = useMemo(() => {
    if (!orig) return null;
    try {
      return renderPublicDerivative(orig, t.filter((x) => x.type !== 'mask'), 80);
    } catch (e) {
      setErr(`Could not decode this photo: ${(e as Error).message}`);
      return null;
    }
  }, [orig, t]);
  const final = useMemo(() => {
    if (!orig || mode !== 'review') return null;
    return renderPublicDerivative(orig, t);
  }, [orig, t, mode]);

  const aspect = base ? base.width / base.height : 4 / 3;
  const start = useRef<{ x: number; y: number } | null>(null);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const tRef = useRef(t);
  tRef.current = t;
  const pushRef = useRef(push);
  pushRef.current = push;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          start.current = { x: locationX / frameRef.current.w, y: locationY / frameRef.current.h };
          setDrag({ x: start.current.x, y: start.current.y, w: 0, h: 0 });
        },
        onPanResponderMove: (_e, g) => {
          if (!start.current) return;
          const dx = g.dx / frameRef.current.w;
          const dy = g.dy / frameRef.current.h;
          const x = Math.max(0, Math.min(start.current.x, start.current.x + dx));
          const y = Math.max(0, Math.min(start.current.y, start.current.y + dy));
          setDrag({ x, y, w: Math.min(1 - x, Math.abs(dx)), h: Math.min(1 - y, Math.abs(dy)) });
        },
        onPanResponderRelease: () => {
          setDrag((b) => {
            if (b && b.w > 0.01 && b.h > 0.01) {
              const cur = tRef.current;
              if (toolRef.current === 'crop') {
                // Crop is relative to the rotated original; compose with any existing crop.
                const prev = [...cur].reverse().find((x) => x.type === 'crop') as Extract<Transformation, { type: 'crop' }> | undefined;
                const px = prev?.x ?? 0, py = prev?.y ?? 0, pw = prev?.w ?? 1, ph = prev?.h ?? 1;
                const nc: Transformation = { type: 'crop', x: px + b.x * pw, y: py + b.y * ph, w: b.w * pw, h: b.h * ph };
                // Existing masks are relative to the previous crop; reset them to keep them correct.
                pushRef.current([...cur.filter((x) => x.type === 'rotate'), nc]);
              } else {
                pushRef.current([...cur, { type: 'mask', shape: toolRef.current, ...b }]);
              }
            }
            return null;
          });
          start.current = null;
        },
      }),
    [],
  );

  if (err)
    return (
      <Screen>
        <Banner kind="error">{err}</Banner>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  if (!att || !orig || !base) return <Loading label="Loading private original…" />;

  const masks = t.filter((x) => x.type === 'mask') as Extract<Transformation, { type: 'mask' }>[];
  const rot = t.filter((x) => x.type === 'rotate').reduce((a, x) => (a + (x as { degrees: number }).degrees) % 360, 0);

  const saveRecipe = async (reviewed: boolean) => {
    setSaving(true);
    try {
      await s.notebook.setRedaction(att.id, t, reviewed);
      s.bump();
      router.back();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: mode === 'edit' ? 'Redact photo' : 'Review public photo' }} />
      <Banner kind="info">The private original is never changed. You are editing what a public export would contain.</Banner>
      {mode === 'edit' ? (
        <>
          <Segmented
            label="Tool"
            options={[
              { key: 'rect', label: 'Mask ▭' },
              { key: 'ellipse', label: 'Mask ◯' },
              { key: 'crop', label: 'Crop' },
            ]}
            value={tool}
            onChange={setTool}
          />
          <T v="small" color={c.text2}>
            {tool === 'crop' ? 'Drag across the area to keep. Cropping resets existing masks so they stay aligned.' : 'Drag over faces, licence plates, house numbers or anything identifying. Solid masks are burned into the exported pixels. Rotating resets crop and masks.'}
          </T>
          <View style={{ overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
            <View style={{ transform: [{ scale: zoom }] }}>
              <View
                onLayout={(e: LayoutChangeEvent) => setFrame({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
                style={{ width: '100%', aspectRatio: aspect }}
                {...pan.panHandlers}
                accessibilityLabel="Photo editing area. Drag to draw a mask or crop."
              >
                <Image source={{ uri: `data:image/jpeg;base64,${bytesToBase64(base.bytes)}` }} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
                {masks.map((m, i) => (
                  <View key={i} pointerEvents="none" style={{ position: 'absolute', left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.w * 100}%`, height: `${m.h * 100}%`, backgroundColor: '#172624', borderRadius: m.shape === 'ellipse' ? 9999 : 0 }} />
                ))}
                {drag && <View pointerEvents="none" style={{ position: 'absolute', left: `${drag.x * 100}%`, top: `${drag.y * 100}%`, width: `${drag.w * 100}%`, height: `${drag.h * 100}%`, borderWidth: 2, borderColor: c.primary, backgroundColor: tool === 'crop' ? 'transparent' : 'rgba(23,38,36,0.6)', borderStyle: tool === 'crop' ? 'dashed' : 'solid' }} />}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, justifyContent: 'center' }}>
            <IconButton label="Undo" onPress={() => pos > 0 && setPos(pos - 1)}>
              <Undo2 size={20} color={pos > 0 ? c.primary : c.border} />
            </IconButton>
            <IconButton label="Redo" onPress={() => pos < hist.length - 1 && setPos(pos + 1)}>
              <Redo2 size={20} color={pos < hist.length - 1 ? c.primary : c.border} />
            </IconButton>
            <IconButton label="Rotate 90 degrees clockwise" onPress={() => push([...t.filter((x) => x.type === 'rotate'), { type: 'rotate', degrees: 90 }])}>
              <RotateCw size={20} color={c.primary} />
            </IconButton>
            <IconButton label="Reset all edits" onPress={() => push([])}>
              <RefreshCw size={20} color={c.primary} />
            </IconButton>
            <Button label={zoom > 1 ? 'Zoom out' : 'Zoom in'} kind="ghost" onPress={() => setZoom(zoom > 1 ? 1 : 1.8)} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
            <Pill label={`${masks.length} mask${masks.length === 1 ? '' : 's'}`} />
            <Pill label={`Rotation ${rot}°`} />
            <Pill label={t.some((x) => x.type === 'crop') ? 'Cropped' : 'Not cropped'} />
            {/* icons only for visual consistency */}
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }} accessibilityElementsHidden>
              <Square size={14} color={c.text2} />
              <Circle size={14} color={c.text2} />
              <Crop size={14} color={c.text2} />
            </View>
          </View>
          <Button label="Preview public version" icon={<Eye size={20} color={c.onPrimary} />} onPress={() => setMode('review')} />
          <Button label="Save edits without approving" kind="secondary" busy={saving} onPress={() => saveRecipe(false)} />
        </>
      ) : (
        <>
          {final && (
            <>
              <Image source={{ uri: `data:image/jpeg;base64,${bytesToBase64(final.bytes)}` }} accessibilityLabel="Public derivative preview with masks burned in" style={{ width: '100%', aspectRatio: final.width / final.height, borderRadius: 12 }} resizeMode="contain" />
              <Card>
                <KV k="Public image size" v={`${final.width} × ${final.height} px · ${bytesLabel(final.bytes.length)}`} />
                <KV k="Metadata in public image" v={hasSensitiveMetadata(final.bytes).length ? hasSensitiveMetadata(final.bytes).join(', ') : 'None (EXIF, GPS, XMP, thumbnails removed)'} />
                <KV k="Original filename included" v="No" />
                <KV k="Masks burned into pixels" v={String(masks.length)} />
              </Card>
            </>
          )}
          <Section title="Check before approving">
            <T v="small">Zoom into the preview. Look for faces, licence plates, house numbers, reflections, and people in windows. Masks cannot be removed from the exported image, and blur is never used.</T>
            <Toggle label="I reviewed this image and it is OK to include in public exports" value={confirmed} onChange={setConfirmed} />
          </Section>
          <Button label="Approve for public exports" icon={<Check size={20} color={c.onPrimary} />} disabled={!confirmed} busy={saving} onPress={() => saveRecipe(true)} />
          <Button label="Back to editing" kind="secondary" onPress={() => setMode('edit')} />
          <T v="caption" color={c.text2}>
            Prefer not to include a photo? Exports can use a clean schematic instead. Record: {String(recordId ?? '')}
          </T>
        </>
      )}
    </Screen>
  );
}
