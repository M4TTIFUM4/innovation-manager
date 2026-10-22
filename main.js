/* FlussAI — interazioni */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header */
  var header = document.querySelector(".header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Menu */
  var menuBtn = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    header.classList.toggle("is-scrolled", open || window.scrollY > 10);
  }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* Ingresso elementi */
  var fades = document.querySelectorAll(".fade");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    fades.forEach(function (el) {
      var sib = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("fade"); });
      var i = sib.indexOf(el);
      if (i > 0) el.style.transitionDelay = Math.min(i, 4) * 90 + "ms";
      io.observe(el);
    });
  } else {
    fades.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Contatori nel mockup */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = +el.dataset.count;
    if (reduce) { el.textContent = target.toLocaleString("it-IT"); return; }
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1800, 1);
      var v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      if (p < 1) requestAnimationFrame(step);
    }
    setTimeout(function () { requestAnimationFrame(step); }, 500);
  });

  /* Testo che si colora parola per parola durante lo scroll */
  var blocks = document.querySelectorAll("[data-reveal]");
  blocks.forEach(function (p) {
    var html = "";
    p.childNodes.forEach(function (node) {
      var text = node.textContent.trim();
      if (!text) return;
      var words = text.split(/\s+/).map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");
      html += (html ? " " : "") + (node.nodeType === 1 ? "<em>" + words + "</em>" : words);
    });
    p.innerHTML = html;
  });
  var words = Array.prototype.slice.call(document.querySelectorAll(".reveal-text .w"));
  function paintWords() {
    var vh = window.innerHeight;
    words.forEach(function (w) {
      var top = w.getBoundingClientRect().top;
      w.classList.toggle("on", top < vh * 0.62);
    });
  }
  if (reduce) words.forEach(function (w) { w.classList.add("on"); });
  else { window.addEventListener("scroll", paintWords, { passive: true }); paintWords(); }

  /* Linea che si disegna nella sezione blu */
  var path = document.getElementById("thread-path");
  var blue = document.querySelector(".blue");
  if (path && blue) {
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = reduce ? 0 : len;
    if (!reduce) {
      var drawThread = function () {
        var r = blue.getBoundingClientRect();
        var p = Math.min(Math.max((window.innerHeight * 0.7 - r.top) / r.height, 0), 1);
        path.style.strokeDashoffset = len * (1 - p);
      };
      window.addEventListener("scroll", drawThread, { passive: true });
      drawThread();
    }
  }

  /* Stepper metodo */
  var tabs = document.querySelectorAll(".stepper__tabs button");
  var panels = document.querySelectorAll(".panel");
  var bar = document.querySelector(".stepper__bar span");
  var prev = document.querySelector('.round[data-dir="-1"]');
  var next = document.querySelector('.round[data-dir="1"]');
  var current = 0;
  function go(i) {
    current = Math.max(0, Math.min(tabs.length - 1, i));
    tabs.forEach(function (t, k) { t.setAttribute("aria-selected", String(k === current)); });
    panels.forEach(function (p, k) { p.classList.toggle("is-active", k === current); });
    bar.style.width = ((current + 1) / tabs.length * 100) + "%";
    prev.disabled = current === 0;
    next.disabled = current === tabs.length - 1;
  }
  tabs.forEach(function (t, k) { t.addEventListener("click", function () { go(k); }); });
  prev.addEventListener("click", function () { go(current - 1); });
  next.addEventListener("click", function () { go(current + 1); });
  go(0);

  /* Notifica */
  var toast = document.getElementById("toast");
  var toastKey = "flussa-toast-closed";
  var closed = false;
  try { closed = sessionStorage.getItem(toastKey) === "1"; } catch (e) {}
  function hideToast() { toast.hidden = true; try { sessionStorage.setItem(toastKey, "1"); } catch (e) {} }
  if (!closed) setTimeout(function () { toast.hidden = false; }, 9000);
  toast.querySelector(".toast__close").addEventListener("click", hideToast);
  toast.querySelector(".toast__go").addEventListener("click", hideToast);

  /* Modulo
     Per ricevere le richieste: inserire un endpoint (es. Formspree) nell'attributo action del form.
     Senza endpoint si apre il client email precompilato. */
  var form = document.getElementById("lead-form");
  var msg = document.getElementById("form-msg");
  var EMAIL = "ciao@flussai.it";
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    form.querySelectorAll("[required]").forEach(function (el) {
      var bad = el.type === "checkbox" ? !el.checked : !el.value.trim() || (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value));
      (el.type === "checkbox" ? el.parentElement : el).classList.toggle("invalid", bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    if (!ok) { msg.textContent = "Completa i campi evidenziati."; return; }

    var data = new FormData(form);
    var action = form.getAttribute("action");
    if (action) {
      msg.textContent = "Invio in corso…";
      fetch(action, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw 0; form.reset(); msg.textContent = "Grazie! Ti contattiamo entro 24 ore per fissare la call."; })
        .catch(function () { msg.textContent = "Qualcosa è andato storto. Scrivici a " + EMAIL; });
    } else {
      var body = "Nome: " + data.get("nome") + "\nAzienda: " + (data.get("azienda") || "-") + "\nEmail: " + data.get("email") +
        "\nTelefono: " + (data.get("telefono") || "-") + "\n\nAttività che fa perdere più tempo:\n" + (data.get("messaggio") || "-");
      window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Richiesta call gratuita") + "&body=" + encodeURIComponent(body);
      msg.textContent = "Si sta aprendo il tuo programma di posta.";
    }
  });
  form.querySelectorAll("input, textarea").forEach(function (el) {
    el.addEventListener("input", function () { (el.type === "checkbox" ? el.parentElement : el).classList.remove("invalid"); });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
