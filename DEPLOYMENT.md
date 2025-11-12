# Deployment Instructions

## Overview

This document describes the complete deployment process for the Divine Trinity Messenger application in production using Docker containers and GitHub Actions CI/CD.

## Prerequisites
- Docker installed
- Docker Compose installed
- Access to the GitHub repository
- Required secrets set in GitHub repository settings

## Steps

### 1. Clone the repository:
```bash
git clone https://github.com/alexandros-thomson/divine-trinity-messenger.git
cd divine-trinity-messenger
```

### 2. Copy Environment File
```bash
cp .env.example .env
```
Update `.env` with real credentials.

### 3. Build Containers
```bash
docker-compose build
```

### 4. Run Containers
```bash
docker-compose up -d
```

### 5. Deploy via GitHub Actions
- Push to `main` triggers CI and deploy:
    - Linting
    - Test
    - Docker build
    - Push to registry (optional)
    - Deploy

### 6. Monitor Application
- Check logs:
```bash
docker-compose logs -f
```

## Troubleshooting
- Check `.env` values
- Review GitHub Actions logs
- Inspect Docker logs

## References
- [Quickstart](./QUICKSTART.md)
- [README](./README.md)

---
