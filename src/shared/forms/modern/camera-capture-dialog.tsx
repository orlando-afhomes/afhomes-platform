"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Spinner } from "@/shared/ui/spinner";

const MAX_CAPTURE_DIMENSION = 1920;
const JPEG_QUALITY = 0.9;

export type CameraCaptureDialogProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  /** Front camera for portraits, rear camera for documents and receipts. */
  facingMode?: "user" | "environment";
};

function cameraErrorMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access or upload a file instead.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found. Upload a file instead.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use. Close it or upload a file instead.";
  }
  if (name === "OverconstrainedError") {
    return "The camera does not support this setting. Upload a file instead.";
  }
  return "Could not start the camera. Upload a file instead.";
}

/** Live camera preview that returns a JPEG File; the owning uploader keeps validation and submit behavior. */
export function CameraCaptureDialog({ open, onClose, onCapture, facingMode = "environment" }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (cancelled) return;
        setError("Camera is not available in this browser. Upload a file instead.");
        setStatus("error");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // A muted, inline preview normally plays; if it cannot, capture can still use the stream.
          }
        }
        if (!cancelled) setStatus("ready");
      } catch (failure) {
        if (cancelled) return;
        setError(cameraErrorMessage(failure));
        setStatus("error");
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facingMode]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera preview is not ready. Try again or upload a file instead.");
      return;
    }
    setCapturing(true);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCapturing(false);
      setError("Could not capture the photo. Upload a file instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCapturing(false);
          setError("Could not capture the photo. Upload a file instead.");
          return;
        }
        stopStream();
        setCapturing(false);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        onCapture(new File([blob], `camera-${stamp}.jpg`, { type: "image/jpeg" }));
        onClose();
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="tw:sm:max-w-lg" overlayClassName="tw:bg-black/35 tw:backdrop-blur-sm">
        <DialogHeader className="tw:flex-row tw:items-start tw:gap-3">
          <span aria-hidden="true" className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary/10 tw:text-primary tw:*:[svg]:size-5">
            <Camera />
          </span>
          <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
            <DialogTitle className="tw:text-lg tw:font-bold">Take a picture</DialogTitle>
            <DialogDescription>Use your camera to capture an image, or upload a file instead.</DialogDescription>
          </div>
        </DialogHeader>
        {error ? (
          <p role="alert" className="tw:rounded-lg tw:border tw:border-destructive/30 tw:bg-destructive/5 tw:p-3 tw:text-sm tw:text-destructive">{error}</p>
        ) : null}
        <div className="tw:relative tw:aspect-video tw:min-h-48 tw:overflow-hidden tw:rounded-xl tw:border tw:border-border tw:bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-label="Camera preview"
            className={cn("tw:absolute tw:inset-0 tw:size-full tw:object-contain", status !== "ready" && "tw:opacity-0")}
          />
          {status === "starting" || capturing ? (
            <div className="tw:absolute tw:inset-0 tw:grid tw:place-items-center tw:bg-black/40">
              <Spinner label={capturing ? "Capturing photo" : "Starting camera"} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { stopStream(); onClose(); }}>Cancel</Button>
          <Button type="button" loading={capturing} onClick={capture} disabled={status !== "ready" || capturing}>Capture photo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type TakePictureButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  onCapture: (file: File) => void;
  label?: string;
  facingMode?: "user" | "environment";
};

/** Non-submitting button that opens the shared camera dialog and returns a JPEG File to the uploader. */
export function TakePictureButton({ onCapture, label = "Take Picture", facingMode, ...rest }: TakePictureButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" {...rest} onClick={() => setOpen(true)}>
        <Camera aria-hidden="true" /> {label}
      </Button>
      {open ? (
        <CameraCaptureDialog
          open
          facingMode={facingMode}
          onClose={() => setOpen(false)}
          onCapture={(file) => {
            onCapture(file);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
