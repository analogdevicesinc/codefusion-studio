# Copyright (c) 2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import argparse
import json
import logging
import sys

from cfsai_resource_profiler import TFLiteResourceProfiler
from cfsai_types.hardware_profile import HardwareProfile
from cfsai_types.logging import setup_logger

logger = logging.getLogger("cfsai_resource_profiler")


def _run_profile(
    model_path: str, 
    profile: HardwareProfile, 
    json_file: str, 
    text_file: str
) -> None:
    """Run resource profiler."""
    # Initialize resource profiler with performance characteristics
    profiler = TFLiteResourceProfiler()

    # Perform comprehensive resource analysis with hardware context
    profiling_report = profiler.analyze_model(
        model_path,
        hardware_profile=profile
    )

    if json_file:
        profiling_report.save_as_json(json_file)
    if text_file:
        profiling_report.save_as_text(text_file)
    if not json_file and not text_file:
        profiling_report.visualize_resource_profile()


if __name__ == "__main__":
    """
    If invoked directly, construct input from params.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True, help='Config file')
    parser.add_argument('--model', required=True, help='Model file')
    parser.add_argument('--json-file', help='Output json file')
    parser.add_argument('--text-file', help='Output text file')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()

    setup_logger(debug_level=args.verbose)

    logger.debug(f"Invoking resource profiler with: \n{args}")

    try:
        # Read JSON and parse into Pydantic model
        with open(args.file) as f:
            data = json.load(f)
            profile = HardwareProfile(**data)
            _run_profile(args.model, profile, args.json_file, args.text_file)
    except Exception as e:
        logger.error(f'{e.__class__.__name__}{e}')
        sys.exit(1)

