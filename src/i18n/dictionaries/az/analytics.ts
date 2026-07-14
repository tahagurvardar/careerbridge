import type { AnalyticsDictionary } from "@/i18n/dictionary";

export const analytics: AnalyticsDictionary = {
  range: {
    "30D": "Son 30 gün",
    "90D": "Son 90 gün",
    "180D": "Son 180 gün",
    "365D": "Son 365 gün",
    ALL: "Bütün dövr",
    label: "Aralıq: {range}",
    navigation: "Analitika tarix aralığı",
  },
  filters: {
    dateRange: "Tarix aralığı",
    company: "Şirkət",
    companyAria: "Analitika şirkəti",
    companyReset:
      "Şirkət dəyişdirildikdə vakansiya filtri məqsədli şəkildə sıfırlanır.",
    job: "Vakansiya",
    jobAria: "Analitika vakansiyası",
    allJobs: "Bütün vakansiyalar",
    hidden: "Gizli",
  },
  semantics: {
    currentState:
      "Cari vəziyyət bütün icazəli əhatə üzrə indiki anda qiymətləndirilir.",
    createdInRange:
      "Aralıqda yaradılanlar serverin müəyyən etdiyi yarıaçıq UTC intervalından istifadə edir.",
    everReached:
      "Nə vaxtsa çatılan mərhələ aralıqdakı hər kohort qeydini hər həyat dövrü mərhələsi üçün bir dəfə sayır.",
  },
  shared: {
    applicationFunnel: "Müraciət hunisi",
    noCohort: "Bu kohortda müraciət yoxdur",
    noCurrentRecords: "Cari qeyd yoxdur",
    noTrendData: "Bu aralıqda fəaliyyət yoxdur",
    funnelAria:
      "{title}. {submitted} göndərilib və {hired} İşə qəbul mərhələsinə çatıb. Ümumi işə qəbul çevrilməsi {conversion}.",
    distributionAria: "{title}. {statuses} status üzrə {total} qeyd.",
    trendSummary: "Cəmi {total}; ən yüksək göstərici {period} dövründə {peak}.",
    trendAria:
      "{title}. Cəmi {total}. Ən yüksək göstərici {period} dövründə {peak}.",
    noBucket: "dövr yoxdur",
    overallConversion: "Ümumi Göndərildi → İşə qəbul çevrilməsi: {conversion}.",
    exits: "Çıxışlar: {rejected} rədd edilib və {withdrawn} geri götürülüb.",
    viewTable: "Əlçatan məlumat cədvəlini göstər",
    trendCaption: "{title}: UTC dövrləri üzrə dəyərlər",
    distributionCaption: "{title} məlumat cədvəli",
    funnelCaption: "Müraciət hunisinin mərhələ sayları və çevrilmə nisbətləri",
    status: "Status",
    count: "Say",
    period: "Dövr",
    stage: "Mərhələ",
    reached: "Mərhələyə çatan müraciətlər",
    fromPrevious: "Əvvəlki mərhələdən",
    cohort: "Kohort",
  },
  candidate: {
    badge: "Namizəd analitikası",
    title: "Müraciət fəaliyyətiniz",
    description:
      "Müraciətləriniz, müsahibələriniz və yadda saxladığınız vakansiyalar üzrə məxfi ümumi göstəricilər. Cari vəziyyət seçilmiş UTC aralığında yaradılan müraciətlərin ömürlük nəticələrindən ayrı saxlanılır.",
    applicationsCreated: "Yaradılan müraciətlər",
    applicationsCreatedDescription: "{range} ərzində yaratdığınız müraciətlər.",
    activeApplications: "Cari aktiv müraciətlər",
    activeApplicationsDescription:
      "Müraciətlərinizin cari, yekunlaşmamış statusları.",
    terminalApplications: "Cari tamamlanmış müraciətlər",
    terminalApplicationsDescription:
      "Cari İşə qəbul, Rədd edildi və ya Geri götürüldü statuslarınız.",
    reachedInterview: "Müsahibəyə çatan müraciətlər",
    reachedOffer: "Təklifə çatan müraciətlər",
    everReachedDescription:
      "Seçdiyiniz yaradılma kohortunun nə vaxtsa çatdığı mərhələ.",
    hired: "İşə qəbul nəticələri",
    hiredDescription:
      "Kohortda İşə qəbul mərhələsinə nə vaxtsa çatmış müraciətlər.",
    interviewsCreated: "Yaradılan müsahibələr",
    interviewsCreatedDescription: "{range} ərzində yaradılan müsahibələriniz.",
    upcomingInterviews: "Cari qarşıdakı müsahibələr",
    upcomingInterviewsDescription:
      "Cavab gözləyən və ya qəbul edilmiş, hələ bitməmiş müsahibələr.",
    completedInterviews: "Cari tamamlanmış müsahibələr",
    completedInterviewsDescription:
      "Hazırda Tamamlandı kimi işarələnmiş müsahibələriniz.",
    savedJobs: "Yadda saxlanmış vakansiyalar",
    savedJobsDescription:
      "Əlçatan olmayan tarixçə daxil olmaqla cari yadda saxlanmış vakansiya sayınız.",
    rejected: "Rədd nəticələri",
    rejectedDescription: "Kohortda Rədd edildi mərhələsinə çatan müraciətlər.",
    withdrawn: "Geri götürmə nəticələri",
    withdrawnDescription:
      "Kohortda Geri götürüldü mərhələsinə çatan müraciətlər.",
    statusTitle: "Cari müraciət statuslarınız",
    statusDescription:
      "Bütün müraciətlərinizin cari vəziyyəti; gizli tarixi vakansiyalar moderasiya səbəbləri olmadan daxildir.",
    trendTitle: "Müraciət yaratma trendiniz",
    trendDescription: "{range} üçün UTC yaradılma dövrləri.",
    funnelTitle: "Müraciət irəliləyişiniz",
    funnelDescription:
      "{range} ərzində yaratdığınız unikal müraciətlərin indiyədək ömürlük mərhələ əhatəsi. Bu tarixi təsvirdir, proqnoz deyil.",
  },
  recruiter: {
    badge: "İşəgötürən analitikası",
    ownerRequiredTitle: "Şirkət SAHİBİ girişi tələb olunur",
    ownerRequiredDescription:
      "İşə qəbul analitikası yalnız hazırda sahibi olduğunuz şirkətlər üçün mövcuddur. ÜZV girişi şirkət metriklərini əhatə etmir.",
    noOwnedScope: "Sahib olduğunuz şirkət əhatəsi yoxdur",
    noOwnedScopeDescription:
      "Analitikaya baxmaq üçün şirkət yaradın və ya cari sahibdən üzvlüyünüzü yüksəltməsini istəyin.",
    manageCompanies: "Şirkətləri idarə et",
    title: "İşə qəbul performansı",
    scopeAllJobs: "bütün vakansiyaları üzrə",
    description:
      "{scope} üçün yalnız SAHİBLƏRƏ açıq ümumi metriklər. Cari vəziyyət və seçilmiş kohort nəticələri ayrıca işarələnir.",
    companyHidden: "Şirkət açıq axtarışdan gizlədilib",
    scopeTitle: "Analitika əhatəsi",
    scopeDescription:
      "Şirkət dəyişikliyi vakansiya filtrini sıfırlayır; tarix və vakansiya naviqasiyası digər etibarlı filtrləri qoruyur.",
    applicationsCreated: "Yaradılan müraciətlər",
    createdDescription: "{range} ərzində yaradılıb.",
    activeApplications: "Cari aktiv müraciətlər",
    activeApplicationsDescription:
      "Seçilmiş şirkət/vakansiya əhatəsində cari yekunlaşmamış vəziyyət.",
    reachedInterview: "Müsahibəyə çatan müraciətlər",
    reachedOffer: "Təklifə çatan müraciətlər",
    reachedHired: "İşə qəbul mərhələsinə çatan müraciətlər",
    everReachedDescription:
      "Seçilmiş yaradılma kohortunun nə vaxtsa çatdığı mərhələ.",
    publishedJobs: "Cari yayımlanmış vakansiyalar",
    publishedJobsDescription:
      "İcazəli gizli vakansiyalar daxil olmaqla cari həyat dövrü statusu.",
    interviewsCreated: "Yaradılan müsahibələr",
    completedInterviews: "Cari tamamlanmış müsahibələr",
    completedInterviewsDescription: "Seçilmiş əhatədə cari müsahibə statusu.",
    statusTitle: "Cari müraciət statusları",
    statusDescription:
      "Təkcə yaradılma kohortu deyil, seçilmiş şirkət/vakansiya əhatəsinin hamısında cari vəziyyət.",
    trendTitle: "Zaman üzrə yaradılan müraciətlər",
    trendDescription: "{range} üçün UTC yaradılma dövrləri.",
    funnelTitle: "Tarixi işə qəbul hunisi",
    funnelDescription:
      "{range} ərzində yaradılan unikal müraciətlərin indiyədək ömürlük mərhələ əhatəsi.",
    performanceTitle: "Vakansiya performansı",
    performanceDescription:
      "Aralıqda yaradılan müraciətlərə görə deterministik ilk {limit} siyahısı. Gizli vakansiyalar icazəli sahiblərə görünür; moderasiya səbəbləri daxil edilmir.",
    noJobs: "Bu əhatədə vakansiya yoxdur",
    performanceCaption:
      "Seçilmiş şirkət və tarix aralığı üçün vakansiya performansının müqayisəsi",
    job: "Vakansiya",
    state: "Vəziyyət",
    created: "Yaradılıb",
    interview: "Müsahibə",
    offer: "Təklif",
    hired: "İşə qəbul",
    hireConversion: "İşə qəbul çevrilməsi",
  },
  admin: {
    title: "Platform analitikası",
    description:
      "Real CareerBridge qeydlərindən ümumi platforma sağlamlığı. Kartlar cari vəziyyəti, seçilmiş UTC aralığında yaradılmanı və ya aralıqdakı müraciət kohortunun ömürlük irəliləyişini göstərir.",
    usersTitle: "İstifadəçilər",
    usersDescription:
      "Cari hesab vəziyyəti və seçilmiş aralıqda yaradılan istifadəçilər.",
    totalUsers: "Cəmi istifadəçilər",
    usersCreated: "Yaradılan istifadəçilər",
    activeUsers: "Cari aktiv istifadəçilər",
    suspendedUsers: "Cari dayandırılmış istifadəçilər",
    candidates: "Cari namizədlər",
    recruiters: "Cari işəgötürənlər",
    admins: "Cari adminlər",
    currentPlatformTotal: "Cari platforma cəmi.",
    createdDescription: "{range} ərzində yaradılıb.",
    currentAccountState: "Cari hesab vəziyyəti.",
    currentRole: "Cari rol təyinatı.",
    adminsDescription: "Yalnız say; admin şəxsiyyətləri göstərilmir.",
    companiesJobsTitle: "Şirkətlər və vakansiyalar",
    companiesJobsDescription:
      "Yayım, həyat dövrü və moderasiya ayrı vəziyyətlər olaraq qalır.",
    totalCompanies: "Cəmi şirkətlər",
    companiesCreated: "Yaradılan şirkətlər",
    publicCompanies: "Cari açıq şirkətlər",
    publicCompaniesDescription: "Yayımlanıb və moderasiyada görünür.",
    hiddenCompanies: "Moderasiyada gizli şirkətlər",
    hiddenCompaniesDescription:
      "{count} şirkət yayımlanmış qalsa da açıq axtarışdan gizlədilib.",
    totalJobs: "Cəmi vakansiyalar",
    jobsCreated: "Yaradılan vakansiyalar",
    publishedJobs: "Cari yayımlanmış vakansiyalar",
    publishedJobsDescription:
      "Həyat dövrü moderasiyadan asılı olmayaraq Yayımlanıb vəziyyətindədir.",
    publicJobs: "Cari açıq vakansiyalar",
    publicJobsDescription:
      "Vakansiya və şirkət moderasiyası görünən halda yayımlanıb.",
    hiddenJobs: "Moderasiyada gizli vakansiyalar",
    hiddenJobsDescription:
      "Vakansiya səviyyəsində moderasiya statusu hazırda Gizlidir.",
    jobsLifecycleTitle: "Həyat dövrünə görə vakansiyalar",
    jobsLifecycleDescription: "Platformada cari vakansiya həyat dövrü bölgüsü.",
    applicationsInterviewsTitle: "Müraciətlər və müsahibələr",
    applicationsCreated: "Yaradılan müraciətlər",
    reachingOffer: "Təklifə çatan müraciətlər",
    reachingHired: "İşə qəbul mərhələsinə çatan müraciətlər",
    everReachedDescription:
      "Seçilmiş yaradılma kohortunun nə vaxtsa çatdığı mərhələ.",
    interviewsCreated: "Yaradılan müsahibələr",
    acceptedInterviews: "Cari qəbul edilmiş müsahibələr",
    completedInterviews: "Cari tamamlanmış müsahibələr",
    canceledInterviews: "Cari ləğv edilmiş müsahibələr",
    currentInterviewState: "Cari müsahibə vəziyyəti.",
    applicationStatusesTitle: "Cari müraciət statusları",
    applicationStatusesDescription:
      "Platformadakı bütün müraciətlərin cari vəziyyəti; bu qrafik yaradılma kohortu ilə məhdudlaşmır.",
    interviewStatusesTitle: "Cari müsahibə statusları",
    interviewStatusesDescription:
      "Platformadakı bütün müsahibələrin cari vəziyyəti.",
    funnelDescription:
      "{range} ərzində yaradılan unikal müraciətlərin cari server anınadək ömürlük mərhələ əhatəsi.",
    trendsTitle: "Yaradılma trendləri",
    trendsDescription:
      "UTC dövrləri sıfırlarla tamamlanır və 120 qrafik nöqtəsi ilə məhdudlaşdırılır.",
    newUsers: "Yeni istifadəçilər",
    newCompanies: "Yeni şirkətlər",
    newJobs: "Yeni vakansiyalar",
    newApplications: "Yeni müraciətlər",
    newInterviews: "Yeni müsahibələr",
    trendDescription: "{range} ərzində yaradılan {entity}.",
    users: "İstifadəçilər",
    companies: "Şirkətlər",
    jobs: "Vakansiyalar",
    applications: "Müraciətlər",
    interviews: "Müsahibələr",
  },
};
