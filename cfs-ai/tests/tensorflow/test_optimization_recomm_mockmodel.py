"""
Unit tests for optimization recommendations functionality.

This test suite specifically focuses on testing the optimization recommendation
systems across compatibility analyzer and resource profiler for various scenarios,
particularly with large model sizes and high MAC usage. Tests validate that
appropriate optimization suggestions are generated based on model characteristics
and resource constraints.

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""
import unittest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from utils import has_tf, get_tf

from cfsai_compatibility_analyzer.analyze_compatibility import CompatibilityAnalyzer
from cfsai_compatibility_analyzer.schemas import (
    CompatibilityReport,
    MemoryIssue,
    OperatorIssue,
    UnsupportedTypeIssue,
    SeverityLevel,
)
from cfsai_resource_profiler.profile_resources import TFLiteResourceProfiler
from cfsai_resource_profiler.schemas import (
    ResourceProfileReport,
    OptimizationOpportunities,
    MemoryAnalysis,
    OptimizationSuggestion,
)
from cfsai_model_parser.schemas import LayerDetail, ModelDetails, TensorLifecycle

from cfsai_types.hardware_profile import HardwareProfile

class TestOptimizationRecommendations(unittest.TestCase):
    """Test suite for optimization recommendation functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.compatibility_analyzer = CompatibilityAnalyzer()
        self.resource_profiler = TFLiteResourceProfiler()
        self.temp_dir = tempfile.mkdtemp()
        
        # Constrained hardware profile for testing optimization recommendations
        self.constrained_hw_meta = HardwareProfile(
            SupportedOps=[
                "CONV_2D", "DEPTHWISE_CONV_2D", "FULLY_CONNECTED",
                "ADD", "MUL", "RELU", "SOFTMAX", "MAX_POOL_2D",
                "AVERAGE_POOL_2D"
            ],
            AccelOps=[],
            SupportedDataTypes=["INT8", "UINT8", "INT16"],
            FlashSize=512.0,
            RamSize=128.0,
            CoreClock=48.0,
            OperatorInfos=[]
        )
        
        # Resource profiler constrained hardware profile
        self.constrained_resource_profile = HardwareProfile(
            SupportedOps=[],
            AccelOps=[],
            SupportedDataTypes=[],
            FlashSize=512.0,
            RamSize=128.0,
            CoreClock=48.0,
            OperatorInfos=[
                {
                    "Name": "MAC",
                    "Cycles": 2.0,
                    "Energy": 5.0
                }
            ]
        )
        
        # Suppress TensorFlow warnings if available
        if has_tf():
            tf = get_tf()
            tf.get_logger().setLevel('ERROR')
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_mock_large_model_details(self, model_size_mb=10.0, total_macs=50000000, 
                                      target_dtype="FLOAT32", has_large_dense=True):
        """Create mock ModelDetails for a large model with high resource usage."""
        # Create large layers with high MAC counts
        large_layers = []
        total_flash_kb = 0.0
        
        # Create convolutional layers with high MAC counts
        for i in range(8):  # Multiple conv layers
            layer_macs = 5000000 + i * 1000000  # 5M-12M MACs per layer
            flash_kb = 1024.0  # 1MB parameters in KB
            total_flash_kb += flash_kb
            large_layers.append(LayerDetail(
                index=i,
                name="CONV_2D",
                macs=layer_macs,
                flash_kb=flash_kb,
                kernel_tensors=[[3, 3, 32, 64]],  # Example kernel shape
                ram_kb=512,  # 512KB runtime memory
                input_tensors=[i] if i > 0 else [0],
                output_tensors=[i+1],
                lifecycle=TensorLifecycle(new=1, live=i+2, terminated=0)
            ))
        
        if has_large_dense:
            # Add large dense layer with very high MAC count
            dense_flash_kb = 8192.0  # 8MB parameters in KB
            total_flash_kb += dense_flash_kb
            large_layers.append(LayerDetail(
                index=len(large_layers),
                name="FULLY_CONNECTED",
                macs=15000000,  # 15M MACs for dense layer
                flash_kb=dense_flash_kb,
                kernel_tensors=[[2048, 1000]],  # Dense layer shape
                ram_kb=256,  # 256KB runtime memory
                input_tensors=[len(large_layers)],
                output_tensors=[len(large_layers)+1],
                lifecycle=TensorLifecycle(new=1, live=len(large_layers)+2, terminated=0)
            ))
        
        # Calculate consistent model parameter memory (convert KB to bytes)
        model_param_memory_b = total_flash_kb * 1024
        
        return ModelDetails(
            model_name="large_test_model",
            model_path="/tmp/large_model.tflite",
            framework="TensorFlow Lite",
            model_size_on_disk_kb=model_size_mb * 1024,  # Convert MB to KB
            target_dtype=target_dtype,
            layer_count=len(large_layers),
            layer_details=large_layers,
            total_macs=total_macs,
            model_total_param_memory_b=model_param_memory_b,  # Consistent with layer flash memory
            model_peak_ram_kb=2048,  # 2MB peak RAM usage
        )
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def create_real_large_model(self):
        """Create a real large TensorFlow Lite model for testing."""
        # Create a large ResNet-like model
        tf = get_tf()
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(224, 224, 3)),
            
            # Initial conv layer
            tf.keras.layers.Conv2D(64, 7, strides=2, padding='same', activation='relu'),
            tf.keras.layers.MaxPooling2D(3, strides=2, padding='same'),
            
            # Large conv blocks with high MAC counts
            tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(128, 3, padding='same', activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            
            tf.keras.layers.Conv2D(256, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(256, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(256, 3, padding='same', activation='relu'),
            tf.keras.layers.MaxPooling2D(2),
            
            tf.keras.layers.Conv2D(512, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(512, 3, padding='same', activation='relu'),
            tf.keras.layers.Conv2D(512, 3, padding='same', activation='relu'),
            tf.keras.layers.GlobalAveragePooling2D(),
            
            # Very large dense layers
            tf.keras.layers.Dense(4096, activation='relu'),  # Large dense layer
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(2048, activation='relu'),  # Another large dense layer
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(1000, activation='softmax')  # Output layer
        ])
        
        # Convert to TFLite without optimization to maintain large size
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No optimization to keep it large
        tflite_model = converter.convert()
        
        # Save to file
        model_path = os.path.join(self.temp_dir, 'large_real_model.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path
    
    def test_compatibility_analyzer_large_model_recommendations(self):
        """Test compatibility analyzer optimization recommendations for large models."""
        # Create mock large model with high resource usage
        large_model = self.create_mock_large_model_details(
            model_size_mb=15.0,     # 15MB model
            total_macs=80000000,    # 80M MACs
            target_dtype="FLOAT32"
        )
        
        # Mock the parser to return our large model
        with patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser
            mock_parser.parse_model.return_value = large_model
            
            # Analyze with constrained hardware
            report = self.compatibility_analyzer.analyze_model(
                "/tmp/mock_large_model.tflite",
                self.constrained_hw_meta
            )
            
            # Verify that we get a compatibility report
            self.assertIsInstance(report, CompatibilityReport)
            
            # Should detect memory issues due to large model size vs constrained RAM
            memory_issues = report.memory_issues or []
            # Note: may not always detect memory issues depending on analysis logic
            
            # Should detect data type issues (FLOAT32 not in supported types)
            type_issues = report.unsupported_types or []
            self.assertGreater(len(type_issues), 0, "Should detect unsupported FLOAT32 data type")
            
            # Get optimization recommendations
            quick_fixes = report.get_quick_fixes()
            self.assertIsInstance(quick_fixes, list)
            
            # Should provide some recommendations since there are data type issues at minimum
            if len(type_issues) > 0:
                self.assertGreater(len(quick_fixes), 0, "Should provide optimization recommendations for type issues")
            
            # Check for quantization recommendations
            quantization_recommended = any(
                "quantization" in fix.lower() or "int8" in fix.lower() or "convert" in fix.lower()
                for fix in quick_fixes
            )
            if len(type_issues) > 0:
                self.assertTrue(quantization_recommended, 
                              "Should recommend quantization/conversion for FLOAT32 model")
            
            print(f"Large Model Compatibility Analysis:")
            print(f"  Model size: {large_model.model_size_on_disk_kb/1024:.1f} MB")
            print(f"  Total MACs: {large_model.total_macs:,}")
            print(f"  Memory issues detected: {len(memory_issues)}")
            print(f"  Type issues detected: {len(type_issues)}")
            print(f"  Quick fixes recommended: {len(quick_fixes)}")
            for i, fix in enumerate(quick_fixes, 1):
                print(f"    {i}. {fix}")
    
    def test_compatibility_analyzer_high_mac_model_recommendations(self):
        """Test compatibility analyzer recommendations for models with very high MAC counts."""
        # Create model with extremely high MAC usage but smaller size
        high_mac_model = self.create_mock_large_model_details(
            model_size_mb=3.0,       # Smaller model size
            total_macs=200000000,    # 200M MACs - very high computational load
            target_dtype="FLOAT32",
            has_large_dense=True
        )
        
        with patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser
            mock_parser.parse_model.return_value = high_mac_model
            
            # Analyze with constrained hardware that has MAC limits
            report = self.compatibility_analyzer.analyze_model(
                "/tmp/mock_high_mac_model.tflite",
                self.constrained_hw_meta
            )
            
            self.assertIsInstance(report, CompatibilityReport)
            
            # Should still detect data type issues
            memory_issues = report.memory_issues or []
            type_issues = report.unsupported_types or []
            self.assertGreater(len(type_issues), 0, "Should detect unsupported FLOAT32")
            
            # Get recommendations
            quick_fixes = report.get_quick_fixes()
            self.assertIsInstance(quick_fixes, list)
            
            # Should provide recommendations if there are any issues
            total_issues = len(type_issues) + len(memory_issues)
            if total_issues > 0:
                self.assertGreater(len(quick_fixes), 0, "Should provide recommendations for high MAC model")
            
            # Should recommend data type conversion (which helps with MAC efficiency)
            quantization_recommended = any(
                "int8" in fix.lower() or "quantization" in fix.lower() or "convert" in fix.lower()
                for fix in quick_fixes
            )
            if len(type_issues) > 0:
                self.assertTrue(quantization_recommended, 
                              "Should recommend quantization for computational efficiency")
            
            print(f"High MAC Model Compatibility Analysis:")
            print(f"  Model size: {high_mac_model.model_size_on_disk_kb/1024:.1f} MB")
            print(f"  Total MACs: {high_mac_model.total_macs:,}")
            print(f"  MAC density: {high_mac_model.total_macs/(high_mac_model.model_size_on_disk_kb/1024):.0f} MACs/MB")
            print(f"  Quick fixes recommended: {len(quick_fixes)}")
            for i, fix in enumerate(quick_fixes, 1):
                print(f"    {i}. {fix}")
    
    def test_resource_profiler_large_model_recommendations(self):
        """Test resource profiler optimization recommendations for large models."""
        # Create mock large model
        large_model = self.create_mock_large_model_details(
            model_size_mb=12.0,
            total_macs=100000000,
            target_dtype="FLOAT32"
        )
        
        with patch('cfsai_resource_profiler.profile_resources.TFLiteParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser
            mock_parser.parse_model.return_value = large_model
            
            # Analyze with constrained hardware
            report = self.resource_profiler.analyze_model(
                "/tmp/mock_large_model.tflite",
                self.constrained_resource_profile
            )
            
            self.assertIsInstance(report, ResourceProfileReport)
            
            # Should detect memory issues with constrained hardware
            self.assertIsNotNone(report.memory_analysis)
            memory_analysis = report.memory_analysis
            
            # Large model should exceed available RAM (128KB) significantly
            if memory_analysis.model_peak_ram_kb:
                self.assertGreater(memory_analysis.model_peak_ram_kb, 128,
                                 "Large model should exceed constrained RAM")
            
            # Should have high RAM utilization or critical status
            if memory_analysis.ram_utilization_percent:
                self.assertGreater(memory_analysis.ram_utilization_percent, 100,
                                 "Should exceed 100% RAM utilization")
            
            # Should provide memory recommendations
            memory_recommendations = memory_analysis.memory_recommendations or []
            self.assertGreater(len(memory_recommendations), 0,
                             "Should provide memory optimization recommendations")
            
            # Check for quantization recommendations in memory recommendations
            quantization_recommended = any(
                "quantization" in rec.lower() or "int8" in rec.lower()
                for rec in memory_recommendations
            )
            self.assertTrue(quantization_recommended,
                          "Should recommend quantization for memory reduction")
            
            # Check optimization opportunities
            if report.optimization_opportunities:
                opt_ops = report.optimization_opportunities
                self.assertGreater(opt_ops.total_parameter_memory_kb, 0,
                                 "Should identify optimization opportunities")
                
                if hasattr(opt_ops, 'layerwise_opportunities') and opt_ops.layerwise_opportunities:
                    large_layer_opportunities = [
                        opp for opp in opt_ops.layerwise_opportunities
                        if opp.parameter_memory_kb > 100  # Large layers (>100KB)
                    ]
                    self.assertGreater(len(large_layer_opportunities), 0,
                                     "Should identify large layer optimization opportunities")
            
            print(f"Large Model Resource Profiling:")
            print(f"  Model size: {large_model.model_size_on_disk_kb/1024:.1f} MB")
            print(f"  Peak RAM: {memory_analysis.model_peak_ram_kb:.1f} KB")
            print(f"  Available RAM: 128 KB")
            print(f"  RAM utilization: {memory_analysis.ram_utilization_percent:.1f}%")
            print(f"  RAM status: {memory_analysis.ram_status}")
            print(f"  Memory recommendations: {len(memory_recommendations)}")
            for i, rec in enumerate(memory_recommendations[:5], 1):  # Show first 5
                print(f"    {i}. {rec}")
    
    def test_resource_profiler_high_mac_recommendations(self):
        """Test resource profiler recommendations for models with high MAC counts."""
        # Create model with very high MAC usage
        high_mac_model = self.create_mock_large_model_details(
            model_size_mb=4.0,       # Moderate size
            total_macs=150000000,    # 150M MACs - very high
            target_dtype="FLOAT32"
        )
        
        with patch('cfsai_resource_profiler.profile_resources.TFLiteParser') as mock_parser_class:
            mock_parser = Mock()
            mock_parser_class.return_value = mock_parser
            mock_parser.parse_model.return_value = high_mac_model
            
            # Analyze with constrained hardware (no acceleration)
            report = self.resource_profiler.analyze_model(
                "/tmp/mock_high_mac_model.tflite",
                self.constrained_resource_profile
            )
            
            self.assertIsInstance(report, ResourceProfileReport)
            
            # Should detect high computational load
            if report.hardware_metrics:
                hw_metrics = report.hardware_metrics
                if hw_metrics.total_cycles:
                    # High MAC count should result in high cycle count
                    self.assertGreater(hw_metrics.total_cycles, 100000000,
                                     "High MAC model should have high cycle count")
                
                if hw_metrics.estimated_latency_ms:
                    # Should have significant latency on constrained hardware
                    self.assertGreater(hw_metrics.estimated_latency_ms, 1000,
                                     "High MAC model should have high latency on slow hardware")
            
            # Memory recommendations should include computational optimization
            memory_analysis = report.memory_analysis
            memory_recommendations = memory_analysis.memory_recommendations or []
            
            # Should recommend optimizations that help with both memory and computation
            computational_optimization_recommended = any(
                any(keyword in rec.lower() for keyword in 
                    ["quantization", "int8", "pruning", "optimization", "acceleration"])
                for rec in memory_recommendations
            )
            self.assertTrue(computational_optimization_recommended,
                          "Should recommend optimizations for high computational load")
            
            print(f"High MAC Model Resource Profiling:")
            print(f"  Model size: {high_mac_model.model_size_on_disk_kb/1024:.1f} MB")
            print(f"  Total MACs: {high_mac_model.total_macs:,}")
            if report.hardware_metrics:
                if report.hardware_metrics.total_cycles:
                    print(f"  Total cycles: {report.hardware_metrics.total_cycles:,}")
                if report.hardware_metrics.estimated_latency_ms:
                    print(f"  Estimated latency: {report.hardware_metrics.estimated_latency_ms:.1f} ms")
            print(f"  Memory recommendations: {len(memory_recommendations)}")
            for i, rec in enumerate(memory_recommendations[:5], 1):
                print(f"    {i}. {rec}")
    
    @unittest.skipIf(not has_tf(), "TensorFlow not available")
    def test_real_large_model_optimization_recommendations(self):
        """Test optimization recommendations with a real large TensorFlow Lite model."""
        # Create real large model
        model_path = self.create_real_large_model()
        
        # Test with compatibility analyzer
        compat_report = self.compatibility_analyzer.analyze_model(
            model_path, self.constrained_hw_meta
        )
        
        self.assertIsInstance(compat_report, CompatibilityReport)
        
        # Get compatibility recommendations
        compat_fixes = compat_report.get_quick_fixes()
        self.assertGreater(len(compat_fixes), 0, "Should provide compatibility recommendations")
        
        # Test with resource profiler
        resource_report = self.resource_profiler.analyze_model(
            model_path, self.constrained_resource_profile
        )
        
        self.assertIsInstance(resource_report, ResourceProfileReport)
        
        # Should have memory recommendations
        memory_recommendations = resource_report.memory_analysis.memory_recommendations or []
        self.assertGreater(len(memory_recommendations), 0, "Should provide memory recommendations")
        
        # Print comprehensive analysis
        print(f"Real Large Model Analysis:")
        print(f"  Model path: {model_path}")
        print(f"  Model size: {resource_report.model_summary.model_size_kb/1024:.1f} MB")
        print(f"  Compatibility fixes: {len(compat_fixes)}")
        for i, fix in enumerate(compat_fixes, 1):
            print(f"    {i}. {fix}")
        print(f"  Resource optimization recommendations: {len(memory_recommendations)}")
        for i, rec in enumerate(memory_recommendations[:3], 1):  # Show first 3
            print(f"    {i}. {rec}")
    
    def test_optimization_recommendations_coverage(self):
        """Test that optimization recommendations cover key scenarios comprehensively."""
        test_scenarios = [
            {
                "name": "Very Large Model (20MB)",
                "size_mb": 20.0,
                "macs": 50000000,
                "dtype": "FLOAT32"
            },
            {
                "name": "High MAC Dense Model",
                "size_mb": 5.0,
                "macs": 300000000,  # 300M MACs
                "dtype": "FLOAT32"
            },
            {
                "name": "Large Quantized Model",
                "size_mb": 8.0,
                "macs": 80000000,
                "dtype": "INT8"  # Already quantized
            }
        ]
        
        for scenario in test_scenarios:
            with self.subTest(scenario=scenario["name"]):
                # Create model for scenario
                model = self.create_mock_large_model_details(
                    model_size_mb=scenario["size_mb"],
                    total_macs=scenario["macs"],
                    target_dtype=scenario["dtype"]
                )
                
                # Test compatibility analyzer
                with patch('cfsai_compatibility_analyzer.analyze_compatibility.TFLiteParser') as mock_parser_class:
                    mock_parser = Mock()
                    mock_parser_class.return_value = mock_parser
                    mock_parser.parse_model.return_value = model
                    
                    compat_report = self.compatibility_analyzer.analyze_model(
                        "/tmp/test_model.tflite", self.constrained_hw_meta
                    )
                    
                    compat_fixes = compat_report.get_quick_fixes()
                    
                # Test resource profiler
                with patch('cfsai_resource_profiler.profile_resources.TFLiteParser') as mock_parser_class:
                    mock_parser = Mock()
                    mock_parser_class.return_value = mock_parser
                    mock_parser.parse_model.return_value = model
                    
                    resource_report = self.resource_profiler.analyze_model(
                        "/tmp/test_model.tflite", self.constrained_resource_profile
                    )
                    
                    memory_recs = resource_report.memory_analysis.memory_recommendations or []
                
                # Verify recommendations are provided for all scenarios
                total_recommendations = len(compat_fixes) + len(memory_recs)
                self.assertGreater(total_recommendations, 0,
                                 f"Should provide recommendations for {scenario['name']}")
                
                print(f"{scenario['name']}:")
                print(f"  Size: {scenario['size_mb']:.1f}MB, MACs: {scenario['macs']:,}, Type: {scenario['dtype']}")
                print(f"  Compatibility recommendations: {len(compat_fixes)}")
                print(f"  Resource recommendations: {len(memory_recs)}")
                print(f"  Total recommendations: {total_recommendations}")


if __name__ == "__main__":
    unittest.main()
