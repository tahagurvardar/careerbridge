import type { AuthDictionary } from "@/i18n/dictionary";

export const auth: AuthDictionary = {
  login: {
    badge: "Безопасный вход в аккаунт",
    title: "С возвращением в ваше карьерное пространство.",
    description:
      "Войдите с электронной почтой и паролем. CareerBridge направит вас в панель, назначенную вашей подтверждённой роли на платформе.",
    point1: "Сессии на основе базы данных",
    point2: "Роли, проверяемые на сервере",
    point3: "Безопасный выход",
    cardTitle: "Вход",
    cardDescription:
      "Продолжите в рабочее пространство, назначенное вашему аккаунту.",
    emailLabel: "Адрес электронной почты",
    emailPlaceholder: "vy@primer.com",
    passwordLabel: "Пароль",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    submit: "Войти",
    submitting: "Выполняется вход…",
    newTo: "Впервые на CareerBridge?",
    createAccount: "Создать аккаунт",
    fallbackError: "Неверная почта или пароль.",
  },
  register: {
    introEyebrow: "Выберите свой путь",
    introTitle: "Создайте пространство под ваши цели.",
    introDescription:
      "Выберите аккаунт кандидата или рекрутера, затем создайте безопасный вход в CareerBridge.",
    stepAccountType: "1. Выберите тип аккаунта",
    stepAccountTypeDescription:
      "Публичная регистрация доступна как кандидат или рекрутер.",
    candidateTitle: "Кандидат",
    candidateDescription:
      "Находите возможности и развивайте своё карьерное пространство.",
    candidatePoint1: "Профессиональный профиль",
    candidatePoint2: "Отклики",
    candidatePoint3: "Сохранённые возможности",
    recruiterTitle: "Рекрутер",
    recruiterDescription: "Подготовьте пространство для будущего найма.",
    recruiterPoint1: "Пространство компании",
    recruiterPoint2: "Публикация вакансий",
    recruiterPoint3: "Оценка кандидатов",
    stepCreate: "2. Создайте аккаунт",
    stepCreateDescription:
      "Используйте почту, к которой у вас есть доступ. Подтверждение почты появится на следующем этапе и здесь не заявляется.",
    reviewTitle: "Пожалуйста, проверьте данные регистрации",
    openingDashboard: "Открываем вашу панель…",
    fullNameLabel: "Полное имя",
    fullNamePlaceholder: "Алексей Морган",
    emailLabel: "Адрес электронной почты",
    emailPlaceholder: "vy@primer.com",
    passwordLabel: "Пароль",
    passwordGuidance:
      "Используйте 12–128 символов. Длинная уникальная парольная фраза подходит лучше всего.",
    confirmPasswordLabel: "Подтвердите пароль",
    termsLabel:
      "Я принимаю Условия обслуживания и Политику конфиденциальности.",
    submit: "Создать аккаунт",
    submitting: "Создание аккаунта…",
    alreadyHaveAccount: "Уже есть аккаунт?",
    signIn: "Войти",
    fallbackError:
      "Не удалось создать аккаунт. Пожалуйста, попробуйте чуть позже.",
  },
  serverMessages: {
    checkFields: "Проверьте выделенные поля и попробуйте снова.",
    accountReady: "Ваш аккаунт CareerBridge готов.",
    signedIn: "Вход выполнен успешно.",
    invalidCredentials: "Неверная почта или пароль.",
    tooManyAttempts:
      "Слишком много попыток. Подождите минуту и попробуйте снова.",
    emailUnavailable:
      "Не удалось создать аккаунт с этой почтой. Попробуйте войти или используйте другую почту.",
    emailUnavailableField:
      "Эта почта не может быть использована для нового аккаунта.",
    registrationFailed:
      "Не удалось создать аккаунт. Пожалуйста, попробуйте снова.",
    registrationFailedRetry:
      "Не удалось создать аккаунт. Пожалуйста, попробуйте чуть позже.",
    signInFailed:
      "Не удалось выполнить вход. Пожалуйста, попробуйте чуть позже.",
  },
};
