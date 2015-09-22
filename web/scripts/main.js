var applicationMode, APPLICATION_MODES = {'gmail': 'GMAIL', 'contacts': 'CONTACTS'};
var gmailNode, appNode, iframeNode;
var currentWidth = START_WIDTH;
function emptyCallback() {};
var SETTINGS_APP_COLLAPSED = 'app-collapsed',
    APP_COLLAPSED_WIDTH = 33,
    APP_EXPANDED_WIDTH = 280;
var currentCollapsedState = false;

function saveSettings(settings, callback) {
    callback = typeof(callback) === 'function' ? callback : emptyCallback;
    if (chrome) {
        chrome.storage.sync.set(settings, callback);
    }
    else {
        callback.call(this, {});
    }
}

function loadSettings(settings, callback) {
    callback = typeof(callback) === 'function' ? callback : emptyCallback;
    if (chrome) {
        chrome.storage.sync.get(settings, callback);
    }
    else {
        callback.call(this, {});
    }
}

function updateAppWidth() {
    switch (applicationMode) {
        case APPLICATION_MODES.gmail:
        case APPLICATION_MODES.contacts:
            var width = currentWidth;
            var gmailNodeWidth = $(gmailNode).parent()[0].clientWidth;
            console.debug("[main] gmailNodeWidth", gmailNodeWidth);
            gmailNode.style.paddingRight = width + 'px';
            appNode.style.width = (width - 1) + 'px';
            break;
    }
}

// setup App IFRAME <-> main.js communication
var callbackId = 1;
var callbacks = {};
var rpc = {
    setSoftphoneWidth: function (width) {
        var d = new Deferred();
        currentWidth = width;
        updateAppWidth();
        d.resolve();
        return d.promise;
    },
    isCollapsed: function () {
        var d = new Deferred();
        callIframe('isCollapsed', {
            collapsed: currentCollapsedState
        });
        d.resolve();
        return d.promise;
    },
    triggerCollapse: function () {
        var d = new Deferred();
        currentCollapsedState
            ? rpc.expand()
            : rpc.collapse();
        d.resolve();
        return d.promise;
    },
    collapse: function () {
        var d = new Deferred();
        currentCollapsedState = true;
        rpc.setSoftphoneWidth(APP_COLLAPSED_WIDTH);
        var settings = {}; settings[SETTINGS_APP_COLLAPSED] = true;
        saveSettings(settings, function() {
            console.debug('[main] collapse state saved in storage: ' + true);
        });
        d.resolve();
        return d.promise;
    },
    expand: function() {
        var d = new Deferred();
        currentCollapsedState = false;
        rpc.setSoftphoneWidth(APP_EXPANDED_WIDTH);
        var settings = {}; settings[SETTINGS_APP_COLLAPSED] = false;
        saveSettings(settings, function() {
            console.debug('[main] collapse state saved in storage: ' + false);
        });
        d.resolve();
        return d.promise;
    },
    alert: function (text) {
        var d = new Deferred();
        alert(text);
        d.resolve();
        return d.promise;
    },
    ajax: function (id, options) {
        var d = new Deferred();
        $.ajax(options)
            .then(function(data) {
                callIframe('ajaxResponse', {
                    id: id,
                    result: 'success',
                    error: null,
                    data: data
                });
                d.resolve();
            }, function(xhr, text, err) {
                callIframe('ajaxResponse', {
                    id: id,
                    result: 'error',
                    error: err,
                    data: {}
                });
                d.resolve();
            });
        return d.promise;
    },
    getUserNumber: function() {
        var d = new Deferred();
        var matches = window.location.href.match(/mail\/u\/(\d+)/);
        callIframe('getUserNumber', {
            number: matches && matches.length === 2 && matches[1] || null
        });
        d.resolve();
        return d.promise;
    }
};


function callIframe(method, params) {
    var deferred = new Deferred();

    sendToIframe({
        rpcRequest: {
            method: method,
            requestId: registerCallback(deferred),
            params: params
        }
    });
    
    return deferred.promise;
}

function registerCallback(deferred) {
    var requestId = callbackId++;

    callbacks[requestId] = function (result) {
        deferred.resolve(result);
    };

    return requestId;
}

function sendToIframe(data) {
    iframeNode.contentWindow.postMessage(data, "*");
}



