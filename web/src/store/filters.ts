"use client";
import { create } from "zustand";

export type Filters = {
  selectedTime: Date;
  weatherEnabled: boolean;
  eventsEnabled: boolean;
  timeInfluence: boolean;
  dayOfWeek: boolean;
  mlEnabled: boolean;

  setSelectedTime: (d: Date) => void;
  toggle: (key: keyof Filters) => void;
  resetTime: () => void;
};

export const useFilters = create<Filters>((set) => ({
  selectedTime: new Date(),
  weatherEnabled: true,
  eventsEnabled: true,
  timeInfluence: true,
  dayOfWeek: true,
  mlEnabled: true,

  setSelectedTime: (d) => set({ selectedTime: d }),
  toggle: (key) =>
    set((state) => {
      const current = state[key];
      if (typeof current !== "boolean") return state;
      return { ...state, [key]: !current };
    }),
  resetTime: () => set({ selectedTime: new Date() }),
}));
