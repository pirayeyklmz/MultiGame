import { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// 🔹 Geri butonu
import BackButton from "./backbutton";
// 🔹 Ayar context
import { useSettings } from "./settings";

// 100 words: easy -> medium -> harder -> longest (5..10 letters)
const WORDS = [
  // Levels 1-20: mostly 5 letters (easy)
  "APPLE",
  "WATER",
  "HOUSE",
  "MUSIC",
  "LIGHT",
  "GREEN",
  "STONE",
  "SMILE",
  "PLANT",
  "CLOUD",
  "RIVER",
  "BREAD",
  "HEART",
  "STARS",
  "NIGHT",
  "WORLD",
  "PEACE",
  "LUCKY",
  "MAGIC",
  "DREAM",

  // Levels 21-40: 6 letters (moderate)
  "PLANET",
  "BRIDGE",
  "WINTER",
  "GARDEN",
  "FAMILY",
  "ORBITR",
  "GALAXY",
  "SUMMER",
  "ORCHID",
  "SHADOW",
  "STREAM",
  "AUTUMN",
  "BOTTLE",
  "CANDLE",
  "FOREST",
  "RUBBER",
  "COFFEE",
  "POETRY",
  "CIRCLE",
  "TRAVEL",

  // Levels 41-60: 6-7 letters (mixed)
  "MYSTERY",
  "VIOLETS",
  "HARBOR",
  "CHEESE",
  "HARVEST",
  "CANYONS",
  "SPIRIT",
  "JOURNEY",
  "BALANCE",
  "NETWORK",
  "PORTAL",
  "TEXTURE",
  "MIRACLE",
  "CAPTAIN",
  "ELEMENT",
  "SUNRISE",
  "SWEETER",
  "CAPSTONE",
  "SERPENT",
  "LIBERTY",

  // Levels 61-80: 7-8 letters (harder)
  "HORIZON",
  "TREMBLES",
  "FORTUNE",
  "SHADOWS",
  "ODYSSEYS",
  "MONOLITH",
  "PENDULUM",
  "FIREWALL",
  "STRANGER",
  "GARDENS",
  "CINEMATIC",
  "MOUNTAIN",
  "ECLIPSES",
  "MEANDERS",
  "SAPPHIRE",
  "CRESCENT",
  "WANDERING",
  "BLUEBIRD",
  "STARLIGHT",
  "MOONLIT",

  // Levels 81-90: 8-9 letters (very hard)
  "ADVENTUR",
  "NOTEBOOKS",
  "PSYCHOTIC",
  "LABYRINTH",
  "BREATHEIN",
  "SKYSCRAPE",
  "ASTRONOMY",
  "WILDERNES",
  "UNDERGROW",
  "EVERYTHING",

  // Levels 91-100: 9-10 letters (toughest)
  "IMPERVIOUS",
  "TRANQUILITY",
  "CHARCOALS",
  "INTRICACY",
  "METAMORPH",
  "CONSEQUENCE",
  "POLARIZING",
  "UNFORGIVEN",
  "SPECTRUMS",
  "HALLOWEENS",
];

const TOTAL_LEVELS = 100;
const ROWS = 5;

// ⬇ Klavye (ENTER yok, sadece Bck var)
const KEY_LAYOUT = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", "Bck"],
];

// settings.defaultLevelIndex (0,1,2) → başlangıç level
// 0: kolay (1), 1: orta (21), 2: zor (41)
const LEVEL_FROM_SETTINGS = [1, 21, 41];

// level -> hedef kelime uzunluğu (fallback için)
function computeLengthForLevel(n) {
  if (n <= 30) return 5;
  if (n <= 55) return 6;
  if (n <= 75) return 7;
  if (n <= 90) return 8;
  if (n <= 97) return 9;
  return 10;
}

