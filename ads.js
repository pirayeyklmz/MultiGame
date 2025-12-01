// ads.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import BackButton from "./backbutton";
import { useSettings } from "./settings";

const ADS_STORAGE_KEY = "@multi_game_ads_removed";

export default function Ads() {
    const router = useRouter();
    const { settings, currentTheme } = useSettings();

    const [adsRemoved, setAdsRemoved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Uygulama açıldığında reklamsız durumunu yükle
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(ADS_STORAGE_KEY);
                if (mounted && stored != null) {
                    setAdsRemoved(stored === "true");
                }
            } catch (e) {
                console.warn("Ads load error", e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    async function saveAdsState(value) {
        try {
            await AsyncStorage.setItem(
                ADS_STORAGE_KEY,
                value ? "true" : "false"
            );
        } catch (e) {
            console.warn("Ads save error", e);
        }
    }

    async function handleRemoveAds() {
        setAdsRemoved(true);
        await saveAdsState(true);

        if (settings.vibrationEnabled) {
            await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
            );
        }
    }

    async function handleRestoreAds() {
        setAdsRemoved(false);
        await saveAdsState(false);

        if (settings.vibrationEnabled) {
            await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning
            );
        }
    }

    async function handleBack() {
        if (settings.vibrationEnabled) {
            await Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Light
            );
        }
        router.back();
    }

    if (loading) {
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: currentTheme.background },
                ]}
            >
                <ActivityIndicator
                    size="large"
                    color={currentTheme.primary}
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.screenContainer,
                { backgroundColor: currentTheme.background },
            ]}
        >
            {/* 🔙 Geri butonu (sol üstte, backbutton.js içindeki stil ile) */}
            <BackButton />
            <Text></Text><Text></Text><Text></Text><Text></Text><Text></Text><Text></Text><Text></Text><Text></Text><Text></Text><Text></Text>
            {/* Kart */}
            <View
                style={[
                    styles.card,
                    { backgroundColor: currentTheme.board },
                ]}
            >
                <Text
                    style={[
                        styles.statusLabel,
                        { color: currentTheme.subText },
                    ]}
                >
                    Durum:
                </Text>
                <Text
                    style={[
                        styles.statusText,
                        adsRemoved ? styles.ok : styles.notOk,
                    ]}
                >
                    {adsRemoved
                        ? "Reklamlar kaldırıldı ✔"
                        : "Reklamlar aktif"}
                </Text>

                <Text
                    style={[
                        styles.info,
                        { color: currentTheme.subText },
                    ]}
                >
                    Bu ekran şu an demo / simülasyon amaçlıdır. Gerçek ödeme
                    sistemi bağlandığında bu durum kullanıcı hesabına göre
                    otomatik güncellenecek.
                </Text>

                {adsRemoved ? (
                    <TouchableOpacity
                        style={[
                            styles.button,
                            styles.restoreBtn,
                        ]}
                        onPress={handleRestoreAds}
                    >
                        <Text style={styles.buttonText}>
                            Reklamları Geri Aç
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.button,
                            styles.removeBtn,
                        ]}
                        onPress={handleRemoveAds}
                    >
                        <Text style={styles.buttonText}>
                            Reklamları Kaldır (Simülasyon)
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Geri Dön */}
            <TouchableOpacity
                style={[
                    styles.button,
                    styles.backBtn,
                    { backgroundColor: currentTheme.primary },
                ]}
                onPress={handleBack}
            >
                <Text style={styles.buttonText}>
                    ← Ana Sayfaya Dön
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 20,
    },
    card: {
        width: "100%",
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    statusLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    ok: {
        color: "#22c55e",
    },
    notOk: {
        color: "#f97316",
    },
    info: {
        fontSize: 12,
        marginBottom: 16,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
    },
    removeBtn: {
        backgroundColor: "#22c55e",
    },
    restoreBtn: {
        backgroundColor: "#f97316",
    },
    backBtn: {
        width: "100%",
    },
    buttonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 14,
    },
});
