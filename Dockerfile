FROM ubuntu:18.04

WORKDIR /work

# Install pre-requisites
RUN apt-get update && apt-get install -y gnupg2 && apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 923F6CA9 && \
    echo "deb http://ppa.launchpad.net/ethereum/ethereum/ubuntu bionic main" \
       >> /etc/apt/sources.list.d/ethereum.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
            python3.6 \
            git \
            libssl-dev \
            solc && \
    apt-get install -y \
            python3-pip && \
    rm -rf /var/lib/apt/lists/*

# We use the local Git submodule for the Raiden build.
COPY raiden/ raiden/

# Build Raiden client
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
RUN cd raiden && \
    pip3 install --upgrade -r requirements.txt && \
    pip3 install setuptools_scm==1.15.0 && \
    python3 setup.py develop

# Build the client Web UI - seems to be non-functional at the moment.
#RUN apt-get install -y --no-install-recommends \
#            curl && \
#    curl -sL https://deb.nodesource.com/setup_7.x | bash - && \
#    apt-get install -y nodejs && \
#    cd raiden && \
#    python setup.py compile_webui && \
#    apt-get remove curl

EXPOSE 5001 40001
WORKDIR /work/raiden
ENTRYPOINT ["/usr/local/bin/raiden","--network-id=mainnet"]
