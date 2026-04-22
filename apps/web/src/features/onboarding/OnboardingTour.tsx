import React, { useState, useEffect } from 'react';
import { ONBOARDING_STEPS } from './OnboardingSteps';
import { Sparkles, ChevronRight, X } from 'lucide-react';

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Inicia o tour no primeiro acesso
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('incentivflow_tour_completed');
    if (!hasSeenTour) {
      setTimeout(() => setIsVisible(true), 1500); // Delay para carregar o visual
    }
  }, []);

  // Atualiza a posição do destaque baseado no target
  useEffect(() => {
    if (isVisible) {
      const element = document.querySelector(ONBOARDING_STEPS[currentStep].target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isVisible, currentStep]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('incentivflow_tour_completed', 'true');
  };

  if (!isVisible || !targetRect) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop com "Buraco" (Highlight) */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" style={{
        clipPath: `polygon(
          0% 0%, 0% 100%, 
          ${targetRect.left - 8}px 100%, 
          ${targetRect.left - 8}px ${targetRect.top - 8}px, 
          ${targetRect.right + 8}px ${targetRect.top - 8}px, 
          ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
          ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
          ${targetRect.left - 8}px 100%, 
          100% 100%, 100% 0%
        )`
      }} />

      {/* Tooltip Card */}
      <div 
        className="absolute glass-panel p-6 rounded-[32px] w-80 shadow-2xl border border-white/60 pointer-events-auto transition-all duration-500 animate-in zoom-in-95"
        style={{
          top: targetRect.bottom + 20 > window.innerHeight - 200 ? targetRect.top - 220 : targetRect.bottom + 20,
          left: Math.max(20, Math.min(window.innerWidth - 340, targetRect.left))
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-500 w-4 h-4" />
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Tour Diamond</span>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <h3 className="text-lg font-black text-slate-800 mb-2">
          {ONBOARDING_STEPS[currentStep].title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          {ONBOARDING_STEPS[currentStep].content}
        </p>

        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-4 bg-indigo-600' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
          <button 
            onClick={handleNext}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all"
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Começar Agora' : 'Próximo'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
