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


"""
Dataclass representation of command line arguments for MAX7800X CNN Generator
"""
from dataclasses import dataclass, field
from typing import Optional, List, Union
from . import camera
from .tornadocnn import MAX_MAX_LAYERS
from .devices import device


@dataclass
class CNNGeneratorArgs:
    """
    Dataclass containing all command line arguments for the MAX7800X CNN Generator.
    """
    
    # Device selection (required)
    device: Optional[Union[int, str]] = None
    
    # Hardware features
    avg_pool_rounding: bool = False
    simple1b: bool = False
    
    # Embedded code
    embedded_code: Optional[bool] = True
    rtl_preload: bool = False
    rtl_preload_weights: bool = False
    pipeline: Optional[bool] = None
    pll: Optional[bool] = None
    balance_speed: bool = True
    clock_divider: Optional[int] = None
    config_file: Optional[str] = None  # required
    checkpoint_file: Optional[str] = None
    board_name: str = 'EvKit_V1'
    display_checkpoint: bool = False
    prefix: Optional[str] = None  # required
    debugwait: int = 2
    define: str = ''
    define_default_arm: str = 'MXC_ASSERT_ENABLE ARM_MATH_CM4'
    define_default_riscv: str = 'MXC_ASSERT_ENABLE RV32'
    eclipse_includes: str = ''
    eclipse_variables: str = ''
    eclipse_openocd_args: str = '-f interface/cmsis-dap.cfg -f target/##__TARGET_LC__##.cfg'
    
    # Code generation
    overwrite: bool = False
    compact_data: bool = True
    compact_weights: bool = False
    mexpress: Optional[bool] = None
    mlator: bool = False
    unroll_mlator: int = 8
    unroll_8bit: int = 1
    unroll_wide: int = 8
    softmax: bool = False
    unload: Optional[bool] = None
    generate_kat: bool = True
    boost: Optional[List[int]] = None
    start_layer: int = 0
    wfi: bool = True
    timer: Optional[int] = None
    no_timer: bool = False
    energy: bool = False
    enable_delay: Optional[int] = None
    output_width: Optional[int] = None
    no_deduplicate_weights: bool = False
    no_warn_zero: bool = False
    
    # File names
    c_filename: Optional[str] = None
    api_filename: str = 'cnn.c'
    weight_filename: str = 'weights.h'
    sample_filename: str = 'sampledata.h'
    sample_input: Optional[str] = None
    result_filename: Optional[str] = None
    result_numpy: Optional[str] = None
    
    # Streaming and FIFOs
    fifo: bool = False
    fast_fifo: bool = False
    fast_fifo_quad: bool = False
    fifo_wait: bool = True
    fifo_go: bool = False
    slow_load: int = 0
    debug_new_streaming: bool = True
    
    # RISC-V
    riscv: bool = False
    riscv_flash: Optional[bool] = None
    riscv_cache: Optional[bool] = None
    riscv_debug: bool = False
    riscv_exclusive: bool = False
    
    # Debug and Logging
    verbose: bool = False
    log: Optional[bool] = None
    display_progress: bool = True
    log_intermediate: bool = False
    log_pooling: bool = False
    verbose_all: bool = True
    log_filename: str = 'log.txt'
    debug: bool = False
    debug_computation: bool = False
    debug_latency: bool = False
    no_error_stop: bool = False
    stop_after: Optional[int] = None
    skip_checkpoint_layers: int = 0
    skip_yaml_layers: int = 0
    stop_start: bool = False
    one_shot: bool = False
    repeat_layers: int = 1
    clock_trim: Optional[List[int]] = None
    fixed_input: bool = False
    reshape_inputs: bool = False
    forever: bool = False
    link_layer: bool = False
    rd_ahead: bool = False
    calcx4: bool = False
    ext_rdy: bool = False
    weight_start: int = 0
    ignore_bias_groups: bool = False
    kernel_format: str = '{0:4}'
    debug_snoop: bool = False
    snoop_loop: bool = False
    ignore_hw_limits: bool = False
    ignore_bn: bool = False
    ignore_activation: bool = False
    ignore_energy_warning: bool = False
    ignore_mlator_warning: bool = False
    new_kernel_loader: bool = True
    weight_input: Optional[str] = None
    bias_input: Optional[str] = None
    
    # RTL simulation
    input_csv: Optional[str] = None
    input_csv_format: int = 888
    input_csv_retrace: int = camera.RETRACE
    input_csv_period: int = 80
    input_pix_clk: int = 9
    input_sync: bool = False
    input_fifo: bool = False
    autogen: str = 'None'
    autogen_list: str = 'autogen_list'
    input_filename: str = 'input'
    output_filename: str = 'output'
    output_config_filename: str = 'config'
    output_data_filename: str = 'data'
    output_weights_filename: str = 'weights'
    output_bias_filename: str = 'bias'
    output_pass_filename: Optional[str] = None
    runtest_filename: str = 'run_test.sv'
    legacy_test: bool = False
    legacy_kernels: bool = False
    test_bist: bool = False
    test_dir: Optional[str] = None  # required
    top_level: str = 'cnn'
    queue_name: Optional[str] = None
    timeout: Optional[int] = None
    result_output: bool = False
    
    # Streaming tweaks
    overwrite_ok: bool = False
    override_start: Optional[int] = None
    increase_start: int = 2
    override_rollover: Optional[int] = None
    override_delta1: Optional[int] = None
    increase_delta1: int = 0
    override_delta2: Optional[int] = None
    increase_delta2: int = 0
    ignore_streaming: bool = False
    allow_streaming: bool = False
    no_bias: Optional[List[int]] = None
    streaming_layers: Optional[List[int]] = None
    
    # Power saving
    powerdown: bool = False
    deepsleep: bool = False
    
    # Hardware settings
    max_proc: Optional[int] = None
    input_offset: Optional[int] = None
    verify_writes: bool = False
    verify_kernels: bool = False
    mlator_noverify: bool = False
    write_zero_registers: bool = False
    init_tram: bool = False
    zero_sram: bool = False
    pretend_zero_sram: bool = False
    zero_unused: bool = False
    apb_base: Optional[int] = None
    ready_sel: Optional[int] = None
    ready_sel_fifo: Optional[int] = None
    ready_sel_aon: Optional[int] = None
    
    # Various
    input_split: int = 1
    synthesize_input: Optional[int] = None
    synthesize_words: int = 8
    max_count: Optional[int] = None
    no_version_check: bool = False
    version_check_interval: int = 24
    upstream: str = "MaximIntegratedAI/ai8x-synthesis"
    yamllint: str = 'yamllint'
    no_scale_output: bool = False

    # Custom cfsai additions
    input_shape: Optional[list[int]] = None
    
    def __post_init__(self):
        """
        Apply post-processing logic that was originally in get_parser().
        This mimics the argument processing done after parser.parse_args().
        """
        # Post-processing logic from original get_parser function
        if self.rtl_preload:
            self.embedded_code = False
            
        if self.verify_kernels or (self.verify_writes and self.new_kernel_loader) \
           or self.mexpress is not None:
            self.rtl_preload_weights = False
            
        if self.rtl_preload_weights:
            self.mexpress = False
            
        if self.embedded_code is None:
            self.embedded_code = True
            
        if not self.embedded_code:
            self.softmax = False
            self.energy = False
            
        if self.mexpress is None:
            self.mexpress = True
            
        if self.mlator:
            self.result_output = False

        if not self.c_filename:
            self.c_filename = 'main' if self.embedded_code else 'test'

        # Set defaults
        if self.log is None:
            self.log = True
        if self.unload is None:
            self.unload = True

        # Process no_bias
        if self.no_bias is None:
            self.no_bias = []
        elif isinstance(self.no_bias, str):
            try:
                self.no_bias = [int(s) for s in self.no_bias.split(',')]
            except ValueError as exc:
                raise ValueError('ERROR: Argument `no_bias` must be a comma-separated '
                               'list of integers only, or no argument') from exc

        # Process clock_trim
        if self.clock_trim is not None:
            clock_trim_error = False
            try:
                if isinstance(self.clock_trim, str):
                    self.clock_trim = [int(s, 0) for s in self.clock_trim.split(',')]
                if len(self.clock_trim) != 3:
                    clock_trim_error = True
            except (ValueError, TypeError):
                clock_trim_error = True
            if clock_trim_error:
                raise ValueError('ERROR: Argument `clock_trim` must be a comma-separated '
                               'list of three hexadecimal values (use 0 to ignore a value)')

        # Process boost
        if self.boost is not None:
            boost_error = False
            try:
                if isinstance(self.boost, str):
                    self.boost = [int(s, 0) for s in self.boost.split('.')]
                if len(self.boost) != 2:
                    boost_error = True
            except (ValueError, TypeError):
                boost_error = True
            if boost_error:
                raise ValueError('ERROR: Argument `boost` must be a port.pin')

        # Process streaming_layers
        if self.streaming_layers is not None:
            try:
                if isinstance(self.streaming_layers, str):
                    self.streaming_layers = [int(s, 0) for s in self.streaming_layers.split(',')]
            except ValueError as exc:
                raise ValueError('ERROR: Argument `streaming_layers` must be a comma-separated '
                               'list of integers only') from exc

        if self.top_level == 'None':
            self.top_level = None

        if self.riscv_flash is None:
            self.riscv_flash = self.riscv
        if self.riscv_cache is None:
            self.riscv_cache = self.riscv

        if self.result_filename is None:
            self.result_filename = 'sampleoutput.h' if self.embedded_code else None
        elif isinstance(self.result_filename, str) and self.result_filename.lower() == 'none':
            self.result_filename = None

        # Process defines
        if self.define != '':
            self.define = "-D" + " -D".join(self.define.split(' '))

        if self.define_default_arm != '':
            self.define_default_arm = "-D" + " -D".join(self.define_default_arm.split(' '))

        if self.define_default_riscv != '':
            self.define_default_riscv = "-D" + " -D".join(self.define_default_riscv.split(' '))

        if self.no_timer:
            self.timer = None

        if self.timer is not None and self.energy:
            # This would be a warning in the original code
            self.timer = None

        if isinstance(self.yamllint, str) and self.yamllint.lower() == 'none':
            self.yamllint = None

        # sort device
        if isinstance(self.device, str):
            self.device = device(self.device)

    @classmethod
    def from_parser_args(cls, args) -> 'CNNGeneratorArgs':
        """
        Create a CNNGeneratorArgs instance from argparse.Namespace object.
        
        Args:
            args: argparse.Namespace object from parser.parse_args()
            
        Returns:
            CNNGeneratorArgs instance with all fields populated from args
        """
        # Create a dictionary of all argument values
        args_dict = {}
        
        # Map all the arguments from the namespace
        field_mapping = {
            'device': 'device',
            'avg_pool_rounding': 'avg_pool_rounding',
            'simple1b': 'simple1b',
            'embedded_code': 'embedded_code',
            'rtl_preload': 'rtl_preload',
            'rtl_preload_weights': 'rtl_preload_weights',
            'pipeline': 'pipeline',
            'pll': 'pll',
            'balance_speed': 'balance_speed',
            'clock_divider': 'clock_divider',
            'config_file': 'config_file',
            'checkpoint_file': 'checkpoint_file',
            'board_name': 'board_name',
            'display_checkpoint': 'display_checkpoint',
            'prefix': 'prefix',
            'debugwait': 'debugwait',
            'define': 'define',
            'define_default_arm': 'define_default_arm',
            'define_default_riscv': 'define_default_riscv',
            'eclipse_includes': 'eclipse_includes',
            'eclipse_variables': 'eclipse_variables',
            'eclipse_openocd_args': 'eclipse_openocd_args',
            'overwrite': 'overwrite',
            'compact_data': 'compact_data',
            'compact_weights': 'compact_weights',
            'mexpress': 'mexpress',
            'mlator': 'mlator',
            'unroll_mlator': 'unroll_mlator',
            'unroll_8bit': 'unroll_8bit',
            'unroll_wide': 'unroll_wide',
            'softmax': 'softmax',
            'unload': 'unload',
            'generate_kat': 'generate_kat',
            'boost': 'boost',
            'start_layer': 'start_layer',
            'wfi': 'wfi',
            'timer': 'timer',
            'no_timer': 'no_timer',
            'energy': 'energy',
            'enable_delay': 'enable_delay',
            'output_width': 'output_width',
            'no_deduplicate_weights': 'no_deduplicate_weights',
            'no_warn_zero': 'no_warn_zero',
            'c_filename': 'c_filename',
            'api_filename': 'api_filename',
            'weight_filename': 'weight_filename',
            'sample_filename': 'sample_filename',
            'sample_input': 'sample_input',
            'result_filename': 'result_filename',
            'result_numpy': 'result_numpy',
            'fifo': 'fifo',
            'fast_fifo': 'fast_fifo',
            'fast_fifo_quad': 'fast_fifo_quad',
            'fifo_wait': 'fifo_wait',
            'fifo_go': 'fifo_go',
            'slow_load': 'slow_load',
            'debug_new_streaming': 'debug_new_streaming',
            'riscv': 'riscv',
            'riscv_flash': 'riscv_flash',
            'riscv_cache': 'riscv_cache',
            'riscv_debug': 'riscv_debug',
            'riscv_exclusive': 'riscv_exclusive',
            'verbose': 'verbose',
            'log': 'log',
            'display_progress': 'display_progress',
            'log_intermediate': 'log_intermediate',
            'log_pooling': 'log_pooling',
            'verbose_all': 'verbose_all',
            'log_filename': 'log_filename',
            'debug': 'debug',
            'debug_computation': 'debug_computation',
            'debug_latency': 'debug_latency',
            'no_error_stop': 'no_error_stop',
            'stop_after': 'stop_after',
            'skip_checkpoint_layers': 'skip_checkpoint_layers',
            'skip_yaml_layers': 'skip_yaml_layers',
            'stop_start': 'stop_start',
            'one_shot': 'one_shot',
            'repeat_layers': 'repeat_layers',
            'clock_trim': 'clock_trim',
            'fixed_input': 'fixed_input',
            'reshape_inputs': 'reshape_inputs',
            'forever': 'forever',
            'link_layer': 'link_layer',
            'rd_ahead': 'rd_ahead',
            'calcx4': 'calcx4',
            'ext_rdy': 'ext_rdy',
            'weight_start': 'weight_start',
            'ignore_bias_groups': 'ignore_bias_groups',
            'kernel_format': 'kernel_format',
            'debug_snoop': 'debug_snoop',
            'snoop_loop': 'snoop_loop',
            'ignore_hw_limits': 'ignore_hw_limits',
            'ignore_bn': 'ignore_bn',
            'ignore_activation': 'ignore_activation',
            'ignore_energy_warning': 'ignore_energy_warning',
            'ignore_mlator_warning': 'ignore_mlator_warning',
            'new_kernel_loader': 'new_kernel_loader',
            'weight_input': 'weight_input',
            'bias_input': 'bias_input',
            'input_csv': 'input_csv',
            'input_csv_format': 'input_csv_format',
            'input_csv_retrace': 'input_csv_retrace',
            'input_csv_period': 'input_csv_period',
            'input_pix_clk': 'input_pix_clk',
            'input_sync': 'input_sync',
            'input_fifo': 'input_fifo',
            'autogen': 'autogen',
            'autogen_list': 'autogen_list',
            'input_filename': 'input_filename',
            'output_filename': 'output_filename',
            'output_config_filename': 'output_config_filename',
            'output_data_filename': 'output_data_filename',
            'output_weights_filename': 'output_weights_filename',
            'output_bias_filename': 'output_bias_filename',
            'output_pass_filename': 'output_pass_filename',
            'runtest_filename': 'runtest_filename',
            'legacy_test': 'legacy_test',
            'legacy_kernels': 'legacy_kernels',
            'test_bist': 'test_bist',
            'test_dir': 'test_dir',
            'top_level': 'top_level',
            'queue_name': 'queue_name',
            'timeout': 'timeout',
            'result_output': 'result_output',
            'overwrite_ok': 'overwrite_ok',
            'override_start': 'override_start',
            'increase_start': 'increase_start',
            'override_rollover': 'override_rollover',
            'override_delta1': 'override_delta1',
            'increase_delta1': 'increase_delta1',
            'override_delta2': 'override_delta2',
            'increase_delta2': 'increase_delta2',
            'ignore_streaming': 'ignore_streaming',
            'allow_streaming': 'allow_streaming',
            'no_bias': 'no_bias',
            'streaming_layers': 'streaming_layers',
            'powerdown': 'powerdown',
            'deepsleep': 'deepsleep',
            'max_proc': 'max_proc',
            'input_offset': 'input_offset',
            'verify_writes': 'verify_writes',
            'verify_kernels': 'verify_kernels',
            'mlator_noverify': 'mlator_noverify',
            'write_zero_registers': 'write_zero_registers',
            'init_tram': 'init_tram',
            'zero_sram': 'zero_sram',
            'pretend_zero_sram': 'pretend_zero_sram',
            'zero_unused': 'zero_unused',
            'apb_base': 'apb_base',
            'ready_sel': 'ready_sel',
            'ready_sel_fifo': 'ready_sel_fifo',
            'ready_sel_aon': 'ready_sel_aon',
            'input_split': 'input_split',
            'synthesize_input': 'synthesize_input',
            'synthesize_words': 'synthesize_words',
            'max_count': 'max_count',
            'no_version_check': 'no_version_check',
            'version_check_interval': 'version_check_interval',
            'upstream': 'upstream',
            'yamllint': 'yamllint',
            'no_scale_output': 'no_scale_output',
        }
        
        # Extract values from the namespace
        for dataclass_field, args_field in field_mapping.items():
            if hasattr(args, args_field):
                args_dict[dataclass_field] = getattr(args, args_field)
        
        return cls(**args_dict)
