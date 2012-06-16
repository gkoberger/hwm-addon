(function() {
    var hulu_show_id = location.href.match(/watch\/([0-9]*)/)[1],
        hwm_hash_current = location.hash.match(/#hwm-([\w]*)/),
        random_hash = randomString(),
        hwm_hash = (hwm_hash_current) ? hwm_hash_current[1] : random_hash,
        hwm_link = "http://huluwith.me/" + hwm_hash + "-" + hulu_show_id,
        player = false,
        in_commercial = false,
        in_ad_pool = 0,
        socket = false,
        winchrome = false,
        started = false,
        is_paused = false,
        $commercial, $commerical_overlay, pause, status_text, status_action, status_type,
        $hwm_new_overlay, $hwm_new_modal, $sidebar, $sb_ul, $sb_out,
        is_anon = true,
        connected = false, // Don't rerun connectionSuccessful
        user = {'name': "Anon " + Math.round(Math.random() * 1000),
                'id': (Math.round(Math.random() * 1000) +"-"+ (new Date().getTime() + "").substr(-5))},
        user_other = {'name': 'The other person', 'id': false};

    //$.noConflict();

    var saved_name = unsafeWindow.localStorage.getItem("hwm-name");
    if(saved_name) {
        is_anon = false;
        user['name'] = saved_name;
    } else {
        var user_hulu = jQuery('#user-greeting').text();
        if(user_hulu != "User") {
            user['name'] = user_hulu;
            unsafeWindow.localStorage['hwm-name'] = user_hulu;
            is_anon = false;
        }
    }

    /* STARTCHROME */
    winchrome = navigator.appVersion.indexOf("Win")!=-1;

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
        c(126);
        if(r.type == "event") {
        c(127);
            jQuery('body').trigger('status_change', [r.action, r.additional]);
        c(128);
        }
        c(129);
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
        var p_s = !!(player.playVideo);
        var test = setInterval(function() {
            p_s_new = !!(player.playVideo);
            console.log('checking.. ', p_s_new);
            if(p_s != p_s_new && !p_s_new) {
                console.log('broken');
                alert('broken');
                clearInterval(test);
            }
            p_s = p_s_new;
        }, 200);
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

            player2.pauseEverything();

            startHWM();
        });

        jQuery('body').bind('status_change', function(e, status, additional) {
            c(110);
            var status_send = false;
            if(ad_status != "start_ad"  && (status == "play" || status == "centerplay")) {
            c(111);
                status_send = "play";
            c(112);
                notify("play", user);
            c(113);
                if(other_in_ad) {
            c(114);
                    player2.pauseEverything();
            c(115);
                    alert("The other person is still in a commercial.\n\nThe video will play automatically when they're done.");
                    status_send = false;
            c(116);
                }
            } else if (ad_status != "start_ad"  && (status == "pause" || status == "centerpause")) {
            c(117);
                status_send = "pause";
                notify("pause", user);
            c(118);
                if(other_in_ad) {
                    status_send = false;
                }
            c(119);
            } else if (status == "seek") {
            c(120);
                status_send = "seek";
                additional['old_time'] = getPlayerTime();
                notify("seek", user, additional);
            c(121);
            } else if (status == "start_ad" || status == "end_ad") {
            c(122);
                if(ad_status != status) {
            c(123);
                    status_send = status;
                    ad_status = status;

            c(124);
                    if(ad_status == "end_ad" && other_in_ad) {
                        $commercial.show();
                        $commercial_overlay.show();
            c(125);
                        jQuery('#player').css('visibility', 'hidden');
            c(126);
                        player2.pauseEverything();
            c(127);
                        notify('commercial', user_other);
            c(128);
                    }
                }
            }

            if(status_send) {
                c(101);
                emit_event(status_send, additional);
            }
        });
    }

    /*
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
    */

    var ad_status = false,
        other_in_ad = false;

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


        var $li = jQuery('<li>', {'text': 'Huluwithme is still in early beta. Please report absolutely any problems you find to gkoberger@gmail.com', 'class': 'beta'});
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
        c(153);
        self.postMessage(m);
        c(154);
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

        $sb_ul.append($li);
        $sb_out.scrollTop(1000000);

        if(who['id'] != user['id'] && ! jQuery(document.activeElement).is('#sidebar textarea:focus')) {
            postMessage({'type': 'notify', 'event': 'chat', 'title': who['name'] + ' said:', 'msg': m});
        }
    }

    function emit_event(status, stuff) {
        c(50);
        if(!socket) return;
        c(51);
        if(!stuff) stuff = {};
        c(52);
        var time = false;
        if(player) {
        c(53);
            time = getPlayerTime();
        }
        c(54);
        stuff['type'] = status;
        stuff['room'] = hwm_hash;
        stuff['time'] = time;
        stuff['started'] = started;
        stuff['who'] = user;
        c(55);
        socket.emit('event', stuff);
        c(56);
    }

    function getPlayerTime() {
        c("1");
        if(!player.getCurrentTime) return 0;
        c("2");
        return player.getCurrentTime() / 1000;
    }

    function changeName() {
        var new_name = prompt("What do you want to use as a username?", user['name']);
        if(new_name && new_name != user['name']) {
            emit_event('name_change', {'old': user['name'], 'new': new_name});
            cl("You are now known as " + new_name);
            user['name'] = new_name;
            unsafeWindow.localStorage['hwm-name'] = new_name;
            jQuery('#chat-name').text(new_name);
        }
        is_anon = false;
        return false;
    }

    function watchForAd(data) {
        c(58);
        if(ad_status == "start_ad" || !other_in_ad) return;
        var time = getPlayerTime()
        c(59);
        if(time > data.time + 1) { // Give it 1 second leway
        c(60);
            player2.seekAndPause([data.time]);
            $commercial.show();
            $commercial_overlay.show();
            jQuery('#player').css('visibility', 'hidden');

        c(61);
            notify('commercial', data.who)
        c(62);
        } else {
        c(63);
            setTimeout(function() { watchForAd(data); }, 1000);
        c(64);
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
                //emit_event(ad_status);
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

        socket.on('event2', function(data) {
        c(66);
            user_other = data.who;
            if(data.type == "pause") {
                player2.pauseEverything();
                notify("pause", data.who);
            }
            if(data.type == "play") {
                player2.seekAndPlay([data.time]);
                notify("play", data.who);
            }
            if(data.type == "seek") {
                if(is_paused) {
                    // TODO: This probably effs up commercials
                    player2.seekAndPause([data.new_time]);
                } else {
                    player2.seekAndPlay([data.new_time]);
                }
                notify("seek", data.who, {'old_time': data.old_time, 'new_time': data.new_time});
            }
            if(data.type == "join") {
                cl(data.who['name'] + ' joined');

                close_modal();
                connectionSuccessful();

                // Send commercial information to other person.
                //emit_event(ad_status);
                started = true;
                c(102);
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

                    player2.pauseEverything();
                    $sidebar.remove();
                    jQuery('body').removeClass('hwm');
                    $commercial.remove();
                    $commercial_overlay.remove();
                    jQuery('#player').css('visibility', 'visible');

                    jQuery('.toggle-w-hwm').removeClass('on');

                    hwm_hash_current = false;
                    unsafeWindow.location.hash = '';
                    hwm_hash = randomString();
                }
            }
            if(data.type == "start_ad") {
                console.log('Ad break ' + data.who['name']);
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
                    player2.seekAndPlay([data.time]);
                }
            }
        c(87);
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
        unsafeWindow.location.hash = "hwm-" + hwm_hash;

        // Stop right there!
        unsafeWindow.onbeforeunload = function() {
            if(connected) {
                return "Leaving this page will end your Huluwithme session. You'll have to start over if you want to keep watching.";
            }
        };
        unsafeWindow.onunload = function() {
            if(socket) {
                socket.disconnect();
            }
        };

    }
    function Player2() {
        this.retry_interval = false;
        this.callback = false;

        this.pauseEverything = function(args, callback, limit) {
            console.log('Firing pauseEverything', !!(player.pauseEverything));
            c(9);
            this.retry(this._pauseEverything, args, callback, limit);
            c(10);
        }
        this._pauseEverything = function() {
            c(11);
            if(!player.pauseEverything) return false;
            c(12);
            console.log('Pausing!');
            player.pauseEverything();
            c(18);
            return true;
        }

        this.playVideo = function(args, callback, limit) {
            c(13);
            console.log('Firing playVideo', !!(player.playVideo));
            this.retry(this._playVideo, args, callback, limit);
            c(14);
        }
        this._playVideo = function(arg) {
            c(15);
            if(!player.playVideo) return false;
            c(16);
            player.playVideo(arg);
            c(17);
            return true;
        }

        this.seekAndPause = function(args, callback, limit) {
            console.log('Firing seekAndPause(' + args[0] + ')');
            c(19);
            this.retry(this._seekAndPause, args, callback, limit);
            c(20);
        }
        this._seekAndPause = function(time) {
            c(21);
            if(!player.seekAndPause) return false;
            c(22);
            player.seekAndPause(time);
            c(23);
            return true;
        }

        this.seekAndPlay = function(args, callback, limit) {
            c(24);
            console.log('Firing seekAndPlay(' + args[0] + ')', !!(player.seekAndPlay));
            this.retry(this._seekAndPlay, args, callback, limit);
            c(25);
        }
        this._seekAndPlay = function(time) {
            c(26);
            if(!player.seekAndPlay) return false;
            c(27);
            player.seekAndPlay(time);
            c(28);
            return true;
        }

        this.reset = function(args, callback, limit) {
            console.log('Clearing interval');
            c(29);
            clearInterval(this.retry_interval);
            c(30);
            if(this.callback) {
                this.callback();
                this.callback = false;
            c(31);
            }
        }

        this.retry = function(to_retry, args, callback, limit) {
            c(32);
            if(!args) args = [false];
            //if(!limit) limit = 5;
            c(33);
            if(!to_retry(args[0]) && limit) {
            c(34);
                console.log('couldnt fire; starting interval.');
                /* STARTCHROME */
                //player = $('player');
                /* ENDCHROME */
                /* STARTFIREFOX */
                //player = unsafeWindow.$('player').wrappedJSObject;
                /* ENDFIREFOX */

                (function() {
                    if(this.retry_interval) {
            c(35);
                        console.log('Clearing interval early');
                        clearInterval(this.retry_interval);
                        if(this.callback) {
                            this.callback();
                        }
            c(36);
                    }
                    this.callback = callback;

                    this.retry_interval = setInterval(function() {
            c(37);
                        limit--;
                        console.log('retrying...');
                        if(to_retry(args[0]) || limit <= 0) {
                            console.log('finished ' + limit);
                            clearInterval(this.retry_interval);
                            if(this.callback) {
                                this.callback();
                            }
                        }
            c(38);
                    }, 500);
                })();
            } else {
                if(callback) {
            c(40);
                    callback();
            c(39);
                }
            }
        }
    }
            c(7);
    var player2 = new Player2();
            c(8);

    function restartVideo() {
        player2.reset();
        if(winchrome) {
            // Swap them out so we can add a new attribute. Hacky...
            var jq_player = jQuery('#player').attr('wmode', 'transparent');
            embedHTML = jq_player[0].outerHTML;
            jq_player.replaceWith(jQuery(embedHTML));
            player = $('player');
            if(getPlayerTime() > 0) {
                player2.seekAndPlay([0], function() {
                    console.log('emit1');
                c(103);
                    emit_event(ad_status);
                }, 10);
            }
        } else {
            // We need this for logged in users
            // This seems to play from the begining?
            console.log('restarting..', (!!player.playVideo));
            /*
            c(6);
            if(getPlayerTime() > 0) {
                player2.playVideo([true], function() {
                    player2.seekAndPlay([0], function() {
                        console.log('done restarting1', (!!player.playVideo));
                        console.log('emit2');
                c(104);
                        emit_event(ad_status);
                    });
                }, 15);
            } else if(ad_status == "start_ad") {
                /*
                player2.playVideo([true], function() {
                    console.log('done restarting2', (!!player.playVideo));
                    console.log('emit3');
                    emit_event(ad_status);
                });
                */
               /*
                c(104);
                emit_event(ad_status);
            } else {
                c(3);
                console.log('done restarting3', (!!player.playVideo));
                c(4);
                emit_event(ad_status);
                c(5);
            }
            */
        }

        c(150);
        postMessage({'type': 'reset'});
        c(151);
    }

function c(i) {
    console.log('c', i, (!!player.playVideo));
}
})();
