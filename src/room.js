(function() {
var hulu_show_id = location.href.match(/watch\/([0-9]*)/)[1],
    hwm_hash_current = location.hash.match(/#hwm-([\w]*)/),
    random_hash = randomString(),
    hwm_hash = (hwm_hash_current) ? hwm_hash_current[1] : random_hash,
    hwm_link = "http://huluwith.me/i/" + hwm_hash + "-" + hulu_show_id,
    player = false,
    in_commercial = false,
    in_ad_pool = 0,
    socket = false,
    started = false,
    is_paused = false,
    $commercial, $commerical_overlay, pause, status_text, status_action, status_type,
    is_anon = true,
    user = {'name': "Anon " + Math.round(Math.random() * 1000),
            'id': (Math.round(Math.random() * 1000) +"-"+ (new Date().getTime() + "").substr(-5))},
    user_other = {'name': 'The other person', 'id': false};


var saved_name = window.localStorage.getItem("hwm-name");
if(saved_name) {
    is_anon = false;
    user['name'] = saved_name;
}

$.noConflict();

/* STARTCHROME */
var sendUp = document.createEvent('Event');
sendUp.initEvent('sendUp', true, true);

var $transport = jQuery('<div>', {'id': 'chromeTransport'});
jQuery('body').append($transport);
$transport.bind('sendDown', function() {
    var r = JSON.parse(jQuery(this).text());
    if(r.type == "event") {
        jQuery('body').trigger('status_change', [r.action, r.additional]);
    }
});
/* ENDCHROME */

/* STARTFIREFOX */

self.on('message', function(r) {
    if(r.type == "event") {
        jQuery('body').trigger('status_change', [r.action, r.additional]);
    }
});
/* ENDFIREFOX */

jQuery(document).ready(function() {
    setupHWM();
    if(hwm_hash_current) {
        // The user clicked a link to get here.
        startHWM();
    }
});

// setup is run instantly, and adds the icons and panels.
function setupHWM() {
    /* STARTCHROME */
    player = $('player');
    /* ENDCHROME */
    /* STARTFIREFOX */
    player = unsafeWindow.$('player').wrappedJSObject;
    /* ENDFIREFOX */

    // Create commercial overlay box
    $commercial = jQuery('<div>', {'id': 'commercial'});
    $commercial.append(jQuery('<strong>', {'text': 'Other person is still in the commercial'}));
    $commercial.append(jQuery('<div>', {'text': "Your video will start when they're done."}));
    $commercial_overlay = jQuery('<div>', {'id': 'commercial-overlay'});
    jQuery('#player-container').append($commercial_overlay);
    jQuery('#player-container').append($commercial);
    $commercial_overlay.hide();
    $commercial.hide();

    /* Add HWM tab */
    jQuery('#watch-title-top').append(jQuery('#description-switch')); // Make the options box wider
    var $tab_a = jQuery('<a>', {'class': 'toggle-w-hwm ' + (hwm_hash_current ? 'on' : ''), 'href': '#', 'id': 'hwm-tab'}),
        $tab_div = jQuery('<div>', {'class': 'link-description-damnfirefox36'}),
        $tab_span = jQuery('<span>'),
        $tab_desc = jQuery('<div>', {'class': 'hwm-tab-desc link-description', 'html': '<strong>hulu</strong>withme'});


    jQuery('#description-switch').append($tab_a);
    $tab_a.append($tab_div);
    $tab_div.append($tab_span);
    $tab_div.append($tab_desc);

    $tab_a.click(function(e) {
        e.preventDefault();
        if(hwm_hash_current) {
            alert('Huluwithme is already running!');
            return;
        }

        var $body = jQuery('body');
        jQuery('.hwm_new').remove();
        $hwm_new_overlay = jQuery('<div>', {'class': 'hwm_new hwm_new_overlay'});
        $hwm_new_modal = jQuery('<div>', {'class': 'hwm_new hwm_new_modal'});
        $body.append($hwm_new_overlay);
        $body.append($hwm_new_modal);

        var $hwm_new_input = jQuery('<input>', {'value': hwm_link});
        var $hwm_new_close = jQuery('<a>', {'text': 'cancel', 'class': 'close', 'href': '#'});

        $hwm_new_modal.append(jQuery('<div>', {'id': 'hwm-logo'}));
        $hwm_new_modal.append(jQuery('<p>', {'text': 'Watch your favorite show with your favorite person'}));
        $hwm_new_modal.append(jQuery('<label>', {'text': 'Send this link to the person you want to watch with:'}));
        $hwm_new_modal.append($hwm_new_input);
        $hwm_new_modal.append(jQuery('<p>', {'text': 'Your video will start automatically from the beginning when they click the link.'}));
        $hwm_new_modal.append($hwm_new_close);

        function close_modal() {
            $hwm_new_overlay.remove();
            $hwm_new_modal.remove();
            return false;
        }
        $hwm_new_close.click(close_modal);
        $hwm_new_overlay.click(close_modal);

        player.pauseEverything();

        checkForConnection();
    });

    jQuery('body').bind('status_change', function(e, status, additional) {
        var status_send = false;
        if(status == "play" || status == "centerplay") {
            status_send = "play";
            notify("play", user);
        } else if (status == "pause" || status == "centerpause") {
            status_send = "pause";
            notify("pause", user);
        } else if (status == "seek") {
            status_send = "seek";
            additional['old_time'] = getPlayerTime();
            notify("seek", user, additional);
        } else if (status == "start_ad" || status == "end_ad") {
            status_send = status;
            ad_status = status;

            if(ad_status == "end_ad" && other_in_ad) {
                $commercial.show();
                $commercial_overlay.show();
                player.pauseEverything();
                notify('commercial', user_other);
            }
        }

        if(status_send) {
            emit_event(status_send, additional);
        }
    });
}

function checkForConnection() {
    postMessage({'type': 'starting!'}); // Just to trigger start_hwm in main.js

    socket = io.connect('http://localhost:8008');

    socket.on('connect', function() {
        socket.emit('join', {'room': hwm_hash});
    });
    socket.on('event', function(data) {
        if(data.type == "join") {
            window.location.href = hwm_link;
        }
    });
}

    var ad_status = false,
        other_in_ad = false;
    function startHWM() {
        var $sidebar = jQuery('<div>', {'id': 'sidebar'}),
            $sb_in = jQuery('<div>', {'id': 'sidebar-in'}),
            $sb_out = jQuery('<div>', {'id': 'sidebar-out'}),
            $sb_ul = jQuery('<ul>', {'id': 'sidebar-ul'}),
            $sb_ta = jQuery('<textarea>', {'placeholder': 'Type here to chat while you watch! Hit <enter> to send.', 'css': {'border': '0 none', 'border-top': '1px solid #ccc'}}),
            $sb_who = jQuery('<a>', {'href': '#', 'id': 'chat-who', 'text': 'You are ', 'title': 'Edit name'}),
            $sb_name = jQuery('<strong>', {'id': 'chat-name', 'text': user['name']});

        var $ch = jQuery('<div>', {'id': 'chat-head'}),
            $ch_strong = jQuery('<strong>', {'text': 'hulu'})
            $ch_rest = jQuery('<span>', {'text': 'withme'});

        $ch.append($ch_strong).append($ch_rest);
        $sidebar.append($ch);
        $sidebar.append($sb_who);
        $sb_who.append($sb_name);

        $sb_who.click(changeName);

        var $li = jQuery('<li>', {'text': 'Huluwithme is still in early beta. Please report absolutely any problems you find to gkoberger@gmail.com', 'class': 'beta'});
        $sb_ul.append($li);


        // TODO: Refreshing should take us back to the show
        unsafeWindow.location.hash = "hwm-" + hwm_hash;

            socket = io.connect('http://localhost:8008');

            socket.on('connect', function() {
                socket.emit('join', {'room': hwm_hash, 'who': user});
            });

            socket.on('join_status', function(data) {
                if(data.result) {
                    connectionSuccessful();
                    emit_event(ad_status);
                    cl('You joined the video');
                } else {
                    alert("Uh oh, we couldn't let you join the Huluwithme room you were invited to. " + data.reason + "\n\nYou can still watch the video, though!");
                }
            });

            function connectionSuccessful() {
                jQuery('body').prepend($sidebar);
                $sidebar.append($sb_in);
                $sb_in.append($sb_out);
                $sb_out.append($sb_ul);
                $sidebar.append($sb_ta);

                jQuery('#sidebar textarea').keydown(function(e) {
                    if(e.keyCode == 13) {
                        if(is_anon) {
                            changeName();
                        }

                        socket.emit('chat', {'room': hwm_hash, 'msg': jQuery(this).val(), 'who': user});
                        jQuery(this).val("");
                        return false;
                    }
                });

                // Disable popout
                jQuery('#description-contents img').each(function() {
                    if(jQuery(this).attr('src').match('popout')) {
                        jQuery(this).closest('a').attr('onclick', 'asdf').click(function() {
                            alert("Sorry, the popout player doesn't work with Huluwithme");
                            return false;
                        });
                        return false;
                    }
                });

                // Stop right there!
                unsafeWindow.onbeforeunload = function() {
                    if(hwm_hash_current) {
                        var text = "Leaving this page will end your Huluwithme session. You'll have to start over if you want to keep watching.";
                        if(jQuery.browser.mozilla) {
                            alert(text);
                            return false;
                        } else {
                            return text;
                        }
                    }
                };
                socket.on('chat', function(data) {
                    user_other = data.who;
                    chat(data.who, data.msg);
                });

                socket.on('event', function(data) {
                    user_other = data.who;
                    if(data.type == "pause") {
                        player.pauseEverything();
                        notify("pause", data.who);
                    }
                    if(data.type == "play") {
                        player.seekAndPlay(data.time);
                        notify("play", data.who);
                    }
                    if(data.type == "seek") {
                        if(is_paused) {
                            // TODO: This probably effs up commercials
                            player.seekAndPause(data.new_time);
                        } else {
                            player.seekAndPlay(data.new_time);
                        }
                        notify("seek", data.who, {'old_time': data.old_time, 'new_time': data.new_time});
                    }
                    if(data.type == "join") {
                        cl(data.who['name'] + ' joined');

                        // Send commercial information to other person.
                        emit_event(ad_status);
                        started = true;
                        emit_event('started');
                    }
                    if(data.type == "started") {
                        started = true;
                    }
                    if(data.type == "name_change") {
                        cl(data.old + " is now known as " + data.new)
                    }
                    if(data.type == "disconnect") {
                        if(started) {
                            alert('The other person disconnected! You can continue watching, but you are no longer synced.');
                            player.pauseEverything();
                            $sidebar.remove();
                            $commercial.remove();
                            $commercial_overlay.remove();
                            jQuery('.toggle-w-hwm').removeClass('on');
                            hwm_hash_current = false;
                            unsafeWindow.location.hash = '';
                            hwm_hash = randomString();
                        }
                    }
                    if(data.type == "start_ad") {
                        cl("Ad break");
                        other_in_ad = true;

                        // Pause if other person starts ad!
                        watchForAd(data);
                    } else if(data.type == "end_ad") {
                        other_in_ad = false;
                        $commercial.hide();
                        $commercial_overlay.hide();
                        if(ad_status == "end_ad") {
                            player.seekAndPlay(data.time);
                        }
                    }
                });
            }
    }

function cl(m) {
    var $li = jQuery('<li>', {'text': m, 'class': 'event'});
    jQuery('#sidebar-ul').append($li);
    jQuery('#sidebar-out').scrollTop(1000000);
}

function is_user(who) {
    return who['id'] == user['id'];
}

function notify(event, who, additional) {
    var msg = false, title = false;
    var is_me = is_user(who);
    var name = is_me ? "You" : who['name'];

    if(event == "pause") {
        title = "Paused";
        msg = name + " paused the video";
        cl('❙❙ ' + name + ' paused the video');
        is_paused = true;
    }
    if(event == "play") {
        title = "Playing";
        msg = name + " played the video";
        cl('▶ ' + name + ' played the video');
        is_paused = false;
    }
    if(event == "commercial") {
        title = name + " is still in commercials";
        msg = "The video will play automatically when they're done.";
    }
    if(event == "seek") {
        var current_time = additional.old_time;
        var difference = Math.round(Math.abs(current_time - additional.new_time));

        if(current_time > additional.new_time) {
            title = "Skipping Back";
            msg = name + " skipped back " + difference + " seconds";
            event = 'seek_back';
            symbol = '« ';
        } else {
            title = "Skipping Ahead";
            msg = name + " skipped forward " + difference + " seconds";
            event = 'seek_forward';
            symbol = '» ';
        }
        cl(symbol + msg);

    }
    if(msg && !is_me) {
        postMessage({'type': 'notify', 'event': event, 'title': title, 'msg': msg});
    }
}

function postMessage(m) {
        /* STARTFIREFOX */
        self.postMessage(m);
        /* ENDFIREFOX */
        /* STARTCHROME */
        $transport.text(JSON.stringify(m));
        $transport[0].dispatchEvent(sendUp);
        /* ENDCHROME */
}

function chat(who, m) {
    var $li = jQuery('<li>');
    var $strong = jQuery('<strong>', {'text': who['name'] + ": "});
    var $span = jQuery('<span>', {'text': m});

    $li.append($strong);
    $li.append($span);

    jQuery('#sidebar-ul').append($li);
    jQuery('#sidebar-out').scrollTop(1000000);

    if(who['id'] != user['id'] && ! jQuery(document.activeElement).is('#sidebar textarea:focus')) {
        postMessage({'type': 'notify', 'event': 'chat', 'title': who['name'] + ' said:', 'msg': m});
    }
}

function emit_event(status, stuff) {
    if(!socket) return;
    if(!stuff) stuff = {};
    var time = false;
    if(player) {
        time = getPlayerTime();
    }
    stuff['type'] = status;
    stuff['room'] = hwm_hash;
    stuff['time'] = time;
    stuff['started'] = started;
    stuff['who'] = user;
    socket.emit('event', stuff);
}

function getPlayerTime() {
    if(!player) return 0;
    return player.getCurrentTime() / 1000;
}

function changeName() {
    var new_name = prompt("What do you want to use as a username?", user['name']);
    if(new_name) {
        emit_event('name_change', {'old': user['name'], 'new': new_name});
        user['name'] = new_name;
        unsafeWindow.localStorage['hwm-name'] = new_name;
        jQuery('#chat-name').text(new_name);
    }
    is_anon = false;
    return false;
}

function watchForAd(data) {
    console.log("Watching for ad...");
    if(ad_status == "start_ad") return;
    var time = getPlayerTime()
    if(time > data.time + 1) { // Give it 1 second leway
        player.seekAndPause(data.time);
        $commercial.show();
        $commercial_overlay.show();
        notify('commercial', data.who)
    } else {
        setTimeout(function() { watchForAd(data); }, 1000);
    }
}

function randomString() {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
	var string_length = 5;
	var rs = '';
	for (var i=0; i<string_length; i++) {
		var rnum = Math.floor(Math.random() * chars.length);
		rs += chars.substring(rnum,rnum+1);
	}
	return rs;
}

})();
