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
  interviewFormatLabels,
  isValidIanaTimeZone,
  zonedWallTimeToUtcInstant,
} from "@/features/interviews/interviews";
import {
  rescheduleInterviewAction,
  scheduleInterviewAction,
  type InterviewActionResult,
} from "@/features/interviews/server/actions";

// Wall-clock form model. Submission converts date + time + timezone to a UTC
// instant client-side; the server independently re-validates the instant, the
// timezone, and every schedule rule.
const scheduleFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the interview a title.")
    .max(
      INTERVIEW_TITLE_MAX,
      `Title must be ${INTERVIEW_TITLE_MAX} characters or fewer.`,
    ),
  format: z.enum(INTERVIEW_FORMATS, { error: "Choose an interview format." }),
  date: z.string().min(1, "Choose a date."),
  time: z.string().min(1, "Choose a start time."),
  durationMinutes: z.string().min(1, "Choose a duration."),
  timeZone: z
    .string()
    .min(1, "Choose a timezone.")
    .refine(isValidIanaTimeZone, "Choose a valid timezone."),
  location: z
    .string()
    .trim()
    .max(
      INTERVIEW_LOCATION_MAX,
      `Location must be ${INTERVIEW_LOCATION_MAX} characters or fewer.`,
    ),
  meetingUrl: z
    .string()
    .trim()
    .max(INTERVIEW_MEETING_URL_MAX, "Meeting link is too long."),
  instructions: z
    .string()
    .trim()
    .max(
      INTERVIEW_INSTRUCTIONS_MAX,
      `Instructions must be ${INTERVIEW_INSTRUCTIONS_MAX.toLocaleString()} characters or fewer.`,
    ),
});

export type InterviewScheduleFormValues = z.input<typeof scheduleFormSchema>;

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1 hour 30 minutes" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "360", label: "6 hours" },
  { value: "480", label: "8 hours" },
] as const;

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
}: {
  target: InterviewScheduleTarget;
  triggerLabel: string;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<InterviewActionResult | null>(null);
  const defaults =
    target.mode === "reschedule" ? target.defaults : EMPTY_DEFAULTS;
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InterviewScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
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

  const submit = handleSubmit(async (values) => {
    setResult(null);
    const startAt = zonedWallTimeToUtcInstant(
      `${values.date}T${values.time}`,
      values.timeZone,
    );
    if (!startAt) {
      setError("date", { message: "Choose a valid date and time." });
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
        className="w-[min(94vw,28rem)] overflow-y-auto"
      >
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle>
            {target.mode === "schedule"
              ? "Schedule interview"
              : "Reschedule interview"}
          </SheetTitle>
          <SheetDescription>
            {target.mode === "schedule"
              ? "The candidate is asked to accept or decline this time."
              : "Rescheduling asks the candidate to respond to the new time."}
          </SheetDescription>
        </SheetHeader>

        <form className="grid gap-5 px-5 py-6" onSubmit={submit} noValidate>
          <FormField
            id="interview-title"
            label="Title"
            error={errors.title?.message}
          >
            <Input
              id="interview-title"
              maxLength={INTERVIEW_TITLE_MAX}
              placeholder="Technical interview"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title ? "interview-title-error" : undefined
              }
              {...register("title")}
            />
          </FormField>

          <FormField
            id="interview-format"
            label="Format"
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
                    <SelectValue placeholder="Choose a format" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {INTERVIEW_FORMATS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {interviewFormatLabels[value]}
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
              label="Date"
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
              label="Start time"
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
              label="Duration"
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
                      <SelectValue placeholder="Choose a duration" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {DURATION_OPTIONS.map((option) => (
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
              label="Timezone"
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
                      <SelectValue placeholder="Choose a timezone" />
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
              label={format === "ONSITE" ? "Location" : "Location (optional)"}
              error={errors.location?.message}
            >
              <Input
                id="interview-location"
                maxLength={INTERVIEW_LOCATION_MAX}
                placeholder="12 Harbor Street, 4th floor"
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
                format === "VIDEO" ? "Meeting link" : "Meeting link (optional)"
              }
              hint="HTTPS links only. Shared with the candidate on the interview page."
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
            label="Instructions (optional)"
            hint={
              format === "PHONE"
                ? "Explain who calls whom and any preparation."
                : "Preparation notes shared with the candidate."
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
              {target.mode === "schedule"
                ? "Schedule interview"
                : "Reschedule interview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
