// app/components/BackButton.js
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BackButton() {
    const router = useRouter();

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity
                style={styles.button}
                onPress={() => router.back()}
            >
                <Text style={styles.text}>← Back</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        left: 12,
        top: 12,
        zIndex: 10,
    },
    button: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(15,23,42,0.9)",
    },
    text: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },
});
