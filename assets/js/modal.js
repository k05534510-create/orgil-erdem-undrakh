/* ОЭУ ХХК — click-to-open popups
   • Click any ISO/standard chip (marquee or a member's certs) → short trustworthy info.
   • Click a team member card → full profile.
   Accessible: keyboard-openable, Esc/backdrop close, focus returned to trigger.
*/
(function () {
  "use strict";

  /* ---- ISO / standard reference (short, verifiable) ---- */
  var ISO = {
    "ISO 9001":  { en: "Quality management systems", mn: "Чанарын менежментийн тогтолцоо",
      d: "Дэлхийд хамгийн өргөн хэрэглэгддэг чанарын менежментийн стандарт. Байгууллага үйлчлүүлэгч болон хууль зүйн шаардлагыг тогтвортой хангаж, үйл ажиллагаагаа тасралтгүй сайжруулахад чиглэнэ. Хамгийн сүүлийн хувилбар: ISO 9001:2015." },
    "ISO 14001": { en: "Environmental management systems", mn: "Байгаль орчны менежментийн тогтолцоо",
      d: "Байгууллага байгаль орчинд үзүүлэх нөлөөллөө удирдан бууруулж, холбогдох хууль тогтоомжид нийцүүлэх тогтолцоо. Нөөцийн үр ашигтай хэрэглээ, хог хаягдлын бууралтад тусална. ISO 14001:2015." },
    "ISO 45001": { en: "Occupational health & safety management systems", mn: "Хөдөлмөрийн аюулгүй байдал, эрүүл мэндийн менежментийн тогтолцоо",
      d: "Ажлын байрны осол, мэргэжлээс шалтгаалах өвчлөлөөс урьдчилан сэргийлэхэд чиглэсэн олон улсын стандарт. 2018 онд хуучин OHSAS 18001-ийг орлосон. ISO 45001:2018." },
    "ISO 50001": { en: "Energy management systems", mn: "Эрчим хүчний менежментийн тогтолцоо",
      d: "Эрчим хүчний хэрэглээгээ системтэйгээр удирдан, үр ашгийг нэмэгдүүлж, зардал болон хүлэмжийн хийн ялгарлыг бууруулах тогтолцоо. ISO 50001:2018." },
    "ISO 22000": { en: "Food safety management systems", mn: "Хүнсний аюулгүй байдлын менежментийн тогтолцоо",
      d: "Хүнсний сүлжээний бүх шатанд аюулгүй байдлыг хангах стандарт. HACCP зарчим болон менежментийн тогтолцооны хандлагыг нэгтгэдэг. ISO 22000:2018." },
    "GMP": { en: "Good Manufacturing Practice", mn: "Үйлдвэрлэлийн зохистой дадал",
      d: "Бүтээгдэхүүнийг чанарын шаардлагад нийцүүлэн тогтвортой үйлдвэрлэж, хянах олон улсад хүлээн зөвшөөрөгдсөн дадал. Эм, хүнсний үйлдвэрлэлд өргөн мөрддөг." },
    "GHP": { en: "Good Hygiene Practice", mn: "Эрүүл ахуйн зохистой дадал",
      d: "Хүнсний сүлжээний турш эрүүл ахуйн нөхцөл, арга хэмжээг хангаснаар хүнсний аюулгүй байдлыг баталгаажуулдаг суурь дадал. Ихэвчлэн GMP, HACCP-тэй хослон хэрэгждэг." },
    "ESRS": { en: "European Sustainability Reporting Standards", mn: "Европын тогтвортой байдлын тайлагналын стандарт",
      d: "Европын Холбооны CSRD удирдамжийн хүрээнд байгууллагууд тогтвортой байдал (ESG)-ын мэдээллээ нэгдсэн, харьцуулах боломжтой хэлбэрээр тайлагнах стандарт." },
    "GRI": { en: "Global Reporting Initiative Standards", mn: "Тогтвортой байдлын тайлагналын глобал стандарт",
      d: "Тогтвортой байдлын тайлагналд дэлхийд хамгийн өргөн хэрэглэгддэг бие даасан стандарт. Эдийн засаг, байгаль орчин, нийгэмд үзүүлэх нөлөөллийг ил тод тайлагнахад чиглэнэ." }
  };

  /* ---- team profiles ----
     `more` holds the extra details; these are enriched from the company's
     info sheet. Add bullet strings to extend a profile. */
  var MEMBERS = {
    amarbayar: {
      role: "Гүйцэтгэх захирал · CEO", name: "М.Амарбаяр", prof: "Мехатроник инженер",
      bio: "Үйлдвэрлэлийн удирдлагын чиглэлээр өргөн туршлагатай. Үйлдвэрлэлийн орчны оновчтой шийдэл, инженерчлэл, процесс сайжруулалтыг удирддаг.",
      more: [],
      certs: ["ISO 9001", "ISO 14001", "ISO 50001", "GMP", "GHP"]
    },
    chantsalnyam: {
      role: "Ерөнхий зөвлөх", name: "Ж.Чанцалням", prof: "Нефтийн инженер",
      bio: "Чанар, байгаль орчин, хөдөлмөрийн аюулгүй байдлын менежментийн тогтолцоог байгууллагад нэвтрүүлэх чиглэлээр мэргэшсэн зөвлөх.",
      more: [],
      certs: ["ISO 9001", "ISO 14001", "ISO 45001"]
    }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var modal = document.getElementById("modal");
  var bodyEl = document.getElementById("modalBody");
  if (!modal || !bodyEl) return;
  var lastFocus = null;

  function open(html) {
    bodyEl.innerHTML = html;
    if (!modal.classList.contains("open")) lastFocus = document.activeElement;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var c = modal.querySelector(".modal-close");
    if (c) c.focus();
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isoHtml(code) {
    var x = ISO[code];
    if (!x) return null;
    return '<span class="modal-eyebrow">Олон улсын стандарт</span>' +
      '<h3 class="modal-title">' + esc(code) + '</h3>' +
      '<p class="modal-sub">' + esc(x.en) + '</p>' +
      '<p class="modal-kicker">' + esc(x.mn) + '</p>' +
      '<p class="modal-text">' + esc(x.d) + '</p>';
  }

  function memberHtml(m) {
    var more = (m.more && m.more.length)
      ? '<ul class="modal-list">' + m.more.map(function (li) { return "<li>" + esc(li) + "</li>"; }).join("") + "</ul>"
      : "";
    var certs = (m.certs || []).map(function (c) {
      return '<span class="iso-chip" tabindex="0" role="button">' + esc(c) + "</span>";
    }).join("");
    return '<span class="modal-eyebrow">' + esc(m.role) + '</span>' +
      '<h3 class="modal-title">' + esc(m.name) + '</h3>' +
      '<p class="modal-sub">' + esc(m.prof) + '</p>' +
      '<p class="modal-text">' + esc(m.bio) + '</p>' + more +
      '<div class="modal-certs"><span class="modal-certs-label">Мэргэшсэн стандарт</span>' +
      '<div class="clist">' + certs + "</div></div>";
  }

  /* ---- wire up interactivity ---- */
  function markChips() {
    var chips = document.querySelectorAll(".marquee-track > span, .member .certs span");
    Array.prototype.forEach.call(chips, function (el) {
      var code = el.textContent.trim();
      if (!ISO[code]) return;
      el.classList.add("iso-chip");
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", code + " — дэлгэрэнгүй");
    });
    var members = document.querySelectorAll(".member[data-member]");
    Array.prototype.forEach.call(members, function (el) {
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-haspopup", "dialog");
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { close(); return; }
    var chip = e.target.closest(".iso-chip");
    if (chip) {
      e.stopPropagation();
      var html = isoHtml(chip.textContent.trim());
      if (html) open(html);
      return;
    }
    var mem = e.target.closest(".member[data-member]");
    if (mem) {
      var m = MEMBERS[mem.getAttribute("data-member")];
      if (m) open(memberHtml(m));
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("open")) { close(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".member[data-member], .iso-chip")) {
      e.preventDefault();
      e.target.click();
    }
  });

  // expose so the 3D coins (scene.js) can open the same ISO popup
  window.OEU = window.OEU || {};
  window.OEU.openIso = function (code) { var h = isoHtml(code); if (h) open(h); };

  if (document.readyState !== "loading") markChips();
  else document.addEventListener("DOMContentLoaded", markChips);
})();
