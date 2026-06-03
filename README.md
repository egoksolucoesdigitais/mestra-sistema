# Mestra | Gestão de Segurança e Saúde Ocupacional (SST)

Este projeto é um painel corporativo moderno e premium para a **Mestra | Segurança e Saúde Ocupacional**. Ele é integrado diretamente ao Supabase para autenticação e gestão de banco de dados (tabela de serviços de SST).

## Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Estilização**: Tailwind CSS v4 (com paleta de cores personalizada e tema escuro premium)
- **Banco de Dados & Autenticação**: Supabase
- **Ícones**: Lucide React
- **Navegação**: React Router DOM (configurado com roteamento SPA)

## Funcionalidades

- 🔒 **Tela de Login Premium**: Interface de autenticação com glassmorphism, suporte à validação em tempo real e preenchimento de teste rápido.
- 📊 **Dashboard Interativo**: Estatísticas chave, alertas em tempo real e controle de serviços SST.
- 🛠️ **Gestão de Serviços SST**: Listagem de serviços cadastrados em banco por categorias (Segurança do Trabalho, Higiene Ocupacional, Ergonomia, Medicina do Trabalho, etc.).
- 🚀 **Pronto para Produção**: Configurado com roteamento SPA correto para deploys na Vercel (evitando o erro de tela branca/404 ao atualizar a página).

## Estrutura do Projeto

- `/src/contexts`: Provedores de contexto para Autenticação e Notificações (Toast).
- `/src/pages`: Páginas da aplicação (`Login`, `Dashboard`).
- `/src/lib`: Configuração do cliente do Supabase.
- `/src/components`: Componentes reutilizáveis de UI.

---
*Mestra SST - 2026*

