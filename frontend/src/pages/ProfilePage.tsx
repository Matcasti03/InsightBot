import { isLocalMode } from '../lib/supabase';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Phone,
  Save,
  ShieldCheck,
  Sun,
  UserRound
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../lib/api';
import { cn, formatCpf, formatDate, roleLabel } from '../lib/utils';
import type { HealthUnit, Profile } from '../types';

export default function ProfilePage() {
  const { profile, updateProfile, refreshProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    professional_register: '',
    health_unit: '',
    cpf: '',
    birth_date: ''
  });

  const { data: healthUnits } = useAsyncData<HealthUnit[]>(() => api.get<HealthUnit[]>('/health-units'), []);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name,
      phone: profile.phone ?? '',
      professional_register: profile.professional_register ?? '',
      health_unit: profile.health_unit ?? '',
      cpf: profile.cpf ?? '',
      birth_date: profile.birth_date ?? ''
    });
  }, [profile]);

  if (!profile) return null;

  const isPatient = profile.role === 'paciente';

  const updateField = (field: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato invalido', 'Envie uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande', 'A foto deve ter no maximo 2 MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const updated = await api.post<Profile>('/me/avatar', formData);
      updateProfile(updated);
      toast.success('Foto atualizada', 'Sua imagem de perfil foi sincronizada.');
    } catch (uploadError) {
      toast.error(
        'Falha no upload',
        uploadError instanceof Error ? uploadError.message : 'Tente novamente.'
      );
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch<Profile>('/me', {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        professional_register: isPatient ? null : form.professional_register.trim() || null,
        health_unit: form.health_unit.trim() || null,
        cpf: form.cpf.trim() || null,
        birth_date: form.birth_date || null
      });
      updateProfile(updated);
      await refreshProfile();
      toast.success('Perfil atualizado', 'Suas informacoes foram salvas com sucesso.');
    } catch (saveError) {
      toast.error(
        'Falha ao salvar',
        saveError instanceof Error ? saveError.message : 'Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        subtitle="Gerencie seus dados pessoais, foto e preferencias"
        icon={UserRound}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar
                  src={avatarPreview ?? profile.avatar_url}
                  name={profile.full_name}
                  size="xl"
                  ring
                  className="rounded-3xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                  aria-label="Alterar foto de perfil"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatar}
                  className="hidden"
                />
              </div>
              <h2 className="mt-4 text-lg font-bold text-main">{profile.full_name}</h2>
              <p className="text-xs text-muted">{profile.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <span className="badge bg-primary/10 text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> {roleLabel(profile.role)}
                </span>
                <span className="badge bg-accent/10 text-accent">
                  <ShieldCheck className="h-3.5 w-3.5" /> Conta {profile.status}
                </span>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-muted">
                Formatos JPG, PNG ou WebP · maximo 2 MB. {isLocalMode ? 'A foto fica armazenada neste computador e pode ser exibida na plataforma.' : 'A foto fica em um bucket publico do Supabase Storage; escolha uma imagem adequada para exibicao publica.'}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Preferencia de tema</p>
            <p className="text-xs text-muted">Alternancia instantanea em todo o aplicativo</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition',
                  theme === 'light'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-line bg-panel/30 text-muted hover:border-primary/30'
                )}
              >
                <Sun className="h-4 w-4" /> Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition',
                  theme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-line bg-panel/30 text-muted hover:border-primary/30'
                )}
              >
                <Moon className="h-4 w-4" /> Escuro
              </button>
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Informacoes da conta</p>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-muted">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{profile.health_unit ?? 'Sem unidade vinculada'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted">
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <span>Conta criada em {formatDate(profile.created_at)}</span>
              </div>
              {profile.cpf && (
                <div className="flex items-center gap-2 text-muted">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>CPF {formatCpf(profile.cpf)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary mt-4 w-full justify-start text-danger"
            >
              <LogOut className="h-4 w-4" /> Encerrar sessao
            </button>
          </div>
        </div>

        <div className="card p-5 sm:p-6 lg:col-span-2">
          <div className="mb-5">
            <p className="section-title">Dados pessoais</p>
            <p className="text-xs text-muted">
              Mantenha suas informacoes atualizadas para a seguranca do atendimento.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="profile-name" className="label">
                  Nome completo
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="profile-name"
                    required
                    value={form.full_name}
                    onChange={updateField('full_name')}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-email" className="label">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="profile-email"
                    value={profile.email}
                    disabled
                    className="input pl-10"
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted">
                  O e-mail de login so pode ser alterado pelo administrador.
                </p>
              </div>

              <div>
                <label htmlFor="profile-phone" className="label">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="profile-phone"
                    value={form.phone}
                    onChange={updateField('phone')}
                    className="input pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="profile-cpf" className="label">
                  CPF
                </label>
                <input
                  id="profile-cpf"
                  value={form.cpf}
                  onChange={updateField('cpf')}
                  className="input"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
                <p className="mt-1 text-[10px] text-muted">
                  O CPF e mascarado nas listagens e protegido por RLS.
                </p>
              </div>

              <div>
                <label htmlFor="profile-birth" className="label">
                  Data de nascimento
                </label>
                <input
                  id="profile-birth"
                  type="date"
                  value={form.birth_date}
                  onChange={updateField('birth_date')}
                  className="input"
                />
              </div>

              {!isPatient && (
                <div>
                  <label htmlFor="profile-register" className="label">
                    Registro profissional
                  </label>
                  <input
                    id="profile-register"
                    value={form.professional_register}
                    onChange={updateField('professional_register')}
                    className="input"
                    placeholder="CRM, COREN ou equivalente"
                  />
                </div>
              )}

              <div className={isPatient ? 'sm:col-span-2' : ''}>
                <label htmlFor="profile-unit" className="label">
                  Unidade de saude
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="profile-unit"
                    disabled={profile.role !== 'superadmin'}
                    list="profile-health-units"
                    value={form.health_unit}
                    onChange={updateField('health_unit')}
                    className="input pl-10"
                    placeholder="UBS ou clinica"
                  />
                  <datalist id="profile-health-units">
                    {healthUnits?.map((unit) => (
                      <option key={unit.id} value={unit.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-line/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-relaxed text-muted">
                Ao salvar, voce declara que as informacoes estao corretas e autoriza o registro
                para fins de atendimento.
              </p>
              <button type="submit" disabled={saving} className="btn-primary shrink-0">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar alteracoes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
