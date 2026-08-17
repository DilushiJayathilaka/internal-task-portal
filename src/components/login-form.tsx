"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/actions/auth";

const initialState: AuthFormState = undefined;

const baseInput =
  "w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2";
const validInput = "border-border focus:border-blue-500 focus:ring-blue-500/30";
const invalidInput =
  "border-danger/60 bg-danger/5 focus:border-danger focus:ring-danger/25";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );
  const [prevState, setPrevState] = useState(state);
  const [errors, setErrors] = useState(state?.errors);
  const [message, setMessage] = useState(state?.message);
  const [submitCount, setSubmitCount] = useState(0);

  if (state !== prevState) {
    setPrevState(state);
    setErrors(state?.errors);
    setMessage(state?.message);
    setSubmitCount((c) => c + 1);
  }

  function clearError(field: "email" | "password") {
    setErrors((prev) =>
      prev?.[field] ? { ...prev, [field]: undefined } : prev
    );
    setMessage(undefined);
  }

  return (
    <form
      action={formAction}
      // Browser-native validation popups ("Please fill in this field") look
      // different per browser and interrupt the layout - noValidate turns
      // those off while leaving `required`/`type="email"` in place for
      // their accessibility value (aria-required semantics, mobile
      // keyboards). Every submission still reaches loginAction, whose zod
      // validation drives the styled inline messages below each field.
      noValidate
      className="space-y-5 rounded-2xl bg-surface p-6 shadow-lg shadow-slate-900/5 sm:p-7 dark:shadow-black/20"
    >
      {message && (
        <p
          role="alert"
          className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          {message}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          key={submitCount}
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.values?.email ?? ""}
          aria-invalid={Boolean(errors?.email)}
          onChange={() => clearError("email")}
          className={`${baseInput} ${
            errors?.email ? invalidInput : validInput
          }`}
        />
        {errors?.email && (
          <p className="text-xs text-danger">{errors.email[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(errors?.password)}
          onChange={() => clearError("password")}
          className={`${baseInput} ${
            errors?.password ? invalidInput : validInput
          }`}
        />
        {errors?.password && (
          <p className="text-xs text-danger">{errors.password[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-linear-to-r from-blue-800 to-blue-900 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/25 transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-700 hover:underline dark:text-blue-400"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
