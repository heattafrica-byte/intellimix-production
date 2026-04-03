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

  const handleGoogleSignup = () => {
    setIsLoading(true);
    // Redirect to Firebase OAuth endpoint with plan parameter if provided
    const oauthUrl = new URL(window.location.origin + "/api/oauth/callback");
    oauthUrl.searchParams.set("provider", "google");
    if (plan) {
      oauthUrl.searchParams.set("plan", plan.toLowerCase());
    }
    window.location.href = oauthUrl.toString();
  };

  const handleGitHubSignup = () => {
    setIsLoading(true);
    // Redirect to Firebase OAuth endpoint with plan parameter if provided
    const oauthUrl = new URL(window.location.origin + "/api/oauth/callback");
    oauthUrl.searchParams.set("provider", "github");
    if (plan) {
      oauthUrl.searchParams.set("plan", plan.toLowerCase());
    }
    window.location.href = oauthUrl.toString();
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
