'use strict';
angular.module("ngLocale", [], ["$provide", function($provide) {
var PLURAL_CATEGORY = {ZERO: "zero", ONE: "one", TWO: "two", FEW: "few", MANY: "many", OTHER: "other"};
function getDecimals(n) {
  n = n + '';
  var i = n.indexOf('.');
  return (i == -1) ? 0 : n.length - i - 1;
}

function getVF(n, opt_precision) {
  var v = opt_precision;

  if (undefined === v) {
    v = Math.min(getDecimals(n), 3);
  }

  var base = Math.pow(10, v);
  var f = ((n * base) | 0) % base;
  return {v: v, f: f};
}

$provide.value("$locale", {
  "DATETIME_FORMATS": {
    "AMPMS": [
      "AM",
      "PM"
    ],
    "DAY": [
      "\u0432\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435",
      "\u043f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a",
      "\u0432\u0442\u043e\u0440\u043d\u0438\u043a",
      "\u0441\u0440\u0435\u0434\u0430",
      "\u0447\u0435\u0442\u0432\u0435\u0440\u0433",
      "\u043f\u044f\u0442\u043d\u0438\u0446\u0430",
      "\u0441\u0443\u0431\u0431\u043e\u0442\u0430"
    ],
    "MONTH": [
      "\u044f\u043d\u0432\u0430\u0440\u044f",
      "\u0444\u0435\u0432\u0440\u0430\u043b\u044f",
      "\u043c\u0430\u0440\u0442\u0430",
      "\u0430\u043f\u0440\u0435\u043b\u044f",
      "\u043c\u0430\u044f",
      "\u0438\u044e\u043d\u044f",
      "\u0438\u044e\u043b\u044f",
      "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
      "\u0441\u0435\u043d\u0442\u044f\u0431\u0440\u044f",
      "\u043e\u043a\u0442\u044f\u0431\u0440\u044f",
      "\u043d\u043e\u044f\u0431\u0440\u044f",
      "\u0434\u0435\u043a\u0430\u0431\u0440\u044f"
    ],
    "SHORTDAY": [
      "\u0432\u0441",
      "\u043f\u043d",
      "\u0432\u0442",
      "\u0441\u0440",
      "\u0447\u0442",
      "\u043f\u0442",
      "\u0441\u0431"
    ],
    "SHORTMONTH": [
      "\u044f\u043d\u0432.",
      "\u0444\u0435\u0432\u0440.",
      "\u043c\u0430\u0440\u0442\u0430",
      "\u0430\u043f\u0440.",
      "\u043c\u0430\u044f",
      "\u0438\u044e\u043d\u044f",
      "\u0438\u044e\u043b\u044f",
      "\u0430\u0432\u0433.",
      "\u0441\u0435\u043d\u0442.",
      "\u043e\u043a\u0442.",
      "\u043d\u043e\u044f\u0431.",
      "\u0434\u0435\u043a."
    ],
    "fullDate": "EEEE, d MMMM y '\u0433'.",
    "longDate": "d MMMM y '\u0433'.",
    "medium": "d MMM y '\u0433'. H:mm:ss",
    "mediumDate": "d MMM y '\u0433'.",
    "mediumTime": "H:mm:ss",
    "short": "dd.MM.yy H:mm",
    "shortDate": "dd.MM.yy",
    "shortTime": "H:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "\u0440\u0443\u0431.",
    "DECIMAL_SEP": ",",
    "GROUP_SEP": "\u00a0",
    "PATTERNS": [
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 3,
        "minFrac": 0,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "",
        "posPre": "",
        "posSuf": ""
      },
      {
        "gSize": 3,
        "lgSize": 3,
        "maxFrac": 2,
        "minFrac": 2,
        "minInt": 1,
        "negPre": "-",
        "negSuf": "\u00a0\u00a4",
        "posPre": "",
        "posSuf": "\u00a0\u00a4"
      }
    ]
  },
  "id": "ru",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (vf.v == 0 && i % 10 == 1 && i % 100 != 11) {    return PLURAL_CATEGORY.ONE;  }  if (vf.v == 0 && i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14)) {    return PLURAL_CATEGORY.FEW;  }  if (vf.v == 0 && i % 10 == 0 || vf.v == 0 && i % 10 >= 5 && i % 10 <= 9 || vf.v == 0 && i % 100 >= 11 && i % 100 <= 14) {    return PLURAL_CATEGORY.MANY;  }  return PLURAL_CATEGORY.OTHER;},


    "STRINGS": {
        "GENERAL": {
            'today': 'Сегодня',
            'unknownCallerId': 'Неизвестный контакт',
            'unknownLocation': 'неизвестно',
            'unknownContact': 'Неизвестный номер',
            'blockedNumber': 'Номер заблокирован'
        },
        "SIDEBAR": {
            'dialerTitle': 'Телефон',
            'newTextTitle': 'Создать сообщение',
            'messagesTitle': 'Сообщения',
            'contactsTitle': 'Контакты',
            'callLogTitle': 'Журнал звонков',
            'meetingTitle': 'Назначить встречу',
            'conferenceTitle': 'Назначить конференцию',
            'hangoutsTitle': 'Запустить Hangouts',
            'settingsTitle': 'Настройки'
        },
        "HEADER": {
            'headerDefault': 'Вход в систему',
            'headerWithBrand': 'Войти в аккаунт',
            'collapseTitle': 'Свернуть',
            'expandTitle': 'Развернуть',
            'logoutTitle': 'Выйти'
        },
        "DIRECTIVES": {
            "CONTACTPHONE": {
                'actionCallTitle': 'Позвонить',
                'actionTextTitle': 'Послать сообщение'
            },
            "RCSENDSMS": {
                'groupIntoOneConversationCheckbox': 'Послать групповое сообщение',
                'sendButton': 'Послать',
                'textareaPlaceholder': 'Введите текст'
            }
        },
        "LOGIN": {
            'comboUSValue': 'США',
            'comboUKValue': 'Великобритания',
            'comboCanadaValue': 'Канада',
            'userNamePlaceholder': 'Телефон',
            'extensionPlaceholder': 'Доб',
            'passwordPlaceholder': 'Пароль',
            'loginButtonText': 'Войти',
            'loginButtonTextOnLoading': 'Войти...',
            'loginInternalErrorCaption': 'Внутренняя ошибка: ',
            'loginInternalErrorAdvice': '',
            'rememberMeCheckbox': 'Запомнить',
            'errorPhoneNumberIsEmpty': 'Пожалуйста, введите телефон',
            'errorPasswordIsEmpty': 'Пожалуйста, введите пароль',
            'errorIncorrectLogin': 'Неверный телефон и/или пароль'
        },
        "SETTINGS": {
            'settingsScreenHeader': 'Настройки',
            'desktopNotificationsCheckbox': 'Оповещения на рабочем столе',
            'desktopNotificationsConfirmationInfo': 'Пожалуйста, разрешите оповещения в браузере',
            'desktopNotificationsDisabledInfo': 'Оповещения на рабочем столе были заблокированы для данного расширения. Если вы хотите использовать оповещения, <a href="https://support.google.com/chrome/answer/3220216?hl=en" target="_blank">включите их в настройках</a>',
            'googleContactsCaption': 'Контакты Google',
            'googleContactsAuthorizeButton': 'Авторизовать',
            'googleContactsAuthorizedText': 'Авторизованы',
            'googleContactsManageLink': 'управление',
            'eulaLink': 'EULA',
            'versionInfo': 'Версия'
        },
        "CONTACT": {
            'contactScreenHeader': 'Контакт',
            'googleContactsNotAuthorizedInfo': 'Контакты Google не авторизованы',
            'emailsHeader': 'Электронная почта',
            'email1Label': 'Почта',
            'email2Label': 'Почта 2',
            'email3Label': 'Почта 3',
            'phoneNumberHeader': 'Телефоны',
            'extensionLabel': 'Добавочный',
            'home1Label': 'Домашний',
            'home2Label': 'Домашний 2',
            'busyness1Label': 'Рабочий',
            'busyness2Label': 'Рабочий 2',
            'mobileLabel': 'Мобильный',
            'companyLabel': 'Организация',
            'assistantLabel': 'Ассистент',
            'carLabel': 'Автомобиль',
            'anotherLabel': 'Другой',
            'callbackLabel': 'Обратный',
            'contactNotFound': 'Контакт не найден'
        },
        "CONTACTPICKER": {
            'contactPickerScreenHeader': 'Выберите контакт',
            'searchPlaceholder': 'Введите для поиска',
            'noContactsMessage': 'Нет контактов для отображения'
        },
        "CONTACTS": {
            'contactsScreenHeader': 'Контакты',
            'searchPlaceholder': 'Введите для поиска',
            'searchContactHint': 'Пожалуйста, начните ввод для поиска контактов',
            'googleContactsNotAuthorizedInfo': 'Контакты Google не авторизованы',
            'googleContactsAuthorizeButton': 'Авторизовать'
        },
        "ACTIVECALLMONITOR": {
            'closeButton': 'Закрыть',
            'incomingCallCaption': 'Входящий звонок',
            'outgoingCallCaption': 'Исходящий звонок',
            'callStatusRinging': 'Звоним...',
            'callStatusRingingToBrand': 'Звоним на ваше устройство %s',
            'callStatusWaiting': 'Нажмите 1, чтобы соедениться с собеседником',
            'callStatusCallerConnected': 'Дождитесь ответа собеседника',
            'callStatusFinished': 'Звонок завершен',
            'callStatusHold': 'Звонок удержан'
        },
        "CALLLOG": {
            'callLogScreenHeader': 'Журнал звонков',
            'allCallsTab': 'Все',
            'missedCallsTab': 'Пропущенные',
            'allCallsTabTitle': 'Показать все звонки',
            'missedCallsTabTitle': 'Показать только пропущенные звонки',
            'searchPlaceholder': 'Введите для поиска',
            'noCallsInfo': 'Нет звонков'
        },
        "CALLENTRY": {
            'callLogEntryScreenHeader': 'Информация о звонке',
            'noCallsInfo': 'Звонок не найден',
            'incomingCallCaption': 'Входящий звонок',
            'outgoingCallCaption': 'Исходящий звонок',
            'missedCallCaption': 'Пропущенный звонок',
            'callButton': 'Позвонить',
            'textButton': 'Послать сообщение'
        },
        "CONVERSATION": {
            'unknownContact': 'Неизвестный контакт',
            'messageIsNotSentError': 'Сообщение не отправлено',
            'messageIsNotDeliveredError': 'Сообщение не доставлено'
        },
        "DIALER": {
            'dialerScreenHeader': 'Телефон',
            'contactpickerPlacholder': 'Введите имя или телефон',
            'customError': '%s',
            'ringoutError': 'Ошибка Ringout: %s',
            'failedToCompleteError': 'Не удалось совершить звонок. Пожалуйста, попробуйте еще раз',
            'cannotReachRCPhoneError': 'Пожалуйста, убедитесь, что ваше %s устройство доступно, а также, что функция Call Screening отключена',
            'callButtonText': 'Позвонить',
            'callInProgressButtonText': 'Звонок в процессе'
        },
        'DIALERSETTIGNS': {
            'makeOutboundCallWithLabel': 'Номерисходящего звонка',
            'makeOutboundCallWithHelp': '<p>Выберите устройство для звонка.</p><p>В случае, если у вас нет доступа к устройству RingCentral или к программному телефону, вы можете использовать любой другой мобильный или домашний телефон</p>',
            'press1ToStartCallLabel': 'Нажать 1 для вызова',
            'press1ToStartCallHelp': '<p>Выберите эту опцию, если вы хотите подтверждать звонок, нажав 1, до того, как абонент будет вызван</p>'
        },
        "MESSAGES": {
            'messagesScreenHeader': 'Сообщения',
            'allTab': 'Все',
            'voiceTab': 'Почта',
            'faxTab': 'Факс',
            'textTab': 'СМС',
            'searchPlacholer': 'Введите для поиска',
            'messageLabel': '',
            'faxLabel': 'Факс',
            'voiceLabel': 'Голосовое сообщение',
            'deleteMessageTitle': 'Удалить сообщение',
            'viewFaxTitle': 'Просмотреть факс',
            'deleteFaxTitle': 'Удалить факс',
            'playVoiceTitle': 'Проиграть',
            'resumeVoiceTitle': 'Возобновить',
            'stopVoiceTitle': 'Остановить',
            'callTitle': 'Позвонить',
            'sendTextTitle': 'Послать сообщение',
            'markAsReadTitle': 'Отметить как прочтенное',
            'markAsUnreadTitle': 'Отметить как непрочтенное',
            'deleteVoiceMailTitle': 'Удалить голосовое сообщение',
            'noMessagesMessage': 'Сообщения отсутствуют'
        },
        'MESSAGEDETAILS': {
            'messageDetailsScreenHeader': 'Информация о сообщении',
            'noMessagesFoundText': 'Сообщение не найдено',
            'outgoingMessageLabel': 'Исходящее сообщение',
            'incomingMessageLabel': 'Входящее сообщение',
            'callButtonText': 'Позвонить',
            'sendTextButtonText': 'Отправить сообщение'
        },
        'MESSAGE_STATUS': {
            'default': '',
            'Received': 'Получено',
            'Queued': 'В очереди',
            'Sent': 'Отправлено',
            'SendingFailed': 'Ошибка отправки',
            'Delivered': 'Доставлено',
            'DeliveryFailed': 'Ошибка доставки'
        },
        "NEWSMS": {
            'newSmsScreenHeader': 'Новое сообщение',
            'contactpickerPlaceholder': 'Введите имя или телефон'
        },
        "NEWCONFERENCE": {
            'newConferenceScreenHeader': 'Новая встреча',
            'dialInNumberLabel': 'Номер:',
            'hostLabel': 'Ведущий:',
            'participantsLabel': 'Участники:',
            'internationalParticipantsCheckbox': 'Международные участники',
            'selectInternationalParticipantsHeader': 'Выберите международные номера',
            'searchPlaceholder': 'Введите для поиска',
            'inviteButtonText': 'Пригласить в Google Calendar',
            'conferenceCommandsLink': 'Команды конференции'
        },
        "CONFERENCECOMMANDS": {
            'conferenceCommandsScreenHeader': 'Команды конфереции',
            'callerCountInstruction': '<b>Количество участников:</b> Позволяет проверить сколько участников на линии',
            'leaveConferenceInstruction': '<b>Покинуть конференцию:</b> Позволяет ведущему закончить звонок',
            'menuInstruction': '<b>Меню:</b> Прослушать помощь по возможным командам',
            'setListeningModeInstructions': '<b>Установить режимы прослушивания</b><ul><li>Нажать 1 раз: <b>Отключить микрофон участников</b> - Включить обратно можно с помощью <img src="%s" alt="star"><img src="%s" alt="pound"><img src="%s" alt="6"></li><li>Нажать 2 раза: <b>Отключить микрофон участников</b> - Только прослушинвание, включить микрофон нельзя</li><li>Нажать 3 раза: <b>Включить микрофон участника</b> - Вернуться на линию</li></ul>',
            'muteHostLineInstructions': '<b>Отключить звук ведущего</b><ul><li>Нажмите один раз, чтобы ОТКЛЮЧИТЬ</li><li>Нажмите еще раз, чтобы ВКЛЮЧИТЬ</li></ul>',
            'secureCallInstructions': '<b>Блокировка звонка</b><ul><li>Нажмите один раз, чтобы ЗАБЛОКИРОВАТЬ участников</li><li>Нажмите еще раз, чтобы РАЗБЛОКИРОВАТЬ участников</li></ul>',
            'hearEnterExitSoundsInstructions': '<b>Звук прихода/ухода участников</b><ul><li>Нажмите 1 раз: ВЫКЛЮЧАЕТ звук</li><li>Нажмите 2 раза: <em>Звук входа</em> ВКЛЮЧЕН <em>Звук выхода</em> ВЫКЛЮЧЕН</li><li>Нажмите 3 раза: <em>Звук входа</em> ВЫКЛЮЧЕН <em>Звук выхода</em> ВКЛЮЧЕН</li><li>Нажмите 4 раза: все звуку ВКЛЮЧЕНЫ</li></ul>',
            'recordInstructions': '<b>Запись конференции</b><ul><li>Нажмите один раз, чтобы НАЧАТЬ запись</li><li>Нажмите еще раз, чтобы ОСТАНОВИТЬ запись</li></ul>'
        },
        "NEWMEETING": {
            'newMeetingScreenHeader': 'Новая конференция',
            'topicLabel': 'Тема:',
            'topicPlaceholder': 'Тема конференции',
            'whenLabel': 'Дата',
            'dateFormat': 'dd.MM.yy',
            'dateMask': '99.99.99',
            'timeFormat': 'HH:mm',
            'timeMask': '99:99',
            'durationLabel': 'Длительность:',
            'recurringMeetingCheckbox': 'Регулярная конференция',
            'recurringMeetingHelp': 'Не забудьте отметить "Повторять" в Google Calendar',
            'meetingTypeLabel': 'Тип конференции',
            'screenShareMeetingType': 'Показ экрана',
            'videoMeetingType': 'Показ видео',
            'meetingOptionsLabel': 'Параметры конференции',
            'meetingPasswordCheckbox': 'Требовать пароль для доступа',
            'meetingPasswordLabel': 'Пароль:',
            'joinBeforeHostCheckbox': 'Подключаться до ведущего',
            'inviteButtonText': 'Пригласить в Google Calendar',
            'hourOption': 'ч.',
            'minuteOption': 'м.',
            'topicRequiredError': 'Необходимо указать тему конфереции',
            'invalidStartDateError': 'Введите правильную дату',
            'invalidStartTimeError': 'Введите правильное время',
            'meetingInPastError': 'Конференция не может быть создана в прошлом',
            'passwordNotProvidedError': 'Пожалуйста, введите пароль для конференции',
            'apiErrorCaption': 'Ошибка API:',
            'apiErrorExtension': 'Произошла ошибка во время загрузки информации об аккаунте'
        }
    }
});
}]);
