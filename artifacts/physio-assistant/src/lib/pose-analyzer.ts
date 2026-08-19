import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

export type PoseFrame = {
  angle: number | null;
  phase: 'Ready' | 'Lower' | 'Rise';
  reps: number;
  hasPose: boolean;
};

type PoseAnalyzerOptions = {
  onFrame: (frame: PoseFrame) => void;
  onError: (error: Error) => void;
};

const WASM_ASSET_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y);

const kneeAngle = (
  hip: { x: number; y: number },
  knee: { x: number; y: number },
  ankle: { x: number; y: number },
) => {
  const upper = distance(hip, knee);
  const lower = distance(ankle, knee);
  const across = distance(hip, ankle);
  const cosine = (upper ** 2 + lower ** 2 - across ** 2) / (2 * upper * lower);
  return Math.round((Math.acos(Math.max(-1, Math.min(1, cosine)))*180) / Math.PI);
};

export async function createPoseAnalyzer(
  video: HTMLVideoElement,
  options: PoseAnalyzerOptions,
) {
  const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_PATH,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });

  let animationFrame = 0;
  let lastVideoTime = -1;
  let reps = 0;
  let phase: PoseFrame['phase'] = 'Ready';
  let hasBeenLow = false;
  let stopped = false;

  const emitNoPose = () =>
    options.onFrame({ angle: null, phase: 'Ready', reps, hasPose: false });

  const process = () => {
    if (stopped) return;

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      emitNoPose();
    } else if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const result: PoseLandmarkerResult = landmarker.detectForVideo(
          video,
          performance.now(),
        );
        const landmarks = result.landmarks[0];
        const hip = landmarks?.[23];
        const knee = landmarks?.[25];
        const ankle = landmarks?.[27];
        const visible =
          [hip, knee, ankle].every((point) => point && (point.visibility ?? 0) >= 0.55);

        if (!visible || !hip || !knee || !ankle) {
          emitNoPose();
        } else {
          const angle = kneeAngle(hip, knee, ankle);
          if (angle < 115) {
            hasBeenLow = true;
            phase = 'Lower';
          } else if (hasBeenLow && angle >= 150) {
            reps += 1;
            hasBeenLow = false;
            phase = 'Rise';
          } else {
            phase = 'Ready';
          }
          options.onFrame({ angle, phase, reps, hasPose: true });
        }
      } catch (error) {
        options.onError(
          error instanceof Error ? error : new Error('Pose analysis failed.'),
        );
      }
    }

    animationFrame = requestAnimationFrame(process);
  };

  animationFrame = requestAnimationFrame(process);

  return () => {
    stopped = true;
    cancelAnimationFrame(animationFrame);
    landmarker.close();
  };
}