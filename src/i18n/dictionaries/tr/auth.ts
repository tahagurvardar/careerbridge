import type { AuthDictionary } from "@/i18n/dictionary";

export const auth: AuthDictionary = {
  login: {
    badge: "Güvenli hesap erişimi",
    title: "Kariyer çalışma alanınıza tekrar hoş geldiniz.",
    description:
      "E-posta ve şifrenizle giriş yapın. CareerBridge sizi doğrulanmış platform rolünüze atanmış panele yönlendirir.",
    point1: "Veritabanı destekli oturumlar",
    point2: "Sunucu doğrulamalı roller",
    point3: "Güvenli çıkış",
    cardTitle: "Giriş yap",
    cardDescription: "Hesabınıza atanmış çalışma alanına devam edin.",
    emailLabel: "E-posta adresi",
    emailPlaceholder: "siz@ornek.com",
    passwordLabel: "Şifre",
    showPassword: "Şifreyi göster",
    hidePassword: "Şifreyi gizle",
    submit: "Giriş yap",
    submitting: "Giriş yapılıyor…",
    newTo: "CareerBridge'de yeni misiniz?",
    createAccount: "Hesap oluştur",
    fallbackError: "E-posta veya şifre hatalı.",
  },
  register: {
    introEyebrow: "Yolunuzu seçin",
    introTitle: "Hedeflerinize uygun çalışma alanını oluşturun.",
    introDescription:
      "Aday veya İşe Alım Uzmanı hesabı seçin, ardından güvenli CareerBridge girişinizi oluşturun.",
    stepAccountType: "1. Hesap türünü seçin",
    stepAccountTypeDescription:
      "Herkese açık kayıt yalnızca Aday veya İşe Alım Uzmanı olarak yapılabilir.",
    candidateTitle: "Aday",
    candidateDescription:
      "Fırsatları keşfedin ve kariyer çalışma alanınızı oluşturun.",
    candidatePoint1: "Profesyonel profil",
    candidatePoint2: "Başvurular",
    candidatePoint3: "Kaydedilen fırsatlar",
    recruiterTitle: "İşe Alım Uzmanı",
    recruiterDescription:
      "Gelecekteki işe alım faaliyetleriniz için bir çalışma alanı hazırlayın.",
    recruiterPoint1: "Şirket çalışma alanı",
    recruiterPoint2: "İlan yayınlama",
    recruiterPoint3: "Aday inceleme",
    stepCreate: "2. Hesabınızı oluşturun",
    stepCreateDescription:
      "Erişebildiğiniz bir e-posta kullanın. E-posta doğrulaması sonraki bir aşamada eklenecek; burada böyle bir iddia yoktur.",
    reviewTitle: "Lütfen kaydınızı gözden geçirin",
    openingDashboard: "Paneliniz açılıyor…",
    fullNameLabel: "Ad soyad",
    fullNamePlaceholder: "Ali Yılmaz",
    emailLabel: "E-posta adresi",
    emailPlaceholder: "siz@ornek.com",
    passwordLabel: "Şifre",
    passwordGuidance:
      "12–128 karakter kullanın. Uzun ve benzersiz bir parola cümlesi iyi çalışır.",
    confirmPasswordLabel: "Şifreyi doğrula",
    termsLabel: "Hizmet Şartları'nı ve Gizlilik Politikası'nı kabul ediyorum.",
    submit: "Hesap oluştur",
    submitting: "Hesap oluşturuluyor…",
    alreadyHaveAccount: "Zaten hesabınız var mı?",
    signIn: "Giriş yap",
    fallbackError:
      "Hesabınızı oluşturamadık. Lütfen kısa süre sonra tekrar deneyin.",
  },
  serverMessages: {
    checkFields: "İşaretlenen alanları kontrol edip tekrar deneyin.",
    accountReady: "CareerBridge hesabınız hazır.",
    signedIn: "Başarıyla giriş yapıldı.",
    invalidCredentials: "E-posta veya şifre hatalı.",
    tooManyAttempts:
      "Çok fazla deneme yapıldı. Lütfen bir dakika bekleyip tekrar deneyin.",
    emailUnavailable:
      "Bu e-posta ile hesap oluşturulamadı. Giriş yapmayı deneyin veya başka bir e-posta kullanın.",
    emailUnavailableField: "Bu e-posta yeni bir hesap için kullanılamaz.",
    registrationFailed: "Hesabınızı oluşturamadık. Lütfen tekrar deneyin.",
    registrationFailedRetry:
      "Hesabınızı oluşturamadık. Lütfen kısa süre sonra tekrar deneyin.",
    signInFailed: "Giriş yapılamadı. Lütfen kısa süre sonra tekrar deneyin.",
  },
};
