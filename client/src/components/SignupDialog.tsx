import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Chrome, Github } from "lucide-react";
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { initializeFirebase } from "@/_core/firebase";

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
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Send token to backend with plan if provided
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken,
          plan: plan?.toLowerCase(),
        }),
      });
      
      if (response.ok) {
        onOpenChange(false);
        onSignupSuccess?.();
        toast.success("Account created successfully");
      } else {
        toast.error("Sign up failed");
      }
    } catch (error) {
      console.error("Google sign-up failed:", error);
      toast.error("Google sign-up failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignup = async () => {
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Send token to backend with plan if provided
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken,
          plan: plan?.toLowerCase(),
        }),
      });
      
      if (response.ok) {
        onOpenChange(false);
        onSignupSuccess?.();
        toast.success("Account created successfully");
      } else {
        toast.error("Sign up failed");
      }
    } catch (error) {
      console.error("GitHub sign-up failed:", error);
      toast.error("GitHub sign-up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Your Intellimix Account</DialogTitle>
          <DialogDescription>
            Sign up with Google or GitHub to get started with AI-powered audio mixing.
            {plan && ` You'll be subscribing to ${plan} plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={handleGoogleSignup}
            disabled={isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            <Chrome size={18} />
            Sign up with Google
          </Button>

          <Button
            onClick={handleGitHubSignup}
            disabled={isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            <Github size={18} />
            Sign up with GitHub
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Your account is secured by Firebase Authentication.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
