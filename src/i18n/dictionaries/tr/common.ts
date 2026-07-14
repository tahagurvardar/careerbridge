import type { CommonDictionary } from "@/i18n/dictionary";

export const common: CommonDictionary = {
  appName: "CareerBridge",
  skipToContent: "İçeriğe geç",
  copyright: "© {year} CareerBridge. Tüm hakları saklıdır.",
  footerTagline: "Anlamlı işlere giden daha iyi yollar kuruyoruz.",
  actions: {
    save: "Kaydet",
    saving: "Kaydediliyor…",
    cancel: "İptal",
    delete: "Sil",
    edit: "Düzenle",
    back: "Geri",
    close: "Kapat",
    view: "Görüntüle",
    search: "Ara",
    clear: "Temizle",
    clearFilters: "Filtreleri temizle",
    submit: "Gönder",
    confirm: "Onayla",
    tryAgain: "Tekrar dene",
    signIn: "Giriş yap",
    signOut: "Çıkış yap",
    createAccount: "Hesap oluştur",
    dashboard: "Panel",
    loading: "Yükleniyor…",
  },
  states: {
    notProvided: "Belirtilmemiş",
    none: "Yok",
    unknown: "Bilinmiyor",
  },
  pagination: {
    previous: "Önceki",
    next: "Sonraki",
    pageOf: "Sayfa {current} / {total}",
  },
  theme: {
    system: "Sistem",
    light: "Açık",
    dark: "Koyu",
    switchLabel: "Geçerli tema: {current}. {next} temaya geç.",
    loading: "Tema tercihi yükleniyor.",
  },
  notFound: {
    code: "404",
    title: "Bu yol henüz bir yere bağlanmıyor.",
    description:
      "Sayfa taşınmış olabilir ya da gelecekteki bir CareerBridge aşamasının parçası olabilir.",
    backHome: "CareerBridge'e dön",
  },
};
