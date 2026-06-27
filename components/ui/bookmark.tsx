import React, { useState } from "react";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  initialActive?: boolean;
  onToggle?: (active: boolean) => void;
};

const VB_WIDTH = 100;
const VB_HEIGHT = 120;
const CORNER_RADIUS = 10;
const NOTCH_DEPTH = 42;

// Thicker for top/left/right, thinner for the forked bottom edges.
const OUTER_STROKE_WIDTH = 20;
const NOTCH_STROKE_WIDTH = 10;

const w = VB_WIDTH;
const h = VB_HEIGHT;
const r = CORNER_RADIUS;
const midX = w / 2;
const notchY = h - NOTCH_DEPTH;

// Full closed outline — used only for the fill, never stroked directly.
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

// Open path: left edge -> top edge -> right edge. Stops at the two leg tips,
// stroked on its own so its width doesn't interact with the notch.
const OUTER_EDGES_PATH = `
  M 0 ${h}
  L 0 ${r}
  Q 0 0 ${r} 0
  L ${w - r} 0
  Q ${w} 0 ${w} ${r}
  L ${w} ${h}
`;

// Just the V notch, stroked separately and thinner.
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
  onToggle,
}: Props) {
  const [active, setActive] = useState(initialActive);

  const toggle = () => {
    const next = !active;
    setActive(next);
    onToggle?.(next);
  };

  const height = size * (VB_HEIGHT / VB_WIDTH);
  const color = active ? activeColor : inactiveColor;

  return (
    <Pressable onPress={toggle} style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox={`0 0 ${w} ${h}`}>
        {/* fill only, no stroke — avoids double-thickness on overlapping edges */}
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