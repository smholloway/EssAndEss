(function () {
    var rapportive_server = "https://rapportive.com";
    var rapportive_application_url = "https://rapportive.com/load/application?client=FirefoxExtension+rapportive+1.1.1";
    var server_log_level = "info";

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
    }
    try {
        function identifyFrameCode(scriptID) {
            return "(function () {\n" + "   try {\n" + "       var iframes = window.top.document.getElementsByTagName('iframe');\n" + "       for (var i = 0; i < iframes.length; i++) {\n" + "           try {\n" + "               if (iframes[i].id && (iframes[i].contentWindow == window)) {\n" + "                   var frameID = iframes[i].id + '_document';\n" + "                   var element = iframes[i].contentDocument.documentElement;\n" + "                   if (!element.id) element.id = frameID;\n" + "               }\n" + "           } catch (e) {}\n" + "       }\n" + "   } catch (e) {}\n" + "   var self = document.getElementById('" + scriptID + "');\n" + "   if (self) self.parentNode.removeChild(self);\n" + "}());\n";
        }

        function injectFrameCode() {
            var head = document.getElementsByTagName("head")[0] || document.documentElement;
            var scriptID = "identifyFrameCode" + (new Date()).getTime();
            var script = document.createElement("script");
            script.id = scriptID;
            script.type = "text/javascript";
            script.text = identifyFrameCode(scriptID);
            head.insertBefore(script, head.firstChild);
        }

        function waitUntilGmailReady(condition, continuation) {
            delayedConditionalExecute({
                poll_delay: 1000,
                max_poll_attempts: 200,
                retry_message: null,
                failure_message: "Gmail didn't finish loading",
                condition: condition,
                continuation: continuation
            });
        }

        function findCanvasFrame(doc, continuation) {
            delayedConditionalExecute({
                poll_delay: 1000,
                retry_message: null,
                failure_message: 'Document does not contain a canvas frame',
                log_level_on_failure: 'debug',
                condition: function () {
                    if (doc.getElementById("canvas_frame_document") !== null) {
                        waitUntilGmailReady(function () {
                            return doc.getElementById('guser');
                        }, function () {
                            fsLog("Loading Rapportive... (triggered inside canvas frame)");
                            continuation(doc);
                        });
                        return true;
                    }
                    var canvas_frame = doc.getElementById("canvas_frame");
                    if (canvas_frame) {
                        waitUntilGmailReady(function () {
                            return canvas_frame.contentDocument.getElementById('guser');
                        }, function () {
                            fsLog("Loading Rapportive... (triggered in top window)");
                            continuation(canvas_frame.contentDocument);
                        });
                        return true;
                    }
                    return false;
                }
            });
        }

        function injectRapportive(doc) {
            delayedConditionalExecute({
                poll_delay: 1000,
                max_poll_attempts: 200,
                retry_message: 'Waiting for Rapportive to load',
                failure_message: 'Rapportive application injected, but failed to initialize',
                condition: function () {
                    if (doc.getElementById('rapportive-status')) {
                        return true;
                    } else {
                        createRapportiveScriptElement(doc);
                        return false;
                    }
                }
            });
        }

        function createRapportiveScriptElement(doc) {
            var head = doc.getElementsByTagName("head")[0],
                id = "rapportiveApplication";
            if (head) {
                var script = doc.getElementById(id);
                if (script) {
                    fsLog("Rapportive script is already present");
                } else {
                    fsLog("Loading Rapportive...");
                    script = doc.createElement("script");
                    script.type = "text/javascript";
                    script.src = rapportive_application_url;
                    script.setAttribute("id", id);
                    head.appendChild(script);
                }
            }
        }
        fsLog('Bootstrapping Rapportive on ' + document.location.href);
        var rapportiveLogger = new RapportiveLogger(rapportive_server, server_log_level);
        var doc;
        try {
            doc = unsafeWindow.top.document;
        } catch (securityException) {}
        if (doc) {
            findCanvasFrame(doc, injectRapportive);
        }
    } catch (e) {
        fsLog("Exception in firefox extension: " + e, "gmail", "fatal");
    }
}());