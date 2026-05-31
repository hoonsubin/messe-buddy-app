FROM denoland/deno:2.8.1

ARG ACT_VERSION=0.2.88
ARG TARGETARCH

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && case "${TARGETARCH}" in \
      amd64) ACT_ARCH=x86_64 ;; \
      arm64) ACT_ARCH=arm64 ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac \
    && curl -fsSL "https://github.com/nektos/act/releases/download/v${ACT_VERSION}/act_Linux_${ACT_ARCH}.tar.gz" \
    | tar xz -C /usr/local/bin act \
    && chmod +x /usr/local/bin/act \
    && act --version
