(function() {
    var hulu_show_id = location.href.match(/watch\/([0-9]*)/)[1],
        hwm_hash_current = location.hash.match(/#hwm-([\w]*)/),
        random_hash = randomString(),
        hwm_hash = (hwm_hash_current) ? hwm_hash_current[1] : random_hash,
        hwm_link = "http://huluwith.me/" + hwm_hash + "-" + hulu_show_id,
        player_raw = false,
        allow_adchange = false,
        socket = false,
        winchrome = false,
        window_focus = true,
        started = false,
        is_paused = false,
        $commercial, $commerical_overlay, pause, status_text, status_action, status_type,
        $hwm_new_overlay, $hwm_new_modal, $sidebar, $sb_ul, $sb_out,
        connected = false, // Don't rerun connectionSuccessful

        is_anon = true,
        user = {'name': "Anon " + Math.round(Math.random() * 1000),
                'id': (Math.round(Math.random() * 1000) +"-"+ (new Date().getTime() + "").substr(-5))},
        user_other = {'name': 'The other person', 'id': false},

        ad_status = "end_ad",
        other_in_ad = false;


    $.noConflict();

    var saved_name = window.localStorage.getItem("hwm-name");
    if(saved_name) {
        is_anon = false;
        user['name'] = saved_name;
    } else {
        var user_hulu = jQuery('#user-greeting').text();
        if(user_hulu != "User") {
            user['name'] = user_hulu;
            window.localStorage['hwm-name'] = user_hulu;
            is_anon = false;
        }
    }

    jQuery(window).focus(function() {
        window_focus = true;
    }).blur(function() {
        window_focus = false;
    });

    // We have to do special stuff in windows+chrome
    winchrome = jQuery.browser.webkit && navigator.appVersion.indexOf("Win")!=-1;

    /* Communicate with the add-on */
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

    jQuery(document).ready(function() {
        setupHWM();
        if(hwm_hash_current) {
            // The user clicked a link to get here.
            startHWM();
        }
    });

    // setup is run instantly, and adds the icons and panels.
    function setupHWM() {
        player_raw = $('player');

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
            if(connected) {
                alert('Huluwithme is already running!');
                return;
            }

            $tab_a.addClass('on');

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
            $hwm_new_modal.append(jQuery('<p>', {'text': 'Your video will start automatically from the beginning when they click the link. We\'ll help them get started if they don\'t have the add-on installed yet.'}));
            $hwm_new_modal.append($hwm_new_close);

            $hwm_new_close.click(close_modal);
            $hwm_new_overlay.click(close_modal);

            jQuery('#player').css('visibility', 'hidden');

            $hwm_new_input.focus();
            $hwm_new_input[0].select();

            $hwm_new_input.focus(function() {
                $hwm_new_input[0].select();
            });

            player.pauseEverything(false, false, 5);

            startHWM();
        });

        jQuery('body').bind('status_change', function(e, status, additional) {
            var status_send = false;
            if(ad_status != "start_ad"  && (status == "play" || status == "centerplay")) {
                status_send = "play";
                notify("play", user);
                if(other_in_ad) {
                    player.pauseEverything();
                    alert("The other person is still in a commercial.\n\nThe video will play automatically when they're done.");
                    status_send = false;
                }
            } else if (ad_status != "start_ad"  && (status == "pause" || status == "centerpause")) {
                status_send = "pause";
                notify("pause", user);
                if(other_in_ad) {
                    status_send = false;
                }
            } else if (status == "seek") {
                status_send = "seek";
                additional['old_time'] = getPlayerTime();
                notify("seek", user, additional);
            } else if (allow_adchange && (status == "start_ad" || status == "end_ad")) {
                if(ad_status != status) {
                    status_send = status;
                    ad_status = status;

                    setTimeout(function() { // Give it half a second, just in case things change
                        if(ad_status == "end_ad" && other_in_ad) {
                                $commercial.show();
                                $commercial_overlay.show();
                                jQuery('#player').css('visibility', 'hidden');
                                player.pauseEverything();
                                notify('commercial', user_other);
                        }
                    }, 500);
                }
            }

            if(status_send) {
                emit_event(status_send, additional);
            }
        });
    }

    function startHWM() {
        startSocket();

        $sidebar = jQuery('<div>', {'id': 'sidebar'}).hide();
        $sb_ul = jQuery('<ul>', {'id': 'sidebar-ul'});
        $sb_out = jQuery('<div>', {'id': 'sidebar-out'});

        var $sb_in = jQuery('<div>', {'id': 'sidebar-in'}),
            $sb_ta = jQuery('<textarea>', {'placeholder': 'Type here to chat while you watch! Hit <enter> to send.', 'css': {'border': '0 none', 'border-top': '1px solid #ccc'}}),
            $sb_who = jQuery('<a>', {'href': '#', 'id': 'chat-who', 'text': 'You are ', 'title': 'Edit name'}),
            $sb_name = jQuery('<strong>', {'id': 'chat-name', 'text': user['name']});

        var $ch = jQuery('<div>', {'id': 'chat-head'}),
            $ch_strong = jQuery('<strong>', {'text': 'hulu'})
            $ch_rest = jQuery('<span>', {'text': 'withme'});

        jQuery('body').prepend($sidebar);
        $sidebar.append($sb_in);
        $sb_in.append($sb_out);
        $sb_out.append($sb_ul);
        $sidebar.append($sb_ta);

        $ch.append($ch_strong).append($ch_rest);
        $sidebar.append($ch);
        $sidebar.append($sb_who);
        $sb_who.append($sb_name);

        $sb_who.click(changeName);

        /* This probably fixes the problem where flash is swallowing clicks */
        var $fake_input = jQuery('<input>', {'class':'fake-input'}).appendTo('body');
        $sb_ta.click(function() {
            $sb_ta.blur();
            $fake_input.focus();
            $sb_ta.focus();
            $fake_input.val("");
        });

        $sb_ta.keydown(function(e) {
            if(e.keyCode == 13) {
                if(is_anon) {
                    changeName();
                }

                if(jQuery(this).val() == "ad") cl('Is ad? ' + ad_status);

                socket.emit('chat', {'room': hwm_hash, 'msg': jQuery(this).val(), 'who': user});
                jQuery(this).val("");

                return false;
            }
        });


        var $li = jQuery('<li>', {'html': 'Huluwithme is still in early beta. <a href="mailto:gkoberger@gmail.com" target="_blank">Please report</a> absolutely any problems you find.', 'class': 'beta'});
        $sb_ul.append($li);
    }

    function cl(m) {
        var $li = jQuery('<li>', {'text': m, 'class': 'event'});
        $sb_ul.append($li);
        $sb_out.scrollTop(1000000);
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
            var current_time = getPlayerTime();
            var difference = Math.round(Math.abs(current_time - additional.new_time));

            if(difference == 0) {
                title = "Seeking";
                msg = name + " skipped around";
                event = 'seek_forward';
                symbol = '» ';
            } else if(current_time > additional.new_time) {
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
        if(msg && !is_me && !window_focus) {
            postMessage({'type': 'notify', 'event': event, 'title': title, 'msg': msg});
        }
    }

    function postMessage(m) {
        $transport.text(JSON.stringify(m));
        $transport[0].dispatchEvent(sendUp);
    }

    function chat(who, m) {
        var $li = jQuery('<li>');
        var $strong = jQuery('<strong>', {'text': who['name'] + ": "});
        var $span = jQuery('<span>', {'text': m});

        $li.append($strong);
        $li.append($span);

        $sb_ul.append($li);
        $sb_out.scrollTop(1000000);

        if(who['id'] != user['id'] && !window_focus) {
            postMessage({'type': 'notify', 'event': 'chat', 'title': who['name'] + ' said:', 'msg': m});
        }
    }

    function emit_event(status, stuff) {
        if(!socket) return;
        if(!stuff) stuff = {};

        stuff['type'] = status;
        stuff['room'] = hwm_hash;
        stuff['time'] = getPlayerTime();
        stuff['started'] = started;
        stuff['who'] = user;

        socket.emit('event', stuff);
    }

    function getPlayerTime() {
        if(!player_raw.getCurrentTime) return 0;
        return player_raw.getCurrentTime() / 1000;
    }

    function changeName() {
        var new_name = prompt("What do you want to use as a username?", user['name']);
        if(new_name && new_name != user['name']) {
            emit_event('name_change', {'old': user['name'], 'new': new_name});
            cl("You are now known as " + new_name);
            user['name'] = new_name;
            window.localStorage['hwm-name'] = new_name;
            jQuery('#chat-name').text(new_name);
        }
        is_anon = false;
        return false;
    }

    function watchForAd(data) {
        if(ad_status == "start_ad" || !other_in_ad) return;
        var time = getPlayerTime()
        if(time > data.time + 1) { // Give it 1 second leway
            player.pauseEverything();
            $commercial.show();
            $commercial_overlay.show();
            jQuery('#player').css('visibility', 'hidden');

            notify('commercial', data.who)
        } else {
            setTimeout(function() { watchForAd(data); }, 1000);
        }
    }

    function randomString() {
        var chars = "123456789abcdefghijkmnopqrstuvwxyz";
        var string_length = 5;
        var rs = '';
        for (var i=0; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            rs += chars.substring(rnum,rnum+1);
        }
        return rs;
    }

    function close_modal() {
        if($hwm_new_overlay) {
            $hwm_new_overlay.remove();
        }
        if($hwm_new_modal) {
            $hwm_new_modal.remove();
        }
        jQuery('#player').css('visibility', 'visible');
        return false;
    }

    function startSocket() {
        if(socket) return;
        socket = io.connect('http://hulu.watchalongwithme.com');

        socket.on('connect', function() {
            socket.emit('join', {'room': hwm_hash, 'who': user});
        });

        socket.on('join_status', function(data) {
            if(data.result) {
                if(hwm_hash_current) {
                    connectionSuccessful();
                }
                cl('You joined the video');
            } else {
                alert("Uh oh, we couldn't let you join the Huluwithme room you were invited to.\n\n" + data.reason + "\n\nYou can still watch the video, though!");
                socket.disconnect();
                socket = false;
                connection = false;
            }
        });

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
                player.seekAndPlay([data.time]);
                notify("play", data.who);
            }
            if(data.type == "seek") {
                if(is_paused) {
                    // TODO: This probably effs up commercials
                    player.seekAndPause([data.new_time]);
                } else {
                    player.seekAndPlay([data.new_time]);
                }
                notify("seek", data.who, {'old_time': data.old_time, 'new_time': data.new_time});
            }
            if(data.type == "join") {
                cl(data.who['name'] + ' joined');

                close_modal();
                connectionSuccessful();

                // Send commercial information to other person.
                started = true;
                emit_event('started');
            }
            if(data.type == "started") {
                started = true;
            }
            if(data.type == "name_change") {
                cl(data.old + " is now known as " + data.new);
            }
            if(data.type == "disconnect") {
                if(started) {
                    alert('The other person disconnected! You can continue watching, but you are no longer synced.');
                    socket.disconnect();
                    socket = false; // Don't think this does anything...

                    connected = false;

                    player.pauseEverything();
                    $sidebar.remove();
                    jQuery('body').removeClass('hwm');
                    $commercial.remove();
                    $commercial_overlay.remove();
                    jQuery('#player').css('visibility', 'visible');

                    jQuery('.toggle-w-hwm').removeClass('on');

                    hwm_hash_current = false;
                    window.location.hash = '';
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
                jQuery('#player').css('visibility', 'visible');

                if(ad_status == "end_ad") {
                    setTimeout(function() {
                        player.seekAndPlay([data.time]);
                    }, 500);
                }
            }
        });
    }

    function connectionSuccessful() {
        if(connected) return;

        restartVideo();

        connected = true;
        $sidebar.show();
        jQuery('body').addClass('hwm');

        // Disable popout
        jQuery('#description-contents img').each(function() {
            if(jQuery(this).attr('src').match('popout')) {
                jQuery(this).closest('a').attr('onclick', '').click(function() {
                    alert("Sorry, the popout player doesn't work with Huluwithme");
                    return false;
                });
                return false;
            }
        });

        // Add hash
        // TODO: Refreshing should take us back to the show
        window.location.hash = "hwm-" + hwm_hash;

        // Stop right there!
        window.onbeforeunload = function() {
            if(connected) {
                return "Leaving this page will end your Huluwithme session. You'll have to start over if you want to keep watching.";
            }
        };
        window.onunload = function() {
            if(socket) {
                socket.disconnect();
            }
        };

    }
    function ProxyPlayer() {
        this.retry_interval = false;
        this.callback = false;

        this.pauseEverything = function(args, callback, limit) {
            this.retry(this._pauseEverything, args, callback, limit);
        }
        this._pauseEverything = function() {
            if(!player_raw.pauseEverything) return false;
            player_raw.pauseEverything();
            return true;
        }

        this.playVideo = function(args, callback, limit) {
            this.retry(this._playVideo, args, callback, limit);
        }
        this._playVideo = function(arg) {
            if(!player_raw.playVideo) return false;
            player_raw.playVideo(arg);
            return true;
        }

        this.seekAndPause = function(args, callback, limit) {
            this.retry(this._seekAndPause, args, callback, limit);
        }
        this._seekAndPause = function(time) {
            if(!player_raw.seekAndPause) return false;
            player_raw.seekAndPause(time);
            return true;
        }

        this.seekAndPlay = function(args, callback, limit) {
            this.retry(this._seekAndPlay, args, callback, limit);
        }
        this._seekAndPlay = function(time) {
            if(!player_raw.seekAndPlay) return false;
            player_raw.seekAndPlay(time);
            return true;
        }

        this.reset = function(args, callback) {
            clearInterval(this.retry_interval);
            if(this.callback) {
                this.callback();
                this.callback = false;
            }
        }

        this.retry = function(to_retry, args, callback, limit) {
            if(!args) args = [];
            if(!to_retry.apply(this, args) && limit) {
                player_raw = $('player');

                (function() {
                    if(this.retry_interval) {
                        clearInterval(this.retry_interval);
                        if(this.callback) {
                            this.callback();
                        }
                    }
                    this.callback = callback;

                    this.retry_interval = setInterval(function() {
                        limit--;
                        if(to_retry.apply(this, args) || limit <= 0) {
                            clearInterval(this.retry_interval);
                            if(this.callback) {
                                this.callback();
                            }
                        }
                    }, 500);
                })();
            } else {
                if(callback) {
                    callback();
                }
            }
        }
    }
    var player = new ProxyPlayer();

    function restartVideo() {
        player.reset();
        if(winchrome) {
            // Swap them out so we can add a new attribute. Hacky...
            var jq_player = jQuery('#player').attr('wmode', 'transparent');
            embedHTML = jq_player[0].outerHTML;
            jq_player.replaceWith(jQuery(embedHTML));
            player_raw = $('player');
            player.seekAndPlay([0], function() {
                allow_adchange = true;
            }, 10);
        } else {
            // We need this for logged in users
            // This seems to play from the begining if in ad?
            player.playVideo([true], function() {
                allow_adchange = true;
            }, 15);
        }

    }
})();
