(function () {
  'use strict';

  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initNetworkBackground(document) {
    const canvas = document.querySelector('[data-network-background]');
    if (!canvas || !canvas.getContext) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const points = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let animationId = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(document.documentElement.clientWidth, 1);
      height = Math.max(document.documentElement.clientHeight, 1);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const addPoint = () => points.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      radius: 1.2 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      ttl: 500 + Math.random() * 500,
      age: 0
    });
    const targetCount = () => width < 700 ? 72 : 150;
    const ease = value => {
      const progress = Math.max(0, Math.min(1, value));
      return progress * progress * (3 - 2 * progress);
    };
    const draw = (animate) => {
      context.clearRect(0, 0, width, height);
      const now = performance.now();
      points.forEach(point => {
        if (animate) {
          point.x += point.vx;
          point.y += point.vy;
          point.ttl -= 1;
          point.age += 1;
          if (point.ttl <= 0) {
            point.x = Math.random() * width;
            point.y = Math.random() * height;
            point.ttl = 500 + Math.random() * 500;
            point.age = 0;
          }
        }
        point.visibility = animate ? ease(Math.min(point.age / 70, point.ttl / 70)) : 1;
        const pulse = (animate ? 0.52 + Math.sin(now / 1100 + point.phase) * 0.14 : 0.52) * point.visibility;
        context.beginPath();
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.fillStyle = 'rgba(105, 150, 195, ' + Math.max(0, pulse) + ')';
        context.fill();
      });
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const first = points[i];
          const second = points[j];
          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (distance < 170 && (i * 13 + j * 7) % 4 !== 0) {
            const opacity = Math.max(0, (1 - distance / 170) * (animate ? 0.4 + Math.sin(now / 1300 + first.phase) * 0.08 : 0.34)) * Math.min(first.visibility, second.visibility);
            context.beginPath();
            context.moveTo(first.x, first.y);
            context.lineTo(second.x, second.y);
            context.strokeStyle = 'rgba(105, 150, 195, ' + opacity + ')';
            context.lineWidth = 1.2;
            context.stroke();
          }
        }
      }
    };
    const seed = () => {
      points.length = 0;
      for (let index = 0; index < targetCount(); index += 1) addPoint();
    };
    const stop = () => { if (animationId) window.cancelAnimationFrame(animationId); animationId = 0; };
    const animate = () => {
      draw(true);
      animationId = window.requestAnimationFrame(animate);
    };
    resize();
    seed();
    if (reducedMotion() || !window.requestAnimationFrame) draw(false);
    else animate();
    window.addEventListener('resize', () => { resize(); seed(); if (reducedMotion()) draw(false); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!reducedMotion() && !animationId) animate();
    });
  }

  function initBackToTop(window, document) {
    const button = document.querySelector('[data-back-to-top]');
    if (!button) return;
    const update = () => {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 16;
      button.classList.toggle('is-ready', scrollable);
      button.classList.toggle('is-visible', scrollable && window.scrollY > 80);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }));
    update();
  }

  function initLiquidPanel(window, document) {
    const panel = document.querySelector('[data-liquid-panel]');
    if (!panel) return;
    const status = panel.querySelector('[data-liquid-status]');
    const supportsWebgl = (() => {
      // JSDOM exposes getContext as a throwing stub; browser capability checks remain unchanged.
      if (window.navigator && /jsdom/i.test(window.navigator.userAgent || '')) return false;
      try {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (_) { return false; }
    })();
    const supportsWebgpu = Boolean(window.navigator && window.navigator.gpu);
    if (status) status.textContent = supportsWebgpu ? 'WebGPU 可用 · CSS 预览' : supportsWebgl ? 'WebGL 可用 · CSS 预览' : 'CSS 毛玻璃降级模式';
    const storageKey = 'apple-journal-liquid-glass';
    let stored = {};
    try { stored = JSON.parse(window.sessionStorage.getItem(storageKey) || '{}'); } catch (_) { stored = {}; }
    panel.querySelectorAll('[data-liquid-param]').forEach(control => {
      if (stored[control.dataset.liquidParam] !== undefined) control.value = stored[control.dataset.liquidParam];
      const output = panel.querySelector('[data-liquid-output="' + control.dataset.liquidParam + '"]');
      const update = () => {
        const value = control.value;
        if (output) output.value = Number(value).toFixed(control.step && Number(control.step) < 1 ? 2 : 0);
        const parameter = control.dataset.liquidParam;
        if (parameter === 'blur') document.documentElement.style.setProperty('--liquid-blur', value + 'px');
        if (parameter === 'shadow') document.documentElement.style.setProperty('--liquid-shadow-alpha', Math.min(.6, Number(value) / 60).toFixed(2));
        if (parameter === 'hue') document.documentElement.style.setProperty('--liquid-hue', value);
        if (parameter === 'tone') {
          const tones = { light: ['100%', '18%'], neutral: ['88%', '22%'], dark: ['28%', '20%'] };
          const tone = tones[value] || tones.light;
          document.documentElement.style.setProperty('--liquid-lightness', tone[0]);
          document.documentElement.style.setProperty('--liquid-saturation', tone[1]);
        }
        stored[control.dataset.liquidParam] = value;
        try { window.sessionStorage.setItem(storageKey, JSON.stringify(stored)); } catch (_) { /* session storage is optional */ }
      };
      control.addEventListener('input', update);
      update();
    });
    const toggle = () => { panel.hidden = !panel.hidden; if (!panel.hidden) panel.querySelector('select, input, button')?.focus(); };
    document.addEventListener('keydown', event => {
      if (event.shiftKey && event.key.toLowerCase() === 't') { event.preventDefault(); toggle(); }
      if (event.key === 'Escape' && !panel.hidden) panel.hidden = true;
    });
    panel.querySelector('[data-liquid-close]')?.addEventListener('click', () => { panel.hidden = true; });
  }

  function initHeader(document, window) {
    const header = document.querySelector('.site-header-home');
    if (!header) return;
    const hero = document.querySelector('.nature-hero');
    const update = () => {
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      header.classList.toggle('is-scrolled', heroBottom <= header.getBoundingClientRect().height);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initPostToc(window, document) {
    const list = document.querySelector('.post-sidebar .toc-scroll');
    const body = document.querySelector('.article-body');
    if (!list || !body) return;
    const entries = Array.from(list.querySelectorAll('a[href^="#"]')).map(link => {
      let id;
      try { id = decodeURIComponent(link.hash.slice(1)); } catch (_) { return null; }
      const heading = document.getElementById(id);
      return heading && body.contains(heading) ? { link, heading } : null;
    }).filter(Boolean);
    if (!entries.length) return;
    let current;
    const update = () => {
      let active = entries[0];
      for (const entry of entries) {
        if (entry.heading.getBoundingClientRect().top <= 120) active = entry;
        else break;
      }
      if (current === active) return;
      if (current) current.link.removeAttribute('aria-current');
      active.link.setAttribute('aria-current', 'location');
      current = active;
      const listBounds = list.getBoundingClientRect();
      const linkBounds = active.link.getBoundingClientRect();
      if (linkBounds.top < listBounds.top) list.scrollTop += linkBounds.top - listBounds.top;
      else if (linkBounds.bottom > listBounds.bottom) list.scrollTop += linkBounds.bottom - listBounds.bottom;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  initNetworkBackground(document);
  initBackToTop(window, document);
  initLiquidPanel(window, document);
  initHeader(document, window);
  initPostToc(window, document);
}());
