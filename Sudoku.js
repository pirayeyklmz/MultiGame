import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { saveScore } from "./scoreService";
import { useSettings } from "./settings";

import BackButton from "./backbutton";

function emptyBoard() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isSafe(board, r, c, num) {
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
        if (board[i][c] === num) return false;
    }
    const sr = Math.floor(r / 3) * 3;
    const sc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[sr + i][sc + j] === num) return false;
        }
    }
    return true;
}

function solveSudoku(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isSafe(board, r, c, num)) {
                        board[r][c] = num;
                        if (solveSudoku(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function copyBoard(board) {
    return board.map((row) => row.slice());
}

function generateFullBoard() {
    const board = emptyBoard();
    for (let k = 0; k < 9; k += 3) {
        let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                board[k + i][k + j] = nums[i * 3 + j];
            }
        }
    }
    if (!solveSudoku(board)) return generateFullBoard();
    return board;
}

function makePuzzleFromSolution(solution, removeCount) {
    const puzzle = copyBoard(solution);
    const positions = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) positions.push([r, c]);
    }
    positions.sort(() => Math.random() - 0.5);
    for (let i = 0; i < removeCount; i++) {
        const [r, c] = positions[i];
        puzzle[r][c] = 0;
    }
    return puzzle;
}

// --- Main Component ---
export default function Sudoku() {
    const navigation = useNavigation();
    const { settings, currentTheme } = useSettings();

    const difficultyOptions = ["Easy", "Medium", "Hard"];

    const [solutionBoard, setSolutionBoard] = useState(null);
    const [puzzleBoard, setPuzzleBoard] = useState(null);
    const [selectedCell, setSelectedCell] = useState([null, null]);
    const [seconds, setSeconds] = useState(0);

    const [difficulty, setDifficulty] = useState(
        difficultyOptions[settings.defaultLevelIndex] ?? "Easy"
    );

    const pulseAnim = useRef(new Animated.Value(1)).current;

    const difficultyLevels = useMemo(
        () => ({
            Easy: 30,
            Medium: 40,
            Hard: 50,
        }),
        []
    );

    const isDark = settings.theme === "dark";

    useEffect(() => {
        const map = ["Easy", "Medium", "Hard"];
        const next = map[settings.defaultLevelIndex] ?? "Easy";
        setDifficulty(next);
    }, [settings.defaultLevelIndex]);

    useEffect(() => {
        startNewGame(difficultyLevels[difficulty]);
    }, [difficulty, difficultyLevels]);

    useEffect(() => {
        if (!settings.timerEnabled) return;
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [settings.timerEnabled]);

    function startNewGame(removeCount) {
        const sol = generateFullBoard();
        const puzzle = makePuzzleFromSolution(sol, removeCount);
        setSolutionBoard(sol);
        setPuzzleBoard(puzzle);
        setSelectedCell([null, null]);
        setSeconds(0);
    }

    function handleCellPress(r, c) {
        setSelectedCell([r, c]);
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.1,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();
    }

    function handleNumberPress(num) {
        if (selectedCell[0] === null) return;
        if (!puzzleBoard || !solutionBoard) return;

        const [r, c] = selectedCell;

        if (
            solutionBoard[r][c] === puzzleBoard[r][c] &&
            puzzleBoard[r][c] !== 0
        )
            return;

        const newBoard = copyBoard(puzzleBoard);
        newBoard[r][c] = num === 0 ? 0 : num;
        setPuzzleBoard(newBoard);
    }

    function checkSolution() {
        if (!puzzleBoard || !solutionBoard) return;

        let emptyCells = 0;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const value = puzzleBoard[r][c];
                if (value === 0) {
                    emptyCells++;
                }
            }
        }

        if (emptyCells > 0) {
            if (settings.vibrationEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            Alert.alert(
                "Eksik Kutular Var",
                `Sudokuda ${emptyCells} tane boş kutu var. Lütfen tüm kutuları doldurun.`,
                [{ text: "Tamam" }]
            );
            return;
        }

        if (settings.vibrationEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        saveScore("Oyuncu1", seconds, difficulty.toLowerCase());

        Alert.alert(
            "Tebrikler!",
            `Sudoku çözüldü! Süre: ${Math.floor(seconds / 60)}:${seconds % 60}`,
            [
                {
                    text: "Tamam",
                    onPress: () => navigation.navigate("home"),
                },
            ]
        );
    }

    function fillSolution() {
        if (!solutionBoard) return;
        setPuzzleBoard(copyBoard(solutionBoard));
    }

    function giveHint() {
        if (!puzzleBoard || !solutionBoard) return;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (puzzleBoard[r][c] === 0) {
                    const newBoard = copyBoard(puzzleBoard);
                    newBoard[r][c] = solutionBoard[r][c];
                    setPuzzleBoard(newBoard);

                    if (settings.vibrationEnabled) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    return;
                }
            }
        }
    }

    function resetPuzzle() {
        startNewGame(difficultyLevels[difficulty]);
    }

    const timeMinutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const timeSeconds = String(seconds % 60).padStart(2, "0");

    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                { backgroundColor: currentTheme.background },
            ]}
        >
            {/* 🔹 Geri butonu: tam burada, en üstte */}
            <BackButton />

