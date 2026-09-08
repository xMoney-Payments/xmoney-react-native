import {type ReactNode} from 'react';
import {View, type ViewStyle} from 'react-native';
import Svg, {Path, SvgXml} from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

function Box({size, children}: {size: number; children: ReactNode}) {
  return (
    <View style={{width: size, height: size}} accessibilityElementsHidden>
      {children}
    </View>
  );
}

function Stroke({
  color,
  style,
}: {
  color: string;
  style: ViewStyle;
}) {
  return <View style={[{backgroundColor: color, position: 'absolute'}, style]} />;
}

/** Outlined chevron pointing left — SF `chevron.left`. */
export function IconChevronLeft({color, size = 22}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden>
      <Path
        d="M15 6 L9 12 L15 18"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconChevronRight({color, size = 22}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden>
      <Path
        d="M9 6 L15 12 L9 18"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** SF `sun.max` / Material LightMode. */
export function IconSun({color, size = 22}: IconProps) {
  const t = Math.max(1.5, size * 0.08);
  const core = size * 0.38;
  const ray = size * 0.16;
  const inset = (size - core) / 2;
  const rays: Array<{left: number; top: number; width: number; height: number; rotate?: string}> = [
    {left: (size - t) / 2, top: 0, width: t, height: ray},
    {left: (size - t) / 2, top: size - ray, width: t, height: ray},
    {left: 0, top: (size - t) / 2, width: ray, height: t},
    {left: size - ray, top: (size - t) / 2, width: ray, height: t},
  ];
  return (
    <Box size={size}>
      <View
        style={{
          position: 'absolute',
          left: inset,
          top: inset,
          width: core,
          height: core,
          borderRadius: core / 2,
          borderWidth: t,
          borderColor: color,
        }}
      />
      {rays.map((rayStyle, i) => (
        <Stroke key={i} color={color} style={{...rayStyle, borderRadius: t}} />
      ))}
      <View
        style={{
          position: 'absolute',
          width: ray,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          left: size * 0.12,
          top: size * 0.16,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: ray,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          right: size * 0.12,
          top: size * 0.16,
          transform: [{rotate: '-45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: ray,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          left: size * 0.12,
          bottom: size * 0.16,
          transform: [{rotate: '-45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: ray,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          right: size * 0.12,
          bottom: size * 0.16,
          transform: [{rotate: '45deg'}],
        }}
      />
    </Box>
  );
}

/** SF `moon` / Material DarkMode. */
export function IconMoon({
  color,
  size = 22,
  cutout,
}: IconProps & {cutout?: string}) {
  if (cutout) {
    return (
      <Box size={size}>
        <View
          style={{
            position: 'absolute',
            left: size * 0.2,
            top: size * 0.12,
            width: size * 0.62,
            height: size * 0.76,
            borderRadius: size * 0.38,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.4,
            top: size * 0.06,
            width: size * 0.54,
            height: size * 0.64,
            borderRadius: size * 0.32,
            backgroundColor: cutout,
          }}
        />
      </Box>
    );
  }
  const t = Math.max(1.5, size * 0.09);
  return (
    <Box size={size}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.18,
          top: size * 0.1,
          width: size * 0.64,
          height: size * 0.8,
          borderRadius: size * 0.4,
          borderWidth: t,
          borderColor: color,
        }}
      />
    </Box>
  );
}

/** SF `bag` / Material ShoppingBag. */
export function IconBag({color, size = 22}: IconProps) {
  const t = Math.max(1.5, size * 0.08);
  return (
    <Box size={size}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.14,
          top: size * 0.32,
          width: size * 0.72,
          height: size * 0.56,
          borderRadius: size * 0.12,
          borderWidth: t,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.3,
          top: size * 0.12,
          width: size * 0.4,
          height: size * 0.28,
          borderTopLeftRadius: size * 0.22,
          borderTopRightRadius: size * 0.22,
          borderWidth: t,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
    </Box>
  );
}

export function IconPlus({color, size = 16}: IconProps) {
  const t = Math.max(1.5, size * 0.12);
  return (
    <Box size={size}>
      <Stroke
        color={color}
        style={{
          left: (size - t) / 2,
          top: size * 0.18,
          width: t,
          height: size * 0.64,
          borderRadius: t,
        }}
      />
      <Stroke
        color={color}
        style={{
          top: (size - t) / 2,
          left: size * 0.18,
          height: t,
          width: size * 0.64,
          borderRadius: t,
        }}
      />
    </Box>
  );
}

export function IconMinus({color, size = 16}: IconProps) {
  const t = Math.max(1.5, size * 0.12);
  return (
    <Box size={size}>
      <Stroke
        color={color}
        style={{
          top: (size - t) / 2,
          left: size * 0.18,
          height: t,
          width: size * 0.64,
          borderRadius: t,
        }}
      />
    </Box>
  );
}

export function IconCheck({color, size = 28}: IconProps) {
  const t = Math.max(2, size * 0.1);
  return (
    <Box size={size}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.18,
          top: size * 0.48,
          width: size * 0.28,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.32,
          top: size * 0.38,
          width: size * 0.52,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          transform: [{rotate: '-48deg'}],
        }}
      />
    </Box>
  );
}

export function IconClose({color, size = 28}: IconProps) {
  const t = Math.max(2, size * 0.1);
  const len = size * 0.56;
  return (
    <Box size={size}>
      <View
        style={{
          position: 'absolute',
          left: (size - len) / 2,
          top: (size - t) / 2,
          width: len,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: (size - len) / 2,
          top: (size - t) / 2,
          width: len,
          height: t,
          backgroundColor: color,
          borderRadius: t,
          transform: [{rotate: '-45deg'}],
        }}
      />
    </Box>
  );
}

/** SF `doc.on.doc` / Material ContentCopy. */
export function IconCopy({color, size = 18}: IconProps) {
  const t = Math.max(1.4, size * 0.08);
  return (
    <Box size={size}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.08,
          top: size * 0.22,
          width: size * 0.58,
          height: size * 0.68,
          borderRadius: 3,
          borderWidth: t,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.32,
          top: size * 0.08,
          width: size * 0.58,
          height: size * 0.68,
          borderRadius: 3,
          borderWidth: t,
          borderColor: color,
        }}
      />
    </Box>
  );
}

