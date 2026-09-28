(function () {
  'use strict';

  const hero = document.querySelector('[data-home-hero]');
  if (!hero) return;

  const typed = hero.querySelector('[data-typed-text]');
  const phrases = Array.from(hero.querySelectorAll('[data-phrase]'), item => item.textContent);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
  const letters = phrases.map(text => segmenter ? Array.from(segmenter.segment(text), item => item.segment) : Array.from(text));
  let phraseIndex = 0;
  let position = 0;
  let deleting = false;
  let delay = 100;
  let timer;
  let inView = true;
  let pageActive = true;

  function schedule() {
    window.clearTimeout(timer);
    if (!motion.matches && !document.hidden && inView && pageActive) {
      timer = window.setTimeout(step, delay);
    }
  }

  function step() {
    position += deleting ? -1 : 1;
    typed.textContent = letters[phraseIndex].slice(0, position).join('');
    if (!deleting && position === letters[phraseIndex].length) {
      deleting = true;
      delay = 2200;
    } else if (deleting && position === 0) {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      deleting = false;
      delay = 400;
    } else {
      delay = deleting ? 50 : 100;
    }
    schedule();
  }

  function resetMotion() {
    window.clearTimeout(timer);
    hero.classList.toggle('is-typing', !motion.matches);
    phraseIndex = 0;
    position = 0;
    deleting = false;
    delay = 100;
    typed.textContent = motion.matches ? phrases[0] : '';
    schedule();
  }

  motion.addEventListener('change', resetMotion);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('pagehide', function () { pageActive = false; schedule(); });
  window.addEventListener('pageshow', function () { pageActive = true; schedule(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      schedule();
    });
    observer.observe(hero);
  }
  resetMotion();

  const quotes = Array.from(hero.querySelectorAll('[data-quote-entry]'), item => ({
    text: item.querySelector('[data-quote-entry-text]').textContent,
    author: item.querySelector('[data-quote-entry-author]').textContent
  }));
  const content = hero.querySelector('[data-quote-content]');
  const quoteText = hero.querySelector('[data-quote-text]');
  const author = hero.querySelector('[data-quote-author]');
  const button = hero.querySelector('[data-quote-next]');
  let current = quotes[0];
  const canChange = new Set(quotes.map(quote => quote.text)).size > 1;
  button.hidden = false;
  button.disabled = !canChange;

  button.addEventListener('click', function () {
    if (button.disabled) return;
    const candidates = quotes.filter(quote => quote.text !== current.text);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    const swap = function () {
      current = next;
      quoteText.textContent = next.text;
      author.textContent = next.author;
      author.hidden = !next.author;
      content.classList.remove('is-changing');
    };
    if (motion.matches) {
      swap();
      return;
    }
    button.disabled = true;
    content.classList.add('is-changing');
    window.setTimeout(function () {
      swap();
      window.setTimeout(function () { button.disabled = !canChange; }, 180);
    }, 180);
  });
})();
