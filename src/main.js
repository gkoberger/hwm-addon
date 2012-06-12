/* Set up variables */
var worker = false,
    is_ad = false;

/* Send function */
function send(msg, additional) {
    if(worker) {
        worker.postMessage({'type': 'event',
                            'action': msg,
                            'additional': additional});
    }
}

/* Check URL */
function checkURL(url) {
    var match = url.match('(contentinteraction|revenue|playback|potentialbugtracking)/([a-zA-Z]*)');

    if(match) {
        var is_ad_new = is_ad;
        if(match[2] == "request") is_ad_new = true;
        if(match[1] == "revenue" && match[2] == "start") is_ad_new = true;
        if(match[1] == "playback" && match[2] == "start") is_ad_new = false;
        if(match[1] == "potentialbugtracking" && match[2] == "contentplaybackresume") is_ad_new = false;

        if(is_ad_new != is_ad) {
            is_ad = is_ad_new;
            send(is_ad ? 'start_ad' : 'end_ad');
        }

        if(match[2] == "seek") {
            var new_time = url.match('selectedposition=([0-9]*)&');
            send("seek", {'new_time': new_time[1] / 1000});
        }

        if(match[2] == "pause" || match[2] == "centerpause" || match[2] == "play" || match[2] == "centerplay") {
            send(match[2]);
        }
    }
}

/* STARTCHROME */

/* Refresh tab when add-on is installed */
chrome.tabs.query({url:'*://*.huluwithme.com/*'}, function(tabs){
    for(var i = 0; i < tabs.length; i++) {
        console.log(tabs[i]);
        chrome.tabs.reload(tabs[i].id);
    }
});

chrome.extension.onConnect.addListener(function(_worker) {
    if(_worker.name == "hwm") {
        worker = _worker;
    }
});

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
    checkURL(details.url);
}, {urls: ["<all_urls>"]}, ["requestHeaders"]);

/* ENDCHROME */

/* STARTFIREFOX */
var pageMod = require("page-mod"),
    ss = require("simple-storage"),
    {components} = require("chrome"),
    observer = require("observer-service"),
    notifications = require("notifications"),
    data = require("self").data,
    tabs = require("tabs");

exports.main = function() {
    function start_hwm() {
        is_hwm = true;
        observer.add("http-on-examine-response", watch_http);
    }

    function watch_http(subject, data) {
        subject.QueryInterface(components.interfaces.nsIHttpChannel);
        checkURL(subject.URI.spec);
    }

    /* Refresh tab when add-on is installed */
    for each (var tab in tabs) {
        if(tab.url.match(/huluwithme.com\/install/)) {
            tab.attach({
              contentScript:
                'location.href="'+tab.url.replace(/install\//, "")+'"'
            });
        }
    }

    /* Check if the add-on is installed. */
    pageMod.PageMod({
        include: ["http://huluwithme.com/*"],
        contentScriptWhen: "ready",
        contentScriptFile: data.url("check.js")
    });

    /* Add link */
    pageMod.PageMod({
        include: ["http://www.hulu.com/watch/*"],
        contentScriptWhen: "ready",
        contentScriptFile: [data.url('jquery.js'), data.url("socket.io.js"),  data.url("room.js")],
        contentStyleFile: [data.url('style.css')],
        onAttach: function(_worker) {
            if(!worker) {
                is_ad = false;
                start_hwm();
                _worker.on('message', function(message) {
                    if(message.type == 'notify') {
                        var icon = "notification.png";
                        if(['chat', 'pause', 'play', 'seek_forward', 'seek_back', 'commercial'].indexOf(message.event) > -1) icon = "notification-" + message.event + ".png";
                        var n = {
                            text: message.msg,
                            iconURL: data.url(icon)
                        };
                        if(message.title) n.title = message.title;
                        notifications.notify(n);
                    }
                });
                worker = _worker;

                worker.on('detach', function() {
                    worker = false;
                    is_hwm = false;
                    observer.remove("http-on-examine-response", watch_http);
                });
            } else {
                // Send in error! Already watchign something on hulu...
            }
        }
    });
};

/* ENDFIREFOX */
