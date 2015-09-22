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
      "am",
      "pm"
    ],
    "DAY": [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ],
    "MONTH": [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    "SHORTDAY": [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ],
    "SHORTMONTH": [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],
    "fullDate": "EEEE, d MMMM y",
    "longDate": "d MMMM y",
    "medium": "d MMM y HH:mm:ss",
    "mediumDate": "d MMM y",
    "mediumTime": "HH:mm:ss",
    "short": "dd/MM/y HH:mm",
    "shortDate": "dd/MM/y",
    "shortTime": "HH:mm"
  },
  "NUMBER_FORMATS": {
    "CURRENCY_SYM": "\u00a3",
    "DECIMAL_SEP": ".",
    "GROUP_SEP": ",",
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
        "negPre": "\u00a4-",
        "negSuf": "",
        "posPre": "\u00a4",
        "posSuf": ""
      }
    ]
  },
  "id": "en-gb",
  "pluralCat": function(n, opt_precision) {  var i = n | 0;  var vf = getVF(n, opt_precision);  if (i == 1 && vf.v == 0) {    return PLURAL_CATEGORY.ONE;  }  return PLURAL_CATEGORY.OTHER;},


    "STRINGS": {
        "GENERAL": {
            'today': 'Today',
            'unknownCallerId': 'Unknown Caller Id',
            'unknownLocation': 'unknown',
            'unknownContact': 'Unknown Contact',
            'blockedNumber': 'Blocked Number'
        },
        "SIDEBAR": {
            'dialerTitle': 'Dialer',
            'newTextTitle': 'Compose text',
            'messagesTitle': 'Messages',
            'contactsTitle': 'Contacts',
            'callLogTitle': 'Call Log',
            'meetingTitle': 'Schedule Meeting',
            'conferenceTitle': 'Schedule Conference',
            'hangoutsTitle': 'Start Hangout with Conferencing',
            'settingsTitle': 'Settings'
        },
        "HEADER": {
            'headerDefault': 'Login to phone system',
            'headerWithBrand': 'Login to',
            'collapseTitle': 'Collapse',
            'expandTitle': 'Expand',
            'logoutTitle': 'Logout'
        },
        "DIRECTIVES": {
            "CONTACTPHONE": {
                'actionCallTitle': 'Call',
                'actionTextTitle': 'Send Text'
            },
            "RCSENDSMS": {
                'groupIntoOneConversationCheckbox': 'Group into one conversation',
                'sendButton': 'Send',
                'textareaPlaceholder': 'Type text'
            }
        },
        "LOGIN": {
            'comboUSValue': 'United States',
            'comboUKValue': 'United Kingdom',
            'comboCanadaValue': 'Canada',
            'userNamePlaceholder': 'Phone number',
            'extensionPlaceholder': 'Ext',
            'passwordPlaceholder': 'Password',
            'loginButtonText': 'Login',
            'loginButtonTextOnLoading': 'Login...',
            'loginInternalErrorCaption': 'Internal Error: ',
            'loginInternalErrorAdvice': '',
            'rememberMeCheckbox': 'Remember me',
            'errorPhoneNumberIsEmpty': 'Please enter your Phone number',
            'errorPasswordIsEmpty': 'Please enter your Password',
            'errorIncorrectLogin': 'Phone number and password do not match'
        },
        "SETTINGS": {
            'settingsScreenHeader': 'Settings',
            'desktopNotificationsCheckbox': 'Desktop notifications',
            'desktopNotificationsConfirmationInfo': 'Please allow or deny desktop notifications',
            'desktopNotificationsDisabledInfo': 'Desktop notifications were disabled for the extension address. If you wish to use the notifications, please <a href="https://support.google.com/chrome/answer/3220216?hl=en" target="_blank">manage them in browser settings</a>',
            'googleContactsCaption': 'Google Contacts',
            'googleContactsAuthorizeButton': 'Authorise',
            'googleContactsAuthorizedText': 'Authorised',
            'googleContactsManageLink': 'manage',
            'eulaLink': 'EULA',
            'versionInfo': 'Version'
        },
        "CONTACT": {
            'contactScreenHeader': 'Contact Details',
            'googleContactsNotAuthorizedInfo': 'App is not authorised in Google',
            'emailsHeader': 'E-Mails sdfsdf',
            'email1Label': 'E-Mail',
            'email2Label': 'E-Mail 2',
            'email3Label': 'E-Mail 3',
            'phoneNumberHeader': 'Phone Number',
            'extensionLabel': 'Extension',
            'home1Label': 'Home',
            'home2Label': 'Home 2',
            'busyness1Label': 'Busyness',
            'busyness2Label': 'Busyness 2',
            'mobileLabel': 'Mobile',
            'companyLabel': 'Company',
            'assistantLabel': 'Assistant',
            'carLabel': 'Car',
            'anotherLabel': 'Another',
            'callbackLabel': 'Callback',
            'contactNotFound': 'Contact not found'
        },
        "CONTACTPICKER": {
            'contactPickerScreenHeader': 'Select a Contact',
            'searchPlaceholder': 'Search...',
            'noContactsMessage': 'No contacts to display'
        },
        "CONTACTS": {
            'contactsScreenHeader': 'Contacts',
            'searchPlaceholder': 'Search...',
            'searchContactHint': 'Please type to search a contact',
            'googleContactsNotAuthorizedInfo': 'App is not authorised in Google',
            'googleContactsAuthorizeButton': 'Authorise'
        },
        "ACTIVECALLMONITOR": {
            'closeButton': 'Close',
            'incomingCallCaption': 'Incoming Call From',
            'outgoingCallCaption': 'Outgoing Call To',
            'callStatusRinging': 'Ringing',
            'callStatusRingingToBrand': 'Calling your %s device',
            'callStatusWaiting': 'Please press 1 to connect with your party',
            'callStatusCallerConnected': 'Please wait for the other party to answer',
            'callStatusFinished': 'Call has finished',
            'callStatusHold': 'On Hold'
        },
        "CALLLOG": {
            'callLogScreenHeader': 'Call Log',
            'allCallsTab': 'All',
            'missedCallsTab': 'Missed',
            'allCallsTabTitle': 'Show all calls',
            'missedCallsTabTitle': 'Show only missed calls',
            'searchPlaceholder': 'Search...',
            'noCallsInfo': 'No calls to display'
        },
        "CALLENTRY": {
            'callLogEntryScreenHeader': 'Call Details',
            'noCallsInfo': 'No calls found',
            'incomingCallCaption': 'Incoming Call From',
            'outgoingCallCaption': 'Outgoing Call To',
            'missedCallCaption': 'Missed Call From',
            'callButton': 'Call',
            'textButton': 'Send Text'
        },
        "CONVERSATION": {
            'unknownContact': 'Unknown Contact',
            'messageIsNotSentError': 'Message is not sent',
            'messageIsNotDeliveredError': 'Message is not delivered'
        },
        "DIALER": {
            'dialerScreenHeader': 'Dialer',
            'contactpickerPlacholder': 'Enter Name or Number',
            'customError': '%s',
            'ringoutError': 'Ringout error: %s',
            'failedToCompleteError': 'Your call could not be completed. Please try again later',
            'cannotReachRCPhoneError': 'Please check if your %s device is available to receive a call and Call Screening is disabled.',
            'callButtonText': 'Call',
            'callInProgressButtonText': 'Call is in progress'
        },
        'DIALERSETTIGNS': {
            'makeOutboundCallWithLabel': 'Make Outbound Call With',
            'makeOutboundCallWithHelp': '<p>Please choose a device for making an outbound call.</p><p>In case you do not have ready access to your RingCentral desk phone or RingCentral softphone, you can use a non RingCentral device such as your cell phone or home phone.</p>',
            'press1ToStartCallLabel': 'Press 1 to start a call',
            'press1ToStartCallHelp': '<p>Please check this if you want your phone to prompt you to press 1 before ringing the phone you dialed.</p>'
        },
        "MESSAGES": {
            'messagesScreenHeader': 'Messages',
            'allTab': 'All',
            'voiceTab': 'Voice',
            'faxTab': 'Fax',
            'textTab': 'Text',
            'searchPlacholer': 'Search...',
            'messageLabel': '',
            'faxLabel': 'Fax Recieved',
            'voiceLabel': 'Voice Message',
            'deleteMessageTitle': 'Delete Message',
            'viewFaxTitle': 'View Fax',
            'deleteFaxTitle': 'Delete Fax',
            'playVoiceTitle': 'Play',
            'resumeVoiceTitle': 'Resume',
            'stopVoiceTitle': 'Stop',
            'callTitle': 'Call',
            'sendTextTitle': 'Send Text',
            'markAsReadTitle': 'Mark as Read',
            'markAsUnreadTitle': 'Mark as Unread',
            'deleteVoiceMailTitle': 'Delete Voicemail',
            'noMessagesMessage': 'The list is empty'
        },
        'MESSAGEDETAILS': {
            'messageDetailsScreenHeader': 'Message Details',
            'noMessagesFoundText': 'No messages found',
            'outgoingMessageLabel': 'Outgoing Message To',
            'incomingMessageLabel': 'Incoming Message From',
            'callButtonText': 'Call',
            'sendTextButtonText': 'Send Text'
        },
        'MESSAGE_STATUS': {
            'default': '',
            'Received': 'Received',
            'Queued': 'Queued',
            'Sent': 'Sent',
            'SendingFailed': 'Sending Failed',
            'Delivered': 'Delivered',
            'DeliveryFailed': 'Delivery Failed'
        },
        "NEWSMS": {
            'newSmsScreenHeader': 'Compose Message',
            'contactpickerPlaceholder': 'Enter Name or Number'
        },
        "NEWCONFERENCE": {
            'newConferenceScreenHeader': 'New Conference',
            'dialInNumberLabel': 'Dial-in Number:',
            'hostLabel': 'Host:',
            'participantsLabel': 'Participants:',
            'internationalParticipantsCheckbox': 'I have international participants',
            'selectInternationalParticipantsHeader': 'Select International Dial-in Numbers',
            'searchPlaceholder': 'Search...',
            'inviteButtonText': 'Invite with Google Calendar',
            'conferenceCommandsLink': 'Conference Commands'
        },
        "CONFERENCECOMMANDS": {
            'conferenceCommandsScreenHeader': 'Conference Commands',
            'callerCountInstruction': '<b>Caller Count:</b> Keep track of how many people are on the call',
            'leaveConferenceInstruction': '<b>Leave Conference:</b> Lets the host hang up and end the call',
            'menuInstruction': '<b>Menu:</b> Listen to the list of touchtone commands',
            'setListeningModeInstructions': '<b>Set Listening Modes</b><ul><li>Press 1x: <b>Mute callers</b> - Callers can unmute with<img src="%s" alt="star"><img src="%s" alt="pound"><img src="%s" alt="6"></li><li>Press 2x: <b>Mute callers</b> - Listen only. No unmuting option</li><li>Press 3x: <b>Unmute callers</b> - Opens the line again</li></ul>',
            'muteHostLineInstructions': '<b>Mute Host Line</b><ul><li>Press once to MUTE</li><li>Press again to UNMUTE</li></ul>',
            'secureCallInstructions': '<b>Secure the Call</b><ul><li>Press once to BLOCK all callers</li><li>Press again to OPEN the call</li></ul>',
            'hearEnterExitSoundsInstructions': '<b>Hear sound when people Enter or Exit call</b><ul><li>Press 1x: Turns OFF sound</li><li>Press 2x: <em>Enter</em> tone is ON <em>Exit</em> tone is OFF</li><li>Press 3x: <em>Enter</em> tone is OFF <em>Exit</em> tone is ON</li><li>Press 4x: Turns ON sound</li></ul>',
            'recordInstructions': '<b>Record your conference</b><ul><li>Press once to START recording</li><li>Press again to STOP recording</li></ul>'
        },
        "NEWMEETING": {
            'newMeetingScreenHeader': 'New Meeting',
            'topicLabel': 'Topic:',
            'topicPlaceholder': 'Meeting topic',
            'whenLabel': 'When',
            'dateFormat': 'dd/MM/yy',
            'dateMask': '99/99/99',
            'timeFormat': 'HH:mm',
            'timeMask': '99:99',
            'durationLabel': 'Duration:',
            'recurringMeetingCheckbox': 'Recurring Meeting',
            'recurringMeetingHelp': 'Please do not forget to check "Repeat" in Google Calendar',
            'meetingTypeLabel': 'Meeting Type',
            'screenShareMeetingType': 'Screen Share Meeting',
            'videoMeetingType': 'Video Meeting',
            'meetingOptionsLabel': 'Meeting Options',
            'meetingPasswordCheckbox': 'Require meeting password',
            'meetingPasswordLabel': 'Password:',
            'joinBeforeHostCheckbox': 'Enable join before host',
            'inviteButtonText': 'Invite with Google Calendar',
            'hourOption': 'h.',
            'minuteOption': 'm.',
            'topicRequiredError': 'Topic is required',
            'invalidStartDateError': 'Please enter a valid start date',
            'invalidStartTimeError': 'Please enter a valid start time',
            'meetingInPastError': 'Creating meeting in the past is forbidden',
            'passwordNotProvidedError': 'Please provide meeting password',
            'apiErrorCaption': 'API Error:',
            'apiErrorExtension': 'An error appeared while loading extension data'
        }
    }
});
}]);
