import type { AnalyticsDictionary } from "@/i18n/dictionary";

export const analytics: AnalyticsDictionary = {
  range: {
    "30D": "Последние 30 дней",
    "90D": "Последние 90 дней",
    "180D": "Последние 180 дней",
    "365D": "Последние 365 дней",
    ALL: "За всё время",
    label: "Период: {range}",
    navigation: "Период аналитики",
  },
  filters: {
    dateRange: "Период",
    company: "Компания",
    companyAria: "Компания в аналитике",
    companyReset: "При смене компании фильтр вакансий намеренно сбрасывается.",
    job: "Вакансия",
    jobAria: "Вакансия в аналитике",
    allJobs: "Все вакансии",
    hidden: "Скрыто",
  },
  semantics: {
    currentState:
      "Текущее состояние оценивается сейчас по всей доступной области.",
    createdInRange:
      "Созданные за период используют вычисленный сервером полуоткрытый интервал UTC.",
    everReached:
      "Достигнутые когда-либо этапы учитывают каждую запись когорты периода один раз на этап жизненного цикла.",
  },
  shared: {
    applicationFunnel: "Воронка откликов",
    noCohort: "В этой когорте нет откликов",
    noCurrentRecords: "Нет текущих записей",
    noTrendData: "За этот период нет активности",
    funnelAria:
      "{title}. Отправлено: {submitted}, этапа «Нанят» достигли: {hired}. Общая конверсия в найм: {conversion}.",
    distributionAria: "{title}. Записей: {total}, статусов: {statuses}.",
    trendSummary: "Всего {total}; пик {peak} за период {period}.",
    trendAria: "{title}. Всего {total}. Пик {peak} за период {period}.",
    noBucket: "нет периода",
    overallConversion: "Общая конверсия Отправлено → Нанят: {conversion}.",
    exits: "Выходы: отклонено {rejected}, отозвано {withdrawn}.",
    viewTable: "Показать доступную таблицу данных",
    trendCaption: "{title}: значения по периодам UTC",
    distributionCaption: "Таблица данных: {title}",
    funnelCaption: "Число достигших этапов воронки и показатели конверсии",
    status: "Статус",
    count: "Количество",
    period: "Период",
    stage: "Этап",
    reached: "Отклики, достигшие этапа",
    fromPrevious: "С предыдущего этапа",
    cohort: "Когорта",
  },
  candidate: {
    badge: "Аналитика кандидата",
    title: "Активность ваших откликов",
    description:
      "Приватная сводная статистика по вашим откликам, собеседованиям и сохранённым вакансиям. Текущее состояние отделено от результатов за всё время для откликов, созданных в выбранном периоде UTC.",
    applicationsCreated: "Созданные отклики",
    applicationsCreatedDescription:
      "Ваши отклики, созданные за период {range}.",
    activeApplications: "Текущие активные отклики",
    activeApplicationsDescription:
      "Текущие незавершённые статусы ваших откликов.",
    terminalApplications: "Текущие завершённые отклики",
    terminalApplicationsDescription:
      "Ваши текущие статусы «Нанят», «Отклонено» или «Отозвано».",
    reachedInterview: "Отклики, дошедшие до собеседования",
    reachedOffer: "Отклики, дошедшие до предложения",
    everReachedDescription:
      "Этап когда-либо достигнут выбранной когортой создания.",
    hired: "Результаты найма",
    hiredDescription: "Отклики когорты, когда-либо достигшие этапа «Нанят».",
    interviewsCreated: "Созданные собеседования",
    interviewsCreatedDescription:
      "Ваши собеседования, созданные за период {range}.",
    upcomingInterviews: "Текущие предстоящие собеседования",
    upcomingInterviewsDescription:
      "Ожидают ответа или приняты и ещё не завершились.",
    completedInterviews: "Текущие завершённые собеседования",
    completedInterviewsDescription:
      "Ваши собеседования, сейчас отмеченные как завершённые.",
    savedJobs: "Сохранённые вакансии",
    savedJobsDescription:
      "Текущее число сохранённых вакансий, включая недоступные из истории.",
    rejected: "Отклонённые результаты",
    rejectedDescription: "Отклики когорты, достигшие этапа «Отклонено».",
    withdrawn: "Отозванные результаты",
    withdrawnDescription: "Отклики когорты, достигшие этапа «Отозвано».",
    statusTitle: "Текущие статусы ваших откликов",
    statusDescription:
      "Текущее состояние всех ваших откликов; скрытые исторические вакансии включены без причин модерации.",
    trendTitle: "Динамика создания ваших откликов",
    trendDescription: "Периоды создания в UTC за {range}.",
    funnelTitle: "Продвижение ваших откликов",
    funnelDescription:
      "Уникальные отклики, созданные за {range}, и достигнутые ими этапы за всё время до текущего момента. Это описание истории, а не прогноз.",
  },
  recruiter: {
    badge: "Аналитика рекрутера",
    ownerRequiredTitle: "Требуется доступ ВЛАДЕЛЬЦА компании",
    ownerRequiredDescription:
      "Аналитика найма доступна только для компаний, которыми вы сейчас владеете. Доступ УЧАСТНИКА не включает метрики компании.",
    noOwnedScope: "Нет компаний в собственности",
    noOwnedScopeDescription:
      "Создайте компанию или попросите текущего владельца повысить вашу роль, чтобы просматривать аналитику найма.",
    manageCompanies: "Управлять компаниями",
    title: "Эффективность найма",
    scopeAllJobs: "по всем её вакансиям",
    description:
      "Сводные метрики только для ВЛАДЕЛЬЦЕВ по области {scope}. Текущее состояние и результаты выбранной когорты отмечены отдельно.",
    companyHidden: "Компания скрыта из публичного поиска",
    scopeTitle: "Область аналитики",
    scopeDescription:
      "Смена компании сбрасывает фильтр вакансий; навигация по датам и вакансиям сохраняет остальные допустимые фильтры.",
    applicationsCreated: "Созданные отклики",
    createdDescription: "Создано за {range}.",
    activeApplications: "Текущие активные отклики",
    activeApplicationsDescription:
      "Текущее незавершённое состояние в выбранной области компании/вакансии.",
    reachedInterview: "Отклики, дошедшие до собеседования",
    reachedOffer: "Отклики, дошедшие до предложения",
    reachedHired: "Отклики, дошедшие до найма",
    everReachedDescription:
      "Этап когда-либо достигнут выбранной когортой создания.",
    publishedJobs: "Текущие опубликованные вакансии",
    publishedJobsDescription:
      "Текущее состояние жизненного цикла, включая доступные скрытые вакансии.",
    interviewsCreated: "Созданные собеседования",
    completedInterviews: "Текущие завершённые собеседования",
    completedInterviewsDescription:
      "Текущее состояние собеседований в выбранной области.",
    statusTitle: "Текущие статусы откликов",
    statusDescription:
      "Текущее состояние по всей выбранной области компании/вакансии, а не только по когорте создания.",
    trendTitle: "Создание откликов во времени",
    trendDescription: "Периоды создания в UTC за {range}.",
    funnelTitle: "Историческая воронка найма",
    funnelDescription:
      "Уникальные отклики, созданные за {range}, и достигнутые ими этапы за всё время до текущего момента.",
    performanceTitle: "Эффективность вакансий",
    performanceDescription:
      "Детерминированный список первых {limit} вакансий по откликам, созданным за период. Скрытые вакансии видны уполномоченным владельцам; причины модерации не включаются.",
    noJobs: "В этой области нет вакансий",
    performanceCaption:
      "Сравнение эффективности вакансий для выбранной компании и периода",
    job: "Вакансия",
    state: "Состояние",
    created: "Создано",
    interview: "Собеседование",
    offer: "Предложение",
    hired: "Нанят",
    hireConversion: "Конверсия в найм",
  },
  admin: {
    title: "Аналитика платформы",
    description:
      "Сводное состояние платформы по реальным данным CareerBridge. Карточки различают текущее состояние, создание за выбранный период UTC и продвижение когорты откликов за всё время.",
    usersTitle: "Пользователи",
    usersDescription:
      "Текущее состояние аккаунтов и пользователи, созданные за выбранный период.",
    totalUsers: "Всего пользователей",
    usersCreated: "Созданные пользователи",
    activeUsers: "Текущие активные пользователи",
    suspendedUsers: "Текущие приостановленные пользователи",
    candidates: "Текущие кандидаты",
    recruiters: "Текущие рекрутеры",
    admins: "Текущие администраторы",
    currentPlatformTotal: "Текущий итог по платформе.",
    createdDescription: "Создано за {range}.",
    currentAccountState: "Текущее состояние аккаунта.",
    currentRole: "Текущее назначение роли.",
    adminsDescription:
      "Только количество; личности администраторов не показываются.",
    companiesJobsTitle: "Компании и вакансии",
    companiesJobsDescription:
      "Публикация, жизненный цикл и модерация остаются отдельными состояниями.",
    totalCompanies: "Всего компаний",
    companiesCreated: "Созданные компании",
    publicCompanies: "Текущие публичные компании",
    publicCompaniesDescription: "Опубликованы и видимы по модерации.",
    hiddenCompanies: "Скрытые модерацией компании",
    hiddenCompaniesDescription:
      "{count} остаются опубликованными, но скрыты из публичного поиска.",
    totalJobs: "Всего вакансий",
    jobsCreated: "Созданные вакансии",
    publishedJobs: "Текущие опубликованные вакансии",
    publishedJobsDescription:
      "Жизненный цикл — «Опубликовано», независимо от модерации.",
    publicJobs: "Текущие публичные вакансии",
    publicJobsDescription:
      "Опубликованы при видимой модерации вакансии и компании.",
    hiddenJobs: "Скрытые модерацией вакансии",
    hiddenJobsDescription: "Состояние модерации вакансии сейчас — «Скрыто».",
    jobsLifecycleTitle: "Вакансии по жизненному циклу",
    jobsLifecycleDescription:
      "Текущее распределение жизненного цикла вакансий на платформе.",
    applicationsInterviewsTitle: "Отклики и собеседования",
    applicationsCreated: "Созданные отклики",
    reachingOffer: "Отклики, дошедшие до предложения",
    reachingHired: "Отклики, дошедшие до найма",
    everReachedDescription:
      "Этап когда-либо достигнут выбранной когортой создания.",
    interviewsCreated: "Созданные собеседования",
    acceptedInterviews: "Текущие принятые собеседования",
    completedInterviews: "Текущие завершённые собеседования",
    canceledInterviews: "Текущие отменённые собеседования",
    currentInterviewState: "Текущее состояние собеседования.",
    applicationStatusesTitle: "Текущие статусы откликов",
    applicationStatusesDescription:
      "Текущее состояние всех откликов платформы; график не ограничен когортой создания.",
    interviewStatusesTitle: "Текущие статусы собеседований",
    interviewStatusesDescription:
      "Текущее состояние всех собеседований платформы.",
    funnelDescription:
      "Уникальные отклики, созданные за {range}, и достигнутые ими этапы за всё время до текущего серверного момента.",
    trendsTitle: "Динамика создания",
    trendsDescription:
      "Периоды UTC дополнены нулевыми значениями и ограничены 120 точками графика.",
    newUsers: "Новые пользователи",
    newCompanies: "Новые компании",
    newJobs: "Новые вакансии",
    newApplications: "Новые отклики",
    newInterviews: "Новые собеседования",
    trendDescription: "{entity}, созданные за {range}.",
    users: "Пользователи",
    companies: "Компании",
    jobs: "Вакансии",
    applications: "Отклики",
    interviews: "Собеседования",
  },
};
