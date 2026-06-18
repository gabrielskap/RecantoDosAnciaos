// Navegação baseada em pathname + reload — mesmo padrão usado em LandingPage
// (navigateToDemo) e TrialEnvironment. Centralizado aqui para reuso nas
// páginas de marketing (hub, páginas de recurso) e CTAs.
export const go = (path: string) => {
  window.history.pushState(null, '', path);
  window.location.reload();
};

// Caminhos públicos reutilizados pelos CTAs.
export const ROUTES = {
  home: '/',
  login: '/login',
  features: '/recursos',
  feature: (slug: string) => `/recursos/${slug}`,
  pricing: '/#pricing',
  subscribe: '/assinar',
  demo: '/demo',
} as const;
