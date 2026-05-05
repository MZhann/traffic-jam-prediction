"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token } = useAuth();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    } else if (user?.role !== "admin") {
      router.replace("/");
    }
  }, [router, token, user]);

  if (!token || user?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        checking permissions…
      </main>
    );
  }
  return <>{children}</>;
}
