import React, { useState, useRef, useEffect } from "react";
import Measure from "react-measure";
import { useUserMedia } from "../hooks/use-user-media";
import { useCardRatio } from "../hooks/use-card-ratio";
import { useOffsets } from "../hooks/use-offsets";
import {
  Video,
  Canvas,
  Wrapper,
  Container,
  Flash,
  Overlay,
  Button,
} from "./styles";
import jsqr from "jsqr";

const CAPTURE_OPTIONS = {
  audio: false,
  video: { facingMode: "environment" },
};

export function Camera({ onCapture, onClear }) {
  const canvasRef = useRef();
  const videoRef = useRef();

  const [container, setContainer] = useState({ width: 0, height: 0 });
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [captureOptions, setCaptureOptions] = useState({});

  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    async function getBackCamera() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const backCamera = videoDevices[videoDevices.length - 1];

      setCaptureOptions({
        audio: false,
        video: { deviceId: backCamera.deviceId },
      });
    }

    getBackCamera();
  }, []);

  const mediaStream = useUserMedia(captureOptions);

  const [aspectRatio, calculateRatio] = useCardRatio(1.586);
  const offsets = useOffsets(
    videoRef.current && videoRef.current.videoWidth,
    videoRef.current && videoRef.current.videoHeight,
    container.width,
    container.height
  );

  if (mediaStream && videoRef.current && !videoRef.current.srcObject) {
    videoRef.current.srcObject = mediaStream;
  }

  function handleResize(contentRect) {
    setContainer({
      width: contentRect.bounds.width,
      height: Math.round(contentRect.bounds.width / aspectRatio),
    });
  }
  useEffect(() => {
    requestAnimationFrame(handleCapture);
  });

  function handleCanPlay() {
    calculateRatio(videoRef.current.videoHeight, videoRef.current.videoWidth);
    setIsVideoPlaying(true);
    videoRef.current.play();
  }

  function handleCapture() {
    const context = canvasRef.current?.getContext("2d");

    context?.drawImage(
      videoRef.current,
      offsets.x,
      offsets.y,
      container.width,
      container.height,
      0,
      0,
      container.width,
      container.height
    );

    const imageData = context?.getImageData(
      0,
      0,
      canvasRef?.current?.width,
      canvasRef?.current?.height
    );

    const code = jsqr(imageData?.data, imageData?.width, imageData?.height);

    if (code) {
      console.log("Found QR code", code.data);
      setQrData(code.data);
      context.beginPath();
      context.moveTo(
        code.location.topLeftCorner.x,
        code.location.topLeftCorner.y
      );
      context.lineTo(
        code.location.topRightCorner.x,
        code.location.topRightCorner.y
      );
      context.lineTo(
        code.location.bottomRightCorner.x,
        code.location.bottomRightCorner.y
      );
      context.lineTo(
        code.location.bottomLeftCorner.x,
        code.location.bottomLeftCorner.y
      );
      context.lineTo(
        code.location.topLeftCorner.x,
        code.location.topLeftCorner.y
      );
      context.lineWidth = 4;
      context.strokeStyle = "#FF3B58";
      context.stroke();
    }

    canvasRef.current.toBlob((blob) => onCapture(blob), "image/jpeg", 1);
    setIsCanvasEmpty(false);
    setIsFlashing(true);
  }

  function handleClear() {
    const context = canvasRef.current.getContext("2d");
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setIsCanvasEmpty(true);
    onClear();
  }

  if (!mediaStream) {
    return null;
  }

  return (
    <Measure bounds onResize={handleResize}>
      {({ measureRef }) => (
        <Wrapper>
          <Container
            ref={measureRef}
            maxHeight={videoRef.current && videoRef.current.videoHeight}
            maxWidth={videoRef.current && videoRef.current.videoWidth}
            style={{
              height: `${container.height}px`,
            }}
          >
            <Video
              ref={videoRef}
              hidden={!isVideoPlaying}
              onCanPlay={handleCanPlay}
              autoPlay
              playsInline
              muted
              style={{
                top: `-${offsets.y}px`,
                left: `-${offsets.x}px`,
              }}
            />

            <Overlay hidden={!isVideoPlaying} />

            <Canvas
              ref={canvasRef}
              width={container.width}
              height={container.height}
            />

            <Flash
              flash={isFlashing}
              onAnimationEnd={() => setIsFlashing(false)}
            />
          </Container>

          <p style={{ fontSize: "16px" }}>{qrData}</p>

          {/* {isVideoPlaying && (
            <Button onClick={isCanvasEmpty ? handleCapture : handleClear}>
              {isCanvasEmpty ? "Take a picture" : "Take another picture"}
            </Button>
          )} */}
        </Wrapper>
      )}
    </Measure>
  );
}
