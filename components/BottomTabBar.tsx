import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { colors } from '../theme';

export type TabId = 0 | 1 | 2 | 3 | 4;

const GOLD = colors.accent;
const DIM  = 'rgba(180,140,90,0.28)';

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H15v-5h-6v5H4a1 1 0 01-1-1V10.5z"
        stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function SessionIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"
        stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function TalkIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function JournalIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth={1.5} />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth={1.5} />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function PenIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const ICONS = [HomeIcon, SessionIcon, TalkIcon, JournalIcon, PenIcon];

type Props = {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
};

export function BottomTabBar({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {ICONS.map((Icon, index) => {
        const isActive = activeTab === index;
        const color = isActive ? GOLD : DIM;
        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            style={styles.tab}
            onPress={() => onTabPress(index as TabId)}
            activeOpacity={0.6}
          >
            <Icon color={color} />
            <View style={[styles.dot, isActive && styles.dotActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingTop: 10,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: GOLD,
  },
});
