import { describe, expect, it } from "vitest";

import type { AppDictionary } from "@/i18n/dictionary";
import { dictionary as az } from "@/i18n/dictionaries/az";
import { dictionary as en } from "@/i18n/dictionaries/en";
import { dictionary as ru } from "@/i18n/dictionaries/ru";
import { dictionary as tr } from "@/i18n/dictionaries/tr";
import { extractPlaceholders } from "@/i18n/translate";

const dictionaries: Record<string, AppDictionary> = { en, tr, az, ru };

function isPlural(
  value: unknown,
): value is Record<string, string> & { other: string } {
  return Boolean(value && typeof value === "object" && "other" in value);
}

function auditShape(source: unknown, target: unknown, path: string): void {
  if (typeof source === "string") {
    expect(typeof target, path).toBe("string");
    expect((target as string).trim().length, path).toBeGreaterThan(0);
    expect(extractPlaceholders(target as string), path).toEqual(
      extractPlaceholders(source),
    );
    return;
  }
  if (isPlural(source)) {
    expect(isPlural(target), path).toBe(true);
    const targetPlural = target as Record<string, string> & { other: string };
    for (const [category, template] of Object.entries(targetPlural)) {
      expect(template.trim().length, `${path}.${category}`).toBeGreaterThan(0);
      expect(extractPlaceholders(template), `${path}.${category}`).toEqual(
        extractPlaceholders(source.other),
      );
    }
    return;
  }
  expect(target && typeof target === "object", path).toBeTruthy();
  expect(Object.keys(target as object).sort(), path).toEqual(
    Object.keys(source as object).sort(),
  );
  for (const key of Object.keys(source as object)) {
    auditShape(
      (source as Record<string, unknown>)[key],
      (target as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
    );
  }
}

describe("i18n dictionaries", () => {
  it("keeps namespace, key, placeholder, and non-empty value parity", () => {
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      auditShape(en, dictionary, locale);
    }
  });

  it("preserves native scripts and locale-specific enum labels", () => {
    expect(tr.navigation.findJobs).toContain("İş");
    expect(az.navigation.companies).toContain("Şirk");
    expect(ru.navigation.findJobs).toMatch(/[А-Яа-яЁё]/u);
    expect(
      new Set(Object.values(dictionaries).map((d) => d.labels.role.CANDIDATE))
        .size,
    ).toBe(4);
  });
});
