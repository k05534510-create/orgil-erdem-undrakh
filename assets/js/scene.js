/* ОЭУ ХХК — 3D upgrade
   1) WebGL hero: a living low-poly "Оргил" summit (Three.js r128), dawn-lit,
      navy fog, gold ridges + glowing peak + drifting motes, mouse parallax.
      Degrades gracefully to the photo if WebGL / THREE is unavailable.
   2) Site-wide pointer tilt + glare for tactile 3D depth on cards.
*/
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===================================================================
     1. HERO 3D SUMMIT
     =================================================================== */
  function initHero() {
    if (typeof THREE === "undefined") return;            // CDN blocked → keep photo
    var canvas = document.getElementById("heroCanvas");
    var hero = document.querySelector(".hero");
    if (!canvas || !hero) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    } catch (e) { return; }                               // no WebGL → keep photo
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);

    var scene = new THREE.Scene();
    var INK = 0x0a201a;                 // deep pine (brand base)
    scene.fog = new THREE.FogExp2(INK, 0.019);

    var camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 200);
    camera.position.set(0, 13, 32);

    // ---- terrain ----
    var PW = 78, PD = 58, SX = 110, SZ = 84;
    var geo = new THREE.PlaneGeometry(PW, PD, SX, SZ);

    function height(x, z) {
      var v = 0;
      v += 1.7 * Math.sin(x * 0.20 + 1.0) * Math.cos(z * 0.18 + 0.5);
      v += 0.95 * Math.sin(x * 0.46 + 3.0) * Math.cos(z * 0.37 + 1.7);
      v += 0.5 * Math.sin(x * 0.95 + 0.3) * Math.cos(z * 0.80 + 2.2);
      v += 0.26 * Math.sin(x * 1.85 + 2.0) * Math.cos(z * 1.65 + 0.9);
      // dominant summit, right-of-centre (text sits left, over darker, lower ground)
      var dx = x - 7, dz = z + 2;
      v += 8.4 * Math.exp(-(dx * dx + dz * dz) / 42);
      // secondary ridge, left-back
      var ex = x + 12, ez = z + 7;
      v += 3.4 * Math.exp(-(ex * ex + ez * ez) / 62);
      // settle the near foreground so it reads as a valley
      v -= 1.4 * Math.exp(-((z - 26) * (z - 26)) / 70);
      return v;
    }
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      pos.setZ(i, height(x, y));
    }
    geo = geo.toNonIndexed();          // crisp faceted low-poly
    geo.computeVertexNormals();

    var land = new THREE.MeshStandardMaterial({
      color: 0x163a2a, roughness: 0.92, metalness: 0.05, flatShading: true
    });
    var terrain = new THREE.Mesh(geo, land);
    terrain.rotation.x = -Math.PI / 2;

    // gold engineering wireframe over the surface
    var wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xE2B25C, wireframe: true, transparent: true, opacity: 0.07
    }));
    wire.rotation.x = -Math.PI / 2;

    var world = new THREE.Group();
    world.add(terrain); world.add(wire);
    scene.add(world);

    // ---- lights (dawn) ----
    scene.add(new THREE.HemisphereLight(0x35513f, 0x06140e, 0.55));
    var sun = new THREE.DirectionalLight(0xffcf8a, 1.55);
    sun.position.set(14, 16, 9);
    scene.add(sun);
    var fill = new THREE.DirectionalLight(0x4f8a72, 0.45);
    fill.position.set(-15, 9, -5);
    scene.add(fill);

    // peak position in world space (geometry x,y -> world x, z=-y)
    var peakY = height(7, -2);
    var peak = new THREE.Vector3(7, peakY, 2);

    var glowLight = new THREE.PointLight(0xE2B25C, 1.15, 46, 2);
    glowLight.position.set(peak.x, peak.y + 2, peak.z);
    world.add(glowLight);

    // ---- glowing summit sprite ----
    function radialTex() {
      var c = document.createElement("canvas"); c.width = c.height = 128;
      var g = c.getContext("2d");
      var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,229,170,0.95)");
      grd.addColorStop(0.25, "rgba(242,202,126,0.55)");
      grd.addColorStop(1, "rgba(226,178,92,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    glow.scale.set(11, 11, 1);
    glow.position.set(peak.x, peak.y + 1.5, peak.z);
    world.add(glow);

    // ---- drifting motes (dawn dust / stars) ----
    var N = 520, parr = new Float32Array(N * 3), spd = new Float32Array(N);
    for (var p = 0; p < N; p++) {
      parr[p * 3] = (Math.random() - 0.5) * 86;
      parr[p * 3 + 1] = Math.random() * 30 + 1;
      parr[p * 3 + 2] = (Math.random() - 0.5) * 64 - 6;
      spd[p] = 0.4 + Math.random() * 0.9;
    }
    var pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(parr, 3));
    var motes = new THREE.Points(pgeo, new THREE.PointsMaterial({
      color: 0xF2CA7E, size: 0.16, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    scene.add(motes);

    // ---- interaction state ----
    var tx = 0, ty = 0;              // pointer target (-1..1)
    var cxs = 0, cys = 0;
    window.addEventListener("pointermove", function (e) {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    function resize() {
      w = hero.clientWidth; h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize, { passive: true });

    var t0 = performance.now(), running = true;
    function frame(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      // smooth parallax
      cxs += (tx - cxs) * 0.045; cys += (ty - cys) * 0.045;
      camera.position.x = cxs * 6;
      camera.position.y = 13 - cys * 3.0;
      camera.lookAt(peak.x - 2, 3.4, peak.z);
      // gentle living sway (not a spin)
      world.rotation.y = Math.sin(t * 0.06) * 0.22 + 0.12;
      // peak pulse
      var pulse = 1 + Math.sin(t * 1.4) * 0.06;
      glow.scale.set(11 * pulse, 11 * pulse, 1);
      glowLight.intensity = 1.0 + Math.sin(t * 1.4) * 0.18;
      // motes drift upward, wrap
      var a = motes.geometry.attributes.position;
      for (var k = 0; k < N; k++) {
        var yy = a.getY(k) + spd[k] * 0.01;
        if (yy > 31) yy = 0.5;
        a.setY(k, yy);
      }
      a.needsUpdate = true;
      motes.rotation.y = t * 0.012;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    // reveal: photo dims, 3D fades in
    hero.classList.add("has3d");

    if (reduce) {
      camera.position.set(0, 13, 32);
      camera.lookAt(peak.x - 2, 3.4, peak.z);
      world.rotation.y = 0.12;
      renderer.render(scene, camera);
      return;                          // static frame, no loop
    }
    requestAnimationFrame(frame);

    // pause when hero scrolled out of view
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (e.isIntersecting && !running) { running = true; t0 = performance.now(); requestAnimationFrame(frame); }
          else if (!e.isIntersecting) { running = false; }
        });
      }, { threshold: 0.01 }).observe(hero);
    }
  }

  /* ===================================================================
     2. POINTER TILT + GLARE
     =================================================================== */
  function initTilt() {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var sel = ".stage, .member, .contact-card, .about-figure";
    var cards = Array.prototype.slice.call(document.querySelectorAll(sel));
    cards.forEach(function (el) {
      el.classList.add("tilt");
      var glare = document.createElement("span");
      glare.className = "tilt-glare";
      el.appendChild(glare);
      var raf = 0, rect = null;

      el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); el.classList.add("tilting"); });
      el.addEventListener("pointermove", function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var cx = e.clientX - rect.left, cy = e.clientY - rect.top;
          var rx = (cy / rect.height - 0.5), ry = (cx / rect.width - 0.5);
          var max = 5.5;
          el.style.transform = "perspective(950px) rotateX(" + (-rx * max).toFixed(2) +
            "deg) rotateY(" + (ry * max).toFixed(2) + "deg) translateY(-4px)";
          el.style.setProperty("--gx", (cx / rect.width * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", (cy / rect.height * 100).toFixed(1) + "%");
        });
      });
      el.addEventListener("pointerleave", function () {
        rect = null; el.classList.remove("tilting"); el.style.transform = "";
      });
    });
  }

  function start() { try { initHero(); } catch (e) {} initTilt(); }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
