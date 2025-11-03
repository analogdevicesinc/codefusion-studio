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

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from cfsai.backend_runtime.logger import setup_logger
from cfsai_types.backend_api import BackendApi
from cfsai_types.config.verified import VerifiedBackendConfig
from cfsai_types.exceptions import SerializedError
from cfsai_types.health import Health, HealthStatus


def backend_http_server(
        api: BackendApi,
        host: str = '0.0.0.0',
        port: int = 5000
    ) -> None:
    """
    Backend server which serves as the entry point to all containers running in 
    HTTP mode.

    Args:
        api: Backend API to implement.
        host: Local IP address to use. Defaults to 0.0.0.0.
        port: Container side port to serve on. Defaults to 5000.
    """
    app = FastAPI()
    setup_logger()

    # Add routes
    @app.post('/build')
    def build(cfg: VerifiedBackendConfig) -> None:
        """Create a build endpoint that calls the backend implementation."""
        api.build(cfg)

    @app.get('/health', response_model=Health)
    def health() -> Health:
        """Create a health endpoint that calls the implementation."""
        return Health(status=HealthStatus.ok)

    @app.exception_handler(Exception)
    async def handle_backend_error(
            request: Request,
            exc: Exception
        ) -> JSONResponse:
        """ 
        Exception handler to convert a `BackendError` to JSON that the 
        can be sent to the client.
        """
        return JSONResponse(
            status_code=500,
            content=SerializedError(
                detail=str(exc)
            ).model_dump()
        )

    uvicorn.run(app, host=host, port=port)
