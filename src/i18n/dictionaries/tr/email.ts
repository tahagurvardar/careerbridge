import type { EmailDictionary } from "@/i18n/dictionary";

export const email: EmailDictionary = {
  events: {
    companyInvitation: {
      subject: "{companyName} şirketine katılmaya davet edildiniz",
      message:
        "CareerBridge üzerinde {companyName} şirketine katılmaya davet edildiniz.",
      cta: "Daveti görüntüle",
    },
    applicationSubmitted: {
      subject: "{jobTitle} için yeni başvuru",
      message: "{candidate}, {jobTitle} ilanına başvurdu.",
      cta: "Başvuruyu incele",
    },
    applicationStatusChanged: {
      subject: "Başvuru durumunuz güncellendi",
      message: "{jobTitle} başvurunuzun durumu artık: {status}.",
      cta: "Başvuruyu görüntüle",
    },
    applicationWithdrawn: {
      subject: "{jobTitle} için başvuru geri çekildi",
      message: "{candidate}, {jobTitle} başvurusunu geri çekti.",
      cta: "Başvuruyu görüntüle",
    },
    interviewScheduled: {
      subject: "{jobTitle} için mülakat planlandı",
      message:
        "{jobTitle} başvurunuz için bir mülakat planlandı. Programı incelemek ve yanıtlamak için giriş yapın.",
      cta: "Mülakatı görüntüle",
    },
    interviewRescheduled: {
      subject: "{jobTitle} için mülakat yeniden planlandı",
      message:
        "{jobTitle} için mülakatınız yeniden planlandı. Yeni zamanı incelemek ve yanıtlamak için giriş yapın.",
      cta: "Mülakatı görüntüle",
    },
    interviewCanceled: {
      subject: "{jobTitle} için mülakat iptal edildi",
      message: "{jobTitle} için mülakatınız iptal edildi.",
      cta: "Mülakatı görüntüle",
    },
    interviewResponseReceived: {
      subject: "{jobTitle} için mülakat yanıtı alındı",
      messageAccepted: "{candidate}, {jobTitle} mülakatını kabul etti.",
      messageDeclined: "{candidate}, {jobTitle} mülakatını reddetti.",
      cta: "Mülakatı görüntüle",
    },
  },
  eventLabels: {
    COMPANY_INVITATION_RECEIVED: "Şirket davetleri",
    APPLICATION_SUBMITTED: "Yeni başvurular",
    APPLICATION_STATUS_CHANGED: "Başvuru durumu güncellemeleri",
    APPLICATION_WITHDRAWN: "Başvuru geri çekmeleri",
    INTERVIEW_SCHEDULED: "Mülakat planlandı",
    INTERVIEW_RESCHEDULED: "Mülakat yeniden planlandı",
    INTERVIEW_CANCELED: "Mülakat iptal edildi",
    INTERVIEW_RESPONSE_RECEIVED: "Mülakat yanıtları",
  },
  eventDescriptions: {
    COMPANY_INVITATION_RECEIVED:
      "Bir şirkete katılmaya davet edildiğimde bana e-posta gönder.",
    APPLICATION_SUBMITTED:
      "Sahibi olduğum bir şirkete bir aday başvurduğunda bana e-posta gönder.",
    APPLICATION_STATUS_CHANGED:
      "Bir işe alım uzmanı başvurularımdan birini güncellediğinde bana e-posta gönder.",
    APPLICATION_WITHDRAWN:
      "Sahibi olduğum bir şirketten bir aday başvurusunu geri çektiğinde bana e-posta gönder.",
    INTERVIEW_SCHEDULED:
      "Başvurularımdan biri için mülakat planlandığında bana e-posta gönder.",
    INTERVIEW_RESCHEDULED:
      "Mülakatlarımdan biri yeniden planlandığında bana e-posta gönder.",
    INTERVIEW_CANCELED:
      "Mülakatlarımdan biri iptal edildiğinde bana e-posta gönder.",
    INTERVIEW_RESPONSE_RECEIVED:
      "Bir aday mülakatı kabul veya reddettiğinde bana e-posta gönder.",
  },
  settings: {
    badge: "Ayarlar",
    title: "Bildirim ayarları",
    description:
      "CareerBridge'in hangi işlemsel güncellemeleri e-posta gönderim kuyruğuna ekleyebileceğini seçin. Gönderim eşzamansızdır ve gecikebilir.",
    cardTitle: "İşlemsel e-posta",
    cardDescription:
      "Tercihler yeni bir olay gerçekleştiğinde uygulanır. Bir olayı yeniden açmak, daha önce bastırılmış e-postaları göndermez.",
    fieldsetLegend: "İşlemsel e-posta tercihleri",
    save: "E-posta ayarlarını kaydet",
    inAppTitle: "Uygulama içi bildirimler açık kalır.",
    inAppDescription:
      "Bu ayarlar yalnızca e-posta gönderimini kontrol eder. İlgili sayfalar açıldığında erişiminizi her zaman yeniden doğrular.",
    openNotifications: "Bildirimleri aç",
  },
  actions: {
    notAvailable: "E-posta ayarları kullanılamıyor.",
    invalid: "Bu e-posta ayarları kaydedilemedi.",
    saved: "E-posta ayarları kaydedildi.",
    saveFailed: "E-posta ayarlarınızı kaydedemedik. Lütfen tekrar deneyin.",
  },
};
