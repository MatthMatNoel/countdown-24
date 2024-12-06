import { createEngine } from "../../shared/engine.js";
import { createAudio } from "../../shared/engine/audio.js";
import { Spring } from "../../shared/spring.js";

const { renderer, input, math, run, finish, audio } = createEngine();
const { ctx, canvas } = renderer;

run(update);

const spring = new Spring({
  position: 0, // start position
  frequency: 2.5, // oscillations per second (approximate)
  halfLife: 0.35, // time until amplitude is halved
  target: 0,
});

// Initial state variables
let backgroundColor = false;
let svgPolygon = null;
let points = [];
let svgPoints = [];
let translateX = 0;
let translateY = 0;

let strokeWidth = 0;
let maxStrokeWidth = 10;
let isChiselPlaced = false;
let closestPoint = null;
let threshold = 50;
let initialStrokeWidth = 2;
let segmentWidths = [];
let pointPlaced = false;

let crackValue = 0;

let hammerRotation = 0;
let hammerSwingDirection = 1;
let hammerSwingSpeed = 0.1;
let hammerSwinging = false;
let hammerSwingComplete = true;
let isHammerPlaced = false;
let isCrackComplete = false;

let isShaking = false;
let shakeDuration = 200; // Duration of the shake in milliseconds
let shakeStartTime = 0;
let shakeIntensity = 25; // Intensity of the shake

let isFinished = false;

// Load cursor images
let cursor = {
  chiselImage0: loadImage("./assets/PNG/chisel_0.png"),
  chiselImage1: loadImage("./assets/PNG/chisel_1.png"),
  chiselImage2: loadImage("./assets/PNG/chisel_2.png"),
  chiselImage3: loadImage("./assets/PNG/chisel_3.png"),
  hammerImage: loadImage("./assets/PNG/hammer.png"),
};

let currentChiselImage = null;

// Event listener for mouse click
window.addEventListener("click", handleClick);
fetchSVG("./assets/SVG/1_A.svg");

// Function to load an image
function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.onload = () => console.log(`${src} loaded`);
  return img;
}

// Handle mouse click event
function handleClick() {
  crackValue += 1;
  if (isHammerPlaced) {
    hammerSwinging = true;
    hammerSwingComplete = false;
  } else {
    isHammerPlaced = true;
    smallHitSound.play();
  }
}

// Fetch and parse SVG file
function fetchSVG(url) {
  fetch(url)
    .then((response) => response.text())
    .then((svgText) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const polygon = svgDoc.querySelector("polygon");
      svgPolygon = polygon.getAttribute("points");
      svgPoints = parseSVGPoints(svgPolygon);
    });
}

// Parse SVG points into an array of objects
function parseSVGPoints(points) {
  return points
    .trim()
    .split(/\s+/)
    .map((point, index, array) => {
      if (index % 2 === 0) {
        return { x: parseFloat(point), y: parseFloat(array[index + 1]) };
      }
      return null;
    })
    .filter((point) => point !== null);
}

// Set spring target to 1 when the page is fully loaded
window.onload = () => {
  spring.target = 1;
};

// Main update function
function update(dt) {
  if (isShaking) {
    const elapsedTime = Date.now() - shakeStartTime;
    if (elapsedTime < shakeDuration) {
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;
      ctx.save();
      ctx.translate(shakeX, shakeY);
    } else {
      isShaking = false;
    }
  }

  if (isHammerPlaced) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(spring.position, spring.position);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }
  spring.step(dt);

  drawBackground();
  if (svgPolygon) drawSVGPolygon();
  if (input.isPressed() && !pointPlaced) storePoint();
  drawPoints();
  drawCursor();
  updateHammerRotation();

  if (isShaking) {
    ctx.restore();
  }
}

