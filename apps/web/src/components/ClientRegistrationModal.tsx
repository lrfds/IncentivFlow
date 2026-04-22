import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/api';

const clientSchema = z.object({
  cnpj: z.string().min(14, 'CNPJ incompleto'),
  razaoSocial: z.string().min(1, 'Razão Social obrigatória'),
  nomeFantasia: z.string().optional(),
  sector: z.string().optional(),
  address: z.object({
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().optional()
  }).optional()
});

type ClientFormData = z.infer<typeof clientSchema>;

export function ClientRegistrationModal({ open, onClose, onSave, onToast }: any) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      sector: '',
      address: {
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: ''
      }
    }
  });

  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [cnpjError, setCnpjError] = useState('');

  const cnpjValue = watch('cnpj');

  useEffect(() => {
    if (open) {
      reset();
      setCnpjError('');
    }
  }, [open, reset]);

  useEffect(() => {
    const fetchCnpj = async (digits: string) => {
      setIsFetchingCnpj(true);
      setCnpjError('');
      
      try {
        // @ts-ignore
        const response = await apiClient.cnpj.fetch(digits);
        const data = response?.data || response;
        
        if (data && (data.razaoSocial || data.nome)) {
           setValue('razaoSocial', data.razaoSocial || data.nome);
           setValue('nomeFantasia', data.nomeFantasia || data.fantasia || '');
           setValue('sector', data.setor || data.atividade_principal?.[0]?.text || '');
           
           if (data.endereco || data.logradouro) {
             setValue('address.logradouro', data.endereco?.logradouro || data.logradouro || '');
             setValue('address.numero', data.endereco?.numero || data.numero || '');
             setValue('address.bairro', data.endereco?.bairro || data.bairro || '');
             setValue('address.cidade', data.endereco?.municipio || data.municipio || '');
             setValue('address.uf', data.endereco?.uf || data.uf || '');
           }
           onToast?.('Dados da Receita carregados com sucesso!', 'success');
        } else {
           throw new Error('Retorno inválido');
        }
      } catch (err) {
        setCnpjError('CNPJ não encontrado ou inválido na Receita Federal.');
        setValue('razaoSocial', '');
        setValue('nomeFantasia', '');
        setValue('sector', '');
        setValue('address.logradouro', '');
        setValue('address.numero', '');
        setValue('address.bairro', '');
        setValue('address.cidade', '');
        setValue('address.uf', '');
      } finally {
        setIsFetchingCnpj(false);
      }
    };

    const digits = (cnpjValue || '').replace(/\D/g, '');
    if (digits.length === 14) {
      fetchCnpj(digits);
    } else {
      setCnpjError('');
    }
  }, [cnpjValue, setValue, onToast]);

  if (!open) return null;

  const onSubmit = async (data: ClientFormData) => {
    await onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative glass-panel bg-white/40 backdrop-blur-3xl border border-white/40 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-white/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Novo Cliente</h2>
              <p className="text-sm text-slate-500 font-medium">Integração CNPJ Automática React Hook Form</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Consultar CNPJ</label>
              <div className="relative">
                <input
                  {...register('cnpj')}
                  placeholder="Digite os 14 dígitos..."
                  className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm font-medium"
                />
                {isFetchingCnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-indigo-500 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando dados da Receita...
                  </div>
                )}
              </div>
              {errors.cnpj && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.cnpj.message}</p>}
              {cnpjError && (
                <div className="mt-2 text-red-600 text-sm font-medium flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4" /> {cnpjError}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Razão Social</label>
                <input
                  {...register('razaoSocial')}
                  readOnly={isFetchingCnpj}
                  className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium"
                />
                {errors.razaoSocial && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.razaoSocial.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Nome Fantasia</label>
                <input
                  {...register('nomeFantasia')}
                  readOnly={isFetchingCnpj}
                  className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Setor Habitual</label>
              <input
                {...register('sector')}
                readOnly={isFetchingCnpj}
                className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium"
              />
            </div>

            <div className="border-t border-white/40 pt-4 mt-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                Endereço
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Logradouro</label>
                  <input
                    {...register('address.logradouro')}
                    className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Número</label>
                  <input
                    {...register('address.numero')}
                    className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Bairro</label>
                  <input
                    {...register('address.bairro')}
                    className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">Cidade</label>
                  <input
                    {...register('address.cidade')}
                    className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">UF</label>
                  <input
                    {...register('address.uf')}
                    className="w-full bg-white/60 border border-white/80 focus:ring-4 focus:ring-indigo-400/10 focus:border-indigo-400/50 rounded-xl px-4 py-3 text-slate-800 outline-none transition-all shadow-sm font-medium text-sm uppercase"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/40 pt-4 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isFetchingCnpj}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Cadastrar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
