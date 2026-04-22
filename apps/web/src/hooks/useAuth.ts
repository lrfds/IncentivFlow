import { useState } from 'react';

export type UserRole = 'CONSULTANT' | 'MANAGER' | 'AUDITOR';

interface User {
  name: string;
  role: UserRole;
  email: string;
}

export function useAuth() {
  // Em produção, os dados do usuário seriam recuperados de um JWT/Contexto de Autenticação
  const [user] = useState<User>({
    name: 'Staff Engineer',
    email: 'staff@incentivflow.com',
    role: 'MANAGER' // Altere aqui para testar: CONSULTANT | MANAGER | AUDITOR
  });

  const canAccess = (feature: string) => {
    const permissions: Record<UserRole, string[]> = {
      CONSULTANT: ['dashboard', 'projects', 'clients', 'calendar'],
      MANAGER: ['dashboard', 'projects', 'clients', 'calendar', 'audit'],
      AUDITOR: ['audit', 'dashboard'] // O Auditor foca na conferência e integridade
    };

    return permissions[user.role].includes(feature);
  };

  return { 
    user, 
    canAccess,
    isManager: user.role === 'MANAGER',
    isAuditor: user.role === 'AUDITOR',
    isConsultant: user.role === 'CONSULTANT'
  };
}
