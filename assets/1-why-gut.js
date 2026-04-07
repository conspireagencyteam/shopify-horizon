(function () {
  var section = document.querySelector('[class*="1-why-gut"]');
  if (!section) return;

  /* Escaped selectors for classes starting with 1- */
  var S = {
    textBlock: '.\\31 -text-block',
    button: '.\\31 -button',
    buttonSecondary: '.\\31 -button-secondary',
    link: '.\\31 -link'
  };
  var contentSelector = [S.textBlock, S.button, S.buttonSecondary, S.link].join(', ');

  var DURATION_TRAVEL = 1;
  var DURATION_GROW = 1;

  var configs = {
    desktop: {
      pathSel: '#motionPath',
      haloASel: '#haloA',
      haloBSel: '#haloB',
      mergedSel: '#haloMerged',
      smallHaloD: 'M 658,440 C 661,440 663,442 663,445 C 663,448 661,450 658,450 C 655,450 653,448 653,445 C 653,442 655,440 658,440 Z',
      bigHaloD: 'M 658,245 C 768.457,245 858,334.543 858,445 C 858,555.457 768.457,645 658,645 C 547.543,645 458,555.457 458,445 C 458,334.543 547.543,245 658,245 Z',
      svgOrigin: '658 445'
    },
    mobile: {
      pathSel: '#motionPathMobile',
      haloASel: '#haloAMobile',
      haloBSel: '#haloBMobile',
      mergedSel: '#haloMergedMobile',
      smallHaloD: 'M 187,395 C 189.761,395 192,397.239 192,400 C 192,402.761 189.761,405 187,405 C 184.239,405 182,402.761 182,400 C 182,397.239 184.239,395 187,395 Z',
      bigHaloD: 'M 187,280 C 253.274,280 307,333.726 307,400 C 307,466.274 253.274,520 187,520 C 120.726,520 67,466.274 67,400 C 67,333.726 120.726,280 187,280 Z',
      svgOrigin: '187 400'
    }
  };

  var mq = window.matchMedia('(max-width: 749px)');
  var currentTl = null;

  function build(cfg) {
    var hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
    var plugins = [MotionPathPlugin, MorphSVGPlugin];
    if (hasScrollTrigger) plugins.push(ScrollTrigger);
    gsap.registerPlugin.apply(gsap, plugins);

    /* place haloA at start of path, haloB at end of path, then reveal them */
    gsap.set(cfg.haloASel, {
      autoAlpha: 1,
      motionPath: {
        path: cfg.pathSel,
        align: cfg.pathSel,
        alignOrigin: [0.5, 0.5],
        start: 0,
        end: 0
      }
    });
    gsap.set(cfg.haloBSel, {
      autoAlpha: 1,
      motionPath: {
        path: cfg.pathSel,
        align: cfg.pathSel,
        alignOrigin: [0.5, 0.5],
        start: 1,
        end: 1
      }
    });
    gsap.set(cfg.mergedSel, { opacity: 0, attr: { d: cfg.smallHaloD } });
    gsap.set(contentSelector, { opacity: 0, y: -30 });

    var tlConfig = {};
    if (hasScrollTrigger) {
      tlConfig.scrollTrigger = {
        trigger: section,
        start: 'top 75%',
        toggleActions: 'play none none none',
        once: true
      };
    }
    var tl = gsap.timeline(tlConfig);

    /* halo A: start → center */
    tl.to(cfg.haloASel, {
      duration: DURATION_TRAVEL,
      ease: 'power1.inOut',
      motionPath: {
        path: cfg.pathSel,
        align: cfg.pathSel,
        alignOrigin: [0.5, 0.5],
        start: 0,
        end: 0.5
      }
    }, 0);

    /* halo B: end → center */
    tl.to(cfg.haloBSel, {
      duration: DURATION_TRAVEL,
      ease: 'power1.inOut',
      motionPath: {
        path: cfg.pathSel,
        align: cfg.pathSel,
        alignOrigin: [0.5, 0.5],
        start: 1,
        end: 0.5
      }
    }, 0);

    /* fade out the small halos right at collision */
    tl.to(cfg.haloASel + ', ' + cfg.haloBSel, {
      duration: 0.15,
      opacity: 0,
      ease: 'power2.in'
    }, DURATION_TRAVEL - 0.05);

    /* show + morph merged halo from tiny → big */
    tl.set(cfg.mergedSel, { opacity: 1 }, DURATION_TRAVEL);
    tl.to(cfg.mergedSel, {
      duration: DURATION_GROW,
      ease: 'power2.out',
      morphSVG: cfg.bigHaloD
    }, DURATION_TRAVEL);

    /* stagger fade-in-down — starts same time as halo grow */
    tl.to(contentSelector, {
      duration: 0.25,
      opacity: 1,
      y: 0,
      ease: 'power2.out',
      stagger: 0.05
    }, DURATION_TRAVEL);

    /* breathing pulse — continuous after grow */
    gsap.set(cfg.mergedSel, { svgOrigin: cfg.svgOrigin });
    tl.to(cfg.mergedSel,
      {
        scale: 1.6,
        opacity: 1,
        duration: 1.6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      },
      DURATION_TRAVEL + DURATION_GROW
    );

    return tl;
  }

  function play() {
    if (currentTl) {
      if (currentTl.scrollTrigger) currentTl.scrollTrigger.kill();
      currentTl.kill();
    }
    var cfg = mq.matches ? configs.mobile : configs.desktop;
    currentTl = build(cfg);
  }

  play();

  if (mq.addEventListener) {
    mq.addEventListener('change', play);
  } else if (mq.addListener) {
    mq.addListener(play);
  }
})();
