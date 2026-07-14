import type { ApplicationsDictionary } from "@/i18n/dictionary";

export const applications: ApplicationsDictionary = {
  timeline: {
    noHistory: "История статусов недоступна.",
    submitted: "Заявка отправлена",
    movedTo: "Новый статус: {status}",
    byActor: "изменил пользователь {name}",
  },
  withdraw: {
    trigger: "Отозвать заявку",
    title: "Отозвать эту заявку?",
    description:
      "Это действие окончательное. Команда найма увидит, что вы отказались от этой роли.",
    keep: "Оставить заявку",
    confirm: "Отозвать",
    withdrawing: "Отзыв…",
  },
  actions: {
    checkFields: "Проверьте выделенные поля и повторите попытку.",
    profileIncomplete: "Перед откликом заполните профиль: {details}.",
    profileHeadline: "Профессиональный заголовок",
    profileLocation: "Местоположение",
    profileSkill: "Хотя бы один навык",
    alreadyApplied: "Вы уже откликнулись на эту вакансию.",
    deadlinePassed: "Приём откликов на эту вакансию закрыт.",
    notEligible: "Эта вакансия больше не принимает отклики.",
    candidateOnly: "Откликаться на вакансии могут только кандидаты.",
    submitFailed: "Не удалось отправить отклик. Повторите попытку.",
    invalidTransition: "Это действие сейчас недоступно для данного отклика.",
    unavailable: "Отклик не найден или недоступен.",
    failed: "Не удалось выполнить действие. Повторите попытку.",
    submitted: "Отклик отправлен.",
    withdrawn: "Отклик отозван.",
    updated: "Отклик обновлён.",
  },
};
