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


import unittest
import tempfile
import os
import json
from pathlib import Path

from utils import has_tf, get_tf

from cfsai_resource_profiler.profile_resources import TFLiteResourceProfiler
from cfsai_resource_profiler.exceptions import (
    HardwareProfileError,
    ModelAnalysisError,
)
from cfsai_resource_profiler.schemas import (
    ResourceProfileReport,
    OptimizationOpportunities,
    MemoryAnalysis,
    HardwareMetrics,
    LayerPerformance,
    OptimizationSuggestion,
)
from cfsai_model_parser.exceptions import ModelFormatNotSupportedError

from cfsai_types.hardware_profile import HardwareProfile



@unittest.skipIf(not has_tf(), "TensorFlow not available")
class TestTFLiteResourceProfilerWithRealModels(unittest.TestCase):
    """Test suite for TFLiteResourceProfiler using real TensorFlow models."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.profiler = TFLiteResourceProfiler()
        self.temp_dir = tempfile.mkdtemp()
        
        # Standard hardware profile for testing
        self.basic_hardware_profile = HardwareProfile(
            SupportedOps=[],
            AccelOps=["CONV_2D", "DEPTHWISE_CONV_2D"],
            SupportedDataTypes=[],
            FlashSize=0,
            RamSize=512.0,
            CoreClock=100.0,
            OperatorInfos=[
                {
                    "Name": "MAC",
                    "Cycles": 1.0,
                    "Energy": 2.5
                }
            ]
        )
        
        # High-performance hardware profile
        self.high_perf_hardware_profile = HardwareProfile(
            SupportedOps=[],
            AccelOps=["CONV_2D", "DEPTHWISE_CONV_2D", "FULLY_CONNECTED"],
            SupportedDataTypes=[],
            FlashSize=0,
            RamSize=2048.0,
            CoreClock=800.0,
            OperatorInfos=[
                {
                    "Name": "MAC",
                    "Cycles": 0.5,
                    "Energy": 1.0
                }
            ]
        )
        
        # Constrained hardware profile (embedded device)
        self.constrained_hardware_profile = HardwareProfile(
            SupportedOps=[],
            AccelOps=[],
            SupportedDataTypes=[],
            FlashSize=0,
            RamSize=2048.0,
            CoreClock=48.0,
            OperatorInfos=[
                {
                    "Name": "MAC",
                    "Cycles": 2.0,
                    "Energy": 150
                }
            ]
        )
        tf = get_tf()
        # Suppress TensorFlow warnings
        tf.get_logger().setLevel('ERROR')
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_simple_cnn_model(self):
        """Create a simple CNN model for testing."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(28, 28, 1)),
            tf.keras.layers.Conv2D(16, 3, activation='relu', padding='same'),
            tf.keras.layers.MaxPooling2D(2),
            tf.keras.layers.Conv2D(32, 3, activation='relu', padding='same'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10, activation='softmax')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No quantization
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'simple_cnn.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_mobilenet_style_model(self):
        """Create a MobileNet-style model with depthwise separable convolutions."""
        tf = get_tf()
        input_layer = tf.keras.layers.Input(shape=(224, 224, 3))
        
        # Standard convolution
        x = tf.keras.layers.Conv2D(32, 3, strides=2, padding='same')(input_layer)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        
        # Depthwise separable block
        x = tf.keras.layers.DepthwiseConv2D(3, padding='same')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        x = tf.keras.layers.Conv2D(64, 1, padding='same')(x)  # Pointwise
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        
        # Another depthwise separable block
        x = tf.keras.layers.DepthwiseConv2D(3, strides=2, padding='same')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        x = tf.keras.layers.Conv2D(128, 1, padding='same')(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        
        # Global pooling and classification
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        output = tf.keras.layers.Dense(1000, activation='softmax')(x)
        
        model = tf.keras.Model(inputs=input_layer, outputs=output)
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        #converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'mobilenet_style.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_quantized_model(self):
        """Create a quantized INT8 model."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(32, 32, 3)),
            tf.keras.layers.Conv2D(16, 3, activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            tf.keras.layers.Conv2D(32, 3, activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10, activation='softmax')
        ])
        
        # Convert with quantization
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        # Create representative dataset
        def representative_data_gen():
            for _ in range(100):
                yield [tf.random.normal((1, 32, 32, 3))]
        
        converter.representative_dataset = representative_data_gen
        converter.target_spec.supported_types = [tf.int8]
        converter.inference_input_type = tf.int8
        converter.inference_output_type = tf.int8
        
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'quantized_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_large_model(self):
        """Create a larger model to test memory analysis."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(224, 224, 3)),
            tf.keras.layers.Conv2D(64, 7, strides=2, padding='same', activation='relu'),
            tf.keras.layers.MaxPooling2D(3, strides=2, padding='same'),
            
            # Large Conv layers
            tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            
            tf.keras.layers.Conv2D(256, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(256, 3, padding='same', activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            
            tf.keras.layers.Conv2D(512, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(512, 3, padding='same', activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            
            # Large Dense layer
            tf.keras.layers.Dense(2048, activation='relu'),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(1000, activation='softmax')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'large_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def test_profiler_initialization(self):
        """Test TFLiteResourceProfiler initialization."""
        profiler = TFLiteResourceProfiler()
        
        # Check essential attributes
        self.assertIsNotNone(profiler.logger)
        self.assertEqual(profiler.max_optimization_layers, 5)
        self.assertIn("quantization", profiler.memory_reduction_targets)
        self.assertIn("pruning_low", profiler.memory_reduction_targets)
        self.assertIn("pruning_high", profiler.memory_reduction_targets)
    
    def test_analyze_simple_cnn_basic_hardware(self):
        """Test analyzing a simple CNN with basic hardware profile."""
        model_path, keras_model = self.create_simple_cnn_model()
        
        # Analyze the model
        result = self.profiler.analyze_model(model_path, self.basic_hardware_profile)
        
        # Verify basic structure
        self.assertIsInstance(result, ResourceProfileReport)
        self.assertEqual(result.model_summary.framework, 'TensorFlow Lite')
        self.assertGreater(len(result.layer_performance), 0)
        
        # Verify hardware metrics
        self.assertIsNotNone(result.hardware_metrics)
        self.assertGreater(result.hardware_metrics.total_cycles, 0)
        self.assertGreater(result.hardware_metrics.estimated_latency_ms, 0)
        self.assertGreater(result.hardware_metrics.estimated_power_mw, 0)
        
        # Verify memory analysis
        self.assertIsNotNone(result.memory_analysis)
        self.assertGreater(result.memory_analysis.model_peak_ram_kb, 0)
        
        # Verify optimization opportunities
        self.assertIsNotNone(result.optimization_opportunities)
        self.assertGreater(result.optimization_opportunities.total_macs, 0)
        
        print(f"Simple CNN Analysis (Basic Hardware):")
        print(f"  Total cycles: {result.hardware_metrics.total_cycles:,}")
        print(f"  Latency: {result.hardware_metrics.estimated_latency_ms:.2f} ms")
        print(f"  Power: {result.hardware_metrics.estimated_power_mw:.2f} mW")
        print(f"  Peak RAM: {result.memory_analysis.model_peak_ram_kb:.2f} KB")
        print(f"  RAM utilization: {result.memory_analysis.ram_utilization_percent:.1f}%")
    
    def test_analyze_mobilenet_style_high_perf_hardware(self):
        """Test analyzing MobileNet-style model with high-performance hardware."""
        model_path, keras_model = self.create_mobilenet_style_model()
        
        # Analyze the model
        result = self.profiler.analyze_model(model_path, self.high_perf_hardware_profile)
        
        # Verify structure
        self.assertIsInstance(result, ResourceProfileReport)
        
        # Check for accelerated layers
        accelerated_layers = sum(1 for layer in result.layer_performance if layer.is_accelerated)
        self.assertGreater(accelerated_layers, 0)
        
        print(f"MobileNet-Style Analysis (High-Perf Hardware):")
        print(f"  Model name: {result.model_summary.model_name}")
        print(f"  Accelerated layers: {accelerated_layers}")
        print(f"  Total MACs: {result.optimization_opportunities.total_macs:,}")
        print(f"  Optimization suggestions: {len(result.optimization_suggestions)}")
        print(f"  Memory recommendations: {len(result.memory_analysis.memory_recommendations)}")

    
    def test_analyze_quantized_model(self):
        """Test analyzing a quantized model."""
        model_path, keras_model = self.create_quantized_model()
        
        # Analyze the model
        result = self.profiler.analyze_model(model_path, self.basic_hardware_profile)
        
        # Verify structure
        self.assertIsInstance(result, ResourceProfileReport)
        
        # Quantized models should show different characteristics
        if result.model_summary.target_dtype:
            self.assertIn(result.model_summary.target_dtype.lower(), ['int8', 'uint8'])
        
        # Optimization suggestions now handled by existing smart recommendation systems
        self.assertIsInstance(result.optimization_suggestions, list)
        self.assertEqual(len(result.optimization_suggestions), 0)
        
        print(f"Quantized Model Analysis:")
        print(f"  Target dtype: {result.model_summary.target_dtype}")
        print(f"  Model size: {result.model_summary.model_size_kb:.2f} KB")
        print(f"  Optimization suggestions: {len(result.optimization_suggestions)}")
    
    def test_analyze_large_model_constrained_hardware(self):
        """Test analyzing a large model with constrained hardware."""
        model_path, keras_model = self.create_large_model()
        
        # Analyze with constrained hardware
        result = self.profiler.analyze_model(model_path, self.constrained_hardware_profile)
        
        # Verify structure
        self.assertIsInstance(result, ResourceProfileReport)
        
        # Should detect memory issues with constrained hardware
        self.assertIsNotNone(result.memory_analysis)
        
        # Should have high RAM utilization or memory issues
        if result.memory_analysis.ram_utilization_percent:
            # Large model on constrained hardware should have high utilization
            self.assertGreater(result.memory_analysis.ram_utilization_percent, 50)
        
        # Should have memory recommendations
        if result.memory_analysis.memory_recommendations:
            self.assertGreater(len(result.memory_analysis.memory_recommendations), 0)
        
        # No accelerated layers (constrained hardware has no accelerators)
        accelerated_layers = sum(1 for layer in result.layer_performance if layer.is_accelerated)
        self.assertEqual(accelerated_layers, 0)
        
        # Optimization suggestions now handled by existing smart recommendation systems
        self.assertIsInstance(result.optimization_suggestions, list)
        self.assertEqual(len(result.optimization_suggestions), 0)
        
        print(f"Large Model Analysis (Constrained Hardware):")
        print(f"  RAM utilization: {result.memory_analysis.ram_utilization_percent:.1f}%")
        print(f"  RAM status: {result.memory_analysis.ram_status}")
        print(f"  Memory issues: {len(result.memory_analysis.memory_issues)}")
        print(f"  Memory recommendations: {len(result.memory_analysis.memory_recommendations)}")
        print(f"  Optimization suggestions: {len(result.optimization_suggestions)} (handled by smart systems)")
    
    def test_model_validation(self):
        """Test model file validation."""
        # Test non-existent file
        non_existent_path = os.path.join(self.temp_dir, 'non_existent.tflite')
        with self.assertRaises(FileNotFoundError):
            self.profiler.analyze_model(non_existent_path, self.basic_hardware_profile)
        
        # Test invalid file (too small)
        tiny_file = os.path.join(self.temp_dir, 'tiny.tflite')
        with open(tiny_file, 'wb') as f:
            f.write(b'tiny')  # Only 4 bytes
        
        with self.assertRaises(ModelFormatNotSupportedError):
            self.profiler.analyze_model(tiny_file, self.basic_hardware_profile)
        
        # Test wrong extension
        wrong_ext_file = os.path.join(self.temp_dir, 'model.pb')
        with open(wrong_ext_file, 'wb') as f:
            f.write(b'0' * 1000)  # Large enough file
        
        with self.assertRaises(ModelFormatNotSupportedError):
            self.profiler.analyze_model(wrong_ext_file, self.basic_hardware_profile)
    
    def test_no_hardware_profile_analysis(self):
        """Test analysis without hardware profile."""
        model_path, _ = self.create_simple_cnn_model()
        
        # Analyze without hardware profile - should raise HardwareProfileError
        with self.assertRaises(HardwareProfileError) as context:
            self.profiler.analyze_model(model_path, None)
        
        # Should have the expected error message
        self.assertIn("Missing hardware profile", str(context.exception))
        
        print("No Hardware Profile Analysis:")
        print(f"  Expected error raised: {context.exception}")
        print(f"  Error type: {type(context.exception).__name__}")
    
    def test_optimization_opportunities_generation(self):
        """Test detailed optimization opportunities generation."""
        model_path, _ = self.create_large_model()
        
        result = self.profiler.analyze_model(model_path, self.basic_hardware_profile)
        
        # Verify optimization opportunities
        opp = result.optimization_opportunities
        self.assertIsNotNone(opp)
        self.assertGreater(opp.total_parameter_memory_kb, 0)
        self.assertGreater(opp.total_macs, 0)
        

        # Should have layerwise opportunities
        self.assertGreater(len(opp.layerwise_opportunities), 0)
        self.assertGreater(len(opp.macs_opportunities), 0)
        
        # Optimization suggestions now handled by existing smart recommendation systems
        self.assertEqual(len(result.optimization_suggestions), 0)
        
        print("Optimization Opportunities:")
        print(f"  Layerwise opportunities: {len(opp.layerwise_opportunities)}")
        print(f"  MAC opportunities: {len(opp.macs_opportunities)}")
        print(f"  Smart recommendations available in memory analysis and layerwise opportunities")
    
    def test_layer_performance_analysis(self):
        """Test detailed layer performance analysis."""
        model_path, _ = self.create_mobilenet_style_model()
        
        result = self.profiler.analyze_model(model_path, self.high_perf_hardware_profile)
        
        # Verify layer performance details
        self.assertGreater(len(result.layer_performance), 0)
        
        for layer_perf in result.layer_performance:
            self.assertIsInstance(layer_perf, LayerPerformance)
            self.assertIsNotNone(layer_perf.layer_idx)
            
            # Performance metrics should be calculated
            if layer_perf.macs and layer_perf.macs > 0:
                self.assertIsNotNone(layer_perf.cycles)
                self.assertIsNotNone(layer_perf.latency_ms)
                self.assertIsNotNone(layer_perf.energy_uj)
        
        # Check acceleration detection
        accelerated_layers = [layer for layer in result.layer_performance if layer.is_accelerated]
        non_accelerated_layers = [layer for layer in result.layer_performance if not layer.is_accelerated]
        
        print("Layer Performance Analysis:")
        print(f"  Total layers: {len(result.layer_performance)}")
        print(f"  Accelerated layers: {len(accelerated_layers)}")
        print(f"  Non-accelerated layers: {len(non_accelerated_layers)}")
        
        # Print top 5 most expensive layers
        expensive_layers = sorted(
            [layer for layer in result.layer_performance if layer.macs],
            key=lambda x: x.macs,
            reverse=True
        )[:5]
        
        for i, layer in enumerate(expensive_layers):
            print(f"  Layer {i+1}: {layer.layer_name}, MACs: {layer.macs:,}, "
                  f"Latency: {layer.latency_ms:.3f}ms")
    
    def test_memory_analysis_accuracy(self):
        """Test memory analysis accuracy and constraints."""
        model_path, _ = self.create_large_model()
        
        # Test with different RAM constraints
        constrained_profile = self.constrained_hardware_profile.copy()
        constrained_profile.ram_size = 64  # Very constrained
        
        result = self.profiler.analyze_model(model_path, constrained_profile)
        
        # Should detect critical memory issues
        memory_analysis = result.memory_analysis
        self.assertIsNotNone(memory_analysis)
        
        if memory_analysis.ram_utilization_percent:
            # Should be very high utilization
            self.assertGreater(memory_analysis.ram_utilization_percent, 100)
        
        # Should have critical RAM status
        self.assertEqual(memory_analysis.ram_status, "CRITICAL")
        
        # Should have memory issues and recommendations
        self.assertGreater(len(memory_analysis.memory_issues), 0)
        self.assertGreater(len(memory_analysis.memory_recommendations), 0)
        
        print("Memory Analysis (Very Constrained):")
        print(f"  Peak RAM: {memory_analysis.model_peak_ram_kb:.2f} KB")
        print(f"  Available RAM: {memory_analysis.available_ram_kb} KB")
        print(f"  Utilization: {memory_analysis.ram_utilization_percent:.1f}%")
        print(f"  Status: {memory_analysis.ram_status}")
        print(f"  Issues: {len(memory_analysis.memory_issues)}")
        print(f"  Recommendations: {len(memory_analysis.memory_recommendations)}")
    
    def test_optimization_configuration(self):
        """Test optimization configuration settings."""
        # Test setting max optimization layers
        self.profiler.set_optimization_config(max_layers=3)
        self.assertEqual(self.profiler.max_optimization_layers, 3)
        
        # Test setting memory targets
        custom_targets = {"quantization": 0.8, "pruning_low": 0.6}
        self.profiler.set_optimization_config(memory_targets=custom_targets)
        self.assertEqual(self.profiler.memory_reduction_targets["quantization"], 0.8)
        self.assertEqual(self.profiler.memory_reduction_targets["pruning_low"], 0.6)
        
        # Test with model analysis
        model_path, _ = self.create_simple_cnn_model()
        result = self.profiler.analyze_model(model_path, self.basic_hardware_profile)
        
        # Should have limited layerwise opportunities due to max_layers=3
        self.assertLessEqual(len(result.optimization_opportunities.layerwise_opportunities), 3)
    
    def test_performance_comparison_across_hardware(self):
        """Test performance comparison across different hardware profiles."""
        model_path, _ = self.create_mobilenet_style_model()
        
        # Analyze with different hardware profiles
        basic_result = self.profiler.analyze_model(model_path, self.basic_hardware_profile)
        high_perf_result = self.profiler.analyze_model(model_path, self.high_perf_hardware_profile)
        constrained_result = self.profiler.analyze_model(model_path, self.constrained_hardware_profile)
        
        # Compare performance metrics
        basic_latency = basic_result.hardware_metrics.estimated_latency_ms
        high_perf_latency = high_perf_result.hardware_metrics.estimated_latency_ms
        constrained_latency = constrained_result.hardware_metrics.estimated_latency_ms
        
        # High-perf should be fastest, constrained should be slowest
        self.assertLess(high_perf_latency, basic_latency)
        self.assertLess(basic_latency, constrained_latency)
        
        # Compare power consumption
        basic_power = basic_result.hardware_metrics.estimated_power_mw
        high_perf_power = high_perf_result.hardware_metrics.estimated_power_mw
        constrained_power = constrained_result.hardware_metrics.estimated_power_mw
        
        print("Performance Comparison Across Hardware:")
        print(f"High-Perf  - Latency: {high_perf_latency:.2f}ms, Power: {high_perf_power:.2f}mW")
        print(f"Basic      - Latency: {basic_latency:.2f}ms, Power: {basic_power:.2f}mW")
        print(f"Constrained- Latency: {constrained_latency:.2f}ms, Power: {constrained_power:.2f}mW")
        
        # Speedup calculations
        basic_speedup = constrained_latency / basic_latency
        high_perf_speedup = constrained_latency / high_perf_latency
        
        print(f"Basic vs Constrained speedup: {basic_speedup:.1f}x")
        print(f"High-Perf vs Constrained speedup: {high_perf_speedup:.1f}x")
    
    def test_optimization_suggestions_generation(self):
        """Test optimization suggestions generation."""
        model_path, _ = self.create_large_model()
        
        result = self.profiler.analyze_model(model_path, self.basic_hardware_profile)
        
        # Optimization suggestions are now handled by existing smart recommendation systems
        self.assertIsInstance(result.optimization_suggestions, list)
        self.assertEqual(len(result.optimization_suggestions), 0)
        
        # Should have memory and optimization opportunities (where smart recommendations exist)
        self.assertGreater(len(result.optimization_opportunities.layerwise_opportunities), 0)
        
        print("Smart recommendations are available through:")
        print(f"  Memory analysis: {len(result.memory_analysis.memory_recommendations)} recommendations")
        print(f"  Layerwise opportunities: {len(result.optimization_opportunities.layerwise_opportunities)} layers")
    
    def test_error_handling_and_recovery(self):
        """Test error handling and graceful recovery."""
        model_path, _ = self.create_simple_cnn_model()
        
        # Test with corrupted hardware profile (will pass validation but cause analysis issues)
        problematic_profile = self.basic_hardware_profile.copy()
        
        try:
            result = self.profiler.analyze_model(model_path, problematic_profile)
            
            # Even with potential issues, should return a valid report
            self.assertIsInstance(result, ResourceProfileReport)
            
            # Check if any errors were captured
            if result.errors:
                print("Captured errors during analysis:")
                for error in result.errors:
                    print(f"  {error.code}: {error.message}")
            
            # Analysis notes should contain information
            self.assertGreater(len(result.analysis_notes), 0)
            
        except Exception as e:
            # If analysis fails completely, it should raise a proper exception
            self.assertIsInstance(e, ModelAnalysisError)
            print(f"Expected analysis error: {e}")


if __name__ == '__main__':
    # Configure TensorFlow
    if has_tf():
        tf = get_tf()
        tf.get_logger().setLevel('ERROR')
        # Enable eager execution if needed
        tf.config.run_functions_eagerly(True)
    
    # Run tests with verbose output
    unittest.main(verbosity=2)
