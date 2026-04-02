import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, User } from "lucide-react";

interface SignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignupSuccess?: () => void;
  plan?: "Basic" | "Pro";
}

export function SignupDialog({
  open,
  onOpenChange,
  onSignupSuccess,
  plan,
}: SignupDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"signup" | "checkout">("signup");
  const [userId, setUserId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const signup = trpc.auth.signup.useMutation({
    onSuccess: (data: { id: number; email: string; name: string }) => {
      toast.success("Account created!");
      setUserId(data.id);
      
      if (plan && (plan === "Basic" || plan === "Pro")) {
        setStep("checkout");
      } else {
        utils.auth.me.invalidate();
        setEmail("");
        setName("");
        onOpenChange(false);
        onSignupSuccess?.();
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Signup failed");
    },
  });

  const createCheckout = trpc.payment.createCheckoutSession.useMutation({
    onSuccess: (data: { sessionId: string; url: string | null }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to start checkout");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === "signup") {
      if (!email || !name) {
        toast.error("Please fill in all fields");
        return;
      }
      signup.mutate({ email, name });
    } else if (step === "checkout" && userId && plan) {
      const planKey = plan.toLowerCase() as "basic" | "pro";
      const baseUrl = window.location.origin;
      createCheckout.mutate({
        planKey,
        successUrl: `${baseUrl}/studio?checkout=success`,
        cancelUrl: `${baseUrl}/?checkout=cancelled`,
      });
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          // Reset state when dialog closes
          setStep("signup");
          setUserId(null);
          setEmail("");
          setName("");
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "signup" ? "Create Your Account" : `Upgrade to ${plan}`}
          </DialogTitle>
          <DialogDescription>
            {step === "signup"
              ? "Sign up to save your projects and access premium features."
              : `Complete your purchase to unlock ${plan === "Pro" ? "500 monthly sessions, API access, and priority support." : "50 monthly sessions and priority support."}`}
          </DialogDescription>
        </DialogHeader>

        {step === "signup" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  disabled={signup.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={signup.isPending}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signup.isPending}
            >
              {signup.isPending ? "Creating..." : "Create Account"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-card border border-border/20 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{plan} Plan (monthly)</span>
                <span className="font-semibold">{plan === "Pro" ? "$99/mo" : "$29/mo"}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                7-day free trial, cancel anytime
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createCheckout.isPending}
            >
              {createCheckout.isPending ? "Processing..." : "Continue to Checkout"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep("signup");
                setEmail("");
                setName("");
                setUserId(null);
              }}
              disabled={createCheckout.isPending}
            >
              Back
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
