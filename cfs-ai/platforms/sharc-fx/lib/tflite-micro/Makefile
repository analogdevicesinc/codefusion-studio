
# Top-level Makefile

# Set shell based on platform for cross-platform compatibility
ifeq ($(OS),Windows_NT)
    SHELL := sh.exe
else
    SHELL := /bin/sh
endif

# Build type (default to Debug)
DEBUG ?= 1

# Compiler and linker settings
CC = ccfx
CXX = ccfx++

CFLAGS = -proc ADSP-SC835 -si-revision any -c -ffunction-sections -fdata-sections -mlongcalls -DCORE1
CXXFLAGS = -proc ADSP-SC835 -si-revision any -c -ffunction-sections -fdata-sections -mlongcalls -DCORE1 -std=c++17 -stdlib=libc++


#=============================================================================
# SOURCE DIRECTORIES CONFIGURATION
#=============================================================================

# Workspace directories (relative paths from project root)
PROJ_DIRS = src/tensorflow/lite/core/api src/tensorflow/lite/core/c
PROJ_DIRS += src/tensorflow/lite/experimental/microfrontend/lib
PROJ_DIRS += src/tensorflow/lite/kernels/internal/optimized
PROJ_DIRS += src/tensorflow/lite/kernels/internal/reference
PROJ_DIRS += src/tensorflow/lite/kernels/internal
PROJ_DIRS += src/tensorflow/lite/kernels
PROJ_DIRS += src/tensorflow/lite/micro/arena_allocator
PROJ_DIRS += src/tensorflow/lite/micro/kernels
PROJ_DIRS += src/tensorflow/lite/micro/memory_planner
PROJ_DIRS += src/tensorflow/lite/micro/models
PROJ_DIRS += src/tensorflow/lite/micro
PROJ_DIRS += src/tensorflow/lite/micro/tflite_bridge
PROJ_DIRS += src/tensorflow/lite/schema
PROJ_DIRS += src/third_party/kissfft
PROJ_DIRS += src/third_party/kissfft/tools

#=============================================================================
# BUILD CONFIGURATION
#=============================================================================

# Build configuration
ifeq ($(DEBUG), 1)
    BUILD_TYPE = Debug
    CFLAGS += -g -D_DEBUG -DADI_DEBUG
    CXXFLAGS += -g -D_DEBUG -DADI_DEBUG
    $(info Building in DEBUG mode)
else
    BUILD_TYPE = Release
    CFLAGS += -O3 -LNO:simd -DNDEBUG
    CXXFLAGS += -O3 -LNO:simd  -DNDEBUG
    $(info Building in RELEASE mode)
endif

BUILD_DIR = build
OBJ_DIR = $(BUILD_DIR)/obj


# Include project-specific Makefile.
PROJECTMK ?= $(abspath ./project.mk)
include $(PROJECTMK)
$(info Loaded project.mk)

#=============================================================================
# DYNAMIC SOURCE DISCOVERY
#=============================================================================

# Function to normalize path for variable names (replace / and : with _)
normalize_path = $(subst :,_,$(subst /,_,$(subst \,_,$(1))))

