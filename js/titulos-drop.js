/* ===== TÍTULOS "DROP IN" (h1–h6) =====
   Cada letra cai de cima e assenta no lugar, com stagger entre as letras.
   Todo o movimento vem de uma simulação de mola (nada de CSS transition/@keyframes),
   com os mesmos números do prompt: tension 260, friction 20, stagger 28ms,
   letterOut { opacity: 0, y: -40 } -> letterIn { opacity: 1, y: 0 }. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const TENSION = 260;
  const FRICTION = 20;
  const STAGGER = 28;      // ms entre uma letra e a próxima
  const FROM_Y = -40;      // px
  const LOAD_DELAY = 450;  // ms: espera as seções da página entrarem (extras.css)
  const ATOMIC = "i, img, svg, .fx-lava"; // ícones e o texto "lava" caem inteiros, sem quebrar em letras

  const STEP = 1000 / 240;
  const S = STEP / 1000;

  const active = [];
  let raf = 0;
  let last = 0;
  let acc = 0;

  /* ---------- divide o título em palavras > letras ---------- */
  function split(node, units) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const word = document.createElement("span");
          word.className = "td-word";
          word.setAttribute("aria-hidden", "true");
          for (const ch of part) {
            const letter = document.createElement("span");
            letter.className = "td-unit";
            letter.textContent = ch;
            word.appendChild(letter);
            units.push(letter);
          }
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.matches(ATOMIC)) {
          child.classList.add("td-unit");
          if (child.textContent.trim()) child.setAttribute("aria-hidden", "true");
          units.push(child);
        } else if (child.tagName !== "BR") {
          split(child, units);
        }
      }
    });
  }

  function prepare(heading) {
    const label = heading.textContent.replace(/\s+/g, " ").trim();
    if (!label) return null;
    const units = [];
    split(heading, units);
    if (!units.length) return null;
    heading.setAttribute("aria-label", label); // leitores de tela leem o título inteiro
    heading.classList.add("td-ready");
    units.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = `translate3d(0, ${FROM_Y}px, 0)`;
    });
    return units;
  }

  /* ---------- simulação das molas ---------- */
  function play(units) {
    const delay = Math.max(0, LOAD_DELAY - performance.now());
    const t0 = performance.now() + delay;
    units.forEach((el, i) => {
      active.push({ el, t0: t0 + i * STAGGER, y: FROM_Y, vy: 0, o: 0, vo: 0 });
    });
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    acc += Math.min(now - last, 50);
    last = now;

    while (acc >= STEP) {
      for (const u of active) {
        if (now < u.t0) continue;
        u.vy += (-TENSION * u.y - FRICTION * u.vy) * S;
        u.y += u.vy * S;
        u.vo += (-TENSION * (u.o - 1) - FRICTION * u.vo) * S;
        u.o += u.vo * S;
      }
      acc -= STEP;
    }

    for (let i = active.length - 1; i >= 0; i--) {
      const u = active[i];
      if (now < u.t0) continue;
      const settled =
        Math.abs(u.y) < 0.05 && Math.abs(u.vy) < 0.05 &&
        Math.abs(1 - u.o) < 0.005 && Math.abs(u.vo) < 0.05;
      if (settled) {
        u.el.style.opacity = "";
        u.el.style.transform = "";
        active.splice(i, 1);
      } else {
        u.el.style.opacity = Math.min(1, Math.max(0, u.o)).toFixed(3);
        u.el.style.transform = `translate3d(0, ${u.y.toFixed(2)}px, 0)`;
      }
    }

    raf = active.length ? requestAnimationFrame(frame) : 0;
  }

  /* ---------- dispara quando o título aparece na tela (uma vez só) ---------- */
  function start() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          play(entry.target._tdUnits);
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
      if (h.hasAttribute("data-sem-drop")) return;
      const units = prepare(h);
      if (!units) return;
      h._tdUnits = units;
      io.observe(h);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();