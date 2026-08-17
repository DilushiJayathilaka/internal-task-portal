"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { LoginSchema, SignupSchema } from "@/lib/validation";
import { USER_DIRECTORY_TAG } from "@/lib/user-directory";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type AuthFormState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string;
  // Re-populates non-sensitive fields after a failed submission so the user
  // isn't forced to retype a valid name/email just because the password was
  // wrong - password itself is intentionally never included here.
  values?: {
    name?: string;
    email?: string;
  };
} | undefined;

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Server Actions run only on the server, so they're a safe place to touch
// the database directly with credentials from the submitted form. Both
// actions re-validate with zod server-side - client-side validation is only
// a UX nicety and must never be trusted.

// Applied before any validation/DB work, keyed by IP - see lib/rate-limit.ts
// for what this does and doesn't protect against. Signup gets a looser cap
// (spam/mass-account-creation protection); login gets a tighter one
// (brute-force/credential-stuffing protection), since a legitimate typo'd
// password is a lot more common than a legitimate rapid-fire signup.
const SIGNUP_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour per IP
const LOGIN_LIMIT = { max: 10, windowMs: 5 * 60 * 1000 }; // 10 per 5 minutes per IP

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`signup:${ip}`, SIGNUP_LIMIT.max, SIGNUP_LIMIT.windowMs)) {
    return { message: "Too many signup attempts. Please try again later." };
  }

  const validated = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      values: { name: stringField(formData, "name"), email: stringField(formData, "email") },
    };
  }

  const { name, email, password } = validated.data;
  const passwordHash = await hashPassword(password);
  const values = { name, email };

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { errors: { email: ["An account with this email already exists."] }, values };
    }
    return { message: "Something went wrong while creating your account. Please try again.", values };
  }

  // The cached user directory (lib/user-directory.ts) that powers every
  // "assign to" picker doesn't know this account exists yet - updateTag
  // (not revalidateTag) because this is a Server Action and we want the
  // brand-new user to see themselves as assignable immediately after
  // redirecting, not on whatever page happens to revalidate the tag next.
  updateTag(USER_DIRECTORY_TAG);

  await createSession({ userId, role: "USER" });
  redirect("/tasks");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`login:${ip}`, LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)) {
    return { message: "Too many login attempts. Please wait a few minutes and try again." };
  }

  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      values: { email: stringField(formData, "email") },
    };
  }

  const { email, password } = validated.data;
  const values = { email };

  const user = await prisma.user.findUnique({ where: { email } });

  // Deliberately generic error message: don't reveal whether the email is
  // registered, to avoid leaking account existence to an attacker.
  const invalidCredentials = { message: "Invalid email or password.", values };

  if (!user) {
    return invalidCredentials;
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return invalidCredentials;
  }

  await createSession({ userId: user.id, role: user.role });
  redirect("/tasks");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
