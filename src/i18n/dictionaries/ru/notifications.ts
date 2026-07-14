import type { NotificationsDictionary } from "@/i18n/dictionary";

export const notifications: NotificationsDictionary = {
  events: {
    applicationSubmitted: {
      title: "Получен новый отклик",
      message: "{candidate} откликнулся на вакансию «{jobTitle}».",
    },
    applicationStatusChanged: {
      title: "Статус отклика обновлён",
      message: "Статус вашего отклика на «{jobTitle}»: {status}.",
    },
    applicationWithdrawn: {
      title: "Отклик отозван",
      message: "{candidate} отозвал свой отклик на «{jobTitle}».",
    },
    companyInvitationReceived: {
      title: "Приглашение компании",
      message: "Вас пригласили присоединиться к компании {companyName}.",
    },
    interviewScheduled: {
      title: "Собеседование назначено",
      message: "По вашему отклику на «{jobTitle}» назначено собеседование.",
    },
    interviewRescheduled: {
      title: "Собеседование перенесено",
      message: "Ваше собеседование по вакансии «{jobTitle}» перенесено.",
    },
    interviewCanceled: {
      title: "Собеседование отменено",
      message: "Ваше собеседование по вакансии «{jobTitle}» отменено.",
    },
    interviewResponseReceived: {
      title: "Получен ответ на собеседование",
      messageAccepted:
        "{candidate} принял приглашение на собеседование по вакансии «{jobTitle}».",
      messageDeclined:
        "{candidate} отклонил приглашение на собеседование по вакансии «{jobTitle}».",
    },
  },
  bell: {
    label: "Уведомления",
    unreadLabel: "Уведомления, непрочитанных: {count}",
  },
  center: {
    badge: "Активность",
    title: "Уведомления",
    description:
      "Обновления по вашим откликам приходят прямо в приложение. Открыв уведомление, вы перейдёте на связанную страницу, которая всегда заново проверяет ваш доступ.",
    total: "Всего",
    unread: "Непрочитанные",
    read: "Прочитанные",
    filterAria: "Фильтр уведомлений",
    emailSettings: "Настройки почты",
    clearFilter: "Сбросить фильтр",
    count: {
      one: "{count} уведомление",
      few: "{count} уведомления",
      many: "{count} уведомлений",
      other: "{count} уведомления",
    },
    pagesAria: "Страницы уведомлений",
    emptyTitle: "Уведомлений пока нет",
    emptyFilteredTitle: "Нет подходящих уведомлений",
    emptyDescription:
      "Когда по вашим откликам появится активность, она отобразится здесь.",
    emptyFilteredDescription:
      "Попробуйте другой фильтр, чтобы увидеть больше уведомлений.",
    viewAll: "Показать все уведомления",
    newBadge: "Новое",
    readSr: "Прочитано",
    view: "Открыть",
    markRead: "Отметить прочитанным",
    markAllRead: "Отметить все прочитанными",
  },
  actions: {
    invalidNotification: "Это уведомление недоступно.",
    markedRead: "Уведомление отмечено прочитанным.",
    markedAllRead: "Все уведомления отмечены прочитанными.",
    updateFailed:
      "Не удалось обновить уведомление. Пожалуйста, попробуйте снова.",
    updateAllFailed:
      "Не удалось обновить уведомления. Пожалуйста, попробуйте снова.",
  },
};
