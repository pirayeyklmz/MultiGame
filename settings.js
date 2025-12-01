import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackButton from "./backbutton";

const STORAGE_KEY = "@global_game_settings_v1";

export const DEFAULT_SETTINGS = {
  theme: "dark",          // 'dark' | 'light'
  defaultLevelIndex: 1,   // 0: Kolay, 1: Orta, 2: Zor
  timerEnabled: true,     // Zaman sayacı açık mı?
  flagModeOnStart: false, // Oyun başlarken bayrak modu açık mı?
  vibrationEnabled: true, // Titreşim
};

export const THEMES = {
  dark: {
    background: "#0B1221",
    board: "#0F1628",
    text: "#FFFFFF",
    subText: "#AEC4DF",
    primary: "#1C88FF",
    danger: "#FF3B5F",
  },
  light: {
    background: "#F4F7FB",
    board: "#FFFFFF",
    text: "#1A2333",
    subText: "#5E6A80",
    primary: "#1C88FF",
    danger: "#FF3B5F",
  },
};

async function loadSettingsFromStorage() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.warn("Settings load error:", e);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettingsToStorage(nextSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  } catch (e) {
    console.warn("Settings save error:", e);
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const loaded = await loadSettingsFromStorage();
        if (mounted) setSettings(loaded);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettingsToStorage(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettingsToStorage(next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, theme: prev.theme === "dark" ? "light" : "dark" };
      saveSettingsToStorage(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettingsToStorage(DEFAULT_SETTINGS);
  }, []);

  const value = {
    settings,
    loading,
    error,
    updateSetting,
    updateSettings,
    toggleTheme,
    resetSettings,
    currentTheme: THEMES[settings.theme] || THEMES.dark,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings hook'u SettingsProvider içinde kullanılmalı.");
  }
  return ctx;
}

// --------------------
// Ayarlar ekranı
// --------------------
export function SettingsScreen() {
  const {
    settings,
    loading,
    updateSetting,
    toggleTheme,
    resetSettings,
    currentTheme,
  } = useSettings();

  const levelLabels = ["EASY", "MIDDLE", "HARD"];

  if (loading) {
    return (
      <View
        style={[
          styles.screenContainer,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <ActivityIndicator size="large" color={currentTheme.primary} />
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

      {/* Başlık */}
      <Text style={[styles.title, { color: currentTheme.text }]}>
        SETTINGS
      </Text>

      {/* Tema */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: currentTheme.text }]}>
          Theme
        </Text>
        <TouchableOpacity style={styles.chip} onPress={toggleTheme}>
          <Text style={styles.chipText}>
            {settings.theme === "dark" ? "DARK" : "LIGHT"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Varsayılan Zorluk */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: currentTheme.text }]}>
          Default Level
        </Text>
        <View style={styles.chipRow}>
          {levelLabels.map((lbl, index) => {
            const active = settings.defaultLevelIndex === index;
            return (
              <TouchableOpacity
                key={lbl}
                onPress={() => updateSetting("defaultLevelIndex", index)}
                style={[
                  styles.levelChip,
                  active && { backgroundColor: currentTheme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && { color: "#FFFFFF" },
                  ]}
                >
                  {lbl}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Zaman sayacı */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: currentTheme.text }]}>
          Timer
        </Text>
        <Switch
          value={settings.timerEnabled}
          onValueChange={(val) => updateSetting("timerEnabled", val)}
        />
      </View>

      {/* Başlangıçta bayrak modu */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: currentTheme.text }]}>
          Flag Mode on Start (Minesweeper)
        </Text>
        <Switch
          value={settings.flagModeOnStart}
          onValueChange={(val) =>
            updateSetting("flagModeOnStart", val)
          }
        />
      </View>

      {/* Titreşim */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: currentTheme.text }]}>
          Vibration
        </Text>
        <Switch
          value={settings.vibrationEnabled}
          onValueChange={(val) =>
            updateSetting("vibrationEnabled", val)
          }
        />
      </View>

      {/* Varsayılanlara dön */}
      <TouchableOpacity
        style={[
          styles.resetButton,
          { borderColor: currentTheme.danger },
        ]}
        onPress={resetSettings}
      >
        <Text
          style={[
            styles.resetText,
            { color: currentTheme.danger },
          ]}
        >
          Back to Default Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2E3B55",
  },
  chipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#2E3B55",
    marginHorizontal: 2,
  },
  resetButton: {
    marginTop: 24,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

// Expo Router, /settings rotası için:
export default SettingsScreen;
