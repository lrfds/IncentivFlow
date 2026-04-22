import React, { useState } from 'react';
import { ClientsView as ClientsCRM } from '../features/clients/components/ClientsView';
import { ClientRegistrationModal } from '../features/clients/components/ClientRegistrationModal';

export function ClientsView() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="relative">
      {/* CRM Principal */}
      <ClientsCRM onOpenNewClient={() => setIsModalOpen(true)} />

      {/* Modal de Inteligência 360º */}
      <ClientRegistrationModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
