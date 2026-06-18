/**
 * Gera um ID único de empresa no formato EMP-<timestamp base36>-<rand4>.
 * Exemplo: EMP-LB7ZK3A2-F4X1
 * Usado em AuthContext.signUpNewTenant e CheckoutPage.criarEmpresaEAdmin.
 */
export function gerarEmpresaId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EMP-${ts}-${rand}`;
}
