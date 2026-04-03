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

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Send token to backend
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      if (response.ok) {
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } else {
        toast.error("Sign in failed");
      }
    } catch (error) {
      console.error("Google sign-in failed:", error);
      toast.error("Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Send token to backend
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      if (response.ok) {
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } else {
        toast.error("Sign in failed");
      }
    } catch (error) {
      console.error("GitHub sign-in failed:", error);
      toast.error("GitHub sign-in failed");
    } finally {
      setIsLoading(false);
    }
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
