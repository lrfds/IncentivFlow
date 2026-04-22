import { rlsClient } from './src/core/prisma.js';

async function run() {
  console.log('🔗 Conectando ao Banco...');
  const db = rlsClient('SYSTEM', 'SYSTEM');

  try {
    let org = await db.organization.findFirst({ where: { name: 'IncentivFlow Test Org' } });
    if (!org) {
      org = await db.organization.create({
        data: {
          name: 'IncentivFlow Test Org',
          cnpj: '00000000000100',
          plan: 'ENTERPRISE',
        }
      });
    }

    let user = await db.user.findFirst({ where: { email: 'test@incentivflow.com' } });
    if (!user) {
      user = await db.user.create({
        data: {
          organizationId: org.id,
          name: 'Admin API Test',
          email: 'test@incentivflow.com',
          passwordHash: 'plain_for_test',
          role: 'ADMIN',
        }
      });
    }

    console.log('✅ Base de dados populada com Inquilino de Teste!');

    const health = await fetch('http://127.0.0.1:3000/health').then(r => r.json());
    console.log('\n🟢 Serviço da API Online:', health);

    const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'plain_for_test' })
    });
    
    const loginData = await loginRes.json();
    const cookies = loginRes.headers.get('set-cookie');
    const token = cookies?.split(';').find(c => c.startsWith('token='))?.split('=')[1];

    if (token) {
      console.log('🔑 Autenticação bem sucedida. Token Gerado!');
      
      console.log('🚀 Disparando Rota Autenticada que utiliza o [request.db] (Injeção de RLS)...');
      const createClientRes = await fetch('http://127.0.0.1:3000/api/clients', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Cookie': `token=${token}`
        },
        body: JSON.stringify({
            document: '12345678000199',
            name: 'Cliente Alpha ' + Math.random().toString().slice(2,5),
            type: 'LEGAL',
            sector: 'Agribusiness',
            contactEmail: 'alpha@test.com'
        })
      });
      const clientData = await createClientRes.json();
      console.log('✅ Resposta da Criação do Cliente:', clientData);

      const kpisRes = await fetch('http://127.0.0.1:3000/api/dashboard/kpis', {
        headers: { 'Cookie': `token=${token}` }
      });
      console.log('📊 Resumo do Dashboard (KPIs):', await kpisRes.json());
    } else {
        console.log('❌ Falha ao pegar token:', loginData);
    }

  } catch(e) {
    console.error('❌ FATAL:', e);
  } finally {
     await db.$disconnect();
  }
}
run();
