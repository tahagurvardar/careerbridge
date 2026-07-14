import type { MetadataDictionary } from "@/i18n/dictionary";

export const metadata: MetadataDictionary = {
  root: {
    defaultTitle: "CareerBridge — Sizi ileri taşıyan işi bulun",
    template: "%s | CareerBridge",
    description:
      "CareerBridge, modern bir iş ve staj platformu aracılığıyla hırslı adayları özenli ekiplerle buluşturur.",
    ogTitle: "CareerBridge",
    ogDescription:
      "Adaylar ve işe alım uzmanları için potansiyelden fırsata giden daha net bir yol.",
  },
  jobs: {
    title: "İlanlar",
    description:
      "CareerBridge'de yayınlanan ilanları role, şirkete, beceriye ve konuma göre arayın.",
  },
  jobDetail: {
    notFoundTitle: "İlan bulunamadı",
    descriptionFallback:
      "{companyName} şirketinde {jobTitle} — CareerBridge'de yayınlandı.",
  },
  companies: {
    title: "Şirketler",
    description: "CareerBridge'de yayınlanan şirket profillerini keşfedin.",
  },
  companyDetail: {
    title: "Şirket profili",
    description:
      "CareerBridge'de yayınlanmış bir şirket profilini görüntüleyin.",
  },
  login: {
    title: "Giriş yap",
    description: "CareerBridge çalışma alanınıza güvenle giriş yapın.",
  },
  register: {
    title: "Hesap oluştur",
    description: "CareerBridge Aday veya İşe Alım Uzmanı hesabı oluşturun.",
  },
  notifications: {
    title: "Bildirimler",
    description: "CareerBridge etkinlik ve bildirim merkeziniz.",
  },
  notificationSettings: {
    title: "Bildirim ayarları",
    description: "İşlemsel e-posta gönderim tercihlerini yönetin.",
  },
};
