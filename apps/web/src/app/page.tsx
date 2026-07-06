import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CashControlSection } from "@/components/landing/CashControlSection";
import { InventorySection } from "@/components/landing/InventorySection";
import { CreditSection } from "@/components/landing/CreditSection";
import { BusinessTypesSection } from "@/components/landing/BusinessTypesSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "DaleVenta | Sistema de ventas, inventario y caja para negocios",
  description:
    "DaleVenta es un sistema POS para controlar ventas, inventario, caja, clientes, créditos y reportes en pequeños negocios de República Dominicana.",
  keywords: [
    "sistema de ventas RD",
    "punto de venta RD",
    "sistema POS República Dominicana",
    "software para repostería",
    "sistema para panadería",
    "control de inventario",
    "cuadre de caja",
    "sistema para colmado",
    "software para pequeños negocios",
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <CashControlSection />
        <InventorySection />
        <CreditSection />
        <BusinessTypesSection />
        <BenefitsSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
