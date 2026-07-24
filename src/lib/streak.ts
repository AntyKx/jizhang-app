import { format, subDays } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

export async function bumpStreak(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!settings) {
    await db.insert(userSettings).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastEntryDate: today,
    });
    return;
  }

  if (settings.lastEntryDate === today) return;

  const nextStreak = settings.lastEntryDate === yesterday ? settings.currentStreak + 1 : 1;

  await db
    .update(userSettings)
    .set({
      currentStreak: nextStreak,
      longestStreak: Math.max(nextStreak, settings.longestStreak),
      lastEntryDate: today,
    })
    .where(eq(userSettings.userId, userId));
}
