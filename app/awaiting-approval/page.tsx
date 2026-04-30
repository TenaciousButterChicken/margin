import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, landingPathForProfile } from "@/lib/auth/profile";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/illustrations/Wordmark";

export const dynamic = "force-dynamic";

export default async function AwaitingApprovalPage() {
  const profile = await getCurrentProfile();
  // If the user is anything other than pending, send them to the right place.
  if (!profile) redirect("/sign-in");
  if (profile.status !== "pending") redirect(landingPathForProfile(profile));

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
          maxWidth: 420,
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: "var(--r-md)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <Link href="/" style={{ alignSelf: "flex-start", textDecoration: "none" }}>
          <Wordmark size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
            Hang tight
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-700)", margin: "10px 0 0", lineHeight: 1.5 }}>
            Your account ({profile.email}) is waiting for the club lead to approve it.
            Once you&apos;re in, you&apos;ll be able to save your progress and run code
            cells. In the meantime you can browse the lessons.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href="/sessions"
            style={{
              fontSize: 14,
              padding: "10px 16px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--neutral-300)",
              color: "var(--neutral-900)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Browse lessons
          </Link>
          <form action={signOut} style={{ display: "inline" }}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
