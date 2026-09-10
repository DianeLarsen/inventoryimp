"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
};

export default function BarcodeScanner({
  onDetected,
  onCancel,
}: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const hasDetectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let cleanupDetected: (() => void) | undefined;

    async function startScanner() {
      try {
        const { default: Quagga } = await import("@ericblade/quagga2");

        if (!scannerRef.current || stopped) return;

        const handleDetected = (result: {
          codeResult?: { code?: string | null };
        }) => {
          const barcode = result.codeResult?.code;

          if (!barcode || hasDetectedRef.current) return;

          hasDetectedRef.current = true;
          Quagga.stop();
          onDetected(barcode);
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
                readers: [
                  "ean_reader",
                  "ean_8_reader",
                  "upc_reader",
                  "upc_e_reader",
                ],
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

        if (stopped) {
          Quagga.stop();
          return;
        }

        Quagga.onDetected(handleDetected);
        cleanupDetected = () => Quagga.offDetected(handleDetected);
        Quagga.start();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to start the barcode scanner.",
        );
      }
    }

    void startScanner();

    return () => {
      stopped = true;
      cleanupDetected?.();
      void import("@ericblade/quagga2").then(({ default: Quagga }) => {
        Quagga.stop();
      });
    };
  }, [onDetected]);

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
