import Hero from '@/components/Hero';
import HowSternaWorks from '@/components/HowSternaWorks';
import Problem from '@/components/Problem';
import ProductShowcase from '@/components/ProductShowcase';
import ShareSection from '@/components/ShareSection';
import Team from '@/components/Team';
import WeekendParisMockup from '@/components/WeekendParisMockup';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowSternaWorks />
      <WeekendParisMockup />
      <ShareSection />
      <ProductShowcase />
      <Team />
    </>
  );
}
