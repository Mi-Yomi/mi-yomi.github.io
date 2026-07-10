import { Tabs } from 'expo-router';
import { HapticTab } from '../../components/HapticTab';
import TabIcon from '../../components/components/TabIcon';
import { theme } from '../../theme';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            animation: 'shift',
            sceneStyle: { backgroundColor: theme.bg },
            tabBarButton: HapticTab,
            tabBarStyle: {
                backgroundColor: 'rgba(20,20,20,0.95)',
                borderTopColor: 'rgba(255,255,255,0.08)',
                borderTopWidth: 1,
                height: 85,
                paddingBottom: 25,
                paddingTop: 8,
            },
            tabBarActiveTintColor: theme.accent,
            tabBarInactiveTintColor: theme.textMuted,
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}>
            <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: ({ color, size, focused }) => <TabIcon name="home" size={size} color={color} focused={focused} /> }} />
            <Tabs.Screen name="tv" options={{ title: 'Сериалы', tabBarIcon: ({ color, size, focused }) => <TabIcon name="tv" size={size} color={color} focused={focused} /> }} />
            <Tabs.Screen name="anime" options={{ title: 'Аниме', tabBarIcon: ({ color, size, focused }) => <TabIcon name="happy" size={size} color={color} focused={focused} /> }} />
            <Tabs.Screen name="manga" options={{ title: 'Манга', tabBarActiveTintColor: theme.orange, tabBarIcon: ({ color, size, focused }) => <TabIcon name="book" size={size} color={color} focused={focused} /> }} />
            <Tabs.Screen name="profile" options={{ title: 'Профиль', tabBarIcon: ({ color, size, focused }) => <TabIcon name="person" size={size} color={color} focused={focused} /> }} />
        </Tabs>
    );
}
