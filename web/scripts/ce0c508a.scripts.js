'use strict';

setTimeout(function() {
    document.getElementById('restrictions').style.opacity='1.0';
},1500);


angular.module( 'openCtiApp',
[
	'ngRoute',
	'ngAnimate',
	'ngSanitize',
    'tmh.dynamicLocale',
	'ui.bootstrap',
	'ui.mask',
	'mgcrea.ngStrap',
	'rcCallMonitor',
	'activeCallMonitor',
	'rcChromeExtension',
	'rcFocus',
	'google',
	'google.calendar',
	'google.mail',
	'rcLogging',
	'rcAuth',
	'rcSupport',
	'rcTabrpc',
	'zoomMeetings'

]);

angular.module("openCtiApp")
    .run(["MAX_SF_LINES", function(MAX_SF_LINES) { 'use strict';
        function CallInfo() {
            this.id = null;
            this.presenceId = null;
            this.sessionId = null;
            this.fromNumber = null;
            this.fromName = null;
            this.toNumber = null;
            this.toName = null;
            this.duration = null;
            this.direction = null;
            this.result = null;
            this.startTime = null;

            this.ringout = null;

            this.sfDataFetched = false;
            this.sfData = null;
            this.screenPopUrl = null;
        }

        CallInfo.prototype.getInternalKey = function () {
            return this.fromNumber + " -> " + this.toNumber;
        };

        CallInfo.prototype.isOutbound = function () {
            return this.direction.toLowerCase() === "outbound";
        };

        CallInfo.prototype.isInbound = function () {
            return this.direction.toLowerCase() === "inbound";
        };

        CallInfo.prototype.hasDuration = function () {
            return typeof this.duration !== "undefined"
                && this.duration !== -1
                && this.duration !== 0
                && this.duration !== null;
        };

        CallInfo.prototype.isRinging = function () {
            return ["In Progress", "Ringing"].indexOf(this.result) !== -1
                && !this.hasDuration();
        };

        CallInfo.prototype.isAccepted = function () {
            return ["Accepted", "Call connected"].indexOf(this.result) !== -1;
        };

        CallInfo.prototype.isOnHold = function () {
            return ["OnHold"].indexOf(this.result) !== -1;
        };

        CallInfo.prototype.isFinished = function () {
            return this.hasDuration();
        };

        CallInfo.prototype.isConnected = function () {
            return ["CallConnected", "Call connected"].indexOf(this.result) !== -1
                && !this.hasDuration();
        };

        CallInfo.prototype.isMissed = function () {
            return ["Missed", "Hang Up", "Busy", "Voicemail"].indexOf(this.result) !== -1;
        };

        CallInfo.prototype.isBusy = function () {
            return ["Busy", "No Answer"].indexOf(this.result) !== -1;
        };

        CallInfo.prototype.isRingoutCalleeRinging = function () {
            return this.ringout !== null
                && this.ringout.status.callerStatus === "Success"
                && !this.hasDuration();
        };

        CallInfo.prototype.isRingoutCalleeConnected = function () {
            // Ringout started from the widget
            if (this.ringout !== null
                && this.ringout.status.callerStatus === "" // 'Success' is set when it starts to ring on the callee side, not when he picked the phone
                && !this.hasDuration()) {

                return true;

            // Ringout started from the outside of the widget
            } else if (this.ringout === null
                && ["CallConnected"].indexOf(this.result) !== -1
                && !this.hasDuration()) {

                return true;
            } else {
                return false;
            }
        };

        CallInfo.prototype.isVoicemail = function () {
            return ["Voicemail"].indexOf(this.result) !== -1;
        };

        CallInfo.prototype.hasSfData = function () {
            return this.sfDataFetched || this.sfData !== null;
        };

        CallInfo.prototype.hasContacts = function () {
            return this.hasSfData() && this.sfData.contacts.length > 0;
        };

        CallInfo.prototype.hasLeads = function () {
            return this.hasSfData() && this.sfData.leads.length > 0;
        };

        CallInfo.prototype.hasAccounts = function () {
            return this.hasSfData() && this.sfData.accounts.length > 0;
        };

        CallInfo.prototype.hasOpportunities = function () {
            return this.hasSfData() && this.sfData.opportunities.length > 0;
        };

        CallInfo.prototype.ageInHours = function () {
            var now = new Date();

            return  (now - this.startTime) / 1000 / 3600;
        };

        /**
         * Types of SalesForce objects.
         */
        CallInfo.sfObjectTypes = {
            opportunity: "Opportunity",
            lead: "Lead",
            account: "Account",
            contact: "Contact"
        };

        CallInfo.prototype.resetSfData = function () {
            this.sfData = {
                contacts: [],
                accounts: [],
                leads: [],
                opportunities: []
            };    
        };

        /**
         * Adds SalesForce record that is related to the call.
         * 
         * @param {string} id the part of the URL
         * @param {Object} record
         */
        CallInfo.prototype.addSfDataLine = function (id, record) {
            if (this.sfData === null) {
                this.sfData = {
                    contacts: [],
                    accounts: [],
                    leads: [],
                    opportunities: []
                };
            }

            var line = angular.copy(record);
            line.Id = id;

            switch (record.object) {
                case CallInfo.sfObjectTypes.contact:
                    addIfNotPresent(this.sfData.contacts, line);
                    break;
                case CallInfo.sfObjectTypes.account:
                    addIfNotPresent(this.sfData.accounts, line);
                    break;
                case CallInfo.sfObjectTypes.lead:
                    addIfNotPresent(this.sfData.leads, line);
                    break;
                case CallInfo.sfObjectTypes.opportunity:
                    addIfNotPresent(this.sfData.opportunities, line);
                    break;
            }

            function addIfNotPresent(a, theRecord) {
                var found = false;
                a.forEach(function (record) {
                    if (record.Id === theRecord.Id) {
                        found = true;
                    }
                });

                if (!found) {
                    a.push(theRecord);
                }
            }
        };

        /**
         * Returns the list of SF records that should be present in 'Related To' drop-down
         * while adding the call to Activity Log.
         * 
         */
        CallInfo.prototype.getRelatedToDD = function () {
            var result = [];

            if (this.hasSfData()) {
                result.push.apply(result, this.sfData.accounts);
                result.push.apply(result, this.sfData.opportunities);
            }

            return result;
        };

        /**
         * Returns the list of SF records that should be present in 'Name' drop-down
         * while adding the call to Activity Log.
         * 
         */
        CallInfo.prototype.getNameDD = function () {
            var result = [];

            if (this.hasSfData()) {
                result.push.apply(result, this.sfData.contacts);
                result.push.apply(result, this.sfData.leads);
            }

            return result;
        };

        CallInfo.prototype.sfDataSize = function () {
            return this.hasSfData() 
                && this.sfData.contacts.length + this.sfData.accounts.length + this.sfData.leads.length + this.sfData.opportunities.length;
        };

        function positiveOrZero(value) {
            return value > 0 ? value : 0;
        };

        CallInfo.prototype.contactsLimit = function () {
            if (this.hasContacts()) {
                return positiveOrZero(Math.min(this.sfData.contacts.length, MAX_SF_LINES));
            } else {
                return 0;
            }
        };

        CallInfo.prototype.leadsLimit = function () {
            if (this.hasLeads()) {
                var limit = MAX_SF_LINES - this.contactsLimit();
                return positiveOrZero(Math.min(limit, this.sfData.leads.length));
            } else {
                return 0;
            }
        };

        CallInfo.prototype.accountsLimit = function () {
            if (this.hasAccounts()) {
                var limit = MAX_SF_LINES - this.contactsLimit() - this.leadsLimit();
                return positiveOrZero(Math.min(limit, this.sfData.accounts.length));
            } else {
                return 0;
            }
        };

        CallInfo.prototype.accountsOpportunities = function () {
            if (this.hasOpportunities()) {
                var limit = MAX_SF_LINES - this.contactsLimit() - this.leadsLimit() - this.accountsLimit();
                return positiveOrZero(Math.min(limit, this.sfData.opportunities.length));
            } else {
                return 0;
            }
        };

        /**
         * Copies status-related information from theCall to this call.
         * 
         * @param {CallInfo} theCall the call to copy status information from
         */
        CallInfo.prototype.updateStatusFrom = function (theCall) {
            this.result = theCall.result;
            this.id = theCall.id;
            this.duration = theCall.duration;
        };

        /**
         * Creates CallInfo object from the object restored from the local storage (plain Object).
         * 
         * @param {Object} storedCall
         * @returns {CallInfo}
         */
        CallInfo.fromStored = function (storedCall) {
            var call = new CallInfo();
            angular.extend(call, storedCall);

            // restore the Date object as it is stored as string
            call.startTime = new Date(call.startTime);

            // Call can contain no information about call timing because the timer has not yet been started.
            // Do not create fake start time and skip this attribute instead.
            if (typeof call._timerStartTime === "string" && call._timerStartTime !== "") {
                call._timerStartTime = new Date(call._timerStartTime);
            }

            return call;
        };

        /**
         * Creates CallInfo object from the presence event's activeCalls object.
         * 
         * @param {Object} activeCall
         * @param {Object} utils utils service
         * @returns {CallInfo}
         */
        CallInfo.fromPresenceActiveCall = function (activeCall, utils) {
            var call = new CallInfo();
            call.direction = activeCall.direction;
//            call.duration = -1;
            call.fromNumber = utils.filterNumber(activeCall.from);
            call.toNumber = utils.filterNumber(activeCall.to);
            call.result = activeCall.telephonyStatus;
            call.startTime = new Date();
            call.id = null;
            call.presenceId = activeCall.id;
            call.sessionId = activeCall.sessionId;

            return call;
        };

        /**
         * Creates CallInfo object from the SDK call object.
         * 
         * @param {Object} rawCall
         * @param {Object} utils utils service
         * @param {string} directNumber default number that will be used in case if the call is outbound and there is no 'From' number
         * @returns {CallInfo}
         */
        CallInfo.fromSdkCall = function (rawCall, utils, directNumber) {
            var call = new CallInfo();

            call.id = rawCall.id;

            if (rawCall.from.phoneNumber) {
                call.fromNumber = utils.filterNumber(rawCall.from.phoneNumber);
            } else {
                call.fromNumber = (rawCall.direction === "Outbound" ? directNumber : "")
                    || rawCall.from.extensionNumber
                    || rawCall.from.name;
            }

            if (rawCall.to.phoneNumber) {
                call.toNumber = utils.filterNumber(rawCall.to.phoneNumber);
            } else {
                call.toNumber = rawCall.to.extensionNumber || rawCall.to.name;
            }
            call.toName = rawCall.to.name;
            call.fromName = rawCall.from.name;

            call.duration = rawCall.duration;
            call.direction = rawCall.direction; // can be 'Inbound', 'Outbound', 'Internal'
            call.result = rawCall.result; // Can be 'In Progress', 'Missed', 'Stopped', 'Accepted', 'Call connected', 'Busy'
            call.startTime = new Date(rawCall.startTime);

            return call;
        };

        // export
        window.CallInfo = CallInfo;
    }]);
angular.module("openCtiApp")
    .run(function() { 'use strict';
        /**
         * @returns {ActivityLogEntry}
         */
        function ActivityLogEntry() {
            this.id = null;
            this.saved = false;
            this.callInfoCallapsed = false;

            this.reset();
        }

        ActivityLogEntry.prototype.reset = function () {
            this.subject = null;
            this.comment = null;
            this.linkedWith = null;
            this.relatedTo = null;
            this.visible = true;
            this.timeCreated = new Date();
        };

        ActivityLogEntry.fromStored = function (rawObject) {
            var result = new ActivityLogEntry();

            angular.extend(result, rawObject);

            // As Subject field is required it can be 'undefined' when the input is empty (because AngularJS is working in this way for required inputs)
            // we need to make it 'undefined' as well.
            // Otherwise it will be 'null' as its default value for a newly contructed object.
            if (typeof rawObject.subject === "undefined") {
                (function (undefined) {
                    result.subject = undefined;
                }) ();
            }

            // restore the Date object as it is stored as string
            result.timeCreated = new Date(rawObject.timeCreated);

            return result;
        };

        ActivityLogEntry.prototype.hasLinkedWith = function () {
            return this.linkedWith !== null;
        };

        ActivityLogEntry.prototype.hasRelatedTo = function () {
            return this.relatedTo !== null;
        };

        ActivityLogEntry.prototype.isLinkedWithLead = function () {
            return this.hasLinkedWith()
                // Check for "00Q" as any lead ID starts with '00Q' according to Salesforce,
                && this.linkedWith.indexOf('00Q') === 0;
        };

        ActivityLogEntry.prototype.setDefaults = function (call) {
            if (this.subject === null) {
                if (call.isOutbound()) {
                    this.subject = 'Outbound to ' + call.toNumber;
                } else {
                    this.subject = call.direction + ' from ' + call.fromNumber;
                }
            }

            if (this.comment === null) {
                this.comment = "";
            }

            if (!this.hasLinkedWith() && !this.sfDefaultsSet) {
                if (call.getNameDD().length === 1) {
                    this.linkedWith = call.getNameDD()[0].Id;
                }
            }

            if (!this.hasRelatedTo()
                && !this.isLinkedWithLead()
                && !this.sfDefaultsSet) {

                if (call.getRelatedToDD().length === 1) {
                    this.relatedTo = call.getRelatedToDD()[0].Id;
                }
            }

            if (call.sfDataFetched) {
                this.sfDefaultsSet = true;
            }
        };

        // export
        window.ActivityLogEntry = ActivityLogEntry;
    });
angular.module("executionQueue", [])
    .config(function () { 'use strict';
        function ExecutionQueue() {
            this.queue = [];
            this.isOff = false;
            
            var self = this;
            this.pollTimerId = setInterval(function () {
                if (this.isOff) {
                    // process the queue for the last time
                    clearInterval(self.pollTimerId);
                    self.pollTimerId = null;
                }
                
                if (self.queue.length > 0) {
                    var q = self.queue.splice(0, self.queue.length);
                    q.forEach(function (task) {
                        if (!task()) {
                            // return the task that can't be executed now back to the queue to execute it later
                            self.add(task);
                        }
                    });
                }
            }, 500);
        }
        
        ExecutionQueue.prototype.add = function (task) {
            if (this.pollTimerId === null) {
                throw new Error("Queue is off and can't get any more tasks");
            }
            
            this.queue.push(task);
        };
        
        ExecutionQueue.prototype.off = function () {
            this.isOff = true;
        };
        
        // export
        window.ExecutionQueue = ExecutionQueue;
    });
angular.module("openCtiApp")
    .run(["contactMappingService", "settingsService", "formatPhoneFilter", "$rootScope", function( contactMappingService, settingsService, formatPhoneFilter, $rootScope ) { 'use strict';
        /**
         * @returns {Message}
         */
        function Message() {
            this.uri = null;
            this.id = null;
            this.from = null;
            this.to = [];
            this.type = null;
            this.creationTime = null;
            this.readStatus = null;
            this.priority = undefined;
            this.attachments = [];
            this.direction = null;
            this.availability = null;
            this.subject = null;
            this.messageStatus = null;
            this.faxResolution = null;
            this.faxPageCount = null;
            this.lastModifiedTime = null;
            this.rawMessage = null;
            this.__cache = {};
        }
        
        /**
         * @param {object} rawMessage raw plain JS object gotten from API call result
         * @returns {Message}
         */
        Message.fromApi = function (rawMessage) {
            var message = new Message();

            angular.extend(message, rawMessage);
            
            message.creationTime = new Date(message.creationTime);
            message.lastModifiedTime = new Date(message.lastModifiedTime);
            
            return message;
        };
        
        Message.prototype.isInbound = function () {
            return this.direction === "Inbound";
        };
        
        Message.prototype.isOutbound = function () {
            return this.direction === "Outbound";
        };
        
        Message.prototype.isFax = function () {
            return this.type === "Fax";
        };
        
        Message.prototype.isSms = function () {
            return this.type === "SMS";
        };

        Message.prototype.isPager = function () {
            return this.type === "Pager";
        };

        Message.prototype.isText = function () {
            return this.isSms() || this.isPager() || this.isConversation();
        };

        Message.prototype.isConversation = function () {
            return this.type === "Conversation";
        };

        Message.prototype.isGroupMessage = function() {
            return angular.isArray(this.to) && this.to.length > 1;
        };

        Message.prototype.isVoicemail = function () {
            return this.type === "VoiceMail";
        };

        Message.prototype.isDeleted = function () {
            return this.availability === "Deleted";
        };
        
        Message.prototype.getVoicemailDuration = function () {
            if (this.isVoicemail() && this.attachments.length > 0) {
                return this.attachments[0].vmDuration;
            } else {
                return "";
            }
        };

        Message.prototype.getVoicemailUri = function () {
            if (this.isVoicemail() && this.attachments.length > 0) {
                return this.attachments[0].uri;
            } else {
                return "";
            }
        };
        

        function id(contact) {
            if (!contact) {
                return '';
            }
            else if (contact.phoneNumber) {
                return ["phoneNumber", contact.phoneNumber];
            } else if (contact.extensionNumber) {
                return ["extensionNumber", contact.extensionNumber];
            } else {
                return ["name", contact.name];
            }
        }

        Message.prototype.getAuthorNameOrNumber = function ()
        {
            var number = this.getAuthorNumber();
            return number.map( function( entry ){ return contactMappingService.getNameByNumber(entry) || formatPhoneFilter(entry); }).join(', ');
        };

        Message.prototype.getAuthorNameOrUnknown = function ()
        {
            var number = this.getAuthorNumber();
            return number.map( function( entry ){ return contactMappingService.getNameByNumber(entry) || $rootScope.STRINGS && $rootScope.STRINGS.GENERAL.unknownCallerId || 'Unknown Contact'; }).join(', ');
        };

        Message.prototype.getAuthorNumber = function () {
            if (!this.__cache['getAuthorNumber']) {
                if (this.isGroupMessage()) {
                    var currentExtension = settingsService.getOne('extensionNumber');
                    this.__cache['getAuthorNumber'] = angular.isArray(this.to) && this.to.map(function(val) {
                        return val.phoneNumber || val.extensionNumber;
                    }).filter(function(val) {
                        return val != currentExtension
                    });
                }
                else {
                    if (this.isOutbound()) {
                        this.__cache['getAuthorNumber'] = ( this.to && this.to[0] )? [ this.to[0].phoneNumber || this.to[0].extensionNumber ]: [];
                    } else {
                        this.__cache['getAuthorNumber'] = ( this.from )? [ this.from.phoneNumber || this.from.extensionNumber ]: [];
                    }
                }
            }
            return this.__cache['getAuthorNumber'];
        };


        Message.prototype.getAuthorNameFieldName = function () {
            if (this.isOutbound()) {
                // TODO how to deal with multiple recipients?
                return id(this.to[0])[1];
            } else {
                return id(this.from)[1];
            }
        };

        Message.prototype.getAuthorIdField = function () {
            if (this.isOutbound()) {
                // TODO how to deal with multiple recipients?
                return id(this.to[0])[0];
            } else {
                return id(this.from)[0];
            }
        };

        Message.prototype.getAuthorId = function () {
            if (this.isOutbound()) {
                // TODO how to deal with multiple recipients?
                return id(this.to[0])[1];
            } else {
                return id(this.from)[1];
            }
        };

        Message.prototype.getPhoneTo = function () {
            if (this.isOutbound()) {
                return this.to[0].extensionNumber || this.to[0].phoneNumber || null;
            } else {
                return this.from.extensionNumber || this.from.phoneNumber || null;
            }
        };
        
        Message.prototype.isRead = function () {
            return this.readStatus === "Read";
        };

        Message.prototype.read = function () {
            this.readStatus = 'Read';
        };

        Message.prototype.unread = function () {
            this.readStatus = 'Unread';
        };

        Message.prototype.isSendingError = function() {
            return this.isOutbound() && ['SendingFailed', 'DeliveryFailed']
                .indexOf(this.messageStatus) !== -1;
        };

        Message.prototype.isSent = function () {
            return this.isOutbound() && ['Delivered', 'Sent', 'SendingFailed', 'DeliveryFailed']
                .indexOf(this.messageStatus) !== -1;
        };
        
        // export
        window.Message = Message;
    }]);
angular.module("openCtiApp")
    .run(["googleService", "utils", function(googleService, utils) { 'use strict';
        /**
         * @returns {Contact}
         */
        function Contact(type) {
            if (["personal", "company", "google"].indexOf(type) === -1) {
                throw new Error("Unknown contact type: " + type);
            }

            this.type = type;

            this.uri = null;
            this.id = null;
            this.trackingId = null;
            this.availability = null;
            this.firstName = null;
            this.lastName = null;
            this.middleName = null;
            this.nickName = null;
            this.company = null;
            this.jobTitle = null;

            this.extensionNumber;

            this.homePhone = null;
            this.homePhone2 = null;
            this.businessPhone = null;
            this.businessPhone2 = null;
            this.mobilePhone = null;
            this.businessFax = null;
            this.companyPhone = null;
            this.assistantPhone = null;
            this.carPhone = null;
            this.otherPhone = null;
            this.otherFax = null;
            this.callbackPhone = null;

            this.email = null;
            this.email2 = null;
            this.email3 = null;

            this.homeAddress = null;
            this.businessAddress = null;
            this.otherAddress = null;

            this.birthday = null;
            this.webPage = null;
            this.notes = null;

            this.avatarUrl = null;
        }

        Contact.prototype.isDeleted = function () {
            return this.availability === "Deleted";
        };

        Contact.prototype.isPersonal = function () {
            return this.type === "personal";
        };

        Contact.prototype.isCompany = function () {
            return this.type === "company";
        };

        Contact.prototype.isGoogle = function () {
            return this.type === "google";
        };

        Contact.prototype.getMainPhoneNumber = function () {
            switch (this.type) {
                case "personal":
                case "google":
                    return this.businessPhone
                        || this.businessPhone2
                        || this.mobilePhone
                        || this.companyPhone
                        || this.assistantPhone
                        || this.carPhone
                        || this.homePhone
                        || this.homePhone2;
                case "company":
                    return this.extensionNumber;
                default:
                    throw new Error("Unknown contact type: " + type);
            }
        };

        Contact.prototype.hasPhone = function (phone) {
            var normalizedPhone = utils.normalizeNumber(phone);
            return Object.getOwnPropertyNames(this)
                .filter(function (field) {
                    return (field.toLowerCase().indexOf("phone") >= 0) && (typeof this[field] == 'string');
                }, this)
                .some(function (field) {
                    return utils.normalizeNumber(this[field]) == normalizedPhone;
                }, this);
        };

        Contact.prototype.hasAPhone = function () {
            return Object.getOwnPropertyNames(this)
                .filter(function (field) {
                    return field.toLowerCase().indexOf("phone") !== -1;
                })
                .some(function (field) {
                    return this[field] !== null && this[field] != "";
                }, this);
        };

        Contact.prototype.hasAnExtension = function () {
            return this.extensionNumber !== null
                && this.extensionNumber !== ""
                && this.extensionNumber !== undefined;
        };

        Contact.prototype.hasAPhoneOrExtension = function () {
            return this.hasAPhone() || this.hasAnExtension();
        };

        /**
         * @param {object} rawContact raw plain JS object gotten from API call result
         * @returns {Contact}
         */
        Contact.fromApi = function (rawContact) {
            var contact = new Contact("personal");
            
            angular.extend(contact, rawContact);

            contact.trackingId = "p_" + contact.id;

            return contact;
        };

        /**
         * @param {object} rawContact raw plain JS object gotten from API call result
         * @returns {Contact}
         */
        Contact.fromExtensionApi = function (rawExtension) {
            var contact = new Contact("company");

            contact.id = rawExtension.id;
            contact.trackingId = "c_" + rawExtension.id;
            contact.uri = rawExtension.uri;
            if (rawExtension.contact && rawExtension.contact.firstName) {
                contact.firstName = rawExtension.contact.firstName;
            }
            if (rawExtension.contact && rawExtension.contact.lastName) {
                contact.lastName = rawExtension.contact.lastName;
            }
            if (rawExtension.contact && rawExtension.contact.email) {
                contact.email = rawExtension.contact.email;
            }
            contact.extensionNumber = rawExtension.extensionNumber;

            return contact;
        };

        /*
         Object$t: "1111111111"rel: "http://schemas.google.com/g/2005#work"
         Object$t: "2222222222"rel: "http://schemas.google.com/g/2005#mobile
         Object$t: "3333333333"rel: "http://schemas.google.com/g/2005#home"
         Object$t: "4444444444"label: "main"
         Object$t: "5555555555"rel: "http://schemas.google.com/g/2005#work_fax"
         Object$t: "6666666666"rel: "http://schemas.google.com/g/2005#home_fax"
         Object$t: "7777777777"label: "grandcentral"
         Object$t: "8888888888"rel: "http://schemas.google.com/g/2005#pager"
         Object$t: "9999999999"label: "car phone"
         */
        var phoneMap = {
            "http://schemas.google.com/g/2005#work": "businessPhone",
            "http://schemas.google.com/g/2005#mobile": "mobilePhone",
            "http://schemas.google.com/g/2005#home": "homePhone",
            "main": "otherPhone",
            "http://schemas.google.com/g/2005#work_fax": "businessFax",
            "http://schemas.google.com/g/2005#home_fax": "otherFax",
            "grandcentral": "homePhone2"
        };

        /**
         * @param {object} entry raw plain JS object gotten from API call result
         * @returns {Contact}
         */
        Contact.fromGoogleApi = function (entry) {
            var contact = new Contact("google");

            contact.id = entry.id["$t"];
            contact.trackingId = "g_" + btoa(entry.id["$t"]);
            contact.uri = entry.id["$t"];

            if (entry["gd$deleted"]) {
                contact.availability = "Deleted";
            }

            if (entry.title["$t"]) {
                var a = entry.title["$t"].match(/^([^ ]+)\s*(.*)$/);
                if (a !== null) {
                    contact.firstName = a[1];
                    contact.lastName = a[2];
                } else {
                    contact.firstName = contact.lastName = "";
                }
            }

            if (entry["gd$email"]) {
                entry["gd$email"].sort(function (a, b) {
                    return a.primary == "true" ? 1 : -1;
                }).map(function (email) {
                    return email.address;
                }).forEach(function (email, i) {
                    contact["email" + (i > 0 ? i : "")] = email;
                });
            }

            if (entry["gd$phoneNumber"]) {
                entry["gd$phoneNumber"].forEach(function (phone) {
                    var field = phoneMap[phone.rel] || phoneMap[phone.label];
                    if (field) {
                        contact[field] = phone.$t;
                    } else if (!contact.otherPhone) {
                        // if we don't know how to classify the phone number then at least save it as 'other'
                        contact.otherPhone = phone.$t;
                    }
                });
            }

            if (entry["link"]) {
                var avatars = entry["link"].filter(function (link) {
                    // filter only avatars
                    //https://developers.google.com/google-apps/contacts/v3/#contact_photo_management
                    //Note: If a contact does not have a photo, then the photo link element has no gd:etag attribute.
                    return link.rel === "http://schemas.google.com/contacts/2008/rel#photo"
                        && link.type === "image/*"
                        && link.gd$etag;
                }).map(function (link) {
                    return link.href;
                });
                if (avatars.length > 0) {
                    contact.avatarUrl = avatars[0]
                        + (avatars[0].indexOf("?") === -1 ? "?" : "&")
                        + "access_token=" + encodeURIComponent(googleService.getAccessToken());
                }
            }

            if (entry["gd$organization"]) {
                var companies = entry["gd$organization"].filter(function (org) {
                    return org.rel === "http://schemas.google.com/g/2005#other"
                        && org["gd$orgName"];
                }).map(function (o) {
                    return o["gd$orgName"]["$t"];
                });

                if (companies.length > 0) {
                    contact.company = companies[0];
                }

                var titles = entry["gd$organization"].filter(function (org) {
                    return org.rel === "http://schemas.google.com/g/2005#other"
                        && org["gd$orgTitle"];
                }).map(function (o) {
                    return o["gd$orgTitle"]["$t"];
                });

                if (titles.length > 0) {
                    contact.jobTitle = titles[0];
                }
            }

            return contact;
        };

        // export
        window.Contact = Contact;
    }]);
angular.module("openCtiApp")
    .run(["$rootScope", "contactMappingService", "formatPhoneFilter", function($rootScope, contactMappingService, formatPhoneFilter ) { 'use strict';
        function CallLogEntry() {
            this.id = null;
            this.action = null;
            this.direction = null;
            this.duration = null;
            this.from = {};
            this.result = null;
            this.sessionId = null;
            this.startTime = null;
            this.to = {};
            this.type = null;
            this.uri = null;
        }

        CallLogEntry.fromApi = function (rawRecord) {
            var entry = new CallLogEntry();

            angular.extend(entry, rawRecord);
            entry._startTime = rawRecord.startTime;
            entry.startTime = new Date(rawRecord.startTime);

            return entry;
        };

        CallLogEntry.prototype.isInbound = function () {
            return this.direction === "Inbound";
        };

        CallLogEntry.prototype.isOutbound = function () {
            return this.direction === "Outbound";
        };

        function displayContact(record, reverse) {
            return record.isInbound()
                ? !reverse ? record.from : record.to
                : !reverse ? record.to : record.from;
        }

        CallLogEntry.prototype.getNameOrNumber = function ()
        {
            var contact = displayContact(this);
            var number = contact.phoneNumber || contact.extensionNumber;
            return contactMappingService.getNameByNumber( number ) || formatPhoneFilter(number);
        };

        CallLogEntry.prototype.getName = function() {
            var contact = displayContact(this);
            var number = contact.phoneNumber || contact.extensionNumber;
            return contactMappingService.getNameByNumber( number );
        };

        CallLogEntry.prototype.getNameOrUnknown = function () {
            return this.getName() || $rootScope.STRINGS && $rootScope.STRINGS.GENERAL.unknownCallerId || 'Unknown Caller ID';
        };

        CallLogEntry.prototype.getDisplayNumber = function () {
            var contact = displayContact(this);
            return contact.phoneNumber || contact.extensionNumber || "";
        };

        CallLogEntry.prototype.getDisplayPhone = function () {
            var contact = displayContact(this);
            return contact.phoneNumber || "";
        };

        CallLogEntry.prototype.getDisplayExtension = function () {
            var contact = displayContact(this);
            return contact.extensionNumber || "";
        };

        CallLogEntry.prototype.getDisplayFromPhone = function () {
            var contact = displayContact(this, true);
            return contact.phoneNumber || "";
        };

        CallLogEntry.prototype.getDisplayLocation = function (defaultLocation) {
            var contact = displayContact(this);
            return contact.location|| (defaultLocation === undefined ? $rootScope.STRINGS && $rootScope.STRINGS.GENERAL.unknownLocation || 'unknown' : defaultLocation);
        };

        CallLogEntry.prototype.isMissed = function () {
            return ["Missed", "Hang Up", "Busy", "Voicemail"].indexOf(this.result) !== -1;
        };

        // export
        window.CallLogEntry = CallLogEntry;
    }]);
angular.module("openCtiApp")
    .run(function() { 'use strict';
        /**
         * @returns {MessageUpdateEvent}
         */
        function MessageUpdateEvent() {
            this.type = null;
            this.newCount = null;
            this.updatedCount = null;
        }

        MessageUpdateEvent.prototype.isText = function () {
            return this.type === "SMS"
                || this.type === "Pager";
        };

        MessageUpdateEvent.prototype.isFax = function () {
            return this.type === "Fax";
        };

        MessageUpdateEvent.prototype.isVoicemail = function () {
            return this.type === "Voicemail";
        };

        /**
         * @param {object} rawMessageUpdateEvent raw plain JS object gotten from API call result
         * @returns {MessageUpdateEvent}
         */
        MessageUpdateEvent.fromApi = function (rawMessageUpdateEvent) {
            var event = new MessageUpdateEvent();
            
            angular.extend(event, rawMessageUpdateEvent);

            return event;
        };

        // export
        window.MessageUpdateEvent = MessageUpdateEvent;
    });
angular.module("openCtiApp")
    .run(["utils", function(utils) { 'use strict';
        function Recipient(number, type, name) { 'use strict';
            this.number = utils.toDigitsOnly(number);
            if (this.number === "") {
                throw new Error("Recipient's number is invalid or empty: " + number);
            }

            this.type = type;
            if (type === undefined) {
                this.type = utils.isExtensionNumber(this.number) ? "extensionNumber" : "phoneNumber";
            }

            if (name !== undefined) {
                this.name = name;
            }

            this.id = this.type + "_" + this.number;
        }

        Recipient.prototype.equals = function (other) {
            return this.type == other.type && this.number == other.number;
        };

        window.Recipient = Recipient;
    }]);
'use strict';
angular.module( 'openCtiApp' )
        .constant("APPVERSION", '1.0.7.0')
        .constant("MAX_SF_LINES", 3)
        .constant("ERROR_SHOW_TIME_SECONDS", 8)
        .constant("EULA_LINK", 'eula.html')
        .constant("EULA_LINK_ATTOAH", 'eula_att.html')

        // number of minutes +/- to compensate local and server time difference
        .constant("LOCAL_SERVER_COMPENSATION_MINUTES", 5)

        .constant("MESSAGES_MAX_AGE_HOURS", 24 * 7 * 1 /* one week */)

        .constant("MESSAGES_PER_PAGE", 100)
        .constant("CONTACTS_PER_PAGE", 100)
        .constant("EXTENSIONS_PER_PAGE", 250)

        .constant("SECONDS_BETWEEN_CONVERSATION_TIME_SHOW", 600) //15 minutes


        // The number of days for the call-log retrieval
        .constant("CALL_LOG_DAYS_COUNT", 7)

        .constant('HANGOUTS_APP_ID', '252055445629')

        .constant('MESSAGE_NOTIFICATION_ICON', 'images/logo/icon80.png')
        .constant('MESSAGE_NOTIFICATION_HIDE_TIME', 5000)

        .constant('DEFAULT_APP_BRAND', '')
        ;

'use strict';
angular.module( 'openCtiApp' )
	.constant( 'API_BASE_URL', 'https://api.ringcentral.com' )
    .constant( 'APP_AUTH', 'QjA3QjEwNmUzNTRiNzZGOGM5OTQ1QzhENjJCODgyMDI1MDYwYjA3RkEyODkzNDk2MmEyODliODBCNDU0MTE4ODo4MkUwMjk4MDRjMWYxYmRBMjAwODQzZjhhZDlhMzhiNmNBQTdkZjE5ODFmZWVkYjdjZjk3YTI5ODgxNENEMmZi' )

    // This key is not ready yet
    //.constant( 'APP_AUTH', 'ZWFjODc5N2FmMWIzNTAyRjJDRUFBRUVDQUMzRWQzNzhBQTc4NThBMzg2NjU2ZjI4QTAwOGIwYzYzOEE3NTRCMTpjMDgyNzAyRTRlYTREQTE4YzRiMTM3NzkxNzc3OGE4YWFmYWJDQTNCZTU3OUI3OEI2NmQxN0MzNjg3NGIyN0Y0')
    //.constant('APP_AUTH', function () {
    //    return window.btoa(
    //        'eac8797af1b3502F2CEAAEECAC3Ed378AA7858A386656f28A008b0c638A754B1' +
    //        ':' +
    //        'c082702E4ea4DA18c4b1377917778a8aafabCA3Be579B78B66d17C36874b27F4'
    //    );
    //})
;


'use strict';
angular.module( 'openCtiApp' ).constant( 'CONFERENCING_INT_NUMBERS',
	[
		{country: "Argentina", phone: "+54 3814085011"},
		{country: "Australia", phone: "+61 386720111"},
		{country: "Austria", phone: "+43 12650505"},
		{country: "Bahrain", phone: "+973 16568305"},
		{country: "Brazil", phone: "+55 2123911541"},
		{country: "Bulgaria", phone: "+359 24372638"},
		{country: "Canada",  phone: "+1 (647) 499-8281"},
		{country: "Chile", phone: "+56 448909302"},
		{country: "China", phone: "+86 51082230700"},
		{country: "Croatia", phone: "+385 18000051"},
		{country: "Cyprus", phone: "+357 77788895"},
		{country: "Czech Republic", phone: "+420 225989144"},
		{country: "Denmark", phone: "+45 78772181"},
		{country: "Dominican Republic", phone: "+1 (829) 999-2597"},
		{country: "Estonia", phone: "+372 6148050"},
		{country: "Finland", phone: "+358 974790040"},
		{country: "France", phone: "+33 180140058"},
		{country: "Georgia", phone: "+995 706777118"},
		{country: "Germany", phone: "+49 97219329240"},
		{country: "Hungary", phone: "+36 19876781"},
		{country: "Indonesia", phone: "+62 2151388895"},
		{country: "Ireland", phone: "+353 14370818"},
		{country: "Israel", phone: "+972 765990005"},
		{country: "Italy", phone: "+39 0810060877"},
		{country: "Japan", phone: "+81 350505054"},
		{country: "Kenya", phone: "+254 205231012"},
		{country: "Latvia", phone: "+371 67881495"},
		{country: "Lithuania", phone: "+370 37248950"},
		{country: "Luxembourg", phone: "+352 20301223"},
		{country: "Malaysia", phone: "+60 1111460005"},
		{country: "Mexico", phone: "+52 8992744291"},
		{country: "Netherlands", phone: "+31 203223007"},
		{country: "Nigeria", phone: "+234 14405225"},
		{country: "Norway", phone: "+47 21930644"},
		{country: "Pakistan", phone: "+92 2137130625"},
		{country: "Panama", phone: "+507 8387832"},
		{country: "Poland", phone: "+48 221168011"},
		{country: "Portugal", phone: "+351 210051197"},
		{country: "Romania", phone: "+40 317807035"},
		{country: "Slovakia", phone: "+421 233663303"},
		{country: "Slovenia", phone: "+386 18280232"},
		{country: "South Africa", phone: "+27 878250111"},
		{country: "South Korea", phone: "+82 7079176505"},
		{country: "Spain", phone: "+34 911196705"},
		{country: "Sweden", phone: "+46 812410707"},
		{country: "Switzerland", phone: "+41 445959077"},
		{country: "Taiwan", phone: "+886 985646950"},
		{country: "Turkey", phone: "+90 2129881705"},
		{country: "Ukraine", phone: "+380 893239961"},
		{country: "United Kingdom", phone: "+44 (7874) 476114"},
		{country: "Vietnam", phone: "+84 471080097"}
	])

        ;

'use strict';
angular.module('openCtiApp')
    .config(["APP_AUTH", "API_BASE_URL", "rcCoreProvider", function (APP_AUTH, API_BASE_URL, rcCoreProvider) {
        var platform = rcCoreProvider.get().getPlatform();

        platform.apiKey = APP_AUTH;
        platform.server = API_BASE_URL;

        // TODO for debug purposes show all log messages from SDK
        rcCoreProvider.get().getLog().enableAll();
    }])
    //make chrome-extension links to be 'safe'
    .config( ['$compileProvider', function( $compileProvider ) {
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|mailto|chrome-extension):)|#/);
    }]);





angular.module( 'openCtiApp' )
	.config( ["$routeProvider", "loginServiceProvider", function( $routeProvider, loginServiceProvider )
	{
		'use strict';

        $routeProvider
	    .when('/', {redirectTo: '/dialer'})
            .when('/login', {templateUrl: 'views/login.html', controller: 'LoginCtrl'})
            .when('/no-sf-support', {templateUrl: 'views/no-sf-support.html'})
            .when('/rc-limit', {templateUrl: 'views/rc-limit.html'})
            .when('/settings/:msg?', {
                templateUrl: 'views/settings.html',
                controller: 'SettingsCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/dialer/:phone?', {
                templateUrl: 'views/dialer.html',
                controller: 'DialerCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/messages/:tab?', {
                templateUrl: 'views/messages.html',
                controller: 'MessagesCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/message/:id', {
                templateUrl: 'views/message.html',
                controller: 'MessageCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/call-log/:tab?', {
                templateUrl: 'views/call-log.html',
                controller: 'CallLogCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/call-log-entry/:id', {
                templateUrl: 'views/call-log-entry.html',
                controller: 'CallLogEntryCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/contacts/:query?', {
                templateUrl: 'views/contacts.html',
                controller: 'ContactsCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/contact/:searchField?/:id', {
                templateUrl: 'views/contact.html',
                controller: 'ContactCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/contactpicker', {
                templateUrl: 'views/contactpicker.html',
                controller: 'ContactPickerCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/new-sms/:phone?/:type?', {
                templateUrl: 'views/new-sms.html',
                controller: 'NewSmsCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/conversation/:id', {
                templateUrl: 'views/conversation.html',
                controller: 'ConversationCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/new-conference', {
                templateUrl: 'views/new-conference.html',
                controller: 'NewConferenceCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/new-rc-conference', {
                templateUrl: 'views/new-rc-conference.html',
                controller: 'NewRCConferenceCtrl',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .when('/conference-commands', {
                templateUrl: 'views/conference-commands.html',
                resolve: {auth: loginServiceProvider.isAuthenticated}
            })
            .otherwise({redirectTo: '/'});
    }]);

'use strict';
angular.module('openCtiApp')
// set default local
    .config(["tmhDynamicLocaleProvider", function(tmhDynamicLocaleProvider) {
        tmhDynamicLocaleProvider.localeLocationPattern('i18n/{{locale}}.js');
    }])
    .run(["tmhDynamicLocale", "$rootScope", "$locale", function(tmhDynamicLocale, $rootScope, $locale) {
        //default locale will be loaded synchroniously via <script>
        $rootScope.STRINGS = $locale.STRINGS || {};
        //if changed from outside
        $rootScope.$on('$localeChangeSuccess', function() {
            $rootScope.STRINGS = $locale.STRINGS;
        });
    }])

// adds support of Angular-specific $rootScope phases to SDK AJAX class
    .run(["$rootScope", "rcCore", function ($rootScope, rcCore) {
        $rootScope.safe$apply = function (fn) {
            var phase = $rootScope.$$phase;
            if (phase === '$apply' || phase === '$digest') {
                if (fn && ( typeof (fn) === 'function')) {
                    fn();
                }
            }
            else {
                this.$apply(fn);
            }
        };

        var ajaxObserver = rcCore.get().getAjaxObserver();

        ajaxObserver.on([ajaxObserver.events.requestSuccess, ajaxObserver.events.requestError], function () {
            if ($rootScope.$$phase) {
                $rootScope.$eval();
            }
            else {
                $rootScope.$apply();
            }
        });
    }])

// maxWindowLimitExceeded
    .run(["$location", "$rootScope", "rcSupport", function ($location, $rootScope, rcSupport) {
        var error = rcSupport.maxWindowLimitExceeded();
        if (error) {
            $rootScope.error = error;
            $location.path("/rc-limit");
        }
    }])


// APPVERSION
    .run(["$rootScope", "APPVERSION", function ($rootScope, APPVERSION) {
        $rootScope.appversion = APPVERSION;
    }])

// viewAnimation
    .run(["$rootScope", function ($rootScope) {
        $rootScope.setViewAnimation = function (animation) {
            $rootScope.viewAnimation = animation;
        };
        $rootScope.clearViewAnimation = function () {
            $rootScope.viewAnimation = '';
        };
    }])

// sets currentUrl and backUrl
    .run(["$rootScope", "$routeParams", "$location", function ($rootScope, $routeParams, $location) {
        $rootScope.$on('$routeChangeSuccess', function () {
            $rootScope.currentUrl = encodeURIComponent("#" + $location.url());
            $rootScope.backUrl = $routeParams.backUrl || "";
        });
    }])

// does ringout stuff
	.run( ["$rootScope", "$location", "chromeExtensionInteraction", "ringout", "sidebarService", function( $rootScope, $location, chromeExtensionInteraction, ringout, sidebarService ) {
		$rootScope.$on('extension:callPhone', function (e, data) {
			if (data && data.phone) {
				$rootScope.safe$apply(function () {
					if ($rootScope.isAuthorized) {
						if (!ringout.inProgress()) {
							ringout.start(data.phone);
						}
						sidebarService.expand();
						//change location anyway
						$location.path('/dialer');
					} else {
						chromeExtensionInteraction.alert('[RC Chrome extension] Please authorize before making calls');
					}
				});
			}
		});
	}])

// sidebar expanded or collapsed property set
    .run(["$rootScope", "sidebarService", function($rootScope, sidebarService) {
        sidebarService.onSidebarTrigger(function(state) {
            $rootScope.sidebarExpanded = state;
        });
    }])

// brand property set
	.run( ["$rootScope", "appstorage", "DEFAULT_APP_BRAND", function( $rootScope, appstorage, DEFAULT_APP_BRAND ) {
		$rootScope.brand = appstorage.getData('brand') || DEFAULT_APP_BRAND;
	}])

// onload initialization
	.run( ["$q", "$rootScope", "$location", "$route", "loginService", "googleService", "rcSupport", "settingsService", "messagesService", "rcCallLog", "appstorage", "rcPlatform", "utils", "subscriptionHelper", "tmhDynamicLocale", function( $q, $rootScope, $location, $route,
                    loginService,
                    googleService,
                    rcSupport,
                    settingsService,
                    messagesService,
                    rcCallLog,
                    appstorage,
                    rcPlatform,
                    utils,
                    subscriptionHelper,
                    tmhDynamicLocale) {

		$rootScope.isAuthorized = false;
		$rootScope.showMainSpinner = loginService.getPublicPages().indexOf($location.path()) < 0;
		$rootScope.isGoogleAuthorized = false;

		$rootScope.authorizeGoogle = function (h) {
			googleService.authorize().then(function () {
				$rootScope.isGoogleAuthorized = true;
				if (typeof h == 'function')h();
			});
		};

		function getMessages() {
			return messagesService.getMessages();
		}

		function getCalls() {
			return rcCallLog.get();
		}


		loginService.onLogin(function () {
			if ($rootScope.isAuthorized === true)return;

			$rootScope.showMainSpinner = true;
			settingsService.loadSettings();

			var userdata = settingsService.getCurrentUser(), settings = settingsService.get();

			getMessages();
			getCalls();
            subscriptionHelper.subscribe();

			settings.loginUser = userdata.username || '';
			settings.loginUserExt = userdata.extension || '';

			var qArray = [
                googleService.isAuthorized().then(function (isAuthorized) {
                    $rootScope.isGoogleAuthorized = isAuthorized;
                }),

                rcSupport.getAccountInfo().then(function (info) {
                    //$rootScope.logo = info.logo;
                    $rootScope.brand = info.brand;
                    appstorage.setData('brand', info.brand);
                    settings.countryCode = info.countryCode;

                    //!!!TEMPORARY!!!
                    //Load locale depending on brand
                    //TODO: load locale depending on Chrome or other cases
                    switch(('' + info.countryCode).toLowerCase()) {
                        case 'gb':
                            return tmhDynamicLocale.set('en-gb').catch(function(e) {
                                console.error('Unable to load locale: en-gb');
                                return $q.reject(e);
                            });
                        case 'ca':
                        case 'us':
                        default:
                            return tmhDynamicLocale.set('en-us').catch(function(e) {
                                console.error('Unable to load locale: en-us');
                                return $q.reject(e);
                            });
                    }
                }),

                rcSupport.getDirectNumber().then(function (directNumbers) {
                    settings.directNumber = settings.directNumber || directNumbers[0] || '';
                    settings.directNumbers = directNumbers;
                }),

                rcSupport.getExtensionNumber().then(function (extension) {
                    settings.extensionNumber = extension || userdata.extension || '';
                }),

                rcPlatform.extension.features().then(function (features) {
                    settings.features = {};

                    if (features.Conferencing && features.Conferencing.enabled === true)
                        settings.features.conferencing = true;

                    if (features.SMS && features.SMS.enabled === true)
                        settings.features.sms = true;

                    if (features.Pager && features.Pager.enabled === true)
                        settings.features.pager = true;
                }),

                rcPlatform.extension.conferencing().then(function(info) {
                    settings.conferencingInfo = {
						"phoneNumber": utils.normalizeNumber(info.phoneNumber), "hostPin": info.hostCode, "participantPin": info.participantCode
					};
                })
			];

			$q.all(qArray).finally(function () {
				$rootScope.isAuthorized = true;
				$rootScope.showMainSpinner = false;
				settingsService.set(settings);

				$rootScope.setViewAnimation('slide-left');

				if (!settingsService.getOne('directNumber')) {
					$location.path('/settings/new');
				} else {
                    appstorage.setData('settingsCollapsed', false);
					if ($location.path() == '/login')$location.path('/dialer');
				}
			});

		});

        loginService.onLogout(function () {
            $location.path('/login');
            $rootScope.showMainSpinner = false;
            $rootScope.isAuthorized = false;
            googleService.reset();
            subscriptionHelper.unsubscribe();
        });

		// prevent user from going to login page if isAuthorized
		$rootScope.$on('$routeChangeSuccess', function () {
			if ($location.path() == '/login' && $rootScope.isAuthorized == true)$location.path('/dialer');
		});

		$rootScope.$on('$routeChangeError', function (e) {
			loginService.logout();
		});

	}])

//visibility change event
    .run(["$rootScope", "$interval", "rcCore", "messagesService", "rcCallLog", "rcPlatform", "subscriptionHelper", "logging", function($rootScope, $interval, rcCore, messagesService, rcCallLog, rcPlatform, subscriptionHelper, logging) {

        function handler() {
            rcPlatform.isAuthorized().then(function() {
                messagesService.getMessages();
                rcCallLog.get();
                subscriptionHelper.renew();
            });
        }

        var log = logging('visibility-handler');

        var visibility = rcCore.get().getPageVisibility();
        visibility.on(visibility.events.change, function(visible) {
            if ($rootScope.isAuthorized && visible === true) {
                log('Window is visible, refreshing data...');
                handler();
            }
        });

        //This code is experimental and does not work properly
        //var lastTime = (new Date()).getTime(),
        //    INTERVAL_TIME = 5000, SLEEP_TIME = 30000;
        //$interval(function() {
        //    var currentTime = (new Date()).getTime();
        //    if (currentTime > (lastTime + SLEEP_TIME) && $rootScope.isAuthorized) {  // ignore small delays
        //        log('Window has probably woken up after sleep, refreshing data...');
        //        handler();
        //    }
        //    lastTime = currentTime;
        //}, INTERVAL_TIME);
    }]);

angular.module( 'rcFocus', [] );


angular.module('rcFocus')
  .factory('focus', ["$rootScope", "$timeout", function ($rootScope, $timeout) {
    return function(name) {
      $timeout(function (){
        $rootScope.$broadcast('rcfocus:focus', name);
      });
    }
  }]);

angular.module( 'rcFocus' )
  .directive('focusOn', function() {
    return function(scope, elem, attr) {
      scope.$on('rcfocus:focus', function(e, name) {
        if(name === attr.focusOn) {
          elem[0].focus();
        }
      });
    };
  })



angular.module( 'rcCallMonitor', [ 'rcSupport', 'rcLogging', 'rcCore' ] )


'use strict';
angular.module( 'rcCallMonitor' )
    .constant( 'CALL_MAX_AGE_HOURS', 1 )
    .constant('RINGOUT_POLLING_INTERVAL', 2500);
        

angular.module( 'rcCallMonitor' ).provider( 'callMonitor', ["rcSupportProvider", "loggingProvider", "rcCoreProvider", "CALL_MAX_AGE_HOURS", "RINGOUT_POLLING_INTERVAL", function( rcSupportProvider, loggingProvider, rcCoreProvider, CALL_MAX_AGE_HOURS, RINGOUT_POLLING_INTERVAL )
{
	'use strict';

    var callMonitoringInstance = null;
    var instanceCreatedDeferred = null;
    
    var local$q = null;
    
    var log = loggingProvider.get("call-monitor-service");
    
    function refreshCallsOnVisible(visible) {
//        if (visible) {
//            log("Window is visible. Refreshing call-log...");
//            callMonitoringInstance.getCalls();
//        }
    }

    var __inProgress = false;
    function setCallProgress(presence) {
        __inProgress = presence && presence.telephonyStatus && presence.telephonyStatus !== 'NoCall';
    }

    function createCallMonitoring(rcsdk) {
        var Observable = rcsdk.getObservable().__proto__.constructor,
            Utils = rcsdk.getUtils();

        var log = loggingProvider.get("CallMonitoring");
        var Log = {
            info: log,
            warn: log.warn,
            error: log.error
        };

        function CallMonitoring() {

            var self = this;

            Observable.call(this);

            this.callHelper = rcsdk.getCallHelper();
            this.presenceHelper = rcsdk.getPresenceHelper();
            this.ringoutHelper = rcsdk.getRingoutHelper();
            this.platform = rcsdk.getPlatform();
            this.promise = rcsdk.getContext().getPromise();

            // Public configuration
            this.maxStartTimeDiscrepancy = 20 * 1000;
            this.perPage = 100;
            this.dateRange = 1000 * 60 * 60 * 4; // 4 hours
            this.visibilityOverride = false; // if true - continue to calls on presence notifications even if page is not visible
            this.mergeCalls = false;
            this.mergePresenceCalls = false;

            // Public properties
            this.ringout = {
                from: {
                    phoneNumber: ''
                },
                to: {
                    phoneNumber: ''
                },
                playPrompt: false
            };
            this.presence = {};
            this.calls = [];
            this.activeCalls = [];

            // Private utilities
            this.visibility = rcsdk.getPageVisibility();
            this.visibility.on(this.visibility.events.change, function(visible) {
                self._visible = visible;
                self.emit(self.events.visibilityChange, visible);
            });

            // Private properties
            this._ringoutInterval = null;
            this._visible = true;
            this._activeCalls = [];

        }

        CallMonitoring.prototype = Object.create(Observable.prototype);

        CallMonitoring.prototype.events = {
            callsUpdated: 'callsUpdated',
            callsUpdateError: 'callsUpdateError',
            ringoutUpdated: 'ringoutUpdated',
            ringoutUpdateError: 'ringoutUpdateError',
            presenceUpdated: 'presenceUpdated',
            presenceUpdateError: 'presenceUpdateError',
            notification: 'notification',
            visibilityChange: 'visibilityChange'
        };

        CallMonitoring.prototype.apiCall = function (options) {
            return this.platform.apiCall(options).then(function (xhr) {
                return xhr.data;
            });
        };

        CallMonitoring.prototype.load = function() {
        };

        CallMonitoring.prototype.getPresence = function() {

            var self = this;

            this.apiCall(this.presenceHelper.loadRequest(null, {
                url: this.presenceHelper.createUrl({detailed: true})
            }))
                .then(function(presence) {
                    Utils.extend(self.presence, presence);
                    self.emit(self.events.presenceUpdated, self.presence);
                })
                .catch(function(e) {
                    self.presence = {};
                    self.emit(self.events.presenceUpdateError, e);
                });

        };

        CallMonitoring.prototype.getCalls = function() {

            var self = this;

            if (!this._visible && !this.visibilityOverride) {
                Log.warn('CallMonitoring.prototype.getCalls(): Skipped, page is not visible');
                return this;
            }

            this.promise.all([
                this.apiCall({
                    url: self.callHelper.createUrl(),
                    get: {
                        perPage: this.perPage,
                        dateFrom: new Date(Date.now() - this.dateRange).toISOString()
                    }
                })/*,
                 this.apiCall({
                 url: self.callHelper.createUrl({active: true}),
                 get: {
                 perPage: this.perPage,
                 dateFrom: new Date(Date.now() - this.dateRange).toISOString()
                 }
                 })*/
            ]).then(function(res) {

                var callsAjax = res[0],
                    activeCallsAjax = res[1];

                var calls = self.callHelper.processCalls(callsAjax.records, {
                    strict: true,
                    merge: self.mergeCalls,
                    maxStartTimeDiscrepancy: self.maxStartTimeDiscrepancy
                });

                if (self.mergePresenceCalls) {

                    var presenceCalls = self.callHelper.processCalls(self.callHelper.parsePresenceCalls(self.presence.activeCalls || []), {
                        strict: false,
                        merge: self.mergeCalls,
                        maxStartTimeDiscrepancy: self.maxStartTimeDiscrepancy
                    });

                    calls = self.callHelper.merge(presenceCalls, calls, self.callHelper.getSessionId);

                }

                // Prepend Presence calls to CallLog calls
                calls = calls.sort(function(call1, call2) {

                    var time1 = new Date(call1.startTime).getTime(),
                        time2 = new Date(call2.startTime).getTime();

                    if (time1 != time2) return time2 - time1;

                    if (!call1.subsequent && call2.subsequent) return -1;
                    if (call1.subsequent && !call2.subsequent) return 1;
                    return 0;

                });

                self.activeCalls = calls.filter(self.callHelper.isInProgress);

                self.calls.splice(0, self.calls.length);

                calls.forEach(function(call) {
                    self.calls.push(call);
                });

                self.emit(self.events.callsUpdated, self.calls);

            }).catch(function(e) {

                Log.error(self.events.callsUpdateError, e);
                self.emit(self.events.callsUpdateError, e);

            });

            return this;

        };

        CallMonitoring.prototype.startRingout = function(from, to, prompt) {

            var self = this;

            if (this.ringout && this.ringout.status && ((this.ringout.status.callStatus === 'InProgress') || (__inProgress && this.ringout.status.callStatus === ''))) {
                throw new Error('Ringout is already in progress');
            }

            return this.apiCall(this.ringoutHelper.saveRequest({
                from: {
                    phoneNumber: from
                },
                to: {
                    phoneNumber: to
                },
                playPrompt: !!prompt
            }))
                .then(function(ringout) {
                    Utils.extend(self.ringout, ringout);
                    self._ringoutInterval = setInterval(self.updateRingout.bind(self), RINGOUT_POLLING_INTERVAL);
                    self.emit(self.events.ringoutUpdated, self.ringout);
                })
                .catch(function(e) {
                    self.emit(self.events.ringoutUpdateError, e);
                });

        };

        CallMonitoring.prototype.updateRingout = function() {

            if (!this.ringout.id) throw new Error('Ringout has not been started yet');

            var self = this;

            this.apiCall(this.ringoutHelper.loadRequest(this.ringout, {
                url: this.ringoutHelper.createUrl({}, this.ringoutHelper.getId(this.ringout)) // TODO Remove when http://jira.ringcentral.com/browse/RLZ-6174 is fixed
            }))
                .then(function(ringout) {

                    Utils.extend(self.ringout, ringout);

                    if (ringout.status.callStatus != 'InProgress') { // Invalid, Success, InProgress, CannotReach, Error, NoAnsweringMachine, NoSessionFound
                        self.stopPolling();
                    }

                    self.emit(self.events.ringoutUpdated, self.ringout);

                })
                .catch(function(e) {
                    self.emit(self.events.ringoutUpdateError, e);
                });

        };

        CallMonitoring.prototype.stopPolling = function () {
            if (this.ringout.status && this.ringout.status.callStatus == 'Success') {
                this.ringout.status = {
                    callStatus: '',
                    callerStatus: '',
                    calleeStatus: ''
                };

            }
            clearInterval(this._ringoutInterval);
        };

        CallMonitoring.prototype.stopRingout = function() {

            var self = this;

            this.stopPolling();

            this.ringout && this.ringout.id && this.apiCall(this.ringoutHelper.deleteRequest(this.ringout, {
                url: this.ringoutHelper.createUrl({}, this.ringoutHelper.getId(this.ringout)) // TODO Remove when http://jira.ringcentral.com/browse/RLZ-6174 is fixed
            }))
                .then(function(ringout) {
                    Utils.extend(self.ringout, ringout);
                    self.emit(self.events.ringoutUpdated, self.ringout);
                })
                .catch(function(e) {
                    self.emit(self.events.ringoutUpdateError, e);
                });

            this.ringoutHelper.resetAsNew(this.ringout.id);

        };

        CallMonitoring.prototype.destroy = function() {
            this.visibility && this.visibility.destroy();
            //send DELETE request if we have an active ringout
            if ((this.ringout.status.callStatus === 'InProgress') || (__inProgress && this.ringout.status.callStatus === '')) {
                this.stopRingout();
            }
            return Observable.prototype.destroy.call(this);
        };

        return new CallMonitoring(rcsdk.getContext());
    }

    var onDestroyedObservable = rcCoreProvider.get().getObservable();

    var callMonitoringService = {
        create: function () {
            if (rcSupportProvider.maxWindowLimitExceeded()) {
                return;
            }
            
            if (callMonitoringInstance === null) {
                rcCoreProvider.get().getPlatform().isAuthorized().then(function () {
                    callMonitoringInstance = createCallMonitoring(rcCoreProvider.get());

                    // merge two-leg calls into one
                    callMonitoringInstance.mergeCalls = true;

                    // we are using our own algorithm for another leg detection for active calls (for the Presence events)
                    callMonitoringInstance.mergePresenceCalls = false;

                    // continue to calls on presence notifications even if page is not visible
                    callMonitoringInstance.visibilityOverride = true;

                    // get call-log for last two hours
                    var ageHours = CALL_MAX_AGE_HOURS + 1; // getting a little bit more just in case
                    callMonitoringInstance.dateRange = Math.floor(1000 * (ageHours * 3600));

                    callMonitoringInstance.on(callMonitoringInstance.events.visibilityChange, refreshCallsOnVisible);
                    callMonitoringInstance.on(callMonitoringInstance.events.presenceUpdated, setCallProgress);

                    log("CallMonitoring has been created");

                    if (instanceCreatedDeferred !== null) {
                        instanceCreatedDeferred.resolve();

                        // re-create defer to not notify more than once
                        instanceCreatedDeferred = local$q.defer();
                    }
                }).catch(function (e) {
                    log("Can't create CallMonitoring. You are not logged in", e);
                });
            } else {
                log("CallMonitoring already exist");
            }
        },
        destroy: function () {
            if (rcSupportProvider.maxWindowLimitExceeded()) {
                return;
            }
            
            if (callMonitoringInstance === null) {
                log("You are trying to destroy already destroyed CallMonitoring. Do nothing.");
            } else {
                callMonitoringInstance.off(callMonitoringInstance.events.visibilityChange, refreshCallsOnVisible);
                callMonitoringInstance.off(callMonitoringInstance.events.presenceUpdated, setCallProgress);

                try {
                    callMonitoringInstance.destroy();
                } catch (e) {
                    log("Error while destroying callMonitoring", e);
                }

                callMonitoringInstance = null;
                log("CallMonitoring has been destroyed");

                onDestroyedObservable.emit("destroyed");
            }
        },

        onDestroyed: function (callback) {
            onDestroyedObservable.on("destroyed", callback);
        },
        
        /**
         * Executes the code when CallMonitoring object will be ready.
         * 
         * code function has one parameter: instance of RCSDK.cmr.CallMonitoring object.
         * 
         * @param {function} code
         */
        execute: function (code) {
            if (rcSupportProvider.maxWindowLimitExceeded()) {
                return;
            }
            
            if (callMonitoringInstance !== null) {
                code(callMonitoringInstance);
            } else {
                if (instanceCreatedDeferred === null) {
                    // called as callMonitorProvider. No $q and nothing can we do here.
                    throw new Error("callMonitor: DO NOT call execute() from callMonitorProvider");
                } else {
                    instanceCreatedDeferred.promise.then(function () {
                        code(callMonitoringInstance);
                    });
                }
            }
        },

        isCallInProgress: function () {
            return __inProgress;
        }
    };

    this.create = function () {
        callMonitoringService.create();
    };
    this.destroy = function () {
        callMonitoringService.destroy();
    };

    this.$get = ["$q", "$timeout", "rcCore", "rcPlatform", "loginService", "logging", "subscriptionHelper", function ($q, $timeout, rcCore, rcPlatform, loginService, logging, subscriptionHelper) {
        var log = logging('call-monitor');

        local$q = $q;
        
        instanceCreatedDeferred = $q.defer();

        callMonitoringService.execute(function(cm) {
            cm.notification = null;

            //monkey patching emitter for $digest cycle to run
            var __emit = cm.emit;
            cm.emit = function() {
                var self = this;
                var args = arguments;
                $timeout(function() {
                    __emit.apply(self, args);
                });
            };

            loginService.onLogin(function() {
                subscriptionHelper.onTelephonyUpdate(function(msg) {
                    log('CallMonitoring.events.presenceUpdated:', msg);
                    rcCore.get().getUtils().extend(cm.presence, msg.body);
                    cm.presence.activeCalls = msg.body.activeCalls || [];
                    cm.emit(cm.events.presenceUpdated, cm.presence);
                });
            });

            rcPlatform.extension.presence()
                .then(function(presence) {
                    rcCore.get().getUtils().extend(cm.presence, presence);
                    cm.emit(cm.events.presenceUpdated, cm.presence);
                })
                .catch(function(e) {
                    cm.presence = {};
                    cm.emit(cm.events.presenceUpdateError, e);
                });
        });

        return callMonitoringService;
    }];
}]);

'use strict';
angular.module('rcCallMonitor').config(["callMonitorProvider", "rcCoreProvider", function (callMonitorProvider, rcCoreProvider) {
    callMonitorProvider.create();

    var platform = rcCoreProvider.get().getPlatform();
    platform.on([platform.events.refreshSuccess, platform.events.authorizeSuccess], function () {
        callMonitorProvider.create();
    });

    platform.on([platform.events.logoutSuccess], function () {
        callMonitorProvider.destroy();
    });

    window.addEventListener('beforeunload', function () {
        callMonitorProvider.destroy();
    });
}]);





angular.module( 'activeCallMonitor', [ 'rcCallMonitor' ] )


angular.module( 'activeCallMonitor' ).factory( 'activeCallMonitor', ["$rootScope", "callMonitor", function( $rootScope, callMonitor )
{
	'use strict';

	var DEFAULT_RINGOUT_STATUS = 'NoCall';
	var DEFAULT_TELEPHONY_STATUS = 'NoCall';

	var ringoutStatus = DEFAULT_RINGOUT_STATUS;
	var telephonyStatus = DEFAULT_TELEPHONY_STATUS;

	var activeCalls = [];
	var inboundCalls = [];
	var outboundCalls = [];
	var otherLegs = [];

	function isOtherLeg( inbound, outbound ){ return ( outbound.direction == 'Outbound' && outbound.from == inbound.to && inbound.direction == 'Inbound' ); }

	function normalizeRingout( ringout )
	{
		if( !ringout )return DEFAULT_RINGOUT_STATUS;
		if( ringout.status.calleeStatus == 'Success' )return 'CalleeConnected';
		if( ringout.status.calleeStatus === '' )return 'CalleeConnected';
		if( ringout.status.callerStatus == 'Success' )return 'CallerConnected';
		if( ringout.status.callerStatus == 'InProgress' )return 'InProgress';
		return DEFAULT_RINGOUT_STATUS;
	}

	var eventScope = $rootScope.$new( true );
	function update()
	{ 
		//if( telephonyStatus == DEFAULT_TELEPHONY_STATUS )ringoutStatus = DEFAULT_RINGOUT_STATUS; 

		activeCalls.forEach( function( entry ){ entry.ringoutStatus = ringoutStatus; });

		// filter inbound and outbound
		outboundCalls = angular.copy( activeCalls ).filter( filterOutbound );
		inboundCalls = angular.copy( activeCalls ).filter( filterInbound );

		// filter other legs, save their ids and them from inboundCalls
		inboundCalls.filter( filterOtherLeg ).map( function( entry ){ return entry.id; } ).forEach( function( entry ){ otherLegs.push( entry ); } );
		inboundCalls = inboundCalls.filter( function( entry ){ return otherLegs.indexOf( entry.id ) < 0; } );

		// normalize callStatus
		inboundCalls.forEach( normalizeInbound );
		outboundCalls.forEach( normalizeOutbound );

		eventScope.$broadcast( 'activeCallMonitor.update' ); 
	}

	function filterInbound( entry ){ return entry.direction == 'Inbound'; }
	function filterOutbound( entry ){ return entry.direction == 'Outbound'; }
	function filterOtherLeg( inbound ){ return activeCalls.filter( function( entry ){ return isOtherLeg( inbound, entry ); } ).length > 0; }

	function findOtherLeg( outbound ){ return angular.copy( activeCalls.filter( function( entry ){ return isOtherLeg( entry, outbound ); } )[0] ); } 

	function normalizeInbound( entry )
	{
		if( entry.telephonyStatus == 'OnHold' )entry.callStatus = 'OnHold';
		if( entry.telephonyStatus == 'NoCall' )entry.callStatus = 'NoCall';
		if( entry.telephonyStatus == 'Ringing' )entry.callStatus = 'Ringing';
		if( entry.telephonyStatus == 'CallConnected' )entry.callStatus = 'CallConnected';
	}

	function normalizeOutbound( entry )
	{ 
		var otherLeg = findOtherLeg( entry ) || {};

		// Ringing
		if( entry.ringoutStatus == 'InProgress' )entry.callStatus = 'Ringing';
		if( entry.telephonyStatus == 'Ringing' )entry.callStatus = 'Ringing';

		// Waiting
		if( otherLeg.telephonyStatus == "CallConnected" )entry.callStatus = 'Waiting';

		// CallerConnected
		if( entry.ringoutStatus == 'CallerConnected' )entry.callStatus = 'CallerConnected';

		// CalleeConnected
		if( entry.ringoutStatus == 'CalleeConnected' )entry.callStatus = 'CalleeConnected';

		// OnHold
		if( otherLeg.telephonyStatus == "OnHold" )entry.callStatus = 'OnHold';
		if( entry.telephonyStatus == 'OnHold' )entry.callStatus = 'OnHold';

		// NoCall
		if( otherLeg.telephonyStatus == "NoCall" )entry.callStatus = 'NoCall';
		if( entry.telephonyStatus == 'NoCall' )entry.callStatus = 'NoCall';
	}

	function subscribeToCallMonitoringEvents()
	{
		callMonitor.execute( function( cm )
		{
			cm.on( cm.events.presenceUpdated, onPresenceUpdated );
			cm.on( cm.events.ringoutUpdated, onRingoutUpdated );

			cm.load();
		});
	};
	subscribeToCallMonitoringEvents();

	function onRingoutUpdated( ringout )
	{ 
		var normalized = normalizeRingout( ringout );
		if( normalized != ringoutStatus )
		{
			ringoutStatus = normalized;
			update();
		}
	}

	function onPresenceUpdated( presence )
	{
		activeCalls = angular.copy( presence.activeCalls || [] ); 

		if( telephonyStatus == DEFAULT_TELEPHONY_STATUS && presence.telephonyStatus != DEFAULT_TELEPHONY_STATUS )
			eventScope.$broadcast( 'activeCallMonitor.start' );

		if( telephonyStatus != DEFAULT_TELEPHONY_STATUS && presence.telephonyStatus == DEFAULT_TELEPHONY_STATUS )
			eventScope.$broadcast( 'activeCallMonitor.stop' );

		// if all calls are in NoCall state
		if( activeCalls.filter( function( entry ){ return entry.telephonyStatus == 'NoCall'; } ).length == activeCalls.length )
			eventScope.$broadcast( 'activeCallMonitor.stop' );

		telephonyStatus = presence.telephonyStatus;
		update();
	}

	var service = 
	{
		"onStop": function( listener )
		{
			if( typeof listener == 'function' )
				eventScope.$on( 'activeCallMonitor.stop', function(){ listener(); });
		},

		"onStart": function( listener )
		{
			if( typeof listener == 'function' )
				eventScope.$on( 'activeCallMonitor.start', function(){ listener(); });
		},

		"onUpdate": function( listener )
		{
			if( typeof listener == 'function' )
				eventScope.$on( 'activeCallMonitor.update', function(){ listener
				({ 
					"inboundCalls": angular.copy( inboundCalls ),
					"outboundCalls": angular.copy( outboundCalls )
				}); } );
		}
	};

        return service;
}]);


angular.module( 'activeCallMonitor' )
	.directive( 'duration', ["$rootScope", "$interval", "utils", function( $rootScope, $interval, utils )
	{
		'use strict';
		$rootScope._activeCallsDuration = {};

		return {
			'restrict': "A",
			'replace': false,
			'scope': { 'callid': "=duration" },

			'link': function( scope, element, attrs )
			{ 
				var intervalid = null;
				var duration = 0;

				if( $rootScope._activeCallsDuration[ scope.callid ] )duration = ( ( new Date ).getTime() - $rootScope._activeCallsDuration[ scope.callid ] )/1000
				else $rootScope._activeCallsDuration[ scope.callid ] = ( new Date ).getTime();

				element.text( utils.formatDuration( duration ) );
	
				intervalid = $interval( function()
				{ 
					duration++; 
					element.text( utils.formatDuration( duration ) );
				}, 1000 );

				element.on( '$destroy', function()
				{
					if( intervalid )$interval.cancel( intervalid );
					intervalid = null;
				});
				


			}
	
		};
    }]);

angular.module( 'rcChromeExtension', [] );


angular.module( 'rcChromeExtension' ).provider( 'chromeExtensionInteraction', function( )
{
	'use strict';
               
        var callbackId = 1;
        var callbacks = {};
        var first = true;

        function registerCallback(callback) {
            var requestId = callbackId++;
            
            callback = callback || angular.noop;
            
            callbacks[requestId] = callback;
            
            return requestId;
        }

        this.$get = ["$rootScope", "$window", "$q", "uuid", function ($rootScope, $window, $q, uuid) {

            var rpcDeferred = {
                'isCollapsed': null,
                'getUserEmail': null,
                'getUserNumber': null,
                'ajax': {}
            };

            var service = {
                rpc: function (method, params, callback) {
                    var send = function () {
                        if (window.parent === window) {
                            throw new Exception('Application is not inside an iframe. RPC call is not supported');
                        }

                        window.parent.postMessage({
                            rpcRequest: {
                                method: method,
                                requestId: registerCallback(callback),
                                params: params
                            }
                        }, "*");
                    };

//                    if (first) {
//                        first = false;
//                        setTimeout(send, 1000);
//                    } else {
                        send();
//                    }
                },
                __deferredRPC: function(deferred, method, params, callback) {
                    try {
                        service.rpc(method, params, callback);
                    }
                    catch(e) {
                        deferred.reject(e);
                    }
                    return deferred.promise;
                },
                setSoftphoneWidth: function (width, callback) {
                    try {
                        service.rpc("setSoftphoneWidth", [width], callback);
                    }
                    catch (e) {};
                },
                isCollapsed: function(callback) {
                    rpcDeferred['isCollapsed'] = $q.defer();
                    return service.__deferredRPC(rpcDeferred['isCollapsed'], 'isCollapsed', [], callback)
                        .catch(function() {
                            return null;
                        });
                },
                triggerCollapse: function (callback) {
                    try {
                        service.rpc('triggerCollapse', [], callback);
                    }
                    catch(e) {};
                },
                collapse: function(callback) {
                    try {
                        service.rpc('collapse', [], callback);
                    }
                    catch (e) {};
                },
                expand: function(callback) {
                    try {
                        service.rpc('expand', [], callback);
                    }
                    catch(e) {};
                },
                alert: function (text, callback) {
                    try {
                        service.rpc("alert", [text], callback);
                    }
                    catch (e) {
                        alert(text);
                        typeof(callback) === 'function' && callback.call(this);
                    }
                },
                ajax: function (options) {
                    var id = uuid();
                    rpcDeferred['ajax'][id] = $q.defer();
                    return service.__deferredRPC(rpcDeferred['ajax'][id], 'ajax', [id, options]);
                },
                getUserEmail: function() {
                    rpcDeferred['getUserEmail'] = $q.defer();
                    return service.__deferredRPC(rpcDeferred['getUserEmail'], 'getUserEmail', [])
                        .catch(function() {
                            return null;
                        });
                },
                getUserNumber: function() {
                    rpcDeferred['getUserNumber'] = $q.defer();
                    return service.__deferredRPC(rpcDeferred['getUserNumber'], 'getUserNumber', [])
                        .catch(function() {
                            return null;
                        });
                }
            };

            $rootScope.$on('extension:ajaxResponse', function(e, data) {
                if (data.result && data.result === 'success') {
                    rpcDeferred['ajax'][data.id] && rpcDeferred['ajax'][data.id].resolve(data.data);
                }
                else {
                    rpcDeferred['ajax'][data.id] && rpcDeferred['ajax'][data.id].reject(data.error);
                }

                rpcDeferred['ajax'][data.id] && delete rpcDeferred['ajax'][data.id];
            });

            $rootScope.$on('extension:isCollapsed', function(e, data) {
                var collapsed = data.collapsed !== undefined ? data.collapsed : false;
                rpcDeferred['isCollapsed'].resolve(collapsed);
            });

            $rootScope.$on('extension:getUserEmail', function(e, data) {
                var email = data && data.email;
                rpcDeferred['getUserEmail'].resolve(email);
            });

            $rootScope.$on('extension:getUserNumber', function(e, data) {
                var number = data && data.number;
                rpcDeferred['getUserNumber'].resolve(number);
            });

            /* RPC from extension */
            $window.addEventListener("message", function (event) {
              if (event.data.rpcRequest) {
                var request = event.data.rpcRequest;
                var method = request.method;
                var requestId = request.requestId;
                var params = request.params;

                $rootScope.$broadcast('app:extensionRPC', request);

                switch (method) {
                    case 'isCollapsed':
                        $rootScope.$broadcast('extension:isCollapsed', params);
                        break;
                    case 'ajaxResponse':
                        $rootScope.$broadcast('extension:ajaxResponse', params);
                        break;
                    case 'callPhone':
                        $rootScope.$broadcast('extension:callPhone', params);
                        break;
                    case 'getUserEmail':
                        $rootScope.$broadcast('extension:getUserEmail', params);
                        break;
                    case 'getUserNumber':
                        $rootScope.$broadcast('extension:getUserNumber', params);
                        break;
                }
              }
            }, false);

            /* RPC to extension */
            return service;
        }];
        this.get = function () {
            return service;
        };
});
    

'use strict';
angular.module( 'google', [] );


'use strict';
angular.module( 'google' )
	.constant( 'GOOGLE_API_KEY', "AIzaSyBpYTRiCqJxV89WnIrpaRrpZnVSw-43fyM" )
	.constant( 'GOOGLE_CLIENT_ID', "420036030335-8mp9jc5r2d86hl78fa4qgetdp9o2675d.apps.googleusercontent.com" )
	.constant( 'GOOGLE_SCOPES', "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly" )
	.constant( 'GOOGLE_CONTACTS_PER_PAGE', 500 )
        ;

angular.module('google').factory('googleService', ["$q", "$http", "$interval", "$timeout", "GOOGLE_CONTACTS_PER_PAGE", "GOOGLE_CLIENT_ID", "GOOGLE_SCOPES", "chromeExtensionInteraction", function
    ($q, $http, $interval, $timeout, GOOGLE_CONTACTS_PER_PAGE, GOOGLE_CLIENT_ID, GOOGLE_SCOPES, chromeExtensionInteraction) {
    'use strict';


    var log = console.debug.bind(console);
    var error = console.error.bind(console);

    var lastUpdated,
        synced,
        contacts;

    function reset() {
        lastUpdated = null;
        synced = false;
        contacts = [];
    }

    reset();


    var accessTokenDeferred = null;
    var __googleClientLoaded = false, __googleAccessToken = undefined;

    function defer(callback) {
        if (accessTokenDeferred === null) {
            accessTokenDeferred = $q.defer();
            var interval = $interval(function () {
                if (__googleAccessToken !== null) {
                    accessTokenDeferred.resolve();
                    $interval.cancel(interval);
                }
            }, 500);
        }

        accessTokenDeferred.promise.then(callback);
    };

    var __authorizeDeferred = undefined,
        __userNumber = null;
    function authorize(immediate) {
        __authorizeDeferred = __authorizeDeferred || $q.defer();

        if (__googleClientLoaded) {
            chromeExtensionInteraction.getUserNumber().then(function(number) {
                __userNumber = number;
            })
                .finally(function() {
                    gapi.auth.authorize({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: GOOGLE_SCOPES,
                        immediate: immediate || false,
                        authuser: __userNumber === null ? 0 : __userNumber
                    }, function (authResult) {
                        log("Google contacts auth result", authResult);
                        if (authResult && !authResult.error) {
                            __googleAccessToken = authResult.access_token;
                            __authorizeDeferred.resolve();
                        } else {
                            error("Can't get Google authorization. Google Contacts support is turned off", authResult.error);
                            __googleAccessToken = null;
                            __authorizeDeferred.reject(authResult.error);
                        }
                        __authorizeDeferred = undefined;
                    }, function (e) {
                        __googleAccessToken = null;
                        __authorizeDeferred.reject(authResult.error);
                        __authorizeDeferred = undefined;
                    });
                });
        } else {
            // wait while Google Client library will be loaded and then try to authorize
            $timeout(function () {
                authorize();
            }, 500);
        }

        return __authorizeDeferred.promise;
    }

    function findContact(contacts, query, d) {
        var found = contacts.filter(function (contact) {
            if (query.id) {
                return contact.id == query.id;
            } else if (query.trackingId) {
                return contact.trackingId == query.trackingId;
            } else if (query.extensionNumber) {
                return contact.extensionNumber == query.extensionNumber;
            } else if (query.phoneNumber) {
                return contact.hasPhone(query.phoneNumber);
            } else {
                throw new Error("Unknown query: " + JSON.stringify(query));
            }
        });

        d.resolve(found);
    }

// https://developers.google.com/google-apps/contacts/v3/reference#Parameters
    function queryContacts(query, _deferred) {
        var d = _deferred || $q.defer();
        var contacts = [];

        if (__googleAccessToken === null) {
            d.reject(new Error("Need to authorize Google Contacts first."));
            return d.promise;
        }

        var params =
        {
            'access_token': __googleAccessToken,
            'alt': "json",
            'max-results': GOOGLE_CONTACTS_PER_PAGE,
            'showdeleted': false,
            'q': query,
            'v': "3.0"
        };

        $http
        ({
            'method': "get",
            'url': "https://www.google.com/m8/feeds/contacts/default/full/",
            'params': params
        })
            .then(function (response) {
                if (!response.data.feed.entry) {
                    d.resolve([]);
                    return;
                }

                response.data.feed.entry.forEach(function (entry) {
                    contacts.push(Contact.fromGoogleApi(entry));
                });

                d.resolve(contacts.filter(function (entry) {
                    return entry.hasAPhoneOrExtension();
                }));
            })
            .catch(function (e) {
                log("Coogle contacts error. Trying to refresh the access token and retry", e);
                authorize(true).then(function () {
                    queryContacts(query, d);
                }).catch(function (e) {
                    error("Retry failed. Give up", e);
                    d.reject(e);
                });
            });

        return d.promise;
    }

    function sync(deferred, failFast) {
        var d = deferred || $q.defer();

        if (__googleAccessToken === null) {
            if (failFast) {
                d.reject(new Error("Fail Fast: Need to authorize Google Contacts first."));
            } else {
                defer(function () {
                    sync(d);
                });
            }

            return d.promise;
        }

        var doSync = function (url) {
            var params = {
                alt: "json",
                access_token: __googleAccessToken,
                "max-results": GOOGLE_CONTACTS_PER_PAGE,
                showdeleted: false,
                v: '3.0'
            };

            if (lastUpdated) {
                params["updated-min"] = lastUpdated;
            }

            $http({
                method: "get",
                url: url || "https://www.google.com/m8/feeds/contacts/default/full/",
                params: params
            }).then(function (response) {
                log("google-contacts response", response);

                lastUpdated = response.data.feed.updated["$t"];

                if (response.data.feed.entry) {
                    // merge new/changed/deleted accounts
                    response.data.feed.entry.forEach(function (entry) {
                        var contact = Contact.fromGoogleApi(entry);

                        var found = false;
                        for (var i = 0; i < contacts.length; i++) {
                            var existingContact = contacts[i];

                            if (existingContact.id === contact.id) {
                                angular.extend(existingContact, contact);
                                found = true;
                            }
                        }

                        if (!found) {
                            contacts.push(contact);
                        }
                    });

                    // filter deleted contacts
                    contacts = contacts.filter(function (contact) {
                        return !contact.isDeleted();
                    }).filter(function (contact) {
                        return contact.hasAPhoneOrExtension();
                    });
                }

                var next = response.data.feed.link.filter(function (link) {
                    return link.rel === "next";
                }).map(function (link) {
                    return link.href;
                });
                if (next.length === 1) {
                    doSync(next[0]);
                } else {
                    d.resolve(contacts);
                }

            }, function (e) {
                log("Coogle contacts sync error. Trying to refresh the access token and retry", e);
                authorize(true).then(function () {
                    doSync(url);
                }).catch(function (e) {
                    error("Retry failed. Give up", e);
                    d.reject();
                });
            });

        };

        doSync();

        d.promise.then(function () {
            synced = true;
        }, function () {
            __googleAccessToken = null;
        });

        return d.promise;
    }

    var service = {
        reset: function () {
            reset();
        },
        isAuthorized: function (d) {
            d = d || $q.defer();

            if (__googleClientLoaded && __googleAccessToken !== undefined) {
                d.resolve(__googleAccessToken !== null);
            }
            else {
                $timeout(function () {
                    service.isAuthorized(d);
                }, 500);
            }

            return d.promise;
        },

        getUserNumber: function() {
            return __userNumber || 0;
        },

        authorize: authorize,

        getContact: function (query, needSync) {
            needSync = needSync === undefined ? !synced : needSync;

            var d = $q.defer();

            if (needSync) {
                sync().then(function () {
                    findContact(contacts, query, d);
                }, function (cause) {
                    d.reject(cause);
                });
            } else {
                findContact(contacts, query, d);
            }

            return d.promise;
        },

        syncContacts: sync,
        queryContacts: queryContacts,

        getAccessToken: function () {
            return __googleAccessToken;
        },

        setLoaded: function (state) {
            __googleClientLoaded = (state) ? true : false;
        },

        setAccessToken: function(token) {
            __googleAccessToken = token;
        }
    };

    return service;
}]);


/*
 * Document/Body specific DOM manipulation
 */

angular.module('openCtiApp')
    .directive('body', ["$window", "$document", "googleService", "GOOGLE_API_KEY", "chromeExtensionInteraction", function ($window, $document, googleService, GOOGLE_API_KEY, chromeExtensionInteraction) { 'use strict';
        return {
            restrict: 'E',
            link: function() {
                angular.element($window).on('load', function () {
                    function onGoogleClientLoad() {
                        googleService.setLoaded(true);
                        $window.gapi.client.setApiKey(GOOGLE_API_KEY);

                        var __number = null;
                        chromeExtensionInteraction.getUserNumber().then(function(number) {
                            __number = number;
                        }).finally(function() {
                            googleService.authorize(true)
                                .then(function() {
                                    delete $window.__onGoogleClientLoad;
                                })
                                .catch(function() {
                                    return null;
                                });
                        });
                    }

                    var script = document.createElement('script');
                    script.setAttribute("type", "text/javascript");
                    script.setAttribute("src", "https://apis.google.com/js/client.js?onload=__onGoogleClientLoad");
                    $window.__onGoogleClientLoad = onGoogleClientLoad;
                    $document[0].getElementsByTagName("body")[0].appendChild(script);
                });
            }
        };
    }]);
'use strict';
angular.module( 'google.mail', [ 'ngResource' , 'google' ] );


angular.module( 'google.mail' ).factory( 'googleMail', ["$resource", "googleService", function( $resource, googleService )
{
	'use strict';
	var mailResource = $resource( 'https://www.googleapis.com/gmail/v1/users/me/messages/:id', {}, 
	{
		"query": { "method": 'GET', "responseType": 'json', "isArray": true, "transformResponse": function( data ){ return data.messages; }  }
	} );

	return { 
		"query": function( fromEmail, limit )
		{
			return mailResource.query
			({
				"access_token": googleService.getAccessToken(),
				"alt": 'json',
				"maxResults": limit||5,
				"showdeleted": false,
				"q": 'from:' + fromEmail
			});
		}, 
		"get": function( id ){ return mailResource.get({ "id": id, "access_token": googleService.getAccessToken() }); } 

	};
}]);

angular.module( 'google.mail' ).directive( 'googleMail', ["googleMail", function( googleMail )
{
	return { 
		"restrict": 'E',
		"scope": { "from": '=', "limit": '=' },
		"templateUrl": 'views/directives/google-mail.html',
		"link": function( $scope, $element, $attrs )
		{
			$scope.mails = [];
			$scope.$watch( 'from', function( value ){ if( value )$scope.mails = googleMail.query( value, $scope.limit ); } );
		}
	};
}]);


angular.module( 'google.mail' ).directive( 'googleMailEntry', ["googleMail", function( googleMail )
{
	return { 
		"restrict": 'E',
		"scope": { "id": '=' },
		"templateUrl": 'views/directives/google-mail-entry.html',
		"link": function( $scope, $element, $attrs )
		{
			$scope.isCollapsed = true;

			$scope.mailEntry = googleMail.get( $scope.id );
			$scope.mailEntry.$promise.then( function( data )
			{ 
				data.payload.headers.forEach( function( entry )
				{
					switch( entry.name )
					{
						case "Date": data.received = new Date( entry.value ); break;
						case "From": data.from = entry.value; break;
						case "Subject": data.subject = entry.value; break;
					}
				});
			});
		}
	};
}]);


'use strict';
angular.module( 'rcLogging', [] );


'use strict';
angular.module( 'rcLogging' ).constant( 'LOGGING',
{
/*
	"*":
	{
		"debug": false,
		"info": false
	}
*/
});

angular.module( 'rcLogging' ).provider( 'logging', ["LOGGING", function( LOGGING )
{
	'use strict';
	var loggers = {};
	var settings = LOGGING || {};
        
        function isOff(name, method) {
            return settings["*"] !== undefined
                && settings["*"]["*"] === false
                ||
                settings["*"] !== undefined
                && settings["*"][method] === false
                ||
                settings[name] !== undefined
                && settings[name]["*"] === false
                ||
                settings[name] !== undefined
                && settings[name][method] === false;
        }
    
        function logFactory(name) {
            if (loggers[name] === undefined) {
                var prefix = "[" + name + "]";

                var _log = function (method) {
                    if (isOff(name, method)) {
                        return;
                    }
                    
                    var args = [];
                    args.push.apply(args, arguments);
                    
                    var a = [prefix];
                    a.push.apply(a, args.slice(1));
                    window.console[method].apply(window.console, a);
                };
                
                var _default = _log.bind(null, "debug");
                var log = function () { _default.apply(null, arguments); };
                log.log = _log.bind(null, "log");
                log.info = _log.bind(null, "info");
                log.debug = _log.bind(null, "debug");
                log.warn = _log.bind(null, "warn");
                log.error = _log.bind(null, "error");
                log.trace = _log.bind(null, "trace");
                
                loggers[name] = log;
            }
            
            return loggers[name];
        }
        
        this.on = function (name, method) {
            name = name || "*";
            method = method || "*";
            
            if (settings[name] === undefined) {
                settings[name] = {};
            }
            
            settings[name][method] = true;
        };
        
        this.off = function (name, method) {
            name = name || "*";
            method = method || "*";
            
            if (settings[name] === undefined) {
                settings[name] = {};
            }
            
            settings[name][method] = false;
        };
        
        this.get = function (name) {
            return logFactory(name);
        };
        
        this.$get = function () {
            return logFactory;
        };
    }]);

angular.module( 'rcAuth', ['rcCore'] );


angular.module('rcAuth').provider('loginService', ["loggingProvider", "rcCoreProvider", function (loggingProvider, rcCoreProvider) {
    'use strict';

    var log = loggingProvider.get("login-service");
    var error = log.error;

    var PUBLIC_PAGES = ['/login', '/no-sf-support', '/rc-limit', '/help', '/' ];

    // checks if user is authenticated
    this.isAuthenticated = ['$q', '$location', '$interval', '$rootScope', function ($q, $location, $interval, $rootScope) {
        var d = $q.defer();
        if (PUBLIC_PAGES.indexOf($location.path()) > -1) {
            d.resolve(true);
        }
        else {
            var doCheckAuthorization = function () {
                rcCoreProvider.get().getPlatform().isAuthorized
                ({
                    "refresh": function () {
                        log('$routeProvider.isAuthenticated(', $location.path(), '): User is not authorized, refresh will be performed');
                    },
                    "success": function () {
                        $rootScope.safe$apply(function () {
                            d.resolve(true);
                        });
                    },
                    "error": function (e) {
                        $rootScope.safe$apply(function () {
                            d.reject(e);
                        });
                    }
                });
            };

            doCheckAuthorization();
        }

        return d.promise;
    }];

    var observable = rcCoreProvider.get().getObservable();
    var events = {"logout": 'logout', "login": 'login'};

    var platform = rcCoreProvider.get().getPlatform(),
        onLogin = observable.emit.bind(observable, events.login),
        onLogout = observable.emit.bind(observable, events.logout);
    platform.on([platform.events.authorizeSuccess, platform.events.refreshSuccess], function () {
        if (onLogin !== undefined) {
            onLogin();
            onLogout = observable.emit.bind(observable, events.logout);
        }
        onLogin = undefined;
    });
    platform.on(platform.events.refreshSuccess, function() {
        if (onLogin !== undefined) {
            onLogin();
            onLogout = observable.emit.bind(observable, events.logout);
        }
        onLogin = undefined;
    });
    platform.on([platform.events.logoutSuccess], function () {
        onLogout !== undefined && onLogout();
        onLogin = observable.emit.bind(observable, events.login);
        onLogout = undefined;
    });

    this.$get = ["$q", "$rootScope", "$location", function ($q, $rootScope, $location) {
        platform.on(platform.events.accessViolation, function (e) {
            if (PUBLIC_PAGES.indexOf($location.path()) < 0)
                service.logout();
        });

        var service =
        {
            getPublicPages: function () {
                return angular.copy(PUBLIC_PAGES);
            },


            loadCredentials: function () {
                var deferred = $q.defer();

                // does nothing
                deferred.reject();

                return deferred.promise;
            },

            saveCredentials: function (phone, extension, password, rememberMe) {
                var deferred = $q.defer();

                // does nothing
                deferred.resolve();

                return deferred.promise;
            },

            login: function (username, extension, password, rememberMe) {
                var d = $q.defer();

                platform.authorize({
                    username: username,
                    extension: extension,
                    password: password,
                    remember: rememberMe,
                    success: function (data) {
                        d.resolve(data);
                        //observable.emit(events.login);
                    },
                    error: function (e) {
                        d.reject(e);
                        //observable.emit(events.logout);
                    }
                });

                return d.promise;
            },


            relogin: function (phone, extension, password, rememberMe) {
                var deferred = $q.defer();

                // does nothing
                deferred.reject();

                return deferred.promise;
            },

            logout: function () {
                platform.logout({});
                observable.emit(events.logout);
            },

            onLogin: function (handler) {
                //run handler if we're already logged in
                platform.isTokenValid() && handler();
                return observable.on(events.login, handler);
            },

            offLogin: function (handler) {
                return observable.off(events.login, handler);
            },

            onLogout: function (handler) {
                //run handler if we're not logged in
                !platform.isTokenValid() && handler();
                return observable.on(events.logout, handler);
            },

            offLogout: function (handler) {
                return observable.off(events.logout, handler);
            }

        };
        return service;

    }];
}]);

angular.module( 'rcSupport', [ 'rcTabrpc', 'rcLogging', 'rcCore' ] )


// The maximum number of opened tabs/windows that can contain the widget.
// The limitation is comming from RC API that does not allow to create more than X subscriptions to presence events
'use strict';
angular.module( 'rcSupport' ).constant( 'MAX_ACTIVE_WINDOWS', 10 );

angular.module('rcSupport').provider('rcSupport', ["tabrpcProvider", "loggingProvider", "MAX_ACTIVE_WINDOWS", function (tabrpcProvider, loggingProvider, MAX_ACTIVE_WINDOWS) {
    'use strict';
    var log = loggingProvider.get("rc-support");
    var error = log.error;

    var brands = {
        '1210': 'RCUS',
        '3710': 'RCUK',
        '3610': 'RCCA',
        '3420': 'ATTOAH',
        '7310': 'TELUS',
        '8510': 'TMOB',
        '7710': 'BT'
    };

    var calcBrandName = function (brandId, countryCode) {
        if (brands['' + brandId]) return brands['' + brandId];
        else {
            throw "The brand/country or both are not supported: " + brandId + ", " + countryCode;
        }
    };

    /*var calcLogo = function (brand) {
        var logo = "rclogo-2.52-" + brand + ".png";

        log("calculated logo", logo);
        return logo;
    };*/

    function maxWindowLimitExceeded() {
        var maxActiveWindows = MAX_ACTIVE_WINDOWS;

        if (tabrpcProvider.getActiveWindows().length > maxActiveWindows) {
            // make sure that the current window will not count in the list of active windows
            tabrpcProvider.deactivateCurrentWindow();

            return "You can't have more than " + maxActiveWindows + " tabs/windows opened";
        }

        return false;
    }

    this.maxWindowLimitExceeded = maxWindowLimitExceeded;

    this.$get = ["$q", "rcCore", "rcPlatform", function ($q, rcCore, rcPlatform) {
        var service =
        {
            "getAccountInfo": function () {

                var config = {};

                return rcPlatform.extension.account()
                    .then(function(account) {
                        if (account && account.serviceInfo) {
                            config.brand = account.serviceInfo.brand.id;
                            return rcPlatform.api.get('/dictionary/country/' + account.serviceInfo.brand.homeCountry.id)
                                .then(function(country) {
                                    config.countryCode = country.isoCode;
                                    config.brand = calcBrandName(config.brand, config.countryCode);
                                    //config.logo = calcLogo(config.brand);
                                    return config;
                                });
                        }
                        else {
                            return $q.reject("No account information got from server");
                        }
                    });
            },

            "getExtensionNumber": function () {
                return rcPlatform.extension.info()
                    .then(function(extension) {
                        return extension.extensionNumber;
                    });
            },


            getDirectNumber: function () {
                return rcPlatform.extension.phoneNumber()
                    .then(function(data) {
                        if (data && data.records) {
                            return data.records
                                .filter(function(e) {
                                    return e.usageType === "DirectNumber";
                                })
                                .map( function(e){
                                    return e.phoneNumber;
                                });
                        }

                        return null;
                    })
                    .catch(function(e) {
                        error("Can't get phone-number", e);
                        return $q.reject(e);
                    });
            },

            getAnsweringRule: function () {
                return rcPlatform.extension.answeringRule()
                    .catch(function(e) {
                        error("Can't get answering-rule", e);
                        return $q.reject(e);
                    });
            },

            maxWindowLimitExceeded: maxWindowLimitExceeded
        };

        return service;
    }];
}]);

angular.module( 'rcTabrpc', [ 'rcLogging' ] );


angular.module('rcTabrpc' ).provider( 'tabrpc', ["loggingProvider", function( loggingProvider )
{
	'use strict';

        var log = loggingProvider.get("tabrpc");
        var info = log.info;
        var error = log.error;

        var thisWindowId = (new Date()).getTime().toString() + Math.random();
        info("thisWindowId", thisWindowId);

        var prefix = "tabrpc_";
        var mainWindowHeartBeatKey = prefix + "heartbeat";
        var thisWindowHearbeatKey = prefix + thisWindowId + "heartbeat";

        var waitMainWindowElectedMs = 5000;
        var maxHeartbeatAgeMs = 2000;
        var heartbeatTickMs = 500;
        var electionsScheduleMs = 200;
        var mainWindowHeartbeatCheckMs = 1000;
        var waitMainWindowMs = 200;
        var heartbeatGcPeriodMs = 2000;

        var mainWindow = null;

        var windowIds = [thisWindowId],
            heartbeatTimer = null,
            resultCallbacks,
            electionsScheduledTimer = null,
            waitMainWindowElectedTimer = null;

        function stopWaitforMainWindowElected() {
            if (waitMainWindowElectedTimer !== null) {
                clearTimeout(waitMainWindowElectedTimer);
                waitMainWindowElectedTimer = null;
            }
        }

        function resetState() {
            // there is no main window until the elections will be finished
            mainWindow = null;

            if (heartbeatTimer !== null) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
            }

            if (electionsScheduledTimer !== null) {
                clearTimeout(electionsScheduledTimer);
                electionsScheduledTimer = null;
            }

            electionsScheduled = false;

            stopWaitforMainWindowElected();

            resultCallbacks = [];
        }

        var electionsScheduled = false;
        function scheduleElectionsResultProcessing() {
            if (!electionsScheduled) {
                log("Scheduling elections results processing");

                resetState();

                electionsScheduled = true;

                electionsScheduledTimer = setTimeout(function() {
                    electionsScheduledTimer = null;
                    electionsScheduled = false;

                    // if main window has already been elected (by getting 'mainWindowElected' command)
                    // then just finish the elections
                    if (mainWindow === null) {
                        var electedMainWindow = null;
                        if (windowIds.length > 0) {
                            electedMainWindow = windowIds[0];
                            for (var i = 1; i < windowIds.length; i++) {
                                if (windowIds[i] < electedMainWindow) {
                                    electedMainWindow = windowIds[i];
                                }
                            }
                        }

                        // reset the list of windows to start next elections from scratches
                        windowIds = [thisWindowId];

                        info("Main window elected!", electedMainWindow === thisWindowId ? "It's me!" : electedMainWindow);

                        if (electedMainWindow === thisWindowId) {
                            mainWindow = electedMainWindow;

                            // notify all the others that elections are over and now they can start tracking the main window liveness
                            broadcast("mainWindowElected", thisWindowId);

                            // if we are selected to be the main window then update everybody about our status
                            localStorage[mainWindowHeartBeatKey] = new Date();
                            heartbeatTimer = setInterval(function() {
                                localStorage[mainWindowHeartBeatKey] = new Date();
                            }, heartbeatTickMs);
                        } else {
                            // others will set their mainWindow after they'll got 'mainWindowElected' command
                            // 
                            // restart elections if no 'mainWindowElected' notification will be gotten in some time
                            waitMainWindowElectedTimer = setTimeout(function() {
                                info("No main window elected. Restarting elections", waitMainWindowElectedMs);
                                startElections();
                            }, waitMainWindowElectedMs);
                        }
                    } else {
                        // reset the list of windows to start next elections from scratches
                        windowIds = [thisWindowId];
                    }

                }, electionsScheduleMs);
            }
        }

        // Built in commands
        var commands = {
            /**
             * Start elections or restart them if elections are in progress.
             * 
             * This effectively force all tabs/windows to re-broadcast 'register' command.
             */
            startElections: function(fromWindowId, toWindowId, value) {
                if (electionsScheduled) {
                    // finish current elections
                    resetState();
                }

                // and start new one
                participateInElections();
            },
            
            /**
             * Broadcasted by the newly elected main window to all the other windows.
             */
            mainWindowElected: function(fromWindowId, toWindowId, electedMainWindow) {
                stopWaitforMainWindowElected();

                // save elected main window
                mainWindow = electedMainWindow;
                info("Main window elected!", electedMainWindow);

                // check for main window heart beats and restart elections on its death
                heartbeatTimer = setInterval(function() {
                    var lastHeartbeat = new Date(localStorage[mainWindowHeartBeatKey]);
                    if ((new Date()) - lastHeartbeat > maxHeartbeatAgeMs) {
                        // Main window is probably closed or hung
                        // Start new elections
                        info("Main window is dead. Starting new elections");
                        startElections();
                    }
                }, mainWindowHeartbeatCheckMs);
            },
            
            /**
             * Register main window candidate.
             */
            register: function(fromWindowId, toWindowId, value) {
                scheduleElectionsResultProcessing();

                if (windowIds.indexOf(fromWindowId) === -1) {
                    windowIds.push(fromWindowId);
                }
            }
        };

        function send(command, toWindowId, value, onResult) {
            if (toWindowId === thisWindowId) {
                log("send() local call", command, toWindowId, value);

                if (typeof commands[command] !== "undefined") {
                    var result = commands[command](thisWindowId, thisWindowId, value);
                    onResult && onResult(result);
                } else {
                    log("No handler for the command. Ignored", command);
                }
            } else {
                if (toWindowId !== "") {
                    log("send()", command, toWindowId, value);
                }

                var key = prefix + command + "#" + thisWindowId + "@" + toWindowId;

                if (onResult) {
                    resultCallbacks.push({key: key, callback: onResult});
                }

                // trigger 'storage' event in all other tabs/windows
                localStorage[key] = JSON.stringify({value: value});
                delete localStorage[key];
            }
        }

        function broadcast(command, value, onResult) {
            log("broadcast()", command, value);
            send(command, "", value, onResult);
        }

        function participateInElections() {
            scheduleElectionsResultProcessing();
            broadcast("register", thisWindowId);
        }

        function startElections() {
            broadcast("startElections", thisWindowId);
            participateInElections();
        }

        function sendToMainWindow(command, value, onResult) {
            if (mainWindow !== null) {
                send(command, mainWindow, value, onResult);
            } else {
                if (electionsScheduled) {
                    // wait until the main window will be elected
                    var waitTimer = setInterval(function() {
                        if (mainWindow !== null) {
                            clearInterval(waitTimer);
                            sendToMainWindow(command, value, onResult);
                        }
                    }, waitMainWindowMs);
                } else {
                    throw new Error("mainWindow is null and there is no active elections");
                }
            }
        }

        function onStorageEvent(e) {
            if (e.newValue !== null && e.newValue !== "") {
                var a = e.key.match("^" + prefix + "([^#]+)#([^@]*)@(.*)$");
                if (a) {
                    var command = a[1];
                    var fromWindowId = a[2];
                    var toWindowId = a[3];

                    if (fromWindowId === thisWindowId) {
                        // it is probably IE that generates storage event for the original window as well
                        // ignore it silently
                        return;
                    }

                    if (toWindowId !== "" && toWindowId !== thisWindowId) {
                        // ignore private calls to other windows
                        return;
                    }

                    var value = JSON.parse(e.newValue).value;

                    log("onStorageEvent", command, fromWindowId, toWindowId, value);

                    var matches = command.match("^result\\^(.+)$");
                    if (matches && toWindowId === thisWindowId) {
                        // this is the result for the previous call (results can't be broadcasted)

                        var commandOfResult = matches[1];
                        var key = prefix + commandOfResult + "#" + toWindowId + "@" + fromWindowId;

                        // call result callbacks and filter them out from the list of awainting callbacks
                        var newCallbacks = [];
                        for (var i = 0; i < resultCallbacks.length; i++) {
                            var callbackDef = resultCallbacks[i];

                            if (callbackDef.key === key) {
                                callbackDef.callback(value);
                            } else {
                                newCallbacks.push(callbackDef);
                            }
                        }
                        resultCallbacks = newCallbacks;
                    } else if (!matches) {
                        // this was plain call (not a result call)

                        if (commands[command]) {
                            var result = commands[command](fromWindowId, toWindowId, value);

                            // send back result only for not broadcasted calls
                            if (fromWindowId && toWindowId) {
                                if (typeof result !== "undefined") {
                                    log("Sending back result", result);
                                    send("result^" + command, fromWindowId, result);
                                }
                            }
                        } else {
                            log("No handler for the command. Ignored", command);
                        }
                    }
                }
            }
        }

        var myHeartbeatTimer = null;
        function startMyHeartbeat() {
            localStorage[thisWindowHearbeatKey] = new Date();
            
            myHeartbeatTimer = setInterval(function () {
                localStorage[thisWindowHearbeatKey] = new Date();
            }, heartbeatTickMs);
        }
        
        function deactivateCurrentWindow() {
            if (myHeartbeatTimer !== null) {
                clearInterval(myHeartbeatTimer);
                myHeartbeatTimer = null;
            }
            
            delete localStorage[thisWindowHearbeatKey];
        }
        
        function getActiveWindows(doGc) {
            var activeWindows = [];
            
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key !== null) {
                    var a = key.match("^" + prefix + "(.+)heartbeat$");
                    if (a) {
                        var windowId = a[1];
                        var heartbeatAgeMs = new Date() - new Date(localStorage[key]);
                        if (heartbeatAgeMs < maxHeartbeatAgeMs) {
                            activeWindows.push(windowId);
                        } else if (doGc) {
                            delete localStorage[key];
                        }
                    }
                }
            }
            
            return activeWindows;
        }
        
        // GC all not active heartbeat keys
        setInterval(function () { getActiveWindows(true); }, heartbeatGcPeriodMs);
        
        window.addEventListener("beforeunload", deactivateCurrentWindow);
        window.addEventListener("storage", onStorageEvent, false);

        resetState();
        startMyHeartbeat();
        
        // initiate elections when a new window joins
        startElections();
        
        this.getActiveWindows = getActiveWindows;
        this.deactivateCurrentWindow = deactivateCurrentWindow;

        this.$get = ["$q", function ($q) {
            var service = {
                registerCommand: function(command, callback) {
                    if (typeof commands[command] === "undefined") {
                        commands[command] = callback;
                    } else {
                        throw new Error("Command '" + command + "' has already been registered");
                    }
                },

                sendToMainWindow: function(command, value) {
                    var d = $q.defer();

                    try {
                        sendToMainWindow(command, value, function(result) {
                            d.resolve(result);
                        });
                    } catch (e) {
                        error("Exception while executing sendToMainWindow()", e);
                        d.reject(e);
                    }

                    return d.promise;
                },

                broadcast: broadcast,

                getActiveWindows: getActiveWindows,
                
                deactivateCurrentWindow: deactivateCurrentWindow
            };
            
            return service;
        }];
    }]);

'use strict';
angular.module( 'zoomMeetings', [] );


'use strict';
angular.module( 'zoomMeetings' )
	.constant('ZOOM_API_URL',
	{
		"RCUK": 'https://ringcentral.zoom.us',
		"RCUS": 'https://ringcentral.zoom.us',
		"RCCA": 'https://ringcentral.zoom.us',
		"TMOB": 'https://ringcentral.zoom.us',
		"ATTOAH": 'https://ringcentral-officeathand-att.zoom.us',
		"TELUS": 'https://ringcentral-telus.zoom.us',
		"BT": 'https://ringcentral-bt.zoom.us'
	} );
;

angular.module( 'zoomMeetings' ).provider( 'zoomMeetings', function ()
{
	'use strict';

        /**
         * The workhorse; converts an object to x-www-form-urlencoded serialization.
         * @param {Object} obj
         * @return {String}
         */
        var param = function(obj) {
            var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

            for(name in obj) {
                value = obj[name];

                if(value instanceof Array) {
                    for(i=0; i<value.length; ++i) {
                        subValue = value[i];
                        fullSubName = name + '[' + i + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if(value instanceof Object) {
                    for(subName in value) {
                        subValue = value[subName];
                        fullSubName = name + '[' + subName + ']';
                        innerObj = {};
                        innerObj[fullSubName] = subValue;
                        query += param(innerObj) + '&';
                    }
                }
                else if(value !== undefined && value !== null)
                    query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
            }

            return query.length ? query.substr(0, query.length - 1) : query;
        };

        this.$get = ["$http", "$q", "logging", "chromeExtensionInteraction", "ZOOM_API_URL", "$rootScope", function ($http, $q, logging, chromeExtensionInteraction, ZOOM_API_URL, $rootScope)
        {
            var log = logging('zoom-meetings');

            var post = function (url, data)
            {
                //return $http.post( ZOOM_API_URL + url, data );

                var deferred = $q.defer();
                chromeExtensionInteraction.ajax({
                    method: 'POST',
                    url: ZOOM_API_URL[$rootScope.brand] + url,
                    data: data
                }).then(function(data) {
                    if (data.error) {
                        deferred.reject(data.error);
                    }
                    else {
                        deferred.resolve(data);
                    }
                }, function (e) {
                    deferred.reject(e);
                });
                return deferred.promise;
            };

            return {
                user: {
                    getbyemail: function(email, loginType) {
                        if (!typeof(email) === 'string') email = '';
                        if (loginType === undefined) loginType = 100;
                        return post( 'user/getbyemail', {
                            'email': email,
                            'login_type': loginType
                        })
                            .then(function(data) {
                                return data;
                            }, function(e) {
                                log('user get by email error', e);
                                return $q.reject(e);
                            });
                    }
                },

                meeting: {
                    create: function(data)
                    {
                        var d = $q.defer();

                        data = data || {};
                        var logindata = { country: data.country, extension: data.extension, username: data.username, accesstoken: data.accesstoken, snstype: 98 };
                        var createdata = { topic: data.topic, password: data.password, option_jbh: data.enableJoinBeforeHost, option_start_type: data.meetingType };
                        var updatedata = { isRepeat: data.isRepeat, duration: data.duration, scheduleTime: data.startTime };

                        post( '/mimo/login', logindata ).then( function( result )
                        {
                            createdata.zpk = result.result.zpk;
                            post( '/mimo/schedule', createdata ).then( function( result )
                            {
                                updatedata.zpk = createdata.zpk;
                                updatedata.meetingNumber = result.result.number;
                                post( '/mimo/editMeeting', updatedata ).then( function()
                                {

                                    post( '/mimo/logout', { zpk: createdata.zpk } );
                                    d.resolve( { 'meetingId': updatedata.meetingNumber } );
                                }).catch( function(e){d.reject(e);} );
                            }).catch( function(e){d.reject(e);} );
                        }).catch( function(e){d.reject(e);} );

                        return d.promise;

                    }
                }
            }
        }];
});

'use strict';
angular.module( 'google.calendar', [] );


'use strict';
angular.module( 'google.calendar' ).constant( 'GOOGLE_CALENDAR_URL', "https://www.google.com/calendar/render" );

angular.module( 'google.calendar' ).factory( 'googleCalendar', ["$window", "$timeout", "GOOGLE_CALENDAR_URL", function( $window, $timeout, GOOGLE_CALENDAR_URL )
{
	'use strict';
	var tab = null;
	return {
		"open": function(){ tab = $window.open(); },
		"load": function( callback )
		{
			if( typeof callback != 'function' )throw 'invalid calback type';
			if( tab === null )throw 'googleCalendar.open needs to be called first';

			$timeout( function()
			{
				var options = callback();
				options.action = 'TEMPLATE';
				options.output = 'xml';
				options.tpr = true;
				options.sf = true;

				var o = Object.keys( options ).map( function( k ){ return encodeURIComponent( k ) + '=' + encodeURIComponent( options[k] ); }).join( '&' );
				tab.location = GOOGLE_CALENDAR_URL + '?' + o;
				tab = null;
			}, 1 );
		}
	};
}]);

angular.module( 'google.calendar' ).directive( 'googleCalendarDetails', function()
{
	return { 
		"restrict": 'A',
		"scope": { "result": '=' },
		"link": function( $scope, $element, $attrs, ngModel )
		{
			$scope.$watch( function(){ return $element.text(); }, function( value ){ $scope.result = value; } );
		}
	};
});


angular.module('openCtiApp')
    .factory('utils', ["$rootScope", "logging", "chromeExtensionInteraction", function($rootScope, logging, chromeExtensionInteraction) { 'use strict';
        
        var log = logging("utils");

        var service = {
            isExtensionNumber: function (number) {
                return ('' + number).length <= 5 ? true : false;
            },
            /**
             * [toDigitsOnly: remove alphabets and special character from number]
             * @param  {[String]} number [string contain contact number]
             * @return {[]} [number]
             */
            toDigitsOnly: function(number, leavePlus) {
                if (leavePlus) {
                    number = (number + '').replace(/[^\d+]/g, '');
                } else {
                    number = (number + '').replace(/[^\d]/g, '');
                }
                
                return number;
            },
            /**
             * [filterNumber  : To remove '+' sign and append international prefix if not there to the number]
             * @param  {[String]} number [string contain contact number]
             * @return {[Integer]}        []
             */
            filterNumber: function(number, brand) {
                number = number || "";
                brand = brand || $rootScope.brand;

                number = this.toDigitsOnly(number);

                if (brand === 'RCUS'
                    || brand === 'RCCA'
                    || brand === 'ATTOAH'
                    || brand === 'TELUS'
                    || brand === 'TMOB') {

                    if (number.substring(0, 1) !== "1" && number.length === 10) {
                        number = "1" + number;
                    }
                } else if (brand === 'RCUK' || brand === 'BT') {
                    if (number.substring(0, 1) === '0' && (number.length === 10 || number.length === 11)) {
                        number = '44' + number.substring(1);
                    }
                    else {
                        if (number.substring(0, 2) !== "44" && number.length < 11 && number.length > 5 ) {
                            number = "44" + number;
                        }
                    }
                }
                return number;
            },
            /**
             * [sfFilterNumber : Remove non-numeric character and country code from number]
             * @param  {[type]} number [description]
             * @return {[type]}        [description]
             */
            sfFilterNumber: function(number) {
                number = service.toDigitsOnly(number);
                if ($rootScope.brand === 'RCUS'
                    || $rootScope.brand === 'RCCA'
                    || $rootScope.brand === 'ATTOAH'
                    || $rootScope.brand === 'TELUS'
                    || $rootScope.brand === 'TMOB') {

                    number = (number.substring(0, 1) === "1") ? number.substring(1) : number;
                } else if ($rootScope.brand === 'RCUK' || brand === 'BT') {
                    number = (number.substring(0, 2) === "44") ? number.substring(2) : number;
                }

                return number;
            },
            normalizeNumber: function (number) {
                if( !number )return '';

                number = this.toDigitsOnly(number);
                if( number.length == 0 )return '';
                var brand = $rootScope.brand;

                if (brand === 'RCUS'
                    || brand === 'RCCA'
                    || brand === 'ATTOAH'
                    || brand === 'TELUS'
                    || brand === 'TMOB') {

                    if (number.substring(0, 1) !== "1" && number.length === 10) {
                        number = "+1" + number;
                    }

                    // add plus if the number is not too short
                    if (!number.match(/^\+/, number) && number.length > 9) {
                        number = "+" + number;
                    }
                } else if (brand === 'RCUK'  || brand === 'BT') {

                    if (number.substring(0, 2) !== "44" && number.length < 11 && number.length > 5 ) {
                        number = "+44" + number;
                    }

                    // add plus if the number is not too short
                    if (!number.match(/^(\+|0)/, number) && number.length > 9) {
                        number = "+" + number;
                    }
                }

                return number;
            },
            formatDuration: function(duration) {
                if (isNaN(duration)) {
                    return "";
                }

                if (typeof duration !== "number") {
                    duration = 0;
                }

                duration = Math.round(duration);

                var seconds = duration % 60;
                var minutes = Math.floor(duration / 60) % 60;
                var hours = Math.floor(duration / 3600) % 24;

                function format(value) {
                    return (value < 10) ? '0' + value : value;
                }

                var result = format(minutes) + ':' + format(seconds);

                if (hours > 0) {
                    result = format(hours) + ':' + result;
                }

                return result;
            },
            ignoreSdkError: function(e) {
                // TODO figure out with Kirill a better way to separate server errors and this particular error
                return e.message === "No access token in cache";
            },
            convertNumber: function( number ){
                if( !number )return '';
                var compareLength = 10;
                return number.replace(/[^\d]/g, '').substr( -compareLength );
            }
        };

        return service;
    }]);

angular.module('openCtiApp')
  .factory('appstorage', function () { 'use strict';
  
    var prefix = "appstorage-";
  
    return {
      getData: function (key) {
        var returnValue = null;
        if(typeof (key) !== 'undefined' || key === ''){
          try {
            returnValue = angular.fromJson(window.localStorage[prefix + key]);
          } catch (e) {
            returnValue = null;
          }
        }
        return returnValue;
      },
      setData: function (key, value) {
        if(typeof (key) !== 'undefined' || key === ''){
          window.localStorage[prefix + key] = angular.toJson(value);
          return true;
        }else{
          return false;
        }
      }
    };
  });

angular.module("openCtiApp")
    .factory("disabledCalls", ["appstorage", "CALL_MAX_AGE_HOURS", function (appstorage, CALL_MAX_AGE_HOURS) { 'use strict';
      function DisabledCall(call) {
          this.timeCreated = new Date();
          this.id = call.id;
      }
      
      function load() {
          var disabledCalls = appstorage.getData("disabledCalls") || {};
          Object.keys(disabledCalls).forEach(function (k) {
              disabledCalls[k].timeCreated = new Date(disabledCalls[k].timeCreated);
          });
          
          var gced = gc(disabledCalls);
          return gced;
      }
      
      function save(disabledCalls) {
          appstorage.setData("disabledCalls", disabledCalls);
      }
      
      function gc(disabledCalls) {
          var newDisabledCalls = {};
          var now = new Date();
          var maxAgeHours = CALL_MAX_AGE_HOURS;
          var changed = false;
          Object.keys(disabledCalls).forEach(function (k) {
              var call = disabledCalls[k];
              
              var callAgeHours = (now - call.timeCreated) / 1000 / 3600;
              if (callAgeHours < maxAgeHours) {
                  newDisabledCalls[k] = call;
              } else {
                  changed = true;
              }
          });
          
          if (changed) {
              save(newDisabledCalls);
          }
          
          return newDisabledCalls;
      }
      
      var service = {
          isDisabled: function (call) {
              var disabledCalls = load();
              
              return typeof disabledCalls[call.id] !== "undefined";
          },
          
          disable: function (call) {
              var disabledCalls = load();
              disabledCalls[call.id] = new DisabledCall(call);
              save(disabledCalls);
          }
      };
  
      return service;
  }]);

angular.module("openCtiApp")
    .factory("ringout", ["callMonitor", "utils", "settingsService", "logging", "clicktodialContext", function(callMonitor, utils, settingsService, logging, clicktodialContext) { 'use strict';
        var log = logging("ringout");

        var __inProgress = false;

        function subscribeToCallMonitoringEvents() {
            callMonitor.execute(function (cm) {
                cm.on(cm.events.ringoutUpdateError, function () {
                    //TODO
                });
                cm.on(cm.events.ringoutUpdated, function (rng) {
                    __inProgress = rng.status && rng.status.callStatus === 'InProgress';
                });
            });
        }

        subscribeToCallMonitoringEvents();

        callMonitor.onDestroyed(subscribeToCallMonitoringEvents);

        return {
            start: function(toNo, context) {
                var self = this;

                if (context) {
                    // make sure that only this particular SF record will shown in the Activity Log drop-downs
                    // but not the all matching records with the same phone number
                    clicktodialContext.put(toNo, context);
                } else {
                    clicktodialContext.remove(toNo);
                }

                var settings = settingsService.get();

                var fromNumber = utils.normalizeNumber(settings.directNumber);
                var toNumber = utils.normalizeNumber(toNo);

                if (fromNumber === "") {
                    // TODO localize
                    throw new Error("In order to make an out bound call, you need to save your direct phone number under settings");
                } else if (toNumber === "") {
                    // TODO localize
                    throw new Error("You didn't specify the number to call to or the number is incorrect");
                } else {

                    var promptToPress1 = settings.promptToPress;

                    log('Ringout to ' + toNumber + ' from ' + fromNumber);

                    callMonitor.execute(function(cm) {
                        self.fromNumber = fromNumber;
                        self.toNumber = toNumber;
                        cm.startRingout(fromNumber, toNumber, promptToPress1);
                    });
                }
            },
            inProgress: function () {
                return __inProgress;
            },
            fromNumber: '',
            toNumber: ''
        }
    }]);
angular.module( 'openCtiApp' ).factory( 'settingsService', ["$rootScope", "appstorage", "logging", function( $rootScope, appstorage, logging )
{
	'use strict';

	var log = logging( 'settings-service' );

	var settings = {};
	var sPrefix = 'settings-';
	var uPrefix = 'currentuser-num';
	var extPrefix = 'currentuser-ext';
	var username = appstorage.getData( uPrefix ) || 'anonymous';
	var eventScope = $rootScope.$new();

	function saveSettings()
	{ 
		appstorage.setData( sPrefix + username, settings ); 
		eventScope.$broadcast( 'settings.updated' );
	}

	return {
		"isEmptySettings": function ()
		{
			var isEmpty = true;
			for( var k in settings )isEmpty = false;
			if( isEmpty )log( 'settings are empty' );
			return isEmpty;
		},

		"setCurrentUser": function( uName, extension )
		{
			appstorage.setData( uPrefix, uName );
			appstorage.setData( extPrefix, extension );
			username = uName;
			
			log( username, 'is set as current user' );
		},

		"getCurrentUser": function()
		{
			return { 'username': appstorage.getData(uPrefix), 'extension': appstorage.getData(extPrefix) };
		},

		"loadSettings": function()
		{
			settings = appstorage.getData( sPrefix + username ) || {};
			if( typeof settings.lastLoginTime !== 'undefined' )
				settings.lastLoginTime = new Date( settings.lastLoginTime );

			log( 'settings loaded for', username );
		},

		"get": function(){ return angular.copy( settings ); },

		"set": function( newSettings )
		{
			for( var k in newSettings )settings[ k ] = angular.copy( newSettings[k] );
			saveSettings();

			log( 'settings saved for', username );
		},

		"clear": function()
		{
			settings = {};
			saveSettings();
		},

		"setOne": function( name, value )
		{
			settings[ name ] = angular.copy( value );
			saveSettings();
		},

		"getOne": function( name )
		{
			return settings[ name ];
		},

		"onSettingsUpdated": function( listener, flags )
		{
			if( typeof listener == 'function' )
				eventScope.$on( 'settings.updated', function(){ listener( angular.copy( settings ) ); } );
		}
	};
}]);

angular.module("openCtiApp")
    .factory("activeCalls", ["appstorage", "settingsService", "logging", "LOCAL_SERVER_COMPENSATION_MINUTES", function (appstorage, settingsService, logging, LOCAL_SERVER_COMPENSATION_MINUTES) { 'use strict';
        var log = logging("active-calls");
        
        var storageName = "rcActiveCalls";
        
        var service = {
            loadActiveCalls: function (callCallback) {
                var settings = settingsService.get();
                
                var serverTimeDiffCompensationMinutes = LOCAL_SERVER_COMPENSATION_MINUTES;
                
                var activeCallsFromStorage = appstorage.getData(storageName);
                log("activeCalls loaded", angular.copy(activeCallsFromStorage));

                var activeCalls = [];

                if (typeof activeCallsFromStorage !== "undefined") {
                    Object.keys(activeCallsFromStorage).forEach(function (k) {
                        var call = CallInfo.fromStored(activeCallsFromStorage[k]);
                        
                        var fromLastLoginMinutes = (call.startTime - settings.lastLoginTime) / 1000 / 60;
                        if (fromLastLoginMinutes > 0 || -fromLastLoginMinutes <= serverTimeDiffCompensationMinutes) {
                            callCallback && callCallback(call);

                            activeCalls.push(call);
                        } else {
                            log("call skipped", call);
                        }
                    });
                }

                return activeCalls;
            },
            
            saveActiveCalls: function (activeCalls) {
                log("activeCalls saved", angular.copy(activeCalls));
                appstorage.setData(storageName, activeCalls);
            },
            
            clear: function () {
                appstorage.setData(storageName, []);
                log("cleared");
            }
        };
        
        return service;
    }]);


angular.module('openCtiApp')
    .factory("sfSupport", ["settingsService", "$q", "logging", "rcCore", function(settingsService, $q, logging, rcCore) { 'use strict';
        var log = logging("sf-support");
        var error = log.error;
    
        var service = {
            check: function() {
                var settings = settingsService.get();

                if (settings.salesforceSupport === null) {
                    var defer = $q.defer();

                    rcCore.get().getPlatform().apiCall({
                        url: "/account/~/service-info",
                        success: function(account) {
                            var sfFeatureEnabled = false;
                            if (account && account.serviceFeatures) {
                                account.serviceFeatures.forEach(function(feature) {
                                    if (feature.featureName === "SalesForce") {
                                        sfFeatureEnabled = feature.enabled;
                                    }
                                });
                            }

                            log("sfFeatureEnabled", sfFeatureEnabled);
                            settings.salesforceSupport = sfFeatureEnabled;
                            settingsService.set(settings);

                            defer.resolve(settings.salesforceSupport);
                        },

                        error: function (e) {
                            error("Can't get service-info", e);
                            defer.reject(e);
                        }
                    });
                    
                    return defer.promise;
                } else {
                    return $q.when(settings.salesforceSupport);
                }
            },
            
            reset: function () {
                var settings = settingsService.get();
                settings.salesforceSupport = null;
                settingsService.set(settings);
            }
        };

        return service;
    }]);

/**
 * Usage:
 * ```js
 *   
 *   // Obtain immediately or wait and check (every 1000ms) for mutex and asynchronously run the code
 *   mutex.run("myMutex", function () {
 *      console.debug("Inside mutex-guarded code");
 *   }, 1000);
 *   
 * ```
 */
angular.module('openCtiApp')
    .factory("mutex", ["tabrpc", "logging", function(tabrpc, logging) { 'use strict';
        var log = logging("mutex");
    
        var expirationTimeMs = 10000;

        var locks = {};

        tabrpc.registerCommand("lock", function(fromWindowId, toWindowId, lockName) {
            if (!locks[lockName]
                || locks[lockName].ownerId === fromWindowId
                || (new Date()) - locks[lockName].timeCreated > expirationTimeMs) {

                locks[lockName] = {ownerId: fromWindowId, timeCreated: new Date()};
                return true;
            } else {
                return false;
            }
        });

        tabrpc.registerCommand("unlock", function(fromWindowId, toWindowId, lockName) {
            if (locks[lockName] && locks[lockName].ownerId === fromWindowId) {
                delete locks[lockName];
                return true;
            } else {
                return false;
            }
        });

        var service = {
            run: function(name, task, retryDelayMs) {
                retryDelayMs = retryDelayMs || 500;

                tabrpc.sendToMainWindow("lock", name).then(function(lockObtained) {
                    if (lockObtained) {
                        try {
                            log("Lock obtained", name);
                            task();
                        } finally {
                            tabrpc.sendToMainWindow("unlock", name).then(function(lockReleased) {
                                log("Lock released " + (lockReleased ? "successfully" : "failed"), name);
                            });
                        }
                    } else {
                        log("Can't obtain lock. Scheduling retry", name);
                        setTimeout(function() {
                            service.run(name, task);
                        }, retryDelayMs);
                    }

                });
            }
        };

        return service;
    }]);
/**
 * Usage:
 * ```js
 *   
 *   // Run task (identified by unique ID) only in one window/tab
 *   mutex.run(taskId, function () {
 *      console.debug("Only one tab should run this");
 *   });
 *   
 * ```
 */
angular.module('openCtiApp')
    .factory("mutex2", ["logging", function(logging) { 'use strict';
        var log = logging("mutex2");
        
        var thisWindowId = (new Date()).getTime().toString() + Math.random();
        log("thisWindowId", thisWindowId);
        
        var prefix = "mutex2_";
        var gcTimeoutMs = 60000;
        var gcPeriodMs = 2000;
        var defaultDelayMs = 100;
        
        function serialize(taskDef) {
            return angular.toJson(taskDef);
        }
        
        function unserialize(taskJson) {
            var taskDef = angular.fromJson(taskJson);
            if (taskDef && taskDef.timeCreated) {
                taskDef.timeCreated = new Date(taskDef.timeCreated);
            }
            
            return taskDef;
        }
        
        function gc() {
            for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                if (key !== null) {
                    if (key.match("^" + prefix)) {
                        var taskDef = unserialize(window.localStorage[key]);
                        if (new Date() - taskDef.timeCreated > gcTimeoutMs) {
                            delete window.localStorage[key];
                        }
                    }
                }
            }
        }
        
        function key(taskId) {
            return prefix + taskId;
        }
        
        window.setInterval(gc, gcPeriodMs);

        var service = {
            run: function(taskId, task, delayMs) {
                delayMs = delayMs || defaultDelayMs;

                if (window.localStorage[key(taskId)] === undefined) {
                    window.localStorage.setItem(key(taskId), serialize({ id: thisWindowId, timeCreated: new Date() }));
                    setTimeout(function() {
                        var taskDef = unserialize(window.localStorage.getItem(key(taskId)));
                        if (taskDef.id === thisWindowId) {
                            log("Executing task", taskId);
                            task();
                        } else {
                            log("Task has already been done", taskId);
                        }

                    }, delayMs);
                } else {
                    log("Task has already been done", taskId);
                }
            }
        };

        return service;
    }]);
angular.module("openCtiApp")
    .factory("clicktodialContext", ["utils", "CALL_MAX_AGE_HOURS", "gcableStorageFactory", function(utils, CALL_MAX_AGE_HOURS, gcableStorageFactory) { 'use strict';
        var gcableStorage = gcableStorageFactory("clicktodialContext2", 
            1000 * 60 * 60 * CALL_MAX_AGE_HOURS, 
            function (payload) { return payload; });

        var service = {
            get: function(phoneNumber) {
                return gcableStorage.get(utils.normalizeNumber(phoneNumber));
            },
            
            put: function(phoneNumber, context) {
                return gcableStorage.put(utils.normalizeNumber(phoneNumber), context);
            },
            
            remove: function(phoneNumber) {
                return gcableStorage.remove(utils.normalizeNumber(phoneNumber));
            }
        };

        return service;
    }]);

angular.module("openCtiApp")
    .factory("gcableStorageFactory", ["appstorage", "logging", function(appstorage, logging) { 'use strict';
        var log = logging("gcable-storage-factory");

        function Gcable() {
            this.timeCreated = null;
            this.payload = null;
        }
        
        Gcable.prototype.reset = function () {
            this.timeCreated = new Date();
        };
        
        Gcable.load = function (loaded, fromLoaded) {
            var result = new Gcable();
            
            if (loaded.timeCreated !== null) {
                result.timeCreated = new Date(loaded.timeCreated);
            }
            
            result.payload = fromLoaded(loaded.payload);
            
            return result;
        };
        
        return function (storageKey, maxAgeMs, fromLoaded) {
            function load() {
                var entries = {};
                
                var rawEntries = appstorage.getData(storageKey) || {};
                Object.keys(rawEntries).forEach(function(k) {
                    entries[k] = Gcable.load(rawEntries[k], fromLoaded);
                });

                var gced = gc(entries);
                return gced;
            }

            function save(entries) {
                appstorage.setData(storageKey, entries);
            }

            function gc(entries) {
                var newEntries = {};
                var now = new Date();
                var changed = false;
                Object.keys(entries).forEach(function(k) {
                    var entry = entries[k];

                    if (now - entry.timeCreated < maxAgeMs) {
                        newEntries[k] = entry;
                    } else {
                        changed = true;
                    }
                });

                if (changed) {
                    save(newEntries);
                }

                return newEntries;
            }

            var service = {
                get: function(key) {
                    var entries = load();

                    var result = entries[key];
                    if (typeof result !== "undefined") {
                        return result.payload;
                    } else {
                        return null;
                    }
                },

                put: function(key, payload) {
                    var entries = load();
                    
                    var entry = new Gcable();
                    entry.reset();
                    entry.payload = payload;
                    
                    entries[key] = entry;
                    
                    save(entries);
                },

                remove: function(key) {
                    var entries = load();
                    if (typeof entries[key] !== "undefined") {
                        log("removed", key);
                        delete entries[key];
                        save(entries);
                    }
                }
            };
            
            return service;
        };
    }]);

angular.module("openCtiApp")
    .factory("otherLegs", ["CALL_MAX_AGE_HOURS", "gcableStorageFactory", function (CALL_MAX_AGE_HOURS, gcableStorageFactory) { 'use strict';
        return gcableStorageFactory("otherLegs", 
            1000 * 60 * 60 * CALL_MAX_AGE_HOURS, 
            function (payload) { return payload; });
    }]);

angular.module("openCtiApp")
    .factory("sfCache", ["CALL_MAX_AGE_HOURS", "gcableStorageFactory", function (CALL_MAX_AGE_HOURS, gcableStorageFactory) { 'use strict';
        var gcableStorage = gcableStorageFactory("sfCache", 
            1000 * 60 * 60 * CALL_MAX_AGE_HOURS, 
            function (payload) { return payload; });
            
        var service = {
            get: function(call) {
                var id = call.id || call.presenceId;
                
                if (id) {
                    return gcableStorage.get(id);
                } else {
                    return null;
                }
            },
            
            put: function(call, context) {
                var id = call.id || call.presenceId;
                
                if (id) {
                    return gcableStorage.put(id, context);
                }
            },
            
            remove: function(phoneNumber) {
                var id = call.id || call.presenceId;
                
                if (id) {
                    return gcableStorage.remove(id);
                }
            }
        };
        
        return service;
    }]);

angular.module("openCtiApp")
    .factory("messagesService", ["logging", "$q", "utils", "rcPlatform", "settingsService", "loginService", "$rootScope", "rcCore", "desktopNotifications", "notificationService", "MESSAGES_MAX_AGE_HOURS", "MESSAGE_NOTIFICATION_ICON", "MESSAGE_NOTIFICATION_HIDE_TIME", "$location", "$routeParams", "$timeout", "subscriptionHelper", function (logging, $q, utils, rcPlatform, settingsService, loginService,
                                          $rootScope, rcCore, desktopNotifications, notificationService,
                                          MESSAGES_MAX_AGE_HOURS, MESSAGE_NOTIFICATION_ICON, MESSAGE_NOTIFICATION_HIDE_TIME,
                                          $location, $routeParams, $timeout, subscriptionHelper)
    {
        'use strict';

        var log = logging("messages-service");

        var observable = rcCore.get().getObservable();
        var events = {
            messageUpdate: "messageUpdate", messageCountUpdate: "messageCountUpdate"
        };

        var messages = [], messagesIndex = {}, messagesConversationIndex = {};

        function reset() {
            messages = [];
            messagesIndex = {};
            messagesConversationIndex = {};
            __messageSync = null;
            __conversationSync = {};
            __voicemailCount = __faxCount = __textCount = 0;
        }

        reset();

        var msgErrors =
        {
            'phoneInvalid': "Your direct phone number is invalid or empty",
            'extInvalid': "Your extension number is invalid or empty",
            'recpInvalid': "Recipient number is invalid",
            'recpEmpty': "Recipient number is empty",
            'textEmpty': "Text is empty",
            'textInvalid': "Text is too big (max 160 characters)",
            'recpOfDifferentTypes': 'Only extension numbers can be grouped into one conversation'
        };

        function subscribe() {
            subscriptionHelper.onMessageUpdate(function(msg) {
                if (msg.body.changes) {
                    var updateEvents = msg.body.changes.map(function (rawEvent) {
                        return MessageUpdateEvent.fromApi(rawEvent);
                    });

                    log('Message event', updateEvents);
                    $timeout(function () {
                        observable.emit(events.messageUpdate, updateEvents);
                    });
                }
            });
        }

        loginService.onLogin(subscribe);
        loginService.onLogout(reset);


        function messageIsAcceptable(message) {
            return (message.type !== "Fax" || message.direction === "Inbound") // do not show outbound faxes
                    && (!message.isDeleted()); // do not show deleted messages
        }

        var __conversationSync = {};
        function createLocalConversation(id) {
            if (!__conversationSync[id]) {
                __conversationSync[id] = rcPlatform.api.synchronizer('/account/~/extension/~/message-sync', {
                    conversationId: id,
                    dateFrom: new Date(Date.now() - MESSAGES_MAX_AGE_HOURS * 3600 * 1000).toISOString()
                });
                __conversationSync[id].mapToResults(Message.fromApi);
            }
            return __conversationSync[id];
        }

        var __messageSync = null;
        function createLocalMessages() {
            if (!__messageSync) {
                __messageSync = rcPlatform.api.synchronizer('/account/~/extension/~/message-sync', {
                    dateFrom: new Date(Date.now() - MESSAGES_MAX_AGE_HOURS * 3600 * 1000).toISOString()
                });
                __messageSync.mapToResults(Message.fromApi);
            }
            return __messageSync;
        }

        var __voicemailCount, __faxCount, __textCount;
        function calculateCounts() {
            __textCount = __voicemailCount = __faxCount = 0;
            __messageSync.results.forEach(function(message) {
                if (message.isInbound() && !message.isRead() && !message.isDeleted()) {
                    if (message.isText()) {
                        __textCount++;
                    }
                    if (message.isFax()) {
                        __faxCount++;
                    }
                    if (message.isVoicemail()) {
                        __voicemailCount++;
                    }
                }
            });
            observable.emit( events.messageCountUpdate, { "voice": __voicemailCount, "fax": __faxCount, "text": __textCount, "all": __voicemailCount+__faxCount+__textCount } );

        }


        var service = {
            getOffline: function () {
                return messages;
            },

            getMessages: function(notify) {
                var synchronizer = createLocalMessages();
                return synchronizer.sync()
                    .then(function(result) {
                        log ('getMessages:', result.syncRecords);

                        //recalc counts if there are new or updated messages
                        if (result.syncRecords.length > 0) {
                            calculateCounts();
                        }

                        //show notification on new messages (result.delta)
                        result.delta.forEach(function(message) {
                            if (!message.isDeleted()) {
                                notify === true && showNotification(message);
                            }
                        });

                        //merge messages conversation or delete the deleted ones
                        result.syncRecords.forEach(function (message) {
                            var found = false;

                            for (var i = 0; i < messages.length; i++) {
                                var existingMessage = messages[i];

                                if (existingMessage.id === message.id) {
                                    if (message.isDeleted()) {
                                        messages.delete(i);
                                        messagesIndex[message.id] !== undefined && delete messagesIndex[message.id];
                                    }
                                    else {
                                        angular.extend(existingMessage, message);
                                    }
                                    found = true;
                                } else if (message.conversationId && existingMessage.conversationId
                                    && message.conversationId === existingMessage.conversationId) {

                                    if (message.creationTime > existingMessage.creationTime && !message.isDeleted()) {
                                        angular.extend(existingMessage, message);
                                        messagesIndex[message.id] = i;
                                        messagesConversationIndex[message.conversationId] = i;
                                        existingMessage.type = 'Conversation';
                                    }
                                    found = true;
                                }
                            }

                            if (!found && messageIsAcceptable(message)) {
                                messages.push(message);
                                messagesIndex[message.id] = messages.length - 1;
                            }
                        });

                        return messages;
                    });
            },

            getConversation: function (id) {
                var synchronizer = createLocalConversation('' + id);
                return synchronizer.sync().then(function(result) {
                    log ('getConversation, delta: ', result.delta);
                    return synchronizer.results;
                });
            },

            getLocalConversation: function (id) {
                return createLocalConversation('' + id).results;
            },

            addLocalMessage: function(message) {
                createLocalMessages();
                if (!angular.isArray(message)) message = [message];
                message.forEach(function(msg) {
                    if (msg.conversationId) {
                        var index = messagesConversationIndex[msg.conversationId];
                        if (index) messages[index] = msg;
                    }
                    else {
                        messages.push(msg);
                    }
                });
            },

            addLocalConversationMessage: function (id, message) {
                createLocalConversation(id);
                __conversationSync[id] && __conversationSync[id].addRecord(message);
            },

            getMessage: function (id) {
                return rcPlatform.api.get('/account/~/extension/~/message-store/' + decodeURIComponent(id))
                    .then(function(result) {
                        log("getMessage", result);
                        return Message.fromApi(result);
                    });
            },

            deleteMessage: function(id) {
                return rcPlatform.api.delete('/account/~/extension/~/message-store/' + decodeURIComponent(id))
                    .then(function(result) {
                        log("deleteMessage", id, result);
                        return result;
                    });
            },

            updateMessage: function(id, status, arr) {
                var UPDATE_MESSAGE_ONCE_COUNT = 50;

                if (!angular.isArray(id)) id = [id];

                var toUpdate = id.slice(0, UPDATE_MESSAGE_ONCE_COUNT);
                return rcPlatform.api.put('/account/~/extension/~/message-store/' + decodeURIComponent(toUpdate.join(',')), {
                    post: {readStatus: status}
                }, toUpdate.length).then(function(data) {
                    var arr = arr || [];
                    if (!angular.isArray(data)) arr.push(Message.fromApi(data));
                    else {
                        //if batch response
                        for (var i=0; i<data.length; i++) {
                            var obj = data[i];
                            if (obj.status && obj.status === 200) {
                                arr.push(Message.fromApi(obj.data));
                            }
                        }
                    }

                    var left = id.slice(UPDATE_MESSAGE_ONCE_COUNT);
                    if (left.length > 0) {
                        //new portion
                        return service.updateMessage(left, status, arr);
                    }
                    else {
                        //resolved finally
                        id.forEach(function(id) {
                            var index = messagesIndex[id];
                            if (index !== undefined) {
                                messages[index].readStatus = status;
                            }
                        });

                        __messageSync && __messageSync.updateRecord(arr);

                        return arr;
                    }
                });
            },

            readMessage: function(id) {
                return service.updateMessage(id, 'Read')
                    .then(function(messages) {
                        calculateCounts();
                    });
            },

            unreadMessage: function(id) {
                return service.updateMessage(id, 'Unread')
                    .then(function(messages) {
                        calculateCounts();
                    });
            },

            sendPager: function( toExtensionNumber, text, replyOnMessageId )
            {
                var sendFrom = settingsService.get().extensionNumber;
                if (!angular.isArray(toExtensionNumber)) toExtensionNumber = [toExtensionNumber];
                var sendTo = toExtensionNumber.map(function(val) {
                    return {'extensionNumber': utils.toDigitsOnly(val)};
                });
                text = text.trim();

                if( sendFrom == undefined )throw new Error( msgErrors.extInvalid );
                if( sendFrom.length === 0 )throw new Error( msgErrors.extInvalid );
                if( sendTo.length === 0 && toExtensionNumber.length !== 0 )throw new Error( msgErrors.recpInvalid );
                if( sendTo.length === 0 && toExtensionNumber.length === 0 )throw new Error( msgErrors.recpEmpty );
                if( text.length === 0 )throw new Error( msgErrors.textEmpty );
                if( text.length > 160 )throw new Error( msgErrors.textInvalid );

                return rcPlatform.api.post('/account/~/extension/~/company-pager/', {
                    'from': { 'extensionNumber': sendFrom },
                    'to': sendTo,
                    'text': text,
                    'replyOn': replyOnMessageId || undefined
                });

            },

            sendSms: function( toPhoneNumber, text ) {
                var sendFrom = utils.normalizeNumber( settingsService.get().directNumber );
                var sendTo = utils.toDigitsOnly( toPhoneNumber );
                text = text.trim();

                if( sendFrom == undefined )throw new Error( msgErrors.phoneInvalid );
                if( sendFrom.length === 0 )throw new Error( msgErrors.phoneInvalid );
                if( sendTo.length === 0 && toPhoneNumber.length !== 0 )throw new Error( msgErrors.recpInvalid );
                if( sendTo.length === 0 && toPhoneNumber.length === 0 )throw new Error( msgErrors.recpEmpty );
                if( text.length === 0 )throw new Error( msgErrors.textEmpty );
                if( text.length > 160 )throw new Error( msgErrors.textInvalid );

                return rcPlatform.api.post('/account/~/extension/~/sms/', { 'from': { 'phoneNumber': sendFrom }, 'to': [{ 'phoneNumber': sendTo }], 'text': text });

            },

            sendTextMessage: function (recipients, text, replyOnMessageId, group) {
                var d = $q.defer();

                function success(messages) {
                    var message = angular.isArray(messages) ? messages.map(Message.fromApi) : [Message.fromApi(messages)];
                    service.addLocalMessage(message);
                    message.forEach(function(msg) {
                        //we're doing this, because conversationId may differ
                        msg.conversationId && service.addLocalConversationMessage(msg.conversationId, msg);
                    });
                    d.resolve(message);
                }

                function error(e) {
                    d.reject(e);
                }

                try {
                    recipients = angular.isArray(recipients) ? recipients : [recipients];

                    if (group) {
                        service.sendPager(recipients.map(function(val) {
                            if (val.type !== 'extensionNumber') {
                                throw new Error(msgErrors.recpOfDifferentTypes);
                            }
                            return val.number;
                        }), text, replyOnMessageId).then(success, error);
                    }
                    else {
                        var promises = [];
                        recipients.forEach(function (recipient) {
                            if (recipient.type === "phoneNumber") {
                                promises.push(
                                    service.sendSms(recipient.number, text));
                            } else if (recipient.type === "extensionNumber") {
                                promises.push(
                                    service.sendPager(recipient.number, text, replyOnMessageId));
                            }
                        });
                        $q.all(promises).then(success, error);
                    }
                } catch (e) {
                    d.reject(e);
                }

                return d.promise;
            },

            getNewVoicemailCount: function () {
                return __voicemailCount;
            },

            getNewTextCount: function () {
                return __textCount;
            },

            getNewFaxCount: function () {
                return __faxCount;
            },

            getNewAllCount: function(){ return __faxCount + __textCount + __voicemailCount; },

            onMessageUpdate: function (handler) {
                return observable.on(events.messageUpdate, handler);
            },

            onMessageCountUpdate: function (handler) {
                return observable.on(events.messageCountUpdate, handler);
            },

            offMessageCountUpdate: function (handler) {
                return observable.off(events.messageCountUpdate, handler);
            },

            offMessageUpdate: function (handler) {
                return observable.off(events.messageUpdate, handler);
            }
        };

        //setting auto-update of local messages for global accessibility
        service.onMessageUpdate(function(e) {
            service.getMessages(true);
        });

        function showNotification(message) {
            if (settingsService.getOne('desktopNotificationsEnabled')) {
                if (/conversation\/\d+/.test($location.path()) && $routeParams['id'] ==  message.conversationId) return;

                if (message && message.isInbound() && !message.isRead()) {
                    if (message.isText()) {
                        desktopNotifications.show('Message from ' + message.getAuthorNameOrNumber(), message.subject);
                    }

                    if (message.isFax()) {
                        desktopNotifications.show('Fax from ' + message.getAuthorNameOrNumber(), 'Number of pages: ' + message.faxPageCount);
                    }

                    if (message.isVoicemail()) {
                        desktopNotifications.show('Voicemail from ' + message.getAuthorNameOrNumber(), '');
                    }
                }
            }
        }
        desktopNotifications.setDefaultCloseTime(MESSAGE_NOTIFICATION_HIDE_TIME);
        desktopNotifications.setDefaultIcon(MESSAGE_NOTIFICATION_ICON);

        return service;
    }]);


angular.module("openCtiApp")
    .factory("contactsService", ["logging", "$q", "loginService", "rcCore", "CONTACTS_PER_PAGE", "EXTENSIONS_PER_PAGE", function (logging, $q, loginService, rcCore,
                                          CONTACTS_PER_PAGE, EXTENSIONS_PER_PAGE) {
        'use strict';

        var log = logging("contacts-service");

        var platform = rcCore.get().getPlatform();

        var synced = {};

        var syncInfo, contacts, extensions;
        var contactsDefer, extensionsDefer;

        function init() {
            syncInfo = null;
            contacts = [];
            extensions = [];

            synced.personal = false;
            synced.company = false;

            contactsDefer = $q.defer();
            extensionsDefer = null;
        }

        init();

        loginService.onLogout( function(){ init(); });
        loginService.onLogin(function(){ getCompanyContacts(); });

        function queryPersonalContacts(query)
        {
            var defer = $q.defer();
            var all = [];

            query.trim().split(' ').forEach( function( q )
            {
                var contacts = [];
                var d = $q.defer();
                all.push( d.promise );

                platform.apiCall
                ({
                    'url': '/account/~/extension/~/address-book/contact',
                    'get': {'startsWith': q },
                    'error': function (e) {
                        d.reject(e);
                    },
                    'success': function( response )
                    {
                        if (!response.records )
                        {
                            d.resovle([]);
                            return;
                        }

                        response.records.forEach(function (entry)
                        {
                            contacts.push(Contact.fromApi(entry));
                        });

                        d.resolve(contacts.filter(function (entry)
                        {
                            return entry.hasAPhoneOrExtension();
                        }));
                    }
                });

            });

            $q.all( all ).then( function( res )
            {
                var flat = [];
                res.forEach( function( entry ){ flat.push.apply( flat, entry ) } );

                flat = flat.filter( filterByName, query );
                var map = flat.map( function( entry ){ return entry.trackingId; });
                var unique = map.filter( function( e, i, a ){ return i == a.indexOf( e ); });

                var ret = [];
                unique.forEach( function( entry ){ ret.push( flat[ map.indexOf( entry ) ] ); } );

                defer.resolve( ret );
            } );

            return defer.promise;

        }


        function sync() {
            var syncType = 'FSync';
            var syncToken;

            if (syncInfo) {
                syncType = 'ISync';
                syncToken = syncInfo.syncToken;
            }

            var d = $q.defer();

            var doSync = function (syncType, syncToken, pageId) {
                var get = {
                    syncType: syncType,
                    perPage: CONTACTS_PER_PAGE
                };
                if (syncToken) {
                    get.syncToken = syncToken;
                }
                if (pageId) {
                    get.pageId = pageId;
                }

                platform.apiCall({
                    url: '/account/~/extension/~/address-book-sync',
                    get: get,
                    success: function (result) {
                        log("getContact", result);

                        syncInfo = result.syncInfo;

                        if (result.records) {
                            // merge new/changed/deleted accounts
                            result.records.forEach(function (rawRecord) {
                                var contact = Contact.fromApi(rawRecord);

                                var found = false;
                                for (var i = 0; i < contacts.length; i++) {
                                    var existingContact = contacts[i];

                                    if (existingContact.id === contact.id) {
                                        angular.extend(existingContact, contact);
                                        found = true;
                                    }
                                }

                                if (!found) {
                                    contacts.push(contact);
                                }
                            });

                            // filter deleted contacts
                            contacts = contacts.filter(function (contact) {
                                return !contact.isDeleted();
                            }).filter(function (contact) {
                                return contact.hasAPhoneOrExtension();
                            });
                        }

                        if (result.nextPageId) {
                            doSync(syncType, syncToken, result.nextPageId);
                        } else {
                            d.resolve(contacts);
                        }
                    },
                    error: function (e) {
                        d.reject(e);
                    }
                });
            };

            doSync(syncType, syncToken);

            d.promise.then(function () {
                synced.personal = true;
            });

            return d.promise;
        }

        function getCompanyContacts() {
            if (extensionsDefer === null) {
                var d = extensionsDefer = $q.defer();

                var newExtensions = [];

                var doFetch = function (page) {
                    var get = {
                        page: page,
                        perPage: EXTENSIONS_PER_PAGE
                    };

                    platform.apiCall({
                        url: '/account/~/extension/',
                        get: get,
                        success: function (result) {
                            log("getCompanyContacts", result);

                            result.records.filter(function (extension) {
                                return extension.status === "Enabled" && extension.type === "User";
                            }).map(function (rawExtension) {
                                return Contact.fromExtensionApi(rawExtension);
                            }).filter(function (contact) {
                                return contact.hasAPhoneOrExtension();
                            }).forEach(function (extension) {
                                newExtensions.push(extension);
                            });

                            if (result.paging.totalPages !== page) {
                                doFetch(page + 1);
                            } else {
                                d.resolve(newExtensions);
                            }
                        },
                        error: function (e) {
                            d.reject(e);
                        }
                    });
                };

                d.promise.then(function () {
                    synced.company = true;
                    extensions = newExtensions;
                });

                doFetch(1);
            }

            return extensionsDefer.promise;
        }

        function filterById(entry) {
            if (this.id)return entry.id == this.id;
            if (this.trackingId)return entry.trackingId == this.trackingId;
            if (this.extensionNumber)return entry.extensionNumber == this.extensionNumber;
            if (this.phoneNumber)return entry.hasPhone(this.phoneNumber);
        }

        function filterByName(entry) {
            var fullname = [ entry.lastName, entry.firstName ];
            var refullname = fullname.slice(0).reverse();

            var query = this.trim().split(' ').join('').toLowerCase();
            fullname = fullname.join('').toLowerCase();
            refullname = refullname.join('').toLowerCase();

            return ( fullname.indexOf( query ) >= 0 || refullname.indexOf( query ) >= 0 );
        }

        function getFiltered(promise, filter, query) {
            var d = $q.defer();
            promise.then(function (data) {
                d.resolve(data.filter(filter, query));
            });
            return d.promise;
        }


        var service =
        {
            getContact: function (query) {
                return getFiltered(sync(), filterById, query);
            },
            getCompanyContact: function (query) {
                return getFiltered(getCompanyContacts(), filterById, query);
            },

            syncContacts: function () {
                return sync();
            },
            getCompanyContacts: function () {
                return getCompanyContacts();
            },

            queryPersonalContacts: queryPersonalContacts,
            queryCompanyContacts: function (query) {
                return getFiltered(getCompanyContacts(), filterByName, query);
            }

        };

        return service;
    }]);




/**
 * @ngdoc service
 * @name rcCallLog.CallLog
 * @description
 * # rcCallLog
 * Service for working with RC call-log via API
 */
angular.module('openCtiApp')
    .factory('rcCallLog', ["$q", "logging", "loginService", "$rootScope", "rcCore", "rcPlatform", "CALL_LOG_DAYS_COUNT", "subscriptionHelper", function ($q, logging, loginService, $rootScope, rcCore, rcPlatform, CALL_LOG_DAYS_COUNT, subscriptionHelper) {
        'use strict';

        var log = logging("call-log-service");

        var PER_PAGE = 250;

        var __callLogSync, period, dateFrom,
            records,
            synced;

        function initSync() {
            period = CALL_LOG_DAYS_COUNT * 24 * 3600 * 1000;
            dateFrom = new Date(Date.now() - (period));
            //creating synchronizer
            __callLogSync = rcPlatform.api.synchronizer('/account/~/extension/~/call-log-sync', {
                dateFrom: dateFrom.toISOString(),
                recordCount: PER_PAGE
            });
            //results mapper
            __callLogSync.mapToResults(CallLogEntry.fromApi);
            records = __callLogSync.results;
        }

        function reset() {
            records = [];
            synced = false;
            initSync();
        }

        reset();

        function sync() {
            return __callLogSync.sync()
                .then(function() {

                    records.filter(function(el) {
                        return el.startTime >= dateFrom;
                    });

                    synced = true;
                    observable.emit(events.callsUpdate,records);

                    return records;
                });
        }

        function findRecord(records, query, d) {
            var found = records.filter(function (record) {
                if (query.id) {
                    return record.id == query.id;
                } else {
                    throw new Error("Unknown query: " + JSON.stringify(query));
                }
            });

            d.resolve(found);
        }

        var observable = rcCore.get().getObservable();
        var events = { callsUpdate: "callsUpdate" };

        function subscribe() {
            subscriptionHelper.onTelephonyUpdate(function(msg) {
                if (msg.body.telephonyStatus === "NoCall") {
                    log('Presence event, "NoCall" status, performing sync()');
                    sync();
                }
            });
        }

        loginService.onLogin(subscribe);
        loginService.onLogout(reset);

        return {
            /**
             * [get: retrieve call-log from the RC via their API]
             * @param  {[number]}   [period]
             */
            get: function () {
                log ('getting call log');
                return sync();
            },

            getOffline: function () {
                return records;
            },

            getCallRecord: function (query, needSync) {
                needSync = needSync === undefined ? !synced : needSync;

                var d = $q.defer();

                if (needSync) {
                    sync().then(function () {
                        findRecord(records, query, d);
                    }, function (cause) {
                        d.reject(cause);
                    });
                } else {
                    findRecord(records, query, d);
                }

                return d.promise;
            },
            onCallsUpdate: function (handler) {
                return observable.on(events.callsUpdate, handler);
            }
        };
    }]);

angular.module("openCtiApp")
    .factory("audio", ["$rootScope", "logging", "$q", function ($rootScope, logging, $q) {
        var log = logging("audio");
        var error = log.error;

        return {
            play: function (url) {
                var d = $q.defer();

                var audio = new Audio();

                audio.volume = 1;

                audio.addEventListener("timeupdate", function (event) {
                    $rootScope.$apply(function () {
                        d.notify({
                            progress: audio.currentTime / audio.duration
                        });
                    });
                });
                audio.addEventListener("seeked", function (event) {
                    $rootScope.$apply(function () {
                        d.notify({
                            progress: audio.currentTime / audio.duration
                        });
                    });
                });
                audio.addEventListener("ended", function (event) {
                    $rootScope.$apply(function () {
                        d.resolve();
                    });
                });
                audio.addEventListener("pause", function (event) {
                    $rootScope.$apply(function () {
                        d.notify({
                            paused: true,
                            progress: audio.currentTime / audio.duration
                        });
                    });
                });
                audio.addEventListener("play", function (event) {
                    $rootScope.$apply(function () {
                        d.notify({
                            resumed: true,
                            progress: audio.currentTime / audio.duration
                        });
                    });
                });
                audio.addEventListener("error", function () {
                    log("error", audio.error);
                    $rootScope.$apply(function () {
                        d.reject(audio.error);
                    });
                });

                d.promise.stop = audio.pause.bind(audio);
                d.promise.pause = audio.pause.bind(audio);
                d.promise.resume = audio.play.bind(audio);

                d.promise.duration = function () {
                    return Math.ceil(audio.duration);
                };

                audio.src = url;
                audio.load(url);
                audio.play();

                return d.promise;
            }
        };
    }]);
'use strict';

/**
 * @ngdoc factory
 * @name yeomanRcApp.RcPlatform
 * @description
 * # RcPlatform
 * RCSDK platform wrapper
 */

angular.module('openCtiApp')
    .factory('rcPlatform', ["$q", "$window", "loginService", "uuid", "rcCore", "logging", function($q, $window, loginService, uuid, rcCore, logging) {

        var platform = rcCore.get().getPlatform();

        var log = logging('rc-platform');

        function resolve(data) {
            var d = $q.defer();
            d.resolve(data);
            return d.promise;
        }

        var __cache = {};

        var f = {
            instance: platform,
            apiCall: function (url, options, cached) {
                cached = !!cached;
                var deferred = $q.defer();

                if (cached === true
                        && __cache[options.url]
                        && angular.equals(__cache[options.url].options, options)) {
                    deferred.resolve(__cache[options.url].data);
                }
                else {
                    var params = {
                        url: url,
                        method: options.method || 'GET',
                        success: function (data) {
                            deferred.resolve(data);
                        },
                        error: function (e, data ) {
                            if( data )e.description = data.description;
                            deferred.reject(e);
                        }
                    };

                    ["headers", "get", "post"].forEach(function (param) {
                        if (options[param] !== undefined) {
                            params[param] = options[param];
                        }
                    });

                    platform.apiCall(params).then(function(data) {
                        cached && (__cache[options.url] = {
                            options: options,
                            data: data
                        });
                    });
                }

                return deferred.promise;

            },
            isAuthorized: function () {
                var deferred = $q.defer();
                platform.isAuthorized().then(function() {
                    deferred.resolve();
                }).catch(function(e){
                    deferred.reject(e);
                });
                return deferred.promise;
            },
            api: {
                'get': function (url, params, options) {
                    var opt = angular.extend(params !== undefined ? {get: params} : {}, options || {});
                    return f.apiCall(url, opt);
                },
                'post': function (url, params, options) {
                    var opt = angular.extend({post: params}, options || {method: 'POST'});
                    return f.apiCall(url, opt);
                },
                'delete': function (url, options) {
                    return f.apiCall(url, angular.extend(options || {}, {method: 'DELETE'}));
                },
                'put': function (url, options, batchCount) {
                    if (!batchCount) {
                        return f.apiCall(url, angular.extend(options || {}, {method: 'PUT'}));
                    }
                    else {
                        var boundary = uuid();
                        var postElement = JSON.stringify(options.post || {});
                        var post = '';

                        for (var i=0; i<batchCount; i++) {
                            post += '--' + boundary + '\r\n' + 'Content-Type: application/json\r\n\r\n' + postElement + '\r\n';
                        }
                        post += '--' + boundary + '--';

                        return f.apiCall(url, angular.extend(options || {}, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'multipart/mixed; boundary=' + boundary
                            },
                            post: post
                        }));
                    }
                },

                'synchronizer': function(url, params) {

                    function SyncObject (url, params) {
                        var self = this;

                        var log = logging('synchronizer');

                        self.url = url;
                        self.originalParams = params;
                        self.params = params || {};

                        self.syncType = 'FSync';
                        self.syncToken = '';
                        self.syncInfo = null;

                        self.results = [];
                        self.resultsIndex = {};
                        self.syncResults = [];

                        var __delta = [],
                            __updated = [],
                            __syncResults = [],
                            __previousResult;

                        var __promise = null;

                        self.reset = function() {
                            self.syncType = 'FSync';
                            self.syncToken = '';
                            self.syncInfo = null;
                            self.results = [];
                            self.resultsIndex = {};
                            self.syncResults = [];
                            self.params = self.originalParams;
                        };

                        self.addRecord = function (val) {
                            if (!angular.isArray(val)) val = [val];
                            val.forEach(function(value) {
                                var id = value.id;
                                self.results.push(value);
                                self.resultsIndex[id] = self.results.length -1;
                            });
                        };

                        self.updateRecord = function (val) {
                            if (!angular.isArray(val)) val = [val];
                            val.forEach(function(value) {
                                var index = self.getIndexOfRecordId(value.id);
                                if (index !== -1) {
                                    self.results[index] = value;
                                }
                            });
                        };

                        var __mapper;
                        self.mapToResults = function (fn) {
                            if (typeof(fn) === 'function') {
                                __mapper = fn;
                            }
                        };

                        self.getIndexOfRecordId = function (id) {
                            return self.resultsIndex[id] !== undefined ? self.resultsIndex[id] : -1;
                        };

                        self.getRecord = function (id) {
                            var index = self.getIndexOfRecordId(id);
                            if (index !== -1) {
                                return self.results[index];
                            }
                            return null;
                        };

                        self.__sync = function () {
                            if (self.syncInfo) {
                                self.syncType = 'ISync';
                                self.syncToken = self.syncInfo.syncToken;
                                self.params = {};
                            }

                            var get = {
                                syncType: self.syncType
                            };

                            if (self.syncToken) {
                                get.syncToken = self.syncToken;
                            }

                            angular.extend(self.params, get);

                            return f.api.get(url, self.params)
                                .then(function(result) {
                                    log('sync [' + url + ']', result);

                                    self.syncInfo = result.syncInfo;

                                    var records = angular.copy(result.records || []);

                                    if (__mapper) {
                                        records = records.map(__mapper);
                                    }

                                    records.forEach(function(record) {
                                        __syncResults.push(record);
                                        var index = self.getIndexOfRecordId(record.id);
                                        if (index === -1) {
                                            __delta.push(record);
                                            self.addRecord(record);
                                        }
                                        else {
                                            __updated.push(record);
                                            self.updateRecord(record);
                                        }
                                    });

                                    self.delta = __delta;
                                    self.updated = __updated;
                                    self.syncResults = __syncResults;
                                    __delta = [];
                                    __updated = [];
                                    __syncResults = [];
                                    __previousResult = undefined;

                                    return {
                                        records: self.results,          //instance results reference
                                        delta: self.delta,              //only new results (compared by id)
                                        updated: self.updated,          //only updated results (compared by id)
                                        syncRecords: self.syncResults   //whole sync response
                                    };
                                })
                                .catch(function() {
                                    if (self.syncType === 'ISync') {
                                        self.reset();
                                        return self.__sync();
                                    }
                                });
                        };

                        self.sync = function () {
                            __promise = __promise || self.__sync().finally(function() {
                                __promise = null;
                            });
                            return __promise;
                        };
                    }

                    return new SyncObject(url, params);
                },

                'subscription': {
                    events: {
                        notification: 'notification',
                        removeSuccess: 'removeSuccess',
                        removeError: 'removeError',
                        renewSuccess: 'renewSuccess',
                        renewError: 'renewError',
                        subscribeSuccess: 'subscribeSuccess',
                        subscribeError: 'subscribeError'
                    },
                    subscriptions: {},
                    types: {
                        presence: '/restapi/v1.0/account/~/extension/~/presence',
                        telephony: '/restapi/v1.0/account/~/extension/~/presence?detailedTelephonyState=true',
                        messages: '/restapi/v1.0/account/~/extension/~/message-store'
                    },
                    create: function(type) {
                        var self = f.api.subscription;

                        if (!angular.isArray(type)) type = [type];
                        var deferred = $q.defer();

                        var path = type.join('');
                        if (self.subscriptions[path] !== undefined) {
                            deferred.resolve(self.subscriptions[path])
                        }
                        else {
                            self.subscriptions[path] = rcCore.get().getSubscription().setEvents(type);
                            self.subscriptions[path].register()
                                .then(function() {
                                    deferred.resolve(self.subscriptions[path]);
                                })
                                .catch(function(e) {
                                    deferred.reject(e);
                                });
                        }

                        return deferred.promise;
                    },
                    remove: function(notification, async) {
                        var self = f.api.subscription;
                        var deferred = $q.defer();
                        //async is false by default
                        notification && notification.remove({async: async === undefined ? false : !!async})
                            .then(function () {
                                notification && notification.destroy();
                                for(var i in self.subscriptions) {
                                    if (self.subscriptions[i] === notification) {
                                        delete self.subscriptions[i];
                                        break;
                                    }
                                }
                                deferred.resolve();
                            })
                            .catch(function(e) {
                                deferred.reject(e);
                            });
                        return deferred.promise;
                    },
                    renew: function(notification) {
                        var deferred = $q.defer();
                        //if renew returned error then we try to subscribe again
                        notification && notification.renew().catch(function() {
                            //if renew returned error, then we aren't able to call .remove anymore because it will be rejected instantly
                            //so we try to subscribe again without being sure that the subscription is certainly deleted
                            notification.subscribe().then(function() {
                                deferred.resolve(notification);
                            }).catch(function(e) {
                                deferred.reject(e);
                            });
                        });
                        return deferred.promise;
                    }
                }
            },
            extension: {
                __cache: {},
                __promises: {},
                __get: function (url, name) {
                    if (f.extension.__cache[name]) {
                        return resolve(f.extension.__cache[name]);
                    }

                    if (!f.extension.__promises[name]) {
                        f.extension.__promises[name] = f.api.get(url)
                            .then(function(data) {
                                f.extension.__cache[name] = data;
                                delete f.extension.__promises[name];
                                return data;
                            });
                    }
                    return f.extension.__promises[name];
                },
                account: function() {
                    return f.extension.__get('/restapi/v1.0/account/~', 'account');
                },
                info: function() {
                    return f.extension.__get('/restapi/v1.0/account/~/extension/~', 'info');
                },
                features: function() {
                    return (f.extension.__cache['features'])
                        ? resolve(f.extension.__cache['features'])
                        : f.extension.info()
                        .then(function(info) {
                            f.extension.__cache['features'] = {};
                            for (var i=0; i< info.serviceFeatures.length; i++) {
                                var feature = info.serviceFeatures[i].featureName;
                                f.extension.__cache['features'][feature] = info.serviceFeatures[i];
                            }
                            return f.extension.__cache['features'];
                        });
                },
                phoneNumber: function() {
                    return f.extension.__get('/restapi/v1.0/account/~/extension/~/phone-number', 'phoneNumber');
                },
                answeringRule: function() {
                    return f.extension.__get('/restapi/v1.0/account/~/extension/~/answering-rule', 'answeringRule');
                },
                presence: function() {
                    return f.extension.__get('/account/~/extension/~/presence?detailedTelephoneState=true');
                },
                conferencing: function() {
                    return f.extension.__get('/account/~/extension/~/conferencing', 'conferencing');
                }
            }
        };

        loginService.onLogout(function() {
            f && f.extension && (f.extension.__cache = {});
        });

        return f;
    }]);

angular.module("openCtiApp")
    .factory("uuid", function () { 'use strict';
        return function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        };
    });


angular.module("openCtiApp")
    .factory("desktopNotifications", ["$window", "$q", "$timeout", "uuid", "logging", function ($window, $q, $timeout, uuid, logging) { 'use strict';
        var log = logging("desktop-notifications");

        if (!$window.Notification) {
            log ('Unfortunately your broswer does not support desktop notifications');
        }
        else {
            log ('Desktop notifications are fully supported');
        }

        var GRANTED_PERMISSION  = 'granted',
            DEFAULT_PERMISSION  = 'default',
            DENIED_PERMISSION   = 'denied';

        var DEFAULT_ICON, DEFAULT_CLOSE_TIME;

        return {
            state: {
                DEFAULT : DEFAULT_PERMISSION,
                GRANTED: GRANTED_PERMISSION,
                DENIED: DENIED_PERMISSION
            },
            support: function() {
                return 'Notification' in $window;
            },
            permission: function() {
                return Notification.permission || DEFAULT_PERMISSION;
            },
            enabled: function() {
                return this.support() && this.permission() === GRANTED_PERMISSION;
            },
            disabled: function() {
                return this.support() && this.permission() === DENIED_PERMISSION;
            },
            requestPermission: function() {
                var deferred = $q.defer();
                if (!this.support) {
                    deferred.resolve(null);
                }
                else {
                    !this.enabled()
                        ?   Notification.requestPermission(function (status) {
                                if (Notification.permission !== status) {
                                    Notification.permission = status;
                                }
                                deferred.resolve(status);
                            })
                        :   deferred.resolve(GRANTED_PERMISSION);
                }
                return deferred.promise;
            },
            create: function(title, options, closeAfter) {
                if (!this.enabled) {
                    return null;
                }
                else {
                    var notification = new Notification(title, options);
                    var closeTime = parseInt(closeAfter);
                    if (closeTime)
                        notification.onshow = function () {
                            $timeout(notification.close.bind(notification), closeTime);
                        };
                    return notification;
                }
            },
            setDefaultIcon: function (icon) {
                if (typeof(icon) === 'string') {
                    DEFAULT_ICON = icon;
                }
            },
            setDefaultCloseTime: function (time) {
                time = parseInt(time);
                if (time) {
                    DEFAULT_CLOSE_TIME = time;
                }
            },
            show: function (title, message, id, closeAfter, options) {
                return this.create(title, angular.extend(options || {}, {
                    'tag': id || uuid(),
                    'body': message,
                    'icon': DEFAULT_ICON
                }), closeAfter || DEFAULT_CLOSE_TIME);
            }
        };
    }]);


angular.module( 'openCtiApp' ).factory( 'notificationService', ["$rootScope", function( $rootScope )
{
	'use strict';

	var eventScope = $rootScope.$new( true );

	return {
		"notify": function( message, type, id, delayed )
		{ 
			eventScope.$broadcast( 'notification.updated', { "message": message, "type": type || 'info', "id": id || 'generic' } );
		},
		"onNotificationUpdated": function( listener )
		{
			if( typeof listener == 'function' )
				eventScope.$on( 'notification.updated', listener );
		}
	};
}]);

angular.module("rcCore", [])
    .provider("rcCore", function () {
        'use strict';

        var core = new RCSDK();

        var platform = core.getPlatform();

        ["authorize", "isAuthorized", "apiCall"].forEach(function (fName) {
            var oldF = platform[fName].bind(platform);
            platform[fName] = function (options) {
                var promise = oldF(options);

                if (options) {
                    if (options.success) {
                        if (fName === "apiCall") {
                            // Now we are getting the full XHR object as the parameter for the 'then' function
                            // but it used to be just data before.
                            // Adapts the new behaviour to the old one.
                            promise.then(function (xhr) {
                                options.success(xhr.data);
                            });
                        } else {
                            promise.then(options.success);
                        }
                    }

                    options.error && promise.catch(options.error);
                }

                return promise;
            }
        });

        core.getPlatform = function () {
            return platform;
        };

        var get = function () {
            return core;
        };

        this.get = get;

        this.$get = function () {
            return {
                get: get
            }
        };
    });
angular.module( 'openCtiApp' ).factory( 'sidebarService', ["$rootScope", "chromeExtensionInteraction", function( $rootScope, chromeExtensionInteraction )
{
	'use strict';

	var eventScope = $rootScope.$new();
	var sidebarExpanded = true;

	var checkCollapseDefer = chromeExtensionInteraction.isCollapsed().then( function( collapsed ){ sidebarExpanded = !collapsed; });
	
	function broadcast(){ eventScope.$broadcast( 'sidebar.trigger' ); }

	return {
		"expand": function()
		{
			sidebarExpanded = true;
			chromeExtensionInteraction.expand();
			broadcast();
		},

		"collapse": function()
		{
			sidebarExpanded = true;
			chromeExtensionInteraction.collapse();
			broadcast();
		},

		"trigger": function()
		{
			sidebarExpanded = !sidebarExpanded;
			sidebarExpanded? chromeExtensionInteraction.expand(): chromeExtensionInteraction.collapse();
			broadcast();
		},

		"isSidebarExpanded": function(){ return sidebarExpanded; },

		"onSidebarTrigger": function( listener )
		{
			if( typeof listener == 'function' )
			{
				checkCollapseDefer.then( function(){ listener( sidebarExpanded ); } );
				eventScope.$on( 'sidebar.trigger', function(){ listener( sidebarExpanded ); } );
			}
		}
	};
}]);

angular.module("openCtiApp")
    .factory("getAvatar", ["logging", "contactsService", "googleService", "$q", "$rootScope", "utils", "loginService", function (logging, contactsService, googleService, $q, $rootScope, utils, loginService) { 'use strict';
        var log = logging("get-avatar");

        var avatarMap = {};
        $rootScope.$watch( 'isGoogleAuthorized', function( isAuthorized, old )
        {
            if( isAuthorized )googleService.syncContacts().then( function( data )
            {
                avatarMap = {};
                data.forEach( function( entry )
                {
                    for( var k in entry )
                        if( ( typeof entry[k] == 'string' ) && k.search(/phone|number/ig) >= 0 )
                            avatarMap[ utils.convertNumber( entry[k]) ] = entry.avatarUrl;
                });

                ready.resolve();
            });
        });

        var ready = $q.defer();

        return function (phoneNumber) {
            var d = $q.defer();
            ready.promise.then( function(){d.resolve( avatarMap[ utils.convertNumber(phoneNumber) ] ); } );
            if( $rootScope.isGoogleAuthorized === false )d.reject();
            return d.promise;

        };
    }]);


angular.module( 'openCtiApp' ).factory( 'contactMappingService', ["contactsService", "googleService", "utils", "$rootScope", "loginService", function( contactsService, googleService, utils, $rootScope, loginService )
{
	'use strict';

	var rcMap = {};
	var googleMap = {};

	function extract( entry )
	{
		var m = entry.isGoogle()? googleMap: rcMap;
		for( var k in entry )
			if( ( typeof entry[k] == 'string' ) && k.search(/phone|number/ig) >= 0 )
				 m[ utils.convertNumber( entry[k]) ] = [ entry.firstName, entry.lastName ].join( ' ' );
	}

	loginService.onLogout( function(){ rcMap = {}; });
	loginService.onLogin( function()
	{
		contactsService.syncContacts().then( function( data ){ data.forEach( extract );  } );
		contactsService.getCompanyContacts().then( function( data ){ data.forEach( extract ); } );
	});

	$rootScope.$watch( 'isGoogleAuthorized', function( isAuthorized )
	{
		if( isAuthorized )googleService.syncContacts().then( function( data ){ googleMap = {}; data.forEach( extract ); });
	});

	return {
		"getNameByNumber": function( number )
		{
			if( !number )return undefined;
			var n = utils.convertNumber( number );
			return googleMap[ n ] || rcMap[ n ];
		}
	};
}]);

angular.module("openCtiApp")
    .factory("subscriptionHelper", ["$window", "rcCore", "rcPlatform", "loginService", "logging", function ($window, rcCore, rcPlatform, loginService, logging) { 'use strict';
        var log = logging("subscription-helper");

        var __subscription = null,
            __observable = rcCore.get().getObservable(),
            __events = {
                notification: "notification",
                messageUpdate: "messageUpdate",
                presenceUpdate: "presenceUpdate",
                telephonyUpdate: "telephonyUpdate"
            },
            SUBSCRIBE_TO = [
                rcPlatform.api.subscription.types.messages,
                rcPlatform.api.subscription.types.telephony /* telephony includes presence updates */
            ];

        var f = {
            subscribe: function() {
                log('Subscribing to', SUBSCRIBE_TO);
                return rcPlatform.api.subscription.create(SUBSCRIBE_TO)
                    .then(function(subscription) {
                        //if subscription has already been created, then return
                        if (__subscription) return __subscription;

                        //assign the notification event
                        __subscription = subscription;
                        __subscription.on(rcPlatform.api.subscription.events.notification, function(msg) {
                            //general notification
                            __observable.emit(__events.notification, msg);

                            //presence or telephony notification
                            if (msg.event && msg.event.indexOf('presence') !== -1) {
                                __observable.emit(__events.telephonyUpdate, msg);
                            }

                            //message notification
                            if (msg.event && msg.event.indexOf('message-store') !== -1) {
                                __observable.emit(__events.messageUpdate, msg);
                            }
                        });

                        //assign beforeunload handler for unsubscribing on refresh or tab close
                        $window.addEventListener("beforeunload", f.unsubscribe.bind(f, false));
                    })
                    .catch(function(e) {
                        log(e);
                    });
            },
            renew: function() {
                log('Trying to renew the subscription', __subscription);
                return rcPlatform.api.subscription.renew(__subscription);
            },
            unsubscribe: function(async) {
                log('Unsubscribing...', __subscription);
                return __subscription &&  rcPlatform.api.subscription.remove(__subscription, async)
                    .then(function(){})
                    .catch(log.error)
                    .then(function() {
                        //refresh observable to clear all assigned handlers
                        __observable = rcCore.get().getObservable();
                        __subscription = null;
                    });
            },
            onNotification: function(handler) {
                return __observable.on(__events.notification, handler);
            },
            onMessageUpdate: function(handler) {
                return __observable.on(__events.messageUpdate, handler);
            },
            onTelephonyUpdate: function(handler) {
                return __observable.on(__events.telephonyUpdate, handler);
            }
        };

        return f;
    }]);


angular.module('openCtiApp')
    .directive('timer', ["$interval", "utils", "logging", function($interval, utils, logging) { 'use strict';
        var log = logging("timer");
    
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var intervalId = null;
                var call = scope.$eval(attrs.call);
                
                function clean() {
                    if (intervalId !== null) {
                        log("clean()");
                        $interval.cancel(intervalId);
                        intervalId = null;
                    }
                }
                
                function setupUpdater() {
                    if (intervalId === null) {
                        log("starts to show timer", call);
                        intervalId = $interval(function () {
                            if (typeof call._timerStartTime === "object") {
                                var now = new Date();
                                var duration = utils.formatDuration(Math.floor((now - call._timerStartTime) / 1000));
                                element.text(duration);
                            }
                        }, 1000);
                    }
                }
                
                function startTimerIfNeeded() {
                    if (call.isInbound() && call.isRinging()
                        || call.isOutbound() && call.isRingoutCalleeRinging()) {

                        if (typeof call._timerStartTime !== "object") {
                            call._timerStartTime = new Date();
                            log("startTime", call);
                        }

                    } else if (call.isInbound() && call.isConnected()
                        || call.isOutbound() && call.isRingoutCalleeConnected()
                        || call.isOnHold()) {
                        
                        if (typeof call._timerStartTime === "undefined"
                            || call._timerStartTime === null) {

                            // Backup for the cases when the call data was not persisted to the localStorage.
                            // Should not happend at all.
                            call._timerStartTime = new Date();
                            log("no call._timerStartTime found. Initialized", call);
                        }

                        setupUpdater(call);

                    }
                }
                
                startTimerIfNeeded();
                
                scope.$watch(attrs.call, function (call) {
                    startTimerIfNeeded();
                }, true);

                element.on('$destroy', function() {
                    clean();
                });
            }
        };
    }]);
angular.module('openCtiApp')
    .directive('spinner', function () { 'use strict';
        return {
            restrict: 'E',
            scope: {
                show: "=show"
            },
            templateUrl: 'views/directives/spinner.html'
        };
    });
angular.module('openCtiApp')
    .directive('contactPhone', ["$rootScope", function ($rootScope) { 'use strict';
        return {
            restrict: 'E',
            scope: {
                phone: "=",
                noFax: "=",
                currentUrl: "@",
                showCallButton: "=?",
                showTextButton: "=?"
            },
            templateUrl: 'views/directives/contact-phone.html',
            link: function(scope) {
                scope.STRINGS = $rootScope.STRINGS;
            }
        };
    }]);
angular.module('openCtiApp')
    .directive('h1WithBackUrl', ["$rootScope", function ($rootScope) { 'use strict';
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                backUrl: "=backUrl"
            },
            templateUrl: 'views/directives/h1-with-back-url.html',
            link: function(scope, el) {
                scope.click = function () {
                    $rootScope.setViewAnimation('slide-right');
                }
            }
        };
    }]);
'use strict';

/**
 * @ngdoc directive
 * @name openCtiApp.directive:rcTransitionEnd
 * @description
 * # rcTransitionEnd
 */
angular.module('openCtiApp')
    .directive('rcTransitionEnd', ["$parse", function ($parse) {
        return {
            restrict: 'A',
            link: function(scope, el, attrs) {
                el.on('$animate:close', function() {
                    var fn = $parse(attrs['rcTransitionEnd']);
                    var callback = function () {
                        fn(scope, {$event: event});
                    };
                    scope.$apply(callback);
                });
            }
        }
    }]);

angular.module('openCtiApp')
    .directive('rcScrollBottom', function () { 'use strict';
        return {
            restrict: 'A',
            link: function(scope, el) {
                scope.$watch(function() {
                    return el[0].scrollHeight;
                }, function (newVal, oldVal) {
                    if (newVal > oldVal) {
                        el[0].scrollTop = newVal;
                    }
                });
            }
        };
    });
angular.module('openCtiApp')
    .directive('rcSendSms', ["$rootScope", "messagesService", "logging", "settingsService", function ($rootScope, messagesService, logging, settingsService) { 'use strict';
        return {
            restrict: 'EA',
            scope: {
                recipients: "=",
                beforeSend: '&',
                afterSend:  '&',
                sendError:  '&',
                lines:      '=?',
                disabled:   '=?',
                tabindex:   '@?',
                sendAsGroup:'=?',
                replyTo:    '=?'
            },
            templateUrl: 'views/directives/rc-send-sms.html',
            link: function(scope, el)
            {
                scope.STRINGS = $rootScope.STRINGS;

                var log = logging("rc-send-sms-directive");
                var features = settingsService.getOne('features');

                scope.sending = false;
                scope.text = '';
                scope.sendAsGroupInner = false;

                scope.send = function () {
                    var recipients = scope.recipients || [];
                    if( scope.disabled || scope.sending )return;
                    if( recipients.length === 0 ) {
                        scope.sendError({e: "Please enter at least one recipient" });
                        return;
                    }
                    if (scope.text.length === 0) {
                        scope.sendError({e: "Please enter the text to be sent" });
                        return;
                    }

                    for (var i=0; i<scope.recipients.length; i++) {
                        var recipient = scope.recipients[i];
                        if (recipient.type === 'extensionNumber' && !features.pager) {
                            scope.sendError({e: 'Messages to extension numbers are not supported by your account, please use phone numbers only'});
                            return;
                        }
                        if (recipient.type === 'phoneNumber' && !features.sms) {
                            scope.sendError({e: 'SMS are not supported by your account, please use extension numbers only'});
                            return;
                        }
                    }

                    log("sending to", recipients);

                    scope.beforeSend();

                    scope.sending = true;
                    messagesService.sendTextMessage(recipients, scope.text, scope.replyTo || undefined, scope.sendAsGroup !== undefined ? scope.sendAsGroup : scope.sendAsGroupInner)
                        .then( function (message) {
                            scope.text = '';
                            scope.afterSend({'$message': message});
                        })
                        .catch( function (e) {
                            scope.sendError({ e: e });
                        })
                        .finally( function(){ scope.sending = false; } );
                };

                scope.keyPress = function (e) {
                    if (e.keyCode === 13) {
                        scope.send();
                        e.preventDefault();
                    }
                }
            }
        };
    }]);
angular.module( 'openCtiApp' )
	.directive( 'srcSafe', function()
	{
		'use strict';
		return {
			'restrict': 'A',
			'link': function( scope, element, attrs )
			{ element.bind( 'error', function(){ this.src = attrs.srcSafe; }); }
		};
	});




angular.module( 'openCtiApp' )
	.directive( 'contactpicker', ["$rootScope", "$location", function( $rootScope, $location )
	{
		'use strict';
		return {
			'restrict': "E",
			'replace': true,
			'templateUrl': "views/directives/contactpicker.html",
			'scope': {
                'silent': "=contactpickerSilent",
                'multiple': "=contactpickerMultiple",
                'value': "=contactpickerValue",
                'disabled': '=disabled'
            },
			'link': function( scope, element, attrs ) {
				scope.backUrl = encodeURIComponent( '#' + $location.path() ); 
			}
		};
    }]);

angular.module( 'openCtiApp' )
	.directive( 'contactpickerInput', ["$q", "utils", "logging", "contactsService", "googleService", "filterContactsFilter", function($q, utils, logging, contactsService, googleService, filterContactsFilter) {
		'use strict';
		return {
			'restrict': "EA",
			'replace': true,
			'templateUrl': "views/directives/contactpicker-input.html",
			'scope': {
                'loading':          "=?",
                'placeholder':      '@',
                'recipients':       '=',
                'recipientCount':   '@',
                'hidePlaceholder':  '=?',
                'hideInput':        '=?',
                'allowSearch':      '=?',
                'value':            '=?',
                'onSelect':         '&',
                'onEnter':          '&',
                'tabindex':         '@'
            },
			link: function(scope, element, attrs) {
                var log = logging('views/directives/contactpicker-input directive');

                var input = angular.element(element[0].querySelector('input'));

                var contacts = null;

                scope.to = '';
                scope.otherTo = [];
                scope.placeholderText = '';
                scope.inputHidden = false;

                var RECIPIENT_COUNT_DEFAULT = 10,
                    recipientsCount = 0;

                attrs.$observe('placeholder', function(val) {
                    hidePlaceholder();
                });

                function checkRecipientCount() {
                    return !(scope.otherTo.length >= (scope.recipientCount || RECIPIENT_COUNT_DEFAULT));
                }

                function contains(a, recipient) {
                    return a.some(function (existingRecipient) {
                        return existingRecipient.equals(recipient);
                    });
                }

                function addToOthers(recipient) {
                    if (recipient.number !== "" && !contains(scope.otherTo, recipient)) {
                        scope.otherTo.push(recipient);
                        recipientsCount++;
                    }
                }

                function find(text) {
                    if (text === "") {
                        return [];
                    }

                    return filterContactsFilter(contacts, text)
                        .filter(function (contact) {
                            return contact.hasAPhoneOrExtension();
                        })
                        .map(function (contact) {
                            var result = {
                                name: contact.firstName + " " + contact.lastName
                            };
                            if (contact.hasAPhone()) {
                                result.phone = utils.normalizeNumber(contact.getMainPhoneNumber());
                            } else if (contact.hasAnExtension()) {
                                result.extension = contact.extensionNumber;
                            }

                            return result;
                        })
                        .slice(0, 5);
                }

                scope.getSuggestions = function (text) {
                    var d = $q.defer();

                    var typedContacts = text.split(/\s*,\s*/);
                    var latestTypeContact = typedContacts[typedContacts.length - 1];

                    if (latestTypeContact.trim() === "") {
                        d.resolve([]);
                    }
                    else {
                        if (contacts !== null) {
                            d.resolve(find(latestTypeContact));
                        } else {
                            var found = function (results, source) {
                                contacts = [];
                                contacts.push.apply(contacts, results.personal);
                                contacts.push.apply(contacts, results.company);
                                contacts.push.apply(contacts, results.google);

                                log("contacts loaded", source, {
                                    personal: results.personal.length,
                                    company: results.company,
                                    google: results.google.length
                                });

                                d.resolve(find(latestTypeContact));
                            };

                            $q.all({
                                personal: contactsService.syncContacts(),
                                company: contactsService.getCompanyContacts(),
                                google: googleService.syncContacts(null, true)
                            })
                                .then(function (result) {
                                    found(result, "1");
                                })
                                .catch(function (e) {
                                    log("Probably Google Contacts are not authorized. Trying without them", e);

                                    // try without Google Contacts as they are probably not authorized
                                    $q.all({
                                        personal: contactsService.syncContacts(),
                                        company: contactsService.getCompanyContacts(),
                                        google: []
                                    }).then(function (result) {
                                        found(result, "2");
                                    }, function (e) {
                                        d.reject(e);
                                    })
                                });
                        }
                    }

                    d.promise.then(function (contacts) {
                        log("found", contacts);
                    });

                    return d.promise;
                };

                scope.remove = function (id) {
                    scope.otherTo = scope.otherTo.filter(function (recipient) {
                        return recipient.id != id;
                    });
                    recipientsCount--;
                };

                function getStringWidth(str) {
                    var div = document.createElement('DIV');
                    div.style.position = 'absolute';
                    div.style.top = '-9999px';
                    div.style.left = '-9999px';
                    div.style.fontSize = element[0].style.fontSize;
                    element[0].appendChild(div);
                    div.textContent = str;
                    var width = div.clientWidth + 1;
                    element[0].removeChild(div);
                    div = undefined;
                    return width;
                }

                var PIXELS_PER_SYMBOL = getStringWidth('a');

                scope.keydown = function (event) {
                    switch(event.keyCode) {
                        case 8:
                            if( scope.to.length === 0) {
                                scope.otherTo.pop();
                            }
                            break;
                        case 13:
                            scope.onEnter();
                            break;
                        default:
                            if (!checkRecipientCount()) {
                                event.stopPropagation();
                                event.preventDefault();
                                return false;
                            }
                            break;
                    }
                };

                var __preWidth;
                scope.change = function() {
                    var __resized = input[0].style.width === '100%',
                        value = input.val(),
//                        stringWidth = value.length * PIXELS_PER_SYMBOL;
                        stringWidth = getStringWidth(value); //may be resource greedy
                    if (__resized && stringWidth < __preWidth) {
                        input.css('width', __preWidth + 'px');
                    }
                    else {
                        var width = parseInt(input.css('width'));
                        if (!__resized && stringWidth >= width) {
                            input.css('width', '100%');
                            __preWidth = width;
                        }
                    }
                };

                var __inside = false;
                var __toAdded = undefined;
                function addTo() {
                    if (scope.to) {
                        __inside = true;
                        try {
                            scope.recipients[__toAdded ? scope.recipients.length - 1 : scope.recipients.length] = new Recipient(scope.to);
                            !__toAdded && recipientsCount++;
                            __toAdded = true;
                        } catch (e) {
                            log("Error while adding recipient", e);
                        }
                    }
                }

                function removeTo() {
                    __inside = true;
                    __toAdded && scope.recipients.pop();
                    recipientsCount--;
                    __toAdded = false;
                }

                scope.onTypeaheadSelect = function (item) {
                    removeTo();
                    addToOthers(item.phone
                        ? new Recipient(item.phone, "phoneNumber", item.name)
                        : new Recipient(item.extension, "extensionNumber", item.name));
                    scope.to = scope.value = "";
                    scope.onSelect({'$item': item});
                };

                function resizeInput() {
                    var MIN_INPUT_WIDTH = 10,
                        WIDTH_OFFSET = 10;

                    var parent = input[0].parentNode;

                    var maxWidth = parent.parentNode.clientWidth,
                        width = 0;
                    var elems = element[0].querySelectorAll('.recipient');
                    for (var i=0; i<elems.length; i++) {
                        width += elems[i].offsetWidth;
                        if (width >= maxWidth) {
                            width = elems[i].offsetWidth;
                        }
                        else {
                            if (width + MIN_INPUT_WIDTH + WIDTH_OFFSET >= maxWidth) {
                                width = 0;
                            }
                        }
                    }

                    width = maxWidth - width - WIDTH_OFFSET;
                    width = width < MIN_INPUT_WIDTH ? '100%' : (width + 'px');

                    input.css('width', width);
                }

                scope.recipientElementCreate = scope.recipientElementDestroy = resizeInput;

                scope.$watch("to", function() {
                    //remove to if we removed the string with backspace or delete
                    if (!scope.to && __toAdded) {
                        removeTo();
                        return;
                    }

                    var splitted = scope.to ? scope.to.split(/\s*[,;]\s*/) : [];
                    if (splitted.length > 1) {
                        try {
                            removeTo();
                            addToOthers(new Recipient(splitted[0]));
                        } catch (e) {
                            log("Error while adding recipient", e);
                        }
                        scope.to = scope.value = splitted[1];
                        log("scope.otherTo", scope.otherTo);
                    }
                    else {
                        addTo();
                    }
                });

                function hidePlaceholder() {
                    scope.placeholderText = scope.otherTo.length !== 0 && scope.hidePlaceholder === true
                                                ? ''
                                                : scope.placeholder;
                }

                function hideInput() {
                    if (scope.hideInput === true) {
                        scope.inputHidden = !checkRecipientCount();
                    }
                }

                //this watcher will add to the recipients list if the recipients model is changed from outside
                scope.$watch('recipients', function() {
                    if (!__inside) {
                        scope.otherTo = [];
                        scope.recipients && scope.recipients.forEach(function(recipient) {
                            addToOthers(recipient);
                        });
                    }
                    __inside = false;
                    hidePlaceholder();
                    hideInput();
                }, true);

                scope.$watch('otherTo', function(newVal, oldVal) {
                    //prevent input jumping on to second line
                    newVal.length === 0 ? input.css('width', undefined) : input.css('width', '1px');
                    __inside = true;
                    scope.recipients = angular.copy(scope.otherTo);
                }, true);

                scope.$watch('value', function() {
                    if (checkRecipientCount()) {
                        scope.to = scope.value;
                    }
                    else {
                        scope.value = '';
                    }
                }, true);
			}
		};
    }]);

angular.module('openCtiApp')
    .directive('domCreate', ["$parse", "$timeout", function ($parse, $timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var handler = $parse(attrs.domCreate);
                $timeout(function() {
                    handler(scope);
                })
            }
        }
    }])
    .directive('domDestroy', ["$parse", function($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var handler = $parse(attrs.domDestroy);
                element.on('$destroy', function () {
                    element.css('display', 'none');
                    handler(scope);
                    element.css('display', undefined);
                });
            }
        }
    }])
    .directive('domMutation', ["$timeout", function($timeout) {
        return {
            restrict: 'A',
            scope: {
                'domMutation': '&',
                'domMutationConfig': '=?'
            },
            link: function(scope, element, attr) {
                var __observer = new MutationObserver(function (records, instance) {
                    $timeout(function() {
                        scope.domMutation({'$records': records});
                    });
                });

                __observer.observe(element[0], scope.domMutationConfig || {
                    attributes: false,
                    characterData: false,
                    childList: true,
                    subtree: true
                });

                scope.$on('$destroy', function() {
                    __observer.disconnect();
                    __observer = undefined;
                });
            }
        }
    }]);
'use strict';

angular.module('openCtiApp')
    .directive('rcCheckbox', ["uuid", function (uuid) {
        return {
            restrict: 'E',
            templateUrl: 'views/directives/rc-checkbox.html',
            scope: {
                checked: '=',
                text: '@'
            },
            link: function(scope, el, attrs) {
                scope.id = uuid();
            }
        }
    }]);

angular.module( 'openCtiApp' ).directive( 'sidebutton', ["$rootScope", "$tooltip", function( $rootScope, $tooltip )
	{
		'use strict';
		return {
			"restrict": 'E',
			"replace": true,
			"templateUrl": 'views/directives/sidebutton.html',
			"scope": { "id": '@sbId', "_show": '&sbShow', "title": '@sbTitle', "_tooltip": '&sbTooltip', "_click": '&sbClick', "_ttType": '&sbTooltipType', "_badge": '&sbBadge' },
			"link": function( scope, element, attrs )
			{ 
				var tooltip;

				scope.$watch( function(){ return scope._badge(); }, function( value ){ scope.bagdetext = value; } );
				scope.$watch( function(){ return scope._show(); }, function( value ){ scope.show = value; } );
				scope.$watch( function(){ return $rootScope.sidebarTab; }, function( value ){ scope.active = ( value === scope.id ); } );
				scope.$watch( function(){ return scope._tooltip(); }, function( value )
				{ 
					if( tooltip )tooltip.destroy();
					if( value ){ tooltip = $tooltip( element, { "title": value, "placement": 'right', "type": scope._ttType() || 'info', "show": 'true', "trigger": 'manual' } ); }
					else tooltip = $tooltip( element, { "title": scope.title, "placement": 'right', "type": 'info' } );
				} );

				scope.sidebuttonclick = function(e)
				{ 
					if( attrs.sbClick )
					{
						scope._click();
						e.preventDefault();
						return false;
					}
				}
			}
		};
	}]);




angular.module('openCtiApp')
    .directive('audioButton', function () { 'use strict';
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var audios = element[0].getElementsByTagName('audio');
                if (audios.length > 0) {
                    element.on('click', function() {
                        var audio = audios[0];
                        if (audio.currentTime !== undefined && audio.play !== undefined) {
                            audio.currentTime = 0;
                            audio.play();
                        }
                    });
                }
            }
        };
    });
angular.module( 'google.mail' ).directive( 'rcCalls', ["rcCallLog", "utils", function( rcCallLog, utils )
{
	return { 
		"restrict": 'E',
		"scope": { "number": '=', "limit": '=' },
		"templateUrl": 'views/directives/rc-calls.html',
		"link": function( $scope, $element, $attrs )
		{
			$scope.limit = $scope.limit||5
			$scope.calls = [];
			rcCallLog.get().then( function( data ){ $scope.calls = data.filter( function( entry )
			{ 
				var n = utils.convertNumber( $scope.number );
				var from = utils.convertNumber( entry.from.phoneNumber );
				var to = utils.convertNumber( entry.to.phoneNumber );
				return ( n == from || n == to );
			}); });
		}
	};
}]);


angular.module("openCtiApp")
.filter("formatDuration", ["utils", function (utils) { 'use strict';
    return utils.formatDuration;
}]);
angular.module( 'openCtiApp' ).filter( 'formatPhone', ["$rootScope", function( $rootScope )
{
	'use strict';
	var BLOCKED = 'Blocked Number';
	var brandsUS = [ 'RCUS', 'RCCA', 'ATTOAH', 'TELUS', 'TMOB' ];
	var brandsUK = [ 'RCUK', 'BT' ];

	return function( rawPhone )
	{
		if( rawPhone == undefined )return undefined;

        //value for checking for domestic format
		var value = ('' + rawPhone).valueOf().replace( /[^\d]/g, '');

        //default formatting
        var defvalue = (('' + rawPhone).substring(0, 1) ? '+' : '') + ('' + rawPhone).replace(/[^\d\(\)\s\-]/g, '').replace(/\s{2,}/g, ' ');

		var brand = $rootScope.brand;

		if( value.length === 0 )return $rootScope.STRINGS.GENERAL.blockedNumber;
		if( value.length <= 5 )return value;

        var DIGITS_FORMAT = '';

		if( brandsUS.indexOf( brand ) >= 0 ) {
            //put spaces or dashes if you want
            DIGITS_FORMAT = '($1) $2-$3';

            switch(value.length) {
                case 10:
                    return value.replace( /(\d{3})(\d{3})(\d{4})/, DIGITS_FORMAT );
                case 11:
                    return (value.substring(0, 1) === '1') ? value.replace( /(?:\d)(\d{3})(\d{3})(\d{4})/, '+1 ' + DIGITS_FORMAT ) : defvalue;
                default:
                    return defvalue;
            }
		}

		if( brandsUK.indexOf( brand ) >= 0 ) {
            //put spaces or dashes if you want
            DIGITS_FORMAT = '$1$2$3';

            switch(value.length) {
                //if 9 digits, then number has no leading zero or country code
                case 9:
                    return value.replace( /(\d{3})(\d{3})(\d{3})/, '0' + DIGITS_FORMAT );
                //if 10 digits, then number may have a leading zero with 9 digits or be a 10 digit number without
                case 10:
                    return value.replace( /(\d{3})(\d{3})(\d{4})/, value.substring(0,1) === '0' ? DIGITS_FORMAT : ('0' + DIGITS_FORMAT) );
                //if 11 digits, then it may be a UK number with 44 and 9 digits
                //or 0 and 10 digits
                case 11:
                    return (value.substring(0, 2) === '44')
                        ? value.replace('44', '').replace(/(\d+)(\d{3})(\d{4})/, '0' + DIGITS_FORMAT)
                        : (value.substring(0, 1) === '0')
                            ? value.replace(/(\d{4})(\d{3})(\d{4})/, DIGITS_FORMAT)
                            : defvalue;
                //if 12 digits, then it may be a UK number with 44 and 10 digits
                case 12:
                    return (value.substring(0, 2) === '44') ? value.replace('44', '').replace(/(\d+)(\d{3})(\d{4})/, '0' + DIGITS_FORMAT) : defvalue;
                default:
                    return defvalue;
            }
		}

		return value;
	};}]);


angular.module("openCtiApp")
    .filter("formatDate", ["$rootScope", "dateFilter", function ($rootScope, dateFilter) { 'use strict';
        var oneDay = 24 * 3600 * 1000;
        var oneWeek = oneDay * 7;
    
        return function (date, short) {
            short = short !== "long";

            if (typeof date === "string") {
                date = new Date(date);
            }

            var now = new Date();
            if (now - date <= oneDay && now.getDate() === date.getDate()) {
                return short
                    ? dateFilter(date, "shortTime")
                    : ($rootScope.STRINGS.GENERAL.today || 'Today') + ' ' + dateFilter(date, "shortTime");
            } else if (now - date < oneWeek) {
                return short
                    ? dateFilter(date, "EEEE")
                    : dateFilter(date, "EEEE") + ", " + dateFilter(date, "shortTime");
            } else {
                return short
                    ? dateFilter(date, "shortDate")
                    : dateFilter(date, "shortDate") + " " + dateFilter(date, "shortTime");
            }
        };
    }]);
angular.module("openCtiApp")
    .filter("skipNulls", function () { 'use strict';
        return function (o) {
            var result = {};

            for (var i in o) {
                if (o[i] !== null) {
                    result[i] = o[i];
                }
            }

            return result;
        };
    });
angular.module("openCtiApp")
    .filter("normalizePhone", ["utils", function(utils) { 'use strict';
        return function (phone) {
            return utils.normalizeNumber(phone);
        };
    }]);



angular.module("openCtiApp")
    .filter("filterContacts", ["utils", function(utils) { 'use strict';
        var textFields = ["firstName", "lastName"];

        var phoneFields = ["callbackPhone", "otherPhone",
            "carPhone", "assistantPhone", "companyPhone", "mobilePhone",
            "businessPhone2", "businessPhone", "homePhone2", "homePhone",
            "extensionNumber"];

        var removePlusRegexp = /^\+/;
        var isPhoneFieldRegexp = /phone/i;


        return function (contacts, text) {
            text = text.toLowerCase().trim();

            return contacts.filter(function (contact) {
                if (!text) {
                    return true;
                } else {
                    var searchPhone = utils.normalizeNumber(text).replace(removePlusRegexp, "");

                    var byPhone = phoneFields.some(function (field) {
                        if (typeof contact[field] === "string") {
                            var contactValue = utils.normalizeNumber(contact[field]).replace(removePlusRegexp, "");

                            return contactValue.length > 0
                                && searchPhone.length > 0
                                && contactValue.indexOf(searchPhone) === 0;
                        } else {
                            return false;
                        }
                    });

                    if (byPhone) {
                        return true;
                    } else {
                        var searchTerms = text.split(/\s+/);
                        if (searchTerms.length > 0) {
                            var byText = searchTerms.every(function (searchTerm) {
                                return textFields.map(function (field) {
                                    return typeof contact[field] === "string"
                                        ? contact[field].trim().split(/\s+/)
                                        : [""];
                                }).some(function (fieldTerms) {
                                    return fieldTerms.some(function (fieldTerm) {
                                        return fieldTerm.toLowerCase().indexOf(searchTerm) === 0;
                                    });
                                })
                            });

                            return byText;
                        } else {
                            return false;
                        }
                    }
                }
            });
        };
    }]);



angular.module( "openCtiApp" )
    .filter( "filterCalls", ["utils", function( utils )
    {
        'use strict';

        var fields = [ "getDisplayPhone", "getDisplayExtension", "getName" ];

        return function ( calls, text )
        {
            var searchValue = text.toLowerCase().trim();

            return calls.filter( function( callEntry )
            {
                var removePlus = /^\+/;
                var isNumberField = /Number/i;

                return !text || fields.some( function( field )
                {
                    var cEntry = callEntry[ field ]();
                    if( typeof cEntry !== "string" )return false;
                    var entryValue = cEntry.toLowerCase().trim();

                    var res =
                        ( entryValue.indexOf( searchValue ) >= 0 ) ||
                        ( field.match( isNumberField ) && utils.normalizeNumber( entryValue ).replace( removePlus, "" ).indexOf( searchValue.replace( removePlus, "") ) === 0 );

                    return res;
                });
            });

        };

    }]);



angular.module( 'openCtiApp' )
	.filter( 'filterByResult', function()
	{
		'use strict';
		return function( calls )
		{
			return calls.filter( function( entry )
			{
				return [ 'CallConnected', 'Ringing', 'OnHold' ].indexOf( entry.result ) >= 0;
			});
		};
	});


angular.module( 'openCtiApp' )
	.filter( 'normalizeOutboundLeg', function()
	{
		'use strict';
		return function( calls )
		{
			calls.forEach( function( entry )
			{
				if( entry.direction == 'Inbound' )return;
				entry.result = 'Ringing';

				for( var i in calls )
				{
					if( calls[i].toNumber == entry.fromNumber && calls[i].fromNumber == entry.toNumber && calls[i].direction == 'Inbound' )
					{
						if( calls[i].result == "CallConnected" )entry.result = 'CallConnected';
						if( calls[i].result == "OnHold" )entry.result = 'OnHold';
						if( calls[i].result == "NoCall" )entry.result = 'NoCall';
					}
				}
			});
			return calls;
		};
	});


angular.module( 'openCtiApp' )
	.filter( 'removeInboundLeg', function()
	{
		'use strict';
		return function( calls )
		{
			return calls.filter(function(entry, index) {
				if( entry.direction == 'Outbound' )return true;
                for (var i=index+1; i<calls.length; i++) {
                    if (entry._startTime === calls[i]._startTime) {
                        return false;
                    }
                }
				return true;
			});
		};
	});


angular.module( 'openCtiApp' )
	.filter( 'normalizeBrand', function()
	{
		'use strict';
		return function( brand )
		{
			return ({ 'ATTOAH': "Office@Hand", 'TELUS': "TELUS Business Connect", 'BT': 'BT' })[ brand ] || 'RingCentral';
		};
	});

angular.module( 'openCtiApp' )
	.filter( 'filterOutbound', function()
	{
		'use strict';
		return function( calls )
		{
			return calls.filter( function( entry )
			{
				if( entry.direction == 'Outbound' && entry.ringout == undefined )return false;
				return true;
			});
		};
	});


angular.module("openCtiApp")
    .filter("urlencode", function() { 'use strict';
        return function (text) {
            return encodeURIComponent(text);
        };
    });



angular.module("openCtiApp")
    .filter("filterMessages", function () {
        'use strict';

        return function (messages, type) {
            return messages.filter(function (message) {
                return type === ""
                    || type === "Fax" && message.isFax()
                    || type === "VoiceMail" && message.isVoicemail()
                    || type === "Conversation" && message.isText();
            });

        };

    });



angular.module( "openCtiApp" )
	.filter( "searchMessage", ["utils", function( utils )
	{
		'use strict';

		var fields = [ "getAuthorNameOrNumber()", "subject" ];

		return function ( messages, text )
		{
			var searchValue = text.toLowerCase().trim();

			return messages.filter( function( msgEntry )
			{
				var removePlus = /^\+/;
				var isNumberField = /Number/i;

				return !text || fields.some( function( field )
				{
					var msg;
					if( field.indexOf( "()" ) == field.length - 2 )msg = msgEntry[ field.replace( '()', '' ) ]();
					else msg = msgEntry[ field ];

					if( typeof msg !== "string" )return false;
					var entryValue = msg.toLowerCase().trim();

					var res =
						( entryValue.indexOf( searchValue ) >= 0 ) ||
						( field.match( isNumberField ) && utils.normalizeNumber( entryValue ).replace( removePlus, "" ).indexOf( searchValue.replace( removePlus, "" ) ) === 0 );

					return res;
				});
			});
		};

	}]);



angular.module("openCtiApp")
    .filter("formatPin", function() { 'use strict';
        return function(pin) {
            if (!pin) return '';
            return pin.replace(/(\d{3})/g, "$1-").replace(/-$/, "");
        };
    });



angular.module( 'openCtiApp' )
	.filter( 'extractPhone', function()
	{
		'use strict';

		return function( phoneData )
		{
			if(!phoneData || !( phoneData.records instanceof Array ) )return "";
			var record = phoneData.records.filter( function( r ){ return r.usageType === "DirectNumber"; } ).pop();
			return record? record.phoneNumber: "";
		};
	});



angular.module( 'openCtiApp' )
	.filter( 'formatExtension', function()
	{
		'use strict';
		return function( ext ){ return ext? '*' + ext: ''; };
	});



angular.module( 'openCtiApp' )
	.filter( 'filterMissedCalls', function()
	{
		'use strict';
		return function( calls, doFilter )
		{
			doFilter = doFilter === undefined ? true : doFilter;

			if (doFilter) {
				return calls.filter(function (entry) {
					return entry.isMissed();
				});
			} else {
				return calls;
			}
		};
	});


angular.module( 'openCtiApp' )
	.filter( 'filterStarttimeCalls', ["settingsService", function( settingsService )
	{
		'use strict';
		return function( calls, doFilter )
		{
			doFilter = doFilter === undefined ? true : doFilter;

			if (doFilter) {
				var startTime = settingsService.getOne( 'startTime' ) || 1;
				return calls.filter( function( entry )
				{
					return entry.startTime.getTime() >= startTime;
				});
			} else {
				return calls;
			}
		};
	}]);


angular.module( 'openCtiApp' )
	.filter( 'filterByCallStatus', function()
	{
		'use strict';
		return function( calls )
		{
			return calls.filter( function( entry )
			{
				return entry.callStatus != 'NoCall';
			});
		};
	});


angular.module( 'openCtiApp' ).filter( 'normalizeString', function()
{
	'use strict';
	return function( value )
	{
		if( typeof value === 'string' )return value;
		if( angular.isArray( value ) )return value.join( ',' );
	};
});


angular.module('openCtiApp')
    .controller('LoginCtrl', ["$scope", "$rootScope", "utils", "appstorage", "settingsService", "rcSupport", "logging", "loginService", "focus", "sidebarService", function ($scope, $rootScope, utils, appstorage, settingsService,
                                       rcSupport, logging, loginService, focus, sidebarService )
    {
        'use strict';

        $scope.user =
        {
            'grant_type': 'password',
            'username': appstorage.getData('currentuser-num') || '',
            'extension': appstorage.getData('currentuser-ext') || '',
            'password': '',
            'remember_me': false,
            'country': null,
            'clicked': false
        };

        function initCountries() {
            if (!$scope.STRINGS) return;
            $scope.countries = [
                {'label': '<div class="dropdown-flag us"></div>' + ($scope.STRINGS && $scope.STRINGS.LOGIN && $scope.STRINGS.LOGIN.comboUSValue || ''), 'brand': 'RCUS'},
                {'label': '<div class="dropdown-flag uk"></div>' + ($scope.STRINGS && $scope.STRINGS.LOGIN && $scope.STRINGS.LOGIN.comboUKValue || ''), 'brand': 'RCUK'},
                {'label': '<div class="dropdown-flag ca"></div>' + ($scope.STRINGS && $scope.STRINGS.LOGIN && $scope.STRINGS.LOGIN.comboCanadaValue || ''), 'brand': 'RCCA'}
            ];
            $scope.user.country = brandToCountry(appstorage.getData('brand'));
        }
        $scope.$on('$localeChangeSuccess', function() {
           initCountries();
        });
        $scope.countries = [];
        initCountries();

        function brandToCountry(brand) {
            //It is hardcoded, because we have only 3 countries, but more brands
            switch (brand) {
                case 'RCUS':
                case 'ATTOAH':
                case 'TMOB':
                    return $scope.countries[0];
                case 'RCUK':
                case 'BT':
                    return $scope.countries[1];
                case 'TELUS':
                case 'RCCA':
                    return $scope.countries[2];
                default:
                    return $scope.countries[0];
            }
        }

        //$rootScope.showMainSpinner = false;
        $scope.loginError = '';

        function validateEmpty( value )
        {
            if( value === null || value === undefined || value === '' )return false;
            return true;
        }

        $scope.login = function ()
        {
            $scope.loginError = '';
            if( !validateEmpty($scope.user.username) )return $scope.loginError = $scope.STRINGS.LOGIN.errorPhoneNumberIsEmpty;
            if( !validateEmpty($scope.user.password) )return $scope.loginError = $scope.STRINGS.LOGIN.errorPasswordIsEmpty;

            $scope.user.username = utils.toDigitsOnly($scope.user.username);
            $scope.user.extension = utils.toDigitsOnly($scope.user.extension);

            settingsService.setCurrentUser( $scope.user.username, $scope.user.extension );

            $scope.user.clicked = true;

            loginService.login
            (
                utils.filterNumber($scope.user.username, $scope.user.country.brand),
                $scope.user.extension,
                $scope.user.password,
                $scope.user.remember_me
            )
            .then( function (data)
            {
                loginService.saveCredentials
                (
                    utils.filterNumber($scope.user.username, $scope.user.country.brand),
                    $scope.user.extension,
                    $scope.user.password,
                    $scope.user.remember_me
                );

            })
            .catch( function(e) {
                $scope.loginError = $scope.STRINGS.LOGIN.errorIncorrectLogin;
            })
            .finally( function() { $scope.user.clicked= false; } );

        };



        function resetState() {
            $scope.user = {
                'grant_type': 'password',
                'username': '',
                'extension': '',
                'password': '',
                'remember_me': false,
                'clicked': false
            };
        }



        // Setting focus on input
        sidebarService.onSidebarTrigger( function( value ){ if( value === true )focus('focus:loginPhone'); } );
    }]);

angular.module('openCtiApp')
    .controller('SettingsCtrl', ["$scope", "$rootScope", "$q", "utils", "$location", "settingsService", "logging", "desktopNotifications", "googleService", "loginService", "rcSupport", "$routeParams", "rcPlatform", "notificationService", "EULA_LINK", function ($scope, $rootScope, $q, utils, $location, settingsService, logging, desktopNotifications,
                                         googleService, loginService, rcSupport, $routeParams, rcPlatform, notificationService,
                                         EULA_LINK)
    {
        'use strict';

        $rootScope.sidebarTab = 'settings';

        $scope.settingError = '';
        $scope.showSpinner = false;

        var log = logging("setting");

        $scope.EULA_LINK = EULA_LINK;

        $scope.settings = settingsService.get();
        if( $routeParams.msg == 'new' ) {
            settingsService.set( $scope.settings );
        };

        $scope.googleUserNumber = googleService.getUserNumber();
        $scope.$watch(function() {
            return googleService.getUserNumber();
        }, function () {
            $scope.googleUserNumber = googleService.getUserNumber();
        });

        /*
        $scope.help = {direct:false,promptToPress:false};

        $scope.validateDirectNumber = function (directNumber) {
            return !(directNumber === '' || typeof (directNumber) === 'undefined');
        };

        if( !utils.filterNumber( $scope.settings.directNumber ) )
            $scope.settingError = 'Invalid direct number';

        notificationService.notify( null, null, 'settings' );
        $scope.$on( '$routeChangeStart', function( next, current )
        {
            notificationService.notify( $scope.settingError, 'error', 'settings' );
        });

        $scope.savePromptToPress = function(){ settingsService.set( $scope.settings ); };
        $scope.saveDirectNumber = function()
        {
            if( utils.filterNumber( $scope.settings.directNumber ) )
            {
                $scope.settings.directNumber = utils.filterNumber( $scope.settings.directNumber );
                settingsService.set( $scope.settings );
                $scope.settingError = '';
            }
            else
            {
                settingsService.set( $scope.settings );
                $scope.settingError = 'Invalid direct number';
            }
        };*/

        if( !desktopNotifications.enabled() )
        {
            if( $scope.settings.desktopNotificationsEnabled == true ) {
                $scope.settings.desktopNotificationsEnabled = false;
                settingsService.set($scope.settings);
            }
        }

        var isDesktopNotificationsConfirmed = true;
        $scope.desktopNotifications = {};
        $scope.desktopNotifications.isConfirmed = function(){ return isDesktopNotificationsConfirmed; }
        $scope.desktopNotifications.isDenied = function(){ return desktopNotifications.disabled(); }
        $scope.desktopNotifications.onChange = function()
        {
            //if checkbox is set to true and notifications aren't granted we ask for permission
            if( $scope.settings.desktopNotificationsEnabled === true && !desktopNotifications.enabled() )
            {
                isDesktopNotificationsConfirmed = false;
                desktopNotifications.requestPermission().then( function( state )
                {
                    isDesktopNotificationsConfirmed = true;
                    //if user denied notification, we drop the setting
                    if( state !== desktopNotifications.state.GRANTED )
                    {
                        $scope.settings.desktopNotificationsEnabled = false;
                    }
                    settingsService.set( $scope.settings );
                });
            }
            else
            {
                settingsService.set( $scope.settings );
            }
        };
}]);

angular.module('openCtiApp')
    .controller('DialerCtrl', ["$scope", "$rootScope", "utils", "$location", "callMonitor", "$timeout", "ringout", "settingsService", "logging", "loginService", "$routeParams", "ERROR_SHOW_TIME_SECONDS", "rcSupport", "appstorage", function ($scope, $rootScope, utils, $location, callMonitor, $timeout, ringout, settingsService, logging,
                                        loginService, $routeParams, ERROR_SHOW_TIME_SECONDS, rcSupport,appstorage) {
        'use strict';

        var log = logging("dialer");

        $rootScope.sidebarTab = 'dialer';

        $scope.callButtonDisabled = false;
        $scope.settingsCollapsed = appstorage.getData('settingsCollapsed');
        if( utils.filterNumber(settingsService.get().directNumber).length == 0 )$scope.settingsCollapsed = false;

        $scope.collapseSettings = function(){ $scope.settingsCollapsed =! $scope.settingsCollapsed; appstorage.setData( 'settingsCollapsed', $scope.settingsCollapsed );  };

        //rcSupport.getAnsweringRule().then( function( data ){ console.log( data ); } );

        function showError(messageType, messageText, clearNumber ) {
            $scope.errorType = messageType;
            $scope.errorMsg = messageText;
            if(clearNumber)$scope.targetValue = '';

            // hide error after some time
            $timeout(function () {
                $scope.errorType = "";
            }, Math.floor(ERROR_SHOW_TIME_SECONDS * 1000));
        }

        function onRingoutUpdated(ringout) {
            var badCallStatuses = ["CannotReach", "Error", "NoAnsweringMachine", "NoSessionFound"];
            if (ringout.status
                && ringout.status.callStatus
                && badCallStatuses.indexOf(ringout.status.callStatus) > 0) {
                showError('FailedToComplete', '', true);
            }
            if (ringout.status
                && ringout.status.callStatus
                && badCallStatuses.indexOf(ringout.status.callStatus) === 0) {
                showError('CannotReach', '', true);
            }
        }

        function onRingoutUpdateError(e) {
                log("ringoutUpdateError", e);
                e && e.message && showError('RingoutError', e.message, true);
        }

        callMonitor.execute(function (cm) {
            cm.on(cm.events.ringoutUpdateError, onRingoutUpdateError);
            cm.on(cm.events.ringoutUpdated, onRingoutUpdated);
            $scope.$on("$destroy", function () {
                cm.off(cm.events.ringoutUpdated, onRingoutUpdated);
                cm.off(cm.events.ringoutUpdateError, onRingoutUpdateError);
            });
        });

        $scope.contact = [];
        function getContactPhone() {
            return $scope.contact && $scope.contact.length > 0 && ($scope.contact[0].number || $scope.contact[0].extension);
        }

        $scope.targetValue = '';
        $scope.dialButtonClickHandler = function (value) {
            if ($scope.targetValue.length < 15) {
                $scope.targetValue = ($scope.targetValue || '') + '' + value;
            }
        };

        $scope.callButtonClickHandler = function (number) {
            number = number || getContactPhone();
            try {
                ringout.start(number);
            } catch (e) {
                // do not hide dialer in case of error
                showError('CustomError', e.message, false);
            }
        };

        /**
         * [watcher: watches the ringout status and disables the button]
         */
        $scope.$watch(function() {
            return (ringout.inProgress());
        }, function (val) {
            $scope.callButtonDisabled = val;

            //if change from false to true
            if (val === true) {
                if (!getContactPhone() || utils.normalizeNumber(getContactPhone()) !== utils.normalizeNumber(ringout.toNumber)) {
                    $scope.contact = [];
                    $scope.targetValue = ringout.toNumber;
                }
            }
        });

        if($routeParams.phone) {
            if( $routeParams.silent == "true" ) {
                $scope.contact = [];
                $scope.targetValue = $routeParams.phone;
            }
            else $scope.callButtonClickHandler( $routeParams.phone );
        }
    }]);

angular.module( 'openCtiApp' )
	.controller( 'ActiveCallCtrl', ["$scope", "getAvatar", "logging", "contactMappingService", "activeCallMonitor", "$timeout", function( $scope, getAvatar, logging, contactMappingService, activeCallMonitor, $timeout )
	{
		'use strict';

		var log = logging("active-calls");
		$scope.getNameByNumber = function( number ){ return contactMappingService.getNameByNumber( number ); }

		$scope.inboundCalls = [];
		$scope.outboundCalls = [];

		$scope.show = false;
		activeCallMonitor.onStart( function(){ $scope.show = true; });
		activeCallMonitor.onStop( function(){ $timeout( function(){ $scope.show = false; }, 2000 ); });

		activeCallMonitor.onUpdate( function( data )
		{
			$scope.inboundCalls = data.inboundCalls;
			$scope.outboundCalls = data.outboundCalls;

			$scope.inboundCalls.forEach( function( entry ){ getAvatar( entry.from ).then( function( url ){ entry.avatarUrl = url; } ); } );
			$scope.outboundCalls.forEach( function( entry ){ getAvatar( entry.to ).then( function( url ){ entry.avatarUrl = url; } ); } );

		});
	}]);

angular.module("openCtiApp")
    .controller("CallCtrl", ["logging", "$scope", function(logging, $scope) { 'use strict';
        var log = logging("call");
        $scope.expanded = true;
    }]);
angular.module("openCtiApp")
    .controller("SidebarCtrl", ["$scope", "$rootScope", "logging", "settingsService", "HANGOUTS_APP_ID", "loginService", "notificationService", "messagesService", "sidebarService", "rcCallLog", "chromeExtensionInteraction", function ($scope, $rootScope, logging, settingsService, HANGOUTS_APP_ID, loginService, notificationService, messagesService, sidebarService, rcCallLog, chromeExtensionInteraction) {
        'use strict';
        var log = logging("sidebar");

        $scope.startHangouts = function () {
            var appId = HANGOUTS_APP_ID;
            var gd = settingsService.getOne('conferencingInfo');
            //if not conferencing info is present then hangouts won't be started
            if (!gd) {
                log('gadget data is null, won\'t start the hangout', gd);
            }

            var __userNumber;
            chromeExtensionInteraction.getUserNumber().then(function (number) {
                __userNumber = number;
            }).finally(function () {
                var url = 'https://hangoutsapi.talkgadget.google.com/hangouts/'
                    + '_?authuser=' + (__userNumber === null ? '0' : __userNumber)
                    + '&gid=' + encodeURIComponent(appId)
                    + '&gd=' + encodeURIComponent(JSON.stringify(gd));
                window.open(url);
            });
        };

        $scope.sidebarClick = function (e) {
            $rootScope.setViewAnimation('slide-left');
            sidebarService.expand();
        };

        $scope.conferencing = false;
        $scope.sms = false;

        loginService.onLogin(function () {
            var features = settingsService.getOne('features');
            $scope.conferencing = features && features.conferencing;
            $scope.sms = features && features.sms;
            $scope.pager = features && features.pager;
        });

        settingsService.onSettingsUpdated(function (value) {
            $scope.conferencing = value.features && value.features.conferencing;
            $scope.sms = value.features && value.features.sms;
        });


        $scope.notification = { "dialer": {} };
        $scope.counters = { "messages": 0, "calls": [] };

        messagesService.onMessageCountUpdate(function (data) {
            $scope.counters.messages = data.all;
        });

        notificationService.onNotificationUpdated(function (event, data) {
            if (data.id == 'dialer') {
                $scope.notification[data.id].message = data.message;
                $scope.notification[data.id].type = data.type;
            }

        });

        rcCallLog.onCallsUpdate(function (records) {
            $scope.counters.calls = records;
        });

    }]);

angular.module("openCtiApp")
    .controller("MessagesCtrl", ["$scope", "logging", "messagesService", "settingsService", "rcPlatform", "utils", "$rootScope", "$routeParams", "$window", "rcCore", function ($scope, logging, messagesService, settingsService, rcPlatform, utils,
                                          $rootScope, $routeParams, $window, rcCore)
    {
        'use strict';
        var log = logging("messages");

        $rootScope.sidebarTab = 'messages';

        $scope.searchFilter = $routeParams.searchFilter || "";
        $scope.typeFilter = $routeParams.tab || "";

        $scope.messages = messagesService.getOffline();

        $scope.$watch('messages', function() {
            $scope.updates = {
                voicemail: messagesService.getNewVoicemailCount(),
                fax: messagesService.getNewFaxCount(),
                text: messagesService.getNewTextCount()
            };
        }, true);

        $scope.messages = messagesService.getOffline();

        $scope.openFax = function (message, index) {
            log("attachments", message.attachments);
            if (!message.isRead()) {
                //we shouldn't wait for completion
                messagesService.readMessage(message.id).then(function() {
                    message.readStatus = 'Read';
                });
            }
            var attachment = message.attachments && message.attachments[0];
            var uri = attachment.uri;
            var token = rcCore.get().getPlatform().getToken();
            $window.open(uri + '?access_token=' + token);
        };

        $scope.deleteMessage = function (message) {
            var id = message.id;

            // if this one is slow we should create [id] to [index] dictionary like so {'messageId': 0, etc.}
            var index = $scope.messages.indexOf(message);

            if (id && confirm('Delete this message?')) {
                messagesService.deleteMessage(id)
                    .then(function () {
                        $scope.messages.splice(index, 1);
                    })
                    .catch(function(e) {
                        log('message deletion error', e);
                    });
            }
        };

        $scope.markMessage = function(message) {
            !message.isRead()
                ? messagesService.readMessage(message.id)
                : messagesService.unreadMessage(message.id);
        };

        $scope.messageClickHandler = function (message) {

        };

        var features = settingsService.getOne('features');
        $scope.smsEnabled = features && features.sms;
        $scope.pagerEnabled = features && features.pager;
        $scope.showTextButton = function (message) {
            var numbers = message.getAuthorNumber();
            //empty number array - unknown number, do not show
            if (numbers.length === 0) return false;

            //one number - should check if extension number or a real one
            if (numbers.length === 1) return (features.sms && !utils.isExtensionNumber(numbers[0])) || (features.pager && utils.isExtensionNumber(numbers[0]));

            //if more than one number - it is a pager message
            return !!features.pager;
        };

    }])
    /**
     * Internal service to store currently playing player
     * and to share it between AudioCtrl controllers.
     */
    .factory("AudioCtrl_playerContext", function () {
        return {
            playerPlaying: null
        }
    })
    .controller("AudioCtrl", ["$scope", "$sce", "audio", "$interval", "logging", "messagesService", "rcCore", "AudioCtrl_playerContext", function ($scope, $sce, audio, $interval, logging,
                                       messagesService, rcCore, AudioCtrl_playerContext) { 'use strict';
        var log = logging("messages");

        $scope.playing = null;
        $scope.progress = 0;
        $scope.duration = $scope.message.getVoicemailDuration();
        log("$scope.message", $scope.message);
        $scope.currentTime = 0;
        var player = null;

        $scope.getVoicemailSrc = function (message) {
            return message.getVoicemailUri()
                + "?access_token=" + decodeURIComponent(rcCore.get().getPlatform().getToken());
        };

        function stopPrevious() {
            // stop player that is now playing (if any)
            if (AudioCtrl_playerContext.playerPlaying !== null) {
                AudioCtrl_playerContext.playerPlaying.pause();
                AudioCtrl_playerContext.playerPlaying = null;
            }
        }

        $scope.play = function (message) {
            stopPrevious();

            if (!message.isRead()) {
                messagesService.readMessage(message.id).then(function() {
                    message.readStatus = 'Read';
                });
            }

            var url = message.getVoicemailUri()
                + "?access_token=" + decodeURIComponent(rcCore.get().getPlatform().getToken());

            $scope.playing = true;
            player = AudioCtrl_playerContext.playerPlaying = audio.play(url);
            player.then(function () {
                $scope.playing = null;
                player = null;
                AudioCtrl_playerContext.playerPlaying = null;
            }, function (e) {
                $scope.playing = null;
                player = null;
                AudioCtrl_playerContext.playerPlaying = null;
            }, function (progress) {
                if (progress.paused) {
                    $scope.playing = false;
                } else if (progress.resumed) {
                    $scope.playing = true;
                }

                $scope.progress = isNaN(progress.progress) ? 0 : progress.progress;

                $scope.duration = player ? player.duration() : 0;

                $scope.currentTime = player ? progress.progress * player.duration() : 0;
                if (isNaN($scope.currentTime)) {
                    $scope.currentTime = 0;
                }
            });
        };

        $scope.pause = function () {
            if (player) {
                player.pause();
                AudioCtrl_playerContext.playerPlaying = null;
            }
        };
        $scope.resume = function () {
            stopPrevious();

            if (player) {
                player.resume();
                AudioCtrl_playerContext.playerPlaying = player;
            }
        };
    }])
    .controller("ShowHideCtrl", ["$scope", "$location", function ($scope, $location) { 'use strict';
        var show = false;

        $scope.triggerShow = function (toShow) {
            if (toShow === undefined) {
                show = !show;
            } else {
                show = toShow;
            }
        };

        $scope.toShow = function () {
            return show;
        };

        $scope.messageClickHandler = function (message, e) {
            if (message.isText()) {
                var currentUrl = "#" + $location.url();
                $scope.setViewAnimation('slide-left');
                $location.path('/conversation/' + message.conversationId).search('backUrl', currentUrl);
            }
            else {
                $scope.triggerShow();
            }
        };
    }]);

angular.module('openCtiApp')
    .controller('ContactsCtrl', ["$scope", "$rootScope", "$routeParams", "$location", "$q", "$timeout", "contactsService", "googleService", function ($scope, $rootScope, $routeParams, $location, $q, $timeout, contactsService, googleService) {
        'use strict';

        $rootScope.sidebarTab = "contacts";

        $scope.searchFilter = $routeParams.query || "";
        $scope.contacts = [];
        $scope.showSpinner = false;
        $scope.backurl = '';

        function query(value) {
            var v = value.toLowerCase().trim();

            if (v.length === 0) {
                $scope.contacts = [];
                return;
            }

            $scope.showSpinner = true;

            var deff =
            {
                'p': contactsService.queryPersonalContacts(v),
                'c': contactsService.queryCompanyContacts(v)
            };

            if ($rootScope.isGoogleAuthorized)deff[ 'g' ] = googleService.queryContacts(v);

            $q.all(deff)
                .then(function (result)
                {
                    if (v != $scope.searchFilter.toLowerCase().trim())return;

                    var c = [];
                    for (var k in result)c.push.apply(c, result[k]);
                    $scope.contacts = c;
                })
                .finally( function(){ $scope.showSpinner = false; } )

            var url = $location.url().split('/');
            if (url[2])url = url.slice(0, 2);
            if (value)url.push(value);
            $scope.backurl = encodeURIComponent('#' + url.join('/'));
        }

        var tout, delay = 500;
        $scope.change = function (value) {
            if (tout)$timeout.cancel(tout);
            tout = $timeout(function () {
                query(value);
            }, delay);
        }

        $scope.authorizeGoogleC = function()
        {
            $rootScope.authorizeGoogle( function()
            {
                query( $scope.searchFilter );
            });
        };

        if ($scope.searchFilter)query($scope.searchFilter);

    }]);

/**
 * @ngdoc function
 * @name yeomanRcApp.controller:CallLogCtrl
 * @description
 * # CallLogCtrl
 * Controller of the yeomanRcApp
 */
angular.module('openCtiApp')
    .controller('CallLogCtrl', ["$scope", "$rootScope", "logging", "rcCallLog", "$routeParams", "settingsService", function ($scope, $rootScope, logging, rcCallLog, $routeParams, settingsService) {
        'use strict';

        var log = logging('call-log');

        $rootScope.sidebarTab = 'call-log';

        $scope.callscount = { 'missed': 0 };
        $scope.activeTab = $routeParams.tab ? parseInt($routeParams.tab) : 0;
        $scope.callResultFilter = $scope.activeTab == 0 ? "" : "Missed";

        if ($scope.callResultFilter == 'Missed') {
            settingsService.setOne('startTime', new Date().getTime());
        }

        $scope.counters = {
            "calls": rcCallLog.getOffline()
        };

        rcCallLog.onCallsUpdate(function (records) {
            $scope.counters.calls = records;
        });

        $scope.calls = rcCallLog.getOffline();

        $scope.searchFilter = $routeParams.searchFilter || "";
    }]);

angular.module("openCtiApp")
    .controller("ContactCtrl", ["$scope", "$routeParams", "logging", "$rootScope", "contactsService", "googleService", "settingsService", "$location", "$q", function ($scope, $routeParams, logging, $rootScope, contactsService, googleService, settingsService,
                                         $location, $q) { 'use strict';
        var log = logging("contact");
        var error = log.error;

        $rootScope.sidebarTab = "contacts";

        $scope.contact = null;

        $scope.source = $routeParams.source;
        $scope.id = $routeParams.id;
        var searchField = $routeParams.searchField || "trackingId";
        $scope.backUrl = $routeParams.backUrl || "#/contacts";

        $scope.features = settingsService.getOne('features');


        $scope.authorizeGoogleC = function(){ $rootScope.authorizeGoogle( function(){ loadContact( true ); }); };
        googleService.isAuthorized().then( function( isAuth ){ loadContact( isAuth ); } );

        function loadContact( withGoogle )
        {
            log( "loading", withGoogle? 'rc+google': 'rc only' );
            $scope.showSpinner = true;
            var query = {};
            query[searchField] = $scope.id;

            var promise = {
                personal: contactsService.getContact(query),
                company: contactsService.getCompanyContact(query)
            };

            if( withGoogle )promise.google = googleService.getContact(query, true);

            $q.all(promise)
            .then(function (results)
            {
                log( "loaded", results.google?'rc+google': 'rc only', results );

                var contacts = [];
                contacts.push.apply(contacts, results.personal);
                contacts.push.apply(contacts, results.company);
                if( results.google )contacts.push.apply(contacts, results.google);

                $scope.contact = contacts.filter( function( entry ){ return entry.isGoogle(); })[0] || contacts[0];
            })
            .catch( function (cause){ error("Can't get a contact", cause); })
            .finally( function(){ $scope.showSpinner = false; } );
        }
    }]);

angular.module("openCtiApp")
    .controller("NewSmsCtrl", ["$scope", "logging", "$rootScope", "$routeParams", "$location", function ($scope, logging, $rootScope, $routeParams, $location) { 'use strict';
        var log = logging("new-sms");

        $rootScope.sidebarTab = 'new-sms';

        $scope.recipients = [];
        $scope.recipientsNum = '';

        $scope.recipientsCount = 0;

        //route phone numbers
        if ($routeParams.phone) {
            var phones = $routeParams.phone.split(',');
            for(var i=0; i<phones.length; i++) {
                $scope.recipients.push(new Recipient(phones[i], $routeParams.type));
                $scope.recipientsCount++;
            }
        }

        $scope.$watch('recipients', function() {
            $scope.recipientsCount = $scope.recipients.length;
            $scope.recipientsNum = $scope.recipients && $scope.recipients.map( function( v ){ return v.number } ).join(',');
        }, true);

        //rc-send-sms callbacks
        $scope.beforeSend = function(){ $scope.error = ''; };

        $scope.afterSend = function(message) {
            var lastMessage = message[message.length-1];
            //var currentUrl = "#" + $location.url();
            var currentUrl = "#/new-sms";
            lastMessage.conversationId && $location.path('/conversation/' + lastMessage.conversationId).search('backUrl', currentUrl);
        };

        $scope.sendError = function (e) {
            $scope.error = e.description || e.message || e;
        };
        //------
    }]);

angular.module("openCtiApp")
    .controller("NewFaxCtrl", ["$scope", "logging", "$rootScope", "$routeParams", function ($scope, logging, $rootScope, $routeParams) { 'use strict';
        var log = logging("new-sms");

        $rootScope.sidebarTab = 'new-fax';

    }]);

angular.module("openCtiApp")
    .controller("HelpCtrl", ["$scope", "logging", "$rootScope", "$routeParams", function ($scope, logging, $rootScope, $routeParams) { 'use strict';
        var log = logging("help");
    
        $rootScope.sidebarTab = 'help';

    }]);

angular.module('openCtiApp')
    .controller('CallLogEntryCtrl', ["$scope", "$rootScope", "logging", "rcCallLog", "$routeParams", "getAvatar", "utils", "settingsService", function ($scope, $rootScope, logging, rcCallLog, $routeParams,
                                              getAvatar, utils, settingsService) {
        'use strict';

        var log = logging('call-log-entry');
        var error = log.error;

        $rootScope.sidebarTab = 'call-log';

        $scope.call = null;
        $scope.showSpinner = true;

        var query = {
            id: $routeParams.id
        };

        $scope.showTextButton = false;

        rcCallLog.getCallRecord(query).then(function (calls) {
            log("calls", calls);

            if (calls.length === 1) {
                $scope.call = calls[0];

                var isExtension = utils.isExtensionNumber(calls[0].getDisplayNumber()),
                    features = settingsService.getOne('features');
                $scope.showTextButton = (features.sms && !isExtension) || (features.pager && isExtension);

                return getAvatar($scope.call.getDisplayNumber());
            } else if (calls.length > 1) {
                error("More than one call log entries found", calls);
            }
        }).then(function (avatarUrl) {
            if (avatarUrl) {
                $scope.avatarUrl = avatarUrl;
            }
        }).catch(function (cause) {
            error("Error while searching for a matching contact", cause);
        }).finally(function () {
            $scope.showSpinner = false;
        });
    }]);

angular.module('openCtiApp')
    .controller('MessageCtrl', ["logging", "$scope", "$rootScope", "$routeParams", "messagesService", "getAvatar", "utils", "settingsService", function (logging, $scope, $rootScope, $routeParams, messagesService, getAvatar, utils, settingsService) {
        'use strict';

        var log = logging('message');
        var error = log.error;

        $rootScope.sidebarTab = 'messages';
        $scope.message = null;

        var id = $routeParams.id || '';
        $scope.showSpinner = true;

        $scope.showTextButton = false;

        messagesService.getMessage(id)
            .then(function (message) {
                $scope.message = message;

                $scope.showTextButton = function() {
                    var numbers = message.getAuthorNumber(),
                        features = settingsService.getOne('features');

                    //empty number array - unknown number, do not show
                    if (numbers.length === 0) return false;

                    //one number - should check if extension number or a real one
                    if (numbers.length === 1) return (features.sms && !utils.isExtensionNumber(numbers[0])) || (features.pager && utils.isExtensionNumber(numbers[0]));

                    //if more than one number - it is a pager message
                    return !!features.pager;
                }();

                //return
                getAvatar( $scope.message.getAuthorNumber()[0]).then( function(url){ $scope.avatarUrl=url;} );
            }).catch(function (cause) {
                error("Error while searching for a matching contact", cause);
            }).finally(function (e) {
                $scope.showSpinner = false;
            });
    }]);

'use strict';

/**
 * @ngdoc function
 * @name openCtiApp.controller:ConversationCtrl
 * @description
 * # ConversationCtrl
 * Controller for the conversation page
 */
angular.module('openCtiApp')
    .controller('ConversationCtrl', ["$scope", "$routeParams", "messagesService", "logging", "SECONDS_BETWEEN_CONVERSATION_TIME_SHOW", function ($scope, $routeParams, messagesService, logging, SECONDS_BETWEEN_CONVERSATION_TIME_SHOW) {
        var log = logging("conversation-controller");

        $scope.messages = [];
        $scope.showSpinner = false;
        $scope.header = '';

        $scope.recipients = [];

        var __previousMessage = null;
        $scope.findDelta = function (message) {
            var delta = (!__previousMessage)
                            ? Number.POSITIVE_INFINITY
                            : ((message.creationTime.getTime() - __previousMessage.creationTime.getTime())/1000);
            __previousMessage = message;
            return delta;
        };

        $scope.showTime = function (message) {
            return  $scope.findDelta(message) > SECONDS_BETWEEN_CONVERSATION_TIME_SHOW;
        };

        //message update handler
        function onMessageUpdate(events) {
            log("update events", events);
            loadConversation();
        }
        messagesService.onMessageUpdate(onMessageUpdate);
        $scope.$on("$destroy", function () {
            messagesService.offMessageUpdate(onMessageUpdate);
        });

        $scope.beforeSend = function () {};
        $scope.afterSend = function () {};

        $scope.lastMessageId = undefined;
        function loadConversation(spinner, callback) {
            callback = typeof (callback) === 'function' ? callback : angular.noop;
            var conversationId = $routeParams['id'];
            $scope.showSpinner = spinner && true;
            messagesService.getConversation(conversationId)
                .then(function (messages) {
                    if (!messages || messages.length === 0) return;

                    var unread = [];
                    messages.forEach(function(message) {
                        if (!message.isRead()) {
                            unread.push(message.id);
                        }
                    });
                    unread.length > 0 && messagesService.readMessage(unread);

                    $scope.messages = messages;
                    $scope.lastMessageId = messages.length > 0 && messages[messages.length - 1].id;
                    if (messages.length && messages.length > 0) {
                        $scope.header = messages[0].getAuthorNameOrNumber() || $scope.STRINGS.GENERAL.unknownCallerId();
                    }

                    callback(messages);
                })
                .finally(function() {
                    $scope.showSpinner = false;
                });
        }

        loadConversation(true, function (messages) {
            var phone = messages[0].getAuthorNumber();
            if (!angular.isArray(phone)) phone = [phone];
            for (var i=0; i<phone.length; i++) {
                $scope.recipients.push(new Recipient(phone[i]));
            }
        });
    }]);

angular.module( 'openCtiApp' )
	.controller( 'StatusCtrl', ["$scope", "loginService", "settingsService", "rcPlatform", function($scope, loginService, settingsService, rcPlatform ) { 'use strict';

        $scope.user = '';
        $scope.extension = {};
        $scope.presence = {};

        loginService.onLogin(function() {
            $scope.user = settingsService.getCurrentUser();

            rcPlatform.extension.info().then(function(data) {
                $scope.extension = data;
            });

            rcPlatform.extension.presence().then(function(data) {
                $scope.presence = data;
            });
        });

        loginService.onLogout(function() {
            $scope.user = '';
            $scope.extension = {};
            $scope.presence = {};
        });
}]);

angular.module("openCtiApp")
    .controller("NewConferenceCtrl", ["$scope", "logging", "$rootScope", "settingsService", "formatPhoneFilter", "formatPinFilter", "CONFERENCING_INT_NUMBERS", "googleCalendar", function ($scope, logging, $rootScope, settingsService,
        formatPhoneFilter, formatPinFilter, CONFERENCING_INT_NUMBERS, googleCalendar )
    {
        'use strict';

        var log = logging("new-conference");
        var error = log.error;

        $rootScope.sidebarTab = 'new-conference';

        $scope.error = '';
        $scope.conferencingInfo = settingsService.getOne('conferencingInfo');
        console.warn($scope.conferencingInfo);

        $scope.internationalNumbers = angular.copy(CONFERENCING_INT_NUMBERS);
        $scope.hasInternational = false;

        $scope.invite = function ()
        {
            googleCalendar.open();
            googleCalendar.load( function(){ return {
                text: "New Conference",
                details: $scope.conferencingInfo.details,
                location: formatPhoneFilter($scope.conferencingInfo.phoneNumber)
            }; } );
        };
    }]);

angular.module( 'openCtiApp' )
	.controller( 'ContactPickerCtrl', ["$scope", "$rootScope", "$location", "$routeParams", "contactsService", "googleService", function( $scope, $rootScope, $location, $routeParams, contactsService, googleService )
	{
		'use strict';

		var silent = $routeParams.silent;
		var multiple = $routeParams.multiple;
		var origNumber = $routeParams.value;
		var base = getBase( $rootScope.backUrl );

		$scope.searchFilter = "";
		$scope.contacts = [];
		$scope.showSpinner = true;
		$scope.backUrl = base + ( origNumber? '/' + origNumber: '' ) + '?silent=' + silent;


		function getBase( url )
		{
			var ret = url.split( '/' );
			return [ ret.shift(), ret.shift() ].join( '/' );
		}

		function unique( a )
		{
			return a.reduce( function( p, c )
			{
				if( p.indexOf( c ) < 0 )p.push( c );
				return p;
			}, [] );
		}
	


		var spinnerCount = 0;

		function push( data ){ spinner( false ) && $scope.contacts.push.apply( $scope.contacts, data ); }
		function spinner( show )
		{ 
			show? spinnerCount++: spinnerCount--; 
			( spinnerCount == 0 )? $scope.showSpinner = false: $scope.showSpinner = true;
			return true;
		}

		$scope.pick = function( ext, num )
		{ 
			var number = ext || num;

			if( multiple == "false" )
			{
				$location.url( base.substr(1) + '/' + number + '?silent=' + silent );
			}
			else
			{
				var numbers = origNumber? origNumber.split( ',' ): [];
				numbers.push( number );
				$location.url( base.substr(1) + '/' + unique( numbers ).join( ',' ) + '?silent=' + silent );
			}
			return true;
		}

		spinner( true ) && contactsService.syncContacts().then( push ).catch( function(){ spinner( false ); } );
		spinner( true ) && contactsService.getCompanyContacts().then( push ).catch( function(){ spinner( false ); } );
		spinner( true ) && googleService.isAuthorized().then( function( isAuthorized )
			{ spinner( false ) && isAuthorized && spinner( true ) && googleService.syncContacts().then( push ).catch( function(){ spinner( false ); } ); });

	}]);


angular.module("openCtiApp")
    .controller("NewRCConferenceCtrl", ["$scope", "$locale", "logging", "rcPlatform", "zoomMeetings", "$rootScope", "$route", "dateFilter", "rcCore", "googleCalendar", "settingsService", "utils", "$dateParser", function ($scope, $locale, logging, rcPlatform, zoomMeetings, $rootScope, $route, dateFilter, rcCore, googleCalendar, settingsService, utils, $dateParser ) {
        'use strict';

        var log = logging("new-rc-conference");

        $rootScope.sidebarTab = 'new-rc-conference';

        function formatTopic( firstName, lastName ){
            var uname = [firstName, lastName].join(' ');
            return uname + ( uname.substr(-1,1) == "s"? "'": "'s" ) + ' Meeting';
        }

        function formatDate( startDate, startTime, duration ){
            var date = getDateTime( startDate, startTime );
            var d = ( parseInt( duration.hours ) * 60 + parseInt( duration.minutes ) ) * 60 * 1000;
            return getGoogleString( date ) + '/' + getGoogleString( new Date( date.getTime() + d ) );
        }

        function pad(number) {
            var r = String(number);
            if ( r.length === 1 ) {
                r = '0' + r;
            }
            return r;
        }

        function getDateTime( d, t ) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), 0, 0);
        }

        function getISOString(date) {
            return date.getUTCFullYear()
                + '-' + pad( date.getUTCMonth() + 1 )
                + '-' + pad( date.getUTCDate() )
                + 'T' + pad( date.getUTCHours() )
                + ':' + pad( date.getUTCMinutes() )
                + ':' + pad( date.getUTCSeconds() )
                + 'Z';
        };

        function getGoogleString(date) {
            return date.getUTCFullYear()
                + pad( date.getUTCMonth() + 1 )
                + pad( date.getUTCDate() )
                + 'T' + pad( date.getUTCHours() )
                + pad( date.getUTCMinutes() )
                + pad( date.getUTCSeconds() )
                + 'Z';
        };

        var now = new Date();

        var startDate = new Date( now.getFullYear(), now.getMonth(), now.getDate(), 0, 0 );
        var startTime = new Date(1970, 0, 1, now.getHours(), now.getMinutes() - (now.getMinutes() % 30) + 30, 0);

        now.setSeconds( 0, 0 );
        startDate.setSeconds( 0, 0 );
        startTime.setSeconds( 0, 0 );

        $scope.rcConference = {

            topic: '',
            startDate: startDate,
            __startDate: dateFilter(startDate, $locale.STRINGS.NEWMEETING.dateFormat),
            startTime: startTime,
            __startTime: dateFilter(startTime, $locale.STRINGS.NEWMEETING.timeFormat),
            start: getISOString( startDate, startTime ),
            duration: { hours: 1, minutes: 0 },
            recurringMeeting: false,
            meetingType: 1,
            requireMeetingPassword: false,
            password: '',
            enableJoinBeforeHost: false,
            meetingId: '',
            meetingDetails: ''
        };

        $scope.$watch('rcConference.duration.hours', function(val) {
            if (val === '0' && (!$scope.rcConference.duration.minutes || $scope.rcConference.duration.minutes === '0')) {
                $scope.rcConference.duration.minutes = '30';
            }
        });


        //recalc real date values from string because we're using masked input
        function recalc(ref, format, val) {
            $scope.rcConference[ref] = val
                ? $dateParser({format: format}).parse(val)
                : null;
        }
        $scope.$watch('rcConference.__startDate', recalc.bind(this, 'startDate', $locale.STRINGS.NEWMEETING.dateFormat));
        $scope.$watch('rcConference.__startTime', recalc.bind(this, 'startTime', $locale.STRINGS.NEWMEETING.timeFormat));


        $scope.meetingDetails = '';
        $scope.loading = false;
        $scope.error = '';

        $scope.collapsed = true;
        $scope.trigger = function(){ $scope.collapsed = !$scope.collapsed; }

        $scope.invite = function()
        {
            $scope.error = '';

            if (!$scope.rcConference.topic) {
                $scope.error = $locale.STRINGS.NEWMEETING.topicRequiredError;
                return;
            }

            if (!$scope.rcConference.startDate) {
                $scope.error = $locale.STRINGS.NEWMEETING.invalidStartDateError;
                return;
            }

            if (!$scope.rcConference.startTime) {
                $scope.error = $locale.STRINGS.NEWMEETING.invalidStartTimeError;
                return;
            }

            if( ( getDateTime( $scope.rcConference.startDate, $scope.rcConference.startTime ).getTime() - now.getTime() ) < 0 ) {
                $scope.error = $locale.STRINGS.NEWMEETING.meetingInPastError;
                return;
            }

            if ($scope.rcConference.requireMeetingPassword && !$scope.rcConference.password) {
                $scope.error = $locale.STRINGS.NEWMEETING.passwordNotProvidedError;
                return;
            }

            $scope.rcConference.start = getISOString( getDateTime( $scope.rcConference.startDate, $scope.rcConference.startTime ) );
            $scope.loading = true;

            var settings = settingsService.get();
            var currentuser = settingsService.getCurrentUser();

            $scope.rcConference.dialNumber = ({ "us": '+1 (424) 203-8420', "gb": '0330 606 0505', "ca": '+1 (424) 203-8420' })[settings.countryCode.toLowerCase()];

            googleCalendar.open();
            zoomMeetings.meeting.create
            ({
                // login
                country: settings.countryCode,
                username: utils.filterNumber( currentuser.username ),
                extension: currentuser.extension? currentuser.extension: undefined,
                accesstoken: rcCore.get().getPlatform().getToken(),

                // create
                topic: $scope.rcConference.topic,
                password: $scope.rcConference.requireMeetingPassword ? $scope.rcConference.password : undefined,
                enableJoinBeforeHost: $scope.rcConference.enableJoinBeforeHost,
                meetingType: $scope.rcConference.meetingType == 1 ? 'screen_share' : 'video',

                // update
                isRepeat: $scope.rcConference.recurringMeeting,
                startTime: $scope.rcConference.start,
                duration: ((parseInt($scope.rcConference.duration.hours) * 60) + parseInt($scope.rcConference.duration.minutes)),
            })
                .then(function(data)
                {
                    var location = 'https://meetings.ringcentral.com/j/';
                    $scope.rcConference.meetingId = data.meetingId;

                    googleCalendar.load( function(){ return {
                        text: $scope.rcConference.topic,
                        details: $scope.rcConference.meetingDetails,
                        location: location + $scope.rcConference.meetingId,
                        dates: formatDate( $scope.rcConference.startDate, $scope.rcConference.startTime, $scope.rcConference.duration ),
                    }; } );
                })

                .catch(function(e){ $scope.error = e; })
                .finally(function(){ $scope.loading = false; });
        };

        $scope.infoCaption = '';
        $scope.infoMessage = '';
        $scope.infoLoading = false;

        function init()
        {
            $scope.infoLoading = true;
            rcPlatform.extension.info()
                .then(function(data)
                {
                    var contact = data && data.contact;
                    if( !contact )$scope.rcConference.topic = $locale.STRINGS.NEWMEETING.defaultTopicLabel;
                    else $scope.rcConference.topic = formatTopic( contact.firstName, contact.lastName );
                })
                .catch( function (e)
                {
                    $scope.infoCaption = $locale.STRINGS.NEWMEETING.apiErrorCaption;
                    $scope.infoMessage = $locale.STRINGS.NEWMEETING.apiErrorExtension;
                })
                .finally( function(){ $scope.infoLoading = false; } );
        }

        //reloading route on locale change to reinitialize ui components
        $scope.$on('$localeChangeSuccess', function() {
            $route.reload();
        });

        init();
    }]);



angular.module( 'openCtiApp' ).controller( "HeaderCtrl", ["$scope", "loginService", "sidebarService", function( $scope, loginService, sidebarService )
{
	'use strict';

	$scope.trigger = function (){ sidebarService.trigger(); };
	$scope.isSidebarExpanded = function(){ return sidebarService.isSidebarExpanded(); }
	$scope.logout = function(){ loginService.logout(); };

}]);

angular.module( 'openCtiApp' ).controller('dialerSettingsCtrl', ["$scope", "utils", "settingsService", "formatPhoneFilter", function( $scope, utils, settingsService, formatPhoneFilter )
{
	'use strict';

	$scope.settingError = '';
	$scope.settings = settingsService.get();

	if(!utils.filterNumber($scope.settings.directNumber)) {
        $scope.settingError = 'Invalid direct number';
    }
    else {
        //we do the filtering, because the number may come unchanged from server, ie 44123456789 or 1123456789
        $scope.settings.directNumber = formatPhoneFilter($scope.settings.directNumber);
    }

	//notificationService.notify( null, null, 'dialer' );
	//$scope.$on( '$routeChangeStart', function( next, current ){ if($scope.settingError)notificationService.notify( $scope.settingError, 'error', 'dialer' ); });

	$scope.savePromptToPress = function(){
        settingsService.set( $scope.settings );
    };

	$scope.saveDirectNumber = function() {
		if( utils.filterNumber( $scope.settings.directNumber ) ) {
			$scope.settings.directNumber = formatPhoneFilter( $scope.settings.directNumber );
			$scope.settingError = '';
		}
		else {
			$scope.settingError = 'Invalid direct number';
		}
		settingsService.set( $scope.settings );
	};

}]);

!function() {

    function parser(viewValue) {
        typeof(viewValue) === 'string' && (viewValue = (viewValue.trim())
            ? viewValue.replace(/\_/g, '')
            : viewValue);
        return viewValue;
    }

    angular.module('mgcrea.ngStrap.datepicker')
        .config(["$provide", function($provide) {
            $provide.decorator('bsDatepickerDirective', ["$delegate", "$timeout", function($delegate, $timeout) {
                var delegate = $delegate[0];
                var __link = delegate.link;
                delegate.compile = function () {
                    return function(scope, element, attr, ngModelController) {
                        //original link function
                        __link.apply(this, arguments);

                        //patching keydown to run $digest
                        element.on('keydown', function() {
                            $timeout(angular.noop);
                        });

                        if (attr.uiMask) {
                            //adding parser to replace mask characters before date validation
                            ngModelController.$parsers.unshift(parser);
                        }

                    }
                };
                return $delegate;
            }]);
        }]);

    angular.module('mgcrea.ngStrap.timepicker')
        .config(["$provide", function($provide) {
            $provide.decorator('bsTimepickerDirective', ["$delegate", "$timeout", function($delegate, $timeout) {
                var delegate = $delegate[0];
                var __link = delegate.link;
                delegate.compile = function () {
                    return function(scope, element, attr, ngModelController) {
                        //original link function
                        __link.apply(this, arguments);

                        //patching keydown to run $digest
                        element.on('keydown', function() {
                            $timeout(angular.noop);
                        });

                        if (attr.uiMask) {
                            //adding parser to replace mask characters before time validation
                            ngModelController.$parsers.unshift(parser);
                        }

                    }
                };
                return $delegate;
            }]);
        }]);

}();

angular.module('openCtiApp').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/active-call-monitor.html',
    "<div ng-show=\"show && (inboundCalls.length + outboundCalls.length)>0\"  ng-controller=\"ActiveCallCtrl\" >\n" +
    "\n" +
    "\t<div class=\"manage-calls\">\n" +
    "\t\t<button class=\"button delete\" ng-click=\"show=false\">{{STRINGS.ACTIVECALLMONITOR.closeButton}}</button>\n" +
    "\t</div>\n" +
    "\n" +
    "<div class=\"active-calls-container rc-pane-scrollable\">\n" +
    "\t<div class=\"calls\">\n" +
    "\n" +
    "\t\t<div class=\"calls-wrap\" ng-repeat=\"call in inboundCalls\">\n" +
    "\t\t\t<div>\n" +
    "\n" +
    "\t\t\t\t<div class=\"title\">\n" +
    "\n" +
    "\t\t\t\t\t<div ng-class=\"{ flash: call.callStatus == 'Ringing' }\" class=\"call-inbound\">\n" +
    "                        {{STRINGS.ACTIVECALLMONITOR.incomingCallCaption}}\n" +
    "                    </div>\n" +
    "\n" +
    "\t\t\t\t\t<div class=\"name\">{{getNameByNumber(call.from)}}</div>\n" +
    "\t\t\t\t\t<div class=\"phone\">{{call.from | formatPhone}}</div>\n" +
    "\n" +
    "\t\t\t\t\t<img ng-if=\"!call.avatarUrl\" class=\"avatar-big\" src=\"images/icon/incognito_big.png\">\n" +
    "\t\t\t\t\t<img ng-if=\"call.avatarUrl\" class=\"avatar-big\" ng-src=\"{{call.avatarUrl}}\" src-safe=\"images/icon/incognito_big.png\">\n" +
    "\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'Ringing'\" class=\"flash call-inbound\">{{STRINGS.ACTIVECALLMONITOR.callStatusRinging}}</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'NoCall'\">{{STRINGS.ACTIVECALLMONITOR.callStatusFinished}}</div>\n" +
    "\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus != 'OnHold'\">&nbsp;</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'OnHold'\">{{STRINGS.ACTIVECALLMONITOR.callStatusHold}}</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'CallConnected' || call.callStatus == 'OnHold'\" duration=\"call.sessionId\">&nbsp;</div>\n" +
    "\n" +
    "\t\t\t\t</div>\n" +
    "\t\t\t</div>\n" +
    "\t\t</div>\n" +
    "\n" +
    "\t\t<div class=\"calls-wrap\" ng-repeat=\"call in outboundCalls\">\n" +
    "\t\t\t<div>\n" +
    "\t\t\t\t<!-- Ringing,Waiting,CallerConnected,CalleeConnected,OnHold,NoCall -->\n" +
    "\t\t\t\t<div class=\"title\">\n" +
    "\t\t\t\t\t<div class=\"call-outbound\">{{STRINGS.ACTIVECALLMONITOR.outgoingCallCaption}}</div>\n" +
    "\t\t\t\t\t<div class=\"name\">{{getNameByNumber(call.to)}}</div>\n" +
    "\t\t\t\t\t<div class=\"phone\">{{call.to | formatPhone}}</div>\n" +
    "\n" +
    "\t\t\t\t\t<img ng-if=\"!call.avatarUrl\" class=\"avatar-big\" src=\"images/icon/incognito_big.png\">\n" +
    "\t\t\t\t\t<img ng-if=\"call.avatarUrl\" class=\"avatar-big\" ng-src=\"{{call.avatarUrl}}\" src-safe=\"images/icon/incognito_big.png\">\n" +
    "\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'Ringing'\">{{STRINGS.ACTIVECALLMONITOR.callStatusRingingToBrand.replace('%s', (brand | normalizeBrand))}}</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'Waiting'\">{{STRINGS.ACTIVECALLMONITOR.callStatusWaiting}}</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'CallerConnected'\">{{STRINGS.ACTIVECALLMONITOR.callStatusCallerConnected}}</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'NoCall'\">{{STRINGS.ACTIVECALLMONITOR.callStatusFinished}}</div>\n" +
    "\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus != 'OnHold'\">&nbsp;</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'OnHold'\">{{STRINGS.ACTIVECALLMONITOR.callStatusHold}}</div>\n" +
    "\t\t\t\t\t<div ng-if=\"call.callStatus == 'CalleeConnected' || call.callStatus == 'OnHold'\" duration=\"call.sessionId\">&nbsp;</div>\n" +
    "\n" +
    "\t\t\t\t</div>\n" +
    "\t\t\t</div>\n" +
    "\t\t</div>\n" +
    "\n" +
    "\n" +
    "\t</div>\n" +
    "\n" +
    "</div>\n" +
    "</div>"
  );


  $templateCache.put('views/call-log-entry.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.CALLENTRY.callLogEntryScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable\">\n" +
    "    <spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "    <div ng-show=\"!showSpinner\">\n" +
    "        <div class=\"not-found\" ng-if=\"!call && !showSpinner\">\n" +
    "            <p>{{STRINGS.CALLENTRY.noCallsInfo}}</p>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"call-info\" ng-if=\"call\">\n" +
    "\n" +
    "            <div ng-if=\"!call.isMissed()\">\n" +
    "                <div ng-if=\"call.isOutbound()\" class=\"status outbound\">{{STRINGS.CALLENTRY.outgoingCallCaption}}</div>\n" +
    "                <div ng-if=\"call.isInbound()\" class=\"status inbound\">{{STRINGS.CALLENTRY.incomingCallCaption}}</div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div ng-if=\"call.isMissed()\">\n" +
    "                <div class=\"status missed\">{{STRINGS.CALLENTRY.missedCallCaption}}</div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"contact\">\n" +
    "                <div class=\"name\">\n" +
    "                    <span>{{ call.getNameOrUnknown() }}</span>\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"phone\">\n" +
    "                    <span>{{ call.getDisplayNumber() | formatPhone }}</span>\n" +
    "                    <span ng-if=\"call.getDisplayLocation('')\">, {{ call.getDisplayLocation('') }}</span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "\n" +
    "            <img ng-if=\"!avatarUrl\" class=\"avatar-big\" src=\"images/icon/incognito_big.png\">\n" +
    "            <img ng-if=\"avatarUrl\" class=\"avatar-big\" ng-src=\"{{ avatarUrl }}\">\n" +
    "\n" +
    "            <div class=\"time\">\n" +
    "                {{ call.startTime | formatDate:\"long\" }}\n" +
    "            </div>\n" +
    "\n" +
    "        <div ng-if=\"call.isMissed()\"><div></div>&nbsp;</div>\n" +
    "            <div ng-if=\"!call.isMissed()\" class=\"duration\">\n" +
    "                {{ call.duration | formatDuration }}\n" +
    "            </div>\n" +
    "\n" +
    "\n" +
    "            <div class=\"button-actions\">\n" +
    "                <a ng-if=\"call.getDisplayNumber()\" class=\"button save wide\" href=\"#/dialer/{{ call.getDisplayNumber() }}?backUrl={{ currentUrl }}\">\n" +
    "                    {{STRINGS.CALLENTRY.callButton}}\n" +
    "                </a>\n" +
    "                <a ng-if=\"call.getDisplayNumber() && showTextButton\" class=\"button save wide\" href=\"#/new-sms/{{ call.getDisplayNumber() }}?backUrl={{ currentUrl }}\">\n" +
    "                    {{STRINGS.CALLENTRY.textButton}}\n" +
    "                </a>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/call-log.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1>\n" +
    "        {{STRINGS.CALLLOG.callLogScreenHeader}}\n" +
    "    </h1>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"tabs tabs2 badges\">\n" +
    "    <a class=\"tab\" ng-click=\"setViewAnimation('');\" ng-class=\"{active: activeTab == 0}\" href=\"#/call-log/0\" title=\"{{STRINGS.CALLLOG.allCallsTabTitle}}\">\n" +
    "        {{STRINGS.CALLLOG.allCallsTab}}\n" +
    "    </a>\n" +
    "    <a class=\"tab\" ng-click=\"setViewAnimation('');\" ng-class=\"{active: activeTab == 1}\" href=\"#/call-log/1\" title=\"{{STRINGS.CALLLOG.missedCallsTabTitle}}\">\n" +
    "        {{STRINGS.CALLLOG.missedCallsTab}}\n" +
    "        <span class=\"badge\" ng-if=\"(counters.calls|removeInboundLeg|filterMissedCalls|filterStarttimeCalls).length\">\n" +
    "            {{ (counters.calls|removeInboundLeg|filterMissedCalls|filterStarttimeCalls).length }}\n" +
    "        </span>\n" +
    "    </a>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"\">\n" +
    "    <div class=\"search-box\">\n" +
    "        <input type=\"text\" ng-model=\"searchFilter\" placeholder=\"{{STRINGS.CALLLOG.searchPlaceholder}}\">\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable rc-pane-scrollable-under-tabs call-log\">\n" +
    "    <spinner show=\"showSpinner\"></spinner>\n" +
    "    <div class=\"messages\" ng-show=\"!showSpinner\">\n" +
    "        <div class=\"message call-log-entry\" ng-repeat=\"call in filteredCalls = (calls | removeInboundLeg | filterMissedCalls:activeTab | filterCalls:searchFilter | orderBy:'startTime':true )\" ng-class=\"{missed: call.isMissed()}\">\n" +
    "            <i ng-class=\"{'call-active': !call.isMissed() && call.isInbound(),'call-outbound': !call.isMissed() && call.isOutbound(), 'call-missed': call.isMissed()}\"></i>\n" +
    "\n" +
    "            <a class=\"info\" ng-click=\"setViewAnimation('slide-left');\" ng-href=\"#/call-log-entry/{{ call.id | urlencode }}?backUrl={{ currentUrl }}\"></a>\n" +
    "            <span class=\"time\">{{ call.startTime | formatDate }}</span>\n" +
    "\n" +
    "            <div class=\"body\">\n" +
    "                <a class=\"contact\" ng-if=\"call.getDisplayPhone()\"\n" +
    "                   ng-href=\"#/contact/phoneNumber/{{ call.getDisplayPhone() | normalizePhone }}?backUrl={{ currentUrl }}\">\n" +
    "                    {{ call.getNameOrNumber() || STRINGS.GENERAL.unknownCallerId}}</a>\n" +
    "\n" +
    "                <a class=\"contact\" ng-if=\"call.getDisplayExtension()\"\n" +
    "                   ng-href=\"#/contact/extensionNumber/{{ call.getDisplayExtension() | normalizePhone }}?backUrl={{ currentUrl }}\">\n" +
    "                    {{ call.getNameOrNumber() || STRINGS.GENERAL.unknownCallerId}}</a>\n" +
    "\n" +
    "                <span class=\"contact\" ng-if=\"!call.getDisplayPhone() && !call.getDisplayExtension()\">{{ call.getNameOrNumber() || STRINGS.GENERAL.unknownCallerId }}</span>\n" +
    "\n" +
    "                <p class=\"text\">{{ call.getDisplayLocation() }}</p>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"not-found\" ng-if=\"filteredCalls.length === 0 && !showSpinner\">\n" +
    "        <p>{{STRINGS.CALLLOG.noCallsInfo}}</p>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/conference-commands.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.CONFERENCECOMMANDS.conferenceCommandsScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "<div class=\"rc-pane-scrollable conference-commands\">\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/2.png\" alt=\"2\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.callerCountInstruction\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/3.png\" alt=\"3\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.leaveConferenceInstruction\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/4.png\" alt=\"4\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.menuInstruction\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/5.png\" alt=\"5\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.setListeningModeInstructions\n" +
    "            .replace('%s', 'images/conference/mi_star.png')\n" +
    "            .replace('%s', 'images/conference/mi_pound.png')\n" +
    "            .replace('%s', 'images/conference/mi_6.png')\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/6.png\" alt=\"6\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.muteHostLineInstructions\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/7.png\" alt=\"7\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.secureCallInstructions\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/pound.png\" alt=\"pound\">\n" +
    "            <img ng-src=\"images/conference/8.png\" alt=\"8\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.hearEnterExitSoundsInstructions\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <div class=\"keys\">\n" +
    "            <img ng-src=\"images/conference/star.png\" alt=\"star\">\n" +
    "            <img ng-src=\"images/conference/9.png\" alt=\"9\">\n" +
    "        </div>\n" +
    "        <div class=\"instructions\" ng-bind-html=\"STRINGS.CONFERENCECOMMANDS.recordInstructions\"></div>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/contact.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.CONTACT.contactScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable\">\n" +
    "\n" +
    "    <div class=\"not-found\" ng-if=\"!contact && !showSpinner\">\n" +
    "        <p>{{STRINGS.CONTACT.contactNotFound}}</p>\n" +
    "        <p ng-if=\"isGoogleAuthorized === false\">\n" +
    "            {{STRINGS.CONTACT.googleContactsNotAuthorizedInfo}}<br/>\n" +
    "            <button class=\"button save\" ng-click=\"authorizeGoogleC()\">\n" +
    "                {{STRINGS.SETTINGS.googleContactsAuthorizeButton}}\n" +
    "            </button>\n" +
    "        </p>\n" +
    "    </div>\n" +
    "\n" +
    "    <spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "    <div ng-if=\"contact\">\n" +
    "        <div class=\"contact-info\" ng-if=\"contact\">\n" +
    "            <div class=\"id\">\n" +
    "                <img ng-if=\"!contact.avatarUrl\" class=\"avatar\" src=\"images/icon/incognito.png\">\n" +
    "                <img ng-if=\"contact.avatarUrl\" class=\"avatar\" ng-src=\"{{ contact.avatarUrl }}\" src-safe=\"images/icon/incognito.png\">\n" +
    "\n" +
    "                <div class=\"name\">\n" +
    "                    {{ contact.firstName }} {{ contact.lastName }}\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"clear\"></div>\n" +
    "            </div>\n" +
    "\n" +
    "            <section ng-if=\"contact.company || contact.jobTitle\">\n" +
    "                <h2>Contact Info</h2>\n" +
    "\n" +
    "                <div class=\"line\" ng-show=\"contact.company\">\n" +
    "                    <label>Company</label>\n" +
    "\n" +
    "                    <div class=\"value\">\n" +
    "                        {{ contact.company }}\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"line\" ng-show=\"contact.jobTitle\">\n" +
    "                    <label>Title</label>\n" +
    "\n" +
    "                    <div class=\"value\">\n" +
    "                        {{ contact.jobTitle }}\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </section>\n" +
    "\n" +
    "            <section>\n" +
    "                <h2>{{STRINGS.CONTACT.emailsHeader}}</h2>\n" +
    "\n" +
    "                <div class=\"line\" ng-show=\"contact.email\">\n" +
    "                    <label>{{STRINGS.CONTACT.email1Label}}</label>\n" +
    "\n" +
    "                    <div class=\"value\">\n" +
    "                        <a href=\"mailto:{{ contact.email }}\" target=\"_blank\" title=\"{{ contact.email }}\">{{ contact.email }}</a>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "                <div class=\"line\" ng-show=\"contact.email2\">\n" +
    "                    <label>{{STRINGS.CONTACT.email2Label}}</label>\n" +
    "\n" +
    "                    <div class=\"value\">\n" +
    "                        <a href=\"mailto:{{ contact.email2 }}\" target=\"_blank\" title=\"{{ contact.email2 }}\">{{ contact.email2 }}</a>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "                <div class=\"line\" ng-show=\"contact.email3\">\n" +
    "                    <label>{{STRINGS.CONTACT.email3Label}}</label>\n" +
    "\n" +
    "                    <div class=\"value\">\n" +
    "                        <a href=\"mailto:{{ contact.email3 }}\" target=\"_blank\" title=\"{{ contact.email3 }}\">{{ contact.email3 }}</a>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <google-mail ng-if=\"false\" from=\"contact.email\" limit=\"2\"></google-mail>\n" +
    "            </section>\n" +
    "\n" +
    "            <section>\n" +
    "                <h2>{{STRINGS.CONTACT.phoneNumberHeader}}</h2>\n" +
    "\n" +
    "                <div class=\"line\" ng-if=\"contact.isCompany()\">\n" +
    "                    <label>{{STRINGS.CONTACT.extensionLabel}}</label>\n" +
    "                    <contact-phone phone=\"contact.extensionNumber\" current-url=\"{{ currentUrl  }}\" no-fax=\"true\" show-text-button=\"features.pager !== undefined\"></contact-phone>\n" +
    "                </div>\n" +
    "\n" +
    "                <div ng-if=\"!contact.isCompany()\">\n" +
    "                    <div class=\"line\" ng-if=\"contact.homePhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.home1Label}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.homePhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.homePhone2\">\n" +
    "                        <label>{{STRINGS.CONTACT.home2Label}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.homePhone2\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.businessPhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.busyness1Label}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.businessPhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.businessPhone2\">\n" +
    "                        <label>{{STRINGS.CONTACT.busyness2Label}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.businessPhone2\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.mobilePhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.mobileLabel}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.mobilePhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.companyPhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.companyLabel}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.companyPhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.assistantPhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.assistantLabel}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.assistantPhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.carPhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.carLabel}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.carPhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.otherPhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.anotherLabel}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.otherPhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                    <div class=\"line\" ng-if=\"contact.callbackPhone\">\n" +
    "                        <label>{{STRINGS.CONTACT.callbackLabel}}</label>\n" +
    "                        <contact-phone show-text-button=\"features.sms !== undefined\" phone=\"contact.callbackPhone\" current-url=\"{{ currentUrl  }}\"></contact-phone>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <rc-calls ng-if=\"false\" number=\"contact.getMainPhoneNumber()\" limit=\"2\"></rc-calls>\n" +
    "            </section>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>"
  );


  $templateCache.put('views/contactpicker.html',
    "<div class=\"rc-pane-header\">\n" +
    "\t<h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.CONTACTPICKER.contactPickerScreenHeader}}\n" +
    "\t</h1-with-back-url>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"\">\n" +
    "\t<div class=\"search-box\">\n" +
    "\t\t<input type=\"text\" ng-model=\"searchFilter\" placeholder=\"{{STRINGS.CONTACTPICKER.searchPlaceholder}}\">\n" +
    "\t</div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable contacts\">\n" +
    "\t<div class=\"contacts-container contactpicker-container\">\n" +
    "\t\t<div class=\"messages\">\n" +
    "\t\t\t<div>\n" +
    "\n" +
    "\t\t\t\t<spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "\t\t\t\t<div class=\"message contact\" \n" +
    "\t\t\t\t\tng-click=\"pick( contact.extensionNumber, contact.getMainPhoneNumber() ) && setViewAnimation('slide-right')\" \n" +
    "\t\t\t\t\tng-repeat=\"contact in filteredContacts = (contacts | filterContacts:searchFilter | orderBy:['firstName.toLowerCase()', 'lastName.toLowerCase()']) track by contact.trackingId\" >\n" +
    "\t\t\t\t\t\n" +
    "\t\t\t\t\t<img ng-if=\"!contact.avatarUrl\" class=\"avatar\" src=\"images/icon/incognito.png\">\n" +
    "\t\t\t\t\t<img ng-if=\"contact.avatarUrl\" class=\"avatar\" ng-src=\"{{ contact.avatarUrl }}\" src-safe=\"images/icon/incognito.png\">\n" +
    "\n" +
    "\t\t\t\t\t<span class=\"phone\" title=\"{{ contact.extensionNumber }}\">{{ contact.extensionNumber }}</span>\n" +
    "\t\n" +
    "\t\t\t\t\t<div class=\"body {{contact.extensionNumber?'ext':''}}\">\n" +
    "\t\t\t\t\t\t<span class=\"contact\">{{ contact.firstName }} {{ contact.lastName }}</span>\n" +
    "\t\t\t\t\t\t<div class=\"text\" ng-if=\"!contact.extensionNumber\">{{ contact.getMainPhoneNumber() }}</div>\n" +
    "\t\t\t\t\t</div>\n" +
    "\t\t\t\t</div>\n" +
    "\t\t\t</div>\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "\t<div class=\"not-found\" ng-if=\"filteredContacts.length === 0 && !showSpinner\">\n" +
    "\t\t<p>{{STRINGS.CONTACTPICKER.noContactsMessage}}</p>\n" +
    "\t</div>\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "\n"
  );


  $templateCache.put('views/contacts.html',
    "<div class=\"rc-pane-header\">\n" +
    "\t<h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.CONTACTS.contactsScreenHeader}}\n" +
    "\t</h1-with-back-url>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"\">\n" +
    "\t<div class=\"search-box\">\n" +
    "\t\t<input type=\"text\" ng-model=\"searchFilter\" placeholder=\"{{STRINGS.CONTACTS.searchPlaceholder}}\" ng-change=\"change(searchFilter)\">\n" +
    "\t</div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable contacts\">\n" +
    "\t<div class=\"contacts-container\">\n" +
    "\t\t<div class=\"messages\">\n" +
    "\t\t\t<div>\n" +
    "\n" +
    "\t\t\t\t<spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "\t\t\t\t\t<div class=\"message contact\" ng-repeat=\"contact in filteredContacts = (contacts | orderBy:['firstName.toLowerCase()', 'lastName.toLowerCase()']) track by contact.trackingId\">\n" +
    "\t\t\t\t\t\t<img ng-if=\"!contact.avatarUrl\" class=\"avatar\" src=\"images/icon/incognito.png\">\n" +
    "\t\t\t\t\t\t<img ng-if=\"contact.avatarUrl\" class=\"avatar\" ng-src=\"{{ contact.avatarUrl }}\" src-safe=\"images/icon/incognito.png\">\n" +
    "\n" +
    "\t\t\t\t\t\t<a class=\"info\" ng-click=\"setViewAnimation('slide-left');\" href=\"#/contact/{{ contact.trackingId }}?backUrl={{ backurl }}\"></a>\n" +
    "\t\t\t\t\t\t<span class=\"phone\" title=\"{{ contact.extensionNumber }}\">{{ contact.extensionNumber }}</span>\n" +
    "\n" +
    "\t\t\t\t\t\t<a class=\"body {{contact.extensionNumber?'ext':''}}\" ng-click=\"setViewAnimation('slide-left');\" href=\"#/contact/{{ contact.trackingId }}?backUrl={{ backurl }}\">\n" +
    "\t\t\t\t\t\t\t<span class=\"contact\" >{{ contact.firstName }} {{ contact.lastName }}</span>\n" +
    "\t\t\t\t\t\t\t<span class=\"text\" ng-if=\"!contact.extensionNumber\">{{ contact.getMainPhoneNumber() }}</span>\n" +
    "\t\t\t\t\t\t</a>\n" +
    "\t\t\t\t\t</div>\n" +
    "\t\t\t</div>\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "\t<div class=\"not-found\" ng-if=\"filteredContacts.length === 0 && !showSpinner\">\n" +
    "\t\t<p>{{STRINGS.CONTACTS.searchContactHint}}</p>\n" +
    "\t\t<p ng-if=\"isGoogleAuthorized !== true\">\n" +
    "\t\t\t{{STRINGS.CONTACTS.googleContactsNotAuthorizedInfo}}<br/>\n" +
    "\t\t\t<button class=\"button save\" ng-click=\"authorizeGoogleC()\">\n" +
    "                {{STRINGS.CONTACTS.googleContactsAuthorizeButton}}\n" +
    "            </button>\n" +
    "\t\t</p>\n" +
    "\t</div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/conversation.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        <span title=\"{{header}}\">\n" +
    "            {{ header }}\n" +
    "        </span>\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable rc-pane-scrollable-above-bar\" rc-scroll-bottom>\n" +
    "    <div class=\"rc-widget\">\n" +
    "        <div class=\"rc-frame rc-page-login\">\n" +
    "            <div class=\"rc-mainpart\">\n" +
    "                <spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "                <div ng-repeat=\"message in messages | orderBy:['creationTime', 'id']\">\n" +
    "                    <a class=\"conversation-message-anchor\" id=\"#{{message.id}}\">{{message.id}}</a>\n" +
    "\n" +
    "                    <div>\n" +
    "                        <p class=\"conversation-timestamp\" ng-show=\"$index === 0 || showTime(message)\">\n" +
    "                            {{ message.creationTime.getTime() | date:'short' }}\n" +
    "                        </p>\n" +
    "\n" +
    "                        <div class=\"conversation-message-container\" ng-class=\"{\n" +
    "                            'outbound': message.isOutbound(),\n" +
    "                            'inbound': message.isInbound()\n" +
    "                            }\">\n" +
    "                            <p class=\"conversation-user\" ng-if=\"message.isInbound() && recipients.length > 1\">\n" +
    "                                {{message.from.name || message.from.number || STRINGS.CONVERSATION.unknownContact}}\n" +
    "                            </p>\n" +
    "\n" +
    "                            <p class=\"conversation-message conversation-word-break\"\n" +
    "                               ng-class=\"{\n" +
    "                                'outbound': message.isOutbound(),\n" +
    "                                'inbound': message.isInbound(),\n" +
    "                                'error': message.isSent() && message.isSendingError()\n" +
    "                            }\">\n" +
    "                                {{ message.subject }}\n" +
    "                            </p>\n" +
    "\n" +
    "                            <p class=\"conversation-message-info\" ng-if=\"message.isSent() && message.isSendingError()\">\n" +
    "                                {{message.messageStatus === 'SendingFailed'\n" +
    "                                        ? STRINGS.CONVERSATION.messageIsNotSentError\n" +
    "                                        : STRINGS.CONVERSATION.messageIsNotDeliveredError}}\n" +
    "                            </p>\n" +
    "                        </div>\n" +
    "\n" +
    "                        <div class=\"conversation-clear\"></div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"conversation-send-sms-bar\">\n" +
    "    <rc-send-sms\n" +
    "            disabled=\"showSpinner\"\n" +
    "            recipients=\"recipients\"\n" +
    "            before-send=\"beforeSend()\"\n" +
    "            after-send=\"afterSend($message)\"\n" +
    "            send-as-group=\"recipients.length > 1\"\n" +
    "            reply-to=\"lastMessageId\">\n" +
    "    </rc-send-sms>\n" +
    "</div>\n"
  );


  $templateCache.put('views/dialer-settings.html',
    "<form>\n" +
    "\t<div class=\"line line-input\">\n" +
    "\t\t<div class=\"combobox-label\">\n" +
    "\t\t\t{{STRINGS.DIALERSETTIGNS.makeOutboundCallWithLabel}}\n" +
    "\t\t\t<a ng-click=\"help.direct=!help.direct;help.promptToPress=false\" class=\"msg-trigger\"></a>\n" +
    "\t\t</div>\n" +
    "\n" +
    "\t\t<div ng-show=\"help.direct\" class=\"direct-num-msg msg-box info slide-down ng-hide\"\n" +
    "                ng-bind-html=\"STRINGS.DIALERSETTIGNS.makeOutboundCallWithHelp\">\n" +
    "\t\t</div>\n" +
    "\n" +
    "\t\t<div class=\"value dropdown\" dropdown>\n" +
    "\t\t\t<input class=\"rc-input dropdown-img\" type=\"text\" ng-model=\"settings.directNumber\" ng-keydown=\"$event.which === 13 && saveDirectNumber()\" ng-blur=\"saveDirectNumber()\" dropdown-toggle ng-class=\"{'invalid':settingError}\"/>\n" +
    "\n" +
    "\t\t\t<ul class=\"dropdown-menu combobox\">\n" +
    "\t\t\t\t<li ng-click=\"settings.directNumber=directNumber;saveDirectNumber()\" ng-repeat=\"directNumber in settings.directNumbers\" class=\"combobox-option\">\n" +
    "\t\t\t\t\t<span ng-if=\"false\" class=\"option-prefix\">RC</span> {{directNumber|formatPhone}}\n" +
    "\t\t\t\t</li>\n" +
    "\t\t\t</ul>\n" +
    "\t\t</div>\n" +
    "\n" +
    "\t\t<div ng-show=\"settingError\" class=\"msg-box error small slide-down ng-hide\">\n" +
    "\t\t\t<p ngi-if=\"settingError\">{{settingError}}</p>\n" +
    "\t\t\t<p ngi-if=\"!settingError\">&nbsp;</p>\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "\t<div class=\"line\">\n" +
    "\t\t<div class=\"value value-right dropdown\">\n" +
    "\t\t\t<label class=\"checkbox\">\n" +
    "\t\t\t<input type=\"checkbox\" ng-model=\"settings.promptToPress\" ng-change=\"savePromptToPress()\"/>\n" +
    "\t\t\t<span>{{STRINGS.DIALERSETTIGNS.press1ToStartCallLabel}}</span>\n" +
    "\t\t\t<a ng-click=\"help.promptToPress=!help.promptToPress;help.direct=false\" class=\"msg-trigger\"></a>\n" +
    "\t\t</label>\n" +
    "\t\t\t</div>\n" +
    "\n" +
    "\t\t<div ng-show=\"help.promptToPress\" class=\"prompt-msg msg-box info slide-down ng-hide\"\n" +
    "                ng-bind-html=\"STRINGS.DIALERSETTIGNS.press1ToStartCallHelp\">\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "</form>\n"
  );


  $templateCache.put('views/dialer.html',
    "<div class=\"rc-pane-header\" ng-click=\"collapseSettings()\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.DIALER.dialerScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "    <i class=\"trigger\" ng-class=\"{'up':!settingsCollapsed, 'down':settingsCollapsed}\">&nbsp;</i>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable dialer\">\n" +
    "\n" +
    "    <div class=\"settings ng-hide\"\n" +
    "         ng-show=\"!settingsCollapsed\"\n" +
    "         ng-include=\"'views/dialer-settings.html'\"\n" +
    "         ng-controller=\"dialerSettingsCtrl\"></div>\n" +
    "\n" +
    "    <div>\n" +
    "        <form ng-submit=\"callButtonClickHandler()\" method=\"post\">\n" +
    "            <div class=\"rc-call-target\">\n" +
    "                <label>To:</label>\n" +
    "                <div class=\"value\">\n" +
    "                    <contactpicker-input\n" +
    "                            placeholder=\"{{STRINGS.DIALER.contactpickerPlacholder}}\"\n" +
    "                            hide-placeholder=\"true\"\n" +
    "                            recipients=\"contact\"\n" +
    "                            recipient-count=\"1\"\n" +
    "                            value=\"targetValue\"></contactpicker-input>\n" +
    "                </div>\n" +
    "                <contactpicker contactpicker-silent=\"true\" contactpicker-multiple=\"false\" contactpicker-value=\"contactNum\"/>\n" +
    "            </div>\n" +
    "\n" +
    "            <!-- Error divs -->\n" +
    "            <div ng-show=\"errorType==='CustomError'\" class=\"error-msg\">\n" +
    "                {{STRINGS.DIALER.customError.replace('%s', errorMsg)}}\n" +
    "            </div>\n" +
    "            <div ng-show=\"errorType==='RingoutError'\" class=\"error-msg\">\n" +
    "                {{STRINGS.DIALER.ringoutError.replace('%s', errorMsg)}}\n" +
    "            </div>\n" +
    "            <div ng-show=\"errorType==='FailedToComplete'\" class=\"error-msg\">\n" +
    "                {{STRINGS.DIALER.failedToCompleteError}}\n" +
    "            </div>\n" +
    "            <div ng-show=\"errorType==='CannotReach'\" class=\"error-msg\">\n" +
    "                {{STRINGS.DIALER.cannotReachRCPhoneError.replace('%s', errorMsg)}}\n" +
    "            </div>\n" +
    "            <!-- ----- -->\n" +
    "\n" +
    "            <div class=\"rc-dialer-buttons\">\n" +
    "                <div class=\"rc-btn-line\">\n" +
    "                    <button type=\"button\" id=\"keypad-1\" ng-click=\"dialButtonClickHandler(1);\" value=\"1\"\n" +
    "                            class=\"rc-dialer-btn rc-dialer-btn-first\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">1</span>\n" +
    "                        <span class=\"rc-btn-letters\">&nbsp;</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                    <button type=\"button\" id=\"keypad-2\" ng-click=\"dialButtonClickHandler(2);\" value=\"2\"\n" +
    "                            class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">2</span>\n" +
    "                        <span class=\"rc-btn-letters\">ABC</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                    <button type=\"button\" id=\"keypad-3\" ng-click=\"dialButtonClickHandler(3);\"\n" +
    "                            value=\"3\" class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">3</span>\n" +
    "                        <span class=\"rc-btn-letters\">DEF</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40ZCUAkBYAABjDmGOOQSehlJRaa5iCUELopKTSSmyxNUpBCCGEUlJKrbXWMuiolJJKSq3FFmOMmYNSUiolpdRijLHWDkJKLbUWW4ux5lprB6GklFqLLcZaa669g5BKa63lGGOwOefaQSgptdhijDXXWnsOqbQWY4y19lxrzTmIUlKKMdYac80199xLSq3FmmuuNQefcxCmpdhqjTXnnHsQOvjUWo255h500EHnHnRKrdZaa849ByF88Lm1WGvNNefegw86CN9qqzXnXGvvPfeeg24x1lxz0MEHIXzwQbgYa8859xyEDjr4HgwAyI1wAEBcMJKQOsuw0ogbT8AQgRQasgoAiAEAIIxBBiGElFJKKaWUYoopxhhjjDHGGGOMMcYYY4wxxgQAACY4AAAEWMGuzNKqjeKmTvKiDwKf0BGbkSGXUjGTE0GP1FCLlWCHVnCDF4CFhqwEAMgAABCIseZac44QlNZi7blUSjlqseeUIYKctJxLyQxBTlprLWTIKCcxthQyhBS02lrplFKMYquxdIwxSanFlkrnIAAAAIIAAAMRMhMIFECBgQwAOEBIkAIACgsMHcNFQEAuIaPAoHBMOCedNgAAQYjMEImIxSAxoRooKqYDgMUFhnwAyNDYSLu4gC4DXNDFXQdCCEIQglgcQAEJODjhhife8IQbnKBTVOogAAAAAAAQAOABACDZACKimZnj6PD4AAkRGSEpMTlBSVEJAAAAAAAgAPgAAEhWgIhoZuY4Ojw+QEJERkhKTE5QUlQCAAAAAAAAAACAgIAAAAAAAEAAAACAgE9nZ1MABNcZAAAAAAAAimynJgIAAAAK7cXqDD5Y5XBs/x///w8BAaTZ3HOl8NrTgbfc6XNPT/jHkyyacwAgCcAg5vLF3IO04PfZSiFg0oc5zKEadaTmnuPk3SK9m67/Hz+M4mgE9AXzzfPnc+wPLP3460Pd/9B8LlCm3t0dLE7POK3t99/JOH1x7nTGvw6iCX2TqbhINnJ4/VOvZvL/jGnedfMtS6XnXP2df2eoxdNn+aMd52ZmX/xyDyzTFpoVRPz1i2/Dp1WfsdXZamIZXj7/N37z3/xH/NBv/iNu9CfbJwEAvCMAAAXASAtICgDTpjmRtGxeJnu50vqJmcYCADA82hcAvC/6w/V0PJxPx91+1Wceqmlz//0/79f1dL6cV0N9BhlclrOpKbNkUBNiyvKiLMqizPYak1UkBgAAAADg8/XXXwe0+/rrr79+V2Gtk+Xl5eXl97q8momHL+dzX38LD4e3w9vz7f79t7/35xXzh/kigzSDdTd79/bu3buz07t3706n01l/djoePnrC119/23//hYWFKW3hQhRPnjq5IgAeJeTlTeJFzP/GR3X+m0iG9wAAAADLYwEAAIAAIcYAAACAX14EAMBf//IGAABAxWgwWeizVbuMlScx6ubyqsbDQ1EAAAAAAEBQUr+9hv6PIgAAAAAAEAXFDTU0I+dPwzZOh7S9Zj8xF/eXQlowhQoA/iRU5E3Ci5j/bR/V+beSCcF7AAAAgOURAAAAIMAYAQAAAODLS00AQO1bCgAAoCLqxqRUVH07GPZlEZMb47563LfmBQoAAAAAACCoTLunnFNEAQAAAAAwrAV6xpvbfJVsOD82+1MxSViSiMEFnhVE4eUTPps+W3Ue08pWk3gZxjyn2ux1Gua5fQUAWOYAACRjjFMNyQCAr20oVfW4uZ1LvjejP9m4AQDcf84MANnp2pDylKegYoum67qmyqI1xhgbs2qwGrwvr9/le17Pxzq5ijHGGCMiIsbYO3c8isfjMTIAAFfPH+aWGFvb10EH4f47WRv2wv03QhvAXhv4/6+DAu6/eayDMr9/I1qaNX+YW7T9+YlEHmLdI6HW2N////EJD5OJ1jaER0bCZvlZZ7V7mCPnZG+nr3hzO6Fq5alW5U1OnXFGe//5f+t5rz3HOhwJNHvye77cmmR4R+ccASI8GGHN4uP/f2jQAYIe7tyZUDwemxgRY4zQk5mJxgrYviPNugW/fyfLcCDcAp6EQ8P+9KjIN1wZmuwTzmf69LnlYOe2Mc3C8PrvjH/0zdnJTNSanEz7cGTkah893tW2yZimSW0Xc6X6+Qez5HK+H4KR8xczfB6zz0f1/RAXZp+fn8fwjSvnvx/4pj/s86tf57+nz+03hju7wuTsO7t2mWf69LmzaR8JM50U37ltT7hO9k9KjExPltO+c3MWf2uX/OGHy/npsvj7Q22upH1+9YcxfI7zz39jhs8/7POrLH4/1C5V2fnVz2MQJAV4F/hY+IHb/AclU1SXohgv+21l3SR+GR/8GbkGRCGsWkHpmt43amfDL+ISrtVi5/9r+P7YclsE3Zhte+PX4jfR/um/OI/V9m3Jz2nebYaTlfBiwj0bfkWToeE+/rUnbcj/5e//2vH+kP7Op3fmGvJP6OVW/Wv1n5/ww13ySnBRrK2KP6zxCqXsfj2Tfz3Gzot9eWTI/I9v+dEp1p1e4VqusN/GWa6wOEo6Maqt17X4j5nctN7bbk/XNtaf8cuMEMxku8eW27y2tLEeWm4DZ8O17OfUK3OFjx45zp94q63ZWvM74GhEO+S71l9CoxW/w7W5aIKhD+LhKXZ7+kBc0Y056X70R9o9ttTG41/EO8H9JjRWxcnXmb7NH/h7bk01feaZNpEo5vipM/X+TbfspZhahySVxb//+yi027tTriI39flPf4eUU+1iefyWg2MEAA4O\"></audio>\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "                <div class=\"rc-btn-line\">\n" +
    "                    <button type=\"button\" id=\"keypad-4\" ng-click=\"dialButtonClickHandler(4);\"\n" +
    "                            value=\"4\" class=\"rc-dialer-btn rc-dialer-btn-first\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">4</span>\n" +
    "                        <span class=\"rc-btn-letters\">GHI</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                    <button type=\"button\" id=\"keypad-5\" ng-click=\"dialButtonClickHandler(5);\"\n" +
    "                            value=\"5\" class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">5</span>\n" +
    "                        <span class=\"rc-btn-letters\">JKL</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40ZCUAkBYAABjDmGOOQSehlJRaa5iCUELopKTSSmyxNUpBCCGEUlJKrbXWMuiolJJKSq3FFmOMmYNSUiolpdRijLHWDkJKLbUWW4ux5lprB6GklFqLLcZaa669g5BKa63lGGOwOefaQSgptdhijDXXWnsOqbQWY4y19lxrzTmIUlKKMdYac80199xLSq3FmmuuNQefcxCmpdhqjTXnnHsQOvjUWo255h500EHnHnRKrdZaa849ByF88Lm1WGvNNefegw86CN9qqzXnXGvvPfeeg24x1lxz0MEHIXzwQbgYa8859xyEDjr4HgwAyI1wAEBcMJKQOsuw0ogbT8AQgRQasgoAiAEAIIxBBiGElFJKKaWUYoopxhhjjDHGGGOMMcYYY4wxxgQAACY4AAAEWMGuzNKqjeKmTvKiDwKf0BGbkSGXUjGTE0GP1FCLlWCHVnCDF4CFhqwEAMgAABCIseZac44QlNZi7blUSjlqseeUIYKctJxLyQxBTlprLWTIKCcxthQyhBS02lrplFKMYquxdIwxSanFlkrnIAAAAIIAAAMRMhMIFECBgQwAOEBIkAIACgsMHcNFQEAuIaPAoHBMOCedNgAAQYjMEImIxSAxoRooKqYDgMUFhnwAyNDYSLu4gC4DXNDFXQdCCEIQglgcQAEJODjhhife8IQbnKBTVOogAAAAAAAQAOABACDZACKimZnj6PD4AAkRGSEpMTlBSVEJAAAAAAAgAPgAAEhWgIhoZuY4Ojw+QEJERkhKTE5QUlQCAAAAAAAAAACAgIAAAAAAAEAAAACAgE9nZ1MABNcZAAAAAAAA4i/RBwIAAADRxk18CzRZR5hqc8T/XgEBjNnyw/OnPnbglm28Kbkpzg2gBGDQLks91hH64NEb89RKhIF5GEP3v3k2esf7OeQ/ypI6AewFxyXhUyzlD3yjse8b/0sx6678QVlQpy/aNr+9k5N0/N/vta3f6nrz+67AO/E3zz1Fm4I/YrWDhzF8aaUAsXJgOQ+9ZzqqU1XEP/+RzvbkWSuTt33Ff04G5A3zrRFCLM2f8MrXf/qRf5RaZFDxQ9g74+J0eVIiXIipx9QYWCyeW3fifLp6ptXLm96Rp0/aUgfzHddbaH9zbzxvayJlIgA6JeTYIfHKb/2OFUpV1GWoj/6tf9u/7Tf7TZ/9+H4ax6unFgBIrkN2bdu27a5tEwAAMI4xAIBGzVi469ZXafZEWFMmY/y/anEYhgQ7PR5n/j8e3t7e/qPz22k6zAvzcDi3j6M0693187mvWit5M62Or981Lyb7/joHwEowBDcIraKOB0Lnp8xY1KIJ+djQe1vhKmu+ggIgAB4l5ObVL0i9P69+VSqZg5YkcHd3d8cCgCYnRQAAAIAAYxQAAABT7nZHI+jvs/PrW38fANi/jasADYYAAAAAAAAAQO3lfX/mFY4AAIi4Wjsu5n19rAEyIaXEuqd/Wzv5Mbb0C5s9XGXhJgAeNeSm3S8IfZ+XX5WqOrPRkgTez35WAQBoclIEAAAAGGMMAAAAUN7gbp3cFQhnv+Uj/d+qALD/Z1wXaDAAAAAAAAAAALNf7re3U6YqAgAgom5tny1X+QQoXYRINiThFY4jxgmzE0d7TpeRVmgFMJSrwgAAnhVE3Clhrjc3g0oVfsZ3LE0O1kdlyVzfbSyWNAg4BQBI8trRkEAQBIALMACMYCUZBQDxbbPHnHjuBz5UrAKAxyO7cOeFq4te3tJxf+a/53xWrvfrsXYTjahiYrU4vC6bED6R/KwiGquQTCnkiQCLAxxktbEy40Amf+CRP+jHrCke2TReRya9jids2N+PbOuf/zeaFqdaHjLLK1sYFsurPU7/fJCNxvtJm5Enx9j5dTH/STfleu8x+UCImTet36pWcIADAF5jI4d97RvhOZg5ioxXnFfizm1j4eGuXWMxxpGR8PQ0299vE9h9pufluhFA2yZq27qc78pi5ycWOz8thrdtyUsKAKJhK016CT8d4Wyd2b2vK5NM04Hmr6xT+T+aq41377z2DKzZSIrt3GI8/tXa+M3HH1qXx2H6EL4f7T+Eg8t/T62c3/jxvT7c7V2f4aZTTpT3a5dNtG1/KkJuh5Cwvc2HVIf782Ftb/fnq97+/ehQ29v/7h/q8O//7ofb2/8+mq/t/v/mwzr8+9E85dv/PhLIt/sheLs/T6OfG413/Sy7vesD4927PtzdH886d/vjH8+68Ycf3+u72x//eNZ3tz/+8ez09ocf3zsdb39876wbb398r+/G2x/P+m68nfWdG2+nDBurrRRZ2mXTh4rPDGj701LbvxNWbW/3D7W93Z8Pa3u7f6jc7t8/VB3uH8I6/B2tk0PVXlggX7fzLQcODg==\"></audio>\n" +
    "                    </button>\n" +
    "                    <button type=\"button\" id=\"keypad-6\" ng-click=\"dialButtonClickHandler(6);\" value=\"6\"\n" +
    "                            class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">6</span>\n" +
    "                        <span class=\"rc-btn-letters\">MNO</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "                <div class=\"rc-btn-line\">\n" +
    "                    <button type=\"button\" id=\"keypad-7\" ng-click=\"dialButtonClickHandler(7);\"\n" +
    "                            value=\"7\" class=\"rc-dialer-btn rc-dialer-btn-first\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">7</span>\n" +
    "                        <span class=\"rc-btn-letters\">PQRS</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40ZCUAkBYAABjDmGOOQSehlJRaa5iCUELopKTSSmyxNUpBCCGEUlJKrbXWMuiolJJKSq3FFmOMmYNSUiolpdRijLHWDkJKLbUWW4ux5lprB6GklFqLLcZaa669g5BKa63lGGOwOefaQSgptdhijDXXWnsOqbQWY4y19lxrzTmIUlKKMdYac80199xLSq3FmmuuNQefcxCmpdhqjTXnnHsQOvjUWo255h500EHnHnRKrdZaa849ByF88Lm1WGvNNefegw86CN9qqzXnXGvvPfeeg24x1lxz0MEHIXzwQbgYa8859xyEDjr4HgwAyI1wAEBcMJKQOsuw0ogbT8AQgRQasgoAiAEAIIxBBiGElFJKKaWUYoopxhhjjDHGGGOMMcYYY4wxxgQAACY4AAAEWMGuzNKqjeKmTvKiDwKf0BGbkSGXUjGTE0GP1FCLlWCHVnCDF4CFhqwEAMgAABCIseZac44QlNZi7blUSjlqseeUIYKctJxLyQxBTlprLWTIKCcxthQyhBS02lrplFKMYquxdIwxSanFlkrnIAAAAIIAAAMRMhMIFECBgQwAOEBIkAIACgsMHcNFQEAuIaPAoHBMOCedNgAAQYjMEImIxSAxoRooKqYDgMUFhnwAyNDYSLu4gC4DXNDFXQdCCEIQglgcQAEJODjhhife8IQbnKBTVOogAAAAAAAQAOABACDZACKimZnj6PD4AAkRGSEpMTlBSVEJAAAAAAAgAPgAAEhWgIhoZuY4Ojw+QEJERkhKTE5QUlQCAAAAAAAAAACAgIAAAAAAAEAAAACAgE9nZ1MABNcZAAAAAAAAI9bYRAIAAADes0kGCj1Hn2RkuP9PAQGM2calEaK8NAMNSdePb+1/3t4dd4cBYDgAkY4wT+XsL/LJ16Lvp9y23bbgIhbhzr+m7rZ/Ce2fqQ8vBwYAhAHlmSuP2Ii/pBCKENsoftnLPAUAx83vRp7xFgCs21Du+a73bLh3TXD31L5CaDyFkp7kOhrLaBGxMcJVPJD59+T67R3KJgJaJSTYTaQDcvkM1SgrfTC0DPXRb/rsg2k8/fzf+P/9iHfcuAIASNLn9u9fnpxMZwEAAIAARzIGACBqKp8avlTbHE52snjS7HTWsQH6/tDEQvlFPl4UMzO77B+v5Wf7rc6L7/2wXa03+8N9/RzOx/Lze9+uEYDKQIOh2VCxuPJYuP0YEE/IUBH2iWIcpK9g6XhF8TXGGvP2buHbtxwoAQAeJeRvd++PNX6lSlzHlCwMiSkAFigAEGCESAAAOP1jg/7fGwCA4UU0Wb/7+h9fv18vEOBJxRkBAJwr28W5qHCkAFCMqx7v3hlb6UD305QptWtWks63HABiSscJEsMQVAnyy0ICPiUkHxc/I5MrVdE6npJHhokpAAAAgADJGAUA4OKloP/rDgAAcMMNL+JF53YNvyHQn+K+LQoAANW3VGt/FuIIIADdXqQXuCVu3x1893rsDqbZ3a315uvku50aklGae6iCextQAB4lVOnNL9g4vHbHcNd1Z4ENS46m0UF3d3fQvfbW7hDNEgAA8RQAIZtkBAAg/vYd7zRX3Sw52d8WgNPhpG3Hqb0MKVlFIyJiYtbcVpWdzY7b9bz/IdsdADjg4XCYFQD//f938t5BB8G/ERD8tgNhOmv+MPe479w0TRP15OaemRkDE2NvjicfEsPMzI1H2swynrRPjhEutEFfMBkmlfu+r9i25OpZ5Rb849/J4aAtM/F+P6g1eJtGWAD+Y8P2t2MY6/QRRTaL8+pRp0+fOyvDm7ft0spo25e3+oF2f7/btlN9P4yB8xcD5lVbW5IUwBWMkoMZj7+6sXhvq0lzagjdxZiwqdbLv9bsQYz8icpzO94/xm6LWr9N//o7zUMOpMNhXt/++MezflbBOWxv9+fLxqnPANzocx7+jtYy4PbHb68OhyIgt0NhvHt31mUVAbm93Z8nu72blQA8SVNc7n/mdBPJVAJAsnvLXtli/zNnNhFAOV/So7f+7g+9laqYNy3H5eMvfelMYvvttxqjGAsyVczxM1860xeNjqYYeLK7ZxRPn3rmzCYCsLWOkt1b9srieqm2YMr50n0x/vDje2e5qsDY3v730byNU98BNk6nfr79+9F8CHMAbHr37pTzcCgyzu1woPHu3VkfWQBQh7dD2fj4q11ezvp8qaSchfJqs+YXsA6fCBcADg4=\"></audio>\n" +
    "                    </button>\n" +
    "                    <button type=\"button\" id=\"keypad-8\" ng-click=\"dialButtonClickHandler(8);\"\n" +
    "                            value=\"8\" class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">8</span>\n" +
    "                        <span class=\"rc-btn-letters\">TUV</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                    <button type=\"button\" id=\"keypad-9\" ng-click=\"dialButtonClickHandler(9);\"\n" +
    "                            value=\"9\" class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">9</span>\n" +
    "                        <span class=\"rc-btn-letters\">WXYZ</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "                <div class=\"rc-btn-line\">\n" +
    "                    <button type=\"button\" id=\"keypad-0\" ng-click=\"dialButtonClickHandler(0);\"\n" +
    "                            value=\"0\" class=\"rc-dialer-btn\" audio-button>\n" +
    "                        <span class=\"rc-btn-digit\">0</span>\n" +
    "                        <span class=\"rc-btn-letters\">+</span>\n" +
    "                        <audio src=\"data:audio/ogg;base64,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ZCUAkAEAwBiDkEEGIWMQQgghhBBCCAkAABhwAAAIMKEMFBqyEgBIBQAADFKKMQelpBQpxZhzEEpJKVKKMecglJJSxZhzEEpJqbWKMecglJJSa51zEEpJqbUYO+cglJJSazGGEEpJqbUYYwwhlJJSazHWWkpJqbUYa8y1lJJSazHWWmtKrbUYa60155RaazHWWnPOBQAgNDgAgB3YsDrCSdFYYKEhKwGAPAAASCnGGGOMMaUUY4wxxphSijHGGGOMMcYYY4wxphhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMeYYY4wxxhhjzDnGGGOMOeYcY4wxxpxzTgAAUIEDAECAjSKbE4wEFRqyEgAIBwAAjGHMOecglJBKo5RzEEIoJZVWGqWcgxJCKSm1ljknJaVSUmottsw5KSmVklJrLXYSUmotpdZirLGDkFJrqbUWY40dhFJaii3GGnPtIJSSWmsxxlprKKWl2GKssdaaQymptRZjrTXnXFJqLcZaa82155JSazHGWmutuafWYqyx1lxz7z21FmONteace84FAJg8OABAJdg4w0rSWeFocKEhKwGA3AAARinGnHMOQgghhBBCCJVSjDnnHIQQQgghhBAqpRhzzjkIIYQQQgghZIw55xx0EEIIIYQQQsgYc845CCGEEEIIIYTQOecchBBCCCGEUEIppXPOOQchhBBCCCGEUErnHIQQQgghhBJKKKWUzjkIIYQQQgilhFJKKSGEEEIIIYQSSimllFI6CCGEEEIIpZRSSimlhBBCCCGEEEoppZRSSgkhhBBCCCGUUkoppZQSQgghhBJKKaWUUkopJYQQQgihlFJKKaWUUkoIIYRSSimllFJKKaWUEEIoIZRSSimllFJKKSGEEkoopZRSSimllFJCCCWUUkoppZRSSimlhBBCKKWUUkoppZRSSgkhlFJKKaWUUkoppZRSAADQgQMAQIARlRZipxlXHoEjChkmoEJDVgIA4QAAACGUUkoppZRSaiSllFJKKaWUUiMlpZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKpZRSSimllFJKKaWUUkoppZRSSimlAKjLDAfA6AkbZ1hJOiscDS40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\"></audio>\n" +
    "                    </button>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class=\"rc-form-control rc-form-dialer-control\">\n" +
    "                <button id=\"dialButton\" ng-disabled=\"callButtonDisabled\" class=\"button call wide\">\n" +
    "                    {{!callButtonDisabled ? STRINGS.DIALER.callButtonText : STRINGS.DIALER.callInProgressButtonText}}\n" +
    "                </button>\n" +
    "            </div>\n" +
    "        </form>\n" +
    "    </div>\n" +
    "</div>"
  );


  $templateCache.put('views/directives/contact-phone.html',
    "<i ng-class=\"{'trigger-up': showActions, 'trigger-down': !showActions}\" ng-click=\"showActions = !showActions\"></i>\n" +
    "<div class=\"value\">{{ phone }}</div>\n" +
    "<div ng-if=\"showActions\" class=\"actions\" ng-class=\"{'no-fax': noFax}\">\n" +
    "    <div class=\"tip\"></div>\n" +
    "    <div class=\"actions-balloon\">\n" +
    "        <a ng-if=\"showCallButton === undefined || showCallButton\" class=\"call\" href=\"#/dialer/{{ phone }}?backUrl={{ currentUrl }}\"\n" +
    "           title=\"{{STRINGS.DIRECTIVES.CONTACTPHONE.actionCallTitle}}\"></a>\n" +
    "        <a ng-if=\"showTextButton === undefined || showTextButton\" class=\"sms\" href=\"#/new-sms/{{ phone }}/{{ noFax ? 'extensionNumber' : 'phoneNumber'}}?backUrl={{ currentUrl }}\"\n" +
    "           title=\"{{STRINGS.DIRECTIVES.CONTACTPHONE.actionTextTitle}}\"></a>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/directives/contactpicker-input-item-template.html',
    "<a>\n" +
    "    <div class=\"rc-contact-picker-input-suggestion-header\">\n" +
    "        <span bind-html-unsafe=\"match.model.name | typeaheadHighlight:query\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"rc-contact-picker-input-suggestion-info\">\n" +
    "        <span ng-if=\"match.model.phone\" bind-html-unsafe=\"match.model.phone | typeaheadHighlight:query\"></span>\n" +
    "        <span ng-if=\"match.model.extension\" bind-html-unsafe=\"match.model.extension | typeaheadHighlight:query\"></span>\n" +
    "    </div>\n" +
    "</a>"
  );


  $templateCache.put('views/directives/contactpicker-input.html',
    "<div class=\"rc-contact-picker-input\">\n" +
    "    <div class=\"otherTo\">\n" +
    "        <div class=\"recipient\"\n" +
    "             ng-repeat=\"recipient in otherTo\"\n" +
    "             dom-create=\"recipientElementCreate()\"\n" +
    "             dom-destroy=\"recipientElementDestroy()\"\n" +
    "             ng-class=\"{extension: recipient.type == 'extensionNumber'}\">\n" +
    "            <i class=\"close\" ng-click=\"remove(recipient.id)\"></i>\n" +
    "            {{ recipient.name ? recipient.name : recipient.number }}\n" +
    "        </div>\n" +
    "        <div class=\"rc-contact-picker-input-container\">\n" +
    "            <input type=\"text\"\n" +
    "                   placeholder=\"{{placeholderText}}\"\n" +
    "                   ng-hide=\"inputHidden\"\n" +
    "                   ng-model=\"value\"\n" +
    "                   ng-change=\"change($event)\"\n" +
    "                   typeahead=\"contact.phone for contact in getSuggestions($viewValue)\"\n" +
    "                   typeahead-loading=\"loading\"\n" +
    "                   typeahead-template-url=\"views/directives/contactpicker-input-item-template.html\"\n" +
    "                   typeahead-on-select=\"onTypeaheadSelect($item)\"\n" +
    "                   typeahead-wait-ms=\"300\"\n" +
    "                   ng-change=\"onChange($event)\"\n" +
    "                   ng-keydown=\"keydown($event)\"\n" +
    "                   tabindex=\"{{tabindex}}\">\n" +
    "        </div>\n" +
    "        <div class=\"clearfix\"></div>\n" +
    "    </div>\n" +
    "</div>"
  );


  $templateCache.put('views/directives/contactpicker.html',
    "<a ng-click=\"disabled === undefined ? setViewAnimation('slide-left') : (disabled === true && $event.preventDefault())\" ng-href=\"#/contactpicker?silent={{silent}}&value={{value}}&multiple={{multiple}}&backUrl={{backUrl}}\" class=\"contactpicker-button\"></a>\n" +
    "\n"
  );


  $templateCache.put('views/directives/google-mail-entry.html',
    "<div class=\"google-mail-entry rc-card-entry\">\n" +
    "\t<span class=\"date\">{{mailEntry.received|formatDate}}</span>\n" +
    "\t<span class=\"from\">{{mailEntry.from}}</span>\n" +
    "\t<span class=\"subject\">{{mailEntry.subject}}</span>\n" +
    "\t<span class=\"snippet\">{{mailEntry.snippet}}</span>\n" +
    "</div>\n" +
    "\n"
  );


  $templateCache.put('views/directives/google-mail.html',
    "<div class=\"google-mail rc-card\">\n" +
    "\t<h2 class=\"card-header\" ng-hide=\"mails.length\">No recent mails</h2>\n" +
    "\t<h2 class=\"card-header\" ng-show=\"mails.length\" ng-click=\"isCollapsed=!isCollapsed\">\n" +
    "\t\t<span>Recent E-Mails</span>\n" +
    "\t\t<span>({{mails.length}})</span>\n" +
    "\t\t<i class=\"trigger\" ng-class=\"{'up':!isCollapsed, 'down':isCollapsed}\"></i>\n" +
    "\t</h2>\n" +
    "\n" +
    "\t<div ng-repeat=\"entry in mails\" collapse=\"isCollapsed\">\n" +
    "\t\t<google-mail-entry id=\"entry.id\"></google-mail-entry>\n" +
    "\t</div>\n" +
    "</div>\n" +
    "\n" +
    "\n"
  );


  $templateCache.put('views/directives/h1-with-back-url.html',
    "<h1 ng-class=\"{'with-back-url': backUrl}\">\n" +
    "    <a ng-click=\"click();\" ng-if=\"backUrl\" class=\"back\" href=\"{{ backUrl }}\"></a>\n" +
    "    <p ng-transclude></p>\n" +
    "</h1>\n"
  );


  $templateCache.put('views/directives/rc-calls.html',
    "<div class=\"rc-calls rc-card\">\n" +
    "\t<h2  class=\"card-header\" ng-hide=\"filteredCalls.length\">No recent calls</h2>\n" +
    "\t<h2 class=\"card-header\" ng-show=\"filteredCalls.length\" ng-click=\"isCollapsed=!isCollapsed\">\n" +
    "\t\t<span>Recent Calls</span>\n" +
    "\t\t<span>({{filteredCalls.length}})</span>\n" +
    "\t\t<i class=\"trigger\" ng-class=\"{'up':!isCollapsed, 'down':isCollapsed}\"></i>\n" +
    "\t</h2>\n" +
    "\n" +
    "\t<div ng-repeat=\"entry in filteredCalls = ( calls | limitTo:limit )\" collapse=\"isCollapsed\">\n" +
    "\t\t<div class=\"rc-card-entry rc-call-entry\">\n" +
    "\t\t\t<span class=\"type\" ng-show=\"entry.isMissed()\">Missed call</span>\n" +
    "\t\t\t<span class=\"type\" ng-show=\"entry.isInbound() && !entry.isMissed()\">Inbound call</span>\n" +
    "\t\t\t<span class=\"type\" ng-show=\"entry.isOutbound()\">Outbound call</span>\n" +
    "\n" +
    "\t\t\t<span class=\"date\">{{entry.startTime|formatDate}}</span>\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "</div>\n" +
    "\n" +
    "\n"
  );


  $templateCache.put('views/directives/rc-checkbox.html',
    "<div class=\"onoffswitch\">\n" +
    "    <input type=\"checkbox\" name=\"onoffswitch\" class=\"onoffswitch-checkbox\" id=\"{{id}}\">\n" +
    "    <label class=\"onoffswitch-label\" for=\"{{id}}\">\n" +
    "        <span class=\"onoffswitch-inner\"></span>\n" +
    "        <span class=\"onoffswitch-switch\"></span>\n" +
    "    </label>\n" +
    "</div>\n" +
    "<span class=\"onoffswitch-caption\">{{text}}</span>"
  );


  $templateCache.put('views/directives/rc-send-sms.html',
    "<div class=\"new-sms-bar\">\n" +
    "    <textarea class=\"rc-input new-sms-bar-textarea\" maxlength=\"160\"\n" +
    "              ng-model=\"text\"\n" +
    "              placeholder=\"{{STRINGS.DIRECTIVES.RCSENDSMS.textareaPlaceholder}}\"\n" +
    "              tabindex=\"{{tabindex}}\"\n" +
    "              ng-keypress=\"keyPress($event);\"\n" +
    "              ng-style=\"{'height': lines ? (lines + 2) + 'em' : '4em'}\"\n" +
    "              ng-disabled=\"disabled\">\n" +
    "    </textarea>\n" +
    "    <label class=\"new-sms-bar-checkbox\" ng-if=\"sendAsGroup === undefined\">\n" +
    "        <input type=\"checkbox\" ng-model=\"$parent.sendAsGroupInner\" checked=\"true\" />\n" +
    "        &nbsp;{{STRINGS.DIRECTIVES.RCSENDSMS.groupIntoOneConversationCheckbox}}\n" +
    "    </label>\n" +
    "    <button class=\"new-sms-bar-button button wide save\" ng-click=\"send()\" ng-disabled=\"disabled || sending\">\n" +
    "        {{STRINGS.DIRECTIVES.RCSENDSMS.sendButton}}\n" +
    "    </button>\n" +
    "</div>\n"
  );


  $templateCache.put('views/directives/sidebutton.html',
    "<a \n" +
    "\tclass=\"rc-lnk rc-lnk-{{id}}\" \n" +
    "\tng-class=\"{active: active}\" \n" +
    "\tng-show=\"show\" \n" +
    "\tng-href=\"#/{{id}}\" \n" +
    "\tng-click=\"sidebuttonclick($event);\"\n" +
    "\tdata-title=\"{{title}}\"\n" +
    "\t><span ng-show=\"bagdetext\" class=\"badge\">{{bagdetext}}</span></a>\n" +
    "\n"
  );


  $templateCache.put('views/directives/spinner.html',
    "<!-- Taken from http://tobiasahlin.com/spinkit/ -->\n" +
    "<div class=\"spinner\" ng-show=\"show\">\n" +
    "    <div class=\"spinner-container container1\">\n" +
    "        <div class=\"circle1\"></div>\n" +
    "        <div class=\"circle2\"></div>\n" +
    "        <div class=\"circle3\"></div>\n" +
    "        <div class=\"circle4\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"spinner-container container2\">\n" +
    "        <div class=\"circle1\"></div>\n" +
    "        <div class=\"circle2\"></div>\n" +
    "        <div class=\"circle3\"></div>\n" +
    "        <div class=\"circle4\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"spinner-container container3\">\n" +
    "        <div class=\"circle1\"></div>\n" +
    "        <div class=\"circle2\"></div>\n" +
    "        <div class=\"circle3\"></div>\n" +
    "        <div class=\"circle4\"></div>\n" +
    "    </div>\n" +
    "</div>"
  );


  $templateCache.put('views/header.html',
    "<div ng-controller=\"HeaderCtrl\">\n" +
    "\n" +
    "<div id=\"logo\">\n" +
    "    <a class=\"rc-lnk rc-lnk-expand\" ng-class=\"{'collapse': isSidebarExpanded(), 'expand': !isSidebarExpanded() }\"\n" +
    "       ng-click=\"trigger()\" title=\"{{ isSidebarExpanded() ? STRINGS.HEADER.collapseTitle : STRINGS.HEADER.expandTitle }}\"></a>\n" +
    "\n" +
    "    <a class=\"rc-lnk rc-lnk-logout\" ng-click=\"logout()\" ng-show=\"isAuthorized\" title=\"{{STRINGS.HEADER.logoutTitle}}\">&nbsp;</a>\n" +
    "\n" +
    "    <div ng-if=\"isAuthorized\" class=\"logo-image\" style=\"background-image:url('images/logo/logo.png');\"></div>\n" +
    "\n" +
    "    <div ng-if=\"!isAuthorized\" ng-hide=\"brand\" class=\"no-log\">\n" +
    "        {{STRINGS.HEADER.headerDefault}}\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"!isAuthorized\" ng-show=\"brand\" class=\"no-log\">\n" +
    "        {{STRINGS.HEADER.headerWithBrand}} {{ brand | normalizeBrand }}\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div id=\"status\" ng-controller=\"StatusCtrl\" ng-show=\"isAuthorized\" ng-class=\"{'collapsed': !isSidebarExpanded(), 'expanded': isSidebarExpanded() }\">\n" +
    "    <a ng-show=\"isAuthorized\" title=\"{{extension.name}}\" class=\"rc-lnk-status {{presence.presenceStatus}}\">\n" +
    "        {{ user.username | formatPhone }}{{ user.extension | formatExtension }}\n" +
    "    </a>\n" +
    "</div>\n" +
    "\n" +
    "</div>"
  );


  $templateCache.put('views/login.html',
    "<div class=\"rc-pane-scrollable login-pane\">\n" +
    "    <div class=\"login\" ng-hide=\"showSpinner\">\n" +
    "        <div class=\"error-msg\">{{ loginError}}</div>\n" +
    "        <div ng-show=\"accessViolationError\" class=\"error-msg\" >\n" +
    "            {{STRINGS.LOGIN.loginInternalErrorCaption}} {{ loginError}}. {{STRINGS.LOGIN.loginInternalErrorAdvice}}\n" +
    "        </div>\n" +
    "        <div class=\"rc-form-line\">\n" +
    "            <div class=\"rc-form-dropdown-container\">\n" +
    "                <button class=\"rc-input rc-form-dropdown\" bs-select ng-model=\"user.country\"\n" +
    "                        ng-options=\"icon as icon.label for icon in countries\" html=\"true\"></button>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <form class=\"rc-form-login\" novalidate=\"\">\n" +
    "            <div class=\"rc-form-line\">\n" +
    "                <input type=\"text\" ng-model=\"user.username\" placeholder=\"{{STRINGS.LOGIN.userNamePlaceholder}}\" required=\"required\" maxlength=\"20\" class=\"rc-input rc-inp-text rc-inp-phone\" focus-on=\"focus:loginPhone\" />\n" +
    "                <input type=\"text\" ng-model=\"user.extension\" placeholder=\"{{STRINGS.LOGIN.extensionPlaceholder}}\" maxlength=\"5\" class=\"rc-input rc-inp-text rc-inp-ext rc-int-text-only\" />\n" +
    "            </div>\n" +
    "            <div class=\"rc-form-line\">\n" +
    "                <input type=\"password\" ng-model=\"user.password\" placeholder=\"{{STRINGS.LOGIN.passwordPlaceholder}}\" required=\"required\" class=\"rc-input rc-inp-password rc-inp-text\" />\n" +
    "            </div>\n" +
    "            <div class=\"rc-form-line\">\n" +
    "                <label class=\"rc-form-label-remember\">\n" +
    "                    <input type=\"checkbox\" ng-model=\"user.remember_me\" class=\"rc-inp-checkbox rc-inp-remember\" />\n" +
    "                    <span class=\"rc-text-remember\">{{STRINGS.LOGIN.rememberMeCheckbox}}</span>\n" +
    "                </label>\n" +
    "            </div>\n" +
    "            <div class=\"rc-form-control\">\n" +
    "                <input type=\"submit\" class=\"button save wide\" ng-disabled=\"user.clicked\" ng-click=\"login()\"\n" +
    "                       ng-value=\"user.clicked ? STRINGS.LOGIN.loginButtonTextOnLoading : STRINGS.LOGIN.loginButtonText\" />\n" +
    "            </div>\n" +
    "        </form>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/main.html',
    "<div id=\"inboundCallsPane\" ng-include=\"'views/active-call-monitor.html'\"></div>\n" +
    "<div id=\"mainPane\" ng-class=\"viewAnimation\" class=\"ngView\" ng-show=\"sidebarExpanded\"></div>\n" +
    "<div id=\"mainSpinner\" ng-show=\"showMainSpinner\"><spinner show=\"true\"></spinner></div>\n" +
    "<div style=\"clear: both;\"></div>"
  );


  $templateCache.put('views/message.html',
    "<div class=\"rc-pane-header\">\n" +
    "\t<h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.MESSAGEDETAILS.messageDetailsScreenHeader}}\n" +
    "\t</h1-with-back-url>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable\">\n" +
    "\t<spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "\t<div ng-show=\"!showSpinner\">\n" +
    "\t\t<div class=\"not-found\" ng-if=\"!message && !showSpinner\">\n" +
    "\t\t\t<p>{{STRINGS.MESSAGEDETAILS.noMessagesFoundText}}</p>\n" +
    "\t\t</div>\n" +
    "\n" +
    "\t\t<div class=\"message-info\" ng-if=\"message\">\n" +
    "\n" +
    "\t\t\t<div>\n" +
    "\t\t\t\t<div ng-if=\"message.direction == 'Outbound'\" class=\"status outbound\">\n" +
    "                    {{STRINGS.MESSAGEDETAILS.outgoingMessageLabel}}\n" +
    "\t\t\t\t</div>\n" +
    "\t\t\t\t<div ng-if=\"message.direction == 'Inbound'\" class=\"status inbound\">\n" +
    "                    {{STRINGS.MESSAGEDETAILS.incomingMessageLabel}}\n" +
    "\t\t\t\t</div>\n" +
    "\t\t\t</div>\n" +
    "\n" +
    "\t\t\t<div class=\"contact\">\n" +
    "\t\t\t\t<div class=\"name\">{{message.getAuthorNameOrUnknown()}}</div>\n" +
    "\t\t\t\t<div class=\"phone\"><span class=\"comma-after\" ng-repeat=\"num in message.getAuthorNumber()\">{{num|formatPhone}}</span></div>\n" +
    "\t\t\t</div>\n" +
    "\n" +
    "\t\t\t<img ng-if=\"!avatarUrl\" class=\"avatar-big\" src=\"images/icon/incognito_big.png\">\n" +
    "\t\t\t<img ng-if=\"avatarUrl\" class=\"avatar-big\" ng-src=\"{{ avatarUrl }}\">\n" +
    "\n" +
    "\t\t\t<div>\n" +
    "\t\t\t\t<span class=\"status\">{{ STRINGS.MESSAGE_STATUS[message.messageStatus] || STRINGS.MESSAGE_STATUS.default }}&nbsp;</span>\n" +
    "\t\t\t\t<span class=\"time\">{{ message.creationTime | formatDate:\"long\" }}</span>\n" +
    "\t\t\t</div>\n" +
    "\n" +
    "\t\t\t<div>&nbsp</div>\n" +
    "\n" +
    "\n" +
    "\t\t\t<div class=\"button-actions\">\n" +
    "\t\t\t\t<a class=\"button save wide\" ng-href=\"#/dialer/{{ message.getAuthorNumber().join(',') }}?backUrl={{ currentUrl }}\">\n" +
    "                    {{STRINGS.MESSAGEDETAILS.callButtonText}}\n" +
    "\t\t\t\t</a>\n" +
    "\t\t\t\t<a ng-if=\"showTextButton\" class=\"button save wide\" ng-href=\"#/new-sms/{{ message.getAuthorNumber().join(',') }}?backUrl={{ currentUrl }}\">\n" +
    "                    {{STRINGS.MESSAGEDETAILS.sendTextButtonText}}\n" +
    "\t\t\t\t</a>\n" +
    "\t\t\t</div>\n" +
    "\n" +
    "\t\t</div>\n" +
    "\t</div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/messages.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1>\n" +
    "        {{STRINGS.MESSAGES.messagesScreenHeader}}\n" +
    "    </h1>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"tabs badges\" ng-class=\"{'tabs4': smsEnabled || pagerEnabled, 'tabs3': !smsEnabled && !pagerEnabled}\">\n" +
    "    <a class=\"tab\" ng-click=\"setViewAnimation('');\" ng-class=\"{active: typeFilter === ''}\" href=\"#/messages/\">\n" +
    "        {{STRINGS.MESSAGES.allTab}}\n" +
    "    </a>\n" +
    "    <a class=\"tab\" ng-click=\"setViewAnimation('');\" ng-class=\"{active: typeFilter === 'VoiceMail'}\" href=\"#/messages/VoiceMail\">\n" +
    "        {{STRINGS.MESSAGES.voiceTab}}\n" +
    "        <span class=\"badge\" ng-if=\"updates.voicemail\">{{ updates.voicemail }}</span>\n" +
    "    </a>\n" +
    "    <a class=\"tab\" ng-click=\"setViewAnimation('');\" ng-class=\"{active: typeFilter === 'Fax'}\" href=\"#/messages/Fax\">\n" +
    "        {{STRINGS.MESSAGES.faxTab}}\n" +
    "        <span class=\"badge\" ng-if=\"updates.fax\">{{ updates.fax }}</span>\n" +
    "    </a>\n" +
    "    <a ng-if=\"smsEnabled || pagerEnabled\" class=\"tab\" ng-click=\"setViewAnimation('');\" ng-class=\"{active: typeFilter === 'Conversation'}\" href=\"#/messages/Conversation\">\n" +
    "        {{STRINGS.MESSAGES.textTab}}\n" +
    "        <span class=\"badge\" ng-if=\"updates.text\">{{ updates.text }}</span>\n" +
    "    </a>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"\">\n" +
    "    <div class=\"search-box\">\n" +
    "        <input type=\"text\" ng-model=\"searchFilter\" placeholder=\"{{STRINGS.MESSAGES.searchPlacholer}}\">\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable rc-pane-scrollable-under-tabs message-list\">\n" +
    "    <div class=\"messages\">\n" +
    "        <spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "        <div class=\"message {{ message.isRead() ? 'read' : 'not-read'}}\" ng-show=\"!showSpinner\"\n" +
    "             ng-repeat=\"message in filteredMessages = (messages | filterMessages:typeFilter | searchMessage:searchFilter | orderBy:'creationTime':true )\" ng-controller=\"ShowHideCtrl\">\n" +
    "\n" +
    "            <!-- message header and contents -->\n" +
    "            <!-- !!! this div is intentionally added to not overlap the balloon click !!! -->\n" +
    "            <div ng-click=\"messageClickHandler(message)\">\n" +
    "                <i class=\"message-type-{{ message.type | lowercase }}\"></i>\n" +
    "\n" +
    "                <a class=\"info\" href=\"#/message/{{ message.id | urlencode }}?backUrl={{ currentUrl }}\" ng-click=\"$event.stopPropagation();\"></a>\n" +
    "                <span class=\"time\">{{ message.creationTime | formatDate }}</span>\n" +
    "\n" +
    "                <!-- message body dependent of the type -->\n" +
    "                <div class=\"body\">\n" +
    "                    <span class=\"contact\" title=\"{{message.getAuthorNameOrNumber()}}\">{{ message.getAuthorNameOrNumber() || STRINGS.GENERAL.unknownCallerId }}&nbsp;</span>\n" +
    "\n" +
    "                    <div class=\"text\" ng-if=\"message.isSms() || message.isPager() || message.isConversation()\">\n" +
    "                        {{ message.subject | limitTo:25 }}\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"text\" ng-if=\"message.isFax()\">\n" +
    "                        {{STRINGS.MESSAGES.faxLabel}}\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div class=\"text\" ng-if=\"message.isVoicemail()\">\n" +
    "                        {{STRINGS.MESSAGES.voiceLabel}}\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <!-- message actions dependent of the type -->\n" +
    "            <div ng-if=\"toShow()\" class=\"actions\" ng-click=\"$event.stopPropagation();\"\n" +
    "                 ng-class=\"{'actions-fax': message.isFax(), 'actions-voicemail': message.isVoicemail(), 'actions-sms': message.isSms()}\">\n" +
    "                <div class=\"tip\"></div>\n" +
    "\n" +
    "                <div class=\"actions-balloon\">\n" +
    "                    <div ng-if=\"message.isConversation()\">\n" +
    "                        <a class=\"message-delete\" title=\"{{STRINGS.MESSAGES.deleteMessageTitle}}\" ng-click=\"deleteMessage(message);\"></a>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div ng-if=\"message.isFax()\">\n" +
    "                        <a class=\"fax-view\" title=\"{{STRINGS.MESSAGES.viewFaxTitle}}\" ng-click=\"openFax(message);\"></a>\n" +
    "                        <a class=\"message-delete\" title=\"{{STRINGS.MESSAGES.deleteFaxTitle}}\" ng-click=\"deleteMessage(message);\"></a>\n" +
    "                    </div>\n" +
    "\n" +
    "                    <div ng-if=\"message.isVoicemail()\" ng-controller=\"AudioCtrl\">\n" +
    "                        <div class=\"player\">\n" +
    "                            <i ng-show=\"playing === null\" ng-click=\"play(message)\" class=\"control play\" title=\"{{STRINGS.MESSAGES.playVoiceTitle}}\"></i>\n" +
    "                            <i ng-show=\"playing === false\" ng-click=\"resume()\" class=\"control play\" title=\"{{STRINGS.MESSAGES.resumeVoiceTitle}}\"></i>\n" +
    "                            <i ng-show=\"playing === true\" ng-click=\"pause()\" class=\"control stop\" title=\"{{STRINGS.MESSAGES.stopVoiceTitle}}\"></i>\n" +
    "                            <span class=\"passed\">{{ currentTime | formatDuration }}</span>\n" +
    "                            <div class=\"rc-progress\">\n" +
    "                                <div class=\"all\"></div>\n" +
    "                                <div class=\"done\" style=\"width: {{ progress * 100 }}%\"></div>\n" +
    "                                <div class=\"current\" style=\"left: {{ progress * 100 }}%\"></div>\n" +
    "                            </div>\n" +
    "                            <span class=\"duration\">{{ duration | formatDuration }}</span>\n" +
    "                        </div>\n" +
    "\n" +
    "                        <a class=\"call\" href=\"#/dialer/{{ message.getAuthorId() }}?backUrl={{ currentUrl }}\" title=\"{{STRINGS.MESSAGES.callTitle}}\"></a>\n" +
    "                        <a ng-if=\"showTextButton(message)\" class=\"sms\" href=\"#/new-sms/{{ message.getAuthorId() }}/{{ message.getAuthorIdField() }}?backUrl={{ currentUrl }}\" title=\"{{STRINGS.MESSAGES.sendTextTitle}}\"></a>\n" +
    "                        <a class=\"message-mark\" ng-click=\"markMessage(message);\" title=\"{{message.isRead() ? STRINGS.MESSAGES.markAsUnreadTitle : STRINGS.MESSAGES.markAsReadTitle}}\"></a>\n" +
    "                        <a class=\"message-delete\" ng-click=\"pause();deleteMessage(message);\" title=\"{{STRINGS.MESSAGES.deleteVoiceMailTitle}}\"></a>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"not-found\" ng-if=\"filteredMessages.length === 0 && !showSpinner\">\n" +
    "        <p>{{STRINGS.MESSAGES.noMessagesMessage}}</p>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/new-conference.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.NEWCONFERENCE.newConferenceScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "<div class=\"rc-pane-scrollable new-conference\">\n" +
    "    <div ng-show=\"error\" class=\"error-msg\"><br/> {{ error }}<br/></div>\n" +
    "\n" +
    "    <div class=\"line\">\n" +
    "        <label>{{STRINGS.NEWCONFERENCE.dialInNumberLabel}}</label>\n" +
    "        <div class=\"value value-right\">\n" +
    "            <a  class=\"new-conference-click2dial\" href=\"#/dialer/{{conferencingInfo.phoneNumber}}\">\n" +
    "                {{ conferencingInfo.phoneNumber | formatPhone }}\n" +
    "            </a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <label>{{STRINGS.NEWCONFERENCE.hostLabel}}</label>\n" +
    "        <div class=\"value value-right\">\n" +
    "            {{ conferencingInfo.hostPin | formatPin }}\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <label>{{STRINGS.NEWCONFERENCE.participantsLabel}}</label>\n" +
    "        <div class=\"value value-right\">\n" +
    "            {{ conferencingInfo.participantPin | formatPin }}\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"line\">\n" +
    "        <label class=\"checkbox\">\n" +
    "            <input type=\"checkbox\" ng-model=\"hasInternational\">\n" +
    "            {{STRINGS.NEWCONFERENCE.internationalParticipantsCheckbox}}\n" +
    "        </label>\n" +
    "    </div>\n" +
    "    <div ng-if=\"hasInternational\" class=\"international\">\n" +
    "        <h2>{{STRINGS.NEWCONFERENCE.selectInternationalParticipantsHeader}}</h2>\n" +
    "\n" +
    "        <div class=\"search-box\">\n" +
    "            <input type=\"text\" ng-model=\"filter\" placeholder=\"{{STRINGS.NEWCONFERENCE.searchPlaceholder}}\">\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"numbers\">\n" +
    "            <div ng-repeat=\"number in internationalNumbers | filter:{country: filter}\">\n" +
    "                <label>\n" +
    "                    <input type=\"checkbox\" class=\"checkcountry\" ng-click=\"number.checked = !number.checked\" ng-checked=\"number.checked\">\n" +
    "                    <span class=\"country\">{{ number.country }}</span>\n" +
    "                    <span class=\"phone\">{{ number.phone }}</span>\n" +
    "                    <div class=\"clear\"></div>\n" +
    "                </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <button class=\"button save wide\" ng-click=\"invite()\">{{STRINGS.NEWCONFERENCE.inviteButtonText}}</button>\n" +
    "\n" +
    "    <a class=\"new-conference-commands\" href=\"#/conference-commands?backUrl={{ currentUrl }}\" ng-click=\"setViewAnimation('slide-left')\">\n" +
    "        {{STRINGS.NEWCONFERENCE.conferenceCommandsLink}}\n" +
    "    </a>\n" +
    "\n" +
    "    <div ng-hide=\"true\" google-calendar-details result=\"conferencingInfo.details\">Please join the {{brand|normalizeBrand}} conference.\n" +
    "The Conference will start immediately.\n" +
    "\n" +
    "        <i>Dial-In Number: {{conferencingInfo.phoneNumber|formatPhone}}</i>\n" +
    "\n" +
    "<div ng-if=\"hasInternational\">International Dial-in Numbers:<p ng-repeat=\"number in internationalNumbers|filter:{checked:true}\">\n" +
    "\t{{number.phone}} ({{number.country}})</p>\n" +
    "</div>\n" +
    "\n" +
    "Participant Access: {{conferencingInfo.participantPin|formatPin}}\n" +
    "\n" +
    "Conferencing Tips:\n" +
    "\tNeed an international dial-in phone number? Please visit <i>http://www.ringcentral.com/conferencing</i>\n" +
    "\tTo mute your line, press *#6 on your keypad.\n" +
    "\tThis conference call is brought to you by <i>RingCentral</i> Conferencing.\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n"
  );


  $templateCache.put('views/new-rc-conference.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.NEWMEETING.newMeetingScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "<div class=\"rc-pane-scrollable new-rc-conference\">\n" +
    "\n" +
    "    <div ng-show=\"error\" class=\"error-msg\"><br/> {{ error }}<br/></div>\n" +
    "\n" +
    "    <spinner show=\"infoLoading\"></spinner>\n" +
    "\n" +
    "    <form class=\"new-rc-conference-form\" ng-if=\"infoMessage.length === 0 && !infoLoading\">\n" +
    "\n" +
    "\n" +
    "        <div class=\"value margin\">\n" +
    "            <div class=\"value-4\">\n" +
    "                <label class=\"rc-label\">{{STRINGS.NEWMEETING.topicLabel}}</label>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"value-8\">\n" +
    "                <input class=\"rc-input\" type=\"text\" name=\"topic\" ng-model=\"rcConference.topic\" placeholder=\"{{STRINGS.NEWMEETING.topicPlaceholder}}\" />\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"hr\"></div>\n" +
    "\n" +
    "        <h2 class=\"title\">{{STRINGS.NEWMEETING.whenLabel}}</h2>\n" +
    "\n" +
    "        <div class=\"value margin\">\n" +
    "            <div class=\"value-6\">\n" +
    "                <div class=\"datepicker-container\">\n" +
    "                    <input class=\"rc-input image-input image-calendar\" type=\"text\" ng-model=\"rcConference.__startDate\" name=\"startDate\"\n" +
    "                           bs-datepicker ui-mask=\"{{STRINGS.NEWMEETING.dateMask}}\" model-view-value=\"true\" date-format=\"{{STRINGS.NEWMEETING.dateFormat}}\" date-type=\"string\"  autoclose=\"true\" maxlength=\"8\" />\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"value-6\">\n" +
    "                <div class=\"timepicker-container\">\n" +
    "                    <input class=\"rc-input image-input image-clock\" type=\"text\" size=\"5\" ng-model=\"rcConference.__startTime\" name=\"startTime\"\n" +
    "                           bs-timepicker ui-mask=\"{{STRINGS.NEWMEETING.timeMask}}\" model-view-value=\"true\" length=\"3\" time-format=\"{{STRINGS.NEWMEETING.timeFormat}}\" time-type=\"string\" data-autoclose=\"true\" minute-step=\"30\" maxlength=\"7\"\n" +
    "                           arrow-behavior=\"picker\"/>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"value margin\">\n" +
    "            <div class=\"value-4\">\n" +
    "                <label class=\"rc-label\">{{STRINGS.NEWMEETING.durationLabel}}</label>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"value-4\">\n" +
    "\n" +
    "                <select class=\"rc-input\" name=\"hours\" ng-model=\"rcConference.duration.hours\">\n" +
    "                    <option value=\"0\">0 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"1\">1 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"2\">2 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"3\">3 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"4\">4 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"5\">5 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"6\">6 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"7\">7 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"8\">8 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"9\">9 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                    <option value=\"10\">10 {{STRINGS.NEWMEETING.hourOption}}</option>\n" +
    "                </select>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"value-4\">\n" +
    "                <select class=\"rc-input\" name=\"minutes\" ng-model=\"rcConference.duration.minutes\">\n" +
    "                    <option ng-if=\"rcConference.duration.hours != '0'\" value=\"0\">00 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"5\">05 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"10\">10 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"15\">15 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"20\">20 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"25\">25 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"30\">30 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"35\">35 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"40\">40 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"45\">45 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"50\">50 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                    <option value=\"55\">55 {{STRINGS.NEWMEETING.minuteOption}}</option>\n" +
    "                </select>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"value margin\">\n" +
    "            <label  class=\"rc-label checkbox\">\n" +
    "                <input type=\"checkbox\" name=\"recurringMeeting\" ng-model=\"rcConference.recurringMeeting\">\n" +
    "                {{STRINGS.NEWMEETING.recurringMeetingCheckbox}}\n" +
    "            </label>\n" +
    "\n" +
    "            <div ng-show=\"rcConference.recurringMeeting\" class=\"new-rc-conference-recurring-meeting-info msg-box warn slide-down ng-hide\">\n" +
    "                <p>{{STRINGS.NEWMEETING.recurringMeetingHelp}}</p>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"hr\"></div>\n" +
    "\n" +
    "        <h2 class=\"title\">{{STRINGS.NEWMEETING.meetingTypeLabel}}</h2>\n" +
    "\n" +
    "        <div class=\"value\">\n" +
    "            <label class=\"rc-label radio\">\n" +
    "                <input name=\"meetingType\" type=\"radio\" ng-model=\"rcConference.meetingType\" value=\"1\">\n" +
    "                {{STRINGS.NEWMEETING.screenShareMeetingType}}<br>\n" +
    "            </label>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"value\">\n" +
    "            <label class=\"rc-label radio\">\n" +
    "                <input name=\"meetingType\" type=\"radio\" ng-model=\"rcConference.meetingType\" value=\"2\">\n" +
    "                {{STRINGS.NEWMEETING.videoMeetingType}}\n" +
    "            </label>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"hr\"></div>\n" +
    "\n" +
    "\n" +
    "        <h2 class=\"title pointer\" ng-click=\"trigger()\">\n" +
    "            {{STRINGS.NEWMEETING.meetingOptionsLabel}}\n" +
    "            <i class=\"trigger\" ng-class=\"{'up':!collapsed, 'down':collapsed}\">&nbsp;</i>\n" +
    "        </h2>\n" +
    "        <div class=\"slide-down ng-hide new-rc-conference-options\" ng-show=\"!collapsed\">\n" +
    "            <div class=\"value\">\n" +
    "                <label class=\"checkbox\">\n" +
    "                    <input type=\"checkbox\" name=\"requireMeetingPassword\" ng-model=\"rcConference.requireMeetingPassword\">\n" +
    "                    {{STRINGS.NEWMEETING.meetingPasswordCheckbox}}\n" +
    "                </label>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"value\">\n" +
    "                <div class=\"value-4\">\n" +
    "                    <label class=\"rc-label\">{{STRINGS.NEWMEETING.meetingPasswordLabel}}</label>\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"value-8\">\n" +
    "                    <input class=\"rc-input\" type=\"text\" name=\"password\" ng-model=\"rcConference.password\" ng-disabled=\"!rcConference.requireMeetingPassword\"/>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"value margin\">\n" +
    "                <label  class=\"checkbox\">\n" +
    "                    <input type=\"checkbox\" name=\"enableJoinBeforeHost\" ng-model=\"rcConference.enableJoinBeforeHost\">\n" +
    "                    {{STRINGS.NEWMEETING.joinBeforeHostCheckbox}}\n" +
    "                </label>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "        <button class=\"button save wide\" ng-disabled=\"loading\" ng-click=\"invite()\">{{STRINGS.NEWMEETING.inviteButtonText}}</button>\n" +
    "    </form>\n" +
    "\n" +
    "    <div class=\"not-found\" ng-if=\"infoMessage.length !== 0\">\n" +
    "        <p>{{infoCaption}}</p>\n" +
    "        <p>{{infoMessage}}</p>\n" +
    "    </div>\n" +
    "\n" +
    "    <pre ng-hide=\"true\" google-calendar-details result=\"rcConference.meetingDetails\">\n" +
    "Hi there.\n" +
    "\n" +
    "You have been invited to a scheduled {{brand|normalizeBrand}} Meetings video conference.\n" +
    "\n" +
    "Join from a PC, Mac, iPad, iPhone or Android device.\n" +
    "\n" +
    "\tPlease click this URL to start or join: <i>https://meetings.ringcentral.com/j/{{rcConference.meetingId}}</i>\n" +
    "\tOr enter meeting ID at <i>https://meetings.ringcentral.com/join</i>\n" +
    "\n" +
    "Join from dial-in phone line:\n" +
    "\n" +
    "\t<i>Dial: {{rcConference.dialNumber | formatPhone}}</i>\n" +
    "\tMeeting ID: {{rcConference.meetingId}}\n" +
    "\t<i ng-if=\"rcConference.requireMeetingPassword\">Password: {{rcConference.password}}</i>\n" +
    "\tParticipant ID: Shown after joining the meeting\n" +
    "\tInternational numbers available: <i>https://meetings.ringcentral.com/teleconference</i>\n" +
    "</pre>\n" +
    "</div>"
  );


  $templateCache.put('views/new-sms.html',
    "<script type=\"text/ng-template\" id=\"customTemplate.html\">\n" +
    "    <a>\n" +
    "        <div>\n" +
    "            <span bind-html-unsafe=\"match.model.name | typeaheadHighlight:query\"></span>\n" +
    "        </div>\n" +
    "        <div>\n" +
    "            <span ng-if=\"match.model.phone\" bind-html-unsafe=\"match.model.phone | typeaheadHighlight:query\"></span>\n" +
    "            <span ng-if=\"match.model.extension\" bind-html-unsafe=\"match.model.extension | typeaheadHighlight:query\"></span>\n" +
    "        </div>\n" +
    "    </a>\n" +
    "</script>\n" +
    "\n" +
    "<div class=\"rc-pane-header\">\n" +
    "    <h1-with-back-url back-url=\"backUrl\">\n" +
    "        {{STRINGS.NEWSMS.newSmsScreenHeader}}\n" +
    "    </h1-with-back-url>\n" +
    "</div>\n" +
    "<div class=\"rc-pane-scrollable new-sms\">\n" +
    "    <spinner show=\"showSpinner || sending\"></spinner>\n" +
    "\n" +
    "    <div class=\"error-msg\" ng-if=\"error\">\n" +
    "        {{ error }}\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"to\">\n" +
    "        <label>To:</label>\n" +
    "        <div class=\"value\">\n" +
    "            <contactpicker-input placeholder=\"{{STRINGS.NEWSMS.contactpickerPlaceholder}}\" loading=\"showSpinner\" recipients=\"recipients\" recipient-count=\"10\" hide-placeholder=\"true\"></contactpicker-input>\n" +
    "        </div>\n" +
    "        <contactpicker disabled=\"recipientsCount >= 10\" contactpicker-silent=\"true\" contactpicker-multiple=\"true\" contactpicker-value=\"recipientsNum\"/>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"text\">\n" +
    "        <rc-send-sms lines=\"5\" recipients=\"recipients\" before-send=\"beforeSend()\" after-send=\"afterSend($message)\" send-error=\"sendError(e)\"></rc-send-sms>\n" +
    "    </div>\n" +
    "</div>"
  );


  $templateCache.put('views/no-sf-support.html',
    "<p class=\"error-msg\">\n" +
    "    Your \n" +
    "    {{ brandName() }}\n" +
    "    edition does not support Salesforce Integration &mdash; please call your \n" +
    "    {{ brandName() }}\n" +
    "    account representative to upgrade your\n" +
    "    {{ brandName() }}\n" +
    "    edition.\n" +
    "</p>"
  );


  $templateCache.put('views/rc-limit.html',
    "<p class=\"error-msg\">{{ error }}</p>"
  );


  $templateCache.put('views/settings.html',
    "<div class=\"rc-pane-header\">\n" +
    "    <h1>\n" +
    "        {{STRINGS.SETTINGS.settingsScreenHeader}}\n" +
    "    </h1>\n" +
    "</div>\n" +
    "\n" +
    "<div class=\"rc-pane-scrollable settings\">\n" +
    "    <spinner show=\"showSpinner\"></spinner>\n" +
    "\n" +
    "    <div ng-show=\"!showSpinner\">\n" +
    "        <form>\n" +
    "            <div class=\"line\">\n" +
    "                <label class=\"checkbox\" ng-class=\"{'disabled': desktopNotifications.isDenied()}\">\n" +
    "                    <input type=\"checkbox\" ng-model=\"settings.desktopNotificationsEnabled\" ng-change=\"desktopNotifications.onChange()\" ng-disabled=\"desktopNotifications.isDenied()\" />\n" +
    "                    <span>{{STRINGS.SETTINGS.desktopNotificationsCheckbox}}</span>\n" +
    "                </label>\n" +
    "                <div ng-if=\"!desktopNotifications.isConfirmed()\" class=\"settings-info\">\n" +
    "                    {{STRINGS.SETTINGS.desktopNotificationsConfirmationInfo}}\n" +
    "                </div>\n" +
    "                <div ng-if=\"desktopNotifications.isDenied()\" class=\"settings-info\"\n" +
    "                     ng-bind-html=\"STRINGS.SETTINGS.desktopNotificationsDisabledInfo\">\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"line\">\n" +
    "                <label>{{STRINGS.SETTINGS.googleContactsCaption}}</label>\n" +
    "\n" +
    "                <div class=\"value value-right\">\n" +
    "                    <button ng-show=\"isGoogleAuthorized === false\" class=\"button save\" ng-click=\"authorizeGoogle()\">\n" +
    "                        {{STRINGS.SETTINGS.googleContactsAuthorizeButton}}\n" +
    "                    </button>\n" +
    "                    <p ng-show=\"isGoogleAuthorized === true\" class=\"googleAuthorized\">\n" +
    "                        {{STRINGS.SETTINGS.googleContactsAuthorizedText}}\n" +
    "                        (<a target=\"_blank\" ng-href=\"https://security.google.com/settings/u/{{googleUserNumber}}/security/permissions\">{{STRINGS.SETTINGS.googleContactsManageLink}}</a>)\n" +
    "                    </p>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </form>\n" +
    "\n" +
    "        <div class=\"footer\">\n" +
    "            <span class=\"eula\"><a href=\"{{ EULA_LINK }}\" target=\"_blank\">{{STRINGS.SETTINGS.eulaLink}}</a></span>\n" +
    "            <span class=\"version\">{{STRINGS.SETTINGS.versionInfo}} {{appversion}}</span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/sidebar.html',
    "<sidebutton sb-id=\"dialer\" sb-show=\"true\" sb-title=\"{{STRINGS.SIDEBAR.dialerTitle}}\" sb-tooltip=\"notification.dialer.message\" sb-tooltip-type=\"notification.dialer.type\"></sidebutton>\n" +
    "<sidebutton sb-id=\"new-sms\" sb-show=\"sms || pager\" sb-title=\"{{STRINGS.SIDEBAR.newTextTitle}}\"></sidebutton>\n" +
    "<sidebutton sb-id=\"messages\" sb-show=\"true\" sb-title=\"{{STRINGS.SIDEBAR.messagesTitle}}\" sb-badge=\"counters.messages\"></sidebutton>\n" +
    "<sidebutton sb-id=\"contacts\" sb-show=\"true\" sb-title=\"{{STRINGS.SIDEBAR.contactsTitle}}\"></sidebutton>\n" +
    "<sidebutton sb-id=\"call-log\" sb-show=\"true\" sb-title=\"{{STRINGS.SIDEBAR.callLogTitle}}\" sb-badge=\"(counters.calls|removeInboundLeg|filterMissedCalls|filterStarttimeCalls).length\"></sidebutton>\n" +
    "<sidebutton sb-id=\"new-rc-conference\" sb-show=\"true\" sb-title=\"{{STRINGS.SIDEBAR.meetingTitle}}\"></sidebutton>\n" +
    "<sidebutton sb-id=\"new-conference\" sb-show=\"conferencing\" sb-title=\"{{STRINGS.SIDEBAR.conferenceTitle}}\"></sidebutton>\n" +
    "<sidebutton sb-id=\"hangouts\" sb-show=\"conferencing\" sb-title=\"{{STRINGS.SIDEBAR.hangoutsTitle}}\" sb-click=\"startHangouts()\"></sidebutton>\n" +
    "<sidebutton sb-id=\"settings\" sb-show=\"true\" sb-title=\"{{STRINGS.SIDEBAR.settingsTitle}}\"></sidebutton>"
  );

}]);
