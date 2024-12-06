import { createEngine } from "../../shared/engine.js";
import { createAudio } from "../../shared/engine/audio.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;

// initialize audio
const audio = createAudio();

const lighterSoundFile = await audio.load({
  src: "./assets/SFX/lighter.mp3",
  loop: false,
});
const lighterSound = lighterSoundFile.play({
  volume: 0,
});
let lighterSoundPlayed = false;

const fireSoundFile = await audio.load({
  src: "./assets/SFX/fire.mp3",
  loop: true,
});
const fireSound = fireSoundFile.play({
  volume: 0,
});

let cursor = {
  isOn: false,
  onImage: null,
  offImage: null,
  scale: 0,
  scaleMax: 0.5,
};

let pixels = {
  base: "black",
  burning: "red",
  burned: "transparent",
  life: 8,
  size: 20,
  spreadingChance: 10,
  hasEverBurned: false,
};

let coverY = -canvas.height; // Initial position of the rectangle
let coverSpeed = 50; // Speed of the rectangle
let backgroundColor = false;

// Load the SVG image
const svgImage = new Image();
svgImage.src = "./assets/SVG/2_A.svg";
let svgLoaded = false;
svgImage.onload = () => {
  console.log("SVG image loaded");
  svgLoaded = true;
};

// Load the cursor off PNG
cursor.offImage = new Image();
cursor.offImage.src = "./assets/PNG/lighter_off.png";
let cursorOffLoaded = false;
cursor.offImage.onload = () => {
  console.log("Cursor off image loaded");
  cursorOffLoaded = true;
};

// Load the cursor on PNG
cursor.onImage = new Image();
cursor.onImage.src = "./assets/PNG/lighter_on.png";
let cursorOnLoaded = false;
cursor.onImage.onload = () => {
  console.log("Cursor on on image loaded");
  cursorOnLoaded = true;
};

const matrixWidth = Math.ceil(canvas.width / pixels.size);
const matrixHeight = Math.ceil(canvas.height / pixels.size);

// Initialize the pixel matrix
const pixelMatrix = Array.from({ length: matrixHeight }, () =>
  Array.from({ length: matrixWidth }, () => ({
    color: pixels.base,
    burnCounter: 0,
  }))
);

function update(dt) {
  if (input.isPressed()) {
    cursor.isOn = true;
    if (!lighterSoundPlayed) {
      lighterSoundFile.play({
        rate: 1 + Math.random() * 1,
        volume: 0.5 + Math.random() * 0.5,
      });
      lighterSoundPlayed = true;
    }
  } else {
    cursor.isOn = false;
    lighterSoundPlayed = false;
  }

  // Draw the background
  ctx.fillStyle = backgroundColor ? "white" : "black";
  setTimeout(() => {
    backgroundColor = true;
  }, 750);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the SVG image if it is loaded
  if (svgLoaded) {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const imgX = -svgImage.width / 2;
    const imgY = -svgImage.height / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(7, 7);
    ctx.drawImage(svgImage, imgX, imgY, svgImage.width, svgImage.height);
    ctx.restore();
  }

  // Draw the pixel matrix
  for (let row = 0; row < matrixHeight; row++) {
    for (let col = 0; col < matrixWidth; col++) {
      ctx.fillStyle = pixelMatrix[row][col].color;
      ctx.fillRect(
        col * pixels.size,
        row * pixels.size,
        pixels.size,
        pixels.size
      );
    }
  }

  // Draw the cursor if it is loaded
  if (input.hasStarted() && cursorOffLoaded && cursorOnLoaded) {
    const cursorX = input.getX();
    const cursorY = input.getY();
    cursor.scale += 0.05;
    cursor.scale = Math.min(cursor.scale, cursor.scaleMax);
    ctx.save();
    ctx.scale(cursor.scale, cursor.scale);
    ctx.drawImage(
      cursor.isOn ? cursor.onImage : cursor.offImage,
      cursorX / cursor.scale - cursor.offImage.width / 2,
      cursorY / cursor.scale - cursor.offImage.height / 2
    );
    ctx.restore();
  }

  // Change the color of the pixel on click
  if (input.isPressed()) {
    const x = input.getX() - 10;
    const y = input.getY() - 60;
    const col = Math.floor(x / pixels.size);
    const row = Math.floor(y / pixels.size);
    if (row >= 0 && row < matrixHeight && col >= 0 && col < matrixWidth) {
      pixelMatrix[row][col].color = pixels.burning; // Change the color to burning
      pixelMatrix[row][col].burnCounter = pixels.life; // Set the burn counter
    }
    fireSound.setVolume(1);
  }

  // Spread the red color to neighboring pixels
  spreadRedColor();

  ctx.fillStyle = "black";
  ctx.fillRect(0, coverY, canvas.width, canvas.height);

  // Check if there are no burning pixels left and if there has been some burning pixel before
  if (pixels.hasEverBurned && !hasBurningPixels()) {
    fireSound.setVolume(0);

    setTimeout(() => {
      coverY += coverSpeed; // Move the rectangle

      if (coverY >= 0) {
        coverY = 0;
        console.log("Finish");
        pixels.burned = pixels.base;
        setTimeout(() => {
          finish();
        }, 100);
      }
    }, 500);
  }
}

function spreadRedColor() {
  const newPixelMatrix = pixelMatrix.map((row) => row.slice());

  for (let row = 0; row < matrixHeight; row++) {
    for (let col = 0; col < matrixWidth; col++) {
      if (pixelMatrix[row][col].color === pixels.burning) {
        // Decrease the burn counter
        pixelMatrix[row][col].burnCounter--;
        // Change to burned color if burn counter reaches 0
        if (pixelMatrix[row][col].burnCounter <= 0) {
          newPixelMatrix[row][col].color = pixels.burned;
          // console.log("Burned");
        } else {
          const neighbors = getNeighbors(row, col);
          neighbors.forEach(([nRow, nCol]) => {
            if (
              newPixelMatrix[nRow][nCol].color !== pixels.burned &&
              Math.random() * 100 < pixels.spreadingChance
            ) {
              newPixelMatrix[nRow][nCol].color = pixels.burning;
              newPixelMatrix[nRow][nCol].burnCounter = pixels.life;
              pixels.hasEverBurned = true;
            }
          });
        }
      }
    }
  }

  for (let row = 0; row < matrixHeight; row++) {
    for (let col = 0; col < matrixWidth; col++) {
      pixelMatrix[row][col] = newPixelMatrix[row][col];
    }
  }
}

function hasBurningPixels() {
  for (let row = 0; row < matrixHeight; row++) {
    for (let col = 0; col < matrixWidth; col++) {
      if (pixelMatrix[row][col].color === pixels.burning) {
        return true;
      }
    }
  }
  return false;
}

function getNeighbors(row, col) {
  const neighbors = [];
  if (row > 0) neighbors.push([row - 1, col]); // top
  if (row < matrixHeight - 1) neighbors.push([row + 1, col]); // bottom
  if (col > 0) neighbors.push([row, col - 1]); // left
  if (col < matrixWidth - 1) neighbors.push([row, col + 1]); // right
  return neighbors;
}

run(update);
