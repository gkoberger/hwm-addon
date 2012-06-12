(function() {
    var scripts = ['jquery.js', 'socket.io.js', 'room.js'],
        scripts_count = 0;

    function loadScript() {
        if(scripts.length <= scripts_count) loaded();
        var filename = scripts[scripts_count];
        var s = document.createElement('script');
        s.src = chrome.extension.getURL(filename);
        (document.head||document.documentElement).appendChild(s);
        s.onload = function() {
            s.parentNode.removeChild(s);
            scripts_count++;
            loadScript();
        };
    }
    loadScript();
})();

function loaded() {
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
        console.log("relying " + hiddenDiv.innerText);
        port.postMessage(JSON.parse(hiddenDiv.innerText));
    });
}
