"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DatesProvider } from "@mantine/dates";
import { useUser } from "./UserContext";
import { apiClient } from "@/app/lib/apiClient";
import { getBrowserTimezone } from "@/app/utils/datetime";

const STORAGE_KEY = "timezone";
const DEFAULT_TIMEZONE = "UTC";

interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => Promise<void>;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  // Start with UTC to avoid hydration mismatch - will update after mount
  const [timezone, setTimezoneState] = useState<string>(DEFAULT_TIMEZONE);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // After mount, detect timezone from localStorage or browser
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setTimezoneState(saved);
    } else {
      setTimezoneState(getBrowserTimezone());
    }
    setHasMounted(true);
  }, []);

  // Sync with user.timezone when user data loads (DB is source of truth)
  useEffect(() => {
    if (hasMounted && user?.timezone) {
      setTimezoneState(user.timezone);
      localStorage.setItem(STORAGE_KEY, user.timezone);
    }
  }, [user?.timezone, hasMounted]);

  // Update both backend and local state
  const setTimezone = async (tz: string) => {
    setIsLoading(true);
    try {
      await apiClient.patch("/auth/preferences/", { timezone: tz });
      setTimezoneState(tz);
      localStorage.setItem(STORAGE_KEY, tz);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, isLoading }}>
      <DatesProvider settings={{ timezone }}>{children}</DatesProvider>
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    throw new Error("useTimezone must be used inside <TimezoneProvider>");
  }
  return ctx;
}
