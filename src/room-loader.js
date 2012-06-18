(function() {
var loadScripts = function(scripts) {
    var scripts_count = 0;

    function loadScript() {
        if(scripts.length <= scripts_count) {
            loadedAll();
            return;
        }
        var filename = scripts[scripts_count];
        var s = document.createElement('script');
        s.src = filename;
        (document.head||document.documentElement).appendChild(s);
        s.onload = function() {
            s.parentNode.removeChild(s);
            scripts_count++;
            loadScript();
        };
    }
    loadScript();
}

/* STARTCHROME */
var scripts = [chrome.extension.getURL('jquery.js'),
               chrome.extension.getURL('socket.io.js'),
               chrome.extension.getURL('room.js')];

loadScripts(scripts);

function loadedAll() {
    var port = chrome.extension.connect({name: "hwm"});

    var sendDown = document.createEvent('Event');
    sendDown.initEvent('sendDown', true, true);

    var hiddenDiv = document.getElementById('chromeTransport');
    port.onMessage.addListener(function(msg) {
          // Send it to the script!
          hiddenDiv.innerText = JSON.stringify(msg);
          hiddenDiv.dispatchEvent(sendDown);
    });

    hiddenDiv.addEventListener('sendUp', function() {
        port.postMessage(JSON.parse(hiddenDiv.innerText));
    });
}
/* ENDCHROME */

/* STARTFIREFOX */
self.on('message', function(d) {
    if(d.type == 'urls') {
       loadScripts(d.urls);
    }
});

function loadedAll() {
    var sendDown = document.createEvent('Event');
    sendDown.initEvent('sendDown', true, true);

    var hiddenDiv = document.getElementById('chromeTransport');
    self.on('message', function(msg) {
          // Send it to the script!
          // NOTE! this is different; chrome uses innerText
          hiddenDiv.textContent = JSON.stringify(msg);
          hiddenDiv.dispatchEvent(sendDown);
    });

    hiddenDiv.addEventListener('sendUp', function() {
        self.postMessage(JSON.parse(hiddenDiv.textContent));
    });
}
/* ENDFIREFOX */
})();
