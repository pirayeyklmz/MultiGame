// app/ColorBurst.js
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BackButton from "./backbutton";
import { useSettings } from "./settings";

const { width: WINDOW_WIDTH } = Dimensions.get("window");

// Grid boyutu
const COLS = 10;
const ROWS = 10;

// Renk paleti
const PALETTE_BASE = [
  "#FF4D6D",
  "#FFD24D",
  "#6DF5A7",
  "#5DB7FF",
  "#C07BFF",
  "#FF9E6D",
  "#48E0C1",
  "#FFD9F1",
];

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function pickPalette(n) {
  const p = PALETTE_BASE.slice(0, Math.min(n, PALETTE_BASE.length));
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

function makeGrid(colorsCount) {
  const palette = pickPalette(colorsCount);
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      color: palette[randInt(0, palette.length - 1)],
      locked: false,
    }))
  );
}

function cloneGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function calcMostFrequent(grid) {
  const counts = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (!cell) continue;
      counts[cell.color] = (counts[cell.color] || 0) + 1;
    }
  }
  let bestColor = null;
  let bestCount = 0;
  for (const k in counts) {
    if (counts[k] > bestCount) {
      bestCount = counts[k];
      bestColor = k;
    }
  }
  return { color: bestColor, count: bestCount };
}

function collapseColumns(grid) {
  for (let c = 0; c < COLS; c++) {
    const colArr = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c]) colArr.push(grid[r][c]);
    }
    for (let r = ROWS - 1; r >= 0; r--) {
      grid[r][c] = colArr[ROWS - 1 - r] || null;
    }
  }
}

function refillFromTop(grid, colorsCount) {
  const palette = pickPalette(colorsCount);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (!grid[r][c]) {
        const color = palette[randInt(0, palette.length - 1)];
        grid[r][c] = { color, locked: false };
      }
    }
  }
}

function shuffleColors(grid) {
  const flat = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell && !cell.locked) flat.push(cell.color);
    }
  }
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell && !cell.locked) {
        cell.color = flat[idx++];
      }
    }
  }
}

export default function ColorBurst() {
  const router = useRouter();
  const { settings, currentTheme } = useSettings();
  const isDark = settings.theme === "dark";

  const [grid, setGrid] = useState(() => makeGrid(3));
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [colorsCount, setColorsCount] = useState(3);

  // board boyutu: daha büyük + kenarlardan boşluk
  const boardSize = useMemo(() => {
    const padding = 24;
    return WINDOW_WIDTH - padding * 2; // kenarlarda 24px boşluk
  }, []);

  const innerSize = boardSize - 4; // border/padding payı
  const cellSize = innerSize / COLS;

  function resetGame() {
    setLevel(1);
    setScore(0);
    setColorsCount(3);
    setGrid(makeGrid(3));
  }

  function wrongTapPenalty() {
    setGrid((prev) => {
      const g = cloneGrid(prev);
      shuffleColors(g);
      return g;
    });
    setScore(0);
    if (settings.vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  function handleCorrectTap(colorCount) {
    const gain = colorCount * Math.ceil(10 * (1 + level / 20));
    setScore((prev) => prev + gain);
    if (settings.vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setLevel((prev) => {
      const next = Math.min(100, prev + 1);
      // her 3 levelde bir renk sayısını artır
      setColorsCount((old) => {
        let c = old;
        if (next % 3 === 0 && c < Math.min(8, PALETTE_BASE.length)) {
          c = c + 1;
        }
        return c;
      });
      return next;
    });
  }

  function handleCellPress(r, c) {
    setGrid((prev) => {
      const g = cloneGrid(prev);
      const cell = g[r][c];
      if (!cell) return prev;

      if (cell.locked) {
        wrongTapPenalty();
        return g;
      }

      const most = calcMostFrequent(g);
      if (!most.color) return g;

      if (cell.color === most.color) {
        // doğru renk: o renkten tüm topları patlat
        const targets = [];
        for (let rr = 0; rr < ROWS; rr++) {
          for (let cc = 0; cc < COLS; cc++) {
            const ccell = g[rr][cc];
            if (ccell && !ccell.locked && ccell.color === most.color) {
              targets.push({ rr, cc });
            }
          }
        }
        if (targets.length === 0) return g;

        targets.forEach((t) => {
          g[t.rr][t.cc] = null;
        });

        collapseColumns(g);
        refillFromTop(g, colorsCount);

        handleCorrectTap(targets.length);
        return g;
      } else {
        wrongTapPenalty();
        return g;
      }
    });
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: currentTheme.background },
      ]}
    >
      {/* Üst bar: Back + Scoreboard */}
      <View style={styles.topBar}>
        <BackButton />
        <TouchableOpacity
          style={[
            styles.smallPill,
            { backgroundColor: currentTheme.primary },
          ]}
          onPress={() => router.push("/Scoreboard")}
        >
          <Text style={[styles.smallPillText, { color: "#FFFFFF" }]}>
            ScoreBoard
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Başlık */}
        <Text
          style={[
            styles.title,
            { color: currentTheme.text },
          ]}
        >
          COLOR BURST
        </Text>

        {/* LEVEL & SCORE */}
        <View style={styles.infoRow}>
          <Text
            style={[
              styles.infoText,
              { color: currentTheme.subText },
            ]}
          >
            LEVEL {level}
          </Text>
          <Text
            style={[
              styles.infoText,
              { color: currentTheme.subText },
            ]}
          >
            SCORE: {score}
          </Text>
        </View>

        {/* Oyun alanı */}
        <View
          style={[
            styles.board,
            {
              width: boardSize,
              height: boardSize,
              backgroundColor: isDark ? "#020617" : "#E2E8F0",
              borderColor: isDark ? "#1F2937" : "#CBD5E1",
            },
          ]}
        >
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell, c) => {
                const bg = cell?.color ?? "transparent";
                const isLocked = cell?.locked;
                return (
                  <Pressable
                    key={`${r}-${c}`}
                    onPress={() => handleCellPress(r, c)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.ball,
                        {
                          backgroundColor: bg,
                          opacity: isLocked ? 0.4 : 1,
                          borderColor: isDark
                            ? "rgba(15,23,42,0.5)"
                            : "rgba(148,163,184,0.6)",
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Açıklama + Restart */}
        <View style={styles.bottomPanel}>
          <Text
            style={[
              styles.desc,
              { color: currentTheme.subText },
            ]}
          >
            Tap the color that appears the most on the board. Wrong taps
            shuffle all colors and reset your score.
          </Text>

          <TouchableOpacity
            style={[
              styles.restartBtn,
              { backgroundColor: currentTheme.primary },
            ]}
            onPress={resetGame}
          >
            <Text
              style={[
                styles.restartText,
                { color: "#FFFFFF" },
              ]}
            >
              RESTART
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  smallPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "600",
  },
  board: {
    borderRadius: 12,
    borderWidth: 3,
    padding: 2,
    marginTop: 4,
    marginBottom: 12,
    overflow: "hidden", // toplar çerçevenin dışına taşmasın
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
  },
  ball: {
    width: "82%",
    height: "82%",
    borderRadius: 999,
    borderWidth: 1,
  },
  bottomPanel: {
    width: "100%",
    marginTop: 4,
  },
  desc: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  restartBtn: {
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 24,
  },
  restartText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
