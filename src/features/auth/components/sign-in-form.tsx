"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInUserAction } from "@/features/auth/server/actions";
import { signInSchema, type SignInValues } from "@/features/auth/schemas";

export function SignInForm({ callbackPath }: { callbackPath?: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", callbackPath },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);

    try {
      const result = await signInUserAction(values);

      if (!result.success) {
        setServerMessage(result.message);
        Object.entries(result.fieldErrors ?? {}).forEach(([field, message]) => {
          if (message && field in values) {
            setError(field as keyof SignInValues, { message });
          }
        });
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setServerMessage("Email or password is incorrect.");
    }
  });

  return (
    <Card className="mx-auto w-full max-w-md shadow-xl shadow-black/5">
      <CardHeader>
        <span className="bg-primary text-primary-foreground mb-4 flex size-11 items-center justify-center rounded-xl">
          <LockKeyhole aria-hidden="true" className="size-5" />
        </span>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Continue to the workspace assigned to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <input type="hidden" {...register("callbackPath")} />

          {serverMessage && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm"
            >
              {serverMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              disabled={isSubmitting}
              {...register("email")}
            />
            {errors.email?.message && (
              <p
                id="login-email-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-11"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "login-password-error" : undefined
                }
                disabled={isSubmitting}
                {...register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
            {errors.password?.message && (
              <p
                id="login-password-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            )}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            New to CareerBridge?{" "}
            <Link
              href="/register"
              className="text-foreground rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
