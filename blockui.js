/*!
 * jQuery blockUI plugin v20261028 - by raveren - MIT license
 * https://github.com/raveren/blockui
 * Usage:
 *  `$('.selector').block([message])` -> `$('.selector').unblock()` + `$('.selector').isBlocked()`
 *  `$.blockUi([message])` -> `$.unblockUi()` + `$.isUiBlocked()`
 */

;(function () {
    function setup($) {
        // The blocked state is a class plus one transparent shield element that swallows pointer events and
        // carries the spinner and the message;
        const hostClass = 'block-ui-host';
        const blockedClass = 'block-ui-blocked';
        const shieldClass = 'block-ui-shield';
        const messageClass = 'block-ui-message';
        const messageControls = '.' + messageClass + ' a, .' + messageClass + ' button';
        const elementsWithoutPseudoElements = 'img, input, select, textarea, iframe, video, audio, canvas, object, embed';

        // global $ methods for blocking/unblocking the entire page
        $.blockUi = function (message) {
            doBlock($('body'), message);
        };
        $.unblockUi = function () {
            doUnblock($('body'));
        };
        $.isUiBlocked = function () {
            return $('body').isBlocked();
        };

        $.fn.block = function (message) {
            return this.each(function () {
                doBlock(getTarget(this), message);
            });
        };

        $.fn.unblock = function () {
            return this.each(function () {
                doUnblock(getTarget(this));
            });
        };

        $.fn.isBlocked = function () {
            return this.hasClass(blockedClass);
        };

        document.head.appendChild(document.createElement('style')).innerHTML = buildStyles();
        swallowInputEvents();

        function doBlock($el, message) {
            assertCanRenderOverlay($el);

            if ($el.isBlocked()) {
                return;
            }

            $el.addClass(hostClass).append(
                $('<div class="' + shieldClass + '">').append(
                    $('<span class="' + messageClass + '">').append(message || '')
                )
            );
            // Flush styles so the overlay and the shield exist at opacity 0 before being shown, otherwise
            // they would be created already visible and the fade-in would be skipped.
            void $el[0].offsetWidth;
            $el.addClass(blockedClass);
        }

        function doUnblock($el) {
            $el.removeClass(blockedClass).children('.' + shieldClass).remove();
        }

        function getTarget(el) {
            return (el === window || el === document) ? $('body') : $(el);
        }

        function assertCanRenderOverlay($el) {
            const el = $el[0];

            if ($el.is(elementsWithoutPseudoElements) || el instanceof SVGElement) {
                throw new Error(
                    'blockUi: <' + el.tagName.toLowerCase() + '> cannot show the overlay because it does not'
                    + ' support ::before/::after pseudo-elements. Block a wrapping element instead.'
                );
            }
        }

        // One capturing listener per event type on the document, so cloned shields work without any
        // handler of their own. Touch events are only stopped, not cancelled, so scrolling keeps working.
        function swallowInputEvents() {
            const isOn = (event, selector) => event.target instanceof Element
                && event.target.closest(selector)
                && ! event.target.closest(messageControls);

            ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach(type =>
                document.addEventListener(type, function (event) {
                    if (isOn(event, '.' + shieldClass)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }, true)
            );

            ['touchstart', 'touchend'].forEach(type =>
                document.addEventListener(type, function (event) {
                    if (isOn(event, '.' + shieldClass)) {
                        event.stopPropagation();
                    }
                }, {capture: true, passive: true})
            );

            ['keydown', 'keypress', 'keyup', 'beforeinput'].forEach(type =>
                document.addEventListener(type, function (event) {
                    if (isOn(event, '.' + blockedClass)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }, true)
            );
        }

        function buildStyles() {
            const stripes = 'linear-gradient(45deg,#eee 25%,rgba(238,238,238,0) 25%,rgba(238,238,238,0) 75%,'
                + '#eee 75%,#eee)';

            // :where() has zero specificity, so an element's own non-static position always wins.
            // The host class is doubled so the overlay wins over a site's own pseudo-element rules
            // (e.g. Bootstrap's dropdown caret) regardless of stylesheet order.
            // ::before is the striped overlay; the shield on top of it centers the spinner and the message.
            const host = '.' + hostClass + '.' + hostClass;
            const shield = host + '>.' + shieldClass;
            const message = shield + '>.' + messageClass;

            return ':where(.' + hostClass + '){position:relative}'
                + host + '::before{'
                + 'content:"";display:block;position:absolute;z-index:1000;top:0;left:0;width:100%;height:100%;'
                + 'margin:0;border:0;opacity:0;pointer-events:none;transition:opacity .4s;'
                + 'background-color:#fff;background-image:' + stripes + ',' + stripes + ';'
                + 'background-size:20px 20px;background-position:0 0,10px 10px}'
                + '.' + blockedClass + '.' + blockedClass + '::before{opacity:.6;transition-duration:.2s}'
                + shield + '{position:absolute;z-index:1020;top:0;left:0;width:100%;height:100%;'
                + 'display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;'
                + 'cursor:progress}'
                + host + '.' + blockedClass + '>.' + shieldClass + '{opacity:1}'
                + message + '{font-size:30px;line-height:35px;white-space:nowrap}'
                + message + '::before{content:"";display:inline-block;width:35px;height:35px;box-sizing:border-box;'
                + 'border:5px solid;border-color:#ed6f2f transparent;border-radius:50%;vertical-align:top;'
                + 'animation:block-ui-spin 1s linear infinite}'
                + message + ':not(:empty)::before{margin-right:10px}'
                + '@keyframes block-ui-spin{to{transform:rotate(360deg)}}'
                + 'body' + host + '::before,body' + shield + '{position:fixed}';
        }
    }

    /*global define:true */
    if (typeof define === 'function' && define.amd && define.amd.jQuery) {
        define(['jquery'], setup);
    } else {
        setup(jQuery);
    }
})();
