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

"""
Minimalistic utils for running tests.
"""

import subprocess


class ProtoLogger:
    def __init__(self):
        self.empty = True
        self.verbose = False

    def error(self, *args):
        self.empty = False
        self.print(*args)

    def info(self, *args):
        if self.verbose:
            self.print("Info:", *args)


class ConsoleLogger(ProtoLogger):
    def print(self, *args):
        print(*args)


class FileLogger(ProtoLogger):
    def __init__(self, fname):
        super().__init__()
        self.fname = fname

    def print(self, *args):
        # Two benefits of this approach: a) if print is never invoked, file is not created; b) output appears immediately.
        with open(self.fname, "a") as f:
            print(*args, file=f)


def subprocess_run(args, test_args, logger, shell=False):
    # The idea of this special function is to allow the subprocess to output in real time, e.g., "capture_output = not test_args.console" is a cherry of it.
    if shell:
        check = ''.join(args)
        for c in ';`#$&*()[]{}\'"<>?!|%^\n\r\t':
            if c in check:
                raise Exception('In arguments, the following symbol found: '+c)
        # Wrap arguments containing spaces in double quotes so values like the board
        # name "FPGA 2.0.x" survive shell word-splitting. Dangerous shell metacharacters
        # (including the double quote itself) are still rejected above, so this is safe.
        args = ' '.join('"' + a + '"' if ' ' in a else a for a in args)
    if test_args.console:
        print("Running", args)
    res = subprocess.run(args, capture_output=not test_args.console, shell=shell)
    if test_args.console:
        print("Subprocess exited with code", res.returncode)
    elif res.returncode != 0 or test_args.verbose:
        logger.print("Running ", args)
        logger.print("Stdout")
        logger.print(res.stdout.decode(encoding="utf-8", errors="backslashreplace"))
        logger.print("Stderr")
        logger.print(res.stderr.decode(encoding="utf-8", errors="backslashreplace"))
        logger.print("Subprocess exited with code", res.returncode)
    return res.returncode
