"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
};
function isValidRetailBarcode(value: string) {
  if (!/^\d{12,13}$/.test(value)) {
    return false;
  }

  const digitsWithoutCheck = value.slice(0, -1);

  const sum = digitsWithoutCheck
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
  const scannerRef = useRef<HTMLDivElement>(null);
  const hasDetectedRef = useRef(false);
    const detectedCandidateRef = useRef({ value: "", count: 0 });
    const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);
useEffect(() => {
  onDetectedRef.current = onDetected;
}, [onDetected]);
  useEffect(() => {
    let stopped = false;
    let scannerStarted = false;
    let stopScanner: (() => void) | null = null;

    async function startScanner() {
      try {
        const { default: Quagga } = await import("@ericblade/quagga2");

        if (!scannerRef.current || stopped) return;

        const handleDetected = (
          result: { codeResult?: { code?: string | null } } | null,
        ) => {
          const barcode = result?.codeResult?.code;

          if (!barcode || hasDetectedRef.current) return;

          if (!isValidRetailBarcode(barcode)) {
            console.info("Barcode scanner: rejected invalid result", barcode);
            return;
          }

          if (detectedCandidateRef.current.value !== barcode) {
            detectedCandidateRef.current = { value: barcode, count: 1 };
            console.info("Barcode scanner: waiting for confirmation", barcode);
            return;
          }

          detectedCandidateRef.current.count += 1;

          if (detectedCandidateRef.current.count < 2) return;

          console.info("Barcode scanner: confirmed", barcode);

          hasDetectedRef.current = true;
          stopScanner?.();
          onDetectedRef.current(barcode);
        };

        const handleProcessed = (
          result: { codeResult?: { code?: string | null } } | null,
        ) => {
          const candidate = result?.codeResult?.code;

          if (candidate) {
            console.info("Barcode scanner: candidate frame", candidate);
          }
        };

        await new Promise<void>((resolve, reject) => {
          Quagga.init(
            {
              inputStream: {
                type: "LiveStream",
                target: scannerRef.current!,
                constraints: {
                  facingMode: "environment",
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
              },
              locator: {
                patchSize: "medium",
                halfSample: true,
              },
              numOfWorkers: navigator.hardwareConcurrency
                ? Math.min(navigator.hardwareConcurrency, 4)
                : 2,
              frequency: 10,
              decoder: {
                readers: ["upc_reader", "ean_reader"],
              },
              locate: true,
            },
            (initError) => {
              if (initError) {
                reject(initError);
                return;
              }

              resolve();
            },
          );
        });

        if (stopped) return;

        Quagga.onDetected(handleDetected);
        Quagga.onProcessed(handleProcessed);
        Quagga.start();
        scannerStarted = true;

        stopScanner = () => {
          if (!scannerStarted) return;

          console.info("Barcode scanner: Stopped");
          scannerStarted = false;
          Quagga.offDetected(handleDetected);
          Quagga.offProcessed(handleProcessed);
          Quagga.stop();
        };

        console.info("Barcode scanner: camera scanning");
      } catch (error) {
        console.error("Barcode scanner: failed to start", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to start the barcode scanner.",
        );
      }
    }

    const startTimer = window.setTimeout(() => {
      void startScanner();
    }, 0);

    return () => {
      stopped = true;
      window.clearTimeout(startTimer);
      stopScanner?.();
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

      <div
        ref={scannerRef}
        className="relative mt-4 aspect-video overflow-hidden rounded-lg bg-black [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      >
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="h-28 w-4/5 rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] sm:h-36 sm:w-3/5" />
        </div>

        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
          Hold the barcode inside the frame
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Camera unavailable: {error}
        </p>
      )}
    </section>
  );
}
