import { useState } from "react";
import { CreditCard, X } from "lucide-react";

const UPI_ID = "muhammed.39@superyes";
const PAYEE_NAME = "Muhammed Adnan";
const AMOUNT = 39;
const UPI_LINK = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR`;
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(UPI_LINK)}`;

export default function PaymentWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open payment"
      >
        <CreditCard className="h-6 w-6" />
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed bottom-[90px] right-5 z-[999] flex w-[400px] max-w-[90vw] animate-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Payment Gateway</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center gap-3 p-5">
            <h2 className="text-lg font-semibold text-foreground">Pay with UPI</h2>
            <img
              src={QR_URL}
              alt="UPI QR Code"
              className="h-[200px] w-[200px] rounded-lg border-2 border-muted"
              loading="lazy"
              width={200}
              height={200}
            />
            <p className="text-xs text-muted-foreground">Scan with any UPI app</p>

            <div className="w-full space-y-1 text-sm text-foreground">
              <p>UPI ID: <span className="font-medium">{UPI_ID}</span></p>
              <p>Payee: <span className="font-medium">{PAYEE_NAME}</span></p>
              <p>Amount: <span className="font-medium">₹{AMOUNT}</span></p>
            </div>

            <a
              href={UPI_LINK}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              💳 Pay ₹{AMOUNT} via UPI
            </a>

            <p className="text-center text-[11px] text-muted-foreground">
              Payments are processed securely via UPI. By proceeding you agree to the terms of service.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 py-2 text-center">
            <span className="text-[10px] text-muted-foreground">Powered by SASKA</span>
          </div>
        </div>
      )}
    </>
  );
}
