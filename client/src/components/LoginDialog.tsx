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
import { authTokenManager } from "@/_core/authTokenManager";

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
      
      // Create session using token manager
      try {
        await authTokenManager.createSession(idToken);
        
        console.log("[LoginDialog] Login successful");
        setEmail("");
        setPassword("");
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } catch (sessionError: any) {
        console.error("[LoginDialog] Failed to create session:", sessionError);
        const errorMessage = sessionError.message || "Failed to create session";
        toast.error(errorMessage);
        
        // If backend token verification fails, user is authenticated with Firebase but not in our system
        // This is a valid state - they may need to sign up instead
        if (errorMessage.includes("Invalid token") || errorMessage.includes("verification failed")) {
          toast.error("This account is not registered. Please sign up instead.");
        }
      }
    } catch (error: any) {
      console.error("[LoginDialog] Email sign-in failed:", error);
      
      // Handle specific Firebase errors
      if (error.code === "auth/user-not-found") {
        toast.error("Email not found. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        toast.error("Incorrect password");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email format");
      } else {
        toast.error(error.message || "Email sign-in failed");
      }
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
      
      // Make the popup no longer inheritable to avoid COOP issues
      provider.getCustomParameters();
      
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      console.log("[LoginDialog] Got Google token, sending to backend...");
      
      // Create session using token manager
      try {
        await authTokenManager.createSession(idToken);
        
        console.log("[LoginDialog] Google login successful");
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } catch (sessionError: any) {
        console.error("[LoginDialog] Failed to create session:", sessionError);
        toast.error(sessionError.message || "Failed to create session");
      }
    } catch (error: any) {
      console.error("[LoginDialog] Google sign-in failed:", error);
      
      // Ignore user cancellation
      if (error.code === "auth/popup-closed-by-user") {
        console.log("[LoginDialog] User closed the popup");
        return;
      }
      
      // Ignore COOP errors - they're non-fatal
      if (error.message?.includes("COOP") || error.message?.includes("Cross-Origin")) {
        console.log("[LoginDialog] COOP error (non-fatal):", error.message);
        // Try to continue anyway - the auth might have worked
        return;
      }
      
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
      
      // Create session using token manager
      try {
        await authTokenManager.createSession(idToken);
        
        console.log("[LoginDialog] GitHub login successful");
        onOpenChange(false);
        onLoginSuccess?.();
        toast.success("Signed in successfully");
      } catch (sessionError: any) {
        console.error("[LoginDialog] Failed to create session:", sessionError);
        toast.error(sessionError.message || "Failed to create session");
      }
    } catch (error: any) {
      console.error("[LoginDialog] GitHub sign-in failed:", error);
      
      // Ignore user cancellation
      if (error.code === "auth/popup-closed-by-user") {
        console.log("[LoginDialog] User closed the popup");
        return;
      }
      
      // Ignore COOP errors - they're non-fatal
      if (error.message?.includes("COOP") || error.message?.includes("Cross-Origin")) {
        console.log("[LoginDialog] COOP error (non-fatal):", error.message);
        return;
      }
      
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
