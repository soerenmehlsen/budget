"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon } from "@/components/ui/eye";
import { EyeOffIcon } from "@/components/ui/eye-off";
import { supabase } from "../lib/supabase/client";

function getFriendlyAuthError(errorMessage: string) {
  const loweredMessage = errorMessage.toLowerCase();

  if (loweredMessage.includes("invalid login credentials")) {
    return "E-mail eller adgangskode er forkert.";
  }

  if (loweredMessage.includes("email not confirmed")) {
    return "Du skal bekræfte din e-mail, før du kan logge ind.";
  }

  if (loweredMessage.includes("user not found")) {
    return "Vi kunne ikke finde en bruger med den e-mail.";
  }

  return errorMessage;
}

export default function LoginPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (isMounted && data.session) {
        router.replace("/dashboard");
      }
    };

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          router.replace("/dashboard");
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(getFriendlyAuthError(error.message));
      return;
    }

    router.replace("/dashboard");
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email || !password || !confirmPassword) {
      setErrorMessage("Udfyld e-mail og begge adgangskodefelter.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Adgangskoden skal være mindst 6 tegn.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Adgangskoderne matcher ikke.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(getFriendlyAuthError(error.message));
      return;
    }

    setPassword("");
    setConfirmPassword("");

    if (data.session) {
      router.replace("/dashboard");
      return;
    }

    setStatusMessage("Brugeren er oprettet. Tjek din e-mail for at bekræfte kontoen, før du logger ind.");
    setMode("login");
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email) {
      setErrorMessage("Skriv din e-mail først, så kan jeg sende et nulstillingslink.");
      return;
    }

    setIsSendingReset(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsSendingReset(false);

    if (error) {
      setErrorMessage(getFriendlyAuthError(error.message));
      return;
    }

    setStatusMessage("Jeg har sendt et nulstillingslink til din e-mail. Følg linket for at vælge en ny adgangskode.");
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setErrorMessage(null);
    setStatusMessage(null);
  };

  return (
    <section className="w-full max-w-[460px] space-y-7 rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-blue-500 shadow-[0_18px_50px_rgba(59,130,246,0.4)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-10 w-10 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 7.5h10.8a2.7 2.7 0 0 1 2.7 2.7v6.3a2.4 2.4 0 0 1-2.4 2.4H7.2A2.7 2.7 0 0 1 4.5 16.2V7.5Z" />
            <path d="M18 10.5h-3.1a2 2 0 0 0 0 4H18" />
            <path d="M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h7.4" />
          </svg>
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Budget
        </h1>
        <p className="mt-3 text-lg font-medium text-blue-600 dark:text-blue-400 sm:text-xl">
          Hold styr på din økonomi
        </p>
      </div>

     

      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
        <li className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 20V10" />
            <path d="M10 20V4" />
            <path d="M16 20v-7" />
            <path d="M22 20H2" />
          </svg>
          <span>Overblik over indkomst og faste udgifter</span>
        </li>
        <li className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
          </svg>
          <span>Organiser udgifter i kategorier</span>
        </li>
        <li className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 7v10" />
            <path d="M17 10.5h0" />
            <path d="M7 10.5h0" />
            <path d="M4 11.5c0 4.1 3.7 7.5 8 7.5s8-3.4 8-7.5-3.7-7.5-8-7.5-8 3.4-8 7.5Z" />
          </svg>
          <span>Se dit rådighedsbeløb hver måned</span>
        </li>
      </ul>

      <form
        className="space-y-4"
        onSubmit={mode === "login" ? handleLogin : handleCreateUser}
      >
        <div className="relative">
          <label className="sr-only" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-800/75 dark:text-white dark:placeholder:text-slate-400 focus:border-blue-400 dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15"
          />
        </div>

        <div className="relative">
          <label className="sr-only" htmlFor="password">
            Adgangskode
          </label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "login" ? "Adgangskode" : "Vælg adgangskode"}
            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 pr-14 text-base text-slate-900 outline-none transition placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-800/75 dark:text-white dark:placeholder:text-slate-400 focus:border-blue-400 dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15"
          />
          <button
            type="button"
            aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-4 flex items-center text-slate-500 transition hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {showPassword ? (
              <EyeOffIcon aria-hidden="true" size={24} />
            ) : (
              <EyeIcon aria-hidden="true" size={24} />
            )}
          </button>
        </div>

        {mode === "signup" ? (
          <div className="relative">
            <label className="sr-only" htmlFor="confirm-password">
              Gentag adgangskode
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Gentag adgangskode"
              className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-800/75 dark:text-white dark:placeholder:text-slate-400 focus:border-blue-400 dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15"
            />
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-700 dark:text-red-200">
            {errorMessage}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-2xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-700 dark:text-emerald-100">
            {statusMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-14 w-full rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_16px_36px_rgba(59,130,246,0.32)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
        >
          {isSubmitting
            ? mode === "login"
              ? "Logger ind..."
              : "Opretter bruger..."
            : mode === "login"
              ? "Log ind"
              : "Opret bruger"}
        </button>
      </form>

      {mode === "login" ? (
        <div className="space-y-3 text-center">
          <button
            type="button"
            disabled={isSendingReset}
            onClick={handleForgotPassword}
            className="mx-auto block text-sm font-medium text-slate-600 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {isSendingReset ? "Sender nulstillingslink..." : "Glemt adgangskode?"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className="mx-auto block text-sm font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Opret ny bruger
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-500">
            Skriv din e-mail og gentag adgangskoden, så opretter jeg en ny bruger.
          </p>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="text-sm font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Tilbage til login
          </button>
        </div>
      )}
    </section>
  );
}
