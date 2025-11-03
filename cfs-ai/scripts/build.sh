# Copyright (c) 2025 Analog Devices, Inc.
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

# Clean any previous build
rm -rf dist

# Build the packages and bootstrap
uv build --all-packages
cargo build --release --manifest-path cli/Cargo.toml

# Generate ui.json
uv run python -m cfsai export --ui > ui/ui.json

# Package everything into dist/workspace
uv run python scripts/package.py 3.11

