import Hero from '@/components/Hero';
import ProductShowcase from '@/components/ProductShowcase';
import ShareSection from '@/components/ShareSection';
import Team from '@/components/Team';
import WeekendParisMockup from '@/components/WeekendParisMockup';

export default function HomePage() {
  return (
    <>
      <Hero />
      <WeekendParisMockup />
      <ProductShowcase />
      <ShareSection />
      <Team />
    </>
  );
}
