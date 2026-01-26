import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CircleDot, LogIn, UserPlus, ChevronDown, Shield, Users, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/landing-hero.jpg";

export default function Landing() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <CircleDot className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">TireVault</span>
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={scrollToFeatures} className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </button>
              <a href="#network" className="text-muted-foreground hover:text-foreground transition-colors">
                Network
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild className="hidden sm:flex">
                <Link to="/auth?mode=login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Member
                </Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Link to="/auth?mode=signup">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join
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
          <img
            src={heroImage}
            alt="TireVault Warehouse"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="inline-flex items-center gap-2 text-primary mb-6 text-sm font-medium">
              <CircleDot className="w-4 h-4" />
              The Premier Tire Business Network
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-8xl font-bold mb-4"
          >
            <span className="text-foreground">TIRE</span>
            <span className="text-primary">VAULT</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl sm:text-3xl text-primary font-semibold italic mb-4"
          >
            Business First, always.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            A comprehensive tire inventory management platform with network sharing, 
            real-time stock tracking, and seamless B2B connections.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90 h-12 px-8 text-base">
              <Link to="/auth?mode=signup">
                <UserPlus className="w-5 h-5 mr-2" />
                Get Started
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={scrollToFeatures} className="h-12 px-8 text-base">
              Learn More
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.button
          onClick={scrollToFeatures}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="w-8 h-8 animate-bounce" />
        </motion.button>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Your Tire Business
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Streamline your operations with our comprehensive suite of tools designed specifically for tire businesses.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Package,
                title: "Inventory Management",
                description: "Track stock levels, DOT codes, and pricing in real-time across your entire inventory.",
              },
              {
                icon: Users,
                title: "Network Sharing",
                description: "Share your inventory with trusted partners and access their stock when needed.",
              },
              {
                icon: TrendingUp,
                title: "Sales Analytics",
                description: "Gain insights into your best sellers, stock movements, and business performance.",
              },
              {
                icon: Shield,
                title: "Secure Platform",
                description: "Enterprise-grade security with role-based access control for your team.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 rounded-2xl text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-24 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Tire Business?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the TireVault network today and connect with other tire businesses in your area. 
              Start managing your inventory smarter, not harder.
            </p>
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90 h-12 px-8 text-base">
              <Link to="/auth?mode=signup">
                <UserPlus className="w-5 h-5 mr-2" />
                Join TireVault Now
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <CircleDot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">TireVault</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TireVault. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
