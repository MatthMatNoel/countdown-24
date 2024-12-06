import { createEngine } from "../../shared/engine.js";
import { createAudio } from "../../shared/engine/audio.js";
import { Spring } from "../../shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

// Initialize the spring
const spring = new Spring({
  position: 0, // start position
  frequency: 2.5, // oscillations per second (approximate)
  halfLife: 0.35, // time until amplitude is halved
  target: 0,
});

// Set spring target to 1 when the page is fully loaded
window.onload = () => {
  if (input.hasStarted()) {
  }
};

// initialize audio
const audio = createAudio();
let spraySound;
let spraySFX = true;
let cleaningSound;
let cleaningSFX = false;

const spraySoundFile = await audio.load({
  src: "./assets/SFX/spray.mp3",
  loop: true,
});
spraySound = spraySoundFile.play({
  volume: 0,
});

//.then((sound) => {
//spraySound = sound;
//});

const cleanSoundFile = await audio.load({
  src: "./assets/SFX/cleaning.mp3",
  loop: true,
});
cleaningSound = cleanSoundFile.play({
  volume: 0,
});

// Create an array to store the circles
const circles = [];
let drawBlackCircles = false;
let wasMostlyRed = false;

// Load the SVG image
const svgImage = new Image();
svgImage.src = "./assets/SVG/3_A.svg";
let svgLoaded = false;
svgImage.onload = () => {
  console.log("SVG image loaded");
  svgLoaded = true;
};

// Create an offscreen canvas for analysis with willReadFrequently attribute set to true
const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d", {
  willReadFrequently: true,
});
offscreenCanvas.width = canvas.width;
offscreenCanvas.height = canvas.height;

// Load the spray PNG
const sprayImage = new Image();
let sprayOffCursor = true;
sprayImage.src = "./assets/PNG/spray.png";
let sprayLoaded = false;
sprayImage.onload = () => {
  console.log("Spray image loaded");
  sprayLoaded = true;
};

// Load the spray on PNG
const sprayOnImage = new Image();
let sprayOnCursor = false;
sprayOnImage.src = "./assets/PNG/spray_on.png";
let sprayOnLoaded = false;
sprayOnImage.onload = () => {
  console.log("Spray on image loaded");
  sprayOnLoaded = true;
};

// Load the cloth PNG
const clothImage = new Image();
let clothCursor = false;
clothImage.src = "./assets/PNG/cloth.png";
let clothLoaded = false;
clothImage.onload = () => {
  console.log("Cloth image loaded");
  clothLoaded = true;
};

let prevMouseX = 0;
let prevMouseY = 0;
let currentSoundRate = 0;

