"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
};

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
};

function isValidRetailBarcode(value: string) {
  if (!/^\d{12,13}$/.test(value)) return false;

  const sum = value
    .slice(0, -1)
    .split("")
    .reverse()
    .reduce(
      (total, digit, index) =>
        total + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );

  return (10 - (sum % 10)) % 10 === Number(value.at(-1));
}

export default function BarcodeScanner({
  onDetected,
  onCancel,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const hasDetectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let scanTimer: number | null = null;

    const stopCamera = () => {
      if (scanTimer !== null) {
        window.clearTimeout(scanTimer);
      }

      stream?.getTracks().forEach((track) => track.stop());

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    async function startScanner() {
      const BarcodeDetector = (
        window as unknown as {
          BarcodeDetector?: BarcodeDetectorConstructor;
        }
      ).BarcodeDetector;

      if (!BarcodeDetector) {
        setError(
          "Barcode scanning is not supported by this browser. Enter the barcode manually.",
        );
        return;
      }

      try {
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        const formats = ["upc_a", "ean_13"].filter((format) =>
          supportedFormats.includes(format),
        );

        if (formats.length === 0) {
          setError(
            "This browser cannot scan UPC or EAN barcodes. Enter the barcode manually.",
          );
          return;
        }

        const detector = new BarcodeDetector({ formats });

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (!videoRef.current || cancelled) {
          stopCamera();
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scan = async () => {
          if (cancelled || !videoRef.current || hasDetectedRef.current) return;

          try {
            const results = await detector.detect(videoRef.current);
            const barcode = results
              .map((result) => result.rawValue.replace(/\D/g, ""))
              .find(isValidRetailBarcode);

            if (barcode) {
              hasDetectedRef.current = true;
              stopCamera();
              onDetectedRef.current(barcode);
              return;
            }
          } catch {
            // A frame without a readable barcode is normal; keep scanning.
          }

          scanTimer = window.setTimeout(() => {
            void scan();
          }, 150);
        };

        void scan();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to start the camera.",
        );
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">Scan a barcode</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hold a UPC or EAN barcode inside the frame.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
        >
          Cancel
        </button>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          autoPlay
          muted
          playsInline
        />

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-28 w-4/5 rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] sm:h-36 sm:w-3/5" />
        </div>

        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
          Hold the barcode inside the frame
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
