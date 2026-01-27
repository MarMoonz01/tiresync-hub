import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Shield, Users, Package, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TireLogo } from "@/components/icons/TireLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import heroImage from "@/assets/landing-hero.jpg";
export default function Landing() {
  const { t } = useLanguage();
  
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({
      behavior: "smooth"
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <TireLogo size={18} className="text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground tracking-tight">HOUSE OF AKE</span>
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <button onClick={scrollToFeatures} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("features")}
              </button>
              <a href="#network" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("network")}
              </a>
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("about")}
              </a>
              <LanguageToggle variant="compact" />
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link to="/auth?mode=login">
                  {t("member")}
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?mode=signup">
                  {t("join")}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="BAANAKE Warehouse" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto pt-14">
        <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          duration: 0.4
        }}>
            <p className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-6">
              <span>{t("stockManagement")}</span>
              <TireLogo size={14} className="text-primary" />
              <span>{t("tagline")}</span>
            </p>
          </motion.div>

          <motion.h1 initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: 0.1
        }} className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-4">
            <span className="text-foreground">BAAN
          </span>
            <span className="text-primary">AKE</span>
          </motion.h1>

          <motion.p initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: 0.15
        }} className="text-xl sm:text-2xl text-primary font-medium mb-4">
            {t("businessFirst")}
          </motion.p>

          <motion.p initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: 0.2
        }} className="text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            {t("heroDescription")}
          </motion.p>

          <motion.div initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: 0.25
        }} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth?mode=signup">
                {t("getStarted")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={scrollToFeatures}>
              {t("learnMore")}
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.button onClick={scrollToFeatures} initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.8
      }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="w-6 h-6 animate-float" />
        </motion.button>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("inventoryManagement")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              {t("inventoryDesc")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{
            icon: Package,
            title: t("inventoryManagement"),
            description: t("inventoryDesc")
          }, {
            icon: Users,
            title: t("networkSharing"),
            description: t("networkDesc")
          }, {
            icon: TrendingUp,
            title: t("salesAnalytics"),
            description: t("analyticsDesc")
          }, {
            icon: Shield,
            title: t("securePlatform"),
            description: t("secureDesc")
          }].map((feature, index) => <motion.div key={feature.title} initial={{
            opacity: 0,
            y: 16
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: index * 0.05
          }} className="p-5 rounded-2xl bg-card/60 border border-border/40 hover:border-border/60 hover:shadow-soft transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-20 px-4 bg-secondary/30">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t("readyToTransform")}
            </h2>
            <p className="text-muted-foreground mb-6 text-sm max-w-lg mx-auto">
              {t("joinNetworkCTA")}
            </p>
            <Button size="lg" asChild>
              <Link to="/auth?mode=signup">
                {t("joinBaanake")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <TireLogo size={14} className="text-primary-foreground" />
            </div>
            <span className="font-medium text-sm text-foreground">BAANAKE</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BAANAKE. {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>;
}