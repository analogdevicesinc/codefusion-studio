# The Node + Python container used to build and test CFS docs

FROM node:20

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  fonts-freefont-ttf \
  fonts-ipafont-gothic \
  fonts-kacst \
  fonts-thai-tlwg \
  fonts-wqy-zenhei \
  git \
  gnupg \
  libxss1 \
  python3 \
  python3-pip \
  python3-dev \
  python3.11-venv \
  wget

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/chromium

# install python & dependencies
ENV VIRTUAL_ENV=/opt/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN python3 -m venv $VIRTUAL_ENV
