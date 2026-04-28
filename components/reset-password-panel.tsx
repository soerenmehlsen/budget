"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase/client";

export default function ResetPasswordPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const exchangeRecoveryCode = async () => {
      if (!code) {
        setIsCheckingLink(false);
        setErrorMessage(
          "Linket mangler en genindlogning. Åbn nulstillingslinket fra e-mailen igen.",
        );
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setErrorMessage(
          "Jeg kunne ikke åbne nulstillingslinket. Prøv at bede om et nyt link.",
        );
      }

      setIsCheckingLink(false);
    };

    exchangeRecoveryCode();
  }, [code]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!password || !confirmPassword) {
      setErrorMessage("Udfyld begge felter, før du gemmer en ny adgangskode.");
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

    setIsSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Din adgangskode er opdateret. Du kan nu logge ind med den nye kode.");
    setPassword("");
    setConfirmPassword("");

    window.setTimeout(() => {
      router.push("/");
    }, 1800);
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
            <path d="M12 3 4.5 7v6.5C4.5 18.1 8.3 21 12 21s7.5-2.9 7.5-7.5V7L12 3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Nulstil adgangskode
        </h1>
        <p className="mt-3 text-lg font-medium text-blue-600 dark:text-blue-400 sm:text-xl">
          Vælg en ny adgangskode til din Budget-konto
        </p>
      </div>

      {isCheckingLink ? (
        <p className="rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-800/70 px-4 py-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          Jeg tjekker dit nulstillingslink...
        </p>
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

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="sr-only" htmlFor="new-password">
            Ny adgangskode
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ny adgangskode"
            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-800/75 dark:text-white dark:placeholder:text-slate-400 focus:border-blue-400 dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="confirm-password">
            Bekræft adgangskode
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Bekræft adgangskode"
            className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-base text-slate-900 outline-none transition placeholder:text-slate-500 dark:border-white/10 dark:bg-slate-800/75 dark:text-white dark:placeholder:text-slate-400 focus:border-blue-400 dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving || isCheckingLink}
          className="h-14 w-full rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_16px_36px_rgba(59,130,246,0.32)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
        >
          {isSaving ? "Gemmer..." : "Gem ny adgangskode"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="mx-auto block text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:text-slate-800 dark:hover:text-slate-200"
      >
        Tilbage til login
      </button>
    </section>
  );
}
