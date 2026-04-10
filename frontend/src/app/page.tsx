// frontend/src/app/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";
import {
  Zap,
  Brain,
  Send,
  Workflow,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle2,
  Github,
  ChevronDown,
  Linkedin,
  Mail,
  Star,
  Sparkles,
  Layers,
  Activity,
  GitFork,
  Users,
  ExternalLink,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const handleUpgradePro = () => {
    if (isAuthenticated) {
      router.push("/settings");
    } else {
      router.push("/login");
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #f8f6ff 0%, #eef2ff 50%, #f0f4ff 100%)",
        }}
      >
        <svg
          className="animate-spin h-8 w-8"
          style={{ color: "#7c3aed" }}
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #141222 0%, #1a1535 20%, #161330 40%, #141028 60%, #110e22 80%, #0e0c1a 100%)",
        color: "#e8e8f0",
      }}
    >
      {/* Animated background */}
      <AnimatedBackground />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(15, 23, 42, 0.1)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            {/* Logo — replace /logo.png with your actual logo path */}
            <Image
              src="/logo.png"
              alt="SynthFlow"
              width={36}
              height={36}
              className="rounded-xl"
              onError={(e) => {
                // Fallback to icon if logo doesn't exist
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
            <div
              className="hidden flex items-center justify-center w-9 h-9 rounded-xl"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              }}
            >
              <Zap size={18} color="white" />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: "#1a1a2e" }}
            >
              SynthFlow
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing", "Use Cases"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-sm font-medium transition-colors"
                  style={{ color: "#1f2937" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#4f46e5")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#1f2937")
                  }
                >
                  {item}
                </a>
              ),
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/NishchithRao-hub/synthflow"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors"
              style={{ color: "#1f2937" }}
            >
              <Github size={20} />
            </a>
            <button
              onClick={handleGetStarted}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                color: "white",
                boxShadow: "0 2px 10px rgba(124, 58, 237, 0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(124, 58, 237, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 10px rgba(124, 58, 237, 0.25)";
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Open Source Banner */}
      <div className="pt-[72px]">
        <div
          className="text-center py-2.5"
          style={{
            background:
              "linear-gradient(90deg, rgba(124,58,237,0.08), rgba(99,102,241,0.1), rgba(124,58,237,0.08))",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#22c55e" }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "#7c3aed" }}
              >
                Open Source
              </span>
            </div>
            <span className="text-xs" style={{ color: "#64648a" }}>
              ·
            </span>
            <a
              href="https://github.com/NishchithRao-hub/synthflow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "#9090a8" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9090a8")}
            >
              <GitFork size={12} />
              Fork on GitHub
              <ExternalLink size={10} />
            </a>
            <span className="text-xs" style={{ color: "#6b6b80" }}>
              ·
            </span>
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "#9090a8" }}
            >
              <Users size={12} />
              Contributions welcome
            </span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.12)",
            }}
          >
            <Sparkles size={14} style={{ color: "#7c3aed" }} />
            <span className="text-sm font-medium" style={{ color: "#7c3aed" }}>
              AI-Powered Workflow Automation
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl font-extrabold leading-[1.08] mb-8 tracking-tight"
            style={{ color: "#e8e8f0" }}
          >
            Build Intelligent
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed, #6366f1, #3b82f6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Automation AI Pipelines
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: "#9090a8" }}
          >
            Design visual workflows that connect triggers, AI reasoning and
            external APIs into powerful automation pipelines. Execute with
            confidence and monitor in real-time.
          </p>

          <div className="flex items-center justify-center gap-4 mb-20">
            <button
              onClick={handleGetStarted}
              className="group px-8 py-3.5 rounded-xl text-base font-semibold transition-all flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                color: "white",
                boxShadow: "0 4px 20px rgba(124, 58, 237, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 30px rgba(124, 58, 237, 0.45)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 20px rgba(124, 58, 237, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Start Building Free
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-8 py-3.5 rounded-xl text-base font-semibold transition-all flex items-center gap-2"
              style={{
                background: "rgba(124,58,237,0.14)",
                border: "1px solid rgba(167,139,250,0.35)",
                color: "#e1e6ff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(124,58,237,0.22)";
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(124,58,237,0.14)";
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.35)";
              }}
            >
              Explore Features
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Hero workflow visual */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1), rgba(96,165,250,0.15))",
                filter: "blur(40px)",
                transform: "scale(1.1)",
              }}
            />
            <div
              className="relative rounded-2xl border overflow-hidden"
              style={{
                background: "rgba(20, 16, 36, 0.8)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3.5 border-b"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#ef4444" }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#eab308" }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <span
                  className="text-xs ml-3 font-medium"
                  style={{ color: "#6b6b80" }}
                >
                  SynthFlow — Workflow Editor
                </span>
              </div>
              <div className="p-10 flex items-center justify-center gap-4 md:gap-8">
                <HeroNode
                  type="trigger"
                  label="Webhook"
                  sublabel="Receive Event"
                  color="#3b82f6"
                />
                <HeroArrow />
                <HeroNode
                  type="ai"
                  label="AI Classify"
                  sublabel="Analyze & Sort"
                  color="#8b5cf6"
                />
                <HeroArrow />
                <HeroNode
                  type="action"
                  label="Send Alert"
                  sublabel="Notify Team"
                  color="#22c55e"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            badge="Features"
            title="Everything You Need"
            subtitle="A complete platform for building, executing and monitoring intelligent automation workflows"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Workflow}
              title="Visual Workflow Builder"
              description="Drag-and-drop canvas for designing workflows as directed acyclic graphs. Connect triggers, AI nodes and actions visually."
              color="#3b82f6"
            />
            <FeatureCard
              icon={Brain}
              title="AI-Powered Nodes"
              description="Classify, summarize, extract and transform data using LLMs. Supports Ollama (local) and OpenAI (BYOK) models."
              color="#7c3aed"
            />
            <FeatureCard
              icon={Globe}
              title="Webhook Triggers"
              description="Receive events from any external service via HTTP webhooks. Rate-limited and secure with concurrency policies."
              color="#22c55e"
            />
            <FeatureCard
              icon={Send}
              title="HTTP Actions"
              description="Call any REST API as part of your workflow. Configurable methods, headers and body templates with template variables."
              color="#f97316"
            />
            <FeatureCard
              icon={Activity}
              title="Real-Time Monitoring"
              description="Watch workflows execute live via WebSocket. See node-by-node progress, durations, and outputs in real time."
              color="#06b6d4"
            />
            <FeatureCard
              icon={Shield}
              title="Production Reliability"
              description="Exponential backoff retries, per-node timeouts, idempotency headers and automatic dead run recovery."
              color="#ef4444"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(124,58,237,0.03) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-4xl mx-auto relative z-10">
          <SectionHeader
            badge="Process"
            title="How It Works"
            subtitle="Three simple steps to automate any workflow"
          />
          <div className="space-y-6">
            <ProcessStep
              number={1}
              title="Design Your Workflow"
              description="Use the visual drag-and-drop builder to create a pipeline. Add trigger nodes to start the flow, AI nodes for intelligent processing and action nodes to interact with external services."
              gradient="linear-gradient(135deg, #3b82f6, #6366f1)"
            />
            <ProcessStep
              number={2}
              title="Configure & Connect"
              description="Set up each node with specific configurations - prompt templates for AI, API endpoints for actions or webhook URLs for triggers. Connect nodes with edges to define the data flow between steps."
              gradient="linear-gradient(135deg, #7c3aed, #a78bfa)"
            />
            <ProcessStep
              number={3}
              title="Execute & Monitor"
              description="Trigger your workflow manually, via webhook or on a schedule. Watch execution progress in real-time with WebSocket streaming, inspect node outputs and review detailed logs."
              gradient="linear-gradient(135deg, #22c55e, #06b6d4)"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <SectionHeader
            badge="Pricing"
            title="Simple, Transparent Pricing"
            subtitle="Start free, upgrade when you need more"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div
              className="rounded-2xl border p-8 transition-all duration-300 hover:translate-y-[-4px]"
              style={{
                background: "rgba(255,255,255,0.92)",
                borderColor: "rgba(15,23,42,0.1)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              }}
            >
              <div className="mb-6">
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#64648a" }}
                >
                  Free
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-5xl font-extrabold"
                    style={{ color: "#1a1a2e" }}
                  >
                    $0
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#9898b0" }}
                  >
                    /month
                  </span>
                </div>
                <p className="text-sm mt-2" style={{ color: "#9898b0" }}>
                  Perfect for getting started
                </p>
              </div>
              <div className="space-y-3.5 mb-8">
                <PricingFeature text="5 workflows" />
                <PricingFeature text="50 runs per month" />
                <PricingFeature text="30 AI node calls per month" />
                <PricingFeature text="7-day run history" />
                <PricingFeature text="Webhook triggers" />
                <PricingFeature text="Community support" />
              </div>
              <button
                onClick={handleGetStarted}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "rgba(124,58,237,0.04)",
                  border: "1px solid rgba(124,58,237,0.15)",
                  color: "#4a4a6a",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(124,58,237,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(124,58,237,0.04)";
                }}
              >
                Get Started Free
              </button>
            </div>

            {/* Pro */}
            <div
              className="rounded-2xl border p-8 relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(241,245,255,0.95))",
                borderColor: "rgba(79,70,229,0.25)",
                boxShadow: "0 8px 28px rgba(15,23,42,0.1)",
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background:
                    "linear-gradient(90deg, #7c3aed, #6366f1, #3b82f6)",
                }}
              />
              <div className="absolute top-5 right-5">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                    color: "white",
                  }}
                >
                  Popular
                </span>
              </div>
              <div className="mb-6">
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#7c3aed" }}
                >
                  Pro
                </p>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-5xl font-extrabold"
                    style={{ color: "#1a1a2e" }}
                  >
                    $10
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#9898b0" }}
                  >
                    /month
                  </span>
                </div>
                <p className="text-sm mt-2" style={{ color: "#9898b0" }}>
                  For serious automation
                </p>
              </div>
              <div className="space-y-3.5 mb-8">
                <PricingFeature text="Unlimited workflows" highlighted />
                <PricingFeature text="5,000 runs per month" highlighted />
                <PricingFeature
                  text="2,000 AI node calls per month"
                  highlighted
                />
                <PricingFeature text="90-day run history" highlighted />
                <PricingFeature text="Webhook triggers" highlighted />
                <PricingFeature text="Priority support" highlighted />
              </div>
              <button
                onClick={handleUpgradePro}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "white",
                  boxShadow: "0 2px 15px rgba(124,58,237,0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 25px rgba(124,58,237,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 2px 15px rgba(124,58,237,0.25)";
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            badge="Technology"
            title="Built with Modern Tech"
            subtitle="Production-grade architecture using industry-standard tools"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <TechCard
              name="FastAPI"
              category="Backend API"
              icon="⚡"
              color="#009688"
            />
            <TechCard
              name="Next.js"
              category="Frontend"
              icon="▲"
              color="#000000"
            />
            <TechCard
              name="PostgreSQL"
              category="Database"
              icon="🐘"
              color="#336791"
            />
            <TechCard
              name="Redis"
              category="Cache & Queue"
              icon="🔴"
              color="#dc382d"
            />
            <TechCard
              name="Celery"
              category="Task Workers"
              icon="🌿"
              color="#37b24d"
            />
            <TechCard
              name="React Flow"
              category="Visual Canvas"
              icon="🔀"
              color="#ff0072"
            />
            <TechCard
              name="Stripe"
              category="Payments"
              icon="💳"
              color="#6772e5"
            />
            <TechCard
              name="AWS"
              category="Cloud Infra"
              icon="☁️"
              color="#ff9900"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-24 px-6 relative">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(59,130,246,0.03) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <SectionHeader
            badge="Use Cases"
            title="Real-World Automation"
            subtitle="See what you can build with SynthFlow"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UseCaseCard
              icon={Layers}
              title="Support Ticket Triage"
              description="Automatically classify incoming tickets by category and priority using AI, then route notifications to the right team."
              tags={["Webhook", "AI Classify", "HTTP Action"]}
              color="#3b82f6"
            />
            <UseCaseCard
              icon={Sparkles}
              title="Content Summarization"
              description="Summarize long documents into key points and distribute summaries to stakeholders via API integrations."
              tags={["Manual", "AI Summarize", "HTTP Action"]}
              color="#7c3aed"
            />
            <UseCaseCard
              icon={Activity}
              title="Data Monitoring & Alerts"
              description="Fetch data from APIs periodically, analyze trends with AI and send alerts when anomalies are detected."
              tags={["Schedule", "HTTP GET", "AI Analyze"]}
              color="#22c55e"
            />
            <UseCaseCard
              icon={Star}
              title="Lead Qualification"
              description="Score incoming leads based on form data using AI, create CRM records and notify the sales team instantly."
              tags={["Webhook", "AI Extract", "HTTP Action"]}
              color="#f97316"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative inline-block mb-8">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                filter: "blur(25px)",
                opacity: 0.25,
              }}
            />
            <Image
              src="/logo.png"
              alt="SynthFlow"
              width={80}
              height={80}
              className="relative rounded-2xl"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <h2 className="text-4xl font-bold mb-5" style={{ color: "#f3f4ff" }}>
            Ready to Automate?
          </h2>
          <p className="text-lg mb-10" style={{ color: "#b5bad6" }}>
            Start building AI-powered workflows in minutes.
            <br />
            Free tier includes 5 workflows and 50 runs per month.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-10 py-4 rounded-xl text-lg font-semibold transition-all inline-flex items-center gap-2"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              color: "white",
              boxShadow: "0 4px 30px rgba(124, 58, 237, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 8px 40px rgba(124, 58, 237, 0.45)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 30px rgba(124, 58, 237, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Get Started Free
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Logo */}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2.5"
            >
              <Image
                src="/logo.png"
                alt="SynthFlow"
                width={28}
                height={28}
                className="rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="text-sm font-bold" style={{ color: "#e0e0f0" }}>
                SynthFlow
              </span>
            </a>

            {/* Center: Developer info */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium" style={{ color: "#a0a0b8" }}>
                Designed & Developed by{" "}
                <span className="font-semibold" style={{ color: "#e0e0f0" }}>
                  Nishchith
                </span>
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="mailto:nishchithraopr@gmail.com"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: "#6b6b80" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#a78bfa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#6b6b80")
                  }
                >
                  <Mail size={13} />
                  nishchithraopr@gmail.com
                </a>
                <a
                  href="https://www.linkedin.com/in/nishchith-rao-p-r/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: "#6b6b80" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#a78bfa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#6b6b80")
                  }
                >
                  <Linkedin size={13} />
                  LinkedIn
                </a>
              </div>
              <p className="text-xs mt-1" style={{ color: "#4a4a5a" }}>
                &copy; {new Date().getFullYear()} SynthFlow. All rights
                reserved.
              </p>
            </div>

            {/* Right: Links */}
            <div className="flex items-center gap-5">
              <a
                href="https://github.com/NishchithRao-hub/synthflow"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: "#6b6b80" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b80")}
              >
                <Github size={13} />
                GitHub
              </a>
              <a
                href="#features"
                className="text-xs font-medium transition-colors"
                style={{ color: "#6b6b80" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b80")}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-xs font-medium transition-colors"
                style={{ color: "#6b6b80" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6b80")}
              >
                Pricing
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===== Sub-components =====

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Floating gradient orbs */}
      <div
        className="absolute top-[-15%] left-[-8%] w-[550px] h-[550px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.08), transparent 65%)",
          animation: "orbit1 30s linear infinite",
        }}
      />
      <div
        className="absolute top-[25%] right-[-12%] w-[450px] h-[450px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.06), transparent 65%)",
          animation: "orbit2 35s linear infinite",
        }}
      />
      <div
        className="absolute bottom-[-5%] left-[25%] w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.07), transparent 65%)",
          animation: "orbit3 28s linear infinite",
        }}
      />
      <div
        className="absolute top-[60%] right-[20%] w-[300px] h-[300px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.05), transparent 65%)",
          animation: "orbit4 22s linear infinite",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(139,92,246,0.07) 1px, transparent 1px)",
          backgroundSize: "45px 45px",
        }}
      />

      {/* Moving particles */}
      <div
        className="absolute w-1.5 h-1.5 rounded-full"
        style={{
          background: "rgba(139,92,246,0.3)",
          top: "20%",
          left: "10%",
          animation: "particle1 15s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: "rgba(99,102,241,0.25)",
          top: "50%",
          left: "80%",
          animation: "particle2 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-1.5 h-1.5 rounded-full"
        style={{
          background: "rgba(59,130,246,0.2)",
          top: "70%",
          left: "30%",
          animation: "particle3 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: "rgba(139,92,246,0.2)",
          top: "35%",
          left: "60%",
          animation: "particle4 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: "rgba(99,102,241,0.3)",
          top: "85%",
          left: "55%",
          animation: "particle5 14s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes orbit1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(40px, -30px) rotate(90deg); }
          50% { transform: translate(-20px, 40px) rotate(180deg); }
          75% { transform: translate(30px, 20px) rotate(270deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes orbit2 {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-35px, 25px) rotate(90deg); }
          50% { transform: translate(25px, -35px) rotate(180deg); }
          75% { transform: translate(-20px, -15px) rotate(270deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes orbit3 {
          0% { transform: translate(0, 0); }
          33% { transform: translate(30px, 25px); }
          66% { transform: translate(-25px, -20px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes orbit4 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.15); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes particle1 {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          25% { transform: translate(100px, -50px); opacity: 0.6; }
          50% { transform: translate(200px, 30px); opacity: 0.2; }
          75% { transform: translate(80px, 60px); opacity: 0.5; }
        }
        @keyframes particle2 {
          0%, 100% { transform: translate(0, 0); opacity: 0.25; }
          25% { transform: translate(-80px, 40px); opacity: 0.5; }
          50% { transform: translate(-150px, -30px); opacity: 0.15; }
          75% { transform: translate(-60px, -60px); opacity: 0.4; }
        }
        @keyframes particle3 {
          0%, 100% { transform: translate(0, 0); opacity: 0.2; }
          33% { transform: translate(60px, -80px); opacity: 0.5; }
          66% { transform: translate(120px, 20px); opacity: 0.15; }
        }
        @keyframes particle4 {
          0%, 100% { transform: translate(0, 0); opacity: 0.2; }
          50% { transform: translate(-70px, 50px); opacity: 0.45; }
        }
        @keyframes particle5 {
          0%, 100% { transform: translate(0, 0); opacity: 0.3; }
          33% { transform: translate(50px, -40px); opacity: 0.15; }
          66% { transform: translate(-40px, 30px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-16">
      <div
        className="inline-flex items-center px-4 py-1.5 rounded-full mb-5"
        style={{
          background: "rgba(124,58,237,0.14)",
          border: "1px solid rgba(167,139,250,0.35)",
        }}
      >
        <span
          className="text-xs font-bold tracking-wider uppercase"
          style={{ color: "#c4b5fd" }}
        >
          {badge}
        </span>
      </div>
      <h2
        className="text-3xl md:text-4xl font-bold mb-4"
        style={{ color: "#eceffd" }}
      >
        {title}
      </h2>
      <p className="text-base max-w-xl mx-auto" style={{ color: "#b1b7d8" }}>
        {subtitle}
      </p>
    </div>
  );
}

function HeroNode({
  type,
  label,
  sublabel,
  color,
}: {
  type: string;
  label: string;
  sublabel: string;
  color: string;
}) {
  const icons = { trigger: Zap, ai: Brain, action: Send };
  const Icon = icons[type as keyof typeof icons] || Zap;
  return (
    <div
      className="rounded-xl border px-5 py-4 min-w-[130px] md:min-w-[160px] transition-all duration-300 hover:scale-105 hover:shadow-lg"
      style={{
        background: "rgba(255,255,255,0.94)",
        borderColor: `${color}35`,
        boxShadow: `0 6px 18px ${color}15`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}12` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {type}
        </span>
      </div>
      <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>
        {label}
      </p>
      <p className="text-xs" style={{ color: "#9898b0" }}>
        {sublabel}
      </p>
    </div>
  );
}

function HeroArrow() {
  return (
    <div className="flex items-center">
      <svg
        width="56"
        height="14"
        viewBox="0 0 56 14"
        fill="none"
        className="hidden md:block"
      >
        <line
          x1="0"
          y1="7"
          x2="44"
          y2="7"
          stroke="#60a5fa"
          strokeWidth="5"
          strokeOpacity="0.3"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="7"
          x2="44"
          y2="7"
          stroke="#dbeafe"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <polygon points="44,2 56,7 44,12" fill="#e2e8f0" opacity="1" />
      </svg>
      <svg
        width="30"
        height="14"
        viewBox="0 0 30 14"
        fill="none"
        className="block md:hidden"
      >
        <line
          x1="0"
          y1="7"
          x2="22"
          y2="7"
          stroke="#60a5fa"
          strokeWidth="5"
          strokeOpacity="0.28"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="7"
          x2="22"
          y2="7"
          stroke="#dbeafe"
          strokeWidth="3"
          strokeOpacity="1"
          strokeLinecap="round"
        />
        <polygon points="22,2 30,7 22,12" fill="#e2e8f0" opacity="1" />
      </svg>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: typeof Workflow;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="group rounded-2xl border p-7 transition-all duration-300 hover:translate-y-[-4px]"
      style={{
        background: "rgba(255,255,255,0.9)",
        borderColor: "rgba(15,23,42,0.08)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}30`;
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)";
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}10` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: "#1a1a2e" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
        {description}
      </p>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
  gradient,
}: {
  number: number;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="flex gap-6 items-start group">
      <div className="flex flex-col items-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold transition-transform duration-300 group-hover:scale-110"
          style={{
            background: gradient,
            color: "white",
            boxShadow: "0 4px 15px rgba(124,58,237,0.15)",
          }}
        >
          {number}
        </div>
        {number < 3 && (
          <div
            className="w-[2px] h-12 mt-2"
            style={{
              background:
                "linear-gradient(180deg, rgba(124,58,237,0.15), transparent)",
            }}
          />
        )}
      </div>
      <div className="pt-1.5 pb-4">
        <h3 className="text-xl font-semibold mb-2" style={{ color: "#eceffd" }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#aeb4d3" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function PricingFeature({
  text,
  highlighted,
}: {
  text: string;
  highlighted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <CheckCircle2
        size={16}
        style={{ color: highlighted ? "#7c3aed" : "#c0c0d0" }}
      />
      <span
        className="text-sm"
        style={{ color: highlighted ? "#1a1a2e" : "#64648a" }}
      >
        {text}
      </span>
    </div>
  );
}

function TechCard({
  name,
  category,
  icon,
  color,
}: {
  name: string;
  category: string;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="group rounded-xl border p-5 text-center transition-all duration-300 hover:translate-y-[-3px]"
      style={{
        background: "rgba(255,255,255,0.9)",
        borderColor: "rgba(15,23,42,0.08)",
        boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}30`;
        e.currentTarget.style.boxShadow = `0 10px 24px ${color}16`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,23,42,0.08)";
      }}
    >
      <div className="text-2xl mb-2 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ color: "#1a1a2e" }}>
        {name}
      </p>
      <p className="text-xs" style={{ color: "#4b5563" }}>
        {category}
      </p>
    </div>
  );
}

function UseCaseCard({
  icon: Icon,
  title,
  description,
  tags,
  color,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
  tags: string[];
  color: string;
}) {
  return (
    <div
      className="group rounded-2xl border p-7 transition-all duration-300 hover:translate-y-[-4px]"
      style={{
        background: "rgba(255,255,255,0.9)",
        borderColor: "rgba(15,23,42,0.08)",
        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}25`;
        e.currentTarget.style.boxShadow = `0 12px 30px ${color}14`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(15,23,42,0.08)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)";
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}10` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: "#1a1a2e" }}>
        {title}
      </h3>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: "#374151" }}>
        {description}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background: "rgba(124,58,237,0.04)",
              color: "#7c3aed",
              border: "1px solid rgba(124,58,237,0.1)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
