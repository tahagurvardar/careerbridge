import type { ErrorsDictionary } from "@/i18n/dictionary";

export const errors: ErrorsDictionary = {
  generic: "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
  notFound: "Tələb olunan qeyd tapılmadı.",
  accessDenied: "Bu əməliyyat üçün girişiniz yoxdur.",
  validationFailed: "İşarələnmiş sahələri yoxlayıb yenidən cəhd edin.",
  recordChanged: "Bu qeyd dəyişib. Səhifəni yeniləyib yenidən cəhd edin.",
  duplicateAction: "Bu əməliyyat artıq tamamlanıb.",
  invalidLifecycleAction: "Bu əməliyyat cari vəziyyətdə mümkün deyil.",
  requestFailed: "Sorğu tamamlana bilmədi. Zəhmət olmasa yenidən cəhd edin.",
  localeUpdateFailed: "Dil yenilənə bilmədi. Zəhmət olmasa yenidən cəhd edin.",
};
