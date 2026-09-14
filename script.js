const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const music = document.getElementById("music");

const WORDS = [
    "love you",
    "Love You",
    "LOVE YOU"
];

const CENTER_TEXT = " Love You ";

const COLORS = [
    [70, 130, 180],
    [30, 144, 255],
    [0, 191, 255],
    [100, 149, 237],
    [65, 105, 225]
];

const FPS = 60;

// Your original SCALE was 20.
// We'll calculate this dynamically so the heart fits phones
// as well as large computer screens.
const BASE_SCALE = 20;

let WIDTH;
let HEIGHT;
let SCALE;

let particles = [];

let frame = 0;
let animationStarted = false;

let fontOutline;
let fontFill;
let fontCenter;


// ------------------------------------------------------------
// CANVAS
// ------------------------------------------------------------

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;

    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;

    canvas.style.width = WIDTH + "px";
    canvas.style.height = HEIGHT + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /*
        Scale the original 2000x1200 design to the screen.
    */
    const scaleX = WIDTH / 2000;
    const scaleY = HEIGHT / 1200;

    SCALE = BASE_SCALE * Math.min(scaleX, scaleY);

    /*
        Don't let the heart become microscopic on small screens.
    */
    SCALE = Math.max(SCALE, 9);

    fontOutline = Math.max(12, Math.round(20 * Math.min(WIDTH / 2000, 1)));
    fontFill = Math.max(10, Math.round(17 * Math.min(WIDTH / 2000, 1)));
    fontCenter = Math.max(28, Math.round(54 * Math.min(WIDTH / 2000, 1)));
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
}


// ------------------------------------------------------------
// HEART EQUATION
// ------------------------------------------------------------

function heartXY(t) {

    const x =
        16 * Math.pow(Math.sin(t), 3);

    const y =
        13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t);

    return [x, -y];
}


// ------------------------------------------------------------
// SCREEN CONVERSION
// ------------------------------------------------------------

function toScreen(x, y) {

    return [
        x * SCALE + WIDTH / 2,
        y * SCALE + HEIGHT / 2
    ];
}


// ------------------------------------------------------------
// PARTICLE
// ------------------------------------------------------------

class Particle {

    constructor(x, y, order, kind) {

        this.x = x;
        this.y = y;

        this.order = order;
        this.kind = kind;

        this.word = randomChoice(WORDS);
        this.color = randomChoice(COLORS);

        this.alpha = 0;

        this.flicker =
            randomRange(0, Math.PI * 2);

        this.delay = 0;

        this.sizeMult =
            randomRange(0.85, 1.15);
    }
}


// ------------------------------------------------------------
// OUTLINE PARTICLES
// ------------------------------------------------------------

function buildOutlineParticles(
    nOutline,
    minGap = 30
) {

    const particles = [];
    const placed = [];

    for (let i = 0; i < nOutline; i++) {

        const t =
            (i / nOutline) * Math.PI * 2;

        const [bx, by] = heartXY(t);

        const [sx, sy] =
            toScreen(bx, by);

        let tooClose = false;

        for (const [px, py] of placed) {

            if (
                distance(sx, sy, px, py)
                < minGap * (SCALE / BASE_SCALE)
            ) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) continue;

        placed.push([sx, sy]);

        particles.push(
            new Particle(
                sx,
                sy,
                i,
                "outline"
            )
        );
    }

    return particles;
}


// ------------------------------------------------------------
// FILL PARTICLES
// ------------------------------------------------------------

function buildFillParticles(
    nFill,
    minGap = 46
) {

    const particles = [];
    const placed = [];

    let attempts = 0;

    const maxAttempts =
        nFill * 80;

    while (
        particles.length < nFill &&
        attempts < maxAttempts
    ) {

        attempts++;

        const t =
            randomRange(0, Math.PI * 2);

        const r =
            randomRange(0.0, 0.86);

        const [bx, by] =
            heartXY(t);

        const px =
            bx * r;

        const py =
            by * r;

        const [sx, sy] =
            toScreen(px, py);

        let tooClose = false;

        for (const [qx, qy] of placed) {

            if (
                distance(sx, sy, qx, qy)
                < minGap * (SCALE / BASE_SCALE)
            ) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) continue;

        placed.push([sx, sy]);

        particles.push(
            new Particle(
                sx,
                sy,
                Math.floor(Math.random() * 321),
                "fill"
            )
        );
    }

    return particles;
}


// ------------------------------------------------------------
// TEXT DRAWING
// ------------------------------------------------------------