// Native wordmark SVG (fill is replaced at render time).
// eslint-disable-next-line quotes -- raw SVG markup
const WORDMARK_SVG = `<svg width="64" height="16" viewBox="0 0 64 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.11367 4.1321L9.23374 1.91816L8.54108 0.579102L4.76839 2.11389C4.67125 2.15346 4.56355 2.15346 4.46641 2.11389L0.692663 0.580171L0 1.91816L4.12008 4.1321L0 6.34604L0.692663 7.6851L4.46535 6.15032C4.56249 6.11074 4.67019 6.11074 4.76733 6.15032L8.54002 7.6851L9.23269 6.34604L5.11261 4.1321H5.11367Z" fill="#000000"></path><path d="M11.8306 11.8206V1.45142H14.4226L17.7316 9.40355L21.059 1.45142H23.5407V11.8206H21.9046V3.03815L18.228 11.8759H17.0514L13.4115 3.0935V11.8206H11.8306Z" fill="#000000"></path><path d="M29.6124 2.48464C32.3147 2.48464 34.392 4.55109 34.392 7.2633C34.392 9.97552 32.3147 12.042 29.6124 12.042C26.8917 12.042 24.8327 9.97552 24.8327 7.2633C24.8327 4.55109 26.8917 2.48464 29.6124 2.48464ZM29.6124 10.4921C31.4323 10.4921 32.664 9.07145 32.664 7.2633C32.664 5.45516 31.4323 4.03448 29.6124 4.03448C27.7924 4.03448 26.5608 5.47361 26.5608 7.2633C26.5608 9.053 27.7924 10.4921 29.6124 10.4921Z" fill="#000000"></path><path d="M35.3257 11.8206V2.70605H36.9986V4.38504C37.3663 3.64702 38.3957 2.50309 40.087 2.50309C42.3849 2.50309 43.9659 4.23743 43.9659 6.58064V11.8206H42.2746V6.89429C42.2746 5.1784 41.2451 4.05293 39.6825 4.05293C38.0648 4.05293 36.9986 5.23376 36.9986 6.89429V11.8206H35.3257Z" fill="#000000"></path><path d="M49.4136 2.48464C52.0792 2.48464 54.0462 4.47729 54.0462 7.46626H46.4907C46.5826 9.1637 47.7959 10.4921 49.5791 10.4921C51.4174 10.4921 52.116 9.51426 52.2814 9.21905H53.9359C53.8072 9.99397 52.6307 12.042 49.5791 12.042C46.7848 12.042 44.7994 9.93862 44.7994 7.2633C44.7994 4.49574 46.748 2.48464 49.4136 2.48464ZM49.4136 3.92377C47.9613 3.92377 46.9503 4.75404 46.601 6.06402H52.1895C51.7851 4.69869 50.774 3.92377 49.4136 3.92377Z" fill="#000000"></path><path d="M55.6717 15.9535L57.6203 11.6176L53.5025 2.70605H55.396L58.5027 9.64341L61.6095 2.70605H63.3375L57.3813 15.9535H55.6717Z" fill="#000000"></path></svg>`;

/**
 * Native xMoney wordmark, tinted like ExampleWordmark on iOS/Android.
 */
export function ExampleWordmark({color}: {color: string}) {
  return (
    <SvgXml
      xml={WORDMARK_SVG.replace(/#000000/g, color)}
      width={72}
      height={18}
      accessibilityLabel="xMoney"
    />
  );
}
