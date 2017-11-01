fluid.defaults("ca.alanharnum.libraryVoices", {
    gradeNames: ["fluid.viewComponent"],
    components: {
        textToSpeech: {
            type: "fluid.textToSpeech",
            options: {
                listeners: {
                    "onStop.handleNext": {
                        funcName: "ca.alanharnum.libraryVoices.handleNext",
                        args: ["{libraryVoices}"]
                    }
                }
            }
        }
    },
    selectors: {
        stopControl: ".lvc-stopControl",
        startControl: ".lvc-startControl",
        termsLogCheck: ".lvc-termsLogCheck",
        nonEngVoicesCheck: ".lvc-nonEngVoicesCheck",
        controlLog: ".lvc-controlLog",
        termsLog: ".lvc-termsLog",
        termsLogItem: ".lvc-termsLogItem"
    },
    listeners: {
        "onCreate.appendMarkup": {
            "this": "{that}.container",
            "method": "append",
            "args": "{that}.options.markup.componentTemplate"
        },
        "onCreate.bindClickToStop": {
            "funcName": "ca.alanharnum.libraryVoices.bindClickFunction",
            "args": ["{that}", "stopControl", "{that}.stopSpeaking"],
            "priority": "after:appendMarkup"
        },
        "onCreate.bindClickToStart": {
            "funcName": "ca.alanharnum.libraryVoices.bindClickFunction",
            "args": ["{that}", "startControl", "{that}.startSpeaking"],
            "priority": "after:appendMarkup"
        },
        "onCreate.bindLogVoicesCheckbox": {
            "funcName": "ca.alanharnum.libraryVoices.bindCheckableToModelPath",
            "args": ["{that}", "termsLogCheck", "controlOpts.termsLog"],
            "priority": "after:appendMarkup"
        },
        "onCreate.bindNonEngVoicesCheckbox": {
            "funcName": "ca.alanharnum.libraryVoices.bindCheckableToModelPath",
            "args": ["{that}", "nonEngVoicesCheck", "controlOpts.nonEngVoices"],
            "priority": "after:appendMarkup"
        }
    },
    markup: {
        componentTemplate: "<h2 class=\"lvPage-header\">Controls</h2><p class=\"lv-controlArea\"><a href=\"#\" class=\"lv-linkControl lv-startControl lvc-startControl\">Play <span class=\"lv-startControlIcon material-icons\">play_circle_outline</span></a> <a href=\"#\" class=\"lvc-stopControl lv-stopControl lv-activeControl lv-linkControl\">Pause <span class=\"lv-stopControlIcon material-icons\">pause_circle_outline</span></a> <br> <label>Log Search Terms &amp; Voices: <input type=\"checkbox\" class=\"lvc-termsLogCheck lv-checkboxControl\" /></label> <br> <label>Enable Non-English Voices: <input type=\"checkbox\" class=\"lvc-nonEngVoicesCheck lv-checkboxControl\" /></label> <h2 class=\"lvPage-header\">Log</h2></p><p aria-live=\"polite\" class=\"lvc-controlLog\">Shushed!</p><ul aria-live=\"polite\" class=\"lvc-termsLog\"></ul>"
    },
    model: {
        socketOpts: {
            url: "ws://138.197.129.181:4571/rtsearches"
        },
        controlOpts: {
            termsLog: false,
            nonEngVoices: false
        },
        logOpts: {
            maxLength: 10
        },
        speechQueue: [
            // {terms: "", voice: voice}
        ],
        currentlySpeaking: null
    },
    modelListeners: {
        speechQueue: {
            funcName: "ca.alanharnum.libraryVoices.handleQueue",
            args: ["{that}"]
        },
        currentlySpeaking: {
            funcName: "ca.alanharnum.libraryVoices.handleCurrentlySpeaking",
            args: ["{that}"]
        }
    },
    invokers: {
        "stopSpeaking": {
            funcName: "ca.alanharnum.libraryVoices.stopSpeaking",
            args: "{that}"
        },
        "startSpeaking": {
            funcName: "ca.alanharnum.libraryVoices.startSpeaking",
            args: "{that}"
        }
    }
});

ca.alanharnum.libraryVoices.bindClickFunction = function (that, controlSelector, controlInvoker) {
    that.locate(controlSelector).click(function (e) {
        controlInvoker();
        e.preventDefault();
    });
};

ca.alanharnum.libraryVoices.bindCheckableToModelPath = function (that, checkableSelector, modelPath) {
    that.locate(checkableSelector).change(function (e) {
        var isChecked = $(this).prop("checked");
        that.applier.change(modelPath, isChecked);
        e.preventDefault();
    });
};

