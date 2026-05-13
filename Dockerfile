FROM python:3.12-slim

WORKDIR /app

# shared doit être copié avant l'install car pyproject.toml le référence en path local
COPY shared/ shared/
COPY backend/pyproject.toml backend/pyproject.toml

RUN pip install uv && uv pip install --system -e backend/

COPY backend/app/ app/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
