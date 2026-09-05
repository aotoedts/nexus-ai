const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMGZiZTEwMC00ZWY2LTQ5YTEtYTU0MC1iNjFjOTBkYzM0ZjYiLCJlbWFpbCI6InRlc3RlZmluYWw0MDAwQGdtYWlsLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzg2ODQzNjAxLCJleHAiOjE3ODY4NDcyMDF9.5vcRQfChmOjshSxyLwNgUGJYH9O_goQtwnFgav74TXE';
const conversationId = 'f334a960-f994-49ba-b644-e30c1f6f1c4a';

const res = await fetch('https://nexus-backend-xu40.onrender.com/api/v1/agents/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ conversationId, goal: 'liste os arquivos na raiz do projeto usando o comando ls' }),
});

const json = await res.json();
console.log('STATUS:', res.status);
console.log(JSON.stringify(json, null, 2));
