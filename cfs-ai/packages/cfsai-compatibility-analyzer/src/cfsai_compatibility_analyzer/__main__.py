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

from cfsai_compatibility_analyzer import CompatibilityAnalyzer
from cfsai_types.hardware_profile import HardwareProfile
from cfsai_types.logging import setup_logger

logger = logging.getLogger("cfsai_compatibility_analyzer")


def _run_compat(
    model_path: str, 
    profile: HardwareProfile, 
    json_file: str,
    dataset_path: str | None = None
) -> None:
    """Run compatibility analyzer."""
    analyzer = CompatibilityAnalyzer()
    compatibility_report = analyzer.analyze_model(
        model_path,
        profile,
        dataset_path=dataset_path
    )

    if json_file:
        compatibility_report.save_as_json(json_file)
    compatibility_report.print_report()

    if compatibility_report.has_critical_issues():
        # Return error code 10 here so differentiate between errors running (1)
        sys.exit(10)


if __name__ == "__main__":
    """
    If invoked directly, construct input from params.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True, help='Config file')
    parser.add_argument('--model', required=True, help='Model file')
    parser.add_argument('--dataset', help='Dataset file (optional)')
    parser.add_argument('--json-file', help='Output json file')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    args = parser.parse_args()

    setup_logger(debug_level=args.verbose)

    logger.debug(f"Invoking compatibility analyzer with: \n{args}")

    try:
        # Read JSON and parse into Pydantic model
        with open(args.file) as f:
            data = json.load(f)
            profile = HardwareProfile(**data)
            _run_compat(
                args.model,
                profile,
                args.json_file,
                args.dataset
            )
    except Exception as e:
        logger.error(f'{e.__class__.__name__}{e}')
        sys.exit(1)
      
