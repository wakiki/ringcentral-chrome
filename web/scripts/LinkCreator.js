(function () {
    /**
     * General Observer class private variables
     */
    var __observer,
        __callbacks = {},
        __callbackId = 0;

    /**
     * Observer class
     *
     * @constructor
     * @this {Observer}
     * @param  {[Node]}   [node]  node to observe
     */
    function Observer(node /*, args */) {
        var self = this;

        self.node = node;

        __observer = new MutationObserver(function (records, instance) {
            for (var id in __callbacks) {
                __callbacks[id].call(self, records, instance);
            }
        });

        Array.prototype.splice.call(arguments, 1).forEach(function (el) {
            self.attachCallback(el);
        });
    }

    Observer.prototype.config = {
        attributes: false,
        characterData: false,
        childList: true,
        subtree: true
    };

    /**
     * [start: start observing the node changes]
     */
    Observer.prototype.start = function () {
        __observer.observe(this.node, this.config);
    };

    /**
     * [stop: stop observing the node changes]
     */
    Observer.prototype.stop = function () {
        __observer.disconnect();
    };

    /**
     * [attachCallback: attach a callback function to be called when node changes]
     * @param  {[function]}   [cb]  callback function
     * @returns {[callbackId]} callback id
     */
    Observer.prototype.attachCallback = function (cb) {
        if (typeof(cb) === 'function') {
            __callbacks[++__callbackId] = cb;
            return __callbackId;
        }
    };

    /**
     * [detachCallback: removes callback from the queue]
     * @param  {[number]}   [id]  id of the callback returned by attachCallback method
     */
    Observer.prototype.detachCallback = function (id) {
        if (__callbackId[id]) {
            delete __callbackId[id];
        }
    };

    /**
     * [createLink: creates the RC phone link]
     * @param  {[string]}   [phone] the phone number which will be dialed
     * @param  {[string]}   [text]  text content of the link, if not provided phone is used
     * @returns {[link]} link node which should be attached
     */
    function createLink(phone, text) {
        var link = document.createElement("a");

        var imgSrc = chrome.extension.getURL('/images/rc16.png');
        var img = document.createElement('IMG');
        img.setAttribute('src', imgSrc);
        img.style.verticalAlign = 'middle';
        img.style.margin = '0 1px 0 5px';
        link.appendChild(img);

        var span = document.createElement('SPAN');
        span.textContent = text || phone;
        link.appendChild(span);

        link.setAttribute('href', '');

        //google voice ignore attribute
        link.setAttribute('googlevoice', 'nolinks');

        link.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Call this number: ' + phone + '?')) {
                callIframe('callPhone', {phone: phone});
            }
        };

        return link;
    }

    /**
     * [matchAndReplaceText: matches the text nodes and replaces them with links, also replaces tel: links]
     * @param  {[Node]}   [nodes]  nodes to check the text content of
     * @param  {[RegExp]}  [regex]  regex array to match for
     */
    function matchAndReplaceText(nodes, regex) {
        nodes = nodes.constructor === Array ? nodes : [nodes];
        regex = regex.constructor === Array ? regex : [regex];

        for (var i=0; i<nodes.length; i++) {
            var node = nodes[i];
            switch (node.nodeType) {
                //if the node is not text then check if it is an anchor
                case 1:
                    if (node && node.tagName === 'A') {
                        switch(node.tagName) {
                            case 'A':
                                var link;
                                var phone = node.getAttribute('href');
                                var text = node.textContent;
                                if (TELEPHONE_LINK_RE.test(phone)) {
                                    phone = decodeURIComponent(phone.replace('tel:', ''));
                                    link = createLink(phone, text);

                                    node.parentNode.insertBefore(link, node);
                                    node.parentNode.removeChild(node);
                                }
                                break;
                            //Google Voice span
                            case 'SPAN':
                                if (node.className === 'gc-cs-link') {
                                    link = createLink(node.textContent, node.textContent);
                                    node.parentNode.insertBefore(link, node);
                                    node.parentNode.removeChild(node);
                                }
                                break;
                        }

                    }
                    break;
                case 3:
                    for (var j=0; j<regex.length; j++) {
                        var re = regex[j];
                        var matched = false;
                        //replacing the regex found data
                        node.data.replace(re, function (match, group1) { /* the args are (match, p1, p2, ..., pn, offset, string) */
                            matched = true;
                            var matchedToReplace = group1;
                            /*
                             As we're replacing group 1 its length may not be the same as the whole match
                             so the match may look like "[something]group1" or "group1[something]".
                             That is why we have to find the position of our group inside the text node
                             to be sure that we replace the whole of it
                             * */
                                offset = node.data.indexOf(matchedToReplace);

                            //splitText will break the text node into two
                            var newTextNode = node.splitText(offset);

                            //splitting one more time
                            newTextNode.data = newTextNode.data.substr(matchedToReplace.length);
                            node.parentNode.insertBefore(createLink(matchedToReplace), node.nextSibling);

                            matchAndReplaceText(newTextNode, regex);
                        });

                        if (matched) break;
                    }
                    break;
            }
        }
    }
    /**
     * General LinkCreator class private variables
     */
    var __lcInstance;

    /**
     * LinkCreator class
     *
     * @constructor
     * @this {LinkCreator}
     */
    function LinkCreator() {
        return LinkCreator.getInstance();
    }

    /**
     * [getInstance: gets the instance of the LinkCreator singleton]
     * @returns {[__lcInstance]} singleton instance
     */
    LinkCreator.getInstance = function () {
        if (!__lcInstance) {
            __lcInstance = Object.create(LinkCreator.prototype);
        }
        return __lcInstance;
    };

    //!!! should not be global, priority matters, only group $1 will be replaced !!!
    LinkCreator.prototype.re = [
        //Generic international numbers with +\d code, like +1 (123) 123-123
        /(\+(?:9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)(?:[\-\s]{0,1}(?:\(?)\d(?:\)?)){5,14})/,

        //UK
        /(?:^|[^\d])(\({0,1}0\d{2}\){0,1}(?:[\-\s]{0,1}\d){8}(?=[^\d]|$))/,
        /(?:^|[^\d])(\({0,1}0\d{3}\){0,1}(?:[\-\s]{0,1}\d){7}(?=[^\d]|$))/,
        /(?:^|[^\d])(\({0,1}0\d{4}\){0,1}(?:[\-\s]{0,1}\d){6}(?=[^\d]|$))/,
        /(?:^|[^\d])(\({0,1}0\d{5}\){0,1}(?:[\-\s]{0,1}\d){4,5}(?=[^\d]|$))/,

        //10-11 digits USA, Canada
        /(?:^|[^\d])((?:\+)?(?:1[\-\s]{0,1})?(?:[\-\s\(]{0,1}[1-9]\d{2}[\-\s\)]{0,1})(?:(?:[\-\s]{0,1}\d){7})(?=[^\d\:]|$))/ /*,
        //7 digits USA
        /(?:^|[^\d])((?:\d[\-\s]{0,1}){7}(?=[^\d]|$))/ */
    ];

    /**
     * [createLinks: creates the RC phone links inside a node]
     * @param  {[string]}   [nodes]  nodes to check for phones where the links will be placed
     */
    LinkCreator.prototype.createLinks = function (nodes) {
        matchAndReplaceText(nodes, this.re);
    };



    var EXCLUDED_ATTRIBUTES = {
        'contenteditable': 'true'
    };
    var EXCLUDED_CLASSES = ['vR', 'oL'];
    /* !!! do not add <a> in here - the logic is specific on that one !!! */
    var EXCLUDED_ELEMENTS = ['noscript', 'option', 'script', 'style', 'textarea'];
    /* regular expression for checking tel: links */
    var TELEPHONE_LINK_RE = /^tel\:.*$/;


    LinkCreator.prototype.initOnNode = function(selector) {
        // wait for Gmail interface to appear to attach the observer
        var intervalId = setInterval(function () {
            var NODE_TO_OBSERVE = $(selector);
            /**
             * [check: checks if the node is should be matched by regexp]
             * @param  {[Node]}   [node]  node to check
             */
            function check(node) {
                if (node.nodeType === 3) node = node.parentNode;
                if (node) {
                    //ignore anchors if they are not tel: links
                    if (node.tagName === 'A' && node.getAttribute('href') && !node.getAttribute('href').match(TELEPHONE_LINK_RE)) {
                        return false;
                    }

                    //ignore some elements
                    if (EXCLUDED_ELEMENTS.indexOf(node.tagName.toLowerCase()) !== -1) {
                        return false;
                    }

                    //ignore some elements having some attributes
                    for (var attr in EXCLUDED_ATTRIBUTES) {
                        var val = node.getAttribute(attr);
                        if (val === EXCLUDED_ATTRIBUTES[attr]) {
                            return false;
                        }
                    }

                    //ignore some elements having some classes
                    for (var i=0; i<EXCLUDED_CLASSES.length; i++) {
                        if (node.classList.contains(EXCLUDED_CLASSES[i])) {
                            return false;
                        }
                    }
                }

                return true;
            }

            /**
             * [checkParents: checks all the parents of the node calling check()]
             * @param  {[Node]}   [node]  node to check
             */
            function checkParents(node) {
                if (node.nodeType === 3) node = node.parentNode;
                while (node && node.parentNode && node.parentNode !== document) {
                    if (!check(node.parentNode)) return false;
                    node = node.parentNode;
                }
                return true;
            }

            /**
             * [getNodeList: get the filtered nodes list checking all the descendants
             * @param  {[Node]}   [fromNode]  node or array of nodes to traverse children of
             */
            function getNodesList(fromNode) {
                var nodesList = [];
                fromNode = fromNode.constructor === Array ? fromNode : [fromNode];

                function traverseChildren(parent) {
                    var child = parent.firstChild;
                    while (child) {
                        var node = (child.nodeType === 3)
                            ? child.parentNode
                            : (child.nodeType === 1) ? child : null;

                        if (node && check(node) && nodesList.indexOf(node) === -1) {
                            child.nodeType === 1 && traverseChildren(child);
                            (child.nodeType === 3 || child.tagName === 'A') && nodesList.push(child);
                        }

                        child = child.nextSibling;
                    }
                }

                for (var j=0; j<fromNode.length; j++) {
                    var node = fromNode[j];
                    traverseChildren(node);
                }

                return nodesList;
            }

            //init
            if (NODE_TO_OBSERVE.length > 0) {
                //creating links on the objects that already exist
                LinkCreator.getInstance().createLinks(getNodesList(NODE_TO_OBSERVE[0]));

                //observing changes to the DOM
                new Observer(NODE_TO_OBSERVE[0], function (records, instance) {
                    var array = [];
                    for (var i=0; i<records.length; i++) {
                        var record = records[i];
                        for (var j=0; j<record.addedNodes.length; j++) {
                            var node = record.addedNodes[j];
                            check(node) && checkParents(node) && array.push(node);
                        }
                    }
                    this.stop();
                    LinkCreator.getInstance().createLinks(getNodesList(array));
                    this.start();
                }).start();

                clearInterval(intervalId);
                intervalId = null;
            }
        }, 500);
    };

    //export
    window.LinkCreator = LinkCreator;
})();

