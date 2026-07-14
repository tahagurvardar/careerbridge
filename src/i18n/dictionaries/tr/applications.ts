import type { ApplicationsDictionary } from "@/i18n/dictionary";

export const applications: ApplicationsDictionary = {
  timeline: {
    noHistory: "Durum geçmişi bulunmuyor.",
    submitted: "Başvuru gönderildi",
    movedTo: "{status} durumuna geçirildi",
    byActor: "{name} tarafından",
  },
  withdraw: {
    trigger: "Başvuruyu geri çek",
    title: "Bu başvuru geri çekilsin mi?",
    description:
      "Bu işlem kesindir. İşe alım ekibi bu rolden çekildiğinizi görecektir.",
    keep: "Başvuruyu koru",
    confirm: "Geri çek",
    withdrawing: "Geri çekiliyor…",
  },
  actions: {
    checkFields: "Vurgulanan alanları kontrol edip tekrar deneyin.",
    profileIncomplete: "Başvurmadan önce profilinizi tamamlayın: {details}.",
    profileHeadline: "Profesyonel başlık",
    profileLocation: "Konum",
    profileSkill: "En az bir beceri",
    alreadyApplied: "Bu iş ilanına zaten başvurdunuz.",
    deadlinePassed: "Bu iş ilanı için başvurular kapandı.",
    notEligible: "Bu iş ilanı artık başvuru kabul etmiyor.",
    candidateOnly: "İş ilanlarına yalnızca adaylar başvurabilir.",
    submitFailed: "Başvurunuz gönderilemedi. Lütfen tekrar deneyin.",
    invalidTransition: "Bu işlem şu anda bu başvuru için kullanılamıyor.",
    unavailable: "Bu başvuru bulunamadı veya kullanılamıyor.",
    failed: "Bu işlem tamamlanamadı. Lütfen tekrar deneyin.",
    submitted: "Başvuru gönderildi.",
    withdrawn: "Başvuru geri çekildi.",
    updated: "Başvuru güncellendi.",
  },
};