// level’e göre kelime seç
function pickSolutionForLevel(level) {
  let candidate = WORDS[level - 1];
  if (!candidate) {
    const targetLength = computeLengthForLevel(level);
    const found = WORDS.find((w) => w.length === targetLength);
    candidate = found || WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return candidate.toUpperCase();
}

export default function Wordle() {
  const { settings, currentTheme } = useSettings();
  const isDark = settings.theme === "dark";

  const initialLevel =
    LEVEL_FROM_SETTINGS[settings.defaultLevelIndex] ?? 1;

  const [level, setLevel] = useState(initialLevel);
  const [solution, setSolution] = useState("APPLE");
  const [cols, setCols] = useState(5);

  const [board, setBoard] = useState([]); // rows x cols letters
  const [tileStates, setTileStates] = useState([]); // rows x cols: "idle" | "correct" | "present" | "absent"

  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
  const [finished, setFinished] = useState(false);

  // klavye harf durumu: letter -> "correct" | "present" | "absent"
  const [keyStates, setKeyStates] = useState(() => ({}));

  // overlay mesaj
  const [overlayMessage, setOverlayMessage] = useState("");
  const [overlayType, setOverlayType] = useState("info"); // "win" | "lose" | "info"
  const [overlayVisible, setOverlayVisible] = useState(false);

  // 🔹 Settings’ten default level değişirse level’i güncelle
  useEffect(() => {
    const nextLevel =
      LEVEL_FROM_SETTINGS[settings.defaultLevelIndex] ?? 1;
    setLevel(nextLevel);
  }, [settings.defaultLevelIndex]);

  // level değişince oyunu hazırla
  useEffect(() => {
    initLevel(level);
  }, [level]);

  const initLevel = (lvl) => {
    const word = pickSolutionForLevel(lvl);
    const length = word.length;

    setSolution(word);
    setCols(length);
    setBoard(
      Array.from({ length: ROWS }, () =>
        Array.from({ length }, () => "")
      )
    );
    setTileStates(
      Array.from({ length: ROWS }, () =>
        Array.from({ length }, () => "idle")
      )
    );
    setCurrentRow(0);
    setCurrentCol(0);
    setFinished(false);
    setKeyStates({});
    setOverlayVisible(false);
  };

  const handleKeyPress = (key) => {
    if (finished && !overlayVisible) return;

    if (key === "Bck") {
      handleBackspace();
    } else {
      handleLetter(key);
    }
  };

  const handleLetter = (letter) => {
    if (finished || currentCol >= cols || currentRow >= ROWS) return;
    const L = letter.toUpperCase();
    if (!/^[A-Z]$/.test(L)) return;

    const newBoard = board.map((row) => [...row]);
    newBoard[currentRow][currentCol] = L;
    setBoard(newBoard);
    setCurrentCol((prev) => prev + 1);
  };

  const handleBackspace = () => {
    if (finished || currentCol === 0) return;
    const newBoard = board.map((row) => [...row]);
    const col = currentCol - 1;
    newBoard[currentRow][col] = "";
    setBoard(newBoard);
    setCurrentCol(col);
  };

  // 🔹 Satırı tamamen temizle
  const handleClearRow = () => {
    if (finished) return;

    const newBoard = board.map((row) => [...row]);
    for (let c = 0; c < cols; c++) {
      newBoard[currentRow][c] = "";
    }
    setBoard(newBoard);
    setCurrentCol(0);
  };

  const isValidWord = (word) => {
    const regex = new RegExp(`^[A-Z]{${cols}}$`);
    return regex.test(word);
  };

  const handleEnter = () => {
    if (finished) return;
    if (currentCol < cols) {
      showSmallOverlay("Eksik harf girildi", "info");
      return;
    }

    const guess = board[currentRow].join("");
    if (!isValidWord(guess)) {
      showSmallOverlay("Geçersiz kelime", "info");
      return;
    }

    revealRow(currentRow, guess);
  };

  const revealRow = (rowIndex, guess) => {
    const solutionWord = solution;
    const solArr = solutionWord.split("");
    const guessArr = guess.split("");
    const result = Array(cols).fill("absent");

    // doğru yer
    for (let i = 0; i < cols; i++) {
      if (guessArr[i] === solArr[i]) {
        result[i] = "correct";
        solArr[i] = null;
      }
    }

    // içeriyor ama yanlış yerde
    for (let i = 0; i < cols; i++) {
      if (result[i] === "correct") continue;
      const idx = solArr.indexOf(guessArr[i]);
      if (idx !== -1) {
        result[i] = "present";
        solArr[idx] = null;
      }
    }

    // tileStates güncelle
    const newTileStates = tileStates.map((row) => [...row]);
    for (let i = 0; i < cols; i++) {
      newTileStates[rowIndex][i] = result[i];
    }
    setTileStates(newTileStates);

    // klavye renkleri
    setKeyStates((prev) => {
      const safePrev = prev || {};
      const updated = { ...safePrev };

      for (let i = 0; i < cols; i++) {
        const letter = guessArr[i];
        const state = result[i];
        const prevState = updated[letter];

        if (state === "correct") {
          updated[letter] = "correct";
        } else if (state === "present") {
          if (prevState !== "correct") {
            updated[letter] = "present";
          }
        } else {
          if (!prevState) {
            updated[letter] = "absent";
          }
        }
      }
      return updated;
    });

    // win / lose kontrol
    const isWin = result.every((s) => s === "correct");
    if (isWin) {
      setFinished(true);
      showOverlay(
        `Tebrikler! Level ${level} tamamlandı\nKelime: ${solutionWord}`,
        "win"
      );
      return;
    }

    const nextRow = rowIndex + 1;
    if (nextRow >= ROWS) {
      setFinished(true);
      showOverlay(`Kaybettin. Kelime: ${solutionWord}`, "lose");
    } else {
      setCurrentRow(nextRow);
      setCurrentCol(0);
    }
  };

  const showOverlay = (message, type) => {
    setOverlayMessage(message);
    setOverlayType(type);
    setOverlayVisible(true);
  };

  const showSmallOverlay = (message, type) => {
    setOverlayMessage(message);
    setOverlayType(type);
    setOverlayVisible(true);
    setTimeout(() => {
      setOverlayVisible(false);
    }, 900);
  };

  const handleNextLevel = () => {
    setOverlayVisible(false);
    if (level < TOTAL_LEVELS) {
      setLevel((prev) => prev + 1);
    } else {
      showOverlay("Tüm level’lar bitti! 🎉", "info");
    }
  };

  const handleRetryLevel = () => {
    setOverlayVisible(false);
    initLevel(level);
  };

  const renderTile = (rowIndex, colIndex) => {
    const rowLetters = board[rowIndex] || [];
    const rowStates = tileStates[rowIndex] || [];

    const letter = rowLetters[colIndex] || "";
    const state = rowStates[colIndex] || "idle";

    // Tema bazlı renkler
    const baseBg = isDark ? "#020617" : "#FFFFFF";
    const baseBorder = isDark ? "#4b5563" : "#CBD5E1";

    let styleArr = [
      styles.tile,
      { backgroundColor: baseBg, borderColor: baseBorder },
    ];

    if (state === "correct")
      styleArr.push({ backgroundColor: "#16a34a", borderColor: "#16a34a" });
    else if (state === "present")
      styleArr.push({ backgroundColor: "#eab308", borderColor: "#eab308" });
    else if (state === "absent")
      styleArr.push({
        backgroundColor: isDark ? "#374151" : "#E5E7EB",
        borderColor: isDark ? "#374151" : "#E5E7EB",
      });
    else if (letter !== "")
      styleArr.push({
        borderColor: isDark ? "#e5e7eb" : "#111827",
      });

    return (
      <View key={`${rowIndex}-${colIndex}`} style={styleArr}>
        <Text
          style={[
            styles.tileText,
            { color: currentTheme.text },
          ]}
        >
          {letter}
        </Text>
      </View>
    );
  };

  const renderKey = (k) => {
    const label = k === "Bck" ? "⌫" : k.toUpperCase();
    const isWide = k === "Bck";

    let keyStyle = [
      styles.key,
      { backgroundColor: currentTheme.board },
    ];
    let keyTextStyle = [
      styles.keyText,
      { color: currentTheme.text },
    ];

    if (k !== "Bck") {
      const state = keyStates[k.toUpperCase()];
      if (state === "correct") keyStyle.push(styles.keyCorrect);
      else if (state === "present") keyStyle.push(styles.keyPresent);
      else if (state === "absent") keyStyle.push(styles.keyAbsent);
    }

    if (isWide) keyStyle.push(styles.keyWide);

    return (
      <TouchableOpacity
        key={k}
        style={keyStyle}
        onPress={() => handleKeyPress(k)}
        activeOpacity={0.7}
      >
        <Text style={keyTextStyle}>{label}</Text>
      </TouchableOpacity>
    );
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
        {/* 🔙 Geri butonu en üstte */}
        <BackButton />

        {/* Başlık + level info */}
        <View style={styles.header}>
          
          <Text></Text><Text></Text>
          <Text
            style={[
              styles.title,
              { color: currentTheme.text },
            ]}
          >
            Wordle
          </Text>
          
          <Text></Text><Text></Text>
          <Text
            style={[
              styles.subtitle,
              { color: currentTheme.subText },
            ]}
          >
            Level {level} / {TOTAL_LEVELS} — Harf sayısı: {cols}
          </Text>
        </View>

        {/* Tahta */}
        <View style={styles.board}>
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={r} style={[styles.row, { width: cols * 46 }]}>
              {Array.from({ length: cols }).map((__, c) =>
                renderTile(r, c)
              )}
            </View>
          ))}
        </View>

        {/* 🔹 Kontrol Et + Satırı Temizle */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.controlButtonPrimary,
            ]}
            onPress={handleEnter}
          >
            <Text style={styles.controlButtonText}>Kontrol Et</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.controlButtonSecondary,
            ]}
            onPress={handleClearRow}
          >
            <Text style={styles.controlButtonText}>Satırı Temizle</Text>
          </TouchableOpacity>
        </View>

        {/* Klavye */}
        <View style={styles.keyboard}>
          {KEY_LAYOUT.map((row, idx) => (
            <View key={idx} style={styles.keyRow}>
              {row.map((k) => renderKey(k))}
            </View>
          ))}
        </View>

        {/* Mesaj Overlay */}
        {overlayVisible && (
          <View style={styles.overlay}>
            <View
              style={[
                styles.overlayBox,
                { backgroundColor: currentTheme.board },
              ]}
            >
              <Text
                style={[
                  styles.overlayText,
                  { color: currentTheme.text },
                ]}
              >
                {overlayMessage}
              </Text>

              {overlayType === "win" && (
                <TouchableOpacity
                  style={[
                    styles.overlayButton,
                    styles.overlayButtonPrimary,
                  ]}
                  onPress={handleNextLevel}
                >
                  <Text style={styles.overlayButtonText}>
                    Sonraki Level
                  </Text>
                </TouchableOpacity>
              )}

              {overlayType === "lose" && (
                <TouchableOpacity
                  style={[
                    styles.overlayButton,
                    styles.overlayButtonPrimary,
                  ]}
                  onPress={handleRetryLevel}
                >
                  <Text style={styles.overlayButtonText}>
                    Tekrar Dene
                  </Text>
                </TouchableOpacity>
              )}

              {(overlayType === "lose" || overlayType === "win") && (
                <TouchableOpacity
                  style={styles.overlayButton}
                  onPress={() => setOverlayVisible(false)}
                >
                  <Text style={styles.overlayButtonText}>Kapat</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
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
    paddingTop: 12,
    paddingBottom: 10,
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
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  board: {
    alignItems: "center",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  tile: {
    width: 40,
    height: 40,
    borderWidth: 2,
    margin: 3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  tileText: {
    fontSize: 20,
    fontWeight: "700",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
    width: "100%",
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  controlButtonPrimary: {
    backgroundColor: "#3b82f6",
  },
  controlButtonSecondary: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  controlButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  keyboard: {
    marginTop: 4,
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 6,
  },
  key: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    borderRadius: 6,
    minWidth: 28,
    alignItems: "center",
  },
  keyWide: {
    minWidth: 56,
    paddingHorizontal: 10,
  },
  keyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  keyCorrect: {
    backgroundColor: "#16a34a",
  },
  keyPresent: {
    backgroundColor: "#eab308",
  },
  keyAbsent: {
    backgroundColor: "#4b5563",
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  overlayBox: {
    borderRadius: 14,
    padding: 18,
    width: "100%",
  },
  overlayText: {
    fontSize: 16,
    marginBottom: 14,
    textAlign: "center",
  },
  overlayButton: {
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3b82f6",
    alignItems: "center",
    marginTop: 6,
  },
  overlayButtonPrimary: {
    backgroundColor: "#3b82f6",
  },
  overlayButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
});
