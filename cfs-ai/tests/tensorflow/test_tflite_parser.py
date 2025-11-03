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
from pathlib import Path

from utils import has_tf, get_tf

from cfsai_model_parser.parse_tflm import TFLiteParser, parse_tflite_model
from cfsai_model_parser.exceptions import (
    InvalidTensorType,
    ModelAnalysisError,
    ModelFileNotFoundError,
    ModelLoadError,
    ModelMACCalculationError,
    ModelMemoryCalculationError,
    ModelSubgraphError,
    ModelFormatNotSupportedError,
)
from cfsai_model_parser.schemas import LayerDetail, ModelDetails, TensorLifecycle


@unittest.skipIf(not has_tf(), "TensorFlow not available")
class TestTFLiteParserWithRealModels(unittest.TestCase):
    """Test suite for TFLiteParser using real TensorFlow Lite models."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = TFLiteParser()
        self.temp_dir = tempfile.mkdtemp()
        tf = get_tf()
        # Suppress TensorFlow warnings
        tf.get_logger().setLevel('ERROR')
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_simple_conv2d_model(self):
        """Create a simple Conv2D model for testing."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(32, 32, 3)),
            tf.keras.layers.Conv2D(16, 3, activation='relu', padding='valid'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10, activation='softmax')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No quantization for testing
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'simple_conv2d.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_depthwise_separable_model(self):
        """Create a model with DepthwiseConv2D and pointwise convolution."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(112, 112, 32)),
            tf.keras.layers.DepthwiseConv2D(3, padding='valid', activation='relu'),
            tf.keras.layers.Conv2D(64, 1, activation='relu'),  # Pointwise
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(100, activation='softmax')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'depthwise_separable.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_mobilenet_v1_block(self):
        """Create a MobileNet v1 style block."""
        tf = get_tf()
        input_layer = tf.keras.layers.Input(shape=(56, 56, 128))
        
        # Depthwise convolution
        x = tf.keras.layers.DepthwiseConv2D(
            3, strides=1, padding='same', use_bias=False
        )(input_layer)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        
        # Pointwise convolution
        x = tf.keras.layers.Conv2D(
            256, 1, strides=1, padding='same', use_bias=False
        )(x)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.ReLU()(x)
        
        # Global pooling and classification
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        output = tf.keras.layers.Dense(10, activation='softmax')(x)
        
        model = tf.keras.Model(inputs=input_layer, outputs=output)
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'mobilenet_block.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_quantized_model(self):
        """Create a quantized INT8 model."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(28, 28, 1)),
            tf.keras.layers.Conv2D(16, 3, activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            tf.keras.layers.Conv2D(32, 3, activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10, activation='softmax')
        ])
        
        # Convert with INT8 quantization
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        
        # Create representative dataset for quantization
        def representative_data_gen():
            for _ in range(100):
                yield [tf.random.normal((1, 28, 28, 1))]
        
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
    
    def create_complex_model(self):
        """Create a more complex model with various layer types."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(224, 224, 3)),
            
            # First Conv block
            tf.keras.layers.Conv2D(32, 3, strides=2, padding='same', activation='relu'),
            tf.keras.layers.BatchNormalization(),
            
            # Depthwise separable block
            tf.keras.layers.DepthwiseConv2D(3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(64, 1, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            
            # Another Conv block
            tf.keras.layers.Conv2D(128, 3, strides=2, padding='same', activation='relu'),
            tf.keras.layers.BatchNormalization(),
            
            # Final layers
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(50, activation='softmax')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'complex_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def test_parser_initialization(self):
        """Test that TFLiteParser initializes correctly."""
        parser = TFLiteParser()
        
        # Check essential attributes
        self.assertIsNotNone(parser.schema_fb)
        self.assertIsInstance(parser._opcode_map, dict)
        self.assertIsInstance(parser._tensor_type_map, dict)
    
    def test_parse_simple_conv2d_model(self):
        """Test parsing a simple Conv2D model."""
        model_path, keras_model = self.create_simple_conv2d_model()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify basic structure
        self.assertIsInstance(result, ModelDetails)
        self.assertEqual(result.framework, 'TensorFlow Lite')
        self.assertGreater(len(result.layer_details), 0)
        
        # Check for Conv2D layer
        conv_layers = [layer for layer in result.layer_details if layer.name == 'CONV_2D']
        self.assertGreater(len(conv_layers), 0)
        
        # Verify MAC calculation
        self.assertGreater(result.total_macs, 0)
        
        # Verify memory calculations
        self.assertGreater(result.model_peak_ram_kb, 0)
        self.assertGreater(result.model_size_on_disk_kb, 0)
        
        print(f"Simple Conv2D Model:")
        print(f"  Total MACs: {result.total_macs:,}")
        print(f"  Peak RAM: {result.model_peak_ram_kb:.2f} KB")
        print(f"  Model size: {result.model_size_on_disk_kb:.2f} KB")
        print(f"  Layers: {len(result.layer_details)}")
    
    def test_parse_depthwise_separable_model(self):
        """Test parsing a model with DepthwiseConv2D."""
        model_path, keras_model = self.create_depthwise_separable_model()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify structure
        self.assertIsInstance(result, ModelDetails)
        
        # Check for DepthwiseConv2D layer
        dw_layers = [layer for layer in result.layer_details if layer.name == 'DEPTHWISE_CONV_2D']
        self.assertGreater(len(dw_layers), 0)
        
        # Check for pointwise Conv2D layer
        conv_layers = [layer for layer in result.layer_details if layer.name == 'CONV_2D']
        self.assertGreater(len(conv_layers), 0)
        
        # Verify MAC calculations
        self.assertGreater(result.total_macs, 0)
        
        # Verify DepthwiseConv2D MAC calculation is reasonable
        dw_layer = dw_layers[0]
        self.assertGreater(dw_layer.macs, 0)
        
        print(f"Depthwise Separable Model:")
        print(f"  Total MACs: {result.total_macs:,}")
        print(f"  DepthwiseConv2D MACs: {dw_layer.macs:,}")
        print(f"  Peak RAM: {result.model_peak_ram_kb:.2f} KB")
    
    def test_parse_mobilenet_block(self):
        """Test parsing a MobileNet-style block."""
        model_path, keras_model = self.create_mobilenet_v1_block()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify structure
        self.assertIsInstance(result, ModelDetails)
        
        # Should have both depthwise and pointwise convolutions
        dw_layers = [layer for layer in result.layer_details if layer.name == 'DEPTHWISE_CONV_2D']
        conv_layers = [layer for layer in result.layer_details if layer.name == 'CONV_2D']
        
        self.assertGreater(len(dw_layers), 0)
        self.assertGreater(len(conv_layers), 0)
        
        # Calculate efficiency compared to standard convolution
        total_separable_macs = sum(layer.macs for layer in dw_layers + conv_layers)
        
        # Theoretical standard conv2d: 56*56*256*3*3*128 = 2,317,737,472 MACs
        theoretical_std_conv = 56 * 56 * 256 * 3 * 3 * 128
        efficiency_ratio = theoretical_std_conv / total_separable_macs if total_separable_macs > 0 else 0
        
        print(f"MobileNet Block:")
        print(f"  Separable MACs: {total_separable_macs:,}")
        print(f"  Theoretical std conv MACs: {theoretical_std_conv:,}")
        print(f"  Efficiency ratio: {efficiency_ratio:.1f}x")
        
        # Depthwise separable should be significantly more efficient
        self.assertGreater(efficiency_ratio, 5)
    
    def test_parse_quantized_model(self):
        """Test parsing a quantized INT8 model."""
        model_path, keras_model = self.create_quantized_model()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify structure
        self.assertIsInstance(result, ModelDetails)
        
        # Check data type - should be quantized
        self.assertIn(result.target_dtype.lower(), ['int8', 'uint8'])
        
        # Quantized models should be smaller
        self.assertGreater(result.model_size_on_disk_kb, 0)
        
        print(f"Quantized Model:")
        print(f"  Data type: {result.target_dtype}")
        print(f"  Model size: {result.model_size_on_disk_kb:.2f} KB")
        print(f"  Total MACs: {result.total_macs:,}")
    
    def test_parse_complex_model(self):
        """Test parsing a complex model with various layer types."""
        model_path, keras_model = self.create_complex_model()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify structure
        self.assertIsInstance(result, ModelDetails)
        self.assertGreater(len(result.layer_details), 5)  # Should have multiple layers
        
        # Check for various layer types
        layer_types = {layer.name for layer in result.layer_details}
        self.assertIn('CONV_2D', layer_types)
        self.assertIn('DEPTHWISE_CONV_2D', layer_types)
        
        # Verify calculations
        self.assertGreater(result.total_macs, 0)
        self.assertGreater(result.model_peak_ram_kb, 0)
        
        # Print layer breakdown
        print(f"Complex Model Analysis:")
        print(f"  Total layers: {len(result.layer_details)}")
        print(f"  Layer types: {sorted(layer_types)}")
        print(f"  Total MACs: {result.total_macs:,}")
        print(f"  Peak RAM: {result.model_peak_ram_kb:.2f} KB")
        
        # Print per-layer details
        for i, layer in enumerate(result.layer_details[:10]):  # First 10 layers
            print(f"  Layer {i}: {layer.name}, MACs: {layer.macs:,}, Flash: {layer.flash_kb:.2f} KB")
    
    def test_mac_calculation_accuracy_conv2d(self):
        """Test MAC calculation accuracy for Conv2D layers."""
        tf = get_tf()
        # Create a model with known dimensions
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(32, 32, 16)),
            tf.keras.layers.Conv2D(32, 3, padding='valid', use_bias=False)
        ])
        
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        model_path = os.path.join(self.temp_dir, 'mac_test_conv2d.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Parse and verify
        result = self.parser.parse_model(model_path)
        conv_layer = next(layer for layer in result.layer_details if layer.name == 'CONV_2D')
        
        # Expected calculation: output_h * output_w * output_channels * kernel_h * kernel_w * input_channels
        # Output size: 32-3+1 = 30, so 30*30*32*3*3*16 = 41,472,000
        expected_macs = 30 * 30 * 32 * 3 * 3 * 16
        
        print(f"Conv2D MAC Test:")
        print(f"  Expected MACs: {expected_macs:,}")
        print(f"  Calculated MACs: {conv_layer.macs:,}")
        print(f"  Difference: {abs(expected_macs - conv_layer.macs):,}")
        
        # Allow small difference due to rounding or implementation details
        self.assertAlmostEqual(conv_layer.macs, expected_macs, delta=expected_macs * 0.01)
    
    def test_mac_calculation_accuracy_depthwise_conv(self):
        """Test MAC calculation accuracy for DepthwiseConv2D layers."""
        tf = get_tf()
        # Create a model with known dimensions
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(56, 56, 32)),
            tf.keras.layers.DepthwiseConv2D(3, padding='valid', use_bias=False)
        ])
        
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        model_path = os.path.join(self.temp_dir, 'mac_test_depthwise.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Parse and verify
        result = self.parser.parse_model(model_path)
        dw_layer = next(layer for layer in result.layer_details if layer.name == 'DEPTHWISE_CONV_2D')
        
        # Expected calculation: output_elements * spatial_kernel_size
        # Output size: 56-3+1 = 54, so (1 * 54 * 54 * 32) * (3 * 3) = 841,536
        expected_macs = (1 * 54 * 54 * 32) * (3 * 3)
        
        print(f"DepthwiseConv2D MAC Test:")
        print(f"  Expected MACs: {expected_macs:,}")
        print(f"  Calculated MACs: {dw_layer.macs:,}")
        print(f"  Difference: {abs(expected_macs - dw_layer.macs):,}")
        
        # Allow small difference due to rounding or implementation details
        self.assertAlmostEqual(dw_layer.macs, expected_macs, delta=expected_macs * 0.01)
    
    def test_memory_analysis_accuracy(self):
        """Test memory analysis accuracy."""
        model_path, keras_model = self.create_simple_conv2d_model()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify memory calculations are reasonable
        self.assertGreater(result.model_peak_ram_kb, 0)
        self.assertGreater(result.model_size_on_disk_kb, 0)
        self.assertGreater(result.model_total_param_memory_b, 0)
        
        # Model size should be reasonable (not too large for a simple model)
        self.assertLess(result.model_size_on_disk_kb, 1000)  # Less than 1MB
        
        # Peak RAM should include input/output tensors
        self.assertGreater(result.model_peak_ram_kb, 10)  # At least 10KB
        
        print(f"Memory Analysis:")
        print(f"  Model size on disk: {result.model_size_on_disk_kb:.2f} KB")
        print(f"  Peak RAM usage: {result.model_peak_ram_kb:.2f} KB")
        print(f"  Parameter memory: {result.model_total_param_memory_b:,} bytes")
    
    def test_layer_detail_completeness(self):
        """Test that layer details are complete and accurate."""
        model_path, keras_model = self.create_complex_model()
        
        # Parse the model
        result = self.parser.parse_model(model_path)
        
        # Verify all layers have required attributes
        for i, layer in enumerate(result.layer_details):
            with self.subTest(layer_index=i):
                self.assertIsInstance(layer.name, str)
                self.assertIsInstance(layer.index, int)
                self.assertGreaterEqual(layer.macs, 0)
                self.assertGreaterEqual(layer.flash_kb, 0)
    
    def test_error_handling_invalid_file(self):
        """Test error handling with invalid file."""
        invalid_path = os.path.join(self.temp_dir, 'nonexistent.tflite')
        
        with self.assertRaises(ModelFileNotFoundError):
            self.parser.parse_model(invalid_path)

    def test_error_handling_corrupted_file(self):
        """Test error handling with corrupted TFLite file."""
        corrupted_path = os.path.join(self.temp_dir, 'corrupted.tflite')
        
        # Write invalid content
        with open(corrupted_path, 'wb') as f:
            f.write(b'This is not a valid TFLite file')
        
        with self.assertRaises(ModelFormatNotSupportedError):
            self.parser.parse_model(corrupted_path)
    
    def test_validate_model_nonexistent(self):
        """Test model path validation with nonexistent file."""
        nonexistent_path = "/path/that/does/not/exist.tflite"
        
        with self.assertRaises(ModelFileNotFoundError) as context:
            self.parser._validate_model(Path(nonexistent_path))
        
        error = context.exception
        self.assertEqual(error.error_code, "FILE_NOT_FOUND")
        self.assertIn(str(Path(nonexistent_path)), str(error))
    
    def test_validate_model_directory(self):
        """Test model path validation with directory instead of file."""
        with self.assertRaises(ModelFileNotFoundError) as context:
            self.parser._validate_model(Path(self.temp_dir))
        
        self.assertEqual(context.exception.error_code, "FILE_NOT_FOUND")

    def test_model_comparison_efficiency(self):
        """Test comparing efficiency between different model architectures."""
        tf = get_tf()
        # Create standard conv model
        std_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(56, 56, 64)),
            tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10)
        ])
        
        # Create depthwise separable equivalent
        dw_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(56, 56, 64)),
            tf.keras.layers.DepthwiseConv2D(3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(128, 1, activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10)
        ])
        
        # Convert both models
        std_converter = tf.lite.TFLiteConverter.from_keras_model(std_model)
        std_converter.optimizations = []
        std_tflite = std_converter.convert()
        
        dw_converter = tf.lite.TFLiteConverter.from_keras_model(dw_model)
        dw_converter.optimizations = []
        dw_tflite = dw_converter.convert()
        
        # Save models
        std_path = os.path.join(self.temp_dir, 'standard_conv.tflite')
        dw_path = os.path.join(self.temp_dir, 'depthwise_conv.tflite')
        
        with open(std_path, 'wb') as f:
            f.write(std_tflite)
        with open(dw_path, 'wb') as f:
            f.write(dw_tflite)
        
        # Parse both models
        std_result = self.parser.parse_model(std_path)
        dw_result = self.parser.parse_model(dw_path)
        
        # Compare efficiency
        efficiency_ratio = std_result.total_macs / dw_result.total_macs if dw_result.total_macs > 0 else 0
        
        print(f"Model Efficiency Comparison:")
        print(f"  Standard Conv MACs: {std_result.total_macs:,}")
        print(f"  Depthwise Separable MACs: {dw_result.total_macs:,}")
        print(f"  Efficiency ratio: {efficiency_ratio:.1f}x")
        
        # Depthwise separable should be more efficient
        self.assertGreater(efficiency_ratio, 5)
    
    def test_utility_functions(self):
        """Test utility functions like factory functions."""
        # Test parser factory
        parser = TFLiteParser()
        self.assertIsInstance(parser, TFLiteParser)
        
        # Test convenience function
        model_path, _ = self.create_simple_conv2d_model()
        result = parse_tflite_model(model_path)
        self.assertIsInstance(result, ModelDetails)


if __name__ == '__main__':
    # Configure TensorFlow
    if has_tf():
        tf = get_tf()
        tf.get_logger().setLevel('ERROR')
        # Enable eager execution if needed
        tf.config.run_functions_eagerly(True)
    
    # Run tests with verbose output
    unittest.main(verbosity=2)