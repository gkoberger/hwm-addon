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
