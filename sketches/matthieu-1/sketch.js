import { createEngine } from "../../shared/engine.js";

const { renderer, input, math, run, finish } = createEngine();
const { ctx, canvas } = renderer;
run(update);

let cursor = {
  isOn: false,
  ImageA: null,
  ImageB: null,
  scale: 0,
  scaleMax: 0.5,
  position: null,
};

let coverY = -canvas.height; // Initial position of the rectangle
let coverSpeed = 50; // Speed of the rectangle
let backgroundColor = false;

// Load the SVG image
const svgImage = new Image();
svgImage.src = "./assets/SVG/1_A.svg";
let svgLoaded = false;
svgImage.onload = () => {
  console.log("SVG image loaded");
  svgLoaded = true;
  parseSVGPoints();
};

// Load the cursor A PNG
cursor.ImageA = new Image();
cursor.ImageA.src = "./assets/PNG/Hammer.png";
let cursorALoaded = false;
cursor.ImageA.onload = () => {
  console.log("Cursor A on image loaded");
  cursorALoaded = true;
};

// Load the cursor B PNG
cursor.ImageB = new Image();
cursor.ImageB.src = "./assets/PNG/Chisel.png";
let cursorBLoaded = false;
cursor.ImageB.onload = () => {
  console.log("Cursor B image loaded");
  cursorBLoaded = true;
};

let svgPoints = [];
let clickPositions = [];

function parseSVGPoints() {
  fetch(svgImage.src)
    .then((response) => response.text())
    .then((svgText) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const path = svgDoc.querySelector("path");
      const pathLength = path.getTotalLength();
      const numPoints = 100; // Number of points to sample along the path
      for (let i = 0; i <= numPoints; i++) {
        const point = path.getPointAtLength((i / numPoints) * pathLength);
        svgPoints.push({ x: point.x, y: point.y });
      }
    });
}

function findClosestPoint(x, y) {
  let closestPoint = null;
  let minDistance = Infinity;
  svgPoints.forEach((point) => {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  });
  return closestPoint;
}

function update(dt) {
  if (input.isPressed()) {
    const scaleX = svgImage.width / svgImage.naturalWidth;
    const scaleY = svgImage.height / svgImage.naturalHeight;
    const imgX = -svgImage.width / 2;
    const imgY = -svgImage.height / 2;
    cursor.isOn = true;

    const translatedPosition = {
      x: input.getX() - canvas.width / 2 - imgX,
      y: input.getY() - canvas.height / 2 - imgY,
    };

    const transformedPosition = {
      x: translatedPosition.x / scaleX,
      y: translatedPosition.y / scaleY,
    };
    const closestPoint = findClosestPoint(
      transformedPosition.x,
      transformedPosition.y
    );
    if (closestPoint) {
      const finalPosition = {
        x: closestPoint.x,
        y: closestPoint.y,
      };
      clickPositions.push(finalPosition);
    } else {
      console.error("No closest point found");
    }
  } else {
    cursor.isOn = false;
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

  // Draw the cursor if it is loaded
  if (input.hasStarted() && cursorBLoaded && cursorALoaded) {
    const cursorX = input.getX();
    const cursorY = input.getY();
    cursor.scale += 0.05;
    cursor.scale = Math.min(cursor.scale, cursor.scaleMax);
    ctx.save();
    ctx.scale(cursor.scale, cursor.scale);
    ctx.drawImage(
      cursor.isOn ? cursor.ImageA : cursor.ImageB,
      cursorX / cursor.scale - cursor.ImageB.width / 2,
      cursorY / cursor.scale - cursor.ImageB.height / 2
    );
    ctx.restore();
  }

  // Draw the cursor A image at the closest point position
  if (cursorALoaded) {
    clickPositions.forEach((position) => {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2); // Align to SVG center
      const scaleX = svgImage.width / svgImage.naturalWidth;
      const scaleY = svgImage.height / svgImage.naturalHeight;
      ctx.scale(scaleX, scaleY); // Match the SVG scale
      ctx.drawImage(
        cursor.ImageA,
        position.x - cursor.ImageA.width / 2 / scaleX,
        position.y - cursor.ImageA.height / 2 / scaleY,
        cursor.ImageA.width / scaleX,
        cursor.ImageA.height / scaleY
      );
      ctx.restore();
    });
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, coverY, canvas.width, canvas.height);

  // Check if there are no burning pixels left and if there has been some burning pixel before
  //   setTimeout(() => {
  //     coverY += coverSpeed; // Move the rectangle

  //     if (coverY >= 0) {
  //       coverY = 0;
  //       console.log("Finish");
  //       setTimeout(() => {
  //         finish();
  //       }, 100);
  //     }
  //   }, 500);
  // }
}
