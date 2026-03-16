import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import Svg, { Path, Rect, Polyline, Circle, Line } from 'react-native-svg';
import { View, ActivityIndicator } from 'react-native';

function TabIcon({ name, color, size }) {
    const s = size || 24;
    const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2 };
    if (name === 'home') return <Svg {...props}><Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><Polyline points="9,22 9,12 15,12 15,22" /></Svg>;
    if (name === 'tv') return <Svg {...props}><Rect width="20" height="15" x="2" y="7" rx="2" /><Polyline points="17,2 12,7 7,2" /></Svg>;
    if (name === 'anime') return <Svg {...props}><Circle cx="12" cy="12" r="10" /><Path d="M8 14s1.5 2 4 2 4-2 4-2" /><Line x1="9" y1="9" x2="9.01" y2="9" /><Line x1="15" y1="9" x2="15.01" y2="9" /></Svg>;
    if (name === 'profile') return <Svg {...props}><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><Circle cx="12" cy="7" r="4" /></Svg>;
    return null;
}

export default function TabLayout() {
    const { user, loading, userProfile, isAdmin } = useAuth();

    if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}><ActivityIndicator size="large" color="#e50914" /></View>;
    if (!user) return <Redirect href="/(auth)/login" />;
    if (userProfile && !isAdmin && userProfile.status && userProfile.status !== 'approved') return <Redirect href="/(auth)/pending" />;

    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarStyle: { backgroundColor: 'rgba(20,20,20,0.95)', borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1, height: 80, paddingBottom: 20, paddingTop: 8 },
            tabBarActiveTintColor: '#e50914',
            tabBarInactiveTintColor: '#666',
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        }}>
            <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} /> }} />
            <Tabs.Screen name="tv" options={{ title: 'Сериалы', tabBarIcon: ({ color, size }) => <TabIcon name="tv" color={color} size={size} /> }} />
            <Tabs.Screen name="anime" options={{ title: 'Аниме', tabBarIcon: ({ color, size }) => <TabIcon name="anime" color={color} size={size} /> }} />
            <Tabs.Screen name="profile" options={{ title: 'Профиль', tabBarIcon: ({ color, size }) => <TabIcon name="profile" color={color} size={size} /> }} />
        </Tabs>
    );
}
