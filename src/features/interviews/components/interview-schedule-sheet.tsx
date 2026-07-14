"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormStatus,
} from "@/features/candidate-profile/components/form-field";
import {
  INTERVIEW_FORMATS,
  INTERVIEW_INSTRUCTIONS_MAX,
  INTERVIEW_LOCATION_MAX,
  INTERVIEW_MEETING_URL_MAX,
  INTERVIEW_TITLE_MAX,
  isValidIanaTimeZone,
  zonedWallTimeToUtcInstant,
} from "@/features/interviews/interviews";
import {
  rescheduleInterviewAction,
  scheduleInterviewAction,
  type InterviewActionResult,
} from "@/features/interviews/server/actions";
import { useLocale } from "@/i18n/client";
import type { AppDictionary } from "@/i18n/dictionary";
import { formatInteger } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

// Wall-clock form model. Submission converts date + time + timezone to a UTC
// instant client-side; the server independently re-validates the instant, the
// timezone, and every schedule rule.
function buildScheduleFormSchema(
  labels: AppDictionary["interviews"]["scheduleForm"],
) {
  const validation = labels.validation;
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, validation.titleRequired)
      .max(
        INTERVIEW_TITLE_MAX,
        formatMessage(validation.titleTooLong, { max: INTERVIEW_TITLE_MAX }),
      ),
    format: z.enum(INTERVIEW_FORMATS, { error: validation.formatRequired }),
    date: z.string().min(1, validation.dateRequired),
    time: z.string().min(1, validation.timeRequired),
    durationMinutes: z.string().min(1, validation.durationRequired),
    timeZone: z
      .string()
      .min(1, validation.timezoneRequired)
      .refine(isValidIanaTimeZone, validation.timezoneInvalid),
    location: z
      .string()
      .trim()
      .max(
        INTERVIEW_LOCATION_MAX,
        formatMessage(validation.locationTooLong, {
          max: INTERVIEW_LOCATION_MAX,
        }),
      ),
    meetingUrl: z
      .string()
      .trim()
      .max(INTERVIEW_MEETING_URL_MAX, validation.meetingLinkTooLong),
    instructions: z
      .string()
      .trim()
      .max(
        INTERVIEW_INSTRUCTIONS_MAX,
        formatMessage(validation.instructionsTooLong, {
          max: INTERVIEW_INSTRUCTIONS_MAX,
        }),
      ),
  });
}

export type InterviewScheduleFormValues = z.input<
  ReturnType<typeof buildScheduleFormSchema>
>;

const DURATION_VALUES = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480] as const;

/** Maps server-side wire-field errors back onto the wall-clock form fields. */
const SERVER_FIELD_MAP: Record<string, keyof InterviewScheduleFormValues> = {
  title: "title",
  format: "format",
  startAt: "date",
  endAt: "durationMinutes",
  timeZone: "timeZone",
  location: "location",
  meetingUrl: "meetingUrl",
  instructions: "instructions",
};

export type InterviewScheduleTarget =
  | { mode: "schedule"; applicationId: string }
  | {
      mode: "reschedule";
      interviewId: string;
      expectedVersion: number;
      defaults: InterviewScheduleFormValues;
    };

const EMPTY_DEFAULTS: InterviewScheduleFormValues = {
  title: "",
  format: "VIDEO",
  date: "",
  time: "",
  durationMinutes: "60",
  timeZone: "UTC",
  location: "",
  meetingUrl: "",
  instructions: "",
};

