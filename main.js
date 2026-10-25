// Nicola Napolitano — pulviscolo di luce, scorrimento morbido e capitoli che si aprono scorrendo
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = matchMedia("(min-width: 821px)");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  $("[data-year]").textContent = new Date().getFullYear();

  // parole che si accendono, anche dentro il corsivo
  $$("[data-words]").forEach((el) => {
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/([ \t\n]+)/).forEach((part) => {
          if (!part) return;
          if (/^[ \t\n]+$/.test(part)) { frag.append(part); return; }
          const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.append(s);
        });
        n.replaceWith(frag);
      } else walk(n);
    });
    walk(el);
  });
  const light = (el, p) => {
    const ws = el._w || (el._w = $$(".w", el));
    const n = Math.round(clamp(p, 0, 1) * ws.length);
    ws.forEach((w, i) => w.classList.toggle("on", i < n));
  };

  // le parole di HVCKLIFE lettera per lettera, ognuna nella sua finestrella
  $$(".company__words li").forEach((li) => {
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach((c) => {
          const m = document.createElement("span"); m.className = "lm";
          const s = document.createElement("span"); s.className = "lc"; s.textContent = c;
          m.append(s); frag.append(m);
        });
        n.replaceWith(frag);
      } else walk(n);
    });
    walk(li);
  });
  const fitAll = () => {};




  // si parte quando ci sono font e foto
  const fig = $(".hero__figure");
  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => (fig.complete ? r() : (fig.onload = fig.onerror = r))),
  ]).then(() => {
    fitAll();
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });
  fitAll();

  // cursore
  const cur = $(".cursor");
  if (matchMedia("(hover: hover)").matches) {
    let x = -100, y = -100, cx = x, cy = y;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; cur.classList.add("is-on"); });
    const loop = () => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); };
    loop();
    $$("a, button").forEach((a) => {
      a.addEventListener("mouseenter", () => cur.classList.add("is-link"));
      a.addEventListener("mouseleave", () => cur.classList.remove("is-link"));
    });
  }

  // ---------- scorrimento ----------
  gsap.registerPlugin(ScrollTrigger);
  // sul telefono la barra di Safari che appare e sparisce non deve far ricalcolare la pagina
  ScrollTrigger.config({ ignoreMobileResize: true });
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  let lenis = null;
  // scorrimento morbido solo con la rotellina del computer: sul telefono resta quello naturale
  if (!reduce && !touch && window.Lenis) {
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    e.preventDefault();
    const target = id === "#top" ? 0 : $(id);
    lenis ? lenis.scrollTo(target, { duration: 2 }) : (id === "#top" ? scrollTo(0, 0) : $(id).scrollIntoView());
  }));


  if (reduce) {
    $$("[data-words]").forEach((el) => light(el, 1));
    return;
  }

  // ---------- l'apertura si sfoca mentre arriva «In four years…» ----------
  // dipende solo da quanto si è scorso: in cima la foto è sempre nitida, anche su iPhone
  const heroStage = $(".hero__stage"), figBlur = $(".hero__figure--blur");
  const heroWords = $$(".hero__name, .hero__back");
  // sul telefono niente sfocatura in tempo reale: compare la copia già sfocata e le scritte sfumano
  const light3 = matchMedia("(max-width: 820px), (hover: none)").matches;
  let lastBlur = -1, queued = false;
  const paint = () => {
    queued = false;
    const p = clamp(scrollY / (innerHeight * 0.9), 0, 1);
    const v = Math.round(p * 100) / 100;
    if (v === lastBlur) return;
    lastBlur = v;
    if (light3) {
      figBlur.style.opacity = Math.min(v * 1.6, 1);
      heroWords.forEach((w) => { if (v) w.style.transition = "none"; w.style.opacity = v ? 1 - v * 0.9 : ""; });
    } else heroStage.style.filter = v ? `blur(${(v * 16).toFixed(1)}px)` : "";
  };
  const blurHero = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  addEventListener("scroll", blurHero, { passive: true });
  if (lenis) lenis.on("scroll", blurHero);
  paint();

  // ---------- capitoli della storia: foto ferme, il testo si accende scorrendo ----------
  {
    // il titolo si decifra lettera per lettera
    const ch = $(".chapter"), title = $(".chapter__title", ch);
    const htmlA = title.innerHTML, htmlB = '<span class="sans">Today</span>';
    const textA = $(".chapter__text--a", ch), textB = $(".chapter__text--b", ch);
    const glyphs = "abcdefghijklmnopqrstuvwxyz";
    let raf = 0;
    // le lettere si compongono da sinistra; quelle ancora da decifrare restano grigie e cambiano piano
    const decode = (html, plain) => {
      cancelAnimationFrame(raf);
      const from = title.textContent, t0 = performance.now(), dur = 1100, n = Math.max(from.length, plain.length);
      const rnd = Array.from({ length: n }, () => glyphs[(Math.random() * glyphs.length) | 0]);
      let last = 0;
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        if (t - last > 55) { for (let i = 0; i < n; i++) if (Math.random() < 0.35) rnd[i] = glyphs[(Math.random() * glyphs.length) | 0]; last = t; }
        const len = Math.round(from.length + (plain.length - from.length) * e);
        let out = "";
        for (let i = 0; i < len; i++) {
          const c = plain[i] || "";
          if (c === " ") { out += " "; continue; }
          out += e * (len + 3) > i + 3 ? c : `<span class="dec">${rnd[i]}</span>`;
        }
        title.innerHTML = out;
        if (p < 1) raf = requestAnimationFrame(step); else title.innerHTML = html;
      };
      raf = requestAnimationFrame(step);
    };
    let b = false;
    ScrollTrigger.create({
      trigger: ch, start: "top top", end: "+=220%", pin: true, anticipatePin: 1,
      onUpdate: (s) => {
        const p = s.progress, nowB = p >= 0.5;
        if (nowB !== b) {
          b = nowB;
          ch.classList.toggle("is-b", b);
          textA.classList.toggle("was-b", !b);
          decode(b ? htmlB : htmlA, b ? "Today" : "The start");
        }
        light(textA, p / 0.42);
        light(textB, (p - 0.52) / 0.4);
      },
    });
  }


  // ---------- chiusura ----------
  $$(".closing__line").forEach((l) => ScrollTrigger.create({ trigger: l, start: "top 80%", end: "bottom 50%", onUpdate: (s) => light(l, s.progress) }));
  gsap.fromTo(".prologue__title", { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: { trigger: ".prologue", start: "top 85%", end: "center 60%", scrub: true } });

  // ---------- company: la schermata si ferma e dall'icona escono le tre parole ----------
  const icon = $(".company__icon"), words = $$(".company__words li");
  // l'icona parte dal posto della prima parola e scende un gradino alla volta, lasciando le parole dietro di sé
  const midOf = (el) => (el.tagName === "LI" ? el.parentElement.offsetTop + el.offsetTop : el.offsetTop) + el.offsetHeight / 2;
  const stepY = (i) => (i < words.length ? midOf(words[i]) - midOf(icon) : 0);
  // basta un gesto: quando la sezione arriva a metà schermo le tre parole escono di fila da sole
  const ctl = gsap.timeline({ paused: true, scrollTrigger: { trigger: ".company__stage", start: "top 45%", toggleActions: "play none none reverse", invalidateOnRefresh: true } });
  gsap.set(icon, { y: () => stepY(0) });
  // l'icona compare già mentre si arriva, non solo quando la schermata si ferma
  gsap.fromTo(icon, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, ease: "power2.out", scrollTrigger: { trigger: ".company", start: "top 85%", end: "top 30%", scrub: true } });
  ctl.set(icon, { y: () => stepY(0) }, 0);
  words.forEach((li, i) => {
    const at = 0.1 + i * 0.42;
    ctl.to(icon, { y: () => stepY(i + 1), duration: 0.5, ease: "power3.inOut" }, at)
      .fromTo($$(".lc", li), { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.022, ease: "power3.out" }, at + 0.1);
  });

  // si ricalcola solo se cambia la larghezza (girando il telefono), non quando Safari mostra o nasconde la barra
  let lastW = innerWidth;
  addEventListener("resize", () => { if (innerWidth === lastW) return; lastW = innerWidth; fitAll(); ScrollTrigger.refresh(); });
  // il carattere può arrivare dopo: quando cambia l'altezza dei testi si ricalcola dove si ferma la storia
  const relayout = () => { fitAll(); ScrollTrigger.refresh(); };
  if (document.fonts) document.fonts.addEventListener("loadingdone", relayout);
  addEventListener("load", relayout);
  // controllo di sicurezza: se il blocco della storia non coincide più con il capitolo, si ricalcola subito
  const pinCheck = () => {
    const st = ScrollTrigger.getAll().find((s) => s.pin), ch = $(".chapter");
    if (!st) return;
    const real = (ch.parentElement.classList.contains("pin-spacer") ? ch.parentElement : ch).getBoundingClientRect().top + scrollY;
    if (Math.abs(st.start - real) > 2) ScrollTrigger.refresh();
  };
  ScrollTrigger.addEventListener("scrollStart", pinCheck);
  [300, 1200, 3000].forEach((t) => setTimeout(pinCheck, t));
  let lastH = 0;
  new ResizeObserver(([e]) => { const h = Math.round(e.contentRect.height); if (Math.abs(h - lastH) > 2) { lastH = h; ScrollTrigger.refresh(); } }).observe($(".prologue"));
})();
