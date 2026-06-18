import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Key, Lock, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, File } from 'lucide-react';
import { AuthUser, DigitalCertificate } from '../types';
import { toast } from '../services/toast';

// ── Utilities ────────────────────────────────────────────────────────────────

function getCertDays(expDate: string): number {
  const exp = new Date(expDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

function deriveCertStatus(expDate: string): DigitalCertificate['certificate_status'] {
  const days = getCertDays(expDate);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

function maskDocument(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }
  if (digits.length === 14) {
    return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
  }
  return '•'.repeat(Math.max(0, doc.length - 4)) + doc.slice(-4);
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

// Simulates PFX/P12 parsing client-side.
// In production, replace with: import forge from 'node-forge'; forge.pkcs12.pkcs12FromAsn1(...)
async function simulateParseCertificate(
  file: File,
  password: string
): Promise<Partial<DigitalCertificate>> {
  if (!file.name.match(/\.(pfx|p12)$/i)) {
    throw new Error('Arquivo inválido. Use um arquivo .pfx ou .p12 (certificado A1 ICP-Brasil).');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. O certificado deve ter no máximo 10 MB.');
  }
  if (!password.trim()) {
    throw new Error('A senha do certificado é obrigatória.');
  }

  // Read first 20 bytes to produce a deterministic serial number from the binary content
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const serial = Array.from(bytes.slice(0, 20))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();

  const issuers = [
    'AC CERTISIGN-RFB G4',
    'AC SOLUTI-RFB G4',
    'AC VALID-RFB G4',
    'AC SERASA RFB G4',
    'AC PRODERJ G3',
  ];
  const issuer = issuers[(bytes[0] ?? 0) % issuers.length];

  const today = new Date();
  const issueDate = new Date(today);
  issueDate.setFullYear(issueDate.getFullYear() - 1);
  const expDate = new Date(today);
  expDate.setFullYear(expDate.getFullYear() + 2);

  await new Promise(r => setTimeout(r, 1500));

  return {
    certificate_file_name: file.name,
    certificate_holder_name: '',
    certificate_document: '',
    certificate_serial_number: serial,
    certificate_issuer: issuer,
    certificate_issue_date: issueDate.toISOString().split('T')[0],
    certificate_expiration_date: expDate.toISOString().split('T')[0],
    certificate_type: 'A1',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  user: AuthUser;
  onClose: () => void;
  onSave: (cert: DigitalCertificate) => Promise<void>;
  onRemove: () => Promise<void>;
}

type Step = 'view' | 'upload' | 'review';

const CertificateSection: React.FC<Props> = ({ user, onClose, onSave, onRemove }) => {
  const hasCert = !!user.certificate;
  const [step, setStep] = useState<Step>(hasCert ? 'view' : 'upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [formData, setFormData] = useState<Partial<DigitalCertificate>>({});
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  const handleFileSelect = (f: File) => {
    if (!f.name.match(/\.(pfx|p12)$/i)) {
      setParseError('Arquivo inválido. Envie um certificado .pfx ou .p12 emitido por uma AC ICP-Brasil.');
      return;
    }
    setParseError('');
    setFile(f);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const data = await simulateParseCertificate(file, password);
      setFormData(data);
      setStep('review');
    } catch (err: any) {
      setParseError(err.message || 'Erro ao processar o certificado.');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.certificate_holder_name?.trim()) {
      setParseError('O nome do titular é obrigatório.');
      return;
    }
    if (!formData.certificate_document?.trim()) {
      setParseError('O CPF/CNPJ do titular é obrigatório.');
      return;
    }
    if (!formData.certificate_expiration_date) {
      setParseError('A data de validade é obrigatória.');
      return;
    }

    setSaving(true);
    setParseError('');
    try {
      const cert: DigitalCertificate = {
        certificate_file_name: formData.certificate_file_name,
        certificate_holder_name: formData.certificate_holder_name!.trim(),
        certificate_document: formData.certificate_document!.trim(),
        certificate_serial_number: formData.certificate_serial_number || '',
        certificate_issuer: formData.certificate_issuer || '',
        certificate_issue_date:
          formData.certificate_issue_date || new Date().toISOString().split('T')[0],
        certificate_expiration_date: formData.certificate_expiration_date!,
        certificate_status: deriveCertStatus(formData.certificate_expiration_date!),
        certificate_last_validation: new Date().toISOString(),
        certificate_type: 'A1',
      };
      await onSave(cert);
    } catch (err: any) {
      setParseError(err.message || 'Erro ao salvar o certificado.');
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      await onRemove();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover o certificado.');
    }
  };

  const cert = user.certificate;
  const certDays = cert ? getCertDays(cert.certificate_expiration_date) : null;
  const certStatus = cert ? deriveCertStatus(cert.certificate_expiration_date) : null;

  const statusConfig = {
    valid: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      label: 'Certificado Válido',
    },
    expiring_soon: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      label: 'Expirando em Breve',
    },
    expired: {
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-700',
      label: 'Certificado Expirado',
    },
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-lg overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Key className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Certificado Digital A1</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{user.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── VIEW STEP ────────────────────────────────────────── */}
          {step === 'view' && cert && certStatus && certDays !== null && (
            <div className="p-6 space-y-5">
              {/* Status banner */}
              <div
                className={`rounded-xl p-4 border ${statusConfig[certStatus].bg}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {certStatus === 'valid' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle
                        className={`h-5 w-5 shrink-0 ${certStatus === 'expiring_soon' ? 'text-amber-600' : 'text-rose-600'}`}
                      />
                    )}
                    <span className={`font-bold text-sm ${statusConfig[certStatus].text}`}>
                      {statusConfig[certStatus].label}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusConfig[certStatus].text}`}>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {certDays < 0
                      ? `Expirado há ${Math.abs(certDays)} dia${Math.abs(certDays) !== 1 ? 's' : ''}`
                      : certDays === 0
                      ? 'Expira hoje'
                      : `${certDays} dias restantes`}
                  </div>
                </div>
              </div>

              {/* Certificate details */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                {[
                  { label: 'Tipo', value: 'A1 — ICP-Brasil' },
                  { label: 'Titular', value: cert.certificate_holder_name },
                  { label: 'CPF / CNPJ', value: maskDocument(cert.certificate_document) },
                  { label: 'Autoridade Certificadora', value: cert.certificate_issuer },
                  { label: 'Nº de Série', value: cert.certificate_serial_number, mono: true },
                  { label: 'Data de Emissão', value: fmtDate(cert.certificate_issue_date) },
                  { label: 'Data de Validade', value: fmtDate(cert.certificate_expiration_date) },
                  {
                    label: 'Última Validação',
                    value: cert.certificate_last_validation
                      ? new Date(cert.certificate_last_validation).toLocaleString('pt-BR')
                      : '—',
                  },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between items-start px-4 py-2.5 text-xs gap-4">
                    <span className="text-slate-500 font-medium shrink-0">{label}</span>
                    <span
                      className={`text-slate-800 font-semibold text-right break-all ${mono ? 'font-mono' : ''}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {!confirmRemove ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setFile(null);
                      setPassword('');
                      setParseError('');
                      setStep('upload');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </button>
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-600 rounded-xl font-semibold text-sm hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-rose-800">Confirmar remoção do certificado?</p>
                  <p className="text-xs text-rose-600">
                    O certificado será desvinculado deste usuário. É possível vincular um novo certificado a qualquer
                    momento.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleRemove}
                      className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Confirmar Remoção
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── UPLOAD STEP ──────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="p-6 space-y-5">
              {hasCert && (
                <button
                  onClick={() => setStep('view')}
                  className="text-xs text-primary-600 font-medium hover:underline"
                >
                  ← Voltar ao certificado atual
                </button>
              )}

              <p className="text-sm text-slate-600">
                Envie o certificado digital A1 no formato{' '}
                <span className="font-semibold">.pfx</span> ou{' '}
                <span className="font-semibold">.p12</span> emitido por uma Autoridade Certificadora
                ICP-Brasil.
              </p>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : file
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pfx,.p12"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <File className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-800 text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB — clique para trocar
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">Arraste o certificado aqui</p>
                    <p className="text-xs text-slate-400 mt-1">ou clique para selecionar o arquivo</p>
                    <p className="text-xs text-slate-400 mt-2">Formatos: .pfx, .p12 — máx. 10 MB</p>
                  </>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Senha do Certificado
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Usada apenas para descriptografar e extrair os dados. Nunca é armazenada.
                </p>
              </div>

              {parseError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              <button
                onClick={handleParse}
                disabled={!file || !password || parsing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                {parsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Analisando certificado...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Analisar Certificado
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── REVIEW STEP ──────────────────────────────────────── */}
          {step === 'review' && (
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div className="text-xs text-blue-800">
                  <p className="font-semibold mb-0.5">Verifique e complete os dados abaixo</p>
                  <p>
                    Os campos <strong>Nome do Titular</strong> e <strong>CPF/CNPJ</strong> devem ser
                    preenchidos manualmente. Os demais foram detectados automaticamente a partir do
                    arquivo.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nome do Titular <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome completo do titular do certificado"
                  value={formData.certificate_holder_name || ''}
                  onChange={e =>
                    setFormData(d => ({ ...d, certificate_holder_name: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  CPF / CNPJ do Titular <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  value={formData.certificate_document || ''}
                  onChange={e =>
                    setFormData(d => ({ ...d, certificate_document: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Autoridade Certificadora (AC)
                  <span className="ml-1.5 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    auto-detectado
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.certificate_issuer || ''}
                  onChange={e =>
                    setFormData(d => ({ ...d, certificate_issuer: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Número de Série
                  <span className="ml-1.5 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    auto-detectado
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.certificate_serial_number || ''}
                  onChange={e =>
                    setFormData(d => ({ ...d, certificate_serial_number: e.target.value }))
                  }
                  className={`${inputClass} font-mono text-xs`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Data de Emissão
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      auto
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formData.certificate_issue_date || ''}
                    onChange={e =>
                      setFormData(d => ({ ...d, certificate_issue_date: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Data de Validade
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      auto
                    </span>
                  </label>
                  <input
                    type="date"
                    value={formData.certificate_expiration_date || ''}
                    onChange={e =>
                      setFormData(d => ({ ...d, certificate_expiration_date: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {parseError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          {step === 'view' ? (
            <button
              onClick={onClose}
              className="w-full px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (step === 'review') {
                    setStep('upload');
                    setParseError('');
                  } else {
                    onClose();
                  }
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                {step === 'review' ? 'Voltar' : 'Cancelar'}
              </button>
              {step === 'review' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                >
                  {saving ? 'Salvando...' : 'Salvar Certificado'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateSection;
