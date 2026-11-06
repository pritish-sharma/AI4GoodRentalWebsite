import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Log in · Campus Rentals" };

// Only allow redirects back into this site, e.g. "/items/123".
function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <LoginForm next={safeNext(sp.next)} startOnSignup={sp.mode === "signup"} />
        ))}
      </Suspense>
    </main>
  );
}
