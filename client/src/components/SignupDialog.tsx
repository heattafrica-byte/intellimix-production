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
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeFirebase } from "@/_core/firebase";
import { authTokenManager } from "@/_core/authTokenManager";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [useEmail, setUseEmail] = useState(false);

  const handleEmailSignup = async () => {
    if (!email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      
      console.log("[SignupDialog] Got Firebase token, sending to backend...");
      
      // Create session using token manager with plan
      try {
        await authTokenManager.createSession(idToken, plan);
        
        console.log("[SignupDialog] Email signup successful");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        onOpenChange(false);
        onSignupSuccess?.();
        toast.success("Account created successfully");
      } catch (sessionError: any) {
        console.error("[SignupDialog] Failed to create session:", sessionError);
        toast.error(sessionError.message || "Failed to create session");
      }
    } catch (error: any) {
      console.error("[SignupDialog] Email sign-up failed:", error);
      
      // Handle specific Firebase errors
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already in use. Please sign in instead.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password is too weak. Use at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email format");
      } else {
        toast.error(error.message || "Email sign-up failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      const app = await initializeFirebase();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      console.log("[SignupDialog] Got Google token, sending to backend...");
      
      // Create session using token manager with plan
      try {
        await authTokenManager.createSession(idToken, plan);
        
        console.log("[SignupDialog] Google signup successful");
        onOpenChange(false);
        onSignupSuccess?.();
        toast.success("Account created successfully");
      } catch (sessionError: any) {
        console.error("[SignupDialog] Failed to create session:", sessionError);
        toast.error(sessionError.message || "Failed to create session");
      }
    } catch (error: any) {
      console.error("[SignupDialog] Google sign-up failed:", error);
      
      // Ignore user cancellation
      if (error.code === "auth/popup-closed-by-user") {
        console.log("[SignupDialog] User closed the popup");
        return;
      }
      
      // Ignore COOP errors - they're non-fatal
      if (error.message?.includes("COOP") || error.message?.includes("Cross-Origin")) {
        console.log("[SignupDialog] COOP error (non-fatal):", error.message);
        return;
      }
      
      toast.error(error.message || "Google sign-up failed");
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
      
      console.log("[SignupDialog] Got GitHub token, sending to backend...");
      
      // Create session using token manager with plan
      try {
        await authTokenManager.createSession(idToken, plan);
        
        console.log("[SignupDialog] GitHub signup successful");
        onOpenChange(false);
        onSignupSuccess?.();
        toast.success("Account created successfully");
      } catch (sessionError: any) {
        console.error("[SignupDialog] Failed to create session:", sessionError);
        toast.error(sessionError.message || "Failed to create session");
      }
    } catch (error: any) {
      console.error("[SignupDialog] GitHub sign-up failed:", error);
      
      // Ignore user cancellation
      if (error.code === "auth/popup-closed-by-user") {
        console.log("[SignupDialog] User closed the popup");
        return;
      }
      
      // Ignore COOP errors - they're non-fatal
      if (error.message?.includes("COOP") || error.message?.includes("Cross-Origin")) {
        console.log("[SignupDialog] COOP error (non-fatal):", error.message);
        return;
      }
      
      toast.error(error.message || "GitHub sign-up failed");
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
            {useEmail 
              ? "Sign up with your email" 
              : "Sign up with Google or GitHub to get started with AI-powered audio mixing."}
            {plan && ` You'll be subscribing to ${plan} plan.`}
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
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
              <Button
                onClick={handleEmailSignup}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Mail size={18} />
                Create Account
              </Button>
              <Button
                onClick={() => {
                  setUseEmail(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
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

              <Button
                onClick={() => setUseEmail(true)}
                disabled={isLoading}
                variant="outline"
                className="w-full text-xs"
              >
                Sign up with Email
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