function update(dt) {
  spring.step(dt);

  if (input.isPressed()) {
    // Draw a circle at the mouse position
    const x = drawBlackCircles ? input.getX() : input.getX() + 200;
    const y = input.getY();
    const color = drawBlackCircles ? "black" : "red";
    const scale = Math.random() * 50 + 100;
    const NoiseData = generateNoiseData(scale);
    circles.push({ x, y, color, scale, NoiseData });
    sprayOnCursor = true;
    sprayOffCursor = false;
  }

  const mouseSpeedX = (input.getX() - prevMouseX) / dt;
  const mouseSpeedY = (input.getY() - prevMouseY) / dt;

  if (input.isPressed() && spraySFX) {
    const mouseSpeed = math.len(mouseSpeedX, mouseSpeedY);
    const targetRate = math.mapClamped(mouseSpeed, 0, 1200, 0.5, 1.5);
    currentSoundRate = math.lerp(currentSoundRate, targetRate, 10 * dt);
    spraySound.setVolume(currentSoundRate);
  } else {
    spraySound.setVolume(0);
  }
  if (input.isPressed() && cleaningSFX) {
    cleaningSound.setVolume(1);
    const mouseSpeed = math.len(mouseSpeedX, mouseSpeedY);
    console.log(mouseSpeed);
    const targetRate = math.mapClamped(mouseSpeed, 0, 600, 0.5, 3);
    currentSoundRate = math.lerp(currentSoundRate, targetRate, 10 * dt);
    cleaningSound.setRate(currentSoundRate);
  } else {
    cleaningSound.setVolume(0);
    cleaningSound.setRate(0);
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the circles
  circles.forEach((circle) => {
    ctx.beginPath();
    drawNoisyCircle(ctx, circle.x, circle.y, circle.NoiseData);
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.closePath();
  });

  const x = canvas.width / 2;
  const y = canvas.height / 2;

  // Draw the SVG image if it is loaded
  if (svgLoaded) {
    ctx.save(); // Save the context state
    ctx.translate(x, y);
    ctx.scale(7, 7);
    const imgX = -svgImage.width / 2;
    const imgY = -svgImage.height / 2;

    // Use the SVG as a clipping mask
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(svgImage, imgX, imgY, svgImage.width, svgImage.height);
    ctx.restore(); // Restore the context state

    if (input.hasStarted() && sprayLoaded && clothLoaded) {
      spring.target = 1;

      const cursorScale = 0.5 * spring.position;
      const cursorX = input.getX();
      const cursorY = input.getY();
      ctx.save();
      ctx.scale(cursorScale, cursorScale);
      if (sprayOffCursor) {
        ctx.drawImage(
          sprayImage,
          cursorX / cursorScale - sprayImage.width / 2,
          cursorY / cursorScale - sprayImage.height / 2
        );
      } else if (clothCursor) {
        ctx.drawImage(
          clothImage,
          cursorX / cursorScale - clothImage.width / 2,
          cursorY / cursorScale - clothImage.height / 2
        );
      } else if (sprayOnCursor) {
        ctx.drawImage(
          sprayOnImage,
          cursorX / cursorScale - sprayOnImage.width / 2,
          cursorY / cursorScale - sprayOnImage.height / 2
        );
        sprayOffCursor = true;
      }
      ctx.restore();
    }

    // Ensure the area outside the SVG remains black
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Analyze the pixel data to detect if most of the SVG is colored red
  if (svgLoaded) {
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    offscreenCtx.drawImage(canvas, 0, 0);

    // Calculate the bounds of the SVG on the canvas
    const svgX = x - (svgImage.width * 7) / 2;
    const svgY = y - (svgImage.height * 7) / 2;
    const svgWidth = svgImage.width * 7;
    const svgHeight = svgImage.height * 7;

    const imageData = offscreenCtx.getImageData(
      svgX,
      svgY,
      svgWidth,
      svgHeight
    );
    const data = imageData.data;

    let redPixelCount = 0;
    let blackPixelCount = 0;
    let totalPixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const alpha = data[i + 3];

      // Check if the pixel is red and not transparent
      if (red > 200 && green < 50 && blue < 50 && alpha > 0) {
        redPixelCount++;
      }

      // Check if the pixel is black and not transparent
      if (red < 50 && green < 50 && blue < 50 && alpha > 0) {
        blackPixelCount++;
      }

      // Check if the pixel is not transparent
      if (alpha > 0) {
        totalPixelCount++;
      }
    }

    const redPercentage = (redPixelCount / totalPixelCount) * 100;
    const blackPercentage = (blackPixelCount / totalPixelCount) * 100;
    // console.log(`Red Percentage: ${redPercentage}%`);
    // console.log(`Black Percentage: ${blackPercentage}%`);

    if (redPercentage > 60) {
      console.log("Most of the SVG is colored red.");

      setTimeout(() => {
        drawBlackCircles = true;
        wasMostlyRed = true;
        clothCursor = true;
        sprayOffCursor = false;
        spraySFX = false;
        cleaningSFX = true;
      }, 1000);
    } else {
      // console.log("Most of the SVG is not colored red.");
    }

    if (wasMostlyRed && blackPercentage > 99.9) {
      console.log("All of the SVG is black.");
      spring.target = 0;
      if (spring.position < 0.1) {
        finish();
      }
    }
  }

  prevMouseX = input.getX();
  prevMouseY = input.getY();
}

function generateNoiseData(radius) {
  const segments = 10;
  const noiseFactor = 0.2;
  const NoiseData = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const noise = (Math.random() - 0.5) * noiseFactor;
    const r = radius + noise * radius;
    NoiseData.push({ angle, r });
  }
  return NoiseData;
}

function drawNoisyCircle(ctx, x, y, NoiseData) {
  ctx.moveTo(
    x + NoiseData[0].r * Math.cos(NoiseData[0].angle),
    y + NoiseData[0].r * Math.sin(NoiseData[0].angle)
  );
  NoiseData.forEach((point) => {
    const px = x + point.r * Math.cos(point.angle);
    const py = y + point.r * Math.sin(point.angle);
    ctx.lineTo(px, py);
  });
}

run(update);
