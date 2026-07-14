import type { EmailDictionary } from "@/i18n/dictionary";

export const email: EmailDictionary = {
  events: {
    companyInvitation: {
      subject: "{companyName} şirkətinə qoşulmağa dəvət olundunuz",
      message:
        "CareerBridge platformasında {companyName} şirkətinə qoşulmağa dəvət olundunuz.",
      cta: "Dəvətə bax",
    },
    applicationSubmitted: {
      subject: "{jobTitle} üçün yeni müraciət",
      message: "{candidate} {jobTitle} elanına müraciət etdi.",
      cta: "Müraciəti nəzərdən keçir",
    },
    applicationStatusChanged: {
      subject: "Müraciət statusunuz yeniləndi",
      message: "{jobTitle} üzrə müraciətinizin statusu indi: {status}.",
      cta: "Müraciətə bax",
    },
    applicationWithdrawn: {
      subject: "{jobTitle} üzrə müraciət geri götürüldü",
      message: "{candidate} {jobTitle} üzrə müraciətini geri götürdü.",
      cta: "Müraciətə bax",
    },
    interviewScheduled: {
      subject: "{jobTitle} üçün müsahibə planlaşdırıldı",
      message:
        "{jobTitle} üzrə müraciətiniz üçün müsahibə planlaşdırıldı. Cədvələ baxmaq və cavab vermək üçün daxil olun.",
      cta: "Müsahibəyə bax",
    },
    interviewRescheduled: {
      subject: "{jobTitle} üçün müsahibə yenidən planlaşdırıldı",
      message:
        "{jobTitle} üzrə müsahibəniz yenidən planlaşdırıldı. Yeni vaxta baxmaq və cavab vermək üçün daxil olun.",
      cta: "Müsahibəyə bax",
    },
    interviewCanceled: {
      subject: "{jobTitle} üçün müsahibə ləğv edildi",
      message: "{jobTitle} üzrə müsahibəniz ləğv edildi.",
      cta: "Müsahibəyə bax",
    },
    interviewResponseReceived: {
      subject: "{jobTitle} üçün müsahibə cavabı alındı",
      messageAccepted: "{candidate} {jobTitle} üzrə müsahibəni qəbul etdi.",
      messageDeclined: "{candidate} {jobTitle} üzrə müsahibəni rədd etdi.",
      cta: "Müsahibəyə bax",
    },
  },
  eventLabels: {
    COMPANY_INVITATION_RECEIVED: "Şirkət dəvətləri",
    APPLICATION_SUBMITTED: "Yeni müraciətlər",
    APPLICATION_STATUS_CHANGED: "Müraciət statusu yeniləmələri",
    APPLICATION_WITHDRAWN: "Müraciətlərin geri götürülməsi",
    INTERVIEW_SCHEDULED: "Müsahibə planlaşdırılıb",
    INTERVIEW_RESCHEDULED: "Müsahibə yenidən planlaşdırılıb",
    INTERVIEW_CANCELED: "Müsahibə ləğv edilib",
    INTERVIEW_RESPONSE_RECEIVED: "Müsahibə cavabları",
  },
  eventDescriptions: {
    COMPANY_INVITATION_RECEIVED:
      "Bir şirkətə qoşulmağa dəvət olunduqda mənə e-poçt göndər.",
    APPLICATION_SUBMITTED:
      "Sahibi olduğum şirkətə namizəd müraciət etdikdə mənə e-poçt göndər.",
    APPLICATION_STATUS_CHANGED:
      "İşə götürən müraciətlərimdən birini yenilədikdə mənə e-poçt göndər.",
    APPLICATION_WITHDRAWN:
      "Sahibi olduğum şirkətdən namizəd müraciətini geri götürdükdə mənə e-poçt göndər.",
    INTERVIEW_SCHEDULED:
      "Müraciətlərimdən biri üçün müsahibə planlaşdırıldıqda mənə e-poçt göndər.",
    INTERVIEW_RESCHEDULED:
      "Müsahibələrimdən biri yenidən planlaşdırıldıqda mənə e-poçt göndər.",
    INTERVIEW_CANCELED:
      "Müsahibələrimdən biri ləğv edildikdə mənə e-poçt göndər.",
    INTERVIEW_RESPONSE_RECEIVED:
      "Namizəd müsahibəni qəbul və ya rədd etdikdə mənə e-poçt göndər.",
  },
  settings: {
    badge: "Ayarlar",
    title: "Bildiriş ayarları",
    description:
      "CareerBridge-in hansı əməliyyat yeniliklərini e-poçt göndərmə növbəsinə əlavə edə biləcəyini seçin. Göndərmə asinxrondur və gecikə bilər.",
    cardTitle: "Əməliyyat e-poçtu",
    cardDescription:
      "Seçimlər yeni hadisə baş verdikdə tətbiq olunur. Hadisəni yenidən aktivləşdirmək əvvəllər dayandırılmış e-poçtları göndərmir.",
    fieldsetLegend: "Əməliyyat e-poçtu seçimləri",
    save: "E-poçt ayarlarını yadda saxla",
    inAppTitle: "Tətbiqdaxili bildirişlər aktiv qalır.",
    inAppDescription:
      "Bu ayarlar yalnız e-poçt göndərilməsini idarə edir. Əlaqəli səhifələr açıldıqda girişinizi hər zaman yenidən yoxlayır.",
    openNotifications: "Bildirişləri aç",
  },
  actions: {
    notAvailable: "E-poçt ayarları əlçatan deyil.",
    invalid: "Bu e-poçt ayarları yadda saxlanıla bilmədi.",
    saved: "E-poçt ayarları yadda saxlanıldı.",
    saveFailed:
      "E-poçt ayarlarınızı yadda saxlaya bilmədik. Zəhmət olmasa yenidən cəhd edin.",
  },
};
