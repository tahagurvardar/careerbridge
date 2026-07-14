import type { CommonDictionary } from "@/i18n/dictionary";

export const common: CommonDictionary = {
  appName: "CareerBridge",
  skipToContent: "Перейти к содержимому",
  copyright: "© {year} CareerBridge. Все права защищены.",
  footerTagline: "Строим более надёжные пути к значимой работе.",
  actions: {
    save: "Сохранить",
    saving: "Сохранение…",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Редактировать",
    back: "Назад",
    close: "Закрыть",
    view: "Открыть",
    search: "Искать",
    clear: "Очистить",
    clearFilters: "Сбросить фильтры",
    submit: "Отправить",
    confirm: "Подтвердить",
    tryAgain: "Повторить попытку",
    signIn: "Войти",
    signOut: "Выйти",
    createAccount: "Создать аккаунт",
    dashboard: "Панель",
    loading: "Загрузка…",
  },
  states: {
    notProvided: "Не указано",
    none: "Нет",
    unknown: "Неизвестно",
  },
  pagination: {
    previous: "Назад",
    next: "Вперёд",
    pageOf: "Страница {current} из {total}",
  },
  theme: {
    system: "Системная",
    light: "Светлая",
    dark: "Тёмная",
    switchLabel: "Текущая тема: {current}. Переключить на тему «{next}».",
    loading: "Загружается настройка темы.",
  },
  notFound: {
    code: "404",
    title: "Этот путь пока никуда не ведёт.",
    description:
      "Страница могла переехать или относится к будущему этапу CareerBridge.",
    backHome: "Вернуться в CareerBridge",
  },
};
