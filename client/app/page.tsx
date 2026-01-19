"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/chat");
    }
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 100px)",
        fontSize: "18px"
      }}>
        Loading...
      </div>
    );
  }

  // If not signed in, automatically redirect to sign-in
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // This won't actually render since we redirect signed-in users to /chat above
  return null;
}
