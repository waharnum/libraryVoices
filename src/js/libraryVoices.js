fluid.defaults("ca.alanharnum.libraryVoices", {
    gradeNames: ["fluid.viewComponent"],
    components: {
        textToSpeech: {
            type: "fluid.textToSpeech"
        }
    },
    selectors: {
        stop: ".pleaseMakeItStop",
        loggingArea: ".loggingArea"
    },
    listeners: {
        "onCreate.appendMarkup": {
            "this": "{that}.container",
            "method": "append",
            "args": "<a href=\"#\" class=\"pleaseMakeItStop\">Stop</a><h2 class=\"loggingArea\"></h2>"
        },
        "onCreate.bindClickToStop": {
            "funcName": "ca.alanharnum.libraryVoices.bindClickToStop",
            "args": ["{that}"]
        },
        "onCreate.openSocket": {
            "funcName": "ca.alanharnum.libraryVoices.openSocket",
            "args": ["{that}"],
            "priority": "after:appendMarkup"
        }
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
        }
    }
});

ca.alanharnum.libraryVoices.bindClickToStop = function (that) {
    that.locate("stop").click(function (e) {
        that.stopSpeaking();
        e.preventDefault();
    });
}

ca.alanharnum.libraryVoices.stopSpeaking = function (that) {
        console.log("stop called")
        that.socket.close();
        that.textToSpeech.cancel();
        that.locate("loggingArea").text("Shushed! Reload page to resume.");
}

ca.alanharnum.libraryVoices.openSocket = function (that) {
    that.socket = new WebSocket(that.model.socketOpts.url);
    that.socket.onmessage = function (e) {
        var terms = JSON.parse(e.data)[0].terms;
        ca.alanharnum.libraryVoices.speakTerms(that, terms);
    };
}

ca.alanharnum.libraryVoices.speakTerms = function (that, terms) {
    var availableVoices = fluid.copy(that.textToSpeech.getVoices());

    // Filter to English-only voices
    fluid.remove_if(availableVoices, function (voice) {
        return voice.lang.indexOf("en-") < 0;
    });

    // Get a random voices
    var random = ca.alanharnum.libraryVoices.openSocket.randomInt(0, availableVoices.length);
    var voiceToUse = availableVoices[random];

    if(voiceToUse) {
        that.textToSpeech.applier.change("utteranceOpts.lang", voiceToUse.lang);
        that.textToSpeech.applier.change("utteranceOpts.voiceURI", voiceToUse.voiceURI);
        that.textToSpeech.applier.change("utteranceOpts.voice", voiceToUse);
    }

    that.textToSpeech.queueSpeech(terms);
}

ca.alanharnum.libraryVoices.openSocket.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
