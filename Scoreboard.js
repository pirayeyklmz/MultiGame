import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BackButton from "./backbutton"; // ⬅️ geri butonu burada
import { loadTopScores } from "./scoreService";
import { useSettings } from "./settings"; // yolu projene göre kontrol et

export default function Scoreboard() {
  const [scores, setScores] = useState([]);
  const { currentTheme } = useSettings();

  useEffect(() => {
    loadTopScores().then((data) => {
      setScores(Array.isArray(data) ? data : []);
    });
  }, []);

  const renderItem = ({ item, index }) => {
    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor:
              index === 0
                ? "rgba(250, 204, 21, 0.16)" // 1. sırayı hafif vurgula
                : currentTheme.board,
            borderColor: "rgba(148,163,184,0.4)",
          },
        ]}
      >
        <Text style={[styles.rank, { color: currentTheme.text }]}>
          #{index + 1}
        </Text>
        <View style={styles.infoCol}>
          <Text style={[styles.name, { color: currentTheme.text }]}>
            {item.name ?? "Oyuncu"}
          </Text>
          <Text
            style={[
              styles.meta,
              { color: currentTheme.subText },
            ]}
          >
            Süre: {item.time}s • Hata: {item.errors} • Seviye:{" "}
            {item.level}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentTheme.background },
      ]}
    >
      {/* ⬅️ Sol üst geri butonu */}
      <View style={styles.backWrapper}>
        <BackButton />
      </View>

      <Text
        style={[
          styles.title,
          { color: currentTheme.text },
        ]}
      >
        🏆 En İyi 10 Skor
      </Text>

      {scores.length === 0 ? (
        <Text
          style={[
            styles.emptyText,
            { color: currentTheme.subText },
          ]}
        >
          Henüz kayıtlı skor yok. Bir oyun oyna ve ilk skoru sen yaz! 🎮
        </Text>
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(_item, index) => index.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backWrapper: {
    marginBottom: 8,      // geri butonu ile başlık arasına boşluk
    alignSelf: "flex-start",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  rank: {
    fontSize: 18,
    fontWeight: "700",
    width: 40,
  },
  infoCol: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 8,
  },
});
