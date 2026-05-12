import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "DAILY_USAGE_LIMIT";
const DAILY_LIMIT = 5;
const IS_DEV = true;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function canGenerateStory() {
  const today = todayKey();

  const data = await AsyncStorage.getItem(KEY);
  const usage = data ? JSON.parse(data) : null;

  if (IS_DEV) {
    return {
      allowed: true,
      remaining: 999,
      count: 0,
    };
  }

  if (!usage || usage.date !== today) {
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      count: 0,
    };
  }

  const remaining = Math.max(DAILY_LIMIT - usage.count, 0);

  return {
    allowed: usage.count < DAILY_LIMIT,
    remaining,
    count: usage.count,
  };
}

export async function incrementStoryUsage() {
  const today = todayKey();

  const data = await AsyncStorage.getItem(KEY);
  const usage = data ? JSON.parse(data) : null;

  const count = usage?.date === today ? usage.count + 1 : 1;

  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      date: today,
      count,
    })
  );

  return {
    count,
    remaining: Math.max(DAILY_LIMIT - count, 0),
  };
}