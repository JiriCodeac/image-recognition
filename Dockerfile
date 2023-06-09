FROM ubuntu:20.04

ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN echo 'APT::Install-Suggests "0";' >> /etc/apt/apt.conf.d/00-docker
RUN echo 'APT::Install-Recommends "0";' >> /etc/apt/apt.conf.d/00-docker
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    git \
    zip \
    unzip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
 && apt-get update \
 && apt-get install -y \
    nodejs \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

ENV PIP_DISABLE_PIP_VERSION_CHECK=on
# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE 1
# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED 1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    freeglut3-dev \
    libxcb-xinerama0 \
    python3-opencv \
    python3-pip \
    curl \
    git \
    gcc \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN cd /var/lib/ \
 && curl -L -O https://github.com/microsoft/CameraTraps/releases/download/v5.0/md_v5a.0.0.pt

ENV PYTHONPATH "${PYTHONPATH}:/var/yolov5"
RUN git clone --branch v7.0 https://github.com/ultralytics/yolov5 /var/yolov5

RUN npm config set cache /tmp/npm_cache --global

COPY requirements.txt .

RUN pip3 install -r requirements.txt --no-cache-dir

# Configure a healthcheck to validate that everything is up & running
HEALTHCHECK --timeout=10s CMD curl --silent --fail http://127.0.0.1:4000/v1/health-check
