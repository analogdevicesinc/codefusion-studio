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
from unittest.mock import Mock, patch, MagicMock
from utils import get_tf, has_tf


from cfsai_compatibility_analyzer.analyze_compatibility import CompatibilityAnalyzer
from cfsai_compatibility_analyzer.exceptions import (
    CompatibilityAnalysisError,
    InvalidHardwareMetadataError,
    ModelParsingError,
)
from cfsai_compatibility_analyzer.schemas import (
    CompatibilityReport,
    MemoryIssue,
    OperatorIssue,
    UnsupportedTypeIssue,
)
from cfsai_model_parser.schemas import LayerDetail, ModelDetails

from cfsai_types.hardware_profile import HardwareProfile


class TestCompatibilityAnalyzer(unittest.TestCase):
    """Test suite for CompatibilityAnalyzer class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.analyzer = CompatibilityAnalyzer()
        self.temp_dir = tempfile.mkdtemp()
        
        # Standard hardware metadata for testing
        self.valid_hw_meta = HardwareProfile(
            SupportedOps=[
                "CONV_2D", "DEPTHWISE_CONV_2D", "FULLY_CONNECTED",
                "ADD", "MUL", "RELU", "SOFTMAX", "MAX_POOL_2D",
                "AVERAGE_POOL_2D"
            ],
            AccelOps=[],
            SupportedDataTypes=["INT8", "UINT8", "INT16"],
            FlashSize=1024.0,
            RamSize=512.0,
            CoreClock=800.0,
            OperatorInfos=[]
        )
        
        # Restrictive hardware metadata for testing failures
        self.restrictive_hw_meta = HardwareProfile(
            SupportedOps=["ADD", "MUL"], # Very limited
            AccelOps=[],
            SupportedDataTypes=["INT8"], # Only INT8
            FlashSize=100.0,   # 100KB flash -very small
            RamSize=50.0,      # 50KB RAM - very small
            CoreClock=100.0,
            OperatorInfos=[]
        )
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_mock_model_details(self, **kwargs):
        """Create a mock ModelDetails object with sensible defaults."""
        defaults = {
            'layer_details': [],
            'total_macs': 1000000,
            'model_total_param_memory_b': 10000,
            'model_size_on_disk_kb': 50,
            'model_peak_ram_kb': 100,
            'target_dtype': 'FLOAT32'
        }
        defaults.update(kwargs)
        
        mock_model = Mock(spec=ModelDetails)
        for attr, value in defaults.items():
            setattr(mock_model, attr, value)
        
        return mock_model
    
    def create_mock_layer(self, name="CONV_2D", index=0, **kwargs):
        """Create a mock LayerDetail object."""
        mock_layer = Mock(spec=LayerDetail)
        mock_layer.name = name
        mock_layer.index = index
        mock_layer.flash_kb = kwargs.get('flash_kb', 10)
        
        # Add tensor data types if specified
        if 'input_tensors' in kwargs:
            mock_layer.input_tensors = kwargs['input_tensors']
        if 'output_tensors' in kwargs:
            mock_layer.output_tensors = kwargs['output_tensors']
        if 'weights_dtype' in kwargs:
            mock_layer.weights_dtype = kwargs['weights_dtype']
        
        return mock_layer
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def create_real_tflite_model(self, model_type="simple_conv"):
        """Create a real TensorFlow Lite model for testing."""
        tf = get_tf()
        if model_type == "simple_conv":
            # Simple Conv2D model
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(32, 32, 3)),
                tf.keras.layers.Conv2D(16, 3, activation='relu'),
                tf.keras.layers.GlobalAveragePooling2D(),
                tf.keras.layers.Dense(10, activation='softmax')
            ])
        elif model_type == "depthwise_separable":
            # DepthwiseConv2D model
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(224, 224, 3)),
                tf.keras.layers.DepthwiseConv2D(3, activation='relu'),
                tf.keras.layers.Conv2D(32, 1, activation='relu'),
                tf.keras.layers.GlobalAveragePooling2D(),
                tf.keras.layers.Dense(1000, activation='softmax')
            ])
        elif model_type == "unsupported_ops":
            # Model with potentially unsupported operations
            model = tf.keras.Sequential([
                tf.keras.layers.Input(shape=(28, 28, 1)),
                tf.keras.layers.Lambda(lambda x: tf.nn.swish(x)),  # Custom activation
                tf.keras.layers.Flatten(),
                tf.keras.layers.Dense(10)
            ])
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No quantization
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, f'{model_type}_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def create_quantized_tflite_model(self):
        """Create a quantized INT8 TensorFlow Lite model."""
        tf = get_tf()
        # Create a simple model
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(32, 32, 3)),
            tf.keras.layers.Conv2D(8, 3, activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(5, activation='softmax')
        ])
        
        # Convert with INT8 quantization
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.int8]
        
        # Create representative dataset for quantization
        def representative_data_gen():
            for _ in range(100):
                yield [tf.random.normal((1, 32, 32, 3))]
        
        converter.representative_dataset = representative_data_gen
        converter.inference_input_type = tf.int8
        converter.inference_output_type = tf.int8
        
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'quantized_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path
    
    def test_init_analyzer(self):
        """Test CompatibilityAnalyzer initialization."""
        analyzer = CompatibilityAnalyzer()
        self.assertIsNotNone(analyzer.logger)
        self.assertEqual(analyzer.logger.name, 
                        "cfsai_compatibility_analyzer.analyze_compatibility.CompatibilityAnalyzer")
    
    @patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser')
    def test_analyze_model_empty_hardware_metadata(self, mock_parser_class):
        """Test analyze_model with empty hardware metadata."""
        # Create a dummy model file
        dummy_model = os.path.join(self.temp_dir, "test.tflite")
        with open(dummy_model, 'wb') as f:
            f.write(b"dummy content")
        
        with self.assertRaises(InvalidHardwareMetadataError) as context:
            self.analyzer.analyze_model(dummy_model, None)
        
        self.assertEqual(context.exception.error_code, "EMPTY_METADATA")
    
    @patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser')
    def test_analyze_model_success_no_issues(self, mock_parser_class):
        """Test successful model analysis with no compatibility issues."""
        # Create a dummy model file
        dummy_model = os.path.join(self.temp_dir, "test.tflite")
        with open(dummy_model, 'wb') as f:
            f.write(b"dummy content")
        
        # Mock parser and model
        mock_parser = Mock()
        mock_parser_class.return_value = mock_parser
        
        # Create mock layers with supported operations
        supported_layers = [
            self.create_mock_layer("CONV_2D", 0),
            self.create_mock_layer("RELU", 1),
            self.create_mock_layer("FULLY_CONNECTED", 2)
        ]
        
        mock_model = self.create_mock_model_details(
            layer_details=supported_layers,
            model_size_on_disk_kb=100,  # Within 1MB limit
            model_peak_ram_kb=200,      # Within 512KB limit
            target_dtype='INT8'         # Supported data type
        )
        
        mock_parser.parse_model.return_value = mock_model
        
        # Analyze model
        report = self.analyzer.analyze_model(dummy_model, self.valid_hw_meta)
        
        # Verify results
        self.assertIsInstance(report, CompatibilityReport)
        self.assertIsNone(report.operator_issues)
        self.assertIsNone(report.memory_issues)
        self.assertIsNone(report.unsupported_types)
    
    @patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser')
    def test_analyze_model_operator_issues(self, mock_parser_class):
        """Test model analysis with unsupported operators."""
        # Create a dummy model file
        dummy_model = os.path.join(self.temp_dir, "test.tflite")
        with open(dummy_model, 'wb') as f:
            f.write(b"dummy content")
        
        # Mock parser
        mock_parser = Mock()
        mock_parser_class.return_value = mock_parser
        
        # Create mock layers with unsupported operations
        layers_with_unsupported = [
            self.create_mock_layer("CONV_2D", 0),           # Supported
            self.create_mock_layer("CUSTOM_OP", 1),         # Unsupported
            self.create_mock_layer("ADVANCED_CONV", 2),     # Unsupported
        ]
        
        mock_model = self.create_mock_model_details(
            layer_details=layers_with_unsupported,
            model_size_on_disk_kb=100,
            target_dtype='INT8'
        )
        
        mock_parser.parse_model.return_value = mock_model
        
        # Analyze model
        report = self.analyzer.analyze_model(dummy_model, self.valid_hw_meta)
        
        # Verify operator issues detected
        self.assertIsNotNone(report.operator_issues)
        self.assertEqual(len(report.operator_issues), 2)
        
        # Check specific issues
        custom_op_issue = next((issue for issue in report.operator_issues 
                               if issue.operator == "CUSTOM_OP"), None)
        self.assertIsNotNone(custom_op_issue)
        self.assertEqual(custom_op_issue.layer_index, 1)
        self.assertEqual(custom_op_issue.severity, "critical")
    
    @patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser')
    def test_analyze_model_memory_issues(self, mock_parser_class):
        """Test model analysis with memory constraint violations."""
        # Create a dummy model file
        dummy_model = os.path.join(self.temp_dir, "test.tflite")
        with open(dummy_model, 'wb') as f:
            f.write(b"dummy content")
        
        # Mock parser
        mock_parser = Mock()
        mock_parser_class.return_value = mock_parser
        
        # Create mock model with large memory requirements
        large_model = self.create_mock_model_details(
            layer_details=[self.create_mock_layer("CONV_2D", 0)],
            model_size_on_disk_kb=2048,  # 2MB - exceeds 1MB flash limit
            model_peak_ram_kb=1024,      # 1MB - exceeds 512KB RAM limit
            target_dtype='FLOAT32'
        )
        
        mock_parser.parse_model.return_value = large_model
        
        # Analyze model with restrictive constraints
        report = self.analyzer.analyze_model(dummy_model, self.valid_hw_meta)
        
        # Verify memory issues detected
        self.assertIsNotNone(report.memory_issues)
        self.assertTrue(len(report.memory_issues) > 0)
        
        memory_issue = report.memory_issues[0]
        self.assertIn("overflow", memory_issue.type)

        self.assertEqual(memory_issue.severity, "critical")
        self.assertIsNotNone(memory_issue.primary_recommendation)
    
    @patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser')
    def test_analyze_model_data_type_issues(self, mock_parser_class):
        """Test model analysis with unsupported data types."""
        # Create a dummy model file
        dummy_model = os.path.join(self.temp_dir, "test.tflite")
        with open(dummy_model, 'wb') as f:
            f.write(b"dummy content")
        
        # Mock parser
        mock_parser = Mock()
        mock_parser_class.return_value = mock_parser
        
        # Create mock layers with unsupported data types
        layers_with_float = [
            self.create_mock_layer("CONV_2D", 0, weights_dtype="FLOAT32"),
            self.create_mock_layer("RELU", 1),
        ]
        
        mock_model = self.create_mock_model_details(
            layer_details=layers_with_float,
            target_dtype='FLOAT32',  # Unsupported in restrictive hw_meta
            model_size_on_disk_kb=50
        )
        
        mock_parser.parse_model.return_value = mock_model
        
        # Analyze model with restrictive data type support
        report = self.analyzer.analyze_model(dummy_model, self.restrictive_hw_meta)
        
        # Verify data type issues detected
        self.assertIsNotNone(report.unsupported_types)
        self.assertTrue(len(report.unsupported_types) > 0)
        
        type_issue = report.unsupported_types[0]
        self.assertEqual(type_issue.data_type, "FLOAT32")
        self.assertEqual(type_issue.severity, "critical")
    
    @patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser')
    def test_analyze_model_parsing_failure(self, mock_parser_class):
        """Test model analysis with parsing failure."""
        # Create a dummy model file
        dummy_model = os.path.join(self.temp_dir, "test.tflite")
        with open(dummy_model, 'wb') as f:
            f.write(b"invalid tflite content")
        
        # Mock parser to raise exception
        mock_parser = Mock()
        mock_parser_class.return_value = mock_parser
        mock_parser.parse_model.side_effect = Exception("Parse failed")
        
        # Should raise ModelParsingError
        with self.assertRaises(ModelParsingError) as context:
            self.analyzer.analyze_model(dummy_model, self.valid_hw_meta)
        
        error = context.exception
        self.assertEqual(error.error_code, "MODEL_PARSE_FAILED")
        self.assertIn("Parse failed", str(error))
    
    def test_find_operator_alternative(self):
        """Test operator alternative suggestion logic."""
        # Test known alternatives
        self.assertEqual(
            self.analyzer._find_operator_alternative("COMPLEX_ACTIVATION"), 
            "RELU"
        )
        
        # Test unknown operator
        self.assertEqual(
            self.analyzer._find_operator_alternative("UNKNOWN_OP"), 
            "None"
        )
    
    def test_get_layer_data_types(self):
        """Test layer data type extraction."""
        # Create mock tensors
        mock_input_tensor = Mock()
        mock_input_tensor.dtype = "FLOAT32"
        
        mock_output_tensor = Mock()
        mock_output_tensor.dtype = "INT8"
        
        # Create layer with tensor data types
        layer = self.create_mock_layer(
            "CONV_2D", 0,
            input_tensors=[mock_input_tensor],
            output_tensors=[mock_output_tensor],
            weights_dtype="FLOAT32"
        )
        
        data_types = self.analyzer._get_layer_data_types(layer)
        
        # Should include unique data types found (duplicates removed)
        expected_types = ["FLOAT32", "INT8"]  # input, output, weights (FLOAT32 deduplicated)
        self.assertEqual(sorted(data_types), sorted(expected_types))
    
    def test_get_optimization_opportunities(self):
        """Test optimization opportunity identification."""
        # Create layers with FLOAT32 data types (quantization candidates)
        layers = [
            self.create_mock_layer("CONV_2D", 0, flash_kb=100, weights_dtype="FLOAT32"),
            self.create_mock_layer("FULLY_CONNECTED", 1, flash_kb=50, weights_dtype="FLOAT32"),
            self.create_mock_layer("RELU", 2, flash_kb=1, weights_dtype="INT8"),  # Already optimized
        ]
        
        opportunities = self.analyzer._get_optimization_opportunities(layers)
        
        # Should find opportunities for FLOAT32 layers
        self.assertEqual(len(opportunities), 2)  # CONV_2D and FULLY_CONNECTED
        
        # Check first opportunity (should be largest by potential savings)
        top_opportunity = opportunities[0]
        self.assertEqual(top_opportunity.optimization_method, "quantization")
        self.assertGreater(top_opportunity.potential_savings_kb, 0)
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def test_analyze_real_conv2d_model(self):
        """Test analysis with a real Conv2D TensorFlow Lite model."""
        # Create real model
        model_path = self.create_real_tflite_model("simple_conv")
        
        # Analyze with permissive hardware metadata
        report = self.analyzer.analyze_model(model_path, self.valid_hw_meta)
        
        # Should have minimal issues with permissive constraints
        self.assertIsInstance(report, CompatibilityReport)
        
        # May have data type issues due to FLOAT32 default
        if report.unsupported_types:
            self.assertTrue(any("FLOAT32" in str(issue) for issue in report.unsupported_types))
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def test_analyze_real_depthwise_model(self):
        """Test analysis with a real DepthwiseConv2D model."""
        # Create real model with depthwise convolution
        model_path = self.create_real_tflite_model("depthwise_separable")
        
        # Analyze model
        report = self.analyzer.analyze_model(model_path, self.valid_hw_meta)
        
        self.assertIsInstance(report, CompatibilityReport)
        
        # Check if DEPTHWISE_CONV_2D is properly supported
        if report.operator_issues:
            unsupported_ops = [issue.operator for issue in report.operator_issues]
            self.assertNotIn("DEPTHWISE_CONV_2D", unsupported_ops)
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def test_analyze_quantized_model(self):
        """Test analysis with a quantized INT8 model."""
        # Create quantized model
        model_path = self.create_quantized_tflite_model()
        
        # Analyze with restrictive constraints that only support INT8
        report = self.analyzer.analyze_model(model_path, self.restrictive_hw_meta)
        
        self.assertIsInstance(report, CompatibilityReport)
        
        # Should have fewer data type issues since model is quantized
        if report.unsupported_types:
            float_issues = [issue for issue in report.unsupported_types 
                           if "FLOAT" in issue.data_type]
            # Should be fewer FLOAT32 issues compared to non-quantized model
            self.assertLessEqual(len(float_issues), 1)
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def test_analyze_model_with_restrictive_constraints(self):
        """Test analysis with very restrictive hardware constraints."""
        # Create a simple model
        model_path = self.create_real_tflite_model("simple_conv")
        
        # Use very restrictive constraints
        ultra_restrictive_meta = HardwareProfile(
            SupportedOps=["ADD"], # Only add
            AccelOps=[],
            SupportedDataTypes=["INT8"], # Only INT8
            FlashSize=10.0,   # 10KB flash -very small
            RamSize=5.0,      # 5KB RAM - very small
            CoreClock=100.0,
            OperatorInfos=[]
        )
        
        # Analyze model
        report = self.analyzer.analyze_model(model_path, ultra_restrictive_meta)
        
        # Should have multiple critical issues
        self.assertIsNotNone(report.operator_issues)  # Unsupported CONV_2D
        self.assertIsNotNone(report.memory_issues)    # Exceeds memory limits
        
        # Check that issues are marked as critical
        if report.operator_issues:
            self.assertTrue(all(issue.severity == "critical" 
                              for issue in report.operator_issues))
    
class TestCompatibilityAnalyzerIntegration(unittest.TestCase):
    """Integration tests for CompatibilityAnalyzer with real workflows."""
    
    def setUp(self):
        self.analyzer = CompatibilityAnalyzer()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def test_end_to_end_analysis_workflow(self):
        """Test complete end-to-end analysis workflow."""
        tf = get_tf()
        # Create a realistic model
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(224, 224, 3)),
            tf.keras.layers.Conv2D(32, 3, activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            tf.keras.layers.Conv2D(64, 3, activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(10, activation='softmax')
        ])
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        tflite_model = converter.convert()
        
        model_path = os.path.join(self.temp_dir, 'integration_test_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        # Define realistic embedded hardware constraints
        embedded_hw_meta = HardwareProfile(
            SupportedOps=[
                "CONV_2D", "MAX_POOL_2D", "MEAN", "FULLY_CONNECTED", 
                "SOFTMAX", "RELU", "ADD", "MUL"
            ],
            AccelOps=[],
            SupportedDataTypes=["FLOAT32", "INT8", "UINT8"],
            FlashSize=2048.0,
            RamSize=1024.0,
            CoreClock=100.0,
            OperatorInfos=[]
        )
        
        # Perform analysis
        report = self.analyzer.analyze_model(model_path, embedded_hw_meta)
        
        # Verify report structure
        self.assertIsInstance(report, CompatibilityReport)
        
        # Log results for inspection
        print(f"\n=== Integration Test Results ===")
        print(f"Operator issues: {len(report.operator_issues) if report.operator_issues else 0}")
        print(f"Memory issues: {len(report.memory_issues) if report.memory_issues else 0}")
        print(f"Type issues: {len(report.unsupported_types) if report.unsupported_types else 0}")
        
        # Basic validation - should not crash and should return valid report
        self.assertTrue(hasattr(report, 'memory_issues'))
        self.assertTrue(hasattr(report, 'operator_issues'))
        self.assertTrue(hasattr(report, 'unsupported_types'))


if __name__ == '__main__':
    # Configure TensorFlow if available
    if has_tf():
        tf = get_tf()
        tf.get_logger().setLevel('ERROR')
    
    # Run tests with verbose output
    unittest.main(verbosity=2)
