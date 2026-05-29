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


# Build tflite library and zip up for use in cfsai package. 
# Note: The build downloads some packages, so we need to do the copy after the build. 
# Note: This only works on Linux/WSL. The make fails for me on Windows even under Bash.

# Usage
# sh scripts/generate_tflm_cortex.sh [CFS=<path>] [HASH=<hash>]

#!/bin/bash

for arg in "$@"; do
  case $arg in
    CFS=*)
      CFS_DIR="${arg#*=}"
      ;;
    HASH=*)
      HASH="${arg#*=}"
      ;;
    *)
      echo "Error unexpected arg: ${arg}"
      exit 1
      ;;
    esac
done


# Use local output dir for now, but we'll eventually want this to go into SDK/Tools/or similar. 
START=`pwd`
BUILD_DIR=${START}/tflibs
OUT_DIR=${START}/tflibs/lib
PACKAGE_DIR=${START}/platforms/cortex-m/lib/tflite-micro

# Use arg for CFS_DIR if provided
if [ -n "${CFS_DIR}" ]; then 
  if [ ! -d "${CFS_DIR}" ]; then
    echo "Error: ${CFS_DIR} not found"
    exit 1
  fi
else
  # Or default and attempt to download if missing
  CFS_VER=2.0.0
  CFS_DIR=~/analog/cfs/${CFS_VER}
  if [ ! -d "${CFS_DIR}" ]; then
    echo "CFS not installed at ${CFS_DIR}. Downloading..."
    wget https://download.analog.com/codefusion-studio/${CFS_VER}/CodeFusionStudio_${CFS_VER}.run
    chmod a+x CodeFusionStudio_${CFS_VER}.run
    ./CodeFusionStudio_${CFS_VER}.run
  fi
fi

if [ `uname` != "Linux" ]; then
  echo "This script needs to run on Linux (or WSL)"
  exit 1
fi

if [ -z "${OUT_DIR}" ]; then
  echo "No out dir specified"
  exit 1
fi
rm -rf ${OUT_DIR}
mkdir -p ${OUT_DIR}/cortex-m/tflite-micro
mkdir -p ${BUILD_DIR}

cd ${BUILD_DIR}

# Sort out the source repo
if [ ! -d tflite-micro ]; then
  echo "tflite-micro repo not present. Downloading..."
  git clone https://github.com/tensorflow/tflite-micro.git
  cd tflite-micro
else
  echo "tflite-micro repo present. Cleaning..."
#  git clean -fdx
  cd tflite-micro
fi

if [ -n "${HASH}" ]; then
  echo "Checking out hash ${HASH}..."
  git checkout ${HASH}
  if [ 0 -ne $? ] ; then
    echo "git checkout of hash ${HASH} failed"
    exit 1
  fi
fi


# tflite-micro repo doesn't have any branches or tags, so record the hash and date
GIT_HASH=`git log -n 1 --format=%H`
GIT_DATE=`git log -n 1 --format=%ai`
echo "tflite-micro repo based on hash ${GIT_HASH} on ${GIT_DATE}" > git_version.txt

echo "Building libs..."
for ARCH in cortex-m4 cortex-m33 cortex-m55; do
  make -j8 -f tensorflow/lite/micro/tools/make/Makefile TARGET=cortex_m_generic TARGET_ARCH=${ARCH} OPTIMIZED_KERNEL_DIR=cmsis_nn TARGET_DEFAULT_TOOLCHAIN_ROOT=${CFS_DIR}/Tools/gcc/arm-none-eabi/bin/ microlite
done

echo "Constructing package..."
# Copy library content into output dir
cp -r * ${OUT_DIR}/cortex-m/tflite-micro
for ARCH in m4 m33 m55; do
  LIBFILE=gen/cortex_m_generic_cortex-${ARCH}_default_cmsis_nn_gcc/lib/libtensorflow-microlite.a 
  if [ ! -f ${LIBFILE} ]; then
    echo "Error: ${LIBFILE} not found!"
    exit 1
  fi
  mkdir -p ${OUT_DIR}/cortex-m/${ARCH}
  cp ${LIBFILE} ${OUT_DIR}/cortex-m/${ARCH}/
  ls -l ${OUT_DIR}/cortex-m/*
done

cd ${OUT_DIR}/cortex-m/tflite-micro

# Move 3rd party stuff we use out of downloads
echo "Moving 3rd party..."
rm -rf third_party/*

mkdir -p third_party/gemmlowp/fixedpoint \
         third_party/gemmlowp/internal \
         third_party/flatbuffers \
         third_party/kissfft \
         third_party/ruy/ruy/profiler

mv tensorflow/lite/micro/tools/make/downloads/gemmlowp/fixedpoint/* third_party/gemmlowp/fixedpoint/
mv tensorflow/lite/micro/tools/make/downloads/gemmlowp/internal/* third_party/gemmlowp/internal/
mv tensorflow/lite/micro/tools/make/downloads/gemmlowp/LICENSE third_party/gemmlowp/
mv tensorflow/lite/micro/tools/make/downloads/flatbuffers/include third_party/flatbuffers/
mv tensorflow/lite/micro/tools/make/downloads/flatbuffers/LICENSE third_party/flatbuffers/
mv tensorflow/lite/micro/tools/make/downloads/kissfft/* third_party/kissfft/
mv tensorflow/lite/micro/tools/make/downloads/ruy/LICENSE third_party/ruy/
mv tensorflow/lite/micro/tools/make/downloads/ruy/ruy/profiler/instrumentation.h third_party/ruy/ruy/profiler/

# Trim stuff we don't need for the user build
echo "Pruning sources..."
# Remove directories we don't need:
rm -rf -- \
  codegen gen python \
  tensorflow/lite/micro/tools \
  third_party/flatbuffers/include/flatbuffers/pch \
  signal/micro/kernels/xtensa \
  signal/testdata

# Remove all files except for the ones we need:
find . -type f ! \( \
  -name '*.cc' -o \
  -name '*.h'   -o \
  -name 'LICENSE' -o \
  -name 'git_version.txt' \
\) -delete
# Remove test files
find . -type f \( \
  -name "*_test.cc" -o \
  -name "*_tests.cc" -o \
  -name "*_test.h" \
\) -delete
# Remove any empty dirs
find . -type d -empty -delete

# Zip up output
echo "Compressing package..."
cd ${OUT_DIR}/cortex-m
zip -rq9 tflm.zip *
ls -lh tflm.zip

# Move to package location in github
mkdir -p ${PACKAGE_DIR}
mv tflm.zip ${PACKAGE_DIR}

echo "Cleaning up..."
# Clean up
rm -rf {OUT_DIR}

echo "Done"