export function InterviewScheduleSheet({
  target,
  triggerLabel,
  triggerVariant = "default",
  labels,
  formatLabels,
}: {
  target: InterviewScheduleTarget;
  triggerLabel: string;
  triggerVariant?: "default" | "outline";
  labels: AppDictionary["interviews"]["scheduleForm"];
  formatLabels: AppDictionary["labels"]["interviewFormat"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<InterviewActionResult | null>(null);
  const defaults =
    target.mode === "reschedule" ? target.defaults : EMPTY_DEFAULTS;
  const schema = useMemo(() => buildScheduleFormSchema(labels), [labels]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InterviewScheduleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const format = useWatch({ control, name: "format" });

  // The browser's zone is only known client-side; defaulting after mount
  // avoids a server/client hydration mismatch for new schedules.
  useEffect(() => {
    if (target.mode === "schedule") {
      const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (isValidIanaTimeZone(browserZone)) {
        setValue("timeZone", browserZone);
      }
    }
  }, [target.mode, setValue]);

  const timeZoneOptions = useMemo(() => {
    const zones =
      Intl.supportedValuesOf("timeZone").filter(isValidIanaTimeZone);
    return zones.includes("UTC") ? zones : ["UTC", ...zones];
  }, []);
  const durationOptions = useMemo(
    () =>
      DURATION_VALUES.map((minutes) => {
        const hours = Math.floor(minutes / 60);
        const remaining = minutes % 60;
        const label =
          hours === 0
            ? formatMessage(labels.minutes, {
                minutes: formatInteger(locale, minutes),
              })
            : remaining > 0
              ? formatMessage(labels.hourMinutes, {
                  hours: formatInteger(locale, hours),
                  minutes: formatInteger(locale, remaining),
                })
              : formatMessage(hours === 1 ? labels.hour : labels.hours, {
                  hours: formatInteger(locale, hours),
                });
        return { value: String(minutes), label };
      }),
    [labels, locale],
  );

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const startAt = zonedWallTimeToUtcInstant(
      `${values.date}T${values.time}`,
      values.timeZone,
    );
    if (!startAt) {
      setError("date", { message: labels.validation.invalidDateTime });
      return;
    }
    const endAt = new Date(
      startAt.getTime() + Number(values.durationMinutes) * 60_000,
    );

    const payload = {
      title: values.title,
      format: values.format,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timeZone: values.timeZone,
      location: values.location,
      meetingUrl: values.meetingUrl,
      instructions: values.instructions,
    };
    const nextResult =
      target.mode === "schedule"
        ? await scheduleInterviewAction(target.applicationId, payload)
        : await rescheduleInterviewAction(
            target.interviewId,
            target.expectedVersion,
            payload,
          );

    if (!nextResult.success) {
      Object.entries(nextResult.fieldErrors ?? {}).forEach(
        ([field, message]) => {
          const formField = SERVER_FIELD_MAP[field];
          if (formField && message) setError(formField, { message });
        },
      );
      setResult(nextResult);
      return;
    }

    setOpen(false);
    reset(defaults);
    router.refresh();
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setResult(null);
          reset(defaults);
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant={triggerVariant}>
          <CalendarPlus aria-hidden="true" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        closeLabel={labels.cancel}
        className="w-[min(94vw,28rem)] overflow-y-auto"
      >
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle>
            {target.mode === "schedule" ? labels.schedule : labels.reschedule}
          </SheetTitle>
          <SheetDescription>
            {target.mode === "schedule"
              ? labels.scheduleDescription
              : labels.rescheduleDescription}
          </SheetDescription>
        </SheetHeader>

        <form className="grid gap-5 px-5 py-6" onSubmit={submit} noValidate>
          <FormField
            id="interview-title"
            label={labels.title}
            error={errors.title?.message}
          >
            <Input
              id="interview-title"
              maxLength={INTERVIEW_TITLE_MAX}
              placeholder={labels.titlePlaceholder}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? "interview-title-error" : undefined
              }
              {...register("title")}
            />
          </FormField>

          <FormField
            id="interview-format"
            label={labels.format}
            error={errors.format?.message}
          >
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="interview-format"
                    className="h-9 w-full"
                    aria-invalid={Boolean(errors.format)}
                  >
                    <SelectValue placeholder={labels.chooseFormat} />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {INTERVIEW_FORMATS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatLabels[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="interview-date"
              label={labels.date}
              error={errors.date?.message}
            >
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="interview-date"
                    type="date"
                    aria-invalid={Boolean(errors.date)}
                    aria-describedby={
                      errors.date ? "interview-date-error" : undefined
                    }
                  />
                )}
              />
            </FormField>
            <FormField
              id="interview-time"
              label={labels.startTime}
              error={errors.time?.message}
            >
              <Controller
                name="time"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="interview-time"
                    type="time"
                    aria-invalid={Boolean(errors.time)}
                    aria-describedby={
                      errors.time ? "interview-time-error" : undefined
                    }
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="interview-duration"
              label={labels.duration}
              error={errors.durationMinutes?.message}
            >
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="interview-duration"
                      className="h-9 w-full"
                      aria-invalid={Boolean(errors.durationMinutes)}
                    >
                      <SelectValue placeholder={labels.chooseDuration} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              id="interview-timezone"
              label={labels.timezone}
              error={errors.timeZone?.message}
            >
              <Controller
                name="timeZone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="interview-timezone"
                      className="h-9 w-full"
                      aria-invalid={Boolean(errors.timeZone)}
                    >
                      <SelectValue placeholder={labels.chooseTimezone} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {timeZoneOptions.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          {format === "ONSITE" || format === "OTHER" ? (
            <FormField
              id="interview-location"
              label={
                format === "ONSITE" ? labels.location : labels.locationOptional
              }
              error={errors.location?.message}
            >
              <Input
                id="interview-location"
                maxLength={INTERVIEW_LOCATION_MAX}
                placeholder={labels.locationPlaceholder}
                aria-invalid={Boolean(errors.location)}
                aria-describedby={
                  errors.location ? "interview-location-error" : undefined
                }
                {...register("location")}
              />
            </FormField>
          ) : null}

          {format === "VIDEO" || format === "OTHER" ? (
            <FormField
              id="interview-meeting-url"
              label={
                format === "VIDEO"
                  ? labels.meetingLink
                  : labels.meetingLinkOptional
              }
              hint={labels.meetingLinkHint}
              error={errors.meetingUrl?.message}
            >
              <Input
                id="interview-meeting-url"
                type="url"
                inputMode="url"
                maxLength={INTERVIEW_MEETING_URL_MAX}
                placeholder="https://meet.example.com/room"
                aria-invalid={Boolean(errors.meetingUrl)}
                aria-describedby={
                  errors.meetingUrl
                    ? "interview-meeting-url-error"
                    : "interview-meeting-url-hint"
                }
                {...register("meetingUrl")}
              />
            </FormField>
          ) : null}

          <FormField
            id="interview-instructions"
            label={labels.instructionsOptional}
            hint={
              format === "PHONE" ? labels.phoneHint : labels.instructionsHint
            }
            error={errors.instructions?.message}
          >
            <Textarea
              id="interview-instructions"
              rows={4}
              maxLength={INTERVIEW_INSTRUCTIONS_MAX}
              aria-invalid={Boolean(errors.instructions)}
              aria-describedby={
                errors.instructions
                  ? "interview-instructions-error"
                  : "interview-instructions-hint"
              }
              {...register("instructions")}
            />
          </FormField>

          {result && !result.success ? (
            <FormStatus message={result.message} />
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <CalendarPlus aria-hidden="true" />
              )}
              {target.mode === "schedule" ? labels.schedule : labels.reschedule}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {labels.cancel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
