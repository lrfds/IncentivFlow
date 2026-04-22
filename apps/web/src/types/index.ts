export interface Client {
  id: string;
  cnpj: string;
  name: string;
  razaoSocial: string;
  nomeFantasia?: string;
  capitalSocial: number;
  dataAbertura?: string;
  sector: string;
  metadata: any;
  createdAt: string;
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export interface ClientDraftInput extends Partial<Client> {}
