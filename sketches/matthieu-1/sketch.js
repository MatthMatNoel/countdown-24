import { createEngine } from "../../shared/engine.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;
run(update);

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
let threshold = 50; // Initial threshold value
let initialStrokeWidth = 0; // Initial stroke width for new segments
let segmentWidths = []; // Array to keep track of stroke width for each segment
let pointPlaced = false;

let crackValue = 0;

let hammerRotation = 0;
let hammerSwingDirection = 1;
let hammerSwingSpeed = 0.1;
let hammerSwinging = false;
let hammerSwingComplete = true;
let isHammerPlaced = false; // Flag to check if the hammer is placed

let cursor = {
  chiselImage0: null,
  chiselImage1: null,
  chiselImage2: null,
  chiselImage3: null,
  hammerImage: null,
};

let currentChiselImage = null; // Initialize with the default chisel image

// Load the chisel 0 PNG
cursor.chiselImage0 = new Image();
cursor.chiselImage0.src = "./assets/PNG/chisel_0.png";
let cursorChisel0Loaded = false;
cursor.chiselImage0.onload = () => {
  console.log("Cursor chisel image 0 loaded");
  cursorChisel0Loaded = true;
};
// Load the chisel 1 PNG
cursor.chiselImage1 = new Image();
cursor.chiselImage1.src = "./assets/PNG/chisel_1.png";
let cursorChisel1Loaded = false;
cursor.chiselImage1.onload = () => {
  console.log("Cursor chisel image 1 loaded");
  cursorChisel1Loaded = true;
};
// Load the chisel 3 PNG
cursor.chiselImage2 = new Image();
cursor.chiselImage2.src = "./assets/PNG/chisel_2.png";
let cursorChisel2Loaded = false;
cursor.chiselImage2.onload = () => {
  console.log("Cursor chisel image 2 loaded");
  cursorChisel2Loaded = true;
};
// Load the chisel 3 PNG
cursor.chiselImage3 = new Image();
cursor.chiselImage3.src = "./assets/PNG/chisel_3.png";
let cursorChisel3Loaded = false;
cursor.chiselImage3.onload = () => {
  console.log("Cursor chisel image 3 loaded");
  cursorChisel3Loaded = true;
};

// Load the hammer PNG
cursor.hammerImage = new Image();
cursor.hammerImage.src = "./assets/PNG/hammer.png";
let cursorHammerLoaded = false;
cursor.hammerImage.onload = () => {
  console.log("Cursor hammer image loaded");
  cursorHammerLoaded = true;
};

// Add event listener for click event
window.addEventListener("click", (event) => {
  crackValue += 1;
  if (isHammerPlaced) {
    hammerSwinging = true; // Start hammer swinging only if the cursor is already a hammer
    hammerSwingComplete = false; // Reset swing complete flag
  } else {
    isHammerPlaced = true; // Set the flag to true after the first click
  }
});

// Load the SVG file
fetch("./assets/SVG/1_A.svg")
  .then((response) => response.text())
  .then((svgText) => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const polygon = svgDoc.querySelector("polygon");
    svgPolygon = polygon.getAttribute("points");
    svgPoints = svgPolygon
      .trim()
      .split(/\s+/)
      .map((point, index, array) => {
        if (index % 2 === 0) {
          return { x: parseFloat(point), y: parseFloat(array[index + 1]) };
        }
        return null;
      })
      .filter((point) => point !== null);
  });

