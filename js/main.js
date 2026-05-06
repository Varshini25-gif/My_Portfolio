// ===== Utility =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 768px)').matches;

function rafThrottle(fn) {
    let ticking = false;
    return function (...args) {
        if (!ticking) {
            requestAnimationFrame(() => {
                fn.apply(this, args);
                ticking = false;
            });
            ticking = true;
        }
    };
}

// ===== Counter animation (bulletproof) =====
function runCounter(el, target, duration = 1500) {
    if (el.dataset.animated === 'true') return;
    el.dataset.animated = 'true';
    const start = performance.now();
    const isFloat = target % 1 !== 0;
    function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = eased * target;
        el.textContent = isFloat ? v.toFixed(1) : Math.floor(v);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = isFloat ? target.toFixed(1) : target;
    }
    requestAnimationFrame(tick);
}

function animateHeroStats() {
    $$('.stat-number[data-target]').forEach(el => {
        runCounter(el, parseFloat(el.dataset.target), 1600);
    });
}

function animateProjectMetrics(card) {
    card.querySelectorAll('strong[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        if (el.dataset.animated === 'true') return;
        el.dataset.animated = 'true';
        const start = performance.now();
        const duration = 1200;
        function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.floor(eased * target) + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = target + suffix;
        }
        requestAnimationFrame(tick);
    });
}

// ===== Preloader (fast) =====
const preloader = $('.preloader');
function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('hidden');
    setTimeout(() => preloader.remove(), 600);
}

// Hide preloader after a visible duration, then trigger hero stat counters & scramble
const PRELOADER_DURATION = 2200;

function bootSequence() {
    setTimeout(() => {
        hidePreloader();
        animateHeroStats();
        runScramble();
    }, PRELOADER_DURATION);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSequence);
} else {
    bootSequence();
}

// Failsafe: if anything goes wrong, ensure counters run and preloader is gone
setTimeout(() => { animateHeroStats(); hidePreloader(); }, PRELOADER_DURATION + 1500);

// ===== Custom Cursor (desktop only) =====
if (!isMobile && !reducedMotion) {
    const cursorDot = $('.cursor-dot');
    const cursorRing = $('.cursor-ring');
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        if (cursorDot) {
            cursorDot.style.left = mx + 'px';
            cursorDot.style.top = my + 'px';
        }
    });

    function loop() {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        if (cursorRing) {
            cursorRing.style.left = rx + 'px';
            cursorRing.style.top = ry + 'px';
        }
        requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener('mouseenter', e => {
        if (e.target.closest && e.target.closest('a, button, .project-card, .exp-card, .contact-card, .skill-ring, .floating-card, .icon-link, .side-dot')) {
            document.body.classList.add('cursor-hover');
        }
    }, true);
    document.addEventListener('mouseleave', e => {
        if (e.target.closest && e.target.closest('a, button, .project-card, .exp-card, .contact-card, .skill-ring, .floating-card, .icon-link, .side-dot')) {
            document.body.classList.remove('cursor-hover');
        }
    }, true);
} else {
    // Hide cursor elements on mobile
    document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => el.style.display = 'none');
    document.body.style.cursor = 'auto';
}

// ===== Scroll Progress + nav state (throttled) =====
const scrollProgress = $('.scroll-progress');
const navbar = $('.navbar');
const navLinks = $$('.nav-link');
const sideDots = $$('.side-dot');
const sectionsAll = $$('section[id]');

const onScroll = rafThrottle(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollProgress) scrollProgress.style.width = Math.min((scrollTop / docHeight) * 100, 100) + '%';

    const checkY = scrollTop + 200;
    sectionsAll.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.id;
        if (checkY >= top && checkY < top + height) {
            navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
            sideDots.forEach(d => d.classList.toggle('active', d.getAttribute('href') === '#' + id));
        }
    });
});
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Smooth scroll & nav =====
const hamburger = $('.hamburger');
const navMenu = $('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            window.scrollTo({ top: target.offsetTop - 72, behavior: 'smooth' });
            if (hamburger && navMenu) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        }
    });
});

