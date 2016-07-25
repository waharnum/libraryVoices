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
        loggingArea: ".lv-loggingArea"
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
        "onCreate.openSocket": {
            "funcName": "ca.alanharnum.libraryVoices.startSpeaking",
            "args": ["{that}"],
            "priority": "after:appendMarkup"
        }
    },
    markup: {
        componentTemplate: "<p class=\"lv-controlArea\"><a href=\"#\" class=\"lv-control lv-startControl\">Start</a> <a href=\"#\" class=\"lv-stopControl lv-control\">Stop</a></p><p class=\"lv-loggingArea\"></p>"
    },
    model: {
        socketOpts: {
            url: "ws://45.55.209.67:4571/rtsearches"
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

ca.alanharnum.libraryVoices.stopSpeaking = function (that) {
        console.log("stop called");
        that.socket.close();
        that.textToSpeech.cancel();
        that.locate("loggingArea").text("Shushed!");
};

ca.alanharnum.libraryVoices.startSpeaking = function (that) {
    console.log("start called");
    that.locate("loggingArea").text("Library voices are speaking...");
    that.socket = new WebSocket(that.model.socketOpts.url);
    that.socket.onmessage = function (e) {
        var terms = JSON.parse(e.data)[0].terms;
        ca.alanharnum.libraryVoices.speakTerms(that, terms);
    };
};

ca.alanharnum.libraryVoices.speakTerms = function (that, terms) {
    var availableVoices = fluid.copy(that.textToSpeech.getVoices());

    // Filter to English-only voices
    fluid.remove_if(availableVoices, function (voice) {
        return voice.lang.indexOf("en-") < 0;
    });

    // Get a random voices
    var random = ca.alanharnum.libraryVoices.randomInt(0, availableVoices.length);
    var voiceToUse = availableVoices[random];

    if(voiceToUse) {
        that.textToSpeech.applier.change("utteranceOpts.lang", voiceToUse.lang);
        that.textToSpeech.applier.change("utteranceOpts.voiceURI", voiceToUse.voiceURI);
        that.textToSpeech.applier.change("utteranceOpts.voice", voiceToUse);
    }

    that.textToSpeech.queueSpeech(terms);
};

ca.alanharnum.libraryVoices.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
};
