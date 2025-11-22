# 📊 Dashboard de Testes de Velocidade

Dashboard interativo para visualização e análise de dados de testes de velocidade de internet.

## 🚀 Como Usar

1. **Abra o arquivo `index.html` em um navegador web**
   - Você pode simplesmente fazer duplo clique no arquivo
   - Ou usar um servidor local (recomendado para evitar problemas de CORS)

2. **Usando um servidor local (recomendado):**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (com http-server)
   npx http-server
   
   # PHP
   php -S localhost:8000
   ```
   
   Depois acesse: `http://localhost:8000`

## 📋 Funcionalidades

- **Estatísticas em Tempo Real:**
  - Média, máximo e mínimo de download, upload e ping
  - Tempo médio de teste e tempo total

- **Gráficos Interativos:**
  - Velocidade de download ao longo do tempo
  - Velocidade de upload ao longo do tempo
  - Latência (ping) ao longo do tempo
  - Distribuição de velocidades

- **Filtros:**
  - Filtrar por período (últimos 7, 30, 90 dias ou todos)
  - Controlar número de pontos exibidos nos gráficos (para melhor performance)

## 📁 Estrutura de Arquivos

```
.
├── index.html          # Página principal do dashboard
├── dashboard.js        # Lógica JavaScript e gráficos
├── styles.css          # Estilos CSS
├── speedtests.json     # Dados dos testes de velocidade
└── README.md          # Este arquivo
```

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura da página
- **CSS3** - Estilização moderna e responsiva
- **JavaScript (ES6+)** - Lógica e interatividade
- **Chart.js** - Biblioteca para criação de gráficos

## 📊 Formato dos Dados

O arquivo `speedtests.json` deve conter um array de objetos com a seguinte estrutura:

```json
{
  "id": 1898,
  "serverId": 71808,
  "ping": 2,
  "download": 427.94,
  "upload": 535.67,
  "type": "auto",
  "resultId": "de6298e1-488a-42be-ba21-b0649275807e",
  "time": 7,
  "created": "2025-11-22T13:00:14.173Z"
}
```

## 🎨 Características do Design

- Interface moderna e limpa
- Design responsivo (funciona em desktop, tablet e mobile)
- Cores vibrantes e gradientes
- Animações suaves
- Cards com efeito hover

## ⚠️ Notas Importantes

- Certifique-se de que o arquivo `speedtests.json` está no mesmo diretório que `index.html`
- Para grandes volumes de dados, use o filtro de pontos para melhorar a performance
- O dashboard funciona melhor em navegadores modernos (Chrome, Firefox, Edge, Safari)

