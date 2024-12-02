import { createEngine } from "../../shared/engine.js";
import { Spring } from "../../shared/spring.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;
run(update);

const spring = new Spring({
  position: 0,
  frequency: 2.5,
  halfLife: 0.05,
});

const circles = [];
let drawBlackCircles = false;
let wasMostlyRed = false;

// Load the SVG image
const svgImage = new Image();
svgImage.src = "./public/SVG/3_A.svg";
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
sprayImage.src = "./public/PNG/spray.png";
let sprayLoaded = false;
sprayImage.onload = () => {
  console.log("Spray image loaded");
  sprayLoaded = true;
};

// Load the spray on PNG
const sprayOnImage = new Image();
let sprayOnCursor = false;
sprayOnImage.src = "./public/PNG/spray_on.png";
let sprayOnLoaded = false;
sprayOnImage.onload = () => {
  console.log("Spray on image loaded");
  sprayOnLoaded = true;
};

// Load the cloth PNG
const clothImage = new Image();
let clothCursor = false;
clothImage.src = "./public/PNG/cloth.png";
let clothLoaded = false;
clothImage.onload = () => {
  console.log("Cloth image loaded");
  clothLoaded = true;
};

function update(dt) {
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
      const cursorScale = 0.5;
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
      }, 1000);
    } else {
      // console.log("Most of the SVG is not colored red.");
    }

    if (wasMostlyRed && blackPercentage > 99.9) {
      console.log("All of the SVG is black.");
      finish();
    }
  }
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
