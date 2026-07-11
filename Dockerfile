FROM python:3.12-slim

WORKDIR /app

ARG APPLICATION_VERSION=1.3.2-beta.1
ARG GIT_COMMIT=unknown
ARG GIT_DIRTY=true

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV HOST=0.0.0.0 \
    PORT=8765 \
    MECHANICS_VERSION=${APPLICATION_VERSION} \
    MECHANICS_GIT_COMMIT=${GIT_COMMIT} \
    MECHANICS_GIT_DIRTY=${GIT_DIRTY}
EXPOSE 8765

CMD ["python", "run_webapp.py"]
