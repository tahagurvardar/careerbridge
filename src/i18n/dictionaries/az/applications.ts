import type { ApplicationsDictionary } from "@/i18n/dictionary";

export const applications: ApplicationsDictionary = {
  timeline: {
    noHistory: "Vəziyyət tarixçəsi mövcud deyil.",
    submitted: "Müraciət göndərildi",
    movedTo: "{status} vəziyyətinə keçirildi",
    byActor: "{name} tərəfindən",
  },
  withdraw: {
    trigger: "Müraciəti geri götür",
    title: "Bu müraciət geri götürülsün?",
    description:
      "Bu əməl yekundur. İşə qəbul komandası bu vəzifədən geri çəkildiyinizi görəcək.",
    keep: "Müraciəti saxla",
    confirm: "Geri götür",
    withdrawing: "Geri götürülür…",
  },
  actions: {
    checkFields: "Vurğulanmış sahələri yoxlayıb yenidən cəhd edin.",
    profileIncomplete:
      "Müraciət etməzdən əvvəl profilinizi tamamlayın: {details}.",
    profileHeadline: "Peşəkar başlıq",
    profileLocation: "Məkan",
    profileSkill: "Ən az bir bacarıq",
    alreadyApplied: "Bu vakansiyaya artıq müraciət etmisiniz.",
    deadlinePassed: "Bu vakansiya üçün müraciətlər bağlanıb.",
    notEligible: "Bu vakansiya artıq müraciət qəbul etmir.",
    candidateOnly: "Vakansiyalara yalnız namizədlər müraciət edə bilər.",
    submitFailed: "Müraciətinizi göndərmək mümkün olmadı. Yenidən cəhd edin.",
    invalidTransition: "Bu əməl hazırda bu müraciət üçün əlçatan deyil.",
    unavailable: "Bu müraciət tapılmadı və ya əlçatan deyil.",
    failed: "Bu əməli tamamlamaq mümkün olmadı. Yenidən cəhd edin.",
    submitted: "Müraciət göndərildi.",
    withdrawn: "Müraciət geri götürüldü.",
    updated: "Müraciət yeniləndi.",
  },
};
