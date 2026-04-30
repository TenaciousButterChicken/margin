import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, landingPathForProfile } from "@/lib/auth/profile";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/illustrations/Wordmark";

export const dynamic = "force-dynamic";

export default async function AccessDeniedPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  if (profile.status !== "rejected") redirect(landingPathForProfile(profile));

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
            Access denied
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-700)", margin: "10px 0 0", lineHeight: 1.5 }}>
            Your access to the Margin club platform has been declined. If you think this is a
            mistake, talk to the club lead in person.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
