import type { AuthDictionary } from "@/i18n/dictionary";

export const auth: AuthDictionary = {
  login: {
    badge: "Təhlükəsiz hesab girişi",
    title: "Karyera iş sahənizə yenidən xoş gəlmisiniz.",
    description:
      "E-poçt və şifrənizlə daxil olun. CareerBridge sizi doğrulanmış platforma rolunuza təyin edilmiş panelə yönləndirəcək.",
    point1: "Verilənlər bazası ilə dəstəklənən sessiyalar",
    point2: "Serverdə doğrulanan rollar",
    point3: "Təhlükəsiz çıxış",
    cardTitle: "Daxil ol",
    cardDescription: "Hesabınıza təyin edilmiş iş sahəsinə davam edin.",
    emailLabel: "E-poçt ünvanı",
    emailPlaceholder: "siz@numune.com",
    passwordLabel: "Şifrə",
    showPassword: "Şifrəni göstər",
    hidePassword: "Şifrəni gizlət",
    submit: "Daxil ol",
    submitting: "Daxil olunur…",
    newTo: "CareerBridge-də yenisiniz?",
    createAccount: "Hesab yarat",
    fallbackError: "E-poçt və ya şifrə yanlışdır.",
  },
  register: {
    introEyebrow: "Yolunuzu seçin",
    introTitle: "Məqsədlərinizə uyğun iş sahəsini yaradın.",
    introDescription:
      "Namizəd və ya İşə götürən hesabı seçin, sonra təhlükəsiz CareerBridge girişinizi yaradın.",
    stepAccountType: "1. Hesab növünü seçin",
    stepAccountTypeDescription:
      "Açıq qeydiyyat yalnız Namizəd və ya İşə götürən kimi mümkündür.",
    candidateTitle: "Namizəd",
    candidateDescription: "İmkanları kəşf edin və karyera iş sahənizi qurun.",
    candidatePoint1: "Peşəkar profil",
    candidatePoint2: "Müraciətlər",
    candidatePoint3: "Yadda saxlanan imkanlar",
    recruiterTitle: "İşə götürən",
    recruiterDescription:
      "Gələcək işə qəbul fəaliyyətiniz üçün iş sahəsi hazırlayın.",
    recruiterPoint1: "Şirkət iş sahəsi",
    recruiterPoint2: "Elan dərci",
    recruiterPoint3: "Namizəd baxışı",
    stepCreate: "2. Hesabınızı yaradın",
    stepCreateDescription:
      "Əlçatan bir e-poçt istifadə edin. E-poçt doğrulaması sonrakı mərhələdə əlavə olunacaq; burada belə bir iddia yoxdur.",
    reviewTitle: "Zəhmət olmasa qeydiyyatınızı nəzərdən keçirin",
    openingDashboard: "Paneliniz açılır…",
    fullNameLabel: "Ad soyad",
    fullNamePlaceholder: "Əli Məmmədov",
    emailLabel: "E-poçt ünvanı",
    emailPlaceholder: "siz@numune.com",
    passwordLabel: "Şifrə",
    passwordGuidance:
      "12–128 simvol istifadə edin. Uzun, unikal şifrə ifadəsi yaxşı işləyir.",
    confirmPasswordLabel: "Şifrəni təsdiqlə",
    termsLabel: "Xidmət Şərtlərini və Məxfilik Siyasətini qəbul edirəm.",
    submit: "Hesab yarat",
    submitting: "Hesab yaradılır…",
    alreadyHaveAccount: "Artıq hesabınız var?",
    signIn: "Daxil ol",
    fallbackError:
      "Hesabınızı yarada bilmədik. Zəhmət olmasa bir azdan yenidən cəhd edin.",
  },
  serverMessages: {
    checkFields: "İşarələnmiş sahələri yoxlayıb yenidən cəhd edin.",
    accountReady: "CareerBridge hesabınız hazırdır.",
    signedIn: "Uğurla daxil oldunuz.",
    invalidCredentials: "E-poçt və ya şifrə yanlışdır.",
    tooManyAttempts:
      "Həddindən artıq cəhd edildi. Bir dəqiqə gözləyib yenidən cəhd edin.",
    emailUnavailable:
      "Bu e-poçt ilə hesab yaradıla bilmədi. Daxil olmağı sınayın və ya başqa e-poçt istifadə edin.",
    emailUnavailableField: "Bu e-poçt yeni hesab üçün istifadə oluna bilməz.",
    registrationFailed:
      "Hesabınızı yarada bilmədik. Zəhmət olmasa yenidən cəhd edin.",
    registrationFailedRetry:
      "Hesabınızı yarada bilmədik. Zəhmət olmasa bir azdan yenidən cəhd edin.",
    signInFailed:
      "Sizi daxil edə bilmədik. Zəhmət olmasa bir azdan yenidən cəhd edin.",
  },
};
