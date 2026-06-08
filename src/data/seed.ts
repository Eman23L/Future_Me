import type { PlannerState } from "../models/types";

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const date = (day: number) => `${yyyy}-${mm}-${String(day).padStart(2, "0")}`;

export const seedState: PlannerState = {
  settings: {
    wakeTime: "07:00",
    bedTime: "22:30",
    notificationPersonality: "gentle"
  },
  capacity: "normal",
  plannedMonth: `${yyyy}-${mm}`,
  setupComplete: false,
  rules: {
    selected: [
      "never-gym-after-long-shift",
      "no-study-after-8",
      "protect-sunday-evenings",
      "recovery-after-3-shifts",
      "avoid-more-than-2-demanding"
    ],
    custom: "Keep Wednesday evenings light when possible."
  },
  monthlyInputs: [
    {
      id: "shift-1",
      title: "Hospital day shift",
      date: date(3),
      startTime: "07:00",
      endTime: "19:00",
      category: "work",
      notes: "12-hour shift"
    },
    {
      id: "shift-2",
      title: "Hospital day shift",
      date: date(4),
      startTime: "07:00",
      endTime: "19:00",
      category: "work"
    },
    {
      id: "shift-3",
      title: "Hospital day shift",
      date: date(5),
      startTime: "07:00",
      endTime: "19:00",
      category: "work"
    },
    {
      id: "deadline-1",
      title: "Research assignment due",
      date: date(12),
      startTime: "17:00",
      endTime: "18:00",
      category: "deadline",
      notes: "Upload before 6pm"
    },
    {
      id: "social-1",
      title: "Dinner with Sam",
      date: date(15),
      startTime: "18:30",
      endTime: "20:30",
      category: "social"
    },
    {
      id: "appointment-1",
      title: "Dentist",
      date: date(21),
      startTime: "10:00",
      endTime: "10:45",
      category: "appointment"
    }
  ],
  routines: [
    {
      id: "routine-gym",
      name: "Gym",
      frequency: "3x-weekly",
      preferredDay: 1,
      preferredTime: "18:00",
      effort: "high",
      category: "gym",
      active: true
    },
    {
      id: "routine-food-shop",
      name: "Food shop",
      frequency: "weekly",
      preferredDay: 2,
      preferredTime: "17:30",
      effort: "medium",
      category: "self-care",
      active: true
    },
    {
      id: "routine-meal-prep",
      name: "Meal prep",
      frequency: "weekly",
      preferredDay: 0,
      preferredTime: "16:00",
      effort: "medium",
      category: "meal-prep",
      active: true
    },
    {
      id: "routine-clean",
      name: "Clean",
      frequency: "weekly",
      preferredDay: 5,
      preferredTime: "17:00",
      effort: "medium",
      category: "cleaning",
      active: true
    },
    {
      id: "routine-study",
      name: "Study block",
      frequency: "2x-weekly",
      preferredDay: 3,
      preferredTime: "18:30",
      effort: "high",
      category: "study",
      active: true
    }
  ],
  plannedTasks: []
};
