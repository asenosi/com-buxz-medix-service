export type NotificationTypeKey =
  | "dose_due"
  | "refill_reminder"
  | "streak_milestone"
  | "motivation";

export interface NotificationTypeDef {
  key: NotificationTypeKey;
  name: string;
  description: string;
  defaultTitle: string;
  defaultBody: string;
  icon?: string;
  category: NotificationCategory;
}

export type NotificationCategory =
  | "Reminders"
  | "Refill"
  | "Adherence"
  | "Motivation";

export const NOTIFICATION_TYPES: NotificationTypeDef[] = [
  {
    key: "dose_due",
    name: "Dose Due",
    description: "Remind when it’s time to take a medication",
    defaultTitle: "Dose due",
    defaultBody: "You have a medication due now.",
    icon: "/images/icons/pill.png",
    category: "Reminders",
  },
  {
    key: "refill_reminder",
    name: "Refill Reminder",
    description: "Alert when pills are low and need refill",
    defaultTitle: "Refill reminder",
    defaultBody: "Pills are running low. Consider a refill.",
    icon: "/images/icons/refill.png",
    category: "Refill",
  },
  {
    key: "streak_milestone",
    name: "Streak Milestone",
    description: "Celebrate adherence streaks",
    defaultTitle: "Great streak!",
    defaultBody: "You’ve kept to your meds — keep it up!",
    icon: "/images/icons/streak.png",
    category: "Adherence",
  },
  {
    key: "motivation",
    name: "Motivational",
    description: "Periodic encouragement to stay on track",
    defaultTitle: "You’ve got this",
    defaultBody: "Small steps every day make a big difference.",
    icon: "/images/icons/motivation.png",
    category: "Motivation",
  },
];
