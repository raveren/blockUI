/*!
 * jQuery blockUI plugin v20260727 - by raveren - MIT license
 * https://github.com/raveren/blockui
 * Usage:
 *  $('.selector').block([message]) -> $('.selector').unblock() -> $('.selector').isBlocked()
 *  $.blockUi([message]) -> $.unblockUi() -> $.isUiBlocked()
 */

;(function () {
    function setup($) {
        const dataKey = 'blockUi.isBlocked';

        // global $ methods for blocking/unblocking the entire page
        $.blockUi = function (message) {
            doBlock(window, message);
        };
        $.unblockUi = function () {
            doUnblock(window);
        };
        $.isUiBlocked = function () {
            return $(window).isBlocked();
        };

        // plugin method for blocking element content
        $.fn.block = function (message) {
            return this.each(function () {
                doBlock(this, message);
            });
        };

        // plugin method for unblocking element content
        $.fn.unblock = function () {
            return this.each(function () {
                doUnblock(this);
            });
        };

        $.fn.isBlocked = function () {
            return !! this.data(dataKey)
        };

        // styles
        document.head.appendChild(document.createElement('style')).innerHTML
            = '@keyframes block-ui-animation{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';

        $.blockUi.defaults = {
            // message displayed when blocking
            css: {
                padding: 0,
                margin: 0,
                width: '100%',
                top: 'calc(50% - 17px)',
                textAlign: 'center',
                border: '0',
                background: 'transparent',
                cursor: 'progress'
            },

            overlayCSS: {
                backgroundColor: '#fff',
                backgroundImage: 'linear-gradient(45deg,#eee 25%,rgba(238,238,238,0) 25%,rgba(238,238,238,0) 75%,'
                    + '#eee 75%,#eee),linear-gradient(45deg,#eee 25%,rgba(238,238,238,0) 25%,rgba(238,238,238,0) 75%,'
                    + '#eee 75%,#eee)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0,10px 10px',
                opacity: .6,
                cursor: 'progress'
            },

            // z-index for the blocking overlay
            baseZ: 1000,

            // fadeIn time in millis; set to 0 to disable fadeIn on block
            fadeIn: 200,

            // fadeOut time in millis; set to 0 to disable fadeOut on unblock
            fadeOut: 400,

            // time in millis to wait before auto-unblocking; set to 0 to disable auto-unblock
            timeout: 0
        };

        function doBlock(el, message) {
            const $el = getJquery(el);

            console.log(`%c block-ui.min.js:85\n blocked:`, 'color:#0;', 'blocked', el);
            if ($el.isBlocked()) {
                console.log(`%c block-ui.min.js:85\n canceler:`, 'color:#0;', 'canceler', el);
                return this;
            }

            const full = $el.is('body');
            const opts = $.blockUi.defaults;
            let css = opts.css;
            let msg = '<div style="width:35px;height:35px;border:5px solid;border-color:#ed6f2f transparent;'
                + 'border-radius:50%;display:inline-block;box-sizing:border-box;'
                + 'animation:block-ui-animation 1s linear infinite;"></div>';
            let z = opts.baseZ;

            if (message) {
                msg += '<div style="display:inline-block;margin-left:10px;font-size: 30px;vertical-align: center">'
                    + message
                    + '</div>'
            }

            $el.data(dataKey, true)

            // block key and mouse events
            bind($el, true);

            if ($el.css('position') === 'static') {
                $el.css('position', 'relative')
                    .data('blockUi.wasStatic', true);
            }

            // blockUI uses 3 layers for blocking, for simplicity they are all used on every platform;
            // layer1 is the iframe layer which is used to supress bleed through of underlying content
            // layer2 is the overlay layer which has opacity and a wait cursor (by default)
            // layer3 is the message content that is displayed while blocking
            let lyr1, lyr2, lyr3, s;
            lyr1 = $('<div class="block-ui" style="display:none"></div>');

            lyr2 = $('<div class="block-ui block-ui-overlay" style="z-index:' + (z++)
                + ';display:none;border:none;margin:0;padding:0;width:100%;height:100%;top:0;left:0"></div>');

            if (full) {
                s = '<div class="block-ui block-ui-page" style="z-index:' + (z + 10)
                    + ';display:none;position:fixed"></div>';
            } else {
                s = '<div class="block-ui block-ui-element" style="z-index:' + (z + 10)
                    + ';display:none;position:absolute"></div>';
            }
            lyr3 = $(s);
            lyr3.css(css);

            // style the overlay
            lyr2.css(opts.overlayCSS);
            lyr2.css('position', full ? 'fixed' : 'absolute');

            const layers = [lyr1, lyr2, lyr3]
            $.each(layers, function () {
                this.appendTo($el);
            });

            // show the message
            lyr3.append(msg);
            if (msg.jquery || msg.nodeType) {
                $(msg).show();
            }

            if (opts.fadeIn) {
                lyr2.fadeIn(opts.fadeIn);
                lyr3.fadeIn(opts.fadeIn);
            } else {
                lyr2.show();
                lyr3.show();
            }
        }

        // remove the block
        function doUnblock(el) {
            console.log(`%c block-ui.min.js:85\n :`, 'color:#0;', 'unblocked', el);

            const $el = getJquery(el);
            const opts = $.blockUi.defaults;

            $el.data(dataKey, false)

            bind($el, false);

            const els = $el.find('>.block-ui');

            if (opts.fadeOut) {
                let count = els.length;
                els.stop().fadeOut(opts.fadeOut, function () {
                    if (--count === 0) {
                        reset(els, opts, el);
                    }
                });
            } else {
                reset(els, opts, el);
            }
        }

        function getJquery(el) {
            if (! (el instanceof jQuery)) {
                el = $(el);
            }

            return el.is('window') ? $('body') : el;
        }

        // move blocking element back into the DOM where it started
        function reset(els, opts, el) {
            const $el = $(el);

            els.each(function () {
                // remove via DOM calls so we don't lose event handlers
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            });

            if ($el.data('blockUi.wasStatic')) {
                $el.css('position', 'static'); // #22
            }
        }

        // bind/unbind the handler
        function bind($el, turnOn) {

            // lets do our best to block all input events
            const events = 'mousedown.blockUi mouseup.blockUi keydown.blockUi keypress.blockUi keyup.blockUi '
                + 'touchstart.blockUi touchend.blockUi touchmove.blockUi submit.blockUi';
            if (turnOn) {
                $el.each(function () {
                    let current = this;
                    $(current).on(events, function (e) {
                        e.preventDefault()
                        e.stopImmediatePropagation()
                        return false
                    })

                    // we make the newly created event be the first to fire and stop every other one
                    events.split(' ').forEach(function (event) {
                        handlers = $._data(current).events[event.split('.')[0]];
                        handlers.unshift(handlers.pop());
                    })
                })
            } else {
                $el.off(events);
            }
        }
    }


    /*global define:true */
    if (typeof define === 'function' && define.amd && define.amd.jQuery) {
        define(['jquery'], setup);
    } else {
        setup(jQuery);
    }
})();
