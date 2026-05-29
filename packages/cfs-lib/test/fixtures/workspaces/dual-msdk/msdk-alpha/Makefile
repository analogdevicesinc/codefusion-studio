# Mock MSDK Makefile for testing - msdk-alpha project
# This file contains MSDK_PATH marker for workspace detection

MSDK_PATH ?= /mock/msdk/path
MAXIM_PATH ?= $(MSDK_PATH)

TARGET ?= MAX32690
BOARD ?= EvKit_V1
PROJECT ?= msdk-alpha

.PHONY: all build clean

all: build

build:
	@echo "Building $(PROJECT) $(TARGET) for $(BOARD)"

clean:
	@echo "Cleaning $(PROJECT) build artifacts"
