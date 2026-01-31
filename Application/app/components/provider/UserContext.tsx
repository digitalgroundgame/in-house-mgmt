"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import getCookie, { deleteCookie } from "@/app/utils/cookie";

import type { User } from "./types";
export type { User };

interface UserContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });

      if (!res.ok && res.status === 403) {
        setUser(null);

        // Delete cookie if not online
        deleteCookie("csrftoken");
        deleteCookie("sessionid");

        // Only redirect if not already on /login
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
        return;
      }

      const data: User = await res.json();
      setUser(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refresh: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}
