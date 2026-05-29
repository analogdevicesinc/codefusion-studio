# Minimal MSDK Makefile fixture for testing MsdkTaskStrategy detection
# Contains MSDK_PATH marker to trigger detectsWorkspace()

ifeq "$(MSDK_PATH)" ""
$(error MSDK_PATH must be specified)
endif

TARGET ?= MAX32690
BOARD ?= EvKit_V1
PROJECT ?= msdk-test-project

include $(MSDK_PATH)/Libraries/Boards/$(TARGET)/$(BOARD)/board.mk
