import { createEngine } from "../../shared/engine.js";
import { Spring } from "../../shared/spring.js";

// Initialize the engine
const { renderer, input, math, run, finish, audio } = createEngine();
const { ctx, canvas } = renderer;

const explosionSound = await audio.load("assets/SFX/explosion.mp3");
const fireworkSound = await audio.load("assets/SFX/firework.mp3");
const victorySound = await audio.load("assets/SFX/victory.mp3");

let isVictory = false;

run(update);

const spring = new Spring({
  position: 0, // start position
  frequency: 2.5, // oscillations per second (approximate)
  halfLife: 0.35, // time until amplitude is halved
  target: 0,
});

let svgPathData = "";
let svgLoaded = false;
let svgLineWidth = 0;
let isLineComplete = false;
let viewBoxWidth = 0;
let viewBoxHeight = 0;
const gravity = 0.15;
const fireworks = [];
const particles = [];
let pageLoaded = true;

// Load assets
loadSVG("./assets/SVG/0_A.svg");
const fireworkImage = loadImage("./assets/PNG/Firework.png", () => {
  console.log("Firework image loaded");
});

// Function to load SVG file
function loadSVG(url) {
  fetch(url)
    .then((response) => response.text())
    .then((svgText) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const pathElement = svgDoc.querySelector("path");
      svgPathData = pathElement.getAttribute("d");

      // Extract viewBox dimensions
      const svgElement = svgDoc.querySelector("svg");
      const viewBox = svgElement.getAttribute("viewBox").split(" ");
      viewBoxWidth = parseFloat(viewBox[2]);
      viewBoxHeight = parseFloat(viewBox[3]);

      svgLoaded = true;
      console.log("SVG path data loaded");
    })
    .catch((error) => console.error("Error loading SVG:", error));
}

// Function to load an image
function loadImage(src, onLoad) {
  const img = new Image();
  img.src = src;
  img.onload = onLoad;
  return img;
}

// Main update function
function update(dt) {
  if (input.isPressed() && !isLineComplete) {
    spring.target = 1.5;
  } else if (pageLoaded && input.hasStarted()) {
    spring.target = 1;
  }
  spring.step(dt);

  clearCanvas();
  updateFireworks();
  updateParticles();
  updateSVGLineWidth();
  handleInput();
  drawSVGShape();
  drawCursor();
}

// Function to clear the canvas
function clearCanvas() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Function to update the SVG line width
function updateSVGLineWidth() {
  if (svgLineWidth > 20) {
    svgLineWidth -= 1;
    isLineComplete = true;
    spring.target = 0;
    pageLoaded = false; // Set flag to false to prevent overwriting spring.target
    if (!isVictory) {
      victorySound.play({
        volume: 1.5,
      });
    }
    isVictory = true;
  } else if (svgLineWidth > 10) {
    svgLineWidth -= 0.5;
  } else if (svgLineWidth > 0) {
    svgLineWidth -= 0.05;
  }

  // Finish if the line is complete and width is zero
  if (isLineComplete && svgLineWidth <= 0) {
    console.log("svgLineWidth was once complete and is now smaller than 0");

    if (spring.position < 0.1) {
      finish();
    }
  }
}

// Function to handle user input
function handleInput() {
  if (input.isPressed() && !isLineComplete) {
    createFirework(input.getX(), input.getY());
  }
}

// Function to draw the SVG shape
function drawSVGShape() {
  if (!svgLoaded) return;

  const path = new Path2D(svgPathData);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(1.3, 1.3);
  ctx.translate(-viewBoxWidth / 2, -viewBoxHeight / 2);
  ctx.fillStyle = "black";
  ctx.fill(path);
  ctx.strokeStyle = "white";
  ctx.lineWidth = svgLineWidth;
  if (svgLineWidth > 0) ctx.stroke(path);
  ctx.restore();
}

// Function to draw the cursor
function drawCursor() {
  if (!input.hasStarted() || !fireworkImage.complete) return;

  const cursorX = input.getX();
  const cursorY = input.getY();
  const cursorScale = spring.position;

  ctx.save();
  ctx.translate(cursorX, cursorY);
  ctx.scale(cursorScale, cursorScale);
  ctx.drawImage(
    fireworkImage,
    -fireworkImage.width / 2,
    -fireworkImage.height / 2
  );
  ctx.restore();
}

// Function to create a firework
function createFirework(x, y) {
  fireworks.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: -20,
    life: Math.floor(Math.random() * 101) + 50,
    size: Math.random() * 0.1 + 0.1,
  });
  fireworkSound.play({
    rate: 1 + Math.random() * 1,
    volume: 0.05 + Math.random() * 0.1,
  });
}

// Function to update fireworks
function updateFireworks() {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const firework = fireworks[i];
    firework.x += firework.vx;
    firework.y += firework.vy;
    firework.vy += gravity;
    firework.life--;

    if (fireworkImage.complete) {
      drawFirework(firework);
    }

    if (firework.life <= 0) {
      createParticles(firework.x, firework.y);
      fireworks.splice(i, 1);
      svgLineWidth += 1;
      explosionSound.play({
        rate: 1 + Math.random() * 1,
        volume: 0.1 + Math.random() * 1,
      });
    }
  }
}

// Function to draw a firework
function drawFirework(firework) {
  const angle = Math.atan2(firework.vy, firework.vx) + Math.PI / 2;
  ctx.save();
  ctx.translate(firework.x, firework.y);
  ctx.rotate(angle);
  ctx.scale(firework.size, firework.size);
  ctx.drawImage(
    fireworkImage,
    -fireworkImage.width / 2,
    -fireworkImage.height / 2
  );
  ctx.restore();
}

// Function to create particles
function createParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: Math.floor(Math.random() * 51) + 50,
      size: Math.random() * 20 + 10,
      trail: [],
      color: Math.random() < 0.5 ? `red` : `white`,
    });
  }
}

// Function to update particles
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += gravity;
    particle.life--;
    particle.size = Math.max(0, particle.size - 0.3);

    particle.trail.push({ x: particle.x, y: particle.y });
    if (particle.trail.length > 10) particle.trail.shift();

    drawParticleTrail(particle);
    drawParticle(particle);

    if (particle.life <= 0 || particle.size <= 0) particles.splice(i, 1);
  }
}

// Function to draw particle trails
function drawParticleTrail(particle) {
  ctx.strokeStyle = particle.color;
  for (let j = 0; j < particle.trail.length - 1; j++) {
    const start = particle.trail[j];
    const end = particle.trail[j + 1];
    ctx.lineWidth = 5 + 2 * particle.size * (j / particle.trail.length);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

// Function to draw a particle
function drawParticle(particle) {
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
  ctx.fill();
}
