"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProfileMenu } from "@/components/app/ProfileMenu";

/** "sign in." for visitors; the account menu (dashboard, log out) once signed in. */
export function AccountButton() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user))).catch(() => {});
  }, []);
  if (signedIn) return <ProfileMenu links={[{ href: "/dashboard", label: "Dashboard" }]} />;
  return <Link href="/login" className="px-2 py-3 text-[15px] font-medium hover:opacity-70">sign in.</Link>;
}
