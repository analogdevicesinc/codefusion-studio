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


from typing import Optional

from pydantic import BaseModel


class BackendError(Exception):
    """
    Errors to do with backends. Backends can raise this error directly or
    subclass and raise their own error.

    Attributes:
        backend (str): Name of the backend which raised the error.
        msg (str): Description of the error.
    """

    def __init__(self, backend: str, msg: str) -> None:
        """
        Initializes a BackendError.

        Args:
            backend: Name of the backend
            msg: Error message
        """
        self.backend = backend
        self.msg = msg
        super().__init__(str(self))

    def __str__(self) -> str:
        """Override string conversion to pretty print error."""
        return f'[{self.backend}] {self.msg}'


class SupportError(Exception):
    """ 
    Errors to do with support. This should be raised in the case where a user 
    provided configuration is not currently supported.

    Attributes:
        msg (str): Description of the error.
        support(Optional[list[str]], optional): Optional list of the supported 
            options in the absense of what the user requested.
    """

    def __init__(self, msg: str, support: Optional[list[str]] = None) -> None:
        """
        Initializes a SupportError.

        Args:
            msg (str): Error message
            support (Optional[list[str]], optional): List of available options. 
                Defaults to None.
        """
        self.msg = msg
        
        self.support = sorted(support) if support else support
        super().__init__(str(self))

    def __str__(self) -> str:
        """Override string conversion to pretty print error."""
        if self.support:
            support_list = '\n'.join([f'  - {x}' for x in self.support])
            return f'{self.msg}\nBut the following are supported\n{support_list}'
        else:
            return self.msg


class ContainerError(Exception):
    """ 
    Errors to do with container management.

    Attributes:
        engine (str): Containerization technology/platform in use.
        image (str): Name of the image.
        msg (str): Description of the error.
    """

    def __init__(self, engine: str, image: str, msg: str) -> None:
        """
        Initializes a ContainerError.

        Args:
            engine (str): Containerization technology in use 
            image (str): Name of the image
            msg (str): Error message
        """
        self.engine = engine
        self.image = image
        self.msg = msg
        super().__init__(str(self))

    def __str__(self) -> str:
        """Override string conversion to pretty print error."""
        return f'[{self.engine}@{self.image}] {self.msg}'


class SerializedError(BaseModel):
    """ 
    Serialized error type in use by fastapi which stores the error behind an 
    additional key.
    
    Attributes:
        detail: Description of the error.
    """
    detail: str

