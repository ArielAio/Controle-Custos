## Zapwrapp — Controle de custos

Next.js 14 (App Router) + Firebase Auth/Firestore + Tailwind para acompanhar entradas, saídas, campanhas e métodos de pagamento.

### Rodar local
- `npm install`
- Crie `.env.local` com as chaves do seu projeto Firebase:
  - `NEXT_PUBLIC_FIREBASE_API_KEY=`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=`
  - `NEXT_PUBLIC_FIREBASE_APP_ID=`
- `npm run dev` e abra http://localhost:3000

### Estrutura principal
- Dashboard em `/` com KPIs, linha do tempo, métodos de pagamento e resumo de campanhas.
- `/transactions`: listagem, filtros por tipo e formulário validado com zod/react-hook-form para novas entradas/saídas (envia log para console; conectar no Firestore).
- `/campaigns`: visão geral de campanhas (budget vs gasto, status).
- `/payment-methods`: saldos consolidados por cartão/PIX/boleto.
- `/login`: formulário de email/senha com Firebase Auth.
- Biblioteca de UI: `src/components`, tipos em `src/lib/types.ts`, dados mock em `src/lib/mockData.ts`, inicialização Firebase em `src/lib/firebase.ts`.

### Próximos passos recomendados
- Proteger rotas com middleware/guards que checam Auth + cookies.
- Mover dados mock para coleções Firestore (`paymentMethods`, `transactions`, `campaigns`) e usar `ownerId` no documento para regras de segurança.
- Regras Firestore: permitir leitura/escrita apenas do `ownerId` autenticado; validar `type`, `amount > 0` e chaves de referência.
- Preparar deploy na Vercel adicionando as variáveis de ambiente acima.