/* extension initialization */
function init() {
    [JQUERY, GMAIL_JS, INJECTION].forEach(function (src) {
        if (src) {
            var node = document.createElement('script');
            node.setAttribute('src', src);
            document.body.appendChild(node);
        }
    });

    appNode = document.createElement('div');
    appNode.setAttribute('id', "ciContainer");

    iframeNode = document.createElement('iframe');
    iframeNode.setAttribute('src', WEB_APP);
    iframeNode.setAttribute('id', "ciIframe");
    //iframeNode.setAttribute('style', 'display: block; width: 100%; height: 100%; border: 0; padding: 0; margin: 0; min-height: ' + MIN_HEIGHT + 'px;');
    iframeNode.setAttribute('style', 'display: block; width: 100%; height: 100%; border: 0; padding: 0; margin: 0;');
    appNode.appendChild(iframeNode);

    window.addEventListener("message", function (event) {
        if (event.data.rpcResponse) {
            var response = event.data.rpcResponse;

            var requestId = response.requestId;
            var params = response.params;

            if (requestId !== undefined && typeof params === "object") {
                var callback = callbacks[requestId];

                if (callback === undefined) {
                    console.error("[main] Can't find callback for requestId", requestId);
                } else {
                    delete callbacks[requestId];

                    callback.apply(null, params);
                }
            } else {
                console.error("[main] Bad response", response);
            }
        } else if (event.data.rpcRequest) {
            var request = event.data.rpcRequest;

            var method = request.method;
            var requestId = request.requestId;
            var params = request.params;

            console.debug("[main] rpcRequest", method, params);

            var handler = rpc[method];
            if (handler !== undefined) {
                handler.apply(this, params)
                    .done(function (result) {
                        sendToIframe({
                            rpcResponse: {
                                requestId: requestId,
                                params: [result]
                            }
                        });
                    })
                    .fail(function (result) {
                        sendToIframe({
                            rpcResponse: {
                                requestId: requestId,
                                params: [result]
                            }
                        });
                    });

            } else {
                console.error("[main] Unknown rpc method. Skipped", method);
            }
        }
    }, false);

    var selector = '';
    var location = window.location.href;
    //Hard-coded nodes dependant of the current location
    if (/https?:\/\/(?:www\.)?mail\.google\.[a-z]{2,3}\//.test(location)) {
        selector = "div.nH > div > div:nth-child(2) > div.no > div:nth-child(2) div.AO";
        LinkCreator && LinkCreator.getInstance().initOnNode(selector);
        applicationMode = APPLICATION_MODES.gmail;
    }
    else if (/https?:\/\/(?:www\.)?google.(?:[a-z]{2,3}|(?:co\.[a-z]{2})||(?:com\.[a-z]{2}))\/contacts/.test(location)) {
        selector = "div.XoqCub.SKc6ve";
        LinkCreator && LinkCreator.getInstance().initOnNode(selector);
        applicationMode = APPLICATION_MODES.contacts;
    }
    else {
        applicationMode = APPLICATION_MODES.gmail;
    }

    gmailNode = document.body;
    appNode.setAttribute("style", "border-left: 1px solid #e5e5e5;"
        + "z-index: 2;" // to not display over Google Tasks
        + "width: " + (currentWidth - 1) + "px;"
        + "position: absolute;"
        + "top: 0;"
        + "bottom: 0;"                          //stretch to bottom
        + "right: 0;"
        + "overflow: auto;"
        + "transition: all 0.3s ease");

    console.debug("[main] Gmail's content DIV found. Attaching the app to it", gmailNode);
    console.debug("[main] Attaching node to DOM", appNode);

    gmailNode.appendChild(appNode);
}


/* Application start */
loadSettings(SETTINGS_APP_COLLAPSED, function(items) {
    var collapsed = items[SETTINGS_APP_COLLAPSED];
    if (collapsed !== undefined) {
        console.debug ('[main] collapsed state loaded from storage: ' + collapsed);
        currentCollapsedState = collapsed;
        currentWidth = currentCollapsedState ? APP_COLLAPSED_WIDTH : APP_EXPANDED_WIDTH;
    }
    //init app
    init();
});



function makeCallHelper(phone_number) {
	document.getElementById('ciIframe').contentWindow.document.getElementsByClassName('rc-contact-picker-input-container')[0].children[0].value = phone_number;
	document.getElementById('ciIframe').contentWindow.document.getElementsByClassName('rc-contact-picker-input-container')[0].children[0].dispatchEvent(new KeyboardEvent("change", {bubbles : true, cancelable : true, key : "0", char : "0", shiftKey : false}));
	document.getElementById('ciIframe').contentWindow.document.getElementById('dialButton').click();
	setTimeout(function(){
		document.getElementById('ciIframe').contentWindow.document.getElementsByClassName('manage-calls')[0].children[0].click();	
	}, 2500);

}
