import { useEffect } from 'react';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { DataProvider } from '../providers/DataProvider';
import { SocialProvider } from '../providers/SocialProvider';
import { theme } from '../theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const { user, loading, userProfile, isAdmin } = useAuth();
    const segments = useSegments();
    const inAuth = segments[0] === '(auth)';

    useEffect(() => {
        if (!loading) SplashScreen.hideAsync();
    }, [loading]);

    useEffect(() => {
        const t = setTimeout(() => SplashScreen.hideAsync(), 800);
        return () => clearTimeout(t);
    }, []);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    if (!user && !inAuth) return <Redirect href="/(auth)/login" />;
    if (user && !isAdmin && userProfile?.status && userProfile.status !== 'approved' && !inAuth) return <Redirect href="/(auth)/pending" />;
    if (user && userProfile && (isAdmin || !userProfile.status || userProfile.status === 'approved') && inAuth) return <Redirect href="/(tabs)" />;

    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
            animation: 'slide_from_right',
        }}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="details/[type]/[id]" />
            <Stack.Screen name="player" options={{ animation: 'slide_from_bottom', gestureEnabled: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="search" options={{ animation: 'fade', presentation: 'modal' }} />
            <Stack.Screen name="mood" options={{ animation: 'fade', presentation: 'modal' }} />
            <Stack.Screen name="friend-profile" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaProvider>
                <AuthProvider>
                    <DataProvider>
                        <SocialProvider>
                            <StatusBar style="light" />
                            <RootNavigator />
                        </SocialProvider>
                    </DataProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
});
