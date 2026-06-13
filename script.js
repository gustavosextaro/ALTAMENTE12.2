/* =================================================================
   ALTAMENTE — script.js
   Header scroll · Menu mobile · Partículas · Validação ·
   Animações GSAP/ScrollTrigger (scroll horizontal dos pilares + reveals/contadores)
   com fallback estático se o GSAP não carregar / reduced-motion.
================================================================== */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onReady = (fn) =>
    document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn);

  onReady(function () {

    /* -------------------------------------------------------------
       1. HEADER — blur/opacidade ao scrollar
    ------------------------------------------------------------- */
    const header = document.getElementById("header");
    const onScrollHeader = () => {
      if (window.scrollY > 40) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScrollHeader();
    window.addEventListener("scroll", onScrollHeader, { passive: true });

    /* -------------------------------------------------------------
       2. MENU MOBILE — hamburger + overlay
    ------------------------------------------------------------- */
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("nav-links");
    const overlay = document.getElementById("menu-overlay");

    const closeMenu = () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
      overlay.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    const toggleMenu = () => {
      const open = hamburger.classList.toggle("active");
      navLinks.classList.toggle("active", open);
      overlay.classList.toggle("active", open);
      hamburger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };

    hamburger.addEventListener("click", toggleMenu);
    overlay.addEventListener("click", closeMenu);
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("active")) closeMenu();
    });

    /* -------------------------------------------------------------
       2.1 SCROLL SUAVE DAS ÂNCORAS (em JS, não no CSS).
       Substitui o `scroll-behavior: smooth` do CSS — que quebrava as medições do
       ScrollTrigger.refresh(). Aqui o smooth só roda no clique do usuário, sem
       interferir no refresh. Desconta a altura do header fixo para o alvo não ficar
       escondido atrás dele. */
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 76;
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const hash = a.getAttribute("href");
        if (!hash || hash.length < 2) return;            // ignora href="#"
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerH);
        window.scrollTo({ top: y, behavior: prefersReduced ? "auto" : "smooth" });
        history.pushState(null, "", hash);
      });
    });

    /* -------------------------------------------------------------
       2.5 ONDAS DE PARTÍCULAS (canvas global) — fluxos dourados nos cantos.
       Elemento de identidade do estilo CoinLombard: "folhas" de pontos que
       ondulam continuamente. Concentradas nas bordas -> não cobrem o texto.
    ------------------------------------------------------------- */
    const fx = document.getElementById("fx-waves");
    if (fx && !prefersReduced) {
      const fxctx = fx.getContext("2d");
      let FW = 0, FH = 0, t = 0;

      // Cada ribbon: ponto inicial/final em frações da tela (podem sair da borda),
      // espessura perpendicular (w), amplitude/frequência da onda e velocidade.
      const ribbons = [
        { x0: 1.18, y0: 0.08, x1: 0.52, y1: 0.40, w: 0.16, amp: 0.045, freq: 5.0, speed: 0.50 },
        { x0: -0.18, y0: 0.90, x1: 0.48, y1: 0.60, w: 0.16, amp: 0.050, freq: 5.5, speed: -0.42 },
        { x0: 1.16, y0: 0.80, x1: 0.60, y1: 0.98, w: 0.13, amp: 0.040, freq: 4.5, speed: 0.36 },
      ];
      const COLS = 56, ROWS = 13;

      const fxResize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        FW = window.innerWidth; FH = window.innerHeight;
        fx.width = FW * dpr; fx.height = FH * dpr;
        fx.style.width = FW + "px"; fx.style.height = FH + "px";
        fxctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const drawRibbon = (r) => {
        const p0x = r.x0 * FW, p0y = r.y0 * FH;
        const dx = r.x1 * FW - p0x, dy = r.y1 * FH - p0y;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;     // perpendicular unitário
        const width = r.w * FH;
        for (let i = 0; i <= COLS; i++) {
          const u = i / COLS;
          const baseX = p0x + dx * u, baseY = p0y + dy * u;
          const envU = Math.sin(Math.PI * u);    // some nas pontas do comprimento
          for (let j = 0; j <= ROWS; j++) {
            const v = (j / ROWS) * 2 - 1;         // -1..1 ao longo da espessura
            const wave = Math.sin(u * r.freq * Math.PI + t * r.speed + v * 1.6) * r.amp * FH;
            const off = v * width * (0.5 + 0.5 * envU) + wave;
            const x = baseX + px * off, y = baseY + py * off;
            const envV = 1 - Math.abs(v);         // some nas bordas da espessura
            const a = envU * envV * 0.5;
            if (a <= 0.02) continue;
            fxctx.beginPath();
            fxctx.arc(x, y, 0.8 + envV * 1.1, 0, Math.PI * 2);
            fxctx.fillStyle = "rgba(201,168,76," + a.toFixed(3) + ")";
            fxctx.fill();
          }
        }
      };

      let fxRaf = null;
      const fxLoop = () => {
        fxctx.clearRect(0, 0, FW, FH);
        t += 0.016;
        ribbons.forEach(drawRibbon);
        fxRaf = requestAnimationFrame(fxLoop);
      };
      fxResize();
      fxLoop();
      let fxTimer;
      window.addEventListener("resize", () => { clearTimeout(fxTimer); fxTimer = setTimeout(fxResize, 200); });
      // pausa quando a aba não está visível (economia)
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { if (fxRaf) { cancelAnimationFrame(fxRaf); fxRaf = null; } }
        else if (!fxRaf) fxLoop();
      });
    }

    /* -------------------------------------------------------------
       3. PARTÍCULAS DO HERO (canvas) — pontos dourados flutuantes
    ------------------------------------------------------------- */
    const canvas = document.getElementById("particles");
    if (canvas && !prefersReduced) {
      const ctx = canvas.getContext("2d");
      const hero = canvas.parentElement;
      let particles = [];
      let raf = null;
      let width = 0,
        height = 0;

      const setSize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = hero.offsetWidth;
        height = hero.offsetHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const makeParticles = () => {
        const count = Math.min(90, Math.floor((width * height) / 16000));
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.8 + 0.6,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          a: Math.random() * 0.5 + 0.2,
        }));
      };

      const LINK_DIST = 130;
      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, " + p.a * 0.8 + ")";
          ctx.fill();

          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x,
              dy = p.y - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < LINK_DIST) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = "rgba(255, 255, 255, " + (1 - dist / LINK_DIST) * 0.1 + ")";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
        raf = requestAnimationFrame(draw);
      };

      const init = () => {
        setSize();
        makeParticles();
      };
      init();
      draw();

      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(init, 200);
      });

      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (!raf) draw();
            } else if (raf) {
              cancelAnimationFrame(raf);
              raf = null;
            }
          });
        }).observe(hero);
      }
    }

    /* -------------------------------------------------------------
       4. VALIDAÇÃO DO FORMULÁRIO (frontend)
    ------------------------------------------------------------- */
    const form = document.getElementById("contact-form");
    if (form) {
      const feedback = document.getElementById("form-feedback");

      /* ============================================================
         WHATSAPP DO CLIENTE — TROCAR pelo número real abaixo.
         Formato: só dígitos, código do país + DDD + número (ex.: 5511987654321).
         Esse mesmo número é usado no botão do form E no link "Iniciar conversa".
      ============================================================ */
      const WHATSAPP_NUMBER = "5511989310307";
      const waLink = document.getElementById("wa-link");
      if (waLink) waLink.href = "https://wa.me/" + WHATSAPP_NUMBER;

      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRe = /[\d]{8,}/;

      const setError = (field, msg) => {
        field.classList.add("invalid");
        const small = field.querySelector(".error-msg");
        if (small) small.textContent = msg;
      };
      const clearError = (field) => {
        field.classList.remove("invalid");
        const small = field.querySelector(".error-msg");
        if (small) small.textContent = "";
      };
      const validateField = (input) => {
        const field = input.closest(".field");
        const value = input.value.trim();
        if (input.hasAttribute("required") && !value) {
          setError(field, "Este campo é obrigatório.");
          return false;
        }
        if (input.type === "email" && value && !emailRe.test(value)) {
          setError(field, "Digite um e-mail válido.");
          return false;
        }
        if (input.type === "tel" && value && !phoneRe.test(value.replace(/\D/g, ""))) {
          setError(field, "Digite um telefone válido.");
          return false;
        }
        clearError(field);
        return true;
      };

      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.addEventListener("blur", () => validateField(input));
        input.addEventListener("input", () => {
          if (input.closest(".field").classList.contains("invalid")) validateField(input);
        });
      });

      form.addEventListener("submit", (e) => {
        let valid = true;
        inputs.forEach((input) => {
          if (!validateField(input)) valid = false;
        });
        if (!valid) {
          e.preventDefault();
          feedback.textContent = "Por favor, corrija os campos destacados.";
          feedback.className = "form-feedback error";
          const firstInvalid = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
          if (firstInvalid) firstInvalid.focus();
          return;
        }
        // Tudo válido: monta a mensagem e abre o WhatsApp do cliente já preenchido.
        e.preventDefault();
        const val = (id) => {
          const el = form.querySelector("#" + id);
          return el ? el.value.trim() : "";
        };
        const texto =
          "Olá! Vim pelo site da Altamente e quero falar com vocês.\n\n" +
          "*Nome:* " + val("nome") + "\n" +
          "*E-mail:* " + val("email") + "\n" +
          "*Telefone:* " + val("telefone") + "\n" +
          "*Assunto:* " + val("assunto") + "\n\n" +
          "*Mensagem:*\n" + val("mensagem");
        const waUrl = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(texto);
        window.open(waUrl, "_blank", "noopener");
        feedback.textContent = "Tudo certo! Abrindo o WhatsApp com sua mensagem. É só confirmar o envio por lá.";
        feedback.className = "form-feedback success";
      });
    }

    /* =============================================================
       5. ANIMAÇÕES
       Helper de formatação dos contadores + dispatch GSAP/fallback
    ============================================================= */
    const fmt = (el, value) => {
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      el.textContent = Number(value).toFixed(decimals) + (el.dataset.suffix || "");
    };

    // FALLBACK: sem GSAP ou com reduced-motion -> mostra tudo e finaliza contadores
    const revealAllStatic = () => {
      document.querySelectorAll(".reveal, .hero-inner > *").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      // indicador de scroll: só opacidade (não mexer no translateX(-50%) que o centraliza)
      const si = document.querySelector(".scroll-indicator");
      if (si) si.style.opacity = "1";
      document.querySelectorAll(".stat-number").forEach((el) => fmt(el, parseFloat(el.dataset.target)));
    };

    const hasGSAP = window.gsap && window.ScrollTrigger;

    if (prefersReduced || !hasGSAP) {
      revealAllStatic();
      return;
    }

    /* ---------- GSAP ATIVO ---------- */
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* 5.1 — Entrada cinematográfica do HERO (todas as telas, no load).
       O badge recebe só opacidade para não brigar com o float (CSS). */
    gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out" } })
      .fromTo(".hero-badge", { opacity: 0 }, { opacity: 1, duration: 0.7 })
      .fromTo(".hero-title", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.4")
      .fromTo(".hero-subtitle", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.55")
      .fromTo(".hero-support", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.5")
      .fromTo(".hero-ctas", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.5")
      // teaser do evento: SÓ opacidade (no desktop ele usa translateY(-50%) p/ centralizar;
      // animar y aqui sobrescreveria esse transform e quebraria o alinhamento)
      .fromTo(".hero-event", { opacity: 0 }, { opacity: 1, duration: 0.7 }, "-=0.5")
      // indicador de scroll: só opacidade (preserva o translateX(-50%) de centralização)
      .fromTo(".scroll-indicator", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "-=0.3");

    /* 5.2 — Reveals genéricos (Sobre, Serviços, Workshop, Contato) em fluxo normal.
       Excluímos a seção de Números (tratada à parte, com/sem pin). */
    const genericReveals = gsap.utils.toArray(".reveal").filter((el) => !el.closest(".numbers"));
    gsap.set(genericReveals, { y: 40 });
    ScrollTrigger.batch(genericReveals, {
      start: "top 86%",
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", overwrite: true }),
    });

    /* 5.3 — (Seção de números removida: virou DEPOIMENTOS, que entram pelo reveal
       genérico acima.) */

    /* 5.4 — matchMedia: animações que dependem do tamanho de tela.
       Pins/scroll horizontal só no desktop (em mobile o scroll-jacking é ruim). */
    const mm = gsap.matchMedia();

    /* 5.4a — HERO parallax (desktop): foto/grade deslizam e o conteúdo some ao rolar.
       IMPORTANTE: usamos fromTo() com estado inicial EXPLÍCITO (não .to()). Num tween
       com scrub, o .to() grava o "ponto de partida" a partir do valor atual do elemento.
       Se um ScrollTrigger.refresh() acontecer com a página já rolada (ex.: fontes/imagens
       que carregam tarde, ou resize), esse ponto de partida é recapturado já no estado
       final (autoAlpha:0). Aí, ao voltar pro topo, a hero ficava presa invisível até dar
       F5. fromTo() + invalidateOnRefresh fixam o início em autoAlpha:1 -> sempre reaparece. */
    mm.add("(min-width: 1024px)", () => {
      gsap.fromTo(".hero-pattern", { yPercent: 0 }, { yPercent: 35, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
      gsap.fromTo(".hero-photo", { yPercent: 0, scale: 1.04 }, { yPercent: 12, scale: 1.12, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
      gsap.fromTo(".hero-inner", { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "18% top", end: "78% top", scrub: true, invalidateOnRefresh: true } });
      gsap.fromTo(".scroll-indicator", { autoAlpha: 1 }, { autoAlpha: 0, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "12% top", scrub: true, invalidateOnRefresh: true } });
    });

    /* 5.4b — PILARES agora são cards estáticos (sem scroll horizontal). As imagens de
       fundo de cada card ganham um parallax vertical sutil para não ficarem "coladas". */
    gsap.utils.toArray(".hpanel-media").forEach((media) => {
      gsap.fromTo(media, { yPercent: -7, scale: 1.12 }, {
        yPercent: 7, scale: 1.04, ease: "none",
        scrollTrigger: {
          trigger: media.parentElement, start: "top bottom", end: "bottom top", scrub: true,
        },
      });
    });

    /* 5.5 — Recalcula posições após carregar imagens/fontes (evita pins desalinhados). */
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  });
})();
