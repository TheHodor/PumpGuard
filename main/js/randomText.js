var _createClass = (function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
        }
    }
    return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
    };
})();

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
var TextScramble = (function () {
    function TextScramble(el) {
        _classCallCheck(this, TextScramble);
        this.el = el;
        this.chars = "qwertyuioplkjhgfdsazvbnmx&?#";
        this.update = this.update.bind(this);
    }
    _createClass(TextScramble, [{
            key: "setText",
            value: function setText(newText) {
                var _this = this;
                var oldText = this.el.innerText;
                var length = Math.max(oldText.length, newText.length);
                var promise = new Promise(function (resolve) {
                    return (_this.resolve = resolve);
                });
                this.queue = [];
                for (var i = 0; i < length; i++) {
                    var from = oldText[i] || "";
                    var to = newText[i] || "";
                    var start = Math.floor(Math.random() * 40);
                    var end = start + Math.floor(Math.random() * 40);
                    this.queue.push({
                        from: from,
                        to: to,
                        start: start,
                        end: end
                    });
                }
                cancelAnimationFrame(this.frameRequest);
                this.frame = 0;
                this.update();
                return promise;
            }
        },
        {
            key: "update",
            value: function update() {
                var output = "";
                var complete = 0;
                for (var i = 0, n = this.queue.length; i < n; i++) {
                    var _queue$i = this.queue[i],
                        from = _queue$i.from,
                        to = _queue$i.to,
                        start = _queue$i.start,
                        end = _queue$i.end,
                        char = _queue$i.char;
                    if (this.frame >= end) {
                        complete++;
                        output += to;
                    } else if (this.frame >= start) {
                        if (!char || Math.random() < 0.18) {
                            char = this.randomChar();
                            this.queue[i].char = char;
                        }
                        output += '<span class="sb">' + char + "</span>";
                    } else {
                        output += from;
                    }
                }
                this.el.innerHTML = output;
                if (complete === this.queue.length) {
                    this.resolve();
                } else {
                    this.frameRequest = requestAnimationFrame(this.update);
                    this.frame++;
                }
            }
        },
        {
            key: "randomChar",
            value: function randomChar() {
                return this.chars[Math.floor(Math.random() * this.chars.length)];
            }
        }
    ]);
    return TextScramble;
})();
// &#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;// From SiinBlog with love// &#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;
function getRandomPhrase() {
    var phrases = [
        "Trading Platform",
        "Innovative Exchange",
        "Lend & Loan Platform",
        "Dapp with a Unique idea",
        "Game-changing Ecosytem",
        "L2 Network Solution",
        "Donation Platform",
        "Insurance Platform",
        "Decentralized Voting System",
        "NFT Marketplace",
        "Yield Farming Platform",
        "Crowdfunding Launchpad",
        "Cross-Chain Bridge",
        "P2P Payment Platform",
        "Blockchain Social Network",


        "L2 Network Solution",
        "Innovative Exchange",
        "NFT Marketplace",
        "Yield Farming Platform",
        "Blockchain Social Network",
    ];

    var randomIndex = Math.floor(Math.random() * phrases.length);
    var randomPhrase = phrases[randomIndex];

    var el = document.querySelector(".random-text");
    var fx = new TextScramble(el);
    fx.setText(randomPhrase).then(function () {
        setTimeout(getRandomPhrase, 2000);
    });

}
getRandomPhrase()



//next code

//<![CDATA[
// (function (b) {
//     var c = {
//             topSpacing: 0,
//             bottomSpacing: 0,
//             className: "is-sticky",
//             center: false
//         },
//         f = b(window),
//         e = b(document),
//         d = [],
//         h = f.height(),
//         a = function () {
//             var j = f.scrollTop(),
//                 q = e.height(),
//                 p = q - h,
//                 l = (j > p) ? p - j : 0;
//             for (var m = 0; m < d.length; m++) {
//                 var r = d[m],
//                     k = r.stickyWrapper.offset().top,
//                     n = k - r.topSpacing - l;
//                 if (j <= n) {
//                     if (r.currentTop !== null) {
//                         r.stickyElement.css("position", "").css("top", "").removeClass(r.className);
//                         r.currentTop = null
//                     }
//                 } else {
//                     var o = q - r.elementHeight - r.topSpacing - r.bottomSpacing - j - l;
//                     if (o < 0) {
//                         o = o + r.topSpacing
//                     } else {
//                         o = r.topSpacing
//                     }
//                     if (r.currentTop != o) {
//                         r.stickyElement.css("position", "fixed").css("top", o).addClass(r.className);
//                         r.currentTop = o
//                     }
//                 }
//             }
//         },
//         g = function () {
//             h = f.height()
//         };
//     if (window.addEventListener) {
//         window.addEventListener("scroll", a, false);
//         window.addEventListener("resize", g, false)
//     } else {
//         if (window.attachEvent) {
//             window.attachEvent("onscroll", a);
//             window.attachEvent("onresize", g)
//         }
//     }
//     b.fn.sticky = function (i) {
//         var j = b.extend(c, i);
//         return this.each(function () {
//             var l = b(this);
//             if (j.center) {
//                 var k = "margin-left:auto;margin-right:auto;"
//             }
//             stickyId = l.attr("id");
//             l.wrapAll('<div id="' + stickyId + 'StickyWrapper" style="' + k + '"></div>').css("width", l.width());
//             var m = l.outerHeight(),
//                 n = l.parent();
//             n.css("width", l.outerWidth()).css("height", m).css("clear", l.css("clear"));
//             d.push({
//                 topSpacing: j.topSpacing,
//                 bottomSpacing: j.bottomSpacing,
//                 stickyElement: l,
//                 currentTop: null,
//                 stickyWrapper: n,
//                 elementHeight: m,
//                 className: j.className
//             })
//         })
//     }
// })(jQuery);
//]]>
// $(document).ready(function () {
//     $("#HTML1").sticky({
//         topSpacing: 10,
//         bottomSpacing: 320
//     });
// });