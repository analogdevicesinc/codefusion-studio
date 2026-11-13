@echo off
rem Copyright (c) 2026 Analog Devices, Inc.
rem Licensed under the Apache License, Version 2.0.
rem
rem git remote helper for the cfspkg:// transport (Windows).

setlocal
if not defined CFS_GIT_REMOTE_ENTRY set "CFS_GIT_REMOTE_ENTRY=%~dp0entry.js"
if not defined CFS_NODE set "CFS_NODE=node"
set ELECTRON_RUN_AS_NODE=1
"%CFS_NODE%" "%CFS_GIT_REMOTE_ENTRY%" %*
