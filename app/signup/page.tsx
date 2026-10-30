import { Suspense } from "react";
import { AuthForm } from "@/components/app/AuthForm";
export default function Signup() {
  return <Suspense><AuthForm mode="signup" /></Suspense>;
}