ca.alanharnum.libraryVoices.stopSpeaking = function (that) {
        that.locate("startControl").removeClass("lv-activeControl");
        that.locate("stopControl").addClass("lv-activeControl");
        // Only close the socket if it exists
        if(that.socket) {
            that.socket.close();
        }
        that.textToSpeech.cancel();
        that.applier.change("speechQueue", []);
        that.applier.change("currentlySpeaking", null);
        that.locate("controlLog").text("Shushed!");
};

ca.alanharnum.libraryVoices.startSpeaking = function (that) {
    that.locate("startControl").addClass("lv-activeControl");
    that.locate("stopControl").removeClass("lv-activeControl");
    that.locate("controlLog").text("Library voices are speaking...");
    // Create the socket if it doesn't exist yet, or if it's closing/closed
    if(!that.socket || that.socket.readyState >= 2) {
        that.socket = new WebSocket(that.model.socketOpts.url);
    }
    that.socket.onmessage = function (e) {
        var terms = JSON.parse(e.data)[0].terms;
        ca.alanharnum.libraryVoices.handleSocketEvent(that, terms);
    };
};

ca.alanharnum.libraryVoices.handleSocketEvent = function (that, terms) {
    var availableVoices = fluid.copy(that.textToSpeech.getVoices());

    // Filter to English-only voices if option is on
    if(!that.model.controlOpts.nonEngVoices) {
        fluid.remove_if(availableVoices, function (voice) {
            return voice.lang.indexOf("en-") < 0;
        });
    }

    // console.log(availableVoices);
    // Get a random voices
    var random = ca.alanharnum.libraryVoices.randomInt(0, availableVoices.length);
    var voiceToUse = availableVoices[random];

    var termSpeech = {
        terms: terms,
        voice: voiceToUse
    };

    var speechQueue = fluid.copy(that.model.speechQueue);
    speechQueue.push(termSpeech);

    that.applier.change("speechQueue", speechQueue);

    // console.log(that.model.speechQueue);
};

ca.alanharnum.libraryVoices.speakSearchTerms = function (that, terms, voiceToUse) {
    // console.log("speakSearchTerms");
    ca.alanharnum.libraryVoices.logTerms(that, terms, voiceToUse);
    // console.log(voiceToUse);

    if(voiceToUse) {
        that.textToSpeech.queueSpeech(terms, false, {
            lang: voiceToUse.lang,
            voice: voiceToUse
        });
    } else {
        that.textToSpeech.queueSpeech(terms);
    }

};

ca.alanharnum.libraryVoices.handleQueue = function (that) {
    // console.log(that);
    // console.log("handleQueue");
    // console.log(that.model.speechQueue);
    // console.log(that.model.speechQueue.length, that.model.currentlySpeaking);
    if(that.model.speechQueue.length > 0 && ! that.model.currentlySpeaking) {
        // console.log("You should queue");
        ca.alanharnum.libraryVoices.handleCurrentlySpeaking(that);
    }

};

ca.alanharnum.libraryVoices.handleNext = function (that) {
    // console.log("handleNext");
    // console.log(that);
    that.applier.change("currentlySpeaking", null);
};

ca.alanharnum.libraryVoices.handleCurrentlySpeaking = function (that) {
    // console.log("handleCurrentlySpeaking");
    var currentlySpeaking = that.model.currentlySpeaking;
    if(currentlySpeaking) {
        // console.log("you should speak");
        ca.alanharnum.libraryVoices.speakSearchTerms(that, that.model.currentlySpeaking.terms, that.model.currentlySpeaking.voice);
    } else {
        var speakNext = that.model.speechQueue.pop();
        that.applier.change("currentlySpeaking", speakNext);
    }
};

ca.alanharnum.libraryVoices.logTerms = function (that, terms, voice) {
    if (!that.model.controlOpts.termsLog) {
        return;
    }
    var voiceName = voice ? voice.name : "unknown";
    var voiceLang = voice ? voice.lang : "unknown";
    that.locate("termsLog").prepend("<li class=\"lv-termsLogItem lvc-termsLogItem\"><div class=\"lv-voiceCredit\">" + voiceName + " ("+ voiceLang + "): " + " </div><div class=\"lv-searchTerms\">" + terms + "</div></li>");
    var firstTermsLogItem = that.locate("termsLogItem").first();
    firstTermsLogItem.animate({"font-size": "150%"}, 500).animate({"font-size": "100%"}, 500);
    var termsLogItems = that.locate("termsLogItem");
    if(termsLogItems.length > that.model.logOpts.maxLength) {
        termsLogItems.last().remove();
    }
};

ca.alanharnum.libraryVoices.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};
