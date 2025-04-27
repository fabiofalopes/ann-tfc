# Ferramenta de Anotação TFC

Uma aplicação full-stack para gestão e anotação de projetos.

## Pré-requisitos

- Docker
- Docker Compose

## Configuração

1. Clone o repositório
2. Crie um ficheiro `.env` no diretório raiz com o seguinte conteúdo:
   ```
   REACT_APP_API_URL=http://localhost:8000
   ```

3. Construa e inicie os serviços em modo detached:
   ```bash
   docker compose up --build -d
   ```

4. Para ver os logs dos serviços:
   ```bash
   # Ver todos os logs
   docker compose logs -f

   # Ver logs apenas do backend
   docker compose logs -f backend

   # Ver logs apenas do frontend
   docker compose logs -f frontend
   ```

5. Para parar os serviços:
   ```bash
   docker compose down
   ```

A aplicação estará disponível em:
- Frontend: http://localhost:3721
- Backend API: http://localhost:8000

## Acesso Inicial

### Utilizador Administrador
Após a primeira execução, um utilizador administrador é criado automaticamente com as seguintes credenciais:
- Email: admin@example.com
- Password: admin

## Serviços

### Backend (FastAPI)
- Porta: 8000
- Documentação da API: http://localhost:8000/docs
- Gerencia autenticação, gestão de projetos e anotações

### Frontend (React)
- Porta: 3721
- Interface de utilizador para gestão de projetos e anotações
- Comunica com a API do backend

## Funcionalidades

- Autenticação de utilizadores (administradores e utilizadores regulares)
- Gestão de projetos
- Importação de ficheiros CSV
- Anotação de mensagens
- Gestão de tags

## Estrutura do Projeto

```
.
├── annotation-backend/     # Backend em FastAPI
│   ├── app/               # Código da aplicação
│   ├── tests/             # Testes
│   └── Dockerfile         # Configuração Docker
│
├── annotation_ui/         # Frontend em React
│   ├── src/              # Código fonte
│   ├── public/           # Ficheiros estáticos
│   └── Dockerfile        # Configuração Docker
│
└── docker-compose.yml     # Configuração dos serviços
```

## Configuração do Docker

O projeto utiliza Docker Compose para orquestrar dois serviços:

1. **Backend**:
   - Baseado em Python 3.11
   - Expõe a porta 8000
   - Utiliza SQLite para armazenamento
   - Configuração automática do primeiro administrador

2. **Frontend**:
   - Baseado em Node.js 18
   - Expõe a porta 3721
   - Configuração automática do proxy para a API

## Comandos Úteis do Docker

```bash
# Ver o estado dos containers
docker compose ps

# Ver os logs em tempo real
docker compose logs -f

# Executar comandos dentro de um container
docker compose exec backend bash
docker compose exec frontend bash

# Reconstruir e reiniciar um serviço específico
docker compose up -d --build backend
docker compose up -d --build frontend

# Parar e remover todos os containers
docker compose down

# Parar e remover todos os containers, incluindo volumes
docker compose down -v
```

## Notas de Desenvolvimento

- O backend utiliza FastAPI para uma API RESTful moderna
- O frontend utiliza React com React Router para navegação
- A autenticação é baseada em JWT (JSON Web Tokens)
- O armazenamento de dados utiliza SQLite com SQLAlchemy ORM
- As migrações de base de dados são geridas pelo Alembic
 