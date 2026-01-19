"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    // If user is already signed in, redirect to chat
    if (isLoaded && isSignedIn) {
      router.push("/chat");
    } else if (isLoaded && !isSignedIn) {
      // Redirect to home page where they can sign in via header button
      router.push("/");
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "calc(100vh - 100px)"
    }}>
      <p>Redirecting...</p>
    </div>
  );
}
