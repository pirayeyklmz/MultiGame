import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 📌 AYARLAR CONTEXT
import { useSettings } from "./settings";
// 📌 Geri butonu
import BackButton from "./backbutton";

const LEVEL_FROM_SETTINGS = [1];

// Renk paleti (tüp içi sıvılar için)
const PALETTES = [
  "#FF6B6B", // 0
  "#FFD93D", // 1
  "#6BCB77", // 2
  "#4D96FF", // 3
  "#9D4EDD", // 4
  "#FF9F1C", // 5
  "#14B8A6", // 6
  "#F97373", // 7
  "#FBBF24", // 8
  "#2DD4BF", // 9
  "#818CF8", // 10
];

// Level ayarları
function getLevelConfig(level) {
  const rows = 4; // her şişede 4 kat
  const colors = Math.min(2 + Math.floor(level / 3), PALETTES.length);
  const bottles = Math.min(colors + 2, 10);
  return { rows, colors, bottles };
}

// Dizi karıştır
function shuffleArray(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cloneBottles(bottles) {
  return bottles.map((b) => [...b]);
}

function topColor(bottles, bottleIndex) {
  const b = bottles[bottleIndex];
  return b.length ? b[b.length - 1] : null;
}

function canPour(from, to, bottles, config) {
  if (from === to) return false;
  if (bottles[from].length === 0) return false;
  if (bottles[to].length === config.rows) return false;

  const color = topColor(bottles, from);
  const toTop = topColor(bottles, to);

  if (toTop === null) return true;
  return toTop === color;
}

function makePour(from, to, bottles, config) {
  const fromArr = bottles[from];
  const color = topColor(bottles, from);
  let count = 0;

  for (let i = fromArr.length - 1; i >= 0; i--) {
    if (fromArr[i] === color) count++;
    else break;
  }

  const space = config.rows - bottles[to].length;
  const move = Math.min(count, space);

  for (let i = 0; i < move; i++) {
    bottles[to].push(fromArr.pop());
  }
}

function isLevelCompleted(bottles, config) {
  return bottles.every(
    (b) =>
      b.length === 0 ||
      (b.length === config.rows && b.every((x) => x === b[0]))
  );
}

export default function WaterSort() {
  const { settings, currentTheme } = useSettings();
  const isDark = settings.theme === "dark";

  const [level, setLevel] = useState(1); // Her zaman Level 1'den başla

  const [bottles, setBottles] = useState([]);
  const [selected, setSelected] = useState(-1);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const config = getLevelConfig(level);

  // Ayarlardaki default zorluk değiştiğinde level'i güncelle
  useEffect(() => {
    const nextLevel =
      LEVEL_FROM_SETTINGS[settings.defaultLevelIndex] ?? 1;
    setLevel(nextLevel);
  }, [settings.defaultLevelIndex]);

  // Level değiştiğinde yeni level kur
  useEffect(() => {
    initLevel(level);
  }, [level]);

  const initLevel = (lvl) => {
    const cfg = getLevelConfig(lvl);

    const colours = [];
    for (let i = 0; i < cfg.colors; i++) {
      for (let j = 0; j < cfg.rows; j++) {
        colours.push(i);
      }
    }

    const shuffled = shuffleArray(colours);

    const newBottles = [];
    for (let i = 0; i < cfg.bottles; i++) {
      newBottles.push([]);
    }

    let idx = 0;
    for (let b = 0; b < cfg.colors; b++) {
      while (newBottles[b].length < cfg.rows && idx < shuffled.length) {
        newBottles[b].push(shuffled[idx++]);
      }
    }

    setBottles(newBottles);
    setSelected(-1);
    setHistory([]);
    setStatus("");
    setIsCompleted(false);
  };

  const handleBottlePress = async (index) => {
    if (isCompleted) return;

    if (selected === -1) {
      if (bottles[index].length === 0) return;
      setSelected(index);
      setStatus("");
    } else if (selected === index) {
      setSelected(-1);
      setStatus("");
    } else {
      const from = selected;
      const to = index;

      if (!canPour(from, to, bottles, config)) {
        setSelected(-1);
        setStatus("Bu hamle geçerli değil.");

        if (settings.vibrationEnabled) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
        }
        return;
      }

      const prev = cloneBottles(bottles);
      const next = cloneBottles(bottles);

      makePour(from, to, next, config);

      if (settings.vibrationEnabled) {
        await Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Medium
        );
      }

      setBottles(next);
      setHistory((h) => [...h, prev]);
      setSelected(-1);

      if (isLevelCompleted(next, config)) {
        setStatus(`Tebrikler! Level ${level} tamamlandı.`);
        setIsCompleted(true);

        if (settings.vibrationEnabled) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        }
      } else {
        setStatus("");
      }
    }
  };

  const handleReset = async () => {
    initLevel(level);
    if (settings.vibrationEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleShuffle = async () => {
    const cfg = config;
    const items = [];
    const cleared = bottles.map((b) => {
      const copy = [...b];
      items.push(...copy);
      return [];
    });
    const shuffled = shuffleArray(items);

    const newBottles = cleared.map((b) => [...b]);
    let idx = 0;
    for (let b = 0; b < cfg.colors; b++) {
      while (newBottles[b].length < cfg.rows && idx < shuffled.length) {
        newBottles[b].push(shuffled[idx++]);
      }
    }

    setBottles(newBottles);
    setSelected(-1);
    setHistory([]);
    setStatus("");
    setIsCompleted(false);

    if (settings.vibrationEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const prevHistory = [...history];
    const last = prevHistory.pop();
    setHistory(prevHistory);
    setBottles(last);
    setSelected(-1);
    setStatus("");
    setIsCompleted(isLevelCompleted(last, config));

    if (settings.vibrationEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNextLevel = async () => {
    setLevel((prev) => prev + 1);
    if (settings.vibrationEnabled) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: currentTheme.background },
      ]}
    >
      {/* 🔹 Geri butonu: diğer oyunlar gibi en üstte */}
      <BackButton /><Text></Text><Text></Text><Text></Text>
      <Text
        style={[
          styles.title,
          { color: currentTheme.text, marginTop: 8 },
        ]}
      >
        Water Sort
      </Text>
      <Text
        style={[
          styles.levelText,
          { color: currentTheme.subText, marginTop: 2 },
        ]}
      >
        Level {level}
      </Text>

      <ScrollView
        contentContainerStyle={styles.boardScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.board}>
          {bottles.map((bottle, i) => (
            <Pressable
              key={i.toString()}
              style={[
                styles.bottleWrapper,
                selected === i && {
                  borderWidth: 2,
                  borderColor: currentTheme.primary,
                },
              ]}
              onPress={() => handleBottlePress(i)}
            >
              <View
                style={[
                  styles.bottle,
                  {
                    borderColor: isDark ? "#4b5563" : "#CBD5E1",
                    backgroundColor: isDark
                      ? "#020617"
                      : "#F9FAFB",
                  },
                ]}
              >
                {Array.from({ length: config.rows }).map(
                  (_, rowIndexFromTop) => {
                    const row = config.rows - 1 - rowIndexFromTop;
                    const colorIndex = bottle[row];
                    const hasColor =
                      typeof colorIndex !== "undefined";

                    return (
                      <View
                        key={rowIndexFromTop}
                        style={[
                          styles.layer,
                          hasColor && {
                            backgroundColor: PALETTES[colorIndex],
                          },
                          !hasColor && styles.layerEmpty,
                        ]}
                      />
                    );
                  }
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.controlsContainer,
          { backgroundColor: "transparent" },
        ]}
      >
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: currentTheme.primary },
            ]}
            onPress={handleReset}
          >
            <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
              Reset
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: currentTheme.board },
            ]}
            onPress={handleShuffle}
          >
            <Text
              style={[
                styles.buttonText,
                { color: currentTheme.text },
              ]}
            >
              Shuffle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: currentTheme.board },
            ]}
            onPress={handleUndo}
          >
            <Text
              style={[
                styles.buttonText,
                { color: currentTheme.text },
              ]}
            >
              Undo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statusContainer}>
        {status !== "" && (
          <Text
            style={[
              styles.statusText,
              { color: currentTheme.subText },
            ]}
          >
            {status}
          </Text>
        )}
        {isCompleted && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.nextLevelButton,
              { backgroundColor: currentTheme.primary },
            ]}
            onPress={handleNextLevel}
          >
            <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
              Sonraki Level
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.levelText, { color: "transparent" }]}> </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  levelText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  boardScroll: {
    paddingBottom: 6,
  },
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingBottom: 0,
  },
  statusContainer: {
    marginTop: 4,
    marginBottom: 10,
    alignItems: "center",
  },
  bottleWrapper: {
    margin: 8,
    padding: 4,
    borderRadius: 16,
  },
  bottle: {
    width: 50,
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  layer: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: "rgba(15,23,42,0.4)",
  },
  layerEmpty: {
    backgroundColor: "transparent",
  },
  statusText: {
    fontSize: 14,
    textAlign: "center",
  },
  nextLevelButton: {
    width: "60%",
    marginTop: 4,
  },
});
