# Mock MSDK Makefile for the RISC-V side of a dual-core project.
# Also contains MAXIM_PATH, so detectsWorkspace() would match — but this
# folder should be excluded by the RISCV_LOAD cross-folder check in
# discoverTasks().

MAXIM_PATH ?= /mock/msdk/path

TARGET ?= MAX32690
BOARD ?= EvKit_V1
PROJECT ?= max32690_demo_riscv

include $(MAXIM_PATH)/Libraries/CMSIS/Device/Maxim/GCC/gcc.mk
