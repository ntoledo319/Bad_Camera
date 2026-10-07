/** Design-system primitives. All touch targets ≥ 48; text scales with system font size. */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { RADIUS, SIZE, SPACE, TYPE } from './tokens';

type Variant = keyof typeof TYPE;

export function T({
  v = 'body',
  color,
  style,
  children,
  center,
  ...rest
}: { v?: Variant; color?: string; style?: StyleProp<TextStyle>; children?: React.ReactNode; center?: boolean } & React.ComponentProps<typeof Text>) {
  const { c } = useTheme();
  const role = v === 'display' || v === 'title' || v === 'heading' ? 'header' : undefined;
  return (
    <Text accessibilityRole={role} maxFontSizeMultiplier={2.2} style={[TYPE[v], { color: color ?? c.text }, center && { textAlign: 'center' }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Screen({ children, scroll = true, padded = true, style }: { children: React.ReactNode; scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c, gutter } = useTheme();
  const insets = useSafeAreaInsets();
  const inner = [{ paddingHorizontal: padded ? gutter : 0, paddingBottom: SPACE.xxxl + insets.bottom, paddingTop: SPACE.l, gap: SPACE.l }, style];
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.canvas }, inner]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.canvas }} contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel, accessibilityHint }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; accessibilityHint?: string }) {
  const { c } = useTheme();
  const base = [{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: RADIUS.card, padding: SPACE.l, gap: SPACE.s }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  busy,
  accessibilityHint,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.primary : kind === 'danger' ? c.errorBg : kind === 'secondary' ? c.surface : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'danger' ? c.error : c.primary;
  const border = kind === 'secondary' ? c.borderStrong : kind === 'danger' ? c.error : 'transparent';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      style={({ pressed }) => [
        { minHeight: SIZE.button, borderRadius: RADIUS.control, backgroundColor: bg, borderColor: border, borderWidth: kind === 'ghost' ? 0 : 1.5, paddingHorizontal: kind === 'ghost' ? SPACE.m : SPACE.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACE.s },
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon}
      <Text maxFontSizeMultiplier={2} style={[TYPE.body, { color: fg, fontWeight: '600', textAlign: 'center' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ label, onPress, children, style }: { label: string; onPress: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [{ width: SIZE.minTarget, height: SIZE.minTarget, borderRadius: RADIUS.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }, pressed && { opacity: 0.7 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, count }: { label: string; selected?: boolean; onPress: () => void; count?: number }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      style={({ pressed }) => [
        { minHeight: 40, paddingHorizontal: SPACE.l, borderRadius: RADIUS.chip, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginVertical: 4 },
        { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.borderStrong },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text maxFontSizeMultiplier={1.8} style={[TYPE.small, { color: selected ? c.onPrimary : c.text, fontWeight: '600' }]}>
        {label}
        {count != null ? ` · ${count}` : ''}
      </Text>
    </Pressable>
  );
}

export function Banner({ kind = 'info', title, children, action }: { kind?: 'info' | 'caution' | 'error' | 'demo'; title?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  const { c } = useTheme();
  const bg = kind === 'error' ? c.errorBg : kind === 'info' ? c.primarySoft : c.cautionBg;
  const fg = kind === 'error' ? c.error : kind === 'info' ? c.text : c.caution;
  return (
    <View accessibilityRole={kind === 'error' ? 'alert' : undefined} style={{ backgroundColor: bg, borderRadius: RADIUS.control, padding: SPACE.m, gap: SPACE.xs, borderWidth: 1, borderColor: kind === 'info' ? c.border : fg }}>
      {title ? <T v="small" color={fg} style={{ fontWeight: '700' }}>{title}</T> : null}
      {typeof children === 'string' ? <T v="small" color={kind === 'info' ? c.text : fg}>{children}</T> : children}
      {action}
    </View>
  );
}

export function DemoBanner() {
  return <Banner kind="demo" title="DEMONSTRATION — NOT A REAL SIGHTING">Bundled sample data for trying the app. It never mixes with real records.</Banner>;
}

export function Field({ label, hint, error, style, ...rest }: { label: string; hint?: string; error?: string | null } & TextInputProps) {
  const { c } = useTheme();
  return (
    <View style={{ gap: SPACE.xs }}>
      <T v="small" style={{ fontWeight: '600' }}>{label}</T>
      {hint ? <T v="caption" color={c.text2}>{hint}</T> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={c.text2}
        maxFontSizeMultiplier={2}
        style={[TYPE.body, { minHeight: SIZE.minTarget, borderRadius: RADIUS.control, borderWidth: 1.5, borderColor: error ? c.error : c.borderStrong, paddingHorizontal: SPACE.m, paddingVertical: SPACE.s, color: c.text, backgroundColor: c.surface }, style]}
        {...rest}
      />
      {error ? <T v="caption" color={c.error} accessibilityRole="alert">{error}</T> : null}
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange, label }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; label: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          accessibilityRole="radio"
          accessibilityState={{ checked: o.key === value }}
          accessibilityLabel={o.label}
          style={{ minHeight: SIZE.minTarget, paddingHorizontal: SPACE.l, borderRadius: RADIUS.control, borderWidth: 1.5, justifyContent: 'center', backgroundColor: o.key === value ? c.primary : c.surface, borderColor: o.key === value ? c.primary : c.borderStrong }}
        >
          <Text maxFontSizeMultiplier={1.8} style={[TYPE.small, { fontWeight: '600', color: o.key === value ? c.onPrimary : c.text }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{ minHeight: SIZE.minTarget, flexDirection: 'row', alignItems: 'center', gap: SPACE.m, paddingVertical: SPACE.xs }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body">{label}</T>
        {hint ? <T v="caption" color={c.text2}>{hint}</T> : null}
      </View>
      <View style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: value ? c.primary : c.border, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: value ? c.onPrimary : c.surface, borderWidth: 1, borderColor: c.borderStrong }} />
      </View>
    </Pressable>
  );
}

export function Row({ title, subtitle, onPress, right, left, accessibilityHint }: { title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode; left?: React.ReactNode; accessibilityHint?: string }) {
  const { c } = useTheme();
  const content = (
    <>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="body" style={{ fontWeight: '600' }}>{title}</T>
        {subtitle ? <T v="small" color={c.text2}>{subtitle}</T> : null}
      </View>
      {right ?? (onPress ? <T v="heading" color={c.text2} aria-hidden>›</T> : null)}
    </>
  );
  const style = { minHeight: 56, flexDirection: 'row' as const, alignItems: 'center' as const, gap: SPACE.m, paddingVertical: SPACE.s };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} accessibilityHint={accessibilityHint} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.border }} />;
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: SPACE.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T v="caption" color={c.text2} accessibilityRole="header" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</T>
        {action}
      </View>
      {children}
    </View>
  );
}

export function KV({ k, v, muted }: { k: string; v: string | null | undefined; muted?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 2, paddingVertical: 4 }} accessible accessibilityLabel={`${k}: ${v ?? 'Not established'}`}>
      <T v="caption" color={c.text2}>{k}</T>
      <T v="body" color={v ? (muted ? c.text2 : c.text) : c.text2}>{v ?? 'Not established'}</T>
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: SPACE.m, paddingVertical: SPACE.xxl }}>
      <T v="heading" center>{title}</T>
      <T v="body" color={c.text2} center>{body}</T>
      {action}
    </View>
  );
}

export function Loading({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: SPACE.xl, alignItems: 'center', gap: SPACE.m }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.primary} />
      <T v="small" color={c.text2}>{label}</T>
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'caution' | 'error' }) {
  const { c } = useTheme();
  const map = { neutral: [c.raised, c.text2, c.border], primary: [c.primarySoft, c.text, c.primary], caution: [c.cautionBg, c.caution, c.caution], error: [c.errorBg, c.error, c.error] } as const;
  const [bg, fg, bd] = map[tone];
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.chip, backgroundColor: bg, borderWidth: 1, borderColor: bd }}>
      <Text maxFontSizeMultiplier={1.8} style={[TYPE.caption, { color: fg }]}>{label}</Text>
    </View>
  );
}

export type { PressableProps };