# Discover workspace source files
define discover_sources
$(foreach dir,$(PROJ_DIRS),$(wildcard $(dir)/*.c $(dir)/*.cc $(dir)/*.cpp))
endef

# Discover external source files
define discover_external_sources
$(foreach base,$(EXTERNAL_BASES),\
	$(foreach subdir,$(shell find "$(base)" -type d 2>/dev/null),\
	$(wildcard $(subdir)/*.c $(subdir)/*.cc $(subdir)/*.cpp)))
endef

# Get all workspace source files
PROJ_C_SRCS = $(filter %.c,$(call discover_sources))
PROJ_CXX_SRCS = $(filter %.cc %.cpp,$(call discover_sources))

# Get all external source files
EXT_ALL_SRCS = $(call discover_external_sources)
EXT_C_SRCS = $(filter %.c,$(EXT_ALL_SRCS))
EXT_CXX_SRCS = $(filter %.cc %.cpp,$(EXT_ALL_SRCS))

# Combined source files
C_SRCS = $(PROJ_C_SRCS) $(EXT_C_SRCS)
CXX_SRCS = $(PROJ_CXX_SRCS) $(EXT_CXX_SRCS)
ALL_SRCS = $(C_SRCS) $(CXX_SRCS)

#=============================================================================
# INCLUDE PATHS
#=============================================================================

# Base includes
BASE_INCLUDES = -I src/system

# Auto-discover external include paths
# EXTERNAL_INCLUDES = $(foreach base,$(EXTERNAL_BASES),-I "$(base)" $(foreach subdir,$(shell find "$(base)" -type d 2>/dev/null | head -20),-I "$(subdir)"))
EXTERNAL_INCLUDES = 

# Include paths for the TFLM header files
TFLM_INCLUDES =  -I src -I src/tensorflow/lite/kernels/internal/optimized 
TFLM_INCLUDES += -I src/third_party -I src/third_party/kissfft
TFLM_INCLUDES += -I src/third_party/kissfft/tools
TFLM_INCLUDES += -I src/third_party/flatbuffers/include
TFLM_INCLUDES += -I src/third_party/gemmlowp 
TFLM_INCLUDES += -I src/third_party/gemmlowp/internal
TFLM_INCLUDES += -I src/third_party/ruy/ruy/profiler
TFLM_INCLUDES += -I src/third_party/ruy -I src/third_party/gemmlowp/fixedpoint

# All includes
INCLUDES += $(BASE_INCLUDES) $(TFLM_INCLUDES)


#=============================================================================
# OBJECT FILE GENERATION
#=============================================================================

# Generate workspace object file paths
# src/file.c -> build/obj/src/file.o
PROJ_C_OBJS = $(patsubst %.c,$(OBJ_DIR)/%.o,$(filter %.c,$(PROJ_C_SRCS)))
PROJ_CXX_OBJS = $(patsubst %.cc,$(OBJ_DIR)/%.o,$(filter %.cc,$(PROJ_CXX_SRCS)))
PROJ_CXX_OBJS += $(patsubst %.cpp,$(OBJ_DIR)/%.o,$(filter %.cpp,$(PROJ_CXX_SRCS)))

# Generate external object file paths with base directory preservation
# c:/somewhere/else/ldscripts/file.c -> build/Debug/obj/ext/c_somewhere_else/ldscripts/file.o
define make_ext_obj_path
	$(patsubst $(1)/%,$(OBJ_DIR)/ext/$(call normalize_path,$(1))/%,$(2))
endef

# Generate external object paths for each base directory
EXT_C_OBJS = $(foreach base,$(EXTERNAL_BASES),\
	$(call make_ext_obj_path,$(base),$(patsubst %.c,%.o,$(filter $(base)/%,$(EXT_C_SRCS)))))

EXT_CXX_OBJS = $(foreach base,$(EXTERNAL_BASES),\
	$(call make_ext_obj_path,$(base),$(patsubst %.cc,%.o,$(filter $(base)/%.cc,$(EXT_CXX_SRCS)))))

EXT_CXX_OBJS += $(foreach base,$(EXTERNAL_BASES),\
	$(call make_ext_obj_path,$(base),$(patsubst %.cpp,%.o,$(filter $(base)/%.cpp,$(EXT_CXX_SRCS)))))

# All object files
ALL_OBJS = $(PROJ_C_OBJS) $(PROJ_CXX_OBJS) $(EXT_C_OBJS) $(EXT_CXX_OBJS)

# Target executable
TARGET = libTFLM.a
	
#=============================================================================
# COMPILATION RULES
#=============================================================================

# Workspace C files
$(OBJ_DIR)/%.o: %.c
	@echo "Invoking: CodeFusion SHARC-FX C Compiler"
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

# Workspace C++ files
$(OBJ_DIR)/%.o: %.cc
	@echo "Invoking: CodeFusion SHARC-FX C++ Compiler"
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

$(OBJ_DIR)/%.o: %.cpp
	@echo "Invoking: CodeFusion SHARC-FX C++ Compiler"
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

# External C files - dynamic rules for each base
define make_ext_c_rule
$(OBJ_DIR)/ext/$(call normalize_path,$(1))/%.o: $(1)/%.c
	@mkdir -p $$(dir $$@)
	$$(CC) $$(CFLAGS) $$(INCLUDES) -c $$< -o $$@
endef

$(foreach base,$(EXTERNAL_BASES),$(eval $(call make_ext_c_rule,$(base))))

# External C++ files - dynamic rules for each base
define make_ext_cxx_rule
$(OBJ_DIR)/ext/$(call normalize_path,$(1))/%.o: $(1)/%.cc
	@mkdir -p $$(dir $$@)
	$$(CXX) $$(CXXFLAGS) $$(INCLUDES) -c $$< -o $$@

$(OBJ_DIR)/ext/$(call normalize_path,$(1))/%.o: $(1)/%.cpp
	@mkdir -p $$(dir $$@)
	$$(CXX) $$(CXXFLAGS) $$(INCLUDES) -c $$< -o $$@
endef

$(foreach base,$(EXTERNAL_BASES),$(eval $(call make_ext_cxx_rule,$(base))))

#=============================================================================
# BUILD TARGETS
#=============================================================================

# Default target
.PHONY: all
all: link

# Linking step
link: $(TARGET)

$(TARGET): $(ALL_OBJS)
	@echo "Invoking: CodeFusion SHARC-FX C++ Archiver"
	@mkdir -p $(BUILD_DIR)
	xt-ar -r $(TARGET) $(ALL_OBJS)

# Build type targets
.PHONY: debug release
debug:
	@$(MAKE) DEBUG=1

release:
	@$(MAKE) DEBUG=0

#=============================================================================
# INFORMATION AND DEBUGGING TARGETS
#=============================================================================

# Detailed build information
.PHONY: info
info:
	@echo "=================================="
	@echo "BUILD CONFIGURATION"
	@echo "=================================="
	@echo "Project: $(PROJECT)"
	@echo "Build Type: $(BUILD_TYPE)"
	@echo "Target: $(TARGET)"
	@echo "Build Dir: $(BUILD_DIR)"
	@echo "Object Dir: $(OBJ_DIR)"
	@echo "DEBUG flag: $(DEBUG)"
	@echo
	@echo "=================================="
	@echo "DIRECTORIES"
	@echo "=================================="
	@echo "Workspace:"
	@$(foreach dir,$(PROJ_DIRS),echo "  $(dir)";)
	@echo
	@echo "External Bases:"
	@$(foreach base,$(EXTERNAL_BASES),echo "  $(base)";)
	@echo
	@echo "=================================="
	@echo "SOURCE FILES"
	@echo "=================================="
	@echo "Workspace C: $(words $(PROJ_C_SRCS)) files"
	@$(foreach src,$(PROJ_C_SRCS),echo "  $(src)";)
	@echo
	@echo "Workspace C++: $(words $(PROJ_CXX_SRCS)) files"
	@$(foreach src,$(PROJ_CXX_SRCS),echo "  $(src)";)
	@echo
	@echo "External C: $(words $(EXT_C_SRCS)) files"
	@$(foreach src,$(EXT_C_SRCS),echo "  $(src)";)
	@echo
	@echo "External C++: $(words $(EXT_CXX_SRCS)) files"
	@$(foreach src,$(EXT_CXX_SRCS),echo "  $(src)";)
	@echo
	@echo "Total: $(words $(ALL_SRCS)) source files"

# Show discovered external structure
.PHONY: show-external
show-external:
	@echo "External Directory Structure:"
	@$(foreach base,$(EXTERNAL_BASES),\
		echo "$(base):"; \
		find "$(base)" -type f \( -name "*.c" -o -name "*.cc" -o -name "*.cpp" -o -name "*.h" -o -name "*.hpp" \) 2>/dev/null | \
		sed 's|^$(base)/|  |' | sort;)

# List all object files
.PHONY: list-objs
list-objs:
	@echo "Object files ($(words $(ALL_OBJS)) total):"
	@echo
	@echo "Workspace Objects ($(words $(PROJ_C_OBJS) $(PROJ_CXX_OBJS))):"
	@$(foreach obj,$(PROJ_C_OBJS) $(PROJ_CXX_OBJS),echo "  $(obj)";)
	@echo
	@echo "External Objects ($(words $(EXT_C_OBJS) $(EXT_CXX_OBJS))):"
	@$(foreach obj,$(EXT_C_OBJS) $(EXT_CXX_OBJS),echo "  $(obj)";)

#=============================================================================
# CLEAN TARGETS
#=============================================================================

# Clean current build type
.PHONY: clean
clean:
	@echo "Cleaning $(BUILD_TYPE) build..."
	@rm -rf $(BUILD_DIR)
	@echo " $(BUILD_TYPE) build cleaned"

# Clean all build types
.PHONY: clean-all
clean-all:
	@echo " Cleaning all builds..."
	@rm -rf build
	@echo " All builds cleaned"

# Rebuild (clean + build)
.PHONY: rebuild
rebuild: clean all

#=============================================================================
# HELP TARGET
#=============================================================================

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all (default) - Build the project"
	@echo "  debug         - Build in debug mode"
	@echo "  release       - Build in release mode"
	@echo "  clean         - Clean current build type"
	@echo "  clean-all     - Clean all build types"
	@echo "  rebuild       - Clean and rebuild current build type"
	@echo "  info          - Show detailed build configuration"
	@echo "  show-external - Show external directory structure"
	@echo "  list-objs     - List all object files"
	@echo "  help          - Show this help"
