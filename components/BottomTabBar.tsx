import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MessageCircle, BookOpen, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme';
import { TabBarItem } from './ui/TabBarItem';

export type TabId = 0 | 1 | 2;

const TABS: Array<{
  id: TabId;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: 0, label: 'TODAY', Icon: Home },
  { id: 1, label: 'TALK', Icon: MessageCircle },
  { id: 2, label: 'JOURNAL', Icon: BookOpen },
];

type Props = {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
};

export function BottomTabBar({ activeTab, onTabPress }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderTopColor: colors['border-subtle'],
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <BlurView
        intensity={20}
        tint="light"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: `${colors['bg-secondary']}F2` },
        ]}
      />
      <View style={styles.row}>
        {TABS.map(({ id, label, Icon }) => (
          <TabBarItem
            key={id}
            icon={Icon}
            label={label}
            active={activeTab === id}
            onPress={() => onTabPress(id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 84,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
