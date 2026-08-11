import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type LegalCardProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

export default function LegalCard({
  icon,
  title,
  subtitle,
  onPress,
}: LegalCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>

        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 82,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,

    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,183,3,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  icon: {
    fontSize: 25,
  },

  content: {
    flex: 1,
    paddingRight: 10,
  },

  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 17,
  },

  arrow: {
    color: "#FFB703",
    fontSize: 34,
    fontWeight: "500",
    marginLeft: 4,
  },
});