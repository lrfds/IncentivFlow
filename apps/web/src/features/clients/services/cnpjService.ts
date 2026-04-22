const BRASIL_API_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const OPEN_CNPJ_URL = 'https://api.opencnpj.org';

export async function fetchCnpjData(cnpj: string) {
  const cleanCnpj = cnpj.replace(/\D/g, '');

  try {
    // TENTATIVA 1: BrasilAPI (Dados mais completos de CEP/CNAE)
    const response = await fetch(`${BRASIL_API_URL}/${cleanCnpj}`);
    
    if (response.ok) {
      const data = await response.json();
      return mapBrasilApiToClient(data);
    }

    // TENTATIVA 2: Fallback para OpenCNPJ se a BrasilAPI falhar
    console.warn('BrasilAPI falhou, tentando OpenCNPJ...');
    const fallbackResponse = await fetch(`${OPEN_CNPJ_URL}/${cleanCnpj}`);
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      return mapOpenCnpjToClient(fallbackData);
    }

    throw new Error('Todas as fontes de dados falharam');
  } catch (error) {
    console.error('Erro na mineração de CNPJ:', error);
    throw error;
  }
}

function mapBrasilApiToClient(data: any) {
  return {
    cnpj: data.cnpj,
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia || data.razao_social,
    capitalSocial: data.capital_social,
    dataAbertura: data.data_inicio_atividade,
    sector: inferSector(data.cnae_fiscal),
    apiValidated: true,
    quadroSocios: data.qsa?.map((s: any) => ({
      nome: s.nome_socio,
      vinculo: s.qualificacao_socio
    }))
  };
}

function mapOpenCnpjToClient(data: any) {
  // Mapeamento simplificado para OpenCNPJ
  return {
    cnpj: data.cnpj,
    razaoSocial: data.razao_social,
    nomeFantasia: data.nome_fantasia || data.razao_social,
    capitalSocial: data.capital_social || 0,
    dataAbertura: data.data_abertura,
    sector: 'OUTROS',
    apiValidated: true
  };
}

function inferSector(cnae: number | string): string {
  const cnaeNum = typeof cnae === 'string' ? parseInt(cnae.replace(/\D/g, '')) : cnae;
  if (cnaeNum >= 90000) return 'CULTURA';
  if (cnaeNum >= 93115) return 'ESPORTE';
  return 'TECNOLOGIA';
}