function drawGlowText(
    particle,
    alpha
) {

    if (alpha <= 0) return;

    const rgb =
        particle.color.join(",");

    const fontSize =
        particle.kind === "outline"
            ? fontOutline
            : fontFill;

    const weight = "bold";

    const font =
        `${weight} ${Math.round(
            fontSize * particle.sizeMult
        )}px Arial`;

    ctx.save();

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    /*
        Glow
    */

    if (alpha > 10) {

        ctx.shadowColor =
            `rgba(${rgb}, ${alpha / 255})`;

        ctx.shadowBlur = 18;

        ctx.fillStyle =
            `rgba(${rgb}, ${alpha / 255})`;

        ctx.fillText(
            particle.word,
            particle.x,
            particle.y
        );

        /*
            Stronger small glow
        */

        ctx.shadowBlur = 6;
    }

    /*
        Main text
    */

    ctx.fillStyle =
        `rgba(${rgb}, ${alpha / 255})`;

    ctx.fillText(
        particle.word,
        particle.x,
        particle.y
    );

    ctx.restore();
}


// ------------------------------------------------------------
// CENTER TEXT
// ------------------------------------------------------------

function drawCenterText() {

    const fillParticles =
        particles.filter(
            p => p.kind === "fill"
        );

    const outlineParticles =
        particles.filter(
            p => p.kind === "outline"
        );

    const outlineSpan =
        outlineParticles.length
            ? Math.max(
                ...outlineParticles.map(
                    p => p.order
                )
            )
            : 0;

    const framesPerStep = 1.6;

    const fillStartFrame =
        Math.floor(
            outlineSpan * framesPerStep
        ) + 30;

    const centerStart =
        fillStartFrame + 200;

    if (frame <= centerStart) {
        return;
    }

    const progress =
        Math.min(
            1,
            (frame - centerStart) / 60
        );

    const centerAlpha =
        Math.floor(
            255 *
            (1 - Math.exp(-progress * 8))
        );

    /*
        Same pulse effect as Pygame.
    */

    const pulse =
        1 +
        0.025 *
        Math.sin(frame * 0.05);

    ctx.save();

    ctx.font =
        `bold ${fontCenter}px Georgia`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text =
        CENTER_TEXT;

    /*
        Glow
    */

    ctx.shadowColor =
        `rgba(255, 250, 245, ${
            centerAlpha / 255
        })`;

    ctx.shadowBlur = 25;

    ctx.translate(
        WIDTH / 2,
        HEIGHT / 2
    );

    ctx.scale(
        pulse,
        pulse
    );

    ctx.fillStyle =
        `rgba(255, 250, 245, ${
            centerAlpha / 255
        })`;

    ctx.fillText(
        text,
        0,
        0
    );

    ctx.restore();
}


// ------------------------------------------------------------
// BUILD EVERYTHING
// ------------------------------------------------------------

function createParticles() {

    particles = [];

    const outline =
        buildOutlineParticles(160);

    const fill =
        buildFillParticles(130);

    const outlineSpan =
        outline.length
            ? Math.max(
                ...outline.map(
                    p => p.order
                )
            )
            : 0;

    const framesPerStep = 1.6;

    const fillStartFrame =
        Math.floor(
            outlineSpan * framesPerStep
        ) + 30;

    /*
        Outline timing
    */

    for (const p of outline) {

        p.delay =
            Math.floor(
                p.order * framesPerStep
            );
    }

    /*
        Fill timing
    */

    for (const p of fill) {

        p.delay =
            fillStartFrame +
            p.order;
    }

    particles =
        outline.concat(fill);
}


// ------------------------------------------------------------
// MAIN ANIMATION
// ------------------------------------------------------------

function animate() {

    if (!animationStarted) {
        return;
    }

    /*
        Clear screen
    */

    ctx.clearRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    frame++;

    /*
        Draw particles
    */

    for (const p of particles) {

        if (
            frame > p.delay &&
            p.alpha < 255
        ) {

            p.alpha =
                Math.min(
                    255,
                    p.alpha +
                    14 +
                    Math.floor(
                        Math.random() * 5
                    )
                );
        }

        let flick = 1;

        if (p.alpha >= 255) {

            flick =
                0.75 +
                0.25 *
                Math.sin(
                    frame * 0.04 +
                    p.flicker
                );
        }

        const alpha =
            Math.floor(
                p.alpha * flick
            );

        if (alpha <= 0) continue;

        drawGlowText(
            p,
            alpha
        );
    }

    /*
        Center "Love You"
    */

    drawCenterText();

    requestAnimationFrame(animate);
}


// ------------------------------------------------------------
// START
// ------------------------------------------------------------

startScreen.addEventListener(
    "click",
    () => {

        if (animationStarted) return;

        animationStarted = true;

        /*
            Start music after the user's tap.
            This gets around mobile autoplay restrictions.
        */

        music.currentTime = 0;

        music.play().catch(
            error => {
                console.log(
                    "Audio could not start:",
                    error
                );
            }
        );

        /*
            Hide opening screen
        */

        startScreen.classList.add(
            "hidden"
        );

        /*
            Build the heart
        */

        createParticles();

        /*
            Start animation
        */

        requestAnimationFrame(
            animate
        );
    }
);
