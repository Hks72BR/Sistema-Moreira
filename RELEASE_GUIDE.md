# 📦 Guia de Release e Auto-Update

## 🎯 Como Funciona o Auto-Update

O app Electron agora verifica automaticamente por atualizações no GitHub a cada **1 hora**.

Quando uma atualização está disponível:
1. ✅ O app notifica o usuário que há uma nova versão
2. ⬇️ Baixa automaticamente em background
3. 🔔 Avisa quando está pronto para instalar
4. 🔄 Reinicia e aplica as mudanças

Usuários também podem clicar em **"Verificar Atualizações"** no menu da tray.

---

## 🚀 Como Fazer um Novo Release

### Passo 1: Atualizar a Versão

```powershell
# Edite o package.json e mude a versão (ex: 1.0.0 → 1.0.1)
# Salve e commit
git add package.json
git commit -m "chore: Atualizar versão para 1.0.1"
git push origin main
```

### Passo 2: Criar Tag no GitHub

```powershell
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

### Passo 3: Fazer Build e Publicar

```powershell
# Gera o instalador .exe e publica no GitHub Releases
npm run make:publish
```

Isso vai:
- ✅ Buildar a app (npm run build)
- ✅ Gerar o instalador Windows (.exe)
- ✅ Publicar automaticamente no GitHub Releases
- ✅ Criar os arquivos necessários para o auto-update (latest.yml)

> **Nota:** O comando `make:publish` precisa de autenticação com GitHub. Configure se necessário:
> ```powershell
> $env:GH_TOKEN = "seu_github_token"
> npm run make:publish
> ```

### Passo 4: Verificar no GitHub

Acesse: https://github.com/Hks72BR/Sistema-Moreira/releases

Você verá:
- ✅ Novo release (v1.0.1)
- ✅ Instalador (.exe)
- ✅ Arquivo latest.yml (usado pelo auto-updater)

---

## 🔧 Configuração do electron-builder

O arquivo `package.json` contém:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "Hks72BR",
      "repo": "Sistema-Moreira"
    }
  }
}
```

Isso configura o electron-builder para publicar no GitHub Releases automaticamente.

---

## 📋 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run build` | Buildar só a app Vite (frontend) |
| `npm run make` | Build Electron + instalar localmente |
| `npm run make:publish` | Build + Publicar no GitHub Releases |
| `npm run firebase:deploy` | Deploy web no Firebase Hosting |

---

## 🎁 Exemplo de Workflow Completo

```powershell
# 1. Fazer mudanças no código
# 2. Testar localmente
npm run dev:electron

# 3. Atualizar versão no package.json (ex: 1.0.1)

# 4. Commit e push
git add .
git commit -m "feat: Nova funcionalidade X"
git push origin main

# 5. Criar tag
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

# 6. Build e publicar (em CI/CD ou local)
npm run make:publish

# ✅ Pronto! Usuários receberão a atualização automaticamente
```

---

## 🐛 Troubleshooting

### "Erro ao publicar no GitHub"
- Verifique se tem permissão no repositório
- Configure um GitHub Personal Access Token:
  ```powershell
  $env:GH_TOKEN = "ghp_xxxxxxxxxxxx"
  ```

### "Auto-update não funciona"
- Verifique se o app está em versão de produção (não em dev mode)
- Verifique se há um release publicado no GitHub com o arquivo `latest.yml`
- Abra DevTools (em dev mode) para ver logs

### "Instalador não atualiza"
- Certifique-se de que rodou `npm run make:publish`
- Verifique se o arquivo `.exe` foi gerado em `/release/`

---

## 📝 Notas Importantes

1. **O auto-update só funciona em versão de produção** (não em dev mode)
2. **Usuários precisam ter a versão anterior instalada** para que o auto-update funcione
3. **O arquivo `latest.yml` é criado automaticamente** pelo electron-builder
4. **Recomendado**: Use versionamento semântico (1.0.0, 1.0.1, 1.1.0, etc.)

