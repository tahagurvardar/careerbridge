import type { AnalyticsDictionary } from "@/i18n/dictionary";

export const analytics: AnalyticsDictionary = {
  range: {
    "30D": "Son 30 gün",
    "90D": "Son 90 gün",
    "180D": "Son 180 gün",
    "365D": "Son 365 gün",
    ALL: "Tüm zamanlar",
    label: "Aralık: {range}",
    navigation: "Analiz tarih aralığı",
  },
  filters: {
    dateRange: "Tarih aralığı",
    company: "Şirket",
    companyAria: "Analiz şirketi",
    companyReset:
      "Şirket değiştirildiğinde iş filtresi bilinçli olarak sıfırlanır.",
    job: "İş ilanı",
    jobAria: "Analiz iş ilanı",
    allJobs: "Tüm iş ilanları",
    hidden: "Gizli",
  },
  semantics: {
    currentState:
      "Mevcut durum, yetkili kapsamın tamamında şu an için değerlendirilir.",
    createdInRange:
      "Aralıkta oluşturulanlar, sunucunun belirlediği UTC yarı açık zaman aralığını kullanır.",
    everReached:
      "Şimdiye kadar ulaşılan aşamalar, aralıktaki her kohort kaydını yaşam döngüsü aşaması başına bir kez sayar.",
  },
  shared: {
    applicationFunnel: "Başvuru hunisi",
    noCohort: "Bu kohortta başvuru yok",
    noCurrentRecords: "Mevcut kayıt yok",
    noTrendData: "Bu aralıkta etkinlik yok",
    funnelAria:
      "{title}. {submitted} gönderildi ve {hired} İşe Alındı aşamasına ulaştı. Genel işe alım dönüşümü {conversion}.",
    distributionAria: "{title}. {statuses} durum içinde {total} kayıt.",
    trendSummary: "Toplam {total}; en yüksek {period} döneminde {peak}.",
    trendAria: "{title}. Toplam {total}. En yüksek {period} döneminde {peak}.",
    noBucket: "dönem yok",
    overallConversion: "Genel Gönderildi → İşe Alındı dönüşümü: {conversion}.",
    exits: "Çıkışlar: {rejected} reddedildi ve {withdrawn} geri çekildi.",
    viewTable: "Erişilebilir veri tablosunu görüntüle",
    trendCaption: "{title}: UTC dönemlerine göre değerler",
    distributionCaption: "{title} veri tablosu",
    funnelCaption: "Başvuru hunisi aşama sayıları ve dönüşüm oranları",
    status: "Durum",
    count: "Sayı",
    period: "Dönem",
    stage: "Aşama",
    reached: "Aşamaya ulaşan başvurular",
    fromPrevious: "Önceki aşamadan",
    cohort: "Kohort",
  },
  candidate: {
    badge: "Aday analizleri",
    title: "Başvuru etkinliğiniz",
    description:
      "Başvurularınız, mülakatlarınız ve kaydettiğiniz iş ilanlarından oluşan özel toplamlar. Mevcut durum, seçilen UTC aralığında oluşturulan başvuruların yaşam boyu sonuçlarından ayrı tutulur.",
    applicationsCreated: "Oluşturulan başvurular",
    applicationsCreatedDescription: "{range} içinde oluşturduğunuz başvurular.",
    activeApplications: "Mevcut aktif başvurular",
    activeApplicationsDescription:
      "Başvurularınızın mevcut ve sonlanmamış durumları.",
    terminalApplications: "Mevcut tamamlanmış başvurular",
    terminalApplicationsDescription:
      "Mevcut İşe Alındı, Reddedildi veya Geri Çekildi durumlarınız.",
    reachedInterview: "Mülakata ulaşan başvurular",
    reachedOffer: "Teklife ulaşan başvurular",
    everReachedDescription:
      "Seçtiğiniz oluşturma kohortunun şimdiye kadar ulaştığı aşama.",
    hired: "İşe alım sonuçları",
    hiredDescription: "Kohortta İşe Alındı aşamasına ulaşmış başvurular.",
    interviewsCreated: "Oluşturulan mülakatlar",
    interviewsCreatedDescription: "{range} içinde oluşturulan mülakatlarınız.",
    upcomingInterviews: "Mevcut yaklaşan mülakatlar",
    upcomingInterviewsDescription:
      "Yanıt bekleyen veya kabul edilmiş ve henüz bitmemiş mülakatlar.",
    completedInterviews: "Mevcut tamamlanmış mülakatlar",
    completedInterviewsDescription:
      "Şu anda Tamamlandı olarak işaretli mülakatlarınız.",
    savedJobs: "Kaydedilen iş ilanları",
    savedJobsDescription:
      "Kullanılamayan geçmiş dahil mevcut kaydedilmiş iş ilanı sayınız.",
    rejected: "Reddedilme sonuçları",
    rejectedDescription: "Kohortta Reddedildi aşamasına ulaşan başvurular.",
    withdrawn: "Geri çekilme sonuçları",
    withdrawnDescription: "Kohortta Geri Çekildi aşamasına ulaşan başvurular.",
    statusTitle: "Mevcut başvuru durumlarınız",
    statusDescription:
      "Tüm başvurularınızın mevcut durumu; gizli geçmiş iş ilanları moderasyon gerekçeleri olmadan dahildir.",
    trendTitle: "Başvuru oluşturma eğiliminiz",
    trendDescription: "{range} için UTC oluşturma dönemleri.",
    funnelTitle: "Başvuru ilerlemeniz",
    funnelDescription:
      "{range} içinde oluşturduğunuz benzersiz başvuruların bugüne kadarki yaşam boyu aşama erişimi. Bu geçmişe yönelik bir açıklamadır, tahmin değildir.",
  },
  recruiter: {
    badge: "İşveren analizleri",
    ownerRequiredTitle: "Şirket SAHİBİ erişimi gerekli",
    ownerRequiredDescription:
      "İşe alım analizleri yalnızca hâlen sahibi olduğunuz şirketlerde kullanılabilir. ÜYE erişimi şirket metriklerini içermez.",
    noOwnedScope: "Sahibi olunan şirket kapsamı yok",
    noOwnedScopeDescription:
      "Analizleri görüntülemek için bir şirket oluşturun veya mevcut bir sahibinden üyeliğinizi yükseltmesini isteyin.",
    manageCompanies: "Şirketleri yönet",
    title: "İşe alım performansı",
    scopeAllJobs: "tüm iş ilanları genelinde",
    description:
      "{scope} için yalnızca SAHİPLERE açık toplam metrikler. Mevcut durum ve seçili kohort sonuçları ayrı etiketlenir.",
    companyHidden: "Şirket herkese açık keşiften gizli",
    scopeTitle: "Analiz kapsamı",
    scopeDescription:
      "Şirket değişiklikleri iş ilanı filtresini sıfırlar; tarih ve iş ilanı gezinmesi diğer geçerli filtreleri korur.",
    applicationsCreated: "Oluşturulan başvurular",
    createdDescription: "{range} içinde oluşturuldu.",
    activeApplications: "Mevcut aktif başvurular",
    activeApplicationsDescription:
      "Seçili şirket/iş ilanı kapsamındaki mevcut sonlanmamış durum.",
    reachedInterview: "Mülakata ulaşan başvurular",
    reachedOffer: "Teklife ulaşan başvurular",
    reachedHired: "İşe Alındı aşamasına ulaşan başvurular",
    everReachedDescription:
      "Seçili oluşturma kohortunun şimdiye kadar ulaştığı aşama.",
    publishedJobs: "Mevcut yayındaki iş ilanları",
    publishedJobsDescription:
      "Yetkili gizli iş ilanları dahil mevcut yaşam döngüsü durumu.",
    interviewsCreated: "Oluşturulan mülakatlar",
    completedInterviews: "Mevcut tamamlanmış mülakatlar",
    completedInterviewsDescription: "Seçili kapsamdaki mevcut mülakat durumu.",
    statusTitle: "Mevcut başvuru durumları",
    statusDescription:
      "Yalnızca oluşturma kohortu değil, seçili şirket/iş ilanı kapsamının tamamındaki mevcut durum.",
    trendTitle: "Zaman içinde oluşturulan başvurular",
    trendDescription: "{range} için UTC oluşturma dönemleri.",
    funnelTitle: "Geçmiş işe alım hunisi",
    funnelDescription:
      "{range} içinde oluşturulan benzersiz başvuruların bugüne kadarki yaşam boyu aşama erişimi.",
    performanceTitle: "İş ilanı performansı",
    performanceDescription:
      "Aralıkta oluşturulan başvurulara göre belirlenmiş ilk {limit} liste. Gizli iş ilanları yetkili sahiplere görünür; moderasyon gerekçeleri asla dahil edilmez.",
    noJobs: "Bu kapsamda iş ilanı yok",
    performanceCaption:
      "Seçili şirket ve tarih aralığı için iş ilanı performans karşılaştırması",
    job: "İş ilanı",
    state: "Durum",
    created: "Oluşturulan",
    interview: "Mülakat",
    offer: "Teklif",
    hired: "İşe alındı",
    hireConversion: "İşe alım dönüşümü",
  },
  admin: {
    title: "Platform analizleri",
    description:
      "Gerçek CareerBridge kayıtlarından toplu platform sağlığı. Kartlar mevcut durumu, seçili UTC aralığında oluşturmayı veya aralıktaki başvuru kohortunun yaşam boyu ilerlemesini belirtir.",
    usersTitle: "Kullanıcılar",
    usersDescription:
      "Mevcut hesap durumu ve seçili aralıkta oluşturulan kullanıcılar.",
    totalUsers: "Toplam kullanıcı",
    usersCreated: "Oluşturulan kullanıcılar",
    activeUsers: "Mevcut aktif kullanıcılar",
    suspendedUsers: "Mevcut askıya alınmış kullanıcılar",
    candidates: "Mevcut adaylar",
    recruiters: "Mevcut işverenler",
    admins: "Mevcut yöneticiler",
    currentPlatformTotal: "Mevcut platform toplamı.",
    createdDescription: "{range} içinde oluşturuldu.",
    currentAccountState: "Mevcut hesap durumu.",
    currentRole: "Mevcut rol ataması.",
    adminsDescription: "Yalnızca sayı; yönetici kimlikleri gösterilmez.",
    companiesJobsTitle: "Şirketler ve iş ilanları",
    companiesJobsDescription:
      "Yayın, yaşam döngüsü ve moderasyon ayrı durumlar olarak kalır.",
    totalCompanies: "Toplam şirket",
    companiesCreated: "Oluşturulan şirketler",
    publicCompanies: "Mevcut herkese açık şirketler",
    publicCompaniesDescription: "Yayınlanmış ve moderasyonda görünür.",
    hiddenCompanies: "Moderasyonda gizli şirketler",
    hiddenCompaniesDescription:
      "{count} şirket yayınlanmış kalırken herkese açık keşiften gizlidir.",
    totalJobs: "Toplam iş ilanı",
    jobsCreated: "Oluşturulan iş ilanları",
    publishedJobs: "Mevcut yayındaki iş ilanları",
    publishedJobsDescription:
      "Yaşam döngüsü moderasyondan bağımsız olarak Yayında.",
    publicJobs: "Mevcut herkese açık iş ilanları",
    publicJobsDescription:
      "İş ilanı ve şirket moderasyonu görünür durumda yayınlanmış.",
    hiddenJobs: "Moderasyonda gizli iş ilanları",
    hiddenJobsDescription:
      "İş ilanı düzeyindeki moderasyon durumu şu an Gizli.",
    jobsLifecycleTitle: "Yaşam döngüsüne göre iş ilanları",
    jobsLifecycleDescription:
      "Platformdaki mevcut iş ilanı yaşam döngüsü dağılımı.",
    applicationsInterviewsTitle: "Başvurular ve mülakatlar",
    applicationsCreated: "Oluşturulan başvurular",
    reachingOffer: "Teklife ulaşan başvurular",
    reachingHired: "İşe Alındı aşamasına ulaşan başvurular",
    everReachedDescription:
      "Seçili oluşturma kohortunun şimdiye kadar ulaştığı aşama.",
    interviewsCreated: "Oluşturulan mülakatlar",
    acceptedInterviews: "Mevcut kabul edilmiş mülakatlar",
    completedInterviews: "Mevcut tamamlanmış mülakatlar",
    canceledInterviews: "Mevcut iptal edilmiş mülakatlar",
    currentInterviewState: "Mevcut mülakat durumu.",
    applicationStatusesTitle: "Mevcut başvuru durumları",
    applicationStatusesDescription:
      "Platformdaki tüm başvuruların mevcut durumu; bu grafik oluşturma kohortuyla sınırlı değildir.",
    interviewStatusesTitle: "Mevcut mülakat durumları",
    interviewStatusesDescription:
      "Platformdaki tüm mülakatların mevcut durumu.",
    funnelDescription:
      "{range} içinde oluşturulan benzersiz başvuruların mevcut sunucu anına kadarki yaşam boyu aşama erişimi.",
    trendsTitle: "Oluşturma eğilimleri",
    trendsDescription:
      "UTC dönemleri sıfırlarla doldurulur ve 120 grafik noktasıyla sınırlandırılır.",
    newUsers: "Yeni kullanıcılar",
    newCompanies: "Yeni şirketler",
    newJobs: "Yeni iş ilanları",
    newApplications: "Yeni başvurular",
    newInterviews: "Yeni mülakatlar",
    trendDescription: "{range} içinde oluşturulan {entity}.",
    users: "Kullanıcılar",
    companies: "Şirketler",
    jobs: "İş ilanları",
    applications: "Başvurular",
    interviews: "Mülakatlar",
  },
};
