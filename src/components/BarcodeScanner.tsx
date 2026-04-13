import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  active: boolean;
}

export const BarcodeScanner = ({ onDetected, active }: BarcodeScannerProps) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!active || !scannerRef.current) return;

    detectedRef.current = false;
    setError(null);

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader",
            "code_128_reader",
          ],
        },
        locate: true,
        frequency: 10,
      },
      (err: any) => {
        if (err) {
          console.error("Quagga init error:", err);
          setError("Could not access camera. Please allow camera permission.");
          return;
        }
        Quagga.start();
      }
    );

    const handleDetected = (result: any) => {
      if (detectedRef.current) return;
      const code = result?.codeResult?.code;
      if (code && code.length >= 8) {
        detectedRef.current = true;
        Quagga.stop();
        onDetected(code);
      }
    };

    Quagga.onDetected(handleDetected);

    return () => {
      Quagga.offDetected(handleDetected);
      Quagga.stop();
    };
  }, [active, onDetected]);

  if (error) {
    return (
      <div className="w-full max-w-sm aspect-[4/3] rounded-2xl bg-card border border-border flex items-center justify-center p-6">
        <p className="text-destructive text-sm text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden border border-border">
      <div ref={scannerRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>canvas]:hidden" />
      {/* Scan overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
      </div>
    </div>
  );
};
