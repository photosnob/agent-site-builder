import { Suspense } from "react";
import { AuthForm } from "@/components/app/AuthForm";
export default function Login() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
