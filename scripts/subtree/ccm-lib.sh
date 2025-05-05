#!/bin/bash
set -euo pipefail
#set -x

# This script is used to selectively merge the cfs-ccm-lib repository into the current repository at packages/cfs-ccm-lib.
# Usage: [CCM_LIB_URL=<URL>] ./scripts/subtree/ccm-lib.sh [GITREF]
# Before running the script either configure a git remote called cfs-ccm-lib or set the CCM_LIB_URL environment variable to the URL of the cfs-ccm-lib repository.

# Script params
GITREF=${1:-main}		# The git reference to fetch from the ccm-lib repo and merge into the current repo, defaults to main
REMOTE=cfs-ccm-lib
PACKAGE=cfs-ccm-lib
PACKAGE_DIR=packages/${PACKAGE}
START_BRANCH=$(git branch --show-current)
LOCALREF=${REMOTE}-temp-${GITREF}

# Need a remote for the ccm-lib repo
if ! git remote show "${REMOTE}" >/dev/null 2>&1; then
	if [ -z "${CCM_LIB_URL}" ]; then
		echo "Please set the CCM_LIB_URL environment variable to the URL of the cfs-ccm-lib repository or configure a git remote called ${REMOTE} before running this script."
		exit 1
	fi

	# Add the remote, set main as the branch to track to prevent default behaviour of tracking all branches, we'll fetch the ref we want explicitly
	git remote add -t main "${REMOTE}" "${CCM_LIB_URL}"
fi

# Check if anything is already staged
# (Its not possible to selectively commit from the index)
if ! git diff --cached --quiet; then
	echo "There are staged changes, please commit or stash them before running this script."
	exit 1
fi

# For the commit message
REMOTE_URL=$(git remote get-url "${REMOTE}")

# Make sure we're running from the root of the repository
ROOT_DIR=$(git rev-parse --show-toplevel)
if [ "${ROOT_DIR}" != "$(pwd)" ]; then
	echo "Please run this script from the root of the repository."
	exit 1
fi

cleanup() {
	# Remove temporary branch on exit
	git branch -D "${LOCALREF}" 2>/dev/null
}
trap cleanup EXIT

# fetch the remote ref and alias it to a local branch
git fetch "${REMOTE}" "+${GITREF}:${LOCALREF}"

# get the latest commit hash of the ref for the commit message
REMOTE_HASH=$(git rev-parse --short "${LOCALREF}")

# Check we've (probably) got the right content
PKG_JSON=$(git show "${LOCALREF}:${PACKAGE_DIR}/package.json")
PKG_NAME=$(jq -r '.name' <<< "${PKG_JSON}")
PKG_VER=$(jq -r '.version' <<< "${PKG_JSON}")
if [ "${PKG_NAME}" != "${PACKAGE}" ]; then
	echo "Package name \"${PKG_NAME}\" in package.json does not match expected package name \"${PACKAGE}\""
	exit 1
fi

# clear the current contents of the package directory (updates the index and working tree)
git rm -r -q --ignore-unmatch "${PACKAGE_DIR}"
# checkout the package directory from the temporary branch (updates the index and working tree)
git checkout "${LOCALREF}" -- "${PACKAGE_DIR}"
# make sure any changed dependencies are updated in the lockfile
yarn install
git add -u yarn.lock
# commit the changes
git commit -v -s --no-edit -m "feat(${PACKAGE}): Use v${PKG_VER} in ${PACKAGE_DIR}" \
	-m "Checked ${PACKAGE_DIR} from ${REMOTE_URL}@${GITREF}(${REMOTE_HASH}) into ${START_BRANCH}:/${PACKAGE_DIR}"

