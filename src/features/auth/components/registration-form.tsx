"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

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
import { cn } from "@/lib/utils";
import { registerUserAction } from "@/features/auth/server/actions";
import {
  createRegistrationSchema,
  type RegistrationValues,
} from "@/features/auth/schemas";
import { LocaleLink } from "@/i18n/client";
import type { AuthDictionary, ValidationDictionary } from "@/i18n/dictionary";

export function RegistrationForm({
  t,
  validation,
}: {
  t: AuthDictionary["register"];
  validation: ValidationDictionary;
}) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const schema = useMemo(
    () => createRegistrationSchema(validation),
    [validation],
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "CANDIDATE",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
  });
  const selectedRole = useWatch({ control, name: "role" });

  const accountTypes = [
    {
      role: "CANDIDATE" as const,
      icon: BriefcaseBusiness,
      title: t.candidateTitle,
      description: t.candidateDescription,
      points: [t.candidatePoint1, t.candidatePoint2, t.candidatePoint3],
    },
    {
      role: "RECRUITER" as const,
      icon: Building2,
      title: t.recruiterTitle,
      description: t.recruiterDescription,
      points: [t.recruiterPoint1, t.recruiterPoint2, t.recruiterPoint3],
    },
  ];

  function handleRoleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
      ? 1
      : ["ArrowLeft", "ArrowUp"].includes(event.key)
        ? -1
        : 0;

    if (!direction) return;

    event.preventDefault();
    const currentIndex = accountTypes.findIndex(
      (account) => account.role === selectedRole,
    );
    const nextIndex =
      (currentIndex + direction + accountTypes.length) % accountTypes.length;
    const nextRole = accountTypes[nextIndex].role;

    setValue("role", nextRole, { shouldValidate: true });
    document.getElementById(`role-${nextRole.toLowerCase()}`)?.focus();
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setServerMessage(null);
      setSuccessMessage(null);

      try {
        const result = await registerUserAction(values);

        if (!result.success) {
          setServerMessage(result.message);
          Object.entries(result.fieldErrors ?? {}).forEach(
            ([field, message]) => {
              if (message && field in values) {
                setError(field as keyof RegistrationValues, { message });
              }
            },
          );
          return;
        }

        setSuccessMessage(result.message);
        router.replace(result.redirectTo);
        router.refresh();
      } catch {
        setServerMessage(t.fallbackError);
      }
    },
    () => {
      setServerMessage(null);
      setSuccessMessage(null);
    },
  );

  const errorMessages = Object.values(errors)
    .map((error) => error?.message)
    .filter(Boolean) as string[];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset>
        <legend className="text-lg font-semibold">{t.stepAccountType}</legend>
        <p className="text-muted-foreground mt-1 text-sm">
          {t.stepAccountTypeDescription}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {accountTypes.map((account) => {
            const Icon = account.icon;
            const id = `role-${account.role.toLowerCase()}`;

            return (
              <div key={account.role} className="relative">
                <input
                  id={id}
                  type="radio"
                  value={account.role}
                  aria-describedby={`${id}-description`}
                  className="peer sr-only"
                  {...register("role")}
                  onKeyDown={handleRoleKeyDown}
                />
                <label
                  htmlFor={id}
                  className={cn(
                    "bg-card ring-border hover:ring-primary/50 focus-within:ring-ring block h-full cursor-pointer rounded-xl p-5 ring-1 transition peer-focus-visible:ring-3",
                    selectedRole === account.role &&
                      "ring-primary bg-primary/5 ring-2",
                  )}
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span
                      className={cn(
                        "border-border flex size-6 items-center justify-center rounded-full border",
                        selectedRole === account.role &&
                          "bg-primary text-primary-foreground border-primary",
                      )}
                      aria-hidden="true"
                    >
                      {selectedRole === account.role && (
                        <Check className="size-4" />
                      )}
                    </span>
                  </span>
                  <span className="mt-4 block text-lg font-semibold">
                    {account.title}
                  </span>
                  <span
                    id={`${id}-description`}
                    className="text-muted-foreground mt-1 block text-sm leading-6"
                  >
                    {account.description}
                  </span>
                  <span className="mt-4 flex flex-wrap gap-2">
                    {account.points.map((point) => (
                      <span
                        key={point}
                        className="bg-muted rounded-full px-2.5 py-1 text-xs"
                      >
                        {point}
                      </span>
                    ))}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
        <FieldError id="role-error" message={errors.role?.message} />
      </fieldset>

      <Card className="shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="text-xl">{t.stepCreate}</CardTitle>
          <CardDescription>{t.stepCreateDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(serverMessage || errorMessages.length > 0) && (
            <div
              role="alert"
              aria-labelledby="registration-error-title"
              className="border-destructive/30 bg-destructive/5 rounded-lg border p-4"
            >
              <p id="registration-error-title" className="font-medium">
                {t.reviewTitle}
              </p>
              {serverMessage && (
                <p className="text-muted-foreground mt-1 text-sm">
                  {serverMessage}
                </p>
              )}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="border-primary/30 bg-primary/5 rounded-lg border p-4 text-sm"
            >
              {successMessage} {t.openingDashboard}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName">{t.fullNameLabel}</Label>
              <Input
                id="fullName"
                autoComplete="name"
                placeholder={t.fullNamePlaceholder}
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={
                  errors.fullName ? "fullName-error" : undefined
                }
                disabled={isSubmitting}
                {...register("fullName")}
              />
              <FieldError
                id="fullName-error"
                message={errors.fullName?.message}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">{t.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                disabled={isSubmitting}
                {...register("email")}
              />
              <FieldError id="email-error" message={errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-requirements password-error"
                disabled={isSubmitting}
                {...register("password")}
              />
              <p
                id="password-requirements"
                className="text-muted-foreground text-xs leading-5"
              >
                {t.passwordGuidance}
              </p>
              <FieldError
                id="password-error"
                message={errors.password?.message}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.confirmPasswordLabel}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "confirmPassword-error" : undefined
                }
                disabled={isSubmitting}
                {...register("confirmPassword")}
              />
              <FieldError
                id="confirmPassword-error"
                message={errors.confirmPassword?.message}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="termsAccepted"
                type="checkbox"
                className="border-input text-primary focus-visible:ring-ring mt-0.5 size-4 rounded border focus-visible:ring-2"
                aria-invalid={Boolean(errors.termsAccepted)}
                aria-describedby={
                  errors.termsAccepted ? "termsAccepted-error" : undefined
                }
                disabled={isSubmitting}
                {...register("termsAccepted")}
              />
              <Label htmlFor="termsAccepted" className="block leading-5">
                {t.termsLabel}
              </Label>
            </div>
            <FieldError
              id="termsAccepted-error"
              message={errors.termsAccepted?.message}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <LockKeyhole aria-hidden="true" data-icon="inline-start" />
            )}
            {isSubmitting ? t.submitting : t.submit}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            {t.alreadyHaveAccount}{" "}
            <LocaleLink
              href="/login"
              className="text-foreground rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t.signIn}
            </LocaleLink>
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
