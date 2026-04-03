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
      
      // Send token to backend with plan
      const response = await fetch("/api/oauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          idToken,
          plan: plan?.toLowerCase(),
        }),
      });
      
      if (response.ok) {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        onOpenChange(false);
        onSignupSuccess?.();
        toast.success("Account created successfully");
      } else {
        toast.error("Sign up failed");
      }
    } catch (error: any) {
      console.error("Email sign-up failed:", error);
      toast.error(error.message || "Email sign-up failed");
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
