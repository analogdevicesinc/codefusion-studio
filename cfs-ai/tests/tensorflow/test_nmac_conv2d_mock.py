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
from utils import has_np, get_np
from unittest.mock import Mock, MagicMock
from cfsai_model_parser.parse_tflm import TFLiteParser

class TestMACCalculationMethods(unittest.TestCase):
    """Test MAC calculation methods with correct TFLite tensor format."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.parser = TFLiteParser()
    
    def create_mock_operator_and_subgraph(self, input_shape, weights_shape_tflite, output_shape):
        """
        Create mock operator and subgraph for MAC calculation testing.
        
        Args:
            input_shape: [batch, height, width, channels]
            weights_shape_tflite: TFLite format weight shape
                - Conv2D: [output_channels, kernel_h, kernel_w, input_channels]
                - DepthwiseConv2D: [1, kernel_h, kernel_w, input_channels * multiplier]
            output_shape: [batch, height, width, channels]
        """
        np = get_np()
        # Create mock operator
        mock_operator = Mock()
        mock_operator.Inputs.side_effect = lambda idx: idx  # input=0, weights=1
        mock_operator.Outputs.side_effect = lambda idx: 2  # output=2
        mock_operator.InputsLength.return_value = 2  # Has input and weights tensors
        mock_operator.OutputsLength.return_value = 1  # Has one output tensor
        
        # Create mock tensors with shapes
        mock_input_tensor = Mock()
        mock_input_tensor.ShapeAsNumpy.return_value = np.array(input_shape)
        
        mock_weights_tensor = Mock()
        mock_weights_tensor.ShapeAsNumpy.return_value = np.array(weights_shape_tflite)
        
        mock_output_tensor = Mock()
        mock_output_tensor.ShapeAsNumpy.return_value = np.array(output_shape)
        
        # Create mock subgraph
        mock_subgraph = Mock()
        tensors = [mock_input_tensor, mock_weights_tensor, mock_output_tensor]
        mock_subgraph.Tensors.side_effect = lambda idx: tensors[idx]
        
        return mock_operator, mock_subgraph
    
    def test_calculate_conv2d_macs_3x3_tflite_format(self):
        """Test Conv2D MAC calculation with 3x3 kernel using TFLite format."""
        # Test parameters
        input_shape = [1, 32, 32, 16]
        weights_shape_tflite = [32, 3, 3, 16]  # [out_channels, kernel_h, kernel_w, in_channels]
        output_shape = [1, 30, 30, 32]  # valid padding: 32-3+1=30
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        # Calculate MACs
        result = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        
        # Expected calculation with TFLite format:
        # output_spatial_size = 30 * 30 = 900
        # output_channels = weights_shape_tflite[0] = 32
        # kernel_volume = weights_shape_tflite[1] * weights_shape_tflite[2] = 3 * 3 = 9
        # input_channels = weights_shape_tflite[3] = 16
        # MACs = 900 * 32 * 9 * 16 = 41,472,000
        expected = 30 * 30 * 32 * 3 * 3 * 16
        
        self.assertEqual(result, expected)
        print(f"Conv2D 3x3 (TFLite format): Expected {expected:,}, Got {result:,}")
    
    def test_calculate_conv2d_macs_1x1_pointwise_tflite_format(self):
        """Test Conv2D MAC calculation with 1x1 kernel using TFLite format."""
        input_shape = [1, 56, 56, 128]
        weights_shape_tflite = [256, 1, 1, 128]  # [out_channels, kernel_h, kernel_w, in_channels]
        output_shape = [1, 56, 56, 256]  # same spatial dimensions for 1x1
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        
        # Expected: 56 * 56 * 256 * 1 * 1 * 128 = 102,760,448
        expected = 56 * 56 * 256 * 1 * 1 * 128
        
        self.assertEqual(result, expected)
        self.assertEqual(result, 102_760_448)
        print(f"Conv2D 1x1 (TFLite format): Expected {expected:,}, Got {result:,}")
    
    def test_calculate_conv2d_macs_5x5_tflite_format(self):
        """Test Conv2D MAC calculation with 5x5 kernel using TFLite format."""
        input_shape = [1, 28, 28, 64]
        weights_shape_tflite = [128, 5, 5, 64]  # [out_channels, kernel_h, kernel_w, in_channels]
        output_shape = [1, 24, 24, 128]  # valid padding: 28-5+1=24
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        
        # Expected: 24 * 24 * 128 * 5 * 5 * 64 = 117,964,800
        expected = 24 * 24 * 128 * 5 * 5 * 64
        
        self.assertEqual(result, expected)
        self.assertEqual(result, 117_964_800)
        print(f"Conv2D 5x5 (TFLite format): Expected {expected:,}, Got {result:,}")
    
    def test_calculate_depthwise_conv_macs_basic_tflite_format(self):
        """Test DepthwiseConv2D MAC calculation using TFLite format."""
        input_shape = [1, 112, 112, 32]
        # TFLite DepthwiseConv2D format: [1, kernel_h, kernel_w, input_channels * multiplier]
        weights_shape_tflite = [1, 3, 3, 32]  # multiplier = 1, so 32 * 1 = 32
        output_shape = [1, 110, 110, 32]  # valid padding: 112-3+1=110
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_depthwise_conv_macs(mock_operator, mock_subgraph)
        
        # Expected calculation for DepthwiseConv2D:
        # MACs = output_elements * spatial_kernel_size
        # output_elements = 1 * 110 * 110 * 32 = 387,200
        # spatial_kernel_size = 3 * 3 = 9
        # MACs = 387,200 * 9 = 3,484,800
        expected = (1 * 110 * 110 * 32) * (3 * 3)
        
        self.assertEqual(result, expected)
        self.assertEqual(result, 3_484_800)
        print(f"DepthwiseConv2D 3x3 (TFLite format): Expected {expected:,}, Got {result:,}")
    
    def test_calculate_depthwise_conv_macs_with_multiplier_tflite_format(self):
        """Test DepthwiseConv2D with channel multiplier > 1 using TFLite format."""
        input_shape = [1, 56, 56, 64]
        # TFLite DepthwiseConv2D format: [1, kernel_h, kernel_w, input_channels * multiplier]
        # multiplier = 2, so 64 * 2 = 128
        weights_shape_tflite = [1, 3, 3, 128]
        output_shape = [1, 54, 54, 128]  # valid padding: 56-3+1=54, channels: 64*2=128
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_depthwise_conv_macs(mock_operator, mock_subgraph)
        
        # Expected: (1 * 54 * 54 * 128) * (3 * 3) = 3,359,232
        expected = (1 * 54 * 54 * 128) * (3 * 3)
        
        self.assertEqual(result, expected)
        self.assertEqual(result, 3_359_232)
        print(f"DepthwiseConv2D with multiplier (TFLite format): Expected {expected:,}, Got {result:,}")
    
    def test_calculate_depthwise_conv_macs_5x5_tflite_format(self):
        """Test DepthwiseConv2D with 5x5 kernel using TFLite format."""
        input_shape = [1, 28, 28, 32]
        weights_shape_tflite = [1, 5, 5, 32]  # [1, kernel_h, kernel_w, input_channels * multiplier]
        output_shape = [1, 24, 24, 32]  # valid padding: 28-5+1=24
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_depthwise_conv_macs(mock_operator, mock_subgraph)
        
        # Expected: (1 * 24 * 24 * 32) * (5 * 5) = 460,800
        expected = (1 * 24 * 24 * 32) * (5 * 5)
        
        self.assertEqual(result, expected)
        self.assertEqual(result, 460_800)
        print(f"DepthwiseConv2D 5x5 (TFLite format): Expected {expected:,}, Got {result:,}")
    
    def test_edge_cases_single_channel_tflite_format(self):
        """Test MAC calculations with single channel using TFLite format."""
        # Conv2D with single input/output channel
        input_shape = [1, 32, 32, 1]
        weights_shape_tflite = [1, 3, 3, 1]  # [out_channels, kernel_h, kernel_w, in_channels]
        output_shape = [1, 30, 30, 1]
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        expected = 30 * 30 * 1 * 3 * 3 * 1  # 8,100
        self.assertEqual(result, expected)
        
        # DepthwiseConv2D with single channel
        dw_weights_shape_tflite = [1, 3, 3, 1]  # [1, kernel_h, kernel_w, in_channels * multiplier]
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, dw_weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_depthwise_conv_macs(mock_operator, mock_subgraph)
        expected = (1 * 30 * 30 * 1) * (3 * 3)  # 8,100
        self.assertEqual(result, expected)
        
        print("Single channel edge cases (TFLite format) passed")
    
    def test_zero_dimensions_tflite_format(self):
        """Test MAC calculations with zero dimensions using TFLite format."""
        # Zero spatial dimensions
        input_shape = [1, 0, 32, 16]
        weights_shape_tflite = [32, 3, 3, 16]  # [out_channels, kernel_h, kernel_w, in_channels]
        output_shape = [1, 0, 30, 32]
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        self.assertEqual(result, 0)
        
        # Zero output channels
        input_shape = [1, 32, 32, 16]
        weights_shape_tflite = [0, 3, 3, 16]  # [out_channels, kernel_h, kernel_w, in_channels]
        output_shape = [1, 30, 30, 0]
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, weights_shape_tflite, output_shape
        )
        
        result = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        self.assertEqual(result, 0)
        
        print("Zero dimension edge cases (TFLite format) passed")
    
    def test_efficiency_comparison_tflite_format(self):
        """Compare MAC efficiency between Conv2D and DepthwiseConv2D using TFLite format."""
        # Same spatial dimensions and channels for fair comparison
        spatial_size = 56
        channels = 128
        
        # Standard 3x3 Conv2D: 128 -> 128 channels
        conv2d_input = [1, spatial_size, spatial_size, channels]
        conv2d_weights = [channels, 3, 3, channels]  # TFLite format
        conv2d_output = [1, spatial_size, spatial_size, channels]  # same padding
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            conv2d_input, conv2d_weights, conv2d_output
        )
        
        conv2d_macs = self.parser._calculate_conv2d_macs(mock_operator, mock_subgraph)
        
        # Equivalent depthwise separable: DepthwiseConv2D + 1x1 Conv2D
        
        # 1. DepthwiseConv2D 3x3
        dw_input = [1, spatial_size, spatial_size, channels]
        dw_weights = [1, 3, 3, channels]  # TFLite format: [1, kernel_h, kernel_w, in_channels]
        dw_output = [1, spatial_size, spatial_size, channels]
        
        mock_operator_dw, mock_subgraph_dw = self.create_mock_operator_and_subgraph(
            dw_input, dw_weights, dw_output
        )
        
        depthwise_macs = self.parser._calculate_depthwise_conv_macs(mock_operator_dw, mock_subgraph_dw)
        
        # 2. Pointwise 1x1 Conv2D
        pw_input = [1, spatial_size, spatial_size, channels]
        pw_weights = [channels, 1, 1, channels]  # TFLite format
        pw_output = [1, spatial_size, spatial_size, channels]
        
        mock_operator_pw, mock_subgraph_pw = self.create_mock_operator_and_subgraph(
            pw_input, pw_weights, pw_output
        )
        
        pointwise_macs = self.parser._calculate_conv2d_macs(mock_operator_pw, mock_subgraph_pw)
        
        # Total for depthwise separable
        separable_total = depthwise_macs + pointwise_macs
        
        # Calculate efficiency ratio
        efficiency_ratio = conv2d_macs / separable_total
        
        print(f"Conv2D MACs: {conv2d_macs:,}")
        print(f"DepthwiseConv2D MACs: {depthwise_macs:,}")
        print(f"Pointwise MACs: {pointwise_macs:,}")
        print(f"Separable total MACs: {separable_total:,}")
        print(f"Efficiency ratio: {efficiency_ratio:.1f}x")
        
        # Verify efficiency - should be around 8-9x for the complete separable block
        self.assertGreater(efficiency_ratio, 8)
        self.assertLess(efficiency_ratio, 10)
        
        # Verify individual calculations match expected values
        expected_conv2d = spatial_size * spatial_size * channels * 3 * 3 * channels
        expected_depthwise = (spatial_size * spatial_size * channels) * (3 * 3)
        expected_pointwise = spatial_size * spatial_size * channels * 1 * 1 * channels
        
        self.assertEqual(conv2d_macs, expected_conv2d)
        self.assertEqual(depthwise_macs, expected_depthwise)
        self.assertEqual(pointwise_macs, expected_pointwise)
    
    
    def test_weight_tensor_format_verification(self):
        """Verify that the test uses correct TFLite weight tensor formats."""
        print("Weight tensor format verification:")
        
        # Conv2D weight format verification
        conv2d_weights = [64, 3, 3, 32]  # [out_channels, kernel_h, kernel_w, in_channels]
        print(f"Conv2D weights (TFLite): {conv2d_weights}")
        print("  [0] = output_channels = 64")
        print("  [1] = kernel_height = 3")
        print("  [2] = kernel_width = 3")
        print("  [3] = input_channels = 32")
        
        # DepthwiseConv2D weight format verification
        dw_weights = [1, 3, 3, 64]  # [1, kernel_h, kernel_w, in_channels * multiplier]
        print(f"DepthwiseConv2D weights (TFLite): {dw_weights}")
        print("  [0] = 1 (always 1 for depthwise)")
        print("  [1] = kernel_height = 3")
        print("  [2] = kernel_width = 3")
        print("  [3] = input_channels * multiplier = 64")
        
        # Test with the actual mock
        input_shape = [1, 8, 8, 32]
        output_shape = [1, 6, 6, 64]
        
        mock_operator, mock_subgraph = self.create_mock_operator_and_subgraph(
            input_shape, conv2d_weights, output_shape
        )
        
        # Verify the mock returns correct shapes
        input_tensor = mock_subgraph.Tensors(0)
        weights_tensor = mock_subgraph.Tensors(1)
        output_tensor = mock_subgraph.Tensors(2)
        
        self.assertEqual(input_tensor.ShapeAsNumpy().tolist(), input_shape)
        self.assertEqual(weights_tensor.ShapeAsNumpy().tolist(), conv2d_weights)
        self.assertEqual(output_tensor.ShapeAsNumpy().tolist(), output_shape)
        
        print("Format verification passed!")


if __name__ == '__main__':
    unittest.main(verbosity=2)