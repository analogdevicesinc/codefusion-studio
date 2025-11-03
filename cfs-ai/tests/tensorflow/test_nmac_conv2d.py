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
from utils import get_np, get_tf
import tempfile
import os
from pathlib import Path
from cfsai_model_parser.parse_tflm import TFLiteParser

class TestMACCalculationsWithRealModels(unittest.TestCase):
    """Test MAC calculations using real TensorFlow Lite models."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = TFLiteParser()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_conv2d_model(self, input_shape, filters, kernel_size, use_bias=False):
        """Create a simple Conv2D model and convert to TFLite."""
        tf = get_tf()
        # Create model
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),  # Remove batch dimension
            tf.keras.layers.Conv2D(
                filters=filters,
                kernel_size=kernel_size,
                use_bias=use_bias,
                padding='valid',
                activation=None
            )
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No quantization for testing
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'conv2d_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_depthwise_conv2d_model(self, input_shape, depth_multiplier, kernel_size, use_bias=True):
        """Create a DepthwiseConv2D model and convert to TFLite."""
        tf = get_tf()
        # Create model
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),  # Remove batch dimension
            tf.keras.layers.DepthwiseConv2D(
                kernel_size=kernel_size,
                depth_multiplier=depth_multiplier,
                use_bias=use_bias,
                padding='valid',
                activation=None
            )
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No quantization for testing
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'depthwise_conv2d_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_mobilenet_block_model(self, input_shape):
        """Create a MobileNet-style depthwise separable block."""
        tf = get_tf()
        input_channels = input_shape[-1]
        output_channels = input_channels * 2
        
        # Create model with depthwise + pointwise convolution
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),
            # Depthwise convolution
            tf.keras.layers.DepthwiseConv2D(
                kernel_size=3,
                depth_multiplier=1,
                padding='same',
                use_bias=False,
                activation=None
            ),
            # Pointwise convolution (1x1 Conv2D)
            tf.keras.layers.Conv2D(
                filters=output_channels,
                kernel_size=1,
                padding='same',
                use_bias=False,
                activation=None
            )
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'mobilenet_block.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def calculate_expected_conv2d_macs(self, input_shape, output_shape, kernel_shape):
        """Calculate expected MAC count for Conv2D."""
        # kernel_shape: [kernel_h, kernel_w, in_channels, out_channels]
        # output_shape: [batch, out_h, out_w, out_channels]
        
        batch, out_h, out_w, out_channels = output_shape
        kernel_h, kernel_w, in_channels, _ = kernel_shape
        
        # Conv2D MACs = output_spatial_size * output_channels * kernel_spatial_size * input_channels
        macs = out_h * out_w * out_channels * kernel_h * kernel_w * in_channels
        return macs
    
    def calculate_expected_depthwise_macs(self, output_shape, kernel_shape):
        """Calculate expected MAC count for DepthwiseConv2D."""
        # output_shape: [batch, out_h, out_w, out_channels]
        # kernel_shape: [kernel_h, kernel_w, in_channels, multiplier]
        
        batch, out_h, out_w, out_channels = output_shape
        kernel_h, kernel_w, _, _ = kernel_shape
        
        # DepthwiseConv2D MACs = output_elements * kernel_spatial_size
        macs = (batch * out_h * out_w * out_channels) * (kernel_h * kernel_w)
        return macs
    
    def get_layer_shapes_from_model(self, model_path):
        """Extract layer shapes from TFLite model for verification."""
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        
        # Get input and output details
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        # Get tensor details for all tensors
        tensor_details = []
        for i in range(len(interpreter.get_tensor_details())):
            tensor_details.append(interpreter.get_tensor_details()[i])
        
        return input_details, output_details, tensor_details
    
    def test_conv2d_3x3_basic(self):
        """Test Conv2D MAC calculation with 3x3 kernel."""
        input_shape = [1, 32, 32, 16]
        filters = 32
        kernel_size = 3
        
        # Create model
        model_path, keras_model = self.create_conv2d_model(input_shape, filters, kernel_size)
        
        # Calculate expected output shape (valid padding)
        expected_output_shape = [1, 30, 30, 32]  # 32-3+1 = 30
        kernel_shape = [3, 3, 16, 32]
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_conv2d_macs(
            input_shape, expected_output_shape, kernel_shape
        )
        # Expected: 30 * 30 * 32 * 3 * 3 * 16 = 41,472,000
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Conv2D layer
        conv_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "CONV_2D":
                conv_layer = layer
                break
        
        self.assertIsNotNone(conv_layer, "Conv2D layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = conv_layer.macs
        
        print(f"Conv2D 3x3 - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_conv2d_1x1_pointwise(self):
        """Test Conv2D MAC calculation with 1x1 kernel (pointwise)."""
        input_shape = [1, 56, 56, 128]
        filters = 256
        kernel_size = 1
        
        # Create model
        model_path, keras_model = self.create_conv2d_model(input_shape, filters, kernel_size)
        
        # Calculate expected output shape (1x1 kernel doesn't change spatial dimensions)
        expected_output_shape = [1, 56, 56, 256]
        kernel_shape = [1, 1, 128, 256]
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_conv2d_macs(
            input_shape, expected_output_shape, kernel_shape
        )
        # Expected: 56 * 56 * 256 * 1 * 1 * 128 = 102,760,448
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Conv2D layer
        conv_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "CONV_2D":
                conv_layer = layer
                break
        
        self.assertIsNotNone(conv_layer, "Conv2D layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = conv_layer.macs
        print(actual_macs, expected_macs, model_path)
        
        self.assertEqual(actual_macs, expected_macs)
        self.assertEqual(actual_macs, 102_760_448)
        
        print(f"Conv2D 1x1 - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_conv2d_5x5_large_kernel(self):
        """Test Conv2D MAC calculation with 5x5 kernel."""
        input_shape = [1, 28, 28, 64]
        filters = 128
        kernel_size = 5
        
        # Create model
        model_path, keras_model = self.create_conv2d_model(input_shape, filters, kernel_size)
        
        # Calculate expected output shape (valid padding)
        expected_output_shape = [1, 24, 24, 128]  # 28-5+1 = 24
        kernel_shape = [5, 5, 64, 128]
    
        # Calculate expected MACs
        expected_macs = self.calculate_expected_conv2d_macs(
            input_shape, expected_output_shape, kernel_shape
        )
        # Expected: 24 * 24 * 128 * 5 * 5 * 64 = 117,964,800
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Conv2D layer
        conv_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "CONV_2D":
                conv_layer = layer
                break
        
        self.assertIsNotNone(conv_layer, "Conv2D layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = conv_layer.macs
        self.assertEqual(actual_macs, expected_macs)

        
        print(f"Conv2D 5x5 - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_depthwise_conv2d_basic(self):
        """Test DepthwiseConv2D MAC calculation."""
        input_shape = [1, 112, 112, 32]
        depth_multiplier = 1
        kernel_size = 3
        
        # Create model
        model_path, keras_model = self.create_depthwise_conv2d_model(
            input_shape, depth_multiplier, kernel_size
        )
        
        # Calculate expected output shape (valid padding)
        expected_output_shape = [1, 110, 110, 32]  # 112-3+1 = 110
        kernel_shape = [3, 3, 32, 1]
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_depthwise_macs(
            expected_output_shape, kernel_shape
        )
        # Expected: (1 * 110 * 110 * 32) * (3 * 3) = 34,848,000
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find DepthwiseConv2D layer
        depthwise_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "DEPTHWISE_CONV_2D":
                depthwise_layer = layer
                break
        
        self.assertIsNotNone(depthwise_layer, "DepthwiseConv2D layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = depthwise_layer.macs
        
        print(f"DepthwiseConv2D 3x3 - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_depthwise_conv2d_with_multiplier(self):
        """Test DepthwiseConv2D with channel multiplier > 1."""
        input_shape = [1, 56, 56, 64]
        depth_multiplier = 2
        kernel_size = 3
        
        # Create model
        model_path, keras_model = self.create_depthwise_conv2d_model(
            input_shape, depth_multiplier, kernel_size
        )
        
        # Calculate expected output shape (valid padding)
        # Output channels = input_channels * depth_multiplier = 64 * 2 = 128
        expected_output_shape = [1, 54, 54, 128]  # 56-3+1 = 54
        kernel_shape = [3, 3, 64, 2]
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_depthwise_macs(
            expected_output_shape, kernel_shape
        )
        # Expected: (1 * 54 * 54 * 128) * (3 * 3) = 33,592,320
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find DepthwiseConv2D layer
        depthwise_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "DEPTHWISE_CONV_2D":
                depthwise_layer = layer
                break
        
        self.assertIsNotNone(depthwise_layer, "DepthwiseConv2D layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = depthwise_layer.macs
        self.assertEqual(actual_macs, expected_macs)
        
        print(f"DepthwiseConv2D with multiplier - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_mobilenet_depthwise_separable_block(self):
        """Test a complete MobileNet-style depthwise separable block."""
        input_shape = [1, 112, 112, 32]
        
        # Create model
        model_path, keras_model = self.create_mobilenet_block_model(input_shape)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find depthwise and pointwise layers
        depthwise_layer = None
        pointwise_layer = None
        
        for layer in parsed_model.layer_details:
            if layer.name == "DEPTHWISE_CONV_2D":
                depthwise_layer = layer
            elif layer.name == "CONV_2D":
                pointwise_layer = layer
        
        self.assertIsNotNone(depthwise_layer, "DepthwiseConv2D layer not found")
        self.assertIsNotNone(pointwise_layer, "Conv2D (pointwise) layer not found")
        
        # Calculate expected MACs for depthwise (3x3, same padding)
        # Output shape should be same as input: [1, 112, 112, 32]
        depthwise_expected = (1 * 112 * 112 * 32) * (3 * 3)  # 36,126,720
        
        # Calculate expected MACs for pointwise (1x1, 32 -> 64 channels)
        # Output shape: [1, 112, 112, 64]
        pointwise_expected = 112 * 112 * 64 * 1 * 1 * 32  # 25,690,112
        
        # Verify calculations
        self.assertEqual(depthwise_layer.macs, depthwise_expected)

        self.assertEqual(pointwise_layer.macs, pointwise_expected)
        
        # Total MACs for the block
        total_macs = depthwise_layer.macs + pointwise_layer.macs
        expected_total = depthwise_expected + pointwise_expected  # 61,816,832
        
        self.assertEqual(total_macs, expected_total)
        
        print(f"MobileNet Block - Depthwise MACs: {depthwise_layer.macs:,}")
        print(f"MobileNet Block - Pointwise MACs: {pointwise_layer.macs:,}")
        print(f"MobileNet Block - Total MACs: {total_macs:,}")
        
        # Verify efficiency: depthwise should be much more efficient than equivalent Conv2D
        equivalent_conv2d_macs = 112 * 112 * 32 * 3 * 3 * 32  # 1,161,216,000
        efficiency_ratio = equivalent_conv2d_macs / depthwise_layer.macs
        
        print(f"Efficiency ratio (Conv2D/Depthwise): {efficiency_ratio:.1f}x")
        self.assertGreater(efficiency_ratio, 30)  # Should be much more efficient
    
    def test_conv2d_without_bias(self):
        """Test Conv2D MAC calculation without bias (should be same as with bias)."""
        input_shape = [1, 32, 32, 16]
        filters = 32
        kernel_size = 3
        
        # Create model without bias
        model_path, keras_model = self.create_conv2d_model(input_shape, filters, kernel_size, use_bias=False)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Conv2D layer
        conv_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "CONV_2D":
                conv_layer = layer
                break
        
        self.assertIsNotNone(conv_layer, "Conv2D layer not found")
        
        # MAC calculation should be same regardless of bias
        expected_macs = 30 * 30 * 32 * 3 * 3 * 16  # 41,472,000
        actual_macs = conv_layer.macs
        
        self.assertEqual(actual_macs, expected_macs)
        print(f"Conv2D without bias - MACs: {actual_macs:,}")
    
    def test_model_total_macs(self):
        """Test that total model MACs are correctly calculated."""
        input_shape = [1, 112, 112, 32]
        
        # Create MobileNet block model
        model_path, keras_model = self.create_mobilenet_block_model(input_shape)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Calculate total MACs manually
        manual_total = sum(layer.macs for layer in parsed_model.layer_details if hasattr(layer, 'macs'))
        
        # Compare with parsed model total
        self.assertEqual(parsed_model.total_macs, manual_total)
        
        print(f"Model total MACs: {parsed_model.total_macs:,}")
        print(f"Manual calculation: {manual_total:,}")
        
        # Verify individual layer contributions
        for layer in parsed_model.layer_details:
            if hasattr(layer, 'macs') and layer.macs > 0:
                print(f"Layer {layer.index} ({layer.name}): {layer.macs:,} MACs")


class TestRealModelComparison(unittest.TestCase):
    """Compare MAC calculations with theoretical values for complex models."""
    
    def setUp(self):
        self.parser = TFLiteParser()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_efficiency_comparison(self):
        """Compare efficiency of different convolution types."""
        tf = get_tf()
        input_shape = [1, 56, 56, 128]
        # Standard Conv2D
        conv2d_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),
            tf.keras.layers.Conv2D(128, 3, padding='same', use_bias=False)
        ])
        
        # Depthwise Separable (DepthwiseConv2D + 1x1 Conv2D)
        depthwise_sep_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),
            tf.keras.layers.DepthwiseConv2D(3, padding='same', use_bias=False),
            tf.keras.layers.Conv2D(128, 1, padding='same', use_bias=False)
        ])
        
        # Convert both to TFLite
        models = {
            'conv2d': conv2d_model,
            'depthwise_sep': depthwise_sep_model
        }
        
        results = {}
        
        for name, model in models.items():
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.optimizations = []
            tflite_model = converter.convert()
            
            model_path = os.path.join(self.temp_dir, f'{name}_model.tflite')
            with open(model_path, 'wb') as f:
                f.write(tflite_model)
            
            # Parse and calculate MACs
            parsed_model = self.parser.parse_model(model_path)
            results[name] = parsed_model.total_macs
            
            print(f"{name} total MACs: {parsed_model.total_macs:,}")
        
        # Verify that depthwise separable is more efficient
        efficiency_ratio = results['conv2d'] / results['depthwise_sep']
        print(f"Efficiency improvement: {efficiency_ratio:.1f}x")
        
        # Theoretical efficiency for this case should be around 8-9x
        self.assertGreater(efficiency_ratio, 7)
        self.assertLess(efficiency_ratio, 10)


if __name__ == '__main__':
    # Set up TensorFlow for testing
    tf = get_tf()
    tf.get_logger().setLevel('ERROR')  # Reduce TensorFlow logging
    
    # Run tests with verbose output
    unittest.main(verbosity=2)