/* ==========================================================================
   Fourth Quest — site behaviour
   --------------------------------------------------------------------------
   No dependencies. Handles:
     - sticky nav shadow
     - mobile drawer
     - Products dropdown panel (click-activated, keyboard + outside-click aware)
     - active nav state, derived from <body data-page="...">
     - scroll reveal
     - back-to-top
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DESKTOP = '(min-width: 1025px)';

  /* ---------------------------------------------------------------- nav */

  function initNav() {
    var nav = document.querySelector('.fq-nav');
    if (!nav) return;

    var toggle = nav.querySelector('.fq-nav__toggle');
    var collapse = nav.querySelector('.fq-nav__collapse');
    var panelBtn = nav.querySelector('[data-fq-panel-toggle]');
    var panel = nav.querySelector('.fq-panel');

    /* Sticky border/shadow once scrolled off the top. */
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* --- mobile drawer --- */
    function setDrawer(open) {
      if (!collapse || !toggle) return;
      collapse.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      var icon = toggle.querySelector('i');
      if (icon) icon.className = open ? 'fas fa-xmark' : 'fas fa-bars';
    }

    if (toggle && collapse) {
      toggle.addEventListener('click', function () {
        setDrawer(!collapse.classList.contains('is-open'));
      });
    }

    /* --- products panel --- */
    function setPanel(open) {
      if (!panel || !panelBtn) return;
      panel.classList.toggle('is-open', open);
      panelBtn.setAttribute('aria-expanded', String(open));
    }

    if (panelBtn && panel) {
      panelBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setPanel(!panel.classList.contains('is-open'));
      });

      var item = panelBtn.closest('.fq-nav__item');

      /* Open on hover at desktop widths, the way Vercel and HashiCorp do.
         Guarded by (hover: hover) so touch devices keep click-to-open, and
         given hover intent on both edges: a short delay before opening so
         passing the pointer across does not fire it, and a longer grace
         before closing so travelling down into the panel is forgiving. */
      if (item && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        var openTimer;
        var closeTimer;

        item.addEventListener('mouseenter', function () {
          if (!window.matchMedia(DESKTOP).matches) return;
          clearTimeout(closeTimer);
          openTimer = setTimeout(function () {
            setPanel(true);
          }, 70);
        });

        item.addEventListener('mouseleave', function () {
          if (!window.matchMedia(DESKTOP).matches) return;
          clearTimeout(openTimer);
          closeTimer = setTimeout(function () {
            setPanel(false);
          }, 220);
        });
      }

      /* Close when focus leaves the whole item (keyboard tab-out). */
      if (item) {
        item.addEventListener('focusout', function (e) {
          if (!window.matchMedia(DESKTOP).matches) return;
          if (!item.contains(e.relatedTarget)) setPanel(false);
        });
      }

      /* Outside click. */
      document.addEventListener('click', function (e) {
        if (!panel.contains(e.target) && !panelBtn.contains(e.target)) {
          setPanel(false);
        }
      });
    }

    /* Escape closes whichever layer is open. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (panel && panel.classList.contains('is-open')) {
        setPanel(false);
        if (panelBtn) panelBtn.focus();
      } else if (collapse && collapse.classList.contains('is-open')) {
        setDrawer(false);
        if (toggle) toggle.focus();
      }
    });

    /* Reset layers when crossing the desktop breakpoint. */
    var mq = window.matchMedia(DESKTOP);
    var onChange = function () {
      setDrawer(false);
      setPanel(false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* --------------------------------------------------- active nav state */

  /* The nav markup is identical on every page, so the current section is
     declared once per page via <body data-page="..."> instead of by
     hand-editing links. */
  function initActiveNav() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    var links = document.querySelectorAll('[data-nav]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-nav') === page) {
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }

  /* ------------------------------------------------------ scroll reveal */

  function initReveal() {
    var targets = document.querySelectorAll('.fq-reveal');
    if (!targets.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-in');
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------------------------- click-to-play video */

  /* Swaps the poster for a real YouTube iframe on click. Keeps the player's
     idle state (which overlays the video's YouTube title) off the page, and
     defers all third-party loading until the visitor actually wants it. */
  function initLiteVideo() {
    var frames = document.querySelectorAll('.fq-lite[data-yt]');

    Array.prototype.forEach.call(frames, function (box) {
      var btn = box.querySelector('.fq-lite__btn');
      if (!btn) return;

      btn.addEventListener('click', function () {
        var id = box.getAttribute('data-yt');
        var title = box.getAttribute('data-yt-title') || 'Video';
        var iframe = document.createElement('iframe');

        iframe.src =
          'https://www.youtube-nocookie.com/embed/' +
          encodeURIComponent(id) +
          '?autoplay=1&rel=0';
        iframe.title = title;
        iframe.allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.setAttribute('frameborder', '0');

        box.innerHTML = '';
        box.appendChild(iframe);
        box.classList.remove('fq-lite');
        iframe.focus();
      });
    });
  }

  /* -------------------------------------------------------- back to top */

  function initToTop() {
    var btn = document.querySelector('.fq-totop');
    if (!btn) return;

    var onScroll = function () {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
    });
  }

  /* --------------------------------------------------------------- init */

  function init() {
    document.documentElement.classList.remove('no-js');
    initNav();
    initActiveNav();
    initReveal();
    initLiteVideo();
    initToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
