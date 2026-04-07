/* eslint-disable no-undef */
(function () {
  if (customElements.get('one-client-why-gut')) return;

  var DURATION_TRAVEL = 1;
  var DURATION_GROW = 1;

  var CONTENT_SELECTOR = [
    '.\\31 -text-block',
    '.\\31 -button',
    '.\\31 -button-secondary',
    '.\\31 -link'
  ].join(', ');

  /* per-layout morph + breathing-origin config (viewBox-relative) */
  var LAYOUT_CONFIG = {
    desktop: {
      smallHaloD: 'M 658,440 C 661,440 663,442 663,445 C 663,448 661,450 658,450 C 655,450 653,448 653,445 C 653,442 655,440 658,440 Z',
      bigHaloD: 'M 658,245 C 768.457,245 858,334.543 858,445 C 858,555.457 768.457,645 658,645 C 547.543,645 458,555.457 458,445 C 458,334.543 547.543,245 658,245 Z',
      svgOrigin: '658 445',
      breatheScale: 1.6
    },
    mobile: {
      smallHaloD: 'M 187,395 C 189.761,395 192,397.239 192,400 C 192,402.761 189.761,405 187,405 C 184.239,405 182,402.761 182,400 C 182,397.239 184.239,395 187,395 Z',
      bigHaloD: 'M 187,280 C 253.274,280 307,333.726 307,400 C 307,466.274 253.274,520 187,520 C 120.726,520 67,466.274 67,400 C 67,333.726 120.726,280 187,280 Z',
      svgOrigin: '187 400',
      breatheScale: 1.15
    }
  };

  var pluginsRegistered = false;
  function ensurePlugins() {
    if (pluginsRegistered) return true;
    if (typeof gsap === 'undefined') return false;
    var plugins = [];
    if (typeof MotionPathPlugin !== 'undefined') plugins.push(MotionPathPlugin);
    if (typeof MorphSVGPlugin !== 'undefined') plugins.push(MorphSVGPlugin);
    if (typeof ScrollTrigger !== 'undefined') plugins.push(ScrollTrigger);
    if (plugins.length) gsap.registerPlugin.apply(gsap, plugins);
    pluginsRegistered = true;
    return true;
  }

  class OneClientWhyGut extends HTMLElement {
    constructor() {
      super();
      this._tl = null;
      this._mq = window.matchMedia('(max-width: 749px)');
      this._onChange = this._play.bind(this);
    }

    connectedCallback() {
      this._waitForGsap(this._play.bind(this));
      if (this._mq.addEventListener) {
        this._mq.addEventListener('change', this._onChange);
      } else if (this._mq.addListener) {
        this._mq.addListener(this._onChange);
      }
    }

    disconnectedCallback() {
      this._kill();
      if (this._mq.removeEventListener) {
        this._mq.removeEventListener('change', this._onChange);
      } else if (this._mq.removeListener) {
        this._mq.removeListener(this._onChange);
      }
    }

    _waitForGsap(cb) {
      if (ensurePlugins()) {
        cb();
        return;
      }
      var self = this;
      var attempts = 0;
      var poll = setInterval(function () {
        if (ensurePlugins() || ++attempts > 100) {
          clearInterval(poll);
          if (pluginsRegistered) cb.call(self);
        }
      }, 50);
    }

    _kill() {
      if (this._tl) {
        if (this._tl.scrollTrigger) this._tl.scrollTrigger.kill();
        this._tl.kill();
        this._tl = null;
      }
    }

    _play() {
      this._kill();

      var layoutEl = this._mq.matches
        ? this.querySelector('[data-ref="layout-mobile"]')
        : this.querySelector('[data-ref="layout-desktop"]');
      if (!layoutEl) return;

      var pathEl = layoutEl.querySelector('[data-ref="motion-path"]');
      var haloA = layoutEl.querySelector('[data-ref="halo-a"]');
      var haloB = layoutEl.querySelector('[data-ref="halo-b"]');
      var merged = layoutEl.querySelector('[data-ref="halo-merged"]');
      if (!pathEl || !haloA || !haloB || !merged) return;

      var cfg = this._mq.matches ? LAYOUT_CONFIG.mobile : LAYOUT_CONFIG.desktop;
      var contentEls = this.querySelectorAll(CONTENT_SELECTOR);

      gsap.set(haloA, {
        autoAlpha: 1,
        motionPath: { path: pathEl, align: pathEl, alignOrigin: [0.5, 0.5], start: 0, end: 0 }
      });
      gsap.set(haloB, {
        autoAlpha: 1,
        motionPath: { path: pathEl, align: pathEl, alignOrigin: [0.5, 0.5], start: 1, end: 1 }
      });
      gsap.set(merged, { opacity: 0, attr: { d: cfg.smallHaloD } });
      gsap.set(contentEls, { opacity: 0, y: -30 });

      var tlConfig = {};
      if (typeof ScrollTrigger !== 'undefined') {
        tlConfig.scrollTrigger = {
          trigger: this,
          start: 'top 75%',
          toggleActions: 'play none none none',
          once: true
        };
      }
      var tl = gsap.timeline(tlConfig);
      this._tl = tl;

      /* halo A: start → center */
      tl.to(haloA, {
        duration: DURATION_TRAVEL,
        ease: 'power1.inOut',
        motionPath: { path: pathEl, align: pathEl, alignOrigin: [0.5, 0.5], start: 0, end: 0.5 }
      }, 0);

      /* halo B: end → center */
      tl.to(haloB, {
        duration: DURATION_TRAVEL,
        ease: 'power1.inOut',
        motionPath: { path: pathEl, align: pathEl, alignOrigin: [0.5, 0.5], start: 1, end: 0.5 }
      }, 0);

      /* fade out the small halos right at collision */
      tl.to([haloA, haloB], {
        duration: 0.15,
        opacity: 0,
        ease: 'power2.in'
      }, DURATION_TRAVEL - 0.05);

      /* show + morph merged halo from tiny → big */
      tl.set(merged, { opacity: 1 }, DURATION_TRAVEL);
      tl.to(merged, {
        duration: DURATION_GROW,
        ease: 'power2.out',
        morphSVG: cfg.bigHaloD
      }, DURATION_TRAVEL);

      /* stagger fade-in-down — starts same time as halo grow */
      if (contentEls.length) {
        tl.to(contentEls, {
          duration: 0.25,
          opacity: 1,
          y: 0,
          ease: 'power2.out',
          stagger: 0.05
        }, DURATION_TRAVEL);
      }

      /* breathing pulse — continuous after grow */
      gsap.set(merged, { svgOrigin: cfg.svgOrigin });
      tl.to(merged, {
        scale: 1.6,
        opacity: 1,
        duration: 1.6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      }, DURATION_TRAVEL + DURATION_GROW);
    }
  }

  customElements.define('one-client-why-gut', OneClientWhyGut);
})();
