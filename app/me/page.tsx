import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/illustrations/Wordmark";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--neutral-50)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: "var(--r-md)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <Link href="/" style={{ alignSelf: "flex-start", textDecoration: "none" }}>
          <Wordmark size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
            Hello, {user.email}
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
            You&apos;re signed in.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="primary">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
