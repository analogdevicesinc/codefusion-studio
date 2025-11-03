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


from collections.abc import Iterator
from typing import Optional

from cfsai.container.client import ContainerClient
from cfsai.container.executor import ContainerExecutor
from cfsai_types.backend_api import (
    Backend,
    BackendApi,
    BackendProtocol,
    ContainerBackend,
    LocalBackend,
)
from cfsai_types.exceptions import SupportError


class BackendManager:
    """Class to manage the backends."""

    def __init__(self) -> None:
        """Initialize the manager."""
        self._backends: dict[str, type[Backend]] = {}
        
        from cfsai.backend_tflm import CfsaiTflm
        from cfsai_backend_max7800x import Izer
        self.register(Izer)
        self.register(CfsaiTflm)

    def register(self, backend_cls: type[Backend]) -> None:
        """
        Registers a backend implementing class with the manager.

        Args:
            backend_cls: Backend class to register.
            
        Raises:
            ValueError: If the `backend_cls` is already registered.
        """
        name = backend_cls.info().name
        if self._backends.get(name) is not None:
            raise ValueError(
                f'A backend of the name {name} already exists'
            )
        self._backends[name] = backend_cls

    def get(self, name: str) -> Optional[Backend]:
        """
        Retreive a registered `Backend` instance from the manager from its name.

        Args:
            name: Name of the backend to retrieve.

        Returns:
            Backend instance if registered, otherwise, `None`.
        """
        backend = self._backends.get(name)
        if backend:
            return backend()
        else:
            return None

    def registered_backends(self) -> list[str]:
        """
        Retrieves a list of registered backend names.

        Returns:
            List of registered backend names.
        """
        return list(self._backends.keys())

    def iter_backends(self) -> Iterator[tuple[str, type[Backend]]]:
        """
        Iterate through the registered backends.

        Yields:
            A tuple containing the backend name and the backend class.
        """
        yield from self._backends.items()

    def get_backend_api(self, name: str) -> Optional[BackendApi]:
        """
        Retrieves the `BackendApi` from the manager based on the backend name.

        Args:
            name: Name of the backend.

        Returns:
            Backend API if it could be found, otherwise `None`.

        Raises:
            SupportError: If the backend has an invalid communication protocol.
            SupportError: If the backend kind is not supported.
        """
        backend = self.get(name)
        if backend is None:
            return None
        info = backend.info()
        if isinstance(info.kind, LocalBackend):
            return backend.api()
        elif isinstance(info.kind, ContainerBackend):
            if info.kind.protocol == BackendProtocol.HTTP:
                return ContainerClient(info.kind.image)
            elif info.kind.protocol == BackendProtocol.DIRECT:
                return ContainerExecutor(info.kind.image)
            else:
                raise SupportError(f'Invalid backend protocol "{info.kind.protocol}"')
        else:
            raise SupportError(f'Invalid backend kind "{info.kind.kind}"')

__all__ = [
    "BackendManager",
]
