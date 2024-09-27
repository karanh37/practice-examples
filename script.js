const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const canvasCtx = canvasElement.getContext("2d");

let squatCount = 0;
let inSquatPosition = false;

// Function to calculate angle between three points using the three-point method
function angleBetween3Points(p1, p2, p3) {
  const radians =
    Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// Function to determine if the squat form is correct based on knee, hip, and back angles
function checkFormIssues(kneeAngle, hipAngle, backAngle) {
  const issues = [];

  if (kneeAngle < 90) {
    issues.push(
      "Knees Bending Too Much: Watch your knee bend. Ensure your knees do not bend excessively and maintain proper alignment with your toes."
    );
  }

  if (hipAngle < 80) {
    issues.push(
      "Hips Bending Too Much: Keep your hips higher. Avoid excessive hip bending by maintaining a more upright posture."
    );
  }

  if (backAngle < 70) {
    issues.push(
      "Back Leaning Too Much: Maintain a straighter back. Focus on keeping your back straight and avoid leaning forward excessively."
    );
  }

  return issues;
}

// Function to determine if the squat form is correct
function isSquatFormCorrect(kneeAngle, hipAngle, backAngle) {
  const isKneeInRange = kneeAngle >= 90 && kneeAngle <= 110;
  const isHipInRange = hipAngle >= 80 && hipAngle <= 100;
  const isBackInRange = backAngle >= 70 && backAngle <= 90;

  return isKneeInRange && isHipInRange && isBackInRange;
}

// Check if hips and knees landmarks are visible
function areKneeLandmarksVisible(landmarks) {
  const requiredLandmarks = [23, 24, 25, 26]; // Left and right hips and knees
  return requiredLandmarks.every((index) => landmarks[index].visibility > 0.5);
}

// Pose detection onResults callback
function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    // Draw pose landmarks on canvas
    for (let i = 0; i < results.poseLandmarks.length; i++) {
      const landmark = results.poseLandmarks[i];
      canvasCtx.beginPath();
      canvasCtx.arc(
        landmark.x * canvasElement.width,
        landmark.y * canvasElement.height,
        5,
        0,
        2 * Math.PI
      );
      canvasCtx.fill();
    }

    // Check if hips and knees are visible
    if (areKneeLandmarksVisible(results.poseLandmarks)) {
      // Extract relevant landmarks for both legs and back
      const leftHip = results.poseLandmarks[23];
      const leftKnee = results.poseLandmarks[25];
      const leftAnkle = results.poseLandmarks[27]; // Optional
      const rightHip = results.poseLandmarks[24];
      const rightKnee = results.poseLandmarks[26];
      const rightAnkle = results.poseLandmarks[28]; // Optional
      const leftShoulder = results.poseLandmarks[11];
      const rightShoulder = results.poseLandmarks[12];

      // Calculate angles for knees, hips, and back
      const leftKneeAngle = angleBetween3Points(leftHip, leftKnee, leftAnkle); // Left knee angle
      const rightKneeAngle = angleBetween3Points(
        rightHip,
        rightKnee,
        rightAnkle
      ); // Right knee angle
      const leftHipAngle = angleBetween3Points(leftShoulder, leftHip, leftKnee); // Left hip angle
      const rightHipAngle = angleBetween3Points(
        rightShoulder,
        rightHip,
        rightKnee
      ); // Right hip angle
      const backAngle = angleBetween3Points(leftShoulder, leftHip, rightHip); // Back angle (rough)

      // Determine if the squat form is correct
      const squatFormCorrect =
        isSquatFormCorrect(leftKneeAngle, leftHipAngle, backAngle) &&
        isSquatFormCorrect(rightKneeAngle, rightHipAngle, backAngle);

      // Check for squat position
      if (leftKneeAngle < 130 && rightKneeAngle < 130 && !inSquatPosition) {
        if (squatFormCorrect) {
          inSquatPosition = true;
        }
      }

      // Count squats when moving back to a standing position
      if (leftKneeAngle > 150 && rightKneeAngle > 150 && inSquatPosition) {
        squatCount++;
        inSquatPosition = false;
      }

      // Display squat count and form status on the canvas
      canvasCtx.font = "30px Arial";
      canvasCtx.fillStyle = "white";
      canvasCtx.fillText(`Squat Count: ${squatCount}`, 50, 50);

      if (squatFormCorrect) {
        canvasCtx.fillText("Form: Correct", 50, 100);
      } else {
        const issues = checkFormIssues(leftKneeAngle, leftHipAngle, backAngle);
        canvasCtx.fillText("Form: Incorrect", 50, 100);

        // Display form issues as suggestions
        issues.forEach((issue, index) => {
          canvasCtx.fillText(issue, 50, 150 + index * 50);
        });
      }
    } else {
      canvasCtx.font = "30px Arial";
      canvasCtx.fillStyle = "white";
      canvasCtx.fillText("Hips and knees not visible", 50, 50);
    }
  }
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});

camera.start();
