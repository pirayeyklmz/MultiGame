import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 📌 AYARLAR CONTEXT
import { useSettings } from "./settings";
// 📌 Geri butonu
import BackButton from "./backbutton";

// defaultLevelIndex → 0,1,2 → çift sayısı: 4, 6, 8
const PAIRS_MAP = [4, 6, 8];

const SYMBOLS = [
  "🍎",
  "🍌",
  "🍇",
  "🍓",
  "🍍",
  "🥑",
  "🍑",
  "🍒",
  "🍉",
  "🍋",
  "🥝",
  "🥥",
  "🍐",
  "🍊",
];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(pairs) {
  const use = SYMBOLS.slice(0, pairs);
  const deck = shuffle([...use, ...use]);
  return deck.map((symbol, index) => ({
    id: index.toString(),
    symbol,
    flipped: false,
    matched: false,
  }));
}

const MemoryGameScreen = () => {
  const { settings, currentTheme } = useSettings();
  const isDark = settings.theme === "dark";

  const defaultPairs = PAIRS_MAP[settings.defaultLevelIndex] ?? 6;
  const [totalPairs, setTotalPairs] = useState(defaultPairs);

  const [cards, setCards] = useState([]);
  const [firstCard, setFirstCard] = useState(null);
  const [lockBoard, setLockBoard] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);

  // Ayarlardaki varsayılan zorluk değişirse çift sayısını güncelle
  useEffect(() => {
    const nextPairs = PAIRS_MAP[settings.defaultLevelIndex] ?? 6;
    setTotalPairs(nextPairs);
  }, [settings.defaultLevelIndex]);

  // Çift sayısı değişince oyunu kur
  useEffect(() => {
    initGame(totalPairs);
  }, [totalPairs]);

  const initGame = (pairs) => {
    const deck = buildDeck(pairs);
    setCards(deck);
    setFirstCard(null);
    setLockBoard(false);
    setMoves(0);
    setMatches(0);
    setShowWinModal(false);
  };

  const resetTurn = () => {
    setFirstCard(null);
    setLockBoard(false);
  };

  const handleCardPress = (index) => {
    if (lockBoard) return;

    const card = cards[index];
    if (!card || card.flipped || card.matched) return;

    const updatedCards = cards.map((c, i) =>
      i === index ? { ...c, flipped: true } : c
    );
    setCards(updatedCards);

    // İlk kart
    if (firstCard === null) {
      setFirstCard(index);
      return;
    }

    const firstIndex = firstCard;
    setLockBoard(true);
    setMoves((prev) => prev + 1);

    const isMatch =
      updatedCards[firstIndex].symbol === updatedCards[index].symbol;

    if (isMatch) {
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            i === firstIndex || i === index
              ? { ...c, matched: true }
              : c
          )
        );

        if (settings.vibrationEnabled) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        }

        setMatches((prev) => {
          const newMatches = prev + 1;
          if (newMatches === totalPairs) {
            if (settings.vibrationEnabled) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
            setShowWinModal(true);
          }
          return newMatches;
        });
        resetTurn();
      }, 300);
    } else {
      if (settings.vibrationEnabled) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }

      setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            i === firstIndex || i === index
              ? { ...c, flipped: false }
              : c
          )
        );
        resetTurn();
      }, 600);
    }
  };

  const handleRestart = () => {
    initGame(totalPairs);
  };

  const handleShuffle = () => {
    initGame(totalPairs);
  };

  const handleChangePairs = (pairs) => {
    setTotalPairs(pairs);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: currentTheme.background },
      ]}
    >
      {/* 🔹 Geri butonu: diğer oyunlar gibi en üstte */}
      <BackButton />

      {/* Üst Kısım / Başlık */}
      <View style={styles.header}>
        <Text></Text><Text></Text><Text></Text>

        <View style={styles.statsRow}>
          <Text
            style={[styles.statText, { color: currentTheme.subText }]}
          >
            Hamle: {moves}
          </Text>
          <Text
            style={[styles.statText, { color: currentTheme.subText }]}
          >
            Eşleşme: {matches}/{totalPairs}
          </Text>
        </View>

        {/* Çift sayısı ayarı */}
        <View style={styles.difficultyRow}>
          <Text
            style={[styles.diffLabel, { color: currentTheme.subText }]}
          >
            Çift sayısı:
          </Text>
          <View style={styles.diffButtons}>
            {[4, 6, 8].map((p) => {
              const active = totalPairs === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.diffButton,
                    {
                      borderColor: active
                        ? currentTheme.primary
                        : isDark
                          ? "#2a3550"
                          : "#CBD5E1",
                      backgroundColor: active
                        ? currentTheme.primary
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleChangePairs(p)}
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
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Oyun Alanı */}
      <View style={styles.board}>
        {cards.map((card, index) => {
          const isVisible = card.flipped || card.matched;
          let bg = currentTheme.board;
          if (isVisible && !card.matched) {
            bg = isDark ? "#25355a" : "#E0ECFF";
          }
          if (card.matched) {
            bg = isDark ? "#2f8f4e" : "#22C55E";
          }

          return (
            <Pressable
              key={card.id}
              style={[styles.card, { backgroundColor: bg }]}
              onPress={() => handleCardPress(index)}
            >
              <View style={styles.cardInner}>
                <Text
                  style={[
                    styles.cardText,
                    { color: currentTheme.text },
                  ]}
                >
                  {isVisible ? card.symbol : "❓"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {/* Alt Butonlar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: currentTheme.primary },
          ]}
          onPress={handleRestart}
        >
          <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
            Yeniden Başlat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.buttonSecondary,
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
            Karıştır
          </Text>
        </TouchableOpacity>
      </View>
      <Text></Text><Text></Text><Text></Text><Text></Text><Text></Text>

      {/* Kazanma Modalı */}
      <Modal
        visible={showWinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: currentTheme.board },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: currentTheme.text }]}
            >
              Tebrikler! 🎉
            </Text>
            <Text
              style={[
                styles.modalText,
                { color: currentTheme.subText },
              ]}
            >
              Tüm eşleşmeleri {moves} hamlede buldun.
            </Text>
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: currentTheme.primary },
              ]}
              onPress={() => {
                setShowWinModal(false);
                initGame(totalPairs);
              }}
            >
              <Text
                style={[styles.buttonText, { color: "#FFFFFF" }]}
              >
                Tekrar Oyna
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.buttonClose,
                { borderColor: currentTheme.primary },
              ]}
              onPress={() => setShowWinModal(false)}
            >
              <Text
                style={[
                  styles.buttonCloseText,
                  { color: currentTheme.primary },
                ]}
              >
                Kapat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MemoryGameScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statText: {
    fontSize: 15,
    fontWeight: "500",
  },
  difficultyRow: {
    marginTop: 6,
  },
  diffLabel: {
    marginBottom: 4,
    fontSize: 14,
  },
  diffButtons: {
    flexDirection: "row",
    gap: 8,
  },
  diffButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  diffButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  board: {
    flex: 1,
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: "22%",
    aspectRatio: 0.7,
    margin: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  cardInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    fontSize: 26,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  buttonClose: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  buttonCloseText: {
    fontWeight: "600",
  },
});
