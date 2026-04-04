import { useState, useEffect } from "react";
import { CreditCard, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RAZORPAY_KEY_ID = "rzp_live_SZIYgnAQN4Bg5n";
const AMOUNT = 39; // INR

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handlePay = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast({ title: "Error", description: "Failed to load Razorpay SDK", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: AMOUNT, currency: "INR" },
      });

      if (error || !data?.order_id) {
        toast({ title: "Error", description: "Could not create payment order", variant: "destructive" });
        return;
      }

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "SASKA",
        description: "Service Payment",
        order_id: data.order_id,
        handler: () => {
          toast({ title: "Payment Successful", description: "Thank you for your payment!" });
          setOpen(false);
        },
        prefill: { name: "", email: "", contact: "" },
        theme: { color: "#2D5A3D" },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast({
          title: "Payment Failed",
          description: resp.error?.description || "Something went wrong",
          variant: "destructive",
        });
      });
      rzp.open();
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open payment"
      >
        <CreditCard className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed bottom-[90px] right-5 z-[999] flex w-[400px] max-w-[90vw] animate-in slide-in-from-bottom-4 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Payment Gateway</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Pay with Razorpay</h2>
            <p className="text-center text-sm text-muted-foreground">
              Secure payment via UPI, Cards, Net Banking & more
            </p>

            <div className="w-full rounded-lg bg-muted/50 p-3 text-sm text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">₹{AMOUNT}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "💳"}{" "}
              {loading ? "Processing..." : `Pay ₹${AMOUNT}`}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Payments are processed securely via Razorpay. By proceeding you agree to the terms of service.
            </p>
          </div>

          <div className="border-t border-border bg-muted/30 py-2 text-center">
            <span className="text-[10px] text-muted-foreground">Powered by SASKA × Razorpay</span>
          </div>
        </div>
      )}
    </>
  );
}
