"""
Copyright (c) 2024 Analog Devices, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

"""
Utility script to update the copyright of all sources files.
"""

import os

# Regex of files to update
ROOT_PATH = os.path.dirname(__file__)
FILE_REGEX = [ROOT_PATH + "/../../packages/ide/src/**/*.ts", ROOT_PATH + "/../../packages/ide/src/**/*.tsx", ROOT_PATH + "/../../packages/ide/src/**/*.scss", ROOT_PATH + "/../../packages/ide/cypress/**/*.ts", ROOT_PATH + "/../../packages/ide/cypress/**/*.ts"]
FILE_REGEX.extend([ROOT_PATH + "/../../packages/ide/cypress.config.ts", ROOT_PATH + "/../../packages/ide/vite*.ts"])
FILE_REGEX.extend([ROOT_PATH + "/../../packages/cfs-lib/src/**/*.ts"])
FILE_REGEX.extend([ROOT_PATH + "/../../packages/cli/src/**/*.ts", ROOT_PATH + "/../../packages/cli/test/**/*.ts"])
FILE_REGEX.extend([ROOT_PATH + "/../../packages/cli-plugins/add-codegen/src/**/*.ts", ROOT_PATH + "/../../packages/cli-plugins/add-codegen/test/**/*.ts", ROOT_PATH + "/../../packages/cli-plugins/add-soc/src/**/*.ts", ROOT_PATH + "/../../packages/cli-plugins/add-soc/test/**/*.ts"])
FILE_REGEX.extend([ROOT_PATH + "/../../packages/elf-parser/src/**/*.ts", ROOT_PATH + "/../../packages/elf-parser/test/**/*.ts"])
FILE_REGEX.extend([ROOT_PATH + "/../../packages/react-library/src/**/*.ts", ROOT_PATH + "/../../packages/react-library/src/**/*.tsx", ROOT_PATH + "/../../packages/react-library/src/**/*.scss"])

# Each file header should contain the following copyright header:
ADI_COPYRIGHT_REGEX = \
"""\\/\\*\\*
 \\*
 \\* Copyright \\(c\\) \\d{4}(-\\d{4})? Analog Devices, Inc.
 \\*
 \\* Licensed under the Apache License, Version 2.0 \\(the \"License\"\\);
 \\* you may not use this file except in compliance with the License.
 \\*
 \\* Unless required by applicable law or agreed to in writing, software
 \\* distributed under the License is distributed on an \"AS IS\" BASIS,
 \\* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 \\* See the License for the specific language governing permissions and
 \\* limitations under the License.
 \\*
 \\*\\/
"""

ADI_COPYRIGHT = """/**
 *
 * Copyright (c) {date} Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
"""

import glob
import re
from datetime import datetime


def get_files(regex_list):
    results = []
    for r in regex_list:
        results.extend(glob.glob(r, recursive=True))
    return results


def update_header(filepath):
    data = []
    header = []
    header_start = False
    header_end = False
    index = 0
    date = datetime.now().year
    with open(filepath) as file:
        for line in file:
            data.append(line)
            if line.startswith("/**"):
                header_start = True

            if header_start and not header_end:
                header.append(line)
                if line.find("*/") != -1:
                    header_end = True
                index += 1

        if len(header) > 0:
            header_string = "".join(header)
            match = re.match(ADI_COPYRIGHT_REGEX, header_string)
            if match:
                return
            else:
                m = re.search("Copyright \\(c\\) (\\d{4}(-\\d{4})?) Analog Devices, Inc", header_string)
                if m:
                    date = m.group(1)
                else:
                    # not an ADI header, so reset index to 0
                    index = 0

    with open(filepath, 'w') as file:
        file.write(ADI_COPYRIGHT.format(date=date) + "".join(data[index:]))


def test():
    for filepath in get_files(["**/*.ts", "**/*.tsx"]):
        update_header(filepath)


def run():
    for filepath in get_files(FILE_REGEX):
        update_header(filepath)


if __name__ == "__main__":
    run()
