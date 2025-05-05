# The Node container used to build CFS extensions
#
# To refresh the image:
#
#     docker build . -t artifactory.analog.com:6556/cfs-build -f .devcontainer/build/Dockerfile --platform=linux/amd64
#     docker login artifactory.analog.com:6556
#     docker image push artifactory.analog.com:6556/cfs-build:latest

FROM node:20

# install python & dependencies
RUN apt-get update && apt-get install -y \
	curl \
	git \
	libharfbuzz-subset0 \
	libpango-1.0-0 \
	libpangoft2-1.0-0 \
	p7zip-full \
	python3 \
	python3-pip \
	python3.11-venv \
	weasyprint \
	zip

ENV VIRTUAL_ENV=/opt/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN python3 -m venv $VIRTUAL_ENV
