import type { MetadataDictionary } from "@/i18n/dictionary";

export const metadata: MetadataDictionary = {
  root: {
    defaultTitle: "CareerBridge — Найдите работу, которая ведёт вас вперёд",
    template: "%s | CareerBridge",
    description:
      "CareerBridge соединяет целеустремлённых кандидатов с внимательными командами через современную платформу вакансий и стажировок.",
    ogTitle: "CareerBridge",
    ogDescription:
      "Более ясный путь от потенциала к возможности для кандидатов и рекрутеров.",
  },
  jobs: {
    title: "Вакансии",
    description:
      "Ищите опубликованные вакансии на CareerBridge по роли, компании, навыку и месту.",
  },
  jobDetail: {
    notFoundTitle: "Вакансия не найдена",
    descriptionFallback:
      "{jobTitle} в компании {companyName} — опубликовано на CareerBridge.",
  },
  companies: {
    title: "Компании",
    description: "Изучайте опубликованные профили компаний на CareerBridge.",
  },
  companyDetail: {
    title: "Профиль компании",
    description: "Просмотр опубликованного профиля компании на CareerBridge.",
  },
  login: {
    title: "Вход",
    description: "Безопасный вход в ваше пространство CareerBridge.",
  },
  register: {
    title: "Создать аккаунт",
    description: "Создайте аккаунт кандидата или рекрутера на CareerBridge.",
  },
  notifications: {
    title: "Уведомления",
    description: "Ваш центр активности и уведомлений CareerBridge.",
  },
  notificationSettings: {
    title: "Настройки уведомлений",
    description: "Управляйте настройками отправки транзакционной почты.",
  },
};
