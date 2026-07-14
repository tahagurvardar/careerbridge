import type { ErrorsDictionary } from "@/i18n/dictionary";

export const errors: ErrorsDictionary = {
  generic: "Что-то пошло не так. Пожалуйста, попробуйте снова.",
  notFound: "Запрошенная запись не найдена.",
  accessDenied: "У вас нет доступа к этому действию.",
  validationFailed: "Проверьте выделенные поля и попробуйте снова.",
  recordChanged: "Запись изменилась. Обновите страницу и попробуйте снова.",
  duplicateAction: "Это действие уже выполнено.",
  invalidLifecycleAction: "Это действие недоступно в текущем состоянии.",
  requestFailed: "Не удалось выполнить запрос. Пожалуйста, попробуйте снова.",
  localeUpdateFailed: "Не удалось обновить язык. Пожалуйста, попробуйте снова.",
};
