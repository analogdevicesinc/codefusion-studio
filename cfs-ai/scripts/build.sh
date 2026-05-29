# Copyright (c) 2025-2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/bin/bash

# Bash script to produce a clean build of the cfsai product.

if [ "$1" != "" ]; then
  CFS=$1
  if [ ! -d ${CFS} ]; then
    echo "${CFS} not found!"
    exit 1
  fi
fi

# Build base cfsai package
rm -rf dist
uv run python scripts/package.py --package cfsai
if [ $? -ne 0 ] ; then
  exit
fi

# Extract packages and copy into kit
if [ "${CFS}" != "" ]; then
  rm -rf tmp.build
  mkdir -p tmp.build/cfsai

  tar -xf dist/cfsai-cpython-3.11-*-latest.tar.xz -C tmp.build/cfsai/

  cp -r tmp.build/* ${CFS}/Tools/
  rm -rf tmp.build
fi
