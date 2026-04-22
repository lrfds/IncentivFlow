@echo off
echo [1] Resetando configuracoes de seguranca...
git config --local core.sshCommand ""

echo [2] Configurando Remoto para HTTPS...
git remote remove origin 2>nul
git remote add origin https://github.com/lrfds/IncentivFlow.git

echo [3] Adicionando e Commitando...
git add .
git commit -m "feat: complete IncentivFlow infrastructure"

echo [4] Tentando push via HTTPS...
git branch -M main
git push -f -u origin main

pause
