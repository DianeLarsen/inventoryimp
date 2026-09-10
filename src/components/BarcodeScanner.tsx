"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
};

function normalizeBarcode(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length === 13 && digits.startsWith("0")
    ? digits.slice(1)
    : digits;
}

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
  const candidateRef = useRef({ value: "", count: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    async function startScanner() {
      try {
        if (!videoRef.current) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.UPC_A,
          BarcodeFormat.EAN_13,
        ]);

        const reader = new BrowserMultiFormatReader(hints);

        controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || hasDetectedRef.current) return;

            const barcode = normalizeBarcode(result.getText());

            if (!isValidRetailBarcode(barcode)) {
              return;
            }

            if (candidateRef.current.value !== barcode) {
              candidateRef.current = { value: barcode, count: 1 };
              return;
            }

            candidateRef.current.count += 1;

            if (candidateRef.current.count < 2) return;

            hasDetectedRef.current = true;
            controls?.stop();
            onDetectedRef.current(barcode);
          },
        );

        if (cancelled) {
          controls.stop();
        }
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
      controls?.stop();
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
