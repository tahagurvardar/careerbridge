import type { ErrorsDictionary } from "@/i18n/dictionary";

export const errors: ErrorsDictionary = {
  generic: "Bir sorun oluştu. Lütfen tekrar deneyin.",
  notFound: "İstenen kayıt bulunamadı.",
  accessDenied: "Bu işlem için erişiminiz yok.",
  validationFailed: "İşaretlenen alanları kontrol edip tekrar deneyin.",
  recordChanged: "Bu kayıt değişti. Sayfayı yenileyip tekrar deneyin.",
  duplicateAction: "Bu işlem zaten tamamlandı.",
  invalidLifecycleAction: "Bu işlem mevcut durumda kullanılamaz.",
  requestFailed: "İstek tamamlanamadı. Lütfen tekrar deneyin.",
  localeUpdateFailed: "Dil güncellenemedi. Lütfen tekrar deneyin.",
};
