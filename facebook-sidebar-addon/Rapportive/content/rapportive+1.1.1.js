var delayedConditionalExecute, fsLog, fsPopupManager, rapportiveLogger;

function merge(dest, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            dest[key] = src[key];
        }
    }
    return dest;
}

function fsLog(message, serverCategory, serverLevel) {
    try {
        if (window.top && window.top.console) {
            window.top.console.log(message);
        } else if (window.console) {
            window.console.log(message);
        }
    } catch (e) {}
    if (serverCategory) {
        if (rapportiveLogger) {
            var level = serverLevel ? serverLevel : "debug";
            rapportiveLogger.log(level, serverCategory, message);
        } else {
            fsLog("tried to log to server but rapportiveLogger isn't defined");
        }
    }
}

function loggily(description, continuation) {
    return function () {
        try {
            return continuation.apply(this, arguments);
        } catch (e) {
            fsLog("Rapportive exception: " + description + ": " + e, "gmail", "error");
            throw e;
        }
    };
}

function RapportiveLogger(server, minLevel) {
    var bad_params = {
        user_id: 1,
        type: 1,
        timestamp: 1,
        controller: 1,
        action: 1,
        callback: 1,
        category: 1,
        level: 1,
        path: 1,
        format: 1
    };
    var levels = {
        all: 0,
        debug: 10,
        info: 20,
        warn: 30,
        warning: 30,
        error: 40,
        fatal: 100
    };
    var callbackCount = (new Date()).getTime();
    this.server = server;
    this.minLevel = minLevel;
    this.baseUrl = function (level, category) {
        return this.server + "/log/" + encodeURIComponent(category) + "/" + encodeURIComponent(level);
    };
    this.log = function (level, category, message, params) {
        if (message === undefined && params === undefined) {
            throw new Error("Please specify level, category and message");
        }
        if (levels[level] < levels[this.minLevel]) {
            return;
        }
        var callback = 'logger' + callbackCount;
        callbackCount += 1;
        var data = 'message=' + encodeURIComponent(message) + '&callback=' + callback;
        if (params) {
            for (var param in params) {
                if (params.hasOwnProperty(param)) {
                    if (bad_params[param]) {
                        throw new Error("Parameter '" + param + "' is reserved!");
                    }
                    data += '&' + encodeURIComponent(param) + '=' + encodeURIComponent(params[param]);
                }
            }
        }
        this.makeRequest(this.baseUrl(level, category) + '?' + data, callback);
    };
    this.makeRequest = function (url, callback) {
        var head = document.getElementsByTagName("head")[0] || document.documentElement;
        var garbageCollect = document.createElement("script");
        garbageCollect.id = callback + 'callback';
        garbageCollect.type = 'text/javascript';
        garbageCollect.text = this.garbageCollectionCode(callback);
        head.insertBefore(garbageCollect, head.firstChild);
        var request = document.createElement("script");
        request.id = callback + 'request';
        request.type = 'text/javascript';
        request.src = url;
        head.insertBefore(request, head.firstChild);
    };
    this.garbageCollectionCode = function (callback) {
        return "function " + callback + " () {\n" + "   try {\n" + "       window." + callback + " = undefined;\n" + "       delete window." + callback + ";\n" + "   } catch (e) {}\n" + "   var request = document.getElementById('" + callback + "request');\n" + "   if (request) request.parentNode.removeChild(request);\n" + "   var callback = document.getElementById('" + callback + "callback');\n" + "   if (callback) callback.parentNode.removeChild(callback);\n" + "}\n";
    };
    this.debug = function (category, message, params) {
        this.log("debug", category, message, params);
    };
    this.info = function (category, message, params) {
        this.log("info", category, message, params);
    };
    this.warning = this.warn = function (category, message, params) {
        this.log("warning", category, message, params);
    };
    this.error = function (category, message, params) {
        this.log("error", category, message, params);
    };
    this.fatal = function (category, message, params) {
        this.log("fatal", category, message, params);
    };
    this.track = function (message, params, probability) {
        if (undefined !== probability) {
            params.probability = probability;
        }
        this.log("info", "track", message, params);
    };
}

function delayedConditionalExecute(options) {
    var default_options = {
        poll_delay: 200,
        max_poll_attempts: 100,
        retry_message: "Scheduling another delayedConditionalExecute search.",
        failure_message: "Ran out of delayedConditionalExecute search attempts -- giving up!",
        error_message: "Condition threw an exception!",
        condition: function () {
            throw "No condition supplied to delayedConditionalExecute!";
        },
        continuation: function () {},
        log_category: "gmail",
        log_level_on_failure: "error",
        log_level_on_error: null
    };
    options = merge(default_options, options);
    var attempts = 0;

    function log(message, additional_message, category, level) {
        if (typeof(message) === "function") {
            message = message();
        }
        if (message) {
            fsLog(message + " " + (additional_message || ""), category, level);
        }
    }

    function doAttempt() {
        var condition;
        try {
            condition = options.condition();
        } catch (e) {
            var eStr = e.message ? e.message : e;
            log(options.error_message, "(after " + attempts + " attempts, '" + eStr + "')", options.log_category, (options.log_level_on_error || options.log_level_on_failure));
            return;
        }
        if (condition) {
            options.continuation();
        } else {
            if (attempts < options.max_poll_attempts) {
                attempts += 1;
                log(options.retry_message, "Attempts so far: " + attempts);
                window.setTimeout(loggily('delayedConditionalExecute attempt', doAttempt), options.poll_delay);
            } else {
                log(options.failure_message, null, options.log_category, options.log_level_on_failure);
            }
        }
    }
    doAttempt();
}(function (window, undefined) {
    var jQuery = function (selector, context) {
        return new jQuery.fn.init(selector, context);
    },
        _jQuery = window.jQuery,
        _$ = window.$,
        document = window.document,
        rootjQuery, quickExpr = /^[^<]*(<[\w\W]+>)[^>]*$|^#([\w-]+)$/,
        isSimple = /^.[^:#\[\.,]*$/,
        rnotwhite = /\S/,
        rtrim = /^(\s|u)+|(\s|\u00A0)+$/g,
        rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>)?$/,
        userAgent = navigator.userAgent,
        browserMatch, readyBound = false,
        readyList = [],
        DOMContentLoaded, toString = Object.prototype.toString,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        push = Array.prototype.push,
        slice = Array.prototype.slice,
        indexOf = Array.prototype.indexOf;
    jQuery.fn = jQuery.prototype = {
        init: function (selector, context) {
            var match, elem, ret, doc;
            if (!selector) {
                return this;
            }
            if (selector.nodeType) {
                this.context = this[0] = selector;
                this.length = 1;
                return this;
            }
            if (selector === "body" && !context) {
                this.context = document;
                this[0] = document.body;
                this.selector = "body";
                this.length = 1;
                return this;
            }
            if (typeof selector === "string") {
                match = quickExpr.exec(selector);
                if (match && (match[1] || !context)) {
                    if (match[1]) {
                        doc = (context ? context.ownerDocument || context : document);
                        ret = rsingleTag.exec(selector);
                        if (ret) {
                            if (jQuery.isPlainObject(context)) {
                                selector = [document.createElement(ret[1])];
                                jQuery.fn.attr.call(selector, context, true);
                            } else {
                                selector = [doc.createElement(ret[1])];
                            }
                        } else {
                            ret = buildFragment([match[1]], [doc]);
                            selector = (ret.cacheable ? ret.fragment.cloneNode(true) : ret.fragment).childNodes;
                        }
                        return jQuery.merge(this, selector);
                    } else {
                        elem = document.getElementById(match[2]);
                        if (elem) {
                            if (elem.id !== match[2]) {
                                return rootjQuery.find(selector);
                            }
                            this.length = 1;
                            this[0] = elem;
                        }
                        this.context = document;
                        this.selector = selector;
                        return this;
                    }
                } else if (!context && /^\w+$/.test(selector)) {
                    this.selector = selector;
                    this.context = document;
                    selector = document.getElementsByTagName(selector);
                    return jQuery.merge(this, selector);
                } else if (!context || context.jquery) {
                    return (context || rootjQuery).find(selector);
                } else {
                    return jQuery(context).find(selector);
                }
            } else if (jQuery.isFunction(selector)) {
                return rootjQuery.ready(selector);
            }
            if (selector.selector !== undefined) {
                this.selector = selector.selector;
                this.context = selector.context;
            }
            return jQuery.makeArray(selector, this);
        },
        selector: "",
        jquery: "1.4.2",
        length: 0,
        size: function () {
            return this.length;
        },
        toArray: function () {
            return slice.call(this, 0);
        },
        get: function (num) {
            return num == null ? this.toArray() : (num < 0 ? this.slice(num)[0] : this[num]);
        },
        pushStack: function (elems, name, selector) {
            var ret = jQuery();
            if (jQuery.isArray(elems)) {
                push.apply(ret, elems);
            } else {
                jQuery.merge(ret, elems);
            }
            ret.prevObject = this;
            ret.context = this.context;
            if (name === "find") {
                ret.selector = this.selector + (this.selector ? " " : "") + selector;
            } else if (name) {
                ret.selector = this.selector + "." + name + "(" + selector + ")";
            }
            return ret;
        },
        each: function (callback, args) {
            return jQuery.each(this, callback, args);
        },
        ready: function (fn) {
            jQuery.bindReady();
            if (jQuery.isReady) {
                fn.call(document, jQuery);
            } else if (readyList) {
                readyList.push(fn);
            }
            return this;
        },
        eq: function (i) {
            return i === -1 ? this.slice(i) : this.slice(i, +i + 1);
        },
        first: function () {
            return this.eq(0);
        },
        last: function () {
            return this.eq(-1);
        },
        slice: function () {
            return this.pushStack(slice.apply(this, arguments), "slice", slice.call(arguments).join(","));
        },
        map: function (callback) {
            return this.pushStack(jQuery.map(this, function (elem, i) {
                return callback.call(elem, i, elem);
            }));
        },
        end: function () {
            return this.prevObject || jQuery(null);
        },
        push: push,
        sort: [].sort,
        splice: [].splice
    };
    jQuery.fn.init.prototype = jQuery.fn;
    jQuery.extend = jQuery.fn.extend = function () {
        var target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false,
            options, name, src, copy;
        if (typeof target === "boolean") {
            deep = target;
            target = arguments[1] || {};
            i = 2;
        }
        if (typeof target !== "object" && !jQuery.isFunction(target)) {
            target = {};
        }
        if (length === i) {
            target = this;
            --i;
        }
        for (; i < length; i++) {
            if ((options = arguments[i]) != null) {
                for (name in options) {
                    src = target[name];
                    copy = options[name];
                    if (target === copy) {
                        continue;
                    }
                    if (deep && copy && (jQuery.isPlainObject(copy) || jQuery.isArray(copy))) {
                        var clone = src && (jQuery.isPlainObject(src) || jQuery.isArray(src)) ? src : jQuery.isArray(copy) ? [] : {};
                        target[name] = jQuery.extend(deep, clone, copy);
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }
        return target;
    };
    jQuery.extend({
        noConflict: function (deep) {
            window.$ = _$;
            if (deep) {
                window.jQuery = _jQuery;
            }
            return jQuery;
        },
        isReady: false,
        ready: function () {
            if (!jQuery.isReady) {
                if (!document.body) {
                    return setTimeout(jQuery.ready, 13);
                }
                jQuery.isReady = true;
                if (readyList) {
                    var fn, i = 0;
                    while ((fn = readyList[i++])) {
                        fn.call(document, jQuery);
                    }
                    readyList = null;
                }
                if (jQuery.fn.triggerHandler) {
                    jQuery(document).triggerHandler("ready");
                }
            }
        },
        bindReady: function () {
            if (readyBound) {
                return;
            }
            readyBound = true;
            if (document.readyState === "complete") {
                return jQuery.ready();
            }
            if (document.addEventListener) {
                document.addEventListener("DOMContentLoaded", DOMContentLoaded, false);
                window.addEventListener("load", jQuery.ready, false);
            } else if (document.attachEvent) {
                document.attachEvent("onreadystatechange", DOMContentLoaded);
                window.attachEvent("onload", jQuery.ready);
                var toplevel = false;
                try {
                    toplevel = window.frameElement == null;
                } catch (e) {}
                if (document.documentElement.doScroll && toplevel) {
                    doScrollCheck();
                }
            }
        },
        isFunction: function (obj) {
            return toString.call(obj) === "[object Function]";
        },
        isArray: function (obj) {
            return toString.call(obj) === "[object Array]";
        },
        isPlainObject: function (obj) {
            if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType || obj.setInterval) {
                return false;
            }
            if (obj.constructor && !hasOwnProperty.call(obj, "constructor") && !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
            var key;
            for (key in obj) {}
            return key === undefined || hasOwnProperty.call(obj, key);
        },
        isEmptyObject: function (obj) {
            for (var name in obj) {
                return false;
            }
            return true;
        },
        error: function (msg) {
            throw msg;
        },
        parseJSON: function (data) {
            if (typeof data !== "string" || !data) {
                return null;
            }
            data = jQuery.trim(data);
            if (/^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
                return window.JSON && window.JSON.parse ? window.JSON.parse(data) : (new Function("return " + data))();
            } else {
                jQuery.error("Invalid JSON: " + data);
            }
        },
        noop: function () {},
        globalEval: function (data) {
            if (data && rnotwhite.test(data)) {
                var head = document.getElementsByTagName("head")[0] || document.documentElement,
                    script = document.createElement("script");
                script.type = "text/javascript";
                if (jQuery.support.scriptEval) {
                    script.appendChild(document.createTextNode(data));
                } else {
                    script.text = data;
                }
                head.insertBefore(script, head.firstChild);
                head.removeChild(script);
            }
        },
        nodeName: function (elem, name) {
            return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
        },
        each: function (object, callback, args) {
            var name, i = 0,
                length = object.length,
                isObj = length === undefined || jQuery.isFunction(object);
            if (args) {
                if (isObj) {
                    for (name in object) {
                        if (callback.apply(object[name], args) === false) {
                            break;
                        }
                    }
                } else {
                    for (; i < length;) {
                        if (callback.apply(object[i++], args) === false) {
                            break;
                        }
                    }
                }
            } else {
                if (isObj) {
                    for (name in object) {
                        if (callback.call(object[name], name, object[name]) === false) {
                            break;
                        }
                    }
                } else {
                    for (var value = object[0]; i < length && callback.call(value, i, value) !== false; value = object[++i]) {}
                }
            }
            return object;
        },
        trim: function (text) {
            return (text || "").replace(rtrim, "");
        },
        makeArray: function (array, results) {
            var ret = results || [];
            if (array != null) {
                if (array.length == null || typeof array === "string" || jQuery.isFunction(array) || (typeof array !== "function" && array.setInterval)) {
                    push.call(ret, array);
                } else {
                    jQuery.merge(ret, array);
                }
            }
            return ret;
        },
        inArray: function (elem, array) {
            if (array.indexOf) {
                return array.indexOf(elem);
            }
            for (var i = 0, length = array.length; i < length; i++) {
                if (array[i] === elem) {
                    return i;
                }
            }
            return -1;
        },
        merge: function (first, second) {
            var i = first.length,
                j = 0;
            if (typeof second.length === "number") {
                for (var l = second.length; j < l; j++) {
                    first[i++] = second[j];
                }
            } else {
                while (second[j] !== undefined) {
                    first[i++] = second[j++];
                }
            }
            first.length = i;
            return first;
        },
        grep: function (elems, callback, inv) {
            var ret = [];
            for (var i = 0, length = elems.length; i < length; i++) {
                if (!inv !== !callback(elems[i], i)) {
                    ret.push(elems[i]);
                }
            }
            return ret;
        },
        map: function (elems, callback, arg) {
            var ret = [],
                value;
            for (var i = 0, length = elems.length; i < length; i++) {
                value = callback(elems[i], i, arg);
                if (value != null) {
                    ret[ret.length] = value;
                }
            }
            return ret.concat.apply([], ret);
        },
        guid: 1,
        proxy: function (fn, proxy, thisObject) {
            if (arguments.length === 2) {
                if (typeof proxy === "string") {
                    thisObject = fn;
                    fn = thisObject[proxy];
                    proxy = undefined;
                } else if (proxy && !jQuery.isFunction(proxy)) {
                    thisObject = proxy;
                    proxy = undefined;
                }
            }
            if (!proxy && fn) {
                proxy = function () {
                    return fn.apply(thisObject || this, arguments);
                };
            }
            if (fn) {
                proxy.guid = fn.guid = fn.guid || proxy.guid || jQuery.guid++;
            }
            return proxy;
        },
        uaMatch: function (ua) {
            ua = ua.toLowerCase();
            var match = /(webkit)[ \/]([\w.]+)/.exec(ua) || /(opera)(?:.*version)?[ \/]([\w.]+)/.exec(ua) || /(msie) ([\w.]+)/.exec(ua) || !/compatible/.test(ua) && /(mozilla)(?:.*? rv:([\w.]+))?/.exec(ua) || [];
            return {
                browser: match[1] || "",
                version: match[2] || "0"
            };
        },
        browser: {}
    });
    browserMatch = jQuery.uaMatch(userAgent);
    if (browserMatch.browser) {
        jQuery.browser[browserMatch.browser] = true;
        jQuery.browser.version = browserMatch.version;
    }
    if (jQuery.browser.webkit) {
        jQuery.browser.safari = true;
    }
    if (indexOf) {
        jQuery.inArray = function (elem, array) {
            return indexOf.call(array, elem);
        };
    }
    rootjQuery = jQuery(document);
    if (document.addEventListener) {
        DOMContentLoaded = function () {
            document.removeEventListener("DOMContentLoaded", DOMContentLoaded, false);
            jQuery.ready();
        };
    } else if (document.attachEvent) {
        DOMContentLoaded = function () {
            if (document.readyState === "complete") {
                document.detachEvent("onreadystatechange", DOMContentLoaded);
                jQuery.ready();
            }
        };
    }

    function doScrollCheck() {
        if (jQuery.isReady) {
            return;
        }
        try {
            document.documentElement.doScroll("left");
        } catch (error) {
            setTimeout(doScrollCheck, 1);
            return;
        }
        jQuery.ready();
    }

    function evalScript(i, elem) {
        if (elem.src) {
            jQuery.ajax({
                url: elem.src,
                async: false,
                dataType: "script"
            });
        } else {
            jQuery.globalEval(elem.text || elem.textContent || elem.innerHTML || "");
        }
        if (elem.parentNode) {
            elem.parentNode.removeChild(elem);
        }
    }

    function access(elems, key, value, exec, fn, pass) {
        var length = elems.length;
        if (typeof key === "object") {
            for (var k in key) {
                access(elems, k, key[k], exec, fn, value);
            }
            return elems;
        }
        if (value !== undefined) {
            exec = !pass && exec && jQuery.isFunction(value);
            for (var i = 0; i < length; i++) {
                fn(elems[i], key, exec ? value.call(elems[i], i, fn(elems[i], key)) : value, pass);
            }
            return elems;
        }
        return length ? fn(elems[0], key) : undefined;
    }

    function now() {
        return (new Date).getTime();
    }(function () {
        jQuery.support = {};
        var root = document.documentElement,
            script = document.createElement("script"),
            div = document.createElement("div"),
            id = "script" + now();
        div.style.display = "none";
        div.innerHTML = "   <link/><table></table><a href='/a' style='color:red;float:left;opacity:.55;'>a</a><input type='checkbox'/>";
        var all = div.getElementsByTagName("*"),
            a = div.getElementsByTagName("a")[0];
        if (!all || !all.length || !a) {
            return;
        }
        jQuery.support = {
            leadingWhitespace: div.firstChild.nodeType === 3,
            tbody: !div.getElementsByTagName("tbody").length,
            htmlSerialize: !! div.getElementsByTagName("link").length,
            style: /red/.test(a.getAttribute("style")),
            hrefNormalized: a.getAttribute("href") === "/a",
            opacity: /^0.55$/.test(a.style.opacity),
            cssFloat: !! a.style.cssFloat,
            checkOn: div.getElementsByTagName("input")[0].value === "on",
            optSelected: document.createElement("select").appendChild(document.createElement("option")).selected,
            parentNode: div.removeChild(div.appendChild(document.createElement("div"))).parentNode === null,
            deleteExpando: true,
            checkClone: false,
            scriptEval: false,
            noCloneEvent: true,
            boxModel: null
        };
        script.type = "text/javascript";
        try {
            script.appendChild(document.createTextNode("window." + id + "=1;"));
        } catch (e) {}
        root.insertBefore(script, root.firstChild);
        if (window[id]) {
            jQuery.support.scriptEval = true;
            delete window[id];
        }
        try {
            delete script.test;
        } catch (e) {
            jQuery.support.deleteExpando = false;
        }
        root.removeChild(script);
        if (div.attachEvent && div.fireEvent) {
            div.attachEvent("onclick", function click() {
                jQuery.support.noCloneEvent = false;
                div.detachEvent("onclick", click);
            });
            div.cloneNode(true).fireEvent("onclick");
        }
        div = document.createElement("div");
        div.innerHTML = "<input type='radio' name='radiotest' checked='checked'/>";
        var fragment = document.createDocumentFragment();
        fragment.appendChild(div.firstChild);
        jQuery.support.checkClone = fragment.cloneNode(true).cloneNode(true).lastChild.checked;
        jQuery(function () {
            var div = document.createElement("div");
            div.style.width = div.style.paddingLeft = "1px";
            document.body.appendChild(div);
            jQuery.boxModel = jQuery.support.boxModel = div.offsetWidth === 2;
            document.body.removeChild(div).style.display = 'none';
            div = null;
        });
        var eventSupported = function (eventName) {
            var el = document.createElement("div");
            eventName = "on" + eventName;
            var isSupported = (eventName in el);
            if (!isSupported) {
                el.setAttribute(eventName, "return;");
                isSupported = typeof el[eventName] === "function";
            }
            el = null;
            return isSupported;
        };
        jQuery.support.submitBubbles = eventSupported("submit");
        jQuery.support.changeBubbles = eventSupported("change");
        root = script = div = all = a = null;
    })();
    jQuery.props = {
        "for": "htmlFor",
        "class": "className",
        readonly: "readOnly",
        maxlength: "maxLength",
        cellspacing: "cellSpacing",
        rowspan: "rowSpan",
        colspan: "colSpan",
        tabindex: "tabIndex",
        usemap: "useMap",
        frameborder: "frameBorder"
    };
    var expando = "jQuery" + now(),
        uuid = 0,
        windowData = {};
    jQuery.extend({
        cache: {},
        expando: expando,
        noData: {
            "embed": true,
            "object": true,
            "applet": true
        },
        data: function (elem, name, data) {
            if (elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()]) {
                return;
            }
            elem = elem == window ? windowData : elem;
            var id = elem[expando],
                cache = jQuery.cache,
                thisCache;
            if (!id && typeof name === "string" && data === undefined) {
                return null;
            }
            if (!id) {
                id = ++uuid;
            }
            if (typeof name === "object") {
                elem[expando] = id;
                thisCache = cache[id] = jQuery.extend(true, {}, name);
            } else if (!cache[id]) {
                elem[expando] = id;
                cache[id] = {};
            }
            thisCache = cache[id];
            if (data !== undefined) {
                thisCache[name] = data;
            }
            return typeof name === "string" ? thisCache[name] : thisCache;
        },
        removeData: function (elem, name) {
            if (elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()]) {
                return;
            }
            elem = elem == window ? windowData : elem;
            var id = elem[expando],
                cache = jQuery.cache,
                thisCache = cache[id];
            if (name) {
                if (thisCache) {
                    delete thisCache[name];
                    if (jQuery.isEmptyObject(thisCache)) {
                        jQuery.removeData(elem);
                    }
                }
            } else {
                if (jQuery.support.deleteExpando) {
                    delete elem[jQuery.expando];
                } else if (elem.removeAttribute) {
                    elem.removeAttribute(jQuery.expando);
                }
                delete cache[id];
            }
        }
    });
    jQuery.fn.extend({
        data: function (key, value) {
            if (typeof key === "undefined" && this.length) {
                return jQuery.data(this[0]);
            } else if (typeof key === "object") {
                return this.each(function () {
                    jQuery.data(this, key);
                });
            }
            var parts = key.split(".");
            parts[1] = parts[1] ? "." + parts[1] : "";
            if (value === undefined) {
                var data = this.triggerHandler("getData" + parts[1] + "!", [parts[0]]);
                if (data === undefined && this.length) {
                    data = jQuery.data(this[0], key);
                }
                return data === undefined && parts[1] ? this.data(parts[0]) : data;
            } else {
                return this.trigger("setData" + parts[1] + "!", [parts[0], value]).each(function () {
                    jQuery.data(this, key, value);
                });
            }
        },
        removeData: function (key) {
            return this.each(function () {
                jQuery.removeData(this, key);
            });
        }
    });
    jQuery.extend({
        queue: function (elem, type, data) {
            if (!elem) {
                return;
            }
            type = (type || "fx") + "queue";
            var q = jQuery.data(elem, type);
            if (!data) {
                return q || [];
            }
            if (!q || jQuery.isArray(data)) {
                q = jQuery.data(elem, type, jQuery.makeArray(data));
            } else {
                q.push(data);
            }
            return q;
        },
        dequeue: function (elem, type) {
            type = type || "fx";
            var queue = jQuery.queue(elem, type),
                fn = queue.shift();
            if (fn === "inprogress") {
                fn = queue.shift();
            }
            if (fn) {
                if (type === "fx") {
                    queue.unshift("inprogress");
                }
                fn.call(elem, function () {
                    jQuery.dequeue(elem, type);
                });
            }
        }
    });
    jQuery.fn.extend({
        queue: function (type, data) {
            if (typeof type !== "string") {
                data = type;
                type = "fx";
            }
            if (data === undefined) {
                return jQuery.queue(this[0], type);
            }
            return this.each(function (i, elem) {
                var queue = jQuery.queue(this, type, data);
                if (type === "fx" && queue[0] !== "inprogress") {
                    jQuery.dequeue(this, type);
                }
            });
        },
        dequeue: function (type) {
            return this.each(function () {
                jQuery.dequeue(this, type);
            });
        },
        delay: function (time, type) {
            time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
            type = type || "fx";
            return this.queue(type, function () {
                var elem = this;
                setTimeout(function () {
                    jQuery.dequeue(elem, type);
                }, time);
            });
        },
        clearQueue: function (type) {
            return this.queue(type || "fx", []);
        }
    });
    var rclass = /[\n\t]/g,
        rspace = /\s+/,
        rreturn = /\r/g,
        rspecialurl = /href|src|style/,
        rtype = /(button|input)/i,
        rfocusable = /(button|input|object|select|textarea)/i,
        rclickable = /^(a|area)$/i,
        rradiocheck = /radio|checkbox/;
    jQuery.fn.extend({
        attr: function (name, value) {
            return access(this, name, value, true, jQuery.attr);
        },
        removeAttr: function (name, fn) {
            return this.each(function () {
                jQuery.attr(this, name, "");
                if (this.nodeType === 1) {
                    this.removeAttribute(name);
                }
            });
        },
        addClass: function (value) {
            if (jQuery.isFunction(value)) {
                return this.each(function (i) {
                    var self = jQuery(this);
                    self.addClass(value.call(this, i, self.attr("class")));
                });
            }
            if (value && typeof value === "string") {
                var classNames = (value || "").split(rspace);
                for (var i = 0, l = this.length; i < l; i++) {
                    var elem = this[i];
                    if (elem.nodeType === 1) {
                        if (!elem.className) {
                            elem.className = value;
                        } else {
                            var className = " " + elem.className + " ",
                                setClass = elem.className;
                            for (var c = 0, cl = classNames.length; c < cl; c++) {
                                if (className.indexOf(" " + classNames[c] + " ") < 0) {
                                    setClass += " " + classNames[c];
                                }
                            }
                            elem.className = jQuery.trim(setClass);
                        }
                    }
                }
            }
            return this;
        },
        removeClass: function (value) {
            if (jQuery.isFunction(value)) {
                return this.each(function (i) {
                    var self = jQuery(this);
                    self.removeClass(value.call(this, i, self.attr("class")));
                });
            }
            if ((value && typeof value === "string") || value === undefined) {
                var classNames = (value || "").split(rspace);
                for (var i = 0, l = this.length; i < l; i++) {
                    var elem = this[i];
                    if (elem.nodeType === 1 && elem.className) {
                        if (value) {
                            var className = (" " + elem.className + " ").replace(rclass, " ");
                            for (var c = 0, cl = classNames.length; c < cl; c++) {
                                className = className.replace(" " + classNames[c] + " ", " ");
                            }
                            elem.className = jQuery.trim(className);
                        } else {
                            elem.className = "";
                        }
                    }
                }
            }
            return this;
        },
        toggleClass: function (value, stateVal) {
            var type = typeof value,
                isBool = typeof stateVal === "boolean";
            if (jQuery.isFunction(value)) {
                return this.each(function (i) {
                    var self = jQuery(this);
                    self.toggleClass(value.call(this, i, self.attr("class"), stateVal), stateVal);
                });
            }
            return this.each(function () {
                if (type === "string") {
                    var className, i = 0,
                        self = jQuery(this),
                        state = stateVal,
                        classNames = value.split(rspace);
                    while ((className = classNames[i++])) {
                        state = isBool ? state : !self.hasClass(className);
                        self[state ? "addClass" : "removeClass"](className);
                    }
                } else if (type === "undefined" || type === "boolean") {
                    if (this.className) {
                        jQuery.data(this, "__className__", this.className);
                    }
                    this.className = this.className || value === false ? "" : jQuery.data(this, "__className__") || "";
                }
            });
        },
        hasClass: function (selector) {
            var className = " " + selector + " ";
            for (var i = 0, l = this.length; i < l; i++) {
                if ((" " + this[i].className + " ").replace(rclass, " ").indexOf(className) > -1) {
                    return true;
                }
            }
            return false;
        },
        val: function (value) {
            if (value === undefined) {
                var elem = this[0];
                if (elem) {
                    if (jQuery.nodeName(elem, "option")) {
                        return (elem.attributes.value || {}).specified ? elem.value : elem.text;
                    }
                    if (jQuery.nodeName(elem, "select")) {
                        var index = elem.selectedIndex,
                            values = [],
                            options = elem.options,
                            one = elem.type === "select-one";
                        if (index < 0) {
                            return null;
                        }
                        for (var i = one ? index : 0, max = one ? index + 1 : options.length; i < max; i++) {
                            var option = options[i];
                            if (option.selected) {
                                value = jQuery(option).val();
                                if (one) {
                                    return value;
                                }
                                values.push(value);
                            }
                        }
                        return values;
                    }
                    if (rradiocheck.test(elem.type) && !jQuery.support.checkOn) {
                        return elem.getAttribute("value") === null ? "on" : elem.value;
                    }
                    return (elem.value || "").replace(rreturn, "");
                }
                return undefined;
            }
            var isFunction = jQuery.isFunction(value);
            return this.each(function (i) {
                var self = jQuery(this),
                    val = value;
                if (this.nodeType !== 1) {
                    return;
                }
                if (isFunction) {
                    val = value.call(this, i, self.val());
                }
                if (typeof val === "number") {
                    val += "";
                }
                if (jQuery.isArray(val) && rradiocheck.test(this.type)) {
                    this.checked = jQuery.inArray(self.val(), val) >= 0;
                } else if (jQuery.nodeName(this, "select")) {
                    var values = jQuery.makeArray(val);
                    jQuery("option", this).each(function () {
                        this.selected = jQuery.inArray(jQuery(this).val(), values) >= 0;
                    });
                    if (!values.length) {
                        this.selectedIndex = -1;
                    }
                } else {
                    this.value = val;
                }
            });
        }
    });
    jQuery.extend({
        attrFn: {
            val: true,
            css: true,
            html: true,
            text: true,
            data: true,
            width: true,
            height: true,
            offset: true
        },
        attr: function (elem, name, value, pass) {
            if (!elem || elem.nodeType === 3 || elem.nodeType === 8) {
                return undefined;
            }
            if (pass && name in jQuery.attrFn) {
                return jQuery(elem)[name](value);
            }
            var notxml = elem.nodeType !== 1 || !jQuery.isXMLDoc(elem),
                set = value !== undefined;
            name = notxml && jQuery.props[name] || name;
            if (elem.nodeType === 1) {
                var special = rspecialurl.test(name);
                if (name === "selected" && !jQuery.support.optSelected) {
                    var parent = elem.parentNode;
                    if (parent) {
                        parent.selectedIndex;
                        if (parent.parentNode) {
                            parent.parentNode.selectedIndex;
                        }
                    }
                }
                if (name in elem && notxml && !special) {
                    if (set) {
                        if (name === "type" && rtype.test(elem.nodeName) && elem.parentNode) {
                            jQuery.error("type property can't be changed");
                        }
                        elem[name] = value;
                    }
                    if (jQuery.nodeName(elem, "form") && elem.getAttributeNode(name)) {
                        return elem.getAttributeNode(name).nodeValue;
                    }
                    if (name === "tabIndex") {
                        var attributeNode = elem.getAttributeNode("tabIndex");
                        return attributeNode && attributeNode.specified ? attributeNode.value : rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href ? 0 : undefined;
                    }
                    return elem[name];
                }
                if (!jQuery.support.style && notxml && name === "style") {
                    if (set) {
                        elem.style.cssText = "" + value;
                    }
                    return elem.style.cssText;
                }
                if (set) {
                    elem.setAttribute(name, "" + value);
                }
                var attr = !jQuery.support.hrefNormalized && notxml && special ? elem.getAttribute(name, 2) : elem.getAttribute(name);
                return attr === null ? undefined : attr;
            }
            return jQuery.style(elem, name, value);
        }
    });
    var rnamespaces = /\.(.*)$/,
        fcleanup = function (nm) {
            return nm.replace(/[^\w\s\.\|`]/g, function (ch) {
                return "\\" + ch;
            });
        };
    jQuery.event = {
        add: function (elem, types, handler, data) {
            if (elem.nodeType === 3 || elem.nodeType === 8) {
                return;
            }
            if (elem.setInterval && (elem !== window && !elem.frameElement)) {
                elem = window;
            }
            var handleObjIn, handleObj;
            if (handler.handler) {
                handleObjIn = handler;
                handler = handleObjIn.handler;
            }
            if (!handler.guid) {
                handler.guid = jQuery.guid++;
            }
            var elemData = jQuery.data(elem);
            if (!elemData) {
                return;
            }
            var events = elemData.events = elemData.events || {},
                eventHandle = elemData.handle,
                eventHandle;
            if (!eventHandle) {
                elemData.handle = eventHandle = function () {
                    return typeof jQuery !== "undefined" && !jQuery.event.triggered ? jQuery.event.handle.apply(eventHandle.elem, arguments) : undefined;
                };
            }
            eventHandle.elem = elem;
            types = types.split(" ");
            var type, i = 0,
                namespaces;
            while ((type = types[i++])) {
                handleObj = handleObjIn ? jQuery.extend({}, handleObjIn) : {
                    handler: handler,
                    data: data
                };
                if (type.indexOf(".") > -1) {
                    namespaces = type.split(".");
                    type = namespaces.shift();
                    handleObj.namespace = namespaces.slice(0).sort().join(".");
                } else {
                    namespaces = [];
                    handleObj.namespace = "";
                }
                handleObj.type = type;
                handleObj.guid = handler.guid;
                var handlers = events[type],
                    special = jQuery.event.special[type] || {};
                if (!handlers) {
                    handlers = events[type] = [];
                    if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
                        if (elem.addEventListener) {
                            elem.addEventListener(type, eventHandle, false);
                        } else if (elem.attachEvent) {
                            elem.attachEvent("on" + type, eventHandle);
                        }
                    }
                }
                if (special.add) {
                    special.add.call(elem, handleObj);
                    if (!handleObj.handler.guid) {
                        handleObj.handler.guid = handler.guid;
                    }
                }
                handlers.push(handleObj);
                jQuery.event.global[type] = true;
            }
            elem = null;
        },
        global: {},
        remove: function (elem, types, handler, pos) {
            if (elem.nodeType === 3 || elem.nodeType === 8) {
                return;
            }
            var ret, type, fn, i = 0,
                all, namespaces, namespace, special, eventType, handleObj, origType, elemData = jQuery.data(elem),
                events = elemData && elemData.events;
            if (!elemData || !events) {
                return;
            }
            if (types && types.type) {
                handler = types.handler;
                types = types.type;
            }
            if (!types || typeof types === "string" && types.charAt(0) === ".") {
                types = types || "";
                for (type in events) {
                    jQuery.event.remove(elem, type + types);
                }
                return;
            }
            types = types.split(" ");
            while ((type = types[i++])) {
                origType = type;
                handleObj = null;
                all = type.indexOf(".") < 0;
                namespaces = [];
                if (!all) {
                    namespaces = type.split(".");
                    type = namespaces.shift();
                    namespace = new RegExp("(^|\\.)" + jQuery.map(namespaces.slice(0).sort(), fcleanup).join("\\.(?:.*\\.)?") + "(\\.|$)")
                }
                eventType = events[type];
                if (!eventType) {
                    continue;
                }
                if (!handler) {
                    for (var j = 0; j < eventType.length; j++) {
                        handleObj = eventType[j];
                        if (all || namespace.test(handleObj.namespace)) {
                            jQuery.event.remove(elem, origType, handleObj.handler, j);
                            eventType.splice(j--, 1);
                        }
                    }
                    continue;
                }
                special = jQuery.event.special[type] || {};
                for (var j = pos || 0; j < eventType.length; j++) {
                    handleObj = eventType[j];
                    if (handler.guid === handleObj.guid) {
                        if (all || namespace.test(handleObj.namespace)) {
                            if (pos == null) {
                                eventType.splice(j--, 1);
                            }
                            if (special.remove) {
                                special.remove.call(elem, handleObj);
                            }
                        }
                        if (pos != null) {
                            break;
                        }
                    }
                }
                if (eventType.length === 0 || pos != null && eventType.length === 1) {
                    if (!special.teardown || special.teardown.call(elem, namespaces) === false) {
                        removeEvent(elem, type, elemData.handle);
                    }
                    ret = null;
                    delete events[type];
                }
            }
            if (jQuery.isEmptyObject(events)) {
                var handle = elemData.handle;
                if (handle) {
                    handle.elem = null;
                }
                delete elemData.events;
                delete elemData.handle;
                if (jQuery.isEmptyObject(elemData)) {
                    jQuery.removeData(elem);
                }
            }
        },
        trigger: function (event, data, elem) {
            var type = event.type || event,
                bubbling = arguments[3];
            if (!bubbling) {
                event = typeof event === "object" ? event[expando] ? event : jQuery.extend(jQuery.Event(type), event) : jQuery.Event(type);
                if (type.indexOf("!") >= 0) {
                    event.type = type = type.slice(0, -1);
                    event.exclusive = true;
                }
                if (!elem) {
                    event.stopPropagation();
                    if (jQuery.event.global[type]) {
                        jQuery.each(jQuery.cache, function () {
                            if (this.events && this.events[type]) {
                                jQuery.event.trigger(event, data, this.handle.elem);
                            }
                        });
                    }
                }
                if (!elem || elem.nodeType === 3 || elem.nodeType === 8) {
                    return undefined;
                }
                event.result = undefined;
                event.target = elem;
                data = jQuery.makeArray(data);
                data.unshift(event);
            }
            event.currentTarget = elem;
            var handle = jQuery.data(elem, "handle");
            if (handle) {
                handle.apply(elem, data);
            }
            var parent = elem.parentNode || elem.ownerDocument;
            try {
                if (!(elem && elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()])) {
                    if (elem["on" + type] && elem["on" + type].apply(elem, data) === false) {
                        event.result = false;
                    }
                }
            } catch (e) {}
            if (!event.isPropagationStopped() && parent) {
                jQuery.event.trigger(event, data, parent, true);
            } else if (!event.isDefaultPrevented()) {
                var target = event.target,
                    old, isClick = jQuery.nodeName(target, "a") && type === "click",
                    special = jQuery.event.special[type] || {};
                if ((!special._default || special._default.call(elem, event) === false) && !isClick && !(target && target.nodeName && jQuery.noData[target.nodeName.toLowerCase()])) {
                    try {
                        if (target[type]) {
                            old = target["on" + type];
                            if (old) {
                                target["on" + type] = null;
                            }
                            jQuery.event.triggered = true;
                            target[type]();
                        }
                    } catch (e) {}
                    if (old) {
                        target["on" + type] = old;
                    }
                    jQuery.event.triggered = false;
                }
            }
        },
        handle: function (event) {
            var all, handlers, namespaces, namespace, events;
            event = arguments[0] = jQuery.event.fix(event || window.event);
            event.currentTarget = this;
            all = event.type.indexOf(".") < 0 && !event.exclusive;
            if (!all) {
                namespaces = event.type.split(".");
                event.type = namespaces.shift();
                namespace = new RegExp("(^|\\.)" + namespaces.slice(0).sort().join("\\.(?:.*\\.)?") + "(\\.|$)");
            }
            var events = jQuery.data(this, "events"),
                handlers = events[event.type];
            if (events && handlers) {
                handlers = handlers.slice(0);
                for (var j = 0, l = handlers.length; j < l; j++) {
                    var handleObj = handlers[j];
                    if (all || namespace.test(handleObj.namespace)) {
                        event.handler = handleObj.handler;
                        event.data = handleObj.data;
                        event.handleObj = handleObj;
                        var ret = handleObj.handler.apply(this, arguments);
                        if (ret !== undefined) {
                            event.result = ret;
                            if (ret === false) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }
                        if (event.isImmediatePropagationStopped()) {
                            break;
                        }
                    }
                }
            }
            return event.result;
        },
        props: "altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY originalTarget pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which".split(" "),
        fix: function (event) {
            if (event[expando]) {
                return event;
            }
            var originalEvent = event;
            event = jQuery.Event(originalEvent);
            for (var i = this.props.length, prop; i;) {
                prop = this.props[--i];
                event[prop] = originalEvent[prop];
            }
            if (!event.target) {
                event.target = event.srcElement || document;
            }
            if (event.target.nodeType === 3) {
                event.target = event.target.parentNode;
            }
            if (!event.relatedTarget && event.fromElement) {
                event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement;
            }
            if (event.pageX == null && event.clientX != null) {
                var doc = document.documentElement,
                    body = document.body;
                event.pageX = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
                event.pageY = event.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
            }
            if (!event.which && ((event.charCode || event.charCode === 0) ? event.charCode : event.keyCode)) {
                event.which = event.charCode || event.keyCode;
            }
            if (!event.metaKey && event.ctrlKey) {
                event.metaKey = event.ctrlKey;
            }
            if (!event.which && event.button !== undefined) {
                event.which = (event.button & 1 ? 1 : (event.button & 2 ? 3 : (event.button & 4 ? 2 : 0)));
            }
            return event;
        },
        guid: 1E8,
        proxy: jQuery.proxy,
        special: {
            ready: {
                setup: jQuery.bindReady,
                teardown: jQuery.noop
            },
            live: {
                add: function (handleObj) {
                    jQuery.event.add(this, handleObj.origType, jQuery.extend({}, handleObj, {
                        handler: liveHandler
                    }));
                },
                remove: function (handleObj) {
                    var remove = true,
                        type = handleObj.origType.replace(rnamespaces, "");
                    jQuery.each(jQuery.data(this, "events").live || [], function () {
                        if (type === this.origType.replace(rnamespaces, "")) {
                            remove = false;
                            return false;
                        }
                    });
                    if (remove) {
                        jQuery.event.remove(this, handleObj.origType, liveHandler);
                    }
                }
            },
            beforeunload: {
                setup: function (data, namespaces, eventHandle) {
                    if (this.setInterval) {
                        this.onbeforeunload = eventHandle;
                    }
                    return false;
                },
                teardown: function (namespaces, eventHandle) {
                    if (this.onbeforeunload === eventHandle) {
                        this.onbeforeunload = null;
                    }
                }
            }
        }
    };
    var removeEvent = document.removeEventListener ?
    function (elem, type, handle) {
        elem.removeEventListener(type, handle, false);
    } : function (elem, type, handle) {
        elem.detachEvent("on" + type, handle);
    };
    jQuery.Event = function (src) {
        if (!this.preventDefault) {
            return new jQuery.Event(src);
        }
        if (src && src.type) {
            this.originalEvent = src;
            this.type = src.type;
        } else {
            this.type = src;
        }
        this.timeStamp = now();
        this[expando] = true;
    };

    function returnFalse() {
        return false;
    }

    function returnTrue() {
        return true;
    }
    jQuery.Event.prototype = {
        preventDefault: function () {
            this.isDefaultPrevented = returnTrue;
            var e = this.originalEvent;
            if (!e) {
                return;
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.returnValue = false;
        },
        stopPropagation: function () {
            this.isPropagationStopped = returnTrue;
            var e = this.originalEvent;
            if (!e) {
                return;
            }
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            e.cancelBubble = true;
        },
        stopImmediatePropagation: function () {
            this.isImmediatePropagationStopped = returnTrue;
            this.stopPropagation();
        },
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse
    };
    var withinElement = function (event) {
        var parent = event.relatedTarget;
        try {
            while (parent && parent !== this) {
                parent = parent.parentNode;
            }
            if (parent !== this) {
                event.type = event.data;
                jQuery.event.handle.apply(this, arguments);
            }
        } catch (e) {}
    },
        delegate = function (event) {
            event.type = event.data;
            jQuery.event.handle.apply(this, arguments);
        };
    jQuery.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout"
    }, function (orig, fix) {
        jQuery.event.special[orig] = {
            setup: function (data) {
                jQuery.event.add(this, fix, data && data.selector ? delegate : withinElement, orig);
            },
            teardown: function (data) {
                jQuery.event.remove(this, fix, data && data.selector ? delegate : withinElement);
            }
        };
    });
    if (!jQuery.support.submitBubbles) {
        jQuery.event.special.submit = {
            setup: function (data, namespaces) {
                if (this.nodeName.toLowerCase() !== "form") {
                    jQuery.event.add(this, "click.specialSubmit", function (e) {
                        var elem = e.target,
                            type = elem.type;
                        if ((type === "submit" || type === "image") && jQuery(elem).closest("form").length) {
                            return trigger("submit", this, arguments);
                        }
                    });
                    jQuery.event.add(this, "keypress.specialSubmit", function (e) {
                        var elem = e.target,
                            type = elem.type;
                        if ((type === "text" || type === "password") && jQuery(elem).closest("form").length && e.keyCode === 13) {
                            return trigger("submit", this, arguments);
                        }
                    });
                } else {
                    return false;
                }
            },
            teardown: function (namespaces) {
                jQuery.event.remove(this, ".specialSubmit");
            }
        };
    }
    if (!jQuery.support.changeBubbles) {
        var formElems = /textarea|input|select/i,
            changeFilters, getVal = function (elem) {
                var type = elem.type,
                    val = elem.value;
                if (type === "radio" || type === "checkbox") {
                    val = elem.checked;
                } else if (type === "select-multiple") {
                    val = elem.selectedIndex > -1 ? jQuery.map(elem.options, function (elem) {
                        return elem.selected;
                    }).join("-") : "";
                } else if (elem.nodeName.toLowerCase() === "select") {
                    val = elem.selectedIndex;
                }
                return val;
            },
            testChange = function testChange(e) {
                var elem = e.target,
                    data, val;
                if (!formElems.test(elem.nodeName) || elem.readOnly) {
                    return;
                }
                data = jQuery.data(elem, "_change_data");
                val = getVal(elem);
                if (e.type !== "focusout" || elem.type !== "radio") {
                    jQuery.data(elem, "_change_data", val);
                }
                if (data === undefined || val === data) {
                    return;
                }
                if (data != null || val) {
                    e.type = "change";
                    return jQuery.event.trigger(e, arguments[1], elem);
                }
            };
        jQuery.event.special.change = {
            filters: {
                focusout: testChange,
                click: function (e) {
                    var elem = e.target,
                        type = elem.type;
                    if (type === "radio" || type === "checkbox" || elem.nodeName.toLowerCase() === "select") {
                        return testChange.call(this, e);
                    }
                },
                keydown: function (e) {
                    var elem = e.target,
                        type = elem.type;
                    if ((e.keyCode === 13 && elem.nodeName.toLowerCase() !== "textarea") || (e.keyCode === 32 && (type === "checkbox" || type === "radio")) || type === "select-multiple") {
                        return testChange.call(this, e);
                    }
                },
                beforeactivate: function (e) {
                    var elem = e.target;
                    jQuery.data(elem, "_change_data", getVal(elem));
                }
            },
            setup: function (data, namespaces) {
                if (this.type === "file") {
                    return false;
                }
                for (var type in changeFilters) {
                    jQuery.event.add(this, type + ".specialChange", changeFilters[type]);
                }
                return formElems.test(this.nodeName);
            },
            teardown: function (namespaces) {
                jQuery.event.remove(this, ".specialChange");
                return formElems.test(this.nodeName);
            }
        };
        changeFilters = jQuery.event.special.change.filters;
    }

    function trigger(type, elem, args) {
        args[0].type = type;
        return jQuery.event.handle.apply(elem, args);
    }
    if (document.addEventListener) {
        jQuery.each({
            focus: "focusin",
            blur: "focusout"
        }, function (orig, fix) {
            jQuery.event.special[fix] = {
                setup: function () {
                    this.addEventListener(orig, handler, true);
                },
                teardown: function () {
                    this.removeEventListener(orig, handler, true);
                }
            };

            function handler(e) {
                e = jQuery.event.fix(e);
                e.type = fix;
                return jQuery.event.handle.call(this, e);
            }
        });
    }
    jQuery.each(["bind", "one"], function (i, name) {
        jQuery.fn[name] = function (type, data, fn) {
            if (typeof type === "object") {
                for (var key in type) {
                    this[name](key, data, type[key], fn);
                }
                return this;
            }
            if (jQuery.isFunction(data)) {
                fn = data;
                data = undefined;
            }
            var handler = name === "one" ? jQuery.proxy(fn, function (event) {
                jQuery(this).unbind(event, handler);
                return fn.apply(this, arguments);
            }) : fn;
            if (type === "unload" && name !== "one") {
                this.one(type, data, fn);
            } else {
                for (var i = 0, l = this.length; i < l; i++) {
                    jQuery.event.add(this[i], type, handler, data);
                }
            }
            return this;
        };
    });
    jQuery.fn.extend({
        unbind: function (type, fn) {
            if (typeof type === "object" && !type.preventDefault) {
                for (var key in type) {
                    this.unbind(key, type[key]);
                }
            } else {
                for (var i = 0, l = this.length; i < l; i++) {
                    jQuery.event.remove(this[i], type, fn);
                }
            }
            return this;
        },
        delegate: function (selector, types, data, fn) {
            return this.live(types, data, fn, selector);
        },
        undelegate: function (selector, types, fn) {
            if (arguments.length === 0) {
                return this.unbind("live");
            } else {
                return this.die(types, null, fn, selector);
            }
        },
        trigger: function (type, data) {
            return this.each(function () {
                jQuery.event.trigger(type, data, this);
            });
        },
        triggerHandler: function (type, data) {
            if (this[0]) {
                var event = jQuery.Event(type);
                event.preventDefault();
                event.stopPropagation();
                jQuery.event.trigger(event, data, this[0]);
                return event.result;
            }
        },
        toggle: function (fn) {
            var args = arguments,
                i = 1;
            while (i < args.length) {
                jQuery.proxy(fn, args[i++]);
            }
            return this.click(jQuery.proxy(fn, function (event) {
                var lastToggle = (jQuery.data(this, "lastToggle" + fn.guid) || 0) % i;
                jQuery.data(this, "lastToggle" + fn.guid, lastToggle + 1);
                event.preventDefault();
                return args[lastToggle].apply(this, arguments) || false;
            }));
        },
        hover: function (fnOver, fnOut) {
            return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
        }
    });
    var liveMap = {
        focus: "focusin",
        blur: "focusout",
        mouseenter: "mouseover",
        mouseleave: "mouseout"
    };
    jQuery.each(["live", "die"], function (i, name) {
        jQuery.fn[name] = function (types, data, fn, origSelector) {
            var type, i = 0,
                match, namespaces, preType, selector = origSelector || this.selector,
                context = origSelector ? this : jQuery(this.context);
            if (jQuery.isFunction(data)) {
                fn = data;
                data = undefined;
            }
            types = (types || "").split(" ");
            while ((type = types[i++]) != null) {
                match = rnamespaces.exec(type);
                namespaces = "";
                if (match) {
                    namespaces = match[0];
                    type = type.replace(rnamespaces, "");
                }
                if (type === "hover") {
                    types.push("mouseenter" + namespaces, "mouseleave" + namespaces);
                    continue;
                }
                preType = type;
                if (type === "focus" || type === "blur") {
                    types.push(liveMap[type] + namespaces);
                    type = type + namespaces;
                } else {
                    type = (liveMap[type] || type) + namespaces;
                }
                if (name === "live") {
                    context.each(function () {
                        jQuery.event.add(this, liveConvert(type, selector), {
                            data: data,
                            selector: selector,
                            handler: fn,
                            origType: type,
                            origHandler: fn,
                            preType: preType
                        });
                    });
                } else {
                    context.unbind(liveConvert(type, selector), fn);
                }
            }
            return this;
        }
    });

    function liveHandler(event) {
        var stop, elems = [],
            selectors = [],
            args = arguments,
            related, match, handleObj, elem, j, i, l, data, events = jQuery.data(this, "events");
        if (event.liveFired === this || !events || !events.live || event.button && event.type === "click") {
            return;
        }
        event.liveFired = this;
        var live = events.live.slice(0);
        for (j = 0; j < live.length; j++) {
            handleObj = live[j];
            if (handleObj.origType.replace(rnamespaces, "") === event.type) {
                selectors.push(handleObj.selector);
            } else {
                live.splice(j--, 1);
            }
        }
        match = jQuery(event.target).closest(selectors, event.currentTarget);
        for (i = 0, l = match.length; i < l; i++) {
            for (j = 0; j < live.length; j++) {
                handleObj = live[j];
                if (match[i].selector === handleObj.selector) {
                    elem = match[i].elem;
                    related = null;
                    if (handleObj.preType === "mouseenter" || handleObj.preType === "mouseleave") {
                        related = jQuery(event.relatedTarget).closest(handleObj.selector)[0];
                    }
                    if (!related || related !== elem) {
                        elems.push({
                            elem: elem,
                            handleObj: handleObj
                        });
                    }
                }
            }
        }
        for (i = 0, l = elems.length; i < l; i++) {
            match = elems[i];
            event.currentTarget = match.elem;
            event.data = match.handleObj.data;
            event.handleObj = match.handleObj;
            if (match.handleObj.origHandler.apply(match.elem, args) === false) {
                stop = false;
                break;
            }
        }
        return stop;
    }

    function liveConvert(type, selector) {
        return "live." + (type && type !== "*" ? type + "." : "") + selector.replace(/\./g, "`").replace(/ /g, "&");
    }
    jQuery.each(("blur focus focusin focusout load resize scroll unload click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup error").split(" "), function (i, name) {
        jQuery.fn[name] = function (fn) {
            return fn ? this.bind(name, fn) : this.trigger(name);
        };
        if (jQuery.attrFn) {
            jQuery.attrFn[name] = true;
        }
    });
    if (window.attachEvent && !window.addEventListener) {
        window.attachEvent("onunload", function () {
            for (var id in jQuery.cache) {
                if (jQuery.cache[id].handle) {
                    try {
                        jQuery.event.remove(jQuery.cache[id].handle.elem);
                    } catch (e) {}
                }
            }
        });
    }(function () {
        var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
            done = 0,
            toString = Object.prototype.toString,
            hasDuplicate = false,
            baseHasDuplicate = true;
        [0, 0].sort(function () {
            baseHasDuplicate = false;
            return 0;
        });
        var Sizzle = function (selector, context, results, seed) {
            results = results || [];
            var origContext = context = context || document;
            if (context.nodeType !== 1 && context.nodeType !== 9) {
                return [];
            }
            if (!selector || typeof selector !== "string") {
                return results;
            }
            var parts = [],
                m, set, checkSet, extra, prune = true,
                contextXML = isXML(context),
                soFar = selector;
            while ((chunker.exec(""), m = chunker.exec(soFar)) !== null) {
                soFar = m[3];
                parts.push(m[1]);
                if (m[2]) {
                    extra = m[3];
                    break;
                }
            }
            if (parts.length > 1 && origPOS.exec(selector)) {
                if (parts.length === 2 && Expr.relative[parts[0]]) {
                    set = posProcess(parts[0] + parts[1], context);
                } else {
                    set = Expr.relative[parts[0]] ? [context] : Sizzle(parts.shift(), context);
                    while (parts.length) {
                        selector = parts.shift();
                        if (Expr.relative[selector]) {
                            selector += parts.shift();
                        }
                        set = posProcess(selector, set);
                    }
                }
            } else {
                if (!seed && parts.length > 1 && context.nodeType === 9 && !contextXML && Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1])) {
                    var ret = Sizzle.find(parts.shift(), context, contextXML);
                    context = ret.expr ? Sizzle.filter(ret.expr, ret.set)[0] : ret.set[0];
                }
                if (context) {
                    var ret = seed ? {
                        expr: parts.pop(),
                        set: makeArray(seed)
                    } : Sizzle.find(parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML);
                    set = ret.expr ? Sizzle.filter(ret.expr, ret.set) : ret.set;
                    if (parts.length > 0) {
                        checkSet = makeArray(set);
                    } else {
                        prune = false;
                    }
                    while (parts.length) {
                        var cur = parts.pop(),
                            pop = cur;
                        if (!Expr.relative[cur]) {
                            cur = "";
                        } else {
                            pop = parts.pop();
                        }
                        if (pop == null) {
                            pop = context;
                        }
                        Expr.relative[cur](checkSet, pop, contextXML);
                    }
                } else {
                    checkSet = parts = [];
                }
            }
            if (!checkSet) {
                checkSet = set;
            }
            if (!checkSet) {
                Sizzle.error(cur || selector);
            }
            if (toString.call(checkSet) === "[object Array]") {
                if (!prune) {
                    results.push.apply(results, checkSet);
                } else if (context && context.nodeType === 1) {
                    for (var i = 0; checkSet[i] != null; i++) {
                        if (checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i]))) {
                            results.push(set[i]);
                        }
                    }
                } else {
                    for (var i = 0; checkSet[i] != null; i++) {
                        if (checkSet[i] && checkSet[i].nodeType === 1) {
                            results.push(set[i]);
                        }
                    }
                }
            } else {
                makeArray(checkSet, results);
            }
            if (extra) {
                Sizzle(extra, origContext, results, seed);
                Sizzle.uniqueSort(results);
            }
            return results;
        };
        Sizzle.uniqueSort = function (results) {
            if (sortOrder) {
                hasDuplicate = baseHasDuplicate;
                results.sort(sortOrder);
                if (hasDuplicate) {
                    for (var i = 1; i < results.length; i++) {
                        if (results[i] === results[i - 1]) {
                            results.splice(i--, 1);
                        }
                    }
                }
            }
            return results;
        };
        Sizzle.matches = function (expr, set) {
            return Sizzle(expr, null, null, set);
        };
        Sizzle.find = function (expr, context, isXML) {
            var set, match;
            if (!expr) {
                return [];
            }
            for (var i = 0, l = Expr.order.length; i < l; i++) {
                var type = Expr.order[i],
                    match;
                if ((match = Expr.leftMatch[type].exec(expr))) {
                    var left = match[1];
                    match.splice(1, 1);
                    if (left.substr(left.length - 1) !== "\\") {
                        match[1] = (match[1] || "").replace(/\\/g, "");
                        set = Expr.find[type](match, context, isXML);
                        if (set != null) {
                            expr = expr.replace(Expr.match[type], "");
                            break;
                        }
                    }
                }
            }
            if (!set) {
                set = context.getElementsByTagName("*");
            }
            return {
                set: set,
                expr: expr
            };
        };
        Sizzle.filter = function (expr, set, inplace, not) {
            var old = expr,
                result = [],
                curLoop = set,
                match, anyFound, isXMLFilter = set && set[0] && isXML(set[0]);
            while (expr && set.length) {
                for (var type in Expr.filter) {
                    if ((match = Expr.leftMatch[type].exec(expr)) != null && match[2]) {
                        var filter = Expr.filter[type],
                            found, item, left = match[1];
                        anyFound = false;
                        match.splice(1, 1);
                        if (left.substr(left.length - 1) === "\\") {
                            continue;
                        }
                        if (curLoop === result) {
                            result = [];
                        }
                        if (Expr.preFilter[type]) {
                            match = Expr.preFilter[type](match, curLoop, inplace, result, not, isXMLFilter);
                            if (!match) {
                                anyFound = found = true;
                            } else if (match === true) {
                                continue;
                            }
                        }
                        if (match) {
                            for (var i = 0;
                            (item = curLoop[i]) != null; i++) {
                                if (item) {
                                    found = filter(item, match, i, curLoop);
                                    var pass = not ^ !! found;
                                    if (inplace && found != null) {
                                        if (pass) {
                                            anyFound = true;
                                        } else {
                                            curLoop[i] = false;
                                        }
                                    } else if (pass) {
                                        result.push(item);
                                        anyFound = true;
                                    }
                                }
                            }
                        }
                        if (found !== undefined) {
                            if (!inplace) {
                                curLoop = result;
                            }
                            expr = expr.replace(Expr.match[type], "");
                            if (!anyFound) {
                                return [];
                            }
                            break;
                        }
                    }
                }
                if (expr === old) {
                    if (anyFound == null) {
                        Sizzle.error(expr);
                    } else {
                        break;
                    }
                }
                old = expr;
            }
            return curLoop;
        };
        Sizzle.error = function (msg) {
            throw "Syntax error, unrecognized expression: " + msg;
        };
        var Expr = Sizzle.selectors = {
            order: ["ID", "NAME", "TAG"],
            match: {
                ID: /#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
                CLASS: /\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
                NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,
                ATTR: /\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,
                TAG: /^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,
                CHILD: /:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,
                POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,
                PSEUDO: /:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
            },
            leftMatch: {},
            attrMap: {
                "class": "className",
                "for": "htmlFor"
            },
            attrHandle: {
                href: function (elem) {
                    return elem.getAttribute("href");
                }
            },
            relative: {
                "+": function (checkSet, part) {
                    var isPartStr = typeof part === "string",
                        isTag = isPartStr && !/\W/.test(part),
                        isPartStrNotTag = isPartStr && !isTag;
                    if (isTag) {
                        part = part.toLowerCase();
                    }
                    for (var i = 0, l = checkSet.length, elem; i < l; i++) {
                        if ((elem = checkSet[i])) {
                            while ((elem = elem.previousSibling) && elem.nodeType !== 1) {}
                            checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ? elem || false : elem === part;
                        }
                    }
                    if (isPartStrNotTag) {
                        Sizzle.filter(part, checkSet, true);
                    }
                },
                ">": function (checkSet, part) {
                    var isPartStr = typeof part === "string";
                    if (isPartStr && !/\W/.test(part)) {
                        part = part.toLowerCase();
                        for (var i = 0, l = checkSet.length; i < l; i++) {
                            var elem = checkSet[i];
                            if (elem) {
                                var parent = elem.parentNode;
                                checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
                            }
                        }
                    } else {
                        for (var i = 0, l = checkSet.length; i < l; i++) {
                            var elem = checkSet[i];
                            if (elem) {
                                checkSet[i] = isPartStr ? elem.parentNode : elem.parentNode === part;
                            }
                        }
                        if (isPartStr) {
                            Sizzle.filter(part, checkSet, true);
                        }
                    }
                },
                "": function (checkSet, part, isXML) {
                    var doneName = done++,
                        checkFn = dirCheck;
                    if (typeof part === "string" && !/\W/.test(part)) {
                        var nodeCheck = part = part.toLowerCase();
                        checkFn = dirNodeCheck;
                    }
                    checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
                },
                "~": function (checkSet, part, isXML) {
                    var doneName = done++,
                        checkFn = dirCheck;
                    if (typeof part === "string" && !/\W/.test(part)) {
                        var nodeCheck = part = part.toLowerCase();
                        checkFn = dirNodeCheck;
                    }
                    checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
                }
            },
            find: {
                ID: function (match, context, isXML) {
                    if (typeof context.getElementById !== "undefined" && !isXML) {
                        var m = context.getElementById(match[1]);
                        return m ? [m] : [];
                    }
                },
                NAME: function (match, context) {
                    if (typeof context.getElementsByName !== "undefined") {
                        var ret = [],
                            results = context.getElementsByName(match[1]);
                        for (var i = 0, l = results.length; i < l; i++) {
                            if (results[i].getAttribute("name") === match[1]) {
                                ret.push(results[i]);
                            }
                        }
                        return ret.length === 0 ? null : ret;
                    }
                },
                TAG: function (match, context) {
                    return context.getElementsByTagName(match[1]);
                }
            },
            preFilter: {
                CLASS: function (match, curLoop, inplace, result, not, isXML) {
                    match = " " + match[1].replace(/\\/g, "") + " ";
                    if (isXML) {
                        return match;
                    }
                    for (var i = 0, elem;
                    (elem = curLoop[i]) != null; i++) {
                        if (elem) {
                            if (not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n]/g, " ").indexOf(match) >= 0)) {
                                if (!inplace) {
                                    result.push(elem);
                                }
                            } else if (inplace) {
                                curLoop[i] = false;
                            }
                        }
                    }
                    return false;
                },
                ID: function (match) {
                    return match[1].replace(/\\/g, "");
                },
                TAG: function (match, curLoop) {
                    return match[1].toLowerCase();
                },
                CHILD: function (match) {
                    if (match[1] === "nth") {
                        var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" || !/\D/.test(match[2]) && "0n+" + match[2] || match[2]);
                        match[2] = (test[1] + (test[2] || 1)) - 0;
                        match[3] = test[3] - 0;
                    }
                    match[0] = done++;
                    return match;
                },
                ATTR: function (match, curLoop, inplace, result, not, isXML) {
                    var name = match[1].replace(/\\/g, "");
                    if (!isXML && Expr.attrMap[name]) {
                        match[1] = Expr.attrMap[name];
                    }
                    if (match[2] === "~=") {
                        match[4] = " " + match[4] + " ";
                    }
                    return match;
                },
                PSEUDO: function (match, curLoop, inplace, result, not) {
                    if (match[1] === "not") {
                        if ((chunker.exec(match[3]) || "").length > 1 || /^\w/.test(match[3])) {
                            match[3] = Sizzle(match[3], null, null, curLoop);
                        } else {
                            var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
                            if (!inplace) {
                                result.push.apply(result, ret);
                            }
                            return false;
                        }
                    } else if (Expr.match.POS.test(match[0]) || Expr.match.CHILD.test(match[0])) {
                        return true;
                    }
                    return match;
                },
                POS: function (match) {
                    match.unshift(true);
                    return match;
                }
            },
            filters: {
                enabled: function (elem) {
                    return elem.disabled === false && elem.type !== "hidden";
                },
                disabled: function (elem) {
                    return elem.disabled === true;
                },
                checked: function (elem) {
                    return elem.checked === true;
                },
                selected: function (elem) {
                    elem.parentNode.selectedIndex;
                    return elem.selected === true;
                },
                parent: function (elem) {
                    return !!elem.firstChild;
                },
                empty: function (elem) {
                    return !elem.firstChild;
                },
                has: function (elem, i, match) {
                    return !!Sizzle(match[3], elem).length;
                },
                header: function (elem) {
                    return /h\d/i.test(elem.nodeName);
                },
                text: function (elem) {
                    return "text" === elem.type;
                },
                radio: function (elem) {
                    return "radio" === elem.type;
                },
                checkbox: function (elem) {
                    return "checkbox" === elem.type;
                },
                file: function (elem) {
                    return "file" === elem.type;
                },
                password: function (elem) {
                    return "password" === elem.type;
                },
                submit: function (elem) {
                    return "submit" === elem.type;
                },
                image: function (elem) {
                    return "image" === elem.type;
                },
                reset: function (elem) {
                    return "reset" === elem.type;
                },
                button: function (elem) {
                    return "button" === elem.type || elem.nodeName.toLowerCase() === "button";
                },
                input: function (elem) {
                    return /input|select|textarea|button/i.test(elem.nodeName);
                }
            },
            setFilters: {
                first: function (elem, i) {
                    return i === 0;
                },
                last: function (elem, i, match, array) {
                    return i === array.length - 1;
                },
                even: function (elem, i) {
                    return i % 2 === 0;
                },
                odd: function (elem, i) {
                    return i % 2 === 1;
                },
                lt: function (elem, i, match) {
                    return i < match[3] - 0;
                },
                gt: function (elem, i, match) {
                    return i > match[3] - 0;
                },
                nth: function (elem, i, match) {
                    return match[3] - 0 === i;
                },
                eq: function (elem, i, match) {
                    return match[3] - 0 === i;
                }
            },
            filter: {
                PSEUDO: function (elem, match, i, array) {
                    var name = match[1],
                        filter = Expr.filters[name];
                    if (filter) {
                        return filter(elem, i, match, array);
                    } else if (name === "contains") {
                        return (elem.textContent || elem.innerText || getText([elem]) || "").indexOf(match[3]) >= 0;
                    } else if (name === "not") {
                        var not = match[3];
                        for (var i = 0, l = not.length; i < l; i++) {
                            if (not[i] === elem) {
                                return false;
                            }
                        }
                        return true;
                    } else {
                        Sizzle.error("Syntax error, unrecognized expression: " + name);
                    }
                },
                CHILD: function (elem, match) {
                    var type = match[1],
                        node = elem;
                    switch (type) {
                    case 'only':
                    case 'first':
                        while ((node = node.previousSibling)) {
                            if (node.nodeType === 1) {
                                return false;
                            }
                        }
                        if (type === "first") {
                            return true;
                        }
                        node = elem;
                    case 'last':
                        while ((node = node.nextSibling)) {
                            if (node.nodeType === 1) {
                                return false;
                            }
                        }
                        return true;
                    case 'nth':
                        var first = match[2],
                            last = match[3];
                        if (first === 1 && last === 0) {
                            return true;
                        }
                        var doneName = match[0],
                            parent = elem.parentNode;
                        if (parent && (parent.sizcache !== doneName || !elem.nodeIndex)) {
                            var count = 0;
                            for (node = parent.firstChild; node; node = node.nextSibling) {
                                if (node.nodeType === 1) {
                                    node.nodeIndex = ++count;
                                }
                            }
                            parent.sizcache = doneName;
                        }
                        var diff = elem.nodeIndex - last;
                        if (first === 0) {
                            return diff === 0;
                        } else {
                            return (diff % first === 0 && diff / first >= 0);
                        }
                    }
                },
                ID: function (elem, match) {
                    return elem.nodeType === 1 && elem.getAttribute("id") === match;
                },
                TAG: function (elem, match) {
                    return (match === "*" && elem.nodeType === 1) || elem.nodeName.toLowerCase() === match;
                },
                CLASS: function (elem, match) {
                    return (" " + (elem.className || elem.getAttribute("class")) + " ").indexOf(match) > -1;
                },
                ATTR: function (elem, match) {
                    var name = match[1],
                        result = Expr.attrHandle[name] ? Expr.attrHandle[name](elem) : elem[name] != null ? elem[name] : elem.getAttribute(name),
                        value = result + "",
                        type = match[2],
                        check = match[4];
                    return result == null ? type === "!=" : type === "=" ? value === check : type === "*=" ? value.indexOf(check) >= 0 : type === "~=" ? (" " + value + " ").indexOf(check) >= 0 : !check ? value && result !== false : type === "!=" ? value !== check : type === "^=" ? value.indexOf(check) === 0 : type === "$=" ? value.substr(value.length - check.length) === check : type === "|=" ? value === check || value.substr(0, check.length + 1) === check + "-" : false;
                },
                POS: function (elem, match, i, array) {
                    var name = match[2],
                        filter = Expr.setFilters[name];
                    if (filter) {
                        return filter(elem, i, match, array);
                    }
                }
            }
        };
        var origPOS = Expr.match.POS;
        for (var type in Expr.match) {
            Expr.match[type] = new RegExp(Expr.match[type].source + /(?![^\[]*\])(?![^\(]*\))/.source);
            Expr.leftMatch[type] = new RegExp(/(^(?:.|\r|\n)*?)/.source + Expr.match[type].source.replace(/\\(\d+)/g, function (all, num) {
                return "\\" + (num - 0 + 1);
            }));
        }
        var makeArray = function (array, results) {
            array = Array.prototype.slice.call(array, 0);
            if (results) {
                results.push.apply(results, array);
                return results;
            }
            return array;
        };
        try {
            Array.prototype.slice.call(document.documentElement.childNodes, 0)[0].nodeType;
        } catch (e) {
            makeArray = function (array, results) {
                var ret = results || [];
                if (toString.call(array) === "[object Array]") {
                    Array.prototype.push.apply(ret, array);
                } else {
                    if (typeof array.length === "number") {
                        for (var i = 0, l = array.length; i < l; i++) {
                            ret.push(array[i]);
                        }
                    } else {
                        for (var i = 0; array[i]; i++) {
                            ret.push(array[i]);
                        }
                    }
                }
                return ret;
            };
        }
        var sortOrder;
        if (document.documentElement.compareDocumentPosition) {
            sortOrder = function (a, b) {
                if (!a.compareDocumentPosition || !b.compareDocumentPosition) {
                    if (a == b) {
                        hasDuplicate = true;
                    }
                    return a.compareDocumentPosition ? -1 : 1;
                }
                var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
                if (ret === 0) {
                    hasDuplicate = true;
                }
                return ret;
            };
        } else if ("sourceIndex" in document.documentElement) {
            sortOrder = function (a, b) {
                if (!a.sourceIndex || !b.sourceIndex) {
                    if (a == b) {
                        hasDuplicate = true;
                    }
                    return a.sourceIndex ? -1 : 1;
                }
                var ret = a.sourceIndex - b.sourceIndex;
                if (ret === 0) {
                    hasDuplicate = true;
                }
                return ret;
            };
        } else if (document.createRange) {
            sortOrder = function (a, b) {
                if (!a.ownerDocument || !b.ownerDocument) {
                    if (a == b) {
                        hasDuplicate = true;
                    }
                    return a.ownerDocument ? -1 : 1;
                }
                var aRange = a.ownerDocument.createRange(),
                    bRange = b.ownerDocument.createRange();
                aRange.setStart(a, 0);
                aRange.setEnd(a, 0);
                bRange.setStart(b, 0);
                bRange.setEnd(b, 0);
                var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
                if (ret === 0) {
                    hasDuplicate = true;
                }
                return ret;
            };
        }

        function getText(elems) {
            var ret = "",
                elem;
            for (var i = 0; elems[i]; i++) {
                elem = elems[i];
                if (elem.nodeType === 3 || elem.nodeType === 4) {
                    ret += elem.nodeValue;
                } else if (elem.nodeType !== 8) {
                    ret += getText(elem.childNodes);
                }
            }
            return ret;
        }(function () {
            var form = document.createElement("div"),
                id = "script" + (new Date).getTime();
            form.innerHTML = "<a name='" + id + "'/>";
            var root = document.documentElement;
            root.insertBefore(form, root.firstChild);
            if (document.getElementById(id)) {
                Expr.find.ID = function (match, context, isXML) {
                    if (typeof context.getElementById !== "undefined" && !isXML) {
                        var m = context.getElementById(match[1]);
                        return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
                    }
                };
                Expr.filter.ID = function (elem, match) {
                    var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
                    return elem.nodeType === 1 && node && node.nodeValue === match;
                };
            }
            root.removeChild(form);
            root = form = null;
        })();
        (function () {
            var div = document.createElement("div");
            div.appendChild(document.createComment(""));
            if (div.getElementsByTagName("*").length > 0) {
                Expr.find.TAG = function (match, context) {
                    var results = context.getElementsByTagName(match[1]);
                    if (match[1] === "*") {
                        var tmp = [];
                        for (var i = 0; results[i]; i++) {
                            if (results[i].nodeType === 1) {
                                tmp.push(results[i]);
                            }
                        }
                        results = tmp;
                    }
                    return results;
                };
            }
            div.innerHTML = "<a href='#'></a>";
            if (div.firstChild && typeof div.firstChild.getAttribute !== "undefined" && div.firstChild.getAttribute("href") !== "#") {
                Expr.attrHandle.href = function (elem) {
                    return elem.getAttribute("href", 2);
                };
            }
            div = null;
        })();
        if (document.querySelectorAll) {
            (function () {
                var oldSizzle = Sizzle,
                    div = document.createElement("div");
                div.innerHTML = "<p class='TEST'></p>";
                if (div.querySelectorAll && div.querySelectorAll(".TEST").length === 0) {
                    return;
                }
                Sizzle = function (query, context, extra, seed) {
                    context = context || document;
                    if (!seed && context.nodeType === 9 && !isXML(context)) {
                        try {
                            return makeArray(context.querySelectorAll(query), extra);
                        } catch (e) {}
                    }
                    return oldSizzle(query, context, extra, seed);
                };
                for (var prop in oldSizzle) {
                    Sizzle[prop] = oldSizzle[prop];
                }
                div = null;
            })();
        }(function () {
            var div = document.createElement("div");
            div.innerHTML = "<div class='test e'></div><div class='test'></div>";
            if (!div.getElementsByClassName || div.getElementsByClassName("e").length === 0) {
                return;
            }
            div.lastChild.className = "e";
            if (div.getElementsByClassName("e").length === 1) {
                return;
            }
            Expr.order.splice(1, 0, "CLASS");
            Expr.find.CLASS = function (match, context, isXML) {
                if (typeof context.getElementsByClassName !== "undefined" && !isXML) {
                    return context.getElementsByClassName(match[1]);
                }
            };
            div = null;
        })();

        function dirNodeCheck(dir, cur, doneName, checkSet, nodeCheck, isXML) {
            for (var i = 0, l = checkSet.length; i < l; i++) {
                var elem = checkSet[i];
                if (elem) {
                    elem = elem[dir];
                    var match = false;
                    while (elem) {
                        if (elem.sizcache === doneName) {
                            match = checkSet[elem.sizset];
                            break;
                        }
                        if (elem.nodeType === 1 && !isXML) {
                            elem.sizcache = doneName;
                            elem.sizset = i;
                        }
                        if (elem.nodeName.toLowerCase() === cur) {
                            match = elem;
                            break;
                        }
                        elem = elem[dir];
                    }
                    checkSet[i] = match;
                }
            }
        }

        function dirCheck(dir, cur, doneName, checkSet, nodeCheck, isXML) {
            for (var i = 0, l = checkSet.length; i < l; i++) {
                var elem = checkSet[i];
                if (elem) {
                    elem = elem[dir];
                    var match = false;
                    while (elem) {
                        if (elem.sizcache === doneName) {
                            match = checkSet[elem.sizset];
                            break;
                        }
                        if (elem.nodeType === 1) {
                            if (!isXML) {
                                elem.sizcache = doneName;
                                elem.sizset = i;
                            }
                            if (typeof cur !== "string") {
                                if (elem === cur) {
                                    match = true;
                                    break;
                                }
                            } else if (Sizzle.filter(cur, [elem]).length > 0) {
                                match = elem;
                                break;
                            }
                        }
                        elem = elem[dir];
                    }
                    checkSet[i] = match;
                }
            }
        }
        var contains = document.compareDocumentPosition ?
        function (a, b) {
            return !!(a.compareDocumentPosition(b) & 16);
        } : function (a, b) {
            return a !== b && (a.contains ? a.contains(b) : true);
        };
        var isXML = function (elem) {
            var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;
            return documentElement ? documentElement.nodeName !== "HTML" : false;
        };
        var posProcess = function (selector, context) {
            var tmpSet = [],
                later = "",
                match, root = context.nodeType ? [context] : context;
            while ((match = Expr.match.PSEUDO.exec(selector))) {
                later += match[0];
                selector = selector.replace(Expr.match.PSEUDO, "");
            }
            selector = Expr.relative[selector] ? selector + "*" : selector;
            for (var i = 0, l = root.length; i < l; i++) {
                Sizzle(selector, root[i], tmpSet);
            }
            return Sizzle.filter(later, tmpSet);
        };
        jQuery.find = Sizzle;
        jQuery.expr = Sizzle.selectors;
        jQuery.expr[":"] = jQuery.expr.filters;
        jQuery.unique = Sizzle.uniqueSort;
        jQuery.text = getText;
        jQuery.isXMLDoc = isXML;
        jQuery.contains = contains;
        return;
        window.Sizzle = Sizzle;
    })();
    var runtil = /Until$/,
        rparentsprev = /^(?:parents|prevUntil|prevAll)/,
        rmultiselector = /,/,
        slice = Array.prototype.slice;
    var winnow = function (elements, qualifier, keep) {
        if (jQuery.isFunction(qualifier)) {
            return jQuery.grep(elements, function (elem, i) {
                return !!qualifier.call(elem, i, elem) === keep;
            });
        } else if (qualifier.nodeType) {
            return jQuery.grep(elements, function (elem, i) {
                return (elem === qualifier) === keep;
            });
        } else if (typeof qualifier === "string") {
            var filtered = jQuery.grep(elements, function (elem) {
                return elem.nodeType === 1;
            });
            if (isSimple.test(qualifier)) {
                return jQuery.filter(qualifier, filtered, !keep);
            } else {
                qualifier = jQuery.filter(qualifier, filtered);
            }
        }
        return jQuery.grep(elements, function (elem, i) {
            return (jQuery.inArray(elem, qualifier) >= 0) === keep;
        });
    };
    jQuery.fn.extend({
        find: function (selector) {
            var ret = this.pushStack("", "find", selector),
                length = 0;
            for (var i = 0, l = this.length; i < l; i++) {
                length = ret.length;
                jQuery.find(selector, this[i], ret);
                if (i > 0) {
                    for (var n = length; n < ret.length; n++) {
                        for (var r = 0; r < length; r++) {
                            if (ret[r] === ret[n]) {
                                ret.splice(n--, 1);
                                break;
                            }
                        }
                    }
                }
            }
            return ret;
        },
        has: function (target) {
            var targets = jQuery(target);
            return this.filter(function () {
                for (var i = 0, l = targets.length; i < l; i++) {
                    if (jQuery.contains(this, targets[i])) {
                        return true;
                    }
                }
            });
        },
        not: function (selector) {
            return this.pushStack(winnow(this, selector, false), "not", selector);
        },
        filter: function (selector) {
            return this.pushStack(winnow(this, selector, true), "filter", selector);
        },
        is: function (selector) {
            return !!selector && jQuery.filter(selector, this).length > 0;
        },
        closest: function (selectors, context) {
            if (jQuery.isArray(selectors)) {
                var ret = [],
                    cur = this[0],
                    match, matches = {},
                    selector;
                if (cur && selectors.length) {
                    for (var i = 0, l = selectors.length; i < l; i++) {
                        selector = selectors[i];
                        if (!matches[selector]) {
                            matches[selector] = jQuery.expr.match.POS.test(selector) ? jQuery(selector, context || this.context) : selector;
                        }
                    }
                    while (cur && cur.ownerDocument && cur !== context) {
                        for (selector in matches) {
                            match = matches[selector];
                            if (match.jquery ? match.index(cur) > -1 : jQuery(cur).is(match)) {
                                ret.push({
                                    selector: selector,
                                    elem: cur
                                });
                                delete matches[selector];
                            }
                        }
                        cur = cur.parentNode;
                    }
                }
                return ret;
            }
            var pos = jQuery.expr.match.POS.test(selectors) ? jQuery(selectors, context || this.context) : null;
            return this.map(function (i, cur) {
                while (cur && cur.ownerDocument && cur !== context) {
                    if (pos ? pos.index(cur) > -1 : jQuery(cur).is(selectors)) {
                        return cur;
                    }
                    cur = cur.parentNode;
                }
                return null;
            });
        },
        index: function (elem) {
            if (!elem || typeof elem === "string") {
                return jQuery.inArray(this[0], elem ? jQuery(elem) : this.parent().children());
            }
            return jQuery.inArray(elem.jquery ? elem[0] : elem, this);
        },
        add: function (selector, context) {
            var set = typeof selector === "string" ? jQuery(selector, context || this.context) : jQuery.makeArray(selector),
                all = jQuery.merge(this.get(), set);
            return this.pushStack(isDisconnected(set[0]) || isDisconnected(all[0]) ? all : jQuery.unique(all));
        },
        andSelf: function () {
            return this.add(this.prevObject);
        }
    });

    function isDisconnected(node) {
        return !node || !node.parentNode || node.parentNode.nodeType === 11;
    }
    jQuery.each({
        parent: function (elem) {
            var parent = elem.parentNode;
            return parent && parent.nodeType !== 11 ? parent : null;
        },
        parents: function (elem) {
            return jQuery.dir(elem, "parentNode");
        },
        parentsUntil: function (elem, i, until) {
            return jQuery.dir(elem, "parentNode", until);
        },
        next: function (elem) {
            return jQuery.nth(elem, 2, "nextSibling");
        },
        prev: function (elem) {
            return jQuery.nth(elem, 2, "previousSibling");
        },
        nextAll: function (elem) {
            return jQuery.dir(elem, "nextSibling");
        },
        prevAll: function (elem) {
            return jQuery.dir(elem, "previousSibling");
        },
        nextUntil: function (elem, i, until) {
            return jQuery.dir(elem, "nextSibling", until);
        },
        prevUntil: function (elem, i, until) {
            return jQuery.dir(elem, "previousSibling", until);
        },
        siblings: function (elem) {
            return jQuery.sibling(elem.parentNode.firstChild, elem);
        },
        children: function (elem) {
            return jQuery.sibling(elem.firstChild);
        },
        contents: function (elem) {
            return jQuery.nodeName(elem, "iframe") ? elem.contentDocument || elem.contentWindow.document : jQuery.makeArray(elem.childNodes);
        }
    }, function (name, fn) {
        jQuery.fn[name] = function (until, selector) {
            var ret = jQuery.map(this, fn, until);
            if (!runtil.test(name)) {
                selector = until;
            }
            if (selector && typeof selector === "string") {
                ret = jQuery.filter(selector, ret);
            }
            ret = this.length > 1 ? jQuery.unique(ret) : ret;
            if ((this.length > 1 || rmultiselector.test(selector)) && rparentsprev.test(name)) {
                ret = ret.reverse();
            }
            return this.pushStack(ret, name, slice.call(arguments).join(","));
        };
    });
    jQuery.extend({
        filter: function (expr, elems, not) {
            if (not) {
                expr = ":not(" + expr + ")";
            }
            return jQuery.find.matches(expr, elems);
        },
        dir: function (elem, dir, until) {
            var matched = [],
                cur = elem[dir];
            while (cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery(cur).is(until))) {
                if (cur.nodeType === 1) {
                    matched.push(cur);
                }
                cur = cur[dir];
            }
            return matched;
        },
        nth: function (cur, result, dir, elem) {
            result = result || 1;
            var num = 0;
            for (; cur; cur = cur[dir]) {
                if (cur.nodeType === 1 && ++num === result) {
                    break;
                }
            }
            return cur;
        },
        sibling: function (n, elem) {
            var r = [];
            for (; n; n = n.nextSibling) {
                if (n.nodeType === 1 && n !== elem) {
                    r.push(n);
                }
            }
            return r;
        }
    });
    var rinlinejQuery = / jQuery\d+="(?:\d+|null)"/g,
        rleadingWhitespace = /^\s+/,
        rxhtmlTag = /(<([\w:]+)[^>]*?)\/>/g,
        rselfClosing = /^(?:area|br|col|embed|hr|img|input|link|meta|param)$/i,
        rtagName = /<([\w:]+)/,
        rtbody = /<tbody/i,
        rhtml = /<|&#?\w+;/,
        rnocache = /<script|<object|<embed|<option|<style/i,
        rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
        fcloseTag = function (all, front, tag) {
            return rselfClosing.test(tag) ? all : front + "></" + tag + ">";
        },
        wrapMap = {
            option: [1, "<select multiple='multiple'>", "</select>"],
            legend: [1, "<fieldset>", "</fieldset>"],
            thead: [1, "<table>", "</table>"],
            tr: [2, "<table><tbody>", "</tbody></table>"],
            td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
            col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
            area: [1, "<map>", "</map>"],
            _default: [0, "", ""]
        };
    wrapMap.optgroup = wrapMap.option;
    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;
    if (!jQuery.support.htmlSerialize) {
        wrapMap._default = [1, "div<div>", "</div>"];
    }
    jQuery.fn.extend({
        text: function (text) {
            if (jQuery.isFunction(text)) {
                return this.each(function (i) {
                    var self = jQuery(this);
                    self.text(text.call(this, i, self.text()));
                });
            }
            if (typeof text !== "object" && text !== undefined) {
                return this.empty().append((this[0] && this[0].ownerDocument || document).createTextNode(text));
            }
            return jQuery.text(this);
        },
        wrapAll: function (html) {
            if (jQuery.isFunction(html)) {
                return this.each(function (i) {
                    jQuery(this).wrapAll(html.call(this, i));
                });
            }
            if (this[0]) {
                var wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
                if (this[0].parentNode) {
                    wrap.insertBefore(this[0]);
                }
                wrap.map(function () {
                    var elem = this;
                    while (elem.firstChild && elem.firstChild.nodeType === 1) {
                        elem = elem.firstChild;
                    }
                    return elem;
                }).append(this);
            }
            return this;
        },
        wrapInner: function (html) {
            if (jQuery.isFunction(html)) {
                return this.each(function (i) {
                    jQuery(this).wrapInner(html.call(this, i));
                });
            }
            return this.each(function () {
                var self = jQuery(this),
                    contents = self.contents();
                if (contents.length) {
                    contents.wrapAll(html);
                } else {
                    self.append(html);
                }
            });
        },
        wrap: function (html) {
            return this.each(function () {
                jQuery(this).wrapAll(html);
            });
        },
        unwrap: function () {
            return this.parent().each(function () {
                if (!jQuery.nodeName(this, "body")) {
                    jQuery(this).replaceWith(this.childNodes);
                }
            }).end();
        },
        append: function () {
            return this.domManip(arguments, true, function (elem) {
                if (this.nodeType === 1) {
                    this.appendChild(elem);
                }
            });
        },
        prepend: function () {
            return this.domManip(arguments, true, function (elem) {
                if (this.nodeType === 1) {
                    this.insertBefore(elem, this.firstChild);
                }
            });
        },
        before: function () {
            if (this[0] && this[0].parentNode) {
                return this.domManip(arguments, false, function (elem) {
                    this.parentNode.insertBefore(elem, this);
                });
            } else if (arguments.length) {
                var set = jQuery(arguments[0]);
                set.push.apply(set, this.toArray());
                return this.pushStack(set, "before", arguments);
            }
        },
        after: function () {
            if (this[0] && this[0].parentNode) {
                return this.domManip(arguments, false, function (elem) {
                    this.parentNode.insertBefore(elem, this.nextSibling);
                });
            } else if (arguments.length) {
                var set = this.pushStack(this, "after", arguments);
                set.push.apply(set, jQuery(arguments[0]).toArray());
                return set;
            }
        },
        remove: function (selector, keepData) {
            for (var i = 0, elem;
            (elem = this[i]) != null; i++) {
                if (!selector || jQuery.filter(selector, [elem]).length) {
                    if (!keepData && elem.nodeType === 1) {
                        jQuery.cleanData(elem.getElementsByTagName("*"));
                        jQuery.cleanData([elem]);
                    }
                    if (elem.parentNode) {
                        elem.parentNode.removeChild(elem);
                    }
                }
            }
            return this;
        },
        empty: function () {
            for (var i = 0, elem;
            (elem = this[i]) != null; i++) {
                if (elem.nodeType === 1) {
                    jQuery.cleanData(elem.getElementsByTagName("*"));
                }
                while (elem.firstChild) {
                    elem.removeChild(elem.firstChild);
                }
            }
            return this;
        },
        clone: function (events) {
            var ret = this.map(function () {
                if (!jQuery.support.noCloneEvent && !jQuery.isXMLDoc(this)) {
                    var html = this.outerHTML,
                        ownerDocument = this.ownerDocument;
                    if (!html) {
                        var div = ownerDocument.createElement("div");
                        div.appendChild(this.cloneNode(true));
                        html = div.innerHTML;
                    }
                    return jQuery.clean([html.replace(rinlinejQuery, "").replace(/=([^="'>\s]+\/)>/g, '="$1">').replace(rleadingWhitespace, "")], ownerDocument)[0];
                } else {
                    return this.cloneNode(true);
                }
            });
            if (events === true) {
                cloneCopyEvent(this, ret);
                cloneCopyEvent(this.find("*"), ret.find("*"));
            }
            return ret;
        },
        html: function (value) {
            if (value === undefined) {
                return this[0] && this[0].nodeType === 1 ? this[0].innerHTML.replace(rinlinejQuery, "") : null;
            } else if (typeof value === "string" && !rnocache.test(value) && (jQuery.support.leadingWhitespace || !rleadingWhitespace.test(value)) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
                value = value.replace(rxhtmlTag, fcloseTag);
                try {
                    for (var i = 0, l = this.length; i < l; i++) {
                        if (this[i].nodeType === 1) {
                            jQuery.cleanData(this[i].getElementsByTagName("*"));
                            this[i].innerHTML = value;
                        }
                    }
                } catch (e) {
                    this.empty().append(value);
                }
            } else if (jQuery.isFunction(value)) {
                this.each(function (i) {
                    var self = jQuery(this),
                        old = self.html();
                    self.empty().append(function () {
                        return value.call(this, i, old);
                    });
                });
            } else {
                this.empty().append(value);
            }
            return this;
        },
        replaceWith: function (value) {
            if (this[0] && this[0].parentNode) {
                if (jQuery.isFunction(value)) {
                    return this.each(function (i) {
                        var self = jQuery(this),
                            old = self.html();
                        self.replaceWith(value.call(this, i, old));
                    });
                }
                if (typeof value !== "string") {
                    value = jQuery(value).detach();
                }
                return this.each(function () {
                    var next = this.nextSibling,
                        parent = this.parentNode;
                    jQuery(this).remove();
                    if (next) {
                        jQuery(next).before(value);
                    } else {
                        jQuery(parent).append(value);
                    }
                });
            } else {
                return this.pushStack(jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value);
            }
        },
        detach: function (selector) {
            return this.remove(selector, true);
        },
        domManip: function (args, table, callback) {
            var results, first, value = args[0],
                scripts = [],
                fragment, parent;
            if (!jQuery.support.checkClone && arguments.length === 3 && typeof value === "string" && rchecked.test(value)) {
                return this.each(function () {
                    jQuery(this).domManip(args, table, callback, true);
                });
            }
            if (jQuery.isFunction(value)) {
                return this.each(function (i) {
                    var self = jQuery(this);
                    args[0] = value.call(this, i, table ? self.html() : undefined);
                    self.domManip(args, table, callback);
                });
            }
            if (this[0]) {
                parent = value && value.parentNode;
                if (jQuery.support.parentNode && parent && parent.nodeType === 11 && parent.childNodes.length === this.length) {
                    results = {
                        fragment: parent
                    };
                } else {
                    results = buildFragment(args, this, scripts);
                }
                fragment = results.fragment;
                if (fragment.childNodes.length === 1) {
                    first = fragment = fragment.firstChild;
                } else {
                    first = fragment.firstChild;
                }
                if (first) {
                    table = table && jQuery.nodeName(first, "tr");
                    for (var i = 0, l = this.length; i < l; i++) {
                        callback.call(table ? root(this[i], first) : this[i], i > 0 || results.cacheable || this.length > 1 ? fragment.cloneNode(true) : fragment);
                    }
                }
                if (scripts.length) {
                    jQuery.each(scripts, evalScript);
                }
            }
            return this;

            function root(elem, cur) {
                return jQuery.nodeName(elem, "table") ? (elem.getElementsByTagName("tbody")[0] || elem.appendChild(elem.ownerDocument.createElement("tbody"))) : elem;
            }
        }
    });

    function cloneCopyEvent(orig, ret) {
        var i = 0;
        ret.each(function () {
            if (this.nodeName !== (orig[i] && orig[i].nodeName)) {
                return;
            }
            var oldData = jQuery.data(orig[i++]),
                curData = jQuery.data(this, oldData),
                events = oldData && oldData.events;
            if (events) {
                delete curData.handle;
                curData.events = {};
                for (var type in events) {
                    for (var handler in events[type]) {
                        jQuery.event.add(this, type, events[type][handler], events[type][handler].data);
                    }
                }
            }
        });
    }

    function buildFragment(args, nodes, scripts) {
        var fragment, cacheable, cacheresults, doc = (nodes && nodes[0] ? nodes[0].ownerDocument || nodes[0] : document);
        if (args.length === 1 && typeof args[0] === "string" && args[0].length < 512 && doc === document && !rnocache.test(args[0]) && (jQuery.support.checkClone || !rchecked.test(args[0]))) {
            cacheable = true;
            cacheresults = jQuery.fragments[args[0]];
            if (cacheresults) {
                if (cacheresults !== 1) {
                    fragment = cacheresults;
                }
            }
        }
        if (!fragment) {
            fragment = doc.createDocumentFragment();
            jQuery.clean(args, doc, fragment, scripts);
        }
        if (cacheable) {
            jQuery.fragments[args[0]] = cacheresults ? fragment : 1;
        }
        return {
            fragment: fragment,
            cacheable: cacheable
        };
    }
    jQuery.fragments = {};
    jQuery.each({
        appendTo: "append",
        prependTo: "prepend",
        insertBefore: "before",
        insertAfter: "after",
        replaceAll: "replaceWith"
    }, function (name, original) {
        jQuery.fn[name] = function (selector) {
            var ret = [],
                insert = jQuery(selector),
                parent = this.length === 1 && this[0].parentNode;
            if (parent && parent.nodeType === 11 && parent.childNodes.length === 1 && insert.length === 1) {
                insert[original](this[0]);
                return this;
            } else {
                for (var i = 0, l = insert.length; i < l; i++) {
                    var elems = (i > 0 ? this.clone(true) : this).get();
                    jQuery.fn[original].apply(jQuery(insert[i]), elems);
                    ret = ret.concat(elems);
                }
                return this.pushStack(ret, name, insert.selector);
            }
        };
    });
    jQuery.extend({
        clean: function (elems, context, fragment, scripts) {
            context = context || document;
            if (typeof context.createElement === "undefined") {
                context = context.ownerDocument || context[0] && context[0].ownerDocument || document;
            }
            var ret = [];
            for (var i = 0, elem;
            (elem = elems[i]) != null; i++) {
                if (typeof elem === "number") {
                    elem += "";
                }
                if (!elem) {
                    continue;
                }
                if (typeof elem === "string" && !rhtml.test(elem)) {
                    elem = context.createTextNode(elem);
                } else if (typeof elem === "string") {
                    elem = elem.replace(rxhtmlTag, fcloseTag);
                    var tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase(),
                        wrap = wrapMap[tag] || wrapMap._default,
                        depth = wrap[0],
                        div = context.createElement("div");
                    div.innerHTML = wrap[1] + elem + wrap[2];
                    while (depth--) {
                        div = div.lastChild;
                    }
                    if (!jQuery.support.tbody) {
                        var hasBody = rtbody.test(elem),
                            tbody = tag === "table" && !hasBody ? div.firstChild && div.firstChild.childNodes : wrap[1] === "<table>" && !hasBody ? div.childNodes : [];
                        for (var j = tbody.length - 1; j >= 0; --j) {
                            if (jQuery.nodeName(tbody[j], "tbody") && !tbody[j].childNodes.length) {
                                tbody[j].parentNode.removeChild(tbody[j]);
                            }
                        }
                    }
                    if (!jQuery.support.leadingWhitespace && rleadingWhitespace.test(elem)) {
                        div.insertBefore(context.createTextNode(rleadingWhitespace.exec(elem)[0]), div.firstChild);
                    }
                    elem = div.childNodes;
                }
                if (elem.nodeType) {
                    ret.push(elem);
                } else {
                    ret = jQuery.merge(ret, elem);
                }
            }
            if (fragment) {
                for (var i = 0; ret[i]; i++) {
                    if (scripts && jQuery.nodeName(ret[i], "script") && (!ret[i].type || ret[i].type.toLowerCase() === "text/javascript")) {
                        scripts.push(ret[i].parentNode ? ret[i].parentNode.removeChild(ret[i]) : ret[i]);
                    } else {
                        if (ret[i].nodeType === 1) {
                            ret.splice.apply(ret, [i + 1, 0].concat(jQuery.makeArray(ret[i].getElementsByTagName("script"))));
                        }
                        fragment.appendChild(ret[i]);
                    }
                }
            }
            return ret;
        },
        cleanData: function (elems) {
            var data, id, cache = jQuery.cache,
                special = jQuery.event.special,
                deleteExpando = jQuery.support.deleteExpando;
            for (var i = 0, elem;
            (elem = elems[i]) != null; i++) {
                id = elem[jQuery.expando];
                if (id) {
                    data = cache[id];
                    if (data.events) {
                        for (var type in data.events) {
                            if (special[type]) {
                                jQuery.event.remove(elem, type);
                            } else {
                                removeEvent(elem, type, data.handle);
                            }
                        }
                    }
                    if (deleteExpando) {
                        delete elem[jQuery.expando];
                    } else if (elem.removeAttribute) {
                        elem.removeAttribute(jQuery.expando);
                    }
                    delete cache[id];
                }
            }
        }
    });
    var rexclude = /z-?index|font-?weight|opacity|zoom|line-?height/i,
        ralpha = /alpha\([^)]*\)/,
        ropacity = /opacity=([^)]*)/,
        rfloat = /float/i,
        rdashAlpha = /-([a-z])/ig,
        rupper = /([A-Z])/g,
        rnumpx = /^-?\d+(?:px)?$/i,
        rnum = /^-?\d/,
        cssShow = {
            position: "absolute",
            visibility: "hidden",
            display: "block"
        },
        cssWidth = ["Left", "Right"],
        cssHeight = ["Top", "Bottom"],
        getComputedStyle = document.defaultView && document.defaultView.getComputedStyle,
        styleFloat = jQuery.support.cssFloat ? "cssFloat" : "styleFloat",
        fcamelCase = function (all, letter) {
            return letter.toUpperCase();
        };
    jQuery.fn.css = function (name, value) {
        return access(this, name, value, true, function (elem, name, value) {
            if (value === undefined) {
                return jQuery.curCSS(elem, name);
            }
            if (typeof value === "number" && !rexclude.test(name)) {
                value += "px";
            }
            jQuery.style(elem, name, value);
        });
    };
    jQuery.extend({
        style: function (elem, name, value) {
            if (!elem || elem.nodeType === 3 || elem.nodeType === 8) {
                return undefined;
            }
            if ((name === "width" || name === "height") && parseFloat(value) < 0) {
                value = undefined;
            }
            var style = elem.style || elem,
                set = value !== undefined;
            if (!jQuery.support.opacity && name === "opacity") {
                if (set) {
                    style.zoom = 1;
                    var opacity = parseInt(value, 10) + "" === "NaN" ? "" : "alpha(opacity=" + value * 100 + ")";
                    var filter = style.filter || jQuery.curCSS(elem, "filter") || "";
                    style.filter = ralpha.test(filter) ? filter.replace(ralpha, opacity) : opacity;
                }
                return style.filter && style.filter.indexOf("opacity=") >= 0 ? (parseFloat(ropacity.exec(style.filter)[1]) / 100) + "" : "";
            }
            if (rfloat.test(name)) {
                name = styleFloat;
            }
            name = name.replace(rdashAlpha, fcamelCase);
            if (set) {
                style[name] = value;
            }
            return style[name];
        },
        css: function (elem, name, force, extra) {
            if (name === "width" || name === "height") {
                var val, props = cssShow,
                    which = name === "width" ? cssWidth : cssHeight;

                function getWH() {
                    val = name === "width" ? elem.offsetWidth : elem.offsetHeight;
                    if (extra === "border") {
                        return;
                    }
                    jQuery.each(which, function () {
                        if (!extra) {
                            val -= parseFloat(jQuery.curCSS(elem, "padding" + this, true)) || 0;
                        }
                        if (extra === "margin") {
                            val += parseFloat(jQuery.curCSS(elem, "margin" + this, true)) || 0;
                        } else {
                            val -= parseFloat(jQuery.curCSS(elem, "border" + this + "Width", true)) || 0;
                        }
                    });
                }
                if (elem.offsetWidth !== 0) {
                    getWH();
                } else {
                    jQuery.swap(elem, props, getWH);
                }
                return Math.max(0, Math.round(val));
            }
            return jQuery.curCSS(elem, name, force);
        },
        curCSS: function (elem, name, force) {
            var ret, style = elem.style,
                filter;
            if (!jQuery.support.opacity && name === "opacity" && elem.currentStyle) {
                ret = ropacity.test(elem.currentStyle.filter || "") ? (parseFloat(RegExp.$1) / 100) + "" : "";
                return ret === "" ? "1" : ret;
            }
            if (rfloat.test(name)) {
                name = styleFloat;
            }
            if (!force && style && style[name]) {
                ret = style[name];
            } else if (getComputedStyle) {
                if (rfloat.test(name)) {
                    name = "float";
                }
                name = name.replace(rupper, "-$1").toLowerCase();
                var defaultView = elem.ownerDocument.defaultView;
                if (!defaultView) {
                    return null;
                }
                var computedStyle = defaultView.getComputedStyle(elem, null);
                if (computedStyle) {
                    ret = computedStyle.getPropertyValue(name);
                }
                if (name === "opacity" && ret === "") {
                    ret = "1";
                }
            } else if (elem.currentStyle) {
                var camelCase = name.replace(rdashAlpha, fcamelCase);
                ret = elem.currentStyle[name] || elem.currentStyle[camelCase];
                if (!rnumpx.test(ret) && rnum.test(ret)) {
                    var left = style.left,
                        rsLeft = elem.runtimeStyle.left;
                    elem.runtimeStyle.left = elem.currentStyle.left;
                    style.left = camelCase === "fontSize" ? "1em" : (ret || 0);
                    ret = style.pixelLeft + "px";
                    style.left = left;
                    elem.runtimeStyle.left = rsLeft;
                }
            }
            return ret;
        },
        swap: function (elem, options, callback) {
            var old = {};
            for (var name in options) {
                old[name] = elem.style[name];
                elem.style[name] = options[name];
            }
            callback.call(elem);
            for (var name in options) {
                elem.style[name] = old[name];
            }
        }
    });
    if (jQuery.expr && jQuery.expr.filters) {
        jQuery.expr.filters.hidden = function (elem) {
            var width = elem.offsetWidth,
                height = elem.offsetHeight,
                skip = elem.nodeName.toLowerCase() === "tr";
            return width === 0 && height === 0 && !skip ? true : width > 0 && height > 0 && !skip ? false : jQuery.curCSS(elem, "display") === "none";
        };
        jQuery.expr.filters.visible = function (elem) {
            return !jQuery.expr.filters.hidden(elem);
        };
    }
    var jsc = now(),
        rscript = /<script(.|\s)*?\/script>/gi,
        rselectTextarea = /select|textarea/i,
        rinput = /color|date|datetime|email|hidden|month|number|password|range|search|tel|text|time|url|week/i,
        jsre = /=\?(&|$)/,
        rquery = /\?/,
        rts = /(\?|&)_=.*?(&|$)/,
        rurl = /^(\w+:)?\/\/([^\/?#]+)/,
        r20 = /%20/g,
        _load = jQuery.fn.load;
    jQuery.fn.extend({
        load: function (url, params, callback) {
            if (typeof url !== "string") {
                return _load.call(this, url);
            } else if (!this.length) {
                return this;
            }
            var off = url.indexOf(" ");
            if (off >= 0) {
                var selector = url.slice(off, url.length);
                url = url.slice(0, off);
            }
            var type = "GET";
            if (params) {
                if (jQuery.isFunction(params)) {
                    callback = params;
                    params = null;
                } else if (typeof params === "object") {
                    params = jQuery.param(params, jQuery.ajaxSettings.traditional);
                    type = "POST";
                }
            }
            var self = this;
            jQuery.ajax({
                url: url,
                type: type,
                dataType: "html",
                data: params,
                complete: function (res, status) {
                    if (status === "success" || status === "notmodified") {
                        self.html(selector ? jQuery("<div />").append(res.responseText.replace(rscript, "")).find(selector) : res.responseText);
                    }
                    if (callback) {
                        self.each(callback, [res.responseText, status, res]);
                    }
                }
            });
            return this;
        },
        serialize: function () {
            return jQuery.param(this.serializeArray());
        },
        serializeArray: function () {
            return this.map(function () {
                return this.elements ? jQuery.makeArray(this.elements) : this;
            }).filter(function () {
                return this.name && !this.disabled && (this.checked || rselectTextarea.test(this.nodeName) || rinput.test(this.type));
            }).map(function (i, elem) {
                var val = jQuery(this).val();
                return val == null ? null : jQuery.isArray(val) ? jQuery.map(val, function (val, i) {
                    return {
                        name: elem.name,
                        value: val
                    };
                }) : {
                    name: elem.name,
                    value: val
                };
            }).get();
        }
    });
    jQuery.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "), function (i, o) {
        jQuery.fn[o] = function (f) {
            return this.bind(o, f);
        };
    });
    jQuery.extend({
        get: function (url, data, callback, type) {
            if (jQuery.isFunction(data)) {
                type = type || callback;
                callback = data;
                data = null;
            }
            return jQuery.ajax({
                type: "GET",
                url: url,
                data: data,
                success: callback,
                dataType: type
            });
        },
        getScript: function (url, callback) {
            return jQuery.get(url, null, callback, "script");
        },
        getJSON: function (url, data, callback) {
            return jQuery.get(url, data, callback, "json");
        },
        post: function (url, data, callback, type) {
            if (jQuery.isFunction(data)) {
                type = type || callback;
                callback = data;
                data = {};
            }
            return jQuery.ajax({
                type: "POST",
                url: url,
                data: data,
                success: callback,
                dataType: type
            });
        },
        ajaxSetup: function (settings) {
            jQuery.extend(jQuery.ajaxSettings, settings);
        },
        ajaxSettings: {
            url: location.href,
            global: true,
            type: "GET",
            contentType: "application/x-www-form-urlencoded",
            processData: true,
            async: true,
            xhr: window.XMLHttpRequest && (window.location.protocol !== "file:" || !window.ActiveXObject) ?
            function () {
                return new window.XMLHttpRequest();
            } : function () {
                try {
                    return new window.ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {}
            },
            accepts: {
                xml: "application/xml, text/xml",
                html: "text/html",
                script: "text/javascript, application/javascript",
                json: "application/json, text/javascript",
                text: "text/plain",
                _default: "*/*"
            }
        },
        lastModified: {},
        etag: {},
        ajax: function (origSettings) {
            var s = jQuery.extend(true, {}, jQuery.ajaxSettings, origSettings);
            var jsonp, status, data, callbackContext = origSettings && origSettings.context || s,
                type = s.type.toUpperCase();
            if (s.data && s.processData && typeof s.data !== "string") {
                s.data = jQuery.param(s.data, s.traditional);
            }
            if (s.dataType === "jsonp") {
                if (type === "GET") {
                    if (!jsre.test(s.url)) {
                        s.url += (rquery.test(s.url) ? "&" : "?") + (s.jsonp || "callback") + "=?";
                    }
                } else if (!s.data || !jsre.test(s.data)) {
                    s.data = (s.data ? s.data + "&" : "") + (s.jsonp || "callback") + "=?";
                }
                s.dataType = "json";
            }
            if (s.dataType === "json" && (s.data && jsre.test(s.data) || jsre.test(s.url))) {
                jsonp = s.jsonpCallback || ("jsonp" + jsc++);
                if (s.data) {
                    s.data = (s.data + "").replace(jsre, "=" + jsonp + "$1");
                }
                s.url = s.url.replace(jsre, "=" + jsonp + "$1");
                s.dataType = "script";
                window[jsonp] = window[jsonp] ||
                function (tmp) {
                    data = tmp;
                    success();
                    complete();
                    window[jsonp] = undefined;
                    try {
                        delete window[jsonp];
                    } catch (e) {}
                    if (head) {
                        head.removeChild(script);
                    }
                };
            }
            if (s.dataType === "script" && s.cache === null) {
                s.cache = false;
            }
            if (s.cache === false && type === "GET") {
                var ts = now();
                var ret = s.url.replace(rts, "$1_=" + ts + "$2");
                s.url = ret + ((ret === s.url) ? (rquery.test(s.url) ? "&" : "?") + "_=" + ts : "");
            }
            if (s.data && type === "GET") {
                s.url += (rquery.test(s.url) ? "&" : "?") + s.data;
            }
            if (s.global && !jQuery.active++) {
                jQuery.event.trigger("ajaxStart");
            }
            var parts = rurl.exec(s.url),
                remote = parts && (parts[1] && parts[1] !== location.protocol || parts[2] !== location.host);
            if (s.dataType === "script" && type === "GET" && remote) {
                var head = document.getElementsByTagName("head")[0] || document.documentElement;
                var script = document.createElement("script");
                script.src = s.url;
                if (s.scriptCharset) {
                    script.charset = s.scriptCharset;
                }
                if (!jsonp) {
                    var done = false;
                    script.onload = script.onreadystatechange = function () {
                        if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                            done = true;
                            success();
                            complete();
                            script.onload = script.onreadystatechange = null;
                            if (head && script.parentNode) {
                                head.removeChild(script);
                            }
                        }
                    };
                }
                head.insertBefore(script, head.firstChild);
                return undefined;
            }
            var requestDone = false;
            var xhr = s.xhr();
            if (!xhr) {
                return;
            }
            if (s.username) {
                xhr.open(type, s.url, s.async, s.username, s.password);
            } else {
                xhr.open(type, s.url, s.async);
            }
            try {
                if (s.data || origSettings && origSettings.contentType) {
                    xhr.setRequestHeader("Content-Type", s.contentType);
                }
                if (s.ifModified) {
                    if (jQuery.lastModified[s.url]) {
                        xhr.setRequestHeader("If-Modified-Since", jQuery.lastModified[s.url]);
                    }
                    if (jQuery.etag[s.url]) {
                        xhr.setRequestHeader("If-None-Match", jQuery.etag[s.url]);
                    }
                }
                if (!remote) {
                    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                }
                xhr.setRequestHeader("Accept", s.dataType && s.accepts[s.dataType] ? s.accepts[s.dataType] + ", */*" : s.accepts._default);
            } catch (e) {}
            if (s.beforeSend && s.beforeSend.call(callbackContext, xhr, s) === false) {
                if (s.global && !--jQuery.active) {
                    jQuery.event.trigger("ajaxStop");
                }
                xhr.abort();
                return false;
            }
            if (s.global) {
                trigger("ajaxSend", [xhr, s]);
            }
            var onreadystatechange = xhr.onreadystatechange = function (isTimeout) {
                if (!xhr || xhr.readyState === 0 || isTimeout === "abort") {
                    if (!requestDone) {
                        complete();
                    }
                    requestDone = true;
                    if (xhr) {
                        xhr.onreadystatechange = jQuery.noop;
                    }
                } else if (!requestDone && xhr && (xhr.readyState === 4 || isTimeout === "timeout")) {
                    requestDone = true;
                    xhr.onreadystatechange = jQuery.noop;
                    status = isTimeout === "timeout" ? "timeout" : !jQuery.httpSuccess(xhr) ? "error" : s.ifModified && jQuery.httpNotModified(xhr, s.url) ? "notmodified" : "success";
                    var errMsg;
                    if (status === "success") {
                        try {
                            data = jQuery.httpData(xhr, s.dataType, s);
                        } catch (err) {
                            status = "parsererror";
                            errMsg = err;
                        }
                    }
                    if (status === "success" || status === "notmodified") {
                        if (!jsonp) {
                            success();
                        }
                    } else {
                        jQuery.handleError(s, xhr, status, errMsg);
                    }
                    complete();
                    if (isTimeout === "timeout") {
                        xhr.abort();
                    }
                    if (s.async) {
                        xhr = null;
                    }
                }
            };
            try {
                var oldAbort = xhr.abort;
                xhr.abort = function () {
                    if (xhr) {
                        oldAbort.call(xhr);
                    }
                    onreadystatechange("abort");
                };
            } catch (e) {}
            if (s.async && s.timeout > 0) {
                setTimeout(function () {
                    if (xhr && !requestDone) {
                        onreadystatechange("timeout");
                    }
                }, s.timeout);
            }
            try {
                xhr.send(type === "POST" || type === "PUT" || type === "DELETE" ? s.data : null);
            } catch (e) {
                jQuery.handleError(s, xhr, null, e);
                complete();
            }
            if (!s.async) {
                onreadystatechange();
            }

            function success() {
                if (s.success) {
                    s.success.call(callbackContext, data, status, xhr);
                }
                if (s.global) {
                    trigger("ajaxSuccess", [xhr, s]);
                }
            }

            function complete() {
                if (s.complete) {
                    s.complete.call(callbackContext, xhr, status);
                }
                if (s.global) {
                    trigger("ajaxComplete", [xhr, s]);
                }
                if (s.global && !--jQuery.active) {
                    jQuery.event.trigger("ajaxStop");
                }
            }

            function trigger(type, args) {
                (s.context ? jQuery(s.context) : jQuery.event).trigger(type, args);
            }
            return xhr;
        },
        handleError: function (s, xhr, status, e) {
            if (s.error) {
                s.error.call(s.context || s, xhr, status, e);
            }
            if (s.global) {
                (s.context ? jQuery(s.context) : jQuery.event).trigger("ajaxError", [xhr, s, e]);
            }
        },
        active: 0,
        httpSuccess: function (xhr) {
            try {
                return !xhr.status && location.protocol === "file:" || (xhr.status >= 200 && xhr.status < 300) || xhr.status === 304 || xhr.status === 1223 || xhr.status === 0;
            } catch (e) {}
            return false;
        },
        httpNotModified: function (xhr, url) {
            var lastModified = xhr.getResponseHeader("Last-Modified"),
                etag = xhr.getResponseHeader("Etag");
            if (lastModified) {
                jQuery.lastModified[url] = lastModified;
            }
            if (etag) {
                jQuery.etag[url] = etag;
            }
            return xhr.status === 304 || xhr.status === 0;
        },
        httpData: function (xhr, type, s) {
            var ct = xhr.getResponseHeader("content-type") || "",
                xml = type === "xml" || !type && ct.indexOf("xml") >= 0,
                data = xml ? xhr.responseXML : xhr.responseText;
            if (xml && data.documentElement.nodeName === "parsererror") {
                jQuery.error("parsererror");
            }
            if (s && s.dataFilter) {
                data = s.dataFilter(data, type);
            }
            if (typeof data === "string") {
                if (type === "json" || !type && ct.indexOf("json") >= 0) {
                    data = jQuery.parseJSON(data);
                } else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
                    jQuery.globalEval(data);
                }
            }
            return data;
        },
        param: function (a, traditional) {
            var s = [];
            if (traditional === undefined) {
                traditional = jQuery.ajaxSettings.traditional;
            }
            if (jQuery.isArray(a) || a.jquery) {
                jQuery.each(a, function () {
                    add(this.name, this.value);
                });
            } else {
                for (var prefix in a) {
                    buildParams(prefix, a[prefix]);
                }
            }
            return s.join("&").replace(r20, "+");

            function buildParams(prefix, obj) {
                if (jQuery.isArray(obj)) {
                    jQuery.each(obj, function (i, v) {
                        if (traditional || /\[\]$/.test(prefix)) {
                            add(prefix, v);
                        } else {
                            buildParams(prefix + "[" + (typeof v === "object" || jQuery.isArray(v) ? i : "") + "]", v);
                        }
                    });
                } else if (!traditional && obj != null && typeof obj === "object") {
                    jQuery.each(obj, function (k, v) {
                        buildParams(prefix + "[" + k + "]", v);
                    });
                } else {
                    add(prefix, obj);
                }
            }

            function add(key, value) {
                value = jQuery.isFunction(value) ? value() : value;
                s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
            }
        }
    });
    var elemdisplay = {},
        rfxtypes = /toggle|show|hide/,
        rfxnum = /^([+-]=)?([\d+-.]+)(.*)$/,
        timerId, fxAttrs = [
            ["height", "marginTop", "marginBottom", "paddingTop", "paddingBottom"],
            ["width", "marginLeft", "marginRight", "paddingLeft", "paddingRight"],
            ["opacity"]
        ];
    jQuery.fn.extend({
        show: function (speed, callback) {
            if (speed || speed === 0) {
                return this.animate(genFx("show", 3), speed, callback);
            } else {
                for (var i = 0, l = this.length; i < l; i++) {
                    var old = jQuery.data(this[i], "olddisplay");
                    this[i].style.display = old || "";
                    if (jQuery.css(this[i], "display") === "none") {
                        var nodeName = this[i].nodeName,
                            display;
                        if (elemdisplay[nodeName]) {
                            display = elemdisplay[nodeName];
                        } else {
                            var elem = jQuery("<" + nodeName + " />").appendTo("body");
                            display = elem.css("display");
                            if (display === "none") {
                                display = "block";
                            }
                            elem.remove();
                            elemdisplay[nodeName] = display;
                        }
                        jQuery.data(this[i], "olddisplay", display);
                    }
                }
                for (var j = 0, k = this.length; j < k; j++) {
                    this[j].style.display = jQuery.data(this[j], "olddisplay") || "";
                }
                return this;
            }
        },
        hide: function (speed, callback) {
            if (speed || speed === 0) {
                return this.animate(genFx("hide", 3), speed, callback);
            } else {
                for (var i = 0, l = this.length; i < l; i++) {
                    var old = jQuery.data(this[i], "olddisplay");
                    if (!old && old !== "none") {
                        jQuery.data(this[i], "olddisplay", jQuery.css(this[i], "display"));
                    }
                }
                for (var j = 0, k = this.length; j < k; j++) {
                    this[j].style.display = "none";
                }
                return this;
            }
        },
        _toggle: jQuery.fn.toggle,
        toggle: function (fn, fn2) {
            var bool = typeof fn === "boolean";
            if (jQuery.isFunction(fn) && jQuery.isFunction(fn2)) {
                this._toggle.apply(this, arguments);
            } else if (fn == null || bool) {
                this.each(function () {
                    var state = bool ? fn : jQuery(this).is(":hidden");
                    jQuery(this)[state ? "show" : "hide"]();
                });
            } else {
                this.animate(genFx("toggle", 3), fn, fn2);
            }
            return this;
        },
        fadeTo: function (speed, to, callback) {
            return this.filter(":hidden").css("opacity", 0).show().end().animate({
                opacity: to
            }, speed, callback);
        },
        animate: function (prop, speed, easing, callback) {
            var optall = jQuery.speed(speed, easing, callback);
            if (jQuery.isEmptyObject(prop)) {
                return this.each(optall.complete);
            }
            return this[optall.queue === false ? "each" : "queue"](function () {
                var opt = jQuery.extend({}, optall),
                    p, hidden = this.nodeType === 1 && jQuery(this).is(":hidden"),
                    self = this;
                for (p in prop) {
                    var name = p.replace(rdashAlpha, fcamelCase);
                    if (p !== name) {
                        prop[name] = prop[p];
                        delete prop[p];
                        p = name;
                    }
                    if (prop[p] === "hide" && hidden || prop[p] === "show" && !hidden) {
                        return opt.complete.call(this);
                    }
                    if ((p === "height" || p === "width") && this.style) {
                        opt.display = jQuery.css(this, "display");
                        opt.overflow = this.style.overflow;
                    }
                    if (jQuery.isArray(prop[p])) {
                        (opt.specialEasing = opt.specialEasing || {})[p] = prop[p][1];
                        prop[p] = prop[p][0];
                    }
                }
                if (opt.overflow != null) {
                    this.style.overflow = "hidden";
                }
                opt.curAnim = jQuery.extend({}, prop);
                jQuery.each(prop, function (name, val) {
                    var e = new jQuery.fx(self, opt, name);
                    if (rfxtypes.test(val)) {
                        e[val === "toggle" ? hidden ? "show" : "hide" : val](prop);
                    } else {
                        var parts = rfxnum.exec(val),
                            start = e.cur(true) || 0;
                        if (parts) {
                            var end = parseFloat(parts[2]),
                                unit = parts[3] || "px";
                            if (unit !== "px") {
                                self.style[name] = (end || 1) + unit;
                                start = ((end || 1) / e.cur(true)) * start;
                                self.style[name] = start + unit;
                            }
                            if (parts[1]) {
                                end = ((parts[1] === "-=" ? -1 : 1) * end) + start;
                            }
                            e.custom(start, end, unit);
                        } else {
                            e.custom(start, val, "");
                        }
                    }
                });
                return true;
            });
        },
        stop: function (clearQueue, gotoEnd) {
            var timers = jQuery.timers;
            if (clearQueue) {
                this.queue([]);
            }
            this.each(function () {
                for (var i = timers.length - 1; i >= 0; i--) {
                    if (timers[i].elem === this) {
                        if (gotoEnd) {
                            timers[i](true);
                        }
                        timers.splice(i, 1);
                    }
                }
            });
            if (!gotoEnd) {
                this.dequeue();
            }
            return this;
        }
    });
    jQuery.each({
        slideDown: genFx("show", 1),
        slideUp: genFx("hide", 1),
        slideToggle: genFx("toggle", 1),
        fadeIn: {
            opacity: "show"
        },
        fadeOut: {
            opacity: "hide"
        }
    }, function (name, props) {
        jQuery.fn[name] = function (speed, callback) {
            return this.animate(props, speed, callback);
        };
    });
    jQuery.extend({
        speed: function (speed, easing, fn) {
            var opt = speed && typeof speed === "object" ? speed : {
                complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
                duration: speed,
                easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
            };
            opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration : jQuery.fx.speeds[opt.duration] || jQuery.fx.speeds._default;
            opt.old = opt.complete;
            opt.complete = function () {
                if (opt.queue !== false) {
                    jQuery(this).dequeue();
                }
                if (jQuery.isFunction(opt.old)) {
                    opt.old.call(this);
                }
            };
            return opt;
        },
        easing: {
            linear: function (p, n, firstNum, diff) {
                return firstNum + diff * p;
            },
            swing: function (p, n, firstNum, diff) {
                return ((-Math.cos(p * Math.PI) / 2) + 0.5) * diff + firstNum;
            }
        },
        timers: [],
        fx: function (elem, options, prop) {
            this.options = options;
            this.elem = elem;
            this.prop = prop;
            if (!options.orig) {
                options.orig = {};
            }
        }
    });
    jQuery.fx.prototype = {
        update: function () {
            if (this.options.step) {
                this.options.step.call(this.elem, this.now, this);
            }(jQuery.fx.step[this.prop] || jQuery.fx.step._default)(this);
            if ((this.prop === "height" || this.prop === "width") && this.elem.style) {
                this.elem.style.display = "block";
            }
        },
        cur: function (force) {
            if (this.elem[this.prop] != null && (!this.elem.style || this.elem.style[this.prop] == null)) {
                return this.elem[this.prop];
            }
            var r = parseFloat(jQuery.css(this.elem, this.prop, force));
            return r && r > -10000 ? r : parseFloat(jQuery.curCSS(this.elem, this.prop)) || 0;
        },
        custom: function (from, to, unit) {
            this.startTime = now();
            this.start = from;
            this.end = to;
            this.unit = unit || this.unit || "px";
            this.now = this.start;
            this.pos = this.state = 0;
            var self = this;

            function t(gotoEnd) {
                return self.step(gotoEnd);
            }
            t.elem = this.elem;
            if (t() && jQuery.timers.push(t) && !timerId) {
                timerId = setInterval(jQuery.fx.tick, 13);
            }
        },
        show: function () {
            this.options.orig[this.prop] = jQuery.style(this.elem, this.prop);
            this.options.show = true;
            this.custom(this.prop === "width" || this.prop === "height" ? 1 : 0, this.cur());
            jQuery(this.elem).show();
        },
        hide: function () {
            this.options.orig[this.prop] = jQuery.style(this.elem, this.prop);
            this.options.hide = true;
            this.custom(this.cur(), 0);
        },
        step: function (gotoEnd) {
            var t = now(),
                done = true;
            if (gotoEnd || t >= this.options.duration + this.startTime) {
                this.now = this.end;
                this.pos = this.state = 1;
                this.update();
                this.options.curAnim[this.prop] = true;
                for (var i in this.options.curAnim) {
                    if (this.options.curAnim[i] !== true) {
                        done = false;
                    }
                }
                if (done) {
                    if (this.options.display != null) {
                        this.elem.style.overflow = this.options.overflow;
                        var old = jQuery.data(this.elem, "olddisplay");
                        this.elem.style.display = old ? old : this.options.display;
                        if (jQuery.css(this.elem, "display") === "none") {
                            this.elem.style.display = "block";
                        }
                    }
                    if (this.options.hide) {
                        jQuery(this.elem).hide();
                    }
                    if (this.options.hide || this.options.show) {
                        for (var p in this.options.curAnim) {
                            jQuery.style(this.elem, p, this.options.orig[p]);
                        }
                    }
                    this.options.complete.call(this.elem);
                }
                return false;
            } else {
                var n = t - this.startTime;
                this.state = n / this.options.duration;
                var specialEasing = this.options.specialEasing && this.options.specialEasing[this.prop];
                var defaultEasing = this.options.easing || (jQuery.easing.swing ? "swing" : "linear");
                this.pos = jQuery.easing[specialEasing || defaultEasing](this.state, n, 0, 1, this.options.duration);
                this.now = this.start + ((this.end - this.start) * this.pos);
                this.update();
            }
            return true;
        }
    };
    jQuery.extend(jQuery.fx, {
        tick: function () {
            var timers = jQuery.timers;
            for (var i = 0; i < timers.length; i++) {
                if (!timers[i]()) {
                    timers.splice(i--, 1);
                }
            }
            if (!timers.length) {
                jQuery.fx.stop();
            }
        },
        stop: function () {
            clearInterval(timerId);
            timerId = null;
        },
        speeds: {
            slow: 600,
            fast: 200,
            _default: 400
        },
        step: {
            opacity: function (fx) {
                jQuery.style(fx.elem, "opacity", fx.now);
            },
            _default: function (fx) {
                if (fx.elem.style && fx.elem.style[fx.prop] != null) {
                    fx.elem.style[fx.prop] = (fx.prop === "width" || fx.prop === "height" ? Math.max(0, fx.now) : fx.now) + fx.unit;
                } else {
                    fx.elem[fx.prop] = fx.now;
                }
            }
        }
    });
    if (jQuery.expr && jQuery.expr.filters) {
        jQuery.expr.filters.animated = function (elem) {
            return jQuery.grep(jQuery.timers, function (fn) {
                return elem === fn.elem;
            }).length;
        };
    }

    function genFx(type, num) {
        var obj = {};
        jQuery.each(fxAttrs.concat.apply([], fxAttrs.slice(0, num)), function () {
            obj[this] = type;
        });
        return obj;
    }
    if ("getBoundingClientRect" in document.documentElement) {
        jQuery.fn.offset = function (options) {
            var elem = this[0];
            if (options) {
                return this.each(function (i) {
                    jQuery.offset.setOffset(this, options, i);
                });
            }
            if (!elem || !elem.ownerDocument) {
                return null;
            }
            if (elem === elem.ownerDocument.body) {
                return jQuery.offset.bodyOffset(elem);
            }
            var box = elem.getBoundingClientRect(),
                doc = elem.ownerDocument,
                body = doc.body,
                docElem = doc.documentElement,
                clientTop = docElem.clientTop || body.clientTop || 0,
                clientLeft = docElem.clientLeft || body.clientLeft || 0,
                top = box.top + (self.pageYOffset || jQuery.support.boxModel && docElem.scrollTop || body.scrollTop) - clientTop,
                left = box.left + (self.pageXOffset || jQuery.support.boxModel && docElem.scrollLeft || body.scrollLeft) - clientLeft;
            return {
                top: top,
                left: left
            };
        };
    } else {
        jQuery.fn.offset = function (options) {
            var elem = this[0];
            if (options) {
                return this.each(function (i) {
                    jQuery.offset.setOffset(this, options, i);
                });
            }
            if (!elem || !elem.ownerDocument) {
                return null;
            }
            if (elem === elem.ownerDocument.body) {
                return jQuery.offset.bodyOffset(elem);
            }
            jQuery.offset.initialize();
            var offsetParent = elem.offsetParent,
                prevOffsetParent = elem,
                doc = elem.ownerDocument,
                computedStyle, docElem = doc.documentElement,
                body = doc.body,
                defaultView = doc.defaultView,
                prevComputedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle,
                top = elem.offsetTop,
                left = elem.offsetLeft;
            while ((elem = elem.parentNode) && elem !== body && elem !== docElem) {
                if (jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed") {
                    break;
                }
                computedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle;
                top -= elem.scrollTop;
                left -= elem.scrollLeft;
                if (elem === offsetParent) {
                    top += elem.offsetTop;
                    left += elem.offsetLeft;
                    if (jQuery.offset.doesNotAddBorder && !(jQuery.offset.doesAddBorderForTableAndCells && /^t(able|d|h)$/i.test(elem.nodeName))) {
                        top += parseFloat(computedStyle.borderTopWidth) || 0;
                        left += parseFloat(computedStyle.borderLeftWidth) || 0;
                    }
                    prevOffsetParent = offsetParent, offsetParent = elem.offsetParent;
                }
                if (jQuery.offset.subtractsBorderForOverflowNotVisible && computedStyle.overflow !== "visible") {
                    top += parseFloat(computedStyle.borderTopWidth) || 0;
                    left += parseFloat(computedStyle.borderLeftWidth) || 0;
                }
                prevComputedStyle = computedStyle;
            }
            if (prevComputedStyle.position === "relative" || prevComputedStyle.position === "static") {
                top += body.offsetTop;
                left += body.offsetLeft;
            }
            if (jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed") {
                top += Math.max(docElem.scrollTop, body.scrollTop);
                left += Math.max(docElem.scrollLeft, body.scrollLeft);
            }
            return {
                top: top,
                left: left
            };
        };
    }
    jQuery.offset = {
        initialize: function () {
            var body = document.body,
                container = document.createElement("div"),
                innerDiv, checkDiv, table, td, bodyMarginTop = parseFloat(jQuery.curCSS(body, "marginTop", true)) || 0,
                html = "<div style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;'><div></div></div><table style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;' cellpadding='0' cellspacing='0'><tr><td></td></tr></table>";
            jQuery.extend(container.style, {
                position: "absolute",
                top: 0,
                left: 0,
                margin: 0,
                border: 0,
                width: "1px",
                height: "1px",
                visibility: "hidden"
            });
            container.innerHTML = html;
            body.insertBefore(container, body.firstChild);
            innerDiv = container.firstChild;
            checkDiv = innerDiv.firstChild;
            td = innerDiv.nextSibling.firstChild.firstChild;
            this.doesNotAddBorder = (checkDiv.offsetTop !== 5);
            this.doesAddBorderForTableAndCells = (td.offsetTop === 5);
            checkDiv.style.position = "fixed", checkDiv.style.top = "20px";
            this.supportsFixedPosition = (checkDiv.offsetTop === 20 || checkDiv.offsetTop === 15);
            checkDiv.style.position = checkDiv.style.top = "";
            innerDiv.style.overflow = "hidden", innerDiv.style.position = "relative";
            this.subtractsBorderForOverflowNotVisible = (checkDiv.offsetTop === -5);
            this.doesNotIncludeMarginInBodyOffset = (body.offsetTop !== bodyMarginTop);
            body.removeChild(container);
            body = container = innerDiv = checkDiv = table = td = null;
            jQuery.offset.initialize = jQuery.noop;
        },
        bodyOffset: function (body) {
            var top = body.offsetTop,
                left = body.offsetLeft;
            jQuery.offset.initialize();
            if (jQuery.offset.doesNotIncludeMarginInBodyOffset) {
                top += parseFloat(jQuery.curCSS(body, "marginTop", true)) || 0;
                left += parseFloat(jQuery.curCSS(body, "marginLeft", true)) || 0;
            }
            return {
                top: top,
                left: left
            };
        },
        setOffset: function (elem, options, i) {
            if (/static/.test(jQuery.curCSS(elem, "position"))) {
                elem.style.position = "relative";
            }
            var curElem = jQuery(elem),
                curOffset = curElem.offset(),
                curTop = parseInt(jQuery.curCSS(elem, "top", true), 10) || 0,
                curLeft = parseInt(jQuery.curCSS(elem, "left", true), 10) || 0;
            if (jQuery.isFunction(options)) {
                options = options.call(elem, i, curOffset);
            }
            var props = {
                top: (options.top - curOffset.top) + curTop,
                left: (options.left - curOffset.left) + curLeft
            };
            if ("using" in options) {
                options.using.call(elem, props);
            } else {
                curElem.css(props);
            }
        }
    };
    jQuery.fn.extend({
        position: function () {
            if (!this[0]) {
                return null;
            }
            var elem = this[0],
                offsetParent = this.offsetParent(),
                offset = this.offset(),
                parentOffset = /^body|html$/i.test(offsetParent[0].nodeName) ? {
                    top: 0,
                    left: 0
                } : offsetParent.offset();
            offset.top -= parseFloat(jQuery.curCSS(elem, "marginTop", true)) || 0;
            offset.left -= parseFloat(jQuery.curCSS(elem, "marginLeft", true)) || 0;
            parentOffset.top += parseFloat(jQuery.curCSS(offsetParent[0], "borderTopWidth", true)) || 0;
            parentOffset.left += parseFloat(jQuery.curCSS(offsetParent[0], "borderLeftWidth", true)) || 0;
            return {
                top: offset.top - parentOffset.top,
                left: offset.left - parentOffset.left
            };
        },
        offsetParent: function () {
            return this.map(function () {
                var offsetParent = this.offsetParent || document.body;
                while (offsetParent && (!/^body|html$/i.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static")) {
                    offsetParent = offsetParent.offsetParent;
                }
                return offsetParent;
            });
        }
    });
    jQuery.each(["Left", "Top"], function (i, name) {
        var method = "scroll" + name;
        jQuery.fn[method] = function (val) {
            var elem = this[0],
                win;
            if (!elem) {
                return null;
            }
            if (val !== undefined) {
                return this.each(function () {
                    win = getWindow(this);
                    if (win) {
                        win.scrollTo(!i ? val : jQuery(win).scrollLeft(), i ? val : jQuery(win).scrollTop());
                    } else {
                        this[method] = val;
                    }
                });
            } else {
                win = getWindow(elem);
                return win ? ("pageXOffset" in win) ? win[i ? "pageYOffset" : "pageXOffset"] : jQuery.support.boxModel && win.document.documentElement[method] || win.document.body[method] : elem[method];
            }
        };
    });

    function getWindow(elem) {
        return ("scrollTo" in elem && elem.document) ? elem : elem.nodeType === 9 ? elem.defaultView || elem.parentWindow : false;
    }
    jQuery.each(["Height", "Width"], function (i, name) {
        var type = name.toLowerCase();
        jQuery.fn["inner" + name] = function () {
            return this[0] ? jQuery.css(this[0], type, false, "padding") : null;
        };
        jQuery.fn["outer" + name] = function (margin) {
            return this[0] ? jQuery.css(this[0], type, false, margin ? "margin" : "border") : null;
        };
        jQuery.fn[type] = function (size) {
            var elem = this[0];
            if (!elem) {
                return size == null ? null : this;
            }
            if (jQuery.isFunction(size)) {
                return this.each(function (i) {
                    var self = jQuery(this);
                    self[type](size.call(this, i, self[type]()));
                });
            }
            return ("scrollTo" in elem && elem.document) ? elem.document.compatMode === "CSS1Compat" && elem.document.documentElement["client" + name] || elem.document.body["client" + name] : (elem.nodeType === 9) ? Math.max(elem.documentElement["client" + name], elem.body["scroll" + name], elem.documentElement["scroll" + name], elem.body["offset" + name], elem.documentElement["offset" + name]) : size === undefined ? jQuery.css(elem, type) : this.css(type, typeof size === "string" ? size : size + "px");
        };
    });
    window.jQuery = window.$ = jQuery;
})(window);
(function ($) {
    $.fn.hoverIntent = function (f, g) {
        var cfg = {
            sensitivity: 7,
            interval: 100,
            timeout: 0
        };
        cfg = $.extend(cfg, g ? {
            over: f,
            out: g
        } : f);
        var cX, cY, pX, pY;
        var track = function (ev) {
            cX = ev.pageX;
            cY = ev.pageY;
        };
        var compare = function (ev, ob) {
            ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
            if ((Math.abs(pX - cX) + Math.abs(pY - cY)) < cfg.sensitivity) {
                $(ob).unbind("mousemove", track);
                ob.hoverIntent_s = 1;
                return cfg.over.apply(ob, [ev]);
            } else {
                pX = cX;
                pY = cY;
                ob.hoverIntent_t = setTimeout(function () {
                    compare(ev, ob);
                }, cfg.interval);
            }
        };
        var delay = function (ev, ob) {
            ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
            ob.hoverIntent_s = 0;
            return cfg.out.apply(ob, [ev]);
        };
        var handleHover = function (e) {
            var p = (e.type == "mouseover" ? e.fromElement : e.toElement) || e.relatedTarget;
            while (p && p != this) {
                try {
                    p = p.parentNode;
                } catch (e) {
                    p = this;
                }
            }
            if (p == this) {
                return false;
            }
            var ev = $.extend({}, e);
            var ob = this;
            if (ob.hoverIntent_t) {
                ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
            }
            if (e.type == "mouseover") {
                pX = ev.pageX;
                pY = ev.pageY;
                $(ob).bind("mousemove", track);
                if (ob.hoverIntent_s != 1) {
                    ob.hoverIntent_t = setTimeout(function () {
                        compare(ev, ob);
                    }, cfg.interval);
                }
            } else {
                $(ob).unbind("mousemove", track);
                if (ob.hoverIntent_s == 1) {
                    ob.hoverIntent_t = setTimeout(function () {
                        delay(ev, ob);
                    }, cfg.timeout);
                }
            }
        };
        return this.mouseover(handleHover).mouseout(handleHover);
    };
})(jQuery);;
(function ($) {
    var ua = navigator.userAgent;
    var moz = $.browser.mozilla && /gecko/i.test(ua);
    var webkit = $.browser.safari && /Safari\/[5-9]/.test(ua);
    var expr = $.browser.msie && (function () {
        var div = document.createElement('div');
        try {
            div.style.setExpression('width', '0+0');
            div.style.removeExpression('width');
        } catch (e) {
            return false;
        }
        return true;
    })();

    function sz(el, p) {
        return parseInt($.css(el, p)) || 0;
    };

    function hex2(s) {
        var s = parseInt(s).toString(16);
        return (s.length < 2) ? '0' + s : s;
    };

    function gpc(node) {
        for (; node && node.nodeName.toLowerCase() != 'html'; node = node.parentNode) {
            var v = $.css(node, 'backgroundColor');
            if (v == 'rgba(0, 0, 0, 0)') continue;
            if (v.indexOf('rgb') >= 0) {
                var rgb = v.match(/\d+/g);
                return '#' + hex2(rgb[0]) + hex2(rgb[1]) + hex2(rgb[2]);
            }
            if (v && v != 'transparent') return v;
        }
        return '#ffffff';
    };

    function getWidth(fx, i, width) {
        switch (fx) {
        case 'round':
            return Math.round(width * (1 - Math.cos(Math.asin(i / width))));
        case 'cool':
            return Math.round(width * (1 + Math.cos(Math.asin(i / width))));
        case 'sharp':
            return Math.round(width * (1 - Math.cos(Math.acos(i / width))));
        case 'bite':
            return Math.round(width * (Math.cos(Math.asin((width - i - 1) / width))));
        case 'slide':
            return Math.round(width * (Math.atan2(i, width / i)));
        case 'jut':
            return Math.round(width * (Math.atan2(width, (width - i - 1))));
        case 'curl':
            return Math.round(width * (Math.atan(i)));
        case 'tear':
            return Math.round(width * (Math.cos(i)));
        case 'wicked':
            return Math.round(width * (Math.tan(i)));
        case 'long':
            return Math.round(width * (Math.sqrt(i)));
        case 'sculpt':
            return Math.round(width * (Math.log((width - i - 1), width)));
        case 'dog':
            return (i & 1) ? (i + 1) : width;
        case 'dog2':
            return (i & 2) ? (i + 1) : width;
        case 'dog3':
            return (i & 3) ? (i + 1) : width;
        case 'fray':
            return (i % 2) * width;
        case 'notch':
            return width;
        case 'bevel':
            return i + 1;
        }
    };
    $.fn.corner = function (options) {
        if (this.length == 0) {
            if (!$.isReady && this.selector) {
                var s = this.selector,
                    c = this.context;
                $(function () {
                    $(s, c).corner(options);
                });
            }
            return this;
        }
        return this.each(function (index) {
            var $this = $(this);
            var o = [options || '', $this.attr($.fn.corner.defaults.metaAttr) || ''].join(' ').toLowerCase();
            var keep = /keep/.test(o);
            var cc = ((o.match(/cc:(#[0-9a-f]+)/) || [])[1]);
            var sc = ((o.match(/sc:(#[0-9a-f]+)/) || [])[1]);
            var width = parseInt((o.match(/(\d+)px/) || [])[1]) || 10;
            var re = /round|bevel|notch|bite|cool|sharp|slide|jut|curl|tear|fray|wicked|sculpt|long|dog3|dog2|dog/;
            var fx = ((o.match(re) || ['round'])[0]);
            var edges = {
                T: 0,
                B: 1
            };
            var opts = {
                TL: /top|tl|left/.test(o),
                TR: /top|tr|right/.test(o),
                BL: /bottom|bl|left/.test(o),
                BR: /bottom|br|right/.test(o)
            };
            if (!opts.TL && !opts.TR && !opts.BL && !opts.BR) opts = {
                TL: 1,
                TR: 1,
                BL: 1,
                BR: 1
            };
            if ($.fn.corner.defaults.useNative && fx == 'round' && (moz || webkit) && !cc && !sc) {
                if (opts.TL) $this.css(moz ? '-moz-border-radius-topleft' : '-webkit-border-top-left-radius', width + 'px');
                if (opts.TR) $this.css(moz ? '-moz-border-radius-topright' : '-webkit-border-top-right-radius', width + 'px');
                if (opts.BL) $this.css(moz ? '-moz-border-radius-bottomleft' : '-webkit-border-bottom-left-radius', width + 'px');
                if (opts.BR) $this.css(moz ? '-moz-border-radius-bottomright' : '-webkit-border-bottom-right-radius', width + 'px');
                return;
            }
            var strip = document.createElement('div');
            strip.style.overflow = 'hidden';
            strip.style.height = '1px';
            strip.style.backgroundColor = sc || 'transparent';
            strip.style.borderStyle = 'solid';
            var pad = {
                T: parseInt($.css(this, 'paddingTop')) || 0,
                R: parseInt($.css(this, 'paddingRight')) || 0,
                B: parseInt($.css(this, 'paddingBottom')) || 0,
                L: parseInt($.css(this, 'paddingLeft')) || 0
            };
            if (typeof this.style.zoom != undefined) this.style.zoom = 1;
            if (!keep) this.style.border = 'none';
            strip.style.borderColor = cc || gpc(this.parentNode);
            var cssHeight = $.curCSS(this, 'height');
            for (var j in edges) {
                var bot = edges[j];
                if ((bot && (opts.BL || opts.BR)) || (!bot && (opts.TL || opts.TR))) {
                    strip.style.borderStyle = 'none ' + (opts[j + 'R'] ? 'solid' : 'none') + ' none ' + (opts[j + 'L'] ? 'solid' : 'none');
                    var d = document.createElement('div');
                    $(d).addClass('jquery-corner');
                    var ds = d.style;
                    bot ? this.appendChild(d) : this.insertBefore(d, this.firstChild);
                    if (bot && cssHeight != 'auto') {
                        if ($.css(this, 'position') == 'static') this.style.position = 'relative';
                        ds.position = 'absolute';
                        ds.bottom = ds.left = ds.padding = ds.margin = '0';
                        if (expr) ds.setExpression('width', 'this.parentNode.offsetWidth');
                        else
                        ds.width = '100%';
                    } else if (!bot && $.browser.msie) {
                        if ($.css(this, 'position') == 'static') this.style.position = 'relative';
                        ds.position = 'absolute';
                        ds.top = ds.left = ds.right = ds.padding = ds.margin = '0';
                        if (expr) {
                            var bw = sz(this, 'borderLeftWidth') + sz(this, 'borderRightWidth');
                            ds.setExpression('width', 'this.parentNode.offsetWidth - ' + bw + '+ "px"');
                        } else
                        ds.width = '100%';
                    } else {
                        ds.position = 'relative';
                        ds.margin = !bot ? '-' + pad.T + 'px -' + pad.R + 'px ' + (pad.T - width) + 'px -' + pad.L + 'px' : (pad.B - width) + 'px -' + pad.R + 'px -' + pad.B + 'px -' + pad.L + 'px';
                    }
                    for (var i = 0; i < width; i++) {
                        var w = Math.max(0, getWidth(fx, i, width));
                        var e = strip.cloneNode(false);
                        e.style.borderWidth = '0 ' + (opts[j + 'R'] ? w : 0) + 'px 0 ' + (opts[j + 'L'] ? w : 0) + 'px';
                        bot ? d.appendChild(e) : d.insertBefore(e, d.firstChild);
                    }
                }
            }
        });
    };
    $.fn.uncorner = function () {
        if (moz || webkit) this.css(moz ? '-moz-border-radius' : '-webkit-border-radius', 0);
        $('div.jquery-corner', this).remove();
        return this;
    };
    $.fn.corner.defaults = {
        useNative: true,
        metaAttr: 'data-corner'
    };
})(jQuery);
(function ($) {
    $.extend($.fn, {
        clearingInput: function (options) {
            var defaults = {
                blurClass: 'blur'
            };
            options = $.extend(defaults, options);
            return this.each(function () {
                var input = $(this);
                var form = input.parents('form:first');
                var save_control = form.find('#' + options.saveControl);
                var label, text;
                text = options.text || textFromLabel() || input.val();
                if (text) {
                    input.blur(function () {
                        if (input.val() === '') {
                            input.addClass(options.blurClass).val(text);
                            save_control.hide();
                        }
                    }).focus(function () {
                        if (input.val() === text) {
                            input.val('');
                        }
                        input.removeClass(options.blurClass);
                        save_control.show();
                    });
                    form.submit(function () {
                        if (input.hasClass(options.blurClass)) {
                            input.val('');
                        }
                    });
                    input.blur();
                }

                function textFromLabel() {
                    label = form.find('label[for=' + input.attr('id') + ']');
                    return label.css({
                        position: 'absolute',
                        left: '-9999px'
                    }).text();
                }
            });
        }
    });
})(jQuery);
(function ($) {
    var dark_cover_id = "jquery-centeredpopup-dark-cover";

    function getWidthAndHeight(_window) {
        var width = 0,
            height = 0,
            elem = null;
        if (_window == window.screen) {
            width = window.screen.width;
            height = window.screen.height;
        } else if ('innerWidth' in _window) {
            width = _window.innerWidth;
            height = _window.innerHeight;
        } else {
            if (('BackCompat' === _window.document.compatMode) && ('body' in _window.document)) {
                elem = _window.document.body;
            } else if ('documentElement' in _window.document) {
                elem = _window.document._window.documentElement;
            }
            if (elem !== null) {
                width = elem.offsetWidth;
                height = elem.offsetHeight;
            }
        }
        return [width, height];
    }

    function getLeftAndTop(_window) {
        var left = 0,
            top = 0;
        if (_window == window.screen) {
            left = 0;
            top = 0;
        } else if ('screenLeft' in _window) {
            left = _window.screenLeft;
            top = _window.screenTop;
        } else if ('screenX' in _window) {
            left = _window.screenX;
            top = _window.screenY;
        }
        return [left, top];
    }

    function getCenteredCoords(width, height, _window) {
        var parentSize = getWidthAndHeight(_window),
            parentPos = getLeftAndTop(_window),
            xPos = parentPos[0] + Math.max(0, Math.floor((parentSize[0] - width) / 2)),
            yPos = parentPos[1] + Math.max(0, Math.floor((parentSize[1] - height) / 2));
        return [xPos, yPos];
    }

    function darkenScreen() {
        if (!$("#" + dark_cover_id)[0]) {
            var dark_cover = $("<div>");
            dark_cover.attr("id", dark_cover_id);
            dark_cover.css({
                "position": "absolute",
                "top": "0px",
                "left": "0px",
                "width": "100%",
                "height": $(document).height() + "px",
                "padding": "0px",
                "margin": "0px",
                "background": "black",
                "opacity": "0.5",
                "-moz-opacity": "0.5",
                "filter": "alpha(opacity=0.5)",
                "z-index": "9999"
            }).hide();
            $("body").append(dark_cover);
            dark_cover.fadeIn();
        }
    }

    function lightenScreen() {
        $("#" + dark_cover_id).fadeOut(400, function () {
            $(this).remove();
        });
    }

    function popup(params) {
        if (params.modal) {
            darkenScreen();
        }
        var popup_window = window.open(params.url, params.name, ["width=" + params.width, "height=" + params.height, "left=" + params.left, "top=" + params.top, params.properties].join(",")),
            interval = setInterval(function () {
                if (!popup_window || popup_window.closed) {
                    clearInterval(interval);
                    if (params.modal) {
                        lightenScreen();
                    }
                    if (params.callback) {
                        params.callback();
                    }
                }
            }, 50);
    }
    $.centeredPopup = function (params) {
        var coordinates;
        if (typeof params === 'string') {
            params = {
                url: params
            };
        }
        params = $.extend({
            url: '',
            name: '',
            width: 600,
            height: 450,
            modal: false,
            properties: "status=1,location=1,resizable=yes",
            relative_to: params.relative_to || window.top,
            callback: function () {}
        }, params);
        coordinates = getCenteredCoords(params.width, params.height, params.relative_to);
        params = $.extend({
            left: coordinates[0],
            top: coordinates[1]
        }, params);
        popup(params);
    };
}(jQuery));
(function ($, setTimeout) {
    function noop() {}

    function genericCallback(data) {
        lastValue = [data];
    }

    function appendScript(node) {
        head.insertBefore(node, head.firstChild);
    }

    function callIfDefined(method, object, parameters) {
        return method && method.apply(object.context || object, parameters);
    }

    function qMarkOrAmp(url) {
        return (/\?/).test(url) ? "&" : "?";
    }
    var
    STR_ASYNC = "async",
        STR_CHARSET = "charset",
        STR_EMPTY = "",
        STR_ERROR = "error",
        STR_JQUERY_JSONP = "_jqjsp",
        STR_ON = "on",
        STR_ONCLICK = STR_ON + "click",
        STR_ONERROR = STR_ON + STR_ERROR,
        STR_ONLOAD = STR_ON + "load",
        STR_ONREADYSTATECHANGE = STR_ON + "readystatechange",
        STR_REMOVE_CHILD = "removeChild",
        STR_SCRIPT_TAG = "<script/>",
        STR_SUCCESS = "success",
        STR_TIMEOUT = "timeout",
        browser = $.browser,
        head = $("head")[0] || document.documentElement,
        pageCache = {},
        count = 0,
        lastValue, xOptionsDefaults = {
            callback: STR_JQUERY_JSONP,
            url: location.href
        };

    function jsonp(xOptions) {
        xOptions = $.extend({}, xOptionsDefaults, xOptions);
        var completeCallback = xOptions.complete,
            dataFilter = xOptions.dataFilter,
            callbackParameter = xOptions.callbackParameter,
            successCallbackName = xOptions.callback,
            cacheFlag = xOptions.cache,
            pageCacheFlag = xOptions.pageCache,
            charset = xOptions.charset,
            url = xOptions.url,
            data = xOptions.data,
            timeout = xOptions.timeout,
            pageCached, done = 0,
            cleanUp = noop;
        xOptions.abort = function () {
            !done++ && cleanUp();
        };
        if (callIfDefined(xOptions.beforeSend, xOptions, [xOptions]) === false || done) {
            return xOptions;
        }
        url = url || STR_EMPTY;
        data = data ? ((typeof data) == "string" ? data : $.param(data, xOptions.traditional)) : STR_EMPTY;
        url += data ? (qMarkOrAmp(url) + data) : STR_EMPTY;
        callbackParameter && (url += qMarkOrAmp(url) + escape(callbackParameter) + "=?");
        !cacheFlag && !pageCacheFlag && (url += qMarkOrAmp(url) + "_" + (new Date()).getTime() + "=");
        url = url.replace(/=\?(&|$)/, "=" + successCallbackName + "$1");

        function notifySuccess(json) {
            !done++ && setTimeout(function () {
                cleanUp();
                pageCacheFlag && (pageCache[url] = {
                    s: [json]
                });
                dataFilter && (json = dataFilter.apply(xOptions, [json]));
                callIfDefined(xOptions.success, xOptions, [json, STR_SUCCESS]);
                callIfDefined(completeCallback, xOptions, [xOptions, STR_SUCCESS]);
            }, 0);
        }

        function notifyError(type) {
            !done++ && setTimeout(function () {
                cleanUp();
                pageCacheFlag && type != STR_TIMEOUT && (pageCache[url] = type);
                callIfDefined(xOptions.error, xOptions, [xOptions, type]);
                callIfDefined(completeCallback, xOptions, [xOptions, type]);
            }, 0);
        }
        pageCacheFlag && (pageCached = pageCache[url]) ? (pageCached.s ? notifySuccess(pageCached.s[0]) : notifyError(pageCached)) : setTimeout(function (script, scriptAfter, timeoutTimer) {
            if (!done) {
                timeoutTimer = timeout > 0 && setTimeout(function () {
                    notifyError(STR_TIMEOUT);
                }, timeout);
                cleanUp = function () {
                    timeoutTimer && clearTimeout(timeoutTimer);
                    script[STR_ONREADYSTATECHANGE] = script[STR_ONCLICK] = script[STR_ONLOAD] = script[STR_ONERROR] = null;
                    head[STR_REMOVE_CHILD](script);
                    scriptAfter && head[STR_REMOVE_CHILD](scriptAfter);
                };
                window[successCallbackName] = genericCallback;
                script = $(STR_SCRIPT_TAG)[0];
                script.id = STR_JQUERY_JSONP + count++;
                if (charset) {
                    script[STR_CHARSET] = charset;
                }

                function callback(result) {
                    (script[STR_ONCLICK] || noop)();
                    result = lastValue;
                    lastValue = undefined;
                    result ? notifySuccess(result[0]) : notifyError(STR_ERROR);
                }
                if (browser.msie) {
                    script.event = STR_ONCLICK;
                    script.htmlFor = script.id;
                    script[STR_ONREADYSTATECHANGE] = function () {
                        script.readyState == "loaded" && callback();
                    };
                } else {
                    script[STR_ONERROR] = script[STR_ONLOAD] = callback;
                    if (browser.opera) {
                        scriptAfter = document.createElement("script");
                        scriptAfter.text = "document.getElementById('" + script.id + "')." + STR_ONERROR + "()";
                    } else {
                        script[STR_ASYNC] = STR_ASYNC;
                    }
                }
                script.src = url;
                appendScript(script);
                scriptAfter && appendScript(scriptAfter);
            }
        }, 0);
        return xOptions;
    }
    jsonp.setup = function (xOptions) {
        $.extend(xOptionsDefaults, xOptions);
    };
    $.jsonp = jsonp;
})(jQuery, setTimeout);
(function ($) {
    $.toJSON = function (o) {
        if (typeof(JSON) == 'object' && JSON.stringify) return JSON.stringify(o);
        var type = typeof(o);
        if (o === null) return "null";
        if (type == "undefined") return undefined;
        if (type == "number" || type == "boolean") return o + "";
        if (type == "string") return $.quoteString(o);
        if (type == 'object') {
            if (typeof o.toJSON == "function") return $.toJSON(o.toJSON());
            if (o.constructor === Date) {
                var month = o.getUTCMonth() + 1;
                if (month < 10) month = '0' + month;
                var day = o.getUTCDate();
                if (day < 10) day = '0' + day;
                var year = o.getUTCFullYear();
                var hours = o.getUTCHours();
                if (hours < 10) hours = '0' + hours;
                var minutes = o.getUTCMinutes();
                if (minutes < 10) minutes = '0' + minutes;
                var seconds = o.getUTCSeconds();
                if (seconds < 10) seconds = '0' + seconds;
                var milli = o.getUTCMilliseconds();
                if (milli < 100) milli = '0' + milli;
                if (milli < 10) milli = '0' + milli;
                return '"' + year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + '.' + milli + 'Z"';
            }
            if (o.constructor === Array) {
                var ret = [];
                for (var i = 0; i < o.length; i++)
                ret.push($.toJSON(o[i]) || "null");
                return "[" + ret.join(",") + "]";
            }
            var pairs = [];
            for (var k in o) {
                var name;
                var type = typeof k;
                if (type == "number") name = '"' + k + '"';
                else if (type == "string") name = $.quoteString(k);
                else
                continue;
                if (typeof o[k] == "function") continue;
                var val = $.toJSON(o[k]);
                pairs.push(name + ":" + val);
            }
            return "{" + pairs.join(", ") + "}";
        }
    };
    $.evalJSON = function (src) {
        if (typeof(JSON) == 'object' && JSON.parse) return JSON.parse(src);
        return eval("(" + src + ")");
    };
    $.secureEvalJSON = function (src) {
        if (typeof(JSON) == 'object' && JSON.parse) return JSON.parse(src);
        var filtered = src;
        filtered = filtered.replace(/\\["\\\/bfnrtu]/g, '@');
        filtered = filtered.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
        filtered = filtered.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
        if (/^[\],:{}\s]*$/.test(filtered)) return eval("(" + src + ")");
        else
        throw new SyntaxError("Error parsing JSON, source is not valid.");
    };
    $.quoteString = function (string) {
        if (string.match(_escapeable)) {
            return '"' + string.replace(_escapeable, function (a) {
                var c = _meta[a];
                if (typeof c === 'string') return c;
                c = a.charCodeAt();
                return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            }) + '"';
        }
        return '"' + string + '"';
    };
    var _escapeable = /["\\\x00-\x1f\x7f-\x9f]/g;
    var _meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"': '\\"',
        '\\': '\\\\'
    };
})(jQuery);;
(function ($) {
    $.fn.ajaxSubmit = function (options) {
        if (!this.length) {
            log('ajaxSubmit: skipping submit process - no element selected');
            return this;
        }
        if (typeof options == 'function') options = {
            success: options
        };
        var url = $.trim(this.attr('action'));
        if (url) {
            url = (url.match(/^([^#]+)/) || [])[1];
        }
        url = url || window.location.href || '';
        options = $.extend({
            url: url,
            type: this.attr('method') || 'GET',
            iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank'
        }, options || {});
        var veto = {};
        this.trigger('form-pre-serialize', [this, options, veto]);
        if (veto.veto) {
            log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
            return this;
        }
        if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
            log('ajaxSubmit: submit aborted via beforeSerialize callback');
            return this;
        }
        var a = this.formToArray(options.semantic);
        if (options.data) {
            options.extraData = options.data;
            for (var n in options.data) {
                if (options.data[n] instanceof Array) {
                    for (var k in options.data[n])
                    a.push({
                        name: n,
                        value: options.data[n][k]
                    });
                } else
                a.push({
                    name: n,
                    value: options.data[n]
                });
            }
        }
        if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
            log('ajaxSubmit: submit aborted via beforeSubmit callback');
            return this;
        }
        this.trigger('form-submit-validate', [a, this, options, veto]);
        if (veto.veto) {
            log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
            return this;
        }
        var q = $.param(a);
        if (options.type.toUpperCase() == 'GET') {
            options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
            options.data = null;
        } else
        options.data = q;
        var $form = this,
            callbacks = [];
        if (options.resetForm) callbacks.push(function () {
            $form.resetForm();
        });
        if (options.clearForm) callbacks.push(function () {
            $form.clearForm();
        });
        if (!options.dataType && options.target) {
            var oldSuccess = options.success ||
            function () {};
            callbacks.push(function (data) {
                $(options.target).html(data).each(oldSuccess, arguments);
            });
        } else if (options.success) callbacks.push(options.success);
        options.success = function (data, status) {
            for (var i = 0, max = callbacks.length; i < max; i++)
            callbacks[i].apply(options, [data, status, $form]);
        };
        var files = $('input:file', this).fieldValue();
        var found = false;
        for (var j = 0; j < files.length; j++)
        if (files[j]) found = true;
        var multipart = false;
        if ((files.length && options.iframe !== false) || options.iframe || found || multipart) {
            if (options.closeKeepAlive) $.get(options.closeKeepAlive, fileUpload);
            else
            fileUpload();
        } else
        $.ajax(options);
        this.trigger('form-submit-notify', [this, options]);
        return this;

        function fileUpload() {
            var form = $form[0];
            if ($(':input[name=submit]', form).length) {
                alert('Error: Form elements must not be named "submit".');
                return;
            }
            var opts = $.extend({}, $.ajaxSettings, options);
            var s = $.extend(true, {}, $.extend(true, {}, $.ajaxSettings), opts);
            var id = 'jqFormIO' + (new Date().getTime());
            var $io = $('<iframe id="' + id + '" name="' + id + '" src="' + opts.iframeSrc + '" />');
            var io = $io[0];
            $io.css({
                position: 'absolute',
                top: '-1000px',
                left: '-1000px'
            });
            var xhr = {
                aborted: 0,
                responseText: null,
                responseXML: null,
                status: 0,
                statusText: 'n/a',
                getAllResponseHeaders: function () {},
                getResponseHeader: function () {},
                setRequestHeader: function () {},
                abort: function () {
                    this.aborted = 1;
                    $io.attr('src', opts.iframeSrc);
                }
            };
            var g = opts.global;
            if (g && !$.active++) $.event.trigger("ajaxStart");
            if (g) $.event.trigger("ajaxSend", [xhr, opts]);
            if (s.beforeSend && s.beforeSend(xhr, s) === false) {
                s.global && $.active--;
                return;
            }
            if (xhr.aborted) return;
            var cbInvoked = 0;
            var timedOut = 0;
            var sub = form.clk;
            if (sub) {
                var n = sub.name;
                if (n && !sub.disabled) {
                    options.extraData = options.extraData || {};
                    options.extraData[n] = sub.value;
                    if (sub.type == "image") {
                        options.extraData[name + '.x'] = form.clk_x;
                        options.extraData[name + '.y'] = form.clk_y;
                    }
                }
            }
            setTimeout(function () {
                var t = $form.attr('target'),
                    a = $form.attr('action');
                form.setAttribute('target', id);
                if (form.getAttribute('method') != 'POST') form.setAttribute('method', 'POST');
                if (form.getAttribute('action') != opts.url) form.setAttribute('action', opts.url);
                if (!options.skipEncodingOverride) {
                    $form.attr({
                        encoding: 'multipart/form-data',
                        enctype: 'multipart/form-data'
                    });
                }
                if (opts.timeout) setTimeout(function () {
                    timedOut = true;
                    cb();
                }, opts.timeout);
                var extraInputs = [];
                try {
                    if (options.extraData) for (var n in options.extraData)
                    extraInputs.push($('<input type="hidden" name="' + n + '" value="' + options.extraData[n] + '" />').appendTo(form)[0]);
                    $io.appendTo('body');
                    io.attachEvent ? io.attachEvent('onload', cb) : io.addEventListener('load', cb, false);
                    form.submit();
                } finally {
                    form.setAttribute('action', a);
                    t ? form.setAttribute('target', t) : $form.removeAttr('target');
                    $(extraInputs).remove();
                }
            }, 10);
            var domCheckCount = 50;

            function cb() {
                if (cbInvoked++) return;
                io.detachEvent ? io.detachEvent('onload', cb) : io.removeEventListener('load', cb, false);
                var ok = true;
                try {
                    if (timedOut) throw 'timeout';
                    var data, doc;
                    doc = io.contentWindow ? io.contentWindow.document : io.contentDocument ? io.contentDocument : io.document;
                    var isXml = opts.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
                    log('isXml=' + isXml);
                    if (!isXml && (doc.body == null || doc.body.innerHTML == '')) {
                        if (--domCheckCount) {
                            cbInvoked = 0;
                            setTimeout(cb, 100);
                            return;
                        }
                        log('Could not access iframe DOM after 50 tries.');
                        return;
                    }
                    xhr.responseText = doc.body ? doc.body.innerHTML : null;
                    xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
                    xhr.getResponseHeader = function (header) {
                        var headers = {
                            'content-type': opts.dataType
                        };
                        return headers[header];
                    };
                    if (opts.dataType == 'json' || opts.dataType == 'script') {
                        var ta = doc.getElementsByTagName('textarea')[0];
                        if (ta) xhr.responseText = ta.value;
                        else {
                            var pre = doc.getElementsByTagName('pre')[0];
                            if (pre) xhr.responseText = pre.innerHTML;
                        }
                    } else if (opts.dataType == 'xml' && !xhr.responseXML && xhr.responseText != null) {
                        xhr.responseXML = toXml(xhr.responseText);
                    }
                    data = $.httpData(xhr, opts.dataType);
                } catch (e) {
                    ok = false;
                    $.handleError(opts, xhr, 'error', e);
                }
                if (ok) {
                    opts.success(data, 'success');
                    if (g) $.event.trigger("ajaxSuccess", [xhr, opts]);
                }
                if (g) $.event.trigger("ajaxComplete", [xhr, opts]);
                if (g && !--$.active) $.event.trigger("ajaxStop");
                if (opts.complete) opts.complete(xhr, ok ? 'success' : 'error');
                setTimeout(function () {
                    $io.remove();
                    xhr.responseXML = null;
                }, 100);
            };

            function toXml(s, doc) {
                if (window.ActiveXObject) {
                    doc = new ActiveXObject('Microsoft.XMLDOM');
                    doc.async = 'false';
                    doc.loadXML(s);
                } else
                doc = (new DOMParser()).parseFromString(s, 'text/xml');
                return (doc && doc.documentElement && doc.documentElement.tagName != 'parsererror') ? doc : null;
            };
        };
    };
    $.fn.ajaxForm = function (options) {
        return this.ajaxFormUnbind().bind('submit.form-plugin', function () {
            $(this).ajaxSubmit(options);
            return false;
        }).bind('click.form-plugin', function (e) {
            var target = e.target;
            var $el = $(target);
            if (!($el.is(":submit,input:image"))) {
                var t = $el.closest(':submit');
                if (t.length == 0) return;
                target = t[0];
            }
            var form = this;
            form.clk = target;
            if (target.type == 'image') {
                if (e.offsetX != undefined) {
                    form.clk_x = e.offsetX;
                    form.clk_y = e.offsetY;
                } else if (typeof $.fn.offset == 'function') {
                    var offset = $el.offset();
                    form.clk_x = e.pageX - offset.left;
                    form.clk_y = e.pageY - offset.top;
                } else {
                    form.clk_x = e.pageX - target.offsetLeft;
                    form.clk_y = e.pageY - target.offsetTop;
                }
            }
            setTimeout(function () {
                form.clk = form.clk_x = form.clk_y = null;
            }, 100);
        });
    };
    $.fn.ajaxFormUnbind = function () {
        return this.unbind('submit.form-plugin click.form-plugin');
    };
    $.fn.formToArray = function (semantic) {
        var a = [];
        if (this.length == 0) return a;
        var form = this[0];
        var els = semantic ? form.getElementsByTagName('*') : form.elements;
        if (!els) return a;
        for (var i = 0, max = els.length; i < max; i++) {
            var el = els[i];
            var n = el.name;
            if (!n) continue;
            if (semantic && form.clk && el.type == "image") {
                if (!el.disabled && form.clk == el) {
                    a.push({
                        name: n,
                        value: $(el).val()
                    });
                    a.push({
                        name: n + '.x',
                        value: form.clk_x
                    }, {
                        name: n + '.y',
                        value: form.clk_y
                    });
                }
                continue;
            }
            var v = $.fieldValue(el, true);
            if (v && v.constructor == Array) {
                for (var j = 0, jmax = v.length; j < jmax; j++)
                a.push({
                    name: n,
                    value: v[j]
                });
            } else if (v !== null && typeof v != 'undefined') a.push({
                name: n,
                value: v
            });
        }
        if (!semantic && form.clk) {
            var $input = $(form.clk),
                input = $input[0],
                n = input.name;
            if (n && !input.disabled && input.type == 'image') {
                a.push({
                    name: n,
                    value: $input.val()
                });
                a.push({
                    name: n + '.x',
                    value: form.clk_x
                }, {
                    name: n + '.y',
                    value: form.clk_y
                });
            }
        }
        return a;
    };
    $.fn.formSerialize = function (semantic) {
        return $.param(this.formToArray(semantic));
    };
    $.fn.fieldSerialize = function (successful) {
        var a = [];
        this.each(function () {
            var n = this.name;
            if (!n) return;
            var v = $.fieldValue(this, successful);
            if (v && v.constructor == Array) {
                for (var i = 0, max = v.length; i < max; i++)
                a.push({
                    name: n,
                    value: v[i]
                });
            } else if (v !== null && typeof v != 'undefined') a.push({
                name: this.name,
                value: v
            });
        });
        return $.param(a);
    };
    $.fn.fieldValue = function (successful) {
        for (var val = [], i = 0, max = this.length; i < max; i++) {
            var el = this[i];
            var v = $.fieldValue(el, successful);
            if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) continue;
            v.constructor == Array ? $.merge(val, v) : val.push(v);
        }
        return val;
    };
    $.fieldValue = function (el, successful) {
        var n = el.name,
            t = el.type,
            tag = el.tagName.toLowerCase();
        if (typeof successful == 'undefined') successful = true;
        if (successful && (!n || el.disabled || t == 'reset' || t == 'button' || (t == 'checkbox' || t == 'radio') && !el.checked || (t == 'submit' || t == 'image') && el.form && el.form.clk != el || tag == 'select' && el.selectedIndex == -1)) return null;
        if (tag == 'select') {
            var index = el.selectedIndex;
            if (index < 0) return null;
            var a = [],
                ops = el.options;
            var one = (t == 'select-one');
            var max = (one ? index + 1 : ops.length);
            for (var i = (one ? index : 0); i < max; i++) {
                var op = ops[i];
                if (op.selected) {
                    var v = op.value;
                    if (!v) v = (op.attributes && op.attributes['value'] && !(op.attributes['value'].specified)) ? op.text : op.value;
                    if (one) return v;
                    a.push(v);
                }
            }
            return a;
        }
        return el.value;
    };
    $.fn.clearForm = function () {
        return this.each(function () {
            $('input,select,textarea', this).clearFields();
        });
    };
    $.fn.clearFields = $.fn.clearInputs = function () {
        return this.each(function () {
            var t = this.type,
                tag = this.tagName.toLowerCase();
            if (t == 'text' || t == 'password' || tag == 'textarea') this.value = '';
            else if (t == 'checkbox' || t == 'radio') this.checked = false;
            else if (tag == 'select') this.selectedIndex = -1;
        });
    };
    $.fn.resetForm = function () {
        return this.each(function () {
            if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType)) this.reset();
        });
    };
    $.fn.enable = function (b) {
        if (b == undefined) b = true;
        return this.each(function () {
            this.disabled = !b;
        });
    };
    $.fn.selected = function (select) {
        if (select == undefined) select = true;
        return this.each(function () {
            var t = this.type;
            if (t == 'checkbox' || t == 'radio') this.checked = select;
            else if (this.tagName.toLowerCase() == 'option') {
                var $sel = $(this).parent('select');
                if (select && $sel[0] && $sel[0].type == 'select-one') {
                    $sel.find('option').selected(false);
                }
                this.selected = select;
            }
        });
    };

    function log() {
        if ($.fn.ajaxSubmit.debug && window.console && window.console.log) window.console.log('[jquery.form] ' + Array.prototype.join.call(arguments, ''));
    };
})(jQuery);
(function ($) {
    $.fn.autoResize = function (options) {
        var settings = $.extend({
            onResize: function () {},
            animate: true,
            animateDuration: 150,
            animateCallback: function () {},
            extraSpace: 20,
            limit: 1000
        }, options);
        this.filter('textarea').each(function () {
            var textarea = $(this).css({
                resize: 'none',
                'overflow-y': 'hidden'
            }),
                origHeight = textarea.height(),
                clone = (function () {
                    var props = ['height', 'width', 'lineHeight', 'textDecoration', 'letterSpacing'],
                        propOb = {};
                    $.each(props, function (i, prop) {
                        propOb[prop] = textarea.css(prop);
                    });
                    return textarea.clone().removeAttr('id').removeAttr('name').css({
                        position: 'absolute',
                        top: 0,
                        left: -9999
                    }).css(propOb).attr('tabIndex', '-1').insertBefore(textarea);
                })(),
                lastScrollTop = null,
                updateSize = function () {
                    clone.height(0).val($(this).val()).scrollTop(10000);
                    var scrollTop = Math.max(clone.scrollTop(), origHeight) + settings.extraSpace,
                        toChange = $(this).add(clone);
                    if (lastScrollTop === scrollTop) {
                        return;
                    }
                    lastScrollTop = scrollTop;
                    if (scrollTop >= settings.limit) {
                        $(this).css('overflow-y', '');
                        return;
                    }
                    settings.onResize.call(this);
                    settings.animate && textarea.css('display') === 'block' ? toChange.stop().animate({
                        height: scrollTop
                    }, settings.animateDuration, settings.animateCallback) : toChange.height(scrollTop);
                };
            textarea.unbind('.dynSiz').bind('keyup.dynSiz', updateSize).bind('keydown.dynSiz', updateSize).bind('change.dynSiz', updateSize);
        });
        return this;
    };
})(jQuery);
(function ($) {
    $.parseTime = function (time_value) {
        if (time_value instanceof Date) {
            return time_value.getTime();
        } else if (!isNaN(time_value)) {
            return time_value;
        } else if (!isNaN(Date.parse(time_value))) {
            return Date.parse(time_value);
        }
        var year, month = "01",
            day = "01",
            hour = "00",
            minute = "00",
            second = "00",
            timezone = "GMT";
        time_value = time_value.replace(/^(\d\d\d\d)-?(?:(\d\d)-?(?:(\d\d))?)?[T ]?/, function (m, yr, mt, dy) {
            year = yr;
            month = mt || month;
            day = dy || day;
            return "";
        });
        time_value = time_value.replace(/(\d\d):?(\d\d)(?::?(\d\d))?/, function (m, hr, mn, sc) {
            hour = hr;
            minute = mn || minute;
            second = sc || second;
            return "";
        });
        time_value = time_value.replace(/(Z|([\-\+])(\d)?(\d):?(\d\d))$/, function (m, zed, sign, big, small, minutes) {
            timezone += (zed === "Z" ? "" : sign + (big || "0") + small + minutes);
            return "";
        });
        return Date.parse(year + "/" + month + "/" + day + " " + hour + ":" + minute + ":" + second + " " + timezone);
    };
    $.relativeTime = function (time_value) {
        var parsed_date = $.parseTime(time_value),
            relative_to = $.parseTime((arguments.length > 1) ? arguments[1] : new Date()),
            delta = parseInt((relative_to - parsed_date) / 1000, 10);
        if (delta < 120) {
            return '1 min ago';
        } else if (delta < 45 * 60) {
            return parseInt(delta / 60, 10).toString() + ' mins ago';
        } else if (delta < 90 * 60) {
            return '1 hour ago';
        } else if (delta < 24 * 60 * 60) {
            return parseInt(delta / 3600, 10).toString() + ' hours ago';
        } else if (delta < 48 * 60 * 60) {
            return '1 day ago';
        } else {
            return parseInt(delta / 86400, 10).toString() + ' days ago';
        }
    };
}(jQuery));
(function ($) {
    $.fn.tweet = function (o) {
        var s = {
            username: null,
            avatar_size: null,
            count: 3,
            join_text: null,
            loading_text: null,
            query: null,
            callback: null,
            proxy_func: null,
            request_func: function (url, callback) {
                $.getJSON(url + '&callback=?', callback);
            }
        };
        if (o) $.extend(s, o);
        var url_regex = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/gi;
        var twitter_user_regex = /@([A-Za-z0-9\-_]+)/gi;
        var hashtag_regexp = / #([A-Za-z0-9\-_]+)/gi;

        function tweet_links(html) {
            return html.replace(url_regex, '<a href="$1" target="_blank">$1</a>').replace(twitter_user_regex, '<a href="http://twitter.com/$1" target="_blank">@$1</a>').replace(hashtag_regexp, ' <a href="http://search.twitter.com/search?q=&tag=$1&lang=all" target="_blank">#$1</a>');
        }
        return this.each(function () {
            var list = $('<ul class="tweet_list">').appendTo(this);
            var intro = '<p class="tweet_intro">' + s.intro_text + '</p>';
            var outro = '<p class="tweet_outro">' + s.outro_text + '</p>';
            var loading = $('<p class="loading">' + s.loading_text + '</p>');
            if (typeof(s.username) == "string") {
                s.username = [s.username];
            }
            var query = '';
            if (s.query) {
                query += 'q=' + s.query;
            }
            query += '&q=from:' + s.username.join('%20OR%20from:');
            var url = 'https://search.twitter.com/search.json?' + query + '&rpp=' + s.count;
            if (s.loading_text) $(this).append(loading);
            s.request_func(url, function (data) {
                if (s.loading_text) loading.remove();
                $.each(data.results, function (i, item) {
                    var tweet_url = 'http://twitter.com/' + item.from_user + '/statuses/' + item.id_str;
                    var join_template = '<span class="tweet_join"> ' + s.join_text + ' </span>';
                    var join = ((s.join_text) ? join_template : ' ')
                    var image_url = item.profile_image_url;
                    if (s.proxy_func) image_url = s.proxy_func(image_url);
                    var avatar_template = '<div class="avatar_container"><a class="tweet_avatar" href="' + tweet_url + '" target="_blank"><img src="' + image_url + '" height="' + s.avatar_size + '" width="' + s.avatar_size + '" alt="' + item.from_user + '\'s avatar"/></a></div>';
                    var avatar = (s.avatar_size ? avatar_template : '')
                    var date = '<a class="tweet_date" href="' + tweet_url + '" target="_blank" title="view tweet on twitter">' + $.relativeTime(item.created_at) + '</a>';
                    var text = '<span class="tweet_text">' + $.wbriseHTML(tweet_links(item.text)) + '</span>';
                    var suffix = '<span class="tweet_suffix"></span>';
                    list.append('<li>' + avatar + text + date + suffix + '</li>');
                    list.children('li:first').addClass('tweet_first');
                    list.children('li:odd').addClass('tweet_even');
                    list.children('li:even').addClass('tweet_odd');
                });
                if ($.fn.corner && ($.browser.mozilla || $.browser.msie)) {
                    $.fn.corner.defaults.useNative = false;
                    list.find("a.tweet_avatar").corner('3px');
                }
                if (s.callback) s.callback(data.results);
            });
        });
    };
})(jQuery);
(function ($) {
    $.parseQuery = function (options) {
        var config = {
            query: window.location.search || ""
        },
            params = {};
        if (typeof options === 'string') {
            options = {
                query: options
            };
        }
        $.extend(config, $.parseQuery, options);
        config.query = config.query.replace(/^\?/, '');
        $.each(config.query.split(config.separator), function (i, param) {
            var pair = param.split('='),
                key = config.decode(pair.shift(), null).toString(),
                value = config.decode(pair ? pair.join('=') : null, key);
            if (config.array_keys.test(key)) {
                params[key] = params[key] || [];
                params[key].push(value);
            } else {
                params[key] = value;
            }
        });
        return params;
    };
    $.parseQuery.decode = $.parseQuery.default_decode = function (string) {
        return decodeURIComponent((string || "").replace(/\+/g, ' '));
    };
    $.parseQuery.array_keys = {
        test: function () {
            return false;
        }
    };
    $.parseQuery.separator = "&";
}(jQuery));
(function ($) {
    var split_types = [{
        regexp: /(\s+[\(\[\{<'"]+\w)/,
        cost: 0,
        description: "sentence boundary (start)"
    },
    {
        regexp: /(\w[\.,!\?\)\]\}>'"]+\s+)/,
        cost: 0,
        split_after: true,
        description: "sentence boundary (end)"
    },
    {
        regexp: new RegExp('(\\s+[/\\\\~|.<>:;\\-=#_' + ["\u00a6", "\u00ab", "\u00b7", "\u00bb", "\u2010", "\u2011", "\u2012", "\u2013", "\u2014", "\u2015", "\u2016", "\u2022", "\u2023", "\u2039", "\u203a"].join("") + "])"),
        cost: 10,
        description: "disjunctive punctuation"
    },
    {
        regexp: /( )/,
        cost: 40,
        description: "word boundary"
    },
    {
        regexp: /()/,
        cost: 90,
        description: "mid-word boundary"
    }];

    function split_at_closest_matches(text, split_type, target) {
        var before = "",
            current = "",
            i = 0,
            fragments = text.split(split_type.regexp);
        while (i <= fragments.length && target > before.length + current.length) {
            before += current;
            if (split_type.split_after) {
                current = fragments[i] + (fragments[i + 1] || "");
            } else {
                current = (fragments[i - 1] || "") + fragments[i];
            }
            i += 2;
        }
        return {
            prev: [before, text.substring(before.length)],
            next: [before + current, text.substring(before.length + current.length)]
        };
    }

    function split_block_ideally(block, target_length, total_target_length, index) {
        var best_cost = Infinity,
            best_pair;
        $.each(split_types, function (index, split_type) {
            var pairs = split_at_closest_matches(block, split_type, target_length),
                costs = {
                    prev: split_type.cost + 100 * (target_length - pairs.prev[0].length) / total_target_length,
                    next: split_type.cost + 100 * (pairs.next[0].length - target_length) / total_target_length
                };
            if (costs.next < costs.prev && costs.next <= best_cost) {
                best_pair = pairs.next;
                best_cost = costs.next;
            } else if (costs.prev <= best_cost && (pairs.prev[0] || index)) {
                best_pair = pairs.prev;
                best_cost = costs.prev;
            }
        });
        return best_pair;
    }

    function truncate_text(blocks, options) {
        if (!blocks) {
            blocks = [""];
        } else if (typeof blocks === "string") {
            blocks = [blocks];
        }
        if (!options || !options.length || options.length <= 0) {
            throw new TypeError("options parameter must include (positive) length");
        }
        if (!options.whitespace) {
            options.whitespace = "normalize";
        }
        var target_length = options.length,
            total_target_length = options.length,
            output = [];
        $.each(blocks, function (index, block) {
            if (options.whitespace === "normalize") {
                block = $.trim(block.replace(/\s+/g, ' '));
            }
            if (block === "") {
                return;
            } else if (block.length <= target_length) {
                target_length -= block.length;
                output.push([block, '']);
            } else if (target_length <= 0) {
                output.push(['', block]);
            } else {
                output.push(split_block_ideally(block, target_length, total_target_length, index));
                target_length = 0;
            }
        });
        return output;
    }
    $.truncate = function (blocks, options) {
        var pairs = truncate_text(blocks, options),
            config = $.extend({}, $.truncate.defaults, options),
            output = [];
        if (config.raw) {
            return pairs;
        }

        function html(text) {
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }

        function output_block(contents, class_name) {
            if (config.block_tag) {
                output.push('<', config.block_tag);
                if (class_name) {
                    output.push(' class="', html(class_name), '"');
                }
                output.push('>', contents, '</', config.block_tag, '>');
            } else {
                output.push(contents);
            }
        }
        $.each(pairs, function (index, pair) {
            if (pair[0] && pair[1]) {
                var contents = html(pair[0]);
                if (config.truncated_text) {
                    if (config.more) {
                        contents += '<a href="#" class="expand-truncated">' + html(config.more) + '</a>';
                    }
                    contents += '<span class="' + html(config.truncated_text["class"]) + '">' + html(pair[1]) + '</span>';
                } else if (config.more) {
                    contents += html(config.more);
                }
                output_block(contents);
            } else if (pair[0] && (index + 1 < pairs.length) && !pairs[index + 1][0]) {
                if (config.more && config.truncated_text) {
                    output_block(html(pair[0]) + '<a href="#" class="expand-truncated">' + html(config.more) + '</a>');
                } else if (config.more) {
                    output_block(html(pair[0]) + html(config.more));
                } else {
                    output_block(html(pair[0]));
                }
            } else if (pair[0]) {
                output_block(html(pair[0]));
            } else if (config.truncated_text) {
                output_block(html(pair[1]), config.truncated_text['class']);
            }
        });
        return output.join("");
    };
    $.truncate.defaults = {
        more: "\u2026",
        block_tag: "p",
        truncated_text: {
            "class": "truncated"
        }
    };
}(jQuery));
(function ($) {
    $.fn.isGoogleButton = function () {
        return this.hasClass("google-button");
    };
    $.fn.googleButton = function () {
        return this.each(function () {
            var button = $(this);
            if (!button.isGoogleButton()) {
                return;
            }
            return button.mousedown(function () {
                if (button.googleButtonEnabled()) {
                    button.addClass("depressed");
                }
            }).mouseup(function () {
                button.removeClass("depressed");
            }).mouseleave(function () {
                button.removeClass("depressed");
            });
        });
    };
    $.fn.googleButtonEnabled = function (newValue) {
        if (!this.isGoogleButton()) {
            return;
        }
        if (undefined === newValue) {
            return (undefined === this.attr("disabled"));
        } else {
            if (newValue) {
                return this.enableGoogleButton();
            } else {
                return this.disableGoogleButton();
            }
        }
    };

    function clickShieldId(button) {
        var buttonId = button.attr("id");
        if (undefined === buttonId) {
            return "global-click-shield";
        } else {
            return buttonId + "-click-shield";
        }
    }

    function shieldButton(button) {
        var id = button.attr("id");
        var oH = button.outerHeight();
        var oW = button.outerWidth();
        $("<div class='google-button-click-shield'>&nbsp;</div>").attr("id", clickShieldId(button)).css({
            position: "absolute",
            top: 0,
            left: 0,
            width: (oW + 2) + "px",
            height: oH + "px"
        }).click(function (e) {
            e.stopPropagation();
            return false;
        }).appendTo(button);
    }

    function unshieldButton(button) {
        $("#" + clickShieldId(button)).remove();
    }
    $.fn.enableGoogleButton = function () {
        return this.each(function () {
            var button = $(this);
            if (!button.isGoogleButton()) {
                return;
            }
            unshieldButton(button);
            return button.removeAttr("disabled");
        });
    };
    $.fn.disableGoogleButton = function () {
        return this.each(function () {
            var button = $(this);
            if (!button.isGoogleButton()) {
                return;
            }
            shieldButton(button);
            return button.attr("disabled", "true");
        });
    };
}(jQuery));
var SidebarUtil = (function () {
    function xmlEscape(text) {
        return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
    }

    function compact(arr) {
        var result = [];
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i]) {
                result.push(arr[i]);
            }
        }
        return result;
    }
    return {
        htmlEscape: xmlEscape,
        h: xmlEscape,
        xmlEscape: xmlEscape,
        x: xmlEscape,
        compact: compact
    };
}());
(function ($, undefined) {
    $.ui = $.ui || {};
    if ($.ui.version) {
        return;
    }
    $.extend($.ui, {
        version: "@VERSION",
        plugin: {
            add: function (module, option, set) {
                var proto = $.ui[module].prototype;
                for (var i in set) {
                    proto.plugins[i] = proto.plugins[i] || [];
                    proto.plugins[i].push([option, set[i]]);
                }
            },
            call: function (instance, name, args) {
                var set = instance.plugins[name];
                if (!set || !instance.element[0].parentNode) {
                    return;
                }
                for (var i = 0; i < set.length; i++) {
                    if (instance.options[set[i][0]]) {
                        set[i][1].apply(instance.element, args);
                    }
                }
            }
        },
        contains: function (a, b) {
            return document.compareDocumentPosition ? a.compareDocumentPosition(b) & 16 : a !== b && a.contains(b);
        },
        hasScroll: function (el, a) {
            if ($(el).css("overflow") === "hidden") {
                return false;
            }
            var scroll = (a && a === "left") ? "scrollLeft" : "scrollTop",
                has = false;
            if (el[scroll] > 0) {
                return true;
            }
            el[scroll] = 1;
            has = (el[scroll] > 0);
            el[scroll] = 0;
            return has;
        },
        isOverAxis: function (x, reference, size) {
            return (x > reference) && (x < (reference + size));
        },
        isOver: function (y, x, top, left, height, width) {
            return $.ui.isOverAxis(y, top, height) && $.ui.isOverAxis(x, left, width);
        },
        keyCode: {
            ALT: 18,
            BACKSPACE: 8,
            CAPS_LOCK: 20,
            COMMA: 188,
            COMMAND: 91,
            COMMAND_LEFT: 91,
            COMMAND_RIGHT: 93,
            CONTROL: 17,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            INSERT: 45,
            LEFT: 37,
            MENU: 93,
            NUMPAD_ADD: 107,
            NUMPAD_DECIMAL: 110,
            NUMPAD_DIVIDE: 111,
            NUMPAD_ENTER: 108,
            NUMPAD_MULTIPLY: 106,
            NUMPAD_SUBTRACT: 109,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SHIFT: 16,
            SPACE: 32,
            TAB: 9,
            UP: 38,
            WINDOWS: 91
        }
    });
    $.fn.extend({
        _focus: $.fn.focus,
        focus: function (delay, fn) {
            return typeof delay === "number" ? this.each(function () {
                var elem = this;
                setTimeout(function () {
                    $(elem).focus();
                    if (fn) {
                        fn.call(elem);
                    }
                }, delay);
            }) : this._focus.apply(this, arguments);
        },
        enableSelection: function () {
            return this.attr("unselectable", "off").css("MozUserSelect", "");
        },
        disableSelection: function () {
            return this.attr("unselectable", "on").css("MozUserSelect", "none");
        },
        scrollParent: function () {
            var scrollParent;
            if (($.browser.msie && (/(static|relative)/).test(this.css('position'))) || (/absolute/).test(this.css('position'))) {
                scrollParent = this.parents().filter(function () {
                    return (/(relative|absolute|fixed)/).test($.curCSS(this, 'position', 1)) && (/(auto|scroll)/).test($.curCSS(this, 'overflow', 1) + $.curCSS(this, 'overflow-y', 1) + $.curCSS(this, 'overflow-x', 1));
                }).eq(0);
            } else {
                scrollParent = this.parents().filter(function () {
                    return (/(auto|scroll)/).test($.curCSS(this, 'overflow', 1) + $.curCSS(this, 'overflow-y', 1) + $.curCSS(this, 'overflow-x', 1));
                }).eq(0);
            }
            return (/fixed/).test(this.css('position')) || !scrollParent.length ? $(document) : scrollParent;
        },
        zIndex: function (zIndex) {
            if (zIndex !== undefined) {
                return this.css("zIndex", zIndex);
            }
            if (this.length) {
                var elem = $(this[0]),
                    position, value;
                while (elem.length && elem[0] !== document) {
                    position = elem.css("position");
                    if (position === "absolute" || position === "relative" || position === "fixed") {
                        value = parseInt(elem.css("zIndex"));
                        if (!isNaN(value) && value != 0) {
                            return value;
                        }
                    }
                    elem = elem.parent();
                }
            }
            return 0;
        }
    });
    $.each(["Width", "Height"], function (i, name) {
        var side = name === "Width" ? ["Left", "Right"] : ["Top", "Bottom"],
            type = name.toLowerCase(),
            orig = {
                innerWidth: $.fn.innerWidth,
                innerHeight: $.fn.innerHeight,
                outerWidth: $.fn.outerWidth,
                outerHeight: $.fn.outerHeight
            };

        function reduce(elem, size, border, margin) {
            $.each(side, function () {
                size -= parseFloat($.curCSS(elem, "padding" + this, true)) || 0;
                if (border) {
                    size -= parseFloat($.curCSS(elem, "border" + this + "Width", true)) || 0;
                }
                if (margin) {
                    size -= parseFloat($.curCSS(elem, "margin" + this, true)) || 0;
                }
            });
            return size;
        }
        $.fn["inner" + name] = function (size) {
            if (size === undefined) {
                return orig["inner" + name].call(this);
            }
            return this.each(function () {
                $.style(this, type, reduce(this, size) + "px");
            });
        };
        $.fn["outer" + name] = function (size, margin) {
            if (typeof size !== "number") {
                return orig["outer" + name].call(this, size);
            }
            return this.each(function () {
                $.style(this, type, reduce(this, size, true, margin) + "px");
            });
        };
    });

    function visible(element) {
        return !$(element).parents().andSelf().filter(function () {
            return $.curCSS(this, "visibility") === "hidden" || $.expr.filters.hidden(this);
        }).length;
    }
    $.extend($.expr[":"], {
        data: function (elem, i, match) {
            return !!$.data(elem, match[3]);
        },
        focusable: function (element) {
            var nodeName = element.nodeName.toLowerCase(),
                tabIndex = $.attr(element, "tabindex");
            if ("area" === nodeName) {
                var map = element.parentNode,
                    mapName = map.name,
                    img;
                if (!element.href || !mapName || map.nodeName.toLowerCase() !== "map") {
                    return false;
                }
                img = $("img[usemap=#" + mapName + "]")[0];
                return !!img && visible(img);
            }
            return (/input|select|textarea|button|object/.test(nodeName) ? !element.disabled : "a" == nodeName ? element.href || !isNaN(tabIndex) : !isNaN(tabIndex)) && visible(element);
        },
        tabbable: function (element) {
            var tabIndex = $.attr(element, "tabindex");
            return (isNaN(tabIndex) || tabIndex >= 0) && $(element).is(":focusable");
        }
    });
})(jQuery);
(function ($, undefined) {
    var _remove = $.fn.remove;
    $.fn.remove = function (selector, keepData) {
        return this.each(function () {
            if (!keepData) {
                if (!selector || $.filter(selector, [this]).length) {
                    $("*", this).add([this]).each(function () {
                        $(this).triggerHandler("remove");
                    });
                }
            }
            return _remove.call($(this), selector, keepData);
        });
    };
    $.widget = function (name, base, prototype) {
        var namespace = name.split(".")[0],
            fullName;
        name = name.split(".")[1];
        fullName = namespace + "-" + name;
        if (!prototype) {
            prototype = base;
            base = $.Widget;
        }
        $.expr[":"][fullName] = function (elem) {
            return !!$.data(elem, name);
        };
        $[namespace] = $[namespace] || {};
        $[namespace][name] = function (options, element) {
            if (arguments.length) {
                this._createWidget(options, element);
            }
        };
        var basePrototype = new base();
        basePrototype.options = $.extend(true, {}, basePrototype.options);
        $[namespace][name].prototype = $.extend(true, basePrototype, {
            namespace: namespace,
            widgetName: name,
            widgetEventPrefix: $[namespace][name].prototype.widgetEventPrefix || name,
            widgetBaseClass: fullName
        }, prototype);
        $.widget.bridge(name, $[namespace][name]);
    };
    $.widget.bridge = function (name, object) {
        $.fn[name] = function (options) {
            var isMethodCall = typeof options === "string",
                args = Array.prototype.slice.call(arguments, 1),
                returnValue = this;
            options = !isMethodCall && args.length ? $.extend.apply(null, [true, options].concat(args)) : options;
            if (isMethodCall && options.substring(0, 1) === "_") {
                return returnValue;
            }
            if (isMethodCall) {
                this.each(function () {
                    var instance = $.data(this, name),
                        methodValue = instance && $.isFunction(instance[options]) ? instance[options].apply(instance, args) : instance;
                    if (methodValue !== instance && methodValue !== undefined) {
                        returnValue = methodValue;
                        return false;
                    }
                });
            } else {
                this.each(function () {
                    var instance = $.data(this, name);
                    if (instance) {
                        if (options) {
                            instance.option(options);
                        }
                        instance._init();
                    } else {
                        $.data(this, name, new object(options, this));
                    }
                });
            }
            return returnValue;
        };
    };
    $.Widget = function (options, element) {
        if (arguments.length) {
            this._createWidget(options, element);
        }
    };
    $.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        options: {
            disabled: false
        },
        _createWidget: function (options, element) {
            $.data(element, this.widgetName, this);
            this.element = $(element);
            this.options = $.extend(true, {}, this.options, $.metadata && $.metadata.get(element)[this.widgetName], options);
            var self = this;
            this.element.bind("remove." + this.widgetName, function () {
                self.destroy();
            });
            this._create();
            this._init();
        },
        _create: function () {},
        _init: function () {},
        destroy: function () {
            this.element.unbind("." + this.widgetName).removeData(this.widgetName);
            this.widget().unbind("." + this.widgetName).removeAttr("aria-disabled").removeClass(this.widgetBaseClass + "-disabled " + "ui-state-disabled");
        },
        widget: function () {
            return this.element;
        },
        option: function (key, value) {
            var options = key,
                self = this;
            if (arguments.length === 0) {
                return $.extend({}, self.options);
            }
            if (typeof key === "string") {
                if (value === undefined) {
                    return this.options[key];
                }
                options = {};
                options[key] = value;
            }
            $.each(options, function (key, value) {
                self._setOption(key, value);
            });
            return self;
        },
        _setOption: function (key, value) {
            this.options[key] = value;
            if (key === "disabled") {
                this.widget()[value ? "addClass" : "removeClass"](this.widgetBaseClass + "-disabled" + " " + "ui-state-disabled").attr("aria-disabled", value);
            }
            return this;
        },
        enable: function () {
            return this._setOption("disabled", false);
        },
        disable: function () {
            return this._setOption("disabled", true);
        },
        _trigger: function (type, event, data) {
            var callback = this.options[type];
            event = $.Event(event);
            event.type = (type === this.widgetEventPrefix ? type : this.widgetEventPrefix + type).toLowerCase();
            data = data || {};
            if (event.originalEvent) {
                for (var i = $.event.props.length, prop; i;) {
                    prop = $.event.props[--i];
                    event[prop] = event.originalEvent[prop];
                }
            }
            this.element.trigger(event, data);
            return !($.isFunction(callback) && callback.call(this.element[0], event, data) === false || event.isDefaultPrevented());
        }
    };
})(jQuery);
(function ($, undefined) {
    var lastActive, baseClasses = "ui-button ui-widget ui-state-default ui-corner-all",
        stateClasses = "ui-state-hover ui-state-active ",
        typeClasses = "ui-button-icons-only ui-button-icon-only ui-button-text-icons ui-button-text-icon-primary ui-button-text-icon-secondary ui-button-text-only",
        formResetHandler = function (event) {
            $(":ui-button", event.target.form).each(function () {
                var inst = $(this).data("button");
                setTimeout(function () {
                    inst.refresh();
                }, 1);
            });
        },
        radioGroup = function (radio) {
            var name = radio.name,
                form = radio.form,
                radios = $([]);
            if (name) {
                if (form) {
                    radios = $(form).find("[name='" + name + "']");
                } else {
                    radios = $("[name='" + name + "']", radio.ownerDocument).filter(function () {
                        return !this.form;
                    });
                }
            }
            return radios;
        };
    $.widget("ui.button", {
        options: {
            text: true,
            label: null,
            icons: {
                primary: null,
                secondary: null
            }
        },
        _create: function () {
            this.element.closest("form").unbind("reset.button").bind("reset.button", formResetHandler);
            this._determineButtonType();
            this.hasTitle = !! this.buttonElement.attr("title");
            var self = this,
                options = this.options,
                toggleButton = this.type === "checkbox" || this.type === "radio",
                hoverClass = "ui-state-hover" + (!toggleButton ? " ui-state-active" : ""),
                focusClass = "ui-state-focus";
            if (options.label === null) {
                options.label = this.buttonElement.html();
            }
            if (this.element.is(":disabled")) {
                options.disabled = true;
            }
            this.buttonElement.addClass(baseClasses).attr("role", "button").bind("mouseenter.button", function () {
                if (options.disabled) {
                    return;
                }
                $(this).addClass("ui-state-hover");
                if (this === lastActive) {
                    $(this).addClass("ui-state-active");
                }
            }).bind("mouseleave.button", function () {
                if (options.disabled) {
                    return;
                }
                $(this).removeClass(hoverClass);
            }).bind("focus.button", function () {
                $(this).addClass(focusClass);
            }).bind("blur.button", function () {
                $(this).removeClass(focusClass);
            });
            if (toggleButton) {
                this.element.bind("change.button", function () {
                    self.refresh();
                });
            }
            if (this.type === "checkbox") {
                this.buttonElement.bind("click.button", function () {
                    if (options.disabled) {
                        return false;
                    }
                    $(this).toggleClass("ui-state-active");
                    self.buttonElement.attr("aria-pressed", self.element[0].checked);
                });
            } else if (this.type === "radio") {
                this.buttonElement.bind("click.button", function () {
                    if (options.disabled) {
                        return false;
                    }
                    $(this).addClass("ui-state-active");
                    self.buttonElement.attr("aria-pressed", true);
                    var radio = self.element[0];
                    radioGroup(radio).not(radio).map(function () {
                        return $(this).button("widget")[0];
                    }).removeClass("ui-state-active").attr("aria-pressed", false);
                });
            } else {
                this.buttonElement.bind("mousedown.button", function () {
                    if (options.disabled) {
                        return false;
                    }
                    $(this).addClass("ui-state-active");
                    lastActive = this;
                    $(document).one("mouseup", function () {
                        lastActive = null;
                    });
                }).bind("mouseup.button", function () {
                    if (options.disabled) {
                        return false;
                    }
                    $(this).removeClass("ui-state-active");
                }).bind("keydown.button", function (event) {
                    if (options.disabled) {
                        return false;
                    }
                    if (event.keyCode == $.ui.keyCode.SPACE || event.keyCode == $.ui.keyCode.ENTER) {
                        $(this).addClass("ui-state-active");
                    }
                }).bind("keyup.button", function () {
                    $(this).removeClass("ui-state-active");
                });
                if (this.buttonElement.is("a")) {
                    this.buttonElement.keyup(function (event) {
                        if (event.keyCode === $.ui.keyCode.SPACE) {
                            $(this).click();
                        }
                    });
                }
            }
            this._setOption("disabled", options.disabled);
        },
        _determineButtonType: function () {
            if (this.element.is(":checkbox")) {
                this.type = "checkbox";
            } else {
                if (this.element.is(":radio")) {
                    this.type = "radio";
                } else {
                    if (this.element.is("input")) {
                        this.type = "input";
                    } else {
                        this.type = "button";
                    }
                }
            }
            if (this.type === "checkbox" || this.type === "radio") {
                this.buttonElement = this.element.parents().last().find("label[for=" + this.element.attr("id") + "]");
                this.element.addClass("ui-helper-hidden-accessible");
                var checked = this.element.is(":checked");
                if (checked) {
                    this.buttonElement.addClass("ui-state-active");
                }
                this.buttonElement.attr("aria-pressed", checked);
            } else {
                this.buttonElement = this.element;
            }
        },
        widget: function () {
            return this.buttonElement;
        },
        destroy: function () {
            this.element.removeClass("ui-helper-hidden-accessible");
            this.buttonElement.removeClass(baseClasses + " " + stateClasses + " " + typeClasses).removeAttr("role").removeAttr("aria-pressed").html(this.buttonElement.find(".ui-button-text").html());
            if (!this.hasTitle) {
                this.buttonElement.removeAttr("title");
            }
            $.Widget.prototype.destroy.call(this);
        },
        _setOption: function (key, value) {
            $.Widget.prototype._setOption.apply(this, arguments);
            if (key === "disabled") {
                if (value) {
                    this.element.attr("disabled", true);
                } else {
                    this.element.removeAttr("disabled");
                }
            }
            this._resetButton();
        },
        refresh: function () {
            var isDisabled = this.element.is(":disabled");
            if (isDisabled !== this.options.disabled) {
                this._setOption("disabled", isDisabled);
            }
            if (this.type === "radio") {
                radioGroup(this.element[0]).each(function () {
                    if ($(this).is(":checked")) {
                        $(this).button("widget").addClass("ui-state-active").attr("aria-pressed", true);
                    } else {
                        $(this).button("widget").removeClass("ui-state-active").attr("aria-pressed", false);
                    }
                });
            } else if (this.type === "checkbox") {
                if (this.element.is(":checked")) {
                    this.buttonElement.addClass("ui-state-active").attr("aria-pressed", true);
                } else {
                    this.buttonElement.removeClass("ui-state-active").attr("aria-pressed", false);
                }
            }
        },
        _resetButton: function () {
            if (this.type === "input") {
                if (this.options.label) {
                    this.element.val(this.options.label);
                }
                return;
            }
            var buttonElement = this.buttonElement.removeClass(typeClasses),
                buttonText = $("<span></span>").addClass("ui-button-text").html(this.options.label).appendTo(buttonElement.empty()).text(),
                icons = this.options.icons,
                multipleIcons = icons.primary && icons.secondary;
            if (icons.primary || icons.secondary) {
                buttonElement.addClass("ui-button-text-icon" + (multipleIcons ? "s" : (icons.primary ? "-primary" : "-secondary")));
                if (icons.primary) {
                    buttonElement.prepend("<span class='ui-button-icon-primary ui-icon " + icons.primary + "'></span>");
                }
                if (icons.secondary) {
                    buttonElement.append("<span class='ui-button-icon-secondary ui-icon " + icons.secondary + "'></span>");
                }
                if (!this.options.text) {
                    buttonElement.addClass(multipleIcons ? "ui-button-icons-only" : "ui-button-icon-only").removeClass("ui-button-text-icons ui-button-text-icon-primary ui-button-text-icon-secondary");
                    if (!this.hasTitle) {
                        buttonElement.attr("title", buttonText);
                    }
                }
            } else {
                buttonElement.addClass("ui-button-text-only");
            }
        }
    });
    $.widget("ui.buttonset", {
        _create: function () {
            this.element.addClass("ui-buttonset");
            this._init();
        },
        _init: function () {
            this.refresh();
        },
        _setOption: function (key, value) {
            if (key === "disabled") {
                this.buttons.button("option", key, value);
            }
            $.Widget.prototype._setOption.apply(this, arguments);
        },
        refresh: function () {
            this.buttons = this.element.find(":button, :submit, :reset, :checkbox, :radio, a, :data(button)").filter(":ui-button").button("refresh").end().not(":ui-button").button().end().map(function () {
                return $(this).button("widget")[0];
            }).removeClass("ui-corner-all ui-corner-left ui-corner-right").filter(":first").addClass("ui-corner-left").end().filter(":last").addClass("ui-corner-right").end().end();
        },
        destroy: function () {
            this.element.removeClass("ui-buttonset");
            this.buttons.map(function () {
                return $(this).button("widget")[0];
            }).removeClass("ui-corner-left ui-corner-right").end().button("destroy");
            $.Widget.prototype.destroy.call(this);
        }
    });
}(jQuery));
(function ($, undefined) {
    $.widget("ui.mouse", {
        options: {
            cancel: ':input,option',
            distance: 1,
            delay: 0
        },
        _mouseInit: function () {
            var self = this;
            this.element.bind('mousedown.' + this.widgetName, function (event) {
                return self._mouseDown(event);
            }).bind('click.' + this.widgetName, function (event) {
                if (self._preventClickEvent) {
                    self._preventClickEvent = false;
                    event.stopImmediatePropagation();
                    return false;
                }
            });
            this.started = false;
        },
        _mouseDestroy: function () {
            this.element.unbind('.' + this.widgetName);
        },
        _mouseDown: function (event) {
            event.originalEvent = event.originalEvent || {};
            if (event.originalEvent.mouseHandled) {
                return;
            }(this._mouseStarted && this._mouseUp(event));
            this._mouseDownEvent = event;
            var self = this,
                btnIsLeft = (event.which == 1),
                elIsCancel = (typeof this.options.cancel == "string" ? $(event.target).parents().add(event.target).filter(this.options.cancel).length : false);
            if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
                return true;
            }
            this.mouseDelayMet = !this.options.delay;
            if (!this.mouseDelayMet) {
                this._mouseDelayTimer = setTimeout(function () {
                    self.mouseDelayMet = true;
                }, this.options.delay);
            }
            if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
                this._mouseStarted = (this._mouseStart(event) !== false);
                if (!this._mouseStarted) {
                    event.preventDefault();
                    return true;
                }
            }
            this._mouseMoveDelegate = function (event) {
                return self._mouseMove(event);
            };
            this._mouseUpDelegate = function (event) {
                return self._mouseUp(event);
            };
            $(document).bind('mousemove.' + this.widgetName, this._mouseMoveDelegate).bind('mouseup.' + this.widgetName, this._mouseUpDelegate);
            ($.browser.safari || event.preventDefault());
            event.originalEvent.mouseHandled = true;
            return true;
        },
        _mouseMove: function (event) {
            if ($.browser.msie && !event.button) {
                return this._mouseUp(event);
            }
            if (this._mouseStarted) {
                this._mouseDrag(event);
                return event.preventDefault();
            }
            if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
                this._mouseStarted = (this._mouseStart(this._mouseDownEvent, event) !== false);
                (this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event));
            }
            return !this._mouseStarted;
        },
        _mouseUp: function (event) {
            $(document).unbind('mousemove.' + this.widgetName, this._mouseMoveDelegate).unbind('mouseup.' + this.widgetName, this._mouseUpDelegate);
            if (this._mouseStarted) {
                this._mouseStarted = false;
                this._preventClickEvent = (event.target == this._mouseDownEvent.target);
                this._mouseStop(event);
            }
            return false;
        },
        _mouseDistanceMet: function (event) {
            return (Math.max(Math.abs(this._mouseDownEvent.pageX - event.pageX), Math.abs(this._mouseDownEvent.pageY - event.pageY)) >= this.options.distance);
        },
        _mouseDelayMet: function (event) {
            return this.mouseDelayMet;
        },
        _mouseStart: function (event) {},
        _mouseDrag: function (event) {},
        _mouseStop: function (event) {},
        _mouseCapture: function (event) {
            return true;
        }
    });
})(jQuery);
(function ($, undefined) {
    $.widget("ui.draggable", $.ui.mouse, {
        widgetEventPrefix: "drag",
        options: {
            addClasses: true,
            appendTo: "parent",
            axis: false,
            connectToSortable: false,
            containment: false,
            cursor: "auto",
            cursorAt: false,
            grid: false,
            handle: false,
            helper: "original",
            iframeFix: false,
            opacity: false,
            refreshPositions: false,
            revert: false,
            revertDuration: 500,
            scope: "default",
            scroll: true,
            scrollSensitivity: 20,
            scrollSpeed: 20,
            snap: false,
            snapMode: "both",
            snapTolerance: 20,
            stack: false,
            zIndex: false
        },
        _create: function () {
            if (this.options.helper == 'original' && !(/^(?:r|a|f)/).test(this.element.css("position"))) this.element[0].style.position = 'relative';
            (this.options.addClasses && this.element.addClass("ui-draggable"));
            (this.options.disabled && this.element.addClass("ui-draggable-disabled"));
            this._mouseInit();
        },
        destroy: function () {
            if (!this.element.data('draggable')) return;
            this.element.removeData("draggable").unbind(".draggable").removeClass("ui-draggable" + " ui-draggable-dragging" + " ui-draggable-disabled");
            this._mouseDestroy();
            return this;
        },
        _mouseCapture: function (event) {
            var o = this.options;
            if (this.helper || o.disabled || $(event.target).is('.ui-resizable-handle')) return false;
            this.handle = this._getHandle(event);
            if (!this.handle) return false;
            return true;
        },
        _mouseStart: function (event) {
            var o = this.options;
            this.helper = this._createHelper(event);
            this._cacheHelperProportions();
            if ($.ui.ddmanager) $.ui.ddmanager.current = this;
            this._cacheMargins();
            this.cssPosition = this.helper.css("position");
            this.scrollParent = this.helper.scrollParent();
            this.offset = this.positionAbs = this.element.offset();
            this.offset = {
                top: this.offset.top - this.margins.top,
                left: this.offset.left - this.margins.left
            };
            $.extend(this.offset, {
                click: {
                    left: event.pageX - this.offset.left,
                    top: event.pageY - this.offset.top
                },
                parent: this._getParentOffset(),
                relative: this._getRelativeOffset()
            });
            this.originalPosition = this.position = this._generatePosition(event);
            this.originalPageX = event.pageX;
            this.originalPageY = event.pageY;
            (o.cursorAt && this._adjustOffsetFromHelper(o.cursorAt));
            if (o.containment) this._setContainment();
            if (this._trigger("start", event) === false) {
                this._clear();
                return false;
            }
            this._cacheHelperProportions();
            if ($.ui.ddmanager && !o.dropBehaviour) $.ui.ddmanager.prepareOffsets(this, event);
            this.helper.addClass("ui-draggable-dragging");
            this._mouseDrag(event, true);
            return true;
        },
        _mouseDrag: function (event, noPropagation) {
            this.position = this._generatePosition(event);
            this.positionAbs = this._convertPositionTo("absolute");
            if (!noPropagation) {
                var ui = this._uiHash();
                if (this._trigger('drag', event, ui) === false) {
                    this._mouseUp({});
                    return false;
                }
                this.position = ui.position;
            }
            if (!this.options.axis || this.options.axis != "y") this.helper[0].style.left = this.position.left + 'px';
            if (!this.options.axis || this.options.axis != "x") this.helper[0].style.top = this.position.top + 'px';
            if ($.ui.ddmanager) $.ui.ddmanager.drag(this, event);
            return false;
        },
        _mouseStop: function (event) {
            var dropped = false;
            if ($.ui.ddmanager && !this.options.dropBehaviour) dropped = $.ui.ddmanager.drop(this, event);
            if (this.dropped) {
                dropped = this.dropped;
                this.dropped = false;
            }
            if (!this.element[0] || !this.element[0].parentNode) return false;
            if ((this.options.revert == "invalid" && !dropped) || (this.options.revert == "valid" && dropped) || this.options.revert === true || ($.isFunction(this.options.revert) && this.options.revert.call(this.element, dropped))) {
                var self = this;
                $(this.helper).animate(this.originalPosition, parseInt(this.options.revertDuration, 10), function () {
                    if (self._trigger("stop", event) !== false) {
                        self._clear();
                    }
                });
            } else {
                if (this._trigger("stop", event) !== false) {
                    this._clear();
                }
            }
            return false;
        },
        cancel: function () {
            if (this.helper.is(".ui-draggable-dragging")) {
                this._mouseUp({});
            } else {
                this._clear();
            }
            return this;
        },
        _getHandle: function (event) {
            var handle = !this.options.handle || !$(this.options.handle, this.element).length ? true : false;
            $(this.options.handle, this.element).find("*").andSelf().each(function () {
                if (this == event.target) handle = true;
            });
            return handle;
        },
        _createHelper: function (event) {
            var o = this.options;
            var helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [event])) : (o.helper == 'clone' ? this.element.clone() : this.element);
            if (!helper.parents('body').length) helper.appendTo((o.appendTo == 'parent' ? this.element[0].parentNode : o.appendTo));
            if (helper[0] != this.element[0] && !(/(fixed|absolute)/).test(helper.css("position"))) helper.css("position", "absolute");
            return helper;
        },
        _adjustOffsetFromHelper: function (obj) {
            if (typeof obj == 'string') {
                obj = obj.split(' ');
            }
            if ($.isArray(obj)) {
                obj = {
                    left: +obj[0],
                    top: +obj[1] || 0
                };
            }
            if ('left' in obj) {
                this.offset.click.left = obj.left + this.margins.left;
            }
            if ('right' in obj) {
                this.offset.click.left = this.helperProportions.width - obj.right + this.margins.left;
            }
            if ('top' in obj) {
                this.offset.click.top = obj.top + this.margins.top;
            }
            if ('bottom' in obj) {
                this.offset.click.top = this.helperProportions.height - obj.bottom + this.margins.top;
            }
        },
        _getParentOffset: function () {
            this.offsetParent = this.helper.offsetParent();
            var po = this.offsetParent.offset();
            if (this.cssPosition == 'absolute' && this.scrollParent[0] != document && $.ui.contains(this.scrollParent[0], this.offsetParent[0])) {
                po.left += this.scrollParent.scrollLeft();
                po.top += this.scrollParent.scrollTop();
            }
            if ((this.offsetParent[0] == document.body) || (this.offsetParent[0].tagName && this.offsetParent[0].tagName.toLowerCase() == 'html' && $.browser.msie)) po = {
                top: 0,
                left: 0
            };
            return {
                top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"), 10) || 0),
                left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"), 10) || 0)
            };
        },
        _getRelativeOffset: function () {
            if (this.cssPosition == "relative") {
                var p = this.element.position();
                return {
                    top: p.top - (parseInt(this.helper.css("top"), 10) || 0) + this.scrollParent.scrollTop(),
                    left: p.left - (parseInt(this.helper.css("left"), 10) || 0) + this.scrollParent.scrollLeft()
                };
            } else {
                return {
                    top: 0,
                    left: 0
                };
            }
        },
        _cacheMargins: function () {
            this.margins = {
                left: (parseInt(this.element.css("marginLeft"), 10) || 0),
                top: (parseInt(this.element.css("marginTop"), 10) || 0)
            };
        },
        _cacheHelperProportions: function () {
            this.helperProportions = {
                width: this.helper.outerWidth(),
                height: this.helper.outerHeight()
            };
        },
        _setContainment: function () {
            var o = this.options;
            if (o.containment == 'parent') o.containment = this.helper[0].parentNode;
            if (o.containment == 'document' || o.containment == 'window') this.containment = [0 - this.offset.relative.left - this.offset.parent.left, 0 - this.offset.relative.top - this.offset.parent.top, $(o.containment == 'document' ? document : window).width() - this.helperProportions.width - this.margins.left, ($(o.containment == 'document' ? document : window).height() || document.body.parentNode.scrollHeight) - this.helperProportions.height - this.margins.top];
            if (!(/^(document|window|parent)$/).test(o.containment) && o.containment.constructor != Array) {
                var ce = $(o.containment)[0];
                if (!ce) return;
                var co = $(o.containment).offset();
                var over = ($(ce).css("overflow") != 'hidden');
                this.containment = [co.left + (parseInt($(ce).css("borderLeftWidth"), 10) || 0) + (parseInt($(ce).css("paddingLeft"), 10) || 0) - this.margins.left, co.top + (parseInt($(ce).css("borderTopWidth"), 10) || 0) + (parseInt($(ce).css("paddingTop"), 10) || 0) - this.margins.top, co.left + (over ? Math.max(ce.scrollWidth, ce.offsetWidth) : ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"), 10) || 0) - (parseInt($(ce).css("paddingRight"), 10) || 0) - this.helperProportions.width - this.margins.left, co.top + (over ? Math.max(ce.scrollHeight, ce.offsetHeight) : ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"), 10) || 0) - (parseInt($(ce).css("paddingBottom"), 10) || 0) - this.helperProportions.height - this.margins.top];
            } else if (o.containment.constructor == Array) {
                this.containment = o.containment;
            }
        },
        _convertPositionTo: function (d, pos) {
            if (!pos) pos = this.position;
            var mod = d == "absolute" ? 1 : -1;
            var o = this.options,
                scroll = this.cssPosition == 'absolute' && !(this.scrollParent[0] != document && $.ui.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent,
                scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);
            return {
                top: (pos.top + this.offset.relative.top * mod + this.offset.parent.top * mod - ($.browser.safari && $.browser.version < 526 && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollTop() : (scrollIsRootNode ? 0 : scroll.scrollTop())) * mod)),
                left: (pos.left + this.offset.relative.left * mod + this.offset.parent.left * mod - ($.browser.safari && $.browser.version < 526 && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft()) * mod))
            };
        },
        _generatePosition: function (event) {
            var o = this.options,
                scroll = this.cssPosition == 'absolute' && !(this.scrollParent[0] != document && $.ui.contains(this.scrollParent[0], this.offsetParent[0])) ? this.offsetParent : this.scrollParent,
                scrollIsRootNode = (/(html|body)/i).test(scroll[0].tagName);
            var pageX = event.pageX;
            var pageY = event.pageY;
            if (this.originalPosition) {
                if (this.containment) {
                    if (event.pageX - this.offset.click.left < this.containment[0]) pageX = this.containment[0] + this.offset.click.left;
                    if (event.pageY - this.offset.click.top < this.containment[1]) pageY = this.containment[1] + this.offset.click.top;
                    if (event.pageX - this.offset.click.left > this.containment[2]) pageX = this.containment[2] + this.offset.click.left;
                    if (event.pageY - this.offset.click.top > this.containment[3]) pageY = this.containment[3] + this.offset.click.top;
                }
                if (o.grid) {
                    var top = this.originalPageY + Math.round((pageY - this.originalPageY) / o.grid[1]) * o.grid[1];
                    pageY = this.containment ? (!(top - this.offset.click.top < this.containment[1] || top - this.offset.click.top > this.containment[3]) ? top : (!(top - this.offset.click.top < this.containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;
                    var left = this.originalPageX + Math.round((pageX - this.originalPageX) / o.grid[0]) * o.grid[0];
                    pageX = this.containment ? (!(left - this.offset.click.left < this.containment[0] || left - this.offset.click.left > this.containment[2]) ? left : (!(left - this.offset.click.left < this.containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
                }
            }
            return {
                top: (pageY - this.offset.click.top - this.offset.relative.top - this.offset.parent.top + ($.browser.safari && $.browser.version < 526 && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollTop() : (scrollIsRootNode ? 0 : scroll.scrollTop())))),
                left: (pageX - this.offset.click.left - this.offset.relative.left - this.offset.parent.left + ($.browser.safari && $.browser.version < 526 && this.cssPosition == 'fixed' ? 0 : (this.cssPosition == 'fixed' ? -this.scrollParent.scrollLeft() : scrollIsRootNode ? 0 : scroll.scrollLeft())))
            };
        },
        _clear: function () {
            this.helper.removeClass("ui-draggable-dragging");
            if (this.helper[0] != this.element[0] && !this.cancelHelperRemoval) this.helper.remove();
            this.helper = null;
            this.cancelHelperRemoval = false;
        },
        _trigger: function (type, event, ui) {
            ui = ui || this._uiHash();
            $.ui.plugin.call(this, type, [event, ui]);
            if (type == "drag") this.positionAbs = this._convertPositionTo("absolute");
            return $.Widget.prototype._trigger.call(this, type, event, ui);
        },
        plugins: {},
        _uiHash: function (event) {
            return {
                helper: this.helper,
                position: this.position,
                originalPosition: this.originalPosition,
                offset: this.positionAbs
            };
        }
    });
    $.extend($.ui.draggable, {
        version: "@VERSION"
    });
    $.ui.plugin.add("draggable", "connectToSortable", {
        start: function (event, ui) {
            var inst = $(this).data("draggable"),
                o = inst.options,
                uiSortable = $.extend({}, ui, {
                    item: inst.element
                });
            inst.sortables = [];
            $(o.connectToSortable).each(function () {
                var sortable = $.data(this, 'sortable');
                if (sortable && !sortable.options.disabled) {
                    inst.sortables.push({
                        instance: sortable,
                        shouldRevert: sortable.options.revert
                    });
                    sortable._refreshItems();
                    sortable._trigger("activate", event, uiSortable);
                }
            });
        },
        stop: function (event, ui) {
            var inst = $(this).data("draggable"),
                uiSortable = $.extend({}, ui, {
                    item: inst.element
                });
            $.each(inst.sortables, function () {
                if (this.instance.isOver) {
                    this.instance.isOver = 0;
                    inst.cancelHelperRemoval = true;
                    this.instance.cancelHelperRemoval = false;
                    if (this.shouldRevert) this.instance.options.revert = true;
                    this.instance._mouseStop(event);
                    this.instance.options.helper = this.instance.options._helper;
                    if (inst.options.helper == 'original') this.instance.currentItem.css({
                        top: 'auto',
                        left: 'auto'
                    });
                } else {
                    this.instance.cancelHelperRemoval = false;
                    this.instance._trigger("deactivate", event, uiSortable);
                }
            });
        },
        drag: function (event, ui) {
            var inst = $(this).data("draggable"),
                self = this;
            var checkPos = function (o) {
                var dyClick = this.offset.click.top,
                    dxClick = this.offset.click.left;
                var helperTop = this.positionAbs.top,
                    helperLeft = this.positionAbs.left;
                var itemHeight = o.height,
                    itemWidth = o.width;
                var itemTop = o.top,
                    itemLeft = o.left;
                return $.ui.isOver(helperTop + dyClick, helperLeft + dxClick, itemTop, itemLeft, itemHeight, itemWidth);
            };
            $.each(inst.sortables, function (i) {
                this.instance.positionAbs = inst.positionAbs;
                this.instance.helperProportions = inst.helperProportions;
                this.instance.offset.click = inst.offset.click;
                if (this.instance._intersectsWith(this.instance.containerCache)) {
                    if (!this.instance.isOver) {
                        this.instance.isOver = 1;
                        this.instance.currentItem = $(self).clone().appendTo(this.instance.element).data("sortable-item", true);
                        this.instance.options._helper = this.instance.options.helper;
                        this.instance.options.helper = function () {
                            return ui.helper[0];
                        };
                        event.target = this.instance.currentItem[0];
                        this.instance._mouseCapture(event, true);
                        this.instance._mouseStart(event, true, true);
                        this.instance.offset.click.top = inst.offset.click.top;
                        this.instance.offset.click.left = inst.offset.click.left;
                        this.instance.offset.parent.left -= inst.offset.parent.left - this.instance.offset.parent.left;
                        this.instance.offset.parent.top -= inst.offset.parent.top - this.instance.offset.parent.top;
                        inst._trigger("toSortable", event);
                        inst.dropped = this.instance.element;
                        inst.currentItem = inst.element;
                        this.instance.fromOutside = inst;
                    }
                    if (this.instance.currentItem) this.instance._mouseDrag(event);
                } else {
                    if (this.instance.isOver) {
                        this.instance.isOver = 0;
                        this.instance.cancelHelperRemoval = true;
                        this.instance.options.revert = false;
                        this.instance._trigger('out', event, this.instance._uiHash(this.instance));
                        this.instance._mouseStop(event, true);
                        this.instance.options.helper = this.instance.options._helper;
                        this.instance.currentItem.remove();
                        if (this.instance.placeholder) this.instance.placeholder.remove();
                        inst._trigger("fromSortable", event);
                        inst.dropped = false;
                    }
                };
            });
        }
    });
    $.ui.plugin.add("draggable", "cursor", {
        start: function (event, ui) {
            var t = $('body'),
                o = $(this).data('draggable').options;
            if (t.css("cursor")) o._cursor = t.css("cursor");
            t.css("cursor", o.cursor);
        },
        stop: function (event, ui) {
            var o = $(this).data('draggable').options;
            if (o._cursor) $('body').css("cursor", o._cursor);
        }
    });
    $.ui.plugin.add("draggable", "iframeFix", {
        start: function (event, ui) {
            var o = $(this).data('draggable').options;
            $(o.iframeFix === true ? "iframe" : o.iframeFix).each(function () {
                $('<div class="ui-draggable-iframeFix" style="background: #fff;"></div>').css({
                    width: this.offsetWidth + "px",
                    height: this.offsetHeight + "px",
                    position: "absolute",
                    opacity: "0.001",
                    zIndex: 1000
                }).css($(this).offset()).appendTo("body");
            });
        },
        stop: function (event, ui) {
            $("div.ui-draggable-iframeFix").each(function () {
                this.parentNode.removeChild(this);
            });
        }
    });
    $.ui.plugin.add("draggable", "opacity", {
        start: function (event, ui) {
            var t = $(ui.helper),
                o = $(this).data('draggable').options;
            if (t.css("opacity")) o._opacity = t.css("opacity");
            t.css('opacity', o.opacity);
        },
        stop: function (event, ui) {
            var o = $(this).data('draggable').options;
            if (o._opacity) $(ui.helper).css('opacity', o._opacity);
        }
    });
    $.ui.plugin.add("draggable", "scroll", {
        start: function (event, ui) {
            var i = $(this).data("draggable");
            if (i.scrollParent[0] != document && i.scrollParent[0].tagName != 'HTML') i.overflowOffset = i.scrollParent.offset();
        },
        drag: function (event, ui) {
            var i = $(this).data("draggable"),
                o = i.options,
                scrolled = false;
            if (i.scrollParent[0] != document && i.scrollParent[0].tagName != 'HTML') {
                if (!o.axis || o.axis != 'x') {
                    if ((i.overflowOffset.top + i.scrollParent[0].offsetHeight) - event.pageY < o.scrollSensitivity) i.scrollParent[0].scrollTop = scrolled = i.scrollParent[0].scrollTop + o.scrollSpeed;
                    else if (event.pageY - i.overflowOffset.top < o.scrollSensitivity) i.scrollParent[0].scrollTop = scrolled = i.scrollParent[0].scrollTop - o.scrollSpeed;
                }
                if (!o.axis || o.axis != 'y') {
                    if ((i.overflowOffset.left + i.scrollParent[0].offsetWidth) - event.pageX < o.scrollSensitivity) i.scrollParent[0].scrollLeft = scrolled = i.scrollParent[0].scrollLeft + o.scrollSpeed;
                    else if (event.pageX - i.overflowOffset.left < o.scrollSensitivity) i.scrollParent[0].scrollLeft = scrolled = i.scrollParent[0].scrollLeft - o.scrollSpeed;
                }
            } else {
                if (!o.axis || o.axis != 'x') {
                    if (event.pageY - $(document).scrollTop() < o.scrollSensitivity) scrolled = $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
                    else if ($(window).height() - (event.pageY - $(document).scrollTop()) < o.scrollSensitivity) scrolled = $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
                }
                if (!o.axis || o.axis != 'y') {
                    if (event.pageX - $(document).scrollLeft() < o.scrollSensitivity) scrolled = $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
                    else if ($(window).width() - (event.pageX - $(document).scrollLeft()) < o.scrollSensitivity) scrolled = $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
                }
            }
            if (scrolled !== false && $.ui.ddmanager && !o.dropBehaviour) $.ui.ddmanager.prepareOffsets(i, event);
        }
    });
    $.ui.plugin.add("draggable", "snap", {
        start: function (event, ui) {
            var i = $(this).data("draggable"),
                o = i.options;
            i.snapElements = [];
            $(o.snap.constructor != String ? (o.snap.items || ':data(draggable)') : o.snap).each(function () {
                var $t = $(this);
                var $o = $t.offset();
                if (this != i.element[0]) i.snapElements.push({
                    item: this,
                    width: $t.outerWidth(),
                    height: $t.outerHeight(),
                    top: $o.top,
                    left: $o.left
                });
            });
        },
        drag: function (event, ui) {
            var inst = $(this).data("draggable"),
                o = inst.options;
            var d = o.snapTolerance;
            var x1 = ui.offset.left,
                x2 = x1 + inst.helperProportions.width,
                y1 = ui.offset.top,
                y2 = y1 + inst.helperProportions.height;
            for (var i = inst.snapElements.length - 1; i >= 0; i--) {
                var l = inst.snapElements[i].left,
                    r = l + inst.snapElements[i].width,
                    t = inst.snapElements[i].top,
                    b = t + inst.snapElements[i].height;
                if (!((l - d < x1 && x1 < r + d && t - d < y1 && y1 < b + d) || (l - d < x1 && x1 < r + d && t - d < y2 && y2 < b + d) || (l - d < x2 && x2 < r + d && t - d < y1 && y1 < b + d) || (l - d < x2 && x2 < r + d && t - d < y2 && y2 < b + d))) {
                    if (inst.snapElements[i].snapping)(inst.options.snap.release && inst.options.snap.release.call(inst.element, event, $.extend(inst._uiHash(), {
                        snapItem: inst.snapElements[i].item
                    })));
                    inst.snapElements[i].snapping = false;
                    continue;
                }
                if (o.snapMode != 'inner') {
                    var ts = Math.abs(t - y2) <= d;
                    var bs = Math.abs(b - y1) <= d;
                    var ls = Math.abs(l - x2) <= d;
                    var rs = Math.abs(r - x1) <= d;
                    if (ts) ui.position.top = inst._convertPositionTo("relative", {
                        top: t - inst.helperProportions.height,
                        left: 0
                    }).top - inst.margins.top;
                    if (bs) ui.position.top = inst._convertPositionTo("relative", {
                        top: b,
                        left: 0
                    }).top - inst.margins.top;
                    if (ls) ui.position.left = inst._convertPositionTo("relative", {
                        top: 0,
                        left: l - inst.helperProportions.width
                    }).left - inst.margins.left;
                    if (rs) ui.position.left = inst._convertPositionTo("relative", {
                        top: 0,
                        left: r
                    }).left - inst.margins.left;
                }
                var first = (ts || bs || ls || rs);
                if (o.snapMode != 'outer') {
                    var ts = Math.abs(t - y1) <= d;
                    var bs = Math.abs(b - y2) <= d;
                    var ls = Math.abs(l - x1) <= d;
                    var rs = Math.abs(r - x2) <= d;
                    if (ts) ui.position.top = inst._convertPositionTo("relative", {
                        top: t,
                        left: 0
                    }).top - inst.margins.top;
                    if (bs) ui.position.top = inst._convertPositionTo("relative", {
                        top: b - inst.helperProportions.height,
                        left: 0
                    }).top - inst.margins.top;
                    if (ls) ui.position.left = inst._convertPositionTo("relative", {
                        top: 0,
                        left: l
                    }).left - inst.margins.left;
                    if (rs) ui.position.left = inst._convertPositionTo("relative", {
                        top: 0,
                        left: r - inst.helperProportions.width
                    }).left - inst.margins.left;
                }
                if (!inst.snapElements[i].snapping && (ts || bs || ls || rs || first))(inst.options.snap.snap && inst.options.snap.snap.call(inst.element, event, $.extend(inst._uiHash(), {
                    snapItem: inst.snapElements[i].item
                })));
                inst.snapElements[i].snapping = (ts || bs || ls || rs || first);
            };
        }
    });
    $.ui.plugin.add("draggable", "stack", {
        start: function (event, ui) {
            var o = $(this).data("draggable").options;
            var group = $.makeArray($(o.stack)).sort(function (a, b) {
                return (parseInt($(a).css("zIndex"), 10) || 0) - (parseInt($(b).css("zIndex"), 10) || 0);
            });
            if (!group.length) {
                return;
            }
            var min = parseInt(group[0].style.zIndex) || 0;
            $(group).each(function (i) {
                this.style.zIndex = min + i;
            });
            this[0].style.zIndex = min + group.length;
        }
    });
    $.ui.plugin.add("draggable", "zIndex", {
        start: function (event, ui) {
            var t = $(ui.helper),
                o = $(this).data("draggable").options;
            if (t.css("zIndex")) o._zIndex = t.css("zIndex");
            t.css('zIndex', o.zIndex);
        },
        stop: function (event, ui) {
            var o = $(this).data("draggable").options;
            if (o._zIndex) $(ui.helper).css('zIndex', o._zIndex);
        }
    });
})(jQuery);
(function ($, undefined) {
    $.ui = $.ui || {};
    var horizontalPositions = /left|center|right/,
        horizontalDefault = "center",
        verticalPositions = /top|center|bottom/,
        verticalDefault = "center",
        _position = $.fn.position,
        _offset = $.fn.offset;
    $.fn.position = function (options) {
        if (!options || !options.of) {
            return _position.apply(this, arguments);
        }
        options = $.extend({}, options);
        var target = $(options.of),
            collision = (options.collision || "flip").split(" "),
            offset = options.offset ? options.offset.split(" ") : [0, 0],
            targetWidth, targetHeight, basePosition;
        if (options.of.nodeType === 9) {
            targetWidth = target.width();
            targetHeight = target.height();
            basePosition = {
                top: 0,
                left: 0
            };
        } else if (options.of.scrollTo && options.of.document) {
            targetWidth = target.width();
            targetHeight = target.height();
            basePosition = {
                top: target.scrollTop(),
                left: target.scrollLeft()
            };
        } else if (options.of.preventDefault) {
            options.at = "left top";
            targetWidth = targetHeight = 0;
            basePosition = {
                top: options.of.pageY,
                left: options.of.pageX
            };
        } else {
            targetWidth = target.outerWidth();
            targetHeight = target.outerHeight();
            basePosition = target.offset();
        }
        $.each(["my", "at"], function () {
            var pos = (options[this] || "").split(" ");
            if (pos.length === 1) {
                pos = horizontalPositions.test(pos[0]) ? pos.concat([verticalDefault]) : verticalPositions.test(pos[0]) ? [horizontalDefault].concat(pos) : [horizontalDefault, verticalDefault];
            }
            pos[0] = horizontalPositions.test(pos[0]) ? pos[0] : horizontalDefault;
            pos[1] = verticalPositions.test(pos[1]) ? pos[1] : verticalDefault;
            options[this] = pos;
        });
        if (collision.length === 1) {
            collision[1] = collision[0];
        }
        offset[0] = parseInt(offset[0], 10) || 0;
        if (offset.length === 1) {
            offset[1] = offset[0];
        }
        offset[1] = parseInt(offset[1], 10) || 0;
        if (options.at[0] === "right") {
            basePosition.left += targetWidth;
        } else if (options.at[0] === horizontalDefault) {
            basePosition.left += targetWidth / 2;
        }
        if (options.at[1] === "bottom") {
            basePosition.top += targetHeight;
        } else if (options.at[1] === verticalDefault) {
            basePosition.top += targetHeight / 2;
        }
        basePosition.left += offset[0];
        basePosition.top += offset[1];
        return this.each(function () {
            var elem = $(this),
                elemWidth = elem.outerWidth(),
                elemHeight = elem.outerHeight(),
                position = $.extend({}, basePosition);
            if (options.my[0] === "right") {
                position.left -= elemWidth;
            } else if (options.my[0] === horizontalDefault) {
                position.left -= elemWidth / 2;
            }
            if (options.my[1] === "bottom") {
                position.top -= elemHeight;
            } else if (options.my[1] === verticalDefault) {
                position.top -= elemHeight / 2;
            }
            position.left = parseInt(position.left);
            position.top = parseInt(position.top);
            $.each(["left", "top"], function (i, dir) {
                if ($.ui.position[collision[i]]) {
                    $.ui.position[collision[i]][dir](position, {
                        targetWidth: targetWidth,
                        targetHeight: targetHeight,
                        elemWidth: elemWidth,
                        elemHeight: elemHeight,
                        offset: offset,
                        my: options.my,
                        at: options.at
                    });
                }
            });
            if ($.fn.bgiframe) {
                elem.bgiframe();
            }
            elem.offset($.extend(position, {
                using: options.using
            }));
        });
    };
    $.ui.position = {
        fit: {
            left: function (position, data) {
                var win = $(window),
                    over = position.left + data.elemWidth - win.width() - win.scrollLeft();
                position.left = over > 0 ? position.left - over : Math.max(0, position.left);
            },
            top: function (position, data) {
                var win = $(window),
                    over = position.top + data.elemHeight - win.height() - win.scrollTop();
                position.top = over > 0 ? position.top - over : Math.max(0, position.top);
            }
        },
        flip: {
            left: function (position, data) {
                if (data.at[0] === "center") {
                    return;
                }
                var win = $(window),
                    over = position.left + data.elemWidth - win.width() - win.scrollLeft(),
                    myOffset = data.my[0] === "left" ? -data.elemWidth : data.my[0] === "right" ? data.elemWidth : 0,
                    offset = -2 * data.offset[0];
                position.left += position.left < 0 ? myOffset + data.targetWidth + offset : over > 0 ? myOffset - data.targetWidth + offset : 0;
            },
            top: function (position, data) {
                if (data.at[1] === "center") {
                    return;
                }
                var win = $(window),
                    over = position.top + data.elemHeight - win.height() - win.scrollTop(),
                    myOffset = data.my[1] === "top" ? -data.elemHeight : data.my[1] === "bottom" ? data.elemHeight : 0,
                    atOffset = data.at[1] === "top" ? data.targetHeight : -data.targetHeight,
                    offset = -2 * data.offset[1];
                position.top += position.top < 0 ? myOffset + data.targetHeight + offset : over > 0 ? myOffset + atOffset + offset : 0;
            }
        }
    };
    if (!$.offset.setOffset) {
        $.offset.setOffset = function (elem, options) {
            if (/static/.test($.curCSS(elem, "position"))) {
                elem.style.position = "relative";
            }
            var curElem = $(elem),
                curOffset = curElem.offset(),
                curTop = parseInt($.curCSS(elem, "top", true), 10) || 0,
                curLeft = parseInt($.curCSS(elem, "left", true), 10) || 0,
                props = {
                    top: (options.top - curOffset.top) + curTop,
                    left: (options.left - curOffset.left) + curLeft
                };
            if ('using' in options) {
                options.using.call(elem, props);
            } else {
                curElem.css(props);
            }
        };
        $.fn.offset = function (options) {
            var elem = this[0];
            if (!elem || !elem.ownerDocument) {
                return null;
            }
            if (options) {
                return this.each(function () {
                    $.offset.setOffset(this, options);
                });
            }
            return _offset.call(this);
        };
    }
}(jQuery));
(function ($, undefined) {
    $.widget("ui.resizable", $.ui.mouse, {
        widgetEventPrefix: "resize",
        options: {
            alsoResize: false,
            animate: false,
            animateDuration: "slow",
            animateEasing: "swing",
            aspectRatio: false,
            autoHide: false,
            containment: false,
            ghost: false,
            grid: false,
            handles: "e,s,se",
            helper: false,
            maxHeight: null,
            maxWidth: null,
            minHeight: 10,
            minWidth: 10,
            zIndex: 1000
        },
        _create: function () {
            var self = this,
                o = this.options;
            this.element.addClass("ui-resizable");
            $.extend(this, {
                _aspectRatio: !! (o.aspectRatio),
                aspectRatio: o.aspectRatio,
                originalElement: this.element,
                _proportionallyResizeElements: [],
                _helper: o.helper || o.ghost || o.animate ? o.helper || 'ui-resizable-helper' : null
            });
            if (this.element[0].nodeName.match(/canvas|textarea|input|select|button|img/i)) {
                if (/relative/.test(this.element.css('position')) && $.browser.opera) this.element.css({
                    position: 'relative',
                    top: 'auto',
                    left: 'auto'
                });
                this.element.wrap($('<div class="ui-wrapper" style="overflow: hidden;"></div>').css({
                    position: this.element.css('position'),
                    width: this.element.outerWidth(),
                    height: this.element.outerHeight(),
                    top: this.element.css('top'),
                    left: this.element.css('left')
                }));
                this.element = this.element.parent().data("resizable", this.element.data('resizable'));
                this.elementIsWrapper = true;
                this.element.css({
                    marginLeft: this.originalElement.css("marginLeft"),
                    marginTop: this.originalElement.css("marginTop"),
                    marginRight: this.originalElement.css("marginRight"),
                    marginBottom: this.originalElement.css("marginBottom")
                });
                this.originalElement.css({
                    marginLeft: 0,
                    marginTop: 0,
                    marginRight: 0,
                    marginBottom: 0
                });
                this.originalResizeStyle = this.originalElement.css('resize');
                this.originalElement.css('resize', 'none');
                this._proportionallyResizeElements.push(this.originalElement.css({
                    position: 'static',
                    zoom: 1,
                    display: 'block'
                }));
                this.originalElement.css({
                    margin: this.originalElement.css('margin')
                });
                this._proportionallyResize();
            }
            this.handles = o.handles || (!$('.ui-resizable-handle', this.element).length ? "e,s,se" : {
                n: '.ui-resizable-n',
                e: '.ui-resizable-e',
                s: '.ui-resizable-s',
                w: '.ui-resizable-w',
                se: '.ui-resizable-se',
                sw: '.ui-resizable-sw',
                ne: '.ui-resizable-ne',
                nw: '.ui-resizable-nw'
            });
            if (this.handles.constructor == String) {
                if (this.handles == 'all') this.handles = 'n,e,s,w,se,sw,ne,nw';
                var n = this.handles.split(",");
                this.handles = {};
                for (var i = 0; i < n.length; i++) {
                    var handle = $.trim(n[i]),
                        hname = 'ui-resizable-' + handle;
                    var axis = $('<div class="ui-resizable-handle ' + hname + '"></div>');
                    if (/sw|se|ne|nw/.test(handle)) axis.css({
                        zIndex: ++o.zIndex
                    });
                    if ('se' == handle) {
                        axis.addClass('ui-icon ui-icon-gripsmall-diagonal-se');
                    };
                    this.handles[handle] = '.ui-resizable-' + handle;
                    this.element.append(axis);
                }
            }
            this._renderAxis = function (target) {
                target = target || this.element;
                for (var i in this.handles) {
                    if (this.handles[i].constructor == String) this.handles[i] = $(this.handles[i], this.element).show();
                    if (this.elementIsWrapper && this.originalElement[0].nodeName.match(/textarea|input|select|button/i)) {
                        var axis = $(this.handles[i], this.element),
                            padWrapper = 0;
                        padWrapper = /sw|ne|nw|se|n|s/.test(i) ? axis.outerHeight() : axis.outerWidth();
                        var padPos = ['padding', /ne|nw|n/.test(i) ? 'Top' : /se|sw|s/.test(i) ? 'Bottom' : /^e$/.test(i) ? 'Right' : 'Left'].join("");
                        target.css(padPos, padWrapper);
                        this._proportionallyResize();
                    }
                    if (!$(this.handles[i]).length) continue;
                }
            };
            this._renderAxis(this.element);
            this._handles = $('.ui-resizable-handle', this.element).disableSelection();
            this._handles.mouseover(function () {
                if (!self.resizing) {
                    if (this.className) var axis = this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i);
                    self.axis = axis && axis[1] ? axis[1] : 'se';
                }
            });
            if (o.autoHide) {
                this._handles.hide();
                $(this.element).addClass("ui-resizable-autohide").hover(function () {
                    $(this).removeClass("ui-resizable-autohide");
                    self._handles.show();
                }, function () {
                    if (!self.resizing) {
                        $(this).addClass("ui-resizable-autohide");
                        self._handles.hide();
                    }
                });
            }
            this._mouseInit();
        },
        destroy: function () {
            this._mouseDestroy();
            var _destroy = function (exp) {
                $(exp).removeClass("ui-resizable ui-resizable-disabled ui-resizable-resizing").removeData("resizable").unbind(".resizable").find('.ui-resizable-handle').remove();
            };
            if (this.elementIsWrapper) {
                _destroy(this.element);
                var wrapper = this.element;
                wrapper.after(this.originalElement.css({
                    position: wrapper.css('position'),
                    width: wrapper.outerWidth(),
                    height: wrapper.outerHeight(),
                    top: wrapper.css('top'),
                    left: wrapper.css('left')
                })).remove();
            }
            this.originalElement.css('resize', this.originalResizeStyle);
            _destroy(this.originalElement);
            return this;
        },
        _mouseCapture: function (event) {
            var handle = false;
            for (var i in this.handles) {
                if ($(this.handles[i])[0] == event.target) {
                    handle = true;
                }
            }
            return !this.options.disabled && handle;
        },
        _mouseStart: function (event) {
            var o = this.options,
                iniPos = this.element.position(),
                el = this.element;
            this.resizing = true;
            this.documentScroll = {
                top: $(document).scrollTop(),
                left: $(document).scrollLeft()
            };
            if (el.is('.ui-draggable') || (/absolute/).test(el.css('position'))) {
                el.css({
                    position: 'absolute',
                    top: iniPos.top,
                    left: iniPos.left
                });
            }
            if ($.browser.opera && (/relative/).test(el.css('position'))) el.css({
                position: 'relative',
                top: 'auto',
                left: 'auto'
            });
            this._renderProxy();
            var curleft = num(this.helper.css('left')),
                curtop = num(this.helper.css('top'));
            if (o.containment) {
                curleft += $(o.containment).scrollLeft() || 0;
                curtop += $(o.containment).scrollTop() || 0;
            }
            this.offset = this.helper.offset();
            this.position = {
                left: curleft,
                top: curtop
            };
            this.size = this._helper ? {
                width: el.outerWidth(),
                height: el.outerHeight()
            } : {
                width: el.width(),
                height: el.height()
            };
            this.originalSize = this._helper ? {
                width: el.outerWidth(),
                height: el.outerHeight()
            } : {
                width: el.width(),
                height: el.height()
            };
            this.originalPosition = {
                left: curleft,
                top: curtop
            };
            this.sizeDiff = {
                width: el.outerWidth() - el.width(),
                height: el.outerHeight() - el.height()
            };
            this.originalMousePosition = {
                left: event.pageX,
                top: event.pageY
            };
            this.aspectRatio = (typeof o.aspectRatio == 'number') ? o.aspectRatio : ((this.originalSize.width / this.originalSize.height) || 1);
            var cursor = $('.ui-resizable-' + this.axis).css('cursor');
            $('body').css('cursor', cursor == 'auto' ? this.axis + '-resize' : cursor);
            el.addClass("ui-resizable-resizing");
            this._propagate("start", event);
            return true;
        },
        _mouseDrag: function (event) {
            var el = this.helper,
                o = this.options,
                props = {},
                self = this,
                smp = this.originalMousePosition,
                a = this.axis;
            var dx = (event.pageX - smp.left) || 0,
                dy = (event.pageY - smp.top) || 0;
            var trigger = this._change[a];
            if (!trigger) return false;
            var data = trigger.apply(this, [event, dx, dy]),
                ie6 = $.browser.msie && $.browser.version < 7,
                csdif = this.sizeDiff;
            if (this._aspectRatio || event.shiftKey) data = this._updateRatio(data, event);
            data = this._respectSize(data, event);
            this._propagate("resize", event);
            el.css({
                top: this.position.top + "px",
                left: this.position.left + "px",
                width: this.size.width + "px",
                height: this.size.height + "px"
            });
            if (!this._helper && this._proportionallyResizeElements.length) this._proportionallyResize();
            this._updateCache(data);
            this._trigger('resize', event, this.ui());
            return false;
        },
        _mouseStop: function (event) {
            this.resizing = false;
            var o = this.options,
                self = this;
            if (this._helper) {
                var pr = this._proportionallyResizeElements,
                    ista = pr.length && (/textarea/i).test(pr[0].nodeName),
                    soffseth = ista && $.ui.hasScroll(pr[0], 'left') ? 0 : self.sizeDiff.height,
                    soffsetw = ista ? 0 : self.sizeDiff.width;
                var s = {
                    width: (self.size.width - soffsetw),
                    height: (self.size.height - soffseth)
                },
                    left = (parseInt(self.element.css('left'), 10) + (self.position.left - self.originalPosition.left)) || null,
                    top = (parseInt(self.element.css('top'), 10) + (self.position.top - self.originalPosition.top)) || null;
                if (!o.animate) this.element.css($.extend(s, {
                    top: top,
                    left: left
                }));
                self.helper.height(self.size.height);
                self.helper.width(self.size.width);
                if (this._helper && !o.animate) this._proportionallyResize();
            }
            $('body').css('cursor', 'auto');
            this.element.removeClass("ui-resizable-resizing");
            this._propagate("stop", event);
            if (this._helper) this.helper.remove();
            return false;
        },
        _updateCache: function (data) {
            var o = this.options;
            this.offset = this.helper.offset();
            if (isNumber(data.left)) this.position.left = data.left;
            if (isNumber(data.top)) this.position.top = data.top;
            if (isNumber(data.height)) this.size.height = data.height;
            if (isNumber(data.width)) this.size.width = data.width;
        },
        _updateRatio: function (data, event) {
            var o = this.options,
                cpos = this.position,
                csize = this.size,
                a = this.axis;
            if (data.height) data.width = (csize.height * this.aspectRatio);
            else if (data.width) data.height = (csize.width / this.aspectRatio);
            if (a == 'sw') {
                data.left = cpos.left + (csize.width - data.width);
                data.top = null;
            }
            if (a == 'nw') {
                data.top = cpos.top + (csize.height - data.height);
                data.left = cpos.left + (csize.width - data.width);
            }
            return data;
        },
        _respectSize: function (data, event) {
            var el = this.helper,
                o = this.options,
                pRatio = this._aspectRatio || event.shiftKey,
                a = this.axis,
                ismaxw = isNumber(data.width) && o.maxWidth && (o.maxWidth < data.width),
                ismaxh = isNumber(data.height) && o.maxHeight && (o.maxHeight < data.height),
                isminw = isNumber(data.width) && o.minWidth && (o.minWidth > data.width),
                isminh = isNumber(data.height) && o.minHeight && (o.minHeight > data.height);
            if (isminw) data.width = o.minWidth;
            if (isminh) data.height = o.minHeight;
            if (ismaxw) data.width = o.maxWidth;
            if (ismaxh) data.height = o.maxHeight;
            var dw = this.originalPosition.left + this.originalSize.width,
                dh = this.position.top + this.size.height;
            var cw = /sw|nw|w/.test(a),
                ch = /nw|ne|n/.test(a);
            if (isminw && cw) data.left = dw - o.minWidth;
            if (ismaxw && cw) data.left = dw - o.maxWidth;
            if (isminh && ch) data.top = dh - o.minHeight;
            if (ismaxh && ch) data.top = dh - o.maxHeight;
            var isNotwh = !data.width && !data.height;
            if (isNotwh && !data.left && data.top) data.top = null;
            else if (isNotwh && !data.top && data.left) data.left = null;
            return data;
        },
        _proportionallyResize: function () {
            var o = this.options;
            if (!this._proportionallyResizeElements.length) return;
            var element = this.helper || this.element;
            for (var i = 0; i < this._proportionallyResizeElements.length; i++) {
                var prel = this._proportionallyResizeElements[i];
                if (!this.borderDif) {
                    var b = [prel.css('borderTopWidth'), prel.css('borderRightWidth'), prel.css('borderBottomWidth'), prel.css('borderLeftWidth')],
                        p = [prel.css('paddingTop'), prel.css('paddingRight'), prel.css('paddingBottom'), prel.css('paddingLeft')];
                    this.borderDif = $.map(b, function (v, i) {
                        var border = parseInt(v, 10) || 0,
                            padding = parseInt(p[i], 10) || 0;
                        return border + padding;
                    });
                }
                if ($.browser.msie && !(!($(element).is(':hidden') || $(element).parents(':hidden').length))) continue;
                prel.css({
                    height: (element.height() - this.borderDif[0] - this.borderDif[2]) || 0,
                    width: (element.width() - this.borderDif[1] - this.borderDif[3]) || 0
                });
            };
        },
        _renderProxy: function () {
            var el = this.element,
                o = this.options;
            this.elementOffset = el.offset();
            if (this._helper) {
                this.helper = this.helper || $('<div style="overflow:hidden;"></div>');
                var ie6 = $.browser.msie && $.browser.version < 7,
                    ie6offset = (ie6 ? 1 : 0),
                    pxyoffset = (ie6 ? 2 : -1);
                this.helper.addClass(this._helper).css({
                    width: this.element.outerWidth() + pxyoffset,
                    height: this.element.outerHeight() + pxyoffset,
                    position: 'absolute',
                    left: this.elementOffset.left - ie6offset + 'px',
                    top: this.elementOffset.top - ie6offset + 'px',
                    zIndex: ++o.zIndex
                });
                this.helper.appendTo("body").disableSelection();
            } else {
                this.helper = this.element;
            }
        },
        _change: {
            e: function (event, dx, dy) {
                return {
                    width: this.originalSize.width + dx
                };
            },
            w: function (event, dx, dy) {
                var o = this.options,
                    cs = this.originalSize,
                    sp = this.originalPosition;
                return {
                    left: sp.left + dx,
                    width: cs.width - dx
                };
            },
            n: function (event, dx, dy) {
                var o = this.options,
                    cs = this.originalSize,
                    sp = this.originalPosition;
                return {
                    top: sp.top + dy,
                    height: cs.height - dy
                };
            },
            s: function (event, dx, dy) {
                return {
                    height: this.originalSize.height + dy
                };
            },
            se: function (event, dx, dy) {
                return $.extend(this._change.s.apply(this, arguments), this._change.e.apply(this, [event, dx, dy]));
            },
            sw: function (event, dx, dy) {
                return $.extend(this._change.s.apply(this, arguments), this._change.w.apply(this, [event, dx, dy]));
            },
            ne: function (event, dx, dy) {
                return $.extend(this._change.n.apply(this, arguments), this._change.e.apply(this, [event, dx, dy]));
            },
            nw: function (event, dx, dy) {
                return $.extend(this._change.n.apply(this, arguments), this._change.w.apply(this, [event, dx, dy]));
            }
        },
        _propagate: function (n, event) {
            $.ui.plugin.call(this, n, [event, this.ui()]);
            (n != "resize" && this._trigger(n, event, this.ui()));
        },
        plugins: {},
        ui: function () {
            return {
                originalElement: this.originalElement,
                element: this.element,
                helper: this.helper,
                position: this.position,
                size: this.size,
                originalSize: this.originalSize,
                originalPosition: this.originalPosition
            };
        }
    });
    $.extend($.ui.resizable, {
        version: "@VERSION"
    });
    $.ui.plugin.add("resizable", "alsoResize", {
        start: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options;
            var _store = function (exp) {
                $(exp).each(function () {
                    var el = $(this);
                    el.data("resizable-alsoresize", {
                        width: parseInt(el.width(), 10),
                        height: parseInt(el.height(), 10),
                        left: parseInt(el.css('left'), 10),
                        top: parseInt(el.css('top'), 10),
                        position: el.css('position')
                    });
                });
            };
            if (typeof(o.alsoResize) == 'object' && !o.alsoResize.parentNode) {
                if (o.alsoResize.length) {
                    o.alsoResize = o.alsoResize[0];
                    _store(o.alsoResize);
                } else {
                    $.each(o.alsoResize, function (exp) {
                        _store(exp);
                    });
                }
            } else {
                _store(o.alsoResize);
            }
        },
        resize: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options,
                os = self.originalSize,
                op = self.originalPosition;
            var delta = {
                height: (self.size.height - os.height) || 0,
                width: (self.size.width - os.width) || 0,
                top: (self.position.top - op.top) || 0,
                left: (self.position.left - op.left) || 0
            },
                _alsoResize = function (exp, c) {
                    $(exp).each(function () {
                        var el = $(this),
                            start = $(this).data("resizable-alsoresize"),
                            style = {},
                            css = c && c.length ? c : el.parents(ui.originalElement[0]).length ? ['width', 'height'] : ['width', 'height', 'top', 'left'];
                        $.each(css, function (i, prop) {
                            var sum = (start[prop] || 0) + (delta[prop] || 0);
                            if (sum && sum >= 0) style[prop] = sum || null;
                        });
                        if ($.browser.opera && /relative/.test(el.css('position'))) {
                            self._revertToRelativePosition = true;
                            el.css({
                                position: 'absolute',
                                top: 'auto',
                                left: 'auto'
                            });
                        }
                        el.css(style);
                    });
                };
            if (typeof(o.alsoResize) == 'object' && !o.alsoResize.nodeType) {
                $.each(o.alsoResize, function (exp, c) {
                    _alsoResize(exp, c);
                });
            } else {
                _alsoResize(o.alsoResize);
            }
        },
        stop: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options;
            var _reset = function (exp) {
                $(exp).each(function () {
                    var el = $(this);
                    el.css({
                        position: el.data("resizable-alsoresize").position
                    });
                });
            }
            if (self._revertToRelativePosition) {
                self._revertToRelativePosition = false;
                if (typeof(o.alsoResize) == 'object' && !o.alsoResize.nodeType) {
                    $.each(o.alsoResize, function (exp) {
                        _reset(exp);
                    });
                } else {
                    _reset(o.alsoResize);
                }
            }
            $(this).removeData("resizable-alsoresize");
        }
    });
    $.ui.plugin.add("resizable", "animate", {
        stop: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options;
            var pr = self._proportionallyResizeElements,
                ista = pr.length && (/textarea/i).test(pr[0].nodeName),
                soffseth = ista && $.ui.hasScroll(pr[0], 'left') ? 0 : self.sizeDiff.height,
                soffsetw = ista ? 0 : self.sizeDiff.width;
            var style = {
                width: (self.size.width - soffsetw),
                height: (self.size.height - soffseth)
            },
                left = (parseInt(self.element.css('left'), 10) + (self.position.left - self.originalPosition.left)) || null,
                top = (parseInt(self.element.css('top'), 10) + (self.position.top - self.originalPosition.top)) || null;
            self.element.animate($.extend(style, top && left ? {
                top: top,
                left: left
            } : {}), {
                duration: o.animateDuration,
                easing: o.animateEasing,
                step: function () {
                    var data = {
                        width: parseInt(self.element.css('width'), 10),
                        height: parseInt(self.element.css('height'), 10),
                        top: parseInt(self.element.css('top'), 10),
                        left: parseInt(self.element.css('left'), 10)
                    };
                    if (pr && pr.length) $(pr[0]).css({
                        width: data.width,
                        height: data.height
                    });
                    self._updateCache(data);
                    self._propagate("resize", event);
                }
            });
        }
    });
    $.ui.plugin.add("resizable", "containment", {
        start: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options,
                el = self.element;
            var oc = o.containment,
                ce = (oc instanceof $) ? oc.get(0) : (/parent/.test(oc)) ? el.parent().get(0) : oc;
            if (!ce) return;
            self.containerElement = $(ce);
            if (/document/.test(oc) || oc == document) {
                self.containerOffset = {
                    left: 0,
                    top: 0
                };
                self.containerPosition = {
                    left: 0,
                    top: 0
                };
                self.parentData = {
                    element: $(document),
                    left: 0,
                    top: 0,
                    width: $(document).width(),
                    height: $(document).height() || document.body.parentNode.scrollHeight
                };
            } else {
                var element = $(ce),
                    p = [];
                $(["Top", "Right", "Left", "Bottom"]).each(function (i, name) {
                    p[i] = num(element.css("padding" + name));
                });
                self.containerOffset = element.offset();
                self.containerPosition = element.position();
                self.containerSize = {
                    height: (element.innerHeight() - p[3]),
                    width: (element.innerWidth() - p[1])
                };
                var co = self.containerOffset,
                    ch = self.containerSize.height,
                    cw = self.containerSize.width,
                    width = ($.ui.hasScroll(ce, "left") ? ce.scrollWidth : cw),
                    height = ($.ui.hasScroll(ce) ? ce.scrollHeight : ch);
                self.parentData = {
                    element: ce,
                    left: co.left,
                    top: co.top,
                    width: width,
                    height: height
                };
            }
        },
        resize: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options,
                ps = self.containerSize,
                co = self.containerOffset,
                cs = self.size,
                cp = self.position,
                pRatio = self._aspectRatio || event.shiftKey,
                cop = {
                    top: 0,
                    left: 0
                },
                ce = self.containerElement;
            if (ce[0] != document && (/static/).test(ce.css('position'))) cop = co;
            if (cp.left < (self._helper ? co.left : 0)) {
                self.size.width = self.size.width + (self._helper ? (self.position.left - co.left) : (self.position.left - cop.left));
                if (pRatio) self.size.height = self.size.width / o.aspectRatio;
                self.position.left = o.helper ? co.left : 0;
            }
            if (cp.top < (self._helper ? co.top : 0)) {
                self.size.height = self.size.height + (self._helper ? (self.position.top - co.top) : self.position.top);
                if (pRatio) self.size.width = self.size.height * o.aspectRatio;
                self.position.top = self._helper ? co.top : 0;
            }
            self.offset.left = self.parentData.left + self.position.left;
            self.offset.top = self.parentData.top + self.position.top;
            var woset = Math.abs((self._helper ? self.offset.left - cop.left : (self.offset.left - cop.left)) + self.sizeDiff.width),
                hoset = Math.abs((self._helper ? self.offset.top - cop.top : (self.offset.top - co.top)) + self.sizeDiff.height);
            var isParent = self.containerElement.get(0) == self.element.parent().get(0),
                isOffsetRelative = /relative|absolute/.test(self.containerElement.css('position'));
            if (isParent && isOffsetRelative) woset -= self.parentData.left;
            if (woset + self.size.width >= self.parentData.width) {
                self.size.width = self.parentData.width - woset;
                if (pRatio) self.size.height = self.size.width / self.aspectRatio;
            }
            if (hoset + self.size.height >= self.parentData.height) {
                self.size.height = self.parentData.height - hoset;
                if (pRatio) self.size.width = self.size.height * self.aspectRatio;
            }
        },
        stop: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options,
                cp = self.position,
                co = self.containerOffset,
                cop = self.containerPosition,
                ce = self.containerElement;
            var helper = $(self.helper),
                ho = helper.offset(),
                w = helper.outerWidth() - self.sizeDiff.width,
                h = helper.outerHeight() - self.sizeDiff.height;
            if (self._helper && !o.animate && (/relative/).test(ce.css('position'))) $(this).css({
                left: ho.left - cop.left - co.left,
                width: w,
                height: h
            });
            if (self._helper && !o.animate && (/static/).test(ce.css('position'))) $(this).css({
                left: ho.left - cop.left - co.left,
                width: w,
                height: h
            });
        }
    });
    $.ui.plugin.add("resizable", "ghost", {
        start: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options,
                cs = self.size;
            self.ghost = self.originalElement.clone();
            self.ghost.css({
                opacity: .25,
                display: 'block',
                position: 'relative',
                height: cs.height,
                width: cs.width,
                margin: 0,
                left: 0,
                top: 0
            }).addClass('ui-resizable-ghost').addClass(typeof o.ghost == 'string' ? o.ghost : '');
            self.ghost.appendTo(self.helper);
        },
        resize: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options;
            if (self.ghost) self.ghost.css({
                position: 'relative',
                height: self.size.height,
                width: self.size.width
            });
        },
        stop: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options;
            if (self.ghost && self.helper) self.helper.get(0).removeChild(self.ghost.get(0));
        }
    });
    $.ui.plugin.add("resizable", "grid", {
        resize: function (event, ui) {
            var self = $(this).data("resizable"),
                o = self.options,
                cs = self.size,
                os = self.originalSize,
                op = self.originalPosition,
                a = self.axis,
                ratio = o._aspectRatio || event.shiftKey;
            o.grid = typeof o.grid == "number" ? [o.grid, o.grid] : o.grid;
            var ox = Math.round((cs.width - os.width) / (o.grid[0] || 1)) * (o.grid[0] || 1),
                oy = Math.round((cs.height - os.height) / (o.grid[1] || 1)) * (o.grid[1] || 1);
            if (/^(se|s|e)$/.test(a)) {
                self.size.width = os.width + ox;
                self.size.height = os.height + oy;
            } else if (/^(ne)$/.test(a)) {
                self.size.width = os.width + ox;
                self.size.height = os.height + oy;
                self.position.top = op.top - oy;
            } else if (/^(sw)$/.test(a)) {
                self.size.width = os.width + ox;
                self.size.height = os.height + oy;
                self.position.left = op.left - ox;
            } else {
                self.size.width = os.width + ox;
                self.size.height = os.height + oy;
                self.position.top = op.top - oy;
                self.position.left = op.left - ox;
            }
        }
    });
    var num = function (v) {
        return parseInt(v, 10) || 0;
    };
    var isNumber = function (value) {
        return !isNaN(parseInt(value, 10));
    };
})(jQuery);
(function ($, undefined) {
    var uiDialogClasses = 'ui-dialog ' + 'ui-widget ' + 'ui-widget-content ' + 'ui-corner-all ';
    $.widget("ui.dialog", {
        options: {
            autoOpen: true,
            buttons: {},
            closeOnEscape: true,
            closeText: 'close',
            dialogClass: '',
            draggable: true,
            hide: null,
            height: 'auto',
            maxHeight: false,
            maxWidth: false,
            minHeight: 150,
            minWidth: 150,
            modal: false,
            position: {
                my: 'center',
                at: 'center',
                of: window,
                collision: 'fit',
                using: function (pos) {
                    var topOffset = $(this).css(pos).offset().top;
                    if (topOffset < 0) {
                        $(this).css('top', pos.top - topOffset);
                    }
                }
            },
            resizable: true,
            show: null,
            stack: true,
            title: '',
            width: 300,
            zIndex: 1000
        },
        _create: function () {
            this.originalTitle = this.element.attr('title');
            if (typeof this.originalTitle !== "string") {
                this.originalTitle = "";
            }
            var self = this,
                options = self.options,
                title = options.title || self.originalTitle || '&#160;',
                titleId = $.ui.dialog.getTitleId(self.element),
                uiDialog = (self.uiDialog = $('<div></div>')).appendTo(document.body).hide().addClass(uiDialogClasses + options.dialogClass).css({
                    zIndex: options.zIndex
                }).attr('tabIndex', -1).css('outline', 0).keydown(function (event) {
                    if (options.closeOnEscape && event.keyCode && event.keyCode === $.ui.keyCode.ESCAPE) {
                        self.close(event);
                        event.preventDefault();
                    }
                }).attr({
                    role: 'dialog',
                    'aria-labelledby': titleId
                }).mousedown(function (event) {
                    self.moveToTop(false, event);
                }),
                uiDialogContent = self.element.show().removeAttr('title').addClass('ui-dialog-content ' + 'ui-widget-content').appendTo(uiDialog),
                uiDialogTitlebar = (self.uiDialogTitlebar = $('<div></div>')).addClass('ui-dialog-titlebar ' + 'ui-widget-header ' + 'ui-corner-all ' + 'ui-helper-clearfix').prependTo(uiDialog),
                uiDialogTitlebarClose = $('<a href="#"></a>').addClass('ui-dialog-titlebar-close ' + 'ui-corner-all').attr('role', 'button').hover(function () {
                    uiDialogTitlebarClose.addClass('ui-state-hover');
                }, function () {
                    uiDialogTitlebarClose.removeClass('ui-state-hover');
                }).focus(function () {
                    uiDialogTitlebarClose.addClass('ui-state-focus');
                }).blur(function () {
                    uiDialogTitlebarClose.removeClass('ui-state-focus');
                }).click(function (event) {
                    self.close(event);
                    return false;
                }).appendTo(uiDialogTitlebar),
                uiDialogTitlebarCloseText = (self.uiDialogTitlebarCloseText = $('<span></span>')).addClass('ui-icon ' + 'ui-icon-closethick').text(options.closeText).appendTo(uiDialogTitlebarClose),
                uiDialogTitle = $('<span></span>').addClass('ui-dialog-title').attr('id', titleId).html(title).prependTo(uiDialogTitlebar);
            if ($.isFunction(options.beforeclose) && !$.isFunction(options.beforeClose)) {
                options.beforeClose = options.beforeclose;
            }
            uiDialogTitlebar.find("*").add(uiDialogTitlebar).disableSelection();
            if (options.draggable && $.fn.draggable) {
                self._makeDraggable();
            }
            if (options.resizable && $.fn.resizable) {
                self._makeResizable();
            }
            self._createButtons(options.buttons);
            self._isOpen = false;
            if ($.fn.bgiframe) {
                uiDialog.bgiframe();
            }
        },
        _init: function () {
            if (this.options.autoOpen) {
                this.open();
            }
        },
        destroy: function () {
            var self = this;
            if (self.overlay) {
                self.overlay.destroy();
            }
            self.uiDialog.hide();
            self.element.unbind('.dialog').removeData('dialog').removeClass('ui-dialog-content ui-widget-content').hide().appendTo('body');
            self.uiDialog.remove();
            if (self.originalTitle) {
                self.element.attr('title', self.originalTitle);
            }
            return self;
        },
        widget: function () {
            return this.uiDialog;
        },
        close: function (event) {
            var self = this,
                maxZ;
            if (false === self._trigger('beforeClose', event)) {
                return;
            }
            if (self.overlay) {
                self.overlay.destroy();
            }
            self.uiDialog.unbind('keypress.ui-dialog');
            self._isOpen = false;
            if (self.options.hide) {
                self.uiDialog.hide(self.options.hide, function () {
                    self._trigger('close', event);
                });
            } else {
                self.uiDialog.hide();
                self._trigger('close', event);
            }
            $.ui.dialog.overlay.resize();
            if (self.options.modal) {
                maxZ = 0;
                $('.ui-dialog').each(function () {
                    if (this !== self.uiDialog[0]) {
                        maxZ = Math.max(maxZ, $(this).css('z-index'));
                    }
                });
                $.ui.dialog.maxZ = maxZ;
            }
            return self;
        },
        isOpen: function () {
            return this._isOpen;
        },
        moveToTop: function (force, event) {
            var self = this,
                options = self.options,
                saveScroll;
            if ((options.modal && !force) || (!options.stack && !options.modal)) {
                return self._trigger('focus', event);
            }
            if (options.zIndex > $.ui.dialog.maxZ) {
                $.ui.dialog.maxZ = options.zIndex;
            }
            if (self.overlay) {
                $.ui.dialog.maxZ += 1;
                self.overlay.$el.css('z-index', $.ui.dialog.overlay.maxZ = $.ui.dialog.maxZ);
            }
            saveScroll = {
                scrollTop: self.element.attr('scrollTop'),
                scrollLeft: self.element.attr('scrollLeft')
            };
            $.ui.dialog.maxZ += 1;
            self.uiDialog.css('z-index', $.ui.dialog.maxZ);
            self.element.attr(saveScroll);
            self._trigger('focus', event);
            return self;
        },
        open: function () {
            if (this._isOpen) {
                return;
            }
            var self = this,
                options = self.options,
                uiDialog = self.uiDialog;
            self.overlay = options.modal ? new $.ui.dialog.overlay(self) : null;
            if (uiDialog.next().length) {
                uiDialog.appendTo('body');
            }
            self._size();
            self._position(options.position);
            uiDialog.show(options.show);
            self.moveToTop(true);
            if (options.modal) {
                uiDialog.bind('keypress.ui-dialog', function (event) {
                    if (event.keyCode !== $.ui.keyCode.TAB) {
                        return;
                    }
                    var tabbables = $(':tabbable', this),
                        first = tabbables.filter(':first'),
                        last = tabbables.filter(':last');
                    if (event.target === last[0] && !event.shiftKey) {
                        first.focus(1);
                        return false;
                    } else if (event.target === first[0] && event.shiftKey) {
                        last.focus(1);
                        return false;
                    }
                });
            }
            $(self.element.find(':tabbable').get().concat(uiDialog.find('.ui-dialog-buttonpane :tabbable').get().concat(uiDialog.get()))).eq(0).focus();
            self._trigger('open');
            self._isOpen = true;
            return self;
        },
        _createButtons: function (buttons) {
            var self = this,
                hasButtons = false,
                uiDialogButtonPane = $('<div></div>').addClass('ui-dialog-buttonpane ' + 'ui-widget-content ' + 'ui-helper-clearfix'),
                uiButtonSet = $("<div></div>").addClass("ui-dialog-buttonset").appendTo(uiDialogButtonPane);
            self.uiDialog.find('.ui-dialog-buttonpane').remove();
            if (typeof buttons === 'object' && buttons !== null) {
                $.each(buttons, function () {
                    return !(hasButtons = true);
                });
            }
            if (hasButtons) {
                $.each(buttons, function (name, fn) {
                    var button = $('<button type="button"></button>').text(name).click(function () {
                        fn.apply(self.element[0], arguments);
                    }).appendTo(uiButtonSet);
                    if ($.fn.button) {
                        button.button();
                    }
                });
                uiDialogButtonPane.appendTo(self.uiDialog);
            }
        },
        _makeDraggable: function () {
            var self = this,
                options = self.options,
                doc = $(document),
                heightBeforeDrag;

            function filteredUi(ui) {
                return {
                    position: ui.position,
                    offset: ui.offset
                };
            }
            self.uiDialog.draggable({
                cancel: '.ui-dialog-content, .ui-dialog-titlebar-close',
                handle: '.ui-dialog-titlebar',
                containment: 'document',
                start: function (event, ui) {
                    heightBeforeDrag = options.height === "auto" ? "auto" : $(this).height();
                    $(this).height($(this).height()).addClass("ui-dialog-dragging");
                    self._trigger('dragStart', event, filteredUi(ui));
                },
                drag: function (event, ui) {
                    self._trigger('drag', event, filteredUi(ui));
                },
                stop: function (event, ui) {
                    options.position = [ui.position.left - doc.scrollLeft(), ui.position.top - doc.scrollTop()];
                    $(this).removeClass("ui-dialog-dragging").height(heightBeforeDrag);
                    self._trigger('dragStop', event, filteredUi(ui));
                    $.ui.dialog.overlay.resize();
                }
            });
        },
        _makeResizable: function (handles) {
            handles = (handles === undefined ? this.options.resizable : handles);
            var self = this,
                options = self.options,
                position = self.uiDialog.css('position'),
                resizeHandles = (typeof handles === 'string' ? handles : 'n,e,s,w,se,sw,ne,nw');

            function filteredUi(ui) {
                return {
                    originalPosition: ui.originalPosition,
                    originalSize: ui.originalSize,
                    position: ui.position,
                    size: ui.size
                };
            }
            self.uiDialog.resizable({
                cancel: '.ui-dialog-content',
                containment: 'document',
                alsoResize: self.element,
                maxWidth: options.maxWidth,
                maxHeight: options.maxHeight,
                minWidth: options.minWidth,
                minHeight: self._minHeight(),
                handles: resizeHandles,
                start: function (event, ui) {
                    $(this).addClass("ui-dialog-resizing");
                    self._trigger('resizeStart', event, filteredUi(ui));
                },
                resize: function (event, ui) {
                    self._trigger('resize', event, filteredUi(ui));
                },
                stop: function (event, ui) {
                    $(this).removeClass("ui-dialog-resizing");
                    options.height = $(this).height();
                    options.width = $(this).width();
                    self._trigger('resizeStop', event, filteredUi(ui));
                    $.ui.dialog.overlay.resize();
                }
            }).css('position', position).find('.ui-resizable-se').addClass('ui-icon ui-icon-grip-diagonal-se');
        },
        _minHeight: function () {
            var options = this.options;
            if (options.height === 'auto') {
                return options.minHeight;
            } else {
                return Math.min(options.minHeight, options.height);
            }
        },
        _position: function (position) {
            var myAt = [],
                offset = [0, 0],
                isVisible;
            if (position) {
                if (typeof position === 'string' || (typeof position === 'object' && '0' in position)) {
                    myAt = position.split ? position.split(' ') : [position[0], position[1]];
                    if (myAt.length === 1) {
                        myAt[1] = myAt[0];
                    }
                    $.each(['left', 'top'], function (i, offsetPosition) {
                        if (+myAt[i] === myAt[i]) {
                            offset[i] = myAt[i];
                            myAt[i] = offsetPosition;
                        }
                    });
                    position = {
                        my: myAt.join(" "),
                        at: myAt.join(" "),
                        offset: offset.join(" ")
                    };
                }
                position = $.extend({}, $.ui.dialog.prototype.options.position, position);
            } else {
                position = $.ui.dialog.prototype.options.position;
            }
            isVisible = this.uiDialog.is(':visible');
            if (!isVisible) {
                this.uiDialog.show();
            }
            this.uiDialog.css({
                top: 0,
                left: 0
            }).position(position);
            if (!isVisible) {
                this.uiDialog.hide();
            }
        },
        _setOption: function (key, value) {
            var self = this,
                uiDialog = self.uiDialog,
                isResizable = uiDialog.is(':data(resizable)'),
                resize = false;
            switch (key) {
            case "beforeclose":
                key = "beforeClose";
                break;
            case "buttons":
                self._createButtons(value);
                resize = true;
                break;
            case "closeText":
                self.uiDialogTitlebarCloseText.text("" + value);
                break;
            case "dialogClass":
                uiDialog.removeClass(self.options.dialogClass).addClass(uiDialogClasses + value);
                break;
            case "disabled":
                if (value) {
                    uiDialog.addClass('ui-dialog-disabled');
                } else {
                    uiDialog.removeClass('ui-dialog-disabled');
                }
                break;
            case "draggable":
                if (value) {
                    self._makeDraggable();
                } else {
                    uiDialog.draggable('destroy');
                }
                break;
            case "height":
                resize = true;
                break;
            case "maxHeight":
                if (isResizable) {
                    uiDialog.resizable('option', 'maxHeight', value);
                }
                resize = true;
                break;
            case "maxWidth":
                if (isResizable) {
                    uiDialog.resizable('option', 'maxWidth', value);
                }
                resize = true;
                break;
            case "minHeight":
                if (isResizable) {
                    uiDialog.resizable('option', 'minHeight', value);
                }
                resize = true;
                break;
            case "minWidth":
                if (isResizable) {
                    uiDialog.resizable('option', 'minWidth', value);
                }
                resize = true;
                break;
            case "position":
                self._position(value);
                break;
            case "resizable":
                if (isResizable && !value) {
                    uiDialog.resizable('destroy');
                }
                if (isResizable && typeof value === 'string') {
                    uiDialog.resizable('option', 'handles', value);
                }
                if (!isResizable && value !== false) {
                    self._makeResizable(value);
                }
                break;
            case "title":
                $(".ui-dialog-title", self.uiDialogTitlebar).html("" + (value || '&#160;'));
                break;
            case "width":
                resize = true;
                break;
            }
            $.Widget.prototype._setOption.apply(self, arguments);
            if (resize) {
                self._size();
            }
        },
        _size: function () {
            var options = this.options,
                nonContentHeight;
            this.element.css({
                width: 'auto',
                minHeight: 0,
                height: 0
            });
            if (options.minWidth > options.width) {
                options.width = options.minWidth;
            }
            nonContentHeight = this.uiDialog.css({
                height: 'auto',
                width: options.width
            }).height();
            this.element.css(options.height === 'auto' ? {
                minHeight: Math.max(options.minHeight - nonContentHeight, 0),
                height: 'auto'
            } : {
                minHeight: 0,
                height: Math.max(options.height - nonContentHeight, 0)
            }).show();
            if (this.uiDialog.is(':data(resizable)')) {
                this.uiDialog.resizable('option', 'minHeight', this._minHeight());
            }
        }
    });
    $.extend($.ui.dialog, {
        version: "@VERSION",
        uuid: 0,
        maxZ: 0,
        getTitleId: function ($el) {
            var id = $el.attr('id');
            if (!id) {
                this.uuid += 1;
                id = this.uuid;
            }
            return 'ui-dialog-title-' + id;
        },
        overlay: function (dialog) {
            this.$el = $.ui.dialog.overlay.create(dialog);
        }
    });
    $.extend($.ui.dialog.overlay, {
        instances: [],
        oldInstances: [],
        maxZ: 0,
        events: $.map('focus,mousedown,mouseup,keydown,keypress,click'.split(','), function (event) {
            return event + '.dialog-overlay';
        }).join(' '),
        create: function (dialog) {
            if (this.instances.length === 0) {
                setTimeout(function () {
                    if ($.ui.dialog.overlay.instances.length) {
                        $(document).bind($.ui.dialog.overlay.events, function (event) {
                            return ($(event.target).zIndex() >= $.ui.dialog.overlay.maxZ);
                        });
                    }
                }, 1);
                $(document).bind('keydown.dialog-overlay', function (event) {
                    if (dialog.options.closeOnEscape && event.keyCode && event.keyCode === $.ui.keyCode.ESCAPE) {
                        dialog.close(event);
                        event.preventDefault();
                    }
                });
                $(window).bind('resize.dialog-overlay', $.ui.dialog.overlay.resize);
            }
            var $el = (this.oldInstances.pop() || $('<div></div>').addClass('ui-widget-overlay')).appendTo(document.body).css({
                width: this.width(),
                height: this.height()
            });
            if ($.fn.bgiframe) {
                $el.bgiframe();
            }
            this.instances.push($el);
            return $el;
        },
        destroy: function ($el) {
            this.oldInstances.push(this.instances.splice($.inArray($el, this.instances), 1)[0]);
            if (this.instances.length === 0) {
                $([document, window]).unbind('.dialog-overlay');
            }
            $el.remove();
            var maxZ = 0;
            $.each(this.instances, function () {
                maxZ = Math.max(maxZ, this.css('z-index'));
            });
            this.maxZ = maxZ;
        },
        height: function () {
            var scrollHeight, offsetHeight;
            if ($.browser.msie && $.browser.version < 7) {
                scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
                offsetHeight = Math.max(document.documentElement.offsetHeight, document.body.offsetHeight);
                if (scrollHeight < offsetHeight) {
                    return $(window).height() + 'px';
                } else {
                    return scrollHeight + 'px';
                }
            } else {
                return $(document).height() + 'px';
            }
        },
        width: function () {
            var scrollWidth, offsetWidth;
            if ($.browser.msie && $.browser.version < 7) {
                scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
                offsetWidth = Math.max(document.documentElement.offsetWidth, document.body.offsetWidth);
                if (scrollWidth < offsetWidth) {
                    return $(window).width() + 'px';
                } else {
                    return scrollWidth + 'px';
                }
            } else {
                return $(document).width() + 'px';
            }
        },
        resize: function () {
            var $overlays = $([]);
            $.each($.ui.dialog.overlay.instances, function () {
                $overlays = $overlays.add(this);
            });
            $overlays.css({
                width: 0,
                height: 0
            }).css({
                width: $.ui.dialog.overlay.width(),
                height: $.ui.dialog.overlay.height()
            });
        }
    });
    $.extend($.ui.dialog.overlay.prototype, {
        destroy: function () {
            $.ui.dialog.overlay.destroy(this.$el);
        }
    });
}(jQuery));;
jQuery.effects || (function ($, undefined) {
    $.effects = {};
    $.each(['backgroundColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor', 'color', 'outlineColor'], function (i, attr) {
        $.fx.step[attr] = function (fx) {
            if (!fx.colorInit) {
                fx.start = getColor(fx.elem, attr);
                fx.end = getRGB(fx.end);
                fx.colorInit = true;
            }
            fx.elem.style[attr] = 'rgb(' + Math.max(Math.min(parseInt((fx.pos * (fx.end[0] - fx.start[0])) + fx.start[0], 10), 255), 0) + ',' + Math.max(Math.min(parseInt((fx.pos * (fx.end[1] - fx.start[1])) + fx.start[1], 10), 255), 0) + ',' + Math.max(Math.min(parseInt((fx.pos * (fx.end[2] - fx.start[2])) + fx.start[2], 10), 255), 0) + ')';
        };
    });

    function getRGB(color) {
        var result;
        if (color && color.constructor == Array && color.length == 3) return color;
        if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color)) return [parseInt(result[1], 10), parseInt(result[2], 10), parseInt(result[3], 10)];
        if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color)) return [parseFloat(result[1]) * 2.55, parseFloat(result[2]) * 2.55, parseFloat(result[3]) * 2.55];
        if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color)) return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
        if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color)) return [parseInt(result[1] + result[1], 16), parseInt(result[2] + result[2], 16), parseInt(result[3] + result[3], 16)];
        if (result = /rgba\(0, 0, 0, 0\)/.exec(color)) return colors['transparent'];
        return colors[$.trim(color).toLowerCase()];
    }

    function getColor(elem, attr) {
        var color;
        do {
            color = $.curCSS(elem, attr);
            if (color != '' && color != 'transparent' || $.nodeName(elem, "body")) break;
            attr = "backgroundColor";
        } while (elem = elem.parentNode);
        return getRGB(color);
    };
    var colors = {
        aqua: [0, 255, 255],
        azure: [240, 255, 255],
        beige: [245, 245, 220],
        black: [0, 0, 0],
        blue: [0, 0, 255],
        brown: [165, 42, 42],
        cyan: [0, 255, 255],
        darkblue: [0, 0, 139],
        darkcyan: [0, 139, 139],
        darkgrey: [169, 169, 169],
        darkgreen: [0, 100, 0],
        darkkhaki: [189, 183, 107],
        darkmagenta: [139, 0, 139],
        darkolivegreen: [85, 107, 47],
        darkorange: [255, 140, 0],
        darkorchid: [153, 50, 204],
        darkred: [139, 0, 0],
        darksalmon: [233, 150, 122],
        darkviolet: [148, 0, 211],
        fuchsia: [255, 0, 255],
        gold: [255, 215, 0],
        green: [0, 128, 0],
        indigo: [75, 0, 130],
        khaki: [240, 230, 140],
        lightblue: [173, 216, 230],
        lightcyan: [224, 255, 255],
        lightgreen: [144, 238, 144],
        lightgrey: [211, 211, 211],
        lightpink: [255, 182, 193],
        lightyellow: [255, 255, 224],
        lime: [0, 255, 0],
        magenta: [255, 0, 255],
        maroon: [128, 0, 0],
        navy: [0, 0, 128],
        olive: [128, 128, 0],
        orange: [255, 165, 0],
        pink: [255, 192, 203],
        purple: [128, 0, 128],
        violet: [128, 0, 128],
        red: [255, 0, 0],
        silver: [192, 192, 192],
        white: [255, 255, 255],
        yellow: [255, 255, 0],
        transparent: [255, 255, 255]
    };
    var classAnimationActions = ['add', 'remove', 'toggle'],
        shorthandStyles = {
            border: 1,
            borderBottom: 1,
            borderColor: 1,
            borderLeft: 1,
            borderRight: 1,
            borderTop: 1,
            borderWidth: 1,
            margin: 1,
            padding: 1
        };

    function getElementStyles() {
        var style = document.defaultView ? document.defaultView.getComputedStyle(this, null) : this.currentStyle,
            newStyle = {},
            key, camelCase;
        if (style && style.length && style[0] && style[style[0]]) {
            var len = style.length;
            while (len--) {
                key = style[len];
                if (typeof style[key] == 'string') {
                    camelCase = key.replace(/\-(\w)/g, function (all, letter) {
                        return letter.toUpperCase();
                    });
                    newStyle[camelCase] = style[key];
                }
            }
        } else {
            for (key in style) {
                if (typeof style[key] === 'string') {
                    newStyle[key] = style[key];
                }
            }
        }
        return newStyle;
    }

    function filterStyles(styles) {
        var name, value;
        for (name in styles) {
            value = styles[name];
            if (value == null || $.isFunction(value) || name in shorthandStyles || (/scrollbar/).test(name) || (!(/color/i).test(name) && isNaN(parseFloat(value)))) {
                delete styles[name];
            }
        }
        return styles;
    }

    function styleDifference(oldStyle, newStyle) {
        var diff = {
            _: 0
        },
            name;
        for (name in newStyle) {
            if (oldStyle[name] != newStyle[name]) {
                diff[name] = newStyle[name];
            }
        }
        return diff;
    }
    $.effects.animateClass = function (value, duration, easing, callback) {
        if ($.isFunction(easing)) {
            callback = easing;
            easing = null;
        }
        return this.each(function () {
            var that = $(this),
                originalStyleAttr = that.attr('style') || ' ',
                originalStyle = filterStyles(getElementStyles.call(this)),
                newStyle, className = that.attr('className');
            $.each(classAnimationActions, function (i, action) {
                if (value[action]) {
                    that[action + 'Class'](value[action]);
                }
            });
            newStyle = filterStyles(getElementStyles.call(this));
            that.attr('className', className);
            that.animate(styleDifference(originalStyle, newStyle), duration, easing, function () {
                $.each(classAnimationActions, function (i, action) {
                    if (value[action]) {
                        that[action + 'Class'](value[action]);
                    }
                });
                if (typeof that.attr('style') == 'object') {
                    that.attr('style').cssText = '';
                    that.attr('style').cssText = originalStyleAttr;
                } else {
                    that.attr('style', originalStyleAttr);
                }
                if (callback) {
                    callback.apply(this, arguments);
                }
            });
        });
    };
    $.fn.extend({
        _addClass: $.fn.addClass,
        addClass: function (classNames, speed, easing, callback) {
            return speed ? $.effects.animateClass.apply(this, [{
                add: classNames
            },
            speed, easing, callback]) : this._addClass(classNames);
        },
        _removeClass: $.fn.removeClass,
        removeClass: function (classNames, speed, easing, callback) {
            return speed ? $.effects.animateClass.apply(this, [{
                remove: classNames
            },
            speed, easing, callback]) : this._removeClass(classNames);
        },
        _toggleClass: $.fn.toggleClass,
        toggleClass: function (classNames, force, speed, easing, callback) {
            if (typeof force == "boolean" || force === undefined) {
                if (!speed) {
                    return this._toggleClass(classNames, force);
                } else {
                    return $.effects.animateClass.apply(this, [(force ? {
                        add: classNames
                    } : {
                        remove: classNames
                    }), speed, easing, callback]);
                }
            } else {
                return $.effects.animateClass.apply(this, [{
                    toggle: classNames
                },
                force, speed, easing]);
            }
        },
        switchClass: function (remove, add, speed, easing, callback) {
            return $.effects.animateClass.apply(this, [{
                add: add,
                remove: remove
            },
            speed, easing, callback]);
        }
    });
    $.extend($.effects, {
        version: "@VERSION",
        save: function (element, set) {
            for (var i = 0; i < set.length; i++) {
                if (set[i] !== null) element.data("ec.storage." + set[i], element[0].style[set[i]]);
            }
        },
        restore: function (element, set) {
            for (var i = 0; i < set.length; i++) {
                if (set[i] !== null) element.css(set[i], element.data("ec.storage." + set[i]));
            }
        },
        setMode: function (el, mode) {
            if (mode == 'toggle') mode = el.is(':hidden') ? 'show' : 'hide';
            return mode;
        },
        getBaseline: function (origin, original) {
            var y, x;
            switch (origin[0]) {
            case 'top':
                y = 0;
                break;
            case 'middle':
                y = 0.5;
                break;
            case 'bottom':
                y = 1;
                break;
            default:
                y = origin[0] / original.height;
            };
            switch (origin[1]) {
            case 'left':
                x = 0;
                break;
            case 'center':
                x = 0.5;
                break;
            case 'right':
                x = 1;
                break;
            default:
                x = origin[1] / original.width;
            };
            return {
                x: x,
                y: y
            };
        },
        createWrapper: function (element) {
            if (element.parent().is('.ui-effects-wrapper')) {
                return element.parent();
            }
            var props = {
                width: element.outerWidth(true),
                height: element.outerHeight(true),
                'float': element.css('float')
            },
                wrapper = $('<div></div>').addClass('ui-effects-wrapper').css({
                    fontSize: '100%',
                    background: 'transparent',
                    border: 'none',
                    margin: 0,
                    padding: 0
                });
            element.wrap(wrapper);
            wrapper = element.parent();
            if (element.css('position') == 'static') {
                wrapper.css({
                    position: 'relative'
                });
                element.css({
                    position: 'relative'
                });
            } else {
                $.extend(props, {
                    position: element.css('position'),
                    zIndex: element.css('z-index')
                });
                $.each(['top', 'left', 'bottom', 'right'], function (i, pos) {
                    props[pos] = element.css(pos);
                    if (isNaN(parseInt(props[pos], 10))) {
                        props[pos] = 'auto';
                    }
                });
                element.css({
                    position: 'relative',
                    top: 0,
                    left: 0
                });
            }
            return wrapper.css(props).show();
        },
        removeWrapper: function (element) {
            if (element.parent().is('.ui-effects-wrapper')) return element.parent().replaceWith(element);
            return element;
        },
        setTransition: function (element, list, factor, value) {
            value = value || {};
            $.each(list, function (i, x) {
                unit = element.cssUnit(x);
                if (unit[0] > 0) value[x] = unit[0] * factor + unit[1];
            });
            return value;
        }
    });

    function _normalizeArguments(effect, options, speed, callback) {
        if (typeof effect == 'object') {
            callback = options;
            speed = null;
            options = effect;
            effect = options.effect;
        }
        if ($.isFunction(options)) {
            callback = options;
            speed = null;
            options = {};
        }
        if (typeof options == 'number' || $.fx.speeds[options]) {
            callback = speed;
            speed = options;
            options = {};
        }
        if ($.isFunction(speed)) {
            callback = speed;
            speed = null;
        }
        options = options || {};
        speed = speed || options.duration;
        speed = $.fx.off ? 0 : typeof speed == 'number' ? speed : $.fx.speeds[speed] || $.fx.speeds._default;
        callback = callback || options.complete;
        return [effect, options, speed, callback];
    }
    $.fn.extend({
        effect: function (effect, options, speed, callback) {
            var args = _normalizeArguments.apply(this, arguments),
                args2 = {
                    options: args[1],
                    duration: args[2],
                    callback: args[3]
                },
                effectMethod = $.effects[effect];
            return effectMethod && !$.fx.off ? effectMethod.call(this, args2) : this;
        },
        _show: $.fn.show,
        show: function (speed) {
            if (!speed || typeof speed == 'number' || $.fx.speeds[speed]) {
                return this._show.apply(this, arguments);
            } else {
                var args = _normalizeArguments.apply(this, arguments);
                args[1].mode = 'show';
                return this.effect.apply(this, args);
            }
        },
        _hide: $.fn.hide,
        hide: function (speed) {
            if (!speed || typeof speed == 'number' || $.fx.speeds[speed]) {
                return this._hide.apply(this, arguments);
            } else {
                var args = _normalizeArguments.apply(this, arguments);
                args[1].mode = 'hide';
                return this.effect.apply(this, args);
            }
        },
        __toggle: $.fn.toggle,
        toggle: function (speed) {
            if (!speed || typeof speed == 'number' || $.fx.speeds[speed] || typeof speed == 'boolean' || $.isFunction(speed)) {
                return this.__toggle.apply(this, arguments);
            } else {
                var args = _normalizeArguments.apply(this, arguments);
                args[1].mode = 'toggle';
                return this.effect.apply(this, args);
            }
        },
        cssUnit: function (key) {
            var style = this.css(key),
                val = [];
            $.each(['em', 'px', '%', 'pt'], function (i, unit) {
                if (style.indexOf(unit) > 0) val = [parseFloat(style), unit];
            });
            return val;
        }
    });
    $.easing.jswing = $.easing.swing;
    $.extend($.easing, {
        def: 'easeOutQuad',
        swing: function (x, t, b, c, d) {
            return $.easing[$.easing.def](x, t, b, c, d);
        },
        easeInQuad: function (x, t, b, c, d) {
            return c * (t /= d) * t + b;
        },
        easeOutQuad: function (x, t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
        },
        easeInOutQuad: function (x, t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t + b;
            return -c / 2 * ((--t) * (t - 2) - 1) + b;
        },
        easeInCubic: function (x, t, b, c, d) {
            return c * (t /= d) * t * t + b;
        },
        easeOutCubic: function (x, t, b, c, d) {
            return c * ((t = t / d - 1) * t * t + 1) + b;
        },
        easeInOutCubic: function (x, t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
            return c / 2 * ((t -= 2) * t * t + 2) + b;
        },
        easeInQuart: function (x, t, b, c, d) {
            return c * (t /= d) * t * t * t + b;
        },
        easeOutQuart: function (x, t, b, c, d) {
            return -c * ((t = t / d - 1) * t * t * t - 1) + b;
        },
        easeInOutQuart: function (x, t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
            return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
        },
        easeInQuint: function (x, t, b, c, d) {
            return c * (t /= d) * t * t * t * t + b;
        },
        easeOutQuint: function (x, t, b, c, d) {
            return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
        },
        easeInOutQuint: function (x, t, b, c, d) {
            if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
            return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
        },
        easeInSine: function (x, t, b, c, d) {
            return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
        },
        easeOutSine: function (x, t, b, c, d) {
            return c * Math.sin(t / d * (Math.PI / 2)) + b;
        },
        easeInOutSine: function (x, t, b, c, d) {
            return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
        },
        easeInExpo: function (x, t, b, c, d) {
            return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
        },
        easeOutExpo: function (x, t, b, c, d) {
            return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
        },
        easeInOutExpo: function (x, t, b, c, d) {
            if (t == 0) return b;
            if (t == d) return b + c;
            if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
            return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
        },
        easeInCirc: function (x, t, b, c, d) {
            return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
        },
        easeOutCirc: function (x, t, b, c, d) {
            return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
        },
        easeInOutCirc: function (x, t, b, c, d) {
            if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
            return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
        },
        easeInElastic: function (x, t, b, c, d) {
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t == 0) return b;
            if ((t /= d) == 1) return b + c;
            if (!p) p = d * .3;
            if (a < Math.abs(c)) {
                a = c;
                var s = p / 4;
            } else
            var s = p / (2 * Math.PI) * Math.asin(c / a);
            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        },
        easeOutElastic: function (x, t, b, c, d) {
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t == 0) return b;
            if ((t /= d) == 1) return b + c;
            if (!p) p = d * .3;
            if (a < Math.abs(c)) {
                a = c;
                var s = p / 4;
            } else
            var s = p / (2 * Math.PI) * Math.asin(c / a);
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
        },
        easeInOutElastic: function (x, t, b, c, d) {
            var s = 1.70158;
            var p = 0;
            var a = c;
            if (t == 0) return b;
            if ((t /= d / 2) == 2) return b + c;
            if (!p) p = d * (.3 * 1.5);
            if (a < Math.abs(c)) {
                a = c;
                var s = p / 4;
            } else
            var s = p / (2 * Math.PI) * Math.asin(c / a);
            if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
            return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
        },
        easeInBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
        },
        easeOutBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
        },
        easeInOutBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
            return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
        },
        easeInBounce: function (x, t, b, c, d) {
            return c - $.easing.easeOutBounce(x, d - t, 0, c, d) + b;
        },
        easeOutBounce: function (x, t, b, c, d) {
            if ((t /= d) < (1 / 2.75)) {
                return c * (7.5625 * t * t) + b;
            } else if (t < (2 / 2.75)) {
                return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
            } else if (t < (2.5 / 2.75)) {
                return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
            } else {
                return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
            }
        },
        easeInOutBounce: function (x, t, b, c, d) {
            if (t < d / 2) return $.easing.easeInBounce(x, t * 2, 0, c, d) * .5 + b;
            return $.easing.easeOutBounce(x, t * 2 - d, 0, c, d) * .5 + c * .5 + b;
        }
    });
})(jQuery);
(function ($, undefined) {
    $.effects.highlight = function (o) {
        return this.queue(function () {
            var elem = $(this),
                props = ['backgroundImage', 'backgroundColor', 'opacity'],
                mode = $.effects.setMode(elem, o.options.mode || 'show'),
                animation = {
                    backgroundColor: elem.css('backgroundColor')
                };
            if (mode == 'hide') {
                animation.opacity = 0;
            }
            $.effects.save(elem, props);
            elem.show().css({
                backgroundImage: 'none',
                backgroundColor: o.options.color || '#ffff99'
            }).animate(animation, {
                queue: false,
                duration: o.duration,
                easing: o.options.easing,
                complete: function () {
                    (mode == 'hide' && elem.hide());
                    $.effects.restore(elem, props);
                    (mode == 'show' && !$.support.opacity && this.style.removeAttribute('filter'));
                    (o.callback && o.callback.apply(this, arguments));
                    elem.dequeue();
                }
            });
        });
    };
})(jQuery);
(function ($, undefined) {
    $.widget("ui.autocomplete", {
        options: {
            appendTo: "body",
            delay: 300,
            minLength: 1,
            position: {
                my: "left top",
                at: "left bottom",
                collision: "none"
            },
            source: null
        },
        _create: function () {
            var self = this,
                doc = this.element[0].ownerDocument,
                suppressKeyPress;
            this.element.addClass("ui-autocomplete-input").attr("autocomplete", "off").attr({
                role: "textbox",
                "aria-autocomplete": "list",
                "aria-haspopup": "true"
            }).bind("keydown.autocomplete", function (event) {
                if (self.options.disabled || self.element.attr("readonly")) {
                    return;
                }
                suppressKeyPress = false;
                var keyCode = $.ui.keyCode;
                switch (event.keyCode) {
                case keyCode.PAGE_UP:
                    self._move("previousPage", event);
                    break;
                case keyCode.PAGE_DOWN:
                    self._move("nextPage", event);
                    break;
                case keyCode.UP:
                    self._move("previous", event);
                    event.preventDefault();
                    break;
                case keyCode.DOWN:
                    self._move("next", event);
                    event.preventDefault();
                    break;
                case keyCode.ENTER:
                case keyCode.NUMPAD_ENTER:
                    if (self.menu.active) {
                        suppressKeyPress = true;
                        event.preventDefault();
                    }
                case keyCode.TAB:
                    if (!self.menu.active) {
                        return;
                    }
                    self.menu.select(event);
                    break;
                case keyCode.ESCAPE:
                    self.element.val(self.term);
                    self.close(event);
                    break;
                default:
                    clearTimeout(self.searching);
                    self.searching = setTimeout(function () {
                        if (self.term != self.element.val()) {
                            self.selectedItem = null;
                            self.search(null, event);
                        }
                    }, self.options.delay);
                    break;
                }
            }).bind("keypress.autocomplete", function (event) {
                if (suppressKeyPress) {
                    suppressKeyPress = false;
                    event.preventDefault();
                }
            }).bind("focus.autocomplete", function () {
                if (self.options.disabled) {
                    return;
                }
                self.selectedItem = null;
                self.previous = self.element.val();
            }).bind("blur.autocomplete", function (event) {
                if (self.options.disabled) {
                    return;
                }
                clearTimeout(self.searching);
                self.closing = setTimeout(function () {
                    self.close(event);
                    self._change(event);
                }, 150);
            });
            this._initSource();
            this.response = function () {
                return self._response.apply(self, arguments);
            };
            this.menu = $("<ul></ul>").addClass("ui-autocomplete").appendTo($(this.options.appendTo || "body", doc)[0]).mousedown(function (event) {
                var menuElement = self.menu.element[0];
                if (!$(event.target).closest(".ui-menu-item").length) {
                    setTimeout(function () {
                        $(document).one('mousedown', function (event) {
                            if (event.target !== self.element[0] && event.target !== menuElement && !$.ui.contains(menuElement, event.target)) {
                                self.close();
                            }
                        });
                    }, 1);
                }
                setTimeout(function () {
                    clearTimeout(self.closing);
                }, 13);
            }).menu({
                focus: function (event, ui) {
                    var item = ui.item.data("item.autocomplete");
                    if (false !== self._trigger("focus", event, {
                        item: item
                    })) {
                        if (/^key/.test(event.originalEvent.type)) {
                            self.element.val(item.value);
                        }
                    }
                },
                selected: function (event, ui) {
                    var item = ui.item.data("item.autocomplete"),
                        previous = self.previous;
                    if (self.element[0] !== doc.activeElement) {
                        self.element.focus();
                        self.previous = previous;
                        setTimeout(function () {
                            self.previous = previous;
                        }, 1);
                    }
                    if (false !== self._trigger("select", event, {
                        item: item
                    })) {
                        self.element.val(item.value);
                    }
                    self.term = self.element.val();
                    self.close(event);
                    self.selectedItem = item;
                },
                blur: function (event, ui) {
                    if (self.menu.element.is(":visible") && (self.element.val() !== self.term)) {
                        self.element.val(self.term);
                    }
                }
            }).zIndex(this.element.zIndex() + 1).css({
                top: 0,
                left: 0
            }).hide().data("menu");
            if ($.fn.bgiframe) {
                this.menu.element.bgiframe();
            }
        },
        destroy: function () {
            this.element.removeClass("ui-autocomplete-input").removeAttr("autocomplete").removeAttr("role").removeAttr("aria-autocomplete").removeAttr("aria-haspopup");
            this.menu.element.remove();
            $.Widget.prototype.destroy.call(this);
        },
        _setOption: function (key, value) {
            $.Widget.prototype._setOption.apply(this, arguments);
            if (key === "source") {
                this._initSource();
            }
            if (key === "appendTo") {
                this.menu.element.appendTo($(value || "body", this.element[0].ownerDocument)[0])
            }
        },
        _initSource: function () {
            var self = this,
                array, url;
            if ($.isArray(this.options.source)) {
                array = this.options.source;
                this.source = function (request, response) {
                    response($.ui.autocomplete.filter(array, request.term));
                };
            } else if (typeof this.options.source === "string") {
                url = this.options.source;
                this.source = function (request, response) {
                    if (self.xhr) {
                        self.xhr.abort();
                    }
                    self.xhr = $.getJSON(url, request, function (data, status, xhr) {
                        if (xhr === self.xhr) {
                            response(data);
                        }
                        self.xhr = null;
                    });
                };
            } else {
                this.source = this.options.source;
            }
        },
        search: function (value, event) {
            value = value != null ? value : this.element.val();
            this.term = this.element.val();
            if (value.length < this.options.minLength) {
                return this.close(event);
            }
            clearTimeout(this.closing);
            if (this._trigger("search", event) === false) {
                return;
            }
            return this._search(value);
        },
        _search: function (value) {
            this.element.addClass("ui-autocomplete-loading");
            this.source({
                term: value
            }, this.response);
        },
        _response: function (content) {
            if (content && content.length) {
                content = this._normalize(content);
                this._suggest(content);
                this._trigger("open");
            } else {
                this.close();
            }
            this.element.removeClass("ui-autocomplete-loading");
        },
        close: function (event) {
            clearTimeout(this.closing);
            if (this.menu.element.is(":visible")) {
                this._trigger("close", event);
                this.menu.element.hide();
                this.menu.deactivate();
            }
        },
        _change: function (event) {
            if (this.previous !== this.element.val()) {
                this._trigger("change", event, {
                    item: this.selectedItem
                });
            }
        },
        _normalize: function (items) {
            if (items.length && items[0].label && items[0].value) {
                return items;
            }
            return $.map(items, function (item) {
                if (typeof item === "string") {
                    return {
                        label: item,
                        value: item
                    };
                }
                return $.extend({
                    label: item.label || item.value,
                    value: item.value || item.label
                }, item);
            });
        },
        _suggest: function (items) {
            var ul = this.menu.element.empty().zIndex(this.element.zIndex() + 1);
            this._renderMenu(ul, items);
            this.menu.deactivate();
            this.menu.refresh();
            this.menu.element.show().position($.extend({
                of: this.element
            }, this.options.position));
            this._resizeMenu();
        },
        _resizeMenu: function () {
            var ul = this.menu.element;
            ul.outerWidth(Math.max(ul.width("").outerWidth(), this.element.outerWidth()));
        },
        _renderMenu: function (ul, items) {
            var self = this;
            $.each(items, function (index, item) {
                self._renderItem(ul, item);
            });
        },
        _renderItem: function (ul, item) {
            return $("<li></li>").data("item.autocomplete", item).append($("<a></a>").text(item.label)).appendTo(ul);
        },
        _move: function (direction, event) {
            if (!this.menu.element.is(":visible")) {
                this.search(null, event);
                return;
            }
            if (this.menu.first() && /^previous/.test(direction) || this.menu.last() && /^next/.test(direction)) {
                this.element.val(this.term);
                this.menu.deactivate();
                return;
            }
            this.menu[direction](event);
        },
        widget: function () {
            return this.menu.element;
        }
    });
    $.extend($.ui.autocomplete, {
        escapeRegex: function (value) {
            return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        },
        filter: function (array, term) {
            var matcher = new RegExp($.ui.autocomplete.escapeRegex(term), "i");
            return $.grep(array, function (value) {
                return matcher.test(value.label || value.value || value);
            });
        }
    });
}(jQuery));
(function ($) {
    $.widget("ui.menu", {
        _create: function () {
            var self = this;
            this.element.addClass("ui-menu ui-widget ui-widget-content ui-corner-all").attr({
                role: "listbox",
                "aria-activedescendant": "ui-active-menuitem"
            }).click(function (event) {
                if (!$(event.target).closest(".ui-menu-item a").length) {
                    return;
                }
                event.preventDefault();
                self.select(event);
            });
            this.refresh();
        },
        refresh: function () {
            var self = this;
            var items = this.element.children("li:not(.ui-menu-item):has(a)").addClass("ui-menu-item").attr("role", "menuitem");
            items.children("a").addClass("ui-corner-all").attr("tabindex", -1).mouseenter(function (event) {
                self.activate(event, $(this).parent());
            }).mouseleave(function () {
                self.deactivate();
            });
        },
        activate: function (event, item) {
            this.deactivate();
            if (this.hasScroll()) {
                var offset = item.offset().top - this.element.offset().top,
                    scroll = this.element.attr("scrollTop"),
                    elementHeight = this.element.height();
                if (offset < 0) {
                    this.element.attr("scrollTop", scroll + offset);
                } else if (offset >= elementHeight) {
                    this.element.attr("scrollTop", scroll + offset - elementHeight + item.height());
                }
            }
            this.active = item.eq(0).children("a").addClass("ui-state-hover").attr("id", "ui-active-menuitem").end();
            this._trigger("focus", event, {
                item: item
            });
        },
        deactivate: function () {
            if (!this.active) {
                return;
            }
            this.active.children("a").removeClass("ui-state-hover").removeAttr("id");
            this._trigger("blur");
            this.active = null;
        },
        next: function (event) {
            this.move("next", ".ui-menu-item:first", event);
        },
        previous: function (event) {
            this.move("prev", ".ui-menu-item:last", event);
        },
        first: function () {
            return this.active && !this.active.prevAll(".ui-menu-item").length;
        },
        last: function () {
            return this.active && !this.active.nextAll(".ui-menu-item").length;
        },
        move: function (direction, edge, event) {
            if (!this.active) {
                this.activate(event, this.element.children(edge));
                return;
            }
            var next = this.active[direction + "All"](".ui-menu-item").eq(0);
            if (next.length) {
                this.activate(event, next);
            } else {
                this.activate(event, this.element.children(edge));
            }
        },
        nextPage: function (event) {
            if (this.hasScroll()) {
                if (!this.active || this.last()) {
                    this.activate(event, this.element.children(".ui-menu-item:first"));
                    return;
                }
                var base = this.active.offset().top,
                    height = this.element.height(),
                    result = this.element.children(".ui-menu-item").filter(function () {
                        var close = $(this).offset().top - base - height + $(this).height();
                        return close < 10 && close > -10;
                    });
                if (!result.length) {
                    result = this.element.children(".ui-menu-item:last");
                }
                this.activate(event, result);
            } else {
                this.activate(event, this.element.children(".ui-menu-item").filter(!this.active || this.last() ? ":first" : ":last"));
            }
        },
        previousPage: function (event) {
            if (this.hasScroll()) {
                if (!this.active || this.first()) {
                    this.activate(event, this.element.children(".ui-menu-item:last"));
                    return;
                }
                var base = this.active.offset().top,
                    height = this.element.height();
                result = this.element.children(".ui-menu-item").filter(function () {
                    var close = $(this).offset().top - base + height - $(this).height();
                    return close < 10 && close > -10;
                });
                if (!result.length) {
                    result = this.element.children(".ui-menu-item:first");
                }
                this.activate(event, result);
            } else {
                this.activate(event, this.element.children(".ui-menu-item").filter(!this.active || this.first() ? ":last" : ":first"));
            }
        },
        hasScroll: function () {
            return this.element.height() < this.element.attr("scrollHeight");
        },
        select: function (event) {
            this._trigger("selected", event, {
                item: this.active
            });
        }
    });
}(jQuery));
(function ($) {
    var filterHtml = /^([^<&]*)(<[^>]*>|&\w+;|$)(.*)$/,
        wbrLocation = /([^ ][!#$%&\)\*\+,\-\.\/:;=>\?@\\\]\^_`\|\}~]+)([^ ])/g;
    $.normaliseWhitespace = function (text) {
        return (text || '').replace(/\s+/g, ' ').replace(/^ */, '').replace(/ *$/, '');
    };
    $.escapeHTML = function (text) {
        var div = $('<div/>');
        div.text(text);
        return div.html();
    };
    $.stripHTML = function (html) {
        var div = $('<div/>');
        div.html(html);
        return div.text();
    };
    $.wbriseText = function (text) {
        return $.wbriseHTML($.escapeHTML(text));
    };
    $.wbriseHTML = function (html) {
        var output = [],
            matches = [];
        html = $.normaliseWhitespace(html);
        while (true) {
            matches = filterHtml.exec(html);
            if (!matches) {
                break;
            }
            html = matches[3];
            output.push(matches[1].replace(wbrLocation, '$1<wbr/>$2') + matches[2] + '<wbr/>');
            if (html === '') {
                return output.join('');
            }
        }
    };
    $.fn.wbrise = function () {
        return this.each(function () {
            var item = $(this);
            item.html($.wbriseHTML(item.html()));
        });
    };
    $.truncate_url = function (url) {
        var maximum_length = 20;
        var stripped = url.replace(/^(ftp|http|https):\/\/(www\.)?/i, "");
        if (stripped.length > maximum_length) {
            stripped = stripped.substr(0, maximum_length) + "…";
        }
        return stripped;
    }
    $.linkifyText = function (text, opts) {
        var options = $.extend({
            truncate_urls: false
        }, opts);
        var url_regex = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/gi;
        return $.escapeHTML(text).replace(url_regex, function (url) {
            var link_text;
            if (options.truncate_urls) {
                link_text = $.truncate_url(url);
            } else {
                link_text = url;
            }
            return $('<a target="_blank"/>').attr("href", url).html(link_text).outerHTML();
        });
    };
    $.fn.linkify = function (opts) {
        return this.each(function () {
            switch (this.nodeType) {
            case 1:
                if ("A" !== this.tagName) {
                    $(this).contents().linkify(opts);
                }
                break;
            case 3:
                $(this).after($.linkifyText(this.textContent, opts)).remove();
                break;
            }
        });
    };
    $.fn.outerHTML = function () {
        return $('<div/>').append(this).html();
    };
    $.fn.replaceWithReturningNew = function (value) {
        var inserted = [];
        if (this[0] && this[0].parentNode) {
            if (typeof value !== "string") {
                value = $(value).detach();
            }
            this.each(function () {
                var next = this.nextSibling,
                    parent = this.parentNode,
                    new_elem = $(value)[0];
                $(this).remove();
                inserted.push(new_elem);
                if (next) {
                    parent.insertBefore(new_elem, next);
                } else {
                    parent.appendChild(new_elem);
                }
            });
            return $(inserted);
        }
    };
    if ($.ui && $.ui.dialog && $.ui.dialog.overlay && $.ui.dialog.overlay.create) {
        (function (original_create) {
            $.ui.dialog.overlay.create = function (dialog) {
                var result = original_create.apply(this, [dialog]);
                $(document).bind('click.dialog-overlay', function (event) {
                    if ($(event.target).hasClass('ui-widget-overlay')) {
                        dialog.close(event);
                    }
                });
                return result;
            };
        }($.ui.dialog.overlay.create));
    }
}(jQuery));
jQuery.proxyURL = function (url) {
    if (url.match(/^http:\/\/(api\.twitter\.com|[^\/]+\.twimg\.com)\//)) {
        return url;
    } else {
        return "https://resources.rapportive.com/proxy" + '?url=' + encodeURIComponent(url);
    }
};
jQuery.wrapMailplaneURL = function (url) {
    return "https://rapportive.com/redirect" + '?url=' + encodeURIComponent(url);
};
fsPopupManager = (function (jQuery) {
    function refreshSidebar(preserveContent) {
        if (window.top.rapportive) {
            window.top.rapportive.lookup_service.clearCache();
            window.top.rapportive.sidebar.refreshSidebar(preserveContent);
        }
    }
    return function () {
        return {
            popup: function (url, width, height, callback, preserveContent) {
                fsLog("Attempting to popup window to: " + url);
                jQuery.centeredPopup({
                    url: url,
                    modal: true,
                    width: width,
                    height: height,
                    callback: loggily("popup window closed", function () {
                        refreshSidebar(preserveContent);
                        if (callback) {
                            callback();
                        }
                    })
                });
            }
        };
    };
}(jQuery));
var jQueryForRapportive = jQuery.noConflict(true);

function rapportive() {
    var that = this;
    var proto = rapportive.prototype;
    var jQuery = jQueryForRapportive;
    delete window.jQueryForRapportive;
    that.clientCodeTimestamp = 1296176150;
    that.active_view_element = null;
    that.active_view_type = null;
    that.user_email = null;
    that.root_url = null;
    that.domain_from_url = null;
    that.handlers = null;
    that.lookup_service = null;
    that.sidebar = null;
    that.main_menu = null;
    that.authenticated_as = null;
    that.user_preferences = null;
    that.alternative_users = null;
    that.maps_ready = null;
    that.jQuery = jQuery;
    var RE_TWITTER_PROFILE_LINK = /^https?:\/\/twitter\.com\/([a-z0-9_]+)(\?.*)?$/i;
    proto.userEmailDomain = function () {
        var reEmail = /\s*\S*@(\S*)\s*/;
        return that.user_email.match(reEmail)[1].toLowerCase();
    };
    proto.userDomain = function () {
        return that.userEmailDomain() || that.domain_from_url;
    };
    proto.loginUrl = function (return_to, why) {
        var params = "domain=" + encodeURIComponent(that.userDomain()) + "&user_email=" + encodeURIComponent(that.user_email);
        if (return_to) {
            params = params + "&return_to=" + encodeURIComponent(return_to);
        }
        if (why) {
            params = params + "&why=" + encodeURIComponent(why);
        }
        return "https://rapportive.com/login?" + params;
    };
    proto.getSidebarContainerWidth = function () {
        return jQuery("table td.Bu:last-child > div.nH").width();
    };
    proto.getActiveViewElement = function () {
        return jQuery("div.nH.q0CeU div.diLZtc > div.nH > div.nH > div.nH > div.nH:visible")[0];
    };
    proto.getViewType = function (view_element) {
        if (jQuery("table.Bs.nH.iY", view_element)[0]) {
            return "cv";
        }
        if (jQuery("div.A1.D.E", view_element)[0]) {
            return "tl";
        }
        if (jQuery("div.fN", view_element)[0]) {
            return "co";
        }
        fsLog("Could not determine the view type.", "gmail", "info");
    };
    proto.showLoginPopup = function (continuation, why, return_to) {
        var popup = new fsPopupManager();
        popup.popup(window.top.rapportive.loginUrl(return_to, why), 800, 600, function () {
            window.top.rapportive.request({
                url: "https://rapportive.com/login_status",
                success: continuation
            });
        }, false);
        return false;
    };
    proto.handleViewChange = function () {
        if ("cv" == that.active_view_type) {
            delayedConditionalExecute({
                condition: function () {
                    return (jQuery("h3.gD span[email]", that.active_view_element)[0]);
                },
                retry_message: "Scheduling another attempt to find the loaded email...",
                failure_message: "Ran out of attempts to find the loaded email; cannot continue.",
                continuation: function () {
                    if (!that.hide_share_button) {
                        that.addShareButton();
                    }
                    that.updateFromConversationView();
                    that.recalculateActionLinksWidth();
                }
            });
        }
    };
    proto.updateFromConversationView = function () {
        var getConversationViewEmail = function () {
            var override_marker = 'https://rapportive.com/raplets/lookup?';
            var override_email = jQuery('a[href^="' + override_marker + '"]', that.active_view_element)[0];
            if (override_email) {
                var params = jQuery.parseQuery(override_email.href.replace(override_marker, ''));
                if (params.email) {
                    return params.email;
                }
            }

            function spansToEmails(spans) {
                var emails = jQuery.map(spans, function (span) {
                    return jQuery(span).attr("email");
                });
                emails = jQuery.grep(emails, function (email) {
                    return email != that.user_email;
                });
                return emails;
            }
            return spansToEmails(jQuery("h3.gD span[email]", that.active_view_element))[0] || spansToEmails(jQuery("span.g2[email]", that.active_view_element))[0] || spansToEmails(jQuery("span.gD[email]", that.active_view_element)).pop() || that.user_email;
        };
        var handleTwitterFollowNotification = function () {
            if (!getConversationViewEmail().match(/.*follow-.*@postmaster.twitter.com/i)) {
                return false;
            }
            var getNewFollowerFromFollowNotification = function () {
                try {
                    var subject = jQuery("h1.ha .hP", that.active_view_element);
                    if (!subject.length) {
                        throw "couldn't find email subject!";
                    }
                    var subject_matches = subject.text().match(/(.*) is.* following .* Twitter/);
                    if (!subject_matches) {
                        fsLog("Subject line mismatch, not a real follow notification?", "email.detect", "debug");
                    }
                    var body = jQuery(".ii.gt", that.active_view_element);
                    if (!body.length) {
                        throw "Couldn't find email body!";
                    }
                    var now_following_elements = body.find("p,h2").filter(function () {
                        return !!jQuery(this).text().match(/following.*Twitter/);
                    });
                    if (!now_following_elements.length) {
                        throw "Couldn't find paragraph or h2 saying 'following...Twitter'!";
                    }
                    var profile_link = now_following_elements.find("a").filter(function () {
                        return !!jQuery(this).attr("href").match(RE_TWITTER_PROFILE_LINK);
                    }).first();
                    if (!profile_link.length) {
                        throw "Couldn't find profile link!";
                    }
                    var link_text = profile_link.text();
                    var link_href = profile_link.attr("href");
                    var username_from_href = link_href.match(RE_TWITTER_PROFILE_LINK)[1];
                    var text_matches = link_text.match(/^(.*) \(([^)]+)\)$/);
                    var username_from_text = text_matches ? text_matches[2] : undefined;
                    if (username_from_text !== username_from_href) {
                        fsLog("confused about follower username: profile link href says " + username_from_href + " but link text says " + username_from_text);
                    }
                    return username_from_href;
                } catch (error) {
                    fsLog("error getting new follower username from follow notification: " + error, "email.twitter", "warning");
                }
            };
            var newFollower = getNewFollowerFromFollowNotification();
            if (newFollower) {
                fsLog("detected Twitter follow notification from " + newFollower);
                that.sidebar.updateSidebarFromTwitter(newFollower);
                return true;
            } else {
                return false;
            }
        };
        var handleTwitterDMNotification = function () {
            if (!getConversationViewEmail().match(/(twitter-)?dm-.*@postmaster.twitter.com/i)) {
                return false;
            }
            var getSenderFromDMNotification = function () {
                try {
                    var subject = jQuery("h1.ha .hP", that.active_view_element);
                    if (!subject.length) {
                        throw "couldn't find email subject!";
                    }
                    var subject_matches = subject.text().match(/Direct message from (.*)/);
                    if (!subject_matches) {
                        fsLog("Subject line mismatch, not a real DM notification?", "email.detect", "debug");
                    }
                    var body = jQuery(".ii.gt", that.active_view_element);
                    if (!body.length) {
                        throw "Couldn't find body!";
                    }
                    var re_create_dm_url = /^https?:\/\/twitter\.com\/direct_messages\/create\/([a-z0-9_]+)/i;
                    var reply_link = body.find("a").filter(function () {
                        return !!jQuery(this).attr("href").match(re_create_dm_url);
                    });
                    if (!reply_link.length) {
                        throw "Couldn't find link to create a DM!";
                    }
                    var link_matches = reply_link.attr("href").match(re_create_dm_url);
                    var username = link_matches[1];
                    return username;
                } catch (error) {
                    fsLog("error getting sender username from DM notification: " + error, "email.twitter", "warning");
                }
            };
            var sender = getSenderFromDMNotification();
            if (sender) {
                fsLog("detected Twitter DM notification from " + sender);
                that.sidebar.updateSidebarFromTwitter(sender);
                return true;
            } else {
                return false;
            }
        };
        var handleSpecialConversationView = function () {
            return handleTwitterFollowNotification() || handleTwitterDMNotification();
        };
        if (!handleSpecialConversationView()) {
            that.sidebar.updateSidebarFromEmail(getConversationViewEmail());
        }
    };
    proto.recalculateActionLinksWidth = function () {
        var icons_width = that.hide_share_button ? 150 : 300;
        jQuery('h1.ha').attr('style', 'margin-right: ' + icons_width.toString() + 'px !important');
    };
    proto.addShareButton = function () {
        var share_button = jQuery("<a id='share-button' target='_blank'><img src='https://rapportive.com/images/share-main.png?2' border='0'/></a>");
        share_button.attr('href', 'http://twitter.com/?status=' + encodeURIComponent("I'm using @rapportive: photos, notes and social contact profiles for Gmail. Try it! http://rapportive.com/"));
        var remove_button = jQuery("<div title='Remove this button' id='share-button-remove'/>");
        var container = jQuery("<div id='share-button-container' style='vertical-align:middle; float:right; margin-left:15px'/>");
        container.append(share_button).append(remove_button);
        var header = jQuery("div.hj", that.active_view_element);
        header.find('#share-button-container').remove();
        header.prepend(container);
        share_button.click(loggily("share button", function () {
            rapportiveLogger.track("Share button clicked");
        }));
        remove_button.click(loggily("remove share button", function () {
            if (confirm('This will get rid of the "Share Rapportive" button.')) {
                jQuery("#share-button-container", that.active_view_element).remove();
                that.recalculateActionLinksWidth();
                that.hide_share_button = true;
                that.request({
                    url: "https://rapportive.com/preferences/set/hide_share_button",
                    data: {
                        value: "bool:true"
                    }
                });
                rapportiveLogger.track("Share button remove clicked", {
                    confirmed: true
                });
            } else {
                rapportiveLogger.track("Share button remove clicked", {
                    confirmed: false
                });
            }
        }));
    };
    window.setRapportiveStatus = function (status) {
        var status_element;
        delayedConditionalExecute({
            condition: function () {
                status_element = jQuery("#rapportive-status");
                if (!status_element[0]) {
                    var guser_nobr = jQuery("#guser nobr");
                    if (!guser_nobr[0]) {
                        return false;
                    }
                    status_element = jQuery('<span id="rapportive-status">');
                    guser_nobr.prepend(" | ");
                    guser_nobr.prepend(status_element);
                }
                return true;
            },
            retry_message: "Looking for user bar to set status...",
            failure_message: "Couldn't set Rapportive status in user bar",
            continuation: function () {
                status_element.html(status);
            }
        });
    };

    function Handlers() {
        var proto = Handlers.prototype;
        var emailAddressRegex = /([^\s@<>]+)@([a-z0-9\-]+\.)+[a-z]{2,}/i;

        function makeHoverHandlerAdder(selector, filter, hoverHandler, mouseOutHandler) {
            return function () {
                var emailArea = jQuery(".Bs.iY .Bu .if", that.active_view_element);
                jQuery(selector, emailArea).live("mouseover", loggily("mouseover " + selector, function () {
                    var elems = jQuery(this);
                    if (filter) {
                        elems = elems.filter(filter);
                    }
                    if (!elems.data("rapportiveAddedHoverIntent")) {
                        elems.data("rapportiveAddedHoverIntent", true);
                        elems.hoverIntent(function () {
                            var trackingName = jQuery(this).attr('track');
                            rapportiveLogger.track("Hover handled", {
                                selector: (trackingName ? trackingName : selector),
                                probability: 0.1
                            });
                            return hoverHandler.call(this);
                        }, mouseOutHandler ? mouseOutHandler : function () {});
                        elems.trigger("mouseover");
                    }
                }));
            };
        }
        var addEmailHoverHandler = makeHoverHandlerAdder("span[email]", null, function () {
            var email = jQuery(this).attr("email");
            fsLog("Hovered over: " + email);
            that.sidebar.updateSidebarFromEmail(email);
        });
        var fixHiddenHeaderEmails = function () {
            var convertPlainAddressesToHoverable = function (tableRowNodes) {
                tableRowNodes.each(function () {
                    if (this.nodeType !== 3) {
                        return true;
                    }
                    var originalText = jQuery(this).text();
                    var matches = emailAddressRegex.exec(originalText);
                    if (matches && matches.length > 0) {
                        var emailAddress = matches[0];
                        var enhancedAddress = '<span track="details-email" email="' + jQuery.escapeHTML(emailAddress) + '">' + jQuery.escapeHTML(originalText) + '</span>';
                        jQuery(this).replaceWith(enhancedAddress);
                    }
                });
            };
            var emailArea = jQuery(".Bs.iY .Bu .if", that.active_view_element);
            jQuery('td.gF.gK > table.cf.gJ', emailArea).live("mouseover", function () {
                var headers = jQuery(this);
                if (!headers.data('addedToCcHovers')) {
                    headers.data('addedToCcHovers', true);
                    var headerDataAreas = jQuery(this).find('.gL');
                    headerDataAreas.each(function () {
                        var domNodesFromGmailHeaderField = jQuery(this).find('*').contents();
                        convertPlainAddressesToHoverable(domNodesFromGmailHeaderField);
                    });
                }
            });
        };
        var addMailToHoverHandler = makeHoverHandlerAdder("a[href^='mailto:']", null, function () {
            var email = unescape(jQuery(this).attr("href").replace(/^mailto:(smtp:|email:|mailto:)?/i, '').replace(/\?.+$/, '').replace(/^\s+/, '').replace(/\s+$/, ''));
            if (email.match(emailAddressRegex)) {
                fsLog("Hovered over: " + email);
                that.sidebar.updateSidebarFromEmail(email);
            } else {
                fsLog("Ignoring email: " + email);
            }
        });
        var addTwitterLinkHoverHandler = (function () {
            return makeHoverHandlerAdder("a[href^='http://twitter.com/']", function () {
                return !!(jQuery(this).attr("href").match(RE_TWITTER_PROFILE_LINK));
            }, function () {
                var matchData = jQuery(this).attr("href").match(RE_TWITTER_PROFILE_LINK);
                if (matchData) {
                    var username = matchData[1];
                    fsLog("Hovered over Twitter profile link: " + username);
                    that.sidebar.updateSidebarFromTwitter(username);
                }
            });
        }());
        var addEmailExpanderHandler = function () {
            jQuery("div.gs.gt").live("mousedown", loggily("email expander", function () {
                var email = jQuery("span[email]", this).attr("email");
                fsLog("Expanded email from: " + email);
                that.sidebar.updateSidebarFromEmail(email);
            }));
        };
        var addSignOutHandler = function () {
            var logout_requested = false;
            jQuery("a.a7.ou").click(loggily("sign out handler", function () {
                if (logout_requested) {
                    return;
                }
                logout_requested = true;
                rapportiveLogger.track("Sign out handled");
                fsLog("Signing out of Rapportive...");
                window.setRapportiveStatus("Signing out of Rapportive...");
                fsLog("Calling /logout...");
                that.request({
                    path: "/logout",
                    success: loggily("logout callback", function (response) {
                        fsLog("Response status: " + response.status);
                        if (response.status === 200) {
                            fsLog("Successfully signed out of Rapportive.");
                            window.setRapportiveStatus(response.text);
                            window.top.location = jQuery("a.a7.ou").attr("href");
                        } else {
                            fsLog("/logout response status was not 200.", "login", "warning");
                        }
                    })
                });
                return false;
            }));
        };
        proto.addHandlers = function () {
            addEmailHoverHandler();
            fixHiddenHeaderEmails();
            addMailToHoverHandler();
            addTwitterLinkHoverHandler();
            addEmailExpanderHandler();
            addSignOutHandler();
        };
    }
    proto.request = function (params) {
        if (params.path) {
            params.url = "https://rapportive.com" + params.path;
            delete params.path;
        }
        if (!params.data) {
            params.data = {};
        }
        params.data.user_email = that.user_email;
        params.data.client_version = that.clientVersion();
        var success_callback = params.success;
        var authentication_handler = that.authenticationHandler();
        params.success = function () {
            authentication_handler.apply(this, arguments);
            if (success_callback) {
                success_callback.apply(this, arguments);
            }
        };
        jQuery.jsonp(params);
    };
    proto.clientVersion = function () {
        return that.client_version_base + (that.isMailplane() ? "(mailplane" + (that.mailplaneVersion()) + ")" : "");
    };
    proto.supports = function (functionality) {
        if (functionality == 'authorizing') {
            return !that.isOldMailplane();
        } else {
            return false;
        }
    };
    proto.isMailplane = function () {
        return !!window.top.MailplaneGmailInitialized;
    };
    proto.mailplaneVersion = function () {
        return window.top.MailplaneVersion || 0;
    };
    proto.isOldMailplane = function () {
        return that.isMailplane() && (that.mailplaneVersion() < 1543);
    };
    proto.authenticationHandler = function () {
        return loggily("handling authk parameters", function (response) {
            if (response.status == 200) {
                if (response.authenticated_as !== undefined) {
                    if (that.authenticated_as !== response.authenticated_as) {
                        that.authenticated_as = response.authenticated_as;
                        that.lookup_service.clearCache();
                        that.sidebar.refreshSidebar();
                    }
                    that.user_preferences = response.user_preferences;
                }
                if (response.authenticated_users !== undefined) {
                    that.alternative_users = jQuery.grep(response.authenticated_users, function (user) {
                        return user && user.user_email && (user.user_email !== that.user_email);
                    });
                }
            }
        });
    };
    proto.performImplicitLogin = function (params) {
        that.request(merge(params || {}, {
            url: that.loginUrl() + "&immediate=true"
        }));
    };
    proto.jQueryFor = function (context) {
        var jQuery = that.jQuery;

        function jQueryScoped(selector) {
            return new jQuery.fn.init(selector, context);
        }
        for (var attr in jQuery) {
            if (jQuery.hasOwnProperty(attr)) {
                jQueryScoped[attr] = jQuery[attr];
            }
        }
        jQueryScoped.rapportiveContainer = jQuery(context);
        return jQueryScoped;
    };

    function ViewChangeSpinner() {
        var proto = ViewChangeSpinner.prototype;
        proto.duration = 10000;
        proto.interval = 100;
        proto.end = null;
        proto.id = null;
        proto.addSpinner = function () {
            window.addEventListener("mousemove", that.viewChangeSpinner.startOrLengthenSpinner, true);
            window.addEventListener("keypress", that.viewChangeSpinner.startOrLengthenSpinner, true);
            proto.startOrLengthenSpinner();
        };
        proto.startOrLengthenSpinner = function () {
            var now = (new Date()).getTime();
            if (now > proto.end) {
                proto.id = window.setInterval(loggily("view change spinner", function () {
                    if ((new Date()).getTime() > proto.end) {
                        window.clearInterval(proto.id);
                    } else {
                        that.viewChangeSpinner.checkForViewChange();
                    }
                }), proto.interval);
            }
            proto.end = now + proto.duration;
        };
        proto.checkForViewChange = function () {
            var new_active_view_element = that.getActiveViewElement();
            if (new_active_view_element && (new_active_view_element != that.active_view_element)) {
                that.active_view_element = new_active_view_element;
                fsLog("Updating active view element to: " + that.active_view_element);
                that.active_view_type = that.getViewType(that.active_view_element);
                fsLog("Updating active view type to: " + that.active_view_type);
                that.handleViewChange();
            }
            jQuery.event.trigger('scroll', null, window);
        };
    }

    function LookupService() {
        var cache = {
            expiry: 5,
            lookup: function (email) {
                fsLog("Looking in response cache for " + email);
                var cache_entry = this[email];
                if (cache_entry) {
                    var retrieval_time = cache_entry.retrieval_time;
                    if ((new Date()).getTime() - retrieval_time < this.expiry * 60 * 1000) {
                        fsLog(email + " found in response cache");
                        return cache_entry.response;
                    } else {
                        fsLog(email + " not found in response cache");
                    }
                }
            },
            set: function (email, response) {
                fsLog("Storing data for " + email + " in the response cache");
                this[email] = {
                    response: response,
                    retrieval_time: (new Date()).getTime()
                };
            },
            invalidate: function (email) {
                fsLog("Invalidating cache entry for " + email);
                delete this[email];
            },
            clear: function () {
                fsLog("Clearing the entire response cache");
                for (var key in this) {
                    if (this.hasOwnProperty(key) && (key.indexOf('@') >= 0)) {
                        delete this[key];
                    }
                }
            }
        };
        this.invalidateCacheForEmail = function (email) {
            cache.invalidate(email);
        };
        this.invalidateCacheForTwitter = function (twitter) {};
        this.clearCache = function () {
            cache.clear();
        };
        this.lookupEmail = function (email, continuation) {
            var lookupUrl = "https://rapportive.com" + '/contacts/email/' + encodeURIComponent(email);
            var ajaxOptions = {
                data: {
                    client_stamp: window.top.rapportive.clientCodeTimestamp
                }
            };
            var cached_response = cache.lookup(email);
            if (cached_response) {
                fsLog("Using cached response...");
                continuation(cached_response);
                var freshness_check_url = lookupUrl + "?if_none_match=" + encodeURIComponent(cached_response.contact && cached_response.contact.etag);
                fsLog("Checking if cache is stale...");
                window.top.rapportive.request(merge(ajaxOptions, {
                    url: freshness_check_url,
                    success: loggily("check cache freshness", function (response) {
                        fsLog("staleness check response status: " + response.status);
                        switch (response.status) {
                        case 200:
                            fsLog("cache is stale!  Displaying refresh button");
                            window.top.rapportive.sidebar.refreshButton().slideDown();
                            break;
                        case 302:
                            window.top.rapportive.sidebar.codeRefreshButton().slideDown();
                            break;
                        case 304:
                            fsLog("cache is fresh");
                            break;
                        default:
                            fsLog("unexpected response from staleness check: " + response.status, "lookup.cache", "warning");
                        }
                    })
                }));
            } else {
                fsLog("Doing server lookup: " + email);
                window.top.rapportive.request(merge(ajaxOptions, {
                    url: lookupUrl,
                    success: loggily("lookup by email", function (response) {
                        fsLog("Response status: " + response.status);
                        switch (response.status) {
                        case 200:
                            cache.set(email, response);
                            break;
                        case 302:
                            break;
                        case 401:
                            break;
                        default:
                            fsLog("Unexpected response status from email lookup (" + email + "): " + response.status, "lookup.email", "warning");
                        }
                        continuation(response);
                    })
                }));
            }
        };
        this.lookupTwitter = function (username, continuation) {
            var lookupUrl = "https://rapportive.com" + '/contacts/twitter/' + encodeURIComponent(username);
            var ajaxOptions = {
                data: {
                    client_stamp: window.top.rapportive.clientCodeTimestamp
                }
            };
            fsLog("Doing server lookup by Twitter: " + username);
            window.top.rapportive.request(merge(ajaxOptions, {
                url: lookupUrl,
                success: loggily("lookup by Twitter", function (response) {
                    switch (response.status) {
                    case 200:
                        break;
                    case 302:
                        break;
                    case 401:
                        break;
                    default:
                        fsLog("Unexpected response status from Twitter lookup (" + username + "): " + response.status, "lookup.twitter", "warning");
                    }
                    continuation(response);
                })
            }));
        };
    }

    function Sidebar(rapportive) {
        var sidebar_id = "rapportive-sidebar",
            proto = Sidebar.prototype,
            last_lookup_key = null,
            next_placeholder_id = 0,
            rendered_partials = {},
            jQuery = rapportive.jQuery;
        proto.updateSidebarFromEmail = function (email, preserveContent, onlyPretend) {
            if (getSidebarEmail() === email) {
                fsLog("The sidebar email is already " + email + ". Bailing.");
                return;
            }
            last_lookup_key = email;
            if (!preserveContent) {
                setSidebar({
                    email: email,
                    html: "<p>Looking up " + jQuery.wbriseText(email) + "...</p>"
                });
            }
            if (onlyPretend) {
                return;
            }
            rapportive.lookup_service.lookupEmail(email, function (contact) {
                if (last_lookup_key != email) {
                    fsLog("Last lookup key is: " + last_lookup_key + ", which is different from: " + email + ". Bailing.");
                } else {
                    setSidebar({
                        email: email,
                        contact: contact
                    });
                    copyGmailContextualLinks();
                }
            });
        };
        proto.updateSidebarFromTwitter = function (username, preserveContent, onlyPretend) {
            if (getSidebarTwitter() === username) {
                fsLog("The sidebar twitter username is already " + username + ". Bailing.");
                return;
            }
            last_lookup_key = username;
            if (!preserveContent) {
                setSidebar({
                    twitter: username,
                    html: "<p>Looking up @" + username + "...</p>"
                });
            }
            if (onlyPretend) {
                return;
            }
            rapportive.lookup_service.lookupTwitter(username, function (contact) {
                if (last_lookup_key != username) {
                    fsLog("Last lookup key is: " + last_lookup_key + ", which is different from: " + username + ". Bailing.");
                } else {
                    fsLog("Response status: " + contact.status);
                    setSidebar({
                        twitter: username,
                        contact: contact
                    });
                    copyGmailContextualLinks();
                }
            });
        };
        proto.refreshSidebar = function (preserveContent, onlyPretend) {
            var email = getSidebarEmail();
            var twitter = getSidebarTwitter();
            clearSidebarEmail();
            clearSidebarTwitter();
            if (email && twitter) {
                fsLog("Sidebar has both email and Twitter - unsure which to refresh.  Going with Twitter.", "sidebar", "warning");
            }
            if (twitter) {
                fsLog("Refreshing sidebar with twitter: " + twitter);
                this.updateSidebarFromTwitter(twitter, preserveContent, onlyPretend);
            } else if (email) {
                rapportive.lookup_service.invalidateCacheForEmail(email);
                fsLog("Refreshing sidebar with email: " + email);
                this.updateSidebarFromEmail(email, preserveContent, onlyPretend);
            } else {
                fsLog("sidebar appears empty, nothing to refresh");
            }
        };
        proto.invalidateCacheEntry = function () {
            var email = getSidebarEmail(),
                twitter = getSidebarTwitter();
            if (email) {
                rapportive.lookup_service.invalidateCacheForEmail(email);
            }
            if (twitter) {
                rapportive.lookup_service.invalidateCacheForTwitter(twitter);
            }
        };
        proto.editOwnProfile = function () {
            this.show_profile_editing_info_on_next_sidebar_load = true;
            this.updateSidebarFromEmail(rapportive.authenticated_as);
        };
        proto.refreshButton = function () {
            return jQuery(".sidebar-refresh-button", rapportive.active_view_element);
        };
        proto.codeRefreshButton = function () {
            return jQuery(".sidebar-code-refresh-button", rapportive.active_view_element);
        };
        var sidebarElement = function () {
            return jQuery("#" + sidebar_id, rapportive.active_view_element);
        };
        var getSidebarEmail = function () {
            return sidebarElement().data("email");
        };
        var setSidebarEmail = function (email) {
            return sidebarElement().data("email", email);
        };
        var clearSidebarEmail = function () {
            return setSidebarEmail(null);
        };
        var getSidebarTwitter = function () {
            return sidebarElement().data("twitter");
        };
        var setSidebarTwitter = function (username) {
            return sidebarElement().data("twitter", username);
        };
        var clearSidebarTwitter = function () {
            return setSidebarTwitter(null);
        };
        var copyGmailContextualLinks = function () {
            var gmail_contextual_links;
            var sidebar_element = sidebarElement();
            delayedConditionalExecute({
                condition: function () {
                    gmail_contextual_links = jQuery("div.vb > div.fP", rapportive.active_view_element).parent();
                    return gmail_contextual_links[0];
                },
                retry_message: null,
                failure_message: "No gmail contextual links found.",
                log_level_on_failure: "debug",
                poll_delay: 350,
                max_poll_attempts: 30,
                continuation: function () {
                    var link_selectors = {
                        calendar: "a[href*='google.com/calendar']",
                        ups: "a[href*='ups.com']",
                        usps: "a[href*='usps.com']",
                        map: "a[href*='google.com/maps']",
                        dhl: "a[href*='dhl.com']",
                        fedex: "a[href*='fedex.com']"
                    };
                    var instrument_links = function (gmail_contextual_links) {
                        gmail_contextual_links.find("a").each(function () {
                            var link = jQuery(this);
                            var params = {
                                link_type: "unknown"
                            };
                            for (var type in link_selectors) {
                                if (link.is(link_selectors[type])) {
                                    params.link_type = type;
                                    break;
                                }
                            }
                            if ("unknown" === params.link_type) {
                                params.unknown_url = link.attr("href");
                            }
                            link.click(function () {
                                rapportiveLogger.track("Gmail contextual link clicked", params);
                            });
                        });
                    };
                    var reformat_links = function (gmail_contextual_links) {
                        var calendar_link_elements = gmail_contextual_links.find(link_selectors.calendar).parent();
                        calendar_link_elements.each(function (index, calendar_link) {
                            var calendar_link_element = jQuery(calendar_link);
                            var new_html = calendar_link_element.html();
                            if (new_html) {
                                calendar_link_element.html(new_html.split("<br>")[1]);
                            }
                            var url = calendar_link_element.find(link_selectors.calendar).remove().attr("href");
                            calendar_link_element.html(calendar_link_element.html().replace(" - ", ""));
                            calendar_link_element.wrapInner(jQuery("<a>").attr({
                                "href": url,
                                "target": "_blank"
                            }));
                        });
                    };
                    var cloned_links = gmail_contextual_links.clone();
                    reformat_links(cloned_links);
                    instrument_links(cloned_links);
                    sidebar_element.find(".gmail-contextual-links-container").append(jQuery("<div class='gmail-contextual-links'>").append(cloned_links));
                }
            });
        };

        function templateHelpers(contact) {
            var helpers = {
                partials: {}
            };
            contact.bound_helpers = helpers;

            function curried(func, that, args) {
                return func.apply(that, [contact].concat(Array.prototype.slice.call(args)));
            }
            jQuery.each(rapportive.template_helpers, function (helper_name, helper_func) {
                helpers[helper_name] = function () {
                    return curried(helper_func, this, arguments);
                };
                if (helper_func.not) {
                    helpers[helper_name].not = function () {
                        return curried(helper_func.not, this, arguments);
                    };
                }
            });
            jQuery.each(rapportive.templates, function (template_name, template_func) {
                if (rapportive.sidebar_callbacks[template_name]) {
                    helpers.partials[template_name] = function (context, fallback, stack) {
                        var html = template_func(context, helpers, stack);
                        rendered_partials[next_placeholder_id] = {
                            html: html,
                            context: context.data || context
                        };
                        var placeholder = ['<div data-placeholder="', next_placeholder_id, '" ', 'data-template-name="', template_name, '"></div>'].join('');
                        next_placeholder_id += 1;
                        return placeholder;
                    };
                } else {
                    helpers.partials[template_name] = function (context, fallback, stack) {
                        return template_func(context, helpers, stack);
                    };
                }
            });
            return helpers;
        }

        function renderTemplate(root_template_name, full_contact, context, updateDocument) {
            rendered_partials = {};
            var helpers = templateHelpers(full_contact);
            var template = helpers.partials[root_template_name];
            if (!root_template_name || !template) {
                throw "No template given";
            }
            var container = jQuery('<div/>').html(template(context || full_contact, helpers));
            var callbacks = [],
                placeholders, component_by_name = {};
            do {
                placeholders = container.find('div[data-placeholder]');
                for (var i = 0; i < placeholders.length; i += 1) {
                    var placeholder = jQuery(placeholders[i]);
                    var partial = rendered_partials[placeholder.attr('data-placeholder')];
                    var template_name = placeholder.attr('data-template-name');
                    var html = /^\s*</.test(partial.html) ? partial.html : ['<div>', partial.html, '</div>'].join('');
                    var component = jQuery(html);
                    if (component.length !== 1) {
                        component = jQuery('<div/>').append(component);
                    }
                    placeholder.replaceWith(component);
                    callbacks.push({
                        template_name: template_name,
                        component: component,
                        context: partial.context
                    });
                    component_by_name[template_name] = component;
                }
            } while (placeholders.length > 0);
            updateDocument(container.children());

            function redraw(template_name, full_contact, context) {
                renderTemplate(template_name, full_contact, context, function (dom) {
                    if (component_by_name[template_name]) {
                        component_by_name[template_name].replaceWith(dom);
                    }
                    component_by_name[template_name] = dom;
                });
            }
            jQuery.each(callbacks, function (index, callback) {
                var scopedJQuery = rapportive.jQueryFor(callback.component[0]);
                var func = rapportive.sidebar_callbacks[callback.template_name];
                if (func) {
                    func(rapportive, scopedJQuery, full_contact, callback.context, redraw);
                }
            });
        }

        function renderSidebar(sidebar_element, contact) {
            renderTemplate('contacts/lookup', contact, contact, function (dom) {
                sidebar_element.html(dom);
            });
        }

        function setSidebar(opts) {
            var email = opts.email;
            var twitter = opts.twitter;
            var contact = opts.contact;
            fsLog("Storing sidebar email: " + email + ", Twitter: " + twitter);
            setSidebarEmail(email);
            setSidebarTwitter(twitter);
            try {
                var sidebar_element = sidebarElement();
                if (sidebar_element[0]) {
                    fsLog("Sidebar element already exists...");
                } else {
                    fsLog("Sidebar element does not exist; trying to add...");
                    sidebar_element = jQuery('<div>');
                    sidebar_element.css({
                        "position": "relative",
                        "top": "0",
                        "border-top": "1px solid white",
                        "border-bottom": "1px solid white"
                    });
                    sidebar_element.attr("id", sidebar_id);
                    jQuery("div.nH.Pj", rapportive.active_view_element).after(sidebar_element);
                    resizeSidebar();
                }
                var html = opts.html || (opts.contact && opts.contact.html);
                if (html) {
                    sidebar_element.html(html);
                } else {
                    renderSidebar(sidebar_element, contact);
                }
                rapportive.sidebar.invokeJSPartials(sidebar_element);
                window.setTimeout(function () {
                    jQuery.event.trigger('scroll', null, window);
                }, 400);
            } catch (e) {
                var eStr = e.message ? e.message : e;
                fsLog("Exception trying to set sidebar: \n\n" + eStr, "sidebar", "warning");
            }
        }
        proto.invokeJSPartials = function (container) {
            function invokeJSPartial() {
                var container = jQuery(this);
                var scopedJQuery = rapportive.jQueryFor(container[0]);
                var partial = container.attr('data-partial');
                var params = jQuery.secureEvalJSON(container.attr('data-params') || '{}');
                var callback = rapportive.sidebar_callbacks[partial];
                if (callback) {
                    callback(rapportive, scopedJQuery, params);
                }
            }
            container.find('*[data-partial]').each(invokeJSPartial);
            if (container.attr('data-partial')) {
                invokeJSPartial.apply(container[0]);
            }
        };
        var resizeSidebar = function () {
            sidebarElement().css("width", (rapportive.getSidebarContainerWidth() - 15) + "px");
        };
        proto.addResizeHandler = function () {
            jQuery(window.top).resize(function () {
                resizeSidebar();
            });
        };
        proto.addScrollHandler = function () {
            var scrollWindow = jQuery(window);
            var scrollHandler = function (e, recursive) {
                var sidebar_element = sidebarElement();
                if (sidebar_element.size() > 0) {
                    resizeSidebar();
                    var original_top = sidebar_element.data("original_top");
                    if (!original_top) {
                        var sidebar_offset = sidebar_element.offset();
                        original_top = sidebar_offset ? sidebar_offset.top : 150;
                        sidebar_element.data("original_top", original_top);
                    }
                    if (scrollWindow.scrollTop() > original_top) {
                        var footer_offset = jQuery("div.iE.D.E", rapportive.active_view_element).offset(),
                            footer_top = footer_offset ? footer_offset.top : 999999,
                            footer_height = footer_top - scrollWindow.scrollTop(),
                            sidebar_height = sidebar_element.outerHeight(),
                            spare_space = footer_height - sidebar_height - 2;
                        if (spare_space < 0) {
                            sidebar_element.css({
                                "position": "relative",
                                "top": footer_top - original_top - sidebar_height - 2
                            });
                            if (!recursive) {
                                scrollHandler(e, true);
                            }
                        } else {
                            sidebar_element.css({
                                "position": "fixed",
                                "top": 0
                            });
                        }
                    } else {
                        sidebar_element.css({
                            "position": "relative",
                            "top": 0
                        });
                    }
                }
            };
            jQuery(window.top).scroll(loggily("scroll handler", scrollHandler));
        };
    }

    function MainMenu(rapportive) {
        var menuItemList = jQuery('<ul>');
        var menu = jQuery('<div id="rapportive-main-menu" />').append(menuItemList).hide();
        var iconLink = jQuery('<span id="rapportive-icon"/>');
        var textLink = jQuery('<a href="#" class="e" style="text-decoration:none"><span style="text-decoration:underline">Rapportive</span><span style="font-size: 11px; text-decoration: none"> ▼</span></a>');
        var track = function (message) {
            rapportiveLogger.track("Rapportive Menu: " + message, {
                authenticated: !! rapportive.authenticated_as,
                view_type: rapportive.active_view_type
            });
        };
        var createMenu = function () {
            menuItemList.empty();
            if (rapportive.authenticated_as) {
                menuItemList.append('<li>Logged in as <b>' + rapportive.authenticated_as + '</b></li>');
            } else {
                menuItemList.append('<li>Not logged in to Rapportive</li>');
            }
            if (!rapportive.authenticated_as) {
                var loginLink = jQuery('<a href="#"/>').text('Log in as ' + rapportive.user_email);
                menuItemList.append(loginLink);
                loginLink.wrap('<li />').click(loggily("login link", function () {
                    track("Log in link clicked");
                    rapportive.showLoginPopup();
                    return false;
                }));
            }
            jQuery.each(rapportive.alternative_users || [], function (i, user) {
                var loginLink = jQuery('<a href="#"/>').html("Switch to " + user.user_email).click(function () {
                    try {
                        localStorage['rapportive.aka.' + rapportive.user_email] = user.user_email;
                        localStorage.removeItem('rapportive.aka.' + user.user_email);
                    } catch (e) {
                        fsLog("Failed to set AKA in localStorage " + e, "gmail", "warning");
                    }
                    rapportive.user_email = user.user_email;
                    jQuery(this).parent().html('<img src="https://rapportive.com/images/ajax-loader.gif" alt="Switching user..." /> Switching user...');
                    if (user.has_session) {
                        rapportive.request({
                            complete: createMenu,
                            url: "https://rapportive.com/login_status"
                        });
                    } else {
                        rapportive.performImplicitLogin({
                            complete: createMenu
                        });
                    }
                });
                menuItemList.append(jQuery('<li/>').html(loginLink));
            });
            var rapletsLoginLink = jQuery('<a target="_blank">Add or Remove Raplets</a>');
            rapletsLoginLink.attr('href', rapportive.loginUrl('/raplets?user_email=' + encodeURIComponent(rapportive.user_email)));
            menuItemList.append(rapletsLoginLink);
            rapletsLoginLink.wrap('<li/>');
            rapletsLoginLink.click(function () {
                track("Add Raplet link clicked");
            });
            if (rapportive.authenticated_as) {
                if (rapportive.active_view_type == 'cv') {
                    var link = jQuery('<a href="#">Edit my Rapportive profile</a>');
                    menuItemList.append(link);
                    link.wrap('<li />').click(loggily("edit profile link", function () {
                        rapportive.sidebar.editOwnProfile();
                        track("Edit my profile link clicked");
                        return false;
                    }));
                }
            }
            if (rapportive.supports('authorizing')) {
                var authz_link = jQuery('<a href="#">Connect my networks</a>');
                menuItemList.append(authz_link);
                authz_link.wrap('<li />').click(loggily("connect networks dialog link", function () {
                    track("Connections dialog link clicked", {
                        authenticated: !! rapportive.authenticated_as
                    });
                    rapportive.settings_dialog.show();
                    return false;
                }));
            }
            if (rapportive.user_is_admin) {
                var clearCacheLink = jQuery('<a href="#">(ADMIN) Clear lookup cache</a>');
                menuItemList.append(clearCacheLink);
                clearCacheLink.wrap('<li />').click(loggily("clear cache link", function () {
                    rapportive.lookup_service.clearCache();
                    rapportive.sidebar.refreshSidebar();
                }));
            }
        };
        var showMenu = function (evt) {
            if (evt) {
                evt.preventDefault();
            }
            createMenu();
            var posX = iconLink.offset().left - 4;
            iconLink.css({
                'background-position': '-14px 0px'
            });
            menu.css({
                'left': posX + 'px'
            }).fadeIn(50);
            track("shown");
        };
        var hideMenu = function (evt) {
            iconLink.css({
                'background-position': '0px 0px'
            });
            menu.fadeOut(250);
        };
        var menuContainer = jQuery('<span/>').append(iconLink).append(' ').append(textLink).append(menu);
        window.setRapportiveStatus(menuContainer);
        menuContainer.hoverIntent({
            over: showMenu,
            out: hideMenu,
            timeout: 250
        });
        iconLink.click(showMenu);
        textLink.click(showMenu);
    }

    function SettingsDialog(rapportive) {
        var jQuery = rapportive.jQuery;

        function reallyShow() {
            jQuery('<iframe src="https://rapportive.com/authorization/settings?user_email=' + encodeURIComponent(rapportive.user_email) + '"/>').dialog({
                "title": "Connect my networks",
                "buttons": {
                    "OK": function () {
                        jQuery(this).dialog('close');
                    }
                },
                "modal": true,
                "width": 500,
                "height": 325,
                "close": function () {
                    rapportive.lookup_service.clearCache();
                    rapportive.sidebar.refreshSidebar();
                }
            }).css({
                "width": "500px",
                "padding": 0
            });
        }
        this.show = function () {
            if (rapportive.authenticated_as) {
                reallyShow();
            } else {
                rapportive.showLoginPopup(function () {
                    if (rapportive.authenticated_as) {
                        reallyShow();
                    }
                }, 'connections');
            }
        };
    }

    function ConnectButton(rapportive) {
        return function (site, jQuery, params, showInvitationDialog) {
            function connectUnlessAlreadyConnected() {
                rapportive.request({
                    url: params.connection_status_url,
                    success: loggily("unlessAlreadyConnected callback", function (response) {
                        switch (response.status) {
                        case 200:
                            if (response.connection_status && response.connection_status !== "unconnected") {
                                fsLog("already " + response.connection_status + " " + site);
                            } else {
                                showInvitationDialog(true);
                            }
                            break;
                        case 401:
                            fsLog("still unauthorized, don't show connect dialog");
                            break;
                        default:
                            throw "Unexpected response " + response.status + " from connected check";
                        }
                    })
                });
            }

            function withCurrentInfoBubble(element, something_to_do) {
                var classes = jQuery(element).attr("class"),
                    matches, bubble;
                if (classes && (matches = classes.match(/(?:^|\s)membership\-(?:status|action)\-([a-z]+)/))) {
                    bubble = jQuery("." + matches[1] + "-bubble");
                    if (bubble.length > 0) {
                        something_to_do(bubble);
                    }
                }
            }
            if (!rapportive.supports('authorizing')) {
                jQuery(".membership-action[href='#login'],.membership-action[href='#authorize']").hide();
            }
            jQuery(".membership-action").click(function () {
                var popup;
                switch (jQuery(this).attr("href")) {
                case '#invite':
                    showInvitationDialog(false);
                    break;
                case '#login':
                case '#authorize':
                    rapportiveLogger.track('OAuth: Connect', {
                        from: 'membership',
                        site: site
                    });
                    jQuery.centeredPopup({
                        url: params.intro_authorization_url,
                        modal: true,
                        width: 600,
                        height: 500,
                        callback: function () {
                            rapportive.sidebar.refreshSidebar(false, true);
                            rapportive.request({
                                url: params.import_authorization_url,
                                success: function () {
                                    connectUnlessAlreadyConnected();
                                    rapportive.sidebar.refreshSidebar();
                                }
                            });
                        }
                    });
                    break;
                }
                return false;
            });
            jQuery(".membership-action, .membership-status").hoverIntent({
                over: function () {
                    withCurrentInfoBubble(this, function (bubble) {
                        bubble.fadeIn(50);
                    });
                },
                out: function () {
                    withCurrentInfoBubble(this, function (bubble) {
                        bubble.fadeOut(250);
                    });
                }
            });
        };
    }
    proto.initialise = function () {
        jQuery.jsonp.setup({
            callbackParameter: "callback",
            timeout: 60000
        });
        that.getRootURL();
        that.getUserEmail(function () {
            that.performImplicitLogin({
                complete: function () {
                    that.viewChangeSpinner = new ViewChangeSpinner();
                    that.viewChangeSpinner.addSpinner();
                }
            });
        });
        that.moveSidebarActions();
        that.handlers = new Handlers();
        that.handlers.addHandlers();
        that.lookup_service = new LookupService();
        that.sidebar = new Sidebar(that);
        that.sidebar.addScrollHandler();
        that.sidebar.addResizeHandler();
        that.main_menu = new MainMenu(that);
        that.settings_dialog = new SettingsDialog(that);
        that.connect_button = new ConnectButton(that);
    };
    proto.getRootURL = function () {
        fsLog("Looking for the root url...");
        var href = document.location.href;
        var regex = new RegExp("https?://mail\\.google\\.com(?::443)?/(a/(.+?)/|(mail/))");
        var matches = href.match(regex);
        if (matches) {
            that.root_url = matches[0];
            that.domain_from_url = matches[2];
            if (that.domain_from_url) {
                that.domain_from_url = that.domain_from_url.toLowerCase();
            }
            fsLog("Your root url is: " + that.root_url);
        } else {
            var whiteLabels = {
                "mail.blueyonder.co.uk": 1,
                "mail.ntlworld.com": 1,
                "mail.tools.sky.com": 1,
                "mail.virginmedia.com": 1,
                "mail.virgin.net": 1,
                "webmail.clear.net": 1,
                "webmail.clearwire.net": 1,
                "webmail.sify.com": 1
            };
            if ((!whiteLabels[location.host]) && /https?:/.test(location.protocol)) {
                fsLog("Could not find the root url from " + document.location.href + "; has Google changed their url structure?", "gmail", "warning");
            }
        }
    };
    proto.getUserEmail = function (continuation) {
        var element;
        delayedConditionalExecute({
            condition: function () {
                element = jQuery("#guser nobr b");
                return element[0];
            },
            retry_message: "Scheduling another attempt to get user email...",
            failure_message: "Ran out of attempts to get user email; cannot continue.",
            log_category: "gmail",
            continuation: function () {
                var email = element.text(),
                    switched_account = false;
                fsLog("Found user email: " + email);
                try {
                    var seen = {};
                    while (localStorage["rapportive.aka." + email] && !seen[email]) {
                        seen[email] = true;
                        email = localStorage["rapportive.aka." + email];
                        fsLog("Remembered account switch to " + email);
                        switched_account = true;
                    }
                    if (seen[email]) {
                        email = element.text();
                        switched_account = false;
                    }
                } catch (e) {
                    fsLog("Failed to read AKA from localStorage: " + e);
                }
                that.user_email = email;
                fsLog("domain from email: " + that.userEmailDomain());
                fsLog("domain from URL: " + that.domain_from_url);
                if (!switched_account && that.domain_from_url && that.domain_from_url !== that.userEmailDomain()) {
                    fsLog("Google Apps domain mismatch!  Got " + that.domain_from_url + " from URL but " + that.userEmailDomain() + " from email!", "gmail", "warning");
                }
                continuation();
            }
        });
    };
    proto.moveSidebarActions = function () {
        fsLog("Moving sidebar actions.");
        var css = "";
        css += "table td.Bu:last-child > div.nH {" + "position: relative !important;" + "}";
        css += "div.hj {" + "position: absolute !important;" + "width: 500px !important;" + "top: 12px !important;" + "right: 240px;" + "}";
        css += "div.hk {" + "padding: 0px !important;" + "float: right !important;" + "margin-left: 15px !important;" + "}";
        css += "div.hk img {" + "vertical-align: baseline;" + "}";
        css += "div.hk u {" + "display: none !important;" + "}";
        css += "h1.ha {" + "margin-right: 100px !important;" + "position: relative;" + "z-index: 10;" + "}";
        css += "div.J-M.AW {" + "z-index: 20;" + "}";
        css += "div#goog-acr-0 {" + "z-index: 20;" + "}";
        css += "div.tq {" + "z-index: 20;" + "}";
        jQuery("<style type='text/css'>").text(css).appendTo("head");
        jQuery("div.hk").live("mouseover", loggily("mouseover actions", function () {
            var image = jQuery("img", this);
            if (!image.attr("title")) {
                image.attr("title", jQuery("u", this).text());
            }
        }));
        jQuery(window.top).resize(loggily("resize window", function () {
            jQuery("div.hj").css("right", (that.getSidebarContainerWidth() + 15) + "px");
            that.recalculateActionLinksWidth();
        }));
    };
    that.bootstrap();
    that.initialise();
}
rapportive.prototype.models = {};
rapportive.prototype.components = {};
rapportive.prototype.lib = {};
rapportive.prototype.templates = {};
rapportive.prototype.template_helpers = {};
rapportive.prototype.sidebar_callbacks = {};
rapportive.prototype.sidebar_callbacks["notes/_form"] = function (rapportive, jQuery, params, context, redraw) {
    var form = jQuery.rapportiveContainer.filter('form');
    var body = jQuery("#note-body");
    var saveButton = jQuery("#note-save-button");
    var spinner = jQuery(".sidebar-spinner");

    function saveNote() {
        if (body.hasClass("blur")) {
            return false;
        }
        var data = form.formSerialize();
        body.attr("disabled", "true");
        saveButton.disableGoogleButton();
        spinner.show();
        rapportive.request({
            url: params.contact.urls.create_note,
            data: data,
            success: function (data) {
                rapportiveLogger.track("Note submitted", {
                    valid: data.valid,
                    status: data.status
                });
                if (data.valid || data.status === 201 || data.status === 401) {
                    rapportive.sidebar.refreshSidebar(true);
                } else {
                    fsLog("Failed to create comment: " + data.errors);
                    body.removeAttr("disabled");
                    saveButton.enableGoogleButton();
                }
            }
        });
        return false;
    }
    saveButton.googleButton().click(saveNote);
    body.clearingInput({
        saveControl: "save_button_container"
    }).keydown(function (e) {
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
            this.blur();
            saveNote();
            return false;
        }
    }).autoResize({
        animate: false,
        extraSpace: 0
    });
};
rapportive.prototype.sidebar_callbacks["notes/_note"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery(".note-delete").click(function () {
        rapportive.request({
            url: context.delete_url,
            success: function (data) {
                if (data.status !== 200) {
                    jQuery(".note-undo").html("Sorry, something went wrong, we're looking into it.");
                }
            }
        });
        jQuery(".note-undo").show();
        jQuery(".note").slideUp();
        rapportive.lookup_service.invalidateCacheForEmail(params.contact.email);
    });
    jQuery(".note-undelete").click(function () {
        rapportive.request({
            url: context.undelete_url,
            success: function (data) {
                if (data.status !== 200) {
                    jQuery(".note").html("Sorry, something went wrong, we're looking into it.");
                }
            }
        });
        jQuery(".note").slideDown(function () {
            jQuery(".note-undo").hide();
        });
        rapportive.lookup_service.invalidateCacheForEmail(params.contact.email);
    });
};
rapportive.prototype.sidebar_callbacks["widgets/_facebook"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery = rapportive.jQueryFor(jQuery.rapportiveContainer.closest(".membership")[0]);

    function add_friend(after_popup) {
        if (after_popup) {
            return;
        }
        jQuery(".add-friend-call-to-action:visible .pre-click").fadeOut(function () {
            jQuery(".add-friend-call-to-action:visible .post-click").fadeIn();
        });
        if (rapportiveLogger) {
            rapportiveLogger.track("Facebook: Add friend clicked");
        }
        var popup = fsPopupManager();
        popup.popup(context.widget.add_friend_url, 600, 300);
    }
    rapportive.connect_button('facebook', jQuery, context.widget, add_friend);

    function profile_link(contact, time) {
        return jQuery('<a/>').attr('href', 'http://facebook.com/profile.php?id=' + contact.id).attr('target', '_blank').attr('title', contact.name + (time ? ', ' + jQuery.relativeTime(time) : '')).html(contact.name.split(" ")[0]).outerHTML();
    }

    function post_url(post_id) {
        var contact_id = post_id.split("_")[0],
            real_post_id = post_id.split("_")[1];
        return "http://facebook.com/" + contact_id + "/posts/" + real_post_id;
    }

    function can_comment(post) {
        var a, action, actions = post.actions;
        if (actions) {
            for (a = 0; a < actions.length; a += 1) {
                action = actions[a];
                if (action.name && action.name.match(/comment/i)) {
                    return true;
                }
            }
        }
        return false;
    }

    function truncate(text) {
        return jQuery.truncate(text, {
            length: 90,
            block_tag: false,
            more: "\u00a0\u2026"
        });
    }

    function render_comments(comments, post_id) {
        return jQuery.map(comments, function (data) {
            var comment = jQuery(".comment-template .comment").clone();
            comment.find("a.profile-link").attr("href", "http://facebook.com/profile.php?id=" + data.from.id);
            comment.find("img.profile-image").attr("src", "https://graph.facebook.com/" + data.from.id + "/picture?size=square");
            comment.find(".author").html(profile_link(data.from, data.created_time));
            comment.find(".message").html(truncate(data.message)).linkify({
                truncate_urls: true
            }).wbrise();
            comment.find("a.timeago").attr("href", post_url(post_id)).html(jQuery.relativeTime(data.created_time));
            return comment;
        });
    }

    function populate_comments(post, show_all_comments) {
        var comments, comments_html;
        if (!show_all_comments && post.comments.count >= 3) {
            jQuery(".view-all").attr('data-post-id', post.id).show();
            jQuery(".view-all .count").html(post.comments.count);
            if (post.comments.data) {
                comments = render_comments(post.comments.data.slice(-1), post.id);
            }
        } else {
            if (post.comments.data) {
                comments = render_comments(post.comments.data, post.id);
            }
        }
        if (comments) {
            comments_html = jQuery.map(comments, function (comment) {
                return comment.outerHTML();
            }).join(" ");
            jQuery(".facebook-posts .comments").html(comments_html);
        }
        if (rapportiveLogger) {
            jQuery(".comment a").click(function () {
                rapportiveLogger.track("Facebook: Link clicked", {
                    source: "comment"
                });
            });
        }
    }

    function populate_facebook_widget_content(after_population_callback) {
        function populate_content_preview(post) {
            var preview, url;

            function base_url(url) {
                return jQuery.stripHTML(url).split("&")[0].split("?")[0];
            }

            function httpserise_url(url) {
                return url.replace(/^http:/, "https:");
            }

            function url_at_youtube(url) {
                return base_url(url).match("youtube.com");
            }

            function massage_video_url(url) {
                var youtube_params = [
                    ["autoplay", "0"],
                    ["showinfo", "0"],
                    ["rel", "0"],
                    ["fs", "0"],
                    ["showsearch", "0"],
                    ["enablejsapi", "1"]
                ];
                if (url_at_youtube(url)) {
                    return httpserise_url(base_url(url)) + "?" + jQuery.map(youtube_params, function (e) {
                        return e[0] + "=" + e[1];
                    }).join("&");
                } else {
                    return url;
                }
            }

            function populate_content_preview_text() {
                if (post.caption) {
                    preview.find(".text").show().find(".caption").show().html(post.caption).linkify({
                        truncate_urls: true
                    }).wbrise();
                }
                if (post.description) {
                    preview.find(".text").show().find(".description").html(post.description).linkify({
                        truncate_urls: true
                    }).wbrise();
                }
            }
            jQuery(".content-preview").data("content-preview-present", false);
            if (post.source && url_at_youtube(post.source)) {
                preview = jQuery(".content-preview .video-preview").show();
                preview.find("embed.youtube-video").show().attr("src", massage_video_url(post.source));
                preview.find(".text").show().find(".watch a").attr("href", post.source);
                populate_content_preview_text();
                jQuery(".post .icon.video").show();
                jQuery(".content-preview").data("content-preview-present", true);
            } else if (post.picture) {
                preview = jQuery(".content-preview .picture-preview").show();
                if (post.link) {
                    preview.find("a.link").show().attr("href", post.link);
                    preview.find("img.content-image").attr("src", jQuery.proxyURL(post.picture));
                }
                populate_content_preview_text();
                jQuery(".post .icon.picture").show();
                jQuery(".content-preview").data("content-preview-present", true);
            }
            if (rapportiveLogger) {
                jQuery(".content-preview a").click(function () {
                    rapportiveLogger.track("Facebook: Link clicked", {
                        source: "content preview"
                    });
                });
            }
        }

        function populate_post(post) {
            var post_element = jQuery(".facebook-posts .post"),
                link = post_element.find(".link"),
                url = post.link || post.source;
            post_element.find("a.profile-link").attr("href", "http://facebook.com/profile.php?id=" + post.from.id);
            post_element.find("img.profile-image").attr("src", "https://graph.facebook.com/" + post.from.id + "/picture?size=square");
            post_element.find(".author").html(profile_link(post.from, post.created_time));
            if (post.message) {
                post_element.find(".message").html(truncate(post.message)).linkify({
                    truncate_urls: true
                }).wbrise();
            }
            if (url) {
                link.show().find("a").attr("href", url).find(".text").html(jQuery.truncate_url(url));
                if (post.name) {
                    link.find(".text").html(post.name);
                }
                link.wbrise();
            }
            post_element.find("a.timeago").attr("href", post_url(post.id)).html(jQuery.relativeTime(post.created_time));
            populate_content_preview(post);
            if (post.comments) {
                populate_comments(post);
            }
            jQuery(".comment-form").attr("post-id", post.id);
            if (can_comment(post)) {
                jQuery(".comment-form").show();
            } else if (!params.contact.is_current_user && !context.widget.own_profile && !context.widget.connected) {
                jQuery(".add-friend-call-to-action").show().find("a.add-friend").click(function () {
                    add_friend();
                    return false;
                });
            }
            if (rapportiveLogger) {
                jQuery(".post a").click(function () {
                    rapportiveLogger.track("Facebook: Link clicked", {
                        source: "post"
                    });
                });
            }
        }
        jQuery.jsonp({
            url: context.widget.jsonp_api_proxy_url,
            data: {
                id: context.username || context.profile_id,
                fields: "feed"
            },
            timeout: 20000,
            success: loggily("facebook load success", function (result) {
                var p, post, posts = result.feed ? result.feed.data : null;
                if (posts && posts.length) {
                    for (p = 0; p < posts.length; p += 1) {
                        if (posts[p].from.id === result.id) {
                            post = posts[p];
                            break;
                        }
                    }
                    if (post) {
                        populate_post(post);
                        jQuery(".facebook-posts").show();
                    }
                }
                if (rapportiveLogger) {
                    rapportiveLogger.track("Facebook: Widget render", {
                        post_present: !! post,
                        can_comment: (post ? can_comment(post) : false),
                        probability: 0.01
                    });
                }
            }),
            complete: loggily("facebook load complete", function (result) {
                if (after_population_callback) {
                    after_population_callback();
                }
            })
        });
    }

    function post_comment(comment, post_id) {
        post_id = post_id.split("_")[1];

        function disable_comments() {
            jQuery(".comment-form #new-comment").attr("disabled", "true");
            jQuery(".comment-form #comment-button").disableGoogleButton();
            jQuery(".comment-form .sidebar-spinner").show();
        }

        function enable_comments() {
            jQuery(".comment-form #new-comment").removeAttr("disabled");
            jQuery(".comment-form #comment-button").enableGoogleButton();
            jQuery(".comment-form .sidebar-spinner").hide();
        }
        if (comment && post_id) {
            disable_comments();
            rapportive.request({
                url: context.widget.jsonp_comment_url,
                data: {
                    post_id: post_id,
                    comment: comment
                },
                success: loggily("facebook comment success", function (response) {
                    if (response.status === 200) {
                        populate_facebook_widget_content(function () {
                            jQuery(".comment-form #new-comment").val("").blur().change();
                            enable_comments();
                        });
                    } else {
                        fsLog("Failed to create Facebook comment: " + response.errors);
                        jQuery('.comment-form').addClass('error').html(response.html);
                        enable_comments();
                    }
                    if (rapportiveLogger) {
                        rapportiveLogger.track("Facebook: Post comment", {
                            status: response.status
                        });
                    }
                }),
                error: loggily("facebook comment error", function () {
                    fsLog("Failed to create Facebook comment: JSONP error");
                    jQuery('.comment-form').addClass('error').html("Sorry, something broke :(");
                    enable_comments();
                    if (rapportiveLogger) {
                        rapportiveLogger.track("Facebook: Post comment", {
                            status: "JSONP error"
                        });
                    }
                })
            });
        }
        return false;
    }
    jQuery(".view-all").click(function (event) {
        var view_all = jQuery(this),
            spinner = view_all.find(".spinner-container").show(),
            post_id = this.getAttribute('data-post-id');
        jQuery.jsonp({
            url: context.widget.jsonp_api_proxy_url,
            data: {
                id: post_id
            },
            timeout: 20000,
            success: loggily("facebook view-all success", function (result) {
                view_all.hide();
                populate_comments(result, true);
            }),
            error: loggily("facebook view-all error", function () {
                var link = post_url(post_id);
                view_all.html("Sorry, that did not work.<br/>" + "<a href=\"" + link + "\" target=\"_blank\">Read this thread on Facebook</a>");
                view_all.unbind(event);
            }),
            complete: loggily("facebook view-all complete", function (request, status) {
                spinner.hide();
                if (rapportiveLogger) {
                    rapportiveLogger.track("Facebook: View all comments", {
                        status: status
                    });
                }
            })
        });
        return false;
    });

    function show_content_preview_if_necessary() {
        var content_preview = jQuery(".content-preview:hidden"),
            video = !! jQuery(".content-preview .video-preview embed.youtube-video").attr("src"),
            picture = !! jQuery(".content-preview .picture-preview img.content-image").attr("src"),
            content_type;
        if (video) {
            content_type = "video";
        } else if (picture) {
            content_type = "picture";
        } else {
            content_type = "none";
        }
        if (content_preview.data("content-preview-present")) {
            content_preview.fadeIn(50);
            if (rapportiveLogger) {
                rapportiveLogger.track("Facebook: Content preview shown", {
                    content_type: content_type
                });
            }
        }
    }

    function hide_content_preview_if_visible() {
        var content_preview = jQuery(".content-preview:visible");
        content_preview.fadeOut(250, function () {
            content_preview.find(".video-preview .close").hide();
        });
    }
    jQuery(".facebook-posts").hoverIntent({
        over: show_content_preview_if_necessary,
        out: function () {
            var content_preview = jQuery(".content-preview:visible"),
                video_preview, youtube_video;
            if (content_preview.data("content-preview-present")) {
                video_preview = content_preview.find(".video-preview");
                youtube_video = video_preview.find(".youtube-video")[0];
                if (youtube_video && youtube_video.getPlayerState && (youtube_video.getPlayerState() === 1 || youtube_video.getPlayerState() === 3)) {
                    video_preview.find(".text").show().find(".close").fadeIn();
                    if (rapportiveLogger) {
                        rapportiveLogger.track("Facebook: Video playing (lower bound)");
                    }
                } else {
                    hide_content_preview_if_visible();
                }
            }
        },
        timeout: 250
    });
    jQuery(".video-preview .watch a").click(function () {
        var youtube_video = jQuery(".content-preview .video-preview .youtube-video")[0];
        if (youtube_video && youtube_video.pauseVideo) {
            youtube_video.pauseVideo();
        }
        if (rapportiveLogger) {
            rapportiveLogger.track("Facebook: Watch on YouTube");
        }
        return true;
    });
    jQuery(".video-preview .close a").click(function () {
        hide_content_preview_if_visible();
        if (rapportiveLogger) {
            rapportiveLogger.track("Facebook: Video close clicked");
        }
        return false;
    });
    jQuery("#new-comment").clearingInput({
        saveControl: "comment-button-container"
    }).keydown(function (e) {
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
            this.blur();
            jQuery(this).closest("form").submit();
            return false;
        }
        if (!jQuery(this).data("autoResize")) {
            jQuery(this).autoResize({
                animate: false,
                extraSpace: 0
            }).data("autoResize", "true");
        }
    });
    jQuery("#comment-button").googleButton().click(function () {
        jQuery(this).closest("form").submit();
    });
    jQuery(".comment-form").submit(function () {
        var comment = jQuery(this).find("textarea").attr("value"),
            post_id = jQuery(this).attr("post-id");
        if (comment && comment !== jQuery(this).find("label").html() && post_id) {
            post_comment(comment, post_id);
        }
        return false;
    });
    jQuery("a.hide-hint").click(function () {
        jQuery(".facebook-add-friend-hint").fadeOut();
        rapportive.request({
            url: jQuery(this).attr("href"),
            data: {
                value: "bool:true"
            }
        });
        if (rapportiveLogger) {
            rapportiveLogger.track("Facebook: Dismiss add friend hint");
        }
        rapportive.lookup_service.clearCache();
        return false;
    });
    jQuery("a.expand-truncated").die("click").live("click", function () {
        var link = jQuery(this).hide();
        link.siblings('.truncated').show();
        jQuery.event.trigger('scroll', null, window);
        return false;
    });
    if (context.widget.facebook_user_id) {
        populate_facebook_widget_content();
    }
};
rapportive.prototype.sidebar_callbacks["widgets/_tungle"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery.rapportiveContainer.closest('li').find('a.tungle-me.membership-action').click(function () {
        var tungle_dialog = jQuery('<div><iframe scrolling="no" frameborder="0" ' + 'style="border: 0px; height: 540px; width: 320px;" ' + 'src="https://www.tungle.me/portal/widget.htm#' + context.username + '"></iframe></div>');
        tungle_dialog.dialog({
            modal: true,
            height: 'auto',
            width: 344,
            resizable: false,
            title: "Schedule a meeting",
            close: function (event, ui) {
                jQuery(this).remove().dialog('destroy');
            }
        });
        if (rapportiveLogger) {
            rapportiveLogger.track("Tungle: Schedule clicked");
        }
        return false;
    });
};
rapportive.prototype.sidebar_callbacks["widgets/_twitter"] = function (rapportive, jQuery, params, context, redraw) {
    var membership = jQuery.rapportiveContainer.closest('li.membership');
    membership.find("div.expand-button").click(function () {
        membership.removeClass('collapsed').addClass('expanded');
        membership.find(".membership-details:visible").slideUp(400, function () {
            membership.removeClass('expanded').addClass('collapsed');
            jQuery.event.trigger('scroll', null, window);
        });
        membership.find(".membership-details:hidden").slideDown(400, function () {
            jQuery.event.trigger('scroll', null, window);
        });
        return false;
    });
    membership.find(".tweets").tweet({
        username: context.username,
        count: 3,
        join_text: "&ndash;",
        loading_text: "Fetching " + context.username + "'s tweets...",
        avatar_size: 27,
        proxy_func: jQuery.proxyURL,
        callback: function (tweets) {
            if (tweets.length === 0) {
                membership.removeClass('expanded').addClass('collapsed').find('.expand-button').hide();
            }
        }
    });
};
rapportive.prototype.sidebar_callbacks["widgets/_linked_in"] = function (rapportive, jQuery, params, context, redraw) {
    var membershipContainer = jQuery.rapportiveContainer.closest(".membership");
    var connectDialog = membershipContainer.find(".info-dialog");
    var connectBody = connectDialog.find("textarea");
    var wordCount = connectDialog.find(".word-count");
    var countUpdate = wordCount.find(".current");
    var countTotal = wordCount.find(".total");
    var invitationStatus = connectDialog.find(".invitation-status");
    var statusText = invitationStatus.find(".status-text");

    function setInvitationStatus(status, description) {
        invitationStatus.show();
        invitationStatus.removeClass("waiting").removeClass("error").removeClass("success");
        invitationStatus.addClass(status);
        statusText.text(description);
        if (status === "waiting" || status === "success") {
            context.widget.invited = true;
        }
        redraw('widgets/_linked_in_button', params, context);
    }

    function tooManyCharacters() {
        return (parseInt(countUpdate.text(), 10) > parseInt(countTotal.text(), 10));
    }

    function updateCharacterCount() {
        countUpdate.text(connectBody.val().length);
        if (tooManyCharacters()) {
            wordCount.addClass("error");
        } else {
            wordCount.removeClass("error");
        }
    }
    connectDialog.dialog({
        width: 350,
        modal: true,
        autoOpen: false,
        buttons: {
            "Cancel": function () {
                rapportive.sidebar.refreshSidebar(true);
                connectDialog.dialog("close");
            },
            "Send Invitation": function () {
                if (tooManyCharacters()) {
                    return alert("Sorry, your invitation message cannot be more than 200 characters long.");
                }
                setInvitationStatus("waiting", "Sending invitation...");
                var with_rapportive_com = connectBody.val().match(/rapportive\.com/) ? true : false;
                var with_rapportive = connectBody.val().match(/rapportive/i) ? true : false;
                rapportive.request({
                    url: context.widget.connect_url,
                    data: {
                        message: connectBody.val()
                    },
                    success: function (data, textStatus) {
                        if (data.status === 200) {
                            switch (data.result) {
                            case "success":
                                setInvitationStatus("success", "Invitation sent!");
                                rapportive.sidebar.refreshSidebar(true);
                                rapportiveLogger.track('LinkedIn: Invitation Sent', {
                                    status: 'success',
                                    with_rapportive_com: with_rapportive_com,
                                    with_rapportive: with_rapportive
                                });
                                connectDialog.dialog("close");
                                break;
                            case "reauthorize":
                                rapportiveLogger.track('LinkedIn: Invitation Sent', {
                                    status: 'reauthorize',
                                    with_rapportive_com: with_rapportive_com,
                                    with_rapportive: with_rapportive
                                });
                                setInvitationStatus("error", data.error);
                                break;
                            case "error":
                                rapportiveLogger.track('LinkedIn: Invitation Sent', {
                                    status: 'error',
                                    with_rapportive_com: with_rapportive_com,
                                    with_rapportive: with_rapportive
                                });
                                setInvitationStatus("error", data.error);
                                break;
                            }
                        } else {
                            setInvitationStatus("error", "Sorry, something broke! Please try again later.");
                        }
                    }
                });
            }
        }
    });
    updateCharacterCount();
    connectBody.keyup(updateCharacterCount).mouseup(updateCharacterCount);
    rapportive.connect_button('linkedin', rapportive.jQueryFor(membershipContainer), context.widget, function () {
        invitationStatus.hide();
        connectDialog.dialog("open");
        connectBody.focus();
    });
};
rapportive.prototype.sidebar_callbacks["widgets/_linked_in_button"] = function (rapportive, jQuery, params, context, redraw) {};
rapportive.prototype.sidebar_callbacks["authorizations/_setting"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery(function (jQuery) {
        jQuery('.authorization-button').click(function () {
            var import_url = this.getAttribute('data-import-url'),
                button = jQuery(this);
            rapportiveLogger.track('OAuth: Connect', {
                from: 'settings',
                site: this.getAttribute('data-site')
            });
            jQuery.centeredPopup({
                url: jQuery(this).attr("href"),
                width: 600,
                height: 500,
                relative_to: window.screen,
                callback: function () {
                    button.replaceWith('Updating...');
                    if (import_url) {
                        jQuery.ajax({
                            type: "get",
                            dataType: "jsonp",
                            url: import_url,
                            success: function () {
                                window.location.reload();
                            }
                        });
                    } else {
                        window.location.reload();
                    }
                }
            });
            return false;
        });
        jQuery('a.disconnect-link').click(function () {
            rapportiveLogger.track('OAuth: Disconnect', {
                from: 'settings',
                site: this.getAttribute('data-site')
            });
            $(this).closest('form').submit();
            $(this).replaceWith('Updating...');
        });
        jQuery('.google-button').googleButton();
    });
};
rapportive.prototype.sidebar_callbacks["authorizations/_connect"] = function (rapportive, jQuery, params, context, redraw) {
    if (!rapportive.supports('authorizing')) {
        jQuery('.authorization-instructions').hide();
    }
    jQuery(".authorization-button").click(function () {
        var import_url = jQuery(this).attr('data-import-url');
        rapportiveLogger.track("OAuth: Connect", {
            from: "sidebar",
            site: jQuery(this).closest(".authorization-button-container").attr('data-site')
        });
        jQuery.centeredPopup({
            url: this.href,
            modal: true,
            width: 600,
            height: 500,
            callback: loggily("authorization window closed", function () {
                rapportive.lookup_service.clearCache();
                if (import_url) {
                    rapportive.sidebar.refreshSidebar(false, true);
                    rapportive.request({
                        url: import_url,
                        success: function () {
                            rapportive.sidebar.refreshSidebar();
                        }
                    });
                } else {
                    rapportive.sidebar.refreshSidebar();
                }
            })
        });
        return false;
    });
    jQuery(".authorization-later-button").click(function () {
        var showAuthorizationCancelled = function () {
            jQuery(".authorization-cancelled:hidden").fadeIn();
        };
        if (jQuery(".authorization-button:visible").length === 1) {
            jQuery(".authorization-instructions").fadeOut(showAuthorizationCancelled);
        } else {
            jQuery(this).closest(".authorization-button-container").fadeOut(showAuthorizationCancelled);
        }
        rapportiveLogger.track("OAuth: Dismiss", {
            from: "sidebar",
            site: jQuery(this).closest(".authorization-button-container").attr('data-site')
        });
        rapportive.request({
            url: this.href,
            data: {
                value: "bool:true"
            }
        });
        rapportive.lookup_service.clearCache();
        return false;
    });
    jQuery(".authorization-settings-dialog").click(function () {
        rapportive.settings_dialog.show();
        return false;
    });
    jQuery(".authorization-button-container").hoverIntent({
        over: function () {
            jQuery(this).find(".authorization-preview").fadeIn(50);
        },
        out: function () {
            jQuery(this).find(".authorization-preview").fadeOut(250);
        },
        timeout: 250
    });
    jQuery("img.preview").hoverIntent({
        over: function () {
            jQuery(this).animate({
                opacity: 1.0
            }, 250);
        },
        out: function () {
            jQuery(this).animate({
                opacity: 0.75
            }, 250);
        }
    });
};
rapportive.prototype.sidebar_callbacks["contacts/_action_bar"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery(".my-profile-link").click(function () {
        if (params.user.logged_in) {
            rapportiveLogger.track("My profile link clicked", {
                logged_in: true
            });
            rapportive.sidebar.editOwnProfile();
        } else {
            rapportiveLogger.track("My profile link clicked", {
                logged_in: false
            });
            rapportive.showLoginPopup(function () {
                rapportive.sidebar.editOwnProfile();
            }, "myprofile");
        }
        return false;
    });
    jQuery("img.logo").mouseover(function () {
        this.src = this.src.replace('rapportive-light', 'rapportive-dark');
    }).mouseout(function () {
        this.src = this.src.replace('rapportive-dark', 'rapportive-light');
    });
};
rapportive.prototype.sidebar_callbacks["contacts/_membership_new"] = function (rapportive, jQuery, params, context, redraw) {
    var inputContainer = jQuery.rapportiveContainer;
    var addButton = inputContainer.find("a.action");
    var formWrapper = inputContainer.find("div.form-wrapper");
    var inputForm = formWrapper.find("form.form");
    var inputField = inputForm.find("input#membership_url");
    var infoParagraph = inputContainer.find("div.save_button_container p.info");
    var errorParagraph = inputContainer.find("p.new-membership-error");
    var spinner = inputForm.find('.membership-spinner');

    function showForm() {
        addButton.hide();
        formWrapper.show();
        infoParagraph.show();
        errorParagraph.hide();
        inputField.focus().select();
        return false;
    }

    function hideForm() {
        formWrapper.hide();
        addButton.show();
        inputForm[0].reset();
        return false;
    }

    function submit() {
        var url = inputField.val();
        if (!url) {
            return hideForm();
        }
        spinner.show();
        inputField.attr("disabled", "true");
        rapportive.request({
            url: params.contact.urls.create_membership,
            data: {
                url: url
            },
            success: function (data) {
                var domain_regex = /^(https?:\/\/)?(([a-z0-9\-]+\.)+([a-z0-9\-]+))/i;
                var match = url.match(domain_regex);
                spinner.hide();
                inputField.removeAttr("disabled");
                var properties = {
                    status: data.status
                };
                if (match) {
                    var http = match[1];
                    properties.http_missing = !http;
                    var domain = match[2];
                    properties.site_domain = domain;
                } else {
                    properties.malformed_site_url = url;
                }
                rapportiveLogger.track("My profile: edit", {
                    edit_type: "social network"
                });
                rapportiveLogger.track("My profile: social network: add", properties);
                if (data && data.status === 200) {
                    hideForm();
                    redraw('contacts/person/_person', data);
                    rapportive.sidebar.invalidateCacheEntry();
                } else {
                    infoParagraph.hide();
                    errorParagraph.show().html(data && data.html || "Sorry, we didn't understand this address.").wbrise();
                    inputField.focus().select();
                    rapportiveLogger.track("Add site failed", properties);
                }
            }
        });
        return false;
    }
    addButton.click(showForm);
    inputField.blur(function () {
        if (!inputField.val()) {
            hideForm();
        }
    }).keydown(function (e) {
        if (e.keyCode === 27) {
            hideForm();
        }
    });
    inputForm.submit(submit).find("#membership_save_button").googleButton().click(submit);
};
rapportive.prototype.sidebar_callbacks["contacts/_raplet"] = function (rapportive, jQuery, params, context, redraw) {
    var lookup_url = context.lookup_url;
    fsLog("Looking up Raplet with url: " + lookup_url);
    var extra_params_marker = 'https://rapportive.com/raplets/raplet_params?';
    jQuery(rapportive.active_view_element).find('a[href^="' + extra_params_marker + '"]').each(function () {
        var extra_params = jQuery.parseQuery(this.href.replace(extra_params_marker, ''));
        if (extra_params.raplet === context.raplet_url) {
            for (var p in extra_params) {
                if (extra_params.hasOwnProperty(p) && (p !== 'raplet')) {
                    lookup_url += '&' + encodeURIComponent(p) + '=' + encodeURIComponent(extra_params[p]);
                }
            }
        }
    });
    jQuery.ajax({
        type: "get",
        dataType: "jsonp",
        url: lookup_url,
        success: function (response) {
            var raplet_container_element = jQuery.rapportiveContainer;
            var raplet_id = 'raplet-' + context.url_hash;
            raplet_container_element.attr('id', raplet_id);
            raplet_container_element.html(response.html);
            raplet_container_element.find("a").attr("target", "_blank");
            var raplet_server = context.raplet_url.match(/([a-zA-Z]+:\/\/[a-zA-Z0-9\-\.:]+)/)[1];
            raplet_container_element.find("a").each(function () {
                var href = jQuery(this).attr("href");
                if ("/" === href.charAt(0)) {
                    href = raplet_server + href;
                } else if (!(href.match(/^[a-z]+:/i))) {
                    href = context.raplet_url + "/" + href;
                }
                if (rapportive.isMailplane()) {
                    href = jQuery.wrapMailplaneURL(href);
                }
                jQuery(this).attr("href", href);
            });
            if (response.css) {
                var css = response.css.replace(/\/\*[^*]*\*+([^\/*][^*]*\*+)*\//g, '');
                css = css.replace(/(^|\}|@[^\{;]*;)\s*([^\s@])/g, '$1\ndiv#rapportive-sidebar div#' + raplet_id + ' $2');
                jQuery('#' + context.url_hash).remove();
                jQuery('<style type="text/css" id="' + context.url_hash + '"></style>').text(css).appendTo('head');
            }
            try {
                (function ($, jQuery) {
                    eval(response.js);
                }(jQuery, jQuery));
            } catch (e) {
                fsLog("WARNING: exception thrown by raplet: " + e);
            }
        }
    });
};
rapportive.prototype.sidebar_callbacks["contacts/organisation/_title"] = function (rapportive, jQuery, params, context, redraw) {
    if (params.contact.can_be_edited) {
        jQuery(function () {
            var infoDialog = jQuery(".info-dialog");
            jQuery(".context-widget #edit").click(function () {
                infoDialog.dialog({
                    width: 400,
                    modal: true
                });
                rapportiveLogger.track("My profile: edit", {
                    edit_type: "title"
                });
                rapportiveLogger.track("My profile: title: edit");
            });
        });
        jQuery.rapportiveContainer.hoverIntent({
            over: function () {
                jQuery(".context-widget").fadeIn(50);
                rapportive.jQuery("div.hj").fadeOut(250);
            },
            out: function () {
                jQuery(".context-widget").fadeOut(250);
                rapportive.jQuery("div.hj").fadeIn(250);
            },
            timeout: 250
        });
    }
};
rapportive.prototype.sidebar_callbacks["contacts/organisation/_organisation"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery("a.expand-truncated").click(function () {
        var link = jQuery(this).hide();
        link.siblings('.truncated').show();
        link.parent().siblings('.truncated').show();
        jQuery.event.trigger('scroll', null, window);
        rapportiveLogger.track("Organisational profile: expand-truncated");
        return false;
    });
    jQuery("img.favicon").error(function () {
        var image_url = jQuery(this).attr("href");
        var domain = image_url;
        if (image_url) {
            var matches = image_url.match(/(https?:\/\/[a-z0-9\-\.]+)\//i);
            if (matches) {
                domain = matches[1];
            }
        }
        rapportiveLogger.track("Favicon image error", {
            domain: domain
        });
        jQuery(this).remove();
    });
    jQuery(".sitelinks a").click(function () {
        rapportiveLogger.track("Site link clicked", {
            text: jQuery(this).text()
        });
    });
};
rapportive.prototype.sidebar_callbacks["contacts/organisation/_description"] = function (rapportive, jQuery, params, context, redraw) {
    if (params.contact.can_be_edited) {
        jQuery(function () {
            var infoDialog = jQuery(".info-dialog");
            jQuery(".context-widget #edit").click(function () {
                infoDialog.dialog({
                    width: 400,
                    modal: true
                });
                rapportiveLogger.track("My profile: edit", {
                    edit_type: "description"
                });
                rapportiveLogger.track("My profile: title: description");
            });
        });
        jQuery.rapportiveContainer.hoverIntent({
            over: function () {
                jQuery(".context-widget").fadeIn(50);
            },
            out: function () {
                jQuery(".context-widget").fadeOut(250);
            },
            timeout: 250
        });
    }
};
rapportive.prototype.sidebar_callbacks["contacts/_about_own_profile"] = function (rapportive, jQuery, params, context, redraw) {
    var infoDialog = jQuery('div.info-dialog');
    var profileIcon = jQuery('div.own-profile .icon').click(function () {
        infoDialog.dialog({
            width: 400,
            modal: true
        });
        return false;
    });
    if (rapportive.sidebar.show_profile_editing_info_on_next_sidebar_load) {
        rapportive.sidebar.show_profile_editing_info_on_next_sidebar_load = false;
        profileIcon.click();
    }
    jQuery('div.notification > a.dismiss').click(function () {
        var dismissed = jQuery(this).parent();
        dismissed.slideUp();
        rapportive.request({
            path: '/preferences/set/hide_edit_profile_instructions',
            data: {
                value: "bool:true"
            }
        });
        return false;
    });
};
rapportive.prototype.sidebar_callbacks["contacts/person/_occupation_new"] = function (rapportive, jQuery, params, context, redraw) {
    var add_button = jQuery("a.action");
    var form_wrapper = jQuery("div.form-wrapper");
    var form = jQuery(".form");
    var job_field = form.find("input[name='job_title']");
    var company_field = form.find("input[name='company']");
    var spinner = form.find(".occupation-spinner");
    var submit_in_progress = false;

    function cancel() {
        form_wrapper.hide();
        add_button.show();
        jQuery(".form")[0].reset();
    }

    function submit() {
        if (submit_in_progress) {
            return;
        }
        var new_job_title = job_field.val();
        var new_company = company_field.val();
        if ("Role" === new_job_title) {
            new_job_title = "";
        }
        if ("Organisation" === new_company) {
            new_company = "";
        }
        if (!(new_job_title || new_company)) {
            cancel();
            return;
        }
        spinner.show();
        jQuery.rapportiveContainer.closest('ul.occupations').addClass('read-only');
        form.find("input").attr("disabled", "true");
        submit_in_progress = true;
        rapportive.request({
            url: params.contact.urls.create_occupation,
            data: {
                job_title: new_job_title,
                company: new_company
            },
            success: function (data) {
                rapportiveLogger.track("My profile: edit", {
                    edit_type: "occupation"
                });
                rapportiveLogger.track("My profile: occupation: add", {
                    status: data.status
                });
                if (data && data.status === 200) {
                    redraw('contacts/person/_person', data);
                    rapportive.sidebar.invalidateCacheEntry();
                } else {
                    var error = (data && data.status === 422) ? data.html : "Sorry, something went wrong - please try again!";
                    form.find("#new-occupation-error").slideDown().html(error);
                    spinner.hide();
                    job_field.focus();
                    form.find("input").removeAttr("disabled");
                    submit_in_progress = false;
                }
            }
        });
    }
    jQuery(".form input").focus(function () {
        jQuery(this).addClass("focussed");
    }).blur(function () {
        jQuery(this).removeClass("focussed");
    }).focus(function () {
        jQuery(this).addClass("active");
    }).blur(function () {
        window.setTimeout(function () {
            var inputs = jQuery(".form input");
            if (!inputs.is(".focussed")) {
                if (inputs.is(".active")) {
                    inputs.removeClass("active");
                    submit();
                }
            }
        }, 50);
    }).keydown(function (e) {
        if (13 === e.keyCode) {
            jQuery(this).removeClass("active");
            submit();
            return false;
        }
        if (27 === e.keyCode) {
            jQuery(this).removeClass("active");
            cancel();
        }
    });
    add_button.click(function () {
        job_field.clearingInput({
            text: "Role"
        });
        company_field.clearingInput({
            text: "Organisation"
        });
        add_button.hide();
        form_wrapper.show();
        job_field.focus().select();
        return false;
    });
};
rapportive.prototype.sidebar_callbacks["contacts/person/_name"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery(".object .name, .context-widget #edit").click(function () {
        jQuery(".object").hide();
        jQuery(".form").show();
        jQuery(".form input#name-input").focus().select();
    });
    jQuery(".hover").hoverIntent({
        over: function () {
            jQuery(".context-widget").fadeIn(50);
            jQuery("div.hj").fadeOut(250);
        },
        out: function () {
            jQuery(".context-widget").fadeOut(250);
            jQuery("div.hj").fadeIn(250);
        },
        timeout: 250
    });
    var name_field = jQuery(".form input#name-input");
    var old_name = name_field.val();

    function cancel(input_element) {
        jQuery(".object").show();
        jQuery(".form").hide();
        name_field.val(old_name);
    }

    function submit(input_element) {
        var new_name = name_field.val();
        if (old_name === new_name || !new_name.replace(/\s/g, '')) {
            cancel();
            return;
        }
        jQuery('.name-spinner').show();
        jQuery('.context-widget').fadeOut(250);
        jQuery('.form input').attr("disabled", "true");
        rapportive.request({
            url: params.contact.urls.update_name,
            data: {
                new_value: new_name
            },
            success: function (data) {
                jQuery(".name-spinner").hide();
                jQuery(".form input").removeAttr("disabled", "true");
                rapportiveLogger.track("My profile: edit", {
                    edit_type: "name"
                });
                rapportiveLogger.track("My profile: name: edit", {
                    status: data.status
                });
                if (data && data.status === 200) {
                    old_name = new_name;
                    cancel();
                    if (new_name) {
                        jQuery(".object").html('<div class="name">' + jQuery.escapeHTML(new_name) + '</div>');
                    } else {
                        jQuery(".object").html('<div class="name action">Add your name...</div>');
                    }
                    rapportive.sidebar.invalidateCacheEntry();
                } else {
                    jQuery(".form #name-error").slideDown().html("Sorry, something went wrong - please try again!");
                    name_field.focus();
                }
            }
        });
    }
    jQuery(".form input#name-input").focus(function () {
        jQuery(this).addClass("active");
    }).blur(function () {
        if (jQuery(this).is(".active")) {
            jQuery(this).removeClass("active");
            submit();
        }
    }).keydown(function (e) {
        if (13 === e.keyCode) {
            jQuery(this).removeClass("active");
            submit();
            return false;
        }
        if (27 === e.keyCode) {
            jQuery(this).removeClass("active");
            cancel();
        }
    });
};
rapportive.prototype.sidebar_callbacks["contacts/person/_basics"] = function (rapportive, jQuery, params, context, redraw) {
    if (params.contact.can_be_edited) {
        jQuery("div.profile-image").hoverIntent({
            over: function () {
                jQuery("div.profile-image .context-widget").fadeIn(50);
            },
            out: function () {
                jQuery("div.profile-image .context-widget").fadeOut(250);
            },
            timeout: 250
        });
        var infoDialog = jQuery("div.profile-image div.info-dialog");
        jQuery("div.profile-image .context-widget #edit").click(function () {
            infoDialog.dialog({
                modal: true
            });
            rapportiveLogger.track("My profile: edit", {
                edit_type: "image"
            });
            rapportiveLogger.track("My profile: image: edit");
        });
        jQuery("div.location").hoverIntent({
            over: function () {
                jQuery("div.location .context-widget").fadeIn(50);
            },
            out: function () {
                jQuery("div.location .context-widget").fadeOut(250);
            },
            timeout: 250
        });
        var GoogleMapsApiLoader = function (onFinished) {
            if (rapportive.maps_ready && onFinished) {
                fsLog("Maps API already initialized, just running code on it");
                onFinished();
                return;
            }
            fsLog("Using GoogleMapsApiLoader to init maps API");
            jQuery.ajax({
                url: 'http://maps.google.com/maps/api/js?sensor=false',
                dataType: 'jsonp',
                success: function (response) {
                    fsLog("Google Maps API initialized");
                    rapportive.maps_ready = true;
                    if (onFinished) {
                        onFinished();
                    }
                }
            });
        };
        var GoogleMapsApi = function (mapCanvas, onLoaded) {
            var that = {};
            var defaultOptions;
            var map;
            var markers = [];
            that.isReady = function () {
                return (rapportive.maps_ready === true);
            };
            that.resized = function () {
                if (map) {
                    google.maps.event.trigger(map, 'resize');
                }
            };
            that.refresh = function () {
                if (markers.length === 0) {
                    that.showWorldMap();
                } else {
                    map.setCenter(map.getCenter());
                }
                that.resized();
            };
            that.showPosition = function (latitude, longitude) {
                fsLog("Going to update map with position: " + latitude + ", " + longitude);
                map.setZoom(7);
                map.setCenter(new google.maps.LatLng(latitude, longitude));
                that.setMarker("You are here!", latitude, longitude);
            };
            that.showPlace = function (placeName) {
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'address': placeName
                }, function (data, status) {
                    if (!data || data.length === 0) {
                        fsLog("No data returned from geocoder for place name: " + placeName);
                        return;
                    }
                    var existingLocation = data[0].geometry.location;
                    fsLog("Got existing location as: " + existingLocation);
                    that.showPosition(existingLocation.lat(), existingLocation.lng());
                });
            };

            function worldMapCenter() {
                return new google.maps.LatLng(32, 19);
            }
            that.showWorldMap = function () {
                map.setZoom(1);
                map.setCenter(worldMapCenter());
            };
            that.setMarker = function (title, latitude, longitude) {
                jQuery(markers).each(function () {
                    this.setMap(null);
                });
                markers = [];
                that.addMarker(title, latitude, longitude);
            };
            that.addMarker = function (title, latitude, longitude) {
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(latitude, longitude),
                    map: map,
                    title: title
                });
                markers.push(marker);
            };
            var parseAddressComponents = function (googleAddressComponentList) {
                var output = {};
                jQuery(googleAddressComponentList).each(function () {
                    if (!this.types || this.types.length === 0) {
                        return true;
                    }
                    output[this.types[0] + "_long"] = this.long_name;
                    output[this.types[0] + "_short"] = this.short_name;
                });
                return output;
            };
            that.getPlaceNameFromCoords = function (latitude, longitude, callback) {
                fsLog("Looking up place name of " + latitude + ", " + longitude + " using geocode API...");
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'latLng': new google.maps.LatLng(latitude, longitude)
                }, function (data, status) {
                    if (!data || data.length === 0) {
                        fsLog("Geocode API could not find anything, bailing.");
                        return;
                    }
                    fsLog("Geocoder returned: " + data.length + " item(s), first address is: " + data[0].formatted_address);
                    var addressData = data[0].address_components;
                    if (!addressData || addressData.length === 0) {
                        fsLog("No address components in the geocoded data, using raw formatted address");
                        callback(data[0].formatted_address);
                        return;
                    }
                    var addressBits = parseAddressComponents(addressData);
                    var output = [];
                    if (addressBits.locality_long) {
                        output.push(addressBits.locality_long);
                    } else {
                        if (addressBits.administrative_area_level_3_long) {
                            output.push(addressBits.administrative_area_level_3_long);
                        } else {
                            output.push(addressBits.administrative_area_level_2_long);
                        }
                    }
                    if (addressBits.country_short === 'US') {
                        if (addressBits.administrative_area_level_1_long) {
                            output.push(addressBits.administrative_area_level_1_long);
                        }
                    }
                    if (addressBits.country_long) {
                        output.push(addressBits.country_long);
                    }
                    fsLog("Extracted location from geodata as: " + output.join(', '));
                    callback(output.join(', '));
                });
            };
            var loader = GoogleMapsApiLoader(function () {
                defaultOptions = {
                    zoom: 1,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    mapTypeControl: false,
                    streetViewControl: false,
                    navigationControl: true,
                    center: worldMapCenter(),
                    navigationControlOptions: {
                        style: google.maps.NavigationControlStyle.SMALL
                    }
                };
                map = new google.maps.Map(mapCanvas, defaultOptions);
                if (onLoaded) {
                    onLoaded(that);
                }
            });
            return that;
        };
        var LocationDialog = function (locationEditorDialog, initialLocation) {
            var spinner = locationEditorDialog.find('.location-spinner');
            var locationText = locationEditorDialog.find('input#location');
            var errorContainer = locationEditorDialog.find('.location-error');
            var mapCanvas = locationEditorDialog.find('.map_canvas')[0];
            var mapWrapper;
            var isSaving = false;
            var that = {};
            that.open = function () {
                jQuery(locationEditorDialog).dialog("open");
            };
            that.close = function () {
                jQuery(locationEditorDialog).dialog("close");
            };
            that.saveLocation = function () {
                if (isSaving) {
                    return;
                }
                isSaving = true;
                spinner.show();
                var new_location = locationEditorDialog.find("input#location").val();
                fsLog("Will attempt to save now, new location is [" + new_location + "]...");
                rapportive.request({
                    url: params.contact.urls.update_location,
                    data: {
                        new_value: new_location
                    },
                    success: function (data) {
                        fsLog("Saved new location!");
                        rapportive.sidebar.refreshSidebar();
                        rapportiveLogger.track("Location edit: save");
                        that.close();
                        isSaving = false;
                    },
                    error: function (xhr, status, error) {
                        isSaving = false;
                    }
                });
                return false;
            };

            function useBrowserGeolocation(whenDone) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    mapWrapper.showPosition(position.coords.latitude, position.coords.longitude);
                    fsLog("Fetching textual description based on user's location...");
                    mapWrapper.getPlaceNameFromCoords(position.coords.latitude, position.coords.longitude, function (address) {
                        locationText.val(address);
                        whenDone();
                    });
                    rapportiveLogger.track("Location edit: find me", {
                        result: "success"
                    });
                }, function (positionError) {
                    fsLog("Could not get location (position error code " + positionError.code + "), message was: " + positionError.message, "location", "error");
                    errorContainer.show();
                    whenDone();
                    rapportiveLogger.track("Location edit: find me", {
                        code: positionError.code,
                        message: positionError.message
                    });
                }, {
                    maximumAge: 43200000,
                    timeout: 10000
                });
            }
            jQuery(locationEditorDialog).dialog({
                autoOpen: false,
                modal: true,
                delay: 0,
                width: 440,
                height: 420,
                closeOnEscape: false,
                buttons: {
                    "Save": that.saveLocation,
                    "Cancel": that.close
                },
                open: function (event, ui) {
                    mapWrapper.resized();
                    setTimeout(function () {
                        mapWrapper.refresh();
                    }, 200);
                },
                close: function (event, ui) {
                    locationText.autocomplete("close");
                }
            });

            function defaultKeyboardBehaviour(e) {
                if (jQuery.ui.keyCode.ENTER === e.keyCode) {
                    that.saveLocation();
                    return false;
                }
                if (jQuery.ui.keyCode.ESCAPE === e.keyCode) {
                    that.close();
                    return false;
                }
            }

            function autocompleterKeyboardBehaviour(e) {
                if (jQuery.ui.keyCode.ENTER === e.keyCode) {
                    mapWrapper.showPlace(locationText.val());
                    locationText.autocomplete("close");
                }
            }
            locationText.bind('keydown', defaultKeyboardBehaviour);
            locationText.autocomplete({
                select: function (event, ui) {
                    mapWrapper.showPlace(ui.item.label);
                },
                source: function (completionRequest, response) {
                    jQuery.ajax({
                        url: 'https://maps-api-ssl.google.com/maps/suggest?cp=5&ll=37.0625,-95.677068&spn=33.984987,75.234375&hl=en&num=7',
                        data: {
                            q: locationText.val()
                        },
                        dataType: 'jsonp',
                        success: function (locations) {
                            var completions = jQuery.map(locations.suggestion, function (item) {
                                return item.query;
                            });
                            response(completions);
                        },
                        failure: function () {
                            response([]);
                        }
                    });
                },
                open: function () {
                    locationText.unbind('keydown', defaultKeyboardBehaviour);
                    locationText.bind('keydown', autocompleterKeyboardBehaviour);
                },
                close: function () {
                    locationText.bind('keydown', defaultKeyboardBehaviour);
                    locationText.unbind('keydown', autocompleterKeyboardBehaviour);
                }
            });
            mapWrapper = GoogleMapsApi(mapCanvas, function (mapWrapper) {
                locationEditorDialog.bind("dialogresize", function (event, ui) {
                    mapWrapper.resized();
                });
                var locationToShow = initialLocation;
                if (locationToShow) {
                    fsLog("Going to default the map to existing location: " + locationToShow);
                    mapWrapper.showPlace(locationToShow);
                } else {
                    fsLog("Going to default the map to try and show complete world view.");
                    mapWrapper.showWorldMap();
                }
            });
            if (navigator.geolocation) {
                locationEditorDialog.find('.geolocation').show();
                locationEditorDialog.find('.locate-me').googleButton().click(function () {
                    var button = jQuery(this);
                    button.disableGoogleButton();
                    locationText.attr('disabled', 'true');
                    errorContainer.hide();
                    spinner.show();
                    useBrowserGeolocation(function () {
                        spinner.hide();
                        locationText.removeAttr('disabled');
                        button.enableGoogleButton();
                        locationText.focus();
                    });
                });
            } else {
                fsLog('geolocation not supported');
            }
            return that;
        };
        var locationPopup = null;
        var openLocationEditor = function () {
            if (locationPopup === null) {
                var locationEditorDialog = jQuery("div.location div.location-dialog");
                locationPopup = LocationDialog(locationEditorDialog, params.contact.location);
            }
            locationPopup.open();
            rapportiveLogger.track("My profile: edit", {
                edit_type: "location"
            });
            rapportiveLogger.track("My profile: location: edit");
            return false;
        };
        jQuery("div.location .context-widget #edit").click(openLocationEditor);
        jQuery("#add-location").click(openLocationEditor);
    }
    if (navigator.userAgent.match(/Firefox\/3/)) {
        jQuery.fn.corner.defaults.useNative = false;
        jQuery("div.profile-image").corner("10px");
    }
    jQuery("div.profile-image img").error(function (event) {
        jQuery(this).unbind(event);
        var image_url = jQuery(this).attr("image_url");
        if (image_url) {
            var matches = image_url.match(/(https?:\/\/[a-z0-9\-\.]+)\//i);
            if (matches) {
                var domain = matches[1];
                rapportiveLogger.track("Profile image error", {
                    domain: domain
                });
            }
        }
        jQuery(this).attr("src", params.rapportive_base_url + '/images/missing-profile-image.png');
    });
};
rapportive.prototype.sidebar_callbacks["contacts/person/_occupation"] = function (rapportive, jQuery, params, context, redraw) {
    var container = jQuery.rapportiveContainer;
    jQuery(".context-widget .remove.action").click(function () {
        if (confirm("Are you sure you want to remove this occupation from your profile?")) {
            jQuery('.occupation-spinner').show();
            jQuery('.context-widget').fadeOut(250);
            jQuery('div.occupation').css('text-decoration', 'line-through');
            container.closest('ul.occupations').addClass('read-only');
            rapportive.request({
                url: context.delete_url,
                success: function (data) {
                    rapportiveLogger.track("My profile: edit", {
                        edit_type: "occupation"
                    });
                    rapportiveLogger.track("My profile: occupation: remove", {
                        status: data.status
                    });
                    if (data && data.status === 200) {
                        container.closest("ul.occupations li").slideUp(250, function () {
                            redraw('contacts/person/_person', data);
                        });
                        rapportive.sidebar.invalidateCacheEntry();
                    } else {
                        fsLog("Failed to delete occupation: status " + data.status);
                    }
                }
            });
        } else {
            jQuery(".object").show();
            jQuery(".form").hide();
            jQuery(".form")[0].reset();
        }
    });
    jQuery(".context-widget #edit").click(function () {
        jQuery(".object").hide();
        jQuery(".form").show();
        jQuery(".form input#job_title").focus().select();
    });
    jQuery(".hover").hoverIntent({
        over: function () {
            if (!container.closest("ul.occupations").hasClass("read-only")) {
                jQuery(".context-widget").fadeIn(50);
            }
        },
        out: function () {
            jQuery(".context-widget").fadeOut(250);
        },
        timeout: 250
    });
    jQuery(".form input#job_title").clearingInput({
        text: "Role"
    });
    jQuery(".form input#company").clearingInput({
        text: "Organisation"
    });

    function submit() {
        var form = jQuery(".form");
        var job_field = form.find("input#job_title");
        var company_field = form.find("input#company");
        var new_job_title = job_field.val();
        var new_company = company_field.val();
        if ("Role" === new_job_title) {
            new_job_title = "";
        }
        if ("Organisation" === new_company) {
            new_company = "";
        }
        if (!(new_job_title || new_company)) {
            jQuery(".context-widget .remove.action").click();
            return;
        }
        var old_job_title = jQuery(".object .occupation .job-title").html();
        var old_company = jQuery(".object .occupation .company").html();
        if (old_job_title === new_job_title && old_company === new_company) {
            jQuery(".object").show();
            form.hide();
            return;
        }
        jQuery('.occupation-spinner').show();
        jQuery('.context-widget').fadeOut(250);
        container.closest('ul.occupations').addClass('read-only');
        jQuery(".form input").attr("disabled", "true");
        rapportive.request({
            url: context.edit_url,
            data: {
                job_title: new_job_title,
                company: new_company
            },
            success: function (data) {
                rapportiveLogger.track("My profile: edit", {
                    edit_type: "occupation"
                });
                rapportiveLogger.track("My profile: occupation: edit", {
                    status: data.status
                });
                form.find("input").removeAttr("disabled");
                if (data && data.status === 200) {
                    redraw('contacts/person/_person', data);
                    rapportive.sidebar.invalidateCacheEntry();
                } else {
                    var error = (data && data.status === 422) ? data.html : "Sorry, something went wrong - please try again!";
                    form.find("#occupation-error").slideDown().html(error);
                    jQuery('.occupation-spinner').hide();
                    job_field.focus();
                }
            }
        });
    }

    function cancel() {
        jQuery(".object").show();
        jQuery(".form").hide();
        jQuery(".form")[0].reset();
    }
    jQuery(".form input").focus(function () {
        jQuery(this).addClass("focussed");
    }).blur(function () {
        jQuery(this).removeClass("focussed");
    }).focus(function () {
        jQuery(this).addClass("active");
    }).blur(function () {
        window.setTimeout(function () {
            var inputs = jQuery(".form input");
            if (!inputs.is(".focussed")) {
                if (inputs.is(".active")) {
                    inputs.removeClass("active");
                    submit();
                }
            }
        }, 50);
    }).keydown(function (e) {
        if (13 === e.keyCode) {
            jQuery(this).removeClass("active");
            submit();
            return false;
        }
        if (27 === e.keyCode) {
            jQuery(this).removeClass("active");
            cancel();
        }
    });
};
rapportive.prototype.sidebar_callbacks["contacts/person/_person"] = function (rapportive, jQuery, params, context, redraw) {};
rapportive.prototype.sidebar_callbacks["contacts/_membership"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery("a.membership-link").click(function () {
        var site_name = jQuery(this).attr("site_name") || "unknown";
        rapportiveLogger.track("Membership link clicked", {
            site_name: site_name
        });
    });
    if (params.contact.can_be_edited) {
        var container = jQuery.rapportiveContainer;
        container.hoverIntent({
            over: function () {
                jQuery(".context-widget").fadeIn(50);
            },
            out: function () {
                jQuery(".context-widget").fadeOut(250);
            },
            timeout: 250
        });
        container.find(".context-widget .remove.action").click(function () {
            if (!confirm("Are you sure you want to remove the " + context.display_name + " link from your profile?")) {
                return false;
            }
            container.find(".membership-spinner").show();
            container.find('.context-widget').fadeOut(250);
            container.find('a.membership-link').css('text-decoration', 'line-through');
            rapportive.request({
                url: context.delete_url,
                success: function (data) {
                    rapportiveLogger.track("My profile: edit", {
                        edit_type: "social network"
                    });
                    rapportiveLogger.track("My profile: social network: remove", {
                        status: data.status,
                        site_name: jQuery("a.membership-link").attr("site_name") || "unknown"
                    });
                    if (data && data.status === 200) {
                        if (container.closest('ul.memberships').find('li.membership').length === 1) {
                            container.closest('ul.memberships').prev('div.no-memberships').slideDown(250);
                        }
                        container.slideUp(250, function () {
                            jQuery(this).remove();
                        });
                        rapportive.sidebar.invalidateCacheEntry();
                    } else {
                        fsLog("Failed to delete membership: status " + data.status);
                    }
                }
            });
            return false;
        });
    }
};
rapportive.prototype.sidebar_callbacks["sessions/_login_button"] = function (rapportive, jQuery, params, context, redraw) {
    jQuery.rapportiveContainer.googleButton().click(function () {
        rapportive.showLoginPopup();
        return false;
    });
};
(function () {
    var models = rapportive.prototype.models,
        components = rapportive.prototype.components,
        lib = rapportive.prototype.lib,
        helpers = rapportive.prototype.template_helpers,
        $ = jQueryForRapportive;
    var Handlebars = {
        compilerCache: {},
        compile: function (string) {
            if (Handlebars.compilerCache[string] == null) {
                var fnBody = Handlebars.compileFunctionBody(string);
                var fn = new Function("context", "fallback", "stack", "Handlebars", fnBody);
                Handlebars.compilerCache[string] = function (context, fallback, stack) {
                    return fn(context, fallback, stack, Handlebars);
                };
            }
            return Handlebars.compilerCache[string];
        },
        compileToString: function (string) {
            var fnBody = Handlebars.compileFunctionBody(string);
            return "function(context, fallback, stack) { " + fnBody + "}";
        },
        compileFunctionBody: function (string) {
            var compiler = new Handlebars.Compiler(string);
            compiler.compile();
            return "var stack = stack || [];" + compiler.fn;
        },
        isFunction: function (fn) {
            return Object.prototype.toString.call(fn) == "[object Function]";
        },
        trim: function (str) {
            return str.replace(/^\s+|\s+$/g, '');
        },
        escapeText: function (string) {
            string = string.replace(/'/g, "\\'");
            string = string.replace(/\"/g, "\\\"");
            return string;
        },
        escapeExpression: function (string) {
            if (string instanceof Handlebars.SafeString) {
                return string.toString();
            } else if (string === null) {
                string = "";
            }
            return string.toString().replace(/&(?!\w+;)|["\\<>]/g, function (str) {
                switch (str) {
                case "&":
                    return "&amp;";
                    break;
                case '"':
                    return "&quot;";
                case "\\":
                    return "\\\\";
                    break;
                case "<":
                    return "&lt;";
                    break;
                case ">":
                    return "&gt;";
                    break;
                default:
                    return str;
                }
            });
        },
        compilePartial: function (partial) {
            if (Handlebars.isFunction(partial)) {
                compiled = partial;
            } else {
                compiled = Handlebars.compile(partial);
            }
            return compiled;
        },
        buildContext: function (context, stack) {
            var ContextWrapper = function (stack) {
                this.__context__ = context;
                this.__stack__ = stack.slice(0);
                this.__get__ = function (path) {
                    return this.__context__.evalExpression(path, this.__stack__).data;
                };
            };
            ContextWrapper.prototype = context.data;
            return new ContextWrapper(stack);
        },
        pathPatterns: {},
        parsePath: function (path) {
            if (path == null) {
                return [0, []];
            } else if (Handlebars.pathPatterns["hbs-" + path] != null) {
                return Handlebars.pathPatterns["hbs-" + path];
            }
            var parts = path.split("/");
            var readDepth = false;
            var depth = 0;
            var dig = [];
            for (var i = 0, j = parts.length; i < j; i++) {
                switch (parts[i]) {
                case "..":
                    if (readDepth) {
                        throw new Handlebars.Exception("Cannot jump out of context after moving into a context.");
                    } else {
                        depth += 1;
                    }
                    break;
                case ".":
                case "this":
                    break;
                default:
                    readDepth = true;
                    dig.push(parts[i]);
                }
            }
            var ret = [depth, dig];
            Handlebars.pathPatterns["hbs" + path] = ret;
            return ret;
        },
        isEmpty: function (value) {
            if (typeof value === "undefined") {
                return true;
            } else if (value === null) {
                return true;
            } else if (value === false) {
                return true;
            } else if (Object.prototype.toString.call(value) === "[object Array]" && value.length == 0) {
                return true;
            } else {
                return false;
            }
        },
        filterOutput: function (value, escape) {
            if (Handlebars.isEmpty(value)) {
                return "";
            } else if (escape) {
                return Handlebars.escapeExpression(value);
            } else {
                return value;
            }
        },
        handleBlock: function (lookup, context, arg, fn, notFn) {
            var out = "",
                args;
            var originalArgs = arg.length ? arg : [null]
            if (Handlebars.isFunction(lookup.data)) {
                args = originalArgs.concat(fn);
                out = out + lookup.data.apply(context, args);
                if (notFn != null && Handlebars.isFunction(lookup.data.not)) {
                    args = originalArgs.concat(notFn);
                    out = out + lookup.data.not.apply(context, args);
                }
            } else {
                if (!Handlebars.isEmpty(lookup.data)) {
                    out = out + Handlebars.helperMissing.call(arg[0], lookup, fn);
                }
                if (notFn != null) {
                    out = out + Handlebars.helperMissing.not.call(arg[0], lookup, notFn);
                }
            }
            return out;
        },
        handleExpression: function (lookup, context, args, isEscaped) {
            var out = "";
            if (Handlebars.isFunction(lookup.data)) {
                out = out + Handlebars.filterOutput(lookup.data.apply(context, args), isEscaped);
            } else if (!Handlebars.isEmpty(lookup.data)) {
                out = out + Handlebars.filterOutput(lookup.data, isEscaped);
            }
            return out;
        },
        handleInvertedSection: function (lookup, context, fn) {
            var out = "";
            if (Handlebars.isFunction(lookup.data) && Handlebars.isEmpty(lookup.data())) {
                out = out + fn(context);
            } else if (Handlebars.isEmpty(lookup.data)) {
                out = out + fn(context);
            }
            return out;
        },
        handleArgument: function (lookup, context) {
            if (Handlebars.isFunction(lookup.data)) {
                return lookup.data.call(context, context);
            } else {
                return lookup.data;
            }
        }
    }
    Handlebars.Context = function (context, fallback, path) {
        if (context instanceof Handlebars.Context) {
            this.data = context.data;
            this.fallback = context.fallback;
            this.path = context.path;
        } else {
            this.data = context;
            this.fallback = fallback || {};
            this.path = path || "";
        }
    };
    Handlebars.Context.prototype = {
        evalExpression: function (path, stack) {
            var newContext = new Handlebars.Context(this);
            var parsedPath = Handlebars.parsePath(path);
            var depth = parsedPath[0];
            var parts = parsedPath[1];
            if (depth > stack.length) {
                newContext.data = null;
            } else if (depth > 0) {
                newContext = new Handlebars.Context(stack[stack.length - depth]);
            }
            for (var i = 0, j = parts.length; i < j && typeof newContext.data !== "undefined" && newContext.data !== null; i++) {
                newContext.data = newContext.data[parts[i]];
            }
            if (parts.length == 1 && typeof newContext.data === "undefined") {
                newContext.data = newContext.fallback[parts[0]];
            }
            return newContext;
        }
    };
    Handlebars.Compiler = function (string) {
        this.string = string;
        this.pointer = -1;
        this.mustache = false;
        this.text = "";
        this.fn = "context = new Handlebars.Context(context, fallback); var out = ''; var lookup, arg; ";
        this.newlines = "";
        this.comment = false;
        this.escaped = true;
        this.partial = false;
        this.inverted = false;
        this.endCondition = null;
        this.continueInverted = false;
    };
    Handlebars.Exception = function (message) {
        this.message = message;
    };
    Handlebars.SafeString = function (string) {
        this.string = string;
    }
    Handlebars.SafeString.prototype.toString = function () {
        return this.string.toString();
    }
    Handlebars.helperMissing = function (object, fn) {
        var ret = "";
        if (object.data === true) {
            return fn(this);
        } else if (object.data === false) {
            return "";
        } else if (Object.prototype.toString.call(object.data) === "[object Array]") {
            for (var i = 0, j = object.data.length; i < j; i++) {
                ret = ret + fn(object.data[i]);
            }
            return ret;
        } else {
            return fn(object.data);
        }
    };
    Handlebars.helperMissing.not = function (context, fn) {
        return fn(context);
    }
    Handlebars.Compiler.prototype = {
        getChar: function (n) {
            var ret = this.peek(n);
            this.pointer = this.pointer + (n || 1);
            return ret;
        },
        peek: function (n) {
            n = n || 1;
            var start = this.pointer + 1;
            return this.string.slice(start, start + n);
        },
        compile: function (endCondition) {
            if (!endCondition || !endCondition(this)) {
                var chr;
                while (chr = this.getChar()) {
                    if (chr === "{" && this.peek() === "{" && !this.mustache) {
                        this.getChar();
                        this.parseMustache();
                    } else {
                        if (chr === "\n") {
                            this.newlines = this.newlines + "\n";
                            chr = "\\n";
                        } else if (chr === "\r") {
                            this.newlines = this.newlines + "\r";
                            chr = "\\r";
                        } else if (chr === "\\") {
                            chr = "\\\\";
                        }
                        this.text = this.text + chr;
                    }
                    if (endCondition && this.peek(5) == "{{^}}") {
                        this.continueInverted = true;
                        this.getChar(5);
                        break;
                    } else if (endCondition && endCondition(this)) {
                        break
                    };
                }
            }
            this.addText();
            this.fn += "return out;";
            return;
        },
        addText: function () {
            if (this.text) {
                this.fn = this.fn + "out = out + \"" + Handlebars.escapeText(this.text) + "\"; ";
                this.fn = this.fn + this.newlines;
                this.newlines = "";
                this.text = "";
            }
        },
        addExpression: function (mustache, params) {
            if (!params[0]) params = ["null"]
            params = params.join(", ")
            var expr = this.lookupFor(mustache);
            this.fn += "var wrappedContext = Handlebars.buildContext(context, stack);"
            this.fn += "out = out + Handlebars.handleExpression(" + expr + ", wrappedContext, [" + params + "], " + this.escaped + ");";
        },
        addInvertedSection: function (mustache) {
            var compiler = this.compileToEndOfBlock(mustache);
            var result = compiler.fn;
            var fnId = "fn" + this.pointer.toString();
            this.fn += "var " + fnId + " = function(context) {" + result + "}; ";
            this.fn += "lookup = " + this.lookupFor(mustache) + "; ";
            this.fn += "out = out + Handlebars.handleInvertedSection(lookup, context, " + fnId + ");"
            this.openBlock = false;
            this.inverted = false;
        },
        lookupFor: function (param) {
            if (typeof param === "undefined") {
                return "context";
            } else {
                return "(context.evalExpression('" + param + "', stack))";
            }
        },
        compileToEndOfBlock: function (mustache) {
            var compiler = new Handlebars.Compiler(this.string.slice(this.pointer + 1));
            compiler.compile(function (compiler) {
                if (compiler.peek(3) === "{{/") {
                    if (compiler.peek(mustache.length + 5) === "{{/" + mustache + "}}") {
                        compiler.getChar(mustache.length + 5);
                        return true;
                    } else {
                        throw new Handlebars.Exception("Mismatched block close: expected " + mustache + ".");
                    }
                }
            });
            this.pointer += compiler.pointer + 1;
            return compiler;
        },
        addBlock: function (mustache, params) {
            var compiler = this.compileToEndOfBlock(mustache);
            var result = compiler.fn;
            var fnId = "fn" + this.pointer.toString();
            this.fn += "var wrappedContext = Handlebars.buildContext(context, stack);";
            this.fn += "var " + fnId + " = function(context) {" + result + "}; ";
            this.fn += "lookup = " + this.lookupFor(mustache) + "; ";
            this.fn += "arg = [" + params.join(", ") + "] ;";
            this.fn += "stack.push(context);";
            if (compiler.continueInverted) {
                var invertedCompiler = this.compileToEndOfBlock(mustache);
                this.fn += "  var " + fnId + "Not = function(context) { " + invertedCompiler.fn + " };";
            } else {
                this.fn += " var " + fnId + "Not = null;";
            }
            this.fn += "out = out + Handlebars.handleBlock(lookup, wrappedContext, arg, " + fnId + ", " + fnId + "Not);"
            this.fn += "stack.pop();";
            this.openBlock = false;
        },
        addPartial: function (mustache, param) {
            this.fn += "if (typeof context.fallback['partials'] === 'undefined' || typeof context.fallback['partials']['" + mustache + "'] === 'undefined') throw new Handlebars.Exception('Attempted to render undefined partial: " + mustache + "');";
            this.fn += "out = out + Handlebars.compilePartial(context.fallback['partials']['" + mustache + "'])(" + param + ", null, stack);";
        },
        parseMustache: function () {
            var chr, part, mustache, param;
            var next = this.peek();
            if (next === "!") {
                this.comment = true;
                this.getChar();
            } else if (next === "#") {
                this.openBlock = true;
                this.getChar();
            } else if (next === ">") {
                this.partial = true;
                this.getChar();
            } else if (next === "^") {
                this.inverted = true;
                this.openBlock = true;
                this.getChar();
            } else if (next === "{" || next === "&") {
                this.escaped = false;
                this.getChar();
            }
            this.addText();
            var params = [""],
                currentParam = 0,
                literals = [];
            while (chr = this.getChar()) {
                if (this.stringLiteral) {
                    params[currentParam] += chr;
                    if (chr === "\\" && this.peek() === '"') {
                        params[currentParam] += '"';
                        this.getChar();
                    } else if (chr === '"') {
                        this.stringLiteral = false;
                    }
                } else if (chr === '"') {
                    if (params[currentParam] !== "") {
                        throw new Handlebars.Exception("You are already in the middle of" + "the " + params[currentParam] + " param. " + "You cannot start a String param")
                    }
                    this.stringLiteral = true;
                    params[currentParam] = chr;
                    literals[currentParam] = true;
                } else if (chr === " ") {
                    if (params[currentParam] !== "") params[++currentParam] = ""
                } else if (chr === "}" && this.peek() === "}") {
                    mustache = params[0];
                    arguments = [];
                    if (!params[1]) params[1] = undefined;
                    for (var i = 1, l = params.length; i < l; i++) {
                        var argument = params[i];
                        arguments.push(literals[i] ? argument : "Handlebars.handleArgument(" + this.lookupFor(argument) + ", wrappedContext)");
                    }
                    this.mustache = false;
                    this.getChar();
                    if (!this.escaped && this.peek() === "}") {
                        this.getChar();
                    }
                    if (this.comment) {
                        this.comment = false;
                        return;
                    } else if (this.partial) {
                        this.addPartial(mustache, "(" + this.lookupFor(argument) + ")");
                        this.partial = false;
                        return;
                    } else if (this.inverted) {
                        this.addInvertedSection(mustache);
                        this.inverted = false;
                        return;
                    } else if (this.openBlock) {
                        this.addBlock(mustache, arguments)
                        return;
                    } else {
                        return this.addExpression(mustache, arguments);
                    }
                    this.escaped = true;
                } else if (this.comment) {;
                } else {
                    params[currentParam] += chr;
                }
            }
        }
    };
    var exports = exports || {};
    exports['compile'] = Handlebars.compile;
    exports['compileToString'] = Handlebars.compileToString;
    (function () {
        var root = this;
        var previousUnderscore = root._;
        var breaker = typeof StopIteration !== 'undefined' ? StopIteration : '__break__';
        var escapeRegExp = function (s) {
            return s.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
        };
        var ArrayProto = Array.prototype,
            ObjProto = Object.prototype;
        var slice = ArrayProto.slice,
            unshift = ArrayProto.unshift,
            toString = ObjProto.toString,
            hasOwnProperty = ObjProto.hasOwnProperty,
            propertyIsEnumerable = ObjProto.propertyIsEnumerable;
        var
        nativeForEach = ArrayProto.forEach,
            nativeMap = ArrayProto.map,
            nativeReduce = ArrayProto.reduce,
            nativeReduceRight = ArrayProto.reduceRight,
            nativeFilter = ArrayProto.filter,
            nativeEvery = ArrayProto.every,
            nativeSome = ArrayProto.some,
            nativeIndexOf = ArrayProto.indexOf,
            nativeLastIndexOf = ArrayProto.lastIndexOf,
            nativeIsArray = Array.isArray,
            nativeKeys = Object.keys;
        var _ = function (obj) {
            return new wrapper(obj);
        };
        if (typeof exports !== 'undefined') exports._ = _;
        root._ = _;
        _.VERSION = '1.1.0';
        var each = _.forEach = function (obj, iterator, context) {
            try {
                if (nativeForEach && obj.forEach === nativeForEach) {
                    obj.forEach(iterator, context);
                } else if (_.isNumber(obj.length)) {
                    for (var i = 0, l = obj.length; i < l; i++) iterator.call(context, obj[i], i, obj);
                } else {
                    for (var key in obj) {
                        if (hasOwnProperty.call(obj, key)) iterator.call(context, obj[key], key, obj);
                    }
                }
            } catch (e) {
                if (e != breaker) {
                    console.log(e, e.stack);
                    throw e;
                }
            }
            return obj;
        };
        _.map = function (obj, iterator, context) {
            if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
            var results = [];
            each(obj, function (value, index, list) {
                results.push(iterator.call(context, value, index, list));
            });
            return results;
        };
        _.reduce = function (obj, iterator, memo, context) {
            if (nativeReduce && obj.reduce === nativeReduce) {
                if (context) iterator = _.bind(iterator, context);
                return obj.reduce(iterator, memo);
            }
            each(obj, function (value, index, list) {
                memo = iterator.call(context, memo, value, index, list);
            });
            return memo;
        };
        _.reduceRight = function (obj, iterator, memo, context) {
            if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
                if (context) iterator = _.bind(iterator, context);
                return obj.reduceRight(iterator, memo);
            }
            var reversed = _.clone(_.toArray(obj)).reverse();
            return _.reduce(reversed, iterator, memo, context);
        };
        _.detect = function (obj, iterator, context) {
            var result;
            each(obj, function (value, index, list) {
                if (iterator.call(context, value, index, list)) {
                    result = value;
                    _.breakLoop();
                }
            });
            return result;
        };
        _.filter = function (obj, iterator, context) {
            if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
            var results = [];
            each(obj, function (value, index, list) {
                iterator.call(context, value, index, list) && results.push(value);
            });
            return results;
        };
        _.reject = function (obj, iterator, context) {
            var results = [];
            each(obj, function (value, index, list) {
                !iterator.call(context, value, index, list) && results.push(value);
            });
            return results;
        };
        _.every = function (obj, iterator, context) {
            iterator = iterator || _.identity;
            if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
            var result = true;
            each(obj, function (value, index, list) {
                if (!(result = result && iterator.call(context, value, index, list))) _.breakLoop();
            });
            return result;
        };
        _.some = function (obj, iterator, context) {
            iterator = iterator || _.identity;
            if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
            var result = false;
            each(obj, function (value, index, list) {
                if (result = iterator.call(context, value, index, list)) _.breakLoop();
            });
            return result;
        };
        _.include = function (obj, target) {
            if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
            var found = false;
            each(obj, function (value) {
                if (found = value === target) _.breakLoop();
            });
            return found;
        };
        _.invoke = function (obj, method) {
            var args = _.rest(arguments, 2);
            return _.map(obj, function (value) {
                return (method ? value[method] : value).apply(value, args);
            });
        };
        _.pluck = function (obj, key) {
            return _.map(obj, function (value) {
                return value[key];
            });
        };
        _.max = function (obj, iterator, context) {
            if (!iterator && _.isArray(obj)) return Math.max.apply(Math, obj);
            var result = {
                computed: -Infinity
            };
            each(obj, function (value, index, list) {
                var computed = iterator ? iterator.call(context, value, index, list) : value;
                computed >= result.computed && (result = {
                    value: value,
                    computed: computed
                });
            });
            return result.value;
        };
        _.min = function (obj, iterator, context) {
            if (!iterator && _.isArray(obj)) return Math.min.apply(Math, obj);
            var result = {
                computed: Infinity
            };
            each(obj, function (value, index, list) {
                var computed = iterator ? iterator.call(context, value, index, list) : value;
                computed < result.computed && (result = {
                    value: value,
                    computed: computed
                });
            });
            return result.value;
        };
        _.sortBy = function (obj, iterator, context) {
            return _.pluck(_.map(obj, function (value, index, list) {
                return {
                    value: value,
                    criteria: iterator.call(context, value, index, list)
                };
            }).sort(function (left, right) {
                var a = left.criteria,
                    b = right.criteria;
                return a < b ? -1 : a > b ? 1 : 0;
            }), 'value');
        };
        _.sortedIndex = function (array, obj, iterator) {
            iterator = iterator || _.identity;
            var low = 0,
                high = array.length;
            while (low < high) {
                var mid = (low + high) >> 1;
                iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
            }
            return low;
        };
        _.toArray = function (iterable) {
            if (!iterable) return [];
            if (iterable.toArray) return iterable.toArray();
            if (_.isArray(iterable)) return iterable;
            if (_.isArguments(iterable)) return slice.call(iterable);
            return _.values(iterable);
        };
        _.size = function (obj) {
            return _.toArray(obj).length;
        };
        _.first = function (array, n, guard) {
            return n && !guard ? slice.call(array, 0, n) : array[0];
        };
        _.rest = function (array, index, guard) {
            return slice.call(array, _.isUndefined(index) || guard ? 1 : index);
        };
        _.last = function (array) {
            return array[array.length - 1];
        };
        _.compact = function (array) {
            return _.filter(array, function (value) {
                return !!value;
            });
        };
        _.flatten = function (array) {
            return _.reduce(array, function (memo, value) {
                if (_.isArray(value)) return memo.concat(_.flatten(value));
                memo.push(value);
                return memo;
            }, []);
        };
        _.without = function (array) {
            var values = _.rest(arguments);
            return _.filter(array, function (value) {
                return !_.include(values, value);
            });
        };
        _.uniq = function (array, isSorted) {
            return _.reduce(array, function (memo, el, i) {
                if (0 == i || (isSorted === true ? _.last(memo) != el : !_.include(memo, el))) memo.push(el);
                return memo;
            }, []);
        };
        _.intersect = function (array) {
            var rest = _.rest(arguments);
            return _.filter(_.uniq(array), function (item) {
                return _.every(rest, function (other) {
                    return _.indexOf(other, item) >= 0;
                });
            });
        };
        _.zip = function () {
            var args = _.toArray(arguments);
            var length = _.max(_.pluck(args, 'length'));
            var results = new Array(length);
            for (var i = 0; i < length; i++) results[i] = _.pluck(args, String(i));
            return results;
        };
        _.indexOf = function (array, item) {
            if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
            for (var i = 0, l = array.length; i < l; i++) if (array[i] === item) return i;
            return -1;
        };
        _.lastIndexOf = function (array, item) {
            if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
            var i = array.length;
            while (i--) if (array[i] === item) return i;
            return -1;
        };
        _.range = function (start, stop, step) {
            var a = _.toArray(arguments);
            var solo = a.length <= 1;
            var start = solo ? 0 : a[0],
                stop = solo ? a[0] : a[1],
                step = a[2] || 1;
            var len = Math.ceil((stop - start) / step);
            if (len <= 0) return [];
            var range = new Array(len);
            for (var i = start, idx = 0; true; i += step) {
                if ((step > 0 ? i - stop : stop - i) >= 0) return range;
                range[idx++] = i;
            }
        };
        _.bind = function (func, obj) {
            var args = _.rest(arguments, 2);
            return function () {
                return func.apply(obj || {}, args.concat(_.toArray(arguments)));
            };
        };
        _.bindAll = function (obj) {
            var funcs = _.rest(arguments);
            if (funcs.length == 0) funcs = _.functions(obj);
            each(funcs, function (f) {
                obj[f] = _.bind(obj[f], obj);
            });
            return obj;
        };
        _.memoize = function (func, hasher) {
            var memo = {};
            hasher = hasher || _.identity;
            return function () {
                var key = hasher.apply(this, arguments);
                return key in memo ? memo[key] : (memo[key] = func.apply(this, arguments));
            };
        };
        _.delay = function (func, wait) {
            var args = _.rest(arguments, 2);
            return setTimeout(function () {
                return func.apply(func, args);
            }, wait);
        };
        _.defer = function (func) {
            return _.delay.apply(_, [func, 1].concat(_.rest(arguments)));
        };
        _.wrap = function (func, wrapper) {
            return function () {
                var args = [func].concat(_.toArray(arguments));
                return wrapper.apply(wrapper, args);
            };
        };
        _.compose = function () {
            var funcs = _.toArray(arguments);
            return function () {
                var args = _.toArray(arguments);
                for (var i = funcs.length - 1; i >= 0; i--) {
                    args = [funcs[i].apply(this, args)];
                }
                return args[0];
            };
        };
        _.keys = nativeKeys ||
        function (obj) {
            if (_.isArray(obj)) return _.range(0, obj.length);
            var keys = [];
            for (var key in obj) if (hasOwnProperty.call(obj, key)) keys.push(key);
            return keys;
        };
        _.values = function (obj) {
            return _.map(obj, _.identity);
        };
        _.functions = function (obj) {
            return _.filter(_.keys(obj), function (key) {
                return _.isFunction(obj[key]);
            }).sort();
        };
        _.extend = function (obj) {
            each(_.rest(arguments), function (source) {
                for (var prop in source) obj[prop] = source[prop];
            });
            return obj;
        };
        _.clone = function (obj) {
            if (_.isArray(obj)) return obj.slice(0);
            return _.extend({}, obj);
        };
        _.tap = function (obj, interceptor) {
            interceptor(obj);
            return obj;
        };
        _.isEqual = function (a, b) {
            if (a === b) return true;
            var atype = typeof(a),
                btype = typeof(b);
            if (atype != btype) return false;
            if (a == b) return true;
            if ((!a && b) || (a && !b)) return false;
            if (a.isEqual) return a.isEqual(b);
            if (_.isDate(a) && _.isDate(b)) return a.getTime() === b.getTime();
            if (_.isNaN(a) && _.isNaN(b)) return false;
            if (_.isRegExp(a) && _.isRegExp(b)) return a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
            if (atype !== 'object') return false;
            if (a.length && (a.length !== b.length)) return false;
            var aKeys = _.keys(a),
                bKeys = _.keys(b);
            if (aKeys.length != bKeys.length) return false;
            for (var key in a) if (!(key in b) || !_.isEqual(a[key], b[key])) return false;
            return true;
        };
        _.isEmpty = function (obj) {
            if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
            for (var key in obj) if (hasOwnProperty.call(obj, key)) return false;
            return true;
        };
        _.isElement = function (obj) {
            return !!(obj && obj.nodeType == 1);
        };
        _.isArray = nativeIsArray ||
        function (obj) {
            return !!(obj && obj.concat && obj.unshift && !obj.callee);
        };
        _.isArguments = function (obj) {
            return obj && obj.callee;
        };
        _.isFunction = function (obj) {
            return !!(obj && obj.constructor && obj.call && obj.apply);
        };
        _.isString = function (obj) {
            return !!(obj === '' || (obj && obj.charCodeAt && obj.substr));
        };
        _.isNumber = function (obj) {
            return (obj === +obj) || (toString.call(obj) === '[object Number]');
        };
        _.isBoolean = function (obj) {
            return obj === true || obj === false;
        };
        _.isDate = function (obj) {
            return !!(obj && obj.getTimezoneOffset && obj.setUTCFullYear);
        };
        _.isRegExp = function (obj) {
            return !!(obj && obj.test && obj.exec && (obj.ignoreCase || obj.ignoreCase === false));
        };
        _.isNaN = function (obj) {
            return _.isNumber(obj) && isNaN(obj);
        };
        _.isNull = function (obj) {
            return obj === null;
        };
        _.isUndefined = function (obj) {
            return typeof obj == 'undefined';
        };
        _.noConflict = function () {
            root._ = previousUnderscore;
            return this;
        };
        _.identity = function (value) {
            return value;
        };
        _.times = function (n, iterator, context) {
            for (var i = 0; i < n; i++) iterator.call(context, i);
        };
        _.breakLoop = function () {
            throw breaker;
        };
        _.mixin = function (obj) {
            each(_.functions(obj), function (name) {
                addToWrapper(name, _[name] = obj[name]);
            });
        };
        var idCounter = 0;
        _.uniqueId = function (prefix) {
            var id = idCounter++;
            return prefix ? prefix + id : id;
        };
        _.templateSettings = {
            start: '<%',
            end: '%>',
            interpolate: /<%=(.+?)%>/g
        };
        _.template = function (str, data) {
            var c = _.templateSettings;
            var endMatch = new RegExp("'(?=[^" + c.end.substr(0, 1) + "]*" + escapeRegExp(c.end) + ")", "g");
            var fn = new Function('obj', 'var p=[],print=function(){p.push.apply(p,arguments);};' + 'with(obj||{}){p.push(\'' + str.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(endMatch, "✄").split("'").join("\\'").split("✄").join("'").replace(c.interpolate, "',$1,'").split(c.start).join("');").split(c.end).join("p.push('") + "');}return p.join('');");
            return data ? fn(data) : fn;
        };
        _.each = _.forEach;
        _.foldl = _.inject = _.reduce;
        _.foldr = _.reduceRight;
        _.select = _.filter;
        _.all = _.every;
        _.any = _.some;
        _.contains = _.include;
        _.head = _.first;
        _.tail = _.rest;
        _.methods = _.functions;
        var wrapper = function (obj) {
            this._wrapped = obj;
        };
        var result = function (obj, chain) {
            return chain ? _(obj).chain() : obj;
        };
        var addToWrapper = function (name, func) {
            wrapper.prototype[name] = function () {
                var args = _.toArray(arguments);
                unshift.call(args, this._wrapped);
                return result(func.apply(_, args), this._chain);
            };
        };
        _.mixin(_);
        each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function (name) {
            var method = ArrayProto[name];
            wrapper.prototype[name] = function () {
                method.apply(this._wrapped, arguments);
                return result(this._wrapped, this._chain);
            };
        });
        each(['concat', 'join', 'slice'], function (name) {
            var method = ArrayProto[name];
            wrapper.prototype[name] = function () {
                return result(method.apply(this._wrapped, arguments), this._chain);
            };
        });
        wrapper.prototype.chain = function () {
            this._chain = true;
            return this;
        };
        wrapper.prototype.value = function () {
            return this._wrapped;
        };
    })();
    String.prototype.capitalize = function () {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
    String.prototype.uncapitalize = function () {
        return this.charAt(0).toLowerCase() + this.slice(1);
    };
    String.prototype.camelize = function (first_letter_lowercase) {
        var camelized = _(this.split(/_/)).map(function (word) {
            return word.capitalize();
        }).join('');
        return (first_letter_lowercase ? camelized.uncapitalize() : camelized.capitalize());
    };
    String.prototype.underscore = function () {
        return this.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/\-/g, '_').toLowerCase();
    };
    String.prototype.escapeHTML = function () {
        return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    String.prototype.escapeRegExp = function () {
        return this.replace(/([.*+?|()\[\]{}])/g, "\\$1");
    };
    String.prototype.capitalise = String.prototype.capitalize;
    String.prototype.uncapitalise = String.prototype.uncapitalize;
    String.prototype.camelise = String.prototype.camelize;
    String.prototype.camelcase = String.prototype.camelize;

    function present(value) {
        return value && !((typeof value === 'object') && $.isEmptyObject(value));
    }

    function handlebar(params, template, context) {
        if (template instanceof Array) {
            template = template.join("");
        }
        return Handlebars.compile(template)(context, params.bound_helpers);
    }
    helpers['if'] = function (params, test, block) {
        return present(test) ? (block && block(this)) : '';
    };
    helpers.unless = function (params, test, block) {
        return present(test) ? '' : (block && block(this));
    };
    helpers['if'].not = helpers.unless;
    helpers.unless.not = helpers['if'];
    helpers.if_equal = function (params, value1, value2, block) {
        return (value1 === value2) ? (block && block(this)) : '';
    };
    helpers.unless_equal = function (params, value1, value2, block) {
        return (value1 === value2) ? '' : (block && block(this));
    };
    helpers.if_equal.not = helpers.unless_equal;
    helpers.unless_equal.not = helpers.if_equal;
    helpers.if_preference_set = function (params, pref_name, block) {
        return (params.user_preferences && params.user_preferences[pref_name]) ? (block && block(this)) : '';
    };
    helpers.unless_preference_set = function (params, pref_name, block) {
        return (params.user_preferences && params.user_preferences[pref_name]) ? '' : (block && block(this));
    };
    helpers.if_preference_set.not = helpers.unless_preference_set;
    helpers.unless_preference_set.not = helpers.if_preference_set;

    function call_widget_partial(params, context, suffix) {
        if (context.widget_name) {
            var partial = params.bound_helpers.partials['widgets/_' + context.widget_name + (suffix || '')];
            if (partial) {
                return partial(context);
            } else {
                return '';
            }
        } else {
            return '';
        }
    }
    helpers.widget_button = function (params, context) {
        return call_widget_partial(params, context, '_button') || (context.widget && context.widget.button);
    };
    helpers.widget_body = function (params, context) {
        return call_widget_partial(params, context) || (context.widget && context.widget.body);
    };
    helpers.tracked_link = function (params, href, tracking_text, css_classes, block) {
        return handlebar(params, ['<a href="{{href}}" class="{{css}}" ', 'onclick="if (rapportiveLogger) { rapportiveLogger.track(\'{{track}}\'); } return true;" target="_blank"', '>{{{contents}}}</a>'], {
            href: ((href[0] === '/') ? params.rapportive_base_url : '') + href,
            css: css_classes,
            track: tracking_text,
            contents: block && block(this)
        });
    };
    helpers.feedback_link = function (params, context, block) {
        var url = 'https://rapportive.uservoice.com/?sso=' + params.user.uservoice_sso_token;
        return helpers.tracked_link.call(this, params, url, 'Feedback link clicked', 'feedback-link', block);
    };
    helpers.suggestion_link = function (params, suggestion, block) {
        var url = ['https://rapportive.uservoice.com/forums/42557-general/suggestions/', suggestion, '?sso=', params.user.uservoice_sso_token].join('');
        return helpers.tracked_link.call(this, params, url, 'Feedback link clicked', 'feedback-link', block);
    };
    helpers.privacy_link = function (params, context, block) {
        return helpers.tracked_link.call(this, params, '/privacy', 'Privacy link clicked', 'privacy-link', block);
    };
    helpers.support_email_link = function (params, context, block) {
        return ['<a href="mailto:supportive@rapportive.com">', block && block(this) || 'supportive@<wbr>rapportive.com', '</a>'].join('');
    };
    helpers.context_widget = function (params, css_attributes, block) {
        return ['<div class="context-widget" style="', css_attributes, '">', '<div class="lozenge">', block && block(this), '</div></div>'].join('');
    };
    helpers.format_host = function (params, url) {
        var match = /https?:\/\/([^:\/]*)/.exec(url || '');
        return match && match[1] || url;
    };
    helpers.link_to_hostname = function (params, url) {
        return ['<a href="', url, '" target="_blank">', helpers.format_host.call(this, params, url), '</a>'].join('');
    };
    helpers.format_email_with_link = function (params, email, url) {
        var parts = (email || '').split('@');
        return [$.wbriseText(parts[0]), '@<wbr/>', '<a href="', url, '" target="_blank" ', 'onclick="if (rapportiveLogger) { rapportiveLogger.track(\'Identifier link clicked\', {link_type: \'domain\'}); } return true;">', $.wbriseText(parts[1]), '</a>'].join('');
    };
    helpers.format_email = function (params, email) {
        var url = 'http://' + (email || '').split('@')[1];
        return helpers.format_email_with_link.call(this, params, email, url);
    };
    helpers.format_twitter = function (params, twitter_username) {
        return ['<a href="http://twitter.com/', twitter_username, '" target="_blank" ', 'onclick="if (rapportiveLogger) { rapportiveLogger.track(\'Identifier link clicked\', {link_type: \'twitter\'}); } return true;">', '@', twitter_username, '</a>'].join('');
    };
    helpers.format_location = function (params, location) {
        if (present(location)) {
            return helpers.tracked_link.call(this, params, 'http://maps.google.com/maps?q=' + encodeURIComponent(location), 'Location link clicked', 'location', function () {
                return location.replace(/^([^,]*,[^,]*),.*/, '$1');
            });
        } else {
            return '';
        }
    };
    helpers.format_occupation = function (params, context) {
        var parts = [];
        if (context.job_title) {
            parts.push('<span class="job-title">' + $.escapeHTML(context.job_title) + '</span>');
        }
        if (context.company) {
            parts.push('<span class="company">' + $.escapeHTML(context.company) + '</span>');
        }
        return parts.join(' at ');
    };
    helpers.print_context = function (params, context, block) {
        var attrs = [],
            obj = context;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                attrs.push((key + ': ' + obj[key]).escapeHTML());
            }
        }
        return '{' + attrs.sort().join(', ') + '}';
    };
    helpers.rapportive_base_url = function (params) {
        return params.rapportive_base_url;
    };
    helpers.can_edit_contact = function (params) {
        return params.contact && params.contact.can_be_edited;
    };
    helpers.is_current_user = function (params) {
        return params.contact && params.contact.is_current_user;
    };
    helpers.friendly_name = function (params, context, block) {
        return params.contact.friendly_name || (block && block(this)) || '';
    };
    helpers.spinner = function (params) {
        return '<img class="spinner" src="' + helpers.rapportive_base_url(params) + '/images/ajax-loader.gif" alt="Processing..." />';
    };
    helpers.sidebar_spinner = function (params, spinner_class) {
        return handlebar(params, '<div class="sidebar-spinner {{ spinner_class }}" style="display: none">{{{ spinner }}}</div>', {
            spinner_class: spinner_class
        });
    };
    helpers.membership_info_bubble = function (params, class_name, block) {
        return ['<table class="membership-info-bubble ', class_name, '"><tr><td>', '<div class="info-bubble">', block && block(this), '</div></td></tr></table>'].join('');
    };
    helpers.action_button = function (params, action, css_class, text) {
        return ['<a href="#', action, '" class="membership-action membership-action-', action, '">', '<span class="', css_class, '">', text, '</span></a>'].join('');
    };
    helpers.status_label = function (params, status, text) {
        return ['<div class="membership-status membership-status-', status, '">', '<span class="membership-status-contents">', '<span class="tick">&#x2713;</span>', text, '</span></div>'].join('');
    };
    helpers.linked_in_button = function (params, context) {
        function button(action) {
            if (params.contact.point_type === 'email') {
                return helpers.action_button(params, action, 'linkedin-button membership-link membership-action-contents', 'CONNECT');
            } else {
                return '';
            }
        }
        if (params.contact.is_current_user || context.widget.own_profile) {
            return '';
        }
        if (!params.user.logged_in) {
            return button('login');
        }
        if (context.widget.authorized) {
            if (context.widget.connected) {
                return helpers.status_label(params, 'connected', 'CONNECTED');
            } else if (context.widget.invited) {
                return helpers.status_label(params, 'invited', 'INVITED');
            } else {
                return button('invite');
            }
        } else {
            return button('authorize');
        }
    };

    function local_context(original, extra) {
        function Context() {
            $.extend(this, extra);
        }
        Context.prototype = original;
        return new Context();
    }
    helpers.facebook_button = function (params, context) {
        var css_classes = 'facebook-button membership-link membership-action-contents';
        if (params.contact.is_current_user || context.widget.own_profile) {
            return '';
        } else if (!params.user.logged_in) {
            return helpers.action_button(params, 'login', css_classes, 'ADD FRIEND');
        } else if (!context.widget.authorized) {
            return helpers.action_button(params, 'authorize', css_classes, 'ADD FRIEND');
        } else if (context.widget.connected) {
            return helpers.status_label(params, 'connected', 'FRIENDS');
        } else if (context.widget.invited) {
            return helpers.status_label(params, 'invited', 'INVITED');
        } else {
            return helpers.action_button(params, 'invite', css_classes, 'ADD FRIEND');
        }
    };
    helpers.truncate_title = function (params, text) {
        return $.truncate(text, {
            length: 46,
            block_tag: 'h1',
            more: '\u00a0\u2026'
        });
    };
    helpers.truncate_sitelink = function (params, text) {
        return $.truncate(text, {
            length: 8,
            truncated_text: false,
            block_tag: false
        });
    };
    helpers.truncate_description = function (params, text) {
        return $.truncate(text, {
            length: 180,
            more: '\u00a0\u2026'
        });
    };
    helpers.format_list = function (params, list) {
        var beginning = list.slice(0, -1).join(", ");
        if (beginning) {
            return beginning + " and " + list[list.length - 1];
        } else {
            return list[0] ? list[0].toString() : "";
        }
    };
    helpers.format_authorizations_list = function (params, auths) {
        var human_names = $.map(auths, function (auth) {
            return auth.human_name;
        });
        return helpers.format_list(params, human_names);
    };
    helpers.icon_tag_for_authorization = function (params, auth, css_class) {
        return ['<img class="', css_class, '" src="', helpers.rapportive_base_url(params), '/images/authorizations/', auth.slug, '_32.png" alt="" />'].join("");
    };
    rapportive.prototype.templates["notes/_note"] = Handlebars.compile("<li>\n    <div class=\"note-undo\" style=\"display: none;\">\n        <p class=\"note-info\">\n            Note deleted.\n            <a href=\"#undo\" class=\"note-info-item note-undelete\">(undo)</a>\n        </p>\n    </div>\n\n    <div class=\"note\">\n        <div class=\"note-body\">\n            {{{ body_html }}}\n        </div>\n        <div class=\"clear\"></div> <!-- clearfix doesn't work here -->\n    </div>\n</li>\n");
    rapportive.prototype.templates["notes/_form"] = Handlebars.compile("<form action=\"\" class=\"new_note\">\n    {{{ sidebar_spinner }}}\n\n    <label for=\"note-body\">Add a note on this person...</label>\n    <div class=\"textfield-wrapper\">\n        <textarea cols=\"40\" rows=\"20\" id=\"note-body\" name=\"note_body\"></textarea>\n    </div>\n\n    <p class=\"info\">Your notes are private: only you can read them.</p>\n\n    <div id=\"save_button_container\" style=\"display:none\">\n        <div id=\"note-save-button\" class=\"google-button\">Save</div>\n    </div>\n</form>\n");
    rapportive.prototype.templates["widgets/_tungle_button"] = Handlebars.compile("{{#unless is_current_user}}\n    <a href=\"#\" class=\"tungle-me membership-action\">\n        <span class=\"membership-action-contents\" title=\"Click to see my availability or schedule a meeting with me.\">SCHEDULE</span>\n    </a>\n{{/unless}}\n");
    rapportive.prototype.templates["widgets/_twitter_button"] = Handlebars.compile("<div class=\"expand-button\"></div>\n");
    rapportive.prototype.templates["widgets/_facebook_button"] = Handlebars.compile("{{{ facebook_button }}}\n");
    rapportive.prototype.templates["widgets/_linked_in_button"] = Handlebars.compile("{{{ linked_in_button }}}\n");
    rapportive.prototype.templates["widgets/_twitter"] = Handlebars.compile("<div class=\"membership-details\">\n    <div class=\"tweets\"></div>\n</div>\n");
    rapportive.prototype.templates["widgets/_linked_in"] = Handlebars.compile("{{#membership_info_bubble \"login-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/linkedin.png\" alt=\"LinkedIn\" class=\"inline-icon\" />\n    <b>New:</b>\n    Connect with {{#friendly_name}}this person{{/friendly_name}} on LinkedIn, without leaving Gmail.\n    If you're already connected, this will bring Rapportive up to date.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"authorize-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/linkedin.png\" alt=\"LinkedIn\" class=\"inline-icon\" />\n    <b>New:</b>\n    Connect with {{#friendly_name}}this person{{/friendly_name}} on LinkedIn, without leaving Gmail.\n    If you're already connected, this will bring Rapportive up to date.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"invite-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/linkedin.png\" alt=\"LinkedIn\" class=\"inline-icon\" />\n    Connect with {{#friendly_name}}this person{{/friendly_name}} on LinkedIn.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"invited-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/linkedin.png\" alt=\"LinkedIn\" class=\"inline-icon\" />\n    You've invited {{#friendly_name}}this person{{/friendly_name}} to connect on LinkedIn.\n    This could take a few hours to update.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"connected-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/linkedin.png\" alt=\"LinkedIn\" class=\"inline-icon\" />\n    You're connected to {{#friendly_name}}this person{{/friendly_name}} on LinkedIn.\n{{/membership_info_bubble}}\n\n\n<div class=\"info-dialog linkedin-invitation-dialog\" title=\"Invite {{#friendly_name}}this person{{/friendly_name}} to connect on LinkedIn\" style=\"display:none\">\n    <form method=\"post\" action=\"#\">\n        <div>\n            <textarea name=\"linked-in-body\" id=\"linked-in-body\" rows=\"8\" cols=\"40\">rapportive.com showed me your LinkedIn profile in my email.\n\nI'd like to add you to my professional network on LinkedIn.</textarea>\n        </div>\n\n        <a href=\"{{ profile_url }}\" target=\"_blank\">\n            <img src=\"{{ rapportive_base_url }}/images/widgets/linked-in-logo.png\" class=\"linkedin-logo\" />\n        </a>\n\n        <p class=\"word-count\">\n            <span class=\"total\">200</span> characters max, \n            <span class=\"current\">0</span> used\n            <span class=\"on-error\">(over limit)</span>\n        </p>\n\n        <p class=\"invitation-status\">\n            {{{ spinner }}}\n            <span class=\"status-text\"></span>\n        </p>\n    </form>\n</div>\n");
    rapportive.prototype.templates["widgets/_tungle"] = Handlebars.compile("<div style=\"display: none\"></div>\n");
    rapportive.prototype.templates["widgets/_facebook"] = Handlebars.compile("{{#membership_info_bubble \"login-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/facebook.png\" alt=\"Facebook\" class=\"inline-icon\" />\n    <b>New:</b>\n    Add {{#friendly_name}}this person{{/friendly_name}} as a friend on Facebook.\n    If you're already friends, this will bring Rapportive up to date.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"authorize-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/facebook.png\" alt=\"Facebook\" class=\"inline-icon\" />\n    <b>New:</b>\n    Add {{#friendly_name}}this person{{/friendly_name}} as a friend on Facebook.\n    If you're already friends, this will bring Rapportive up to date.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"invite-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/facebook.png\" alt=\"Facebook\" class=\"inline-icon\" />\n    Add {{#friendly_name}}this person{{/friendly_name}} as a friend on Facebook.\n{{/membership_info_bubble}}\n\n{{#membership_info_bubble \"connected-bubble\"}}\n    <img src=\"{{ rapportive_base_url }}/images/icons/facebook.png\" alt=\"Facebook\" class=\"inline-icon\" />\n    You are friends with {{#friendly_name}}this person{{/friendly_name}} on Facebook.\n{{/membership_info_bubble}}\n\n{{#if widget/authorized}}\n    <div class=\"facebook-posts\" style=\"display:none\">\n        <div class=\"relative-anchor\">\n            <div class=\"content-preview\" style=\"display:none\">\n\n                <div class=\"video-preview\" style=\"display:none\">\n                    <embed class=\"youtube-video\" src=\"\" style=\"display: none\" type=\"application/x-shockwave-flash\" allowScriptAccess=\"always\"/>\n\n                    {{! There are three issues with embedding videos hosted at Facebook: }}\n                    {{! 1. Using embed to include Facebook videos does not seem to work (the video does not load,\n                        and right clicking on the flash container always indicates \"Movie not loaded...\").\n                        This is likely a cross-domain issue.  Putting the Facebook video in an iframe fixes\n                        the issue. }}\n                    {{! 2. Unlike the YouTube player, the Facebook player refuses to resize to fit is container.\n                        So we have to make the iframe much larger to avoid it having scrollbars.  This process\n                        is fairly brittle, as Facebook could change the size of their videos any time. }}\n                    {{! 3. Facebook videos always seem to autoplay, and I haven't found a way to prevent this. }}\n                    {{! Due to the above issues, this feature is disabled for now:\n                        <iframe class=\"facebook-video\" src=\"\" style=\"width: 400px; height: 363px; border: none; margin-bottom: -3px; display:none\" /> }}\n\n                    {{! todo: sort out the style discrepancies with firefox }}\n                    <div class=\"text\" style=\"display: none\">\n                        <div class=\"close\" style=\"display:none\"><a href=\"#\">Close video</a></div>\n                        <div class=\"watch\"><a href=\"#\" target=\"_blank\">Watch on YouTube</a></div>\n                        <div class=\"description\"></div>\n                    </div>\n                </div>\n\n                <div class=\"picture-preview\" style=\"display:none\">\n                    <a href=\"#\" target=\"_blank\" class=\"link\" style=\"display:none\">\n                        {{! todo: sort out the rounded corners on firefox }}\n                        {{! todo: sort out the style discrepancies with firefox }}\n                        <table>\n                            <tr>\n                                <td style=\"vertical-align:top\">\n                                    <img src=\"\" class=\"content-image\">\n                                </td>\n                                <td style=\"vertical-align:top\">\n                                    <div class=\"text\" style=\"display: none\">\n                                        <div class=\"caption\"></div>\n                                        <div class=\"description\"></div>\n                                    </div>\n                                </td>\n                            </tr>\n                        </table>\n                    </a>\n                </div>\n\n            </div>\n        </div>\n\n        <div class=\"post posts-list-item posts-list-item-with-image-container\">\n            <div class=\"image-container\">\n                <a href=\"#\" target=\"_blank\" class=\"profile-link\">\n                    <img src=\"\" class=\"profile-image\"/>\n                </a>\n            </div>\n            <span class=\"author\"></span>\n            <span class=\"message\"></span>\n            <span class=\"link\" style=\"display:none\">\n                –\n                <a target=\"_blank\">\n                    <span class=\"text\"></span>\n                    <div class=\"icon picture\" style=\"display:none\">\n                        <img src=\"{{ rapportive_base_url }}/images/widgets/picture.png\" title=\"This post links to a picture.\" />\n                    </div>\n                    <div class=\"icon video\" style=\"display:none\">\n                        <img src=\"{{ rapportive_base_url }}/images/widgets/video.png\" title=\"This post links to a video.\" />\n                    </div>\n                </a>\n            </span>\n            <a href=\"#\" target=\"_blank\" class=\"timeago\"></a>\n        </div>\n\n        <ul class=\"comment-stream\">\n            <div class=\"comment-template\" style=\"display:none\">\n                <li class=\"comment posts-list-item posts-list-item-with-image-container\">\n                    <div class=\"image-container\">\n                        <a href=\"#\" target=\"_blank\" class=\"profile-link\">\n                            <img src=\"\" class=\"profile-image\"/>\n                        </a>\n                    </div>\n                    <span class=\"author\"></span>\n                    <span class=\"message\"></span>\n                    <a href=\"#\" target=\"_blank\" class=\"timeago\"></a>\n                </li>\n            </div>\n\n            <li class=\"view-all posts-list-item posts-list-item-with-image-container\" style=\"display:none\">\n                <div class=\"image-container\">\n                    <a href=\"#\" target=\"_blank\">\n                        <img src=\"{{ rapportive_base_url }}/images/widgets/comments.png\" class=\"comment-image\" />\n                    </a>\n                </div>\n                <a href=\"#\">View all <span class=\"count\"></span> comments</a>\n                <div class=\"spinner-container\" style=\"display:none\">\n                    {{{ spinner }}}\n                </div>\n            </li>\n\n            <div class=\"comments\"></div>\n            <li class=\"posts-list-item\">\n                <form method=\"post\" action=\"#\" class=\"comment-form\" style=\"display:none\">\n                    {{{ sidebar_spinner }}}\n                    <label for=\"new-comment\">Write a comment...</label>\n                    <div class=\"textfield-wrapper\">\n                        <textarea id=\"new-comment\"></textarea>\n                    </div>\n                    <div id=\"comment-button-container\" style=\"display:none\">\n                        <div class=\"google-button\" id=\"comment-button\">Comment</div>\n                    </div>\n                </form>\n\n                <div class=\"add-friend-call-to-action\" style=\"display: none\">\n                    <div class=\"facebook-add-friend-hint\"  {{#if_preference_set \"hide_facebook_add_friend_hint\"}} style=\"display: none\" {{/if_preference_set}}>\n                        <span class=\"pre-click\" {{#if widget/invited}} style=\"display:none\" {{/if}}>\n                            To comment here, <a href=\"#\" class=\"add-friend\" target=\"_blank\">add {{#friendly_name}}this person{{/friendly_name}} as a friend</a> on Facebook.\n                        </span>\n                        <span class=\"post-click\" {{#unless widget/invited}} style=\"display:none\" {{/unless}}>\n                            {{#friendly_name}}They{{/friendly_name}} must accept your friend request before you can comment.\n                        </span>\n                        <a href=\"{{ rapportive_base_url }}/preferences/set/hide_facebook_add_friend_hint\" class=\"hide-hint\">\n                            hide hint\n                        </a>\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n{{/if}}\n");
    rapportive.prototype.templates["authorizations/_connect"] = Handlebars.compile("<div class=\"authorization-instructions\">\n    <p>To get richer profiles, please sign in with {{format_authorizations_list user/authorizations/wanted}}:</p>\n    {{#user/authorizations/wanted}}\n        {{> authorizations/_connect_item}}\n    {{/user/authorizations/wanted}}\n</div>\n\n<p class=\"authorization-cancelled\" style=\"display:none\">\n    {{! this message will self destruct when the next contact is loaded }}\n    You can sign in to your networks later by clicking\n    &quot;<a href=\"#networks-dialog\" class=\"text-link authorization-settings-dialog\">Connect my networks</a>&quot;\n    in the Rapportive menu.\n</p>\n");
    rapportive.prototype.templates["authorizations/_connect_item"] = Handlebars.compile("<div class=\"authorization-button-container\" data-site=\"{{ slug }}\">\n    <div class=\"relative-anchor\">\n        <div class=\"authorization-preview {{ type_name }}\" style=\"display:none\">\n            <table>\n                <tr>\n                    <td>\n                        {{{ icon_tag_for_authorization this \"logo\" }}}\n                    </td>\n                    <td>\n                        {{#if_equal type_name \"LinkedIn\"}}\n                            <p>\n                                You'll be able to add contacts to your LinkedIn network without leaving Gmail,\n                                You'll see more LinkedIn profiles, faster than before.\n                            </p>\n                            <p>\n                                You can see it on our\n                                <a href=\"http://blog.rapportive.com/grow-your-network-with-rapportive\" target=\"_blank\" class=\"text-link\">blog</a>,\n                                then\n                                <a href=\"{{ intro_url }}\" data-import-url=\"{{ import_url }}\" class=\"authorization-button text-link\">sign in with LinkedIn here</a>.\n                            </p>\n                        {{/if_equal}}\n                        {{#if_equal type_name \"Facebook\"}}\n                            <p>\n                                You'll be able to add contacts as Facebook friends, and comment on Facebook posts, right from Gmail.\n                                You'll see more Facebook profiles, faster than before.\n                            </p>\n                            <p>\n                                <a href=\"{{ intro_url }}\" data-import-url=\"{{ import_url }}\" class=\"authorization-button\">\n                                    <img class=\"preview\" src=\"{{rapportive_base_url}}/images/authorizations/facebook_preview.png\">\n                                </a>\n                            </p>\n                            <p>\n                                You can <a href=\"{{ intro_url }}\" data-import-url=\"{{ import_url }}\" class=\"authorization-button text-link\">sign in with Facebook here</a>.\n                            </p>\n                        {{/if_equal}}\n                    </td>\n                </tr>\n            </table>\n        </div>\n    </div>\n    <a href=\"{{ intro_url }}\" data-import-url=\"{{ import_url }}\" class=\"{{ slug }}-authorization-button authorization-button\">\n        <span>Sign in with {{ human_name }}</span>\n    </a>\n    <a href=\"{{ hide_url }}\" class=\"authorization-later-button\">do it later</a>\n</div>\n");
    rapportive.prototype.templates["authorizations/_suggest_connect"] = Handlebars.compile("{{#if contact/memberships}}\n    {{#if user/authorizations/wanted}}\n        {{> authorizations/_connect}}\n    {{/if}}\n{{/if}}\n");
    rapportive.prototype.templates["contacts/_membership_new"] = Handlebars.compile("<li class=\"new-membership\">\n    <a href=\"#\" class=\"action membership-link\">Add a social network...</a>\n\n    <div class=\"form-wrapper\" style=\"display: none\">\n        <p class=\"info\">\n            In a separate tab, please open your profile page in the social network you want to add.\n            Then copy its address here:\n        </p>\n\n        <form class=\"form\">\n            {{{ sidebar_spinner \"membership-spinner\" }}}\n\n            <div class=\"textfield-wrapper\">\n                <input id=\"membership_url\" name=\"membership_url\" type=\"text\" value=\"\" />\n            </div>\n\n            <div class=\"save_button_container\">\n                <div class=\"google-button\" id=\"membership_save_button\">Add</div>\n\n                <p class=\"info\">\n                    e.g. http://<wbr/>facebook.com/<wbr/>your.name or\n                    http://<wbr/>linkedin.com/<wbr/>in/<wbr/>your.name\n                </p>\n\n                <p class=\"new-membership-error edit-error\" style=\"display: none\"></p>\n            </div>\n        </form>\n    </div>\n</li>\n");
    rapportive.prototype.templates["contacts/_notes"] = Handlebars.compile("<div class=\"notes\">\n    {{#if user/logged_in}}\n        {{#unless contact/can_be_edited}}\n            {{> notes/_form}}\n        {{/unless}}\n\n        <ol class=\"note-list\">\n            {{#contact/notes}}\n                {{> notes/_note}}\n            {{/contact/notes}}\n        </ol>\n    {{^}}\n        <p>You are currently logged out of Rapportive. Log in to see your Raplets and notes.</p>\n        {{> sessions/_login_button}}\n    {{/if}}\n</div>\n");
    rapportive.prototype.templates["contacts/_raplet"] = Handlebars.compile("<div class=\"raplet\"></div>\n");
    rapportive.prototype.templates["contacts/_about_own_profile"] = Handlebars.compile("<div class=\"info-dialog\" title=\"Editing your own profile\" style=\"display: none\">\n    <p><strong>Take control of how other people see you on Rapportive.</strong></p>\n\n    <p>We set up your Rapportive profile with publicly available information from\n    the web. We try to make sure that it's accurate and up-to-date, but we're\n    not perfect. If by any chance we got something wrong, you can now correct your\n    profile directly within Rapportive:</p>\n\n    <ol>\n        {{#if contact/organisation}}\n            <li>Hover your mouse over the piece of information you want to change, e.g.\n                a social network profile.</li>\n            <li>A little menu appears: click 'Remove'.</li>\n            <li>Click 'Add a social network' to add the correct link.</li>\n        {{^}}\n            <li>Hover your mouse over the piece of information you want to change, e.g.\n                your current job title.</li>\n            <li>A little menu appears: click 'Edit'.</li>\n            <li>Make your change and press enter.</li>\n        {{/if}}\n    </ol>\n\n    <p>Anyone else looking you up on Rapportive will see the changes you made to\n    your profile.</p>\n\n    <p>Press <tt>Escape</tt> to close this window.</p>\n</div>\n\n{{#unless user_preferences/hide_edit_profile_instructions}}\n    <div class=\"notification tip edit-profile\">\n        Move your mouse over your details if you need to make any changes.\n        <a href=\"#\" class=\"dismiss\" title=\"Don't show me this tip again\">x</a>\n        <div class=\"icon\"></div>\n    </div>\n{{/unless}}\n");
    rapportive.prototype.templates["contacts/_membership"] = Handlebars.compile("<li class=\"membership hover {{#if widget_name}} expanded {{^}} collapsed {{/if}}\">\n    {{{ sidebar_spinner \"membership-spinner\" }}}\n\n    {{#if can_edit_contact}}\n        {{#context_widget \"left: -68px; top: 3px\"}}\n            <table>\n                <tr>\n                    <td>\n                        <span class=\"remove action\">Remove</span>\n                    </td>\n                </tr>\n            </table>\n        {{/context_widget}}\n    {{/if}}\n\n    <div class=\"object\">\n        <a class=\"membership-link\" href=\"{{ profile_url }}\" target=\"_blank\"\n        style=\"background-image: url({{ rapportive_base_url }}/images/icons/{{ icon_name }}.png)\"\n        title=\"{{ view_text }}\" site_name=\"{{ site_name }}\">\n            {{ formatted }}\n            {{{ widget_button }}}\n        </a>\n    </div>\n\n    {{{ widget_body }}}\n</li>\n");
    rapportive.prototype.templates["contacts/_no_memberships"] = Handlebars.compile("{{#if user/authorizations/wanted}}\n    {{> authorizations/_connect}}\n{{^}}\n    <p>\n        If you have ideas on how to improve Rapportive, please {{#feedback_link}}let us know!{{/feedback_link}}\n    </p>\n{{/if}}\n");
    rapportive.prototype.templates["contacts/organisation/_sitelinks"] = Handlebars.compile("{{#if contact/organisation/links}}\n    <ul class=\"sitelinks\">\n        {{#contact/organisation/links}}\n            <li>\n                <a href=\"{{href}}\" target=\"_blank\" title=\"{{display_name}}\">\n                    {{{truncate_sitelink display_name}}}\n                </a>\n            </li>\n        {{/contact/organisation/links}}\n    </ul>\n{{/if}}\n");
    rapportive.prototype.templates["contacts/organisation/_feedback_link"] = Handlebars.compile("<p>\n    {{#if contact/organisation/links}}\n        We made this summary from {{{link_to_hostname contact/organisation/final_url}}}.\n        If we could improve it, please\n        {{#suggestion_link \"518911\"}}let us know{{/suggestion_link}}!\n    {{^}}\n        Thanks, we are now searching {{{link_to_hostname contact/organisation/final_url}}}.\n        We'll show more in a few hours.\n    {{/if}}\n</p>\n");
    rapportive.prototype.templates["contacts/organisation/_basics"] = Handlebars.compile("<div class=\"basics\">\n    {{#if contact/organisation/favicon}}\n        <a href=\"{{ contact/organisation/final_url }}\" target=\"_blank\">\n            <img src=\"{{ contact/organisation/favicon }}\" class=\"favicon\" width=\"16\" height=\"16\"/>\n        </a>\n    {{/if}}\n\n    <span class=\"email\">\n        {{{format_email_with_link contact/email contact/organisation/final_url}}}\n    </span>\n</div>\n");
    rapportive.prototype.templates["contacts/organisation/_title"] = Handlebars.compile("<div class=\"hover\">\n    {{#if contact/can_be_edited}}\n        {{#context_widget \"left: -45px; top: -1px\"}}\n            <table>\n                <tr>\n                    <td>\n                        <span id=\"edit\" class=\"action\">Edit</span>\n                    </td>\n                </tr>\n            </table>\n        {{/context_widget}}\n    {{/if}}\n\n    <div class=\"object\">\n        <div class=\"title\">\n            {{{truncate_title contact/organisation/title}}}\n        </div>\n    </div>\n\n    <div class=\"info-dialog\" style=\"display: none\" title=\"Changing your organisation's title\">\n        <p>\n            We copied this title from {{{link_to_hostname contact/organisation/final_url}}}.\n        </p>\n\n        <p>\n            If you would like to change the title displayed on your organisation's\n            Rapportive profile, you can do one of two things:\n        </p>\n\n        <ul>\n            <li>\n                If you own {{{link_to_hostname contact/organisation/final_url}}}\n                and can change the site's programming,\n                you can change the site's <tt>&lt;title&gt;</tt> tag.\n                We will reflect the change in about two weeks.\n            </li>\n            <li>\n                Email us at {{{support_email_link}}}.\n                We will promptly make the change for you.\n            </li>\n        </ul>\n\n        <p>\n            We are considering making it possible to edit your organisation's\n            profile directly from Rapportive.  If you would find this useful, please\n            {{#suggestion_link \"518911\"}}let us know{{/suggestion_link}}!\n        </p>\n    </div>\n</div>\n");
    rapportive.prototype.templates["contacts/organisation/_organisation"] = Handlebars.compile("<div class=\"organisation\">\n\n    {{#if contact/organisation/title}}\n        {{> contacts/organisation/_title }}\n    {{/if}}\n\n    {{> contacts/organisation/_basics }}\n\n    {{#if contact/is_current_user}}\n        {{> contacts/_about_own_profile }}\n    {{/if}}\n\n    {{> contacts/organisation/_description }}\n\n    {{> contacts/organisation/_sitelinks }}\n\n    {{> contacts/_memberships }}\n\n    {{> contacts/organisation/_feedback_link }}\n</div>\n");
    rapportive.prototype.templates["contacts/organisation/_description"] = Handlebars.compile("<div class=\"hover\">\n    {{#if contact/can_be_edited}}\n        {{#context_widget \"left: -45px; top: -3px\"}}\n            <table>\n                <tr>\n                    <td>\n                        <span id=\"edit\" class=\"action\">Edit</span>\n                    </td>\n                </tr>\n            </table>\n        {{/context_widget}}\n    {{/if}}\n\n    <div class=\"object\">\n        <div class=\"description\">{{{truncate_description contact/organisation/description}}}</div>\n    </div>\n\n    <div class=\"info-dialog\" style=\"display: none\" title=\"Changing your organisation's description\">\n        <p>\n            We copied this description from {{{link_to_hostname contact/organisation/final_url}}}.\n        </p>\n\n        <p>\n            If you would like to change the description displayed on your organisation's\n            Rapportive profile, you can do one of two things:\n        </p>\n\n        <ul>\n            <li>\n                If you own {{{link_to_hostname contact/organisation/final_url}}}\n                and can change the site's programming,\n                you can change the site's <tt>&lt;meta name=\"description\"/&gt;</tt> tag.\n                We will reflect the change in about two weeks.\n            </li>\n            <li>\n                Email us at {{{support_email_link}}}.\n                We will promptly make the change for you.\n            </li>\n        </ul>\n\n        <p>\n            We are considering making it possible to edit your organisation's\n            profile directly from Rapportive.  If you would find this useful, please\n            {{#suggestion_link \"518911\"}}let us know{{/suggestion_link}}!\n        </p>\n    </div>\n</div>\n");
    rapportive.prototype.templates["contacts/_action_bar"] = Handlebars.compile("<div class=\"action-bar\">\n    <table>\n        <tr>\n            <td class=\"actions\">\n                {{#feedback_link}}feedback{{/feedback_link}} |\n                {{#privacy_link}}privacy{{/privacy_link}} |\n                <a href=\"#\" class=\"my-profile-link\">my profile</a>\n            </td>\n            <td>\n                {{#tracked_link \"/\" \"Rapportive logo clicked\" \"logo\"}}\n                    <img src=\"{{ rapportive_base_url }}/images/rapportive-light.png\" class=\"logo\" target=\"_blank\">\n                {{/tracked_link}}\n            </td>\n        </tr>\n    </table>\n</div>\n");
    rapportive.prototype.templates["contacts/lookup"] = Handlebars.compile("<div>\n    {{#if contact/organisation}}\n        {{> contacts/organisation/_organisation }}\n    {{^}}\n        {{> contacts/person/_person }}\n    {{/if}}\n\n    {{#contact/raplets}}\n        {{> contacts/_raplet }}\n    {{/contact/raplets}}\n\n    {{> contacts/_notes }}\n    <div class=\"gmail-contextual-links-container\"></div>\n    {{> contacts/_action_bar }}\n</div>\n");
    rapportive.prototype.templates["contacts/_memberships"] = Handlebars.compile("{{#unless contact/organisation}}\n    {{! This is rendered with display:none, so that it can be made visible if the user deletes their last membership }}\n    <div class=\"no-memberships\" {{#if contact/memberships}}style=\"display: none\" {{/if}}>\n\n        {{#if contact/is_current_user}}\n            <p>Sorry, we couldn't find you on any social networks.</p>\n        {{^}}\n            <p>We couldn't find this person on any social networks.</p>\n            {{> contacts/_no_memberships }}\n        {{/if}}\n    </div>\n{{/unless}}\n\n\n<ul class=\"memberships\">\n    {{#contact/memberships}}\n        {{> contacts/_membership }}\n    {{/contact/memberships}}\n\n    {{#if contact/can_be_edited}}\n        {{> contacts/_membership_new }}\n    {{/if}}\n</ul>\n\n{{> authorizations/_suggest_connect }}\n");
    rapportive.prototype.templates["contacts/_spinner"] = Handlebars.compile("<div class=\"spinner sidebar-spinner\" style=\"display: none\">\n    <img src=\"{{ rapportive_base_url }}/images/ajax-loader.gif\" alt=\"Processing...\">\n</div>\n");
    rapportive.prototype.templates["contacts/person/_occupation_new"] = Handlebars.compile("<li class=\"new-occupation\">\n    <a href=\"#\" class=\"action add-occupation\">Add an occupation...</a>\n\n    <div class=\"form-wrapper\" style=\"display: none\">\n        <form class=\"form\">\n            {{{ sidebar_spinner \"occupation-spinner\" }}}\n\n            <table>\n                <tr>\n                    <td style=\"width:45%\">\n                        <div class=\"textfield-wrapper\">\n                            <input name=\"job_title\" type=\"text\" value=\"\" />\n                        </div>\n                    </td>\n                    <td style=\"width:10%; text-align: center\">at</td>\n                    <td style=\"width:45%\">\n                        <div class=\"textfield-wrapper\">\n                            <input name=\"company\" type=\"text\" value=\"\" />\n                        </div>\n                    </td>\n                </tr>\n            </table>\n\n            <div id=\"new-occupation-error\" class=\"edit-error\" style=\"display: none\"></div>\n        </form>\n    </div>\n</li>\n");
    rapportive.prototype.templates["contacts/person/_occupation"] = Handlebars.compile("<li>\n    {{#if can_edit_contact}}\n        <div class=\"hover\">\n            {{{ sidebar_spinner \"occupation-spinner\" }}}\n\n            {{#context_widget \"left: -98px; top: -3px\"}}\n                <table>\n                    <tr>\n                        <td>\n                            <span class=\"remove action\">Remove</span>\n                        </td>\n                        <td>\n                            <span id=\"edit\" class=\"action\">Edit</span>\n                        </td>\n                    </tr>\n                </table>\n            {{/context_widget}}\n\n            <div class=\"object\">\n                <div class=\"occupation\">\n                    {{{ format_occupation }}}\n                </div>\n            </div>\n        </div>\n\n        <form class=\"form\" style=\"display:none\">\n            <table>\n                <tr>\n                    <td style=\"width:45%\">\n                        <div class=\"textfield-wrapper\">\n                            <input id=\"job_title\" name=\"job_title\" type=\"text\" value=\"{{ job_title }}\" />\n                        </div>\n                    </td>\n\n                    <td style=\"width:10%; text-align: center\">at</td>\n\n                    <td style=\"width:45%\">\n                        <div class=\"textfield-wrapper\">\n                            <input id=\"company\" name=\"company\" type=\"text\" value=\"{{ company }}\" />\n                        </div>\n                    </td>\n                </tr>\n            </table>\n            <div id=\"occupation-error\" class=\"edit-error\" style=\"display: none\"></div>\n        </form>\n    {{^}}\n        {{{ format_occupation }}}\n    {{/if}}\n</li>\n");
    rapportive.prototype.templates["contacts/person/_person"] = Handlebars.compile("{{> contacts/person/_name }}\n{{> contacts/person/_basics }}\n\n{{#if contact/is_current_user}}\n    {{> contacts/_about_own_profile }}\n{{/if}}\n\n{{> contacts/person/_occupations }}\n{{> contacts/_memberships }}\n");
    rapportive.prototype.templates["contacts/person/_basics"] = Handlebars.compile("<table class=\"basics\">\n    <tr>\n        <td>\n            <div class=\"hover profile-image\" >\n                {{#if contact/can_be_edited}}\n                    {{#context_widget \"left: -45px; bottom: 0px\"}}\n                        <table>\n                            <tr>\n                                <td>\n                                    <span id=\"edit\" class=\"action\">Edit</span>\n                                </td>\n                            </tr>\n                        </table>\n                    {{/context_widget}}\n                {{/if}}\n\n                <div class=\"object\">\n                    {{! We include an un-gravatar'd, un-proxied image_url for the contact }}\n                    {{! so that it is easier to log the domain when image errors occur.   }}\n                    <img src=\"{{ contact/image_url_proxied }}\" image_url=\"{{ contact/image_url_raw }}\" />\n                </div>\n\n                <div class=\"info-dialog\" style=\"display: none\" title=\"Changing your profile photo\">\n                    <p>If you would like to change the photo displayed on your Rapportive profile, please\n                        <a href=\"http://en.gravatar.com/site/signup\" target=\"_blank\">sign up at Gravatar</a>\n                        using your email address <b>{{ contact/email }}</b>, and upload\n                        your new photo there.</p>\n\n                    <p>(You need to use <b>{{ contact.email }}</b> and no other email address,\n                        otherwise we won't be able to find the new picture. If you change the picture,\n                        it may take up to 12 hours to take effect.)</p>\n\n                    <p><a href=\"http://en.gravatar.com/site/signup\" target=\"_blank\">Go to Gravatar now</a></p>\n                </div>\n            </div>\n        </td>\n\n        <td>\n            <ul>\n                <li>\n                    {{#if_equal contact/point_type \"email\"}}\n                        <span class=\"email\">{{{ format_email contact/email }}}</span>\n                    {{/if_equal}}\n\n                    {{#if_equal contact/point_type \"twitter\"}}\n                        <span class=\"twitter\">{{{ format_twitter contact/twitter_username }}}</span>\n                    {{/if_equal}}\n                </li>\n\n                <li>\n                    <div class=\"hover location\">\n                        {{#if contact/can_be_edited}}\n                            {{#if contact/location}}\n                                {{#context_widget \"left: -45px; top: -3px\"}}\n                                    <table>\n                                        <tr>\n                                            <td>\n                                                <span id=\"edit\" class=\"action\">Edit</span>\n                                            </td>\n                                        </tr>\n                                    </table>\n                                {{/context_widget}}\n\n                                <div class=\"object\">\n                                    {{{ format_location contact/location }}}\n                                </div>\n                            {{^}}\n                                <div class=\"location\">\n                                    <a id=\"add-location\" class=\"action\" href=\"#\">Add your location...</a>\n                                </div>\n                            {{/if}}\n\n                            <div class=\"location-dialog\" style=\"display: none\" title=\"Edit your location\">\n                                <table class=\"location-inputs\">\n                                    <tr>\n                                        <td style=\"width:295px\">Please enter your town and country:</td>\n                                        <td class=\"border-right spacer geolocation\"></td>\n                                        <td class=\"spacer\"></td>\n                                        <td></td>\n                                    </tr>\n\n                                    <tr>\n                                        <td>\n                                            <form class=\"form\" onsubmit=\"return false;\">\n                                                <div class=\"textfield-wrapper\">\n                                                    <input id=\"location\" name=\"location\" type=\"text\" value=\"{{ contact/location }}\" size=\"30\" />\n                                                </div>\n                                            </form>\n                                        </td>\n                                        <td colspan=\"2\" class=\"or geolocation\">or</td>\n                                        <td class=\"geolocation\">\n                                            <form class=\"form\">\n                                                <div id=\"locate-me\" class=\"locate-me google-button\" style=\"margin-left: 10px\">Find me</div>\n\n                                                {{! Set an relatively positioned anchor for absolute positioning }}\n                                                <span style=\"position: relative\">\n                                                    <span id=\"location-spinner\" class=\"location-spinner\" style=\"display: none\">\n                                                        {{{ spinner }}}\n                                                    </span>\n                                                </span>\n                                            </form>\n                                        </td>\n                                    </tr>\n\n                                    <tr>\n                                        <td>e.g. San Francisco, California, United States</td>\n                                        <td class=\"border-right geolocation\"></td>\n                                        <td></td>\n                                        <td></td>\n                                    </tr>\n\n                                    <tr style=\"height: 1em\">\n                                        <td colspan=\"4\">\n                                            <p class=\"location-error\" style=\"display:none\">\n                                                Sorry, we couldn't find you.  Please enter your location manually.\n                                            </p>\n                                        </td>\n                                    </tr>\n\n                                    <tr style=\"height: 100%\">\n                                        <td colspan=\"4\">\n                                            <div class=\"map_canvas\"></div>\n                                        </td>\n                                    </tr>\n                                </table>\n                            </div>\n                        {{^}}\n                            {{{ format_location contact/location }}}\n                        {{/if}}\n                    </div>\n                </li>\n            </ul>\n        </td>\n    </tr>\n</table>\n");
    rapportive.prototype.templates["contacts/person/_name"] = Handlebars.compile("{{#if contact/can_be_edited}}\n    <h1 class=\"own-profile\">\n        {{#if contact/name}}\n            {{! If we have a non-empty name, show a context widget to the left of the name on hover. }}\n            <div class=\"hover\">\n                {{#context_widget \"left: -45px; top: -1px\"}}\n                    <table>\n                        <tr>\n                            <td>\n                                <span id=\"edit\" class=\"action\">Edit</span>\n                            </td>\n                        </tr>\n                    </table>\n                {{/context_widget}}\n\n                {{{ sidebar_spinner \"name-spinner\" }}}\n                <div class=\"object\">\n                    <div class=\"name\">{{ contact/name }}</div>\n                </div>\n            </div>\n        {{^}}\n            {{! If the name is currently unknown, show clickable placeholder text. }}\n            <div class=\"hover\">\n                {{{ sidebar_spinner \"name-spinner\" }}}\n                <div class=\"object\">\n                    <div class=\"name action\">Add your name...</div>\n                </div>\n            </div>\n        {{/if}}\n\n        <form class=\"form\" style=\"display: none\">\n            <div class=\"textfield-wrapper\">\n                <input id=\"name-input\" name=\"name\" type=\"text\" value=\"{{ contact/name }}\" />\n            </div>\n            <div id=\"name-error\" class=\"edit-error\" style=\"display: none\"></div>\n        </form>\n    </h1>\n{{^}}\n    <h1>{{ contact/name }}</h1>\n{{/if}}\n");
    rapportive.prototype.templates["contacts/person/_occupations"] = Handlebars.compile("<ul class=\"occupations\">\n    {{#contact/occupations}}\n        {{> contacts/person/_occupation }}\n    {{/contact/occupations}}\n\n    {{#if contact/can_be_edited}}\n        {{> contacts/person/_occupation_new }}\n    {{/if}}\n</ul>\n");
    rapportive.prototype.templates["sessions/_login_button"] = Handlebars.compile("<div class=\"google-button\">Log in to Rapportive</div>\n");
}());
rapportive.prototype.bootstrap = function () {
    this.jQuery.isReady = true;

    function sourceCSS(url) {
        var head = document.getElementsByTagName("head")[0];
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.media = "screen";
        link.href = url;
        head.appendChild(link);
    }
    sourceCSS("https://rapportive.com/stylesheets/application.css?9e7bd494");
    sourceCSS("https://rapportive.com/stylesheets/jquery-ui-1.8.custom.css?93660820");
    window.top.rapportiveLogger = new window.RapportiveLogger("https://rapportive.com", "info");
    window.rapportiveLogger = window.top.rapportiveLogger;
};
rapportive.prototype.hide_share_button = false;

rapportive.prototype.user_is_admin = false;

rapportive.prototype.client_version_base = "FirefoxExtension rapportive 1.1.1";

(function () {
    // Only initialize if we're in the #canvas_frame iframe. (Sanity check in case the script
    // got injected into the wrong frame)
    try {
        if (window.top.document.getElementById("canvas_frame").contentWindow === window) {
            window.top.rapportive = new rapportive();
        } else {
            fsLog("Script inserted into frame other than canvas_frame", "gmail", "error");
        }
    }
    // Suppress browser security errors which happen from other iframes like:
    // Permission denied for <https://www.google.com> to get property Window.document from <http://mail.google.com>
    catch (e) {
        fsLog("Exception while initialising Rapportive: " + e, "gmail", "error");
        return;
    }
}());
