import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiClient.auth.login({ email, password });
      login(data.token);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center liquid-bg relative overflow-hidden">
      <style>{`
        .liquid-bg {
          background: 
            radial-gradient(at 0% 0%, hsla(212, 100%, 92%, 1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsla(230, 100%, 87%, 0.8) 0px, transparent 50%),
            linear-gradient(180deg, #f8faff 0%, #f0f5ff 100%);
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }
        .liquid-text {
          background: linear-gradient(180deg, #1e3a8a 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
      
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

      {/* Painel Central */}
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl relative z-10 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black liquid-text tracking-tight mb-2">IncentivFlow</h1>
          <p className="text-slate-500 font-medium text-sm">O motor financeiro corporativo do seu Hub</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm font-medium text-center animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/70" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/80 focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-400/10 rounded-xl outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 shadow-sm"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 ml-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/70" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/60 border border-white/80 focus:border-indigo-400/50 focus:ring-4 focus:ring-indigo-400/10 rounded-xl outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800 shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Acessar Workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
