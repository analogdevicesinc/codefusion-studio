# MSDK CM4 Makefile for multi-platform workspace fixture

ifeq "$(MAXIM_PATH)" ""
$(error MAXIM_PATH must be specified)
endif

TARGET ?= MAX32690
BOARD ?= EvKit_V1
PROJECT ?= cm4-msdk-project

include $(MAXIM_PATH)/Libraries/Boards/$(TARGET)/$(BOARD)/board.mk
