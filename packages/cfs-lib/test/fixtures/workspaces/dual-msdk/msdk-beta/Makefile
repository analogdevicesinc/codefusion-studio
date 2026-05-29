# Mock MSDK Makefile for testing - msdk-beta project
# This file contains MSDK_PATH marker for workspace detection

MSDK_PATH ?= /mock/msdk/path
MAXIM_PATH ?= $(MSDK_PATH)

TARGET ?= MAX32655
BOARD ?= FTHR_RevA
PROJECT ?= msdk-beta

.PHONY: all build clean

all: build

build:
	@echo "Building $(PROJECT) $(TARGET) for $(BOARD)"

clean:
	@echo "Cleaning $(PROJECT) build artifacts"
