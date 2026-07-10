"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

type ThemePreference = "system" | "light" | "dark";

interface ThemeOption {
  label: string;
  next: ThemePreference;
  icon: LucideIcon;
}

const themeOptions: Record<ThemePreference, ThemeOption> = {
  system: {
    label: "System",
    next: "light",
    icon: Monitor,
  },
  light: {
    label: "Light",
    next: "dark",
    icon: Sun,
  },
  dark: {
    label: "Dark",
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

export function ThemeToggle() {
  const hasMounted = useHasMounted();
  const { theme, setTheme } = useTheme();
  const activeTheme = hasMounted && isThemePreference(theme) ? theme : "system";
  const option = themeOptions[activeTheme];
  const nextOption = themeOptions[option.next];
  const ThemeIcon = option.icon;
  const label = hasMounted
    ? "Current theme: " +
      option.label +
      ". Switch to " +
      nextOption.label.toLowerCase() +
      " theme."
    : "Theme preference is loading.";

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
