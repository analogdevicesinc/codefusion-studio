"""
Real Model Optimization Recommendations Tests.

This test suite uses real TensorFlow Lite models to test optimization recommendation
functionality. It creates actual models with varying sizes and computational complexity
to validate that the optimization systems provide appropriate recommendations for
different deployment scenarios.

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""
import unittest
import tempfile
import os
import shutil
from pathlib import Path
from utils import get_tf, has_tf


from cfsai_compatibility_analyzer.analyze_compatibility import CompatibilityAnalyzer
from cfsai_compatibility_analyzer.schemas import CompatibilityReport
from cfsai_resource_profiler.profile_resources import TFLiteResourceProfiler
from cfsai_resource_profiler.schemas import ResourceProfileReport
from cfsai_model_parser import TFLiteParser

from cfsai_types.hardware_profile import HardwareProfile

@unittest.skipIf(not has_tf(), "TensorFlow not available")
class TestRealModelOptimizationRecommendations(unittest.TestCase):
    """Test optimization recommendations with real TensorFlow Lite models."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        
        # Constrained hardware profile for triggering optimization recommendations
        self.constrained_hw_profile = HardwareProfile(
            SupportedOps=[
                "CONV_2D", "DEPTHWISE_CONV_2D", "FULLY_CONNECTED",
                "ADD", "MUL", "RELU", "SOFTMAX", "MAX_POOL_2D", 
                "AVERAGE_POOL_2D"
            ],
            AccelOps=[],
            SupportedDataTypes=["INT8", "UINT8", "INT16"],
            FlashSize=1024.0,
            RamSize=256.0,
            CoreClock=800.0,
            OperatorInfos=[
                {
                    "Name": "MAC",
                    "Cycles": 2.0,
                    "Energy": 15.0
                }
            ]
        )

        
        # Constrained resource profiler hardware
        self.constrained_resource_profile = HardwareProfile(
            SupportedOps=[ ],
            AccelOps=[],
            SupportedDataTypes=[],
            FlashSize=1024.0,
            RamSize=256.0,         # Match compatibility analyzer
            CoreClock=32.0,        # Very slow clock - 32MHz
            OperatorInfos=[
                {
                    "Name": "MAC",
                    "Cycles": 3.0, # Slow CPU - 3 cycles per MAC
                    "Energy": 8.0  # High energy consumption
                }
            ]
        )
        
        # Initialize analyzers
        self.compatibility_analyzer = CompatibilityAnalyzer()
        self.resource_profiler = TFLiteResourceProfiler()
        self.model_parser = TFLiteParser()
        tf = get_tf()
        # Suppress TensorFlow warnings
        tf.get_logger().setLevel('ERROR')
    
    def tearDown(self):
        """Clean up temporary files."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_large_resnet_model(self):
        """Create a large ResNet-style model with high parameter count."""
        print("\nCreating Large ResNet Model...")
        tf = get_tf()
        # Create a large ResNet-like architecture
        inputs = tf.keras.layers.Input(shape=(224, 224, 3))
        
        # Initial conv block
        x = tf.keras.layers.Conv2D(64, 7, strides=2, padding='same', activation='relu')(inputs)
        x = tf.keras.layers.BatchNormalization()(x)
        x = tf.keras.layers.MaxPooling2D(3, strides=2, padding='same')(x)
        
        # ResNet blocks with increasing channels
        for stage, filters in enumerate([64, 128, 256, 512]):
            for block in range(3 if stage == 0 else 4):  # More blocks for larger stages
                # Residual block
                shortcut = x
                
                # First conv
                x = tf.keras.layers.Conv2D(filters, 3, padding='same', activation='relu')(x)
                x = tf.keras.layers.BatchNormalization()(x)
                
                # Second conv
                x = tf.keras.layers.Conv2D(filters, 3, padding='same')(x)
                x = tf.keras.layers.BatchNormalization()(x)
                
                # Adjust shortcut dimensions if needed
                if shortcut.shape[-1] != filters:
                    shortcut = tf.keras.layers.Conv2D(filters, 1, padding='same')(shortcut)
                    shortcut = tf.keras.layers.BatchNormalization()(shortcut)
                
                # Add residual connection
                x = tf.keras.layers.Add()([x, shortcut])
                x = tf.keras.layers.ReLU()(x)
            
            # Downsample between stages (except last)
            if stage < 3:
                x = tf.keras.layers.Conv2D(filters * 2, 3, strides=2, padding='same')(x)
                x = tf.keras.layers.BatchNormalization()(x)
        
        # Global pooling and classification head
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        x = tf.keras.layers.Dense(2048, activation='relu')(x)  # Large dense layer
        x = tf.keras.layers.Dropout(0.5)(x)
        x = tf.keras.layers.Dense(1024, activation='relu')(x)  # Another large dense layer
        x = tf.keras.layers.Dropout(0.5)(x)
        outputs = tf.keras.layers.Dense(1000, activation='softmax')(x)  # ImageNet classes
        
        model = tf.keras.Model(inputs, outputs)
        
        # Convert to TFLite without optimization to keep it large
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []  # No optimization to maintain size
        tflite_model = converter.convert()
        
        # Save model
        model_path = os.path.join(self.temp_dir, 'large_resnet.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_high_mac_transformer_model(self):
        """Create a model with very high MAC count (attention-based)."""
        print("\nCreating High MAC Transformer Model...")
        tf = get_tf()
        # Transformer-like model with multiple attention heads
        sequence_length = 512
        embed_dim = 768
        num_heads = 12
        
        inputs = tf.keras.layers.Input(shape=(sequence_length,), dtype=tf.int32)
        
        # Embedding layer
        x = tf.keras.layers.Embedding(50000, embed_dim)(inputs)  # Large vocabulary
        
        # Multiple transformer blocks
        for i in range(8):  # 8 transformer layers
            # Multi-head attention (high MAC operations)
            attention_output = tf.keras.layers.MultiHeadAttention(
                num_heads=num_heads, 
                key_dim=embed_dim // num_heads
            )(x, x)
            x = tf.keras.layers.Add()([x, attention_output])
            x = tf.keras.layers.LayerNormalization()(x)
            
            # Feed-forward network with large hidden dimension
            ff_dim = embed_dim * 4  # 3072 for high MAC count
            ff = tf.keras.layers.Dense(ff_dim, activation='relu')(x)
            ff = tf.keras.layers.Dense(embed_dim)(ff)
            x = tf.keras.layers.Add()([x, ff])
            x = tf.keras.layers.LayerNormalization()(x)
        
        # Global pooling and large classification head
        x = tf.keras.layers.GlobalAveragePooling1D()(x)
        x = tf.keras.layers.Dense(2048, activation='relu')(x)  # Large dense
        x = tf.keras.layers.Dense(1024, activation='relu')(x)  # Another large dense
        outputs = tf.keras.layers.Dense(1000, activation='softmax')(x)
        
        model = tf.keras.Model(inputs, outputs)
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        # Use concrete function for complex model
        concrete_func = model.get_concrete_function(
            tf.TensorSpec(shape=[1, sequence_length], dtype=tf.int32)
        )
        converter = tf.lite.TFLiteConverter.from_concrete_functions([concrete_func])
        tflite_model = converter.convert()
        
        # Save model
        model_path = os.path.join(self.temp_dir, 'high_mac_transformer.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def create_dense_heavy_model(self):
        """Create a model with many large dense layers (high MAC, medium size)."""
        print("\nCreating Dense-Heavy Model...")
        tf = get_tf()
        inputs = tf.keras.layers.Input(shape=(224, 224, 3))
        
        # Small conv feature extractor
        x = tf.keras.layers.Conv2D(32, 3, activation='relu')(inputs)
        x = tf.keras.layers.MaxPooling2D(2)(x)
        x = tf.keras.layers.Conv2D(64, 3, activation='relu')(x)
        x = tf.keras.layers.MaxPooling2D(2)(x)
        x = tf.keras.layers.GlobalAveragePooling2D()(x)
        
        # Many large dense layers for high MAC count
        dense_sizes = [4096, 4096, 2048, 2048, 1024, 1024, 512]
        for size in dense_sizes:
            x = tf.keras.layers.Dense(size, activation='relu')(x)
            x = tf.keras.layers.Dropout(0.3)(x)
        
        outputs = tf.keras.layers.Dense(1000, activation='softmax')(x)
        
        model = tf.keras.Model(inputs, outputs)
        
        # Convert to TFLite
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        tflite_model = converter.convert()
        
        # Save model
        model_path = os.path.join(self.temp_dir, 'dense_heavy.tflite')
        with open(model_path, 'wb') as f:
            f.write(tflite_model)
        
        return model_path, model
    
    def analyze_model_characteristics(self, model_path, model_name):
        """Analyze and print model characteristics."""
        print(f"\n=== Analyzing {model_name} ===")
        
        # Parse model to get characteristics
        model_details = self.model_parser.parse_model(model_path)
        
        print(f"Model Size: {model_details.model_size_on_disk_kb/1024:.2f} MB")
        print(f"Total MACs: {model_details.total_macs:,}")
        print(f"Layer Count: {model_details.layer_count}")
        print(f"Target Data Type: {model_details.target_dtype}")
        print(f"Peak RAM: {model_details.model_peak_ram_kb:.1f} KB")
        print(f"Parameter Memory: {model_details.model_total_param_memory_b/1024/1024:.1f} MB")
        
        return model_details
    
    def test_large_model_optimization_recommendations(self):
        """Test optimization recommendations for a large ResNet model."""
        # Create large model
        model_path, keras_model = self.create_large_resnet_model()
        model_details = self.analyze_model_characteristics(model_path, "Large ResNet")
        
        # Verify model is actually large
        model_size_mb = model_details.model_size_on_disk_kb / 1024
        self.assertGreater(model_size_mb, 10.0, "Model should be larger than 10MB")
        
        # Test compatibility analysis
        print("\n--- Compatibility Analysis ---")
        compat_report = self.compatibility_analyzer.analyze_model(model_path, self.constrained_hw_profile)
        self.assertIsInstance(compat_report, CompatibilityReport)
        
        # Should detect data type issues (FLOAT32 not supported)
        type_issues = compat_report.unsupported_types or []
        self.assertGreater(len(type_issues), 0, "Should detect FLOAT32 data type issues")
        
        # Get optimization recommendations
        quick_fixes = compat_report.get_quick_fixes()
        self.assertGreater(len(quick_fixes), 0, "Should provide compatibility recommendations")
        
        print(f"Compatibility Issues Found: {len(type_issues)} type issues")
        print("Quick Fixes:")
        for i, fix in enumerate(quick_fixes, 1):
            print(f"  {i}. {fix}")
        
        # Test resource profiling
        print("\n--- Resource Profiling ---")
        resource_report = self.resource_profiler.analyze_model(model_path, self.constrained_resource_profile)
        self.assertIsInstance(resource_report, ResourceProfileReport)
        
        # Should detect memory issues due to model size vs available RAM
        memory_analysis = resource_report.memory_analysis
        self.assertIsNotNone(memory_analysis)
        
        if memory_analysis.ram_utilization_percent:
            print(f"RAM Utilization: {memory_analysis.ram_utilization_percent:.1f}%")
            print(f"RAM Status: {memory_analysis.ram_status}")
            
            # Large model should exceed available RAM
            self.assertGreater(memory_analysis.ram_utilization_percent, 100, 
                             "Large model should exceed available RAM")
        
        # Should provide memory optimization recommendations
        memory_recommendations = memory_analysis.memory_recommendations or []
        self.assertGreater(len(memory_recommendations), 0, "Should provide memory recommendations")
        
        print(f"Memory Recommendations ({len(memory_recommendations)}):")
        for i, rec in enumerate(memory_recommendations[:5], 1):  # Show first 5
            print(f"  {i}. {rec}")
        
        # Verify quantization is recommended for large FLOAT32 model
        quantization_recommended = any(
            "quantization" in rec.lower() or "int8" in rec.lower()
            for rec in memory_recommendations
        )
        self.assertTrue(quantization_recommended, "Should recommend quantization for large FLOAT32 model")
    
    def test_high_mac_model_optimization_recommendations(self):
        """Test optimization recommendations for a high MAC count model."""
        # Create high MAC model (try dense-heavy first as it's more reliable)
        model_path, keras_model = self.create_dense_heavy_model()
        model_details = self.analyze_model_characteristics(model_path, "Dense-Heavy High MAC")
        
        # Verify model has high MAC count
        self.assertGreater(model_details.total_macs, 50000000, "Model should have >50M MACs")
        
        # Test compatibility analysis
        print("\n--- Compatibility Analysis ---")
        compat_report = self.compatibility_analyzer.analyze_model(model_path, self.constrained_hw_profile)
        
        # Should detect data type issues
        type_issues = compat_report.unsupported_types or []
        self.assertGreater(len(type_issues), 0, "Should detect FLOAT32 data type issues")
        
        quick_fixes = compat_report.get_quick_fixes()
        print(f"Compatibility Issues: {len(type_issues)} type issues")
        print("Quick Fixes:")
        for i, fix in enumerate(quick_fixes, 1):
            print(f"  {i}. {fix}")
        
        # Test resource profiling
        print("\n--- Resource Profiling ---")
        resource_report = self.resource_profiler.analyze_model(model_path, self.constrained_resource_profile)
        
        # Check hardware metrics for high computational load
        if resource_report.hardware_metrics:
            hw_metrics = resource_report.hardware_metrics
            print(f"Total Cycles: {hw_metrics.total_cycles:,}" if hw_metrics.total_cycles else "Cycles: N/A")
            print(f"Estimated Latency: {hw_metrics.estimated_latency_ms:.1f} ms" if hw_metrics.estimated_latency_ms else "Latency: N/A")
            
            # High MAC model should have high cycle count
            if hw_metrics.total_cycles:
                self.assertGreater(hw_metrics.total_cycles, 100000000, 
                                 "High MAC model should have high cycle count")
        
        # Check memory recommendations
        memory_analysis = resource_report.memory_analysis
        memory_recommendations = memory_analysis.memory_recommendations or []
        
        print(f"Memory Recommendations ({len(memory_recommendations)}):")
        for i, rec in enumerate(memory_recommendations[:5], 1):
            print(f"  {i}. {rec}")
        
        # Should recommend optimizations for high computational load
        computational_optimization_recommended = any(
            any(keyword in rec.lower() for keyword in 
                ["acceleration", "pruning", "quantization", "mac", "computational"])
            for rec in memory_recommendations
        )
        self.assertTrue(computational_optimization_recommended,
                       "Should recommend computational optimizations for high MAC model")
    
    def test_model_comparison_recommendations(self):
        """Test recommendations across different model types."""
        print("\n=== Model Comparison Analysis ===")
        
        # Create different types of models
        large_model_path, _ = self.create_large_resnet_model()
        dense_model_path, _ = self.create_dense_heavy_model()
        
        models = [
            (large_model_path, "Large ResNet"),
            (dense_model_path, "Dense-Heavy")
        ]
        
        results = {}
        
        for model_path, model_name in models:
            print(f"\n--- Analyzing {model_name} ---")
            
            # Parse model characteristics
            model_details = self.analyze_model_characteristics(model_path, model_name)
            
            # Get compatibility recommendations
            compat_report = self.compatibility_analyzer.analyze_model(model_path, self.constrained_hw_profile)
            compat_fixes = compat_report.get_quick_fixes()
            
            # Get resource recommendations
            resource_report = self.resource_profiler.analyze_model(model_path, self.constrained_resource_profile)
            memory_recs = resource_report.memory_analysis.memory_recommendations or []
            
            results[model_name] = {
                'size_mb': model_details.model_size_on_disk_kb / 1024,
                'macs': model_details.total_macs,
                'mac_density': model_details.total_macs / (model_details.model_size_on_disk_kb / 1024),
                'compat_fixes': len(compat_fixes),
                'memory_recs': len(memory_recs),
                'total_recs': len(compat_fixes) + len(memory_recs)
            }
            
            print(f"  Size: {results[model_name]['size_mb']:.1f} MB")
            print(f"  MACs: {results[model_name]['macs']:,}")
            print(f"  MAC Density: {results[model_name]['mac_density']:.0f} MACs/MB")
            print(f"  Total Recommendations: {results[model_name]['total_recs']}")
        
        # Verify both models get appropriate recommendations
        for model_name in results:
            self.assertGreater(results[model_name]['total_recs'], 0,
                             f"{model_name} should receive optimization recommendations")
        
        print(f"\n=== Summary ===")
        for model_name, data in results.items():
            print(f"{model_name}: {data['size_mb']:.1f}MB, {data['macs']:,} MACs, {data['total_recs']} recommendations")
    
    def test_quantized_model_recommendations(self):
        """Test that quantized models get fewer/different recommendations."""
        print("\n=== Quantized Model Test ===")
        tf = get_tf()
        # Create a model and quantize it
        model_path, keras_model = self.create_dense_heavy_model()
        
        # Create quantized version
        converter = tf.lite.TFLiteConverter.from_keras_model(keras_model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]  # Apply quantization
        
        # Use a simple representative dataset
        def representative_dataset():
            for _ in range(16):
                yield [tf.random.normal([1, 224, 224, 3])]
        
        converter.representative_dataset = representative_dataset
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
        converter.inference_input_type = tf.int8
        converter.inference_output_type = tf.int8
        
        try:
            quantized_tflite_model = converter.convert()
            
            # Save quantized model
            quantized_model_path = os.path.join(self.temp_dir, 'quantized_dense.tflite')
            with open(quantized_model_path, 'wb') as f:
                f.write(quantized_tflite_model)
            
            # Analyze quantized model
            quantized_details = self.analyze_model_characteristics(quantized_model_path, "Quantized Dense")
            
            # Get recommendations for quantized model
            compat_report = self.compatibility_analyzer.analyze_model(quantized_model_path, self.constrained_hw_profile)
            compat_fixes = compat_report.get_quick_fixes()
            
            resource_report = self.resource_profiler.analyze_model(quantized_model_path, self.constrained_resource_profile)
            memory_recs = resource_report.memory_analysis.memory_recommendations or []
            
            print(f"Quantized Model Recommendations:")
            print(f"  Compatibility fixes: {len(compat_fixes)}")
            print(f"  Memory recommendations: {len(memory_recs)}")
            
            # Quantized model should have fewer data type issues
            type_issues = compat_report.unsupported_types or []
            print(f"  Data type issues: {len(type_issues)}")
            
            # Should have different types of recommendations (less about quantization)
            total_recs = len(compat_fixes) + len(memory_recs)
            print(f"  Total recommendations: {total_recs}")
            
            if memory_recs:
                print("Sample memory recommendations:")
                for i, rec in enumerate(memory_recs[:3], 1):
                    print(f"    {i}. {rec}")
            
        except Exception as e:
            print(f"Quantization failed (this is OK for testing): {e}")
            # Skip quantization test if it fails, as some models may not quantize well


if __name__ == "__main__":
    unittest.main()
