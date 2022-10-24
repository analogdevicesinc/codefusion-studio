###############################################################################
# Build and run the Docker Image for building VSCode extensions.
#
# To build it, run in the repository root:
#   docker build -t vscode-extension-node-18:latest .
#
# To run a build:
#  docker run -it --rm -v ${PWD}:/opt/app vscode-extension-node-18:latest
#

FROM node:18-alpine
RUN apk add --update-cache libsecret
RUN npm install -g @vscode/vsce
RUN mkdir -p /.npm /.yarn /.cache/yarn
RUN chmod a+rwx -R /.npm /.yarn /.cache/yarn
WORKDIR /opt/app
