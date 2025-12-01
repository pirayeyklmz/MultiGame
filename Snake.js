import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 📌 Ayar context'i
import { useSettings } from "./settings";
// 📌 Geri butonu (Sudoku ve Minesweeper'dakiyle aynı yol)
import BackButton from "./backbutton";

const { width: WINDOW_WIDTH } = Dimensions.get("window");

// Seviye ayarları
const LEVELS = {
  Kolay: { grid: 10, foodSize: 10 },
  Orta: { grid: 15, foodSize: 6 },
  Zor: { grid: 20, foodSize: 4 },
};

// defaultLevelIndex → seviye ismi için mapping
const LEVEL_NAMES = ["Kolay", "Orta", "Zor"];

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};


function initialSnake(gridSize) {
  return [
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2) - 1, y: Math.floor(gridSize / 2) },
  ];
}

function randomFood(currentSnake, gridSize) {
  const occupied = new Set(currentSnake.map((p) => `${p.x},${p.y}`));
  let x, y;
  do {
    x = Math.floor(Math.random() * gridSize);
    y = Math.floor(Math.random() * gridSize);
  } while (occupied.has(`${x},${y}`));
  return { x, y };
}

// -----------------------------
// Ana bileşen
// -----------------------------
export default function Snake() {
  const { settings, currentTheme } = useSettings();
  const isDark = settings.theme === "dark";

  // Ayarlardaki defaultLevelIndex'ten başlangıç seviyesi
  const initialLevelName = LEVEL_NAMES[settings.defaultLevelIndex] || "Orta";

  const [level, setLevel] = useState(initialLevelName);
  const [GRID_SIZE, setGridSize] = useState(LEVELS[initialLevelName].grid);
  const [CELL_SIZE, setCellSize] = useState(
    Math.floor((WINDOW_WIDTH - 32 * 2) / LEVELS[initialLevelName].grid)
  );

  const [snake, setSnake] = useState(initialSnake(GRID_SIZE));
  const [direction, setDirection] = useState(DIRECTIONS.RIGHT);
  const [food, setFood] = useState(randomFood(initialSnake(GRID_SIZE), GRID_SIZE));
  const [isRunning, setIsRunning] = useState(true);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(200); // ms

  const moveInterval = useRef(null);
  const lastDirectionRef = useRef(direction);
  const directionLockRef = useRef(false);

  // Ayarlardaki varsayılan seviye değişirse Snake seviyesi de değişsin
  useEffect(() => {
    const nextLevel = LEVEL_NAMES[settings.defaultLevelIndex] || "Orta";
    setLevel(nextLevel);
  }, [settings.defaultLevelIndex]);

  // Level değiştiğinde grid ve oyun sıfırlansın
  useEffect(() => {
    const newGrid = LEVELS[level].grid;
    const newCellSize = Math.floor((WINDOW_WIDTH - 32 * 2) / newGrid);
    const startSnake = initialSnake(newGrid);

    setGridSize(newGrid);
    setCellSize(newCellSize);
    setSnake(startSnake);
    setDirection(DIRECTIONS.RIGHT);
    setFood(randomFood(startSnake, newGrid));
    setIsRunning(true);
    setScore(0);
    setSpeed(200);
    stopGameLoop();
    startGameLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    lastDirectionRef.current = direction;
  }, [direction]);

  // Hareket döngüsü
  useEffect(() => {
    startGameLoop();
    return stopGameLoop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snake, direction, isRunning, speed]);

  function startGameLoop() {
    if (!isRunning || moveInterval.current) return;
    moveInterval.current = setInterval(moveSnake, speed);
  }

  function stopGameLoop() {
    if (moveInterval.current) {
      clearInterval(moveInterval.current);
      moveInterval.current = null;
    }
  }

  function resetGame() {
    stopGameLoop();
    const newGrid = LEVELS[level].grid;
    const newCellSize = Math.floor((WINDOW_WIDTH - 32 * 2) / newGrid);
    const startSnake = initialSnake(newGrid);

    setGridSize(newGrid);
    setCellSize(newCellSize);
    setSnake(startSnake);
    setDirection(DIRECTIONS.RIGHT);
    setFood(randomFood(startSnake, newGrid));
    setIsRunning(true);
    setScore(0);
    setSpeed(200);
    startGameLoop();
  }

  function moveSnake() {
    setSnake((prev) => {
      if (prev.length === 0) return prev;
      const head = prev[0];
      const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
      };

      // duvar / kendine çarpma
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE ||
        prev.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
      ) {
        gameOver("Çarpışma!");
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // yemek yeme
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 1);
        setFood(randomFood(newSnake, GRID_SIZE));
        setSpeed((sp) => Math.max(60, sp - 5));

        if (settings.vibrationEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        return newSnake; // kuyruk kesilmez → büyür
      }

      // normal hareket: kuyruk kısalır
      newSnake.pop();
      return newSnake;
    });

    // hareket tamamlandı → yön değiştirmeye tekrar izin ver
    directionLockRef.current = false;
  }

  function gameOver(message) {
    stopGameLoop();
    setIsRunning(false);

    if (settings.vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    Alert.alert("Oyun Bitti", `${message}\nSkor: ${score}`, [
      { text: "Yeniden Başlat", onPress: resetGame },
      { text: "Tamam" },
    ]);
  }

  function changeDirection(newDir) {
    if (directionLockRef.current) return;
    const last = lastDirectionRef.current;
    // ters yöne dönmeyi engelle
    if (last.x + newDir.x === 0 && last.y + newDir.y === 0) return;
    setDirection(newDir);
    lastDirectionRef.current = newDir;
    directionLockRef.current = true;
  }

  function renderCell(x, y) {
    const isHead = snake.length > 0 && snake[0].x === x && snake[0].y === y;
    const isBody = snake.some((p, idx) => idx > 0 && p.x === x && p.y === y);
    const isFood = food.x === x && food.y === y;

    const cellStyle = [
      styles.cell,
      {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: isDark ? "#0c1526" : "#E5EDF8",
      },
    ];

    if (isHead) cellStyle.push(styles.snakeHead);
    else if (isBody) cellStyle.push(styles.snakeBody);
    else if (isFood) {
      cellStyle.push({
        backgroundColor: "#FF4A6E",
        borderRadius: LEVELS[level].foodSize,
      });
    }

    return <View key={`${x}-${y}`} style={cellStyle} />;
  }

  function renderGrid() {
    const rows = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(renderCell(x, y));
      }
      rows.push(
        <View key={`row-${y}`} style={styles.row}>
          {row}
        </View>
      );
    }
    return rows;
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: currentTheme.background },
      ]}
    >
      {/* 🔹 Sudoku ve Minesweeper'daki gibi en üstte geri butonu */}
      <BackButton />

      <Text></Text><Text></Text><Text></Text>

      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: currentTheme.subText }]}>
          Skor: {score}
        </Text>
        <Text style={[styles.infoText, { color: currentTheme.subText }]}>
          Hız: {Math.round(1000 / speed)}
        </Text>
      </View>

      {/* Seviye Seçimi */}
      <View style={styles.levelRow}>
        {Object.keys(LEVELS).map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[
              styles.levelButton,
              {
                backgroundColor:
                  level === lvl ? currentTheme.primary : currentTheme.board,
              },
            ]}
            onPress={() => setLevel(lvl)}
          >
            <Text
              style={[
                styles.levelText,
                { color: level === lvl ? "#FFFFFF" : currentTheme.text },
              ]}
            >
              {lvl}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View
        style={[
          styles.gameArea,
          { backgroundColor: currentTheme.board },
        ]}
      >
        <View style={styles.grid}>{renderGrid()}</View>
      </View>

      {/* Kontroller */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={() => changeDirection(DIRECTIONS.UP)}
            style={[
              styles.controlButton,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text style={[styles.controlText, { color: currentTheme.text }]}>
              ↑
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={() => changeDirection(DIRECTIONS.LEFT)}
            style={[
              styles.controlButton,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text style={[styles.controlText, { color: currentTheme.text }]}>
              ←
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              isRunning ? stopGameLoop() : (setIsRunning(true), startGameLoop())
            }
            style={[
              styles.controlButton,
              styles.centerButton,
              { backgroundColor: currentTheme.primary },
            ]}
          >
            <Text style={[styles.controlText, { color: "#FFFFFF" }]}>
              {isRunning ? "❚❚" : "▶"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeDirection(DIRECTIONS.RIGHT)}
            style={[
              styles.controlButton,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text style={[styles.controlText, { color: currentTheme.text }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={() => changeDirection(DIRECTIONS.DOWN)}
            style={[
              styles.controlButton,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text style={[styles.controlText, { color: currentTheme.text }]}>
              ↓
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={resetGame}
            style={[
              styles.actionButton,
              { backgroundColor: currentTheme.primary },
            ]}
          >
            <Text style={[styles.actionText, { color: "#FFFFFF" }]}>
              Yeniden Başlat
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  infoRow: {
    width: "100%",
    paddingHorizontal: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
  },
  levelRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  levelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 6,
    borderRadius: 6,
  },
  levelText: {
    fontWeight: "600",
  },
  gameArea: {
    width: WINDOW_WIDTH - 32,
    height: WINDOW_WIDTH - 32,
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  grid: {
    flex: 1,
    flexDirection: "column",
    width: "100%",
    height: "100%",
  },
  row: {
    flexDirection: "row",
    width: "100%",
  },
  cell: {
    margin: 0.5,
  },
  snakeHead: {
    backgroundColor: "#5CFF7A",
    borderRadius: 6,
  },
  snakeBody: {
    backgroundColor: "#34D96F",
    borderRadius: 6,
  },
  controls: {
    width: "100%",
    paddingHorizontal: 32,
    alignItems: "center",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 6,
  },
  controlButton: {
    width: 64,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  centerButton: {
    width: 72,
  },
  controlText: {
    fontSize: 22,
    fontWeight: "bold",
  },
  bottomRow: {
    flexDirection: "row",
    marginTop: 12,
    width: "100%",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    fontWeight: "600",
  },
});
