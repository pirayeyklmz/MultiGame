import { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import BackButton from "./backbutton"; // Sudoku'dakiyle aynı import
import { useSettings } from "./settings"; // 📌 Ayar context'i

const LEVELS = [
    { label: "Kolay", size: 8, mines: 8 },
    { label: "Orta", size: 10, mines: 15 },
    { label: "Zor", size: 12, mines: 25 },
];

// Board üretmek için saf fonksiyon
function createRandomBoard(size, mines) {
    const board = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => ({
            row: r,
            col: c,
            mined: false,
            revealed: false,
            flagged: false,
            near: 0,
        }))
    );

    let placed = 0;
    while (placed < mines) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        if (!board[r][c].mined) {
            board[r][c].mined = true;
            placed++;
        }
    }

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c].mined) continue;
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                        if (board[nr][nc].mined) cnt++;
                    }
                }
            }
            board[r][c].near = cnt;
        }
    }

    const remaining = size * size - mines;
    return { board, remaining };
}

export default function Minesweeper() {
    const { settings, currentTheme } = useSettings();

    const [levelIndex, setLevelIndex] = useState(
        settings.defaultLevelIndex ?? 1
    );
    const level = LEVELS[levelIndex];
    const isDark = settings.theme === "dark";
    const [board, setBoard] = useState([]);
    const [remaining, setRemaining] = useState(0);
    const [flags, setFlags] = useState(0);
    const [newGameKey, setNewGameKey] = useState(0);

    const [gameStatus, setGameStatus] = useState("ready"); // ready | playing | won | lost
    const [seconds, setSeconds] = useState(0);

    const [flagMode, setFlagMode] = useState(settings.flagModeOnStart);

    useEffect(() => {
        if (gameStatus === "ready") {
            setLevelIndex(settings.defaultLevelIndex ?? 1);
        }
    }, [settings.defaultLevelIndex, gameStatus]);

    useEffect(() => {
        if (gameStatus === "ready") {
            setFlagMode(settings.flagModeOnStart);
        }
    }, [settings.flagModeOnStart, gameStatus]);

    useEffect(() => {
        const { board: b, remaining: rem } = createRandomBoard(
            level.size,
            level.mines
        );
        setBoard(b);
        setRemaining(rem);
        setFlags(0);
        setGameStatus("ready");
        setSeconds(0);
    }, [levelIndex, newGameKey, level.size, level.mines]);

    useEffect(() => {
        if (!settings.timerEnabled) return;
        if (gameStatus !== "playing") return;

        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [gameStatus, settings.timerEnabled]);

    const timeText = (() => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    })();

    function ensureStart() {
        if (gameStatus === "ready") setGameStatus("playing");
    }

    function handleReveal(r, c) {
        if (gameStatus === "lost" || gameStatus === "won") return;
        ensureStart();

        const cell = board[r][c];
        if (cell.revealed || cell.flagged) return;

        if (cell.mined) {
            const newB = board.map((row) =>
                row.map((cc) => ({
                    ...cc,
                    revealed: cc.mined ? true : cc.revealed,
                }))
            );
            setBoard(newB);
            setGameStatus("lost");
            Alert.alert("Kaybettiniz", "Bir mayına bastınız!");
            return;
        }

        const size = level.size;
        const newB = board.map((row) => row.map((cc) => ({ ...cc })));
        const stack = [[r, c]];
        let revealCount = 0;

        while (stack.length) {
            const [rr, cc] = stack.pop();
            const cur = newB[rr][cc];
            if (cur.revealed || cur.flagged) continue;

            cur.revealed = true;
            revealCount++;

            if (cur.near === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = rr + dr;
                        const nc = cc + dc;
                        if (
                            nr >= 0 &&
                            nr < size &&
                            nc >= 0 &&
                            nc < size &&
                            !newB[nr][nc].revealed &&
                            !newB[nr][nc].mined
                        ) {
                            stack.push([nr, nc]);
                        }
                    }
                }
            }
        }

        setBoard(newB);
        setRemaining((prev) => {
            const next = prev - revealCount;
            if (next <= 0) {
                setGameStatus("won");
                Alert.alert("Tebrikler!", "Tüm güvenli hücreleri açtınız!");
            }
            return next;
        });
    }

    function handleToggleFlag(r, c) {
        if (gameStatus === "lost" || gameStatus === "won") return;
        ensureStart();

        const cell = board[r][c];
        if (cell.revealed) return;

        const newB = board.map((row) => row.map((cc) => ({ ...cc })));
        newB[r][c].flagged = !newB[r][c].flagged;

        setBoard(newB);
        setFlags((prev) => (newB[r][c].flagged ? prev + 1 : prev - 1));
    }

    function handleCellPress(r, c) {
        if (flagMode) {
            handleToggleFlag(r, c);
        } else {
            handleReveal(r, c);
        }
    }

    function handleCellLongPress(r, c) {
        handleToggleFlag(r, c);
    }

    function handleResetSameMines() {
        if (!board.length) return;

        const newB = board.map((row) =>
            row.map((cell) => ({
                ...cell,
                revealed: false,
                flagged: false,
            }))
        );

        const safeCount = newB.flat().filter((c) => !c.mined).length;

        setBoard(newB);
        setRemaining(safeCount);
        setFlags(0);
        setGameStatus("ready");
        setSeconds(0);
    }

    function handleNewGame() {
        setNewGameKey((k) => k + 1);
    }

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                { backgroundColor: currentTheme.background },
            ]}
        >
            {/* 🔹 Sudoku'daki gibi en üstte geri butonu */}
            <BackButton />

            <Text style={[styles.title, { color: currentTheme.text }]}>
                MAYIN TARLASI
            </Text>

            {/* ÜST BİLGİ */}
            <View style={styles.topRow}>
                {/* Seviye butonları */}
                <View style={styles.levelRow}>
                    {LEVELS.map((lv, i) => (
                        <TouchableOpacity
                            key={lv.label}
                            style={[
                                styles.levelBtn,
                                {
                                    backgroundColor:
                                        i === levelIndex
                                            ? currentTheme.danger
                                            : currentTheme.board,
                                },
                            ]}
                            onPress={() => {
                                if (gameStatus === "ready") setLevelIndex(i);
                            }}
                        >
                            <Text
                                style={[
                                    styles.levelText,
                                    {
                                        color:
                                            i === levelIndex
                                                ? "#FFFFFF"
                                                : currentTheme.subText,
                                    },
                                ]}
                            >
                                {lv.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Zaman / kalan / bayrak */}
                <View style={styles.infoBox}>
                    <Text
                        style={[styles.infoText, { color: currentTheme.subText }]}
                    >
                        Zaman: {timeText}
                    </Text>
                    <Text
                        style={[styles.infoText, { color: currentTheme.subText }]}
                    >
                        Açılacak: {remaining}
                    </Text>
                    <Text
                        style={[styles.infoText, { color: currentTheme.subText }]}
                    >
                        Bayrak: {flags}/{level.mines}
                    </Text>
                </View>

                {/* Bayrak modu */}
                <TouchableOpacity
                    style={[
                        styles.flagModeBtn,
                        { borderColor: currentTheme.primary },
                        flagMode && { backgroundColor: currentTheme.primary },
                    ]}
                    onPress={() => setFlagMode((f) => !f)}
                >
                    <Text
                        style={[
                            styles.flagModeText,
                            {
                                color: flagMode ? "#FFFFFF" : currentTheme.subText,
                            },
                        ]}
                    >
                        🚩 Bayrak Modu {flagMode ? "Açık" : "Kapalı"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* OYUN TAHTASI */}
            <View style={styles.boardWrapper}>
                <View
                    style={[
                        styles.board,
                        {
                            backgroundColor: currentTheme.board,
                            width: level.size * 30,
                            height: level.size * 30,
                        },
                    ]}
                >
                    {board.map((row, r) => (
                        <View key={r} style={{ flexDirection: "row" }}>
                            {row.map((cell, c) => {
                                let textColor = currentTheme.text;
                                if (cell.near === 1) textColor = "#7AEDFF";
                                if (cell.near === 2) textColor = "#9FFF8A";
                                if (cell.near >= 3) textColor = "#FF9F7A";

                                const bg = cell.revealed
                                    ? (isDark ? "rgba(255,255,255,0.14)" : "#E5EDF8")
                                    : (isDark ? "rgba(255,255,255,0.06)" : "#F5F7FD");

                                const border = isDark
                                    ? "rgba(255,255,255,0.20)"
                                    : "#CBD5E1";

                                return (
                                    <Pressable
                                        key={c}
                                        onPress={() => handleCellPress(r, c)}
                                        onLongPress={() => handleCellLongPress(r, c)}
                                        style={[
                                            styles.cell,
                                            { backgroundColor: bg, borderColor: border },
                                        ]}
                                    >
                                        {cell.revealed && cell.mined && (
                                            <Text style={styles.mine}>💣</Text>
                                        )}

                                        {cell.revealed && !cell.mined && cell.near > 0 && (
                                            <Text style={[styles.near, { color: textColor }]}>
                                                {cell.near}
                                            </Text>
                                        )}

                                        {!cell.revealed && cell.flagged && (
                                            <Text style={styles.flag}>🚩</Text>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>

            {/* ALT BUTONLAR */}
            <View style={styles.bottomButtons}>
                <TouchableOpacity
                    style={[
                        styles.bottomBtn,
                        { backgroundColor: currentTheme.board },
                    ]}
                    onPress={handleResetSameMines}
                >
                    <Text
                        style={[
                            styles.bottomBtnText,
                            { color: currentTheme.text },
                        ]}
                    >
                        Sıfırla
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.bottomBtn,
                        { backgroundColor: currentTheme.primary },
                    ]}
                    onPress={handleNewGame}
                >
                    <Text
                        style={[
                            styles.bottomBtnText,
                            { color: "#FFFFFF" },
                        ]}
                    >
                        Yeni Oyun
                    </Text>
                </TouchableOpacity>
            </View>

            <Text
                style={[
                    styles.note,
                    { color: currentTheme.subText },
                ]}
            >
                Not: Hücreye uzun basarak bayrak koyabilir veya kaldırabilirsiniz.
            </Text>
            <Text
                style={[
                    styles.note,
                    { color: currentTheme.subText },
                ]}
            >
                Not: Sıfırla butonu ile aynı mayın düzeniyle oyuna devam
                edebilirsiniz.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,          // ScrollView için flex yerine flexGrow
        alignItems: "center",
        padding: 10,
    },
    boardWrapper: {
        width: "100%",
        alignItems: "center",
        marginTop: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
        marginTop: 4,
    },
    topRow: {
        width: "90%",
        alignItems: "center",
        marginBottom: 10,
    },
    levelRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 8,
    },
    levelBtn: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    levelText: {
        fontWeight: "600",
        fontSize: 13,
    },
    infoBox: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    infoText: {
        fontSize: 13,
        fontWeight: "600",
    },
    flagModeBtn: {
        marginTop: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    flagModeText: {
        fontSize: 13,
        fontWeight: "600",
    },
    board: {
        borderRadius: 10,
        padding: 3,
    },
    cell: {
        width: 30,
        height: 30,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    mine: {
        fontSize: 18,
    },
    near: {
        fontSize: 16,
        fontWeight: "700",
    },
    flag: {
        fontSize: 18,
    },
    bottomButtons: {
        flexDirection: "row",
        marginTop: 18,
        width: "90%",
        justifyContent: "space-between",
    },
    bottomBtn: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    bottomBtnText: {
        fontSize: 15,
        fontWeight: "600",
    },
    note: {
        marginTop: 10,
        fontSize: 11,
        textAlign: "center",
        paddingHorizontal: 16,
    },
});