// ===== Hero Canvas (lighter) =====
const canvas = document.getElementById('hero-canvas');
if (canvas && !reducedMotion) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let bars = [];
    let canvasTime = 0;
    let canvasRunning = true;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initBars();
        initParticles();
    }

    function initParticles() {
        const count = isMobile ? 25 : Math.min(60, Math.floor(window.innerWidth / 22));
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.4,
                sx: (Math.random() - 0.5) * 0.3,
                sy: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1
            });
        }
    }

    function initBars() {
        bars = [];
        if (isMobile) return;
        const startX = canvas.width * 0.6;
        for (let x = startX; x < canvas.width; x += 18) {
            bars.push({ x, h: Math.random() * 80 + 20, target: Math.random() * 80 + 20, last: 0 });
        }
    }
    resizeCanvas();
    window.addEventListener('resize', rafThrottle(resizeCanvas));

    function drawFrame() {
        if (!canvasRunning) return;
        canvasTime += 16;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        bars.forEach(b => {
            if (canvasTime - b.last > 1500 + Math.random() * 1500) {
                b.target = Math.random() * 80 + 20;
                b.last = canvasTime;
            }
            b.h += (b.target - b.h) * 0.04;
            const grd = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - b.h);
            grd.addColorStop(0, 'rgba(255,107,74,0)');
            grd.addColorStop(1, 'rgba(255,107,74,0.22)');
            ctx.fillStyle = grd;
            ctx.fillRect(b.x, canvas.height - b.h, 8, b.h);
        });

        particles.forEach(p => {
            p.x += p.sx; p.y += p.sy;
            if (p.x < 0 || p.x > canvas.width) p.sx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.sy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,107,74,${p.opacity})`;
            ctx.fill();
        });

        if (!isMobile) {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = dx * dx + dy * dy;
                    if (d < 22500) {
                        const o = (1 - Math.sqrt(d) / 150) * 0.1;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(255,107,74,${o})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);

    // Pause canvas when hero out of view
    const heroEl = $('.hero');
    if (heroEl && 'IntersectionObserver' in window) {
        const heroObs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                canvasRunning = e.isIntersecting;
                if (canvasRunning) requestAnimationFrame(drawFrame);
            });
        });
        heroObs.observe(heroEl);
    }
}

// ===== Hero orb (desktop only) =====
if (!isMobile && !reducedMotion) {
    const orb = $('.hero-orb');
    const heroEl = $('.hero');
    if (orb && heroEl) {
        let orbX = 0, orbY = 0, targetX = 0, targetY = 0;
        heroEl.addEventListener('mousemove', e => {
            const rect = heroEl.getBoundingClientRect();
            targetX = e.clientX - rect.left - 250;
            targetY = e.clientY - rect.top - 250;
        });
        function orbLoop() {
            orbX += (targetX - orbX) * 0.08;
            orbY += (targetY - orbY) * 0.08;
            orb.style.transform = `translate(${orbX}px, ${orbY}px)`;
            requestAnimationFrame(orbLoop);
        }
        orbLoop();
    }
}

// ===== Reveal animations (visibility-based) =====
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            if (entry.target.classList.contains('skills-rings') || entry.target.querySelector?.('.skill-ring-group')) {
                animateSkillRings();
            }
            if (entry.target.classList.contains('skills-radar') || entry.target.querySelector?.('.radar-chart')) {
                animateRadar();
            }
            if (entry.target.classList.contains('project-card')) {
                animateSparkline(entry.target);
                animateProjectMetrics(entry.target);
            }
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

$$('.reveal').forEach(el => revealObserver.observe(el));

function animateSkillRings() {
    $$('.skill-ring').forEach(ring => {
        if (ring.dataset.animated === 'true') return;
        ring.dataset.animated = 'true';
        const percent = parseInt(ring.dataset.percent);
        const circle = ring.querySelector('.ring-fill');
        if (!circle) return;
        const circ = 2 * Math.PI * 54;
        circle.style.strokeDasharray = circ;
        circle.style.strokeDashoffset = circ - (percent / 100) * circ;
    });
}

function animateRadar() {
    const data = $('.radar-data');
    const points = $$('.radar-point');
    if (!data || data.dataset.animated === 'true') return;
    data.dataset.animated = 'true';
    requestAnimationFrame(() => {
        const targetPoints = Array.from(points).map(p => `${p.dataset.cx},${p.dataset.cy}`).join(' ');
        data.setAttribute('points', targetPoints);
        points.forEach(p => {
            p.setAttribute('cx', p.dataset.cx);
            p.setAttribute('cy', p.dataset.cy);
        });
    });
}

function animateSparkline(card) {
    const sparkline = card.querySelector('.sparkline');
    if (sparkline) sparkline.classList.add('animate');
}

// ===== Text Scramble =====
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#';
        this.update = this.update.bind(this);
    }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(r => this.resolve = r);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            // ~60fps -> 180 frames total = 3 seconds of scramble
            const start = Math.floor(Math.random() * 90);
            const end = start + 60 + Math.floor(Math.random() * 30);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.chars[Math.floor(Math.random() * this.chars.length)];
                    this.queue[i].char = char;
                }
                output += `<span style="color:var(--accent-1)">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
}

let scrambleRan = false;
function runScramble() {
    if (scrambleRan || reducedMotion) return;
    scrambleRan = true;
    $$('.scramble').forEach((el, i) => {
        const fx = new TextScramble(el);
        setTimeout(() => fx.setText(el.dataset.text), i * 350);
    });
}

// ===== Project tilt (desktop only) =====
if (!isMobile && !reducedMotion) {
    $$('[data-tilt]').forEach(card => {
        let raf;
        card.addEventListener('mousemove', e => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const rx = (y - rect.height / 2) / rect.height * -6;
                const ry = (x - rect.width / 2) / rect.width * 6;
                card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px)`;
            });
        });
        card.addEventListener('mouseleave', () => {
            cancelAnimationFrame(raf);
            card.style.transform = '';
        });
    });

    // Magnetic buttons
    $$('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}
