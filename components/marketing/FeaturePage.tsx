import React, { useEffect } from 'react';
import type { FeatureContent } from './types';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import CtaBand from './CtaBand';
import FeatureHero from './sections/FeatureHero';
import ProblemSection from './sections/ProblemSection';
import SolutionSection from './sections/SolutionSection';
import BenefitCards from './sections/BenefitCards';
import ComparisonTable from './sections/ComparisonTable';
import SavingsBand from './sections/SavingsBand';
import FeatureTestimonial from './sections/FeatureTestimonial';

/** Template único de página de módulo, alimentado por uma FeatureContent. */
const FeaturePage: React.FC<{ content: FeatureContent }> = ({ content }) => {
  useEffect(() => {
    document.title = `${content.eyebrow} | RecantoCare`;
    window.scrollTo(0, 0);
  }, [content.eyebrow]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <MarketingNav breadcrumb={content.eyebrow} />
      <FeatureHero content={content} />
      <ProblemSection problem={content.problem} />
      <SolutionSection solution={content.solution} accent={content.accent} />
      <BenefitCards benefits={content.benefits} accent={content.accent} />
      <ComparisonTable rows={content.comparison} />
      {content.savings && content.savings.length > 0 && <SavingsBand savings={content.savings} />}
      {content.testimonial && <FeatureTestimonial t={content.testimonial} />}
      <CtaBand title={`Pronto para transformar a gestão de ${content.eyebrow.toLowerCase()}?`} />
      <MarketingFooter />
    </div>
  );
};

export default FeaturePage;