// Draw the background
function drawBackground() {
  ctx.fillStyle = backgroundColor ? "black" : "black";
  setTimeout(() => {
    backgroundColor = true;
  }, 750);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw the SVG polygon
function drawSVGPolygon() {
  ctx.save();
  if (isCrackComplete) {
    ctx.fillStyle = "white";
  } else {
    ctx.fillStyle = "black";
  }
  const boundingBox = getSVGBoundingBox();
  translateX = (canvas.width - boundingBox.width) / 2 - boundingBox.x;
  translateY = (canvas.height - boundingBox.height) / 2 - boundingBox.y;

  ctx.translate(translateX, translateY);

  const path2D = new Path2D(`M${svgPolygon}Z`);
  ctx.fill(path2D);
  if (isChiselPlaced && closestPoint) drawPolygonStrokes();
  ctx.restore();
}

// Get bounding box of the SVG polygon
function getSVGBoundingBox() {
  const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const polygon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  polygon.setAttribute("points", svgPolygon);
  tempSvg.appendChild(polygon);
  document.body.appendChild(tempSvg);
  const boundingBox = polygon.getBBox();
  document.body.removeChild(tempSvg);
  return boundingBox;
}

// Draw strokes on the SVG polygon
function drawPolygonStrokes() {
  isCrackComplete = true;
  svgPoints.forEach((point, index) => {
    const nextPoint = svgPoints[(index + 1) % svgPoints.length];
    const dist = math.dist(closestPoint.x, closestPoint.y, point.x, point.y);
    if (dist < threshold) {
      const newPath = new Path2D();
      newPath.moveTo(point.x, point.y);
      newPath.lineTo(nextPoint.x, nextPoint.y);
      ctx.strokeStyle = "white";
      ctx.lineWidth = Math.min(segmentWidths[index], maxStrokeWidth);
      if (ctx.lineWidth < 3) {
        isCrackComplete = false;
      }
      ctx.stroke(newPath);
    }
  });

  if (isCrackComplete) {
    console.log("Crack complete");
    if (!isFinished) {
      rockSound.play();
    }
    isFinished = true;

    setTimeout(() => {
      spring.target = 0;

      if (spring.position <= -0.05) {
        finish();
      }
    }, 1000);
  }
}

// Store the point where the user clicked
function storePoint() {
  pointPlaced = true;
  const x = input.getX() - translateX;
  const y = input.getY() - translateY;
  closestPoint = findClosestPoint(x, y);
  points.push({
    x: closestPoint.x + translateX,
    y: closestPoint.y + translateY,
  });
}

// Find the closest point in the SVG
function findClosestPoint(x, y) {
  return svgPoints.reduce((closest, point) => {
    const dist = math.dist(x, y, point.x, point.y);
    return dist < math.dist(x, y, closest.x, closest.y) ? point : closest;
  }, svgPoints[0]);
}

// Draw the points on the canvas
function drawPoints() {
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();
    updateChiselImage();
    if (currentChiselImage) {
      ctx.drawImage(
        currentChiselImage,
        point.x - currentChiselImage.width / 2,
        point.y - currentChiselImage.height / 2
      );
    }
    isChiselPlaced = true;
  });
}

// Update the chisel image based on crack value
function updateChiselImage() {
  if (hammerSwingComplete) {
    if (crackValue <= 1) currentChiselImage = cursor.chiselImage0;
    else if (crackValue <= 2) currentChiselImage = cursor.chiselImage1;
    else if (crackValue <= 3) currentChiselImage = cursor.chiselImage2;
    else if (crackValue <= 4) currentChiselImage = cursor.chiselImage3;
    hammerSwingComplete = false;
  }
}

// Draw the cursor on the canvas
function drawCursor() {
  if (input.hasStarted() && cursor.chiselImage0.complete) {
    const cursorX = input.getX();
    const cursorY = input.getY();
    ctx.save();
    ctx.translate(cursorX, cursorY);
    ctx.scale(spring.position, spring.position);
    ctx.rotate(hammerRotation);
    ctx.drawImage(
      isHammerPlaced ? cursor.hammerImage : cursor.chiselImage0,
      -cursor.chiselImage0.width / 2,
      -cursor.chiselImage0.height / 2
    );
    ctx.restore();
  }
}

// Update the hammer rotation during swing
function updateHammerRotation() {
  if (hammerSwinging) {
    hammerRotation += hammerSwingSpeed * hammerSwingDirection;
    if (hammerRotation > Math.PI / 4 || hammerRotation < -Math.PI / 4) {
      hammerSwingDirection *= -1;
    }
    if (hammerRotation < -Math.PI / 4) {
      hammerSwinging = false;
      hammerSwingComplete = true;
      isShaking = true;
      hitSound.play({
        rate: 0.75 + Math.random() * 1,
        volume: 0.5 + Math.random() * 0.5,
      });
      shakeStartTime = Date.now();
      if (isChiselPlaced && crackValue > 1) {
        strokeWidth += 5;
        threshold += 150;
        console.log("Hammer swing complete");
        segmentWidths = segmentWidths.map((width) => width + 2);
        svgPoints.forEach((point, index) => {
          const nextPoint = svgPoints[(index + 1) % svgPoints.length];
          const dist = math.dist(
            closestPoint.x,
            closestPoint.y,
            point.x,
            point.y
          );
          if (dist < threshold && !segmentWidths[index]) {
            segmentWidths[index] = initialStrokeWidth;
          }
        });
      }
    }
  }
}

// initialize audio

const smallHitSound = await audio.load("assets/SFX/smallHit.mp3");
const hitSound = await audio.load("assets/SFX/hit.mp3");
const rockSound = await audio.load("assets/SFX/rock.mp3");
