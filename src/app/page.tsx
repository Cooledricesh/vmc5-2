import { HomeNavbar } from '@/features/home/components/HomeNavbar';
import { HeroSection } from '@/features/home/components/HeroSection';
import { FeaturesSection } from '@/features/home/components/FeaturesSection';
import { PricingSection } from '@/features/home/components/PricingSection';
import { TestimonialsSection } from '@/features/home/components/TestimonialsSection';
import { StatsSection } from '@/features/home/components/StatsSection';
import { FAQSection } from '@/features/home/components/FAQSection';
import { CTASection } from '@/features/home/components/CTASection';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomeNavbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <StatsSection />
      <FAQSection />
      <CTASection />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            © 2025 사주풀이 AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
