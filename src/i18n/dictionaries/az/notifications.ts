import type { NotificationsDictionary } from "@/i18n/dictionary";

export const notifications: NotificationsDictionary = {
  events: {
    applicationSubmitted: {
      title: "Yeni müraciət alındı",
      message: "{candidate} {jobTitle} elanına müraciət etdi.",
    },
    applicationStatusChanged: {
      title: "Müraciət statusu yeniləndi",
      message: "{jobTitle} üzrə müraciətinizin statusu indi: {status}.",
    },
    applicationWithdrawn: {
      title: "Müraciət geri götürüldü",
      message: "{candidate} {jobTitle} üzrə müraciətini geri götürdü.",
    },
    companyInvitationReceived: {
      title: "Şirkət dəvəti",
      message: "{companyName} şirkətinə qoşulmağa dəvət olundunuz.",
    },
    interviewScheduled: {
      title: "Müsahibə planlaşdırıldı",
      message: "{jobTitle} üzrə müraciətiniz üçün müsahibə planlaşdırıldı.",
    },
    interviewRescheduled: {
      title: "Müsahibə yenidən planlaşdırıldı",
      message: "{jobTitle} üzrə müsahibəniz yenidən planlaşdırıldı.",
    },
    interviewCanceled: {
      title: "Müsahibə ləğv edildi",
      message: "{jobTitle} üzrə müsahibəniz ləğv edildi.",
    },
    interviewResponseReceived: {
      title: "Müsahibə cavabı alındı",
      messageAccepted: "{candidate} {jobTitle} üzrə müsahibəni qəbul etdi.",
      messageDeclined: "{candidate} {jobTitle} üzrə müsahibəni rədd etdi.",
    },
  },
  bell: {
    label: "Bildirişlər",
    unreadLabel: "Bildirişlər, {count} oxunmamış",
  },
  center: {
    badge: "Fəaliyyət",
    title: "Bildirişlər",
    description:
      "Müraciətlərinizlə bağlı yeniliklər tətbiq daxilində çatdırılır. Bildirişi açmaq sizi əlaqəli səhifəyə aparır və həmin səhifə girişinizi hər zaman yenidən yoxlayır.",
    total: "Cəmi",
    unread: "Oxunmamış",
    read: "Oxunmuş",
    filterAria: "Bildirişləri filtrlə",
    emailSettings: "E-poçt ayarları",
    clearFilter: "Filtri təmizlə",
    count: { one: "{count} bildiriş", other: "{count} bildiriş" },
    pagesAria: "Bildiriş səhifələri",
    emptyTitle: "Hələ bildiriş yoxdur",
    emptyFilteredTitle: "Uyğun bildiriş yoxdur",
    emptyDescription: "Müraciətlərinizdə fəaliyyət olduqda burada görünəcək.",
    emptyFilteredDescription:
      "Daha çox bildiriş görmək üçün başqa filtr sınayın.",
    viewAll: "Bütün bildirişlərə bax",
    newBadge: "Yeni",
    readSr: "Oxunub",
    view: "Bax",
    markRead: "Oxunmuş kimi qeyd et",
    markAllRead: "Hamısını oxunmuş kimi qeyd et",
  },
  actions: {
    invalidNotification: "Bu bildiriş əlçatan deyil.",
    markedRead: "Bildiriş oxunmuş kimi qeyd edildi.",
    markedAllRead: "Bütün bildirişlər oxunmuş kimi qeyd edildi.",
    updateFailed:
      "Bildirişi yeniləyə bilmədik. Zəhmət olmasa yenidən cəhd edin.",
    updateAllFailed:
      "Bildirişlərinizi yeniləyə bilmədik. Zəhmət olmasa yenidən cəhd edin.",
  },
};
