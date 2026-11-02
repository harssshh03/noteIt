import { SignIn, SignUp } from "@clerk/clerk-react";
import { Wordmark } from "@/components/diary/Wordmark";

// Makes Clerk's box look like it belongs on the paper.
const appearance = {
  variables: {
    colorPrimary: "#26283a",
    colorBackground: "var(--paper)",
    colorText: "var(--ink)",
    colorInputBackground: "var(--paper)",
    colorInputText: "var(--ink)",
    borderRadius: "0.6rem",
    fontFamily: '"Geist Variable", system-ui, sans-serif',
  },
  elements: {
    card: "paper !shadow-none",
    rootBox: "mx-auto",
    headerTitle: "!font-display",
    formButtonPrimary: "!bg-ink !text-paper hover:!opacity-90 dark:!bg-marigold dark:!text-ink",
  },
};

function Frame({ children, line }: { children: React.ReactNode; line: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <Wordmark />
        <p className="font-hand text-2xl text-ink-soft">{line}</p>
        {children}
      </div>
    </main>
  );
}

export function SignInPage() {
  return (
    <Frame line="Welcome back — your pages kept your place.">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/app" appearance={appearance} />
    </Frame>
  );
}

export function SignUpPage() {
  return (
    <Frame line="Let's get you a fresh notebook.">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/app/me" appearance={appearance} />
    </Frame>
  );
}
