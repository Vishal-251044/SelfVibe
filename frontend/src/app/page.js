/**
 * Public landing page (/).
 */
import SiteNavbar from "@/components/layout/SiteNavbar";
import SiteFooter from "@/components/layout/SiteFooter";
import Hero from "@/components/features/landing/Hero";
import Features from "@/components/features/landing/Features";
import VibeGrid from "@/components/features/landing/VibeGrid";
import Pricing from "@/components/features/landing/Pricing";

export default function LandingPage() {
  return (
    <>
      <SiteNavbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Features />
        <VibeGrid />
        <Pricing />
      </main>
      <SiteFooter />
    </>
  );
}
