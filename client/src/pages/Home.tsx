import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SignupDialog } from "@/components/SignupDialog";
import { LoginDialog } from "@/components/LoginDialog";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Download,
  Music2,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const FEATURES = [
  {
    icon: <Upload size={20} className="text-primary" />,
    title: "Upload Any Format",
    desc: "WAV, MP3, AIFF, FLAC, OGG — drag and drop up to 100MB per stem.",
  },
  {
    icon: <Zap size={20} className="text-yellow-400" />,
    title: "192 kHz 32-bit Processing",
    desc: "Every stem is upsampled to studio-grade 192 kHz 32-bit floating point for pristine quality.",
  },
  {
    icon: <Brain size={20} className="text-purple-400" />,
    title: "AI Analyses Every Stem",
    desc: "Real-time spectral, dynamic and stereo analysis feeds genre-aware AI processing decisions.",
  },
  {
    icon: <Wand2 size={20} className="text-cyan-400" />,
    title: "Automated DSP Chain",
    desc: "Per-stem EQ, compression, reverb and stereo width — all tuned to your genre and loudness target.",
  },
  {
    icon: <Sparkles size={20} className="text-green-400" />,
    title: "Professional Master",
    desc: "Two-pass mastering with AI-refined master bus chain at 192 kHz 32-bit precision.",
  },
  {
    icon: <Download size={20} className="text-orange-400" />,
    title: "Download All Formats",
    desc: "Get masters in WAV, FLAC (32-bit lossless), and AIFF — both 44.1kHz and 48kHz.",
  },
];