function update(dt) {
  // Draw the background
  ctx.fillStyle = backgroundColor ? "black" : "black";
  setTimeout(() => {
    backgroundColor = true;
  }, 750);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the SVG polygon if it is loaded
  if (svgPolygon) {
    ctx.save();
    ctx.fillStyle = "black";

    // Create a temporary SVG element to calculate the bounding box
    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    const polygon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );
    polygon.setAttribute("points", svgPolygon);
    tempSvg.appendChild(polygon);
    document.body.appendChild(tempSvg);
    const boundingBox = polygon.getBBox();
    document.body.removeChild(tempSvg);

    // Calculate the translation to center the polygon
    translateX = (canvas.width - boundingBox.width) / 2 - boundingBox.x;
    translateY = (canvas.height - boundingBox.height) / 2 - boundingBox.y;

    // Translate and draw the polygon
    ctx.translate(translateX, translateY);
    const path2D = new Path2D(`M${svgPolygon}Z`);
    ctx.fill(path2D);

    // Add stroke to the polygon if space is pressed and a red circle has been placed
    if (isChiselPlaced && closestPoint) {
      svgPoints.forEach((point, index) => {
        const nextPoint = svgPoints[(index + 1) % svgPoints.length];
        const dist = math.dist(
          closestPoint.x,
          closestPoint.y,
          point.x,
          point.y
        );
        if (dist < threshold) {
          const newPath = new Path2D();
          newPath.moveTo(point.x, point.y);
          newPath.lineTo(nextPoint.x, nextPoint.y);
          ctx.strokeStyle = "white";
          ctx.lineWidth = Math.min(segmentWidths[index], maxStrokeWidth);
          ctx.stroke(newPath);
        }
      });
    }

    ctx.restore();
  }

  // Store the point when the mouse is pressed
  if (input.isPressed() && !pointPlaced) {
    pointPlaced = true;
    const x = input.getX() - translateX;
    const y = input.getY() - translateY;

    // Find the closest point on the SVG polygon
    closestPoint = svgPoints[0];
    let minDist = math.dist(x, y, closestPoint.x, closestPoint.y);
    svgPoints.forEach((point) => {
      const dist = math.dist(x, y, point.x, point.y);
      if (dist < minDist) {
        closestPoint = point;
        minDist = dist;
      }
    });

    points.push({
      x: closestPoint.x + translateX,
      y: closestPoint.y + translateY,
    });
  }

  // Draw all stored points
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
    ctx.fill();

    if (hammerSwingComplete) {
      if (crackValue <= 1) {
        currentChiselImage = cursor.chiselImage0;
      } else if (crackValue <= 2) {
        currentChiselImage = cursor.chiselImage1;
      } else if (crackValue <= 3) {
        currentChiselImage = cursor.chiselImage2;
      } else if (crackValue <= 4) {
        currentChiselImage = cursor.chiselImage3;
      }
      hammerSwingComplete = false; // Reset the flag after updating the chisel image
    }

    if (currentChiselImage) {
      ctx.drawImage(
        currentChiselImage,
        point.x - currentChiselImage.width / 2,
        point.y - currentChiselImage.height / 2
      );
    }
    isChiselPlaced = true; // Set the flag to true when a red circle is placed
  });

  // Draw the chisel image at the cursor position
  if (cursorChisel0Loaded) {
    const cursorX = input.getX();
    const cursorY = input.getY();
    ctx.save();
    ctx.translate(cursorX, cursorY);
    ctx.rotate(hammerRotation);
    ctx.drawImage(
      isHammerPlaced ? cursor.hammerImage : cursor.chiselImage0,
      -cursor.chiselImage0.width / 2,
      -cursor.chiselImage0.height / 2
    );
    ctx.restore();
  }

  // Update hammer rotation
  if (hammerSwinging) {
    hammerRotation += hammerSwingSpeed * hammerSwingDirection;
    if (hammerRotation > Math.PI / 4 || hammerRotation < -Math.PI / 4) {
      hammerSwingDirection *= -1;
    }
    if (hammerRotation < -Math.PI / 4) {
      hammerSwinging = false; // Stop hammer swinging after one back and forth
      hammerSwingComplete = true; // Set swing complete flag

      // Increase stroke width and threshold after hammer swing is complete
      if (isChiselPlaced && crackValue > 1) {
        strokeWidth += 2;
        threshold += 100; // Increase the threshold value each time space is pressed

        console.log("Hammer swing complete");

        // Update stroke width for existing segments
        segmentWidths = segmentWidths.map((width) => width + 2);

        // Add new segments with initial stroke width
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
