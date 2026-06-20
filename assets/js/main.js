/* ОЭУ ХХК — interactions
   1) nav scroll state + mobile menu
   2) scroll-reveal (IntersectionObserver)
   3) signature: ascent path draws + waypoints light as you climb the services
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- 1. NAV ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  var onScrollNav = function () {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScrollNav();

  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Цэс хаах" : "Цэс нээх");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 2. REVEAL ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. ASCENT PATH ---------- */
  var stagesWrap = document.getElementById("stages");
  var track = document.getElementById("ascentTrack");
  var progressPath = document.getElementById("ascentProgress");
  var flag = document.getElementById("ascentFlag");
  var stages = stagesWrap ? Array.prototype.slice.call(stagesWrap.querySelectorAll(".stage")) : [];
  // light thresholds per waypoint along the climb
  var thresholds = [0.02, 0.26, 0.5, 0.74, 0.96];

  function setupAscent() {
    if (!progressPath || !track) return;
    var len = progressPath.getTotalLength();
    progressPath.style.strokeDasharray = len;
    progressPath.style.strokeDashoffset = reduce ? 0 : len;

    function draw() {
      var rect = stagesWrap.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // 0 when the block enters from below, 1 once it has climbed past the upper third
      var span = rect.height - vh * 0.34;
      var p = clamp((vh * 0.72 - rect.top) / (span > 1 ? span : 1), 0, 1);
      progressPath.style.strokeDashoffset = len * (1 - p);

      stages.forEach(function (st, i) {
        if (p >= thresholds[i]) st.classList.add("reached");
        else if (!st.classList.contains("summit")) st.classList.remove("reached");
      });
      if (flag) { if (p >= 0.97) flag.classList.add("lit"); else flag.classList.remove("lit"); }
    }

    if (reduce) {
      stages.forEach(function (st) { st.classList.add("reached"); });
      if (flag) flag.classList.add("lit");
      return;
    }

    var ticking = false;
    function onScroll() {
      if (!ticking) { window.requestAnimationFrame(function () { draw(); ticking = false; }); ticking = true; }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      len = progressPath.getTotalLength();
      progressPath.style.strokeDasharray = len;
      draw();
    }, { passive: true });
    draw();
  }

  /* combined scroll listener for nav (cheap) */
  window.addEventListener("scroll", onScrollNav, { passive: true });

  if (document.readyState === "complete") setupAscent();
  else window.addEventListener("load", setupAscent);
})();
