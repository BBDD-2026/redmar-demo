/* REDMAR — interacción y motion sobre Canvas/Porto */
(function () {
	'use strict';

	if (window.lucide) lucide.createIcons();

	/* Menú mobile: el trigger de Porto también con teclado + aria-expanded */
	var trigger = document.getElementById('primary-menu-trigger');
	if (trigger) {
		trigger.setAttribute('aria-expanded', 'false');
		trigger.addEventListener('click', function () {
			setTimeout(function () {
				var abierto = document.body.classList.contains('primary-menu-open');
				trigger.setAttribute('aria-expanded', String(abierto));
				trigger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
			}, 0);
		});
		trigger.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
		});
	}

	/* Tabs Multi-Site (patrón ARIA tabs con flechas) */
	var tabs = Array.prototype.slice.call(document.querySelectorAll('.ms-tabs [role="tab"]'));
	var svg = document.getElementById('ms-svg');
	function activar(tab) {
		tabs.forEach(function (t) {
			var sel = t === tab;
			t.setAttribute('aria-selected', String(sel));
			t.tabIndex = sel ? 0 : -1;
			document.getElementById(t.getAttribute('aria-controls')).hidden = !sel;
		});
		if (svg) svg.setAttribute('data-scene', tab.getAttribute('data-scene'));
	}
	tabs.forEach(function (t, i) {
		t.addEventListener('click', function () { activar(t); });
		t.addEventListener('keydown', function (e) {
			var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
			if (!d) return;
			e.preventDefault();
			var sig = tabs[(i + d + tabs.length) % tabs.length];
			sig.focus(); activar(sig);
		});
	});

	/* Formulario → Formspree por AJAX, validación inline */
	var form = document.getElementById('form-contacto');
	if (form) {
		var reglas = {
			nombre: function (v) { return v.trim().length > 1; },
			email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
			empresa: function (v) { return v.trim().length > 1; },
			mensaje: function (v) { return v.trim().length > 4; }
		};
		function validar(input) {
			var ok = reglas[input.name](input.value);
			var campo = input.closest('.field');
			campo.classList.toggle('invalid', !ok);
			input.setAttribute('aria-invalid', String(!ok));
			input.setAttribute('aria-describedby', 'e-' + input.name);
			return ok;
		}
		Object.keys(reglas).forEach(function (n) {
			var el = form.elements[n];
			el.addEventListener('blur', function () { if (el.value) validar(el); });
			el.addEventListener('input', function () { if (el.closest('.field').classList.contains('invalid')) validar(el); });
		});

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var primeroMal = null;
			Object.keys(reglas).forEach(function (n) {
				if (!validar(form.elements[n]) && !primeroMal) primeroMal = form.elements[n];
			});
			if (primeroMal) { primeroMal.focus(); return; }

			var btn = document.getElementById('btn-enviar');
			var err = document.getElementById('error-envio');
			err.hidden = true;
			btn.classList.add('is-sending');
			btn.querySelector('.btn-label').textContent = 'Enviando…';

			var envio = form.dataset.demo === 'true'
				? new Promise(function (ok) { setTimeout(ok, 900); })
				: fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
					.then(function (r) { if (!r.ok) throw new Error(r.status); });
			envio
				.then(function () {
					form.hidden = true;
					var ok = document.getElementById('form-ok');
					ok.hidden = false; ok.focus();
				})
				.catch(function () {
					err.hidden = false;
					btn.classList.remove('is-sending');
					btn.querySelector('.btn-label').textContent = 'Solicitar diagnóstico sin cargo';
				});
		});
	}

	/* ---------- Motion ---------- */
	var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var finePointer = window.matchMedia('(pointer: fine)').matches;

	/* Red de datos en canvas (hero): nodos que derivan, se conectan y reaccionan al cursor.
	   Se pausa fuera de pantalla o con la pestaña oculta; con reduced-motion dibuja un solo cuadro. */
	document.querySelectorAll('[data-net]').forEach(function (canvas) {
		var ctx = canvas.getContext('2d');
		var host = canvas.closest('section');
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var W, H, nodes = [], mouse = { x: -9999, y: -9999 }, visible = true, raf = null;
		var COLORS = ['34,211,224', '46,140,240', '46,140,240', '21,84,214'];

		function build() {
			W = canvas.clientWidth; H = canvas.clientHeight;
			canvas.width = W * dpr; canvas.height = H * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			var n = Math.min(95, Math.round(W * H / 15000));
			nodes = [];
			for (var i = 0; i < n; i++) {
				nodes.push({
					x: Math.random() * W, y: Math.random() * H,
					vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
					r: Math.random() * 1.6 + .8,
					c: i % 13 === 0 ? '255,174,31' : COLORS[i % COLORS.length]
				});
			}
		}

		function frame(step) {
			ctx.clearRect(0, 0, W, H);
			var LINK = 150, M = 190;
			for (var i = 0; i < nodes.length; i++) {
				var a = nodes[i];
				if (step) {
					var dxm = a.x - mouse.x, dym = a.y - mouse.y, dm = Math.sqrt(dxm * dxm + dym * dym);
					if (dm < M && dm > 0) { a.x += dxm / dm * .6; a.y += dym / dm * .6; }
					a.x += a.vx; a.y += a.vy;
					if (a.x < 0 || a.x > W) a.vx *= -1;
					if (a.y < 0 || a.y > H) a.vy *= -1;
				}
				for (var j = i + 1; j < nodes.length; j++) {
					var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
					if (d < LINK * LINK) {
						ctx.strokeStyle = 'rgba(46,140,240,' + (1 - Math.sqrt(d) / LINK) * .28 + ')';
						ctx.lineWidth = 1;
						ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
					}
				}
				var dxc = a.x - mouse.x, dyc = a.y - mouse.y, dc = Math.sqrt(dxc * dxc + dyc * dyc);
				if (dc < M) {
					ctx.strokeStyle = 'rgba(34,211,224,' + (1 - dc / M) * .55 + ')';
					ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
				}
				ctx.fillStyle = 'rgba(' + a.c + ',.85)';
				ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
			}
		}

		function loop() { frame(true); raf = requestAnimationFrame(loop); }
		function start() { if (!raf && visible && !document.hidden && !reduced) loop(); }
		function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

		build(); frame(false); start();
		var rt;
		window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); frame(false); }, 150); });
		document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(host);
		}
		if (finePointer) {
			host.addEventListener('pointermove', function (e) {
				var r = canvas.getBoundingClientRect();
				mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
			});
			host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
		}
	});

	/* Spotlight que sigue al cursor en el hero */
	document.querySelectorAll('[data-spotlight]').forEach(function (sp) {
		if (!finePointer) return;
		var host = sp.closest('section');
		host.addEventListener('pointermove', function (e) {
			var r = host.getBoundingClientRect();
			sp.style.setProperty('--mx', (e.clientX - r.left) + 'px');
			sp.style.setProperty('--my', (e.clientY - r.top) + 'px');
		});
	});

	/* Bento: brillo que sigue al cursor */
	if (finePointer) document.querySelectorAll('.bento-card').forEach(function (c) {
		c.addEventListener('pointermove', function (e) {
			var r = c.getBoundingClientRect();
			c.style.setProperty('--x', (e.clientX - r.left) + 'px');
			c.style.setProperty('--y', (e.clientY - r.top) + 'px');
		});
	});

	/* Carrusel mobile de metodología: la barra refleja el scroll nativo */
	var hview = document.querySelector('.hsteps-viewport');
	var hprog = document.querySelector('[data-hprog]');
	if (hview && hprog) hview.addEventListener('scroll', function () {
		var max = hview.scrollWidth - hview.clientWidth;
		hprog.style.transform = 'scaleX(' + (max > 0 ? hview.scrollLeft / max : 0) + ')';
	}, { passive: true });

	if (reduced) {
		document.querySelectorAll('.ms-packets').forEach(function (g) { g.remove(); });
		if (hprog) hprog.style.transform = 'scaleX(1)';
	}
	if (!window.gsap || reduced) return;
	gsap.registerPlugin(ScrollTrigger);

	/* Divide un elemento en palabras envueltas (conserva spans con clase, ej. .grad-text) */
	function splitWords(el, wrapClass) {
		var out = [];
		function walk(node, parent, cls) {
			Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
				if (ch.nodeType === 3) {
					ch.textContent.split(/(\s+)/).forEach(function (part) {
						if (!part) return;
						if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(part)); return; }
						var inner = document.createElement('span');
						inner.textContent = part;
						if (cls) inner.className = cls;
						if (wrapClass) {
							var w = document.createElement('span'); w.className = wrapClass;
							w.appendChild(inner); parent.appendChild(w);
						} else parent.appendChild(inner);
						out.push(inner);
					});
				} else if (ch.nodeType === 1) {
					walk(ch, parent, ch.className);
				}
			});
		}
		var frag = document.createDocumentFragment();
		walk(el, frag, '');
		el.textContent = ''; el.appendChild(frag);
		return out;
	}

	// Titular del hero: palabras que suben desde una máscara
	document.querySelectorAll('[data-split]').forEach(function (h) {
		h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
		var words = splitWords(h, 'w');
		h.querySelectorAll('.w').forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
		gsap.from(words, { yPercent: 115, rotate: 4, duration: 1, stagger: .07, ease: 'expo.out', delay: .15 });
	});

	var hero = document.querySelectorAll('[data-hero]');
	if (hero.length) gsap.from(hero, { opacity: 0, y: 24, duration: .8, stagger: .09, ease: 'expo.out', delay: .45 });
	var visual = document.querySelector('[data-hero-visual]');
	if (visual) {
		gsap.from(visual, { opacity: 0, x: 60, rotateY: -14, duration: 1.3, ease: 'expo.out', delay: .3 });
		gsap.from('.flow-card', { opacity: 0, y: 40, duration: .9, ease: 'back.out(1.5)', delay: .9 });
		gsap.from('.float-chip', { opacity: 0, y: -20, duration: .8, ease: 'back.out(1.5)', delay: 1.1 });
		gsap.from('.flow-dash .b1, .flow-dash .b2, .flow-dash .b3, .flow-dash .b4', {
			scaleY: 0, transformOrigin: '50% 100%', duration: .7, stagger: .1, ease: 'power3.out', delay: 1.3
		});
		gsap.to('.hero-photo img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#slider', start: 'top top', end: 'bottom top', scrub: true } });
		gsap.to('.hero-copy', { yPercent: -12, opacity: .2, ease: 'none', scrollTrigger: { trigger: '#slider', start: 'top top', end: 'bottom top', scrub: true } });

		// Inclinación 3D siguiendo al cursor
		if (finePointer && visual.hasAttribute('data-tilt')) {
			var heroSec = visual.closest('section');
			heroSec.addEventListener('pointermove', function (e) {
				var r = heroSec.getBoundingClientRect();
				var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
				gsap.to(visual, { rotateY: px * 12, rotateX: -py * 9, duration: .8, ease: 'power3.out' });
			});
			heroSec.addEventListener('pointerleave', function () {
				gsap.to(visual, { rotateY: 0, rotateX: 0, duration: 1.2, ease: 'elastic.out(1, .5)' });
			});
		}
	}

	// Botones magnéticos
	if (finePointer) document.querySelectorAll('[data-magnetic], .menu-cta > a, .footer-cta .btn-rm').forEach(function (b) {
		b.addEventListener('pointermove', function (e) {
			var r = b.getBoundingClientRect();
			gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4, ease: 'power3.out' });
		});
		b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }); });
	});

	// Reveal simple por bloque
	gsap.utils.toArray('[data-reveal]').forEach(function (el) {
		gsap.from(el, { opacity: 0, y: 36, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
	});

	// Stagger en grillas (dolores, bento, faq)
	gsap.utils.toArray('[data-stagger]').forEach(function (grid) {
		gsap.from(grid.children, {
			opacity: 0, y: 40, scale: .94, duration: .7, ease: 'back.out(1.4)',
			stagger: { each: .09, grid: 'auto', from: 'start' },
			scrollTrigger: { trigger: grid, start: 'top 82%' }
		});
	});

	// Línea del mini gráfico que se dibuja
	document.querySelectorAll('.mini-chart .line').forEach(function (l) {
		var len = l.getTotalLength();
		gsap.fromTo(l, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: l, start: 'top 85%' } });
		gsap.from(l.previousElementSibling, { opacity: 0, duration: 1.2, delay: .6, scrollTrigger: { trigger: l, start: 'top 85%' } });
	});

	// Timeline de metodologia.html (scrub de la línea)
	document.querySelectorAll('[data-timeline]').forEach(function (el) {
		el.style.setProperty('--p', 0);
		gsap.to(el, { '--p': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 60%', scrub: .6 } });
	});

	// Metodología en home: sección fijada y scroll horizontal (solo desktop)
	var htrack = document.querySelector('[data-htrack]');
	if (htrack) {
		gsap.matchMedia().add('(min-width: 992px)', function () {
			var section = htrack.closest('.hsteps');
			var dist = function () { return Math.max(0, htrack.scrollWidth - window.innerWidth); };
			var tw = gsap.to(htrack, {
				x: function () { return -dist(); }, ease: 'none',
				scrollTrigger: {
					trigger: section, start: 'top top', end: function () { return '+=' + dist(); },
					pin: true, scrub: .8, invalidateOnRefresh: true,
					onUpdate: function (st) { hprog.style.transform = 'scaleX(' + st.progress + ')'; }
				}
			});
			gsap.from(htrack.children, { opacity: 0, y: 60, rotate: 2, duration: .8, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: section, start: 'top 70%' } });
			return function () { tw.kill(); };
		});
	}

	// Statement: palabras que se encienden con el scroll
	document.querySelectorAll('[data-scrub-words]').forEach(function (p) {
		var words = splitWords(p, null);
		var hlFrom = words.length - 3; // "no nuestro tiempo."
		words.forEach(function (w, i) { if (i >= hlFrom) w.classList.add('hl'); });
		gsap.fromTo(words, { opacity: .14 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true } });
	});

	// Contadores (solo valores reales del copy)
	document.querySelectorAll('[data-count]').forEach(function (el) {
		var o = { v: 0 }, to = +el.getAttribute('data-count');
		el.textContent = '0';
		gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: function () { el.textContent = Math.round(o.v); } });
	});

	// Diagrama multi-site
	var svg2 = document.getElementById('ms-svg');
	if (svg2) gsap.from('#ms-svg .ms-links, #ms-svg .ms-nodes, #ms-svg .ms-hub', { opacity: 0, scale: .85, transformOrigin: '50% 50%', duration: .7, stagger: .1, ease: 'back.out(1.6)', scrollTrigger: { trigger: svg2, start: 'top 80%' } });

	window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
