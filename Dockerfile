FROM python:3.12-slim

WORKDIR /app

ARG APPLICATION_VERSION=1.5.0-alpha.1
ARG GIT_COMMIT=unknown
ARG GIT_DIRTY=true

COPY requirements.txt ./
RUN pip install \
    --default-timeout=300 \
    --retries 10 \
    -i https://mirrors.aliyun.com/pypi/simple/ \
    --no-cache-dir \
    -r requirements.txt

COPY . .

ENV HOST=0.0.0.0 \
    PORT=8765 \
    MECHANICS_VERSION=${APPLICATION_VERSION} \
    MECHANICS_GIT_COMMIT=${GIT_COMMIT} \
    MECHANICS_GIT_DIRTY=${GIT_DIRTY}
EXPOSE 8765

CMD ["python", "run_webapp.py"]
