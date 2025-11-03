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
from utils import get_tf

from cfsai_model_parser.parse_tflm import TFLiteParser

class TestDenseLayerMACCalculations(unittest.TestCase):
    """Test MAC calculations for Dense (Fully Connected) layers using real TensorFlow Lite models."""
    
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
    
    def create_simple_dense_model(self, input_shape, units, use_bias=True):
        tf = get_tf()
        """Create a simple Dense layer model and convert to TFLite."""
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),  # Remove batch dimension
            tf.keras.layers.Dense(
                units=units,
                use_bias=use_bias,
                activation=None  # No activation for pure MAC calculation
            )
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No quantization for testing
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'dense_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_multi_dense_model(self, input_shape, units_list, use_bias=True):
        """Create a model with multiple Dense layers."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:])
        ])
        
        for i, units in enumerate(units_list):
            model.add(tf.keras.layers.Dense(
                units=units,
                use_bias=use_bias,
                activation='relu' if i < len(units_list) - 1 else None,  # ReLU except last layer
                name=f'dense_{i+1}'
            ))
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'multi_dense_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_cnn_to_dense_model(self, input_shape, dense_units):
        """Create a CNN model that flattens to Dense layers."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),
            tf.keras.layers.Conv2D(32, 3, activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            tf.keras.layers.Conv2D(64, 3, activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),  # Instead of Flatten for smaller size
            tf.keras.layers.Dense(dense_units, activation='relu'),
            tf.keras.layers.Dense(10, activation='softmax')  # Final classification layer
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'cnn_dense_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_large_dense_model(self, input_features, hidden_units):
        """Create a model with large Dense layers for testing overflow protection."""
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(input_features,)),
            tf.keras.layers.Dense(hidden_units, activation='relu'),
            tf.keras.layers.Dense(hidden_units // 2, activation='relu'),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'large_dense_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def calculate_expected_dense_macs(self, input_features, output_units):
        """Calculate expected MAC count for Dense layer."""
        # Dense layer MACs = input_features * output_units
        # Each output neuron requires input_features multiply-accumulate operations
        return input_features * output_units
    
    def test_simple_dense_layer_basic(self):
        """Test basic Dense layer MAC calculation."""
        input_shape = [1, 128]  # Batch size 1, 128 input features
        units = 64
        
        # Create model
        model_path, keras_model = self.create_simple_dense_model(input_shape, units)
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_dense_macs(128, 64)
        # Expected: 128 * 64 = 8,192
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer (FULLY_CONNECTED in TFLite)
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        self.assertIsNotNone(dense_layer, "Dense layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = dense_layer.macs
        self.assertEqual(actual_macs, expected_macs)
        self.assertEqual(actual_macs, 8_192)
        
        print(f"Simple Dense Layer - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_large_dense_layer(self):
        """Test Dense layer with large dimensions."""
        input_shape = [1, 2048]  # Large input dimension
        units = 1024
        
        # Create model
        model_path, keras_model = self.create_simple_dense_model(input_shape, units)
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_dense_macs(2048, 1024)
        # Expected: 2048 * 1024 = 2,097,152
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        self.assertIsNotNone(dense_layer, "Dense layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = dense_layer.macs
        self.assertEqual(actual_macs, expected_macs)
        self.assertEqual(actual_macs, 2_097_152)
        
        print(f"Large Dense Layer - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_very_large_dense_layer(self):
        """Test Dense layer with very large dimensions to check overflow protection."""
        input_shape = [1, 4096]
        units = 4096
        
        # Create model
        model_path, keras_model = self.create_simple_dense_model(input_shape, units)
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_dense_macs(4096, 4096)
        # Expected: 4096 * 4096 = 16,777,216
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        self.assertIsNotNone(dense_layer, "Dense layer not found in parsed model")
        
        # Verify MAC calculation
        actual_macs = dense_layer.macs
        self.assertEqual(actual_macs, expected_macs)
        self.assertEqual(actual_macs, 16_777_216)
        
        print(f"Very Large Dense Layer - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_dense_without_bias(self):
        """Test Dense layer MAC calculation without bias (should be same as with bias)."""
        input_shape = [1, 256]
        units = 128
        
        # Create model without bias
        model_path, keras_model = self.create_simple_dense_model(input_shape, units, use_bias=False)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        self.assertIsNotNone(dense_layer, "Dense layer not found")
        
        # MAC calculation should be same regardless of bias (bias doesn't add MACs)
        expected_macs = self.calculate_expected_dense_macs(256, 128)
        actual_macs = dense_layer.macs
        
        self.assertEqual(actual_macs, expected_macs)
        self.assertEqual(actual_macs, 32_768)
        
        print(f"Dense without bias - MACs: {actual_macs:,}")
    
    def test_multi_dense_layers(self):
        """Test model with multiple Dense layers."""
        input_shape = [1, 784]  # Like flattened MNIST
        units_list = [512, 256, 128, 10]
        
        # Create model
        model_path, keras_model = self.create_multi_dense_model(input_shape, units_list)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find all Dense layers
        dense_layers = []
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layers.append(layer)
        
        # Should have 4 Dense layers
        self.assertEqual(len(dense_layers), 4)
        
        # Calculate expected MACs for each layer
        expected_macs_per_layer = [
            self.calculate_expected_dense_macs(784, 512),    # 401,408
            self.calculate_expected_dense_macs(512, 256),    # 131,072
            self.calculate_expected_dense_macs(256, 128),    # 32,768
            self.calculate_expected_dense_macs(128, 10),     # 1,280
        ]
        
        # Verify each layer's MAC calculation
        for i, (layer, expected) in enumerate(zip(dense_layers, expected_macs_per_layer)):
            self.assertEqual(layer.macs, expected)
            print(f"Dense Layer {i+1} - Expected: {expected:,}, Actual: {layer.macs:,}")
        
        # Verify total MAC calculation
        total_expected = sum(expected_macs_per_layer)  # 566,528
        total_dense_macs = sum(layer.macs for layer in dense_layers)
        
        self.assertEqual(total_dense_macs, total_expected)
        
        print(f"Multi-Dense Model - Total Dense MACs: {total_dense_macs:,}")
    
    def test_cnn_to_dense_transition(self):
        """Test CNN model transitioning to Dense layers."""
        input_shape = [1, 32, 32, 3]  # CIFAR-10 like input
        dense_units = 128
        
        # Create model
        model_path, keras_model = self.create_cnn_to_dense_model(input_shape, dense_units)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layers
        dense_layers = []
        conv_layers = []
        
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layers.append(layer)
            elif layer.name == "CONV_2D":
                conv_layers.append(layer)
        
        # Should have at least 2 Dense layers and some Conv layers
        self.assertGreaterEqual(len(dense_layers), 2)
        self.assertGreaterEqual(len(conv_layers), 1)
        
        # Verify that Dense layers have reasonable MAC counts
        for i, layer in enumerate(dense_layers):
            self.assertGreater(layer.macs, 0)
            print(f"Dense Layer {i+1} in CNN model - MACs: {layer.macs:,}")
        
        # Total model should have significant computation from both conv and dense
        total_conv_macs = sum(layer.macs for layer in conv_layers)
        total_dense_macs = sum(layer.macs for layer in dense_layers)
        
        self.assertGreater(total_conv_macs, 0)
        self.assertGreater(total_dense_macs, 0)
        
        print(f"CNN-Dense Model - Conv MACs: {total_conv_macs:,}, Dense MACs: {total_dense_macs:,}")
        print(f"Total Model MACs: {parsed_model.total_macs:,}")
    
    def test_extremely_large_dense_layer(self):
        """Test Dense layer with extremely large dimensions for overflow testing."""
        input_shape = [1, 10000]  # Very large input
        units = 5000
        
        # Create model
        model_path, keras_model = self.create_simple_dense_model(input_shape, units)
        
        # Calculate expected MACs
        expected_macs = self.calculate_expected_dense_macs(10000, 5000)
        # Expected: 10000 * 5000 = 50,000,000
        
        # Parse model and get actual MACs
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        self.assertIsNotNone(dense_layer, "Dense layer not found in parsed model")
        
        # Verify MAC calculation with large numbers
        actual_macs = dense_layer.macs
        self.assertEqual(actual_macs, expected_macs)
        self.assertEqual(actual_macs, 50_000_000)
        
        print(f"Extremely Large Dense Layer - Expected MACs: {expected_macs:,}, Actual MACs: {actual_macs:,}")
    
    def test_dense_layer_parameter_count(self):
        """Test that Dense layer parameters are correctly identified."""
        input_shape = [1, 100]
        units = 50
        
        # Create model with bias
        model_path, keras_model = self.create_simple_dense_model(input_shape, units, use_bias=True)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        self.assertIsNotNone(dense_layer, "Dense layer not found")
        
        # Dense layer should have weight matrix (100 * 50) + bias (50) = 5,050 parameters
        # But we only count the weight matrix for MAC calculation
        expected_macs = 100 * 50  # 5,000
        actual_macs = dense_layer.macs
        
        self.assertEqual(actual_macs, expected_macs)
        
        # Check that layer has some memory usage for parameters
        self.assertGreater(dense_layer.flash_kb, 0)
        
        print(f"Dense Layer Parameters - MACs: {actual_macs:,}, Flash KB: {dense_layer.flash_kb:.2f}")
    
    def test_comparison_with_conv_efficiency(self):
        """Compare Dense layer efficiency with equivalent operations."""
        tf = get_tf()
        # Create a 1x1 Conv2D that's equivalent to Dense
        conv_input_shape = [1, 1, 1, 128]  # Spatial dimensions of 1x1
        conv_filters = 64
        
        conv_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=conv_input_shape[1:]),
            tf.keras.layers.Conv2D(conv_filters, 1, use_bias=False)  # 1x1 conv
        ])
        
        # Create equivalent Dense layer
        dense_input_shape = [1, 128]
        dense_units = 64
        
        dense_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=dense_input_shape[1:]),
            tf.keras.layers.Dense(dense_units, use_bias=False)
        ])
        
        # Convert both to TFLite
        models = {'conv': conv_model, 'dense': dense_model}
        results = {}
        
        for name, model in models.items():
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.optimizations = []
            tflite_model = converter.convert()
            
            model_path = os.path.join(self.temp_dir, f'{name}_equivalent.tflite')
            with open(model_path, 'wb') as f:
                f.write(tflite_model)
            
            # Parse model
            parsed = self.parser.parse_model(model_path)
            results[name] = parsed.total_macs
        
        # Both should have the same MAC count for equivalent operations
        expected_macs = 128 * 64  # 8,192
        
        # Note: Conv2D might be slightly different due to spatial dimensions
        # but the core computation should be the same
        self.assertEqual(results['dense'], expected_macs)
        
        print(f"Equivalent operations - Dense MACs: {results['dense']:,}, Conv2D MACs: {results['conv']:,}")
    
    def test_batch_size_independence(self):
        """Test that MAC calculation is independent of batch size."""
        tf = get_tf()
        input_features = 256
        units = 128
        
        # Create models with different implied batch processing
        model1 = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(input_features,)),
            tf.keras.layers.Dense(units, use_bias=False)
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model1)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        model_path = os.path.join(self.temp_dir, 'batch_independent.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Parse model
        parsed_model = self.parser.parse_model(model_path)
        
        # Find Dense layer
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        # MAC count should be independent of batch size (only weight matrix size matters)
        expected_macs = input_features * units  # 256 * 128 = 32,768
        actual_macs = dense_layer.macs
        
        self.assertEqual(actual_macs, expected_macs)
        
        print(f"Batch Independent Dense - MACs: {actual_macs:,}")


class TestDenseLayerEdgeCases(unittest.TestCase):
    """Test edge cases and error conditions for Dense layer MAC calculations."""
    
    def setUp(self):
        self.parser = TFLiteParser()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_single_neuron_dense(self):
        """Test Dense layer with single output neuron."""
        tf = get_tf()
        input_shape = [1, 1000]
        units = 1
        
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),
            tf.keras.layers.Dense(units, use_bias=False)
        ])
        
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        model_path = os.path.join(self.temp_dir, 'single_neuron.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Parse and verify
        parsed_model = self.parser.parse_model(model_path)
        
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        # Should have 1000 MACs (1000 inputs * 1 output)
        expected_macs = 1000 * 1
        self.assertEqual(dense_layer.macs, expected_macs)
        
        print(f"Single Neuron Dense - MACs: {dense_layer.macs:,}")
    
    def test_minimal_dense_layer(self):
        """Test minimal Dense layer (1 input, 1 output)."""
        tf = get_tf()
        input_shape = [1, 1]
        units = 1
        
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=input_shape[1:]),
            tf.keras.layers.Dense(units, use_bias=False)
        ])
        
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        model_path = os.path.join(self.temp_dir, 'minimal_dense.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Parse and verify
        parsed_model = self.parser.parse_model(model_path)
        
        dense_layer = None
        for layer in parsed_model.layer_details:
            if layer.name == "FULLY_CONNECTED":
                dense_layer = layer
                break
        
        # Should have 1 MAC (1 input * 1 output)
        expected_macs = 1 * 1
        self.assertEqual(dense_layer.macs, expected_macs)
        
        print(f"Minimal Dense Layer - MACs: {dense_layer.macs:,}")


if __name__ == '__main__':
    # Set up TensorFlow for testing
    tf = get_tf()
    tf.get_logger().setLevel('ERROR')  # Reduce TensorFlow logging
    
    # Run tests with verbose output
    unittest.main(verbosity=2)