<Text></Text><Text></Text><Text></Text>
            <View style={styles.infoRow}>
                <Text style={[styles.infoText, { color: currentTheme.subText }]}>
                    Time: {timeMinutes}:{timeSeconds}
                </Text>
            </View>

            {/* Zorluk seçimi */}
            <View style={styles.difficultyRow}>
                {difficultyOptions.map((lvl) => (
                    <TouchableOpacity
                        key={lvl}
                        style={[
                            styles.difficultyBtn,
                            {
                                backgroundColor:
                                    difficulty === lvl ? currentTheme.primary : currentTheme.board,
                            },
                        ]}
                        onPress={() => setDifficulty(lvl)}
                    >
                        <Text
                            style={[
                                styles.difficultyText,
                                {
                                    color: difficulty === lvl ? "#FFFFFF" : currentTheme.text,
                                },
                            ]}
                        >
                            {lvl}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Sudoku grid */}
            <View
                style={[
                    styles.grid,
                    {
                        borderColor: isDark ? "#CBD5E1" : "#64748B",
                    },
                ]}
            >
                {puzzleBoard?.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((val, c) => {
                            const fixed =
                                val !== 0 &&
                                solutionBoard &&
                                solutionBoard[r][c] === val;
                            const selected =
                                selectedCell[0] === r && selectedCell[1] === c;

                            const baseBg = fixed
                                ? isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "#E5EDF8"
                                : isDark
                                    ? "rgba(15,23,42,0.9)"
                                    : "#FFFFFF";

                            const borderColor = isDark ? "#CBD5E1" : "#64748B";
                            const boldBorderColor = isDark ? "#E5E7EB" : "#0F172A";

                            return (
                                <Animated.View
                                    key={c}
                                    style={[
                                        styles.cell,
                                        {
                                            backgroundColor: baseBg,
                                            borderColor,
                                        },
                                        r % 3 === 2 &&
                                        r !== 8 && {
                                            borderBottomWidth: 2,
                                            borderBottomColor: boldBorderColor,
                                        },
                                        c % 3 === 2 &&
                                        c !== 8 && {
                                            borderRightWidth: 2,
                                            borderRightColor: boldBorderColor,
                                        },
                                        selected && {
                                            transform: [{ scale: pulseAnim }],
                                            backgroundColor: isDark ? "#e2c08d" : "#FDE68A",
                                        },
                                    ]}
                                >
                                    <Pressable
                                        onPress={() => handleCellPress(r, c)}
                                        style={styles.cellPressable}
                                    >
                                        <Text
                                            style={[
                                                styles.cellText,
                                                { color: currentTheme.text },
                                            ]}
                                        >
                                            {val !== 0 ? val : ""}
                                        </Text>
                                    </Pressable>
                                </Animated.View>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* NumPad */}
            <View style={styles.numPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <TouchableOpacity
                        key={n}
                        style={[
                            styles.numBtn,
                            { backgroundColor: currentTheme.board },
                        ]}
                        onPress={() => handleNumberPress(n)}
                    >
                        <Text
                            style={[
                                styles.numBtnText,
                                { color: currentTheme.text },
                            ]}
                        >
                            {n}
                        </Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[
                        styles.numBtn,
                        { backgroundColor: currentTheme.danger },
                    ]}
                    onPress={() => handleNumberPress(0)}
                >
                    <Text style={[styles.numBtnText, { color: "#FFFFFF" }]}>
                        Del
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Kontroller */}
            <View style={styles.controls}>
                <View style={styles.singleRow}>
                    <TouchableOpacity
                        style={[
                            styles.bigBtn,
                            { backgroundColor: currentTheme.primary },
                        ]}
                        onPress={() => startNewGame(difficultyLevels[difficulty])}
                    >
                        <Text style={[styles.bigBtnText, { color: "#FFFFFF" }]}>
                            NEW GAME
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.fourRow}>
                    <TouchableOpacity
                        style={[
                            styles.smallBtn,
                            { backgroundColor: currentTheme.board },
                        ]}
                        onPress={checkSolution}
                    >
                        <Text
                            style={[
                                styles.smallBtnText,
                                { color: currentTheme.text },
                            ]}
                        >
                            CHECK
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.smallBtn,
                            { backgroundColor: currentTheme.board },
                        ]}
                        onPress={fillSolution}
                    >
                        <Text
                            style={[
                                styles.smallBtnText,
                                { color: currentTheme.text },
                            ]}
                        >
                            SOLVE
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.smallBtn,
                            { backgroundColor: currentTheme.board },
                        ]}
                        onPress={giveHint}
                    >
                        <Text
                            style={[
                                styles.smallBtnText,
                                { color: currentTheme.text },
                            ]}
                        >
                            HINT
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.smallBtn,
                            { backgroundColor: currentTheme.board },
                        ]}
                        onPress={resetPuzzle}
                    >
                        <Text
                            style={[
                                styles.smallBtnText,
                                { color: currentTheme.text },
                            ]}
                        >
                            RESET
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: "center",
        padding: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "90%",
        marginBottom: 10,
    },
    infoText: {
        fontWeight: "600",
    },
    difficultyRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 15,
    },
    difficultyBtn: {
        padding: 8,
        marginHorizontal: 5,
        borderRadius: 6,
    },
    difficultyText: {
        fontWeight: "600",
    },
    grid: {
        width: 360,
        aspectRatio: 1,
        borderWidth: 2,
    },
    row: {
        flexDirection: "row",
    },
    cell: {
        width: 40,
        height: 40,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    cellPressable: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
    },
    cellText: {
        fontSize: 18,
        fontWeight: "600",
    },
    numPad: {
        flexDirection: "row",
        flexWrap: "wrap",
        width: 360,
        marginTop: 10,
        justifyContent: "space-between",
    },
    numBtn: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        margin: 2,
        borderRadius: 6,
    },
    numBtnText: {
        fontWeight: "600",
    },
    controls: {
        width: "90%",
        alignSelf: "center",
        marginTop: 15,
    },
    singleRow: {
        width: "100%",
        marginBottom: 12,
    },
    bigBtn: {
        width: "100%",
        height: 50,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    bigBtnText: {
        fontSize: 17,
        fontWeight: "700",
    },
    fourRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
    },
    smallBtn: {
        flex: 1,
        marginHorizontal: 3,
        height: 42,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    smallBtnText: {
        fontSize: 14,
        fontWeight: "700",
    },
});
