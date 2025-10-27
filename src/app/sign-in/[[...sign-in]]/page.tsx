"use client";

import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  params: Promise<{ "sign-in"?: string[] }>;
};

export default function SignInPage({ params }: SignInPageProps) {
  void params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
      />
    </div>
  );
}