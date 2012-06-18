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

        console.log(url);
    if(match) {
        var is_ad_new = is_ad;
        if(match[2] == "request") is_ad_new = true;
        if(match[1] == "revenue" && match[2] == "start") is_ad_new = true;
        if(match[1] == "playback" && match[2] == "start") is_ad_new = false;
        if(match[1] == "potentialbugtracking" && match[2] == "contentplaybackresume") is_ad_new = false;

        //if(is_ad_new != is_ad) {
            //console.log('changing ad to ' + is_ad_new);
            is_ad = is_ad_new;
            send(is_ad ? 'start_ad' : 'end_ad');
        //}

        if(match[2] == "seek") {
            var new_time = url.match('selectedposition=([0-9]*)&');
            send("seek", {'new_time': new_time[1] / 1000});
        }

        if(match[1] == "contentinteraction" && (match[2] == "pause" || match[2] == "centerpause" || match[2] == "play" || match[2] == "centerplay")) {
            send(match[2]);
        }
    }
}

function showNotification(message) {
    var icon = "notification.png";
    if(['chat', 'pause', 'play', 'seek_forward', 'seek_back', 'commercial'].indexOf(message.event) > -1) icon = "notification-" + message.event + ".png";

    /* STARTFIREFOX */
    var n = {
        title: message.title,
        text: message.msg,
        iconURL: data.url('imgs/' + icon)
    };
    notifications.notify(n);
    /* ENDFIREFOX */

    /* STARTCHROME */
    var notification = webkitNotifications.createNotification(
        'imgs/' + icon,  // icon url - can be relative
        message.title,  // notification title
        message.msg  // notification body text
    );

    notification.show();
    setTimeout(function() {
        notification.cancel();
    }, 5000);
    /* ENDCHROME */
}

/* STARTCHROME */

/* Refresh tab when add-on is installed */
chrome.tabs.query({url:'*://*.huluwith.me/*'}, function(tabs){
    for(var i = 0; i < tabs.length; i++) {
        if(tabs[i].url.match(/huluwith.me\/[a-zA-Z0-9]{5}/)) {
            chrome.tabs.reload(tabs[i].id);
        }
    }
});

chrome.extension.onConnect.addListener(function(_worker) {
    // TODO: Check if worker already exists...
    if(_worker.name == "hwm") {
        is_ad = false;
        worker = _worker;
        worker.onMessage.addListener(function(message) {
            if(message.type == 'notify') {
                showNotification(message);
            }
        });
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
        if(tab.url.match(/huluwith.me/)) {
            tab.attach({
              contentScript:
                'unsafeWindow.installSuccess();'
            });
        }
    }

    /* Check if the add-on is installed. */
    pageMod.PageMod({
        include: ["http://huluwith.me/*"],
        contentScriptWhen: "ready",
        contentScriptFile: data.url("check.js")
    });

    /* Add link */
    pageMod.PageMod({
        include: ["http://www.hulu.com/watch/*"],
        contentScriptWhen: "ready",
        contentScriptFile: [data.url("room-loader.js")],
        contentStyleFile: [data.url('style.css')],
        onAttach: function(_worker) {
            _worker.postMessage({'type': 'urls', 'urls': [data.url('jquery.js'), data.url('socket.io.js'), data.url('room.js')]});
            if(!worker) {
                is_ad = false;
                worker = _worker;
                start_hwm();
                worker.on('message', function(message) {
                    if(message.type == 'notify') {
                        showNotification(message);
                    }
                });

                // TODO: Add this to chrome?
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
