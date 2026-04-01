import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function PricingPage() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  
  const { data: plans } = trpc.payment.getPlans.useQuery();
  const { data: subscription } = trpc.payment.getSubscription.useQuery();
  const createCheckoutSession = trpc.payment.createCheckoutSession.useMutation();

  const handleUpgrade = async (planKey: string) => {
    setLoading(planKey);
    try {
      const result = await createCheckoutSession.mutateAsync({
        planKey: planKey as "basic" | "pro" | "enterprise",
        successUrl: `${window.location.origin}/dashboard?upgrade=success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (error) {
      toast.error("Failed to upgrade plan");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600">
            Choose the plan that fits your needs
          </p>
        </div>

        {/* Current Subscription Info */}
        {subscription && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Current Plan: <span className="font-bold capitalize">{subscription.plan}</span>
              {subscription.cancelAtPeriodEnd && (
                <span className="ml-2 text-red-600">
                  (Canceling on {new Date(subscription.currentPeriodEnd).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans?.map((plan: any, index: number) => (
            <Card
              key={plan.key}
              className={`flex flex-col ${
                index === 1 ? "ring-2 ring-blue-500 relative" : ""
              }`}
            >
              {index === 1 && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-slate-900 mt-2">
                  ${plan.price}
                  <span className="text-lg font-normal text-slate-600">/month</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="space-y-4">
                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={loading === plan.key}
                    className="w-full mt-6"
                    variant={subscription?.plan === plan.key ? "outline" : "default"}
                  >
                    {loading === plan.key ? "Loading..." :
                     subscription?.plan === plan.key ? "Current Plan" :
                     "Upgrade Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto text-left">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm">
                  Absolutely. Cancel your subscription anytime from your account settings. No questions asked.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm">
                  We offer a 7-day money-back guarantee if you're not satisfied with your subscription.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need more credits?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm">
                  Contact our support team for enterprise custom plans and volume discounts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
