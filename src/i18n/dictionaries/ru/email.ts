import type { EmailDictionary } from "@/i18n/dictionary";

export const email: EmailDictionary = {
  events: {
    companyInvitation: {
      subject: "Вас пригласили присоединиться к компании {companyName}",
      message:
        "Вас пригласили присоединиться к компании {companyName} на CareerBridge.",
      cta: "Посмотреть приглашение",
    },
    applicationSubmitted: {
      subject: "Новый отклик на вакансию «{jobTitle}»",
      message: "{candidate} откликнулся на вакансию «{jobTitle}».",
      cta: "Рассмотреть отклик",
    },
    applicationStatusChanged: {
      subject: "Статус вашего отклика обновлён",
      message: "Статус вашего отклика на «{jobTitle}»: {status}.",
      cta: "Посмотреть отклик",
    },
    applicationWithdrawn: {
      subject: "Отклик на «{jobTitle}» отозван",
      message: "{candidate} отозвал свой отклик на «{jobTitle}».",
      cta: "Посмотреть отклик",
    },
    interviewScheduled: {
      subject: "Назначено собеседование по вакансии «{jobTitle}»",
      message:
        "По вашему отклику на «{jobTitle}» назначено собеседование. Войдите, чтобы посмотреть расписание и ответить.",
      cta: "Посмотреть собеседование",
    },
    interviewRescheduled: {
      subject: "Собеседование по вакансии «{jobTitle}» перенесено",
      message:
        "Ваше собеседование по вакансии «{jobTitle}» перенесено. Войдите, чтобы посмотреть новое время и ответить.",
      cta: "Посмотреть собеседование",
    },
    interviewCanceled: {
      subject: "Собеседование по вакансии «{jobTitle}» отменено",
      message: "Ваше собеседование по вакансии «{jobTitle}» отменено.",
      cta: "Посмотреть собеседование",
    },
    interviewResponseReceived: {
      subject: "Получен ответ на собеседование по вакансии «{jobTitle}»",
      messageAccepted:
        "{candidate} принял приглашение на собеседование по вакансии «{jobTitle}».",
      messageDeclined:
        "{candidate} отклонил приглашение на собеседование по вакансии «{jobTitle}».",
      cta: "Посмотреть собеседование",
    },
  },
  eventLabels: {
    COMPANY_INVITATION_RECEIVED: "Приглашения компаний",
    APPLICATION_SUBMITTED: "Новые отклики",
    APPLICATION_STATUS_CHANGED: "Обновления статуса откликов",
    APPLICATION_WITHDRAWN: "Отзыв откликов",
    INTERVIEW_SCHEDULED: "Собеседование назначено",
    INTERVIEW_RESCHEDULED: "Собеседование перенесено",
    INTERVIEW_CANCELED: "Собеседование отменено",
    INTERVIEW_RESPONSE_RECEIVED: "Ответы на собеседования",
  },
  eventDescriptions: {
    COMPANY_INVITATION_RECEIVED:
      "Присылать письмо, когда меня приглашают в компанию.",
    APPLICATION_SUBMITTED:
      "Присылать письмо, когда кандидат откликается на вакансию моей компании.",
    APPLICATION_STATUS_CHANGED:
      "Присылать письмо, когда рекрутер обновляет один из моих откликов.",
    APPLICATION_WITHDRAWN:
      "Присылать письмо, когда кандидат отзывает отклик в моей компании.",
    INTERVIEW_SCHEDULED:
      "Присылать письмо, когда по моему отклику назначают собеседование.",
    INTERVIEW_RESCHEDULED:
      "Присылать письмо, когда моё собеседование переносят.",
    INTERVIEW_CANCELED: "Присылать письмо, когда моё собеседование отменяют.",
    INTERVIEW_RESPONSE_RECEIVED:
      "Присылать письмо, когда кандидат принимает или отклоняет собеседование.",
  },
  settings: {
    badge: "Настройки",
    title: "Настройки уведомлений",
    description:
      "Выберите, какие транзакционные обновления CareerBridge может помещать в очередь отправки почты. Отправка асинхронна и может задерживаться.",
    cardTitle: "Транзакционная почта",
    cardDescription:
      "Настройки применяются к новым событиям. Повторное включение события не отправляет ранее подавленные письма.",
    fieldsetLegend: "Настройки транзакционной почты",
    save: "Сохранить настройки почты",
    inAppTitle: "Уведомления в приложении остаются включёнными.",
    inAppDescription:
      "Эти настройки управляют только отправкой почты. Связанные страницы всегда заново проверяют ваш доступ при открытии.",
    openNotifications: "Открыть уведомления",
  },
  actions: {
    notAvailable: "Настройки почты недоступны.",
    invalid: "Эти настройки почты не удалось сохранить.",
    saved: "Настройки почты сохранены.",
    saveFailed:
      "Не удалось сохранить настройки почты. Пожалуйста, попробуйте снова.",
  },
};
