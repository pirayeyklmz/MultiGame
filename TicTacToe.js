import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackButton from "./backbutton"; // ⬅️ geri butonu
import { useSettings } from "./settings";

const winConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const scoresMap = { O: 1, X: -1, tie: 0 };

// Ayarlardaki defaultLevelIndex ile eşleşecek Order
const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

export default function TicTacToe() {
  const { settings, currentTheme } = useSettings();
  const isDark = settings.theme === "dark";

  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [running, setRunning] = useState(true);
  const [statusText, setStatusText] = useState("Order: X");

  const [scoreX, setScoreX] = useState(0);
  const [scoreO, setScoreO] = useState(0);
  const [scoreDraw, setScoreDraw] = useState(0);

  const [difficulty, setDifficulty] = useState(
    DIFFICULTY_OPTIONS[settings.defaultLevelIndex] ?? "easy"
  );
  const [winningLine, setWinningLine] = useState([]);

  // Ayarlardaki default zorluk değiştiğinde zorluğu güncelle
  useEffect(() => {
    const next =
      DIFFICULTY_OPTIONS[settings.defaultLevelIndex] ?? "easy";
    setDifficulty(next);
    // İstersen burada otomatik yeni oyun da başlatabilirsin:
    // startGame();
  }, [settings.defaultLevelIndex]);

  useEffect(() => {
    startGame();
  }, []);

  const startGame = () => {
    setBoard(Array(9).fill(""));
    setCurrentPlayer("X");
    setRunning(true);
    setStatusText("Order: X");
    setWinningLine([]);
  };

  const resetScore = async () => {
    setScoreX(0);
    setScoreO(0);
    setScoreDraw(0);
    startGame();

    if (settings.vibrationEnabled) {
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );
    }
  };

  const handleCellPress = async (index) => {
    if (!running || currentPlayer !== "X" || board[index] !== "") return;

    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);

    if (settings.vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (checkWinner("X", newBoard, true)) {
      setScoreX((prev) => prev + 1);
      setStatusText("X kazandı!");
      setRunning(false);

      if (settings.vibrationEnabled) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
      return;
    }

    if (isDraw(newBoard)) {
      setScoreDraw((prev) => prev + 1);
      setStatusText("Beraberlik!");
      setRunning(false);

      if (settings.vibrationEnabled) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }
      return;
    }

    setCurrentPlayer("O");
    setStatusText("Order: O (Bot oynuyor...)");

    // ❗ ÖNEMLİ: botMove’a güncel tahtayı parametre olarak geçiyoruz
    setTimeout(() => {
      botMove(newBoard);
    }, 400);
  };

  // --- Bot hamlesi (artık parametre alıyor)
  const botMove = (currentBoard) => {
    if (!running) return;

    const current = [...currentBoard];
    let move;

    if (difficulty === "easy") {
      move = randomMove(current);
    } else if (difficulty === "medium") {
      move = smartMove(current);
    } else {
      move = bestMove(current);
    }

    if (move == null) return;

    const newBoard = [...current];
    newBoard[move] = "O";
    setBoard(newBoard);

    if (checkWinner("O", newBoard, true)) {
      setScoreO((prev) => prev + 1);
      setStatusText("O kazandı!");
      setRunning(false);

      if (settings.vibrationEnabled) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      }
      return;
    }

    if (isDraw(newBoard)) {
      setScoreDraw((prev) => prev + 1);
      setStatusText("Beraberlik!");
      setRunning(false);

      if (settings.vibrationEnabled) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }
      return;
    }

    setCurrentPlayer("X");
    setStatusText("Order: X");
  };

  // --- Bot stratejileri
  const randomMove = (b) => {
    const empty = b
      .map((val, i) => (val === "" ? i : -1))
      .filter((i) => i !== -1);
    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)];
  };

  const smartMove = (b) => {
    // Önce kazanma hamlesi
    for (let cond of winConditions) {
      const marks = cond.map((i) => b[i]);
      if (
        marks.filter((m) => m === "O").length === 2 &&
        marks.includes("")
      ) {
        return cond[marks.indexOf("")];
      }
    }
    // Sonra bloklama
    for (let cond of winConditions) {
      const marks = cond.map((i) => b[i]);
      if (
        marks.filter((m) => m === "X").length === 2 &&
        marks.includes("")
      ) {
        return cond[marks.indexOf("")];
      }
    }
    // Yoksa rastgele
    return randomMove(b);
  };

  const bestMove = (b) => {
    let bestScore = -Infinity;
    let move = null;
    b.forEach((val, i) => {
      if (val === "") {
        b[i] = "O";
        const score = minimax(b, 0, false);
        b[i] = "";
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    });
    return move;
  };

  const minimax = (b, depth, isMaximizing) => {
    if (checkWinner("O", b, false)) return scoresMap.O;
    if (checkWinner("X", b, false)) return scoresMap.X;
    if (isDraw(b)) return scoresMap.tie;

    if (isMaximizing) {
      let best = -Infinity;
      b.forEach((val, i) => {
        if (val === "") {
          b[i] = "O";
          best = Math.max(best, minimax(b, depth + 1, false));
          b[i] = "";
        }
      });
      return best;
    } else {
      let best = Infinity;
      b.forEach((val, i) => {
        if (val === "") {
          b[i] = "X";
          best = Math.min(best, minimax(b, depth + 1, true));
          b[i] = "";
        }
      });
      return best;
    }
  };

  // --- Yardımcılar
  const checkWinner = (
    mark,
    customBoard = board,
    highlight = false
  ) => {
    for (let cond of winConditions) {
      if (cond.every((i) => customBoard[i] === mark)) {
        if (highlight) {
          setWinningLine(cond);
        }
        return true;
      }
    }
    return false;
  };

  const isDraw = (b) => b.every((cell) => cell !== "");

  const difficultyLabel = (value) => {
    if (value === "easy") return "Easy";
    if (value === "medium") return "Medium";
    return "Hard";
  };

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: currentTheme.background },
        ]}
      >
        {/* 🔙 Geri Butonu */}
        <View style={styles.backWrapper}>
          <BackButton />
        </View>

        {/* Başlık */}
        <View style={styles.header}>
          <Text></Text><Text></Text><Text></Text><Text></Text>
          <Text
            style={[
              styles.title,
              { color: currentTheme.text },
            ]}
          >
            Tic Tac Toe
          </Text>
          <Text></Text>
          <Text
            style={[
              styles.status,
              { color: currentTheme.subText },
            ]}
          >
            {statusText}
          </Text>
        </View>

        {/* Skor Tablosu */}
        <View style={styles.scoreRow}>
          <View
            style={[
              styles.scoreBox,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text
              style={[
                styles.scoreLabel,
                { color: currentTheme.subText },
              ]}
            >
              X
            </Text>
            <Text
              style={[
                styles.scoreValue,
                { color: currentTheme.text },
              ]}
            >
              {scoreX}
            </Text>
          </View>
          <View
            style={[
              styles.scoreBox,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text
              style={[
                styles.scoreLabel,
                { color: currentTheme.subText },
              ]}
            >
              O
            </Text>
            <Text
              style={[
                styles.scoreValue,
                { color: currentTheme.text },
              ]}
            >
              {scoreO}
            </Text>
          </View>
          <View
            style={[
              styles.scoreBox,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text
              style={[
                styles.scoreLabel,
                { color: currentTheme.subText },
              ]}
            >
              Ber.
            </Text>
            <Text
              style={[
                styles.scoreValue,
                { color: currentTheme.text },
              ]}
            >
              {scoreDraw}
            </Text>
          </View>
        </View>

        {/* Zorluk seçimi */}
        <View style={styles.difficultyRow}>
          <Text
            style={[
              styles.diffText,
              { color: currentTheme.text },
            ]}
          >
            Difficulty:
          </Text>
          {["easy", "medium", "hard"].map((lvl) => {
            const active = difficulty === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.diffButton,
                  {
                    borderColor: active
                      ? currentTheme.primary
                      : isDark
                        ? "#374151"
                        : "#CBD5E1",
                    backgroundColor: active
                      ? currentTheme.primary
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  setDifficulty(lvl);
                  startGame();
                }}
              >
                <Text
                  style={[
                    styles.diffButtonText,
                    {
                      color: active
                        ? "#FFFFFF"
                        : currentTheme.text,
                    },
                  ]}
                >
                  {difficultyLabel(lvl)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Oyun tahtası */}
        <View style={styles.board}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.row}>
              {[0, 1, 2].map((col) => {
                const index = row * 3 + col;
                const value = board[index];
                const isWinCell = winningLine.includes(index);
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: currentTheme.board,
                        borderColor: isWinCell
                          ? "#16a34a"
                          : isDark
                            ? "#1f2933"
                            : "#CBD5E1",
                      },
                      isWinCell && styles.cellWin,
                    ]}
                    onPress={() => handleCellPress(index)}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        value === "X" && styles.cellTextX,
                        value === "O" && styles.cellTextO,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Butonlar */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: currentTheme.primary },
            ]}
            onPress={async () => {
              startGame();
              if (settings.vibrationEnabled) {
                await Haptics.impactAsync(
                  Haptics.ImpactFeedbackStyle.Light
                );
              }
            }}
          >
            <Text
              style={[
                styles.buttonText,
                { color: "#FFFFFF" },
              ]}
            >
              Yeni Oyun
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.buttonSecondary,
              { backgroundColor: currentTheme.board },
            ]}
            onPress={resetScore}
          >
            <Text
              style={[
                styles.buttonText,
                { color: currentTheme.text },
              ]}
            >
              Skoru Sıfırla
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backWrapper: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  scoreBox: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  scoreLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  difficultyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  diffText: {
    marginRight: 6,
    fontSize: 14,
  },
  diffButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 3,
  },
  diffButtonText: {
    fontSize: 13,
  },
  board: {
    alignSelf: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 80,
    height: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellWin: {
    backgroundColor: "#16a34a33",
  },
  cellText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  cellTextX: {
    color: "#f97316",
  },
  cellTextO: {
    color: "#38bdf8",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
