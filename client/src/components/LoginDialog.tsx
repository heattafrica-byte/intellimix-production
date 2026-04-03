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

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export function LoginDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Redirect to Firebase OAuth endpoint
    const oauthUrl = new URL(window.location.origin + "/api/oauth/callback");
    oauthUrl.searchParams.set("provider", "google");
    window.location.href = oauthUrl.toString();
  };

  const handleGitHubLogin = () => {
    setIsLoading(true);
    // Redirect to Firebase OAuth endpoint
    const oauthUrl = new URL(window.location.origin + "/api/oauth/callback");
    oauthUrl.searchParams.set("provider", "github");
    window.location.href = oauthUrl.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In to Intellimix</DialogTitle>
          <DialogDescription>
            Use your Google or GitHub account to sign in securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            <Chrome size={18} />
            Sign in with Google
          </Button>

          <Button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            <Github size={18} />
            Sign in with GitHub
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Your account is secured by Firebase Authentication.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
