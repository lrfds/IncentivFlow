@echo off
echo [1] Limpando cache do Git...
if exist .git (
    rmdir /s /q .git
)
echo [2] Inicializando novo repositorio...
git init
echo [3] Adicionando TODOS os arquivos...
git add -A
echo [4] Verificando o que foi adicionado:
git status
echo [5] Criando commit...
git commit -m "Initial commit - Enterprise Architecture"
echo [6] Conectando ao GitHub...
git remote add origin https://github.com/lrfds/IncentivFlow.git
git branch -M main
echo [7] Enviando (FORCE PUSH)...
git push -f -u origin main
echo.
if %errorlevel% neq 0 (
    echo [!!!] O ENVIO FALHOU!
    echo Provavelmente voce precisa se logar. Tente rodar: git config --global user.email "seu-email@exemplo.com"
) else (
    echo [OK] TUDO ENVIADO! Atualize a pagina do GitHub agora.
)
pause