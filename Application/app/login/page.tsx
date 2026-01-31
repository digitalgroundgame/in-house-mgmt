"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Paper,
  Stack,
  Text,
  Title,
  TextInput,
  PasswordInput,
  Button,
  LoadingOverlay,
  Divider,
  Alert,
} from "@mantine/core";
import getCookie from "@/app/utils/cookie";
import { loginWithProvider } from "@/app/utils/oauth";
import { useUser } from "@/app/components/provider/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, loading } = useUser();

  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const socialError = searchParams.get("social_error");
  const errorEmail = searchParams.get("email");

  useEffect(() => {
    // If we are logged in, redirect to the homepage
    if (!!user) {
      window.location.href = "/";
    }
  }, [user]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7f7f7",
      }}
    >
      <Paper shadow="lg" radius="md" p="xl" withBorder style={{ width: 400 }}>
        <LoadingOverlay visible={loading} blur={2} />
        <Stack spacing="md">
          <Title order={2} align="center">
            Sign in
          </Title>

          {socialError && (
            <Alert color="red">
              {socialError === "no_user" && (
                <>No account exists for {errorEmail}. Please contact support.</>
              )}
              {socialError === "no_email" && (
                <>Social login did not provide an email. Please try another method.</>
              )}
            </Alert>
          )}

          <Button
            fullWidth
            variant="outline"
            color="gray"
            onClick={() => loginWithProvider("google", next)}
          >
            Continue with Google
          </Button>
          <Button
            fullWidth
            variant="outline"
            color="gray"
            onClick={() => loginWithProvider("discord", next)}
          >
            Continue with Discord
          </Button>
        </Stack>
      </Paper>
    </div>
  );
}
