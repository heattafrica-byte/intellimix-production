import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Chrome, Github, Mail } from "lucide-react";
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [useEmail, setUseEmail] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      
      console.log("[LoginDialog] Got Firebase token, sending to backend...");
      
      // Send token to backend
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("[LoginDialog] Login successful:", data);
        setEmail("");
        setPassword("");
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } else {
        console.error("[LoginDialog] Backend error:", data);
        toast.error(data.details || data.error || "Sign in failed");
      }
    } catch (error: any) {
      console.error("[LoginDialog] Email sign-in failed:", error);
      toast.error(error.message || "Email sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      console.log("[LoginDialog] Got Google token, sending to backend...");
      
      // Send token to backend
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("[LoginDialog] Google login successful:", data);
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } else {
        console.error("[LoginDialog] Backend error:", data);
        toast.error(data.details || data.error || "Sign in failed");
      }
    } catch (error: any) {
      console.error("[LoginDialog] Google sign-in failed:", error);
      toast.error(error.message || "Google sign-in failed");
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
      
      console.log("[LoginDialog] Got GitHub token, sending to backend...");
      
      // Send token to backend
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("[LoginDialog] GitHub login successful:", data);
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } else {
        console.error("[LoginDialog] Backend error:", data);
        toast.error(data.details || data.error || "Sign in failed");
      }
    } catch (error: any) {
      console.error("[LoginDialog] GitHub sign-in failed:", error);
      toast.error(error.message || "GitHub sign-in failed");
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
            {useEmail ? "Sign in with your email and password" : "Use your Google or GitHub account"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {useEmail ? (
            <>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <Button
                onClick={handleEmailLogin}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Mail size={18} />
                Sign in with Email
              </Button>
              <Button
                onClick={() => {
                  setUseEmail(false);
                  setEmail("");
                  setPassword("");
                }}
                disabled={isLoading}
                variant="outline"
                className="w-full text-xs"
              >
                Use OAuth instead
              </Button>
            </>
          ) : (
            <>
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

              <Button
                onClick={() => setUseEmail(true)}
                disabled={isLoading}
                variant="outline"
                className="w-full text-xs"
              >
                Sign in with Email
              </Button>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            Your account is secured by Firebase Authentication.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
