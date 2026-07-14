"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { formatMessage } from "@/i18n/translate";

type ThemePreference = "system" | "light" | "dark";

export interface ThemeToggleLabels {
  system: string;
  light: string;
  dark: string;
  /** Template with {current} and {next} placeholders. */
  switchLabel: string;
  loading: string;
}

interface ThemeOption {
  next: ThemePreference;
  icon: LucideIcon;
}

const themeOptions: Record<ThemePreference, ThemeOption> = {
  system: {
    next: "light",
    icon: Monitor,
  },
  light: {
    next: "dark",
    icon: Sun,
  },
  dark: {
    next: "system",
    icon: Moon,
  },
};

const subscribe = () => () => undefined;

function useHasMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function isThemePreference(
  value: string | undefined,
): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const hasMounted = useHasMounted();
  const { theme, setTheme } = useTheme();
  const activeTheme = hasMounted && isThemePreference(theme) ? theme : "system";
  const option = themeOptions[activeTheme];
  const ThemeIcon = option.icon;
  const label = hasMounted
    ? formatMessage(labels.switchLabel, {
        current: labels[activeTheme],
        next: labels[option.next],
      })
    : labels.loading;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      data-theme-preference={activeTheme}
      disabled={!hasMounted}
      onClick={() => setTheme(option.next)}
    >
      <ThemeIcon aria-hidden="true" />
    </Button>
  );
}
