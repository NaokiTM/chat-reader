// components/ui/bookmark.tsx
import React, { useState } from "react";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  initialActive?: boolean;
  // Controlled mode: pass `active` + `onPress`/`onLongPress` to fully drive
  // the bookmark's state from a parent (used for the save/jump/clear flow).
  // If `active` is omitted, falls back to the original self-toggling API.
  active?: boolean;
  onToggle?: (active: boolean) => void;
  onPress?: () => void;
  onLongPress?: () => void;
};

const VB_WIDTH = 100;
const VB_HEIGHT = 120;
const CORNER_RADIUS = 10;
const NOTCH_DEPTH = 42;
const OUTER_STROKE_WIDTH = 20;
const NOTCH_STROKE_WIDTH = 10;

const w = VB_WIDTH;
const h = VB_HEIGHT;
const r = CORNER_RADIUS;
const midX = w / 2;
const notchY = h - NOTCH_DEPTH;

const FILL_PATH = `
  M ${r} 0
  L ${w - r} 0
  Q ${w} 0 ${w} ${r}
  L ${w} ${h}
  L ${midX} ${notchY}
  L 0 ${h}
  L 0 ${r}
  Q 0 0 ${r} 0
  Z
`;

const OUTER_EDGES_PATH = `
  M 0 ${h}
  L 0 ${r}
  Q 0 0 ${r} 0
  L ${w - r} 0
  Q ${w} 0 ${w} ${r}
  L ${w} ${h}
`;

const NOTCH_PATH = `
  M 0 ${h}
  L ${midX} ${notchY}
  L ${w} ${h}
`;

export function Bookmark({
  size = 28,
  activeColor = "white",
  inactiveColor = "white",
  initialActive = false,
  active: activeProp,
  onToggle,
  onPress,
  onLongPress,
}: Props) {
  const isControlled = activeProp !== undefined;
  const [internalActive, setInternalActive] = useState(initialActive);
  const active = isControlled ? activeProp : internalActive;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    // Original uncontrolled toggle behavior, kept for any other usages.
    const next = !active;
    if (!isControlled) setInternalActive(next);
    onToggle?.(next);
  };

  const height = size * (VB_HEIGHT / VB_WIDTH);
  const color = active ? activeColor : inactiveColor;

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress} style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox={`0 0 ${w} ${h}`}>
        <Path d={FILL_PATH} fill={active ? activeColor : "transparent"} />
        <Path
          d={OUTER_EDGES_PATH}
          fill="none"
          stroke={color}
          strokeWidth={OUTER_STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={NOTCH_PATH}
          fill="none"
          stroke={color}
          strokeWidth={NOTCH_STROKE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}