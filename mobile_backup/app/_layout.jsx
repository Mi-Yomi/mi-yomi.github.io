import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../providers/AuthProvider';
import { DataProvider } from '../providers/DataProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <DataProvider>
                        <StatusBar style="light" />
                        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' }, animation: 'slide_from_right' }}>
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
                            <Stack.Screen name="details/[type]/[id]" />
                            <Stack.Screen name="player" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
                            <Stack.Screen name="search" options={{ animation: 'fade', presentation: 'modal' }} />
                        </Stack>
                    </DataProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
