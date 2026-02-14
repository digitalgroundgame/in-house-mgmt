"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Paper, Stack, Title, Button, LoadingOverlay, Alert } from "@mantine/core";
import { loginWithProvider } from "@/app/utils/oauth";
import { useUser } from "@/app/components/provider/UserContext";

// 1. Move the logic into a internal "Content" component
function LoginContent() {
  const { user, loading } = useUser();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";
  const socialError = searchParams.get("social_error");
  const errorEmail = searchParams.get("email");

  useEffect(() => {
    if (!!user) {
      window.location.href = "/";
    }
  }, [user]);

  return (
    <Paper shadow="lg" radius="md" p="xl" withBorder style={{ width: 400, position: "relative" }}>
      <LoadingOverlay visible={loading} />
      <Stack>
        <Title order={2}>Sign in</Title>

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
  );
}

// 2. The default export just provides the Suspense boundary
export default function LoginPage() {
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
      <Suspense
        fallback={
          <Paper shadow="lg" radius="md" p="xl" withBorder style={{ width: 400, height: 200 }}>
            <LoadingOverlay visible />
          </Paper>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
