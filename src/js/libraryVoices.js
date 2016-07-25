fluid.defaults("ca.alanharnum.libraryVoices", {
    gradeNames: ["fluid.viewComponent"],
    components: {
        textToSpeech: {
            type: "fluid.textToSpeech"
        }
    },
    selectors: {
        stopControl: ".lv-stopControl",
        startControl: ".lv-startControl",
        termsLogCheck: ".lv-termsLogCheck",
        nonEngVoicesCheck: ".lv-nonEngVoicesCheck",
        controlLog: ".lv-controlLog",
        termsLog: ".lv-termsLog"
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
        componentTemplate: "<h2 class=\"lvPage-header\">Controls</h2><p class=\"lv-controlArea\"><a href=\"#\" class=\"lv-linkControl lv-startControl\">Start</a> <a href=\"#\" class=\"lv-stopControl lv-linkControl\">Stop</a> <br> <label>Log Search Terms &amp; Voices: <input type=\"checkbox\" class=\"lv-termsLogCheck lv-checkboxControl\" /></label> <br> <label>Enable non-English Voices to be Selected: <input type=\"checkbox\" class=\"lv-nonEngVoicesCheck lv-checkboxControl\" /></label> <h2 class=\"lvPage-header\">Log</h2></p><p aria-live=\"polite\" class=\"lv-controlLog\"></p><ol aria-live=\"polite\" class=\"lv-termsLog\"></ol>"
    },
    model: {
        socketOpts: {
            url: "ws://45.55.209.67:4571/rtsearches"
        },
        controlOpts: {
            termsLog: false,
            nonEngVoices: false
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
        that.socket.close();
        that.textToSpeech.cancel();
        that.locate("termsLog").empty();
        that.locate("controlLog").text("Shushed!");
};

ca.alanharnum.libraryVoices.startSpeaking = function (that) {
    that.locate("controlLog").text("Library voices are speaking...");
    that.socket = new WebSocket(that.model.socketOpts.url);
    that.socket.onmessage = function (e) {
        var terms = JSON.parse(e.data)[0].terms;
        ca.alanharnum.libraryVoices.speakTerms(that, terms);
    };
};

ca.alanharnum.libraryVoices.speakTerms = function (that, terms) {
    var availableVoices = fluid.copy(that.textToSpeech.getVoices());

    // Filter to English-only voices if option is on
    if(!that.model.controlOpts.nonEngVoices) {
        fluid.remove_if(availableVoices, function (voice) {
            return voice.lang.indexOf("en-") < 0;
        });
    }

    // Get a random voices
    var random = ca.alanharnum.libraryVoices.randomInt(0, availableVoices.length);
    var voiceToUse = availableVoices[random];

    if (that.model.controlOpts.termsLog) {
        ca.alanharnum.libraryVoices.logTerms(that, terms, voiceToUse);
    }

    if(voiceToUse) {
        that.textToSpeech.applier.change("utteranceOpts.lang", voiceToUse.lang);
        that.textToSpeech.applier.change("utteranceOpts.voiceURI", voiceToUse.voiceURI);
        that.textToSpeech.applier.change("utteranceOpts.voice", voiceToUse);
    }

    that.textToSpeech.queueSpeech(terms);
};

ca.alanharnum.libraryVoices.logTerms = function (that, terms, voice) {
    var voiceName = voice ? voice.name : "unknown";
    var voiceLang = voice ? voice.lang : "unknown";
    that.locate("termsLog").append("<li>Search terms <span class=\"lv-searchTerms\">" + terms + "</span> spoken by <span class=\"lv-voiceCredit\">" + voiceName + " ("+ voiceLang + ")" + "</span></li>");
};

ca.alanharnum.libraryVoices.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};
