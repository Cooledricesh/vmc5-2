"use client";

import { SignUp } from "@clerk/nextjs";

type SignUpPageProps = {
  params: Promise<{ "sign-up"?: string[] }>;
};

export default function SignUpPage({ params }: SignUpPageProps) {
  void params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
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