import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
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
            <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
            <Tabs.Screen name="tv" options={{ title: 'Сериалы', tabBarIcon: ({ color, size }) => <Ionicons name="tv" size={size} color={color} /> }} />
            <Tabs.Screen name="anime" options={{ title: 'Аниме', tabBarIcon: ({ color, size }) => <Ionicons name="happy" size={size} color={color} /> }} />
            <Tabs.Screen name="profile" options={{ title: 'Профиль', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
        </Tabs>
    );
}
