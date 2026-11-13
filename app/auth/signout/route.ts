import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signs the current user out (clears the session cookies) and returns to the login page. */
export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
