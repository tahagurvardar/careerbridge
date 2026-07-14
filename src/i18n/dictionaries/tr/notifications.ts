import type { NotificationsDictionary } from "@/i18n/dictionary";

export const notifications: NotificationsDictionary = {
  events: {
    applicationSubmitted: {
      title: "Yeni başvuru alındı",
      message: "{candidate}, {jobTitle} ilanına başvurdu.",
    },
    applicationStatusChanged: {
      title: "Başvuru durumu güncellendi",
      message: "{jobTitle} başvurunuzun durumu artık: {status}.",
    },
    applicationWithdrawn: {
      title: "Başvuru geri çekildi",
      message: "{candidate}, {jobTitle} başvurusunu geri çekti.",
    },
    companyInvitationReceived: {
      title: "Şirket daveti",
      message: "{companyName} şirketine katılmaya davet edildiniz.",
    },
    interviewScheduled: {
      title: "Mülakat planlandı",
      message: "{jobTitle} başvurunuz için bir mülakat planlandı.",
    },
    interviewRescheduled: {
      title: "Mülakat yeniden planlandı",
      message: "{jobTitle} için mülakatınız yeniden planlandı.",
    },
    interviewCanceled: {
      title: "Mülakat iptal edildi",
      message: "{jobTitle} için mülakatınız iptal edildi.",
    },
    interviewResponseReceived: {
      title: "Mülakat yanıtı alındı",
      messageAccepted: "{candidate}, {jobTitle} mülakatını kabul etti.",
      messageDeclined: "{candidate}, {jobTitle} mülakatını reddetti.",
    },
  },
  bell: {
    label: "Bildirimler",
    unreadLabel: "Bildirimler, {count} okunmamış",
  },
  center: {
    badge: "Etkinlik",
    title: "Bildirimler",
    description:
      "Başvurularınızla ilgili güncellemeler uygulama içinde iletilir. Bir bildirimi açmak sizi ilgili sayfaya götürür ve bu sayfa erişiminizi her zaman yeniden doğrular.",
    total: "Toplam",
    unread: "Okunmamış",
    read: "Okunmuş",
    filterAria: "Bildirimleri filtrele",
    emailSettings: "E-posta ayarları",
    clearFilter: "Filtreyi temizle",
    count: { one: "{count} bildirim", other: "{count} bildirim" },
    pagesAria: "Bildirim sayfaları",
    emptyTitle: "Henüz bildirim yok",
    emptyFilteredTitle: "Eşleşen bildirim yok",
    emptyDescription:
      "Başvurularınızda bir hareket olduğunda burada görünecek.",
    emptyFilteredDescription:
      "Daha fazla bildirim görmek için farklı bir filtre deneyin.",
    viewAll: "Tüm bildirimleri görüntüle",
    newBadge: "Yeni",
    readSr: "Okundu",
    view: "Görüntüle",
    markRead: "Okundu işaretle",
    markAllRead: "Tümünü okundu işaretle",
  },
  actions: {
    invalidNotification: "Bu bildirim kullanılamıyor.",
    markedRead: "Bildirim okundu olarak işaretlendi.",
    markedAllRead: "Tüm bildirimler okundu olarak işaretlendi.",
    updateFailed: "Bildirimi güncelleyemedik. Lütfen tekrar deneyin.",
    updateAllFailed: "Bildirimlerinizi güncelleyemedik. Lütfen tekrar deneyin.",
  },
};