const PLATFORMS = [
  { name: "Spotify", lufs: -14, icon: "🎵" },
  { name: "Apple Music", lufs: -16, icon: "🍎" },
  { name: "YouTube", lufs: -13, icon: "▶️" },
  { name: "Club / DJ", lufs: -9, icon: "🎧" },
  { name: "Broadcast", lufs: -23, icon: "📺" },
  { name: "CD / Download", lufs: -10, icon: "💿" },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [signupOpen, setSignupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"Basic" | "Pro" | null>(null);

  const plans = [
    {
      name: "Free",
      price: "$0",
      desc: "Perfect for trying Intellimix",
      features: ["2 free sessions/month", "192 kHz 32-bit processing", "Download WAV + FLAC", "Community support"],
    },
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      desc: "For active musicians",
      features: ["50 sessions/month", "192 kHz 32-bit processing", "All export formats", "Priority support"],
      highlighted: true,
    },
    {
      name: "Pro",
      price: "$99",
      period: "/month",
      desc: "For professionals",
      features: ["500 sessions/month", "192 kHz 32-bit processing", "All formats + stems", "Priority support", "API access"],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/20 bg-card/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Music2 size={16} className="text-primary" />
            </div>
            <span className="font-bold text-sm tracking-tight gradient-text">Intellimix</span>
          </div>
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-xs"
                  onClick={() => setSignupOpen(true)}
                >
                  Sign Up
                </Button>
                <Button
                  size="sm"
                  className="gap-2 text-xs bg-primary hover:bg-primary/90"
                  onClick={() => setLoginOpen(true)}
                >
                  Sign In
                </Button>
              </>
            )}
            {isAuthenticated && (
              <Link href="/studio">
                <Button size="sm" className="gap-2 text-xs">
                  Open Studio
                  <ArrowRight size={13} />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-bg pointer-events-none" />
        <div className="container py-24 text-center relative z-10 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary mb-6">
              <Sparkles size={12} />
              AI-Powered Mixing & Mastering
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Professional mixes,{" "}
              <span className="gradient-text">automatically.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mt-4">
              Upload your stems. Intellimix processes at 192 kHz 32-bit, applies genre-aware DSP, and delivers a
              broadcast-ready master in multiple formats — in minutes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            {isAuthenticated ? (
              <Link href="/studio">
                <Button size="lg" className="gap-2 px-8 bg-primary hover:bg-primary/90">
                  <Wand2 size={16} />
                  Open Studio
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                className="gap-2 px-8 bg-primary hover:bg-primary/90"
                onClick={() => {
                  setSelectedPlan(null);
                  setSignupOpen(true);
                }}
              >
                <Wand2 size={16} />
                Start Mixing Free
              </Button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap pt-2"
          >
            {["192 kHz 32-bit", "20 genre presets", "Multi-format download", "Broadcast-ready"].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-400" />
                  {item}
                </span>
              ),
            )}
          </motion.div>
        </div>
      </section>

      {/* Studio-Grade Processing Callout */}
      <section className="py-16 border-t border-border/10 bg-primary/5">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-primary/20 rounded-2xl p-6 space-y-3"
            >
              <div className="text-3xl font-bold gradient-text">192 kHz</div>
              <p className="text-sm text-muted-foreground">
                Every stem is upsampled to 192 kHz 32-bit floating point for studio-grade processing precision.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-cyan-500/20 rounded-2xl p-6 space-y-3"
            >
              <div className="text-3xl font-bold text-cyan-400">Dual Masters</div>
              <p className="text-sm text-muted-foreground">
                Download 44.1kHz for streaming and 48kHz for professional use — both mastered at the highest quality.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-orange-500/20 rounded-2xl p-6 space-y-3"
            >
              <div className="text-3xl font-bold text-orange-400">Any Format</div>
              <p className="text-sm text-muted-foreground">
                WAV, FLAC (32-bit lossless), and AIFF — upload and download in any format you need.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/10">
        <div className="container space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">Everything you need to release</h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              From raw stems to distribution-ready master — Intellimix handles the entire signal chain at the highest fidelity.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-card border border-border/20 rounded-2xl p-5 space-y-3 hover:border-border/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-card border border-border/30 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loudness targets */}
      <section className="py-20 border-t border-border/10 bg-card/20">
        <div className="container space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Hit every platform's loudness spec</h2>
            <p className="text-muted-foreground text-sm">
              One-click presets for all major streaming services and broadcast standards.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="bg-card border border-border/20 rounded-xl p-4 text-center space-y-2 hover:border-primary/30 transition-colors"
              >
                <span className="text-2xl">{p.icon}</span>
                <p className="text-xs font-medium">{p.name}</p>
                <p className="text-lg font-bold tabular-nums text-primary">{p.lufs}</p>
                <p className="text-[10px] text-muted-foreground">LUFS</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 border-t border-border/10">
        <div className="container space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Choose the plan that fits your workflow. All plans include full 192 kHz 32-bit processing and multi-format downloads.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-2xl relative flex flex-col ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/50 md:scale-105"
                    : "bg-card border border-border/20"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6 space-y-2 flex-1">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2 pt-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 border-t border-border/10">
                  {plan.name === "Free" ? (
                    isAuthenticated ? (
                      <Link href="/studio" className="block">
                        <Button size="lg" variant="outline" className="w-full gap-2">
                          Go to Studio
                          <ArrowRight size={14} />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setSelectedPlan(null);
                          setSignupOpen(true);
                        }}
                      >
                        Get Started Free
                        <ArrowRight size={14} />
                      </Button>
                    )
                  ) : (
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-primary hover:bg-primary/90"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Clicked plan:", plan.name);
                        setSelectedPlan(plan.name as "Basic" | "Pro");
                        setSignupOpen(true);
                      }}
                    >
                      Start Trial
                      <ArrowRight size={14} />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            All paid plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/10">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            Ready to hear your mix <span className="gradient-text">at its best?</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Upload your stems now — no credit card, no plugin installs, no DAW required. Process at 192 kHz 32-bit and download in any format.
          </p>
          {isAuthenticated ? (
            <Link href="/studio">
              <Button size="lg" className="gap-2 px-10 bg-primary hover:bg-primary/90">
                <Wand2 size={16} />
                Open Intellimix Studio
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="gap-2 px-10 bg-primary hover:bg-primary/90"
              onClick={() => {
                setSelectedPlan(null);
                setSignupOpen(true);
              }}
            >
              <Wand2 size={16} />
              Get Started Free
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-8">
        <div className="container flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Music2 size={14} className="text-primary" />
            <span className="font-semibold text-foreground">Intellimix</span>
            <span>— AI Mixing & Mastering at 192 kHz</span>
          </div>
          <span>© {new Date().getFullYear()} Intellimix. All rights reserved.</span>
        </div>
      </footer>

      <SignupDialog
        open={signupOpen}
        onOpenChange={setSignupOpen}
        plan={selectedPlan || undefined}
        onSignupSuccess={() => {
          setSelectedPlan(null);
          // Redirect to studio on successful signup
          window.location.href = "/studio";
        }}
      />

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLoginSuccess={() => {
          // Redirect to studio on successful login
          window.location.href = "/studio";
        }}
      />
    </div>
  );
}
