import React from 'react';
import FeaturesHub from './FeaturesHub';
import FeaturePage from './FeaturePage';
import { getFeature } from '../../content/featuresContent';
import { ROUTES } from '../../utils/navigation';

/**
 * Resolve /recursos e /recursos/<slug> a partir do pathname.
 * Slug inválido → normaliza a URL e mostra o hub.
 */
const FeaturesRouter: React.FC = () => {
  const parts = window.location.pathname.split('/').filter(Boolean); // ['recursos', slug?]
  const slug = parts[1];

  if (!slug) return <FeaturesHub />;

  const content = getFeature(slug);
  if (!content) {
    window.history.replaceState(null, '', ROUTES.features);
    return <FeaturesHub />;
  }
  return <FeaturePage content={content} />;
};

export default FeaturesRouter;
