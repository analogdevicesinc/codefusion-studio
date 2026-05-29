# Mock MSDK Makefile for testing
# This file contains MSDK_PATH marker for workspace detection

MSDK_PATH ?= /mock/msdk/path
MAXIM_PATH ?= $(MSDK_PATH)

TARGET ?= MAX32690
BOARD ?= EvKit_V1

.PHONY: all build clean

all: build

build:
	@echo "Building $(TARGET) for $(BOARD)"

clean:
	@echo "Cleaning build artifacts"
