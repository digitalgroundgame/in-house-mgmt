"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DatesProvider } from "@mantine/dates";
import { useUser } from "./UserContext";
import { apiClient } from "@/app/lib/apiClient";
import { getBrowserTimezone } from "@/app/utils/datetime";

const STORAGE_KEY = "timezone";

interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => Promise<void>;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

function getInitialTimezone(): string {
  // Check localStorage first for cached value
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  }
  // Fall back to browser detection
  return getBrowserTimezone();
}

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [timezone, setTimezoneState] = useState<string>(getInitialTimezone);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with user.timezone when user data loads (DB is source of truth)
  useEffect(() => {
    if (user?.timezone) {
      setTimezoneState(user.timezone);
      localStorage.setItem(STORAGE_KEY, user.timezone);
    }
  }, [user?.timezone]);

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
